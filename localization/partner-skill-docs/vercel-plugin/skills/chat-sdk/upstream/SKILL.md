---
name: chat-sdk
description: 使用 Chat SDK（`chat` npm 包）构建多平台聊天机器人。当开发者希望用 create-chat-sdk 搭建机器人、构建 Slack、Teams、Google Chat、Discord、Telegram、GitHub、Linear 或 WhatsApp 机器人、处理提及、私信、订阅线程、反应、斜杠命令、卡片、模态框、文件或 AI 流式传输、设置 webhook 路由或多适配器机器人、向聊天平台发送富卡片或流式 AI 响应，或构建自定义适配器或状态适配器时使用。
license: MIT
---

# Chat SDK

用于在 Slack、Microsoft Teams、Google Chat、Discord、Telegram、GitHub、Linear、WhatsApp 等平台上构建聊天机器人的统一 TypeScript SDK。一次编写机器人逻辑，随处部署。

## 搭建新项目

使用 `create-chat-sdk` 在无提示的情况下搭建一个基础的 Next.js 机器人项目。运行 `npx create-chat-sdk --help` 查看可用选项以及 CLI 的工作方式。

## 从 Chat SDK 文档开始

当 Chat SDK 已安装在用户项目中时，检查随附于 `node_modules/chat/docs/` 的已发布文档、`node_modules/chat/resources/` 中的资源，以及 `node_modules/chat/resources/templates.json` 中可用的开源模板。

如果这些路径不存在，说明项目中尚未安装 `chat` 包。用户可以用 `npm i chat` 安装它。

你也可以在 [Chat SDK 网站](https://chat-sdk.dev/docs)和 [Vercel 知识库](https://vercel.com/kb/chat-sdk)中找到文档。

## 可用资源

<!-- RESOURCES:START -->

### 指南

- `node_modules/chat/resources/guides/how-to-build-an-ai-agent-for-slack-with-chat-sdk-and-ai-sdk.md` — 使用 Chat SDK、AI SDK 的 ToolLoopAgent 和 Vercel AI Gateway 构建一个 Slack AI 智能体。涵盖项目设置、工具定义、流式响应、部署到 Vercel，以及用 toolpick 扩展工具选择。
- `node_modules/chat/resources/guides/human-in-the-loop-with-chat-sdk-and-workflow-sdk.md` — 使用 Chat SDK 和 Workflow SDK 在 Slack 审批卡片上暂停持久化工作流。使用 createWebhook 将工作流挂起直到按钮点击，包含多阶段审批、通过持久化休眠实现超时以及审批人验证的模式。
- `node_modules/chat/resources/guides/liveblocks-chat-sdk-ai-sdk.md` — 构建一个 AI 智能体，在 Liveblocks 评论线程中回复 @ 提及，提供流式响应和工具调用。使用 Chat SDK、Liveblocks 适配器、AI SDK 的 ToolLoopAgent 以及 Redis 进行线程订阅和分布式锁。
- `node_modules/chat/resources/guides/slack-bot-vercel-blob.md` — 构建一个 Slack 机器人，通过工具调用在 Vercel Blob 中列出、读取、上传和删除文件。使用 Chat SDK、AI SDK 的 ToolLoopAgent 以及 Files SDK 的 createFileTools 工厂，包含需审批的写入工具和只读模式。
- `node_modules/chat/resources/guides/run-and-track-deploys-from-slack.md` — 使用 Chat SDK 和 Vercel Workflow 构建一个 Slack 部署机器人。从斜杠命令派发 GitHub Actions，将生产环境置于审批之后，轮询完成状态，并在运行结束时通知 Linear 和 GitHub。
- `node_modules/chat/resources/guides/triage-form-submissions-with-chat-sdk.md` — 构建一个 Slack 机器人，用交互式卡片对表单提交进行分类。无需离开 Slack 即可转发、编辑或标记为垃圾信息。使用 Chat SDK、Hono 和 Resend 构建。
- `node_modules/chat/resources/guides/how-to-build-a-slack-bot-with-next-js-and-redis.md` — 本指南带你使用 Next.js 构建一个 Slack 机器人，涵盖项目设置、Slack 应用配置、事件处理、交互功能和部署。
- `node_modules/chat/resources/guides/create-a-discord-support-bot-with-nuxt-and-redis.md` — 本指南带你使用 Nuxt 构建一个 Discord 支持机器人，涵盖项目设置、Discord 应用配置、Gateway 转发、AI 驱动的响应以及部署。
- `node_modules/chat/resources/guides/ship-a-github-code-review-bot-with-hono-and-redis.md` — 本指南带你构建一个按需审查拉取请求的 GitHub 机器人。当用户在 PR 上 @ 提及该机器人时，Chat SDK 会捕获该提及，启动一个已克隆该代码仓库的 Vercel Sandbox，并使用 AI SDK 分析 diff。
- `node_modules/chat/resources/guides/build-a-slack-bot-with-vercel-connect.md` — 学习如何使用 Chat SDK 和 AI SDK 构建你自己的 Slackbot。Vercel Connect 提供运行时 Slack 令牌并转发触发器，因此你永远不需要存储长期有效的机器人令牌。
- `node_modules/chat/resources/guides/vercel-connect.md` — 使用 Vercel Connect 从你的智能体和服务中调用诸如 Slack、GitHub 和 Snowflake 等提供商 API，使用短期、经用户授权的令牌而不是长期密钥。
- `node_modules/chat/resources/guides/ai-gateway-and-ai-sdk.md` — 使用 AI Gateway 和 AI SDK 在 Vercel 上构建 AI 智能体，然后借助 Sandbox、Chat SDK、Vercel Connect 和 Workflow 使它们可靠、强大且持久。
- `node_modules/chat/resources/guides/daily-digest-bot-with-chat-sdk-and-workflow-sdk.md` — 创建你自己的每日摘要机器人，将 GitHub 统计的每日摘要发布到 Slack。学习如何使用 Vercel Connect 在项目中安全地设置 Slack 和 GitHub 应用。

### 模板

列于 `node_modules/chat/resources/templates.json`：

- **Chat SDK Liveblocks Bot** — 构建一个可在 Liveblocks 内与之互动的机器人。(https://vercel.com/templates/next.js/chat-sdk-liveblocks-bot)
- **Durable iMessage Agent** — 由 Sendblue 适配器驱动的持久化 iMessage 智能体。(https://vercel.com/templates/nitro/durable-imessage-ai-agent)
- **Knowledge Agent** — 开源的文件系统和基于知识的智能体模板。构建能跟上你知识库更新的 AI 智能体。(https://vercel.com/templates/nuxt/chat-sdk-knowledge-agent)
- **Community Agent** — 开源 AI 驱动的 Slack 社区管理机器人，内置 Next.js 管理面板。使用 Chat SDK、AI SDK 和 Vercel Workflow。(https://vercel.com/templates/next.js/chat-sdk-community-agent)
- **Caltext** — 由 AI 驱动的 iMessage 卡路里跟踪助手。(https://vercel.com/templates/hono/caltext)

<!-- RESOURCES:END -->

## Chat SDK 适配器

### 适配器目录

参见 [Chat SDK llms.txt 文件](https://chat-sdk.dev/llms.txt)中的“Official Adapters”、“Vendor-Official Adapters”和“Community Adapters”章节，以获取官方、厂商官方和社区适配器的当前列表。

### 适配器目录包

`@chat-adapter/catalog` 是官方、厂商官方和社区适配器的零依赖静态目录。它替代已弃用的 `chat/adapters` 子路径，后者仍然重新导出原始 API。

智能体可以导入 `listAdapters`、`getCatalogEntry`、`getFeatureSupport`、`ADAPTERS`、`ADAPTER_NAMES`、`getAdapter`、`isAdapterSlug`、`listEnvVars`、`getSecretEnvVars`，以及诸如 `CatalogAdapter`、`CatalogEntry` 和 `AdapterSlug` 的元数据类型，而无需导入任何适配器实现包。

将其用于：
- 列出适配器的 slug、名称、npm 包、维护者、分组以及平台与状态类型。
- 检查某个适配器支持哪些能力，例如流式传输、模态框或分布式锁。
- 构建在安装任何适配器之前就需要包名、对等依赖和安装指南的设置或引导流程。
- 发现官方和厂商官方适配器所需的、可选的和凭据模式的环境变量，包括哪些变量是密钥。
- 在添加或更新已列入的适配器时，保持适配器文档和元数据与目录一致。
