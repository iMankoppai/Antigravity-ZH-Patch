---
name: base44-troubleshooter
description: 使用后端函数日志与 workflow 运行历史排查生产问题。在调查应用错误、调试函数调用、诊断某个计划任务或自动化为何失败，或诊断 Base44 应用中的生产问题时使用。
---

# 排查生产问题

## 前置条件

在获取日志之前验证鉴权：

```bash
npx base44 whoami
```

若未鉴权或令牌已过期，指示用户运行 `npx base44 login`。

用以下方式之一解析应用上下文：

```bash
# From a linked local project
cat base44/.app.jsonc

# Or explicitly
npx base44 logs --app-id app_123
```

## 可用命令

| 命令 | 说明 | 参考 |
|---------|-------------|-----------|
| `base44 logs` | 获取此应用的函数日志 | [project-logs.md](references/project-logs.md) |
| `base44 workflows runs` | 列出 workflow 运行，最新的在前；失败的运行携带失败的任务与底层错误 | [workflows-runs.md](../base44-cli/references/workflows-runs.md) |
| `base44 workflows list` | 列出此应用的 workflow 及其状态与运行摘要 | [workflows-list.md](../base44-cli/references/workflows-list.md) |

## 日志不是写后即读

**一次没有命中你那次运行的获取证明不了任何东西。** 一次性 `base44 logs` 读取的
索引落后于调用，因此在触发函数之后立刻得到的空结果是预期结果，
而不是问题的证据。

- **实时调试：使用 `--follow`。** 在实时流可用的地方，它会
  在**不到一秒**内投递行。在不可用的地方，CLI 会说明并改为轮询
  （`Warning: Realtime logs are not available for this app — falling back to
  polling (lines may lag ~20-30s).`）。无论哪种情况，`--follow` 都是正确的工具——你永远
  不必自己挑。
- **一次性获取会落后约 20-30 秒。** 那是摄取时间，不是过滤问题。
- **当输出为空时，要改变的变量是时间，绝不是某个标志。** 等待并
  重跑同一命令。放宽 `--limit`、去掉 `--level`，或切换
  `--order`，对一行尚未被摄取的内容毫无改变，
  而反复调整标志正是智能体把自己说服到错误诊断的方式。

## 排查流程

### 1. 观察它发生——`--follow`

如果你能触发该失败（或它正在发生），从这里开始，而不是事后再
获取：

```bash
npx base44 logs --follow
npx base44 logs --follow --function <function_name>
```

然后调用该函数并读取到达的内容。以下规则防止你误读
一个健康的流：

- **绝不基于计时器做判断。** 打开流、触发函数，并读到
  你看见那些行为止——不要读一个固定窗口、打印，然后得出“坏了”的结论。
  流安静是因为没有任何调用发生。
- **投递是按调用而非按行的。** 一个长时间运行的函数的行会在调用结束时
  全部到达。调用进行中的沉默是正常的。
- **在 follow 进行中重新部署是安全的。** 部署会在几秒内轮换脚本，
  同一条已打开的流会在下次调用时投递新代码的行。不要在每个部署之后
  拆掉流并重建它。
- **`--since` 在配合 `--follow` 时会被拒绝**（流从当前开始），`--until` 与 `--order` 也是。
  对于任何历史数据，使用一次性获取。
- **模式在启动时一次性决定。** 如果首次连接被拒绝或
  不可达，该次运行在其整个生命周期内轮询。如果流打开了，就没有
  轮询兜底了。
- **在运行中途丢失的流会以
  `Error: The realtime log stream
  stopped and could not be re-established` 结束命令**，退出码 1。该退出是流
  放弃，而不是日志功能损坏的证明——重跑同一命令，而不是
  更改标志。

### 2. 询问它是否是计划运行，而不是请求

Workflow 是自动化系统——cron 计划、实体触发器、连接器
事件、应用内智能体操作。**当抱怨是“我的计划任务没有运行”或
“自动化停止工作了”时，函数日志是错误工具。** 它们显示某个
函数打印了什么；它们无法告诉你某次运行到底是否被派发、其中
哪个任务失败了，或 workflow 为何停止触发。

```bash
npx base44 workflows runs --status failed
npx base44 workflows list
```

失败的运行携带失败的任务与底层错误，因此从那里开始，只有在你知道某个失败任务
调用了哪个函数之后，才深入 `base44 logs`。
`workflows list` 报告 `consecutiveFailures`——任何大于零的值都是需要关注的
workflow。

这里有两件事会误导人：

- **触发器列中的 `manual` 并不意味着有人点了某个东西。** 它是某次运行在
  完全没有触发器类型的情况下被派发时所盖的戳。
- **测试运行也被包含**，在触发器类型旁标记为 `(scheduled, test)`。
  你自己为了检查某事而触发的运行也会出现在列表中。

### 3. 检查最近的错误

从拉取所有函数的最新错误开始：

```bash
npx base44 logs --level error
```

### 4. 深入到特定函数

如果你知道是哪个函数失败：

```bash
npx base44 logs --function <function_name> --level error
```

如果你在项目目录之外，请显式传入应用：

```bash
npx base44 logs --app-id app_123 --function <function_name> --level error
```

`--function` 过滤是对*已盖章*行的过滤。仍处于旧版
按函数部署的应用会发出未盖章的行，因此过滤视图可能隐藏它们；这会在
应用下次部署时自愈。如果过滤运行返回空，在得出没有日志的结论之前，
先不带 `--function` 重跑。

### 5. 检查一个时间范围

与用户报告的问题时间戳关联：

```bash
npx base44 logs --function <function_name> --since <start_time> --until <end_time>
```

### 6. 分析日志

- 在输出中查找堆栈跟踪与错误消息
- 检查时间戳，与用户报告的问题关联
- 显式传入 `--limit` 以追溯到更早——没有默认页大小，
  大于 500 的值会被压到 500

## 解读空结果

`No logs found matching the filters.` 是有歧义的——绝不要把它读作“健康”。它
意味着以下之一：

- 该次运行尚未被摄取（最常见——等待并重跑，见上文）
- 没有该名称的函数，或过滤丢弃了未盖章的行（见步骤 3）
- 读取 `--env prod` 时应用尚未发布
  （`No production logs found.`——试试 `--env preview` 获取草稿日志）
