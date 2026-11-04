---
name: install-cli
license: MIT
description: >
  安装并认证 Intercom CLI（`@intercom/cli`）—— 一款用于管理 Intercom 工作区的命令行工具，专为人类操作员和 AI 智能体设计。当用户要求“安装 Intercom CLI”“设置 intercom 命令”“安装 @intercom/cli”，或想要通过 shell 访问其 Intercom 工作区时使用。
disable-model-invocation: true
---

# 安装 Intercom CLI

全局安装 [`@intercom/cli`](https://www.npmjs.com/package/@intercom/cli) 包，并针对用户的工作区进行认证。CLI 与此插件互为补充：插件用于对话内的 MCP 使用，而 CLI 用于 shell 访问、脚本编写和工作区开通。

## 前提条件

安装之前，确认用户具备：

1. **Node.js >= 20.6.0** —— 运行 `node --version` 检查。如果缺失或版本较旧，引导他们通过 [nodejs.org](https://nodejs.org) 或其版本管理器（nvm、fnm、volta）安装。
2. **npm** —— 随 Node 一起捆绑。

如果 `node --version` 返回 < 20.6.0，停止并要求用户升级后再继续。CLI 无法在更旧的版本上运行。

## 第 1 步：全局安装

```bash
npm install -g @intercom/cli
```

验证安装：

```bash
intercom --version
```

如果用户在 macOS 或 Linux 上遇到权限错误（`EACCES`），他们很可能使用的是系统级 Node 安装。建议二选一：
- 改用通过 nvm/fnm/volta 管理的用户级 Node（首选），或
- 在其主目录下配置一个 [npm prefix](https://docs.npmjs.com/cli/v10/configuring-npm/folders#prefix-configuration)。

**不要**建议 `sudo npm install -g` —— 以 root 身份安装全局包是已知的隐患，会在后续更新时引发权限问题。

## 第 2 步：认证

有两条路径。询问用户适用哪一条。

### 路径 A：现有工作区（最常见）

用户已有 Intercom 工作区，需要将 CLI 连接到它。

1. 引导他们前往 [Developer Hub](https://app.intercom.com/a/apps/_/developer-hub)。
2. 点击 **New app**（或选择一个现有应用）。
3. 在 **Authentication** 下，复制 **Access Token**。
4. 用以下两种方式之一进行认证：

**选项 1 —— 持久化（推荐用于交互式使用）：**

```bash
intercom auth login --token "<paste-token-here>"
```

这会将令牌存储到操作系统密钥环中（macOS 上为 Keychain，Linux 上为 Secret Service，Windows 上为 Credential Manager），因此后续命令无需再使用环境变量。

**选项 2 —— 环境变量（推荐用于 CI / 脚本）：**

```bash
export INTERCOM_TOKEN="<paste-token-here>"
```

将其添加到 `~/.zshrc`、`~/.bashrc` 或等效文件中，使其在各 shell 之间持久生效。对于 CI，在流水线配置中将其设为密钥。

当两者同时存在时，环境变量优先于密钥环中存储的凭据。

### 路径 B：新工作区（开通）

用户想从零创建一个全新的 Intercom 工作区 —— 不需要令牌。

```bash
intercom setup --company-name "Acme"
```

此命令会开通一个工作区、登录用户，并存储生成的凭据。流程中 CLI 会提示输入邮箱、密码和验证码。

如果用户有额外的设置需求（导入文章、启用 Fin 等），指引他们到：

```bash
intercom setup --help
```

## 第 3 步：验证

运行：

```bash
intercom me
```

预期输出：管理员的姓名、邮箱和活动工作区 ID。如果失败：

| 错误 | 可能原因 | 修复 |
|-------|--------------|-----|
| `Not authenticated` | 密钥环或环境中没有令牌 | 重新运行第 2 步 |
| `401 Unauthorized` | 令牌被吊销或工作区错误 | 在 Developer Hub 中生成新令牌 |
| `command not found: intercom` | 全局安装路径不在 `$PATH` 中 | 运行 `npm config get prefix`，确保 `<prefix>/bin` 在 `$PATH` 中 |

## 第 4 步（可选）：Shell 补全

仅当用户在 shell 中以交互方式使用 `intercom` 时才推荐此步骤。

```bash
# zsh — 追加到 ~/.zshrc
intercom completion zsh >> ~/.zshrc

# bash — 追加到 ~/.bashrc
intercom completion bash >> ~/.bashrc

# fish
intercom completion fish > ~/.config/fish/completions/intercom.fish
```

重启 shell 或 `source` rc 文件以使补全生效。

## 快速参考

安装后，用户可以运行以下任一命令。不要把这整份列表一股脑倒给他们 —— 根据其目标展示相关命令。

| 命令 | 用途 |
|---------|---------|
| `intercom me` | 显示当前管理员 + 工作区 |
| `intercom api <endpoint>` | 原始 API 访问（类似 `gh api`） |
| `intercom articles list\|get\|search` | 帮助中心文章 |
| `intercom contacts list\|get\|search` | 联系人 |
| `intercom conversations list\|get\|search` | 对话 |
| `intercom fin manifest\|enable\|download` | Fin AI 智能体 |
| `intercom messenger get\|update\|snippet` | Messenger 配置 |
| `intercom config list` | 显示 CLI 配置 |

完整参考：[`@intercom/cli` README](https://github.com/intercom/cli#readme)。

## 智能体 / 管道模式

当 stdout 被管道传输时，CLI 会自动检测并切换为紧凑的 NDJSON（每行一个 JSON 对象）。这让它便于脚本和 AI 智能体使用：

```bash
# 管道传输时自动使用 NDJSON
intercom articles list | jq '.title'

# 强制输出 JSON
intercom articles list --json

# 内联 jq 筛选器
intercom articles list --jq '.data[].title'
```

如果用户是从 Claude Code 智能体或其他自动化中使用 CLI，优先使用 `--json` 或 `--jq`，而不是解析人类可读的输出。

## 多工作区

如果用户管理多个工作区：

```bash
intercom auth list                  # 显示已存储的凭据
intercom auth switch <workspace>    # 更改默认值
intercom me --workspace <id>        # 一次性覆盖
```

每个工作区的凭据都单独存储在密钥环中。

## 故障排查

### 在企业网络上 `npm install -g` 卡住或失败
用户的 npm registry 可能被代理。检查 `npm config get registry` —— 如果它指向某个内部镜像，该镜像可能未发布 `@intercom/cli`。为本次安装显式设置 registry：

```bash
npm install -g @intercom/cli --registry=https://registry.npmjs.org
```

### 找到 `intercom` 命令但立即崩溃
通常是 Node 版本不匹配。运行 `node --version` 并确认其为 >= 20.6.0。如果使用 nvm，确保活动版本（`nvm current`）就是全局安装所用的那个版本。

### 令牌已存储但命令仍以 401 失败
`INTERCOM_TOKEN` 环境变量会覆盖密钥环。运行 `unset INTERCOM_TOKEN` 再试一次 —— 过期的环境变量可能遮蔽了新的密钥环凭据。

### 区域错误（EU / Australia）
CLI 默认使用美国 API。如果工作区托管在 EU 或 Australia：

```bash
export INTERCOM_API_BASE_URL="https://api.eu.intercom.io"      # EU
export INTERCOM_API_BASE_URL="https://api.au.intercom.io"      # Australia
```

在 shell rc 文件中与令牌一起设置。
