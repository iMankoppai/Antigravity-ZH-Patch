---
name: vercel-tracing
description: 为 Vercel Tracing 设置 OpenTelemetry 埋点并查询生成的 span。在添加或修复 `@vercel/otel`、接入框架的服务端启动钩子（Next.js、SvelteKit 及其他）、添加自定义 span、开启来自 AI SDK、Flags SDK 或数据库客户端等库的 span、在服务之间传播追踪上下文、配置 always-on tracing 采样、用 `vercel traces` 搜索或检查 span，或调试失败或缓慢的服务端请求时使用。
summary: Instrument server code with @vercel/otel, then debug and optimize requests with vercel traces
metadata:
  priority: 8
  docs:
    - "https://vercel.com/docs/tracing"
    - "https://vercel.com/docs/tracing/always-on-tracing"
    - "https://vercel.com/docs/tracing/session-tracing"
    - "https://vercel.com/docs/cli/traces"
    - "https://vercel.com/docs/tracing/instrumentation"
  sitemap: "https://vercel.com/sitemap/docs.xml"
  pathPatterns: []
  bashPatterns:
    - '\b(?:vercel|vc)\s+traces\b'
    - '\b(?:vercel|vc)\s+curl\b[^\n]*--trace\b'
  importPatterns:
    - '@vercel/otel'
    - '@opentelemetry/api'
  promptSignals:
    phrases:
      - "vercel traces"
      - "vc traces"
      - "@vercel/otel"
      - "registerotel"
      - "instrumentation hook"
      - "opentelemetry"
      - "open telemetry"
      - "enable tracing"
      - "set up tracing"
      - "add tracing"
      - "distributed tracing"
      - "always-on tracing"
      - "session tracing"
      - "trace sampling"
      - "sampling rule"
      - "context propagation"
      - "traceparent"
      - "custom span"
      - "registertelemetry"
      - "experimental_telemetry"
      - "settracerprovider"
      - "measure how long"
      - "ttfb"
      - "time to first byte"
      - "high latency"
      - "reduce latency"
      - "performance regression"
      - "failed requests"
      - "production errors"
    allOf:
      - [vercel, tracing]
      - [vercel, traces]
      - [vercel, spans]
      - [vercel, instrument]
      - [otel, instrument]
      - [ai sdk, spans]
      - [ai sdk, telemetry]
      - [ai sdk, tracing]
      - [flags sdk, spans]
      - [flags sdk, tracing]
      - [sentry, otel]
      - [sveltekit, otel]
      - [always, tracing]
      - [traces, disconnected]
      - [api, slow]
      - [endpoint, slow]
      - [route, slow]
      - [function, slow]
      - [page, slow]
      - [request, slow]
      - [query, slow]
      - [database, slow]
      - [loader, slow]
      - [action, slow]
      - [server, slow]
      - [app is, slow]
      - [app feels, slow]
      - [app got, slow]
      - [app loads, slow]
      - [take, seconds, route]
      - [take, seconds, endpoint]
      - [take, seconds, api]
      - [take, seconds, page]
      - [take, seconds, dashboard]
      - [take, seconds, request]
      - [take, seconds, loader]
      - [take, seconds, query]
      - [take, seconds, server]
      - [p95, latency]
      - [slow, since, deploy]
      - [slower, since, deploy]
      - [sluggish, deploy]
      - [performance, degraded]
      - [performance, api]
      - [performance, endpoint]
      - [performance, route]
      - [performance, server]
      - [performance, function]
      - [speed up, api]
      - [speed up, route]
    noneOf:
      - "the build"
      - "my build"
      - "slow build"
      - "build time"
      - "build takes"
      - "to build"
      - "vercel deploy"
      - "deploy is slow"
      - "deploys are slow"
      - "deployments are slow"
      - "deploy takes"
      - "ci pipeline"
      - "github actions"
      - "test suite"
      - "dev server"
      - "hmr"
      - "hot reload"
      - "re-render"
      - "re-renders"
      - "spinner"
      - "animation"
      - "scroll"
      - "scrolling"
      - "interaction"
      - "file tracing"
      - "bundle size"
      - "lcp"
      - "core web vitals"
      - "lighthouse"
    minScore: 4
retrieval:
  aliases:
    - Vercel Tracing
    - always-on tracing
    - vc traces
    - Vercel OpenTelemetry
  intents:
    - set up OpenTelemetry for a Vercel project
    - wire @vercel/otel into a framework's server startup hook
    - add custom spans around application operations
    - turn on spans from the AI SDK, Flags SDK, or database clients
    - connect disconnected traces across services
    - configure trace sampling
    - verify instrumentation by inspecting a collected trace
    - debug failed requests or production errors using traces
    - make a slow API route or server function faster
  entities:
    - "@vercel/otel"
    - "@opentelemetry/api"
    - vercel traces search
    - vercel traces inspect
    - vercel traces config
    - vercel traces create
    - vercel curl --trace
  examples:
    - add OpenTelemetry to my app deployed on Vercel
    - set up @vercel/otel in my SvelteKit app
    - propagate trace context to my backend API
    - debug production errors in my Vercel app
    - this endpoint is slow, make it faster
---

# Vercel Tracing

使用 Vercel Tracing 通过 OpenTelemetry 对服务端代码进行埋点，并检查来自已部署流量的 span。工作流是：**从框架的服务端启动钩子注册 `@vercel/otel` → 部署并触发一个服务端路由 → 用 `vercel traces` 搜索并检查该追踪**。使用相同的追踪来调试失败的请求和度量缓慢的操作。只阅读当前任务所需的参考资料。

Tracing 仅覆盖运行服务端代码的请求：动态路由、API 路由、函数和按需渲染。静态和预渲染页面以及 CDN 缓存命中不运行任何应用代码，因此追踪无法解释或加速它们；改用缓存、包体积和 Core Web Vitals 工作来优化这些。

## 参考资料索引

| 参考 | 何时阅读 |
| --- | --- |
| [收集](references/collection.md) | 决定哪些 span 需要应用侧设置，或选择 always-on tracing、请求捕获或浏览器会话时 |
| [埋点](references/instrumentation.md) | 发现框架的启动钩子、接入并验证 SDK 设置，或使用 Sentry 时 |
| [Next.js](references/nextjs.md) | 设置 Next.js 埋点或启用详细 span 时 |
| [SvelteKit](references/sveltekit.md) | 在 SvelteKit 2 或 3 上启用服务端追踪和埋点钩子时 |
| [库 span](references/library-spans.md) | 开启来自 AI SDK、Flags SDK、Workflow 或数据库和缓存客户端的 span 时 |
| [自定义 span](references/custom-spans.md) | 度量应用操作并记录失败时 |
| [上下文传播](references/context-propagation.md) | 跨服务连接追踪：出站 URL 匹配、非 fetch 客户端和队列、传入请求时 |
| [配置](references/configuration.md) | 检查或更改 always-on tracing 采样规则时 |
| [捕获](references/capture.md) | 复现请求或追踪浏览器流程时 |
| [搜索](references/search.md) | 查找缓慢或失败的 span、选择过滤器或解析结果时 |
| [检查](references/inspection.md) | 获取请求追踪并选择时间线、树或瀑布视图时 |
| [性能](references/performance.md) | 让路由、API、函数或服务端渲染页面更快：将操作包裹在自定义 span 中、读取确切的时长、比较前后时 |
| [排查](references/troubleshooting.md) | 调查空结果、查找失败、缺失 span 或被截断的属性时 |

## 设置工作流

1. 检查现有设置：框架和适配器版本、任何已注册的 OpenTelemetry 提供商或 Sentry v8+，以及框架追踪标志。扩展已有的提供商；绝不要注册第二个。
2. 决定哪些需要应用侧设置。基础设施和出站 fetch 的 span 是自动的；框架、库和自定义 span 需要 `@vercel/otel`。参见[收集](references/collection.md)。
3. 安装 `@vercel/otel` 和 `@opentelemetry/api`，然后从框架经验证的服务端启动钩子注册一次 SDK。在 Next.js 上，就是在 `instrumentation.ts` 中的 `register()`：

   ```ts
   import { registerOTel } from '@vercel/otel';

   export function register() {
     registerOTel({ serviceName: 'checkout' });
   }
   ```

   对于其他框架，遵循 [SvelteKit](references/sveltekit.md) 或[其他框架](references/instrumentation.md#integrate-another-framework)；参见 [Next.js](references/nextjs.md) 了解详细 span 和预渲染。Next.js 和 SvelteKit 会自动加入传入请求的追踪；其他框架可能需要[传入上下文提取](references/context-propagation.md#incoming-requests)。在需要的地方添加[自定义 span](references/custom-spans.md)和[上下文传播](references/context-propagation.md)。
4. 为应用 `package.json` 中的库（例如 AI SDK、Flags SDK 或数据库客户端）开启[库 span](references/library-spans.md)。
5. 构建、部署到预览或生产、触发一个由服务端执行的路由，并[检查其追踪](references/inspection.md)。用 `inspect` 确认 span 名称和父子关系，用搜索 JSON 确认 `service.name`。本地导出器检查并不能证明 Vercel 已收集。

## 调查工作流

使用追踪调查错误并提升应用性能。优化前先度量：在已部署的 span 确认之前，不要声称加速。

当原因在代码中看起来很明显时（例如顺序 await），仍要度量。在与修复相同的变更中围绕可疑操作添加 span，或在可能时先在基线部署中添加。在已部署的追踪确认之前，将预期收益作为估计报告，并指出用户应比较的 span。阅读代码能找出候选者；但它不能显示在 Vercel 上哪一个占主导，因为在 Vercel 上数据库位置、冷启动和外部 API 会改变成本。

1. 确认缓慢或失败的路由在每次请求时都运行服务端代码；静态、预渲染或缓存的响应没有应用 span。验证预览或生产部署、收集模式和流量。检查应用 OpenTelemetry 设置以了解框架和自定义 span，以及 always-on tracing 的采样规则。复用已完成的设置，并为缺少的已安装库从 `vercel-tracing` 技能开启库 span。
2. 为受影响的项目、路由、环境和时间窗口查找缓慢或失败的请求，或捕获一次复现。
3. 将每个可疑操作（数据库查询、外部调用、缓存读取、渲染、CPU 密集型工作）用 `startActiveSpan` 包裹在自定义 span 中，部署，并从追踪读取确切时长。将这些保存为基线。
4. 检查追踪以定位失败的操作、关键路径上最慢的 span、顺序等待，以及父 span 与其子 span 之间未度量的间隙；将它们与应用代码关联。为任何间隙添加 span 并再次度量。
5. 更改已度量的原因，同时保留其 span。部署后，在相似负载和收集设置下跨等效请求比较该 span 和整个请求。报告前后计时、样本数、错误和剩余不确定性。

有限的 span 搜索并不是完整的延迟分布。对于渲染或交互瓶颈，将浏览器性能分析与追踪一起使用。

## CLI 范围

确认 `vercel traces --help` 列出了所需的子命令。`vc` 和 `vercel` 等价。

当检测到智能体且 stdin 不是 TTY 时，CLI 默认以 `--non-interactive` 运行。在该模式下，`search` 和 `config` 打印 JSON，`search --columns` 被拒绝，生产捕获需要 `--yes`，并且 `config rm` 返回让用户运行的命令而不是提示。

搜索覆盖所选团队中的所有项目，即使从已关联的目录运行也是如此。用 `--scope` 指定团队，用 `--project` 限定某个应用的搜索。`inspect` 和 `config` 仍然是项目范围的；在团队搜索之后，用结果中的项目进行检索。

不要仅仅为了调查某个问题而更改采样。空的采样结果不能证明请求从未发生；将认证或 API 失败与成功的空搜索区分开。
