---
name: cleanup-feature-flags
description: >-
  从应用代码中移除已发布上线的 Harness FME 功能标志，保留 FME
  当前所服务的 treatment，并开启一个拉取请求。在要求从代码中移除功能标志、
  在发布后硬编码获胜的 treatment，或偿还某个特定功能标志的标志债务时使用。不要用于
  查找陈旧功能标志（discover-feature-flags）或在 FME 中归档和删除功能标志
  （manage-flag-lifecycle）。触发短语：从代码中移除功能标志、硬编码 treatment、功能标志
  清理、标志债务、清理功能标志。
metadata:
  author: Harness
  version: 1.2.2
  mcp-server: harness-mcp
  summary: Remove a launched FME flag from code and open a PR; archive is handed to manage-flag-lifecycle
license: Apache-2.0
compatibility: Requires the Harness MCP server or the Harness CLI
---

# 清理功能标志

从应用代码中移除一个已发布上线的 FME 功能标志，并保留 FME 当前所服务的那一分支。工作以 PR 结束。此处 FME 为只读；归档稍后在 `manage-flag-lifecycle` 中进行。

相关：`discover-feature-flags` 查找候选（陈旧审计）；`manage-flag-lifecycle` 在更改部署后归档。

## 工具

通过 Harness MCP 服务器或 Harness CLI 工作；名称来自 [tool-map.md](../../../references/fme/tool-map.md)。

| 操作 | MCP | CLI |
|-----------|-----|-----|
| 列出环境 | `harness_list` · `fme_environment` · `compact: false` | `harness list fme_environment --json` |
| 获取功能标志 | `harness_get` · `fme_feature_flag` · `params: { feature_flag_name }` | `harness get feature_flag <flag> --json` |
| 列出功能标志定义 | `harness_list` · `fme_feature_flag_definition` · `params: { feature_flag_name }` · `filters: { offset: 0, limit: 100 }` · `compact: false` | `harness list feature_flag:definition <flag> --json` |
| 列出实验 | `harness_list` · `fme_experiment` · `filters: { parent_type: "FEATURE_FLAG", parent_name, status: ["ACTIVE", "PAUSED"], offset: 0, limit: 100 }`（应用[分页完整性检查](../../../references/fme/tool-map.md#pagination)） · `compact: false` | `harness list experiment --parent-type FEATURE_FLAG --parent-name <flag> --status ACTIVE --json`，然后用 `--status PAUSED` 再来一次 |

## 说明

在给出结论之前加载 [readiness.md](references/readiness.md)。在搜索代码之前加载 [sdk-patterns.md](../../../references/fme/sdk-patterns.md)。

### 阶段 1：确定范围

遵循 [scope-establishment.md](../../../references/scope-establishment.md)。在确认关键环境之前，按[分页](../../../references/fme/tool-map.md#pagination)完整分页**列出环境**：默认是那些 `isProduction` 的，加上用户添加的任何环境。关键集必须非空，并在任何后续阶段之前向用户明确确认。如果没有环境被标记为 `isProduction` 且用户也未指定任何环境，停止并询问哪些环境是关键的——不要将空的关键集视为空洞地就绪。

### 阶段 2：挑选功能标志

如果用户指定了功能标志，**获取功能标志**以确认其存在，并记下其 `status` 和 `rolloutStatus`。如果他们想要候选，则移交给 `discover-feature-flags`（陈旧审计）并带着一个功能标志回来。

### 阶段 3：正向 treatment 与结论

1. 使用显式 MCP `filters.limit: 100` 并递增 `filters.offset`，直到出现短页（`size` 被忽略），完整分页**列出功能标志定义**。不完整的覆盖会停止代码移除；它无法确立缺失的定义或实时的正向 treatment。按 [readiness.md](references/readiness.md#forward-treatment-per-environment) 为每个关键环境解析正向 treatment。如果任何调用点使用 `WithConfig`，还要解析并比较每个关键环境该 treatment 的 `configurations` 值——treatment 名称相同但配置不同即为**阻塞**，而非就绪。
2. 用**列出实验**运行[实验检查](../../../references/fme/write-safety.md#experiment-check)，在得出结论前覆盖 ACTIVE 和 PAUSED 结果的每一页。不完整的扫描会停止代码移除。此处 ACTIVE 意味着**阻塞**：代码移除会结束实验。PAUSED 意味着**谨慎**。
3. 按 [readiness.md](references/readiness.md#verdict) 给出结论。遇到**阻塞**即停止。

绝不要从代码的默认值或回退值推断正向 treatment。

### 阶段 4：查找调用点

在应用代码仓库中，按 [sdk-patterns.md](../../../references/fme/sdk-patterns.md) 识别 SDK 并搜索功能标志键、批量调用、功能标志集、配置文件条目和测试。对每个命中，记录 `file:line`、哪个分支是正向分支，以及任何副作用（跟踪、指标、日志）。

- 如果你发现**动态键**（`"prefix-" + id`、`` `flag-${id}` ``），结论为**阻塞**。停止并询问用户如何继续；自动化移除无法完整。
- 如果你未发现命中，该功能标志可能位于另一个代码仓库或仅在一个功能标志集中。这是**谨慎**。

### 阶段 5：呈现计划并等待

展示：
- 每个关键环境的正向 treatment 及原因；
- 每个调用点、要保留的分支和要删除的代码；
- 结论，以及每一条谨慎理由；
- 每个关键环境的最后曝光。

如果正向 treatment 是 `control` 或被终止的 `defaultTreatment`，明确说明较新的代码路径将被删除。在用户明确确认此计划之前不要编辑任何内容。

### 阶段 6：编辑并验证

1. 在应用代码仓库的新分支上工作。
2. 在每个调用点，保留正向分支；如果使用了 `WithConfig`，则内联配置值。移除死分支，以及任何仅用于功能标志的常量、包装器、导入、测试、fixture、localhost 或离线条目和文档。不要重构无关代码。
3. 再次搜索该键以及批量和功能标志集模式。任何剩余的命中都必须解释：同形异义、其他服务，或用户想保留的 fixture。
4. 运行代码仓库自身的构建、lint 和测试。在继续之前修复任何失败。

### 阶段 7：开启 PR

在推送或开启 PR 之前与用户确认。使用代码仓库的常规工具以及其自身的 PR 模板和约定（例如 `.github/pull_request_template.md` 或 CONTRIBUTING）。不要强加格式。无论模板如何，描述必须包含：

- 功能标志键以及所保留的 treatment（或配置值）；
- FME 证据：org 和 project、检查过的关键环境、每个环境中正向 treatment（如果使用 `WithConfig` 还包括配置值）、结论及用户知晓的任何谨慎、实验检查结果，以及每个关键环境中的最后曝光；
- 移除了什么：分支、测试、配置、导入；
- 如何验证：干净的搜索以及构建和测试运行；
- **搜索了哪些代码仓库/服务**——此处的干净搜索不能证明该功能标志在其他地方未被使用；
- 后续动作：在此更改部署到评估该功能标志的所有位置后，用 `manage-flag-lifecycle` 归档该功能标志，以及任何其他可能仍引用它的代码仓库或服务。

### 阶段 8：移交

报告 PR 链接和后续动作：“此更改部署后，使用 `manage-flag-lifecycle` 归档 `<flag>`。” 不要在此归档或删除。

## 示例

- “从此代码仓库移除 `new-checkout-flow`”：结论、计划、确认、编辑、验证、PR，然后归档移交。
- “为 `dark-mode` 硬编码获胜 treatment”：从实时定义解析正向 treatment，而非从代码。
- “此功能标志在 prod 中已被终止，清理它”：正向 treatment 是 `defaultTreatment`；警告新路径将被删除。
- “哪些功能标志可以清理？”：移交给 `discover-feature-flags`（陈旧审计）。
- “也归档该功能标志”：先在此开 PR，部署后再用 `manage-flag-lifecycle`。

## 性能注意事项

- 一份完整的已分页**列出功能标志定义**清单覆盖各环境；它可能需要多次调用。一页不是整个清单。
- 先搜索功能标志键，再搜索批量和功能标志集模式。包装器常常隐藏字面键。
- 将 diff 限制在该功能标志上。无关重构会让 PR 更难审查和回退。

## 故障排查

| 问题 | 操作 |
|-------|--------|
| 关键环境不一致 | **阻塞**。请用户对齐定向（`update-flag-targeting`）或缩小关键集。 |
| 某个环境没有定义 | 其正向 treatment 是 `control`，因此回退分支在该处生效。将其视为**谨慎**并确认。 |
| 功能标志已归档但仍在代码中 | 允许。正向 treatment 是 `control`；确认回退分支是用户当前得到的。 |
| 该功能标志上有 ACTIVE 实验 | **阻塞**。先完成它（`manage-experiments`）。 |
| 代码使用 `WithConfig` | 从定义中硬编码该 treatment 的配置值，而不仅是名称。如果关键环境共享 treatment 名称但配置值不同，那是**阻塞**，而非就绪——硬编码会静默地使环境行为产生分歧。 |
| 没有明确的关键环境集 | **停止并询问。** 不要在空或未确认的关键集上默认“就绪”。 |
| 仅搜索了一个代码仓库 | 在 PR 和摘要中记录该范围。在确认或搜索其他代码仓库/服务之前，不要声称该功能标志完全未被使用。 |
| 动态功能标志键 | **阻塞**。停止并询问用户。 |
| 未找到调用点 | **谨慎**。在声称该功能标志未被使用之前，检查其他代码仓库和功能标志集。 |
