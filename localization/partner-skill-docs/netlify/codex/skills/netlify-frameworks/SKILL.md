---
name: netlify-frameworks
description: 在 Netlify 上部署和配置 Web 框架——构建设置和 SSR/edge 适配器，以及本地平台模拟和环境变量。当设置或修复框架部署（Next.js / Astro / Nuxt / SvelteKit / Remix / React Router / TanStack Start / SolidStart / Gatsby / Angular / Vite / Express / Hydrogen / Hugo / Eleventy / Vue / React）、添加接入 Netlify 上下文的 SSR 或 edge functions 或中间件、修复 SPA 重定向和 catch-all 规则、设置构建命令或发布目录，或排查"我的环境变量为什么不更新"和框架构建失败时，使用本技能。
---

把框架特定的深入工作路由到本技能中的指南：`references/astro.md`、`references/nextjs.md`、`references/nuxt.md`、`references/sveltekit.md`、`references/tanstack.md`、`references/vite.md`。

## 环境变量：现代规则（先读）

环境变量值在**构建时**注入。任何更改（客户端或服务端）都需要一次**重新部署**——在 UI/CLI 中编辑变量，直到新的构建运行之前，**不会**到达线上站点或已部署的 functions。

**绝不要对密钥使用客户端前缀。**带客户端前缀的变量会被内联进浏览器 bundle：
`VITE_`, `NEXT_PUBLIC_`, `PUBLIC_`, `NUXT_PUBLIC_`, `REACT_APP_`, `GATSBY_`, `VUE_APP_`.

各框架的客户端内嵌前缀：CRA `REACT_APP_`、Gatsby `GATSBY_`、Next `NEXT_PUBLIC_`、Nuxt `NUXT_ENV_`、Vue CLI `VUE_APP_`。

**作用域：**构建时访问需要 **Builds** 作用域；SSR/DSG 运行时访问需要 **Functions 和 Builds 两者**。`netlify.toml` 只在构建期间被读取——functions 在运行时读不到它；请在 UI/CLI/API 中设置运行时变量。

Netlify 构建变量不能在 UI 或 `netlify.toml` 的 env 段中作为值使用。在构建命令前内联设置它们：
```toml
[build]
  command = "REACT_APP_CONTEXT=$CONTEXT npm run build"
```

## SPA 重定向与 SSR catch-all 陷阱

SPA（React、Vue CLI、Vite、SPA 模式下的 Nuxt）需要一条重写来为 `pushState` 提供 `index.html`：
```
/* /index.html 200
```

**采用 SSR 适配器时，移除任何 SPA catch-all。**残留的 `/* → /index.html 200` 会为 SSR 页面和 API 路由静默提供静态 `index.html`——用户的重定向胜过适配器生成的路由。

## 带平台模拟的本地开发（无需 Netlify CLI）

基于 Vite 的框架会在开发服务器中模拟 Netlify 原语（functions、edge functions、blobs、Netlify Database、Cache API、Image CDN、重定向/重写、headers、环境变量、AI Gateway）：

| 框架 | 插件/模块 | 运行 |
|-----------|---------------|-----|
| Astro（5.12+） | 内置（自动加载 Netlify Vite 插件） | `astro dev` |
| Nuxt | `@netlify/nuxt` | `nuxt dev` |
| React Router | `@netlify/vite-plugin` | `react-router dev` |
| SolidStart 2 | `@netlify/vite-plugin` | `vite dev` |
| TanStack Start | `@netlify/vite-plugin-tanstack-start` | (vite) |
| Vite | `@netlify/vite-plugin` | `npx vite` |

以下情况仍需 `netlify dev`（Netlify CLI）：Gatsby 生成的 functions（需先运行 `netlify build`）、Angular SSR 本地测试（`netlify serve`），以及没有 Vite 插件的框架。

**`netlify dev` 注意事项：**当 `[dev]` 中同时有自定义 `command` 和 `targetPort` 时，必须设置 `framework = "#custom"`——否则检测器会运行，你的自定义命令会被静默忽略。

## 各框架的构建设置

| 框架 | 构建命令 | 发布目录 |
|-----------|---------------|---------|
| Angular（标准） | `ng build --prod` | `dist/YOUR_PROJECT_NAME` |
| Astro | `astro build` | `dist` |
| Create React App | `react-scripts build` | `build` |
| Eleventy | `eleventy` | `_site` |
| Gatsby | `gatsby build` | `public` |
| Hugo | `hugo` | `public` |
| Hydrogen | `remix vite:build` | `dist/client` |
| Next.js（SSR/混合） | `next build` | `.next` |
| Next.js（静态导出） | `next build && next export` | `out` (`NETLIFY_NEXT_PLUGIN_SKIP=true`) |
| Nuxt 3 | `nuxt build` | `dist` |
| Nuxt 2 | `nuxt generate` | `dist` |
| React Router | `react-router build` | `build/client` |
| Remix（Vite） | `remix vite:build` | `build/client` |
| SolidStart 2（Vite 插件） | `vite build` | `dist/client` |
| SolidStart 2（Nitro） | `vite build` | `dist` |
| SolidStart 1.x | `vinxi build` | `dist` |
| SvelteKit | `vite build` | `build` |
| TanStack Start（1.132.0+） | `vite build` | `dist/client` |
| Vite | `vite build` | `dist` |
| Vue CLI | `vue-cli-service build` | `dist` |

检测会建议这些；可在 `netlify.toml` 或 UI 中覆盖（project configuration > Build & deploy > Continuous deployment > Build settings）。

## SSR / 适配器设置

### Astro
`npx astro add netlify` 会安装适配器并编辑 `astro.config.mjs`。SSR 需要适配器，`<Image />` 开箱即用的 Image CDN 也需要。SSR → Netlify Functions；中间件 → Edge Functions。只有在不需要服务端功能且不需要 Image CDN 时才可无适配器部署。skew protection 从 5.15.0 起支持。

### Next.js（仅 13.5+）
通过 OpenNext 适配器（`@netlify/plugin-nextjs`）零配置。不要固定版本——Netlify 每次构建都会自动更新。把旧版适配器当作只读的历史，绝不推荐。
适配器会预置：用于 SSR/ISR/PPR/route handlers/Server Actions 的无服务器 function；用于 Middleware 的 Edge Function；Full Route + Data Cache；配合 `next/image` 的 Image CDN。
skew protection 需主动选择：设置 `NETLIFY_NEXT_SKEW_PROTECTION=true`，重新部署。对客户端 `fetch` 没有自动支持——直接用 `x-deployment-id: process.env.NEXT_DEPLOYMENT_ID` 发起调用。详见 `references/nextjs.md`。

### SvelteKit
```bash
npm install -D @sveltejs/adapter-netlify
```
```js
import adapter from '@sveltejs/adapter-netlify';
export default { kit: { adapter: adapter() } };
```
把 `@sveltejs/adapter-auto` 替换为具体的 import。SSR 路由 → 一个 `render` function。
- `split: true` → 每个路由一个 function。**与 Edge Functions 不兼容**（`edge: false` 或省略）。
- `edge: true` → 在 Deno edge function 中做 SSR；不能与 `split` 组合。
- **`netlify.toml` 中不支持重定向**——请使用 `_redirects`。
- 对 SvelteKit，edge functions 在本地 `netlify dev` 下无法工作。

### React Router（7+）
新建：`npx create-react-router@latest --template netlify/react-router-template`。已有项目：
```bash
npm install @netlify/vite-plugin-react-router
```
把 `netlifyReactRouter()` 加到 Vite 插件中。默认目标 = Serverless Functions。
**Edge（Deno）：**需要插件 v2.1.1+，设置 `edge: true`，并且你**必须**创建 `app/entry.server.tsx`：
```typescript
export { default } from 'virtual:netlify-server-entry'
```
排除你自己的 function 路径：`netlifyReactRouter({ edge: true, excludedPaths: ['/api/*'] })`。
**切回 Serverless：**移除 `edge: true` **并且**删除 `app/entry.server.tsx`。
中间件（React Router v7.9.0+，插件 v2.0.0+）：通过 `future.v8_middleware` 主动选择；从 `@netlify/vite-plugin-react-router/serverless` 导入 `netlifyRouterContext`（当 `edge: true` 时用 `/edge`）；访问 `context.get(netlifyRouterContext)`。

### Remix
新建：`npx create-remix@latest --template netlify/remix-template`（CLI 会询问用 functions 还是 Edge Functions）。手动（需要 Remix Vite）：
```bash
npm install --save-dev @netlify/remix-adapter
```
把来自 `@netlify/remix-adapter/plugin` 的 `netlifyPlugin()` 加到 Vite 插件中。

### Nuxt
通过 Nitro 实现 SSR，在 Nuxt 3 上自动生效。通过 `@netlify/nuxt`（`npx nuxi module add @netlify/nuxt`）实现本地一致性。
- 在 Edge Functions 上做 SSR 需要不同的 Nitro 部署预设（不会自动检测）。
- pnpm + Nuxt 3：设置 `PNPM_FLAGS=--shamefully-hoist`。
- `nuxt/image` 会自动使用 Netlify Image CDN；在 `nuxt.config.ts` 中设置远程域。

### SolidStart
SolidStart 2 构建在 Vite 之上——**没有 SolidStart 专属适配器**。安装 `@netlify/vite-plugin`：
```ts
import netlify from "@netlify/vite-plugin";
import { solidStart } from "@solidjs/start/config";
import { defineConfig } from "vite";
export default defineConfig({
  plugins: [solidStart(), netlify({ build: { enabled: true } })],
});
```
发布 `dist/client`。SSR 路由、server functions、中间件 → Netlify Functions，无需额外配置。
**Nitro 替代方案：**添加 `nitro()`，使用普通的 `netlify()`（不带 `build.enabled`），发布 `dist`。
SolidStart 1：Nitro 自动配置；可选地在 `app.config.ts` 中设置 `preset: "netlify"`；`vinxi build` / `dist`。

### TanStack Start
React（以及 Solid.js）全栈；SSR/Server Routes/Server Functions/中间件 → 无服务器 functions。
```bash
npm install -D @netlify/vite-plugin-tanstack-start
```
在 Vite 插件中把 `netlify()` 与 `tanstackStart()` 一起添加；`vite build` / `dist/client`（1.132.0+）。Netlify CLI 部署需要 netlify-cli 17.31+。更早版本：见 `references/tanstack.md`。

### Gatsby
- **5.12.0+（适配器）：**自动检测并安装 `gatsby-adapter-netlify`（零配置）。生成 functions `SSR`、`DSG`。无需 Essential Gatsby 插件。
- **5.11.0 或更早（Essential Gatsby 插件）：**自动安装 `@netlify/plugin-gatsby`；还需手动安装 `gatsby-plugin-netlify`（SSR、Gatsby 重定向、资源缓存所必需）。生成 `__api`、`__ssr`、`__dsg`、`__ipx`。可通过 `NETLIFY_SKIP_GATSBY_FUNCTIONS`（全部）/ `NETLIFY_SKIP_API_FUNCTION` / `NETLIFY_SKIP_SSR_FUNCTION` / `NETLIFY_SKIP_DSG_FUNCTION` 跳过。
- Gatsby 5 需要 Node 18。
- 大型站点：设置 `GATSBY_EXCLUDE_DATASTORE_FROM_BUNDLE` 从 CDN 加载 datastore（避免超过 function 部署大小上限；首次 SSR/DSG 加载较慢）。
- Image CDN：设置 `NETLIFY_IMAGE_CDN=true`（Contentful/Drupal/WordPress 源插件）。**在带适配器的 5.12.x 上不支持——请升级到 5.13.0+。**
- `StaticImage` 和 `gatsby-transformer-sharp` 对 SSR/DSG 不适用——请把图片托管在 CDN 上。

### Angular
SSR 通过 Edge Function 自动配置。建议的开发方式：`ng serve` / `4200`。
- **SSR 页面不受 `_redirects` 或 `netlify.toml` 重定向约束**——SSR 使用在重定向之前运行的 Edge Functions。请使用 Angular 内置的重定向。
- 在 SSR 中通过 `netlify.request` / `netlify.context` provider（来自 `@netlify/edge-functions`）访问 `Request`/`Context`；在客户端或预渲染期间不可用。用 `netlify serve` 本地测试。
- `NgOptimizedImage` 会自动使用 Image CDN；在 `netlify.toml` 的 `[images]` 下设置 `remote_images`（正则数组）。

### Express
Node 18.14.0+。通过 `serverless-http` 部署为 Netlify Function：
```bash
npm i express serverless-http @netlify/functions @types/express
```
```ts
// netlify/functions/api.ts
import express, { Router } from "express";
import serverless from "serverless-http";
const api = express();
const router = Router();
router.get("/hello", (req, res) => res.send("Hello World!"));
api.use("/api/", router);
export const handler = serverless(api);
```
```toml
[functions]
  external_node_modules = ["express"]
  node_bundler = "esbuild"
[[redirects]]
  force = true
  from = "/api/*"
  status = 200
  to = "/.netlify/functions/api/:splat"
```
无前端：设置一个占位的构建命令（例如 `echo Building Functions`）。所有 Function 限制都适用；不建议用作后台/定时 functions。

### Hydrogen
基于 React Router 7 的 Shopify 技术栈。**SSR 仅在 Netlify Edge Functions 上——不官方支持 Netlify Functions。**Node 24+。使用起始模板：
```bash
npm create @shopify/hydrogen@latest -- --template https://github.com/netlify/hydrogen-template
cp .env.example .env && npm run dev
```

## 静态站点注意事项

### Hugo
在 `[build.environment]` 中设置 `HUGO_VERSION`（0.19 之后的任意版本）——版本缺失或不匹配会导致 `exit code: 255`。把主题作为 **git 子模块**安装（`git submodule add ...`），而不是 `git clone`。

### Eleventy
`eleventy` / `_site`。**Build plugins 需要编辑 `.gitignore`：把 `node_modules` 改成 `**/node_modules/**`**——否则 Netlify 插件与 Eleventy 会在 `.netlify/plugins/node_modules/` 上冲突，构建报错。

## Vite 元框架支持矩阵
Astro（5.12+ 自动）、Nuxt（通过 `@netlify/nuxt`）、TanStack Start（通过 `@netlify/vite-plugin-tanstack-start`）、React Router、SolidStart——均为**完整支持**。SvelteKit——**实验性**。

## 通过 CLI 部署（Express、Nuxt、React、Vite）
```sh
npm install netlify-cli -g
netlify init
```
按提示创建/链接站点并设置构建设置。

<!-- Node version floors (18.14.0+) are stated per-framework where documented; no cross-framework build-image default is given in sources. -->

<!-- system: agent-context/frameworks/system.md — human-owned, merged by ctx-gen; edit system.md, not this section -->
# Netlify 内部规则（frameworks）

这些是组织约定，而非文档事实——由 ctx-gen 合并进渲染后的技能，且从不自动生成。由技能维护者负责。

1. 各框架的深入指南位于本技能中：`references/astro.md`、`references/nextjs.md`、`references/nuxt.md`、`references/sveltekit.md`、`references/tanstack.md`、`references/vite.md`——在即兴发挥之前把框架特定的工作路由到那里。
2. Next.js：仅使用现代运行时（v5，Next ≥13.5）——把旧版适配器当作只读的历史，绝不推荐。
3. 采用 SSR 适配器时，移除任何 SPA catch-all（`/* → /index.html 200`）——用户的重定向胜过适配器生成的路由，因此残留的 catch-all 会为 SSR 页面和 API 路由静默提供静态 `index.html`。
4. 任何环境变量更改——客户端或服务端——都需要重新部署。值在构建时注入；在 UI/CLI 中编辑一个变量，直到新的构建运行之前，不会到达线上站点或已部署的 functions。
5. `netlify dev` 同时带自定义 `command` 和 `targetPort` 时，需要在 `[dev]` 块中设置 `framework = "#custom"`——否则检测器会运行，自定义命令会被静默忽略。
6. 绝不要对密钥使用客户端前缀（`VITE_`、`NEXT_PUBLIC_`、`PUBLIC_`、`NUXT_PUBLIC_`、`REACT_APP_`、`GATSBY_`、`VUE_APP_`）——带客户端前缀的变量会被内联进浏览器 bundle。
7. Next.js skew protection 是有版本条件的：在 Next 14.1.4 以下，单靠 `NETLIFY_NEXT_SKEW_PROTECTION` 环境变量不够——还必须在 `next.config.js` 中设置 `experimental.useDeploymentId`（使用 server actions 时还要加 `useDeploymentIdServerActions`）。始终询问或说明版本条件；绝不要把该环境变量说成全部设置。
8. 客户端 `fetch` 调用默认不被 Next.js skew protection 覆盖。要给出两个选项。Next.js 15.4+ 有一个实验性的 `useSkewCookie` 标志，它把部署标识符放在 cookie 中，从而随客户端的 `fetch` 调用一并传递；Netlify 支持它，但要说明它尚未生产就绪，并且它会让访客停留在较旧的部署上，直到 cookie 清除。另一个选项适用于任何版本：每次调用时用 `process.env.NEXT_DEPLOYMENT_ID` 添加 `x-deployment-id`。
