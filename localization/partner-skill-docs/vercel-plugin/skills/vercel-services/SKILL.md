---
name: vercel-services
description: 在一个项目中为多个前端和后端配置和排查 Vercel Services。在一个 Vercel 部署上组合多语言或多服务应用时使用；在 `vercel.json` 中定义 `services` 键、面向服务的重写或服务绑定时使用；或用 `vercel dev` 运行所有服务时使用。
summary: Compose multiple frontends and backends in one Vercel project (Beta)
metadata:
  priority: 7
  docs:
    - "https://vercel.com/docs/services"
    - "https://vercel.com/docs/services/routing"
    - "https://vercel.com/docs/services/bindings"
    - "https://vercel.com/docs/services/config-reference"
    - "https://vercel.com/docs/services/experimental"
    - "https://vercel.com/docs/services/pricing"
  sitemap: "https://vercel.com/sitemap.xml"
  pathPatterns:
    - 'vercel.json'
    - 'apps/*/vercel.json'
  bashPatterns:
    - '\b(?:vercel|vc)\s+dev\b[^\n]*(?:--local|-L)(?:\s|$)'
  importPatterns: []
  promptSignals:
    phrases:
      - "vercel services"
      - "vercel service binding"
      - "vercel service bindings"
      - "multi-service vercel"
      - "multiple services on vercel"
      - "frontend and backend on vercel"
    allOf:
      - [backend, vercel]
      - [polyglot, vercel]
      - [multiple, services, vercel]
      - [services, vercel.json]
      - [vercel, service, binding]
    anyOf:
      - "backend"
      - "monorepo"
      - "polyglot"
      - "service"
      - "binding"
      - "vercel"
    noneOf: []
    minScore: 6
retrieval:
  aliases:
    - Vercel Services
    - multi-service project
    - polyglot project
    - service binding
    - service rewrite
  intents:
    - deploy frontend and backend together in one project
    - configure the services key in vercel.json
    - configure service rewrites
    - call the backend privately with a service binding
    - keep a service private with no public route
    - serve a service on a subdomain
    - strip a route prefix before it reaches the backend service
    - run all services locally
  entities:
    - services
    - bindings
    - destination.service
    - root
    - experimentalServices
  examples:
    - put a Next.js frontend and a FastAPI backend in one project
    - deploy a Vite SPA with an Express API behind /api
    - add a Go service to an existing Next.js project
    - my frontend cannot reach the backend service
    - the backend returns 404 for every /api route
    - point api.example.com at the backend
---

# Vercel Services

当一个应用由多个紧密耦合的组件（例如前端加后端）组成并且应部署到一个 Vercel 项目时，使用 `services` 模型。

Services [在所有计划上处于 Beta](https://vercel.com/docs/services)。在推荐它时要说明这一点。

Services 独立构建，但作为一个部署一起发布。这带来了前后端之间的 skew 保护、每个服务都保持同步的预览环境、整个应用的原子部署和回滚，以及通过绑定进行私有的服务间通信。公共流量通过一张有序的路由表进入。

## 选择正确的结构

| 需求 | 使用 |
| --- | --- |
| 应作为一个应用一起发布的多个紧密耦合组件，例如前端和后端 | Vercel Services |
| 一个框架可以拥有整个应用，例如带 Route Handlers 的 Next.js | 一个不带 Services 的普通 Vercel 项目 |
| 各团队拥有自己的服务并按自己的节奏部署和回滚 | Monorepo 中独立的 Vercel 项目 |
| 独立部署的前端必须渲染为一个站点 | Vercel 微前端 |

优点和缺点是同一件事：每个部署都会一起发布所有服务。仅当你特别需要独立于其他服务部署或回滚某个服务时，才选择独立项目。

不要仅仅为了把一个框架拆成任意进程就引入 Services。当一个独立构建的组件有真实的运行时、框架、依赖或所有权理由时，才使用它。

## 定义服务和公共入口

如果 `vercel.json` 已有 `experimentalServices` 键，说明项目处于较早的配置模型：在更改它之前阅读 [references/experimental-services.md](references/experimental-services.md)。

每个服务都需要一个相对于 `vercel.json` 的 `root`。除非必须固定框架，否则让 Vercel 检测框架。当运行时需要时，设置相对于服务根的 `entrypoint`。

```json filename="vercel.json"
{
  "services": {
    "frontend": {
      "root": "apps/web",
      "bindings": [
        {
          "type": "service",
          "service": "backend",
          "format": "url",
          "env": "BACKEND_INTERNAL_URL"
        }
      ]
    },
    "backend": {
      "root": "apps/backend",
      "entrypoint": "main:app"
    }
  },
  "rewrites": [
    { "source": "/api/(.*)", "destination": { "service": "backend" } },
    { "source": "/(.*)", "destination": { "service": "frontend" } }
  ]
}
```

顶层重写会暴露服务。没有匹配顶层重写的服务是私有的：无法从公共互联网访问，只能通过绑定访问。

保持配置所有权清晰：

- 将公共 `rewrites`、`redirects`、`headers` 和其他 URL 行为保留在顶层。
- 将 `functions`、`installCommand`、`buildCommand`、`devCommand`、`ignoreCommand`、`outputDirectory` 和框架设置放在拥有它们的服务上。
- 仅当服务本地的 `headers`、`redirects`、`rewrites` 或 `routes` 应在公共入口选择该服务之后运行时，才把它们放在服务内部。
- 当服务必须从 Dockerfile 或 OCI 镜像构建时，设置 `runtime: "container"`。对非标准 Dockerfile 使用 `entrypoint`，用 `command` 覆盖镜像命令。

## 正确路由请求

顶层重写按顺序评估。将特定规则放在 catch-all 之前。

路由到某个服务后即为最终结果。如果所选服务返回 404 或 405，Vercel 不会尝试下一个顶层重写。

根据前端需要来划分 URL 命名空间：

- 没有自己服务端路由的前端（例如 Vite 或 Create React App 构建）让后端拥有整个 `/api`。
- 拥有自己 API 路由的框架（例如 Next.js）共享该命名空间：只将子命名空间（如 `/api/v1/(.*)`）或特定前缀（如 `/api/users/(.*)`）发送到后端，让框架保留其余部分。

服务接收原始请求路径。在上述示例中，`GET /api/users` 以 `/api/users` 到达 `backend`，而不是 `/users`。要么让后端处理该前缀（例如 FastAPI `root_path`），要么用服务范围的重写剥离它：

```json filename="vercel.json"
{
  "services": {
    "backend": {
      "root": "apps/backend",
      "entrypoint": "main:app",
      "rewrites": [
        { "source": "/api/:path(.*)?", "destination": "/:path" }
      ]
    }
  }
}
```

提供静态 `index.html` 的 SPA 服务（例如 Vite 构建）需要服务范围的 catch-all，以便深层链接可以解析：

```json filename="vercel.json"
{
  "services": {
    "frontend": {
      "root": "apps/web",
      "rewrites": [
        { "source": "/(.*)", "destination": "/index.html" }
      ]
    }
  }
}
```

服务目标中的 `path` 选择服务内部运行哪条路由，而不会改变服务代码看到的路径。其中的查询字符串会添加服务自身规则可以匹配的状态，例如 `"path": "/:path*?org=:orgSlug"`（[路由文档](https://vercel.com/docs/services/routing)）。要改变代码看到的路径，使用服务范围的重写或服务自身 `routes` 中的 `request.path` 转换。

## 在子域名上提供某服务

主机匹配的顶层重写可以将服务放在其自己的子域名上（例如 `api.example.com`），同时由 catch-all 提供前端：

```json filename="vercel.json"
{
  "rewrites": [
    {
      "source": "/(.*)",
      "has": [{ "type": "host", "value": "api.example.com" }],
      "destination": { "service": "backend" }
    },
    { "source": "/api/(.*)", "destination": { "service": "backend" } },
    { "source": "/(.*)", "destination": { "service": "frontend" } }
  ]
}
```

子域名仅在该域名已附加的地方解析：生产环境，或带自定义域名的自定义环境。预览部署只获得一个生成的 URL，因此请将子路径重写与主机规则一起保留，并让前端指向相对路径，例如 `NEXT_PUBLIC_API_URL=/api`，以便每个预览都调用自己的部署。

## 使用绑定私有地调用服务

在调用方服务上声明绑定，命名目标服务，并选择接收生成 URL 的环境变量。不要硬编码部署主机名或手动设置绑定变量。

```ts
const url = new URL('/api/users', process.env.BACKEND_INTERNAL_URL);
const response = await fetch(url);
```

绑定是感知部署的，并且不创建公共路由。它们在运行时对函数可用，而不是在构建期间或 Routing Middleware 中。内部调用会跳过公共 Firewall、Deployment Protection、顶层中间件和 CDN 流水线。

通过绑定的每次调用按一次 [Service Request](https://vercel.com/docs/services/pricing) 计费，不收取 CDN Request 或 Fast Data Transfer 费用。服务返回的字节仍按 Fast Origin Transfer 计费。

公共暴露仅由顶层重写决定。没有顶层重写的服务是私有的：无法从公共互联网访问，只能通过其绑定访问。同时具有绑定和顶层重写的服务也可公开访问，因此不要假定仅绑定访问就意味着路由受保护。

绑定授予的是网络可达性，而不是应用认证。当目标必须验证调用方时，添加服务级授权。

原生 Go 和 Rust 运行时服务目前无法使用绑定。当这些调用方需要绑定时，将它们构建为容器服务。Node.js 和 Python 服务可以直接使用绑定。

## 开发与部署

运行每个服务并注入本地绑定变量：

```bash
vercel dev
```

当不需要云端认证时，使用仅本地模式：

```bash
vercel dev -L
```

使用 `vercel` 或 Git 集成正常部署项目。所有服务都参与同一个预览和生产部署。

## 排查

- **没有公共流量到达某个服务：** 添加一条指向它的顶层重写。
- **错误的服务器接收了请求：** 重新排序重写，使最具体的规则在前、catch-all 在最后。
- **后端返回 404：** 确认其路由包含公共前缀，因为 Vercel 保留原始请求路径，或用服务范围的重写剥离该前缀。
- **SPA 在深层链接上返回 404：** 添加一条到 `/index.html` 的服务范围 catch-all 重写。
- **子域名在生产中可用但在预览中不可用：** 预览 URL 只有一个主机，因此主机规则在那里永远不会匹配。保留一条指向同一服务的子路径重写，并在前端使用相对 URL。
- **缺少绑定变量：** 在调用方声明绑定，并从运行时函数代码访问它，而不是构建代码或中间件。
- **构建设置被忽略或拒绝：** 将顶层构建和运行时字段移入拥有它们的服务。
- **框架检测错误：** 显式设置该服务的 `framework` 或 `entrypoint`，而不是更改整个项目。
- **校验拒绝 `services` 与 `experimentalServices` 同时存在：** `vercel.json` 只能声明一个；在 [references/experimental-services.md](references/experimental-services.md) 中完成迁移。

## 相关技能

- 部署命令和 CI：`⤳ skill: deployments-cicd`
- 函数运行时行为和限制：`⤳ skill: vercel-functions`
- 独立前端部署：`⤳ skill: microfrontends`
