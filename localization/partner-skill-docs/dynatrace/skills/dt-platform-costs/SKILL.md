---
name: dt-platform-costs
description: "使用 DQL 针对 dt.system.events 查询并分析 Dynatrace 租户的**实际**账单和使用数据 —— DPS 消耗细分、成本归一化后的支出排名、包含量扣减、成本分摊/回摊、成本驱动因素、支出趋势、成本调查、指标摄取优化、查询成本归因、工作流总成本、实体级成本下钻（RUM、主机、合成、K8s），以及 AI/LLM 成本（AI Units、AI Function Standard Calls、AI 生成的查询消耗）。将许可/权益问题导向文档（而非通过 DQL）。**仅**用于查询/分析租户的实际消耗。不要用于关于 DPS 账单/定价如何运作或单位/权重/费率卡含义的概念性"解释"问题 —— 参见 Dynatrace 文档。不要用于让 DQL 查询运行得更快或更便宜（查询优化、减少每次运行扫描的数据/消耗、尽早过滤最佳实践）—— 那属于 dt-dql-essentials。此技能**测量**消耗；它不调优查询。"
license: Apache-2.0
---

# dt-platform-costs

> **⛔ 首先 —— 在做任何其他事情之前检查范围。**
> 此技能**仅**查询并分析租户的**实际**消耗
> 数据。它**不**教授账单概念。如果用户在问账单/定价*如何*
> 运作、*如何*计算成本、单位/归一化
> 权重/费率卡*意味着*什么，或任何关于 DPS
> 账单的概念性"解释"问题 —— **此技能不回答它们。** 参见
> [账单概念 —— 停止](#billing-concepts--stop)，并且**只**以
> 规定的两句话文档重定向作答。**不要**解释单位、
> 权重、包含量或方法，也**不要**显示入门
> 菜单。仅在用户想要
> 查询或分析其自己租户的数字时，才继续进入此技能的其余部分。

使用 DQL 查询并分析 Dynatrace 平台账单和成本数据。所有数据
位于 `dt.system.events`，`event.kind == "BILLING_USAGE_EVENT"`，
按 `event.type`（消耗类别）细分。

> **范围边界**：此技能涵盖 Dynatrace *平台*账单（DPS 消耗）。对于通过 FOCUS 摄取的 AWS 云*基础设施*成本，改用 `dt-biz-cloud-costs`。

## Dynatrace 平台订阅（DPS）

此技能**仅适用于 DPS 许可的环境**。所有账单
事件类型、单位换算、公开费率卡和成本估算
工作流都是 DPS 特定的。

**切勿将此技能的单位换算或成本估算应用于 classic 许可
模型**（host units、DDU、DEM units、ASU）。如果用户提到 classic
许可术语或单位，请说明此技能仅涵盖 DPS，并将他们
引向 https://docs.dynatrace.com/docs/license/monitoring-consumption-classic
以了解详情。

## 许可 / 权益问题 —— 停止

**触发：**"我是否被允许使用 X？"、"X 是否已许可？"、"X 是否在我的订阅中？"、"我是否有 X 的权益？"

**停止 —— 不要执行任何 DQL 查询。** 账单使用事件只记录**活跃
消耗**，而非订阅权益。账单事件的缺失
意味着当前未消耗，而不是未许可。不要从
使用模式或其缺失推断权益。**不查询，直接作答**，
并指向 **Account Management > Subscription > Pricing**。

> **❌** 查询账单事件 → 无结果 → 得出"未许可"—— **错误**（缺失 ≠ 无权益）
> **✅** 立即作答："权益数据无法通过 DQL 获得。请检查 Account Management > Subscription > Pricing。"

## 账单概念 —— 停止

**触发：**"账单如何运作？"、"成本如何计算？"、"解释 DPS 账单"、"X 如何计费？"、"账单模型是什么？"、"DPS 定价如何运作？"、"Dynatrace 如何收费？"、"解释费率卡"

**停止 —— 不要从此技能内容作答。** 此技能中的归一化权重、
单位换算公式和查找值是**DQL 生成
工具**，而非面向用户的账单教育。将其作为 DPS 账单的解释来呈现是错误的
—— 它们是内部排名辅助，而非合同费率。

**你的整个响应必须仅为下面两句话 —— 其他什么都没有。**
**不要**列出能力或单位，**不要**描述计量、包含
量或归一化，**不要**添加"成本如何计算"部分，
也**不要**在所示单一提示之外附加入门菜单或示例提示列表：

> **❌** 解释计量 / 单位 / 归一化权重，然后提供入门菜单 —— **错误**（这正是要避免的失败）
> **✅** *仅*回答："关于 DPS 定价和账单如何运作，请参见 [Dynatrace 平台订阅文档](https://docs.dynatrace.com/docs/manage/subscriptions-and-licensing/dynatrace-platform-subscription)。如果你想分析租户的实际消耗，可以问例如 *'What are my top cost drivers for the last 7 days?'*"

## 何时使用此技能

- **使用概览** —— 按能力细分的 DPS 消耗、单位换算、跨能力比较
- **成本估算** —— 成本归一化的使用比较和相对支出排名、每日成本趋势、支出尖峰
- **成本调查** —— 逐步下钻到成本驱动因素、查询扫描成本归因、工作流总成本（4 个信号）
- **成本分摊 / 回摊** —— 成本中心和产品归因、团队级账单
- **包含量** —— Metrics/Traces Ingest 基线扣减、计费 vs 总使用

此技能**查询并分析**现有消耗数据。它不是 DPS
定价指南 —— 账单概念请参见
[官方文档](https://docs.dynatrace.com/docs/manage/subscriptions-and-licensing/dynatrace-platform-subscription)。


## 智能体指令

### 意图映射

| 用户请求 | 行动 | 参考 |
|---|---|---|
| "how can you help"、"what can you do"、"where do I start"、"help me understand my costs"、"what can I analyze"、"show me what's possible"、"what is this skill"、"help"、"capabilities"、"getting started"、"tell me what you can do"、"what are your capabilities" | 呈现入门菜单 —— 5 个用例，各一个建议提示。**尚不运行任何查询。** | [入门](#getting-started) |
| "am I allowed to use X"、"is X licensed"、"is X in my subscription"、"entitlement for X"、"can I use X from licensing perspective" | **停止 —— 不要查询。** 直接作答：权益数据无法通过 DQL 获得。指向 Account Management > Subscription > Pricing。 | [权益 —— 停止](#licensing--entitlement-questions--stop) |
| "how does billing work"、"how are costs calculated"、"explain DPS billing"、"how is X billed"、"what is the billing model"、"how does DPS pricing work"、"how does Dynatrace charge"、"explain the rate card" | **停止 —— 不要从技能内容作答。** 直接回答：重定向到官方文档。 | [账单概念 —— 停止](#billing-concepts--stop) |
| "usage overview"、"usage per capability"、"what am I using"、"how much usage" | 带单位换算的跨能力使用（不含成本） | billing-capabilities.md -> 跨能力使用（4 个查询） |
| "cost drivers"、"what costs most"、"top spenders"、"where is spend going" | 运行组合查询 + 完整内联 Lookup，在 DQL 中按 `cost_weight desc` 排序 | cost-estimations.md -> 按能力的估算成本 |
| "save money"、"reduce costs"、"billed costs"、"actual bill" | 带包含量扣减的使用，然后成本估算 | billing-capabilities.md -> 跨能力使用（4 个查询），然后 cost-estimations.md |
| "cost by team"、"chargeback"、"showback" | 成本中心归因 | cost-allocation.md |
| "metrics ingest by cost center"、"metrics chargeback"、"billable data points per team" | 按成本中心的 Metrics Ingest 计费量（含包含量扣减） | cost-allocation.md -> Metrics Ingest —— 按成本中心的计费量 |
| "how much log ingest"、"trace volume"（单一类别） | 单类别使用查询 | billing-event-types.md、billing-capabilities.md |
| "cost trend"、"spending spike"、"budget forecast" | 每日成本趋势 | cost-estimations.md -> 每日成本趋势 |
| "compare this week to last"、"week over week"、"WoW"、"MoM"、"month over month"、"how did costs change"、"cost change vs last week"、"cost change vs last month"、"period comparison"、"what grew"、"what shrank"、"usage trend"、"notable changes in usage" | 周期比较 —— 两个明确的 UTC 窗口，按能力比较 `capability_usage`，按最大绝对成本权重差值排序 | cost-estimations.md -> 周期比较（WoW / MoM） |
| "detector costs"、"anomaly detector query cost"、"ALERTING pool costs" | 交叉引用检测器 -> 查询成本 | query-cost-attribution.md |
| "workflow cost"、"what does this workflow cost"、"workflow spending" | 复合工作流成本（4 个信号） | workflow-total-cost.md |
| "which workflow"、"workflow name"、"workflow owner"、"how often does this workflow run"、"workflow frequency" | 解析工作流名称/所有者和运行频率 | workflow-total-cost.md → 跨事件字段参考 + 所有者识别 + 工作流运行频率 |
| "what's driving costs"、"cost investigation"、"cost spike" | 逐步成本调查 | query-cost-attribution.md、workflow-total-cost.md、entity-cost-drilldown.md |
| "which app"、"which host"、"which monitor"、"drill down"、"break down by application/host/cluster" | 带样本优先步骤的基于实体的下钻 | entity-cost-drilldown.md |
| "what's driving RUM/Full-Stack/Synthetic/K8s cost" | 特定能力的实体下钻 | entity-cost-drilldown.md |
| "optimize metrics ingest"、"reduce data points"、"high cardinality metrics"、"which metrics cost most"、"metrics cost optimization" | 运行分析（步骤 1–3），呈现数据并解释优化杠杆，然后等待用户选择要优化的内容 —— 绝不要推荐删除/减少特定指标 | metrics-ingest-optimization.md |
| "drop metric"、"remove metric from ingestion"、"stop ingesting metric" | 通过 OpenPipeline 或 OTel Collector 删除指标策略 | metrics-ingest-optimization.md -> 策略 1 —— 删除指标 |
| "reduce cardinality"、"remove dimension"、"drop dimension from metric" | 通过 OpenPipeline 或 OTel Collector 降低基数策略 | metrics-ingest-optimization.md -> 策略 2 —— 降低基数 |
| "change ingest interval"、"reduce collection frequency"、"scrape interval" | 在源头更改摄取间隔 | metrics-ingest-optimization.md -> 策略 3 —— 更改摄取间隔 |
| "AI costs"、"cost of AI agents"、"what does AI cost"、"AI spending"、"AI agent costs"、"direct and indirect AI cost"、"how much is AI costing"、"AI Units cost" | 直接 AI 成本（AI Units / AI Function Standard Call BUE）+ 间接 AI 成本（`ai_generated == true` 的 Query BUE） | billing-event-types.md -> Agentic AppEngine、query-cost-attribution.md -> 步骤 2a |
| "query cost by source"、"who is scanning most"、"cost attribution by app" | 按来源的 BUE 查询成本 | query-cost-attribution.md -> 步骤 1 |
| "expensive dashboards"、"dashboard cost ranking"、"top dashboards by cost" | 仪表板查询成本排名 | query-cost-attribution.md -> 步骤 1b + 步骤 2 |
| "included volume"、"billed vs total"、"baseline usage" | 包含量分析 | billing-capabilities.md -> 包含量 |
| "hourly billing"、"daily billing after deductions"、"time-granular billed usage" | 扣除包含量的时间分桶使用 | billing-capabilities.md -> 查询 3（Metrics Ingest —— 计费量）/ 查询 4（Traces Ingest —— 计费量） |

### 使用 vs 成本的区别

- **"使用"** → 仅单位换算，不含成本估算。用来自 [成本归一化权重](references/cost-estimations.md#cost-normalization-weights) 的单位标注（或预览类型用 [billing-event-types.md](references/billing-event-types.md)）。
- **"成本"** → 单位换算 + 在 DQL 中计算 `cost_weight`（通过完整内联 Lookup），仅用于内部排序/聚合。**切勿将 `cost_weight` 显示为美元金额。** 对于不在归一化表中的类型，从排名中省略。
- **"成本驱动因素"** → 按 `cost_weight` 排序的排名列表（在 DQL 中通过完整内联 Lookup 计算）。**输出列：排名、能力名称、原生单位的使用量。** 呈现前删除 `cost_weight` —— 它绝不出现于任何列、标签或句子中。
- **"成本份额 / 百分比"** → 使用归一化权重（使用量 × 每能力的归一化权重）计算占总量的份额。呈现为百分比表。使用成本排名规则第 3 步中的标准 ℹ️ 免责声明 —— 不要添加任何额外的注意事项或说明。
- **"用户提供的费率"** → 如果用户提供了合同费率（例如"Log Ingest 每 GiB 0.15 美元"），为该能力使用该费率并显示实际 USD。所有其他能力仅显示使用量（不含成本）。免责声明：⚠️ 使用你提供的费率 $X/单位计算。对于所有未提供费率的能力，仅显示使用量。权威总计请参考 Account Management > Subscription。**绝不要推断或假设费率** —— 仅在用户明确说明时才接受。

仅在用户明确要求时才添加成本信息。不同类别的单位不可比较 —— 成本归一化是排名或求和它们的唯一方式。

**预览类型：** 只有 [cost-estimations.md](references/cost-estimations.md#cost-normalization-weights) 中明确标记为预览的能力才是预览 —— 绝不要从零使用推断预览状态。

### 成本排名规则

当任何意图涉及成本排名或成本驱动因素时（成本驱动因素、成本趋势、工作流
成本、查询成本归因、成本调查、成本尖峰）：

1. **在 DQL 中计算 `cost_weight`** —— 运行基础使用查询（来自
   [billing-capabilities.md](references/billing-capabilities.md) 的查询 1–4）直到
   `| summarize billable_usage` 步骤，然后立即追加
   [用于成本排名的完整内联 Lookup](references/cost-estimations.md#full-inline-lookup-for-cost-rankings)。
   完整内联 Lookup 在一步中处理单位换算**和**成本加权
   —— **不要**同时应用
   `billing-capabilities.md` 中的单位换算 Lookup；它冗余，且链式 `lookup` 会替换
   所有现有的 `lookup.*` 字段，从而破坏成本权重计算。
   以 `| filter isNotNull(cost_weight) | sort cost_weight desc | fields event.type, capability_usage, cost_weight` 结束查询。
   **切勿心算归一化权重** —— 值跨越多个数量级，
   静默的算术错误无法察觉。
2. **呈现排名，而非美元金额** —— DQL 结果到达时已预排序。删除 `cost_weight` 列，**仅**呈现**排名数字、能力名称、原生单位的使用量**（例如 GiB、GiB-小时、会话、数据点 —— 该能力所衡量的任何单位）。绝不要包含成本、权重或美元列。例如"前 5 个成本驱动因素"的输出：
   ```
   1. Log Management & Analytics - Ingest & Process  62.3 TiB
   2. Full-Stack Monitoring                           2,366,800 GiB-hours
   3. Real User Monitoring                            51.5M sessions
   4. Infrastructure Monitoring                       847,200 host-hours
   5. Metrics - Ingest & Process                      18.2B data points
   ```
   对于百分比问题，输出占总量的份额表（参见上面的成本份额 / 百分比）。绝不显示原始 USD 估算，除非用户提供了自己的合同费率。
3. **免责声明置于结果之前** —— 仅适用于多能力结果（2+ 个能力、排名或百分比表）。**逐字**复制此文本 —— 不要改写或重述：
   > ℹ️ 排名显示相对支出 —— 实际美元数字请参见 **Account Management > Subscription > Overview > Cost and usage details**。

   对于**单能力**结果（恰好一个能力，无跨能力比较）：**完全省略免责声明** —— 结果是直接的账单数据，不涉及归一化。

   **例外：** 如果响应处于**用户提供费率**模式，则即使是单能力结果也要包含该模式所需的警告。单能力省略仅适用于上述标准多能力排名免责声明。
4. **不要补充费率卡说明** —— 上述规定的免责声明是唯一可以提及归一化方法的地方。绝不要在响应的其他任何地方添加"这些数字基于公开 DPS 费率卡"或"基于公开列表价格"之类的句子。这**不**抑制**用户提供费率**模式所需的警告。

## 入门

当用户询问关于成本、使用或技能能做什么的通用或开放式问题时，
用下面的菜单作答。**尚不运行任何 DQL 查询** —— 等待用户
选择方向。

你可以探索以下内容：

1. **成本细分** —— 查看哪些能力在驱动支出，按相对成本排名。
   > *"What are my top cost drivers for the last 7 days?"*

2. **使用概览** —— 以原生单位全面了解所有能力的 DPS 消耗。
   > *"Give me an overview of our platform usage across all capabilities."*

3. **尖峰调查** —— 将成本尖峰归因到其来源（仪表板、工作流、检测器）。
   > *"My log query cost spiked last week — which source is causing it?"*

4. **成本分摊 / 回摊** —— 按团队、产品或成本中心细分成本。
   > *"Show me a cost breakdown by cost center for the last 30 days."*

5. **指标优化** —— 如果指标摄取是主要成本驱动因素，深入查看哪些指标键可计费并减少成本最高的那些。
   > *"Which metrics are driving our ingest cost? Help me optimize."*

哪一个符合你想要做的事情？

## 前提条件

- 访问 Dynatrace 环境
- 对 `dt.system.events` 的 DQL 查询权限
- 在编写查询之前加载 `dt-dql-essentials` —— 涵盖 DQL 语法、类型
  处理，以及通过 `dt.semantic_dictionary.fields` 的字段发现

## 知识库结构

| # | 参考 | 内容 |
|---|-----------|---------|
| 1 | [billing-event-types.md](references/billing-event-types.md) | 账单事件类型目录 —— 字段、计量区间、按类型表 |
| 2 | [billing-capabilities.md](references/billing-capabilities.md) | BUE 到能力的映射、单位换算、跨类别使用查询、包含量扣减 |
| 3 | [cost-estimations.md](references/cost-estimations.md) | 成本归一化权重、单位换算 Lookup、成本估算查询、用于仪表板的完整内联 Lookup |
| 4 | [cost-allocation.md](references/cost-allocation.md) | 成本中心/产品归因、成本分摊查询 |
| 5 | [query-cost-attribution.md](references/query-cost-attribution.md) | 查询扫描成本归因 —— 按来源的 BUE、按检测器细分（ALERTING 池）、QEE 下钻 |
| 6 | [workflow-total-cost.md](references/workflow-total-cost.md) | 工作流总成本 —— 四个账单信号（查询扫描、AppEngine、工作流小时、AI 调用） |
| 7 | [entity-cost-drilldown.md](references/entity-cost-drilldown.md) | 基于实体的成本下钻 —— 按实体的 RUM/主机/合成/K8s/安全/自动化 |
| 8 | [metrics-ingest-optimization.md](references/metrics-ingest-optimization.md) | 按指标键的成本下钻 —— 基数分析、时间序列验证、优化目标识别 |

## 快速开始

```dql
fetch dt.system.events, from: -7d
| filter event.kind == "BILLING_USAGE_EVENT"
| summarize event_count = count(), by: {event.type}
| sort event_count desc
```

## 最佳实践

1. **始终先按 `event.kind` 过滤** —— 避免扫描无关事件。
2. **从 7 天时间范围开始** —— 平台数据量很大。
3. **对账单总计使用明确的 UTC 午夜边界** —— 参见 [billing-capabilities.md § 账单时间范围边界](references/billing-capabilities.md#billing-timeframe-boundaries)。
4. **绝不要用 `~` 表示近似** —— 使用 `≈` 或"approximately"（裸 `~` 会产生 Markdown 删除线）。
5. **结果为空？** —— 运行上面的发现查询以验证可用的事件类型。
6. **`count()` 会扇出 —— 计数前确认每事一行** —— `QUERY_EXECUTION_EVENT`（每个 DQL 语句触碰的每个桶一行）和
   `WORKFLOW_EVENT` `WORKFLOW_EXECUTION`（每次运行约 2 行：开始 + 完成）
   在你 `count()` 时都会多计。DQL 语句量使用
   `countDistinct(query_id)`；工作流运行次数和频率使用
   `WORKFLOW_EXECUTION` 上的 `countDistinct(dt.automation_engine.workflow_execution.id)`
   —— 绝不用裸 `count()`。绝不要写"运行了 N 次"或
   从任何原始 `count()` 计算每秒/每分钟速率。参见
   [query-cost-attribution.md § 步骤 3](references/query-cost-attribution.md#step-3--drill-into-qee-for-details)
   和 [workflow-total-cost.md § 工作流运行频率](references/workflow-total-cost.md#how-often-did-the-workflow-run)。
7. **绝不要使用实体模型函数** —— `entityName()`（以及任何接受 `dt.entity.*` 字段以解析实体元数据的函数）已弃用。
   在结果中呈现原始 `dt.entity.*` ID（例如 `HOST-1A2B3C`）。按 ID 分组或
   计数（`by: {dt.entity.host}`、`countDistinct(dt.entity.host)`）
   是可以的 —— 那是将 ID 作为普通值使用。参见
   [entity-cost-drilldown.md § 结果中的实体 ID](references/entity-cost-drilldown.md#entity-ids-in-results)。

## 限制

- **没有通用的使用字段** —— 每种事件类型使用不同的计费单位。不进行成本归一化就无法跨类别求和。
- **归一化权重 ≠ 合同费率** —— 参见 [成本排名规则](#cost-ranking-rules)。排名是相对的；权威数字请使用 Account Management。
- **包含量** —— Metrics/Traces Ingest 包含主机基线（≈14 天最大）。参见 [billing-capabilities.md § 包含量](references/billing-capabilities.md#included-volume)。
- **成本归因是可选的** —— 仅当配置时才填充；Retention 事件通常缺少实体引用。
- **零费率查询** —— 某些查询可能基于执行上下文（用户、应用、查询的数据）而为零费率。这些会产生 QEE 记录但没有相应的 BUE。QEE `scanned_bytes` 与 BUE `billed_bytes` 总计之间的差距表示零费率使用，而非管道问题。参见 [query-cost-attribution.md § 调查 QEE↔BUE 不匹配](references/query-cost-attribution.md#investigating-qeebue-mismatches)。
