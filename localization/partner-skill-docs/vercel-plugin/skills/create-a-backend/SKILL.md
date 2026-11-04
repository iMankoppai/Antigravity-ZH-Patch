---
name: create-a-backend
description: 后端架构指南。在规划、构建或迁移 API 或后端时使用；在 Functions、Services、容器、Daemons、Workflow、Queues 和 Marketplace 数据库之间做选择时使用；或选择受支持的后端框架或运行时时使用。
summary: Match backend workloads to the right architecture
metadata:
  priority: 7
  docs:
    - "https://vercel.com/docs/frameworks/backend"
    - "https://vercel.com/docs/functions"
    - "https://vercel.com/docs/services"
    - "https://vercel.com/docs/queues"
    - "https://vercel.com/docs/daemons"
    - "https://vercel.com/docs/workflows"
    - "https://vercel.com/docs/storage"
  sitemap: "https://vercel.com/sitemap.xml"
  pathPatterns:
    - 'Dockerfile.vercel'
    - 'Containerfile.vercel'
  promptSignals:
    phrases:
      - "backend on vercel"
      - "vercel backend"
      - "build a backend"
      - "create a backend"
      - "deploy my backend"
      - "backend architecture"
    allOf:
      - [backend, vercel]
      - [backend, docker]
      - [backend, node]
      - [backend, python]
      - [backend, queue]
    anyOf:
      - "api"
      - "database"
      - "service"
      - "workflow"
    noneOf: []
    minScore: 6
retrieval:
  aliases:
    - Vercel backend
    - backend architecture
    - backend framework
  intents:
    - build a backend
    - choose backend products
    - deploy an existing API or server
    - select a Node.js or Python backend framework
  entities:
    - Vercel Functions
    - Vercel Services
    - Vercel Queues
    - Vercel Daemons
    - Vercel Workflow
    - Vercel Marketplace
    - container images
---

# 创建后端

帮助用户创建后端，在深入实现细节之前先选择架构。从工作负载出发，而不是从编程语言出发。Vercel 运行复杂的后端应用，而不仅仅是前端。

## 产品图谱

| 需求 | Vercel 产品 |
| --- | --- |
| HTTP API、webhook、流式传输或框架服务端代码 | **[Vercel Functions](https://vercel.com/docs/functions) 搭配 [Fluid compute](https://vercel.com/docs/fluid-compute)** |
| 双向实时连接（WebSocket） | **[Vercel Functions 搭配 Fluid compute](https://vercel.com/docs/functions/websockets)**；无需单独的实时服务 |
| 一个前端和一个或多个一起部署的后端（API 端点） | **[Vercel Services](https://vercel.com/docs/services)** |
| 现有的 Dockerfile、自定义运行时或系统依赖 | Vercel Functions 上的 **[容器镜像](https://vercel.com/docs/functions/runtimes/container)**，可选择与 Services 组合 |
| 带重试、休眠或外部事件的持久化多步工作 | **[Vercel Workflows](https://vercel.com/docs/workflows)** |
| 后台任务、缓冲、扇出或直接消息路由 | **[Vercel Queues](https://vercel.com/docs/queues)** |
| 常驻工作进程：队列消费者、Celery/Sidekiq/BullMQ worker、任务运行器 | **[Vercel Daemons](https://vercel.com/docs/daemons)**（beta，仅生产环境） |
| 调度的 HTTP 工作 | **[Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)**；当任务本身必须持久化时使用 Workflow |
| Postgres、Redis、NoSQL、向量或其他应用数据 | **[来自 Vercel Marketplace 的存储集成](https://vercel.com/marketplace/category/storage)** |
| 文件和用户上传 | **[Vercel Blob](https://vercel.com/docs/vercel-blob)** |
| 全局、读密集的配置 | **[Global Config](https://vercel.com/docs/global-config)** |

对于常规的请求/响应后端使用 Functions。当独立构建的组件应共享一个部署、路由层、预览 URL 和回滚时，使用 Services。当组件需要独立的发布周期时，使用独立的 Vercel 项目。

对于受支持的框架，优先使用原生 Functions 运行时。当应用已有 Dockerfile，或需要自定义运行时或系统依赖时，使用容器镜像。它们作为自动扩缩、无状态的 Functions 运行，而不是常驻的容器主机。

对于后台任务、缓冲、扇出和消息路由选择 Queues。对于持久化的多步业务逻辑选择 Workflow。仅当一个进程必须持续运行以拉取工作时才选择 Daemons，例如轮询模式的队列消费者或现有的 Celery、Sidekiq 或 BullMQ worker；Daemons 无法接收流量。

## 数据库和数据存储

通过 Marketplace 配置数据存储，以便凭据被注入到项目中，并让环境保持连接。在选择提供商之前检查当前目录。

- **Postgres：** Neon、Supabase、AWS/Aurora、Nile、Prisma Postgres
- **MySQL：** AWS/Aurora
- **Redis 和键值：** Upstash、Redis
- **文档和 NoSQL：** MongoDB Atlas、AWS
- **SQLite：** Turso
- **实时应用后端：** Convex
- **分析：** MotherDuck

让数据库靠近 Functions 区域，并使用兼容无服务器的连接或连接池。

## 后端框架

Vercel 为这些框架提供一流的[后端示例和集成](https://vercel.com/docs/frameworks/backend)：

- **Node.js 和 TypeScript：** Elysia、Express、Fastify、H3、Hono、Koa、NestJS、Nitro 和 xmcp。当后端属于 Next.js 应用时，Next.js Route Handlers 是自然的选择。
- **Python：** FastAPI、Flask 和 Django。其他 WSGI 或 ASGI 应用在导出兼容的 `app` 时可以运行，并根据需要做额外配置。
- **Go：** 作为 Vercel Functions 运行时受支持。

前端和后端的组合，例如 Next.js/Vite/SvelteKit 前端搭配 FastAPI/Flask/Express/Go 后端，可以使用 Services 在一个项目中一起部署。

优先使用用户现有的框架。对于新项目，根据生态系统和应用需求来选择。

## 工作顺序

1. 识别同步请求、异步工作、持久化数据和独立部署的组件。
2. 从图谱中选择产品，然后选择框架。
3. 加载用于实现的专门技能：`vercel-functions`、`vercel-services`、`daemons`、`queues`、`workflow`、`vercel-storage` 或 `marketplace`。
4. 在部署前，于官方文档中确认函数限制、区域、环境变量、可观测性和当前产品可用性。
