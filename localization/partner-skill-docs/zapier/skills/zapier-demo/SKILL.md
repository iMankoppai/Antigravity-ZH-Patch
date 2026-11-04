---
name: zapier-demo
description: 带领新用户完成第一个 Zapier 动作的设置并实时运行——这是尽可能小的一个胜利。询问他们使用哪个应用，推荐一个可启用的读取动作，引导他们前往 mcp.zapier.com 添加它，然后在同一个对话中演示其运行效果。当用户询问“向我展示 Zapier 如何工作”、“设置我的第一个动作”、“给我一个快速演示”、“我想试试”、“最快看到它运行的方法是什么”、“最简配置”、“hello world”或“最小的示例”时使用。
---

# Zapier 演示

带领新用户完成尽可能小的第一个胜利——一个应用、一个读取动作、一个真正能运行的提示词。整个流程应当感觉很快：从“我很好奇”到“哦，成功了”，只需几分钟。

对于希望在配置完整工具包之前先看到 Zapier 运行效果的用户，这是 `zapier-onboard` 之后自然的下一步。

## 何时使用与其他技能的区别

- **zapier-demo**（本技能）—— *一个应用、一个动作、即时演示。* 通往“哦，这能行”的最快路径。
- **zapier-onboard** —— *推介 + 连接 + 诊断。* 如果服务器尚未连接，请先运行此技能。
- **zapier-explore** —— *针对角色定制的扩展。* 在演示之后运行此技能，为用户角色搭建完整工具包。
- **zapier-status** —— *对现有配置进行健康检查和审计。*

如果用户说“给我看看”，倾向使用本技能。如果他们尚未连接服务器，请先路由到 zapier-onboard。

## 第 1 步：确认服务器已连接

检查可用的 Zapier MCP 工具。如果不存在任何工具，说明服务器尚未通过认证——先通过 `mcp_auth` 或客户端的 MCP 设置进行认证（与 `zapier-onboard` 的连接步骤相同）。在至少配置工具可用之前，不要继续。

连接后，设定基调：

> “让我们先让一个 Zapier 动作运行起来，这样你就能看到它的实际效果。我们会挑一个应用、启用一件事，然后试一试——应该只要几分钟。”

## 第 2 步：询问从哪个应用开始

先从具体的热门选项开始——大多数人觉得对一份列表做出反应，比凭空想出一个更容易：

> “你想先试哪个应用？几个热门选项可供选择：
> - **Gmail** —— 查找或起草邮件
> - **Slack** —— 查找消息并通知频道
> - **Google Sheets** —— 在表格中查找行
> - **Google Calendar** —— 查看你的日程
> - **HubSpot** —— 查找联系人和交易
> - **Jira** —— 查找工单
> - **Notion** —— 查找页面
>
> 也可以说别的——Zapier 支持 9,000+ 个应用。”

### 确认支持并获取应用详情

用户选定后，**抓取该应用的 Zapier 营销页面**以确认 Zapier 支持它，并为第 3 步呈现动作详情：

```
https://zapier.com/apps/{app-slug}.md
```

示例：`https://zapier.com/apps/slack.md`、`https://zapier.com/apps/hubspot.md`、`https://zapier.com/apps/google-calendar.md`。

**Slug 约定：** 小写并用连字符连接。`Google Calendar` → `google-calendar`。`Microsoft Teams` → `microsoft-teams`。`HubSpot` → `hubspot`。不确定时，查看 `https://zapier.com/find-apps/{letter}`（按字母浏览）以确认标准 slug。

抓取到的页面会告诉你：
- **Zapier 是否支持该应用** —— 抓取成功 = 支持
- **可用的读取/写入动作和触发器** —— 用这些来在第 3 步推荐合适的入门动作
- **热门的跨应用 Zap** —— 对第 6 步的“接下来做什么”推介有用

如果 `.md` 镜像返回 404，尝试回退到 HTML 页面 `https://zapier.com/apps/{app-slug}`。如果两者都返回 404，如实告知用户：

> “我在 Zapier 的目录里没找到名为 [App] 的应用。想换一个，还是到 [zapier.com/apps](https://zapier.com/apps) 核对一下拼写？”

如果他们纠结于选择：

> “如果没什么特别中意的——Google Calendar 是最容易上手的第一个。每个人都有日历，而‘明天有什么安排？’这个演示每次都奏效。”

## 第 3 步：推荐一个入门动作（只读）

使用第 2 步营销页面抓取到的动作列表，挑选**一个读取动作**——搜索/查找/获取/查询。只读在这里很重要：写入动作需要确认，这会给首次演示增加摩擦。我们要的是尽可能简单的“点击运行、看到结果”循环。

用通俗的语言告诉用户你推荐什么以及为什么：

> “很好——对于 Calendar，最简单的第一个动作是 **Find Events**。它能让你的 AI 查询你的日程安排。我们就加这个，然后试一试。”

### 按应用分列的回退入门动作

如果营销页面抓取没有呈现明确的读取动作，就针对最常见应用回退到这张表：

| 应用 | 推荐的第一个动作 | 原因 |
|---|---|---|
| Google Calendar | Find Events | 通用、易于验证（“明天有什么安排？”） |
| Gmail | Find Email | 价值高，每个用户都有邮件可查 |
| Slack | Find Message | 在重度聊天的工作流中最常用 |
| Google Drive | Find a File | 适用于任何有 Drive 的用户 |
| Google Sheets | Lookup Spreadsheet Row | 需要特定表格，但非常直观 |
| Jira | Find Issue by Key | 需要 Jira 工单键（例如 PROJ-123）——易于测试 |
| Linear | Find Issue | 与 Jira 相同的模式 |
| GitHub | Find Pull Request | 读取为主的使用场景，演示快 |
| GitLab | Find Merge Requests | 与 GitHub 相同 |
| Notion | Find Page | 对记笔记的人有用 |
| HubSpot | Find Contact | 偏销售，易于用自己邮箱测试 |
| Salesforce | Find Record | 类似 HubSpot——按邮箱或名称选择 |
| Trello | Find Card | 可视化、易于验证 |
| Asana | Find Task | 相当于项目管理 |
| Airtable | Find Record | 偏数据库 |
| Google Docs | Get Document Content | 拉取你打开的某个文档 |

如果用户提到的应用不在此列表中，默认采用“Find [Thing]”模式——几乎所有 Zapier 支持的应用都有搜索/查找动作。如果你不确定确切名称，就说“[App] 的查找/搜索动作”，让用户在配置界面中选择正确的那个。

## 第 4 步：引导他们启用它

如果服务器暴露了 `get_configuration_url` 工具，先调用它并给用户直接链接。否则，指向 [mcp.zapier.com](https://mcp.zapier.com)。

然后告诉他们该做什么：

> “打开[那个链接]，找到你的服务器，添加 **[App] – [Action]** 动作。被提示时你还需要连接你的 [App] 账户（OAuth）。添加好后回来说 **done**。”

等待确认。如果他们遇到问题：

- **“添加后它没有显示出来”** —— 他们需要重启 MCP 客户端，以便它重新读取工具列表（Cursor：Cmd+Shift+P → “Reload Window”；Claude Desktop：退出并重新打开；Claude Code：退出并重启——`/mcp` 显示状态但不会重新拉取工具）。
- **“它说我需要认证 [App]”** —— 那是 mcp.zapier.com 上的 OAuth 流程。让他们完成并重试。

他们确认后，重新检查工具并验证该动作现已可用。

## 第 5 步：实时试用

现在是关键时刻。根据他们启用的内容，建议一条量身定制的提示词：

| 动作 | 建议的提示词 |
|---|---|
| Calendar: Find Events | “我明天日历上有什么？” |
| Gmail: Find Email | “找出我最近一封来自[他们同事的名字或域名]的邮件” |
| Slack: Find Message | “找出我在 #[他们所在的某个频道] 里发的最近一条消息” |
| Drive: Find File | “在我的 Drive 里找一个叫[他们记得的某个东西]的文件” |
| Sheets: Lookup Row | “在我的[表格名称]表格里查找[行标识]” |
| Jira: Find Issue | “查找 Jira 工单 [PROJ-123]”（用他们真实的工单） |
| Linear: Find Issue | “查找 Linear 工单 [ENG-42]” |
| GitHub/GitLab: Find PR/MR | “给我看看 [repo] 里最近的 PR” |
| Notion: Find Page | “查找我叫[页面标题]的 Notion 页面” |
| HubSpot: Find Contact | “查找[他们自己的邮箱]对应的 HubSpot 联系人” |
| Trello: Find Card | “在我的[看板名称]看板上查找 Trello 卡片” |

这样表述：

> “现在试着对我说：**‘我明天日历上有什么？’** —— 我会运行那个动作并把数据拉出来。”

然后在用户请求时真正运行它。干净地展示结果：前 3–5 条事件及其标题和时间，而不是一大堵 JSON。

如果调用失败（认证问题、找不到动作等），快速排查，不要让用户惊慌：

> “看起来 [App] 连接需要快速重新认证——前往 mcp.zapier.com，点击 [App] 上的 Connect，然后我们再重试。”

## 第 6 步：庆祝并提供下一步

当动作返回数据时，点明这次胜利：

> “就是这样——这就是 Zapier MCP 在工作。你只是用平实的语言问了一个问题，你的 AI 就从 [App] 拉取了真实数据。同样的模式适用于成千上万的其他应用和动作。”

然后一次只提供一个自然的下一步——不要把选项全都倒出来：

> “从这里开始，有几个方向：
> - 想让我为你的角色搭建完整工具包吗？→ 运行 **/zapier-explore**
> - 或者继续用这一个，需要时再添加更多。”

## 进度清单

边做边勾选，以免遗漏：

- [ ] 已确认服务器连接（或已重新认证）
- [ ] 用户从热门列表中选了一个应用（或自己指定了一个）
- [ ] 已抓取 `zapier.com/apps/{slug}.md` 营销页面以确认支持
- [ ] 已推荐一个**读取**动作并附一行理由
- [ ] 用户已确认该动作启用
- [ ] 已建议演示提示词，并实时运行
- [ ] 已点明胜利、提供下一步交接

## 注意事项

- **首次演示绝不推荐写入动作。** 只读是规则——写入确认会在我们想要顺畅“它能用”体验的关键时刻增加摩擦。
- **不要把全部应用或动作表格都倒出来。** 第 2 步的 7 个应用列表是菜单；第 3 步的动作表是回退参考。用户看到的是一份推荐，而不是自助餐。
- **如果启用后工具没有出现，先重启客户端**，而不是重新认证。Cursor：Cmd+Shift+P → “Reload Window”。Claude Desktop：退出并重新打开。Claude Code：退出并重启（`/mcp` 只显示状态——它不会重新拉取工具）。
- **Sheets：Lookup Row 需要预先提供表格 ID。** 这是最容易失败的首次演示，因为用户手边没有 ID。如果他们选了 Sheets，请他们在添加动作前先获取一个分享链接。
- **Slug 准确性很重要。** `Google Calendar` → `google-calendar`，而不是 `googlecalendar`。在抓取营销页面之前把 slug 弄对，否则查询会因错误的原因返回 404。
- **在 `zapier.com/apps/{slug}.md` 和 `zapier.com/apps/{slug}` 的 HTML 都返回 404 之前，不要断言“Zapier 不支持 [App]”。** `.md` 镜像在某些路由上不稳定。

## 语气

友好、低压、行动导向。这是某人的第一印象——保持轻松。除非用户先提起，否则在面向用户的文案中避免行话（“OAuth”、“MCP server”、“actions”）。说“Zapier 动作”而不是“MCP 工具”，说“连接你的账户”而不是“认证这个集成”。

如果出了问题，不要长篇道歉。只说下一步该做什么：*“快速重新认证，我们就回来了。”*
