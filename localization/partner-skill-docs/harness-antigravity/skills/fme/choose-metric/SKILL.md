---
name: choose-metric
description: >-
  为实验或发布推荐主要指标/护栏指标，依据良好指标检查清单进行评判。
  检查现有指标和事件健康状况，呈现自动创建的护栏指标。
  不创建或附加指标——参见 create-metric / instrument-metric / manage-experiments。
  触发短语：选择/挑选指标、主要指标、护栏指标、监控什么。
metadata:
  author: Harness
  version: 1.3.2
  mcp-server: harness-mcp
  summary: Recommend primary/guardrail metrics for an experiment or rollout, judged against a good-metric checklist
license: Apache-2.0
compatibility: Requires the Harness MCP server or the Harness CLI
---

# 选择指标

为 FME 实验或功能标志发布推荐指标：哪个是主要指标，哪些是护栏/支撑指标，以及哪些现有候选指标足够健康可信，依据[什么构成良好指标](../../../references/fme/metric-design.md#what-makes-a-good-metric)评判。相关：`/manage-experiments` 将指标附加到实验；`/create-metric` 创建新指标；`/instrument-metric` 添加跟踪调用。

## 工具

通过 Harness MCP 服务器或 Harness CLI 工作；名称来自 [tool-map.md](../../../references/fme/tool-map.md)。

| 操作 | MCP | CLI |
|-----------|-----|-----|
| 获取功能标志 | `harness_get` · `fme_feature_flag` · `params: { feature_flag_name }` | `harness get feature_flag <name> --json` |
| 获取实验 | `harness_get` · `fme_experiment` · `params: { experiment_id }` | `harness get experiment <id> --json` |
| 列出指标 | `harness_list` · `fme_metric` · `filters: { traffic_type_id?, name?, limit }` · `compact: false` | `harness list metric --traffic-type-id <id> --name <substring> --json` |
| 列出流量类型 | `harness_list` · `fme_traffic_type` · `compact: false` | `harness list traffic_type --json` |
| 列出事件类型 | `harness_list` · `fme_event_type` · `filters: { traffic_type?, name? }` · `compact: false` | `harness list event_type --traffic-type <name or id> --name <substring> --json` |
| 获取事件类型 | `harness_get` · `fme_event_type` · `params: { event_type_id }` | `harness get event_type <event-name> --json` |

## 说明

### 阶段 1：确定范围

参见 [scope-establishment.md](../../../references/scope-establishment.md)。在进行任何 list 或 get 操作之前确认组织和项目。

### 阶段 2：识别上下文

询问（如果尚未说明）：这是用于**实验**（A/B 测试）还是为安全而监控的**功能标志发布**？推荐逻辑不同（阶段 5）。

对于实验，在推荐任何东西之前先获取假设：*"如果这成功了，[什么]会上升/下降？"* 主要指标必须直接衡量该假设，而不仅仅是主题相关。

**停止条件：** 如果是实验且用户尚未说明假设，在推荐主要指标之前先索要一个。不要从功能标志名称推断。

### 阶段 3：检查已附加的内容（仅实验上下文）

如果实验存在，**获取实验**以读取 `keyMetrics` / `supportingMetrics`，以免提出重复项。工作区范围的 [GUARDRAIL / ALERT 指标](../../../references/fme/concepts.md#experiments-and-metrics) 会自动添加，且不会出现在这些列表中。如果实验尚不存在，跳过此检查，仅基于假设继续。

### 阶段 4：解析流量类型

为缩小指标列表，获取功能标志的流量类型：**获取功能标志**返回带 `id` 和 `name` 的 `trafficType`。如果你没有功能标志名称，**列出流量类型**并询问哪个适用——不同流量类型上的指标不会为实验或发布收集数据。

### 阶段 5：盘点候选指标

使用完整定义**列出指标**，按阶段 4 的流量类型以及（如果假设给出了明显关键词）名称子串缩小范围。请求约 30 行，除非假设指向某个具体名称。总数超过返回行数证明还有更多页，但相等并不证明完整：当 API 总数缺失时，MCP 可能回退到页长度。设置显式的 `filters.limit`/`filters.offset`，并对指标、流量类型和事件清单遵循[分页](../../../references/fme/tool-map.md#pagination)。说“在所检查的子集中没有合适的指标”，而不是“不存在合适的指标”；在做出项目范围缺失的断言之前，完成分页（或要求缩小代价高昂的清单）。

对每个指标读取 `name`、`description`、`aggregation`、`spread`、`format`、`isPositive`、`baseEventTypes[].eventTypeId`。依据[什么构成良好指标](../../../references/fme/metric-design.md#what-makes-a-good-metric)评判候选指标，而非仅看健康状况。

### 阶段 6：对每个候选指标做健康检查

指标创建不会校验任何事件引用，因此一个指标可能看起来完整，而其事件是拼写错误、已被重命名或已闲置。对于你即将推荐的每个候选指标，对它所使用的*每一个*事件引用执行 **获取事件类型**——`baseEventTypes`，以及若已设置的 `filterEventType`/`triggerEventType`，而不仅仅是基础事件，因为即使基础事件健康，过期的过滤或触发事件也会静默改变计数的单元。响应只有 `id` 和 `trafficTypes`——检查返回的 `trafficTypes` 包含该候选指标的流量类型。只有当过去 30 天内有事件到达（项目范围、跨所有环境）时才会列出事件类型——这并不构成对任何单个环境“当前正在流动”的保证。精确 get 返回 404 意味着在此范围/窗口内看不到匹配事件——先检查范围和拼写，再检查先前正常工作的流程是否只是闲置了。它**并不**证明该事件从未被埋点。在过滤或部分列表中缺失是不确定的。在断定该指标需要重新埋点或修改任何代码之前，先询问该流程近期是否运行过；如果确认是闲置而非损坏，就如实说明，而不是默认移交给 `instrument-metric`。不要对你明确排除的指标做健康检查。

对于发布监控，呈现[自动创建的 ` - Split Agents` 指标](../../../references/fme/metric-design.md#auto-created-metrics)作为现成的护栏指标。

### 阶段 7：推荐，按上下文分支

**实验：**
- **主要指标**——必须直接衡量所述假设、健康，并使用 `spread: PER`（`ACROSS` 指标没有显著性检验，无法为实验做决策）。每种次要类型各一个通常就够；每多一个指标都会增加噪声。没有事件的主要指标不会产生结果。指标的流量类型必须与功能标志的流量类型匹配，且 `track()` 中使用的 subject key 必须是 `getTreatment` 用于此功能标志的同一 key（归因事实）——事件的**名称**不需要，也通常不应与功能标志的名称匹配。如果没有现有指标符合条件，推荐 `/create-metric`（如果事件尚不存在，先 `/instrument-metric`），而不是强行凑合。
- **次要指标**，每个定性为：
  - *护栏*——不得回退的安全指标（错误率、延迟、退订）。放入 `supportingMetrics`（结果中的类别 `SUPPORTING`）——不要与工作区范围的 `GUARDRAIL` 类别指标混淆，后者自动应用于每个实验。区别参见 [concepts.md](../../../references/fme/concepts.md#experiments-and-metrics)。
  - *反指标*——检查主要指标无法揭示的不良权衡（转化率上升但平均订单价值下降）。
  - *支撑信号*——与主要指标相关、能佐证但非决定性的指标。
- 将这些映射到附加字段：主要 → `keyMetrics`，其他 → `supportingMetrics`。附加它们是单独的步骤；参见 `/manage-experiments`。

**功能标志发布监控：**
- 优先选择一小套（理想 2-3 个）可靠、低噪声的指标——工程健康指标（错误率、延迟）优于噪声大的产品指标，因为误报回滚的代价高昂。
- 说明 Harness 无法自动将这些附加到发布——用户（或其仪表盘/告警）必须自行监控它们。不要暗示此技能附加了任何东西。

### 阶段 8：交付推荐

```
## Recommended Metrics
- Primary: <name> — <why it measures the hypothesis> [healthy/at-risk]
- Guardrail: <name> — <what it protects against> [healthy/at-risk]
- Supporting: <name> — <what it corroborates> [healthy/at-risk]

## Gaps
<any hypothesis/rollout aspect with no healthy metric>
For each gap, give a concrete starting spec (event, aggregation, format, isPositive from the intent table) for /create-metric. If the app repo is available, offer candidates via [Suggest metrics from code](../../../references/fme/metric-design.md#suggest-metrics-from-code).
```

明确标记每个有风险的指标，而不是默默省略它——用户可能知道它即将被重新埋点。

## 示例

- “我们还没有指标——搜索排名测试应该测量什么？”——阶段 2 假设检查；阶段 5 未找到候选；阶段 8 若有应用代码仓库则给出带代码建议的空缺。
- “结账重设计实验我应该用哪个指标作为主要指标？”——阶段 2 假设检查，然后阶段 5-7 选出主要指标 + 护栏指标。
- “为新定价测试挑选护栏指标”——主要指标已已知/已设置；阶段 7 仅专注于护栏/反指标选择。
- “在发布 new-search 功能标志期间应该监控什么？”——阶段 7 的功能标志发布分支，限制在 2-3 个指标；呈现自动创建的指标。
- “checkout_conversion_rate 是这个测试的好主要指标吗？”——通过阶段 5-6 评估指定的指标，而不是普查所有指标，然后确认或给出理由反驳。

## 性能注意事项

- 每个范围/会话复用一个指标清单，而不是每个候选指标一个；一个清单可能需要多页。
- 对你即将推荐的每个指标做健康检查（阶段 6），但对明确排除的指标跳过。
- 不要对每个 treatment 都 **获取实验**——每个实验一次就够（阶段 3）。
- 不要用子串列表检查事件健康；使用**获取事件类型**（精确）获得确定的 200/404 信号。

## 故障排查

| 症状 | 原因 | 修复 |
|---------|-------|-----|
| 实验尚不存在 | 阶段 3 以 404 失败 | 跳过阶段 3，告知用户你仅基于清单和假设推荐，继续 |
| 没有指标通过健康检查 | 被引用的事件在当前范围/窗口内不可见 | 先确认范围、确切名称、流量类型和近期活动。闲置事件并不意味着埋点缺失，也不构成重复指标的理由。仅在确认存在缺口/需要排查时才路由到 `/instrument-metric`；将有风险的候选指标报告为有风险，而非可用于决策 |
| 用户为发布提议 >5 个指标 | 大量护栏集增加误报回滚风险 | 反驳——询问哪 2-3 个最重要 |
