---
name: vercel-functions
description: Vercel Functions 专家指南——Node.js/Bun/Python 运行时、Fluid Compute、长时（30 分钟）函数、大型函数（5 GB 包）、Docker/OCI 容器镜像、计划限制、流式传输、WebSocket 和 Cron Jobs。在配置、调试或优化在 Vercel 上运行的服务端代码时使用。
summary: "Vercel Functions run on Fluid Compute with Node.js as the default runtime — strongly prefer it over `runtime = 'edge'` (Vercel recommends migrating off Edge, and Next.js 16.3+ no longer supports it). Duration: 300s default on every plan including Hobby, 800s max on Pro/Enterprise, 1800s (30 min) per-function in the extended beta; beyond that use Vercel Workflow. Bundles: 250 MB standard (500 MB Python), 5 GB via the large functions beta (`VERCEL_SUPPORT_LARGE_FUNCTIONS=1`). Request/response bodies cap at 4.5 MB. Memory is dashboard-only (Standard 2 GB/1 vCPU, Performance 4 GB/2 vCPU; Hobby fixed). Docker works: add `Dockerfile.vercel` to run an OCI image as an autoscaling, stateless, scale-to-zero Function."
metadata:
  priority: 8
  docs:
    - "https://vercel.com/docs/functions"
    - "https://vercel.com/docs/functions/runtimes"
    - "https://vercel.com/docs/functions/limitations"
    - "https://vercel.com/docs/functions/configuring-functions/duration"
    - "https://vercel.com/docs/functions/runtimes/container"
    - "https://vercel.com/docs/fluid-compute"
    - "https://vercel.com/docs/functions/websockets"
  sitemap: "https://vercel.com/sitemap.xml"
  pathPatterns:
    - 'api/**/*.*'
    - 'pages/api/**'
    - 'src/pages/api/**'
    - 'app/**/route.*'
    - 'src/app/**/route.*'
    - 'apps/*/api/**/*.*'
    - 'apps/*/app/**/route.*'
    - 'apps/*/src/app/**/route.*'
    - 'apps/*/pages/api/**'
    - 'vercel.json'
    - 'apps/*/vercel.json'
    - 'vercel.ts'
    - 'apps/*/vercel.ts'
    # Vercel builds `Dockerfile.vercel` / `Containerfile.vercel` into a
    # container-image Function, so these are Functions config, not generic Docker.
    - 'Dockerfile.vercel'
    - '*/Dockerfile.vercel'
    - 'Containerfile.vercel'
    - '*/Containerfile.vercel'
  bashPatterns:
    - '\bvercel\s+dev\b'
    - '\bvercel\s+logs\b'
    - '\bvercel\s+vcr\b'
  importPatterns:
    - 'ws'
    - 'socket.io'
    - 'socket.io-client'
  promptSignals:
    phrases:
      - "websocket"
      - "websockets"
      - "web socket"
      - "socket.io"
      # Polling is the classic technique people reach for when they think Vercel
      # lacks websockets. We intentionally do NOT trigger on named third-party
      # services (Pusher, PubNub, Ably) — those are deliberate choices, not a
      # signal that someone is working around a missing feature.
      - "long polling"
      - "long-polling"
      # Duration: people hit the ceiling and ask about it in these words.
      - "maxduration"
      - "max duration"
      - "function timeout"
      - "function times out"
      - "long-running function"
      - "long running function"
      - "504"
      # Bundle size: the 250 MB error message is the usual entry point.
      - "unzipped maximum size"
      - "250mb"
      - "250 mb"
      - "large function"
      - "bundle size limit"
      # Containers: Dockerfile.vercel is a Functions feature, not just packaging.
      - "dockerfile"
      - "container image"
      - "container registry"
      - "runtime edge"
      - "edge runtime"
    allOf:
      - ["docker", "vercel"]
      - ["hobby", "limit"]
    anyOf:
      - "realtime"
      - "bidirectional"
      - "ws server"
      - "polling"
      - "server-sent events"
      - "fluid compute"
      - "active cpu"
    noneOf: []
    minScore: 6
validate:
  -
    pattern: export\s+default\s+function
    message: 'Use named exports (GET, POST, PUT, DELETE) instead of default export for route handlers'
    severity: error
    # Skip on App Router page / layout / loading / error / not-found / sitemap / template / default files,
    # which require a default export by Next.js convention. Detected via the 'use client' directive,
    # an App Router config export (metadata, dynamic, revalidate, fetchCache, runtime), an `export default
    # function` whose name matches an App Router file (Page / Layout / Loading / etc.), or any JSX
    # element with a capitalised component tag — all signals that the file is a page-style file rather
    # than a route handler. See anthropics/claude-code#54989.
    skipIfFileContains: "(?:^|\\n)\\s*['\"]use\\s+client['\"]|export\\s+const\\s+(?:metadata|dynamic|revalidate|fetchCache|runtime)\\b|export\\s+default\\s+(?:async\\s+)?function\\s+\\w*(?:Page|Layout|Loading|Error|NotFound|Sitemap|Template|Default|sitemap|robots|opengraph|manifest)\\b|<[A-Z][A-Za-z0-9]*|\\{\\s*children\\s*[,}:]|MetadataRoute\\.|from\\s+['\"]next/(?:font|image|link|navigation|headers|cookies)['\"]"
  -
    pattern: NextApiRequest|NextApiResponse
    message: 'NextApiRequest/NextApiResponse are Pages Router types — use Web API Request/Response'
    severity: error
  -
    # Vercel's docs recommend migrating off the Edge runtime, and Next.js 16.3+
    # doesn't support it. Surfaced as a recommendation rather than an error:
    # existing Edge functions still work, so this is a nudge, not a blocker.
    # Matches `"runtime": "edge"` in vercel.json too.
    pattern: 'runtime[''"]?\s*[=:]\s*[''"]edge[''"]'
    message: 'Consider dropping `runtime = "edge"`. Vercel recommends migrating from Edge to Node.js, and Next.js 16.3+ no longer supports it. Node.js on Fluid Compute runs in the same regions at the same price with full Node.js APIs, longer durations, and larger bundles.'
    severity: recommended
  -
    pattern: 'from\s+[''"](openai|@anthropic-ai/sdk|anthropic)[''"]|new\s+(OpenAI|Anthropic)\('
    message: 'Direct AI provider SDK detected in route handler. Use the Vercel AI SDK for streaming, tools, and provider abstraction.'
    severity: recommended
    upgradeToSkill: ai-sdk
    upgradeWhy: 'Replace vendor-locked provider SDKs with @ai-sdk/openai or @ai-sdk/anthropic for unified streaming and tool support.'
    skipIfFileContains: '@ai-sdk/|from\s+[''"](ai)[''"]|import.*from\s+[''"](ai)[''"]|streamText|generateText'
  -
    pattern: 'setTimeout\s*\(|setInterval\s*\(|await\s+new\s+Promise\s*\([^)]*setTimeout'
    message: 'Long-running or polling logic detected in a serverless handler. Functions have execution time limits.'
    severity: recommended
    upgradeToSkill: workflow
    upgradeWhy: 'Move delayed/polling logic to Vercel Workflow for durable execution with pause, resume, retries, and crash safety.'
    skipIfFileContains: 'use workflow|use step'
  -
    pattern: 'writeFile(Sync)?\(|createWriteStream\(|from\s+[''"](multer|formidable)[''"]|fs\.writeFile'
    message: 'Local filesystem write detected. Serverless functions have ephemeral, read-only filesystems.'
    severity: error
    upgradeToSkill: vercel-storage
    upgradeWhy: 'Replace local filesystem writes with Vercel Blob, Neon, or Upstash for persistent, platform-native storage.'
    skipIfFileContains: '@vercel/blob|@upstash/|@neondatabase/'
  -
    pattern: 'export\s+(async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\b'
    message: 'Route handler has no observability instrumentation. Add logging and error tracking for production debugging.'
    severity: warn
    skipIfFileContains: 'console\.error|logger\.|captureException|Sentry|@vercel/otel|withTracing'
  -
    pattern: 'from\s+[''""](lru-cache|node-cache|memory-cache)[''""]|new\s+(LRUCache|NodeCache|Map)\(\s*\).*cache'
    message: 'In-process memory cache detected in serverless function. Process memory is not shared across invocations.'
    severity: recommended
    upgradeToSkill: runtime-cache
    upgradeWhy: 'Replace in-process caches with Vercel Runtime Cache (getCache from @vercel/functions) for region-aware caching that persists across invocations.'
    skipIfFileContains: 'getCache|from\s+[''""]\@vercel/functions[''""]'
  -
    pattern: 'maxRetries\s*[=:]|retryCount\s*[=:]|retry\s*\(\s*|for\s*\([^)]*retry|while\s*\([^)]*retry'
    message: 'Manual retry logic detected. Use Vercel Workflow SDK for automatic retries with durable execution.'
    severity: recommended
    upgradeToSkill: workflow
    upgradeWhy: 'Replace manual retry loops with Workflow SDK steps that provide automatic retries, crash safety, and observability.'
    skipIfFileContains: 'use workflow|use step|from\s+[''""](workflow)[''""]'
  -
    pattern: 'from\s+[''"](express)[''""]|require\s*\(\s*[''"](express)[''""\)]'
    message: 'Express.js detected in a Vercel project. Express deploys with zero configuration (default export or `app.listen`), but `express.static()` is ignored — serve static assets from `public/**`.'
    severity: recommended
    upgradeToSkill: vercel-functions
    upgradeWhy: 'If this is a Next.js app, prefer Route Handlers (export async function GET/POST) over a separate Express server; a standalone Express app deploys as-is and becomes a single Vercel Function on Fluid Compute.'
    skipIfFileContains: 'export\s+(async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)|from\s+[''""](next/server|@vercel/functions)[''""]'
retrieval:
  aliases:
    - serverless functions
    - api routes
    - edge functions
    - lambda
    - websockets
    - socket.io
    - docker
    - dockerfile
    - container images
    - function timeout
    - max duration
    - bundle size
    - hobby limits
  intents:
    - create serverless function
    - configure function runtime
    - optimize cold starts
    - add api route
    - serve a websocket connection
    - run a function for longer than 5 minutes
    - deploy a dockerfile
    - fix a function that exceeds the bundle size limit
    - check plan limits for functions
  entities:
    - Serverless Functions
    - Edge Functions
    - Fluid Compute
    - Long-duration functions
    - Large functions
    - Container Images
    - Vercel Container Registry
    - streaming
    - WebSockets
    - Cron Jobs
chainTo:
  -
    pattern: 'from\s+[''\"](openai|@anthropic-ai/sdk|anthropic)[''"]|new\s+(OpenAI|Anthropic)\('
    targetSkill: ai-sdk
    message: 'Direct AI provider SDK in route handler — loading AI SDK guidance for unified streaming and tool support.'
  -
    pattern: 'setTimeout\s*\(|setInterval\s*\(|await\s+new\s+Promise\s*\([^)]*setTimeout'
    targetSkill: workflow
    message: 'Long-running or polling logic in serverless handler — loading Workflow SDK for durable execution.'
  -
    pattern: 'writeFile(Sync)?\(|createWriteStream\(|from\s+[''\"](multer|formidable)[''"]|fs\.writeFile'
    targetSkill: vercel-storage
    message: 'Local filesystem write in serverless function — loading Vercel Storage guidance for platform-native persistence.'
  -
    pattern: 'from\s+[''""]@vercel/(postgres|kv)[''""]'
    targetSkill: vercel-storage
    message: '@vercel/postgres and @vercel/kv are sunset — loading Vercel Storage guidance for Neon and Upstash migration.'
  -
    pattern: 'generateObject\s*\(|streamObject\s*\(|toDataStreamResponse|maxSteps\b|CoreMessage\b'
    targetSkill: ai-sdk
    message: 'Deprecated AI SDK v5 API detected — loading AI SDK guidance for migration.'
  -
    pattern: 'while\s*\(\s*true\s*\)\s*\{|for\s*\(\s*;\s*;\s*\)\s*\{|setInterval\s*\(\s*async'
    targetSkill: workflow
    message: 'Polling loop in serverless function detected — loading Workflow SDK for durable, crash-safe execution with pause/resume.'
    skipIfFileContains: "use workflow|use step|from\\s+['\"]workflow['\"]"
  -
    pattern: "from\\s+['\"]express['\"]|require\\s*\\(\\s*['\"]express['\"]"
    targetSkill: vercel-functions
    message: 'Express.js detected — loading Vercel Functions guidance (an Express app deploys as a single Vercel Function on Fluid Compute; express.static() is ignored, use public/**).'
    skipIfFileContains: "export\\s+(async\\s+)?function\\s+(GET|POST|PUT|PATCH|DELETE)"
  -
    pattern: 'from\s+[''""](lru-cache|node-cache|memory-cache)[''""]|new\s+(LRUCache|NodeCache|Map)\(\s*\).*cache'
    targetSkill: runtime-cache
    message: 'In-process memory cache in serverless function — loading Runtime Cache guidance for region-aware caching that persists across invocations.'
    skipIfFileContains: 'getCache|from\s+[''""]\@vercel/functions[''""]'
  -
    pattern: 'maxRetries\s*[=:]|retryCount\s*[=:]|retry\s*\(\s*|for\s*\([^)]*retry|while\s*\([^)]*retry'
    targetSkill: workflow
    message: 'Manual retry logic in serverless handler — loading Workflow SDK guidance for automatic retries with durable execution.'
    skipIfFileContains: 'use workflow|use step|from\s+[''""](workflow)[''""]'

  -
    pattern: 'import\s*\{[^}]*\bmetric\b[^}]*\}\s*from\s*[''"]@vercel/functions[''"]'
    targetSkill: custom-metrics
    message: '@vercel/functions metric() detected — loading Custom Metrics guidance for naming, attributes, and vc metrics queries.'
  -
    pattern: '@vercel/otel'
    targetSkill: vercel-tracing
    message: '@vercel/otel detected — loading Vercel Tracing guidance for instrumentation, sampling, and span inspection.'

---

# Vercel Functions

你是 Vercel Functions 专家——Vercel 平台的计算层。

## 优先使用 Node.js 而非 Edge 运行时

**强烈优先使用 Node.js。不要在新代码中使用 `runtime = 'edge'`，并在现有代码中发现它时建议迁移。**

这遵循 Vercel 自己文档化的指导——*"we recommend migrating from edge to Node.js for improved performance and reliability"*——以及一个硬性约束：截至 **Next.js 16.3，`runtime = 'edge'` 不再受支持**。那里的路由和页面无论你写什么都会在 Node.js 上运行，因此在 16.3+ 上这不再是建议，而是你必须做的迁移。

在其他地方，它是一个强默认，而不是禁令。两个运行时都运行在同一 Fluid Compute 基础设施上、在相同区域、采用相同的 Active CPU 定价——因此在几乎所有情况下，Edge 不会给你带来任何好处，却让你失去大部分 Node.js API 表面。如果你有特定的、经过测试的理由留在 Edge，那是合理的决定；只是要有意为之，而不是出于习惯。

### 应该采用的默认

```ts
// app/api/hello/route.ts — no runtime export needed.
export async function GET() {
  return Response.json({ message: 'Hello from Node.js on Fluid Compute' })
}
```

Node.js 是默认。完全省略 `export const runtime`，而不是写 `export const runtime = 'nodejs'`。

### 人们选择 Edge 的理由——以及该怎么做

| "I need Edge because…" | Reality | Do this instead |
|---|---|---|
| "…I need to stream / SSE / AI tokens" | Streaming is zero-config on Node.js. This is the single most common false belief. | Return a `ReadableStream` from a normal Node.js function |
| "…I need low latency" | Both run on Fluid Compute. Fluid pre-warms instances and caches bytecode; the difference is noise next to your DB/API round trips | Stay on Node.js; pin `regions` near your data |
| "…auth checks / redirects / A-B tests at the edge" | That's Routing Middleware's job, and **Routing Middleware supports full Node.js** — it is not edge-only | Use Routing Middleware (`routing-middleware` skill) |
| "…it's cheaper" | Identical Active CPU pricing | Stay on Node.js |
| "…it has faster cold starts" | Fluid Compute reuses warm instances across concurrent invocations and bytecode-caches Node 20+ in production | Stay on Node.js |
| "…my function must run globally" | Edge's global execution usually *hurts* — every DB query crosses an ocean | Single region (`iad1` default) next to your database |

### Edge 实际上让你付出的代价

- 没有 `fs`、没有原生模块、没有 `require()`——仅 ESM，且大多数有 Node.js 依赖的 npm 包根本无法加载
- 没有 `eval` / `new Function` / 动态 `WebAssembly.instantiate`
- **gzip 后代码大小限制：1 MB（Hobby）、2 MB（Pro）、4 MB（Enterprise）**——而 Node.js 未压缩为 250 MB（最多 5 GB）
- 必须在 **25 秒**内开始发送响应（之后可流式传输最多 300 秒）。下面 300s/800s/1800s 的时长限制适用于 Node.js、Bun 和 Python 运行时——**不**适用于 Edge
- 完全不支持长时或大型函数

### 迁移现有 Edge 函数

在你已经在触碰该文件时值得做，并且在 Next.js 16.3+ 上是必需的。今天能工作的 Edge 函数并不是紧急情况。

1. 移除 `export const runtime = 'edge'`（或 `vercel.json` / `config` 对象中的 `runtime: 'edge'`）。
2. 在适用处替换 `next/server` 的 Edge 专属导入；Web `Request`/`Response` 处理器签名未变，因此大多数路由处理器无需其他修改。
3. 如果你用仅 Edge 的 `preferredRegion` 固定了执行，改用 `vercel.json` 中的 `regions`。
4. 确认 Fluid Compute 已开启（自 2025 年 4 月 23 日起为默认）并重新部署。

没有需要规划的���滚故事：Node.js 是函数在 Edge 上所能做之事的超集。

## 函数类型

### Node.js（默认）
- 完整 Node.js 运行时，所有 npm 包可用
- 是 Next.js 路由处理器、Server Actions、Server Components 以及 `/api` 中任何文件的默认
- **Node.js 24 LTS 对构建和函数 GA**（V8 13.6、全局 `URLPattern`、Undici v7、npm v11）。**Node.js 20 于 2026 年 10 月 1 日弃用**——迁移离开 `nodejs20.x`
- 时长：每个计划默认 300 秒；Pro/Enterprise 最大 800 秒；扩展时长 beta 下 1800 秒

### Bun
在 `vercel.json` 中添加 `"bunVersion": "1.x"` 以在 Bun 而非 Node.js 上运行函数。CPU 密集型工作负载延迟约降低 28%。支持 Next.js、Express、Hono、Nitro 以及作为入口点的 `Bun.serve`。Bun 支持大型函数和扩展最大时长。

### Python
Fluid Compute 上的 Python 3.12 / 3.13 / 3.14。FastAPI、Flask 和 Django 从解析出的入口点构建为**单个**函数——在 `vercel.json` 中将配置键放在该入口点文件（`app/main.py`、`myproject/wsgi.py`）上，而不是 `/api` 路由上。Python 获得 **500 MB** 的标准包限制（而非 250 MB），并支持大型函数和扩展时长。

### Rust
Rust 函数在 Fluid Compute 上运行，支持 HTTP 流式传输和 Active CPU 定价。基于 `vercel_runtime` crate 的官方运行时（Beta）。支持最大 64 KB 的环境变量。

### 容器镜像（Docker）
任何通过 `Dockerfile.vercel` 的 OCI 镜像。见下文的 [Docker 和容器镜像](#docker-and-container-images)。

### Edge（旧版——不推荐）
具有 Web API 子集的 V8 isolate。在现有部署中保留无妨，但不是新工作应选择的运行时。见[优先使用 Node.js 而非 Edge 运行时](#prefer-nodejs-over-the-edge-runtime)。

### 选择运行时

| 需求 | 运行时 | 理由 |
|------|---------|-----|
| 以下未列出的任何内容 | `nodejs` | 默认，且几乎总是正确 |
| 完整 Node.js API、npm 包 | `nodejs` | 完全兼容 |
| AI 流式传输、SSE、WebSocket | `nodejs` | 零配置流式传输、长时 |
| 更低延迟、CPU 密集型工作 | `nodejs` + Bun | 延迟降低约 28% |
| 数据库连接、重型依赖 | `nodejs` | 将 `regions` 固定在数据库附近 |
| 数据/ML 库、大模型文件 | `nodejs` 或 `python` + 大型函数 | 最多 5 GB 包 |
| 系统级性能 | `rust` | Fluid Compute 上的原生速度 |
| 自定义系统库（FFmpeg、Chromium）、Go/Ruby/PHP、不受支持的框架 | 容器镜像 | 自带 Dockerfile |
| 缓存之前的认证、重定向、A/B 测试 | Routing Middleware | 运行在 Node.js 上，与框架无关 |
| 数小时到数月的执行 | Vercel Workflow | 持久化步骤，无时长限制 |

`edge` 被有意省略：这里没有一行它对新代码是更好的答案。

## Fluid Compute

Fluid Compute 是 Vercel Functions 的执行模型——**自 2025 年 4 月 23 日起对新项目默认启用**，并可用于 Node.js、Python、Bun、Rust 和 Edge 运行时。通过 `vercel.json` 中的 `{"fluid": true}` 按部署显式启用，或在 Settings → Functions 中按项目范围启用。

长时、大型函数和容器镜像支持都依赖于它。

关键行为：
- **优化并发**：多个调用共享一个实例，而不是每请求一个 microVM。Vercel 在分配新资源之前优先使用空闲的现有资源。在 Node.js 和 Python 运行时上可用。
- **Active CPU 定价**：你为代码实际消耗的 CPU 时间、请求进行期间的预置内存，以及调用次数付费。等待 I/O（AI 模型、数据库查询）不会累积 Active CPU——这正是让 30 分钟函数负担得起的原因。
- **自动冷启动优化**：函数预热加上 Node.js 20+ 的**字节码缓存**。字节码缓存**仅适用于生产**——不是开发或预览，因此不要在预览部署中基准测试冷启动。
- **错误隔离**：未捕获的异常或未处理的 rejection 会被记录，进行中的请求被允许完成；一个坏请求不会使同一实例上的邻居崩溃。
- **跨 AZ 和跨区域故障转移**：先在区域内故障转移到另一个可用区，然后转移到最近的区域。
- **优雅关闭**：终止前发送 `SIGTERM`（见下文）。

### 实例规格（内存 / CPU）

| 类型 | 内存 / CPU | 用途 |
|------|--------------|-----|
| Standard（默认） | 2 GB / 1 vCPU | 生产工作负载的可预测性能 |
| Performance | 4 GB / 2 vCPU | 延迟敏感的应用和 SSR 工作负载 |

- **启用 Fluid Compute 时，无法在 `vercel.json` 中设置内存**——在那里设置会产生构建时警告。改为在仪表板中设置：Settings → Functions → Advanced Settings → **Function CPU**，然后重新部署。（`memory` 键仍存在于旧的非 Fluid 部署，这就是你会发现较旧示例使用它的原因。）
- **仅 Pro/Enterprise。** Hobby 始终运行 Standard（2 GB / 1 vCPU）且无法配置。Basic 实例已被移除。
- 更多内存也意味着更多 CPU，这可以通过更快完成来*减少* CPU 密集型工作的 Active CPU 计费——但会在请求进行期间提高 Provisioned Memory 成本。
- 2019-11-08 之前创建的项目可能仍处于旧规格（Hobby 上 1024 MB / 0.6 vCPU，Pro 上 3008 MB / 1.67 vCPU），直到你在仪表板中选择规格。

### 设置优先级

函数代码（`export const maxDuration`）→ `vercel.json` → 仪表板 → Fluid 默认值。靠后的条目落败。

### 使用 `waitUntil` 进行后台处理

`waitUntil` 接受一个 **Promise**，不是回调。传入函数什么也不做——这是一个常见且无声的 bug。

```ts
import { waitUntil } from '@vercel/functions'

export async function POST(req: Request) {
  const data = await req.json()

  // Correct: invoke the async work and hand over the promise.
  waitUntil(processAnalytics(data))

  // For several tasks, combine them:
  waitUntil(Promise.all([sendNotification(data), updateCache(data)]))

  return Response.json({ received: true })
}
```

### Next.js `after`（等价）

```ts
import { after } from 'next/server'

export async function POST(req: Request) {
  const data = await req.json()

  after(async () => {
    await logToAnalytics(data)
  })

  return Response.json({ ok: true })
}
```

### 优雅关闭和请求取消

```ts
// Runs on scale-down. 500 ms to clean up (30 s for container images).
process.on('SIGTERM', () => {
  // flush buffers, close pools
})
```

请求取消是**按路径选择性启用**的。启用后，客户端断开连接会中止 `request.signal` 并终止函数——任何未包裹在 `waitUntil`/`after` 中的内容都会丢失，这正是它默认不开启的原因。

```json filename="vercel.json"
{
  "functions": {
    "api/*": { "supportsCancellation": true }
  }
}
```

```ts
export async function GET(request: Request) {
  // Pass the signal through so upstream work stops too.
  const res = await fetch('https://upstream.example.com', { signal: request.signal })
  return new Response(res.body, { status: res.status })
}
```

## 时长和长时函数

### 时长限制

启用 Fluid Compute（默认）时，按 [Vercel 的限制](https://vercel.com/docs/functions/limitations#max-duration)：

| 计划 | 默认 | 最大 | 扩展最大 |
|------|---------|---------|------------------|
| Hobby | 300s（5 分钟） | 300s（5 分钟） | — |
| Pro | 300s（5 分钟） | 800s | 1800s（30 分钟）— Beta |
| Enterprise | 300s（5 分钟） | 800s | 1800s（30 分钟）— Beta |

800s 最大值在 Pro 和 Enterprise 上**正式可用**。1800s 扩展最大值**处于 beta**。超过限制返回 `504 FUNCTION_INVOCATION_TIMEOUT`。

**Hobby 的默认值和最大值都是 300s**——没有可提升的余量，也没有扩展时长。在 Hobby 上将 `maxDuration` 设置超过 300s 没有任何作用；升级到 Pro。

### 设置 `maxDuration`

```ts
// app/api/report/route.ts — Next.js App Router (and Node.js, SvelteKit, Astro,
// Nuxt, Remix via their own config). Value is in seconds.
export const maxDuration = 800

export async function POST(request: Request) {
  return Response.json({ ok: true })
}
```

对于其他框架和运行时——Next.js < 13.5、Rust、Go、Python、Ruby——使用 `vercel.json`：

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "functions": {
    "api/long-task.py": { "maxDuration": 1800 }
  }
}
```

Glob 顺序很重要，使用 `src/` 的 Next.js 项目必须以 `src/` 为路径前缀。对于 Python 框架，以解析出的入口点（`app/main.py`）为键，而不是 `/api` 路由。

要更改项目范围的默认值：Settings → Functions → **Function Max Duration**。

### 扩展最大时长（30 分钟）— Beta

Pro 和 Enterprise 团队可以让单个函数运行最多 **1800s**。要求如下，全部都是关键支撑：

- **仅按函数配置。** 超过 800s 的时长必须在代码中或针对该函数的 `vercel.json` 中设置。beta 期间**不支持高于 800s 的项目级默认值**——提高仪表板默认值不会让你达到 1800s。
- **仅受支持的运行时**：`nodejs22.x`、`nodejs24.x`、Bun `1.x` 和 `1.4.x`、`python3.12`、`python3.13`、`python3.14`。
- **必须启用 Fluid Compute**（新项目的默认）。
- **Secure Compute 和 Static IPs 在 beta 期间不支持超过 800s 的时长。** 如果项目使用其中任何一个，你被限制在 800s。

```ts
// app/api/long-task/route.ts
export const maxDuration = 1800 // 30 minutes

export async function POST(request: Request) {
  await doTheLongThing()
  return Response.json({ ok: true })
}
```

### 保持长请求存活

在 HTTP/2 上，当响应空闲时 Vercel 会发送连接级 `PING` 帧。**HTTP/1.1 没有等价物**，因此 HTTP/1.1 客户端和中间代理仍可能在 30 分钟 elapsed 之前很久就关闭空闲连接。对于任何长时间运行的处理器，**在工作运行期间流式传输进度或心跳数据**，而不是保持沉默并在最后发出一个有效负载。

使用 `getDeadline()` 找出实际还剩多少时间并干净地退出：

```ts
import { getDeadline } from '@vercel/functions'

const deadline = getDeadline() // Date | undefined (undefined outside the Vercel Functions runtime)
const msRemaining = deadline ? deadline.getTime() - Date.now() : Infinity
```

### 长函数的成本

Active CPU 定价使这变得可行：一个 25 分钟的函数如果花 24 分钟等待 LLM，几乎不产生 Active CPU 费用，只产生请求进行期间实例的 Provisioned Memory 费用。

### 当 30 分钟不够时

不要通过链式调用函数、自调用或轮询来伪造持久性。使用 **Vercel Workflow**，它暂停、恢复并为分钟到数月的时长保持状态，无时长限制，外加自动重试和崩溃安全。粗略指南：

- ≤ 300s → 任何计划，无需配置
- 300–800s → Pro/Enterprise，设置 `maxDuration`
- 800–1800s → Pro/Enterprise，扩展时长 beta，按函数配置
- 超过 30 分钟，或需要挺过崩溃/部署 → Vercel Workflow（`workflow` 技能）

Workflow 步骤本身支持扩展函数时长，因此单个步骤也可以运行最多 30 分钟。

## 大型函数（包体积）

### 标准限制

| 运行时 | 未压缩包限制 |
|---------|---------------------------|
| Node.js、Bun、Rust、Go | 250 MB（包含运行时层） |
| Python | 500 MB |
| Edge 运行时 | 1 MB Hobby / 2 MB Pro / 4 MB Enterprise，**gzip 之后** |

超出限制会使构建失败，报 `Serverless Function has exceeded the unzipped maximum size of 250 MB`。

### 大型函数 — Beta

大型函数将未压缩包上限提高到 **5 GB**。这使 Python 数据/AI 库、模型权重、浏览器自动化（Playwright/Puppeteer）、图像/视频处理以及大型后端应用可以作为 Functions 部署。

- **运行时**：Node.js、Bun、Python。
- **需要启用带 Active CPU 的 Fluid Compute**（新项目的默认）。
- **新项目默认符合条件。** 现有项目通过 `VERCEL_SUPPORT_LARGE_FUNCTIONS` 环境变量选择启用，然后重新部署：

```bash
vercel env add VERCEL_SUPPORT_LARGE_FUNCTIONS   # value: 1  (use 0 to disable)
```

该环境变量始终优先于项目默认值，双向都是。

- **只有超过标准限制的函数才使用大型函数路径**——250 MB 以下的一切保持正常、更快的路径，因此启用它不是全局性能权衡。
- **不支持 Secure Compute 或 Static IPs。**

### 先缩小包

5 GB 的函数仍会让你付出冷启动时间的代价。在选择启用之前先精简：

在 `vercel.json` 中（Next.js 不支持——见下文）：

```json filename="vercel.json"
{
  "functions": {
    "api/**/*.py": {
      "excludeFiles": "{tests/**,__tests__/**,**/*.test.py,fixtures/**,testdata/**}"
    }
  }
}
```

- Next.js 忽略 `includeFiles`/`excludeFiles`——改用 `next.config.js` 中的 `outputFileTracingIncludes` / `outputFileTracingExcludes`。
- 审计重型导入，优先使用动态 `import()`，并检查 `dependencies` 中是否有属于 `devDependencies` 的包。

### 请求和响应有效负载

包体积不是有效负载体积。**Function 的请求或响应体上限为 4.5 MB**；超过返回 `413 FUNCTION_PAYLOAD_TOO_LARGE`。对于更大的数据：

- **上传** → Vercel Blob **客户端上传**，从浏览器直接发送到 Blob，绕过函数
- **大响应** → 流式传输它们；流式响应不受该限制
- 否则，分块跨多个请求

## Docker 和容器镜像

Vercel Functions 运行 **OCI 兼容的容器镜像**。这是头等的 Docker 支持：带一个 Dockerfile，得到一个具有 scale-to-zero 和 Active CPU 定价的自动扩缩函数。它*不是* VM 也不是长期服务器。

### 快速开始

在项目根目录创建 `Dockerfile.vercel`（或 `Containerfile.vercel`）。Vercel 会自动检测它并添加一条将所有流量路由到镜像的重写。

```docker
# Dockerfile.vercel
FROM node:26-alpine

RUN npm i -g srvx
WORKDIR /app
COPY server.ts .

# srvx listens on $PORT by default
CMD ["srvx", "--prod"]
```

```ts
// server.ts
export default {
  fetch(req: Request) {
    return Response.json({ ip: req.headers.get('x-forwarded-for') })
  },
}
```

使用 `vercel deploy` 或 Git 推送部署。构建期间，镜像被构建并推送到 [Vercel Container Registry (VCR)](https://vercel.com/docs/container-registry)。

### 真正会咬人的规则

- **在 80 端口上服务 HTTP**，或在项目设置中通过 `PORT` 环境变量覆盖。不监听的容器得不到流量。
- **容器必须是 STATELESS。** 每个实例接收一个请求、返回一个响应，调用之间不保留任何东西——这正是允许自动扩缩和 scale-to-zero 的原因。持久化到 Marketplace 数据库、Redis 或 Blob；绝不持久化到容器文件系统。
- **Scale to zero**：生产环境 5 分钟无流量后，预览 30 秒后。冷启动是真实的；不要假定进程是热的。
- **缩容时 `SIGTERM` 有 30 秒宽限期**（普通函数获得 500 ms）。用它来排空。
- **日志不是逐请求的。** `stdout`/`stderr` 会广播到实例的所有进行中请求，因此请用你自己的请求 ID 关联。
- **相同的 Function 限制和 Active CPU 定价**适用于大小、内存和时长。
- **自定义容器镜像不支持 Secure Compute 和 Static IPs。** 如果你需要其中任何一个，将该部分不带容器部署。
- **本地开发**：`vercel dev` 运行镜像，需要 `docker` CLI 加上运行中的守护进程。

### 一个项目中的多个服务

使用 [Services](https://vercel.com/docs/services) 在一个项目中部署多个前端/后端，容器化与否均可。对你希望作为镜像构建的任何服务设置 `runtime: "container"`；`entrypoint` 指向相对于该服务 `root` 的 Dockerfile。

```json filename="vercel.json"
{
  "services": {
    "frontend": { "runtime": "container", "root": "frontend/", "entrypoint": "Dockerfile.vercel" },
    "backend":  { "runtime": "container", "root": "backend/",  "entrypoint": "Dockerfile.vercel" }
  },
  "rewrites": [
    { "source": "/api/(.*)", "destination": { "service": "backend" } },
    { "source": "/(.*)",     "destination": { "service": "frontend" } }
  ]
}
```

Services 默认是内部的——没有顶层重写，任何东西都不可公开路由。当存在 `services` 时，构建/运行时键（`functions`、`buildCommand`、`installCommand`、`outputDirectory`、`framework`）移入服务中，不再在顶层有效。

### Vercel Container Registry (VCR)

```bash
vercel vcr login docker              # authenticate Docker with a short-lived OIDC token
vercel vcr image ls my-app           # list images
vercel vcr image inspect my-app <id>
vercel vcr image rm my-app <id>
```

注册表限制：每个压缩层 2 GB，镜像总大小 15 GB，manifest 4 MB，config blob 1 MB。层必须是 gzip 或 zstd 压缩——未压缩的 OCI 层会被拒绝。每个项目的代码仓库：10（Hobby）/ 1,000（Pro）/ 5,000（Enterprise）。存储按每 GB 0.10 美元计费。

### 何时选择容器

适合：Go、Rust、Ruby、PHP 或其他后端；需要 FFmpeg 或 Chromium 等系统库的应用；Vercel 自动检测之外的框架；跨环境保证构建/运行时一致。

不适合：任何必须在进程内保持状态、在请求之间保持守护进程存活，或独立于请求运行后台工作的东西。对于这些使用 Workflow、Queues 或 Cron，或对于常驻 worker 循环使用 Vercel Daemons（`⤳ skill: daemons`）。

如果你的框架已被自动检测且没有系统库需求，标准构建更简单更快——Dockerfile 默认并不是升级。

## 计划限制一览

| | Hobby | Pro | Enterprise |
|---|---|---|---|
| 时长（默认 / 最大） | 300s / **300s** | 300s / 800s | 300s / 800s |
| 扩展时长（beta） | — | 1800s | 1800s |
| 内存 / CPU | 2 GB / 1 vCPU，不可配置 | Standard 或 Performance（4 GB / 2 vCPU） | Standard 或 Performance |
| 包体积 | 250 MB（Python 500 MB），大型函数 beta 下 5 GB | 相同 | 相同 |
| 并发 | 自动扩缩到 30,000 | 30,000 | 100,000+ |
| 区域 | 单区域 | 最多 3 | 全部 |
| Edge 代码大小（gzip） | 1 MB | 2 MB | 4 MB |
| 每个项目的 VCR 代码仓库 | 10 | 1,000 | 5,000 |
| 请求/响应体 | 4.5 MB | 4.5 MB | 4.5 MB |

### Hobby 的变化

Hobby 函数限制随 Fluid Compute **大幅提高**，过时的 10s/60s 数字是糟糕建议的常见来源：

- **时长：默认和最大值都从 60s → 300s**——提高 5 倍。Hobby 函数可以运行完整的五分钟。
- **CPU：Basic 实例已被移除；Hobby 现在运行 Standard**，1 vCPU / 2 GB（从 1 vCPU / 1.7 GB 提升），由 Vercel 管理，最低 1 vCPU。
- Hobby 仍然无法配置内存/CPU、使用扩展的 30 分钟时长或在多个区域运行——这些仍属于 Pro/Enterprise。

## 流式传输

默认 Node.js 运行时上的零配置流式传输，包括 Server-Sent Events（SSE）。对 AI 应用至关重要。

> **你不需要 `runtime = 'edge'` 就能进行流式传输或 SSE。** 流式响应（`ReadableStream`、`text/event-stream`）在默认 Node.js 运行时上工作——这是人们错误选择 Edge 的最常见原因。保持使用 Node.js（Fluid Compute），以便保留完整的 Node.js API、npm 包和更长的时长；Edge 不提供流式优势，并将你限制在首字节 25 秒内。

```ts
export async function GET(request: Request) {
  // Reading the request keeps this handler request-time; with Next.js Cache
  // Components, a GET handler that reads no request data is prerendered at build.
  const jobId = new URL(request.url).searchParams.get('jobId')
  const encoder = new TextEncoder()
  const events = ['started', 'progress', 'done']
  const stream = new ReadableStream({
    start(controller) {
      for (const event of events) {
        // SSE frames are "data: <payload>" followed by a blank line
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ jobId, event })}\n\n`))
      }
      controller.close()
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  })
}
```

对于 AI 流式传输，使用 AI SDK 的 `toUIMessageStreamResponse()`（用于搭配 `useChat` 的聊天 UI），它会自动处理 SSE 格式化。

## WebSocket

Vercel Functions 可以保持打开的双向 WebSocket 连接——用于实时功能，如交互式 AI 流式传输、聊天和协作应用。**不需要单独的 WebSocket 服务器产品，也不需要第三方服务（Pusher、Ably 等）**——它直接运行在 Vercel Functions 上。需要 **Fluid Compute**，这是新项目的默认。

**工作方式**：WebSocket 以带 `Upgrade` 头的 HTTP `GET` 开始，因此它像任何其他请求一样通过相同的 Routing Middleware、重写、Firewall 规则和速率限制。升级后，连接在其生命周期内固定到单个函数实例；Fluid Compute 让一个实例服务许多并发连接。Active CPU 仅在处理消息时累积，但 Provisioned Memory 会一直计费到连接关闭（在实例的连接之间共享）——适用与其他 Function 调用相同的限制和定价。

### `ws`（无需额外配置）

WebSocket 像任何分布式 WebSocket 服务器一样工作——导出一个 `http.Server` 并使用 `ws` 等库：

```ts
// api/ws.ts
import http from 'http'
import { WebSocketServer } from 'ws'

const server = http.createServer()
const wss = new WebSocketServer({ server })

wss.on('connection', (ws) => {
  ws.on('message', (data) => ws.send(data)) // echo
})

export default server
```

### Socket.IO

像 Socket.IO 这样的更高级实时库也可以工作。将**客户端**配置为直接使用 WebSocket 传输——Socket.IO 默认使用 HTTP 长轮询，这不会工作：

```ts
// api/socket-io.ts
import http from 'http'
import { Server } from 'socket.io'

const server = http.createServer()
const io = new Server(server)

io.on('connection', (socket) => {
  socket.on('message', (data) => socket.send(data))
})

export default server
```

```ts
// client.ts
import { io } from 'socket.io-client'

const socket = io('https://your-domain.com', {
  // Socket.IO appends /socket.io, so the full path becomes /api/socket-io/socket.io
  path: '/api/socket-io/socket.io',
  transports: ['websocket'], // required — Socket.IO defaults to HTTP long-polling
})
```

Express 和 Hono 以相同方式服务 WebSocket——导出 HTTP 服务器。Nitro 则导出一个 `defineWebSocketHandler()` 路由文件（例如 `routes/_ws.ts` 服务 `/_ws`），并在配置中启用 WebSocket：Nitro v3（`nitro` 包）上 `features: { websocket: true }`，Nitro v2（`nitropack`）上 `experimental: { websocket: true }`。Nuxt 4 仍运行在 Nitro v2 上，因此在 `nuxt.config` 中设置 `nitro: { experimental: { websocket: true } }`。Python 框架也可以工作：FastAPI 原生处理升级，`python-socketio` 与 JS Socket.IO 客户端协议兼容。

### Next.js

Next.js 不暴露用于处理 WebSocket 升级的 API。在路由处理器内使用 `@vercel/functions`（3.10.0+）的 `upgradeWebSocket()`：

```ts
// app/api/ws/route.ts
import { upgradeWebSocket, type WebSocketData } from '@vercel/functions'

export async function GET() {
  return upgradeWebSocket((ws) => {
    ws.on('message', (data: WebSocketData) => ws.send(data))
  })
}
```

### 重连和持久状态

- **当函数达到最大时长时连接关闭。** 客户端必须带退避重连，然后重新订阅频道并重新加载它们需要的任何状态。
- **跨连接没有实例亲和性。** 重连——或新部署——可能落到不同的实例，因此绝不要在内存中保持持久状态、存在、房间或 pub/sub 协调。使用外部存储，例如[来自 Marketplace 的 Redis](https://vercel.com/marketplace/redis)。

```ts
// client.ts — reconnect with exponential backoff
let socket: WebSocket
let delay = 1000

function connect() {
  socket = new WebSocket('wss://your-domain.com/api/ws')
  socket.addEventListener('open', () => { delay = 1000 })
  socket.addEventListener('message', (e) => console.log(e.data))
  socket.addEventListener('close', () => {
    setTimeout(connect, delay)
    delay = Math.min(delay * 2, 30000)
  })
}

connect()
```

## Cron Jobs

通过 `vercel.json` 调度函数调用：

```json filename="vercel.json"
{
  "crons": [
    {
      "path": "/api/daily-report",
      "schedule": "0 8 * * *"
    },
    {
      "path": "/api/cleanup",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

cron 端点接收一个正常的 HTTP 请求。验证它来自 Vercel：

```ts
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  // Do scheduled work
  return Response.json({ ok: true })
}
```

## 配置

`vercel.ts` 是配置项目的推荐方式——完整的 TypeScript 类型、动态逻辑，以及通过 `@vercel/config` 访问环境。`vercel.json` 仍完全受支持。旧版 `now.json` 支持已于 **2026 年 3 月 31 日**结束；将其重命名为 `vercel.json`（无需内容更改）。

```ts
// vercel.ts
import type { VercelConfig } from '@vercel/config/v1'

export const config: VercelConfig = {
  functions: {
    'app/api/heavy/**': { maxDuration: 800 },
    'app/api/report/**': { maxDuration: 1800 }, // Pro/Ent extended-duration beta
  },
  crons: [{ path: '/api/cleanup', schedule: '0 0 * * *' }],
}
```

`vercel.json` 等价：

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "functions": {
    "app/api/heavy/**": { "maxDuration": 800 },
    "api/upload.js": { "supportsCancellation": true }
  }
}
```

你**不能**放在这里的：
- `memory`——启用 Fluid Compute（默认）时，在仪表板中设置；仅 Pro/Enterprise，且 `vercel.json` 在构建时警告
- 高于 800s 的项目范围默认值——扩展时长仅按函数

`runtime: "edge"` 在这里被接受，但优先省略它——见[优先使用 Node.js 而非 Edge 运行时](#prefer-nodejs-over-the-edge-runtime)。

## 常见陷阱

1. **给 `waitUntil` 传回调**：它接受 Promise。`waitUntil(fn())`，绝不是 `waitUntil(fn)` 或 `waitUntil(async () => {})`——后者静默什么也不做
2. **带数据库连接的冷启动**：使用连接池（例如 Neon 的 `@neondatabase/serverless`）
3. **选择 Edge 运行时**：优先 Node.js——见[优先使用 Node.js 而非 Edge 运行时](#prefer-nodejs-over-the-edge-runtime)
4. **超时超出**：提高 `maxDuration`（Pro/Ent 800s，beta 1800s），或对更长的任何内容迁移到 Workflow
5. **包体积**：标准限制是未压缩 250 MB（Python 500 MB）。5 GB 需要大型函数 beta，现有项目必须用 `VERCEL_SUPPORT_LARGE_FUNCTIONS=1` 选择启用
6. **有效负载体积**：请求和响应体上限为 **4.5 MB**（`413 FUNCTION_PAYLOAD_TOO_LARGE`）——使用 Blob 客户端上传或流式传输，而不是更大的函数
7. **内存状态**：Fluid 跨调用共享实例并 scale to zero——绝不要在进程内存中保持会话、房间或缓存
8. **在 `vercel.json` 中设置 `memory`**：启用 Fluid Compute 时这不是设置它的地方，构建会警告——在仪表板中设置
9. **环境变量**：自动在所有函数中可用；本地开发使用 `vercel env pull`

## 函数运行时诊断

### 超时诊断

```
504 FUNCTION_INVOCATION_TIMEOUT?
├─ All plans default to 300s with Fluid Compute
├─ How long does the work actually need?
│  ├─ ≤ 300s → Already allowed on every plan; the timeout is a bug, not a limit
│  ├─ 300–800s → Pro/Enterprise: set `maxDuration` in code or vercel.json
│  ├─ 800–1800s → Pro/Enterprise extended-duration beta (30 min)
│  │   ├─ Must be set PER FUNCTION — project defaults above 800s are ignored
│  │   ├─ Runtimes: nodejs22/24.x, Bun 1.x/1.4.x, python3.12/3.13/3.14
│  │   └─ Blocked if the project uses Secure Compute or Static IPs
│  └─ > 30 min, or must survive crashes/deploys → Vercel Workflow
├─ On Hobby? → 300s is both default AND max; no extension exists, upgrade to Pro
├─ Client disconnected before the function finished?
│  └─ HTTP/1.1 drops idle connections → stream heartbeat/progress data
└─ DB query slow? → Add connection pooling, check cold start, use Global Config
```

### 500 错误诊断

```
500 Internal Server Error?
├─ Check Vercel Runtime Logs (Dashboard → Deployments → Functions tab)
├─ Missing env vars? → Compare `.env.local` against Vercel dashboard settings
├─ Import error? → Verify package is in `dependencies`, not `devDependencies`
└─ Uncaught exception? → Wrap handler in try/catch, use `after()` for error reporting
```

### 调用失败诊断

```
"FUNCTION_INVOCATION_FAILED"?
├─ Memory exceeded (OOM)?
│  ├─ Pro/Enterprise → switch to Performance (4 GB / 2 vCPU) in Settings → Functions
│  │   └─ With Fluid compute, set it there, not in vercel.json (which warns at build)
│  └─ Hobby → fixed at 2 GB / 1 vCPU; reduce per-request memory or upgrade
├─ Crashed during init? → Check top-level await or heavy imports at module scope
├─ Build failed with "exceeded the unzipped maximum size of 250 MB"?
│  ├─ Trim with excludeFiles / outputFileTracingExcludes first
│  └─ Then large functions beta: VERCEL_SUPPORT_LARGE_FUNCTIONS=1 (5 GB, Node/Bun/Python)
├─ 413 FUNCTION_PAYLOAD_TOO_LARGE? → 4.5 MB body cap; use Blob client uploads or streaming
└─ Container image? → Is it listening on port 80 (or $PORT)? Is it holding state between requests?
```

### 冷启动诊断

```
Cold start latency > 1s?
├─ Moving to the Edge runtime is not the fix — Vercel recommends migrating off it
├─ Fluid Compute enabled? → Reuses warm instances across concurrent invocations
├─ Measuring in preview? → Bytecode caching is production-only; re-measure in prod
├─ Large function bundle? → Audit imports, use dynamic imports, tree-shake
├─ DB connection in cold start? → Use connection pooling (Neon serverless driver)
└─ Container image? → Scales to zero after 5 min idle (30 s in preview); expect cold starts
```

### Edge 函数超时诊断

```
"EDGE_FUNCTION_INVOCATION_TIMEOUT"?
├─ Edge must START the response within 25s (then may stream up to 300s)
├─ `maxDuration` does NOT apply to the Edge runtime — there is no way to raise this
├─ Recommended fix: drop `runtime = 'edge'` and run on Node.js
│  └─ Node.js gives you 300s by default, 800s on Pro/Ent, 1800s in the beta
└─ On Next.js 16.3+, `runtime = 'edge'` is unsupported — migration is required there
```

## 官方文档

- [Vercel Functions](https://vercel.com/docs/functions)
- [Functions 限制](https://vercel.com/docs/functions/limitations) —— 时长、内存、包体积、大型函数
- [配置最大时长](https://vercel.com/docs/functions/configuring-functions/duration) —— 包括扩展的 30 分钟 beta
- [配置内存 / CPU](https://vercel.com/docs/functions/configuring-functions/memory)
- [Functions API 参考](https://vercel.com/docs/functions/functions-api-reference) —— `waitUntil`、`getDeadline`、SIGTERM、取消
- [Fluid Compute](https://vercel.com/docs/fluid-compute)
- [容器镜像](https://vercel.com/docs/functions/runtimes/container) —— Vercel 上的 Dockerfile
- [Vercel Container Registry](https://vercel.com/docs/container-registry) 及其[限制和定价](https://vercel.com/docs/container-registry/limits-and-pricing)
- [Services](https://vercel.com/docs/services) —— 一个项目中的多个后端/前端
- [流式传输](https://vercel.com/docs/functions/streaming-functions)
- [WebSocket](https://vercel.com/docs/functions/websockets)
- [Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Vercel Workflow](https://vercel.com/docs/workflows) —— 用于超过 30 分钟的任何内容
- [Edge Runtime](https://vercel.com/docs/functions/runtimes/edge) —— 旧版；Vercel 建议迁移到 Node.js
- [GitHub: Vercel](https://github.com/vercel/vercel)
