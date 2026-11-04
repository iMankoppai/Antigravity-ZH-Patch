---
name: review-experiment-results
description: >-
  解释 Harness FME 实验结果：赢家判定、统计
  显著性、护栏指标影响和数据质量告诫（样本量
  小、数据缺失）。对每个指标的结果进行分类，并默认产出
  平实语言的解读，在请求时呈现底层统计（p-value、CI、
  样本量）。在要求解释、审查或解读
  实验结果时使用；"did treatment X win"；"is this experiment significant"；
  "what happened to metric Y in this experiment"；或 "should we ship this
  experiment"。不要用于更改实验（manage-experiments）、选择
  指标（choose-metric），或诊断偏差（SRM 根因、peeking、
  Simpson 悖论）。触发短语：实验结果、解读、赢家、
  统计显著性、护栏指标、发布此实验。
metadata:
  author: Harness
  version: 2.1.2
  mcp-server: harness-mcp
  summary: Explain experiment results, including winner, significance, guardrail impact, and data-quality caveats
license: Apache-2.0
compatibility: Requires the Harness MCP server or the Harness CLI
---

# 审查实验结果

用平实语言解释 FME 实验的结果：是否存在赢家、
为什么或为什么不、护栏指标受到了怎样的影响，以及任何数据质量
告诫——底层统计可按需提供。

相关：[manage-experiments](../manage-experiments/SKILL.md)（实验
更改）、[choose-metric](../choose-metric/SKILL.md)（指标选择）。

## 工具

通过 Harness MCP 服务器或 Harness CLI 工作；名称来自 [tool-map.md](../../../references/fme/tool-map.md)。

| 操作 | MCP | CLI |
|-----------|-----|-----|
| **列出实验** | `harness_list` · `fme_experiment` · `filters: { parent_type, name?, match_type: "contains", status?: ["ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"], offset: 0, limit: 100 }` · `compact: false` | `harness list experiment --parent-type FEATURE_FLAG [--search <name>] --status ACTIVE`，然后用 `--status PAUSED`、`--status COMPLETED`、`--status ARCHIVED` 重复（CLI `--status` 是单值；API 若省略则默认 `ACTIVE`） |
| **获取实验** | `harness_get` · `fme_experiment` · `params: { experiment_id }` | `harness get experiment <experiment-id>` |
| **获取设置** | `harness_get` · `fme_experiment_settings` · `params: { experiment_id }` | `harness get experiment:settings <experiment-id>` |
| **列出结果** | `harness_list` · `fme_experiment_result` · `filters: { experiment_id, comparisons? }` | `harness list experiment:results <experiment-id> --raw` |
| **获取/列出指标** | `harness_get` · `fme_metric` · `params.metric_id`（每个 id 一次调用），或 `harness_list` · `fme_metric` · `filters: { ids }` · `compact: false` | 每个 id 一次 `harness get metric <id>`，或每个 id 一次 `harness list metric --id <id>`——CLI 的 `--id` 标志可重复，但只有第一个值到达 API（spec bug），所以在一次调用中重复 `--id id1 --id id2` 会静默丢弃 `id2` |

## 说明

### 阶段 1：确定范围
遵循 [scope-establishment.md](../../../references/scope-establishment.md)。

### 步骤 1：解析实验

如果用户给出确切实验 ID，直接**获取实验**——跳过列表。否则为父类型 FEATURE_FLAG（或用户指定的 AI_CONFIG）**列出实验**，若提供则用名称子串匹配（MCP：`match_type: "contains"`）。默认父类型：FEATURE_FLAG。

如果用户未指定状态，列出 ACTIVE、PAUSED、COMPLETED、**以及 ARCHIVED**——已完成或已归档的实验正是结果问题通常所指的那种，因此此处绝不默认仅活动。在决定唯一性或缺失之前，按[分页](../../../references/fme/tool-map.md#pagination)完整分页所有所选状态；CLI 需要为每个状态单独分页查询。多于一个匹配或未给名称 → 询问是哪个实验。如果扫描不完整，报告该情况，而不是静默选择首页匹配。

### 步骤 2：获取实验定义

**获取实验**。关键字段：`status`、`environment`、`startAt`/`endAt`、`baselineTreatment`、`comparisonTreatments[]`、`keyMetrics[]`、`supportingMetrics[]`。

`keyMetrics`/`supportingMetrics` 是实验上仅有的指标列表。`GUARDRAIL` 和 `ALERT` 指标是应用于每个实验的工作区范围类别，因此它们绝不会出现在这里——从每个结果的 `category` 读取角色（步骤 4）。`keyMetrics` 为空 → 无赢家判定标准；询问哪个（些）指标应驱动结论。

多于一个 `comparisonTreatments` 且用户未指明 → 报告每个 treatment（每个一个结论，见输出格式）。如果问题预设单个 treatment（"did it win?"）→ 询问是哪个 treatment 或确认按 treatment 解读。

### 步骤 3：获取实验设置

**获取设置**。始终返回已应用的设置（仅当实验不存在时 404）。`source: "EXPERIMENT_OVERRIDE"` 表示实验有自己的覆盖；其他值表示它继承组织默认值。

要向前携带的字段：`significanceThreshold`（不总是 0.05）、`multipleComparisonCorrection`（`NONE` 或 `GROUPWISE_HOCHBERG`；仅适用于 KEY/SUPPORTING，绝不适用于 GUARDRAIL/ALERT）、`minimumSampleSize`（按 treatment）、`statisticalTestType`（`FIXED_HORIZON`/`SEQUENTIAL`）、`reviewPeriod`（ISO-8601 时长）、`varianceReduction.method`（`NONE`/`CUPED`）。

### 步骤 4：获取已评估结果

为该实验**列出结果**，可选地缩小到特定 comparison treatment。仅列表（无单结果 get、无按环境过滤）。仅返回最新一次计算运行，每个（指标、comparison treatment）对一个行，加上顶层 `calculatedAt`（若从未计算则为 `null`）。如果缩小到特定 treatment，按每个条目的 `comparison` 过滤返回的行（参见 [tool-map.md](../../../references/fme/tool-map.md)）。

每行字段：`category`（`KEY`、`SUPPORTING`、`GUARDRAIL` 或 `ALERT`）、`comparison`（此行所对应的 comparison treatment）、`metricId.id` / `metricId.name`（`name` 可为 `null`；在步骤 5 解析）、`metricResultState`（统计引擎结论；若尚无则为 `null`）、`pvalue`、`impactLower`/`impactUpper`、`value`、`errorMargin`、`baselineMean`/`comparisonMean`（各带 `Lower`/`Upper`）、`baselineSampleSize`/`comparisonSampleSize`、`varianceReduction`、`positive`（指标配置的 `isPositive`，而非观察结果；即使数值字段为 `null` 也非空）。

响应中没有 SRM 字段，因此无法确认观察到的 treatment 分配与配置的 treatment 分配一致——步骤 8 在报告赢家时都会说明这一点。按给定报告 `metricResultState`/`pvalue`；绝不重新计算显著性，也不声称纠正了 peeking。

**评分前先对账。** 预期行集是每个已配置指标（来自步骤 2 的 `keyMetrics` ∪ `supportingMetrics`）× 范围内每个 comparison treatment（全部，或步骤 2 中挑选的那些）的笛卡尔积；它必须非空，因为步骤 2 已在 `keyMetrics` 为空时停止。将返回的行与之匹配：
- 同一（`metricId.id`、`comparison`）对有两行或更多 → 重复/冲突数据；不要任意挑选一个——将那个组合视为 `needs_more_data` 并在步骤 8 中注明冲突。
- 某个预期（指标、comparison）组合完全没有行 → 视为 `needs_more_data`，与 `metricResultState: null` 的行相同；绝不将缺失组合视为“无可报告”。
- 某行的 `comparison` 不在实验当前 `comparisonTreatments` 中 → 丢弃它（来自已移除 treatment 的过期数据）。
- `calculatedAt` 为 `null`，或整个结果列表为空 → 尚未运行计算；每个 KEY 结果都是 `needs_more_data`，因此步骤 7 的结论是 `NEED_MORE_DATA`——绝不要从空或未计算的结果集报告 `WINNER`。

GUARDRAIL/ALERT 行不属于预期集合（它们是工作区范围的，不在实验上列出），但当存在且无数据时，仍必须流入步骤 7 的 `DATA_QUALITY_CONCERN` 修饰符——在对账 KEY/SUPPORTING 覆盖时不要丢弃它们。

### 步骤 5：解析指标名称和描述

解析返回行中的每个不同指标 ID **以及**这些行中缺失的已配置指标，以便能点名缺口。MCP 可按 ID **列出指标**，完整分页直到每个请求的 ID 都被解析，或完整清单确立某 ID 缺失；或者直接逐个获取每个 ID。CLI 必须为每个 ID 单独**获取指标**（或每次调用一份完全分页的单 ID 列表）。未解析的 ID 保持未验证，而非在首页遗漏中缺失。也包含返回的 GUARDRAIL/ALERT ID。描述有助于判断严重性：在 "leading indicator, noisy" 上 2% 的下降与在 "primary revenue guardrail" 上同样的下降读起来不同。

### 步骤 6：对每个结果分类

使用 [state-classification.md](references/state-classification.md) 将每个 `metricResultState` 映射为 `desired`、`undesired`、`inconclusive` 或 `needs_more_data`。对于 `needs_more_data` 结果，将 `baselineSampleSize`/`comparisonSampleSize` 与 `minimumSampleSize` 比较，以便解读能说明收集进度。

### 步骤 7：确定结论

每个所选 comparison 一个结论。**完整性闸门先运行：** 空/未计算的结果、缺失或重复的已配置指标/comparison 对，或不匹配的预期类别，会为受影响的 comparison 强制 `NEED_MORE_DATA` + `DATA_QUALITY_CONCERN`。单独展示观察到的回退/护栏；不要隐藏它们。只有非空、已对账且每个已配置 KEY 和 SUPPORTING 对都恰好出现一次的集合，才进入下表。缺失的工作区范围护栏清单保持未验证，而非无违规的证据。

然后自上而下评估；首个匹配胜出：

| 结论 | 条件 |
|---|---|
| `MIXED` | 至少一个 KEY 结果为 `desired` 且至少一个任意类别结果为 `undesired` |
| `WINNER` | 完整性闸门通过；存在至少一个已配置 KEY 结果且每个已配置 KEY 结果都是 `desired` |
| `REGRESSION` | 至少一个 KEY 结果为 `undesired` |
| `NEED_MORE_DATA` | 至少一个 KEY 结果为 `needs_more_data`（包括被步骤 4 对账捕获的缺失或冲突组合） |
| `NO_WINNER` | 其他情况（KEY 结果为 `inconclusive`，或 `desired` 与 `inconclusive` 的混合） |

修饰符（附加到任何结论）：
- `GUARDRAIL_BREACH`——任何 `category: GUARDRAIL` 结果为 `undesired`。一个
  `undesired` 的 SUPPORTING 或 ALERT 结果影响结论但不是
  护栏违规。按行顺序，`WINNER` 绝不携带此修饰符。
- `DATA_QUALITY_CONCERN`——超过一半的 KEY 结果处于 `NO_DATA_*`
  状态；任何结果为 `NO_DATA_SERVER_ERROR`/`FAILED_METRIC`；或任何
  GUARDRAIL/ALERT 结果处于 `NO_DATA_*` 状态。一个从未收到
  数据的护栏是监控缺口，而不仅仅是一个可省略的数据点。

### 步骤 8：解释结果

默认使用平实语言。SRM 和 peeking 告诫链接 [concepts.md](../../../references/fme/concepts.md#experiments-and-metrics)。先给出结论，再说明原因。描述权衡，而非业务决策。`DATA_QUALITY_CONCERN`：平实说明，并指出步骤 4 发现的任何重复/冲突行或缺失的指标×treatment 组合。`WINNER` 或 `MIXED`：添加一行：SRM 未通过 API 暴露；行动前在 Harness UI 中检查实验的结果页。固定时间窗 + 审查期结束前：说明解读为初步——如果结论为 `WINNER`，在输出格式中报告为 `WINNER (preliminary)`，在审查期结束或测试类型为 `SEQUENTIAL` 之前不要称其为可行动。无结论但未做显著性检验：说明原因（例如 `ACROSS` 指标）。`calculatedAt` 非空：包含时间戳。`pvalue` 为 null（例如 `WAITING_NORMALITY`）：不要将 `value`/影响引用为确定。`GUARDRAIL_BREACH` + `MIXED`：先给出违规。有数据的护栏或支撑指标（步骤 4 已对账行中存在的任何类别）必须出现在 Metric Impact 表中——绝不因为某行不是 KEY 就省略它。如果 `multipleComparisonCorrection` 为 `NONE` 且实验有多个关键指标，添加一行标记误报风险。统计细节：当问题使用统计术语或用户询问时，添加 p-value、CI、样本量、`significanceThreshold`、`multipleComparisonCorrection`、设置 `source`。无统计细节：以一行说明统计可按需提供结尾。

## 输出格式

对于单个 comparison treatment：

```
## Experiment Readout
- Experiment: <name> (<status>)
- Comparing: <treatment> vs <baseline>
- Calculated: <calculatedAt>

## Verdict
**<VERDICT>** [+ `(preliminary)` if fixed-horizon and before the review period ends] [+ modifiers if any]
<2-4 sentence explanation>

## Metric Impact
| Metric | Role | Result |
|---|---|---|
| <name> | Key / Supporting / Guardrail / Alert | <desired/undesired/inconclusive/needs more data, in plain words> |

## Notes
<data-quality caveats, if any; otherwise omit>
```

对于多于一个 comparison treatment，保留一个共享的实验头部和
Notes 部分，但在各自的 `### <treatment name>` 子标题下为每个 treatment 重复结论 + 表格块
（每个 treatment 独立结论）。

仅当满足步骤 8 的统计条件时，才向 Metric Impact 添加 p-value/CI/样本量列。

## 示例

- “解释 checkout-redesign 实验的结果” → 按名称解析，步骤 2-8，平实语言输出
- “treatment B 在 exp_8f2a1c 中赢了吗？” → 按 ID 解析，仅 treatment B 的结论
- “signup-flow 实验在统计上显著吗？” → 统计措辞触发统计细节
- “我们应该发布 onboarding 实验吗？” → 结论 + 权衡；无发布/不发布建议

## 性能注意事项

- 在步骤 4 之前解析具体的实验 id；绝不按名称获取结果
- 每个实验获取设置（步骤 3）和指标名称（步骤 5）一次，而非每个 treatment 一次
- 一旦用户挑选 treatment，将步骤 4 缩小到特定 comparison treatment，而不是获取每个 comparison

## 故障排查

| 问题 | 解决 |
|-------|------------|
| 某个实验操作失败 | 报告错误并停止 |
| 步骤 2 404 但步骤 3/4 成功 | 没有步骤 2 就没有 treatment 或关键指标定义；告知用户此实验无法完整解读 |
| 实验仍为 ACTIVE 或 PAUSED | 如果结论为 NEED_MORE_DATA 或 NO_WINNER，询问用户想要初步解读（带告诫）还是宁愿等待；使用 `endAt`（以及 `reviewPeriod`）说明配置还要运行多久 |
| 无法识别或为 null 的 `metricResultState` | 视为 `needs_more_data`；不要猜测方向；参见 [state-classification.md](references/state-classification.md) |
| 同一指标 + comparison 出现重复或冲突行 | 将该组合视为 `needs_more_data`；注明冲突；绝不任意挑选一行 |
| 预期指标×treatment 组合在结果中缺失 | 视为 `needs_more_data`；绝不从部分覆盖报告 `WINNER` |
| 结果为空且实验的 `rule` 为 `default` 或另一个无流量的标签 | 结果只计数标签与实验 `rule` 匹配的曝光；提供通过 [manage-experiments](../manage-experiments/SKILL.md) 将实验的 `rule` 更新为 `"default rule"` |
| 用户询问 SRM | 结果 API 不暴露任何 SRM 值；如实说明并指向 Harness UI 中的实验结果页；不要诊断原因 |
| 用户想更改实验 | 路由到 [manage-experiments](../manage-experiments/SKILL.md) |
| 用户询问使用哪个指标 | 路由到 [choose-metric](../choose-metric/SKILL.md) |
