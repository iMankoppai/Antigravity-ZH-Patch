---
name: endor-agent-kit-setup
description: 在为 Antigravity CLI 设置 Endor Labs Agent Kit、检查就绪状态、验证 Endor 身份认证、选择命名空间，或诊断缺失的 endorctl、gh、Antigravity CLI、Endor MCP 或工作流前置条件时使用。
---

# 面向 Antigravity CLI 的 Endor Agent Kit 设置

为 Endor Labs Agent Kit Antigravity CLI 插件生成。

## 捆绑的 Antigravity CLI 工作流

- `AI SAST Remediation` -> skill `ai-sast-remediation`, subagent `@ai-sast-remediation`
- `CI/CD And Supply Chain Posture` -> skill `cicd-posture`, subagent `@cicd-posture`
- `Configuration Automation` -> skill `configuration-automation`, subagent `@configuration-automation`
- `Dependency Reviewer` -> skill `dependency-reviewer`, subagent `@dependency-reviewer`
- `Findings Browser` -> skill `findings-browser`, subagent `@findings-browser`
- `Malware Responder` -> skill `malware-responder`, subagent `@malware-responder`
- `OSS Upgrade Investigator` -> skill `oss-upgrade-investigator`, subagent `@oss-upgrade-investigator`
- `Remediation Planning` -> skill `remediation-planning`, subagent `@remediation-planning`
- `SCA Remediation` -> skill `sca-remediation`, subagent `@sca-remediation`
- `Troubleshooting` -> skill `troubleshooting`, subagent `@troubleshooting`
- `Vulnerability Explainer` -> skill `vulnerability-explainer`, subagent `@vulnerability-explainer`

## Antigravity CLI 插件命令

从生成的本地插件包验证并安装：

```bash
agy plugin validate /path/to/endor-labs-agent-kit/plugins/antigravity/endor-labs-agent-kit
agy plugin install /path/to/endor-labs-agent-kit/plugins/antigravity/endor-labs-agent-kit
agy plugin list
```

仅在用户明确批准后才移除插件：

```bash
agy plugin uninstall endor-labs-agent-kit
```

Antigravity CLI 是 Gemini CLI 的消费者迁移路径。请把 Gemini 扩展安装与
Antigravity 插件安装保留为相互独立的、主机特定的选择，并在安装前验证所选包。

# Endor Agent Kit Setup

当用户要求安装、检查、更新或移除 Endor Labs Agent Kit 插件支持文件时，或
当某个 Endor Agent Kit 工作流因缺少 `endorctl`、GitHub CLI、身份认证、命名空间
或本地工具链就绪状态而受阻时，使用此设置工作流。

## 设置约定

主动检查环境，但未经用户明确批准，不得做持久性更改。为每项检查报告证据。
绝不打印机密值。

设置可以：

- 检查 `endorctl`、`gh`、`git` 以及与工作流相关语言工具的命令可用性和版本。
- 从当前进程环境读取 `ENDOR_NAMESPACE`，并在其存在时将其作为命名空间来源进行报告。
- 安全地解析 `~/.endorctl/config.yaml` 中的非机密字段，例如
  `ENDOR_API` 和 `ENDOR_NAMESPACE`。
- 仅按键名报告凭据字段是否存在。
- 仅按键名报告 `ENDOR_API_CREDENTIALS_*` 身份认证变量是否存在。
- 当配置或凭据存在时，运行轻量级只读 Endor 身份认证验证。
- 当验证失败时，提供重新认证选项。
- 检查 `gh` 身份认证，并指引到官方安装指南。
- 当所选工作流需要 MCP 或用户要求设置 MCP 时，检查 Endor MCP 支持情况。
- 仅在说明确切的文件、命令和验证步骤之后，才提供主机特定的 Endor MCP 配置。
- 仅在明确批准之后，才安装、更新或卸载主机特定的 Agent Kit 支持文件。

设置不得：

- 运行 `endorctl scan`。
- 运行 `endorctl host-check`。
- 打印 `~/.endorctl/config.yaml` 或机密值。
- 读取、cat、source、递归遍历 `ENDORCTL_CONFIG` 或 `--config-path`，或将其指向
  租户特定、客户特定、生产、备份或其他非默认的 Endor 配置目录。
- 要求用户将 API 密钥、API 机密、令牌或密码粘贴到聊天中。
- 写入 `ENDOR_API_CREDENTIALS_KEY` 或 `ENDOR_API_CREDENTIALS_SECRET`。
- 编辑 shell 配置文件，例如 `.zshrc`、`.bashrc` 或 PowerShell 配置文件。
- 安装 `gh`、包管理器、语言运行时、Docker、JDK 或构建工具。
- 未经用户明确批准，全局配置 MCP。MCP 仍按配方/工作流逐个选择启用。

## 就绪报告

以简洁的就绪报告开头。将已配置状态与已验证状态区分开。

在相关时包含以下部分：

- 就绪
- 需要处理
- 可选检查
- 可用的修复

对于 Endor 身份认证，仅报告脱敏后的字段：

```text
Endor config: found
API endpoint: https://api.endorlabs.com
Namespace candidates:
- ENDOR_NAMESPACE: not set
- ~/.endorctl/config.yaml ENDOR_NAMESPACE: example-namespace
Selected namespace: example-namespace from ~/.endorctl/config.yaml
Auth: API credential fields present
Endor auth: verified for namespace example-namespace
Secret values: hidden
```

如果缺少命名空间，说明在进行实时 Endor 查询前需要一个命名空间。如果检测到
命名空间，让用户使用它或为当前工作流覆盖它。

如果当前进程环境中的 `ENDOR_NAMESPACE` 与 `~/.endorctl/config.yaml` 不一致，
展示两个值，并在实时 Endor 查询前停止。询问用户为本工作流使用哪个命名空间。
不要默默信任任一值，也不要取消设置环境变量或编辑配置文件，除非用户明确要求
进行该独立的运维清理。

当用户选择或提供命名空间后，后续工作流智能体必须在带范围的 Endor 查询中
显式传入 `-n <namespace>` 或 `--namespace <namespace>`，而不是依赖裸 `endorctl`
的命名空间解析。

## Endor 工具链

如果缺少 `endorctl`，按以下顺序提供文档化的安装选项：

1. 可用时的包管理器途径，例如 Homebrew 或 npm。
2. 带校验和验证的直接二进制下载。

仅在明确批准后才安装 `endorctl`。如果安装到 `~/bin`，告知用户如何为当前
shell 更新 `PATH`。不要编辑 shell 配置文件。

如果存在 API 凭据字段，除非用户明确要求切换或重新认证，否则不要运行浏览器
认证。如果需要设置 API 凭据，告知用户通过其偏好的安全环境机制设置
`ENDOR_API_CREDENTIALS_KEY` 和 `ENDOR_API_CREDENTIALS_SECRET`。

当请求浏览器或 SSO 身份认证时，先确认命名空间。在支持的地方使用非交互式标志。
如果出现多租户选择，总结可用的租户选项，并在重试前询问用户。

## Endor MCP

对于使用 Endor CLI API 调用的工作流，要求 `endorctl agent api --help` 成功。
每个所选工作流必须通过 `--agent-id` 传入其规范配方 id；绝不回退到未归因的
旧版 API 命令。仅当所选的支持 MCP 的工作流需要它，或用户明确要求时，才配置
Endor MCP。

分发包可能包含即用型的 Endor MCP 配置片段，例如根 `.mcp.json` 或 Gemini
的 `mcpServers` 元数据。将这些文件视为设置输入，而非未经批准即可启动或注册
MCP 的许可。

当请求设置 MCP 时：

1. 检查 `npx` 是否可用。
2. 检查 `endorctl` 是否可用。
3. 验证建议的服务器命令是否为：
   `npx -y endorctl ai-tools mcp-server`。
4. 检查主机特定的 MCP 配置位置或已安装的插件元数据。
5. 如果 `endor-cli-tools` 已注册，报告它，并在做任何更改前询问。
6. 如果它缺失，展示将要添加的确切配置，并在写入主机配置文件前请求批准。
7. 在批准和配置之后，当主机支持工具可见性检查时，在全新的主机会话中进行验证。

在主机于当前会话中暴露 Endor MCP 工具之前，不要声称这些工具已可供工作流使用。
如果 MCP 工具不可用，当 CLI 优先的工作流支持
`endorctl agent api --agent-id <canonical-recipe-id>` 时，继续使用它们；否则在
`data_gaps` 中记录缺失的 MCP 能力。

## GitHub CLI

当工作流需要 GitHub 证据、代码仓库清单、拉取请求或评论时，检查 `gh auth status`。
如果缺少 `gh`，提供当前的官方安装指南，而不是自动安装它。

不要管理 GitHub 令牌作用域或创建个人访问令牌。仅验证所选工作流所需的特定读取
或写入能力。

## 语言工具链

检测并报告与工作流相关的包管理器、语言运行时和构建工具。不要安装它们。

当工具链缺失时，报告受影响的验证步骤，并请用户通过其团队标准工具链安装它。

## 工作流安全

设置绝不执行修复、创建分支、开启 PR/MR、发布评论、写入 Endor 策略或运行扫描。
变更型工作流（如 SCA Remediation 和 AI SAST Remediation）将这些操作保留在其生成的
智能体批准门之后。

## Antigravity 特定规则

- 保持 Antigravity 插件安装显式进行。未经用户批准，不要安装、链接、更新、启用、禁用或卸载插件。
- 不要自动添加插件级 MCP。仅当所选工作流需要且用户批准时，才引导 MCP 设置。
- 不要收集、写入或持久化 Endor API 凭据值。仅按键名报告凭据是否存在。
- 委托工作流时，以 `@agent-name` 形式调用捆绑的子智能体；不要臆造替代的调用名称。
- 不要叙述工具规划的闲聊。返回所请求的证据、决策和缺口。
- 当所需的 Endor 证据不可用时，包含 `evidence_queries` 和非空的 `data_gaps`，而不是猜测。
- Antigravity 子智能体由主机管理；如果子智能体委托不可用，使用匹配的技能并报告该限制。
- 如果新安装的技能或子智能体不可见，告知用户在安装或更新插件后重启 Antigravity CLI。
