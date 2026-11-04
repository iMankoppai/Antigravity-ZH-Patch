---
name: routing-middleware
description: Vercel Routing Middleware 指南——在缓存之前进行请求拦截、重写、重定向、个性化。适用于任何框架。支持 Edge、Node.js 和 Bun 运行时。在平台层面拦截请求时使用。
metadata:
  priority: 6
  docs:
    - "https://nextjs.org/docs/app/api-reference/file-conventions/proxy"
    - "https://vercel.com/docs/routing-middleware"
  sitemap: "https://nextjs.org/sitemap.xml"
  pathPatterns: 
    - 'middleware.ts'
    - 'middleware.js'
    - 'middleware.mts'
    - 'middleware.mjs'
    - 'proxy.ts'
    - 'proxy.js'
    - 'proxy.mts'
    - 'proxy.mjs'
    - 'src/middleware.ts'
    - 'src/middleware.js'
    - 'src/middleware.mts'
    - 'src/middleware.mjs'
    - 'src/proxy.ts'
    - 'src/proxy.js'
    - 'src/proxy.mts'
    - 'src/proxy.mjs'
    - 'vercel.json'
    - 'apps/*/vercel.json'
    - 'vercel.ts'
    - 'vercel.mts'
  bashPatterns:
    - '\bnpx\s+@vercel/config\b'
validate:
  -
    pattern: 'NextResponse.*from\s+[''"]next/server[''"]|from\s+[''"]next/server[''"].*NextResponse'
    message: 'Next.js middleware.ts is renamed to proxy.ts in Next.js 16 — rename the file and use the Node.js runtime. See the proxy file convention in the bundled docs at node_modules/next/dist/docs/.'
    severity: recommended
    skipIfFileContains: 'proxy\.ts|runtime.*nodejs'
retrieval:
  aliases:
    - request interceptor
    - middleware
    - rewrite rules
    - redirect rules
  intents:
    - intercept requests
    - add middleware
    - configure rewrites
    - set up redirects
  entities:
    - middleware
    - rewrite
    - redirect
    - personalization
    - Edge
chainTo:
  -
    pattern: 'from\s+[''""]next-auth[''""]'
    targetSkill: auth
    message: 'Auth logic in middleware — loading Auth guidance for Clerk/Auth0 integration patterns.'
  -
    pattern: 'from\s+[''""](jsonwebtoken)[''""]|jwt\.(verify|decode)\('
    targetSkill: auth
    message: 'Manual JWT verification in middleware — loading Auth guidance for managed auth middleware patterns (Clerk, Descope).'
    skipIfFileContains: 'clerkMiddleware|@clerk/|@auth0/'

---

# Vercel Routing Middleware

你是 Vercel Routing Middleware 专家——平台级请求拦截层。

## 它是什么

Routing Middleware 在每个匹配其配置的请求上、**在缓存之前**运行。它是一个 **Vercel 平台**功能（并非特定于某个框架），适用于 Next.js、SvelteKit、Astro、Nuxt 或任何已部署的框架。构建于 Fluid Compute 之上。

- **首选平台配置**：在 `vercel.json` 中设置 `proxy.entrypoint`。入口点可以使用任何受支持的文件名或目录，并运行在 Node.js 上。自行构建路由中间件的框架（Next.js、Astro）不使用 `proxy` 属性；改用框架的文件约定。
- **文件约定**：项目根目录下的 `middleware.ts` 或 `middleware.js`。该约定默认使用 Edge；设置 `runtime: 'nodejs'` 以使用 Node.js。
- **Next.js 16**：使用 `proxy.ts` 并导出 `proxy`。Next.js Proxy 仅在 Node.js 上运行。

## 关键：中间件消歧

Vercel 生态中有三个“中间件”概念：

| 概念 | 文件 | 运行时 | 范围 | 何时使用 |
|---------|------|---------|-------|-------------|
| **Vercel Routing Middleware** | `proxy.entrypoint` 或 `middleware.ts` | Node/Edge/Bun | 任何框架，平台级 | 缓存之前的请求拦截：重写、重定向、geo、A/B |
| **Next.js 16 Proxy** | `proxy.ts`（根目录，或使用 `--src-dir` 时的 `src/proxy.ts`） | 仅 Node.js | 仅 Next.js 16+ | 需要完整 Node API 的网络边界代理。不用于 auth。 |
| **Vercel Functions** | 路由或函数文件 | Node/Bun/Python/Rust | 通用 | 请求处理器和后端计算，不是拦截层 |

**为什么在 Next.js 16 中改名**（`middleware.ts` → `proxy.ts`）：“middleware”常常与 Express.js 中间件混淆，并且 Next.js 只建议在万不得已时使用该功能，同时它在构建更好的 API；“proxy”说明了它是什么——应用前面的网络边界。导出的函数也必须从 `middleware` 重命名为 `proxy`。迁移 codemod：`npx @next/codemod@latest middleware-to-proxy .`

**弃用**：Next.js 16 仍接受 `middleware.ts`，但将其视为已弃用并记录警告。它将在未来版本中移除。

## Bun 运行时

要在 Bun 上运行 Routing Middleware（以及所有 Vercel Functions），在 `vercel.json` 中添加 `bunVersion`：

```json filename="vercel.json"
{
  "bunVersion": "1.x"
}
```

将中间件运行时设为 `nodejs`——Bun 会透明地替换 Node.js 运行时：

```ts
export const config = {
  runtime: 'nodejs', // Bun swaps in when bunVersion is set
};
```

Bun 在 CPU 密集型工作负载中平均减少约 28% 的延迟。目前处于公开测试——支持 Next.js、Express、Hono 和 Nitro。

## 基本示例

为与框架无关的 Routing Middleware 配置一个显式入口点：

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "proxy": {
    "entrypoint": "proxy.ts",
    "matcher": ["/((?!_next/static|favicon.ico).*)"]
  }
}
```

```ts
// proxy.ts
import { geolocation, rewrite } from '@vercel/functions';

export default function proxy(request: Request) {
  const { country } = geolocation(request);
  const url = new URL(request.url);
  url.pathname = country === 'US' ? '/us' + url.pathname : '/intl' + url.pathname;
  return rewrite(url);
}
```

## 辅助方法（`@vercel/functions`）

对于非 Next.js 框架，从 `@vercel/functions` 导入：

| 辅助函数 | 用途 |
|--------|---------|
| `next()` | 继续中间件链（可选修改响应头） |
| `rewrite(url)` | 透明地从不同 URL 提供内容 |
| `geolocation(request)` | 获取 `city`、`country`、`latitude`、`longitude`、`region` |
| `ipAddress(request)` | 获取客户端 IP 地址 |
| `waitUntil(promise)` | 在响应发送后保持函数运行 |

对于 Next.js，`NextResponse` 提供 `next()`、`rewrite()` 和 `redirect()`。使用 `@vercel/functions` 的 `geolocation(request)` 和 `ipAddress(request)`；`NextRequest.geo` 和 `NextRequest.ip` 已在 Next.js 15 中移除。

## Matcher 配置

默认情况下中间件在**每个路由**上运行。使用 `config.matcher` 限定其范围：

```ts
// Single path
export const config = { matcher: '/dashboard/:path*' };

// Multiple paths
export const config = { matcher: ['/dashboard/:path*', '/api/:path*'] };

// Regex: exclude static files
export const config = {
  matcher: ['/((?!_next/static|favicon.ico).*)'],
};
```

**提示**：推荐使用 `matcher`——未匹配的路径会完全跳过中间件调用（节省计算）。

## 常见模式

### 基于 IP 的请求头注入

```ts
import { ipAddress, next } from '@vercel/functions';

export default function middleware(request: Request) {
  return next({ headers: { 'x-real-ip': ipAddress(request) || 'unknown' } });
}
```

### 通过 Global Config 进行 A/B 测试

```ts
import { get } from '@vercel/global-config';
import { rewrite } from '@vercel/functions';

export default async function middleware(request: Request) {
  const variant = await get('experiment-homepage'); // <1ms read
  const url = new URL(request.url);
  url.pathname = variant === 'B' ? '/home-b' : '/home-a';
  return rewrite(url);
}
```

### 后台处理

```ts
import { waitUntil } from '@vercel/functions';

export default function middleware(request: Request) {
  waitUntil(
    fetch('https://analytics.example.com/log', { method: 'POST', body: request.url })
  );
  return new Response('OK');
}
```

## 请求限制

| 限制 | 值 |
|-------|-------|
| 最大 URL 长度 | 14 KB |
| 最大请求体 | 4 MB |
| 最大请求头 | 64 个请求头 / 总计 16 KB |

## 三种 CDN 路由机制

Vercel 的 CDN 支持三种路由机制，按以下顺序评估：

| 顺序 | 机制 | 范围 | 是否需要部署 | 如何配置 |
|-------|-----------|-------|-----------------|------------------|
| 1 | **Bulk Redirects** | 最多 100 万条静态 path→path 重定向 | 否（通过 Dashboard/API/CLI 在运行时） | Dashboard、CSV 上传、REST API |
| 2 | **项目级路由** | 响应头、重写、重定向 | 否（即时发布） | Dashboard、REST API、`vercel routes` CLI |
| 3 | **部署配置路由** | 完整路由规则 | 是（部署） | `vercel.json`、`vercel.ts`、`next.config.ts` |

**项目级路由**（2026 年 3 月添加）让你无需触发新部署即可更新路由规则——响应头、对外部 API 的重写。它们在批量重定向之后、部署配置路由之前运行。所有计划均可用。

### 项目级路由 — 配置方法

项目级路由即时生效（无需部署）。有三种管理方式：

| 方法 | 如何 |
|--------|-----|
| **Dashboard** | 项目 → CDN → Routing 标签页。在一个视图中查看全球流量的实时地图、缓存管理和路由编辑器。 |
| **REST API** | `GET/POST/PATCH/DELETE /v1/projects/{projectId}/routes` —— 8 个用于项目路由 CRUD 的专用端点。 |
| **Vercel CLI** | 使用 `vercel routes` 暂存、检查、发布、恢复和导出项目级规则。 |

`vercel.json`、`vercel.ts` 或框架配置中的部署级路由是另一种独立机制（上表第 3 行），需要部署。

对于不应要求完整重新部署的运维变更（CORS 响应头、API 代理重写、A/B 重定向），使用项目级路由。

## 使用 `vercel.ts` 进行编程式配置

除了静态的 `vercel.json`，你还可以使用 `vercel.ts`（或 `.js`、`.mjs`、`.cjs`、`.mts`）搭配 `@vercel/config` 包，进行类型安全、动态的路由配置：

```ts
// vercel.ts
import { routes, type VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  rewrites: [
    routes.rewrite('/api/(.*)', 'https://backend.example.com/$1'),
  ],
  headers: [
    routes.header('/(.*)', [{ key: 'X-Frame-Options', value: 'DENY' }]),
  ],
};
```

对于无需部署即可生效的项目级规则，使用 `vercel routes add`，用 `vercel routes list --diff` 检查已暂存的更改，然后运行 `vercel routes publish`。

**约束**：每个项目只能有一个配置文件——`vercel.json` 或 `vercel.ts`，不能两者都有。

## 何时使用

- 静态页面的地理位置个性化（在缓存之前运行）
- 使用 Global Config 的 A/B 测试重写
- 基于请求属性的自定义重定向
- 请求头注入（CSP、CORS、自定义响应头）
- 轻量级 auth 检查（仅纵深防御——不是唯一的认证层）
- 无需重新部署即可为响应头/重写使用项目级路由

## 何时不应使用

- 在 Next.js 中需要完整的 Node.js API → 使用 `proxy.ts`
- 通用计算或请求处理 → 在默认 Node.js 运行时上使用 Vercel Functions
- 繁重的业务逻辑或数据库查询 → 使用服务端框架功能
- 以 auth 作为唯一保护 → 使用 Layouts、Server Components 或 Route Handlers
- 数千条静态重定向 → 使用 Bulk Redirects（每个项目最多 100 万条）

## 参考资料

- 📖 文档：https://vercel.com/docs/routing-middleware
- 📖 API 参考：https://vercel.com/docs/routing-middleware/api
- 📖 入门：https://vercel.com/docs/routing-middleware/getting-started
