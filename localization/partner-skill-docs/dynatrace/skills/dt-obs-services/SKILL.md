---
name: dt-obs-services
description: >-
  使用 RED 指标（速率、错误、持续时间）进行服务性能监控，以及对 Java、.NET、Node.js、Python、PHP 和 Go 的运行时特定
  遥测。用于分析服务健康、
  SLA 合规性或运行时问题。
  触发词："service response time"、"error rate"、"throughput"、"SLA compliance"、
  "service mesh overhead"、"JVM GC"、"Java heap"、"Node.js event loop"、".NET CLR"、
  "Python threads"、"PHP OPcache"、"Go goroutines"、"service performance"、
  "p95 latency"、"request failures"、"database response time by name"。
  不用于解释现有查询、产品文档问题、
  基础设施指标（请使用 dt-obs-hosts）、日志分析（请使用 dt-obs-logs），
  或分布式追踪工作流（请使用 dt-obs-tracing）。
license: Apache-2.0
---

# 应用服务技能

使用 DQL 监控应用服务的性能、健康和运行时特定的指标。

---

## 核心能力

### 1. 服务性能（RED 指标）

使用基于指标的时间序列查询监控服务的**速率、错误、持续时间**。

**关键指标：**
- `dt.service.request.response_time` - 响应时间（微秒）
- `dt.service.request.count` - 请求数
- `dt.service.request.failure_count` - 失败请求数

**常见用例：**
- 响应时间监控（avg、p50、p95、p99）
- 错误率追踪和尖峰检测
- 流量分析（吞吐量、峰值、增长）
- 性能退化检测
- 多集群比较

**快速示例：**
```dql
timeseries {
  p95 = percentile(dt.service.request.response_time, 95),
  total_requests = sum(dt.service.request.count),
  failures = sum(dt.service.request.failure_count)
}, by: {dt.service.name}
| fieldsAdd p95_ms = p95[] / 1000, error_rate_pct = (failures[] * 100.0) / total_requests[]
```

→ **详细查询：** 参见 [references/service-metrics.md](references/service-metrics.md)

### 2. 高级服务分析

用于需要灵活过滤和自定义聚合的复杂场景的基于跨度的查询。

**用例：**
- 使用自定义阈值的 SLA 合规性追踪
- 服务健康评分（多维）
- 操作/端点级性能分析
- 自定义错误分类
- 带错误详情的失败模式检测

**快速示例：**
```dql
fetch spans, from: now() - 1h | filter request.is_root_span == true
| fieldsAdd meets_sla = if(request.is_failed == false AND duration < 3s, 1, else: 0)
| summarize total = count(), sla_compliant = sum(meets_sla), by: {dt.service.name}
| fieldsAdd sla_compliance_pct = (sla_compliant * 100.0) / total
```

→ **详细查询：** 参见 [references/service-metrics.md](references/service-metrics.md)

### 3. 服务消息指标

监控基于消息的服务通信（队列、主题）。

**关键指标：**
- `dt.service.messaging.publish.count` - 发送到队列或主题的消息
- `dt.service.messaging.receive.count` - 从队列或主题接收的消息
- `dt.service.messaging.process.count` - 成功处理的消息
- `dt.service.messaging.process.failure_count` - 处理失败的消息

**用例：**
- 消息吞吐量监控（发布/接收速率）
- 消息处理失败追踪
- 队列/主题健康分析
- 消费者滞后检测（发布 vs 接收速率比较）

**快速示例：**
```dql
timeseries {
  published = sum(dt.service.messaging.publish.count),
  received = sum(dt.service.messaging.receive.count),
  processed = sum(dt.service.messaging.process.count),
  failed = sum(dt.service.messaging.process.failure_count)
}, by: {dt.service.name}
```

→ **详细查询：** 参见 [references/service-metrics.md](references/service-metrics.md)

### 4. 服务网格监控

监控服务网格入口性能和开销。

**关键指标：**
- `dt.service.request.service_mesh.response_time` - 网格响应时间（微秒）
- `dt.service.request.service_mesh.count` - 网格请求数
- `dt.service.request.service_mesh.failure_count` - 网格失败数

**用例：**
- 网格 vs 直接性能比较
- 网格开销计算
- 网格失败分析
- gRPC 流量监控
- 多集群网格性能

**快速示例：**
```dql
timeseries {
  direct_p95 = percentile(dt.service.request.response_time, 95),
  mesh_p95 = percentile(dt.service.request.service_mesh.response_time, 95)
}, by: {dt.service.name}
| fieldsAdd mesh_overhead_ms = (mesh_p95[] - direct_p95[]) / 1000
```

→ **详细查询：** 参见 [references/service-metrics.md](references/service-metrics.md)

### 5. 运行时特定监控

技术特定的运行时性能和资源使用指标。

**Java/JVM** - [references/java.md](references/java.md)
- 内存：堆、池、元空间
- GC：影响、暂停、频率、暂停时间
- 线程：计数监控、泄漏检测
- 类：加载、卸载、增长

**Node.js** - [references/nodejs.md](references/nodejs.md)
- 事件循环：利用率、活跃句柄
- V8 堆：已用内存、总量
- GC：收集时间、暂停
- 进程：RSS 内存

**.NET CLR** - [references/dotnet.md](references/dotnet.md)
- 内存：按代消耗
- GC：收集计数、暂停时间
- 线程池：线程、排队工作
- JIT：编译时间

**Python** - [references/python.md](references/python.md)
- 线程：活跃线程数
- 堆：已分配块
- GC：按代收集、暂停时间
- 对象：已收集、不可收集

**PHP** - [references/php.md](references/php.md)
- OPcache：命中率、内存、重启
- GC：有效性、持续时间
- JIT：缓冲区使用
- Interned 字符串：使用、缓冲区

**Go** - [references/go.md](references/go.md)
- Goroutines：计数、泄漏检测
- GC：暂停、收集时间
- 内存：按状态的堆、已提交
- 调度器：工作线程、队列大小
- CGo：调用频率

---

## 何时使用此技能

✅ **用于：**
- 监控服务性能（响应时间、错误、流量）
- 计算 SLA 合规性
- 分析服务网格性能
- 监控消息吞吐量和处理失败
- 排查运行时特定问题（GC、内存、线程）
- 多集群服务比较
- 操作/端点级分析

❌ **不用于：**
- 基础设施指标（使用基础设施技能）
- 日志分析（使用日志技能）
- 分布式追踪工作流（使用追踪/跨度技能）
- 数据库性能（使用数据库技能）
- 产品文档或如何配置的问题 → 使用 `ask-dynatrace-docs`

---

## 智能体指令

### 先行动，后细化

当用户请求分析 —— 阈值检查、异常检测、性能
比较 —— 时，**立即**使用合理的默认值继续。不要向用户
询问你可以合理假设的参数值。

为什么这很重要：分析工具（例如 `static-threshold-analyzer`）需要特定的
输入，如阈值和服务范围。用户期望的是结果，而不是一次
参数访谈。选择合理的默认值，在响应中清楚说明它们，
并让用户细化。

**未指定时的默认值：**

| 参数 | 默认值 | 理由 |
|-----------|---------|-----------|
| 响应时间阈值 | 1000 ms（= 指标基本单位中的 1,000,000 µs） | 常见的 SLA 边界 |
| 服务范围 | 所有服务 | 显示最相关的违规 |
| 时间范围 | 来自请求，或阈值检查为最近 30 分钟，一般分析为 2 小时 | 匹配典型的运维窗口 |

**示例：阈值违规请求**
1. 使用 `create-dql` 构建按 `dt.smartscape.service` 分组的 `avg(dt.service.request.response_time)` 时间序列查询
2. 将查询传给 `static-threshold-analyzer`，threshold = 1000000（µs），alertCondition = ABOVE
3. 使用 `get-entity-name` 将实体 ID 解析为名称
4. 呈现违规，包含服务名称、时间戳、值和持续时间

**解读用户措辞：** 像"the fixed threshold"、"a threshold"或"the limit"这样的短语
命名的是*分析类型* —— 静态阈值检查 —— 而不是用户期望你已知道的具体数字。
"Fixed"将静态截止与动态或季节性基线区分开来。
当你看到这些短语时，应用上表中的 1000 ms 默认值并呈现
结果 —— 然后如果默认值不符合其意图，用户可以细化。

### 范围边界

此技能仅涵盖**服务性能指标和运行时监控**。如果
用户询问产品文档或配置问题（例如"How do I add custom
sensors?"、"How do I configure service detection?"），改用 `ask-dynatrace-docs` ——
此技能不包含配置操作方法。

### 理解用户意图

**将用户问题映射到能力：**

| 用户请求 | 使用能力 | 关键文件 |
|--------------|----------------|-----------|
| "service performance"、"response time"、"error rate" | 服务性能（RED） | service-metrics.md |
| "SLA tracking"、"health scoring" | 高级服务分析 | service-metrics.md |
| "service mesh"、"Istio"、"Linkerd"、"mesh overhead" | 服务网格监控 | service-metrics.md |
| "messaging"、"queue"、"topic"、"publish"、"consumer" | 服务消息指标 | service-metrics.md |
| "JVM GC"、"Java memory"、"heap" | 运行时特定（Java） | java.md |
| "Node.js event loop"、"V8 heap" | 运行时特定（Node.js） | nodejs.md |
| ".NET CLR"、"GC generation" | 运行时特定（.NET） | dotnet.md |
| "Python GC"、"thread count" | 运行时特定（Python） | python.md |
| "OPcache"、"PHP GC" | 运行时特定（PHP） | php.md |
| "goroutines"、"Go GC"、"scheduler" | 运行时特定（Go） | go.md |

### 查询构建模式

**1. 基于指标（timeseries）**
- **用于：** 标准监控、仪表板、告警
- **模式：** `timeseries <metric> = <aggregation>(<metric_name>), by: {dimensions}`
- **文件：** service-metrics.md、所有运行时特定文件

**2. 基于跨度（fetch spans）**
- **用于：** 复杂过滤、自定义逻辑、详细分析
- **模式：** `fetch spans | filter request.is_root_span == true | fieldsAdd ... | summarize ...`
- **文件：** service-metrics.md（高级服务分析部分）

**3. 比较查询**
- 使用 `append` 进行基线比较
- 使用 `shift: -15m` 获取时间偏移基线
- **示例：** 性能退化检测

### 响应构建指南

**始终包含：**
1. **指标名称** - 清晰的指标标识符
2. **聚合** - 数据如何聚合（avg、sum、percentile）
3. **分组** - 使用的维度（`dt.service.name`、`k8s.workload.name` 等）
4. **单位转换** - 在适当处将微秒转换为毫秒
5. **过滤** - 相关阈值或条件

**引用运行时特定内容时：**
- **先检查**用户的技术栈
- **只提供**相关的运行时查询（不要用全部 6 种运行时淹没他们）
- **解释**运行时特定指标（例如"OPcache 命中率"衡量 PHP 操作码缓存效率）

---

## 常见工作流

### 工作流：服务健康检查
```
1. Check response time (RED metrics)
2. Check error rate (RED metrics)
3. Check traffic patterns (RED metrics)
4. If runtime-specific issues suspected → Load runtime-specific reference
```

### 工作流：SLA 监控
```
1. Define SLA criteria (e.g., < 3s response time AND < 1% error rate)
2. Use span-based query for custom SLA logic
3. Calculate compliance percentage
4. Filter non-compliant services
```

### 工作流：服务网格分析
```
1. Check mesh response time
2. Compare mesh vs direct performance
3. Calculate mesh overhead
4. Analyze mesh failure rates
```

### 工作流：运行时故障排查
1. 识别技术栈 → 加载运行时特定参考
2. 检查内存/GC 指标 → 线程/goroutines → 运行时特性

---

## 故障排查

| 问题 | 原因 | 解决方案 |
|---------|-------|----------|
| 响应时间值看起来太大 | 指标以微秒为单位 | 除以 1000 转换为毫秒 |
| 服务网格指标无数据 | 未配置服务网格 | 验证启用了网格 sidecar 注入 |
| 运行时指标缺失 | 技术错误或没有 OneAgent | 确认运行时受支持且 OneAgent 处于活跃状态 |
| `dt.smartscape.service` 返回 SmartscapeId 而非名称 | 需要实体名称解析 | 使用 `getNodeName(dt.smartscape.service)` |
| 错误率始终为零 | 使用了错误的失败指标 | 使用 `dt.service.request.failure_count`，而不是自定义字段 |

---

## 参考

**核心服务监控：**
- [references/service-metrics.md](references/service-metrics.md) - 完整的 RED 指标、SLA 追踪、服务网格查询

**运行时特定监控：**
- [references/java.md](references/java.md) - Java/JVM 监控
- [references/nodejs.md](references/nodejs.md) - Node.js 监控
- [references/dotnet.md](references/dotnet.md) - .NET CLR 监控
- [references/python.md](references/python.md) - Python 监控
- [references/php.md](references/php.md) - PHP 监控
- [references/go.md](references/go.md) - Go 运行时监控
