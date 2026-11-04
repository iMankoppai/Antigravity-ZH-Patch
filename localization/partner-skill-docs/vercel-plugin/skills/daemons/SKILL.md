---
name: daemons
description: Vercel Daemons 指南——基于 Dockerfile 构建并在 vercel.json 的 `daemons` 键下声明的长时间运行后台工作进程。在 Vercel 上于应用旁运行队列消费者、Celery/Sidekiq/BullMQ worker、工作流 worker 或任务运行器时使用；按区域、内存或命令配置 daemon 实例时使用；处理 SIGTERM 时使用；或在 Daemons、Functions、Queues 和 Workflows 之间做选择时使用。
summary: "Vercel Daemons (public beta) run long-running containers with no inbound traffic, declared under the top-level `daemons` key in vercel.json as `{ root, entrypoint: 'Dockerfile', instances: { iad1: 2 } }`. Vercel builds the image, rolls it out with the production deployment, keeps the instance counts per region, and sends SIGTERM (30s default grace, configurable with `terminationGracePeriodSeconds`) on rollout. Production only during the beta."
metadata:
  priority: 6
  docs:
    - "https://vercel.com/docs/daemons"
    - "https://vercel.com/docs/daemons/config-reference"
    - "https://vercel.com/docs/daemons/managing-daemons"
    - "https://vercel.com/docs/daemons/limits"
    - "https://vercel.com/docs/build-output-api/daemons"
  sitemap: "https://vercel.com/sitemap.xml"
  pathPatterns:
    - 'vercel.json'
  bashPatterns: []
  importPatterns: []
  promptSignals:
    phrases:
      - "vercel daemon"
      - "daemons key"
      - "daemon on vercel"
      - "daemons on vercel"
      - "worker on vercel"
      - "celery on vercel"
      - "sidekiq on vercel"
      - "bullmq on vercel"
    allOf:
      - [daemon, vercel]
      - [daemon, project]
      - [worker, vercel, long-running]
      - [worker, vercel, always-on]
      - [worker, vercel, background]
      - [consumer, vercel, long-running]
      - [celery, worker, vercel]
      - [sidekiq, vercel]
      - [bullmq, worker, vercel]
      - [runner, vercel, self-hosted]
    anyOf:
      - "daemon"
      - "worker"
      - "long-running"
      - "always-on"
      - "celery"
      - "sidekiq"
      - "bullmq"
      - "dockerfile"
      - "instances"
      - "sigterm"
    noneOf:
      - "systemd"
      - "docker daemon"
      - "dockerd"
      - "daemonset"
      - "launchd"
      - "web worker"
      - "service worker"
      - "cloudflare worker"
    minScore: 6
retrieval:
  aliases:
    - Vercel Daemons
    - daemon
    - background worker
    - long-running worker
    - queue consumer
  intents:
    - run a long-running background worker on Vercel
    - run a queue consumer next to my app
    - deploy a Celery, Sidekiq, or BullMQ worker
    - configure the daemons key in vercel.json
    - scale daemon instances per region
    - handle SIGTERM for graceful shutdown
    - choose between Daemons, Functions, Queues, and Workflows
  entities:
    - daemons
    - instances
    - entrypoint
    - root
    - resources.requests.memory
    - VERCEL_OIDC_TOKEN_FILE
    - PollingQueueClient
  examples:
    - add a BullMQ worker to my Next.js project on Vercel
    - run a Celery worker next to my FastAPI service
    - poll Vercel Queues from an always-on worker
    - my daemon does not run on preview deployments
    - how do I scale my daemon to two regions
---

# Vercel Daemons

你是 Vercel Daemons 专家，它是从容器镜像运行、与应用位于同一项目中的长时间后台进程。

Daemons [在所有计划上处于公开测试](https://vercel.com/docs/daemons)。在推荐它们时要说明这一点。

## 它是什么

daemon 是项目中的一个命名资源，它在你列出的每个区域中运行固定数量的、来自同一个容器镜像的相同实例。Vercel 从 daemon 的 `Dockerfile` 或 `Containerfile` 构建镜像，在部署成为生产部署时将其推出，重启退出或崩溃的实例，并将 `stdout`/`stderr` 转发到项目的 Logs。Daemons 运行在 Fluid compute 上。

Daemons **无法接收入站流量**。它们从队列、工作流引擎或外部 API 拉取工作。

## 何时使用 Daemons

当进程拥有一个持续检索工作的循环时，使用 daemon。

| 需求 | 使用 | 理由 |
|------|-----|-----|
| 常驻队列消费者（Vercel Queues 轮询模式、SQS、Kafka、Redis）、Celery/Sidekiq/BullMQ worker、工作流引擎 worker、自托管 CI runner | **Daemons** | 长时间运行的循环、每个区域固定实例、无需请求 |
| HTTP API、webhook、流式传输、WebSocket | Vercel Functions（`⤳ skill: vercel-functions`） | Daemons 无法接收流量 |
| 即发即忘的后台任务、扇出、由 Vercel 调用你的处理器的缓冲 | Vercel Queues 推送模式（`⤳ skill: queues`） | 无服务器、自动扩缩、可在预览中工作 |
| 带休眠、钩子或审批的持久化多步逻辑 | Vercel Workflows（`⤳ skill: workflow`） | 持久化步骤和重放 |
| 按计划运行代码 | Cron Jobs（`⤳ skill: vercel-functions`） | 基于时间的触发 |
| 在隔离环境中运行不受信任或 AI 生成的代码 | Vercel Sandbox（`⤳ skill: vercel-sandbox`） | 临时 microVM |
| 一个项目中的多个前端和后端 | Vercel Services（`⤳ skill: vercel-services`） | Daemons 与 services 并排，但它们不是 services |

如果用户的工作是请求驱动的，优先使用 Functions 或 Queues 推送模式。仅当某物必须持续运行时才使用 daemon。

## 快速开始

在 worker 的源目录中添加一个 `Dockerfile`：

```docker
# worker/Dockerfile
FROM node:24-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
CMD ["node", "worker.js"]
```

在顶层 `daemons` 键下声明 daemon：

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "daemons": {
    "worker": {
      "root": "worker/",
      "entrypoint": "Dockerfile",
      "instances": { "iad1": 2 }
    }
  }
}
```

同一配置在 `vercel.toml` 中作为 `[daemons.worker]` 表同样有效。部署到生产。Vercel 构建镜像，将其作为 `daemon.worker` 推送到 Vercel Container Registry，并在 `iad1` 中启动两个实例。

Daemons 始终在顶层声明，绝不在 `services` 内部。它们与现有应用（Next.js、Services 或其他）并排运行，而不改变 Vercel 的构建方式。

## 配置参考

| 字段 | 类型 | 必填 | 说明 |
|-------|------|----------|-------|
| `root` | `string` | 是 | 源目录，相对于 `vercel.json`。必须位于项目内。其下的文件不会作为静态资源发布 |
| `entrypoint` | `string` | 是 | `Dockerfile` 或 `Containerfile` 的路径，相对于 `root`。其目录是构建上下文 |
| `instances` | `Record<region, number>` | 是 | 每个区域 ID 的实例数，每个 `0`–`100`。Vercel 仅在列出的区域运行 |
| `command` | `string[]` | 否 | 替换镜像的 `ENTRYPOINT` 和 `CMD`。不通过 shell 运行 |
| `resources` | `{ requests: { memory } }` | 否 | `1Gi`（1 vCPU）、`2Gi`（1 vCPU，默认）、`4Gi`（2 vCPU）、`8Gi`（4 vCPU） |
| `terminationGracePeriodSeconds` | `number` | 否 | `SIGTERM` 之后到终止前等待的秒数，`0`–`3600`，默认 `30` |

- **`instances` 与 `replicas`**：已发布的 `vercel.json` schema 和 Build Output API 使用 `instances`。`replicas` 是已弃用的别名，当设置了 `instances` 时会被忽略。如果项目已使用 `replicas`，让它继续工作，但在新配置中写 `instances`。
- **名称**：仅小写字母，用 `_`、`__` 或一个或多个 `-` 连接（`worker`、`email_sender`、`celery-beat`；不是 `Worker`、`worker1`、`_worker`），最多 64 个字符。合并重复连字符后会折叠为同一镜像仓库的两个名称，例如 `a-b` 和 `a--b`，会导致构建失败。daemon 和 service 可以共享一个名称。
- **被拒绝的字段**：诸如 `framework`、`runtime`、`buildCommand` 和 `bindings` 等服务字段在 daemon 上会使校验失败。
- **构建**：镜像为 Linux `amd64` 构建。部署环境变量作为构建参数传递给镜像构建。
- **Shell 特性**：`command` 是 exec 形式。使用 `["sh", "-c", "exec node worker.js --id $WORKER_ID"]` 进行变量展开。
- **无 `CMD`**：如果镜像既没有 `ENTRYPOINT` 也没有 `CMD`，且未设置 `command`，构建会失败。

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "daemons": {
    "celery": {
      "root": "backend/",
      "entrypoint": "Dockerfile",
      "command": ["celery", "-A", "app", "worker", "--loglevel=info"],
      "instances": { "iad1": 2, "cdg1": 1 },
      "resources": { "requests": { "memory": "4Gi" } }
    }
  }
}
```

## 生命周期与扩缩

- **Beta 期间仅限生产。** Daemons 仅针对生产部署运行。预览部署不会启动 daemons；通过在本地运行镜像来测试更改。
- **推出**：当部署成为生产（deploy、promote、Instant Rollback 或已完成的滚动发布）时，Vercel 启动新实例并向先前部署的实例发送 `SIGTERM`。短时间内两个版本同时运行，因此两者都必须能够消费同一队列并容忍同一数据库 schema。
- **镜像、命令和环境变量**属于部署。用新的生产部署来更改它们。
- **使用 `vercel.json` 扩缩**：更改 `instances` 并部署到生产。该映射替换前一个；从中移除的区域会停止。
- **扩缩覆盖**：在项目仪表板中，**Daemons** → 选择 daemon → **Scale** → **Scale Daemon**，或使用 Vercel CLI 64.3.0+ 运行 `vercel daemons scale worker iad1=3 fra1=0`（未命名的区域保持其计数）。覆盖值跨部署持久，并优先于 `instances`，直到用 **Scale** → **Clear scaling overrides** 或 `vercel daemons scale worker --reset` 清除。如果对 `instances` 的 `vercel.json` 更改似乎被忽略，先检查是否存在覆盖。没有自动扩缩。
- **停止而不删除**：将每个区域设为 `0`，或将 `instances` 设为 `{}`，或从仪表板设置 `0` 覆盖。
- **删除**：从 `daemons` 中移除 daemon 并部署到生产。
- **暂停的项目**会停止所有 daemon 实例；项目恢复时它们会再次启动。

## 优雅关闭

Vercel 在推出、缩容、移除和手动重启时发送 `SIGTERM`，然后默认等待 30 秒（`terminationGracePeriodSeconds`，`0`–`3600`）后终止进程。立即停止接收新工作并完成正在进行的任务。实例可能随时停止，因此任务必须幂等且可安全重试；仅在处理完队列消息后再确认它。

```ts
// worker/worker.ts
const shutdown = new AbortController();
process.on('SIGTERM', () => shutdown.abort());

async function main(): Promise<void> {
  while (!shutdown.signal.aborted) {
    await processNextJob(shutdown.signal); // bounded poll; back off when there is no work
  }
  process.exit(0);
}

void main();
```

```python
# worker/worker.py
import signal
from threading import Event

shutdown = Event()
signal.signal(signal.SIGTERM, lambda signum, frame: shutdown.set())

while not shutdown.is_set():
    process_next_job(shutdown)  # bounded poll, finish the current job before returning
```

## 从 Daemon 消费 Vercel Queues

daemon 是 [Vercel Queues 轮询模式](https://vercel.com/docs/queues/poll-mode)的长时间运行消费者。使用 `@vercel/queue` 的 `PollingQueueClient` 并显式指定区域，因为消息只能从它们被发送到的区域接收：

```ts
// worker/worker.ts
import { PollingQueueClient } from '@vercel/queue';

const { receive } = new PollingQueueClient({ region: 'iad1' });
const shutdown = new AbortController();
process.on('SIGTERM', () => shutdown.abort());

while (!shutdown.signal.aborted) {
  const result = await receive('orders', 'fulfillment', async (message) => {
    await processOrder(message); // acknowledged when this resolves, retried if it throws
  }, { limit: 10 });

  if (!result.ok && result.reason === 'empty') {
    await new Promise((r) => setTimeout(r, 1000));
  }
}
```

在与生产者发送到的相同区域运行 daemon。主题默认按部署 ID 分区；在依赖跨部署消费之前阅读轮询模式版本控制章节。对于生产者侧和推送模式消费者，加载 `⤳ skill: queues`。

## 环境变量和 OIDC

- 每个实例接收部署的环境变量。
- 每个实例接收一个写入文件的 OIDC 令牌，其路径在 `VERCEL_OIDC_TOKEN_FILE` 中，并定期刷新。使用 `@vercel/oidc` 4.0.0 或更高版本（Node.js）或 `vercel-oidc` 0.10.0 或更高版本（Python）读取它。仅读取 `VERCEL_OIDC_TOKEN` 的旧 SDK 版本将找不到它。

## 本地开发

`vercel dev` 不会运行 daemons；它会打印警告并启动项目的其余部分。改用 Docker 运行 daemon：

```bash
vercel env pull                       # writes .env.local
docker build -t worker worker/
docker run --env-file .env.local worker
```

## 日志和可观测性

Daemon 输出以来源 `daemon` 和 daemon 名称出现在项目的 Logs 中，因此你可以过滤到单个 daemon。项目仪表板的 **Daemons** 标签页显示每个 daemon 的实例、状态和日志。Vercel CLI 64.3.0+ 有 `vercel daemons ls`、`vercel daemons inspect <name>` 和 `vercel daemons instances ls|inspect|restart`（仅生产）。

## Build Output API

使用 `vercel build` 或自定义构建器时，`.vercel/output/config.json` 将 daemons 列为 `"daemons": { "worker": {} }`（完整集合；省略的 daemons 会被停止），并且每个都有 `.vercel/output/daemons/<name>/.vc-config.json`，包含 `runtime: "container"`、已在 Vercel Container Registry 中的 `image`、`instances`，以及可选的 `command`、`resources` 和 `terminationGracePeriodSeconds`。`vercel build` 会构建并推送镜像，并为你写入这些文件。

## 限制

| 限制 | 值 |
|-------|-------|
| 每个区域的实例数 | 每个 daemon 100 |
| 每个实例的内存 | 1、2（默认）、4 或 8 GiB |
| 关闭宽限期 | 默认 `SIGTERM` 后 30 秒，可用 `terminationGracePeriodSeconds` 配置到最多 3,600 秒 |
| CPU 架构 | Linux `amd64` |

Beta 期间适用默认的每团队配额：Hobby 限于 1–2 GiB 实例和每月 Active CPU 小时额度（用完时实例停止），Pro 允许所有大小，直至并发 vCPU 和内存上限，Enterprise 为自定义。在确定部署规模之前，查看 [Daemons 限制](https://vercel.com/docs/daemons/limits) 了解当前数字。

Beta 期间不支持：预览部署、入站 HTTP 或 TCP 流量、自动扩缩、持久化本地存储（使用 Vercel Blob 或 Marketplace 数据库）、在 `vercel dev` 中运行、作为服务绑定或重写的目标、没有 `Dockerfile`/`Containerfile` 的构建，以及根目录为 `apps/web` 之类子文件夹的项目。

## 常见陷阱

1. **期望收到流量**：监听端口的 daemon 收不到任何东西。用 Functions 或 Services 提供请求，并让 daemon 拉取工作。
2. **在预览上测试**：Beta 期间 daemons 从不为预览部署启动。部署到生产或在本地运行镜像。
3. **扩缩更改被忽略**：扩缩覆盖（仪表板或 CLI）优先于 `instances`，直到被清除。
4. **不安全的重叠**：推出期间旧版本和新版本并排运行。保持消息格式和 schema 迁移向后兼容。
5. **没有 SIGTERM 处理**：除非提高 `terminationGracePeriodSeconds`，否则进程在 `SIGTERM` 后 30 秒（默认）被杀死。使任务幂等，并仅在完成后确认。
6. **`command` 中的 shell 语法**：`$VAR` 和 `&&` 不会被展开。用 `sh -c` 包裹。
7. **Monorepo 根目录**：根目录为子文件夹的项目目前还不能添加 daemons。
8. **过时 OIDC SDK**：使用 `@vercel/oidc` ≥ 4.0.0 或 `vercel-oidc` ≥ 0.10.0，以便读取令牌文件。

## 参考资料

- 📖 文档：https://vercel.com/docs/daemons
- 📖 配置参考：https://vercel.com/docs/daemons/config-reference
- 📖 管理 daemons：https://vercel.com/docs/daemons/managing-daemons
- 📖 限制和配额：https://vercel.com/docs/daemons/limits
- 📖 Build Output API：https://vercel.com/docs/build-output-api/daemons
- 📖 Queues 轮询模式：https://vercel.com/docs/queues/poll-mode
- 📖 Functions vs 容器 vs Daemons：https://vercel.com/kb/guide/vercel-functions-containers-daemons
