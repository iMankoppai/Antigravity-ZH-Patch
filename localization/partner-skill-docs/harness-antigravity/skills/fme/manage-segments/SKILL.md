---
name: manage-segments
description: >-
  创建、检查并维护 Harness FME segment（STANDARD、LARGE、
  RULE_BASED）。管理元数据，选择类型特定的定义和成员关系
  工作流，并在每次变更之前检查引用它的功能标志。在
  要求创建 segment、向 segment 添加键、列出 segment、更新
  segment 元数据、移除键、替换键、检查 segment 使用情况或删除
  segment 时使用。不要用于让功能标志使用 segment（update-flag-targeting）、
  功能标志 CRUD（create-feature-flag、manage-flag-lifecycle），或功能标志发现
  （discover-feature-flags）。触发短语：创建 segment、添加键、列出
  segment、segment 成员关系、segment 定向、更新 segment、移除键、
  替换 segment 键、segment 定义、检查 segment 使用情况、删除 segment。
metadata:
  author: Harness
  version: 1.3.1
  mcp-server: harness-mcp
  summary: Segment metadata, STANDARD membership, and RULE_BASED editor workflows with mandatory pre-write reference checks
license: Apache-2.0
compatibility: Requires Harness MCP or CLI; RULE_BASED rule changes use the Harness rule editor
---

# 管理 Segment

管理 **STANDARD**、**LARGE** 和 **RULE_BASED** segment 的元数据、STANDARD 成员关系，以及已批准的 RULE_BASED 编辑器更改。每次变更都需要完整的引用影响检查和明确批准。LARGE 批量成员关系操作不在此技能范围内。

## 工具

通过 Harness MCP 或 CLI 工作，具有同等的范围、确认和验证要求。通过命令帮助发现确切的 CLI 操作语法；映射参见 [tool-map.md](../../../references/fme/tool-map.md#segment-type-capabilities)。元数据示例中的 `STANDARD` 代表所选类型；定义/键行仅适用于 STANDARD。

| 操作 | MCP | CLI |
|-----------|-----|-----|
| 列出流量类型 | `harness_list` · `fme_traffic_type` · `compact: false` | `harness list traffic_type --json` |
| 列出环境 | `harness_list` · `fme_environment` · `compact: false` | `harness list fme_environment --json` |
| 列出功能标志 | `harness_list` · `fme_feature_flag` · `size: 50` · `compact: false` | `harness list feature_flag --json --limit 50` |
| 列出实验 | `harness_list` · `fme_experiment` · `filters: { parent_type: "FEATURE_FLAG", parent_name, environment_id, status: ["ACTIVE", "PAUSED"], offset: 0, limit: 100 }` · `compact: false` | `harness list experiment --parent-type FEATURE_FLAG --parent-name <flag> --env <env-id> --status ACTIVE --json`，然后 PAUSED；二者都完整分页 |
| 列出功能标志定义 | `harness_list` · `fme_feature_flag_definition` · `params: { feature_flag_name }` · `filters: { offset: 0, limit: 100 }` · `compact: false` | `harness list feature_flag:definition <flag> --json` |
| 列出 segment | `harness_list` · `fme_segment` · `filters: { segment_type, status?, offset: 0, limit: 100 }` · `compact: false` | `harness list segment --segment-type STANDARD --json`；安全闸门使用声明的 status 过滤器列出 ACTIVE 和 ARCHIVED |
| 获取 segment | `harness_get` · `fme_segment` · `params: { segment_name, segment_type }` | `harness get segment <name> --segment-type STANDARD --json` |
| 创建 segment | `harness_create` · `fme_segment` · `body: { name, trafficType, segmentType, description?, tags?, owners? }` | `harness create segment <name> --traffic-type user --segment-type STANDARD` |
| 更新 segment | `harness_update` · `fme_segment` · `params: { segment_name, segment_type }` · `body: { description?, tags?, owners? }` | `harness update segment <name> --segment-type STANDARD --set description=foo` |
| 删除 segment | `harness_delete` · `fme_segment` · `params: { segment_name, segment_type }` | `harness delete segment <name> --segment-type STANDARD` |
| 列出定义 | `harness_list` · `fme_segment_definition` · `filters: { environment_id, status?, offset: 0, limit: 100 }` · `compact: false` | `harness list segment:definition --env <env-id> --json` |
| 获取定义 | `harness_get` · `fme_segment_definition` · `params: { segment_name, environment_id }` | `harness get segment:definition <name> --env <env-id> --json` |
| 创建定义 | `harness_create` · `fme_segment_definition` · `params: { segment_name, environment_id }` · `body: { description? }?` | `harness create segment:definition <name> --env <env-id>` |
| 更新定义 | `harness_update` · `fme_segment_definition` · `params: { segment_name, environment_id }` · `body: { description? }` | `harness update segment:definition <name> --env <env-id> --set description=foo` |
| 删除定义 | `harness_delete` · `fme_segment_definition` · `params: { segment_name, environment_id }` | `harness delete segment:definition <name> --env <env-id>` |
| 列出键 | `harness_execute` · `fme_segment_definition` · `action="list_keys"` · `params: { segment_name, environment_id, offset?, limit? }` | 通过 CLI 帮助发现键列表操作和分页参数 |
| 添加键 | `harness_execute` · `fme_segment_definition` · `action="add_keys"` · `params: { segment_name, environment_id, replace? }` · `body: { keys, comment?, title? }` | 通过 CLI 帮助发现键添加操作和替换参数 |
| 移除键 | `harness_execute` · `fme_segment_definition` · `action="remove_keys"` · `params: { segment_name, environment_id }` · `body: { keys, comment?, title? }` | 通过 CLI 帮助发现键移除操作 |

## 说明

按需加载参考：
- [concepts.md](../../../references/fme/concepts.md) — segment 部分解释 STANDARD vs LARGE vs RULE_BASED 以及功能标志如何引用 segment
- [write-safety.md](../../../references/fme/write-safety.md) — 写入前确认协议（生产闸门、写入前后验证）

### 阶段 1：确定范围

遵循 [scope-establishment.md](../../../references/scope-establishment.md)。如果缺失，询问组织和项目。重申：`Working in org=..., project=...`

### 阶段 2：发现意图和 segment 上下文

仅询问缺失的内容：
1. **操作**——列出、创建、更改成员关系、编辑规则/排除项、更新元数据、删除、检查使用情况
2. **Segment 名称**（区分大小写；含糊时从列表发现）
3. **Segment 类型**（STANDARD、LARGE 或 RULE_BASED；所有 segment 元数据操作必需；创建时选择）
4. **目标环境**（一个或多个；**列出环境**以将名称解析为 ID 并记录 `isProduction`）
5. **流量类型**（仅用于创建；必须匹配将使用该 segment 的功能标志；**列出流量类型**以发现）

### 阶段 3：执行操作

解析确切名称**和类型**，然后选择下面的工作流。在**每次变更**之前，包括元数据创建、定义预配和键添加，完成[使用情况检查](#usage-check)，随计划呈现其影响，并获得[生产感知批准](../../../references/fme/write-safety.md)。不完整的检查会阻止写入；批准绝不放弃覆盖。在执行前发现所选操作的确切 schema，并保留原生 org/project 范围。

| 类型 | 成员关系模型 | 工作流 |
|------|------------------|----------|
| STANDARD | 显式键集 | 下面的元数据、环境定义和键流程 |
| LARGE | 大键集 | 仅元数据和引用影响检查 |
| RULE_BASED | 条件、匹配器和排除项 | 元数据和[规则编辑器工作流](#rule-based-workflow) |

#### 查找 / 列出

- **没有 segment 名称：** 完整分页全部三种元数据类型并合并；报告实际覆盖，而非固定调用次数。
- **有 segment 名称：** 解析类型并获取元数据。对于 STANDARD，检查环境定义并完整分页键。对于 RULE_BASED，检查权威规则编辑器配置，而非观察到的匹配键样本。对于 LARGE，仅报告元数据和引用。优先使用计数或脱敏样本而非原始用户键。
- 对于 MCP segment 元数据、STANDARD segment 定义和功能标志定义，`size` 被忽略：显式设置 `filters.limit: 100`，递增 `filters.offset`，并持续到出现短页。它们的 `total` 是页长度，而非清单大小。其他资源遵循[分页](../../../references/fme/tool-map.md#pagination)；失败/跳过的页无法确立缺失或无使用。

#### 创建

1. 从现有 segment 探索命名约定。如果清晰，推荐一个模式。
2. 确认流量类型存在（**列出流量类型**）并解释："The traffic type must match the flags that will use this segment."
3. 选择类型（不可变），检查确切名称/类型的唯一性，即使对新名称也要完成使用闸门；现有规则可能包含对它的引用。
4. 分别规划元数据和环境步骤。LARGE 创建仅元数据；RULE_BASED 包含一个明确约定的编辑器步骤。列出每个环境并在写入前应用生产感知确认闸门。
5. 创建已批准的元数据，然后预配每个已批准的 STANDARD 定义，或引导 RULE_BASED 编辑器步骤。在依赖写入之前重新验证闸门；遇到冲突或状态更改即停止。
6. 重新读取更改后的元数据/定义。将元数据创建与已保存的成员关系或规则分开报告；绝不暗示未完成的步骤成功。

#### 添加 / 移除键（STANDARD）

遵循 [standard-membership.md](references/standard-membership.md) 进行解析、生产感知批准、≤10,000 键的追加/移除批次和完整成员关系读回。首页检查不是验证；报告部分完成，默认绝不暴露原始键。

#### 使用情况检查

在每次变更之前遵循 [usage-check.md](../../../references/fme/usage-check.md)。扫描**所有 ACTIVE 和 ARCHIVED 项目功能标志及所有环境**，包括规则匹配器、treatment 成员关系和间接 RULE_BASED 依赖。超过 50 个功能标志时，在定义读取**之前**获得成本批准；不要缩小写入的安全扫描。失败、跳过或未解析的覆盖会阻止写入。引用需要明确的 impact 审查；在依赖项单独解决并重新运行闸门之前，删除被阻止。

#### 替换所有键（STANDARD，破坏性）

遵循[替换所有键](references/standard-membership.md#replace-all-keys)：完整盘点旧集、预览移除、获得破坏性写入批准、在**一次**调用中替换并验证确切集合相等。超过 10,000 键即停止——绝不分块替换或静默先移除后添加。空替换需要显式的清除请求和确认。

#### 更新描述 / 标签

- **更新 segment**（元数据）或**更新定义**（按环境描述）。
- 完成使用闸门，起草前/后更改，获得明确批准，然后更新并重新读取。区分仅元数据的编辑与影响评估的更改。MCP 元数据使用合并补丁；CLI 使用声明的字段处理器，而非猜测的 `--set` 数组。STANDARD 按环境描述使用**更新定义**。

#### 删除 STANDARD 定义（一个环境）

1. 完成使用闸门。如果任何直接或间接引用影响此环境，停止；在单独批准下用 `update-flag-targeting` 或规则编辑器工作流解决它，然后重新运行闸门。
2. 检查是否仍存在键：为一个键**列出键**。如果存在键，将移除作为单独的已确认操作提供；在构建该移除之前完整盘点键。
3. 任何移除后，重新运行/重新验证闸门并验证 segment 为空。不要绕过 `hasDependents`。
4. 呈现删除计划并获得明确的生产感知批准。
5. **删除定义**，然后验证确切 get 返回 404（不是授权/错误响应）。

#### 删除 Segment

1. 运行使用闸门。对于 STANDARD，用 STANDARD 调用检查所有环境定义。对于其他类型，使用权威配置证据和删除操作的依赖校验，绝不使用 STANDARD 定义调用。**删除之前**，对任何已知剩余的直接/间接引用或活动定义停止；单独解决它们，然后重新运行闸门。遇到 `hasDependents`，停止并报告依赖项；绝不绕过它。
2. 双重确认："This permanently deletes <segment> in all environments. This cannot be undone. Delete?"
3. 停止并等待明确确认；写入之前立即重新验证状态。
4. 用所选类型**删除 segment**；验证确切 get 返回 404，而不是授权/错误响应。

#### 基于规则的工作流

1. 确认确切 RULE_BASED 元数据和环境。请用户打开 Harness 规则编辑器并提供当前有序规则、匹配器、排除项和启用状态，个人键已脱敏。保留依赖检查所需的结构标识符；不要从元数据推断规则，也不要使用 STANDARD 定义/键调用。
2. 起草确切的前/后条件或排除更改。保留规则顺序、组合器、否定和无关字段；核实被引用的 segment 名称/类型和流量类型。例如，排除 STANDARD `employees` 改变的是成员关系，而非功能标志的定向规则。
3. 完成使用闸门并呈现受影响的功能标志/环境。为确切的规则编辑或启用/禁用动作获得明确的生产感知批准。
4. 让用户仅在该环境的规则编辑器中应用已批准的更改。保存之前重新验证闸门和当前配置；状态更改需要修订计划并批准。尊重任何治理/审批要求。
5. 获取新的已保存配置，并将规则、排除项和启用状态与已批准计划比较。将用户确认的证据与直接读回分开记录。草稿或未保存的编辑器视图**不是**完成；在确认已保存状态之前报告验证待定。

### 阶段 4：输出

按 [operation-summary.md](../../../templates/operation-summary.md) 总结：操作、确切名称/类型、环境、已批准更改、使用覆盖和直接/间接引用、验证证据（元数据、STANDARD 成员关系、已保存的 RULE_BASED 配置或已确认删除），以及剩余工作。将不完整的检查标记为阻塞，并区分用户确认的编辑器证据与直接读回。可用时包含返回的 Harness UI 链接。

## 示例

- “为 beta 用户创建一个流量类型为 user 的 segment”——创建流程。
- “向 staging 中的 beta_users segment 添加 500 个键”——完成使用闸门，然后批准并添加键。
- “将 early_access 中的所有键替换为此 CSV 中的键”——替换流程。
- “更新我们 LARGE segment 的描述”——带使用检查的元数据更改。
- “更改一个 RULE_BASED segment 以排除 employees”——起草、批准并验证规则编辑器更改；保留其他规则。
- “检查哪些功能标志使用 beta_users segment”——使用情况检查。
- “删除 old_experiment segment”——删除 segment。

## 性能注意事项

- 每种类型一份已分页元数据清单；列出所有类型可能需要三次以上调用。
- STANDARD 添加/移除：批次 ≤10,000；替换：一次调用 ≤10,000。
- 使用情况检查：每个项目功能标志一份已分页定义清单加上间接依赖证据。超过 50 个功能标志时，在定义读取之前获得成本批准。绝不缩小写入前的安全扫描。

## 故障排查

| 错误 | 原因 | 修复 |
|-------|-------|-----|
| `segment_type is required`（400） | 获取/更新/删除 segment 时需要 segment 类型 | 指定 segment 类型（STANDARD、LARGE 或 RULE_BASED） |
| 删除 segment 时 `hasDependents` | 仍有定义或引用 | 停止；为所选类型单独解决依赖项，然后重新运行使用闸门；优先保持 segment 完整 |
| 删除定义时 `hasDependents` | 该环境中仍有键或依赖项 | 完成使用闸门；单独解决引用，盘点并批准任何键移除，然后在重试删除之前重新运行闸门 |
| STANDARD 键与功能标志不匹配 | 流量类型不匹配、错误的 segment 引用，或该环境无 STANDARD 定义 | 核实流量类型和功能标志规则；如需要，通过已确认的使用闸门流程创建 STANDARD 定义 |
| 移除键时 `keys must have at least 1` | 键列表为空 | 移除操作需要至少一个键 |
| `keys max 10000` | 请求过大 | 仅批量追加/移除操作；停止过大的替换 |
| 使用覆盖不完整或未解析 | 某页、规则形状或依赖链未解决 | 停止写入；获取缺失的配置/覆盖并重新运行闸门 |

通用错误：参见 [tool-map.md](../../../references/fme/tool-map.md#common-errors)。
