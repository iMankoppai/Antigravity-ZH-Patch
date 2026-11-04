---
name: fme-pipeline
description: >-
  为功能标志发布场景生成带 FeatureFlag 或 Custom 阶段的 Harness 流水线：
  渐进放量、多环境晋级、beta 群体、配置晋级、
  引导、退役、segment 同步、测试定向。将 FmeFlag* 步骤与
  可选的 HarnessApproval/Wait/Jira/ServiceNow/指标闸门组合。在要求构建
  功能标志发布流水线、跨环境晋级功能标志或自动化功能标志
  生命周期时使用。不要用于直接功能标志操作（update-flag-targeting）或通用
  CI/CD（create-pipeline）。相关：create-trigger（自动化）、run-pipeline（执行）。
  触发短语：FME pipeline、feature flag pipeline、flag rollout pipeline、
  progressive rollout、multi-environment promotion、flag bootstrap。
metadata:
  author: Harness
  version: 1.2.2
  mcp-server: harness-mcp
  summary: Generate FME pipelines for rollout scenarios, gates, and flag lifecycle
license: Apache-2.0
compatibility: Requires the Harness MCP server or the Harness CLI
---

# FME 流水线

为功能标志发布场景组合带 FmeFlag* / FmeSegment* 步骤的 Harness 流水线。生成量身定制的流水线——渐进放量、多环境晋级、beta 群体、配置晋级、引导、退役、segment 同步和测试定向——而非单一固定模板。

**相关：** 直接功能标志操作 → `/update-flag-targeting`。实验 → `/manage-experiments`、`/review-experiment-results`。功能标志创建 → `/create-feature-flag`。生命周期 → `/manage-flag-lifecycle`。Segment → `/manage-segments`。状态 → `/explain-flag`。发现 → `/discover-feature-flags`。代码移除 → `/cleanup-feature-flags`。运行 → `/run-pipeline`。触发器 → `/create-trigger`。

## 工具

通过 Harness MCP 服务器或 Harness CLI 工作；名称来自 [tool-map.md](../../../references/fme/tool-map.md)。

| 操作 | MCP | CLI |
|-----------|-----|-----|
| **列出环境** | `harness_list` · `fme_environment` · `compact: false` | `harness list fme_environment --json` |
| **获取功能标志** | `harness_get` · `fme_feature_flag` · `params: { feature_flag_name }` | `harness get feature_flag <name> --json` |
| **列出定义** | `harness_list` · `fme_feature_flag_definition` · `params: { feature_flag_name }` · `filters: { offset: 0, limit: 100 }` · `compact: false` | `harness list feature_flag:definition <name> --json` |
| **列出发布状态** | `harness_list` · `fme_rollout_status` · `compact: false` | `harness list rollout_status --json` |
| **列出实验** | `harness_list` · `fme_experiment` · `filters: { parent_type: "FEATURE_FLAG", parent_name, status: ["ACTIVE", "PAUSED"] }` · `compact: false` | `harness list experiment --parent-type FEATURE_FLAG --parent-name <flag> --status ACTIVE --json`，然后用 `--status PAUSED` 再来一次 |
| **列出用户组** | `harness_list` · `user_group` | `harness list user_group --json` |
| **列出连接器** | `harness_list` · `connector` | `harness list connector --json` |
| **获取项目** | `harness_list` · `project` · `org_id` | `harness list project --org <org> --json` |
| **获取流水线** | `harness_get` · `pipeline` · `params: { pipeline_id }` · `org_id` · `project_id` | `harness get pipeline <id> --org <org> --project <proj> --json` |
| **创建流水线** | `harness_create` · `pipeline` · `org_id` · `project_id` · `body: { yamlPipeline }` | `harness create pipeline -f pipeline.yaml --org <org> --project <proj>` |
| **更新流水线** | `harness_update` · `pipeline` · `params: { pipeline_id }` · `org_id` · `project_id` · `body: { yamlPipeline }` | `harness update pipeline <id> -f pipeline.yaml --org <org> --project <proj>` |

## 说明

**写入前确认。** 在用户明确确认计划之前，不要创建或更新。

**无自动指标回滚。** 当 JEXL 条件为真时，`FmeMetricCheck` 会使步骤失败——它不会终止功能标志。回滚需要显式的 `FmeFlagKill` 阶段。

### 阶段 1：确定范围

遵循 [scope-establishment.md](../../../references/scope-establishment.md)。重申：`Working in org=..., project=...`

### 阶段 2：选择模式

| 模式 | 用户信号 | 结果 |
|------|-------------|---------|
| **Design**（默认） | "How should we roll out…?" | 模式 + 阶段计划；不写 YAML |
| **New pipeline** | "Create a rollout pipeline for…" | 计划 + YAML 草稿；确认后创建 |
| **Update existing** | "Add FME stages to pipeline X" | 获取、合并、显示 diff；确认后更新 |

### 阶段 3：挑选场景

将用户意图映射到 [scenarios.md](references/scenarios.md)：

| 用户意图 | 场景 | 主要步骤 |
|-------------|----------|---------------|
| 在一个环境中增加流量 | **R1** 渐进放量 | 终止状态下的初始分配 → 手动读回/批准 → 恢复 → 浸泡/后续分配（5→25→50→100） |
| 跨 dev/qa/staging/prod 晋级 | **R2** 多环境晋级 | 每个环境一个阶段，初始分配 → 读回/批准 → 恢复 → 浸泡/放量 |
| 先 beta 用户，然后所有人 | **R3** Beta 群体 | 0% 默认 + beta 定向 → 全受众读回/批准 → 恢复 → 浸泡/放量 |
| 将 staging 配置复制到 prod | **R4** 配置晋级 | `FmeFlagDefinitionInstructions` 或 `FmeFlagPatchDefinition` |
| 创建带初始定向的功能标志 | **L1** 功能标志引导 | `FmeFlagCreate` → treatment → 终止/恢复/目标 → 功能标志集 |
| 为已完全发布上线的功能标志准备退役 | **L2** 功能标志退役（仅准备） | 编写时验证 100% → 更新 rolloutStatus → 移除功能标志集 → 将归档步骤本身移交给 `/manage-flag-lifecycle`，执行时重新检查 |
| 从外部系统导入键 | **L3** Segment 同步 | `ShellScript` 获取 → `FmeSegmentAddRemoveTargets` |
| 添加测试键、运行测试、清理 | **L4** 测试定向 | 添加键 → `ShellScript` 测试 → 移除键 |

### 阶段 4：收集输入

仅收集缺失的内容。不要猜测环境名称、treatment 或审批组。对于所有场景：功能标志名称、基线及变体 treatment、目标环境、现有流水线（更新模式）。对于 R2：每个环境的放量计划和闸门。询问：可复用流水线（功能标志名称作为 `<+input>`）还是一次性（字面名称）？闸门策略：绝不添加用户未同意的闸门。已终止功能标志的恢复需要下面的手动读回/批准检查点；如果拒绝，停止自动恢复并移交，而不是省略该防护。询问使用哪些构建块：闸门（`HarnessApproval`、`Wait`、`FmeMetricCheck`）、回滚（失败时的 `FmeFlagKill` 阶段）、工单集成（Jira/ServiceNow），或都不使用。对于批准：用户组、最少人数。

**L1 是功能标志尚不存在的唯一场景。** 不要要求现有功能标志、其定义或定向状态作为前置条件。而是收集：功能标志名称（并确认它尚未被占用——参见阶段 5）、流量类型（必须存在于项目/账户范围中）、treatment、默认/基线 treatment、每个环境的终止/恢复计划、若附加则给出功能标志集名称。

### 阶段 5：发现上下文

**列出环境**以构建晋级顺序提议（非生产在前，生产通过 `isProduction` 排在最后）。**确认顺序。**

**对于 R1–R4 和 L2–L4（功能标志必须已存在）：** **获取功能标志** + **列出定义**，以按环境记录：`isKilled`、`defaultTreatment`、`defaultRule`、`trafficAllocation`、`rules`、定向。

**对于 L1（功能标志引导）：** 做相反的检查——**获取功能标志**以确认名称尚未被使用（若已被使用则停止并询问），并确认所请求的流量类型在相关范围中存在。不要调用**列出定义**期望先前状态；目前还没有。

**已终止功能标志的恢复（R1/R2/R3 及任何先前定向过的功能标志）：** 在终止状态下写入已批准的初始分配/规则/目标；然后在 `FmeFlagRestore` 之前要求**手动读回和 `HarnessApproval` 检查点**，随后进行浸泡/后续增加。审批人必须通过 `/explain-flag` 或 Harness UI 检查完整定义：仍是终止状态、已批准的 `defaultRule`/`trafficAllocation`、所有规则以及 treatment 级别的键/segment 成员关系、服务的默认/配置，以及当前实验影响。拒绝不匹配或过期的证据。R3 必须核实没有现有规则/目标暴露非 beta 用户；0% 默认加上追加的 beta 键不能证明隔离。如果初始为活动状态，明确计划立即的实时影响，并省略不必要的恢复/续跑检查点；绝不要静默终止它。

**此目录中不存在原生读回步骤。** 使用约定的手动检查点，而不是伪造的验证器或 API 成功声明。如果没有审批人/读回，在自动恢复之前停止并移交。此检查的是存储的配置，而非 SDK 传播；浸泡后的 `FmeMetricCheck` 是单独的测量。更改 `defaultTreatment` 或其配置会立即影响已终止的流量——在批准前披露该影响。

对于 L2：**列出发布状态**。对于批准：**列出用户组**。对于工单：**列出连接器**（类型 Jira 或 ServiceNow；如果缺失，移交 `/create-connector`）。如果不可用，跳过并询问用户详情。

### 阶段 6：呈现计划并等待

在任何写入之前，展示：场景与理由、环境晋级顺序、阶段表（stage | environment | steps | gates | notes）、流水线变量（功能标志名称作为 `<+input>`，treatment 作为变量——直接在分配中的 treatment `<+input>` 会被拒绝）、前置条件（项目/功能标志/审批人/连接器存在——对于 L1，是项目/流量类型而非功能标志）、回滚路径（当 `pipelineStatus: Failure` 时 `FmeFlagKill`）、当前 vs 计划状态。如果定向步骤可能使实验失效，或对于 L2 退役准备场景，用**列出实验**运行[实验检查](../../../references/fme/write-safety.md#experiment-check)；链接并确认已知晓。对于 L2，还要明确说明生成的流水线止步于归档之前，`/manage-flag-lifecycle` 必须在执行时重新验证就绪状态（陈旧性、依赖项、活动/暂停实验）后再归档。**在用户确认之前不要继续。**

### 阶段 7：生成 YAML

从 [blueprints.md](references/blueprints.md) 和 [building-blocks.md](references/building-blocks.md) 组合。从 [step-catalog.md](references/step-catalog.md) 获取步骤字段。YAML 规则：FME 阶段使用 `type: Custom`（schema 允许功能标志步骤使用 `type: FeatureFlag`，但 Custom 更灵活，可将 FME 步骤与 Wait/审批/脚本混合）。Custom 阶段需要 `failureStrategies`（`MarkAsFailure`；不用 `StageRollback`）。阶段名称：`^[a-zA-Z_0-9-.][-0-9a-zA-Z_\s.]{0,127}$`。步骤标识符：`^[a-zA-Z_][0-9a-zA-Z_]{0,127}$`。`environment` = FME 环境名称/ID（区分大小写）。分配：0–100 的整数，总和为 100。**对类布尔 treatment 名称加引号**（`"on"`、`"off"`）。阶段 `when.pipelineStatus`：`Success`、`Failure` 或 `All`。**流水线 YAML 必须包含 `pipeline:` 根**，并作为 **YAML 字符串**传递。**Treatment `<+input>` 被拒绝**——使用流水线变量。步骤命名陷阱：`FmeFlagSetIndividualTargets` 而非 `FmeFlagSetTargets`，`FmeFlagAddRemoveIndividualTargets` 而非 `FmeFlagAddRemoveTargets`，`FmeSegmentAddRemoveTargets` 而非 `FmeSegmentAddRemoveKeys`。如果是更新模式，合并前**获取流水线**；显示 diff。写入前展示 YAML。

### 阶段 8：创建或更新（确认后）

遵循 [write-safety.md](../../../references/fme/write-safety.md)。验证项目（**获取项目**），然后**创建流水线**或**更新流水线**（YAML 作为字符串）。遇到校验错误时，读取消息、修复、重试。**不要**运行；指向 `/run-pipeline`。

### 阶段 9：总结

遵循 [operation-summary.md](../../../templates/operation-summary.md)：操作、范围、流水线 ID、每个阶段做什么、确认了什么、回滚路径、如何运行、后续动作。

## 未涵盖

触发器（用 `/create-trigger`）、定时启动、CD/CI 耦合（用 `/create-pipeline`）、治理/OPA、kill-switch 运行手册、实验启动/分析（用 `/manage-experiments`、`/review-experiment-results`、`/choose-metric`、`/create-metric`、`/instrument-metric`）、受控发布（FME-18554 已推迟）、`FmeFlagSetImpressionTracking`/`FmeChangeProposalSubmit`、运行流水线（用 `/run-pipeline`）、直接功能标志更改（用 `/update-flag-targeting`）。

## 示例

- **R1**："Build a pipeline to roll out `new-checkout-flow` 10% at a time in staging with approval before each increase"
- **R2**："Promote `dark-mode` from dev → staging → prod, with prod needing approval and slower ramp"
- **R3**："Enable `new-search` for beta users first, then ramp to 10% → 50% → 100% for everyone"
- **R4**："Copy the staging targeting rules and allocation to prod"
- **L1**："Create `dark-mode` flag with `on` and `off` treatments, keep it killed in prod, restore it in dev"
- **L2**："Prepare `old-checkout-flow` for retirement now that it's at 100% `off` everywhere"——仅生成状态更新和功能标志集分离阶段；归档本身在全新就绪检查后于 `/manage-flag-lifecycle` 中进行

## 性能注意事项

- **一份完全分页的定义清单**覆盖各环境，而非一次调用。MCP 定义列表忽略 `size`：设置 `filters.limit: 100` 并递增 `filters.offset` 直到出现短页。环境清单也遵循[分页](../../../references/fme/tool-map.md#pagination)；不完整的读取无法确立定义缺失或环境可安全定向。
- **Design 模式避免写入**——头脑风暴最快。
- **大型多环境流水线**：提议增量交付（先 staging，后 prod 跟进）。

## 故障排查

| 问题 | 解决 |
|-------|------------|
| **各环境定向不一致** | 不要生成与 staging 矛盾的 prod 步骤。提供配置晋级或手动对齐。 |
| **功能标志在目标中已终止** | 写入已批准的初始定向 → 手动全定义读回/批准 → 恢复 → 浸泡/后续增加。如果验证或批准不可用则停止；披露对已终止功能标志所服务默认/配置的任何立即更改。 |
| **L2 流水线期望自动归档** | 按设计不会。编写时的 100% 发布不是归档就绪——陈旧性、依赖项和活动/暂停实验必须在执行时重新检查。生成的流水线仅更新发布状态并分离功能标志集；带着新证据移交给 `/manage-flag-lifecycle` 执行归档步骤。 |
| **L1 发现返回 "flag not found"** | 对引导来说符合预期——这确认名称可自由使用，不是阻塞性错误。 |
| **用户想要指标自动回滚** | 说明指标回退时不会自动终止。提供 `FmeMetricCheck`（使步骤失败）+ 显式 `FmeFlagKill` 回滚阶段。 |
| **`HarnessApproval` 校验错误** | Schema 要求 `includePipelineExecutionHistory` 以及带 `disallowPipelineExecutor`、`minimumCount` 和 `userGroups` 或 `serviceAccounts` 的 `approvers` 对象。 |
| **流水线更新覆盖了阶段** | 始终**获取流水线**，精准合并，显示 diff。 |
| **环境名称不匹配** | 名称区分大小写。**列出环境**并确认。 |
| **Treatment `<+input>` 被拒绝** | 使用流水线变量：在 `pipeline:` 规范下定义，引用为 `<+pipeline.variables.onTreatment>`。 |
| **连接器缺失** | **列出连接器**（类型 Jira/ServiceNow）。如果缺失，提供 `/create-connector`。 |
| **FME 环境审批设置** | FME 环境级审批设置不门控流水线步骤执行——在流水线中使用 `HarnessApproval` 步骤进行门控。 |
