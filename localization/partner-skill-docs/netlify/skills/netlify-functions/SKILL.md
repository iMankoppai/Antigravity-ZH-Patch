---
name: netlify-functions
description: 用 TypeScript、JavaScript 或 Go 编写、配置和部署 Netlify 无服务器 functions。当添加 API endpoint 或后端路由、添加联系表单处理器、接好 auth 或 Identity 注册/登录钩子、识别是哪个 Netlify 用户在调用私有或受团队登录保护的应用、构建流式或 AI 代理响应、调度 cron 任务、运行长时间后台任务（批处理/抓取）、响应部署或表单事件、设置速率限制或区域/内存配置，或在 function 内读取环境变量和密钥时，使用本技能。涵盖文件位置、Request/Context/Response 处理器形态、路径路由、配置选项，以及用 netlify dev 进行本地测试。
---

# Netlify Functions

优先使用现代 default-handler API（`.mts` TypeScript）。导出一个默认的异步 handler，接收 web `Request` 和 Netlify `Context`，返回 web `Response`。除非编写 Go 或迁移旧代码，否则避免使用旧式 AWS Lambda handler 形态（见文末 Legacy）。

## 文件位置

- 默认目录：`netlify/functions/`（相对于基础目录）。把它保持在发布目录**之外**，否则源文件会作为静态资源被发布。
- 一个 function 是一个文件，或一个入口文件名为 `index` 或与子目录同名的子目录。以下都会创建名为 `hello` 的 function：
  - `netlify/functions/hello.mts`
  - `netlify/functions/hello/hello.mts`
  - `netlify/functions/hello/index.mts`
- 使用 `.mts`（TS）/ `.mjs`（JS）表示 ES 模块。`.cts`/`.cjs` 强制 CommonJS；`.ts`/`.js` 遵循最近的 `package.json` 的 `"type"`。

⚠️ **同名 JS 和 TS 文件：JS 的那个胜出。**如果 functions 目录中例如同时有 `items.js` 和 `items.ts`，部署的是 JavaScript function，TypeScript 文件被静默忽略——对 `.ts` 的编辑毫无效果。每个 function 名只保留一个文件；把 function 迁移到 TypeScript 时，删除或重命名过时的 `.js`。

## 最小 function

没有 `config` 导出。服务于 `/.netlify/functions/hello`。

```ts title="netlify/functions/hello.mts"
import type { Context } from "@netlify/functions"

export default async (req: Request, context: Context) => {
  return new Response("Hello, world!")
}
```

安装类型：`npm install @netlify/functions`（TS 类型必需；JS 可选）。

用 `Netlify.env.get()` 读取环境变量和密钥：

```ts
const apiKey = Netlify.env.get("STRIPE_SECRET_KEY")
```

绝不要硬编码密钥。要让变量在运行时存在，其作用域必须包含 **Functions**。在 `netlify.toml` 中设置的变量对 functions **不可用**。值按部署冻结——更改后需重新部署才能生效。

**响应头在代码中设置**，设在返回的 `Response` 上。`netlify.toml` 中的 `[[headers]]`、`_headers` 以及重定向头规则**仅**适用于静态 CDN 响应，不适用于 function 响应。除非明确要求，否则不要添加 CORS 请求头。

## 自定义路径路由

设置 `config.path` 可路由到自定义 URL。设置后，function **仅**在该路径提供服务——不再在 `/.netlify/functions/<name>` 提供。

```ts title="netlify/functions/travel.mts"
import type { Config, Context } from "@netlify/functions"

export default async (req: Request, context: Context) => {
  const { city, country } = context.params
  return new Response(`You're visiting ${city} in ${country}!`)
}

export const config: Config = {
  path: "/travel-guide/:city/:country",
}
```

- 多个路径：`path: ["/cats", "/dogs"]`。
- 模式：`path` 支持 [`URLPattern`](https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API) 语法——`path: ["/sale/*", "/item/:sku"]`。命名分组会落到 `context.params`。查询字符串请用 `req.url`。
- `excludedPath`：划出例外，例如 `path: "/product/*"` 配 `excludedPath: ["/product/*.css"]`。
- `preferStatic: true`：让该 URL 上真实存在的静态文件胜出。
- `method`：限制方法，例如 `method: ["GET", "POST"]`。

## Fetchable 模块形态（替代方案）

等价于裸 handler；内联携带 `config`，并允许你添加事件处理器。

```ts
import type { NetlifyFunction } from "@netlify/functions"

export default {
  fetch: (req, context) => new Response("Hello, world!"),
  config: { path: "/hello" },
} satisfies NetlifyFunction
```

## Context 对象

handler 的第二个参数（或在 handler 作用域之外时用 `@netlify/functions` 的 `getContext()`——在请求之外会抛出异常；用 try/catch 包裹）。

- `context.params`——命名路径参数。
- `context.geo`——`city`、`country.code/name`、`latitude`、`longitude`、`subdivision`、`timezone`、`postalCode`。
- `context.ip`——客户端 IP 字符串。
- `context.cookies`——`get(name)` / `set(options)` / `delete(name|options)`。跨子域 cookie 需要自定义域（`netlify.app` 在公共后缀列表上）。
- `context.site`——`id`、`name`、`url`。`context.deploy`——`context`、`id`、`published`、`skewProtectionToken`。`context.account.id`。`context.server.region`。`context.requestId`。
- `context.user`——登录到**私有**或**受团队登录保护**项目的 Netlify 用户：`id`、`email`（可能为 `undefined`）、`expiresAt`（`Date`）。见下文。
- `context.waitUntil(promise)`——在响应发出后运行工作（分析、日志）而不阻塞。计费/日志时长计算到 promise 落定。适用于 2025-03-20 及之后部署的 functions。

⚠️ `context.geo`/`context.ip` 在 `netlify dev` 下是**模拟的**——用 `netlify dev --geo=mock --country=DE` 测试。

### 是谁在调用：`context.user`

⚠️ `context.user` 经常是 `undefined`：公开项目、基础密码保护、本地 `netlify dev`，以及在 2026 年 10 月 5 日之前部署的 functions（重新部署以启用）。始终处理它；用 `id` 作为记录键（`email` 可能为 `undefined`）。

```ts title="netlify/functions/whoami.mts"
import type { Config, Context } from "@netlify/functions"

export default async (req: Request, context: Context) => {
  if (!context.user) {
    // Public project, basic password protection, local CLI, or pre-2026-10-05 deploy.
    return Response.json({ user: null }, { status: 401 })
  }
  return Response.json({
    id: context.user.id,
    email: context.user.email ?? null,
    expiresAt: context.user.expiresAt.toISOString(),
  })
}

export const config: Config = { path: "/whoami" }
```

## Config 对象

导出 `const config`（或 Fetchable 模块的 `config` 属性）：

- `path` / `excludedPath`——`string | string[]`，必须以 `/` 开头。
- `method`——一个方法或数组。
- `preferStatic`——`boolean`。
- `background`——`boolean`（见 Background）。
- `schedule`——cron 字符串（见 Scheduled）。与 `path`/`excludedPath` 互斥。
- `rateLimit`——`{ action: 'rate_limit'|'rewrite', aggregateBy: 'domain'|'ip'|[...], to?, windowSize, windowLimit }`。
- `memory` / `vcpu`——见下文；互斥。
- `region`——机场代码；见下文。

## 集成

```ts title="netlify/functions/users.mts"
import type { Config } from "@netlify/functions"
import { getDatabase } from "@netlify/database"

const db = getDatabase()

export default async (req: Request) => {
  const users = await db.sql`SELECT id, email FROM users LIMIT 10`
  return Response.json({ users })
}

export const config: Config = { path: "/users" }
```

Blobs：`import { getStore } from "@netlify/blobs"`；`getStore("uploads").set(key, await req.blob())`。

Cache：来自 `@netlify/functions` 的 `await purgeCache({ tags: ["products"] })` 会使边缘缓存失效（省略 `tags` 以清除全部）。

## 流式响应

把一个 `ReadableStream` 作为 `Response` body 返回。限制：**执行 60 秒，响应 20 MB**。

```ts
export default async (req: Request) => {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Netlify.env.get("OPENAI_API_KEY")}`,
    },
    body: JSON.stringify({ model: "gpt-4o-mini", stream: true, messages: [/* ... */] }),
  })
  return new Response(res.body, { headers: { "content-type": "text/event-stream" } })
}
```

## 后台 functions（长时间运行）

`config.background: true`。客户端立即收到 `202`；返回值被丢弃；最多运行 **15 分钟**。无流式。重试：调用出错时，1 分钟后重试，再过 2 分钟再次重试。把结果发送到客户端以外的地方。

```ts title="netlify/functions/process.mts"
import type { Config } from "@netlify/functions"

export default async (req: Request) => {
  // Long-running work. Client already has its 202.
}

export const config: Config = { background: true, path: "/process" }
```

限制：后台 payload **256 KB**。旧式的 `-background` 文件名后缀仍可用，但优先用 `config.background`。

## 定时 functions（cron）

`config.schedule` 配一个 cron 表达式，以 **UTC** 执行。请求 body 是带 `next_run`（ISO-8601）的 JSON。内联配置仅限 TS/JS——Go 必须使用 `netlify.toml`。

始终为目标本地小时计算 UTC 时间。例如美国东部 9 AM → UTC 的 `"0 13 * * *"`（注意跨夏令时会偏移一小时；选择你需要的 UTC 偏移）。优先使用显式 cron，而不是 `@daily`/`@hourly` 快捷方式，后者无法指定特定的本地小时。

```ts title="netlify/functions/daily-digest.mts"
import type { Config } from "@netlify/functions"

export default async (req: Request) => {
  const { next_run } = await req.json()
  console.log("Next invocation at:", next_run)
}

export const config: Config = {
  schedule: "0 13 * * *", // 9 AM ET (EST); UTC
}
```

通过 `netlify.toml`（所有语言）：

```toml
[functions."daily-digest"]
  schedule = "0 13 * * *"
```

约束：**30 秒限制**（更长请用后台）；只在**已发布的部署**上触发（不在 Deploy Previews/分支部署上——用 **Run now** 手动调用）；不能通过 URL 调用；无流式；无请求 payload/POST 数据；与 Split Testing 不兼容。支持所有扩展，**除了** `@reboot` 和 `@annually`。

## 平台事件 functions

导出一个默认对象，其处理器按事件命名。它们始终在后台运行——不向客户端返回响应。可在同一个 function 中与 `fetch` 组合。每个 handler 都完全类型化；从 `@netlify/functions` 导入事件类型。

```ts title="netlify/functions/on-deploy.mts"
import type { DeploySucceededEvent, DeployFailedEvent } from "@netlify/functions"

export default {
  deploySucceeded(event: DeploySucceededEvent) {
    console.log(`Deploy ${event.deploy.id} succeeded for ${event.site.name}`)
  },
  deployFailed(event: DeployFailedEvent) {
    console.log(`Deploy ${event.deploy.id} failed: ${event.deploy.errorMessage}`)
  },
}
```

**部署事件**（`event.deploy`、`event.site`；返回 `void`）：`deployBuilding`、`deploySucceeded`、`deployFailed`、`deployDeleted`、`deployLocked`、`deployUnlocked`。

**Identity 事件**（`event.user`，只有 `id` 有保证）：

| Handler | 可拒绝？ | 可修改？ |
|---|---|---|
| `userValidate` | 是 | 是 |
| `userSignup` | 是 | 是 |
| `userLogin` | 是 | 是 |
| `userModified` | 是 | 是 |
| `userDeleted` | 否 | 否 |

- 拒绝：在 handler 内调用 `event.deny()` → 最终用户收到 `401`。第一个拒绝的 function 会中止链条。
- 修改：返回 `{ user: {...} }` 以持久化更改；返回 `undefined` 以放行。

**表单事件**：`formSubmitted` → `event.data`（按字段名键控的对象）。返回 `void`。

多个 functions 可以处理同一事件（全部都会运行）。Netlify 会为每个事件签名（JWS）并在调用前验证，从而拦截外部请求。旧式的文件名约定（文件按事件命名，payload 通过 `await req.json()` → `payload`）仍可用，但优先用类型化 handler。

## 区域

⚠️ 没有说明理由时，**不要**覆盖 `config.region`；`cmh`（美国东部，俄亥俄）默认值是刻意选择的。

在有正当理由时——例如数据库位于欧盟：

```ts
export const config: Config = { path: "/eu-data", region: "dub" }
```

机场代码（自助）：`cmh`、`dub`、`fra`、`gru`、`iad`、`lhr`、`nrt`、`pdx`、`sfo`、`sin`、`syd`、`yul`。需支持协助：`cdg`、`mxp`。每个 function 恰好在一个区域内运行（没有多区域地理路由）。区域选择需要 Pro/Enterprise。框架适配器生成的 functions 不能使用 `export const config`——在 UI 的 **Cloud compute > Functions > Region** 下按项目级别设置区域。更改区域后，**重新部署**。function 级区域优先于站点级 UI 设置。

## 内存 / vCPU

⚠️ 不要投机性地设置 `config.memory` 或 `config.vcpu`——计费随规格线性增长。

在有正当理由时（例如处理大 PDF 时观察到 OOM）：

```ts
export const config: Config = { path: "/heavy", memory: "2gb" } // or memory: 2048
```

- `memory`：1024–4096 MB。`vcpu`：0.5–2.0（0.5 → 1024 MB，2.0 → 4096 MB）。互斥；Netlify 会自动调整另一个。需要基于额度的 Pro/Enterprise。通过 `netlify.toml`：`[functions.heavy]\n  memory = "2gb"`。

## 打包与磁盘上的文件

⚠️ 运行时通过 `fs.readFile` 读取的文件**不会被打包**（生产环境会 ENOENT）。把静态数据作为模块导入，或声明它：

```toml
[functions]
  included_files = ["files/*.md"]
  external_node_modules = ["package-1"]
```

⚠️ 所有 functions 的环境变量合计上限为 **~4 KB**——不要把 PEM 密钥/service-account JSON 放进环境变量。

仅 JS 的 esbuild：`[functions]\n  node_bundler = "esbuild"`。

## 限制（不可配置）

- 同步执行：**60 秒**。定时：**30 秒**。后台：**15 分钟**。
- 缓冲的请求/响应 payload：**6 MB**（二进制按 Base64 编码，约 30% 开销 → 实际二进制上限 **4.5 MB**）。
- 流式响应：**20 MB**。后台 payload：**256 KB**。

## 本地测试与部署

- 大多数框架会在其开发服务器中模拟 functions。Vite 框架（Astro、Nuxt、TanStack Start、React Router）：安装 `@netlify/vite-plugin` 并运行开发服务器。Next.js 及其他：使用 [Netlify CLI](https://docs.netlify.com/api-and-cli-guides/cli-guides/local-development/)（`netlify dev`）。
- 定时 functions 在本地不会按计划触发——用 `netlify functions:invoke <name>` 调用一次。
- 部署：推送到 Git 以持续部署，或使用 Netlify CLI/API。
- 日志和指标位于 Netlify UI 中；用 CLI 流式查看。所有已部署的 function 版本都出现在 **Functions** 标签页下；使用列表顶部的搜索框按名称筛选 functions，用单独的筛选器选择分支或输入 Deploy Preview 编号。

## Node 运行时版本

运行时遵循构建的 Node.js 版本（回退：Node.js 24）。通过 UI/CLI/API 设置环境变量 `AWS_LAMBDA_JS_RUNTIME`（例如 `nodejs24.x`）来覆盖——**不是** `netlify.toml`——然后重新部署。ES 模块：`__dirname`/`__filename` 不可用，请用 `import.meta.url`；对 CommonJS 包的具名导入会失败，请用默认导入。

## Legacy / Go（除非需要，否则避免）

Go 必须使用 [Lambda 兼容 API](https://docs.netlify.com/build/functions/lambda-compatibility/?fn-language=go)；Go 的路由/区域/内存都在 `netlify.toml` 中设置。迁移 Lambda 风格的 JS/TS 时，用 `@netlify/aws-lambda-compat` 包裹 AWS handler：

```ts
import { withLambda } from "@netlify/aws-lambda-compat"
import type { HandlerContext, HandlerEvent, HandlerResponse } from "@netlify/aws-lambda-compat"

export default withLambda(async (event: HandlerEvent, context: HandlerContext): Promise<HandlerResponse> => {
  const name = event.queryStringParameters?.name ?? "World"
  return { statusCode: 200, headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) }
})
```

<!-- Gap: docs only show the .js/.ts same-name precedence; unstated for .mjs/.mts, .cjs/.cts, or subdirectory functions. -->

<!-- system: agent-context/functions/system.md — human-owned, merged by ctx-gen; edit system.md, not this section -->
# Netlify 内部规则（functions）

这些是组织约定，而非文档事实——由 ctx-gen 合并进渲染后的技能，且从不自动生成。提取自此前手写的 netlify-functions 技能；由技能维护者负责。

1. 尽可能使用 TypeScript（`.mts`）。
2. 通过 `Netlify.env.get()` 访问环境变量（为一致性优先于 `process.env`）。
3. 除非明确要求，否则绝不添加 CORS 请求头。
4. 把密钥存放在环境变量中，绝不放在代码里。
5. `context.geo` 和 `context.ip` 在 `netlify dev` 下是模拟的——是占位值，不是真实位置或客户端 IP。不要因为本地值从不变化就断定 geo 代码坏了；用 `netlify dev --geo=mock --country=DE` 跑通各分支，并在部署上验证。
6. 不要投机性地设置 `config.memory` 或 `config.vcpu`。只为已知的内存/计算密集型工作，或观察到的由该 function 自身工作导致的 OOM/超时才提高它们——计费随规格线性增长。
7. 除非用户说明了具体理由（同址的数据库/后端、数据驻留、区域受众），否则不要覆盖 `config.region`。`cmh` 默认值是刻意选择的。
8. 运行时从磁盘读取的文件（对模板、JSON、WASM 使用 `fs.readFile`）不会被打包：在 `netlify dev` 下可用，生产环境会 ENOENT。优先把静态数据作为模块导入；否则在 `netlify.toml` 中用带作用域的 `included_files` 条目声明该文件。
9. 约 4 KB 的环境变量合计上限适用于所有 functions（它们运行在 AWS Lambda 上），不只是 Lambda 兼容模式。把大 payload（service-account JSON、PEM 密钥）排除在环境变量之外——使用打包文件、Blobs 或运行时 fetch。没有任何 Netlify 设置能提高这个上限。
10. 正文的第一个 function 示例必须是最小默认形态：完全没有 `config` 导出，并说明该 function 服务于 `/.netlify/functions/<name>`。自定义 `path` 路由只出现在后面的示例中——智能体会模仿它们看到的第一个示例。
11. 绝不要在通用示例中演示 `memory`、`vcpu` 或 `region`——只在附有明确说明的理由（观察到的 OOM、同址后端、数据驻留）时展示它们。
12. 定时 function 示例使用真实的 cron 表达式，并明确写出 UTC 换算（例如美国东部 9 AM → UTC 的 `"0 13 * * *"`，注明夏令时）——绝不只用 `@hourly`/`@daily` 快捷方式，后者无法指定特定的本地小时。
13. 正文必须说明：netlify.toml 中的 `[[headers]]`、`_headers` 以及重定向头规则**仅**适用于静态 CDN 响应——function 的响应头在代码中设在返回的 `Response` 上。
14. 当被要求构建一个执行特定工作的 function（生成报告、处理上传、发送摘要）时，要实现这项工作——在需要的地方选一个真实的库，并把操作端到端地写出来。绝不把核心任务作为 `not implemented` 桩交付在已完成的外围管道之后：一个核心分支会抛异常的 function，无论其配置和路由多么完整，都不是可用的答案。
15. `config.background: true` 是有文档记载、当前受支持的让 function 成为后台 function 的方式（`-background` 文件名后缀也仍可用）。如果本地安装的打包器不认识该标志，先怀疑版本偏差：检查并升级本地工具，并把本地兼容性发现与关于平台支持的断言区分开——绝不要仅凭较旧的已安装 schema 就从答案中移除文档推荐的标志。
16. 在私有项目或启用了团队登录保护的项目上，`context.user` 是发起请求的 Netlify 用户（`id`、`email`、`expiresAt`）。当该登录之后的某个应用需要知道是谁在调用（按人数据、审计日志、审批、按人设置）时，读取 `context.user` 而不是再加一次登录。Netlify 会在 function 运行前验证登录，因此绝不要从客户端发送的请求头或 cookie 中获取身份。每个示例都必须处理 `context.user` 为 `undefined` 的情况：公开项目、基础密码保护、`netlify dev`，以及在 2026 年 10 月 5 日之前部署的 functions 直到站点重新部署为止。`email` 也可能为 `undefined`，因此存储的记录要用 `id` 作为键。这是 Netlify 账户，不是 Netlify Identity 用户；要用 Identity，请用 `@netlify/identity` 的 `getUser()`。
