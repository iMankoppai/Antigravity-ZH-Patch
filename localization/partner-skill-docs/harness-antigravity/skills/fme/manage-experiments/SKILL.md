---
name: manage-experiments
description: >-
  创建、更新（指标、日期、描述、假设、baseline/comparison
  treatment、状态）或删除 Harness FME 功能标志实验。将指标
  选择委托给 choose-metric，指标创建委托给 create-metric，事件接线委托给
  instrument-metric，结果委托给 review-experiment-results，功能标志/定义准备
  委托给 create-feature-flag 和 update-flag-targeting。在要求创建、
  修改、暂停、恢复、完成或删除实验时使用。不要用于
  解释结果（review-experiment-results）。触发短语：创建
  实验、设置 A/B 测试、设计实验、启动测试、更新
  实验、暂停/恢复/完成实验、删除实验。
metadata:
  author: Harness
  version: 2.1.0
  mcp-server: harness-mcp
  summary: Feature-flag experiment design/lifecycle; delegates metrics and states CLI update limitations
license: Apache-2.0
compatibility: Requires the Harness MCP server or the Harness CLI
---

# 管理实验

创建、更新或删除 FEATURE_FLAG 实验。此处不实现 AI_CONFIG 变更工作流；请使用只读结果检查或单独支持的工作流。编排决策，并将
指标选择、功能标志设置和结果解释委托给专门技能。

相关：[choose-metric](../choose-metric/SKILL.md)（指标选择）、
[create-metric](../create-metric/SKILL.md)（指标创建）、
[instrument-metric](../instrument-metric/SKILL.md)（事件接线）、
[review-experiment-results](../review-experiment-results/SKILL.md)（结果）、
[create-feature-flag](../create-feature-flag/SKILL.md)、
[update-flag-targeting](../update-flag-targeting/SKILL.md)。

## 工具

通过 Harness MCP 服务器或 Harness CLI 工作；名称来自 [tool-map.md](../../../references/fme/tool-map.md)。

| 操作 | MCP | CLI |
|-----------|-----|-----|
| **列出实验** | `harness_list` · `fme_experiment` · `filters: { parent_type, parent_name?, environment_id?, status?: ["ACTIVE", "PAUSED"], … }` · `compact: false` | `harness list experiment --parent-type FEATURE_FLAG [--search <name>] [--status ACTIVE]`，然后用 `--status PAUSED` 再来一次 |
| **获取实验** | `harness_get` · `fme_experiment` · `params: { experiment_id }` | `harness get experiment <experiment-id>` |
| **创建实验** | `harness_create` · `fme_experiment` · `params: { environment_id }` · `body: { parent, name, startAt, endAt, baselineTreatment, comparisonTreatments, rule: "default rule", owners?, … }` | `harness create experiment <name> --env <env-id> -f experiment.json --json` |
| **更新实验** | `harness_update` · `fme_experiment` · `params: { experiment_id }` · `body: { description?, hypothesis?, startAt?, endAt?, keyMetrics?, status?, rule?, … }` | `harness update experiment <experiment-id> --set description=foo --set status=PAUSED` |
| **删除实验** | `harness_delete` · `fme_experiment` · `params: { experiment_id }` | `harness delete experiment <experiment-id>` |
| **列出环境** | `harness_list` · `fme_environment` · `compact: false` | `harness list fme_environment --json` |
| **获取定义** | `harness_get` · `fme_feature_flag_definition` · `params: { feature_flag_name, environment_id }` | `harness get feature_flag:definition <flag-name> --env <env-id>` |

## 说明

### 阶段 1：确定范围
遵循 [scope-establishment.md](../../../references/scope-establishment.md)。

### 阶段 2：选择操作

**Create（创建）**：在功能标志上创建新实验。
**Update（更新）**：更改描述、假设、日期、指标、baseline/comparison
treatment 或状态（暂停/恢复/完成/归档）。
**Delete（删除）**：硬删除（永久，无归档/恢复）。

---

### 创建实验

#### 步骤 1：解析父级和环境

默认父级类型：`FEATURE_FLAG`。如果功能标志不存在，路由到 [create-feature-flag](../create-feature-flag/SKILL.md)，然后返回此处。**列出环境**；如果未说明，询问哪个环境。

**AI_CONFIG 或 CONFIG 变更停止。** 声明的工具无法验证其父定义、treatment 名称或流量就绪状态。不要用功能标志查找或用户猜测替代该检查。只读实验/结果检查仍然可行；在写入之前，请求受支持的 AI Config 工作流。

#### 步骤 2：对照实时定义确认 treatment

在所选环境中为该功能标志**获取定义**。404 = 无定义；路由到 [update-flag-targeting](../update-flag-targeting/SKILL.md) 初始化它，然后返回此处。

读取 `treatments[].name`。实验的 `baselineTreatment` 和 `comparisonTreatments` 必须与真实 treatment 名称匹配。默认 baseline = 定义的 `baselineTreatment`，但要与用户确认。少于 2 个 treatment → 停止（参见 [stop-conditions.md](references/stop-conditions.md)）。

检查流量就绪：`isKilled: false`、`trafficAllocation > 0`、baseline 和每个 comparison treatment 在 `defaultRule` 桶中（或实验将使用的定向规则中）`size > 0`。如果任一检查失败，警告并询问是否继续。修复它需要 [update-flag-targeting](../update-flag-targeting/SKILL.md)。

为父功能标志和环境**列出实验**，带 ACTIVE 和 PAUSED 状态。应用[实验检查](../../../references/fme/write-safety.md#experiment-check)：ACTIVE 意味着确认用户想要第二个实验；PAUSED 意味着警告并要求明确知晓。

#### 步骤 3：假设

获取假设：*"如果[更改]，那么[指标]将上升/下降，因为[推理]"*（最多 500 字符）。链接 [concepts.md](../../../references/fme/concepts.md#experiments-and-metrics)。缺失或非因果假设 → 停止（参见 [stop-conditions.md](references/stop-conditions.md)）。

#### 步骤 4：指标

移交给 [choose-metric](../choose-metric/SKILL.md) 以选择关键和支撑指标。如果没有合适的指标，路由到 [create-metric](../create-metric/SKILL.md)（如果事件缺失，还有 [instrument-metric](../instrument-metric/SKILL.md)）。完成后带着指标 ID 返回此处。

#### 步骤 5：实验窗口

`startAt`/`endAt` 是必需的 ISO-8601 时间戳。明确询问；无默认时长。

#### 步骤 6：起草并确认

展示完整 payload：parent（type、name）、name（2-250 字符，唯一）、description、hypothesis、startAt/endAt（ISO-8601）、baselineTreatment、comparisonTreatments、keyMetrics、supportingMetrics、rule（设置为 `"default rule"`，除非用户想从特定定向规则标签获取结果；结果只计数标签与实验 `rule` 匹配的曝光）、owners、tags。链接 [write-safety.md](../../../references/fme/write-safety.md)。不要发送 `assignmentSource`（若存在则 400）。

仅 CLI：即使使用 `-f`，`--env <env-id>` 也是必需的标志——它设置 `environment_id` 查询参数，请求 body 从不携带它。`rule` 和 `owners` 没有专门的创建标志（只有 `--parent-type`、`--parent-name`/`--parent-id`、`--description`、`--hypothesis`、`--start-at`、`--end-at`、`--baseline-treatment`、`--comparison-treatment`、`--key-metric`、`--supporting-metric` 存在）——将它们放入 `-f experiment.json` body 中；不要为它们臆造标志。**在此停止。** 等待明确确认。

#### 步骤 7：创建

使用确认的 payload **创建实验**。409 = 名称重复；报告冲突并请用户给出新名称（绝不静默重命名）。404 = 父级在环境中不存在；回到步骤 1。

#### 步骤 8：验证

通过返回的 id **获取实验**。将 name、hypothesis、`startAt`/`endAt`、treatment、关键/支撑指标 ID、`rule`、父级/环境、owners 和 tags 与已批准的草稿比较。停止并报告任何实质性不匹配；绝不自动重建/删除来纠正不可变范围。报告 `status`（创建时通常为 `ACTIVE`）。数据收集后移交给 [review-experiment-results](../review-experiment-results/SKILL.md)。

---

### 更新实验

#### 步骤 1：获取当前实验

如果给出了确切 ID，直接**获取实验**。否则在 ACTIVE、PAUSED、COMPLETED 和 ARCHIVED 上完整分页名称发现（CLI 每次调用一个状态），然后在含糊时询问。变更之前要求父级类型为 FEATURE_FLAG。展示当前 `status`、`description`、`hypothesis`、`startAt`、`endAt`、`baselineTreatment`、`comparisonTreatments`、`keyMetrics`、`supportingMetrics`、`rule`。

#### 步骤 2：起草更改

询问要更新什么：description、hypothesis、日期、baseline/comparison treatment、指标、状态、rule、owners、tags。对于指标，如果选择新的，路由到 [choose-metric](../choose-metric/SKILL.md)。

更新 `baselineTreatment` 或 `comparisonTreatments` 时，核实这些 treatment 存在于实验环境的该功能标志定义中（为该环境**获取定义**并检查 `treatments[].name`，与创建步骤 2 相同）。参见 [stop-conditions.md](references/stop-conditions.md)。

有效 `status` 值：`ACTIVE`、`PAUSED`、`COMPLETED`、`ARCHIVED`（绝不允许 null）。后端强制执行实际合法的转换——不要假定固定链条（例如 `ACTIVE` → `PAUSED` → `COMPLETED`）；发送所请求的目标状态，让 400 揭示无效转换。`ARCHIVED` 在此是状态值，不是删除的替代。在 ACTIVE 实验上更改指标或日期 → 明确警告。

可清除（通过 API/MCP 合并补丁）：`description`、`hypothesis`、`rule`、`keyMetrics`、`supportingMetrics`、`tags`。不可清除：`name`、`startAt`、`endAt`、`baselineTreatment`、`comparisonTreatments`、`status`。

CLI 缺口：CLI 的 `update experiment` 没有 `-f`/文件 body 选项，也没有 `name` 或 `rule` 的可变字段——标量字段使用其声明的 snake_case `--set` ID；tags/owners/指标引用等集合使用其声明的 `--add`/`--del` 处理器，而非任意数组。要更改 `rule` 或 `name`，请停止或提议可用的 MCP 并明确批准；绝不静默丢弃所请求的字段。

#### 步骤 3：确认并更新

展示 diff（当前 vs 新的）。链接 [write-safety.md](../../../references/fme/write-safety.md)。如果是 ACTIVE 实验且更改关键字段，添加明确警告。

使用合并补丁 body **更新实验**。409 = 名称重复。400 = 无效字段、不可清除字段上的 null，或非法状态转换。

#### 步骤 4：验证

再次**获取实验**。比较已更新的字段，包括 `rule`（如果它是本次更新的一部分）。如果状态改变则报告新 `status`。

---

### 删除实验

#### 步骤 1：获取实验

如更新步骤 1 那样解析确切 ID 或完整分页的名称/状态发现。变更之前要求 FEATURE_FLAG。展示 name、status、parent、environment、dates。

#### 步骤 2：确认删除

硬删除 = 永久，无归档/恢复。需要更严格的确认。改为提供状态更新为 `COMPLETED`（更新操作）。链接 [write-safety.md](../../../references/fme/write-safety.md)。

#### 步骤 3：删除

**删除实验**。确认删除；父功能标志不受影响。

## 示例

- “在 new-checkout 功能标志上设置 A/B 测试” → 创建流程
- “暂停实验 pricing_test_2” → 更新状态
- “将实验 abc-123 更新为下周五结束” → 更新 endAt
- “删除实验 old_test” → 带确认的删除流程

## 性能注意事项

- 一次解析环境和定义（创建步骤 1-2），而非每个指标一次
- 指标选择是 [choose-metric](../choose-metric/SKILL.md) 的范围
- 更新使用合并补丁：body 中只放已更改的字段

## 故障排查

| 问题 | 解决 |
|-------|------------|
| 创建时 404 即使功能标志存在 | 父级必须存在于所选环境；检查该环境的**获取定义** |
| 用户想更改 treatment | 路由到 [update-flag-targeting](../update-flag-targeting/SKILL.md) 修改定义，然后返回此处 |
| 实验需要工作区护栏指标 | 护栏自动应用；绝不通过 keyMetrics/supportingMetrics 设置 |
| 更新时 null 导致 400 | 字段不可清除；省略它以保持不变 |
| 创建时 keyMetrics 为空 | 允许但无赢家判定标准；在步骤 6 起草之前警告并确认 |
| ACTIVE 实验阻止定向更改 | 参见 [write-safety.md](../../../references/fme/write-safety.md#experiment-check)；要求明确知晓 |
| 用户想通过 CLI 更改 `rule` 或 `name` | 不支持——CLI 的 `update experiment` 对二者都没有字段/`-f`；使用 MCP 或如实说明 |
| 父级是 `AI_CONFIG` | 此处不支持变更校验；停止并请求受支持的 AI Config 工作流。不要使用功能标志定义路由 |
| 状态更新时 400 | 实验当前状态下后端不允许该转换；报告错误，不要用猜测的中间状态重试 |
