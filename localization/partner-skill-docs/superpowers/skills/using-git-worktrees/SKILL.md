---
name: using-git-worktrees
description: 在开始需要与当前工作区隔离的功能工作时、或在执行实现计划之前使用——通过原生工具或 git worktree 回退方案确保存在一个隔离的工作区
---

# 使用 Git Worktrees

## 概述

确保工作在隔离的工作区中进行。优先使用你平台的原生 worktree 工具。只有在没有原生工具可用时，才回退到手动 git worktree。

**核心原则：** 先检测是否已有隔离。然后使用原生工具。再回退到 git。永远不要与 harness 对抗。

**开始时宣布：** "我正在使用 using-git-worktrees 技能来建立一个隔离的工作区。"

## 第 0 步：检测已有隔离

**在创建任何东西之前，检查你是否已经处于一个隔离的工作区。**

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
BRANCH=$(git branch --show-current)
```

**子模块防护：** `GIT_DIR != GIT_COMMON` 在 git 子模块内部同样成立。在得出"已经在 worktree 中"的结论之前，先确认你不在子模块中：

```bash
# If this returns a path, you're in a submodule, not a worktree — treat as normal repo
git rev-parse --show-superproject-working-tree 2>/dev/null
```

**如果 `GIT_DIR != GIT_COMMON`（且不是子模块）：** 你已经处于一个关联 worktree 中。跳到第 2 步（项目设置）。不要再创建另一个 worktree。

带分支状态报告：
- 在某个分支上："已在隔离工作区 `<path>`，分支 `<name>`。"
- 分离 HEAD："已在隔离工作区 `<path>`（分离 HEAD，由外部管理）。完成时需要创建分支。"

**如果 `GIT_DIR == GIT_COMMON`（或在子模块中）：** 你处于一个普通的代码仓库检出中。

用户是否已在你的指令中表明了他们的 worktree 偏好？如果没有，在创建 worktree 之前先征求同意：

> "你希望我建立一个隔离的 worktree 吗？它能保护你当前的分支不受改动影响。"

遵从任何已声明的偏好，不必再问。如果用户拒绝同意，就原地工作并跳到第 2 步。

## 第 1 步：创建隔离工作区

**你有两种机制。按这个顺序尝试它们。**

### 1a. 原生 Worktree 工具（首选）

用户已经要求一个隔离的工作区（第 0 步的同意）。你已经有办法创建 worktree 了吗？它可能是一个名字类似 `EnterWorktree`、`WorktreeCreate` 的工具，一个 `/worktree` 命令，或一个 `--worktree` 标志。如果有，就用它并跳到第 2 步。

原生工具会自动处理目录放置、分支创建和清理。当你已有原生工具时使用 `git worktree add`，会制造出你的 harness 看不到也管理不了的幽灵状态。

只有在没有原生 worktree 工具可用时，才继续到第 1b 步。

### 1b. Git Worktree 回退

**只有在第 1a 步不适用时才使用**——你没有可用的原生 worktree 工具。用 git 手动创建一个 worktree。

#### 目录选择

遵循以下优先顺序。显式的用户偏好始终胜过观察到的文件系统状态。

1. **检查你的指令中是否有已声明的 worktree 目录偏好。** 如果用户已经指定了一个，就直接用它，不必再问。

2. **检查是否存在项目本地的 worktree 目录：**
   ```bash
   ls -d .worktrees 2>/dev/null     # Preferred (hidden)
   ls -d worktrees 2>/dev/null      # Alternative
   ```
   如果找到，就用它。如果两者都存在，`.worktrees` 胜出。

3. **如果没有其他指引可用**，默认使用项目根目录下的 `.worktrees/`。

#### 安全验证（仅项目本地目录）

**创建 worktree 之前必须验证该目录已被忽略：**

```bash
git check-ignore -q .worktrees 2>/dev/null || git check-ignore -q worktrees 2>/dev/null
```

**如果没有被忽略：** 添加到 .gitignore，提交该改动，然后继续。

**为何关键：** 防止意外把 worktree 的内容提交到代码仓库。

#### 创建 Worktree

```bash
# Determine path based on chosen location
path="$LOCATION/$BRANCH_NAME"

git worktree add "$path" -b "$BRANCH_NAME"
cd "$path"
```

**沙箱回退：** 如果 `git worktree add` 因权限错误失败（沙箱拒绝），告诉用户沙箱阻止了 worktree 创建，你改为在当前目录中工作。然后原地运行设置和基线测试。

## 第 2 步：项目设置

自动检测并运行适当的设置：

```bash
# Node.js
if [ -f package.json ]; then npm install; fi

# Rust
if [ -f Cargo.toml ]; then cargo build; fi

# Python
if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
if [ -f pyproject.toml ]; then poetry install; fi

# Go
if [ -f go.mod ]; then go mod download; fi
```

## 第 3 步：验证干净的基线

运行测试以确保工作区从一开始就是干净的：

```bash
# Use project-appropriate command
npm test / cargo test / pytest / go test ./...
```

**如果测试失败：** 报告失败，询问是继续还是调查。

**如果测试通过：** 报告就绪。

### 报告

```
Worktree ready at <full-path>
Tests passing (<N> tests, 0 failures)
Ready to implement <feature-name>
```

## 快速参考

| 情况 | 操作 |
|-----------|--------|
| 已在关联 worktree 中 | 跳过创建（第 0 步） |
| 在子模块中 | 当作普通代码仓库（第 0 步防护） |
| 有原生 worktree 工具可用 | 使用它（第 1a 步） |
| 没有原生工具 | Git worktree 回退（第 1b 步） |
| `.worktrees/` 存在 | 使用它（验证已被忽略） |
| `worktrees/` 存在 | 使用它（验证已被忽略） |
| 两者都存在 | 使用 `.worktrees/` |
| 两者都不存在 | 检查指令文件，然后默认 `.worktrees/` |
| 目录未被忽略 | 添加到 .gitignore + 提交 |
| 创建时权限错误 | 沙箱回退，原地工作 |
| 基线期间测试失败 | 报告失败 + 询问 |
| 没有 package.json/Cargo.toml | 跳过依赖安装 |

## 常见的合理化

| 借口 | 现实 |
|--------|---------|
| "我显然不在 worktree 中——无需检查" | 运行第 0 步。harness 创建的隔离和子模块都会骗过肉眼；检测命令能给出定论。 |
| "`git worktree add` 比寻找原生工具更快" | 原生工具（例如 `EnterWorktree`）掌管放置、分支和清理。绕过它是头号错误——它会制造出你的 harness 看不到也管理不了的幽灵状态。 |
| "worktree 目录肯定已经被忽略了" | 运行 `git check-ignore`。一个未被忽略的 worktree 目录会把整棵树提交进代码仓库。 |
| "任何目录名都行" | 显式指令胜过已有的项目本地目录，后者又胜过 `.worktrees/` 默认值。 |
| "工作区是全新的——基线测试可以等" | 一个脏的基线会让之后每一次失败都变得模棱两可。现在就运行测试；越过失败继续下去应由你的人类伙伴决定。 |
