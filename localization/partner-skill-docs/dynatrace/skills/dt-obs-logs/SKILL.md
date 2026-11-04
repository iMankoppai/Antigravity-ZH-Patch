---
name: dt-obs-logs
description: >-
  日志查询、过滤、模式分析和错误率计算。用于搜索
  应用或基础设施日志、分析错误模式或关联日志数据。
  触发词："show error logs"、"search logs for keyword"、"log error rate"、"recent errors"、
  "logs from last hour"、"find log entries"、"top error messages"、"log patterns"、
  "parse JSON logs"、"logs by process group"、"log trends over time"、
  "log entry counts per minute"。
  不用于解释现有查询、产品文档问题、
  分布式追踪或跨度分析（请使用 dt-obs-tracing）。
license: Apache-2.0
---

# 日志分析技能

使用 DQL 查询、过滤和分析 Dynatrace 日志数据，用于故障排查和监控。

## 此技能涵盖的内容

- 按严重程度、内容和实体获取并过滤日志
- 使用模式匹配搜索日志消息
- 计算错误率和统计数据
- 分析日志模式和趋势
- 按维度对日志数据进行分组和聚合

> **需要跨源连接：** 如果查询必须将日志与主机属性
> （OS 类型、主机名、IP 地址、云提供商）结合 → 在编写查询之前还要阅读
> `dt-dql-essentials/references/smartscape-topology-navigation.md`。

---

## 用例
当用户想要执行以下操作时使用此技能：
- 查找特定日志条目（例如"显示过去一小时的错误日志"）
- 按严重程度、进程组或内容过滤日志
- 在日志中搜索特定关键字或短语
- 计算错误率或日志统计数据
- 识别常见的错误消息或模式
- 分析日志随时间变化的趋势
- 使用日志数据排查问题

## 关键概念

### 日志数据模型
- **timestamp**：日志条目创建时间
- **content**：日志消息文本
- **status**：日志级别（ERROR、FATAL、WARN、INFO 等）
- **dt.process_group.id**：关联的进程组实体
- **dt.process_group.detected_name**：将进程组 ID 解析为人类可读的名称

### 查询模式
- **fetch logs**：日志数据访问的主要命令
- **时间范围**：使用 `from:now() - <duration>` 表示时间窗口
- **过滤**：应用严重程度、内容和实体过滤器
- **聚合**：分组并汇总日志数据
- **模式检测**：使用 `matchesPhrase()` 和 `contains()` 进行内容搜索

### 常见操作
- 严重程度过滤（单级或多级）
- 内容搜索（简单和全文）
- 基于实体的过滤（进程组）
- 时间序列分析（分桶、排序）
- 错误率计算
- 模式分析（异常、超时等）

## 核心工作流

### 1. 日志搜索
按时间、严重程度和内容查找特定日志条目。

**典型步骤**：
1. 定义时间范围
2. 按严重程度过滤（可选）
3. 在内容中搜索关键字
4. 选择相关字段
5. 排序并限制结果

**示例**：
```dql
fetch logs, from:now() - 1h
| filter status == "ERROR"
| fields timestamp, content, process_group = dt.process_group.detected_name
| sort timestamp desc
| limit 100
```

### 2. 日志过滤
使用多个条件（严重程度、实体、内容）收窄日志范围。

**典型步骤**：
1. 按时间范围获取日志
2. 应用严重程度过滤器
3. 按实体（process_group）过滤
4. 应用内容过滤器
5. 格式化并排序输出

**示例**：
```dql
fetch logs, from:now() - 2h
| filter in(status, {"ERROR", "FATAL", "WARN"})
| summarize count(), by: {dt.process_group.id, dt.process_group.detected_name}
| fieldsAdd process_group = dt.process_group.detected_name
| sort `count()` desc
```

### 3. 模式分析
识别日志数据中的模式、趋势和异常。

**典型步骤**：
1. 按时间范围获取日志
2. 添加模式检测字段
3. 按实体或时间聚合
4. 计算统计数据和比率
5. 按频率或速率排序

**示例**：
```dql
fetch logs, from:now() - 2h
| filter status == "ERROR"
| fieldsAdd
    has_exception = if(matchesPhrase(content, "exception"), true, else: false),
    has_timeout = if(matchesPhrase(content, "timeout"), true, else: false)
| summarize
    count(),
    exception_count = countIf(has_exception == true),
    timeout_count = countIf(has_timeout == true),
    by: {process_group = dt.process_group.detected_name}
```

## 关键函数

### 过滤
- `filter status == "ERROR"` - 按状态级别过滤
- `in(status, {"ERROR", "FATAL", "WARN"})` - 多状态过滤（字面量集合使用花括号）
- `contains(content, "keyword")` - 简单子串搜索
- `matchesPhrase(content, "exact phrase")` - 全文短语搜索

### 实体操作
- `dt.process_group.detected_name` - 获取人类可读的进程组名称
- `filter process_group == "service-name"` - 按特定实体过滤

### 聚合
- `count()` - 统计所有日志条目
- `countIf(condition)` - 条件计数
- `by: {dimension}` - 按实体或时间桶分组
- `bin(timestamp, 5m)` - 用于趋势的时间分桶

### 字段操作
- `fields timestamp, content, status` - 选择特定字段
- `fieldsAdd name = expression` - 添加计算字段
- `if(condition, true_value, else: false_value)` - 条件逻辑

## 常见模式

### 内容搜索
简单子串搜索：
```dql
fetch logs, from:now() - 1h
| filter contains(content, "database")
| fields timestamp, content, status
```

全文短语搜索：
```dql
fetch logs, from:now() - 1h
| filter matchesPhrase(content, "connection timeout")
| fields timestamp, content, process_group = dt.process_group.detected_name
```

### 错误率计算
计算随时间变化的错误率：
```dql
fetch logs, from:now() - 2h
| summarize
    total_logs = count(),
    error_logs = countIf(status == "ERROR"),
    by: {time_bucket = bin(timestamp, 5m)}
| fieldsAdd error_rate = (error_logs * 100.0) / total_logs
| sort time_bucket asc
```

### 顶级错误消息
查找最常见的错误：
```dql
fetch logs, from:now() - 24h
| filter status == "ERROR"
| summarize error_count = count(), by: {content}
| sort error_count desc
| limit 20
```

### 进程组特定日志
按进程组过滤日志：
```dql
fetch logs, from:now() - 1h
| fieldsAdd process_group = dt.process_group.detected_name
| filter process_group == "payment-service"
| filter status == "ERROR"
| fields timestamp, content, status
| sort timestamp desc
```

### 结构化 / JSON 日志解析
许多应用会发出 JSON 格式的日志行。使用 `parse` 提取字段，而不是转储原始内容：

```dql
fetch logs, from:now() - 1h
| filter status == "ERROR"
| parse content, "JSON:log"
| fieldsAdd level = log[level], message = log[msg], error = log[error]
| fields timestamp, level, message, error
| sort timestamp desc
| limit 50
```

按解析出的字段聚合：
```dql
fetch logs, from:now() - 4h
| filter status == "ERROR"
| parse content, "JSON:log"
| fieldsAdd message = log[msg]
| summarize error_count = count(), by: {message}
| sort error_count desc
| limit 20
```

**说明：**
- `parse content, "JSON:log"` 会创建一个记录字段 `log` —— 用 `log[key]` 访问嵌套值
- 在 `parse` **之前**用 `contains()` 过滤日志，以减少解析开销
- 适用于任何 JSON 结构化字段，而不仅是 `content`

## 最佳实践

1. **始终指定时间范围** - 使用 `from:now() - <duration>` 限制数据
2. **尽早应用过滤器** - 在聚合之前按严重程度和实体过滤
3. **使用合适的搜索方法** - `contains()` 用于简单搜索，`matchesPhrase()` 用于精确搜索
4. **限制结果** - 添加 `| limit 100` 防止输出过多
5. **有意义地排序** - 近期日志按时间戳排序，顶级错误按计数排序
6. **命名实体** - 使用 `dt.process_group.detected_name` 或 `getNodeName()` 获得人类可读输出
7. **使用时间桶分析趋势** - `bin(timestamp, 5m)` 用于时间序列分析

## 集成点

- **实体模型**：使用 `dt.process_group.id` 进行服务关联
- **时间序列**：通过 `bin()` 和时间范围支持时间分析
- **内容搜索**：通过 `matchesPhrase()` 提供全文搜索能力
- **聚合**：使用 `summarize` 和条件函数进行统计分析

## 限制与说明

- 日志可用性取决于 OneAgent 配置和日志摄取
- 全文搜索（`matchesPhrase`）在大数据集上可能有性能影响
- 实体名称需要正确的 OneAgent 监控才能解析
- 时间范围应合理（避免无界查询）

## 故障排查

| 问题 | 原因 | 解决方案 |
|---------|-------|----------|
| 未返回日志 | 缺少时间范围或范围过窄 | 加宽 `from:` 窗口；验证日志摄取是否已激活 |
| `getNodeName()` 返回 null | OneAgent 未监控该实体或实体尚未解析 | 验证 OneAgent 已部署且实体已被发现；使用 `dt.process_group.detected_name` 作为可靠替代 |
| `matchesPhrase()` 在大数据上较慢 | 全文搜索未预过滤 | 在 `matchesPhrase()` 之前添加 `filter status == "ERROR"` |
| 错误的字段名 `log.level` | 常见错误 | 严重程度请使用 `loglevel`（无点）；参见 dt-dql-essentials |
| `content` 字段为空 | 日志行为空或未被摄取 | 检查 OneAgent 中的日志源配置 |

## 相关技能

- **dt-dql-essentials** - 日志查询的核心 DQL 语法和查询结构
- **dt-obs-tracing** - 使用 trace ID 将日志与分布式追踪关联
- **dt-obs-problems** - 将日志与 DAVIS 检测到的问题关联
