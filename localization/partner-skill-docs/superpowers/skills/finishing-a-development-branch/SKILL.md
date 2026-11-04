---
name: finishing-a-development-branch
description: 当实现完成、所有测试通过，而你需要决定如何整合工作时使用
---

# 完成开发分支

## 概述

**核心原则：** 验证测试 → 检测环境 → 呈现选项 → 执行选择 → 清理。

**开始时宣布：** “我正在使用 finishing-a-development-branch 技能来完成这项工作。”

## 第 1 步：验证测试

运行项目的完整测试套件（`npm test` / `cargo test` / `pytest` / `go test ./...`）。

**如果测试失败**，报告失败并停下 —— 菜单在测试套件变绿之后才出现：

```
Tests failing (<N> failures). Must fix before completing:

[Show failures]
```

**如果测试通过：** 继续到第 2 步。

## 第 2 步：检测环境

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
# Capture now, while still inside the workspace — Step 5 changes directory
# before cleanup (Step 6) needs this value
WORKTREE_PATH=$(git rev-parse --show-toplevel)
```

这决定了显示哪个菜单以及清理如何工作：

| 状态 | 菜单 | 清理 |
|-------|------|---------|
| `GIT_DIR == GIT_COMMON`（普通代码仓库） | 标准 3 个选项 | 无需清理工作树 |
| `GIT_DIR != GIT_COMMON`，具名分支 | 标准 3 个选项 | 基于来源（见第 6 步） |
| `GIT_DIR != GIT_COMMON`，分离 HEAD | 精简的 2 个选项（不含合并） | 外部管理 —— 原地保留 |

## 第 3 步：确定基础分支

基础分支是这项工作分叉自的那个分支 —— 通常在计划、对话或该分支的上游中被指名。如果尚不清楚，就问：“这个分支是从 <你的最佳猜测> 分出来的 - 对吗？”合并前要确认：合并到错误的基础分支，撤销起来代价高昂。

## 第 4 步：呈现选项

**普通代码仓库与具名分支工作树 —— 恰好呈现这 3 个选项：**

```
Implementation complete. What would you like to do?

1. Merge back to <base-branch> locally
2. Push and create a Pull Request
3. Keep the branch as-is (I'll handle it later)

Which option?
```

**分离 HEAD —— 恰好呈现这 2 个选项：**

```
Implementation complete. You're on a detached HEAD (externally managed workspace).

1. Push as new branch and create a Pull Request
2. Keep as-is (I'll handle it later)

Which option?
```

完全按所写呈现菜单 —— 简洁，每个选项都来自上面的列表。丢弃工作仅在人类伙伴明确要求时才发生（见下文“如果你的人类伙伴要求丢弃工作”）。等待他们的回答；整合的决定由他们做出。

## 第 5 步：执行选择

### 选项 1：本地合并

```bash
# Get main repo root for CWD safety
MAIN_ROOT=$(git -C "$(git rev-parse --git-common-dir)/.." rev-parse --show-toplevel)
cd "$MAIN_ROOT"

# Merge first — verify success before removing anything
git checkout <base-branch>
git pull
git merge <feature-branch>

# Verify tests on merged result
<test command>
```

如果合并结果上的测试失败：停下，将工作树和分支原地保留，并调查 —— 尚未推送任何东西，因此这次合并是本地且可恢复的。

一旦合并结果变绿：清理工作树（第 6 步），然后删除分支：

```bash
git branch -d <feature-branch>
```

### 选项 2：推送并创建 PR

```bash
git push -u origin <feature-branch>
# From a detached HEAD, name the new branch on the remote:
# git push origin HEAD:refs/heads/<new-branch>
```

然后用代码托管平台的工具针对 <base-branch> 创建拉取/合并请求 —— 如有 CLI 就用它，否则用大多数平台在你推送时打印的创建 URL —— 如存在代码仓库的 PR 模板和约定，请遵循它们，并把 URL 报告给你的人类伙伴。

保留工作树 —— 你的人类伙伴在那里根据 PR 反馈迭代。

### 选项 3：保持原样

报告：“保留分支 <name>。工作树已保存于 <path>。”

### 如果你的人类伙伴要求丢弃工作

此路径仅作为对明确要求扔掉工作的响应而存在。先确认：

```
This will permanently delete:
- Branch <name>
- All commits: <commit-list>
- Worktree at <path>

Type 'discard' to confirm.
```

等待那个确切的确认。当它到来时：

```bash
MAIN_ROOT=$(git -C "$(git rev-parse --git-common-dir)/.." rev-parse --show-toplevel)
cd "$MAIN_ROOT"
```

然后清理工作树（第 6 步）并强制删除分支：

```bash
git branch -D <feature-branch>
```

## 第 6 步：清理工作区

**对选项 1 和已确认的丢弃运行。** 选项 2 和 3 始终保留工作树。两个调用者都已经切换到主代码仓库根目录 —— 移除工作树必须从工作树之外运行 —— 并使用在第 2 步中捕获的、即在该目录切换之前的 `GIT_DIR`/`GIT_COMMON`/`WORKTREE_PATH` 值。

**如果 `GIT_DIR == GIT_COMMON`：** 普通代码仓库，无需清理工作树。完成。

**如果 `WORKTREE_PATH` 位于 `.worktrees/` 或 `worktrees/` 之下：** 此工作树由 Superpowers 创建 —— 清理由我们负责：

```bash
git worktree remove "$WORKTREE_PATH"
git worktree prune  # Self-healing: clean up any stale registrations
```

**如果移除被拒绝**（`contains modified or untracked files`）：工作树中存有在别处不存在的文件 —— 未提交的计划、笔记或临时工作。绝不要主动使用 `--force`。向你的人类伙伴展示利害关系并询问：

```bash
git -C "$WORKTREE_PATH" status --porcelain -uall
```

```
Worktree removal refused — these files were never committed:

<file list>

1. Commit them to <branch> before cleanup
2. Move them into <main repo root>
3. Delete them (unrecoverable)

Which?
```

执行该选择，然后移除工作树。

**否则：** 宿主环境拥有此工作区 —— 原地保留。如果你的平台提供工作区退出工具，就用它。

## 快速参考

| 选项 | 合并 | 推送 | 保留工作树 | 清理分支 |
|--------|-------|------|---------------|----------------|
| 1. 本地合并 | 是 | - | - | 是 |
| 2. 创建 PR | - | 是 | 是 | - |
| 3. 保持原样 | - | - | 是 | - |
| 丢弃（仅限明确请求） | - | - | - | 是（强制） |

## 常见借口

| 借口 | 实际情况 |
|--------|---------|
| “本次会话早些时候测试通过了” | 在你即将整合的那个树上运行套件。一次绿色的运行只证明它运行时所处的那个树。 |
| “他们显然想让它合并” | 整合是你人类伙伴的决定。呈现菜单并等待。 |
| “他们似乎已经弄完这个功能了 —— 我主动提出丢弃它吧” | 菜单按所写就是完整的。只有当人类伙伴明确说出要求时才发生丢弃。 |
| “'对，把它删了' 就算确认了” | 只有键入的 `discard` 一词才授权删除。 |
| “PR 已经建好了，工作树现在是杂物了” | PR 反馈就在那个工作树里修复。它一直保留到工作落地。 |
| “这个别的工作树看起来过时了 —— 我也把它清理了吧” | 只清理位于 `.worktrees/` 或 `worktrees/` 下的工作树。其他一切都属于宿主。 |
| “移除被拒绝 —— `--force` 只是把清理做完而已” | 拒绝意味着有文件只存在于那个工作树中。`--force` 会永久摧毁它们。向你的人类伙伴展示并询问。 |
| “合并结果的失败很可能是不稳定的偶发问题” | 合并结果失败会叫停一切。分支和工作树原地不动，由你去调查。 |
| “基础分支显然是 main” | 确认分叉点，或者询问。合并到错误的基础分支，撤销起来代价高昂。 |
| “推送被拒绝了 —— force-push 会解决它” | 推送被拒绝意味着远端已经移动。调查；仅在你人类伙伴明确要求时才 force-push。 |
