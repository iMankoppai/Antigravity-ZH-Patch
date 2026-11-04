---
name: dt-obs-compliance-assistant
description: >-
  使用 Dynatrace Compliance Assistant 监控并调查欧盟 DORA 合规态势。
  涵盖合规分数、CIF 健康、事件生命周期和 ICT 风险输入
  （漏洞、安全检测发现、错误配置）。
  触发词："DORA compliance"、"Digital Operational Resilience Act"、"compliance score"、
  "compliance snapshot"、"score tier"、"Critical or Important Functions"、"CIF"、"CIF health"、
  "unclassified problems"、"potential major incident"、"classified major incident"、
  "incident classification under DORA"、"compliance.incident bizevent"、
  "DQL for classified incidents"、"set up Compliance Assistant"、"DORA onboarding"。
  不用于其他合规框架（SOC2、PCI-DSS、HIPAA、ISO 27001）、
  没有 DORA 或 CIF 上下文的通用 Davis 问题、
  未限定到 DORA 的通用安全发现，
  或没有合规上下文的分数查询。
license: Apache-2.0
---

# Compliance Assistant

使用 Dynatrace Compliance Assistant 应用的实时可观测性和安全洞察，追踪、管理并调查欧盟 DORA 合规态势。

---

## 重要免责声明

Dynatrace 合规分数以及 Compliance Assistant 的所有输出都是**基于实时可观测数据和自动化系统的指示性指标**。它们**不**替代全面或正式的合规评估，也**不**构成公司根据欧盟 DORA 或任何其他法规的合规状态的法律认定。

**切勿声称分数、层级或 Compliance Assistant 输出意味着组织在法律上符合或不符合欧盟 DORA。** 始终将结果作为支持修复决策的运维指标呈现，而非法律或监管裁决。

---

## 何时使用此技能

✅ **用于：**
- 欧盟 DORA 合规态势、合规分数、合规快照、分数层级
- 关键或重要功能（CIF）：健康、KPI 监控、影响分析、设置问题
- DORA 下的事件生命周期：未分类问题、潜在重大事件、已分类重大事件
- ICT 风险输入：漏洞、安全检测发现、错误配置（ICT 资产配置结果）
- 欧盟 DORA 下的事件分类：重要性阈值、持续时间标准、经济影响
- 用于 `compliance.incident` bizevents、CIF 健康或 CIF 上未分类问题的 DQL 查询
- Compliance Assistant 的入门、权限和设置

❌ **不用于：**
- 欧盟 DORA 之外的监管框架 —— SOC2、PCI-DSS、HIPAA、ISO 27001 此应用**不支持**
- 没有 DORA、CIF 或合规上下文的通用 Davis 问题 → 使用 `dt-obs-problems`
- 未限定到合规或 DORA 的通用漏洞或安全发现查询 → 使用应用安全技能
- 没有"合规"或"DORA"的通用"分数"查询 —— Dynatrace 有许多分数
- 配置 Business Flow 或定义业务流程步骤 → 参见 [Business Flow 文档](https://docs.dynatrace.com/docs/observe/business-observability/business-flow)
- 配置 Security Posture Management 规则 → 参见 [SPM 文档](https://docs.dynatrace.com/docs/secure/application-security/spm)
- 通用 DQL 语法帮助 → 使用 `dt-dql-essentials`

---

## 前提条件

### 安装

从 [Dynatrace Hub](https://www.dynatrace.com/hub/detail/compliance-assistant/) 安装 Compliance Assistant。

### 所需权限

| 权限 | 用途 |
|---|---|
| `storage:buckets:read` | 读取桶 |
| `storage:events:read` | 读取事件 |
| `storage:entities:read` | 读取实体表 |
| `storage:metrics:read` | Istio 发现发现规则所需 |
| `storage:filter-segments:read` | 读取过滤器片段 |
| `settings:objects:read` | 读取日志摄取设置 |
| `settings:schemas:read` | 读取设置模式 |
| `state:app-states:read` | 读取应用状态 |
| `hub:catalog:read` | 读取应用版本 |
| `storage:security.events:read` | 获取安全事件 |

### 所需数据源

| 来源 | 用途 |
|---|---|
| [Business Flow](https://docs.dynatrace.com/docs/observe/business-observability/business-flow) | CIF 监控和业务流程上的事件检测 —— 事件分类所需 |
| [漏洞事件](https://docs.dynatrace.com/docs/secure/threat-observability/concepts#vuln-events) | 持续漏洞评估（DORA 要求） |
| [检测发现事件](https://docs.dynatrace.com/docs/secure/threat-observability/concepts#detection) | 持续网络威胁评估（DORA 要求） |
| [合规事件](https://docs.dynatrace.com/docs/secure/threat-observability/concepts#compliance) | ICT 资产安全配置基线验证（DORA 要求）—— 由 [Security Posture Management](https://docs.dynatrace.com/docs/secure/application-security/spm) 提供支持 |

---

## 核心概念

### 合规框架

Compliance Assistant 目前**仅**支持**欧盟 DORA（数字运营韧性法案）**。它将可观测性和安全洞察整合到该框架的单一合规态势视图中。对其他框架的支持已列入计划。

### Dynatrace 分数（合规快照）

一个实时的、分层的分数，概括跨潜在事件、安全检测发现、漏洞和错误配置的当前 ICT 风险态势。分数层级由最严重的活跃条件决定；在同一层级内，每满足一个标准就扣除相应的惩罚分。

**分数层级：**

| 层级 | 最高分 | 触发时机…… |
|------|-----------|-----------------|
| **On Track** | 100 | 在事件、安全检测发现、漏洞、错误配置中未满足任何标准 |
| **Low** | 99 | 安全检测发现/漏洞/错误配置中有任何低严重程度发现 |
| **Medium** | 79 | 任何中严重程度发现，或 ≥1 个未分类事件 |
| **High** | 59 | 任何高严重程度发现，或 ≥5 个未分类事件 |
| **Critical** | 34 | 任何严重安全检测发现/漏洞/错误配置，或 ≥1 个潜在重大事件 |
| **Major** | 5（固定） | ≥1 个已确认的已分类重大事件 —— 短路为固定分数 5 |

**惩罚机制：** 在同一层级内，分数 = 层级上限 −（6 × 该层级中满足的标准数）。例如，Medium 层级满足 2 个标准：79 − 12 = 67。

> 此分数是高层级运维指标。它**不**确认监管合规或法律状态。

### 关键或重要功能（CIF）

根据欧盟 DORA，金融实体必须识别并监控那些若中断可能显著影响财务表现或服务连续性的业务功能。在 Compliance Assistant 中，CIF 通过将 [Business Flow](https://docs.dynatrace.com/docs/observe/business-observability/business-flow) 业务流程链接到 DORA 框架来配置。[Smartscape on Grail](https://docs.dynatrace.com/docs/discover-dynatrace/platform/grail/smartscape-on-grail) 通过将每个 CIF 链接到其底层 IT 组件来提供端到端可见性。

### 事件生命周期

影响 CIF 业务流程的 Davis 检测到的问题经过三种状态：

| 状态 | 定义 |
|-------|------------|
| **未分类问题** | 一个 Davis 问题影响 CIF，但违反的 DORA 重要性阈值少于 2 个 |
| **潜在重大事件** | 违反 ≥2 个受监控的 DORA 重要性阈值 |
| **已分类重大事件** | 在 Compliance Assistant 中手动确认为重大；生成 `compliance.incident` bizevent 快照 |

**受监控的欧盟 DORA 重要性阈值：**

| 阈值 | 标准 |
|-----------|-----------|
| 受影响的 CIF | 跨关键或重要功能的爆炸半径 |
| 事件持续时间 | 24 小时阈值 |
| 经济影响 | €100,000 阈值，由受影响 CIF 的每分钟估算成本 × 事件持续时间计算 |

分类始终是在 Compliance Assistant 应用中执行的**手动步骤**。不要代替用户分类事件。

一旦分类，生成的 `compliance.incident` bizevent 可以通过 Dynatrace Workflows 触发自动化（例如，创建一个 ServiceNow 事件或 Jira 工单，并附上合规影响详情）。

### ICT 风险输入

| 信号类型 | 来源 | DORA 要求 |
|-------------|--------|-----------------|
| **漏洞** | 漏洞发现 | 持续漏洞评估 |
| **安全检测发现** | 检测发现事件 | 持续网络威胁评估 |
| **ICT 资产配置结果** | 通过 Security Posture Management 的合规事件 | 安全配置基线验证 |

---

## DQL 参考

### 已分类重大事件

获取当事件被分类为重大时生成的 `compliance.incident` bizevents。要检索特定事件，按 `problem.event.id` 过滤。

```dql-template
fetch bizevents
| filter event.provider == "dynatrace.compliance.assistant"
| filter event.type == "compliance.incident"
| filter problem.event.id == {{.incident_id:string}}
```

获取所有已分类事件：

```dql
fetch bizevents
| filter event.provider == "dynatrace.compliance.assistant"
| filter event.type == "compliance.incident"
```

**关键字段**（完整模式参见 [语义字典](https://docs.dynatrace.com/docs/semantic-dictionary/model/business-analytics#compliance-assistant-incident-event)）：

| 字段 | 类型 | 描述 |
|-------|------|-------------|
| `compliance.cifs_impacted.names` | string | 配置为 CIF 且受该事件影响的 Business Flow 实体的去重名称列表（例如 `Account opening; Deposit and trade flow`） |
| `compliance.cifs_impacted.ids` | string | 配置为 CIF 且受该事件影响的 Business Flow 实体的去重唯一标识符列表 |
| `compliance.framework` | string | 合规框架的显示名称（例如 `DORA`） |
| `compliance.incident.classified` | boolean | 当事件已按照 DORA 要求被手动分类为重大时为 `true` |
| `compliance.incident.comment` | string | 用户在将事件分类为重大时添加的评论（例如 `"The incident was classified as major due to insights on reputational damage and user impact."`） |
| `compliance.incident.duration` | duration | 事件的持续时间（纳秒），用于评估 24 小时 DORA 持续时间重要性阈值 |
| `compliance.incident.duration_criteria` | boolean | 如果违反了 DORA 24 小时事件持续时间重要性阈值则为 `true` |
| `compliance.incident.economic_impact` | double | 以欧元计的估算经济影响，由受影响 CIF 的每分钟估算成本 × 事件持续时间计算 |
| `compliance.incident.economic_impact_criteria` | boolean | 如果违反了 DORA €100,000 经济影响重要性阈值则为 `true` |
| `compliance.incident.name` | string | 事件的显示名称 —— 匹配底层 `dt.davis.problem` 的 `event.name`（例如 `CPU saturation`） |
| `compliance.incident.time.classified` | timestamp | 事件被分类为重大时的 Unix 纪元时间戳（纳秒） |
| `event.provider` | string | Compliance Assistant 事件 bizevents 始终为 `dynatrace.compliance.assistant` |
| `event.type` | string | Compliance Assistant 事件 bizevents 始终为 `compliance.incident` |
| `problem.category` | string | 来自底层 Davis 问题的问题类别：`AVAILABILITY`、`ERROR`、`SLOWDOWN`、`RESOURCE_CONTENTION`、`CUSTOM_ALERT`、`MONITORING_UNAVAILABLE` |
| `problem.event.id` | string | 底层 `dt.davis.problem` 的唯一标识符 —— 用它来与问题查询关联 |
| `problem.status` | string | 底层 Davis 问题的状态：`ACTIVE` 或 `CLOSED` |

### CIF 上的未分类问题和潜在重大事件

查找影响 CIF 但没有匹配的 `compliance.incident` bizevent 的 Davis 问题 —— 即尚未手动分类的问题。`isNull(lookup.event.id)` 反连接是关键模式。

```dql-template
fetch dt.davis.problems, from: {{.from}}, to: {{.to}}
| expand affected_entity_ids
| join [
    smartscapeNodes "*"
  ], on: {left[affected_entity_ids] == right[id_classic]}, prefix: "entities."
| join [
    smartscapeEdges "*"
  ], on: {left[entities.id] == right[target_id]}, prefix: "edges."
| join [
    smartscapeNodes "BIZ_FLOW"
  ], on: {left[edges.source_id] == right[id]}, prefix: "nodes."
| lookup [
    fetch bizevents
    | filter event.provider == "dynatrace.compliance.assistant"
      and event.type == "compliance.incident"
  ], sourceField: `event.id`, lookupField: `problem.event.id`, executionOrder: auto
| filter isNull(lookup.event.id)
| fields display_id,
         name = event.name,
         status = event.status,
         cif = nodes.name,
         affectedEntity = entities.name,
         event.start,
         event.end,
         nodes.bizflow.id,
         category = event.category
| filter in(nodes.bizflow.id, {"{{.cif_id_1}}", "{{.cif_id_2}}"})
| summarize {
    status      = takeFirst(status),
    cifIds      = collectDistinct(nodes.bizflow.id),
    cifs        = collectDistinct(cif),
    start       = min(event.start),
    end         = max(event.end),
    duration    = max(coalesce(event.end, now()) - event.start),
    category    = takeFirst(category)
  }, by: { display_id, name }
| limit {{.max_entries:long}}
```

**说明：**
- 来源是 `dt.davis.problems`，不是 `bizevents`
- `filter isNull(lookup.event.id)` 识别没有已分类事件 bizevent 的问题
- `in(nodes.bizflow.id, {...})` 限定到其 Smartscape 图触及配置的 CIF（`BIZ_FLOW` 节点）的问题
- 将 `{{.cif_id_1}}`、`{{.cif_id_2}}` 替换为 Compliance Assistant 中 DORA 框架设置里的实际 Business Flow 实体 ID
- 对于单个 CIF，使用 `| filter nodes.bizflow.id == "{{.cif_id}}"`

### CIF 健康（Business Flow KPI）

获取每个 CIF 的最新 KPI 快照。KPI 数据由 Business Flow（`event.type == "bizflow.kpis"`）发出，而不是由 Compliance Assistant 直接发出。

```dql-template
fetch bizevents, from: now()-24h, to: now()
| filter event.type == "bizflow.kpis"
| filter bizflow.id == "{{.cif_id_1}}" or bizflow.id == "{{.cif_id_2}}"
| fieldsAdd timestamp, bizflowId = bizflow.id, bizflowName = bizflow.name
| sort timestamp asc
| summarize {
    fulfillment   = takeLast(bizflow.analysis.value),
    errors        = takeLast(bizflow.errors.value),
    timestamp     = takeLast(timestamp),
    timeframe     = takeLast(bizflow.query_timeframe.hours),
    frequency     = takeLast(bizflow.query_frequency.hours),
    bizflowName   = takeLast(bizflowName),
    analysisLabel = takeLast(bizflow.analysis.label)
  }, by: { bizflowId }
```

**说明：**
- 每个 CIF 返回一行；`fulfillment` 和 `errors` 是最近采样的 KPI 值
- `analysisLabel` 描述 `fulfillment` 对该流程意味着什么（例如"Successful logins"）
- `timeframe` 和 `frequency` 反映 Business Flow 自身配置的查询窗口
- 对于单个 CIF，使用 `| filter bizflow.id == "<id>"`；对于多个 CIF，用额外的 `or bizflow.id == "<id>"` 子句扩展
- 如果数据缺失，检查 Business Flow 监控频率和评估时间范围（参见 [FAQ](#faq)）

---

## 常见工作流

### 检查合规分数

1. 确认用户询问的是 DORA —— 目前是唯一支持的框架
2. 使用 [核心概念](#dynatrace-score-compliance-snapshot)中的分数层级表解释当前层级
3. 提醒用户分数是运维指标，而非法律合规认定
4. 如果分数下降，识别哪些信号类型在起作用（事件、安全检测发现、漏洞、错误配置）
5. 使用 [提升合规分数](#improving-the-compliance-score) 指导修复

### 调查事件

1. 确认用户询问的是**已分类**事件（有 `compliance.incident` bizevent）还是**未分类/潜在重大**问题
2. 对于已分类事件：运行已分类事件 DQL 查询，如果引用了特定事件则按 `problem.event.id` 过滤
3. 对于未分类/潜在重大：运行限定到相关 CIF ID 的未分类问题查询
4. 呈现重要性阈值违反状态：`compliance.incident.duration_criteria`、`compliance.incident.economic_impact_criteria`、`compliance.cifs_impacted.*`
5. 不要代替用户分类事件 —— 分类是在 Compliance Assistant 应用中执行的手动步骤

### 审视 CIF 健康

1. 从 Compliance Assistant 的 DORA 框架设置中识别 CIF 的 Business Flow ID
2. 使用相关 `bizflow.id` 值运行 CIF 健康查询
3. 呈现每个 CIF 的 `fulfillment`、`errors` 和 `analysisLabel`
4. 如果数据缺失或过时，检查 Business Flow 监控频率 —— 参见 [FAQ](#faq)

---

## 提升合规分数

Dynatrace 分数实时反映当前 ICT 风险态势。要改善它：

1. **及时处理事件** —— 解决影响 CIF 的潜在重大事件和未分类问题
2. **修复安全检测发现和漏洞** —— 参见 [获得洞察](https://docs.dynatrace.com/docs/secure/threat-observability) 和 [如何修复检测到的漏洞？](https://docs.dynatrace.com/docs/secure/application-security/vulnerability-analytics)
3. **修复 ICT 资产错误配置** —— 参见 [使用 Security Posture Management 保持合规](https://docs.dynatrace.com/docs/secure/application-security/spm)
4. **确保监控覆盖** —— 确认所有 CIF 都启用了实时保护和监控

> 提升分数可降低可观测的 ICT 风险。它**不**构成正式合规或法律就绪。

---

## FAQ

### Compliance Assistant 中的 CIF 洞察多久更新一次？

CIF KPI 洞察（fulfillment 和 errors）根据 Business Flow 中 KPI 监控配置的生成频率更新。评估时间范围也按每个业务流程配置定义。

为确保可靠的 KPI 评估并避免丢失长时间运行流程的数据，将评估时间范围设置为流程平均持续时间的至少 3–4 倍。例如，如果某 CIF 的平均持续时间是 5 分钟，将评估窗口设置为至少 15–20 分钟。

### 为什么配置的 CIF 没有更新？

如果你最近编辑或添加了配置为实体的业务流程，并在 Compliance Assistant 中将它们选为 CIF，可能需要等到这些业务流程定义的最大监控频率才能更新。调整业务流程配置中的监控频率以减少延迟。

---

## 参考

- [Compliance Assistant 文档](https://docs.dynatrace.com/docs/observe/business-observability/compliance-assistant)
- [Business Flow](https://docs.dynatrace.com/docs/observe/business-observability/business-flow)
- [Security Posture Management](https://docs.dynatrace.com/docs/secure/application-security/spm)
- [运行时漏洞分析](https://docs.dynatrace.com/docs/secure/application-security/vulnerability-analytics)
- [威胁可观测性概念](https://docs.dynatrace.com/docs/secure/threat-observability/concepts)
- [Compliance assistant 事件事件 —— 语义字典](https://docs.dynatrace.com/docs/semantic-dictionary/model/business-analytics#compliance-assistant-incident-event)
- [Dynatrace Hub —— Compliance Assistant](https://www.dynatrace.com/hub/detail/compliance-assistant/)
