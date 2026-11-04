---
name: ddconfig
description: 配置或排查插件的 Datadog MCP 服务器。当用户想要更改 Datadog 域、切换组织，或当服务器之前已配置但无响应时使用。
---

## Datadog MCP 服务器

本文档所引用的 Datadog MCP 服务器的 id 是 `datadog-antigravity`。即使存在其他 Datadog 服务器，你也必须使用这个特定的服务器。

## 共享参考

**这是一道硬性关卡，而非建议。** 在继续并撰写任何面向用户的文字、提出任何问题，或执行此技能建议的任何文件编辑之前，你都必须实际阅读 [references/mcp-settings.md](references/mcp-settings.md) —— 即使你相信自己已经从之前的轮次或之前的会话中知道其内容。不要凭记忆回答 Datadog 站点代码、域或文件路径；该文件中的表格和路径规则是唯一的权威来源，它们可能与你的通用知识或你在其他上下文中见过的情况不同。

`references/mcp-settings.md` 文件包含 `datadog-server-state` 检查、注册文件位置、编辑规则，以及下面各流程所用的站点到域映射。

## 入口流程

检查 `datadog-server-state`（见 `mcp-settings.md`）。使用插件的 Datadog MCP 服务器上的 `datadog://mcp/whoami` 资源作为 MCP 调用（不要使用任何其他 Datadog MCP 服务器）。在 `datadog-server-state` 和资源内容可用之前，不要输出任何内容，并根据结果继续：

- **datadog-server-state=working** 且**内容有效** —— 不加任何前言，立即向用户展示其当前连接（来自 `whoami`）：用户名和邮箱、组织名称以及站点（`dd_site` 值）。然后让用户在[使用不同的 Datadog MCP 域或站点](#domain-flow)与[切换到不同的 Datadog 组织](#organization-flow)之间做选择。
- **datadog-server-state=not-setup** —— 不加任何前言，告诉用户插件尚未设置，并指示他们运行 `/ddsetup`，然后停止。
- **datadog-server-state=not-working** 或**内容无效** —— 不加任何前言，告诉用户服务器已配置但无法工作，并转到[故障排查流程](#troubleshooting-flow)。

在下面与用户沟通时，用平实的语言描述服务器状态和操作。不要透露检查了什么、发现了什么，或任何实现细节，如文件内容或变量值。

## 故障排查流程

服务器已配置但无响应。从注册文件中读取当前域（关于文件格式以及如何找到域，见 `mcp-settings.md`），然后向用户列出可能的原因 —— 不要按顺序逐条执行，而是将它们全部展示出来并自行判断：

- **域问题。** 将域与 `mcp-settings.md` 中的站点到域表格进行对比。只有当它看起来像拼写错误或明显格式错误的 URL（例如 `mcp.us5.datadog.com` 缺少 `hq`）时，才把它标记为可疑。不在标准表格中的域不一定就是错的 —— 用户可能正在使用一个有效的非标准域。

- **认证。** 认证可能已过期或从未完成，用户需要按照以下步骤操作：

  在 Antigravity 应用或 IDE 中：
  1. 打开 Agent 设置（Mac 上为 ⌘,，Windows/Linux 上为 Ctrl+, —— 请显示当前操作系统对应的正确快捷键），然后转到 **Customizations**
  2. 点击 `datadog-antigravity` 服务器旁边的 **Authenticate**，在浏览器中登录，然后把授权码粘贴到设置中并点击 **Submit**

  在 Antigravity CLI 中：
  1. 运行命令 `/mcp`，重新加载 MCP 配置，并在提示时对 `datadog-antigravity` 服务器进行认证

- **网络或访问。** 用户的网络可能正在阻止连接，或者其 Datadog 账户可能没有 API 访问权限，例如没有 `MCP Read` 权限。

如果域看起来有误，建议运行[域流程](#domain-flow)来更正它。

## 域流程

更改服务器连接的 Datadog MCP 域。

1. 显示当前域信息（可用时来自 `whoami` → `dd_site`，或来自注册文件中的当前域 —— 关于文件格式见 `mcp-settings.md`）。用平实的语言呈现（例如“插件当前连接到的站点是……”）—— 遵循 `mcp-settings.md` 中的“遵循脚本”规则。

2. **询问新的域。** 从 `mcp-settings.md` 中展示可用的站点及其 MCP 域，并询问要切换到哪个域。用户可能直接回复一个 MCP 域、一个站点代码、一个 URL 或其他内容 —— 使用 `mcp-settings.md` 中的映射规则来解析答案。如果有歧义，请求澄清。

   遵循 `mcp-settings.md` 中的“遵循脚本”规则。特别是，不要预览下面第 4 步的后续说明（重新加载、重新认证等）—— 那一步会在恰当的时刻逐字给出这些内容。

3. 按照 `mcp-settings.md` 中的编辑规则，在注册文件中编辑域。

   更改前（示例）：

   ```
   "serverUrl": "https://mcp.datadoghq.eu/v1/..."
   ```

   更改后（切换到 us1）：

   ```
   "serverUrl": "https://mcp.datadoghq.com/v1/..."
   ```

   **在报告成功之前验证编辑。** 在你推导出的确切路径上重新读取注册文件，确认新的 MCP 域已存在且旧的已消失。在此重新读取确认之前，不要告诉用户域已更改。如果文件仍然保留着旧域，说明编辑落在了别处 —— 使用 `mcp-settings.md` 中的规则重新推导路径并再次应用更改，而不是报告成功。

4. 告诉用户域已更改，并请他们按照以下步骤操作：

   在 Antigravity 应用或 IDE 中：
   1. 打开 Agent 设置（Mac 上为 ⌘,，Windows/Linux 上为 Ctrl+, —— 请显示当前操作系统对应的正确快捷键），然后转到 **Customizations**
   2. 在已安装的 MCP 服务器下，点击刷新按钮
   3. 点击 `datadog-antigravity` 服务器旁边的 **Authenticate**，在浏览器中登录，然后把授权码粘贴到设置中并点击 **Submit**

   在 Antigravity CLI 中：
   1. 运行命令 `/mcp` 并重新加载 MCP 配置
   2. 在提示时对 `datadog-antigravity` 服务器进行认证

## 组织流程

切换到不同的 Datadog 组织。智能体无法自动完成此操作 —— 用户必须在浏览器中选择目标组织。

询问用户是想使用同一域上的组织，还是不同域上的组织。

- 如果在同一域上：
  - 用户需要重新认证，并在登录期间于浏览器中选择目标组织，使用以下步骤：

    在 Antigravity 应用或 IDE 中：
    1. 打开 Agent 设置（Mac 上为 ⌘,，Windows/Linux 上为 Ctrl+, —— 请显示当前操作系统对应的正确快捷键），然后转到 **Customizations**
    2. 点击 `datadog-antigravity` 服务器旁边的 **Authenticate**，在浏览器登录期间选择目标组织，然后把授权码粘贴到设置中并点击 **Submit**

    在 Antigravity CLI 中：
    1. 运行命令 `/mcp`，重新加载 MCP 配置，并对 `datadog-antigravity` 服务器进行认证，在登录期间选择目标组织

- 如果域不同：
  - 运行[域流程](#domain-flow)，并告知用户在登录期间于浏览器中选择目标组织。
