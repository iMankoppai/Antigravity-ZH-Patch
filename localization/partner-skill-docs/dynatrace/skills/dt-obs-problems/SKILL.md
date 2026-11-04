---
name: dt-obs-problems
description: >-
  DAVIS 问题分析，包括根因识别、影响评估，
  以及与其他遥测的关联。用于查询或调查检测到的问题。
  触发词："active problems"、"root cause analysis"、"problem impact"、"affected users"、
  "list problems"、"P-12345 details"、"recurring problems"、"problem history"、
  "problem trending"、"blast radius"、"which entity caused the problem"、
  "problems affecting Kubernetes"、"problems by service"。
  不用于解释现有查询、产品文档问题、通用
  日志搜索、分布式追踪或主机级资源监控。
license: Apache-2.0
---

# 问题分析技能

分析 Dynatrace AI 检测到的问题，包括根因识别、影响评估，以及与日志和指标的关联。

---

## 用例

### 1. 活跃问题分诊
- **目标：** 列出并优先处理当前活跃的问题
- **触发：** "active problems"、"what problems are open"、"current issues"、"availability issues"
- **完成：** 带类别、用户影响和显示 ID 的活跃问题优先列表

### 2. 根因调查
- **目标：** 识别特定问题的根因实体
- **触发：** "root cause of P-12345"、"what caused this problem"、"which entity is the root cause"
- **完成：** 识别出根因实体，附受影响实体列表和爆炸半径

### 3. 问题趋势
- **目标：** 分析随时间变化的问题模式，以识别反复出现的问题
- **触发：** "recurring problems"、"problem history"、"problem trends last 30 days"
- **完成：** 显示问题频率、反复出现的根因和解决时间的趋势数据

---

## 概述

Dynatrace 自动检测整个环境中的异常、性能退化和故障，创建**问题**，这些问题聚合相关的告警、警告和信息级事件，并提供根因和影响洞察。

### 什么是问题？

问题是自动检测到的软件和基础设施健康与弹性问题，它们：

- **自动关联**跨服务、基础设施、前端应用和用户会话的相关告警、警告和信息级事件
- **识别根因**，使用对 Smartscape 依赖关系的因果分析
- **评估业务影响**，通过追踪受影响的用户和服务
- **减少告警噪声**，通过将相关症状分组到共享相同根因和影响的单个问题中
- **追踪问题生命周期**，从早期检测到解决

### 事件种类

`event.kind` 字段（稳定、权限）标识高层事件类型：

| `event.kind` 值 | 描述 |
|---|---|
| `DAVIS_EVENT` | Davis 检测到的基础设施/应用事件 |
| `BIZ_EVENT` | 业务事件（通过 API 摄取或从跨度捕获） |
| `RUM_EVENT` | 真实用户监控事件 |
| `AUDIT_EVENT` | 管理/安全审计事件 |

`event.provider`（稳定、权限）标识事件来源。

## 问题类别

常见 `event.category` 值：

| 类别 | 描述 | 示例 |
|----------|-------------|---------|
| **AVAILABILITY** | 基础设施或服务不可用 | Web 服务返回无数据、合成测试主动失败、数据库连接丢失 |
| **ERROR** | 错误率超出基线 | API 错误率从 0.1% 跳到 15% |
| **SLOWDOWN** | 性能退化 | 响应时间从 200ms 增加到 5000ms |
| **RESOURCE** | 资源饱和 | 容器内存达 95%，导致 OOM 终止 |
| **CUSTOM** | 自定义异常检测 | 业务 KPI（订单/分钟）跌破阈值 |

## 问题生命周期

```text
Detection → ACTIVE → Under Investigation → CLOSED
```

- **ACTIVE**：当前正在发生、需要关注的问题
- **CLOSED**：已解决的问题，用于历史分析

## 关键字段

### 常见字段名错误

| ❌ 错误 | ✅ 正确 | 描述 |
|---------|-----------|-------------|
| `title` | `event.name` | 问题标题/描述 |
| `status` | `event.status` | 问题生命周期状态 |
| `severity` | `event.category` | 问题类型/类别 |
| `start` | `event.start` | 问题开始时间 |

### 正确的状态值

```dql
// ✅ CORRECT: Use these status values
fetch dt.davis.problems
| filter event.status == "ACTIVE"   // Currently occurring problems
//     or event.status == "CLOSED"  // Resolved problems
// ❌ INCORRECT: event.status == "OPEN" does not exist!
| limit 1
```

### 关键字段参考

```dql
fetch dt.davis.problems, from:now() - 1h
| filter not(dt.davis.is_duplicate)
| fields
    event.start,                          // Problem start timestamp
    event.end,                            // Problem end timestamp (if closed)
    display_id,                           // Human-readable problem ID (P-XXXXX)
    event.name,                           // Problem title
    event.description,                    // Detailed description
    event.category,                       // Problem type
    event.status,                         // ACTIVE or CLOSED
    dt.smartscape_source.id,              // The smartscape ID for the affected resource
    dt.davis.affected_users_count,        // Number of affected users
    affected_entity_ids = smartscape.affected_entities[][id],  // Array of affected entity IDs
    dt.smartscape.service,                // Affected services (may be array)
    dt.davis.root_cause_entity,           // Entity identified as root cause
    root_cause_entity_id,                 // Root cause entity ID
    root_cause_entity_name,               // Human-readable root cause name
    dt.davis.is_duplicate,                // Whether duplicate detection
    dt.davis.is_rootcause                 // Root cause vs. symptom
| limit 10
```

## 标准查询模式

始终以此基础开始问题查询：

```dql
fetch dt.davis.problems, from:now() - 2h
| filter not(dt.davis.is_duplicate) and event.status == "ACTIVE"
| fields event.start, display_id, event.name, event.category
| sort event.start desc
| limit 20
```

**关键组成部分：**

- `fetch dt.davis.problems` - 问题数据源
- `not(dt.davis.is_duplicate)` - 过滤掉重复检测
- `event.status == "ACTIVE"` - 仅显示活跃问题
- 时间范围 - 始终指定合理的窗口

## 常见查询模式

### 按类别划分的活跃问题

```dql
fetch dt.davis.problems
| filter not(dt.davis.is_duplicate) and event.status == "ACTIVE"
| summarize problem_count = count(), by: {event.category}
| sort problem_count desc
```

### 高影响活跃问题（影响许多用户）

```dql
fetch dt.davis.problems
| filter not(dt.davis.is_duplicate) and event.status == "ACTIVE"
| filter dt.davis.affected_users_count > 100
| fields event.start, display_id, event.name, dt.davis.affected_users_count, event.category
| sort dt.davis.affected_users_count desc
```

### 高影响活跃问题（影响许多 smartscape 实体）

```dql
fetch dt.davis.problems
| filter not(dt.davis.is_duplicate) and event.status == "ACTIVE"
| filter arraySize(affected_entity_ids) > 5
| fields event.start, display_id, event.name, affected_entity_ids, event.category, impacted_entity_count = arraySize(affected_entity_ids)
| sort impacted_entity_count desc
```

### 特定问题详情

```dql
fetch dt.davis.problems
| filter display_id == "P-XXXXXXXXXX"
| fields event.start, event.end, event.name, event.description, affected_entity_ids, dt.davis.affected_users_count, root_cause_entity_id, root_cause_entity_name
```

### 服务特定问题历史

```dql
fetch dt.davis.problems, from:now() - 7d
| filter not(dt.davis.is_duplicate)
| filter in(dt.smartscape.service, toSmartscapeId("SERVICE-XXXXXXXXX"))
| summarize problems = count(), by: {event.category, event.status}
```

## 根因分析模式

### 基本根因查询

```dql
fetch dt.davis.problems, from:now() - 24h
| filter not(dt.davis.is_duplicate) and event.status == "ACTIVE"
| fields
    display_id,
    event.name,
    event.description,
    root_cause_entity_id,
    root_cause_entity_name,
    affected_entity_ids = smartscape.affected_entities[][id]
```

### 按实体类型的根因

识别哪些实体类型最常导致问题：

```dql
fetch dt.davis.problems, from:now() - 7d
| filter not(dt.davis.is_duplicate)
| filter isNotNull(root_cause_entity_id)
| summarize problem_count = count(), by:{root_cause_entity_name}
| sort problem_count desc
| limit 20
```

### 受影响实体是 AWS 资源

```dql
fetch dt.davis.problems, from:now() - 24h
| filter not(dt.davis.is_duplicate) and event.status == "ACTIVE"
| filter iAny(startsWith(smartscape.affected_entities[][type], "AWS_"))
```


### 带服务影响的基础设施根因

```dql
fetch dt.davis.problems, from:now() - 30m
| filter not(dt.davis.is_duplicate) and event.status == "ACTIVE"
| filter matchesPhrase(root_cause_entity_id, "HOST-")
| filter isNotNull(dt.smartscape.service)
| fields display_id, event.name, root_cause_entity_name, dt.smartscape.service
```

### 问题爆炸半径

计算每个根因的实体影响：

```dql
fetch dt.davis.problems, from:now() - 7d
| filter not(dt.davis.is_duplicate)
| filter isNotNull(root_cause_entity_id)
| fieldsAdd affected_count = arraySize(smartscape.affected_entities)
| summarize
    avg_affected = avg(affected_count),
    max_affected = max(affected_count),
    problem_count = count(),
    by:{root_cause_entity_name}
| sort avg_affected desc
```

### 反复出现的根因

识别反复导致问题的实体：

```dql
fetch dt.davis.problems, from:now() - 24h
| filter not(dt.davis.is_duplicate)
| filter isNotNull(root_cause_entity_id)
| summarize
    problem_count = count(),
    first_occurrence = min(event.start),
    last_occurrence = max(event.start),
    by:{root_cause_entity_id, root_cause_entity_name}
| filter problem_count > 3
| sort problem_count desc
```

### 原因类别 vs. 根因实体

这些是不同的问题 —— 选择正确的方法：

- **"什么导致问题？"** / **"最常见的原因"** → 按 `event.category`
  汇总（SLOWDOWN、ERROR、RESOURCE、AVAILABILITY、CUSTOM）。解释每个类别的触发因素。
- **"哪个实体导致问题？"** / **"根因实体"** → 按
  `root_cause_entity_name` 分组。列出具体的服务、主机或应用。

**原因类别细分**（当被问及常见原因、模式或类型时使用）：

```dql
fetch dt.davis.problems, from:now() - 30d
| filter not(dt.davis.is_duplicate)
| summarize problem_count = count(), by: {event.category}
| sort problem_count desc
```

然后对每个类别，使用问题类别表解释其触发因素，并
引用租户数据中的特定实体作为示例。

## 问题趋势与模式分析

追踪随时间变化的问题趋势、识别反复出现的问题，并分析解决性能。

**主要文件：**
- `references/problem-trending.md` - 时间序列分析和模式检测

**常见用例：**
- 使用 `makeTimeseries` 查看随时间的活跃问题
- 按类别的问题创建率
- 按时间表检测反复出现的问题
- 解决时间趋势和 P95 持续时间分析

**关键技术：**
- **`makeTimeseries`** vs **`bin()`**：为生命周期跨度 vs 离散事件选择正确的方法
- **NULL 处理**：对活跃问题使用 `coalesce(event.end, now())`
- **峰值时段分析**：识别问题最频繁发生的时间
- **影响趋势**：追踪随时间变化的用户影响

完整查询模式和最佳实践参见 `references/problem-trending.md`。

## 跨领域问题查询

### 与 Kubernetes 集群关联的问题

使用 `affected_entity_ids` 或 `dt.smartscape_source.id` 查找与 Kubernetes 相关的问题：

```dql
fetch dt.davis.problems, from:now() - 7d
| filter not(dt.davis.is_duplicate)
| filter matchesPhrase(dt.smartscape_source.id, "KUBERNETES_CLUSTER")
    OR matchesPhrase(dt.smartscape_source.id, "K8S_")
| fields event.start, display_id, event.name, event.category, event.status,
    dt.smartscape_source.id, affected_entity_ids
| sort event.start desc
```

替代方案：展开受影响实体并过滤 K8s 实体类型：

```dql
fetch dt.davis.problems, from:now() - 7d
| filter not(dt.davis.is_duplicate)
| expand entity_id = affected_entity_ids
| filter matchesPhrase(entity_id, "KUBERNETES_CLUSTER")
    OR matchesPhrase(entity_id, "K8S_")
| fields event.start, display_id, event.name, event.category, entity_id
| sort event.start desc
```

### 简单问题列表

列出过去 24 小时的所有问题（常见请求）：

```dql
fetch dt.davis.problems, from:now() - 24h
| filter not(dt.davis.is_duplicate)
| fields event.start, event.end, display_id, event.name, event.category, event.status
| sort event.start desc
```

## 响应构建

### 问题原因摘要

当总结问题原因、类别或模式时，提供跨数据中存在的所有标准类别的**全面
细分**：AVAILABILITY、ERROR、SLOWDOWN、RESOURCE 和 CUSTOM。对找到的每个类别：

1. **类别名称**和问题数量
2. **触发因素** —— 简要解释（例如 RESOURCE = 超过 CPU/内存/磁盘阈值；
   AVAILABILITY = 服务或实体变得不可达）
3. **具体示例**，来自租户的数据（受影响实体名称、问题 ID）

不要在前两个类别后就停止 —— 用户期望看到全貌。触发描述请参考
上面的问题类别表。

### 分析结果

呈现查询结果时：
- 包含**实体名称**（不仅是 ID）—— 但选择高效的方法：
  - **少量实体（< 5）：** `get-entity-name` 调用没问题
  - **大量实体：** 使用直接返回名称的 `query-problems` 工具，或
    在 DQL 查询中内联包含 `root_cause_entity_name` / `entityName()` 以解析
    名称。避免对 10+ 个实体循环调用 `get-entity-name` ——
    这可能耗尽工具调用限制，完全不返回答案。
- 提供**可操作的推荐**，与识别的原因相一致
- 按频率或影响组织，便于优先排序

## 最佳实践

### 基本规则

1. **始终过滤重复项**：使用 `not(dt.davis.is_duplicate)` 避免多次计数同一问题
2. **使用正确的状态值**：`"ACTIVE"` 或 `"CLOSED"`，绝不用 `"OPEN"`
3. **指定时间范围**：始终包含时间边界以优化性能
4. **包含 display_id**：对问题识别和链接至关重要
5. **增量测试**：构建查询时一次添加一个过滤器或字段
6. **尽早过滤**：在 fetch 之后立即应用 `not(dt.davis.is_duplicate)`

### 查询开发

- **从简单开始**：先进行基本过滤，再增加复杂度
- **先测试字段**：用 `| limit 1` 运行以验证字段名存在
- **使用有意义的时间范围**：太宽浪费资源，太窄会遗漏数据
- **记录问题 ID**：始终捕获并存储 `display_id` 以供参考

### 根因验证

- 在需要时始终过滤 `isNotNull(root_cause_entity_id)`
- 使用 `dt.davis.event_ids` 交叉引用事件
- 考虑时间延迟：根因可能比问题提前几分钟出现在日志中

### 时间范围指南

```dql
// ✅ GOOD - Specific time range
fetch dt.davis.problems, from:now() - 4h
```

```dql
// ❌ BAD - Scans all historical data
fetch dt.davis.problems
```

### 绝对时间范围需要双引号

在 DQL 查询中为 `from` 和 `to` 使用绝对 ISO 8601 时间戳时，**始终用双引号包裹它们**。未加引号的时间戳会导致语法错误。

```dql
// ✅ CORRECT - absolute timestamps quoted
fetch dt.davis.problems, from: "2026-05-18T22:50:00Z", to: "2026-05-18T23:35:00Z"
| filter not(dt.davis.is_duplicate)
| fields event.start, display_id, event.name, event.category, event.status
| sort event.start desc
```

## 故障排查

| 问题 | 原因 | 解决方案 |
|---------|-------|----------|
| 未返回问题 | 使用了 `event.status == "OPEN"` | 使用 `"ACTIVE"` 或 `"CLOSED"` —— `"OPEN"` 不存在 |
| 结果中有重复问题 | 缺少去重过滤器 | 在 fetch 之后立即添加 `filter not(dt.davis.is_duplicate)` |
| 错误的字段名（`title`、`status`、`severity`） | 类 SQL 命名 | 使用 `event.name`、`event.status`、`event.category` —— 参见上面的字段名表 |
| `root_cause_entity_id` 为空 | 并非所有问题都识别了根因 | 查询根因时添加 `filter isNotNull(root_cause_entity_id)` |
| 查询扫描数据过多 / 超时 | 缺少时间范围 | 始终在 fetch 命令上指定 `from:now() - <duration>` |
| `affected_entity_ids` 是空数组 | 问题没有映射的受影响实体 | 检查 `dt.smartscape.service` 或 `dt.smartscape_source.id` 作为替代 |

## 何时加载参考

### 何时加载 [problem-trending.md](references/problem-trending.md)：
- 分析随时间变化的问题频率
- 按时间表检测反复出现的问题
- 计算解决时间趋势和 P95 持续时间
- 按类别比较问题创建率

### 何时加载 [problem-correlation.md](references/problem-correlation.md)：
- 将问题与日志或其他遥测关联
- 调查问题之前发生的事件
- 将问题链接到部署或配置变更

### 何时加载 [impact-analysis.md](references/impact-analysis.md)：
- 评估业务影响（受影响用户、服务）
- 计算根因实体的爆炸半径
- 按技术和用户影响优先排序问题

## 参考

- [problem-trending.md](references/problem-trending.md) —— 问题趋势和时间序列分析模式
- [problem-correlation.md](references/problem-correlation.md) —— 将问题与日志和其他遥测关联
- [impact-analysis.md](references/impact-analysis.md) —— 业务和技术影响评估
- [problem-merging.md](references/problem-merging.md) —— DAVIS 何时以及为何将事件合并为问题

## 相关技能

- **dt-dql-essentials** - 问题查询的核心 DQL 语法和查询结构
- **dt-obs-logs** - 将问题与应用程序和基础设施日志关联
- **dt-obs-tracing** - 通过分布式追踪分析调查问题
