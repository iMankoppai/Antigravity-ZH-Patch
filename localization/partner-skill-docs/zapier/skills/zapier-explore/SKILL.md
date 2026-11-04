---
name: zapier-explore
description: 探索 Zapier MCP 能为用户做些什么——就用户的角色及其日常使用的应用进行访谈，以按需提示词的形式建议具体用例，然后引导他们启用相应动作，让这些用例成为现实。这是 `zapier-demo` 之后自然的下一步。当用户询问“Zapier 还能为我做什么”、“设置更多工具”、“为我的角色添加一个入门套件”、“我接下来该启用什么”、“推荐工作流”、“帮我想想能用 Zapier 做什么”、“我不知道从哪开始”或“给我一些 Zapier 示例”时使用。
---

# Zapier 探索

帮助用户超越第一个动作——根据他们的角色和应用，弄清 Zapier MCP 能为他们做些什么，然后引导他们启用一组为该工作量身定制的入门动作。

这是 `zapier-demo` 自然的后续。演示证明一个动作可用；探索则把它变成适应用户日常的真正工具包。

关于 Zapier MCP 服务器本身如何工作，参见 [docs.zapier.com/mcp](https://docs.zapier.com/mcp/home)。

## 何时使用与其他技能的区别

- **zapier-explore**（本技能）—— *针对角色定制的扩展。* 访谈 + 用例 + 配置。
- **zapier-demo** —— *一个应用、一个动作、实时运行。* 如果用户还没看过 Zapier 工作，请先运行此技能。
- **zapier-onboard** —— *推介 + 连接。* 仅服务器级认证。如果服务器未连接，请在演示之前运行此技能。
- **zapier-status** —— *对现有配置进行健康检查和审计。*

如果用户还没运行过第一个动作，请先路由到 **zapier-demo**——探索在一次胜利之后效果最好。

## 第 1 步：访谈

保持简短——两三个问题，不要做问卷调查。根据回答调整追问。

这样开场：

> “让我们弄清楚该往你的 Zapier 工具包里加些什么。先了解一点上下文——你是做什么工作的，每天都会用到哪些应用？”

留意：
- **角色/职能**（工程师、产品经理、销售、市场营销、创始人、支持、创作者、运营、招聘、财务、高管、个人）
- **提到的应用**（Slack、Gmail、Jira、HubSpot 等）
- **行业信号**（独立自动化构建者 vs. 团队一员，B2B vs. 消费者，初创 vs. 企业）

如果他们只给了角色*或*只给了应用，追问一个问题。如果两者都给了，可选地问：

> “有没有一件你反复手动去做、希望交给别人代劳的任务？”

不要超过三个问题。就用你已有的信息继续。

## 第 2 步：建议用例

从下面的**角色库**中挑选最匹配用户回答的那一个（多个也可以——混合角色可以组合）。对每一个，围绕他们提到的应用呈现 4–6 个用例。如果他们提到的应用不在库中，默认采用最接近的等价物（例如“Outlook”→ 用 Gmail 的模式；“Monday.com”→ 用 Asana 的模式）。

对每个用例，输出：

- **提示词** —— 用户可以对其 AI 说的确切话语，用引号括起
- **它做什么** —— 一行说明
- **需要的动作** —— 他们要启用才能使其工作的具体 Zapier 动作

每个用例格式化为一小段散文式文字，而不是表格。一次不要列出超过 6 个用例。如果更多，就分批呈现——先给 4 个，看看哪些引起共鸣，然后再问“还想要更多吗？”

## 第 3 步：挑选并确认

对于用户有反应的用例（“对，就那个”），按应用分组生成一份合并的**启用清单**：

> “要让这些起作用，你需要启用：
> - **Slack：** Send Channel Message、Find Message
> - **Jira：** Find Issue by Key、Create Issue
> - **Google Calendar：** Find Events”

交叉参照下面**按应用分列的推荐动作**表来填补缺口——目标是每个应用 2–4 个动作（1–2 个搜索、1–2 个写入）。

## 第 4 步：引导他们启用

引导用户前往他们的 Zapier 仪表盘：

- 如果服务器暴露了 `get_configuration_url` 工具，先调用它并给他们直接链接。
- 否则，指向 [mcp.zapier.com](https://mcp.zapier.com)。

然后告诉他们该做什么：

> “打开[那个链接]，找到你的服务器，添加上面清单中的动作。被提示时你还需要连接每个应用的账户（OAuth）。全部添加好后回来说 **done**。”

等待确认。如果他们遇到问题：

- **“添加后它没有显示出来”** —— 他们需要重启 MCP 客户端，以便它重新读取工具列表（Cursor：Cmd+Shift+P → “Reload Window”；Claude Desktop：退出并重新打开；Claude Code：退出并重启）。
- **“它说我需要认证 [App]”** —— 那是 mcp.zapier.com 上的 OAuth 流程。让他们完成并重试。

## 第 5 步：验证

重新检查可用的 Zapier MCP 工具，确认新动作已存在。如果有任何缺失，与用户一起排查——通常重载一次客户端就够了。

## 第 6 步：庆祝并提供下一步

一切启用后，点明胜利并提供自然的下一步：

> “你已在 [App list] 中配置好 [N] 个工具。现在就试一个——说点类似‘[为他们的配置量身定制的示例提示词]’的话，我会运行它。或者随时运行 **/zapier-status** 来检查你工具的健康状况。”

## 用例库

不要把每个用例逐字念给用户听。挑选与其上下文最相关的几个，作为自然的推荐呈现。

### 工程师

- “找出分配给我、本迭代仍未关闭的 Jira 工单。” *—— Jira: Find Issues via JQL*
- “获取等待我评审的 GitHub PR。” *—— GitHub: Find Pull Request*
- “拉取值班表，告诉我我的下一个班次是什么时候。” *—— PagerDuty: Find On-call*
- “从这个 Slack 讨论串创建一个 Linear 工单。” *—— Slack: Get Message + Linear: Create Issue*
- “找出我服务最新的 Sentry 错误，并把它作为 Jira bug 提交。” *—— Sentry: Find Issues + Jira: Create Issue*
- “总结本周我 GitLab MR 上的活动。” *—— GitLab: Find Merge Requests*

### 产品经理

- “把本周来自 #product-feedback 的客户反馈总结成一份 Notion 文档。” *—— Slack: Find Messages + Notion: Create Page*
- “找出所有标记为 'this-sprint' 的 Jira 工单，并为站会发布一条 Slack 更新。” *—— Jira: Find via JQL + Slack: Send Channel Message*
- “查询 [customer] 的 HubSpot 交易，并起草一封跟进邮件。” *—— HubSpot: Find Deal + Gmail: Create Draft*
- “把这个 Slack 讨论串转换成一个 Linear 功能请求。” *—— Slack: Read Thread + Linear: Create Issue*
- “拉取我下周的日历，并高亮客户通话。” *—— Google Calendar: Find Events*
- “找出提及 [feature] 的 Linear 工单，并总结它们的状态。” *—— Linear: Find Issues*

### 销售（AE / SDR）

- “查找 [email] 对应的 HubSpot 联系人，并把这次通话记录为一条备注。” *—— HubSpot: Find Contact + HubSpot: Create Note*
- “在 Salesforce 中查询 [company]，并起草一封个性化的外联邮件。” *—— Salesforce: Find Account + Gmail: Create Draft*
- “在 Pipedrive 中搜索本月成交的交易。” *—— Pipedrive: Find Deals*
- “拉取明天的日历，告诉我哪些会议是与潜在客户的。” *—— Google Calendar: Find Events + HubSpot: Find Contacts*
- “找出 [prospect] 最近的邮件，并总结这段关系。” *—— Gmail: Find Email*
- “把这个 LinkedIn 个人资料作为新联系人添加到 HubSpot。” *—— HubSpot: Create Contact*

### 市场营销

- “获取最新的 Mailchimp 活动数据，并向 #marketing 发布一份总结。” *—— Mailchimp: Find Campaign + Slack: Send Channel Message*
- “拉取活动报名中的 Typeform 回复，并把它们添加到我的 campaigns 表格。” *—— Typeform: Find Responses + Google Sheets: Add Row*
- “为我们最新的博客文章起草推广用的 Twitter 和 LinkedIn 帖子。” *—— Webflow/Notion: Find Content + LinkedIn: Create Update + Twitter: Create Tweet*
- “总结上周的 Google Analytics 流量。” *—— Google Analytics: Get Report*
- “把这个新线索添加到 ConvertKit，并给他们打上 [segment] 标签。” *—— ConvertKit: Add Subscriber*
- “获取本周的 Klaviyo 流程表现。” *—— Klaviyo: Find Campaigns/Flows*

### 客户成功/支持

- “找出过去 30 天内来自 [customer] 的 Zendesk 工单并总结。” *—— Zendesk: Find Tickets*
- “查询该客户的 HubSpot 记录，检查他们的套餐和最近一次付款。” *—— HubSpot: Find Contact + Stripe: Find Customer*
- “查找与 [user] 的 Intercom 会话并拉取最新消息。” *—— Intercom: Find Conversation*
- “把这个支持工单转成一份 Linear bug 报告。” *—— Zendesk: Find Ticket + Linear: Create Issue*
- “找出该客户在 Slack 中链接的 Loom 视频。” *—— Slack: Search Messages*
- “为这张工单中的客户起草一封跟进邮件。” *—— Zendesk: Find Ticket + Gmail: Create Draft*

### 创始人/运营者（小型企业）

- “总结我今早的 Gmail 收件箱。” *—— Gmail: Find Email*
- “找出本周的 Stripe 付款，并在 Slack 发布一条庆祝消息。” *—— Stripe: Find Payments + Slack: Send Channel Message*
- “查看我的 QuickBooks 发票，告诉我哪些逾期了。” *—— QuickBooks: Find Invoices*
- “找出本周的 Shopify 订单并总结。” *—— Shopify: Find Orders*
- “把这个新客户同时添加到 HubSpot 和 Mailchimp。” *—— HubSpot: Create Contact + Mailchimp: Add Subscriber*
- “查看我的日历，并为我的团队起草一条下班前的 Slack 更新。” *—— Google Calendar: Find Events + Slack: Send Channel Message*

### 招聘/人力资源

- “找出当前处于 [stage] 流程阶段的 Greenhouse 候选人。” *—— Greenhouse: Find Candidates*
- “查询 [name] 对应的 Lever 候选人并检查其状态。” *—— Lever: Find Candidate*
- “把这个 LinkedIn 个人资料作为新候选人添加到 Greenhouse。” *—— Greenhouse: Create Candidate*
- “从我的日历拉取本周的面试安排。” *—— Google Calendar: Find Events*
- “找出 BambooHR 中最近待审批的休假申请。” *—— BambooHR: Find Time Off Requests*

### 财务/会计

- “找出 QuickBooks 中超过 [amount] 且未支付的发票。” *—— QuickBooks: Find Invoices*
- “查询 [email] 对应的 Stripe 客户并检查其订阅。” *—— Stripe: Find Customer*
- “向 Xero 添加一笔新支出。” *—— Xero: Create Expense*
- “从 Stripe 拉取本月收入并总结。” *—— Stripe: Find Charges*
- “找出 [account] 最近的 Plaid 交易。” *—— Plaid: Find Transactions*

### 高管/领导者

- “总结我今早的 Slack 私信。” *—— Slack: Find Messages*
- “找出标记为 'leadership-priority' 的 Linear 工单并检查进展。” *—— Linear: Find Issues*
- “获取我下周的日历并标出任何冲突。” *—— Google Calendar: Find Events*
- “找出 [strategy] 工作区中本周更新的 Notion 文档。” *—— Notion: Find Pages*
- “根据我最近的 Slack 和日历活动起草一份每周团队更新。” *—— Slack: Find Messages + Google Calendar: Find Events + Gmail: Create Draft*

### 创作者/内容

- “找出本周已排期的 YouTube 视频。” *—— YouTube: Find Videos*
- “把同一条更新发布到 Twitter 和 LinkedIn。” *—— Twitter: Create Tweet + LinkedIn: Create Update*
- “把这个新邮箱添加到我的 ConvertKit 列表。” *—— ConvertKit: Add Subscriber*
- “在 Buffer 中排期这篇博客文章。” *—— Buffer: Create Update*
- “找出本周新增的 Substack 订阅者。” *—— Substack: Find Subscribers*

### 运营/项目协调

- “找出本周分配给我团队的 Asana 任务。” *—— Asana: Find Tasks*
- “向我的项目跟踪表格添加一行。” *—— Google Sheets: Create Spreadsheet Row*
- “从我的 Monday.com 看板拉取处于 [status] 的条目。” *—— Monday.com: Find Items*
- “找出 Google Docs 中最新的会议纪要并总结。” *—— Google Docs: Find Documents + Google Docs: Get Content*
- “从这条 Slack 消息创建一个 Trello 卡片。” *—— Slack: Read Thread + Trello: Create Card*

### 通用生产力/个人

- “在我的收件箱中查找来自 [person] 的邮件。” *—— Gmail: Find Email*
- “把这个加到我的 Notion 任务列表。” *—— Notion: Create Database Item*
- “我明天日历上有什么？” *—— Google Calendar: Find Events*
- “找出本周与我共享的 Drive 文件。” *—— Google Drive: Find File*
- “在我的 Notion 工作区中搜索 [topic]。” *—— Notion: Find Page*

## 按应用分列的推荐动作

在第 3 步构建启用清单时，以此作为参考。目标是每个应用 2–4 个动作——一到两个搜索动作和一到两个写入动作。

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

## 处理边界情况

- **应用不在库中：** 假定 Zapier 支持它——目录有 9,000+ 个应用。默认说法是“是的，Zapier 支持 [App]。那里常见的模式是 Find [Thing] 和 Create [Thing]。” 如果你希望在推荐前确认，可在 [zapier.com/apps](https://zapier.com/apps) 核实。
- **多个角色：** 混合分类。“既做营销的创始人”会从创始人和市场营销两个类别各取一部分。不要把他们硬塞进一个。
- **未给出应用名称：** 默认采用该角色最常见的工具组合（PM → Slack、Jira、Notion、Google Calendar），并问“这套组合和你的相符吗？”
- **个人/非工作场景：** 从**通用生产力/个人**中取材，再加上相关的应用特定建议（日历、财务、健身、智能家居）。
- **支持对话内发现**（服务器暴露了 `discover_zapier_actions`）：如果用户提到你不确定的东西，你可以在推荐前静默调用 `discover_zapier_actions` 来核实。除非用户主动询问，否则不要呈现这个细节。

## 用例的输出模板

呈现用例时，使用这种形状——短散文，而不是表格行：

> **[用平实的语言说明该用例做什么]**
>
> 对我说：*“[引号中的确切提示词]”*。我会[用一行说明该动作做什么]。
>
> *要启用的动作：* [App]：[Action]、[Action]

## 注意事项

- **访谈问题不要超过 3 个。** 两个更好。超过之后用户就会走神。
- **不要把整个库都倒出来。** 挑选 4–6 个与其上下文相关的用例，作为自然推荐呈现。
- **一次不要列出超过 6 个用例。** 如果更多，就分批提供：“还想要更多吗？”
- **个人场景的用户得到的是通用生产力，而不是角色。** 管理家庭的人不是“PM”——不要仅仅因为库里那类条目更多就把他们塞进工作角色。
- **不要轻视库中没有的应用。** 默认说法是“是的，Zapier 很可能支持它”——目录有 9,000+ 个应用。
- **以 MCP 提示词而非 Zap 的形式表述。** Zapier 模板被写成触发式自动化（“当 X 时，然后 Y”）。MCP 用法是按需的（“对你的 AI 这样说”）。始终要转换。

## 语气

具体，绝不抽象。避免“Zapier 能帮你精简工作流。” 而是说“试着对我说：‘找出 #product-feedback 里最新的 3 条 Slack 消息’，我就帮你拉取它们。” 做展示，而不是推销。
