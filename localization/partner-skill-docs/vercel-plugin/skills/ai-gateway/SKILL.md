---
name: ai-gateway
description: 面向设置、模型发现、认证、路由、回退、虚拟模型、评估模型、BYOK、预算、支出报告、可观测性、兼容 API 以及编码智能体配置的 Vercel AI Gateway 指南。在向应用添加 AI Gateway、迁移提供商调用、选择模型或提供商、集中管理模型配置、评估应用状态、调试网关请求，或运行 `vercel ai-gateway` 命令时使用。
summary: Set up and operate Vercel AI Gateway with current models, virtual models, evaluation, authentication, routing, spend controls, and verification.
metadata:
  priority: 7
  docs:
    - "https://vercel.com/docs/ai-gateway"
    - "https://vercel.com/docs/ai-gateway/getting-started"
    - "https://vercel.com/docs/ai-gateway/models-and-providers/virtual-models"
    - "https://vercel.com/docs/ai-gateway/modalities/decision"
    - "https://vercel.com/docs/ai-gateway/sdks-and-apis/typesafe"
    - "https://ai-sdk.dev/providers/ai-sdk-providers/ai-gateway"
  sitemap: "https://vercel.com/docs/sitemap.md"
  pathPatterns: []
  importPatterns:
    - 'ai'
    - '@ai-sdk/gateway'
  bashPatterns:
    - '\bvercel\s+ai-gateway\b'
    - '\bvercel\s+env\s+pull\b'
    - '\bnpm\s+(install|i|add)\s+[^\n]*@ai-sdk/gateway\b'
    - '\bpnpm\s+(install|i|add)\s+[^\n]*@ai-sdk/gateway\b'
    - '\bbun\s+(install|i|add)\s+[^\n]*@ai-sdk/gateway\b'
    - '\byarn\s+add\s+[^\n]*@ai-sdk/gateway\b'
  promptSignals:
    phrases:
      - "ai gateway"
      - "vercel ai gateway"
      - "ai-gateway"
      - "ai-gateway.vercel.sh"
      - "virtual model"
      - "evaluation model"
      - "vmc/"
      - "typesafe api"
      - "typesafe compat"
    allOf:
      - [model, routing]
      - [provider, failover]
      - [gateway, budget]
      - [gateway, logs]
      - [gateway, oidc]
      - [coding, gateway]
    anyOf:
      - "provider ordering"
      - "model fallback"
      - "byok"
      - "spend tracking"
      - "gateway key"
      - "credit balance"
      - "safety identifier"
      - "reasoning effort"
      - "tool calling"
      - "structured outputs"
      - "experimental_evaluate"
      - "central model configuration"
      - "systemone"
      - "v1/evaluate"
    noneOf:
      - "cloudflare ai gateway"
      - "aws api gateway"
    minScore: 6
validate:
  -
    pattern: '\bclaude-(sonnet|opus|haiku)-\d+-\d+\b'
    message: 'Claude model version uses a hyphen where the AI Gateway slug uses a dot. Fetch /v1/models and use the returned provider/model ID.'
    severity: error
  -
    pattern: gateway\(['"][^'"/]+['"]\)
    message: 'AI Gateway model string is missing its provider prefix. Fetch /v1/models and use a provider/model ID.'
    severity: error
  -
    pattern: (OPENAI_API_KEY|ANTHROPIC_API_KEY|GOOGLE_API_KEY)
    message: 'Provider key detected. AI Gateway request authentication uses AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN; provider keys belong only in an intentional BYOK configuration.'
    severity: recommended
    skipIfFileContains: '[Bb][Yy][Oo][Kk]|providerOptions\s*:\s*\{[^}]*gateway'
  -
    pattern: gateway\s*:\s*\{[^}]*cacheControl
    message: "AI Gateway does not cache whole responses through cacheControl. Use caching: 'auto' for provider prompt caching and verify the current caching docs."
    severity: error
  -
    pattern: ANTHROPIC_BASE_URL\s*=\s*["']?https://ai-gateway\.vercel\.sh
    message: 'Claude Code through AI Gateway needs ANTHROPIC_API_KEY set to an empty value and the gateway key in ANTHROPIC_AUTH_TOKEN. A non-empty ANTHROPIC_API_KEY is used instead of the gateway token.'
    severity: recommended
    skipIfFileContains: 'ANTHROPIC_AUTH_TOKEN'
chainTo:
  -
    pattern: 'from\s+[''"]ai[''"]|require\([''"]ai[''"]\)|\b(generateText|streamText|ToolLoopAgent)\b'
    targetSkill: ai-sdk
    message: 'AI SDK code detected. Load the AI SDK skill and read the installed package docs before writing or changing SDK code.'
retrieval:
  aliases:
    - model router
    - ai proxy
    - provider failover
    - llm gateway
    - gateway credits
    - virtual model
    - evaluation model
    - typesafe compatibility
  intents:
    - add Vercel AI Gateway to an application
    - route AI models across providers
    - configure provider or model fallbacks
    - authenticate AI Gateway requests
    - track AI model costs and set budgets
    - debug AI Gateway requests and routing
    - connect coding agents to AI Gateway
    - give coding agents centrally managed model and provider configuration
    - create or update an AI Gateway virtual model
    - evaluate application state with typed questions
    - migrate an existing TypeSafe evaluation client to AI Gateway
    - find a model by modality, capability, price, or data retention
    - check AI Gateway credit balance or generation cost
    - configure reasoning or extended thinking across providers and API formats
    - add tool calling or function calling across API formats
    - get structured JSON output matching a schema
    - send images or PDFs to a model
  entities:
    - AI Gateway
    - AI Gateway Credits
    - providerOptions.gateway
    - AI_GATEWAY_API_KEY
    - VERCEL_OIDC_TOKEN
    - model routing
    - provider failover
    - BYOK
    - spend reporting
    - safetyIdentifier
    - Usage & Billing API
    - Virtual Models
    - vmc/<slug>
    - experimental_evaluate
    - POST /v1/evaluate
    - TypeSafe API
    - /typesafe/v1/systemone
---

# Vercel AI Gateway

AI Gateway 通过共享的认证、模型 ID、路由、计费和可观测性来暴露来自多个提供商的模型。模型可用性、SDK API、CLI 命令、价格和产品能力频繁变化。在更改代码之前，从当前来源验证它们。

## 从当前来源开始

实现之前：

1. 检查项目的语言、包管理器、已安装的 AI SDK 版本以及现有提供商集成。
2. 阅读 <https://vercel.com/docs/ai-gateway> 下的相关 Vercel 页面。当工具需要 Markdown 时，使用该页面的 `.md` 形式。
3. 获取完整的实时模型列表。不要按类比构造模型变体：

   ```bash
   curl -fsSL https://ai-gateway.vercel.sh/v1/models
   ```

4. 如果代码使用 `ai` 包，在可用时加载 `ai-sdk` 技能。阅读 `node_modules/ai/docs/` 下版本匹配的文档和 `node_modules/ai/src/` 下的源代码。如果该技能未安装，直接使用这些随附文件。
5. 在记录或编写 CLI 标志脚本之前运行 `vercel ai-gateway <command> --help`。

实时模型端点和已安装的包优先于从训练数据中记住的模型名称或 SDK 语法。

## Vercel CLI 清单

`vercel ai-gateway` 命令管理当前团队的网关资源。`setup` 子命令连接本地编码智能体；CLI 的其余部分涵盖以前需要仪表板操作的工作：

| 命令 | 作用 |
| --- | --- |
| `api-keys create/list/inspect/remove` | 创建和管理 AI Gateway API 密钥，含预算、支出警报、到期和限制豁免 |
| `budgets set/list/inspect/remove` | 为团队、项目、用户或 API 密钥设置计量支出限额 |
| `budgets set/inspect/remove --default`、`budgets list --defaults` | 设置按范围的默认限额，覆盖没有自定义预算的项目、密钥或成员。需要 CLI 59.13+；较旧的 `budgets defaults` 组已弃用 |
| `models list` / `models endpoints <model>` | 从 CLI 列出模型目录和一个模型的提供商端点 |
| `virtual-models create/list/inspect/edit/remove/restore` | 管理以 `vmc/<slug>` 寻址、可复用、团队范围的模型配置 |
| `rules add/list/edit/remove` | 管理路由规则；CLI 将规则标记为 beta，因此在依赖它们之前检查 `--help`。REST CRUD 位于 `https://api.vercel.com/ai-gateway/rules` |
| `setup` | 配置受支持的编码智能体；见 [references/coding-agents.md](references/coding-agents.md) |
| `leaderboard` | 浏览公开、匿名的使用排行榜；在实现工作中很少需要 |

当用户在终端或 CI 中工作时，使用 CLI 进行凭据和支出管理。在编写脚本之前检查 `vercel ai-gateway <command> --help` 获取当前标志；不要将本技能中的标志列表复制到生成的代码中。

## 将请求路由到正确的指南

| 用户的任务 | 阅读 |
| --- | --- |
| 让编码智能体发起一个 Gateway 请求，或处理首次请求凭据、兼容 SDK 或迁移 | [references/setup.md](references/setup.md) |
| 提供商选择、模型回退、缓存、BYOK 或超时 | [references/routing.md](references/routing.md) |
| 可复用的模型配置、`vmc/<slug>`，或针对无法发送提供商选项的客户端的提供商选项 | [references/virtual-models.md](references/virtual-models.md) |
| 通过 AI SDK、`POST /v1/evaluate`、OpenAI 兼容的 `POST /v1/decisions` 或 TypeSafe 兼容 API 进行类型化决策（原评估） | [references/evaluation.md](references/evaluation.md) |
| 额度、预算、报告、Logs 或请求调试 | [references/spend-observability.md](references/spend-observability.md) |
| 将 Claude Code、Codex、OpenCode、Pi 或其他编码智能体自身的模型流量通过 Gateway 路由 | [references/coding-agents.md](references/coding-agents.md) |

在编辑之前阅读每个相关参考。一个任务可能需要多个。

## 选择集成面

| 现有项目 | 默认路径 |
| --- | --- |
| 使用 AI SDK 的 JavaScript 或 TypeScript | 使用纯 `provider/model` 字符串搭配 `generateText`、`streamText`、`ToolLoopAgent` 或相关模态 API |
| 使用 Python 版 AI SDK 的 Python | 使用 `ai.get_model('provider/model')` 和当前 Python SDK 文档 |
| 现有 OpenAI SDK | 保留该 SDK，将 `baseURL` 或 `base_url` 指向 `https://ai-gateway.vercel.sh/v1` |
| 现有 Anthropic SDK | 保留该 SDK，将 `baseURL` 或 `base_url` 指向 `https://ai-gateway.vercel.sh` |
| 通过提供商中立的 HTTP 进行评估 | 将 Gateway 的评估请求形态发送到 `POST https://ai-gateway.vercel.sh/v1/evaluate` |
| 现有 TypeSafe 评估客户端 | 保留 `@typesafe-ai/sdk`，将 `baseURL` 指向 `https://ai-gateway.vercel.sh/typesafe` |
| 提供商中立的 HTTP | 使用 AI Gateway 兼容端点，例如 Chat Completions 或 OpenResponses |
| 现有直连提供商的 AI SDK 集成 | 用实时 AI Gateway 的 `provider/model` 字符串替换提供商实例，然后仅在验证网关路径后移除提供商凭据 |
| 编码智能体 | 使用 `vercel ai-gateway setup`；在声称支持某智能体之前检查其帮助。当智能体需要可复用的路由或无法逐请求发送的提供商选项时，使用 Virtual Model |

AI Gateway 还支持 OpenAI Responses、Anthropic Messages、OpenResponses、Cohere Rerank、嵌入、图像和视频生成、语音、转录、实时会话以及决策（原评估）。<https://vercel.com/docs/ai-gateway/modalities> 下的模态页面涵盖每种请求形态，包括长时间视频生成的后台任务。决策可通过 AI SDK（`ai` 7.0.128+ 中的 `experimental_decide`，或较早 AI SDK 7 版本中已弃用的 `experimental_evaluate` 别名）、`POST /v1/evaluate`、OpenAI 兼容的 `POST /v1/decisions`，以及 `/typesafe` 下的 TypeSafe 兼容 API 获得；它们无法通过 Chat Completions、Responses 或 Anthropic 或 Cohere 兼容端点获得。在选择某个面之前阅读 [references/evaluation.md](references/evaluation.md)。阅读相关模态或 API 页面，而不是凭记忆翻译一种请求形态。

## 最小 AI SDK 请求

当前 AI SDK 需要 Node.js 22 或更高版本。在现有项目中强制某个版本之前，确认已安装包的 `engines` 字段。

```ts
import { generateText } from 'ai';

const model = process.env.AI_GATEWAY_MODEL;
if (!model) {
  throw new Error('Set AI_GATEWAY_MODEL to an ID returned by /v1/models');
}

const { text } = await generateText({
  model,
  prompt: 'Explain the project in one paragraph.',
});

console.log(text);
```

在确认用户或任务指定的确切模型存在后，尊重该模型。否则获取 `/v1/models`，选择符合所请求模态、能力、价格、上下文窗口、数据保留策略和团队访问的模型，并将 `AI_GATEWAY_MODEL` 设为该 ID。不要把对时间敏感的模型推荐放入可复用的示例中。

纯模型字符串通过 AI Gateway 路由。仅当任务需要其导出的提供商、类型、模型发现、生成查找或支出报告辅助函数时，才添加 `@ai-sdk/gateway`。

## 认证决策

- 对于本地脚本、CI、外部服务器和非 Vercel 部署，使用 **AI Gateway API 密钥**。将其存储在 `AI_GATEWAY_API_KEY` 中，绝不打印或提交它。
- 对于 Vercel 部署和已关联的本地项目，使用 **Vercel OIDC**。Vercel 部署接收 `VERCEL_OIDC_TOKEN`；本地开发使用 `vercel link` 和 `vercel env pull`。
- **BYOK 提供商凭据不能替代 AI Gateway 请求认证。** 它们决定 AI Gateway 如何向模型提供商认证。
- 纯 Node.js 脚本不会自动加载 `.env.local`。在 shell 中导出变量或显式加载该文件。框架行为可能不同。

除非代码仓库已有确立的安全机制，否则不要要求用户将密钥粘贴到聊天、源代码、已提交的配置文件或将进入 shell 历史的命令中。

## 实现工作流

1. 确定用户的任务、运行时、部署目标、当前提供商以及所需能力。
2. 从上述规则中选择认证。除非用户要求迁移，否则保留可用的现有方法。
3. 获取实时模型元数据并选择兼容的模型。说明它为何适合。
4. 阅读匹配的 SDK、API、模态、路由或编码智能体文档。
5. 做出最小的端到端更改。复用当前项目结构和错误处理。
6. 只处理应用能够应对的错误。常见的网关结果包括认证失败、额度不足、预算耗尽、限速和提供商容量失败。
7. 运行项目的格式化器、类型检查器和针对性测试。
8. 当任务授权一次实时请求时，运行一次并检查返回的模型、文本或媒体、用量和提供商元数据。
9. 当仪表板访问可用时，在 AI Gateway Logs 中验证该请求。日志摄取可能需要约 90 秒。

仅在用户请求或批准该对外操作时，才花费额度、创建密钥、更改预算、更改路由规则或编写编码智能体配置。在可用时优先使用试运行和交互式预览。

## 路由不变量

- 模型 ID 使用 `/v1/models` 返回的确切 `provider/model` 字符串。
- `order` 控制提供商偏好，`only` 限制提供商，`sort` 按受支持的指标对提供商排序。
- `models` 列出主模型之后的回退模型。
- `caching: 'auto'` 管理提供商提示词缓存标记。它不是 HTTP 响应缓存。
- `providerTimeouts` 适用于 BYOK 提供商尝试。流式请求在第一个流块时清除它；非流式请求对整个响应计时。
- `providerOptions` 中的 reasoning 条目会完全覆盖 AI SDK 顶层 `reasoning` 值；两者从不合并。
- `user` 和 `tags` 附加报告维度。它们不会创建按用户的限速。
- 请求范围的提供商凭据属于 `providerOptions.gateway.byok`，且必须保持机密。
- Virtual Model ID 使用 `vmc/<slug>`。Virtual Model 可以在服务端固定路由和提供商选项；它定义的设置通常覆盖相应的请求设置，而未设置的设置仍可由请求配置。

在添加这些字段中的任何一个之前阅读 [references/routing.md](references/routing.md)。

## 验证清单

- [ ] 完整的实时模型响应中存在直接模型 ID，或已认证团队存在 Virtual Model 并解析为 `vmc/<slug>`。
- [ ] 所选 API 或 SDK 支持所请求的模态和功能。
- [ ] 认证在实际运行时中有效，包括在相关情况下 `.env.local` 的加载。
- [ ] 示例打印或返回结果，而不是丢弃响应。
- [ ] 项目类型检查器和针对性测试通过。
- [ ] 仅在授权时才发起实时请求，并已了解其成本。
- [ ] 提供商路由或回退行为在响应元数据或 Logs 中可见。
- [ ] 源代码、日志、diff 或最终响应中不出现密钥。
- [ ] 最终报告区分代码验证与实时及仪表板验证。

## 当前文档

- 入门：<https://vercel.com/docs/ai-gateway/getting-started>
- 模型和提供商：<https://vercel.com/docs/ai-gateway/models-and-providers>
- Virtual Models：<https://vercel.com/docs/ai-gateway/models-and-providers/virtual-models>
- SDK 和 API：<https://vercel.com/docs/ai-gateway/sdks-and-apis>
- 认证和 BYOK：<https://vercel.com/docs/ai-gateway/authentication-and-byok>
- 可观测性和支出：<https://vercel.com/docs/ai-gateway/observability-and-spend>
- 模态：<https://vercel.com/docs/ai-gateway/modalities>
- 决策：<https://vercel.com/docs/ai-gateway/modalities/decision>
- TypeSafe API：<https://vercel.com/docs/ai-gateway/sdks-and-apis/typesafe>
- REST API 参考：<https://vercel.com/docs/ai-gateway/sdks-and-apis/rest-api>
- FAQ：<https://vercel.com/docs/ai-gateway/faq>
- 编码智能体：<https://vercel.com/docs/ai-gateway/coding-agents>
- AI SDK 提供商：<https://ai-sdk.dev/providers/ai-sdk-providers/ai-gateway>
