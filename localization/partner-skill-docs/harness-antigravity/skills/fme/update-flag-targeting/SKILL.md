---
name: update-flag-targeting
description: >-
  更改 Harness FME 功能标志在各环境中服务流量的方式。涵盖
  百分比发布、个体目标、定向规则（属性/segment/功能标志依赖）、
  defaultTreatment、trafficAllocation、treatment、终止/恢复，以及在环境中复制或
  初始化定义。在要求放量功能标志、添加规则/用户、更改分配、
  终止/恢复或晋级配置时使用。不用于创建功能标志（create-feature-flag）、
  tags/owners/archive 等元数据（manage-flag-lifecycle）、segment 键（manage-segments）、
  流水线发布（fme-pipeline），或功能标志分析（explain-flag）。触发短语：
  更新定向、放量功能标志、百分比发布、添加规则、添加用户、终止功能标志、恢复、
  复制配置。
metadata:
  author: Harness
  version: 1.2.2
  mcp-server: harness-mcp
  summary: Ramp, rules, individual targets, allocation, treatments, kill/restore, env-to-env copy, and initializing definitions
license: Apache-2.0
compatibility: Requires the Harness MCP server or the Harness CLI
---

# 更新功能标志定向

更改现有 Harness FME 功能标志在一个或多个环境中服务流量的方式。**始终先读取当前定义**，然后只对更改的内容做合并补丁。展示仅包含更改内容的 diff，并用平实语言的前/后描述谁得到什么。

相关：Segment 成员关系更改是 `/manage-segments`；深度功能标志分析（影响、依赖项、单功能标志状态）是 `/explain-flag`。反向查找扫描（依赖项、segment 使用）见 [tool-map.md](../../../references/fme/tool-map.md#reverse-lookup-scans)。

## 工具

通过 Harness MCP 服务器或 Harness CLI 工作；名称来自 [tool-map.md](../../../references/fme/tool-map.md)。

| 操作 | MCP | CLI |
|-----------|-----|-----|
| 列出环境 | `harness_list` · `fme_environment` · `compact: false` | `harness list fme_environment --json` |
| 列出功能标志定义 | `harness_list` · `fme_feature_flag_definition` · `params: { feature_flag_name }` · `filters: { offset: 0, limit: 100 }` · `compact: false` | `harness list feature_flag:definition <flag> --json` |
| 获取定义 | `harness_get` · `fme_feature_flag_definition` · `params: { feature_flag_name, environment_id }` | `harness get feature_flag:definition <flag> --env <env-id> --json` |
| 获取父功能标志定义 | `harness_get` · `fme_feature_flag_definition` · `params: { feature_flag_name: <parent>, environment_id }` | `harness get feature_flag:definition <parent> --env <env-id> --json` |
| 更新定义 | `harness_update` · `fme_feature_flag_definition` · `params: { feature_flag_name, environment_id }` · `body: { <fields>, comment, title? }` | `harness update feature_flag:definition <flag> --env <env-id> -f patch.json --json`（在文件中包含 `comment`/受支持的 `title`） |
| 创建定义 | `harness_create` · `fme_feature_flag_definition` · `params: { feature_flag_name, environment_id }` · `body: { treatments, defaultTreatment, defaultRule, rules?, baselineTreatment?, trafficAllocation?, comment? }` | `harness create feature_flag:definition <flag> --env <env-id> -f def.json` |
| 终止功能标志 | `harness_execute` · `fme_feature_flag` · `action="kill"` · `params: { feature_flag_name, environment_id }` · `body: { comment?, title? }?` | `harness execute feature_flag:kill <flag> --env <env-id> --comment <text>` |
| 恢复功能标志 | `harness_execute` · `fme_feature_flag` · `action="restore"` · `params: { feature_flag_name, environment_id }` · `body: { comment?, title? }?` | `harness execute feature_flag:restore <flag> --env <env-id> --comment <text>` |
| 获取 segment 元数据（所有类型） | `harness_get` · `fme_segment` · `params: { segment_name, segment_type }` | `harness get segment <segment> --segment-type <type> --json` |
| 获取 STANDARD segment 定义 | `harness_get` · `fme_segment_definition` · `params: { segment_name, environment_id }` | `harness get segment:definition <segment> --env <env-id> --json` |
| 列出实验 | `harness_list` · `fme_experiment` · `filters: { parent_type: "FEATURE_FLAG", parent_name, environment_id, status: ["ACTIVE", "PAUSED"], offset: 0, limit: 100 }`（应用[分页完整性检查](../../../references/fme/tool-map.md#pagination)） · `compact: false` | `harness list experiment --parent-type FEATURE_FLAG --parent-name <flag> --env <env-id> --status ACTIVE --json`，然后用 `--status PAUSED` 再来一次 |

## 说明

FME 评估顺序、终止状态、treatment vs control 以及往返形状见 [concepts.md](../../../references/fme/concepts.md)。写入前确认协议见 [write-safety.md](../../../references/fme/write-safety.md)；此技能链接到它，不复制它。

### 阶段 1：确定范围

遵循 [scope-establishment.md](../../../references/scope-establishment.md)。如果尚不知道，询问 `org_id` 和 `project_id`。重申：`Working in org=..., project=...`

### 阶段 2：收集意图

仅询问缺失的内容：
1. **功能标志名称**（区分大小写的标识符）
2. **目标环境**（名称或 ID，或 "all"）
3. **要更改什么**（将用户的请求映射到下表中的一项或多项操作）

### 阶段 3：读取当前状态

在为目标环境规划更改之前，始终完整分页**列出功能标志定义**：显式设置 MCP `filters.limit: 100`，递增 `filters.offset`，仅在短页时停止。此列表忽略 `size`。不完整的清单不是定义缺失的证据；停止，而不是从首页遗漏初始化。环境和实验查找也遵循[分页](../../../references/fme/tool-map.md#pagination)。绝不凭记忆编写规则、目标或匹配器——从实时定义或项目中已使用该形状的另一个功能标志复制形状。如果不存在示例，警告该形状未经验证，先在非生产环境试用，并让 API 的 400 消息引导你（参见 [schema-validation-loop.md](../../../references/schema-validation-loop.md)）。

按环境从定义中记录：
- `isKilled`（布尔值）、`defaultTreatment`、`treatments`（区分大小写；读取它们，不要猜测）
- `defaultRule`（`{treatment, size}` 数组，总和为 100）
- `rules`（数组，更新时整体替换）
- `trafficAllocation`（0-100；其之外的键得到 `defaultTreatment`）
- 个体目标和 segment 引用（形状未记录；对其往返）
- `impressions.lastImpressionAt`（使用信号；`null` = 从未收到流量；缺失 = 未知）

**列出环境**以将名称解析为 ID 并记录 `isProduction`。

### 阶段 4：安全检查（规划之前）

在编写计划之前运行这些检查。在第一个失败处停止并向用户报告。

| 检查 | 如何 | 报告什么 |
|-------|-----|----------------|
| **实验** | 为该功能标志（和环境）**列出实验**，过滤为 ACTIVE 和 PAUSED。应用[实验检查](../../../references/fme/write-safety.md#experiment-check)协议 | ACTIVE：需要明确知晓；PAUSED：警告 + 知晓；COMPLETED：忽略 |
| **Segment 引用** | 对于每个新增/更改的规则匹配器或 treatment 成员关系，解析 STANDARD/LARGE/RULE_BASED 元数据，并通过[该类型的工作流](../manage-segments/SKILL.md#phase-3-execute-operation)验证目标环境定义。列出的定义端点仅限 STANDARD | 区分已确认缺失与因当前工具缺少该操作而未验证。在验证之前停止依赖写入；绝不要对 LARGE/RULE_BASED 使用 STANDARD 查找，也不要静默切换到旧版范围 |
| **功能标志依赖（IN_SPLIT）** | 对于新规则或更新规则中的每个 `depends: {splitName, treatment}`，**获取父功能标志定义**并核实该 treatment 存在于 `treatments` 中 | "Flag `<parent>` has no definition (or treatment `<treatment>` doesn't exist) in `<env>`." |
| **Treatment 引用** | rules、defaultRule、个体目标和 `defaultTreatment` 中的每个 treatment 都必须存在于 `treatments` 数组中 | "Treatment `<treatment>` not found. Add it to `treatments` first." |
| **桶总和** | `defaultRule` 或某规则中所有 `{treatment, size}` 桶的 `size` 字段总和必须为 100 | "Bucket sizes sum to `<sum>`, not 100. Fix the treatment allocation." |
| **已终止功能标志** | 在终止状态下写入/读回已批准的定向，然后单独确认恢复并重新运行[实验检查](../../../references/fme/write-safety.md#experiment-check)。先检查整个补丁：更改 `defaultTreatment`、移除/重命名它，或更改其配置会立即影响已终止的流量 | 点名当前服务的 treatment/配置及任何立即更改。仅当该对保持不变时才承诺流量不变；绝不要先恢复过期定向 |

### 阶段 5：规划更改

基于用户意图和当前状态，编写更新后的定义。按操作的形状细节见 [targeting-recipes.md](references/targeting-recipes.md)。

将用户意图映射到操作：

| 用户想要 | 配方 | 要更新的字段 |
|-----------|--------|------------------|
| 百分比发布 / 放量 | (a) | 更改 `defaultRule` 桶，或特定规则的 `buckets` |
| 放量单条规则 | (b) | 复制完整 `rules` 数组，更改该规则的 `buckets` |
| 添加/编辑/移除/重排定向规则 | (c) | 替换完整 `rules` 数组 |
| 添加/移除个体目标 | (d) | 往返个体目标结构 |
| 更改 defaultTreatment | (e) | 更新 `defaultTreatment` |
| 更改 trafficAllocation | (f) | 更新 `trafficAllocation`（0-100） |
| 添加/重命名 treatment 或编辑配置 | (g) | 替换完整 `treatments` 数组；更新所有引用 |
| 将一个环境的定义复制到另一个 | (h) | 复制创建/更新 body 字段；检查 segment 和 IN_SPLIT 父级存在 |
| 在不存在的位置初始化定义 | (i) | 以安全默认值创建：功能标志的 treatment（或 `on`/`off`）、所有人关闭、无规则 |
| 终止 / 恢复 | (j) | 紧急路径：**终止功能标志** 或 **恢复功能标志** |

展示仅包含已更改字段的 **diff**，并按环境以**平实语言说明前/后**。先非生产，然后生产。对于生产环境，说明："This changes live production traffic in `<env>`."

### 阶段 6：确认并执行

遵循 [write-safety.md](../../../references/fme/write-safety.md) 的协议（呈现计划 → 停止 → 明确确认 → 先执行非生产 → 生产）。注释格式：`"update-flag-targeting: <what> — <why>"`，例如 `"update-flag-targeting: ramp new-checkout to 25% in staging — FME-123"`。

错误处理：400（读取 API 错误，修复字段，按 [schema-validation-loop.md](../../../references/schema-validation-loop.md) 重试一次）；404（重新检查标识符，绝不创建来填补）；409（原样报告，停止）。

### 阶段 7：验证并重述

重新读取每个已更改环境的定义，然后以相同的平实语言形式描述**实时**行为。如果不匹配计划，停止。

按 [operation-summary.md](../../../templates/operation-summary.md) 总结：操作、已更改环境、前/后、确认了什么、验证、风险、UI 链接。

## 示例

- “在 staging 中将 new-checkout 放量到 10%”——(a) 百分比发布。
- “在生产中为 beta 用户添加定向规则”——(c) 添加定向规则。
- “将 user-key-123 添加到 on treatment”——(d) 添加个体目标。
- “在生产中终止该功能标志”——(j) 终止（紧急路径）。
- “将 staging 配置复制到生产”——(h) 环境到环境复制。
- “在 qa 中设置该功能标志，那里没有定义”——(i) 初始化安全默认值。

## 性能注意事项

- 一份完全分页的**列出功能标志定义**清单覆盖功能标志的各环境；它可能需要多次请求。绝不将一页等同于完整清单。
- 合并补丁更新：省略字段以保持不变。`treatments`、`rules` 和 `defaultRule` 不能为 `null`，且整体替换，所以始终发送完整数组。
- 大型多环境更改：先运行非生产环境以验证形状可行，再触碰生产。

## 故障排查

| 问题 | 原因 | 修复 |
|---------|-------|-----|
| 400：桶总和不为 100 | `defaultRule` 或某规则中 `{treatment, size}` 的桶 `size` 字段总和必须为 100 | 调整大小使其总和为 100 |
| 400：未知 treatment | 规则、defaultRule 或 defaultTreatment 引用了 `treatments` 数组中不存在的 treatment | 先将该 treatment 添加到 `treatments`，或修复引用 |
| 定向已更改但流量不变 | 功能标志被终止 | 在保持终止时验证已批准的定向，重新检查实验，然后在恢复前获得明确批准。绝不先恢复过期定向 |
| 409 治理/审批 | OPA 策略阻止了写入或将其转为待批准 | 原样报告响应。绝不绕过它重试或尝试其他路由。 |
| 检测到并发编辑 | 在你读取和写入之间有另一个用户或进程修改了定义 | 停止并从新状态重新规划 |

通用错误：参见 [tool-map.md](../../../references/fme/tool-map.md#common-errors)。

## 参考资料

- [targeting-recipes.md](references/targeting-recipes.md) — 按操作的形状细节
- [concepts.md](../../../references/fme/concepts.md) — FME 评估顺序、treatment、终止状态
- [tool-map.md](../../../references/fme/tool-map.md) — 工具名称、参数、常见错误
- [write-safety.md](../../../references/fme/write-safety.md) — 写入前确认协议、实验检查
- [scope-establishment.md](../../../references/scope-establishment.md) — org/project 范围规则
- [schema-validation-loop.md](../../../references/schema-validation-loop.md) — 校验错误恢复
- [operation-summary.md](../../../templates/operation-summary.md) — 结构化完成摘要
