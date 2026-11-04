---
name: dt-obs-tracing
description: >-
  分布式追踪、跨度、服务依赖和请求流分析。用于
  调查跨度级细节、失败、性能瓶颈或追踪关联。
  触发词："trace analysis"、"slow requests"、"failed spans"、"service dependencies"、
  "distributed trace"、"span details"、"HTTP status codes in traces"、"database query spans"、
  "messaging spans"、"gRPC calls"、"Lambda cold starts"、"trace ID lookup"、
  "exception analysis"、"correlate logs and traces"、"request attributes"。
  不用于解释现有查询、产品文档或配置问题、
  服务级 RED 指标（请使用 dt-obs-services）、日志搜索（请使用 dt-obs-logs），
  或问题分析（请使用 dt-obs-problems）。
license: Apache-2.0
---

# 应用追踪技能

## 概述

Dynatrace 中的分布式追踪由跨度组成 —— 代表工作单元的基础构建块。借助 Grail 中的 Traces，每个跨度都可以通过 DQL 访问，并可对所有属性进行全文搜索。此技能涵盖追踪基础、常见分析模式和跨度类型特定的查询。

---

## 用例

### 1. 调查慢请求
- **目标：** 查找并诊断超过延迟阈值的请求
- **触发：** "slow requests"、"high latency"、"p99 response time"、"find traces over 5 seconds"
- **完成：** 慢追踪列表，包含持续时间、端点、服务和 trace ID 用于下钻

### 2. 分析请求失败
- **目标：** 识别失败请求、失败原因和异常模式
- **触发：** "failed spans"、"HTTP 500 errors"、"exception analysis"、"failure rate by service"
- **完成：** 按原因（HTTP 代码、异常、gRPC 状态）的失败细分，附示例追踪

### 3. 绘制服务依赖
- **目标：** 理解服务到服务的通信模式和外部 API 调用
- **触发：** "service dependencies"、"what services does X call"、"outgoing HTTP calls"
- **完成：** 显示服务之间调用次数、延迟和错误率的依赖图

---

## 核心概念

### 理解追踪和跨度

**跨度**代表分布式追踪中的逻辑工作单元：
- HTTP 请求、RPC 调用、数据库操作
- 消息系统交互
- 内部函数调用
- 自定义插桩点

**跨度类型**：
- `span.kind: server` - 到服务的入站调用
- `span.kind: client` - 来自服务的出站调用
- `span.kind: consumer` - 到服务的入站消息消费调用
- `span.kind: producer` - 来自服务的出站消息生产调用
- `span.kind: internal` - 服务内部的内部操作

**根跨度**：请求根跨度（`request.is_root_span == true`）代表到服务的入站调用。用它分析端到端请求性能。

### 关键追踪属性

追踪分析的基本属性：

| 属性 | 描述 |
|-----------|-------------|
| `trace.id` | 唯一追踪标识符 |
| `span.id` | 唯一跨度标识符 |
| `span.parent_id` | 父跨度 ID（根跨度为空） |
| `request.is_root_span` | 布尔值，对请求入口点为 true |
| `request.is_failed` | 布尔值，请求失败时为 true |
| `duration` | 跨度持续时间（纳秒） |
| `span.timing.cpu` | 跨度的总体 CPU 时间（稳定） |
| `span.timing.cpu_self` | 排除子跨度的 CPU 时间（稳定） |
| `dt.smartscape.service` | 服务 Smartscape 节点 ID |
| `dt.service.name` | 由服务检测规则推导出的 Dynatrace 服务名。它等于 Smartscape 服务节点名称。  |
| `endpoint.name` | 端点/路由名称 |

### 服务上下文

跨度通过 Smartscape 节点 ID 和检测到的服务名 `dt.service.name` 引用服务，后者也存在于每个跨度上。

```dql
fetch spans
| summarize spans=count(), by: { dt.smartscape.service, dt.service.name }
```

**节点函数**：
- `getNodeName(dt.smartscape.service)` - 添加 `dt.smartscape.service.name` 字段，含人类可读的服务名
- `getNodeField(dt.smartscape.service, "attribute_name")` - 访问特定节点属性

**📖 了解更多**：高级实体选择器、基础设施关联和硬件分析，参见 [Entity Lookups](references/entity-lookups.md)。

### 采样与外推

一个跨度可能由于以下原因代表多个真实操作：
- **聚合**：一个跨度中的多个操作（`aggregation.count`）
- **ATM（自适应流量管理）**：由代理进行的基于头的采样
- **ALR（自适应负载削减）**：服务端采样
- **读取采样**：通过 `samplingRatio` 参数的查询时采样

**何时外推**：在计数实际操作（而不仅是跨度）时始终外推。使用多重性因子：

```dql
fetch spans
| fieldsAdd sampling.probability = (power(2, 56) - coalesce(sampling.threshold, 0)) * power(2, -56)
| fieldsAdd sampling.multiplicity = 1 / sampling.probability
| fieldsAdd multiplicity = coalesce(sampling.multiplicity, 1)
                         * coalesce(aggregation.count, 1)
                         * dt.system.sampling_ratio
| summarize operation_count = sum(multiplicity)
```

**📖 了解更多**：详细公式和示例，参见 [Sampling and Extrapolation](references/sampling-extrapolation.md)。

## 常见查询模式

### 基本跨度访问

按类型获取并探索跨度：

```dql
fetch spans | limit 1
```

按函数和类型探索跨度：

```dql
fetch spans
| summarize count(), by: { span.kind, code.namespace, code.function }
```

### 请求根过滤

列出请求根跨度（入站服务调用）：

```dql
fetch spans
| filter request.is_root_span == true
| fields trace.id, span.id, start_time, response_time = duration, endpoint.name
| limit 100
```

### 服务性能摘要

分析带错误率的服务性能：

```dql
fetch spans
| filter request.is_root_span == true
| summarize
    total_requests = count(),
    failed_requests = countIf(request.is_failed == true),
    avg_duration = avg(duration),
    p95_duration = percentile(duration, 95),
    by: {dt.service.name}
| fieldsAdd error_rate = (failed_requests * 100.0) / total_requests
| sort error_rate desc
```

### Trace ID 查找

查找特定追踪中的所有跨度：

```dql
fetch spans
| filter trace.id == toUid("abc123def456")
| fields span.name, duration, dt.service.name
```

## 性能分析

### 响应时间百分位数

按端点计算百分位数：

```dql
fetch spans
| filter request.is_root_span == true
| summarize {
    requests=count(),
    avg_duration=avg(duration),
    p95=percentile(duration, 95),
    p99=percentile(duration, 99)
  }, by: { endpoint.name }
| sort p99 desc
```

**💡 最佳实践**：性能洞察使用百分位数（p95、p99）而非平均值。

### 慢追踪检测

查找超过阈值的请求：

```dql
fetch spans, from:now() - 2h
| filter request.is_root_span == true
| filter duration > 5s
| fields trace.id, span.name, dt.service.name, duration
| sort duration desc
| limit 50
```

### 带示例的持续时间桶

```dql
fetch spans, from:now() - 24h
| filter http.route == "/api/v1/storage/findByISBN"
| summarize {
    spans=count(),
    trace=takeAny(record(start_time, trace.id))
  }, by: { bin(duration, 10ms) }
| fields `bin(duration, 10ms)`, spans, trace.id=trace[trace.id], start_time=trace[start_time]
```

### 性能时间序列

将响应时间提取为时间序列：

```dql
fetch spans, from:now() - 24h
| filter request.is_root_span == true
| makeTimeseries {
    requests=count(),
    avg_duration=avg(duration),
    p95=percentile(duration, 95),
    p99=percentile(duration, 99)
  }, by: { endpoint.name }
```

**📖 了解更多**：高级模式和时间序列技术，参见 [Performance Analysis](references/performance-analysis.md)。

## 失败调查

### 失败请求摘要

按服务汇总失败：

```dql
fetch spans
| filter request.is_root_span == true
| summarize
    total = count(),
    failed = countIf(request.is_failed == true),
  by: { dt.service.name }
| fieldsAdd failure_rate = (failed * 100.0) / total
| sort failure_rate desc
```

### 失败原因分析

按失败检测原因细分：

```dql
fetch spans
| filter request.is_failed == true and isNotNull(dt.failure_detection.results)
| expand dt.failure_detection.results
| summarize count(), by: { dt.failure_detection.results[reason] }
```

**失败原因**：
- `http_code` - HTTP 响应代码触发失败
- `grpc_code` - gRPC 状态代码触发失败
- `exception` - 异常导致失败
- `span_status` - 跨度状态指示失败
- `custom_rule` - 匹配了自定义失败检测规则

### HTTP 代码失败

按 HTTP 状态代码查找失败：

```dql
fetch spans
| filter request.is_failed == true
| filter iAny(dt.failure_detection.results[][reason] == "http_code")
| summarize count(), by: { http.response.status_code, endpoint.name }
| sort `count()` desc
```

### 最近的失败请求

列出带详情的最近失败：

```dql
fetch spans
| filter request.is_root_span == true and request.is_failed == true
| fields
    start_time,
    trace.id,
    endpoint.name,
    http.response.status_code,
    duration
| sort start_time desc
| limit 100
```

**📖 了解更多**：异常分析和自定义规则调查，参见 [Failure Detection](references/failure-detection.md)。

## 服务依赖

### 服务到服务分析

分析服务通信模式：

```dql
fetch spans, from:now() - 1h
| filter isNotNull(server.address)
| fieldsAdd
    remote_side = server.address
| summarize
    call_count = count(),
    avg_duration = avg(duration),
    by: {dt.service.name, remote_side}
| sort call_count desc
```

### 出站 HTTP 调用

识别外部 API 依赖：

```dql
fetch spans
| filter span.kind == "client" and isNotNull(http.request.method)
| summarize
    calls = count(),
    avg_latency = avg(duration),
    p99_latency = percentile(duration, 99),
  by: { dt.service.name, server.address, server.port }
| sort calls desc
```

## 追踪聚合

### 完整追踪分析

聚合追踪中的所有跨度以理解完整请求流：

```dql
fetch spans, from:now() - 30m
| summarize {
    spans = count(),
    client_spans = countIf(span.kind == "client"),

    // Endpoints involved in the trace
    endpoints = toString(arrayRemoveNulls(collectDistinct(endpoint.name))),

    // Extract the first request root in the trace
    trace_root = takeMin(record(
        root_detection_helper = coalesce(
            if(request.is_root_span, 1),
            if(isNull(span.parent_id), 2),
            3),
        start_time, endpoint.name, duration
      ))
}, by: { trace.id }

| fieldsFlatten trace_root
| fieldsRemove trace_root.root_detection_helper, trace_root

| fields
    start_time = trace_root.start_time,
    endpoint = trace_root.endpoint.name,
    response_time = trace_root.duration,
    spans,
    client_spans,
    endpoints,
    trace.id
| sort start_time
| limit 100
```

**根检测策略**：使用 `takeMin(record(...))` 配合检测辅助器可靠地找到根请求：
1. 优先级 1：`request.is_root_span == true` 的跨度
2. 优先级 2：没有父跨度的跨度（根跨度）
3. 优先级 3：所有其他跨度

### 多服务追踪

查找跨多个服务的追踪：

```dql
fetch spans, from:now() - 1h
| summarize {
    services = collectDistinct(dt.service.name),
    trace_root = takeMin(record(root_detection_helper = coalesce(if(request.is_root_span, 1), 2), endpoint.name))
}, by: { trace.id }
| fieldsAdd service_count = arraySize(services)
| filter service_count > 1
| fields endpoint = trace_root[endpoint.name], service_count, services = toString(services), trace.id
| sort service_count desc
| limit 50
```

## 请求级分析

### 请求属性

访问 OneAgent 在请求根跨度上捕获的自定义请求属性：

```dql
fetch spans
| filter request.is_root_span == true
| filter isNotNull(request_attribute.PaidAmount)
| makeTimeseries sum(request_attribute.PaidAmount)
```

**字段模式**：`request_attribute.<name>`、`captured_attribute.<name>`（始终为数组）

→ [Request Attributes](references/request-attributes.md) —— 请求属性、捕获属性和请求 ID 聚合的完整模式

## 跨度类型

| 跨度类型 | 检测 | 关键字段 | 参考 |
|-----------|-----------|------------|-----------|
| HTTP 服务器（入站） | `span.kind == "server" and isNotNull(http.request.method)` | `http.route`、`http.request.method`、`http.response.status_code` | [http-spans.md](references/http-spans.md) |
| HTTP 客户端（出站） | `span.kind == "client" and isNotNull(http.request.method)` | `server.address`、`server.port` | [http-spans.md](references/http-spans.md) |
| 数据库 | `span.kind == "client" and isNotNull(db.system)` | `db.system`、`db.namespace`、`db.statement` | [database-spans.md](references/database-spans.md) |
| 消息 | `isNotNull(messaging.system)` | `messaging.system`、`messaging.destination.name`、`messaging.operation.type` | [messaging-spans.md](references/messaging-spans.md) |
| RPC / gRPC | `isNotNull(rpc.system)` | `rpc.system`、`rpc.service`、`rpc.method`、`rpc.grpc.status_code` | [rpc-spans.md](references/rpc-spans.md) |
| Serverless / FaaS | `isNotNull(faas.name) and span.kind == "server"` | `faas.name`、`faas.trigger.type`、`cloud.provider` | [serverless-spans.md](references/serverless-spans.md) |

**⚠️ 数据库跨度**：可能被聚合（一个跨度 = 多次调用）。始终使用 `aggregation.count` 外推以获得准确的操作计数。

**📖 每种跨度类型的详细模式：** 参见上述参考文件。

## 高级主题

### 异常分析

异常存储为跨度内的 `span.events`：

```dql
fetch spans
| filter iAny(span.events[][span_event.name] == "exception")
| expand span.events
| fieldsFlatten span.events, fields: { exception.type }
| summarize {
    count(),
    trace=takeAny(record(start_time, trace.id))
  }, by: { exception.type }
| fields exception.type, `count()`, trace.id=trace[trace.id], start_time=trace[start_time]
```

**💡 提示**：使用 `iAny()` 检查跨度事件数组内的条件。

→ [Logs Correlation](references/logs-correlation.md) —— 连接日志和追踪，按日志内容过滤追踪
→ [Network Analysis](references/networking-analysis.md) —— 客户端 IP、DNS 解析、子网分析

## 最佳实践

| 领域 | 规则 |
|------|------|
| **过滤** | 先应用 `request.is_root_span == true` 和端点过滤器 |
| **采样** | 使用 `samplingRatio`（例如 `100` = 读取 1%）以提升性能 |
| **百分位数** | 性能分析使用 p95/p99 而非平均值 |
| **根跨度** | 端到端分析使用 `request.is_root_span == true` |
| **追踪分组** | 按 `trace.id` 分组以获取完整追踪指标 |
| **请求分组** | 按 `request.id` 分组以获取仅 OneAgent 的请求指标 |
| **外推** | 始终应用多重性以获得准确的操作计数 |
| **示例** | 使用 `takeAny(record(start_time, trace.id))` 启用 UI 下钻 |

---

## 故障排查

| 问题 | 原因 | 解决方案 |
|---------|-------|----------|
| 持续时间值看起来不对（太大） | `duration` 以纳秒为单位，而非毫秒 | 除以 `1000000` 或与 `5s`（DQL 持续时间字面量）比较 |
| 跨度计数与预期请求量不符 | 未考虑采样或聚合 | 使用多重性外推 —— 参见 Sampling and Extrapolation 参考 |
| `getNodeName(dt.smartscape.service)` 返回 null | 服务尚未解析或 OneAgent 未监控 | 验证 OneAgent 监控该服务；实体解析可能有短暂延迟 |
| `request.is_root_span` 过滤器不返回任何内容 | 查询仅 OpenTelemetry 的追踪而无 OneAgent | 使用 `isNull(span.parent_id)` 作为根跨度检测的后备方案 |
| `trace.id` 过滤器不返回结果 | Trace ID 未转换为 UID 格式 | 对基于字符串的 trace ID 使用 `filter trace.id == toUid("abc123...")` |
| 数据库跨度计数太少 | 数据库跨度被聚合（一个跨度 = N 次调用） | 数据库操作计数始终使用 `aggregation.count` 外推 |

## 相关技能

- **dt-dql-essentials** —— 查询追踪数据的核心 DQL 语法
- **dt-app-dashboards** —— 将追踪查询嵌入仪表板
- **dt-migration** —— Smartscape 实体模型和关系导航

---

## 参考

特定主题的详细文档：

- **[Performance Analysis](references/performance-analysis.md)** - 高级时间序列、持续时间桶、端点排名
- **[Failure Detection](references/failure-detection.md)** - 失败原因、异常调查、自定义规则
- **[Sampling and Extrapolation](references/sampling-extrapolation.md)** - 多重性计算、数据库外推
- **[Request Attributes](references/request-attributes.md)** - 请求属性、捕获属性、请求 ID 聚合
- **[Entity Lookups](references/entity-lookups.md)** - 高级节点查找、基础设施关联、硬件分析
- **[HTTP Span Analysis](references/http-spans.md)** - 状态代码、负载分析、客户端 IP
- **[Database Span Analysis](references/database-spans.md)** - 外推计数、慢查询、语句分析
- **[Messaging Span Analysis](references/messaging-spans.md)** - Kafka、RabbitMQ、SQS 吞吐量和延迟
- **[RPC Span Analysis](references/rpc-spans.md)** - gRPC、SOAP、服务依赖
- **[Serverless Span Analysis](references/serverless-spans.md)** - Lambda、Azure Functions、冷启动分析
- **[Logs Correlation](references/logs-correlation.md)** - 连接日志和追踪、关联模式
- **[Network Analysis](references/networking-analysis.md)** - IP 地址、DNS 解析、通信映射
