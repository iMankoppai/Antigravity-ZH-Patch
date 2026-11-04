---
name: manage-flag-lifecycle
description: >-
  管理 Harness FME 功能标志的元数据和生命周期：更新描述、
  标签、owners、发布状态；评估归档就绪状态（使用情况、实验、依赖项）；
  归档/取消归档；删除一个环境中的定义；删除功能标志。支持
  单个功能标志或显式的小列表（≤ 20）。在要求更改功能标志元数据、
  归档功能标志、检查功能标志是否可安全归档、取消归档功能标志，或删除
  功能标志/定义时使用。不要用于定向更改（update-flag-targeting）、创建
  功能标志（create-feature-flag）、跨项目发现陈旧功能标志（discover-feature-flags）、
  移除功能标志代码（cleanup-feature-flags），或发布流水线（fme-pipeline）。
  触发短语：更新功能标志描述、功能标志元数据、归档功能标志、取消归档功能标志、
  删除功能标志、归档就绪、功能标志是否可安全归档、功能标志生命周期。
metadata:
  author: Harness
  version: 1.2.1
  mcp-server: harness-mcp
  summary: Flag metadata, archive readiness, archive/unarchive, and delete
license: Apache-2.0
compatibility: Requires the Harness MCP server or the Harness CLI
---

# 管理功能标志生命周期

管理 Harness FME 功能标志的元数据、归档就绪状态、归档/取消归档和删除。相关：`update-flag-targeting`（定向）、`discover-feature-flags`（陈旧功能标志）、`cleanup-feature-flags`（代码移除）。

## 工具

通过 Harness MCP 服务器或 Harness CLI 工作；名称来自 [tool-map.md](../../../references/fme/tool-map.md)。

| 操作 | MCP | CLI |
|-----------|-----|-----|
| 列出环境 | `harness_list` · `fme_environment` · `compact: false` | `harness list fme_environment --json` |
| 列出功能标志 | `harness_list` · `fme_feature_flag` · `size: 50` · `filters: { name?, tags?, rollout_status_id?, offset? }` · `compact: false` | `harness list feature_flag --search <name> --status <ACTIVE\|ARCHIVED> --json`（CLI 没有 `--tags`/`--rollout-status-id`；在完整 JSON 上客户端过滤，而 MCP 的 `tags`/`rollout_status_id` 过滤器在服务端处理） |
| 获取功能标志 | `harness_get` · `fme_feature_flag` · `params.feature_flag_name` | `harness get feature_flag <name> --json` |
| 更新功能标志 | `harness_update` · `fme_feature_flag` · `params.feature_flag_name` · `body: { description?, tags?, owners?, rolloutStatus? }` | `harness update feature_flag <name> --set description="..." --set rollout_status=<uuid>`（CLI 字段 id 是 `rollout_status`；`--set rolloutStatus.id=` 不匹配 spec 的可变字段 id 并会失败） |
| 列出定义 | `harness_list` · `fme_feature_flag_definition` · `params.feature_flag_name` · `filters: { offset: 0, limit: 100 }`（递增 offset 遍历每一页） · `compact: false` | `harness list feature_flag:definition <flag> --json` |
| 获取定义 | `harness_get` · `fme_feature_flag_definition` · `params: { feature_flag_name, environment_id }` | `harness get feature_flag:definition <flag> --env <env-id> --json` |
| 删除定义 | `harness_delete` · `fme_feature_flag_definition` · `params: { feature_flag_name, environment_id }` | `harness delete feature_flag:definition <flag> --env <env-id>` |
| 归档功能标志 | `harness_execute` · `fme_feature_flag` · `action="archive"` · `params.feature_flag_name` · `body: { comment?, title? }` | `harness execute feature_flag:archive <name> --comment "..." --title "..."` |
| 取消归档功能标志 | `harness_execute` · `fme_feature_flag` · `action="unarchive"` · `params.feature_flag_name` · `body: { comment?, title? }` | `harness execute feature_flag:unarchive <name> --comment "..."` |
| 删除功能标志 | `harness_delete` · `fme_feature_flag` · `params.feature_flag_name` | `harness delete feature_flag <name>` |
| 列出实验 | `harness_list` · `fme_experiment` · `filters: { parent_type: "FEATURE_FLAG", parent_name, environment_id?, status: ["ACTIVE", "PAUSED"], offset: 0, limit: 100 }`（应用[分页完整性检查](../../../references/fme/tool-map.md#pagination)） · `compact: false` | `harness list experiment --parent-type FEATURE_FLAG --parent-name <name> --status ACTIVE --json`，然后用 `--status PAUSED` 再来一次 |
| 列出发布状态 | `harness_list` · `fme_rollout_status` · `compact: false` | `harness list rollout_status --json` |

## 输出

按 [operation-summary.md](../../../templates/operation-summary.md) 的结构化摘要：
- **元数据：** 更改字段的前 → 后
- **归档就绪：** 结论（ready / caution / blocked）、按环境的 `impressions.lastImpressionAt`、活动实验、依赖项（如果检查）
- **归档/取消归档/删除：** 验证结果（状态或 404）、按环境的影响
- 下一步或后续动作

## 说明

所有写入遵循 [write-safety.md](../../../references/fme/write-safety.md)。概念见 [concepts.md](../../../references/fme/concepts.md)。

### 阶段 1：确定范围

遵循 [scope-establishment.md](../../../references/scope-establishment.md)。在继续之前重申范围。

### 阶段 2：收集输入

询问功能标志名称和操作。对于元数据更新，询问要更改哪些字段。对于删除定义，询问目标环境 ID。如果用户问“这个功能标志是否可安全归档”，运行归档就绪闸门（阶段 5）并停在那里。

### 阶段 3：读取当前状态

**获取功能标志**元数据。对于归档/取消归档/删除操作，还要使用显式 MCP `filters.limit: 100` **列出定义**并遍历每一页；`size` 不控制此列表。定义、环境和实验遵循[分页](../../../references/fme/tool-map.md#pagination)；不完整的清单会停止就绪/删除检查。报告当前元数据（description、tags、owners、rolloutStatus、status）以及按环境的定义摘要（环境 ID/名称、impressions.lastImpressionAt、isKilled、defaultTreatment）。

### 阶段 4：元数据更新

如果更新 **rollout status**，先**列出发布状态**，将用户的名称解析为 UUID，然后展示解析后的名称。Tags 和 owners 是数组，在合并补丁中整体替换。先读取，合并用户的更改，然后发送完整的新数组。

呈现计划：`<flag> metadata update — <reason>`。展示每个更改字段的前 → 后。按 [write-safety.md](../../../references/fme/write-safety.md) 停止并确认。

以 `{id: "<uuid>"}` 形式的 rolloutStatus **更新功能标志**。**验证**并确认字段与计划匹配。

### 阶段 5：归档就绪闸门

在归档之前**每次都运行**，即使之前检查过。四项检查收集数据，然后按 [concepts.md](../../../references/fme/concepts.md#staleness-and-readiness) 和 [write-safety.md](../../../references/fme/write-safety.md#experiment-check) 呈现结论：

1. **每个环境的曝光：** 为该功能标志**列出定义**。为每个环境记录 `impressions.lastImpressionAt`（ISO-8601；`null` = 从未评估；缺失 = 未知），并注明是否为生产环境。

2. **实验检查：** 为该功能标志跨所有环境**列出实验**，状态为 ACTIVE 和 PAUSED，应用共享的分页完整性检查（CLI 上两个状态查询）；`total` 等于页长度的整页仍需要另一次请求。不完整的扫描会停止写入。ACTIVE → **阻塞**（停止）。PAUSED → **谨慎**（警告，按 [write-safety.md](../../../references/fme/write-safety.md#experiment-check) 要求明确知晓）。COMPLETED → 忽略。

3. **依赖功能标志：** 按 [tool-map.md](../../../references/fme/tool-map.md#reverse-lookup-scans) 的可选加入扫描。如果拒绝，标记 `dependents: unchecked`。

4. **已归档：** 检查功能标志的 status 字段。如果为 ARCHIVED，报告并跳过归档（无操作）。

按 [concepts.md](../../../references/fme/concepts.md#staleness-and-readiness) 呈现结论（**ready** / **caution** / **blocked**），并附每一条理由。**blocked** 停止归档；**caution** 需要明确知晓。如果任何生产环境有近期流量，先推荐 `cleanup-feature-flags`。如果用户问的是“这是否可安全归档”，在此停止。

### 阶段 6：归档

运行就绪闸门（阶段 5）。如果**阻塞**，停止。如果**谨慎**，要求明确知晓。解释："Archiving `<flag>` affects **all** environments. SDKs will return `control`."

按 [write-safety.md](../../../references/fme/write-safety.md) 确认："This archives `<flag>` in **all** environments. SDKs will return `control`. Archive?"

带审计注释和标题**归档功能标志**。遇到 409（OPA 治理）：报告它，绝不绕过，绝不改为删除。停止。**验证：** status 字段为 ARCHIVED。

### 阶段 7：取消归档

先读取功能标志和所有定义（阶段 3）。定向会恢复到功能标志归档时的状态。按 [write-safety.md](../../../references/fme/write-safety.md) 确认："Unarchiving `<flag>` will resume the previous targeting. <per-env summary>. Unarchive?"

带审计注释和标题**取消归档功能标志**。遇到 409（依赖项阻止）：报告错误。停止。**验证：** status 字段为 ACTIVE。

### 阶段 8：删除定义（一个环境）

**列出环境**以检查 isProduction。为此功能标志**列出实验**（ACTIVE 和 PAUSED）并限定到此环境，按[实验检查](../../../references/fme/write-safety.md#experiment-check)完成每一页。**ACTIVE → 阻塞：停止；知晓也不能允许删除定义。PAUSED → 谨慎：警告并要求明确知晓。COMPLETED → 忽略。** 不完整或失败的实验扫描也会停止删除。不要自动暂停/完成实验以绕过阻止；解决其生命周期是单独的已批准工作流，随后重新检查。读取当前定义并报告其实时 `defaultTreatment` 及是否被终止，以便确认时点名将被移除的内容，而不仅是环境。解释："Deleting the `<flag>` definition in `<env>` (currently serving `<defaultTreatment>`) means SDKs in that environment will get `control`." 仅在闸门通过后，按 [write-safety.md](../../../references/fme/write-safety.md) 确认。

**删除定义。** 用 get 返回 404 **验证**。预期 404。如果仍然存在，报告失败。

### 阶段 9：删除功能标志

**优先归档。** 解释删除是永久的，并会删除每个环境的定义。删除之前，运行依赖功能标志扫描（阶段 5 检查 3），因为依赖项会使删除以一个无用的错误失败。要求先归档（运行阶段 6）再加上第二次、单独的确认并点名该功能标志。仅当用户明确确认两个步骤时才继续。

确认："This permanently deletes `<flag>` and all its definitions. This can't be undone. Delete?" **删除功能标志。** 如果删除失败，报告错误并停止。用 get 返回 404 **验证**。预期 404。如果仍然存在，报告失败。

### 阶段 10：批量（显式列表 ≤ 20 个功能标志）

对于跨项目发现候选，路由到 `discover-feature-flags`。对每个功能标志运行归档就绪闸门（阶段 5）。呈现一张表：Flag | Verdict | Reasons。仅为就绪的那些确认一次。每个谨慎的功能标志都需要各自的知晓；阻塞的功能标志跳过。顺序执行并报告每个功能标志的结果。

## 示例

- “将 `dark-mode` 的描述更新为 'Enable new dark theme UI'”——元数据更新；确认并更新。
- “`new-checkout-flow` 是否可安全归档？”——运行就绪闸门（阶段 5）；报告结论并停止。
- “归档 `beta-feature`”——就绪闸门、确认、归档、验证。
- “取消归档 `holiday-promo`”——读取定义、展示将恢复的内容、确认、取消归档、验证。
- “删除 staging 中的 `test-flag` 定义”——完成按环境限定的实验检查；ACTIVE 阻止，PAUSED 需要知晓。然后才确认、删除并验证 404。
- “删除 `old-experiment`”——优先归档；如果用户坚持，先归档、再次确认、删除功能标志、验证 404。
- “将 `launched-feature` 的发布状态更改为 'Complete'”——将状态名称解析为 UUID、确认、更新、验证。

## 性能注意事项

- 一份完全分页的定义清单覆盖功能标志的各环境；它可能需要多次请求。绝不把一页当作完整集合。
- 依赖功能标志扫描成本：项目中的每个功能标志各一份已分页定义清单。按 [tool-map.md](../../../references/fme/tool-map.md#reverse-lookup-scans) 作为可选加入提供。
- 批量操作（≤ 20）：就绪检查是并行读取；写入是顺序的。

## 故障排查

| 问题 | 操作 |
|-------|--------|
| 归档时 409（治理） | 报告错误；绝不绕过，绝不改为删除 |
| 取消归档时 409（依赖项） | 报告错误；停止 |
| 删除功能标志失败 | 很可能是依赖功能标志或待批准。运行依赖项扫描；报告错误并停止。不要重试。 |
| Tags 未更新 | 先读取；发送完整的新数组（合并补丁替换整个数组） |
| 发布状态名称未找到 | 列出发布状态；向用户展示可用名称 |
| `impressions.lastImpressionAt` 缺失 | 视为未知（而非“未使用”）；推荐谨慎并要求归档前知晓 |

通用错误参见 [tool-map.md](../../../references/fme/tool-map.md#common-errors)。
