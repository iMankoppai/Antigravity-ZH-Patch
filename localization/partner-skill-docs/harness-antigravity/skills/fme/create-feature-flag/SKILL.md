---
name: create-feature-flag
description: >-
  创建一个新的 Harness FME 功能标志及其按环境的定义，
  带有安全默认值，遵循项目的命名和标签
  约定。在要求创建功能标志、添加功能标志、设置新的
  FME 功能标志或初始化功能标志定向时使用。仅进行功能标志/定义写入：
  不门控应用代码（instrument-feature-flag），也不是
  首次引导入口（feature-flag-onboarding）。不要用于
  更新现有功能标志定向（update-flag-targeting）、对单个功能标志的
  深度分析（explain-flag）、列出/发现功能标志
  （discover-feature-flags）、归档/删除等功能标志生命周期
  （manage-flag-lifecycle）、segment（manage-segments）、实验
  （manage-experiments）、流水线发布（fme-pipeline），或从代码中
  移除功能标志（cleanup-feature-flags）。触发短语：创建功能标志、
  添加功能标志、新功能标志、设置功能标志、FME flag create、初始化功能标志。
metadata:
  author: Harness
  version: 1.2.2
  mcp-server: harness-mcp
  summary: Create an FME flag that follows project conventions, with safe-default definitions
license: Apache-2.0
compatibility: Requires the Harness MCP server or the Harness CLI
---

# 创建功能标志

创建一个新的 Harness FME 功能标志，并可选择为其按环境创建带安全默认值的定义，遵循项目现有的约定。相关：`update-flag-targeting`（放量）、`manage-experiments`（A/B 测试）。

## 工具

通过 Harness MCP 服务器或 Harness CLI 工作；名称来自 [tool-map.md](../../../references/fme/tool-map.md)。

| 操作 | MCP | CLI |
|-----------|-----|-----|
| 列出功能标志 | `harness_list` · `fme_feature_flag` · `size: 50` · `compact: false` | `harness list feature_flag --json --limit 50` |
| 获取功能标志 | `harness_get` · `fme_feature_flag` · `params.feature_flag_name` | `harness get feature_flag <name> --json` |
| 列出环境 | `harness_list` · `fme_environment` · `compact: false` | `harness list fme_environment --json` |
| 列出流量类型 | `harness_list` · `fme_traffic_type` · `compact: false` | `harness list traffic_type --json` |
| 获取定义 | `harness_get` · `fme_feature_flag_definition` · `params: { feature_flag_name, environment_id }` | `harness get feature_flag:definition <flag> --env <env-id> --json` |
| 创建功能标志 | `harness_create` · `fme_feature_flag` · `body: { name, trafficType, description?, tags?, owners? }` | `harness create feature_flag <name> --traffic-type <type> --set description="..."` 加上每个标签的 `--add tags.<name>`，或使用带完整已批准 body 的 `-f flag.json`（CLI 的 `tags`/`owners` 是集合字段——`--set tags=[...]` 不是有效语法） |
| 创建定义 | `harness_create` · `fme_feature_flag_definition` · `params: { feature_flag_name, environment_id }` · `body: { treatments, defaultTreatment, defaultRule, comment? }` | `harness create feature_flag:definition <flag> --env <env-id> -f def.json` |

## 说明

### 阶段 1：范围

遵循 [scope-establishment.md](../../../references/scope-establishment.md)。重申：`Working in org=..., project=...`。

### 阶段 2：探索约定

**列出功能标志**（≤50）以推断命名模式（kebab-case、前缀）、常用标签和常用流量类型。**列出流量类型。** **列出环境**并注意 isProduction。可选地从 1–2 个相似功能标志**获取定义**以了解 treatment 名称。用 3 条要点总结约定。

### 阶段 3：提议

基于约定和用户的目的进行提议。当被委托时，保留调用方已确认的流量类型、treatment/配置/安全默认值、目的和描述/工单；针对实时前置条件核实它们，而不是用约定派生的默认值替换它们：
- **名称：** 遵循约定（让 API 校验；不要臆造字符规则）。
- **流量类型：** 必须存在于流量类型列表中。
- **Treatment：** 默认 `on`/`off` 或用户指定。绝不要用 `control`（保留；参见 [concepts.md](../../../references/fme/concepts.md)）。
- **安全默认值：** 定义 body 参见 [targeting-recipes.md](../update-flag-targeting/references/targeting-recipes.md#i-initialize-a-definition-where-none-exists)。
- **要初始化的环境：** 默认 = 所有非生产环境。仅在要求时包含生产环境。**被委托集成：** `/instrument-feature-flag` 和 `/feature-flag-onboarding` 必须提供一个已确认的环境；仅初始化该环境。如果缺少选择，停止并询问——绝不要替调用方回退到所有非生产环境。
- **标签、描述：** 遵循约定。如果提供了关联工单则包含。
- **Owners：** 绝不要仅凭约定自动挑选。将相似功能标志上找到的 owner 作为候选展示，并要求用户明确确认此功能标志的 owner 应是谁，然后再将它们纳入计划。

**名称冲突检查：** 在已确认的范围中**获取功能标志**。如果在被委托创建期间该功能标志已存在，将冲突以及经验证的现有 ID/状态返回给调用方，不做变更；询问是复用它还是选择不同名称。不要继续进入定向更改，也不要静默复用它。对于独立创建，提供 `/update-flag-targeting` 或一个新批准的名称。404 在创建之前仍需要正确的范围/标识符/访问权限。

### 阶段 4：计划并确认

遵循 [write-safety.md](../../../references/fme/write-safety.md)。展示计划：
```
Plan: Create feature flag `<name>` — <purpose>
Flag metadata: name, traffic type, description, tags, owners
Initial definitions:
| Environment | isProduction | Targeting |
| <env-name>  | No           | 100% <defaultTreatment> (everyone gets safe/off treatment) |
Production: <"No definitions" or list production envs>
```
停止并等待明确确认。

### 阶段 5：执行

**创建功能标志。** 然后为每个环境**创建定义**（先非生产）。审计注释：`"create-feature-flag: initial definition with safe default — <ticket or purpose>"`。

如果某个定义的创建中途失败，准确报告哪些环境成功、哪些失败——不要假设状态；对每个目标环境**获取功能标志**和**获取定义**，以读回实际生效的内容。从该实时状态恢复：仅创建缺失/失败的定义，不要删除并重启整个功能标志。仅在用户要求干净重启时才提供删除功能标志。对于 400 校验错误，按 [schema-validation-loop.md](../../../references/schema-validation-loop.md) 修复。

### 阶段 6：验证

对每个环境**获取功能标志**和**获取定义**。重申：
```
Created flag `<name>` (<trafficType>).
- In <env1>, <env2>: everyone gets `<defaultTreatment>`.
- Production / other environments: no definition, SDKs return `control`.
```

此技能仅创建功能标志元数据和定义——它不触碰应用代码。对于代码门控，移交给 `/instrument-feature-flag`；对于进一步的定向更改，用 `/update-flag-targeting`；对于 A/B 测试，用 `/manage-experiments`。

**返回调用方：** 如果此技能是作为被委托步骤调用的（例如由 `/instrument-feature-flag` 或 `/feature-flag-onboarding`），将创建的功能标志/环境/定义标识符以及此验证返回给该调用方并在此停止——不要自己继续进入代码集成或定向更改，也不要重新调用调用方。

## 示例

- “为新的结账流程创建功能标志”——推断约定，提议名称，创建功能标志 + 非生产定义。
- “为 dev 和 staging 中的用户添加暗色模式功能标志”——创建功能标志，仅初始化 dev 和 staging。
- “为 FME-1234 设置一个带 `v1` 和 `v2` treatment 的功能标志”——在标签/描述中使用工单，创建带自定义 treatment 的功能标志。
- “我需要一个功能标志”——询问目的，推断约定，提议名称和流量类型。

## 性能注意事项

- 约定推断：约 3–5 次只读调用（功能标志列表、流量类型、环境、可选的样本定义、冲突检查）。
- 写入调用：1 次功能标志创建 + N 次定义创建（顺序，非并行）。
- 分页：参见 [tool-map.md](../../../references/fme/tool-map.md#pagination)。

## 故障排查

| 问题 | 解决方案 |
|---------|----------|
| 409 "flag already exists" | 重新读取状态。当被委托时，将冲突返回给调用方且不做变更，并要求复用/新名称的决策；否则提供 `/update-flag-targeting` 或一个新批准的名称。 |
| 400 "invalid name" 或 "invalid traffic type" | 使用 API 消息纠正。不要臆造字符规则。 |
| 用户想更新现有功能标志 | 停止。路由到 `/update-flag-targeting`。 |

通用错误参见 [tool-map.md](../../../references/fme/tool-map.md#common-errors)。
