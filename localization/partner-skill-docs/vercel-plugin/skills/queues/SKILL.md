---
name: queues
description: Vercel Queues 指南——通过 @vercel/queue（JS）或 vercel-queue（Python）实现具备至少一次投递、独立消费者组、重试、延迟和幂等键的持久化主题。在推迟后台工作、缓冲流量、扇出事件，或在 Queues 和 Workflows 之间做选择时使用。
summary: "Vercel Queues (beta) publishes JSON messages to durable topics with `send()` from `@vercel/queue`; consumers are Vercel Functions exported with `handleCallback()` and registered in vercel.json under `functions.<path>.experimentalTriggers` as `{ type: 'queue/v2beta', topic: '<name>' }`. Delivery is at-least-once with automatic retries; use Workflows instead for multi-step durable logic."
metadata:
  priority: 6
  docs:
    - "https://vercel.com/docs/queues"
    - "https://vercel.com/docs/queues/sdk"
  sitemap: "https://vercel.com/sitemap.xml"
  pathPatterns:
    - 'app/api/queues/**'
    - 'src/app/api/queues/**'
    - 'pages/api/queues/**'
    - 'lib/queue.*'
    - 'src/lib/queue.*'
    - 'lib/queues/**'
    - 'src/lib/queues/**'
  bashPatterns:
    - '\bnpm\s+(install|i|add)\s+[^\n]*@vercel/queue\b'
    - '\bpnpm\s+(install|i|add)\s+[^\n]*@vercel/queue\b'
    - '\bbun\s+(install|i|add)\s+[^\n]*@vercel/queue\b'
    - '\byarn\s+add\s+[^\n]*@vercel/queue\b'
    - '\b(pip|uv)\s+(install|add)\s+[^\n]*vercel-queue\b'
  importPatterns:
    - "@vercel/queue"
  promptSignals:
    phrases:
      - "vercel queues"
      - "@vercel/queue"
      - "background job"
      - "background jobs"
      - "message queue"
      - "job queue"
      - "consumer group"
    allOf:
      - [vercel, queues]
      - [queue, topic]
      - [queue, consumer]
      - [queue, buffer]
      - [fan, out]
    anyOf:
      - "queue"
      - "topic"
      - "retry"
      - "consumer"
      - "buffer"
      - "background"
    noneOf:
      - "build queue"
      - "deployment queue"
      - "queued deployment"
      - "deployments stuck"
      - "queues up deployments"
      - "queue up deployments"
      - "queues my deployments"
      - "queues our deployments"
      - "queues your deployments"
      - "queues the deployments"
      - "queues deployments"
      - "queues builds"
      - "queues my builds"
    minScore: 6
retrieval:
  aliases:
    - queues
    - message queue
    - background jobs
    - event streaming
    - pub sub
  intents:
    - defer work to a queue
    - process background jobs
    - fan out events to consumers
    - retry failed jobs
    - buffer traffic spikes
  entities:
    - Vercel Queues
    - "@vercel/queue"
    - topic
    - consumer group
    - handleCallback
    - experimentalTriggers
chainTo:
  -
    pattern: '"use workflow"|"use step"|from\s+[''"]workflow[''"]'
    targetSkill: workflow
    message: 'Workflow SDK code alongside Queues — Workflows is built on Queues and adds durable steps, sleep, and hooks. Loading Workflow guidance.'
  -
    pattern: 'from\s+[''"](bullmq|bull|bee-queue|agenda)[''"]|@aws-sdk/client-sqs'
    targetSkill: queues
    message: 'Third-party job queue detected — Vercel Queues provides durable topics with retries and fan-out without running a broker. Loading Queues guidance.'
    skipIfFileContains: '@vercel/queue'

---

# Vercel Queues

你是 Vercel Queues 专家，这是 Vercel 上为后台工作和智能体事件提供支持的持久化消息主题。

## 它是什么

Vercel Queues（公开测试）为你提供持久化、仅追加的主题。生产者发布 JSON 消息，每个已订阅的消费者组都以至少一次投递和自动重试接收每条消息。新的消费者组可以稍后加入并重放未过期的历史。Queues 是 Vercel Workflows 之下的基础原语；当你需要控制发布、消费和路由时，直接使用 Queues。

- **主题（Topic）**：一个命名的、持久化的消息日志，在首次发布时创建
- **消费者组**：一个独立的订阅者，接收某个主题上的每条消息
- **投递**：至少一次；处理器必须幂等
- **保留期**：默认 24 小时，最长 7 天；投递最多可延迟到保留期
- **模式**：推送（Vercel 调用你的函数）或轮询（你自己的 worker 从任意环境拉取消息）

## 选择 Queues 还是 Workflows

| 需求 | 使用 | 理由 |
|------|-----|-----|
| 即发即忘的后台任务、扇出、缓冲 | **Queues** | 直接发布/消费，独立的消费者组 |
| 带休眠、钩子或人工审批的多步逻辑 | **Workflows**（`⤳ skill: workflow`） | 构建于 Queues 之上的持久化步骤和重放 |
| 基于 cron 的调度调用 | Cron Jobs（`⤳ skill: vercel-functions`） | 基于时间的触发，而非基于消息 |

## 快速开始（Next.js App Router）

安装 SDK：

```bash
npm install @vercel/queue
```

从任意路由、Server Action 或函数发布：

```ts
// app/api/orders/route.ts
import { send } from '@vercel/queue';

export async function POST(request: Request) {
  const body = await request.json();
  const { messageId } = await send('orders', { orderId: body.orderId, action: 'process' });
  return Response.json({ messageId });
}
```

用推送模式处理器消费。处理器返回时消息被确认，抛出异常时重试：

```ts
// app/api/queues/process-order/route.ts
import { handleCallback } from '@vercel/queue';

export const POST = handleCallback(async (message, metadata) => {
  await processOrder(message);
  console.log('processed', metadata.messageId, 'delivery', metadata.deliveryCount);
});
```

在 `vercel.json`（或 `vercel.ts`）中注册消费者，以便 Vercel 将该主题路由到那个函数：

```json filename="vercel.json"
{
  "functions": {
    "app/api/queues/process-order/route.ts": {
      "experimentalTriggers": [{ "type": "queue/v2beta", "topic": "orders" }]
    }
  }
}
```

在本地开发之前运行 `vercel link` 和 `vercel env pull`，以便 SDK 能够认证。

## 发送选项

```ts
await send('orders', payload, {
  region: 'sfo1',            // target a specific region
  retentionSeconds: 3600,    // message TTL; min 60, max 604800 (7 days); default 24 hours
  delaySeconds: 60,          // delay first delivery; max 7 days, capped at the TTL
  idempotencyKey: 'order-123', // duplicates within min(retention, 24 hours) are dropped
  headers: { 'x-trace-id': 'abc-123' },
});
```

当你需要默认值、固定区域或多个客户端时，创建一个 `QueueClient`：

```ts
// lib/queue.ts
import { QueueClient } from '@vercel/queue';

const queue = new QueueClient({ region: 'sfo1' });
export const { send, handleCallback } = queue;
```

## 消费者选项和重试

`handleCallback(handler, options)` 接受：

| 选项 | 默认值 | 说明 |
|--------|---------|-------|
| `visibilityTimeoutSeconds` | 300 | 消息保持“处理中”的时长；处理器运行期间 SDK 会重新延长租约 |
| `retry` | 触发 `retryAfterSeconds`（60s） | `(error, metadata) => { afterSeconds } \| { acknowledge: true } \| undefined` |

通过在投递次数阈值后确认来处理毒消息（poison message）：

```ts
export const POST = handleCallback(processOrder, {
  retry: (error, metadata) => {
    if (metadata.deliveryCount > 5) return { acknowledge: true }; // stop retrying
    return { afterSeconds: Math.min(300, 2 ** metadata.deliveryCount * 5) };
  },
});
```

`metadata` 包含 `messageId`、`deliveryCount`、`createdAt`、`expiresAt`、`topicName`、`consumerGroup` 和 `region`。

对于 Express、Connect 或 Next.js Pages Router 处理器，从 `QueueClient` 实例使用 `queue.handleNodeCallback(async (message, metadata) => ...)`，它接收 `(req, res)`。

## 其他运行时和框架

- **Python**：`vercel-queue` 以相同的主题模型发布和消费，FastAPI、Flask 和 Django 应用可以使用它；Celery 和 Dramatiq 集成记录在 Python 后端框架下。
- **Nitro / Nuxt**：在 `nitro.config.ts` 中声明 `vercel.queues.triggers`，并使用 `vercel:queue` 运行时钩子处理消息；`@vercel/queue` 的 `send` 在任意服务端路由中都可用。
- **轮询模式**：当向 Vercel Function 的推送投递不适合时，在任意环境中从你自己的 worker 拉取消息。在 Vercel 上，将常驻的轮询模式消费者作为 daemon 运行（`⤳ skill: daemons`）。
- **负载**：默认 JSON；在构造 `QueueClient` 时，对二进制使用 `BufferTransport`，对大体量正文使用 `StreamTransport`。

## 错误

`@vercel/queue` 导出带类型的错误：`UnauthorizedError`、`BadRequestError`、`MessageNotFoundError` 和 `QueueEmptyError`。重复的幂等键不会抛错；重复项会被静默丢弃。

## 常见陷阱

1. **缺少触发器**：没有 `experimentalTriggers` 条目的 `handleCallback` 路由永远不会收到消息。在 `vercel.json`/`vercel.ts` 中注册每个消费者。
2. **非幂等处理器**：投递是至少一次。将副作用以 `metadata.messageId` 或你自己的 `idempotencyKey` 作为键。
3. **永久重试**：如果没有确认毒消息的 `retry` 策略或触发器 `maxDeliveries` 上限，永久失败的消息会被重新投递直到过期。
4. **用 Queues 处理多步逻辑**：如果你需要在步骤之间休眠、钩子或审批，使用 Workflows 而不是手工串联主题。
5. **本地开发缺少凭据**：先运行 `vercel link` 和 `vercel env pull`；否则 `send()` 会抛出 `Failed to get OIDC token for local development`。

## 参考资料

- 📖 文档：https://vercel.com/docs/queues
- 📖 JS SDK：https://vercel.com/docs/queues/sdk
- 📖 Python SDK：https://vercel.com/docs/queues/python-sdk
- 📖 轮询模式：https://vercel.com/docs/queues/poll-mode
- 📖 定价和限制：https://vercel.com/docs/queues/pricing
