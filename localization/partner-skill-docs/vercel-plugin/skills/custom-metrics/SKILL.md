---
name: custom-metrics
description: 发送和查询 Vercel Custom Metrics。在 Vercel Functions 中对应用或业务度量进行埋点、使用 @vercel/functions 的 metric()、选择指标名称和属性，或用 vc metrics 查询已发送的值时使用。
summary: Emit numeric measurements from Functions and query them with vc metrics
metadata:
  priority: 9
  docs:
    - "https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package"
    - "https://vercel.com/docs/cli/metrics"
    - "https://vercel.com/docs/observability/observability-plus"
  sitemap: "https://vercel.com/sitemap/docs.xml"
  pathPatterns: []
  bashPatterns:
    - '\b(?:vercel|vc)\s+metrics\s+(?!schema(?:\s|$)|vercel\.)[A-Za-z_][A-Za-z0-9_./-]*\b'
    - '\b(?:vercel|vc)\s+metrics\s+schema\s+(?!vercel\.)[A-Za-z_][A-Za-z0-9_./-]*\b'
  importPatterns: []
  promptSignals:
    phrases:
      - "custom metric"
      - "custom metrics"
      - "emit a metric"
      - "emit metrics"
      - "report a metric"
      - "report metrics"
      - "application metrics"
      - "business metrics"
      - "@vercel/functions metric"
    allOf:
      - [emit, metric]
      - [report, metric]
      - [instrument, metric]
      - [vercel, metric]
    anyOf:
      - "observability"
      - "instrumentation"
      - "duration"
      - "counter"
      - "percentile"
    noneOf:
      - "font metrics"
      - "core web vitals"
    minScore: 6
retrieval:
  aliases:
    - Vercel application metrics
    - Vercel business metrics
    - function metrics
    - vc metrics
  intents:
    - emit a custom metric
    - instrument a Vercel Function
    - query a custom metric
    - measure application behavior
  entities:
    - metric
    - "@vercel/functions"
    - Vercel Custom Metrics
    - vc metrics
    - Observability Plus
  examples:
    - emit checkout duration as a custom metric
    - add a business counter to this Vercel Function
    - query my custom metric with vc metrics
    - group an application metric by outcome
---

# Vercel Custom Metrics

对于由运行在 Vercel Function 中的服务端代码发出的数值型应用和业务度量，使用 Custom Metrics。工作流是：**用 `metric()` 发送一个数值样本 → 调用已部署的函数 → 用 `vc metrics` 或 Observability 发现并查询该指标**。

## 发送指标

安装或升级 `@vercel/functions`，然后从其根入口点导入 `metric`：

```bash
pnpm add @vercel/functions
```

```ts
import { metric } from '@vercel/functions';

export async function POST() {
  const startedAt = performance.now();

  try {
    await createOrder();
    metric('orders.created', 1, { outcome: 'success' });
    return Response.json({ ok: true });
  } catch (error) {
    metric('orders.created', 1, { outcome: 'error' });
    throw error;
  } finally {
    metric('orders.duration_ms', performance.now() - startedAt);
  }
}
```

签名是：

```ts
metric(name: string, value: number, tags?: Record<string, string>): void
```

- `name` 标识一个稳定的度量，例如 `orders.created` 或 `orders.duration_ms`。
- `value` 是数值样本。对于将被求和的增量发送 `1`；对于时长、大小或分数发送观察到的值。
- `tags` 是可选的字符串属性。摄取后，被发现的标签键将作为维度出现，用于过滤和分组。
- `metric()` 是同步的并返回 `void`；不要 `await` 它。
- 当运行时不支持 Custom Metrics 时，该辅助函数是空操作。通过一次已部署的 Vercel Function 调用来验证埋点，而不要仅依赖本地执行。

## 为有用的查询建模指标

- 优先使用稳定的、带点号的名称，并在有用时带单位后缀：`checkout.completed`、`checkout.duration_ms`、`queue.batch_size`。
- 不要为应用定义的名称使用保留的 `vercel.` 前缀。
- 把可变数据放在标签中，而不是指标名称中。使用 `checkout.completed` 搭配 `{ plan: 'pro' }`，而不是 `checkout.completed.pro`。
- 保持标签基数有界。好的标签是 `outcome`、`plan`、`provider` 或规范化的路由。不要附加用户 ID、请求 ID、电子邮件地址、原始 URL 或其他唯一或敏感的值。
- 在结果已知的那个点发送一个样本。对于可重试或至少一次的工作，决定意图度量的是尝试次数还是成功的逻辑操作，并据此命名指标。

选择与所发送内容匹配的查询聚合方式：

| 度量 | 发送 | 查询 |
| --- | --- | --- |
| 出现次数或增量 | `metric('checkout.completed', 1)` | `sum` 或 `persecond` |
| 时长或大小 | `metric('checkout.duration_ms', duration)` | `avg`、`p75`、`p95`、`max` |
| 采样水平 | `metric('queue.batch_size', size)` | `avg`、`min`、`max`、百分位数 |

## 发现并查询指标

至少运行一次已部署的代码，然后使用已关联的项目和正确的团队范围：

```bash
vc metrics schema
vc metrics schema orders.duration_ms

vc metrics orders.created -a sum --group-by outcome --since 24h
vc metrics orders.duration_ms -a p95 --since 1h
vc metrics orders.duration_ms -a p95 --group-by outcome --since 24h --format=json
```

`vc` 和 `vercel` 等价。始终先用 `vc metrics schema <name>` 检查确切的指标，因为 schema 会报告可用的聚合方式和已发现的标签维度。当当前关联或范围不明确时，使用 `-S <team>` 和 `-p <project>`；仅在有意进行团队范围查询时才使用 `--all`。

查询 Custom Metrics 需要 Observability Plus 以及所选团队的可用性。如果指标缺失：

1. 确认函数已部署到 Vercel，且埋点路径确实执行过。
2. 确认 `@vercel/functions` 导出了 `metric`；如有必要请升级它。
3. 检查 `vc whoami`、所选团队和已关联的项目。
4. 考虑摄取延迟，然后重新运行 `vc metrics schema`。
5. 确认该团队已启用 Observability Plus 和 Custom Metrics。

## 使用正确的信号

- 对于你想聚合、观察趋势和过滤的数值，使用 **Custom Metrics**。
- 对于 Web Analytics 中的用户交互和转化事件，使用 **Web Analytics 自定义事件**。
- 对于追踪（trace）、操作计时和请求因果关系，使用 **OpenTelemetry span**。
- 对于详细的诊断上下文和单条记录，使用 **日志**。

不要将详细的事件负载编码进指标标签。当调查需要逐请求的细节时，将低基数指标与结构化日志或追踪搭配使用。
