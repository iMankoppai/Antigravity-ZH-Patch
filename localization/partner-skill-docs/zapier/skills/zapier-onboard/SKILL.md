---
name: zapier-onboard
description: 引导新用户使用 Zapier MCP——介绍它能做什么，走一遍认证流程，并根据其配置状态引导进入正确的流程。在刚开始使用、排查连接问题，或用户询问“什么是 Zapier MCP”、“我如何开始使用 Zapier”、“帮我配置好”、“我可以用 Zapier 做什么”或“介绍一下 Zapier”时使用。
---

# Zapier 入门引导

介绍 Zapier MCP，让用户完成认证，然后引导他们走合适的配置流程。

关于 Zapier MCP 服务器本身如何工作，参见 [docs.zapier.com/mcp](https://docs.zapier.com/mcp/home)。

## 第 1 步：介绍

先描述 Zapier MCP 能为用户做些什么，然后让他们完成认证。

### 推介

“Zapier MCP 把你的 AI 助手连接到 9,000+ 个应用——Slack、Gmail、Google Calendar、Jira、Notion、HubSpot，以及成千上万个更多应用。配置好后，你可以跨你的工具进行搜索、执行操作并自动化工作流，全部通过自然对话完成。它会根据你的工作流个性化——你挑选对你重要的应用和动作，你的 AI 则学习使用它们。”

### 检查连接

检查是否有可用的 Zapier MCP 工具：

- **工具可用**：用户已经通过认证。给出推介的简短版本——“你已经安装并连接了 Zapier MCP。让我看看你配置了什么。”——然后进入第 2 步。

- **完全没有 Zapier 工具可用**：服务器已安装但需要认证。首先，尝试在对话中直接调用 Zapier MCP 服务器上的 `mcp_auth` 进行认证。如果成功，重新检查可用工具并进入第 2 步。

  如果 `mcp_auth` 失败或不可用，则根据他们的客户端回退到手动说明：

  - **在 Cursor 中：** “让我们帮你连接。前往 **Settings > Cursor Settings > Tools & MCP**，点击 Zapier MCP 服务器旁边的 **Connect**。你也可以按 **Cmd+Shift+P** 并搜索 'MCP' 快速到达那里。”
  - **在 Claude Desktop 中：** “让我们帮你连接。前往 **Customize > Connectors > Zapier**，点击 **Connect**。”
  - **在其他客户端中：** “让我们帮你连接。在客户端的 MCP 设置中找到 Zapier MCP 服务器并点击 Connect。这会把你重定向到 mcp.zapier.com 登录。”

  从环境或对话上下文中判断正在使用哪个客户端。如果不清楚，给出通用说明。

  等待用户确认（“done”），然后重新检查可用工具并进入第 2 步。

## 第 2 步：诊断

检查可用的 Zapier MCP 工具。结果决定走哪个分支：

| 结果                                                       | 分支              |
| ------------------------------------------------------------ | ------------------- |
| Zapier 动作工具可用（配置工具之外） | **健康**         |
| 仅配置工具可用（尚无动作）          | **全新安装**   |
| 调用因认证/401 错误失败                              | **认证失效**     |
| 完全没有可用的 Zapier 工具                             | **未连接**   |

## 分支：健康

服务器已连接并配置了动作。展示一份摘要并提供下一步。

1. 查看可用的 Zapier MCP 工具，按应用分组。
2. 展示一份清晰的摘要：

“你的 Zapier MCP 已连接，在 [app list] 中共有 [N] 个工具：

- **Slack**：...
- **Gmail**：...
- **Google Calendar**：...

一切正常。你想做什么？”

3. 提供选项：
   - “实时试一个” → 触发 **zapier-demo** 技能，进行一次首个动作的走查
   - “添加更多工具” → 触发 **zapier-explore** 技能，搭建针对角色定制的工具包
   - “运行一次健康检查” → 触发 **zapier-status** 技能
   - 或者直接开始使用这些工具

## 分支：认证失效

服务器在配置中存在，但认证已过期或无效。

1. 告诉用户：

“你的 Zapier MCP 服务器已配置，但连接已损坏（认证过期）。

**[点击这里重新连接](https://mcp.zapier.com)**

登录，找到你的服务器并重新认证。完成后回来说 **done**。”

2. 等待用户确认。
3. 尝试再次调用一个 Zapier 工具以验证。
4. 如果成功：展示健康摘要。
5. 如果仍然失败：建议删除并重建服务器配置。提供帮助，用新的令牌更新 MCP 配置文件（参见下面的“按客户端划分的 MCP 配置”）。

## 分支：未连接

Zapier MCP 服务器已通过插件安装，但尚未认证。这是全新安装时最常见的状态——看不到任何 Zapier 工具，因为服务器尚未连接。

1. 告诉用户 Zapier 插件已安装，但需要先连接。

2. 尝试在对话中直接调用 Zapier MCP 服务器上的 `mcp_auth` 进行认证。如果成功，跳到第 5 步。

3. 如果 `mcp_auth` 失败或不可用，则根据他们的客户端回退到手动说明：

   - **在 Cursor 中：** “前往 **Settings > Cursor Settings > Tools & MCP**，点击 Zapier MCP 服务器旁边的 **Connect**。你也可以按 **Cmd+Shift+P** 并搜索 'MCP' 快速到达那里。”
   - **在 Claude Desktop 中：** “前往 **Customize > Connectors > Zapier**，点击 **Connect**。”
   - **在其他客户端中：** “在客户端的 MCP 设置中找到 Zapier MCP 服务器并连接它。这会把你重定向到 mcp.zapier.com 登录。”

   从环境或对话上下文中判断正在使用哪个客户端。如果不清楚，给出通用说明。

4. 等待用户确认（“done”）。

5. 通过检查可用的 Zapier MCP 工具重新诊断。进入合适的分支——很可能是**全新安装**（服务器已连接，尚无动作）。

## 分支：全新安装

服务器已连接，但尚未配置任何动作。用户需要通过 Zapier 添加动作。

### 第 1 步：工作流优先的发现

不要问“你用什么应用？”。从他们想达成的目标开始。

“你已连接，但还没配置任何工具。我们来添加一些。”

引导用户前往 [mcp.zapier.com](https://mcp.zapier.com)（如果可用，也可以调用服务器的配置 URL 工具），以便他们直接进入其服务器的工具配置页面。

然后根据他们的工作流帮助他们挑选要添加的内容：

**按工作流划分的入门套件：**

| 工作流                 | 应用                                                          | 为什么是这些                                              |
| ------------------------ | ------------------------------------------------------------- | ------------------------------------------------------ |
| **开发工作流**         | Jira + GitLab + Slack + Google Docs                           | 问题跟踪、代码评审、团队沟通、文档 |
| **PM 工作流**          | Jira + Slack + Google Docs + Google Calendar + Notion         | 规划、更新、写作、排期、知识库 |
| **销售工作流**       | HubSpot + Gmail + Google Calendar + Slack                     | CRM、外联、排期、团队更新                |
| **营销工作流**   | Google Sheets + Slack + Notion + Gmail                        | 数据、协调、内容、活动                 |
| **通用生产力** | Gmail + Google Calendar + Slack + Google Docs + Google Sheets | 适用于所有人的基础项                              |

“挑一个入门套件，或者告诉我你在做什么，我来建议合适的工具。”

### 第 2 步：引导配置

推荐用户应为每个应用添加的具体动作。目标是每个应用 2–4 个动作：一到两个搜索动作和一到两个写入动作。

**按应用分列的推荐入门动作：**

| 应用             | 搜索动作                         | 写入动作            |
| --------------- | -------------------------------------- | ------------------------ |
| Slack           | Find Message, Get Message              | Send Channel Message     |
| Gmail           | Find Email                             | Send Email, Create Draft |
| Google Calendar | Find Events                            | Create Detailed Event    |
| Google Docs     | Get Document Content                   | Create Document          |
| Google Sheets   | Get Data Range, Lookup Row             | Add Row                  |
| Jira            | Find Issue by Key, Find Issues via JQL | Create Issue             |
| Linear          | Find Issue                             | Create Issue             |
| GitLab          | Find Merge Requests                    | (read-heavy by nature)   |
| GitHub          | Find Issue, Find Pull Request          | Create Issue             |
| HubSpot         | Find Contact, Find Company             | Create Contact           |
| Notion          | Find Page, Find Database Item          | Create Page              |
| Zoom            | Find Meeting                           | (read-heavy)             |
| Coda            | Find Row                               | Create Row               |
| Airtable        | Find Record                            | Create Record            |

告诉用户为他们选定的应用应添加哪些动作，然后等待他们配置并认证好一切。

“在 Zapier 仪表盘中添加这些动作并连接你的应用账户。完成后回来说 **done**。”

### 第 3 步：验证

用户确认后，检查可用的 Zapier MCP 工具，看看添加了什么。如果出现了新工具，展示一份摘要。如果没有变化，用户可能需要重载客户端（参见下面的“按客户端划分的重载说明”）。

### 第 4 步：收尾

一切连接好后：

1. 展示配置的最终摘要。
2. 交接给自然的下一步：

“你已配置好。想实时试一个吗？运行 **/zapier-demo** 看一个动作工作，或者如果你想继续搭建工具包，运行 **/zapier-explore**。”

## 按客户端划分的 MCP 配置

| 客户端         | 配置文件位置                                                      | 作用域          |
| -------------- | ------------------------------------------------------------------------- | -------------- |
| Cursor         | `.cursor/mcp.json`（项目）或 `~/.cursor/mcp.json`（全局）             | 项目/全局 |
| Claude Desktop | `~/Library/Application Support/Claude/claude_desktop_config.json`（macOS） | 全局         |
| Claude Code    | `.mcp.json`（项目）或 `~/.claude/mcp.json`（全局）                    | 项目/全局 |
| Windsurf       | `~/.codeium/windsurf/mcp_config.json`                                     | 全局         |

从环境或对话上下文中判断正在使用哪个客户端。如果不清楚，就问。

## 按客户端划分的重载说明

| 客户端         | 如何重载                                 |
| -------------- | --------------------------------------------- |
| Cursor         | Cmd+Shift+P → “Reload Window”                 |
| Claude Desktop | 退出并重新打开应用                       |
| Claude Code    | 运行 `/mcp` 检查状态，必要时重启 |
| Windsurf       | Cmd+Shift+P → “Reload Window”                 |

## 语气

随意而高效。不要解释 MCP 或协议细节。快速把他们带到正确的地方。如果出了问题，直接说：“那没成功。我们试试……”
