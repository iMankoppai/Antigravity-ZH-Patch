---
name: netlify-edge-functions
description: 编写、路由、缓存和调试 Netlify Edge Functions——位于 netlify/edge-functions 中、基于 Deno 的 TypeScript 或 JavaScript 处理器，运行在静态文件和无服务器函数之前的网络边缘。只要有人想添加 auth 中间件或登录关卡、按国家或 cookie 重定向或重写访客、用地理位置本地化或个性化页面、运行 A/B 测试、转换或向响应注入 HTML、在边缘流式服务端渲染，或缓存边缘响应时，就启用本技能。当某个 edge function 静默地什么都不做、以错误的顺序运行、忽略其 Cache-Control 响应头，或无法读取环境变量时，也使用它。
---

# Netlify Edge Functions

## 使用这种形式

```ts
// netlify/edge-functions/hello.ts
import type { Config, Context } from "@netlify/edge-functions";

export default async (request: Request, context: Context) => {
  return new Response(`Hello from ${context.geo.country?.name ?? "somewhere"}`);
};

export const config: Config = { path: "/hello" };
```

- 一个文件 = 一个 function：一个默认导出的 handler，外加一个带路由的 `config` 导出。或者，在 `netlify.toml` 中声明路由。
- `Request` 和 `Response` 是全局的。从 `@netlify/edge-functions` 导入 `Context` 和 `Config` 类型。
- 用 `Netlify.env.get()` 读取环境变量。`process.env` 仅对 Next.js middleware 有效。

**避免这些：**
- 文件既没有 `config.path` 或 `pattern`，也没有 `[[edge_functions]]` 条目。它会部署但永不运行。
- `deno.json` 中的 import maps。它们不受支持。请改用单独的文件配 `[functions] deno_import_map`。
- 在 `netlify.toml` 中设置的变量。它们对 edge functions 不可见。
- 用 `Netlify.env.set()` 或 `Netlify.env.delete()` 做持久化。它们只影响当前调用。
- 对同一站点的当前路径使用 `fetch()`。改为使用 `context.next()`。

## ⚠️ 陷阱

- **没有路由 = 静默空操作。**Edge functions 不会获得自动 URL。
- **`path: "/*"` 会在每个请求上运行**，包括资源。请缩小范围，或添加 `excludedPath`。
- **缓存需要两部分同时具备：**配置中的 `cache: "manual"` **和**返回 `Response` 上的缓存响应头。只有其中一个时，什么都不会被缓存。
- **带缓存的 function 会遮蔽静态文件。**`/*` 上的缓存 function 会提供 `/cat.png` 而不是该文件本身。
- **返回 `Response` 会结束链条。**该路径的重定向规则永不运行。
- **同站点的 `fetch()` 和 `URL` 重写会开启新的请求链。**匹配的 edge functions 会再次运行。用 `context.next()` 到达同一路径的静态资源或无服务器函数。
- **请求 body 只能读取一次。**在 `await req.json()` 之后，把 `new Request(req, { body })` 传给 `context.next()`。
- **同名 `foo.ts` 和 `foo.js`：**TS 文件会被忽略，JS 文件会部署。
- **每个请求 50 ms CPU**，包括 `waitUntil` 的工作。
- 启用了 Split Testing 的站点上**不会执行**。
- **自定义 Headers 和 basic-auth 请求头不适用于** edge functions。
- 在符合 HIPAA 的托管上**不受支持**。
- **`netlify.app` 在公共后缀列表上。**跨子域 cookie 需要自定义域。

## 文件

| 内容 | 位置 |
|---|---|
| Functions | `<base>/netlify/edge-functions/*.{js,ts,jsx,tsx}` |
| 自定义目录 | `[build] edge_functions = "my-dir"`（相对于基础目录；保持在发布目录之外） |
| toml 中的名称 | 不含扩展名的文件名（`auth.ts` → `function = "auth"`） |
| Import map | 任意 JSON 文件，由 `[functions] deno_import_map = "./import_map.json"` 引用 |

## 返回值

| 返回值 | 效果 |
|---|---|
| `Response` | 发送给客户端；链条结束 |
| `URL` | 同站点重写，200，地址栏不变 |
| `undefined` / `return;` | 跳过此 function；链条继续 |

### Endpoint
```ts
export default async () =>
  new Response("Hello, World!", { headers: { "content-type": "text/html" } });
export const config = { path: "/api/hello" };
```

### 重定向 / 重写
```ts
import type { Context } from "@netlify/edge-functions";

export default async (req: Request, { cookies, geo }: Context) => {
  if (geo.city === "Paris" && cookies.get("promo-code") === "15-for-followers") {
    return Response.redirect(new URL("/subscriber-sale", req.url)); // redirect
    // or: return new URL("/subscriber-sale", req.url);             // rewrite (same-site only)
  }
};
export const config = { path: "/sale" };
```
重写必须指向同一站点。要到达其他站点，请使用 `fetch`。

### Middleware（修改源响应）
```ts
import type { Context } from "@netlify/edge-functions";

export default async (request: Request, context: Context) => {
  if (new URL(request.url).searchParams.get("method") !== "transform") return;
  const response = await context.next();
  return new Response((await response.text()).toUpperCase(), response);
};
export const config = { path: "/blog/*" };
```
只有在你需要响应 body 时才调用 `context.next()`。如果你只是返回 `undefined`，链条会自行继续。

### 条件请求
```ts
export default async (req: Request, { next }: Context) => {
  const res = await next({ sendConditionalRequest: true });
  if (res.status === 304) return res;
  return new Response((await res.text()).toUpperCase(), res);
};
```
默认情况下，`next()` 会剥除条件请求头，因此它总是返回完整响应。

### 读取 body，然后继续
```ts
export default async (req: Request, context: Context) => {
  const body = await req.json();
  if (!isValid(body.access_token)) return new Response("forbidden", { status: 403 });
  return context.next(new Request(req, { body: JSON.stringify(body) }));
};
```

### Netlify 用户关卡（私有 / 受团队登录保护的项目）
```ts
import type { Config, Context } from "@netlify/edge-functions";

export default async (req: Request, context: Context) => {
  const user = context.user; // undefined: public project, password protection, netlify dev
  if (!user) return new Response("Forbidden", { status: 403 });
  const allowed = (Netlify.env.get("ADMIN_USER_IDS") ?? "").split(",");
  if (!allowed.includes(user.id)) return new Response("Forbidden", { status: 403 });
  // user.email may be undefined, so use it for display only
};
export const config: Config = { path: "/admin/*" };
```

### 响应后工作
```ts
export default async (req: Request, context: Context) => {
  context.waitUntil(fetch("https://analytics.example.com/event", { method: "POST" }));
  return new Response("ok");
};
```
`waitUntil` 不会阻塞响应，但它仍会计入 50 ms CPU 限制。

### 流式 SSR（`.tsx`）
```tsx
import React from "https://esm.sh/react";
import { renderToReadableStream } from "https://esm.sh/react-dom/server";
import type { Config, Context } from "@netlify/edge-functions";

export default async (req: Request, context: Context) => {
  const stream = await renderToReadableStream(
    <html><body><h1>Hello {context.geo.country?.name}</h1></body></html>
  );
  return new Response(stream, { headers: { "Content-Type": "text/html" } });
};
export const config: Config = { path: "/hello" };
```

## `Context`

| 属性 | 说明 |
|---|---|
| `cookies.get(name)` / `.set(options)` / `.delete(name \| options)` | `set` 和 `delete` 使用 `CookieStore` 选项格式；它们作用于出站响应 |
| `geo` | `city`、`country.{code,name}`、`subdivision.{code,name}`、`latitude`、`longitude`、`timezone`、`postalCode`（格式各异） |
| `ip` | 客户端 IP |
| `next(options?)` / `next(request, options?)` | 链条中下一项的 `Promise<Response>` |
| `params` | 来自 `path` 的 URLPattern 命名分组（`/pets/:name` → `{ name }`）。查询字符串请用 `request.url` |
| `user` | `{ id, email?, expiresAt }` 或 `undefined`。它是 Netlify 账户，不是 Netlify Identity；要用 Identity，请用 `@netlify/identity` 的 `getUser()` |
| `waitUntil(promise)` | 在响应发出后运行 |
| `requestId`, `account.id`, `server.region` | — |
| `site` | `{ id, name, url }` |
| `deploy` | `{ context, id, published, skewProtectionToken }` |

Netlify 不会向请求添加任何客户端信息请求头。请改为从 `context` 读取客户端信息。

`Netlify.context` 给出相同的对象，但仅在 handler 内部。在它之外，它是 `null`。

`Netlify.env`：`get(name)`、`has(name)`、`toObject()`，以及调用作用域的 `set` 和 `delete`。要持久更改变量，请使用 [env API](https://open-api.netlify.com/#tag/environmentVariables)。

Web API：
- `console`, `atob`, `btoa`
- `fetch`, `Request`, `Response`, `URL`, `File`, `Blob`
- `TextEncoder`/`TextDecoder` (and their Stream variants), `Performance`
- Web Crypto: `randomUUID`, `getRandomValues`, `SubtleCrypto`
- WebSocket
- `setTimeout`, `clearTimeout`, `setInterval`
- Streams: `ReadableStream`, `WritableStream`, `TransformStream`
- URLPattern

模块：
- Node 内置模块：使用 `node:` 前缀（`import { randomBytes } from "node:crypto"`）。
- Deno 模块：按 URL 导入，或通过 import map 导入。
- npm 包（beta）：按名称导入。带原生二进制或运行时动态导入的包可能无法工作。

## 声明

### 内联 `config`
| 键 | 值 |
|---|---|
| `path` | URLPattern 字符串或数组；必须以 `/` 开头 |
| `excludedPath` | URLPattern 字符串或数组；必须以 `/` 开头 |
| `pattern` / `excludedPattern` | 作为 `path` / `excludedPath` 替代方案的正则 |
| `method` | HTTP 方法字符串或数组 |
| `header` | `{ name: true \| false \| "regex" }`；名称不区分大小写；多值请求头匹配逗号拼接后的列表 |
| `onError` | `"fail"`（默认）、`"/custom-path"` 或 `"bypass"` |
| `cache` | `"manual"` |

```ts
export const config: Config = {
  path: "/*",
  excludedPath: ["/*.css", "/*.js", "/img/*"],
  header: { "user-agent": "(iPhone|Android)" },
};
```
`netlify-agent-category` 请求头会把任意 user-agent 映射到一个[客户端类别](https://docs.netlify.com/build/user-agent-categories)。

### `netlify.toml`
toml 形式支持 `function`、`path`、`excludedPath`、`pattern`、`excludedPattern`、`[edge_functions.header]` 和 `cache`。`onError` 需内联设置。当你需要对同一路径上的多个 function 显式排序时，使用 toml。

```toml
[[edge_functions]]
  path = "/admin"
  function = "auth"

[[edge_functions]]
  path = "/admin"
  function = "injector"
  cache = "manual"

[[edge_functions]]
  pattern = "/products/(.*)"
  excludedPattern = "/products/things/(.*)"
  function = "highlight"

[[edge_functions]]
  path = "/*"
  excludedPath = "/img/*"
  function = "common"
  [edge_functions.header]
  x-required = true
  x-forbidden = false
```
对 `/admin` 的请求会依次运行 `auth`、`common`、`injector`。

### 顺序
Netlify 会针对请求路径按以下顺序遍历**两遍**。第一遍只运行未配置缓存的 function。第二遍只运行带缓存的 function。

1. 在配置文件中声明的、由框架生成的 functions。
2. 你的 `netlify.toml` 声明，自上而下。
3. 由框架和集成生成的内联声明。
4. 你的内联声明，按文件名首字母排序。

如果同一个 function 同时在 toml 和内联中声明，配置会被合并并视作第 4 步；重复字段以内联为准。

在 edge functions 之后，重定向规则会运行，除非某个 function 已经返回了 `Response`。重定向到新路径会对该路径重复整个流程。

声明在静态重写*目标*上的 edge function，不会为被重写的请求运行。

## 响应缓存
```ts
import type { Config } from "@netlify/edge-functions";

export default async () =>
  new Response("Hello world", { headers: { "cache-control": "public, s-maxage=3600" } });

export const config: Config = { path: "/hello", cache: "manual" };
```
- 响应头必须在 function 代码中设置。支持的响应头：
  - `Cache-Control`, `CDN-Cache-Control`, `Netlify-CDN-Cache-Control`
  - `Expires` (overridden by `max-age`/`s-maxage`)
  - `Vary`, `Netlify-Vary`
- 见[缓存概览](https://docs.netlify.com/build/caching/caching-overview)。
- 同一部署上下文中的新部署会使缓存的响应失效。
- 缓存命中会跳过调用，且不计入调用限额。
- **缓存**可复用的 endpoint 输出，例如 SSR。
- **不要缓存**路由或个性化中间件，例如基于 cookie 的产品排序。
- 本地开发没有缓存。缓存响应头在本地会被忽略。

## 错误处理（`onError`）
| 值 | 效果 |
|---|---|
| `"fail"`（默认） | 链条停止；显示通用错误页 |
| `"/unavailable"` | 重写到同站点的该路径；其上的 edge functions 不会被调用 |
| `"bypass"` | 跳过失败的 function；链条继续 |

关键逻辑要 fail closed（失败即关闭）：内部 auth 使用默认值，面向客户的 auth 使用自定义路径。锦上添花的功能（如本地化）则 fail open（`bypass`）。

## 环境变量
- 变量必须具有 **Functions** 作用域。
- **Build** 作用域的变量仅在构建时存在；如有需要，在构建期间嵌入它们的值。
- 更改变量需要一次新的部署。
- 部署信息（site、region、deploy id）来自 `context`，而不是环境变量。

## 本地开发 / 部署 / 日志
- 运行 `npm install netlify-cli -g`，然后 `netlify dev`。访问 `http://localhost:8888/<path>`。
  - 更改会在下一次请求时生效。
  - 用 `--edge-inspect` 或 `--edge-inspect-brk` 调试。
  - 用 `--geo=mock`（旧金山）或 `--geo=mock --country=DE` 模拟位置。
  - 本地 `context.user` 为 undefined。
- 手动部署需要 CLI **≥ 12.2.8**。部署是原子的，Deploy Previews 和回滚都包含 edge functions。
- 日志：在 Netlify UI 中，前往 **Cloud compute > Edge functions**（`https://app.netlify.com/projects/{site_name}/edge-functions`）。
  - 对于较早的部署：**Deploys** → 打开该部署 → **Edge Functions**。
  - `console.log` 输出会带上 function 名称标记。
  - 保留期 ≥ 24 小时（部分套餐 7 天）。
  - [Log Drains](https://docs.netlify.com/manage/monitoring/log-drains) 在 Enterprise 套餐上可用。

## 限制
| 限制 | 值 |
|---|---|
| 打包大小 | 20 MB（压缩后） |
| 内存（每组已部署的 functions） | 512 MB |
| 每个请求的 CPU 时间 | 50 ms（不含 I/O 等待） |
| 响应头超时 | 40 s |

- 预渲染不适用于由 edge function 提供的路径。
- 多个生成 edge functions 的框架插件可能相互冲突。

文档：[API](https://docs.netlify.com/build/edge-functions/api.md) · [声明](https://docs.netlify.com/build/edge-functions/declarations.md) · [可选配置](https://docs.netlify.com/build/edge-functions/optional-configuration.md) · [限制](https://docs.netlify.com/build/edge-functions/limits.md) · [示例](https://edge-functions-examples.netlify.app/)

<!-- Gaps: no legacy/deprecated handler form is documented; whether `method` works in netlify.toml is unstated. -->
<!-- Undocumented: context.params with regex `pattern` declarations; monthly invocation limits per plan. -->

<!-- system: agent-context/edge-functions/system.md — human-owned, merged by ctx-gen; edit system.md, not this section -->
# Netlify 内部规则（edge-functions）

这些是组织约定和实战中总结的护栏，而非文档事实——由 ctx-gen 合并进渲染后的技能，且从不自动生成。提取自此前手写的 netlify-edge-functions 技能；由技能维护者负责。

1. 先检查框架的 adapter/reference：重复 adapter 生成的中间件的自定义 edge function 会造成冲突。只有当框架还没有为这项任务生成 edge function 时，才手工编写。
2. 把 `path` 限定得很窄。`path: "/*"` 会拦截每个请求——包括静态资源——为每个请求增加延迟，并为此计一次边缘调用。
3. 没有路由（没有 config 导出，也没有 netlify.toml 声明）的 edge function 仍会部署，但静默地永不运行：没有构建错误，也没有警告。当出现"我的 edge function 什么都不做"时，先检查路由。
4. 按工作负载形态选择 edge 还是 serverless：边缘函数用于低延迟的请求/响应操作、地理位置逻辑、auth 检查/重定向和 A/B 个性化；无服务器函数用于长时间运行的工作（最多 15 分钟）、重度 Node.js 依赖、数据库密集操作、后台/定时任务，或内存需求超过 512 MB 的情况。
5. 如果没有配置中的 `cache: "manual"`，边缘响应上的缓存响应头毫无作用——两者要么都有，要么都没有。除非 function 也主动选择，否则在返回的 `Response` 上设置 `Cache-Control` 没有效果。
6. 解释声明处理顺序时，要说明两遍循环，而不只是排序：Netlify 会把整个声明顺序跑**两遍**——第一遍只运行未配置缓存的 edge functions，第二遍运行配置了缓存的那些。"非缓存在缓存之前"如果没有循环框架，就是不完整的回答。
7. 在私有项目或启用了团队登录保护的项目上，`context.user` 是发起请求的 Netlify 用户（`id`、`email`、`expiresAt`）。用它做按人检查和个性化，而不是再加一次登录；绝不要从客户端发送的请求头或 cookie 中获取身份：Netlify 会在 edge function 运行前验证登录。每个示例都必须处理 `context.user` 为 `undefined` 的情况（公开项目、基础密码保护、`netlify dev`），且 `email` 也可能为 `undefined`，因此关键决策要基于 `id`。这是 Netlify 账户，不是 Netlify Identity 用户。
