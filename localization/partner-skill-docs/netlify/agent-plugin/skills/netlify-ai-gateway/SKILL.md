---
name: netlify-ai-gateway
description: 使用 Netlify AI Gateway，从 Netlify Functions 或 Edge Functions 调用 OpenAI、Anthropic Claude、Google Gemini、TypeSafe (Jev) 或由 OpenRouter 托管的模型（xAI/DeepSeek/Meta/Mistral/Qwen），无需管理提供商账户或 API 密钥。在为 Netlify 应用添加 AI 功能时使用本技能——聊天机器人、文本摘要器、图像生成器、笑话/内容生成器、表单提交路由或分析，或任何 LLM 调用——或将 OpenAI/Anthropic/Gemini/TypeSafe/OpenRouter SDK 接入 Netlify Function、选择使用哪些环境变量、流式处理长文本生成，或排查 gateway 调用在构建时失败或返回 401 的原因时使用它。
---

# Netlify AI Gateway

使用提供商的官方 SDK，从 Netlify 计算环境调用 AI 模型。gateway 会自动注入提供商凭据——无参数实例化 SDK 即可工作。

**使用提供商 SDK 配合注入的环境凭据。**不要针对 gateway URL 手工编写原始 `fetch()`，也不要把对 `NETLIFY_AI_GATEWAY_KEY` / `NETLIFY_AI_GATEWAY_URL` 的调用作为默认路径——它们仅供第三方/不受支持的库使用（见下文）。

## 陷阱（先读）

- **不能在浏览器中调用。**gateway 调用应放在 Functions 或 Edge Functions 中——绝不要放在客户端代码里。浏览器没有注入的凭据。
- **凭据仅在运行时可用。**绝不要从构建脚本、预渲染/SSG 或构建插件调用 gateway——它们拿不到凭据并会失败。在请求时做 AI 工作；若输出必须看起来像预计算的，请缓存到 Netlify Blobs。
- **同步超时 60 秒。**同步函数中的 gateway 调用受 60 秒函数超时限制。流式处理长文本生成（SDK 流式 + `ReadableStream`），或使用后台函数将输出持久化供客户端获取。绝不要让缓慢的生成处于非流式状态。
- **需要一次生产部署。**在项目至少有一次生产部署之前，gateway 不会激活。即使本地开发，也要先运行一次 `netlify deploy --prod`。
- **不要硬编码模型列表。**可用模型会变化。检查实时的 providers endpoint（`https://api.netlify.com/api/v1/ai-gateway/providers/detailed`），而不是内置一份静态列表。
- **OpenRouter SDK 需要 1.2.43+。**更早的版本会忽略 `OPENROUTER_BASE_URL`，直接调用 openrouter.ai，并因 `401 Missing Authentication header` 失败。

## 代码放在哪里

编写普通的 Function/handler 代码——没有 AI 专用的文件类型。位于 `netlify/functions/joke.js`、导出 `config = { path: "/api/joke" }` 的函数，在 `netlify dev` 和生产环境下都会在 `/api/joke` 提供服务。

## 提供商 SDK（无参数实例化）

gateway 会注入每个提供商自己的环境变量，因此官方 SDK 零配置即可工作。

Anthropic Claude：
```js
import Anthropic from '@anthropic-ai/sdk';
const anthropic = new Anthropic(); // uses ANTHROPIC_API_KEY, ANTHROPIC_BASE_URL

const message = await anthropic.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Hello!' }]
});
```

OpenAI：
```js
import OpenAI from 'openai';
const openai = new OpenAI(); // uses OPENAI_API_KEY, OPENAI_BASE_URL

const completion = await openai.chat.completions.create({
  model: 'gpt-5',
  messages: [{ role: 'user', content: 'Hello!' }]
});
```

Google Gemini：
```js
import { GoogleGenAI } from '@google/genai';
const genAI = new GoogleGenAI({}); // uses GEMINI_API_KEY, GOOGLE_GEMINI_BASE_URL

const result = await genAI.models.generateContent({
  model: 'gemini-2.5-pro',
  contents: 'Hello!'
});
```

TypeSafe (Jev)——结构化决策（例如路由/分类表单提交）：
```ts
import type { Config, Context } from '@netlify/functions';
import { choice, TypeSafeClient } from '@typesafe-ai/sdk';

export default async (req: Request, context: Context) => {
  const body = await req.json().catch(() => undefined);
  if (body === undefined)
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });

  const client = new TypeSafeClient(); // uses TYPESAFE_API_KEY, TYPESAFE_BASE_URL
  const { answers } = await client.systemOne({
    state: body,
    questions: {
      team: choice('Route this contact form submission', {
        sales: null,
        support: null,
        spam: null,
      }),
    },
  });

  return Response.json({ team: answers.team.choice, requestId: context.requestId });
};

export const config: Config = { path: '/api/route', method: 'POST' };
```
`systemOne` 默认使用 `jev-latest` 模型。每个问题是 `choice(prompt, options)`，把命名选项映射到 `null`；结果位于 `answers.<question>.choice`。POST 一个 JSON body（例如 `{"message":"Can someone help us upgrade to 200 seats?"}`），并带上 `Content-Type: application/json`。

OpenRouter（需要 SDK 1.2.43+——见陷阱）：
```js
import { OpenRouter } from '@openrouter/sdk';
const openRouter = new OpenRouter(); // uses OPENROUTER_API_KEY, OPENROUTER_BASE_URL

const result = await openRouter.chat.send({
  chatRequest: {
    model: 'x-ai/grok-4.5',
    messages: [{ role: 'user', content: 'Hello!' }]
  }
});
```

通过 OpenRouter 可用的模型，可以用 OpenRouter SDK 或 OpenAI SDK 配合 OpenRouter 模型 ID 记法（例如 `deepseek/deepseek-v4-flash-0731`）调用——只需把该 ID 作为 `model` 传入。

上面的模型 ID（`gpt-5`、`claude-sonnet-4-5-20250929`、`gemini-2.5-pro`、`x-ai/grok-4.5` 等）是会变化的示例——请检查实时的 providers endpoint。

## 环境变量——该用哪些

**默认：**受支持的提供商 SDK 会自动消费其被注入的提供商专属变量。按上面的方式无参数实例化 SDK（`new OpenAI()`、`new Anthropic()`、`new GoogleGenAI({})`、`new TypeSafeClient()`、`new OpenRouter()`），就会为你读取对应的那一对变量：

- OpenAI：`OPENAI_API_KEY`、`OPENAI_BASE_URL`
- Anthropic：`ANTHROPIC_API_KEY`、`ANTHROPIC_BASE_URL`
- Google Gemini：`GEMINI_API_KEY`、`GOOGLE_GEMINI_BASE_URL`
- OpenRouter：`OPENROUTER_API_KEY`、`OPENROUTER_BASE_URL`
- TypeSafe：`TYPESAFE_API_KEY`、`TYPESAFE_BASE_URL`

**显式配置路径：**`NETLIFY_AI_GATEWAY_KEY` 和 `NETLIFY_AI_GATEWAY_URL` 始终会被注入，并且绝不与用户设置的提供商变量冲突。仅当第三方或不受支持的库需要显式的 key/base-URL 配置时才使用这一对变量——把它们作为构造函数参数传入。它不是默认路径；受支持的 SDK 应使用上面各自提供商专属的变量。

**优先级：**Netlify 绝不会覆盖你在项目或团队级别设置的 key 或 base URL。如果你设置了自己的提供商 key，gateway 会遵从它。具体到 Gemini，如果设置了 `GOOGLE_API_KEY` 或 `GOOGLE_VERTEX_BASE_URL`，则跳过注入（Vertex/Google-API-key 方案优先）。

要停止所有注入，请禁用 AI Features：https://docs.netlify.com/build/build-with-ai/manage-ai-for-your-team/manage-ai-features/#disable-ai-features

## 完整示例（Vite + React + Function）

通过检查某个注入的变量来探测 gateway 可用性，然后调用 SDK。

先安装客户端：`npm install openai`。然后创建 `netlify/functions/joke.js`：
```js
import process from "process";
import OpenAI from "openai";

export default async () => {
  if (!process.env.OPENAI_BASE_URL)
    return Response.json({ error: "AI Gateway not active — deploy to prod once on a credit-based plan" });

  try {
    const client = new OpenAI();
    const res = await client.responses.create({
      model: "gpt-5-mini",
      input: [{ role: "user", content: "Give me a short dad joke about coffee" }],
      reasoning: { effort: "minimal" },
    });
    return Response.json({
      joke: res.output_text?.trim() || "Out of jokes",
      model: res.model,
      tokens: { input: res.usage.input_tokens, output: res.usage.output_tokens },
    });
  } catch (e) {
    return Response.json({ error: `${e}` }, { status: 500 });
  }
};

export const config = { path: "/api/joke" };
```

`src/App.jsx` 会请求 `/api/joke`：
```jsx
import { useState } from "react";

export default function App() {
  const [joke, setJoke] = useState();
  const [loading, setLoading] = useState(false);

  const getJoke = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/joke");
      setJoke(res.ok ? await res.json() : { error: res.status });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button onClick={getJoke} disabled={loading}>
        {loading ? "Thinking..." : "Get joke"}
      </button>
      <pre>{JSON.stringify(joke, null, 2)}</pre>
    </>
  );
}
```

## 本地开发

两种方式——都需要至少一次先前的生产部署：

1. **Netlify CLI：**`netlify dev` 提供完整的 gateway 支持。
2. **Vite 插件：**无需 `netlify dev` 即可在本地访问 gateway。添加 `@netlify/vite-plugin` 并运行你原生的开发命令（`npm run dev`）：
```js
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import netlify from "@netlify/vite-plugin";

export default defineConfig({ plugins: [react(), netlify()] })
```

设置流程：
```shell
npm install -g netlify-cli@latest
netlify login
npm create vite@latest dad-jokes -- --template react --no-interactive
cd dad-jokes && npm install
netlify init
netlify deploy --prod --open   # required: activates the gateway
```

## 计费、限额、约束

- **套餐：**仅限基于额度的套餐（Free、Personal、Pro）。Enterprise：联系你的客户经理。旧版套餐必须先切换。除非你禁用了 AI Features 或设置了自己的提供商密钥，否则默认启用。
- **成本：**tokens → USD（提供商公布费率）→ credits。**$1 USD = 180 credits。**
- **速率限制**（每分钟、每团队、跨所有项目）：Free 90、Personal 450、Pro 1,800、Enterprise 9,000 credits。
- **上下文窗口：**输入限制为 200k tokens。
- **提示词缓存：**Anthropic——仅默认的 5 分钟临时缓存；OpenAI——为你设置按账户的 `prompt_cache_key`；Gemini——不支持显式上下文缓存。
- **没有透传请求头**（无法启用由请求头控制开关的实验性功能）、**没有批量推理**、**没有 OpenAI 优先处理**。
- **仅 OpenRouter ZDR：**Netlify 只路由到具有零数据保留（Zero Data Retention）策略的提供商。某模型虽列在 OpenRouter 目录中但没有能保证 ZDR 的托管方，则不会被提供。浏览符合 ZDR 的模型：https://openrouter.ai/models?zdr=true
- **隐私：**gateway 不存储提示词或模型输出。

**成本控制：**为调用 AI 的 Functions/Edge Functions 设置速率限制规则，防止访客滥用和成本失控：https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/——并配置自动充值或额度包：https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/configure-auto-recharge/ · https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/buy-credit-packs/

监控用量：https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/monitor-usage-for-credit-based-plans

## 参考

- 概述：https://docs.netlify.com/build/ai-gateway/overview.md
- 快速开始：https://docs.netlify.com/build/ai-gateway/quickstart-for-ai-gateway.md
- 示例：https://docs.netlify.com/build/ai-gateway/examples.md——包括 AI SEO Image Generator（Gemini 图像生成）：https://github.com/netlify/examples/tree/main/examples/ai-seo-image-generator 以及一个 TanStack Start 聊天应用：https://github.com/netlify-templates/tanstack-template

<!-- Gap: exact directly-served model names (Anthropic/OpenAI/Gemini/TypeSafe) are not statically enumerable — rendered at build time from the live providers endpoint. -->

<!-- system: agent-context/ai-gateway/system.md — human-owned, merged by ctx-gen; edit system.md, not this section -->
# Netlify 内部规则（ai-gateway）

这些是组织约定，而非文档事实——由 ctx-gen 合并进渲染后的技能，且从不自动生成。由技能维护者负责。

1. 使用提供商 SDK 配合注入的环境凭据——不要针对 gateway 手工编写原始 `fetch()`，即使原始 REST 是一个受支持的接口。正文不得把原始 REST 或 `NETLIFY_AI_GATEWAY_KEY` / `NETLIFY_AI_GATEWAY_URL` 这一对作为推荐路径——但它必须仍把这一对当作事实记录下来：始终被注入、绝不与用户设置的提供商变量冲突，以及在第三方或不受支持的库需要显式配置时是正确选择。降低推荐的优先级；保留知识。
2. gateway 不能在浏览器中调用：调用应放在 functions 或 edge functions 中，绝不要放在客户端代码里。
3. 模型可用性会变化：不要硬编码模型列表；检查实时的 providers endpoint。
4. gateway 凭据仅在运行时可用：绝不要从构建脚本、预渲染/SSG 或构建插件调用 gateway——这些调用拿不到凭据并会失败。在请求时做 AI 工作，若结果必须看起来像预计算的，请缓存它（例如缓存到 Netlify Blobs）。
5. 同步函数中的 gateway 调用受 60 秒超时限制：流式处理长文本生成（SDK 流式 + `ReadableStream`），或使用后台函数将输出持久化供客户端获取——绝不要让缓慢的生成处于非流式状态并假定它会完成。
6. 当被问及该用哪些环境变量时——即使明确被问到那一对 gateway 变量——也应在回答字面问题前先给出默认方案：受支持的提供商 SDK 会使用正文所示的逐提供商实例化方式，消费其注入的提供商专属变量（`OPENAI_API_KEY`/`OPENAI_BASE_URL` 等）——复述正文的设置，不要在这里臆造构造函数细节。然后给出 `NETLIFY_AI_GATEWAY_KEY` / `NETLIFY_AI_GATEWAY_URL` 作为第三方或不受支持的库的显式配置路径。只回答那一对 gateway 变量会把手工接线呈现为默认，而事实并非如此。
