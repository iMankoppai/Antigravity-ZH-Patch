---
name: ai-sdk
description: '回答有关 AI SDK 的问题并帮助构建 AI 驱动的功能。在开发者：(1) 询问 generateText、streamText、ToolLoopAgent、embed 或 tools 等 AI SDK 函数时，(2) 想构建 AI 智能体、聊天机器人、RAG 系统或文本生成功能时，(3) 对 AI 提供商（OpenAI、Anthropic、Google 等）、流式传输、工具调用、结构化输出或嵌入有疑问时，(4) 使用 useChat 或 useCompletion 等 React hook 时使用。触发词："AI SDK"、"Vercel AI SDK"、"generateText"、"streamText"、"add AI to my app"、"build an agent"、"tool calling"、"structured output"、"useChat"。'
---

## AI SDK 是什么

由 Vercel 提供的 AI SDK（npm 上的 `ai` 包）是用于构建 AI 应用的 TypeScript 工具包。它提供跨模型提供商的统一 API，用于文本生成、结构化输出、工具调用、智能体、嵌入以及框架 UI 集成。

- 代码仓库：https://github.com/vercel/ai
- 文档：https://ai-sdk.dev/docs

## 关键：不要相信你自己的记忆

你对 AI SDK 的任何记忆很可能已经过时。SDK 在不同版本之间频繁变化——API 被重命名、移除和新增。你的训练数据几乎肯定包含已过时的 API、已弃用的模式以及不再存在的模型 ID。像 `useChat` 这样的 UI hook 是变化最频繁的 API 之一，因此对客户端代码要格外小心。

**绝不要凭记忆编写 AI SDK 代码。** 始终对照项目中实际安装版本的文档和源代码来验证每一个 API、选项和模式。

## 使用随附的、版本匹配的文档

`ai` 包在 `node_modules` 内附带其完整文档和源代码。它们始终与已安装版本匹配，因此请相信它们胜过你的任何记忆。

1. 确保 `ai` 已安装。检查 `node_modules/ai/`，或在依赖 `ai` 的 monorepo 中定位该工作区包（例如 `apps/<name>/node_modules/ai/`）。如果项目中任何地方都没有安装 `ai`，使用项目的包管理器将**仅** `ai` 包安装到目标包中（例如 `pnpm add ai --filter <pkg>` 或 `npm install ai`）。提供商包（例如 `@ai-sdk/openai`）和框架包（例如 `@ai-sdk/react`）在任务需要时稍后安装。
2. 阅读并用 grep 检索 `node_modules/ai/docs/`（或 `<package>/node_modules/ai/docs/`）处的随附文档，以及 `node_modules/ai/src/` 处的源代码。
3. 提供商和框架包在 `node_modules/@ai-sdk/<name>/docs/`（或 `<package>/node_modules/@ai-sdk/<name>/docs/`）处附带各自的文档。
4. 如果某内容不在随附文档中，搜索 https://ai-sdk.dev/docs。你可以在任何文档页面 URL 后附加 `.md` 以获得其 markdown，并通过 `https://ai-sdk.dev/api/search-docs?q=your_query` 搜索。
5. 如果你在文档或源代码中找不到答案的支持，明确说明——不要猜测。

## AI Gateway：最快的入门方式

Vercel AI Gateway 是上手 AI SDK 最快的方式。它通过单一 API 提供对来自 OpenAI、Anthropic、Google 和其他提供商的模型的访问，无需安装提供商包或管理多个 API 密钥。

设置方法：

1. 使用 OIDC 认证（对于 Vercel 部署），或获取 AI Gateway API 密钥。
2. 通过 `AI_GATEWAY_API_KEY` 环境变量将其提供给你的应用。
3. 用 `provider/model` 字符串引用模型。

有关确切的设置、认证和用法，阅读随附指南和 AI Gateway 文档。

### 选择模型

绝不要凭记忆使用模型 ID——模型频繁发布和退役。在编写引用某个模型的代码之前，获取当前列表。不要截断列表（例如用 `head`），以便你能找到最新的模型：

```bash
# All available models
curl -s https://ai-gateway.vercel.sh/v1/models | jq -r '.data[].id'

# Filter by provider (e.g. anthropic, openai, google)
curl -s https://ai-gateway.vercel.sh/v1/models | jq -r '[.data[] | select(.id | startswith("anthropic/")) | .id] | reverse | .[]'
```

当某个模型存在多个版本时，优先选择版本号最高的那个。

## 构建和使用智能体

使用 SDK 内置的智能体抽象（例如 `ToolLoopAgent`），而不是手工编写工具调用循环。为了端到端类型安全，在客户端消费智能体（例如用 `useChat`）时，从智能体定义推断 UI 消息类型。消费智能体是特定于框架的：检查 `package.json` 以检测技术栈，然后遵循匹配的快速开始。

在随附文档（`node_modules/ai/docs/`，尤其是 agents 部分）或 https://ai-sdk.dev/docs 中查找当前的智能体、工具和类型安全 API。

## DevTools

AI SDK DevTools 捕获你的 AI SDK 调用——请求、响应、工具调用、token 用量和多步运行——以便你能准确检查你的智能体做了什么。在开发时用它来调试生成。它是一个单独的包，仅用于本地开发。

有关设置说明，阅读随附的 DevTools 文档。

## 保持 SDK 最新

过时的安装是最常见的错误来源。将已安装版本与最新版本进行比较：

- **已安装：** `node_modules/ai/package.json` 中的 `version` 字段。
- **最新：** 运行 `npm view ai version`。

如果已安装版本落后最新版本一个主版本（或更多），告知用户他们使用的是旧版本，并建议在继续之前升级。迁移指南位于 https://ai-sdk.dev/docs/migration-guides。

## 进行更改之后

运行项目的类型检查器。保持最小化——只设置与默认值不同的选项，查阅文档或源代码了解默认值，而不是过度指定。大多数类型错误来自记忆中现已变化的 API；出现时重新检查当前文档和源代码。
