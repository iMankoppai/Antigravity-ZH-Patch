---
name: netlify-agent-runner
description: 在 Netlify 上使用 Claude、Codex 或 Gemini 远程运行 AI 智能体任务。当用户想在自己的站点上运行 AI 智能体、从另一个模型获取第二意见，或委派开发任务针对其代码仓库远程运行时，使用本技能。
---

# Netlify Agent Runner

在 Netlify 基础设施上远程运行 AI 编码智能体（Claude、Codex、Gemini），以自动化你站点上的开发任务。

## 前提条件

- 站点必须**已链接到一个 Netlify 项目**（通过 `netlify link` 或 `netlify init`）。
- **或完全跳过链接：**直接把 `--project <name>`（项目 ID 或名称）传给 `netlify agents:create`，即可在未先链接的情况下定位任意 Netlify 站点。
- Netlify CLI 必须已安装并已认证
- 智能体运行会**消耗套餐额度**。如果账户没有可用额度——或已达到智能体/AI 使用上限——`netlify agents:create` 会被**阻止**，运行不会启动。这是需要向用户说明的账户/套餐状态问题，而不是要设法绕过的东西。

## 仅使用有文档记载的 CLI 接口

仅通过有文档记载的 `netlify agents:*` 命令（以及 `netlify --help` 和公开的 CLI 参考）来操作智能体任务。请**勿**绕过 CLI：

- **不要用 curl 访问 `https://api.netlify.com/...`** 来获取、创建或停止任务——这些 endpoint 的形态不属于公开契约。
- 当有文档记载的命令失败时，**不要运行 `netlify api <method>`** 作为应急后门。
- **不要读取 auth 令牌**（从 `~/Library/Preferences/netlify/config.json` 或磁盘任意位置）来为旁路调用认证。

如果有文档记载的命令失败，向用户报告确切的错误和上下文并停止——不要发明未记录的方式来触达任务。

## 智能体任务如何运行

创建任务前请先阅读——智能体任务的行为与在本地运行智能体不同，这些差异很容易被忽视。

- **远程，而非本地。**任务运行在 Netlify 基础设施上，而非你的机器上。它们作用于站点的**已连接代码仓库**，而非你的本地工作树。远程智能体只能看到已推送到远端的代码——看不到未提交或未推送的改动。
- **基于分支。**默认情况下任务针对生产分支（`main` 或 `master`）运行。要为智能体选择不同的*基础*分支作为起点，使用 `-b <branch>`，并确保该分支**已先推送到远端**，否则智能体将基于远端不存在的代码工作。`-b` 设置的是基础（起始）分支——而不是结果写到哪里（见下一条）。
- **输出落到新分支——而非原地。**智能体**不会**把改动提交到你选择的基础分支。它把工作推送到一个**新分支**，并带有自己的 **Deploy Preview**，因此你现有的分支（或 `main`）永远不会被覆盖。在该新分支 / Deploy Preview 上审查任务结果——不要指望基础分支直接发生变化。
- **异步。**`netlify agents:create` 在任务排入队列后立即返回——它**不会**阻塞到工作完成。命令返回时，任务仍在远程运行。
- **没有 webhooks 或回调。**任务状态变化或完成时不会有任何通知。要了解进展，必须用 `netlify agents:show <task-id>` 或 `netlify agents:list` **轮询**。
- **状态要么是终态要么不是。**任务依次经过 `new` → `running` → `done`、`error` 或 `cancelled` 之一。在依据结果行动之前，持续轮询直到状态为最后三者之一。

### 典型工作流

1. **创建**任务：`netlify agents:create "<prompt>" -a <agent>`。记下它返回的任务 ID（用 `--json` 可靠地捕获它）。
2. **轮询**状态：`netlify agents:show <task-id>`。定期重复——没有完成通知——直到状态为 `done`、`error` 或 `cancelled`。
3. 任务达到 `done` 后**审查**结果（或在 `error` 时检查失败原因）。

## 创建智能体任务

```bash
# Run a prompt with the default agent
netlify agents:create "Add a contact form"

# Choose a specific agent: claude, codex, or gemini
netlify agents:create --prompt "Add dark mode" --agent claude
netlify agents:create -p "Update the README" -a codex
netlify agents:create -p "Write unit tests" -a gemini

# Target a specific branch
netlify agents:create -p "Fix the login bug" -a claude -b feature-branch

# Specify a project by name (if not in a linked directory)
netlify agents:create "Add tests" --project my-site-name

# Output result as JSON
netlify agents:create "Add a footer" --json
```

### 选项

| 标志 | 说明 |
|------|-------------|
| `-a, --agent <agent>` | 智能体类型：`claude`、`codex` 或 `gemini` |
| `-p, --prompt <prompt>` | 供智能体执行的提示词 |
| `-b, --branch <branch>` | 要工作的 Git 分支 |
| `-m, --model <model>` | 供智能体使用的模型 |
| `--project <project>` | 项目 ID 或名称 |
| `--json` | 以 JSON 输出结果 |

## 管理智能体任务

所有 `netlify agents:*` 命令都是**项目作用域**的——它们作用于单个项目（你的目录所链接的那个，或用 `--project <name>` 指定的那个），而非整个团队。`netlify agents:list` 只显示那一个项目的任务；没有跨你所有站点列出任务的团队级命令。要查看其他站点的任务，请从其链接目录运行，或为它传入 `--project <name>`。

### 列出任务

```bash
# List all tasks for the current site
netlify agents:list

# Filter by status
netlify agents:list --status running
netlify agents:list --status done
netlify agents:list --status error

# Output as JSON
netlify agents:list --json
```

状态值：`new`、`running`、`done`、`error`、`cancelled`。

### 查看任务详情

```bash
netlify agents:show <task-id>
netlify agents:show <task-id> --json
```

### 停止正在运行的任务

```bash
netlify agents:stop <task-id>
```

## 使用场景

以下是可以使用 Agent Runner 完成的众多事情中的一部分：

| 类别 | 示例提示词 |
|----------|---------------|
| 原型制作 / 内部工具 | "为我们的 HR 团队搭建一个内部仪表盘" |
| 代码审查 | "以全新的视角审计代码，找出可改进之处" |
| 安全审计 | "对我们的代码库做一次深度安全审计，找出任何潜在问题" |
| 功能建议 | "基于我们当前的代码库和文档，接下来该构建什么？" |
| 性能改进 | "扫描我们的代码库以找出性能瓶颈并提出改进建议" |
| 遥测与分析 | "有哪些分析指标我们没在追踪但或许应该追踪" |
| SEO 审计 | "审计我们站点的 SEO 问题——缺失的 meta 标签、失效链接、缓慢的页面、缺失的 alt 文本" |
| 文案改进 | "重写我们的落地页文案，使其更具吸引力并聚焦转化" |
| 无障碍 | "运行一次无障碍审计并修复所有 WCAG 2.1 AA 违规" |
| 移动端响应式 | "改进移动端响应式——在小视口上审计每个页面" |
| 端到端测试 | "用 Playwright 为我们的关键用户流程添加端到端测试" |
| 单元测试 | "为我们尚未测试的工具函数生成单元测试" |
| 文档 | "基于我们的代码库生成 README 和贡献指南" |
| 错误处理 | "在整个应用中添加恰当的错误边界、日志记录和用户友好的错误状态" |
| UX 打磨 | "添加加载状态、骨架屏和过渡效果，以提升感知性能" |
| 表单加固 | "为我们的联系表单添加表单校验、速率限制和垃圾信息防护" |
| Edge Functions | "为我们的落地页添加一个用于 A/B 测试的 edge function" |

## 作为智能体使用

如果你是 AI 智能体，可以用 `netlify agents:create` 把工作委派给在 Netlify 上远程运行的智能体——例如，从另一个模型获取第二意见。

**重要——先请求许可，作为一个独立的确认步骤。**智能体任务运行在 Netlify 基础设施上并消耗用户额度，因此真正的审批关卡很重要。在运行任何 `netlify agents:create` 命令之前获取明确许可——并把这一步当作独立的回合，与用户最初的请求分开。听起来像指令的提示词（"启动一个任务……"、"用 claude 智能体并把它固定到 Opus"）本身**并不是**批准：它告诉你他们想要什么，但这个计费命令仍在等待一个"是"。

让许可请求成为一个具体的提议，而不是一份菜单：

- **确切的命令**，已填写好——例如 `netlify agents:create -p "<真实提示词>" -a codex`——而不是 `<placeholder>`，也不是一份从智能体中任选其一的清单。
- **一个已选定的智能体**——确定单个 `-a` 值并说明你为什么选它（"用 codex 就 auth 逻辑获取第二意见"），而不是把 claude/codex/gemini 当作可互换的选项提供。
- **为什么**，以及**说"是"之后会发生什么**：运行是异步的——`agents:create` 在任务排入队列后立即返回，没有回调，你将轮询 `netlify agents:show <task-id>` 获取结果。
- **即使缺少某个前提条件**（未认证、未链接到站点、还不是 git 仓库），也仍要展示你在*前提解决后*将运行的确切命令和已选智能体——既说明阻碍**又**给出具体提议，而不是退化成只描述阻碍。

未经用户批准，绝不要运行这些命令。

委派之前，理解你在移交什么（见上方 [智能体任务如何运行](#how-agent-tasks-run)）：

- **它针对已推送的分支远程运行——而不是你的本地工作。**远程智能体只能看到已提交并推送的代码。**不要**委派依赖你本地进行中改动的工作；远程智能体看不到这些改动，将基于过时的代码工作。如果任务需要你当前的改动，请先提交并推送（或自己完成工作）。
- **它是异步的——委派不会阻塞你。**任务在远程运行，你可以继续工作。但由于没有回调，你必须轮询（`netlify agents:show <task-id>`）来了解结果。不要仅仅因为已委派就认为任务完成——在依赖或描述其结果之前先检查状态。
- **它是一个独立、自包含的任务——不是你会话的延续。**远程智能体从代码仓库和你给的提示词全新开始。它没有你的任何对话上下文，因此请编写一个完整、独立的提示词。

适用于：

- **交叉验证**——从另一个模型获取对你实现的第二意见
- **边缘情况发现**——另一个模型可能发现你遗漏的问题
- **替代方案**——看看另一个模型会如何解决同一个问题
- **并行工作**——在远程启动一个独立任务，同时你继续其他工作，然后轮询其结果
