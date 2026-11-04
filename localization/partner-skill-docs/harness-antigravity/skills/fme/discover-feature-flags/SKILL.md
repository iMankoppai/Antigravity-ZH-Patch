---
name: discover-feature-flags
description: >-
  审计项目范围内的 Harness FME 功能标志。只读；绝不写入。
  四种模式：inventory（列出带元数据的功能标志）、rollout-report（按环境
  展示发布状态，并在已确认的环境序列上检测停滞的晋级）、
  stale-audit（通过 lastImpressionAt 查找无曝光的
  功能标志）、pattern-search（查找规则条件在结构上匹配某个属性名、匹配器类型、字面值、segment
  引用或功能标志依赖的功能标志——不是文本 grep）。在要求
  "show me all flags"、"which flags are stale"、"what flags are rolled out"、
  "flag inventory"、"flag health"、"cleanup candidates"、"find flags targeting
  segment X"、"which flags depend on flag Y"，或 "find flags with rule
  matching attribute Z" 时使用。不要用于单功能标志深度分析（explain-flag）、
  创建功能标志（create-feature-flag）、更新定向
  （update-flag-targeting）、归档/删除（manage-flag-lifecycle）、
  流水线发布（fme-pipeline），或代码移除（cleanup-feature-flags）。
metadata:
  author: Harness
  version: 1.3.1
  mcp-server: harness-mcp
  summary: Inventory, targeting-pattern search, promotion-aware rollout report, and stale-flag audit (read-only)
license: Apache-2.0
compatibility: Requires the Harness MCP server or the Harness CLI
---

# 发现功能标志

审计项目范围内的 Harness FME 功能标志：列出所有带元数据的功能标志、按环境显示发布状态、查找陈旧功能标志，或以结构化方式搜索规则条件。只读。绝不写入。相关：`explain-flag`（单个功能标志）、`cleanup-feature-flags`（代码移除）、`manage-flag-lifecycle`（归档）。

## 工具

通过 Harness MCP 服务器或 Harness CLI 工作；名称来自 [tool-map.md](../../../references/fme/tool-map.md)。

| 操作 | MCP | CLI |
|-----------|-----|-----|
| 列出环境 | `harness_list` · `fme_environment` · `filters: { offset: 0, limit: 100 }` · `compact: false` | `harness list fme_environment --json` |
| 列出发布状态 | `harness_list` · `fme_rollout_status` · `filters: { offset: 0, limit: 100 }` · `compact: false` | `harness list rollout_status --json` |
| 列出功能标志 | `harness_list` · `fme_feature_flag` · `size: 50` · `filters: { name?, tags?, rollout_status_id?, offset? }` · `compact: false` | `harness list feature_flag [--search <name>] [--status <ACTIVE\|ARCHIVED>] --limit 50 --json` |
| 获取功能标志 | `harness_get` · `fme_feature_flag` · `params.feature_flag_name` | `harness get feature_flag <name> --json` |
| 列出定义 | `harness_list` · `fme_feature_flag_definition` · `params.feature_flag_name` · `filters: { offset: 0, limit: 100 }` · `compact: false` | `harness list feature_flag:definition <name> --json` |
| 列出 segment | `harness_list` · `fme_segment` · `filters: { segment_type, status?, offset: 0, limit: 100 }` · `compact: false` | `harness list segment --segment-type <STANDARD\|LARGE\|RULE_BASED> --json`；用声明的 status 过滤器覆盖 ACTIVE 和 ARCHIVED |
| 列出实验 | `harness_list` · `fme_experiment` · `filters: { parent_type: "FEATURE_FLAG", parent_name, status: ["ACTIVE", "PAUSED"], offset: 0, limit: 100 }` · `compact: false` | `harness list experiment --parent-type FEATURE_FLAG --parent-name <name> --status ACTIVE --json`，然后用 `--status PAUSED` 再来一次 |

对于每个过滤器：如果已安装的传输层声明了服务端过滤，则服务端应用（通过 `--help` 验证）；否则获取完整清单并在客户端过滤。按 [tool-map.md](../../../references/fme/tool-map.md#pagination) 将每个列表分页至完成。

## 输出

每种模式固定形状：

**Inventory（盘点）：** `| Flag | Traffic type | Status | Rollout status | Tags | Owners | Created | Updated |`

**Rollout report（发布报告）：** `| Flag | <Env 1>* | <Env 2>* | … | Promotion | Notes |`（生产环境加 `*`；单元格使用实际的 treatment 名称/百分比、`killed→<fallback>`、`targeted`、`limited`、`missing`、`unknown` 或 `archived`）。Promotion：`stalled?`、`ahead`、`ok`、`behind (no alert)`、`divergence`、`both killed`、`missing`、`unknown`、`intended ✓`、`not comparable`、`archived`，或 `—`（仅中性）。在多环境链中为每一跳加标签；参见 [promotion-check.md](references/promotion-check.md)。

**Stale audit（陈旧审计）：** `| Flag | Bucket | Last Impression Per Env | Config | Next Step |`（buckets：stale / active / unknown / never evaluated；verdicts：ready / caution / blocked）

**Pattern search（模式搜索）：** `| Flag | Env | Rule # | Combiner | Negated | Matcher type | Predicate match | Status | Notes |`（coverage footer：matched N / no-match M / unparsed P / unchecked U；参见 [rule-patterns.md](../../../references/fme/rule-patterns.md)）

摘要：每一类别的计数、若分页则给出截断行、向同类技能的移交。

## 说明

### 阶段 1：确定范围

遵循 [scope-establishment.md](../../../references/scope-establishment.md)。重申：`Working in org=..., project=...`。

### 阶段 2：收集输入

仅询问与用户目标相关的缺失项：
- **模式：** inventory（默认）/ rollout-report / stale-audit / pattern-search。从提示词推断。
- **过滤器：** 名称子串、标签、发布状态名称、流量类型、状态（ACTIVE / ARCHIVED）、owner——在已声明处服务端应用；否则在完整清单上客户端应用。
- **环境子集**（rollout-report / stale-audit / pattern-search）：默认全部。
- **陈旧阈值**（仅 stale-audit）：默认 30 天，按 [concepts.md](../../../references/fme/concepts.md#staleness-and-readiness)。
- **Pattern-search 谓词：** 按 [rule-patterns.md §Clarification](../../../references/fme/rule-patterns.md#clarification-protocol) 收集。
- **晋级检查：** 在给出晋级分类之前，环境序列和预期目标 treatment 都必须确认；否则显示中性差异。参见 [promotion-check.md §Inputs](references/promotion-check.md#required-inputs)。

### 阶段 3：列出环境和发布状态

列出环境并遍历每一页：ID → `{ name, isProduction }`。默认显示顺序：非生产在前，生产在后。**晋级检查的环境序列必须由用户明确确认——不要仅从 `isProduction` 推导顺序。** 列出发布状态并遍历每一页：name → ID。应用 [tool-map.md](../../../references/fme/tool-map.md#pagination) 中的分页完整性检查。

### 阶段 4：列出功能标志

应用已声明的服务端过滤器（name、tags、rollout_status_id）；在完整清单上客户端处理剩余的过滤器。翻遍每个 offset 直到出现短页。**Inventory 模式在此停止。** 跳到阶段 6。

**成本护栏（rollout-report / stale-audit / pattern-search）：** 如果过滤后功能标志 >50 个，停止："This will fetch N paginated definition inventories. Narrow by tag, name, rollout status, or status, or confirm to proceed." 参见 [tool-map.md](../../../references/fme/tool-map.md#reverse-lookup-scans)。

### 阶段 5：列出并分类定义

对每个功能标志，列出定义（所有页，`filters.limit: 100`，递增 offset）。失败或跳过的页 → 不完整；绝不要将未看到的定义标记为缺失。

**Rollout-report：** 按 [concepts.md](../../../references/fme/concepts.md) 分类每个 (flag, env) 单元格：killed → 无定义 → allocation < 100 → 存在 rules/targets → defaultRule 形状。对于已确认的晋级序列，应用 [promotion-check.md](references/promotion-check.md) 生成 Promotion 列。已归档功能标志（全局 `status: ARCHIVED`）：作为 `archived` 行纳入表格；从 stalled/divergence 告警中排除。

**Stale-audit：** 按 [concepts.md §Staleness](../../../references/fme/concepts.md#staleness-and-readiness) 分桶。`impressions.lastImpressionAt`：ISO-8601（`null` = 从未评估；缺失 = 未知）。对于 ready/caution 候选，按 [write-safety.md](../../../references/fme/write-safety.md#experiment-check) 运行实验检查（ACTIVE 和 PAUSED）。Next Step：移交给 `cleanup-feature-flags`（代码）或 `manage-flag-lifecycle`（归档）。

**Pattern-search：** 按 [rule-patterns.md](../../../references/fme/rule-patterns.md) 应用结构化规则匹配。要将 segment 名称解析为其类型，通过列出 segment 列出该 segment 类型的元数据（每种类型一份完整的已分页清单；跨所有功能标志复用）。已终止的功能标志定义：扫描规则，但将匹配标注为 `inactive (killed)`。按所请求 status 过滤器纳入的已归档功能标志：保留结构性匹配并标注 `inactive (archived)`；不要暗示实时曝光。

### 阶段 6：输出

为该模式呈现固定表格。按类别或桶给出摘要计数。仅分页不算截断：仅在清单未完成时报告截断/不完整覆盖。

**移交：** 单功能标志 → `explain-flag`。清理候选 → `cleanup-feature-flags`。归档 → `manage-flag-lifecycle`。更新定向 → `update-flag-targeting`。流水线发布 → `fme-pipeline`。

## 示例

- “显示我所有功能标志”——Inventory 模式。
- “哪些功能标志陈旧？”——Stale-audit 模式，默认 30 天。
- “`new-checkout-flow` 在哪里发布？”——为单个功能标志路由到 `explain-flag`。
- “列出带 `payments` 标签的功能标志”——Inventory 模式，按标签过滤。
- “查找清理候选”——Stale-audit 模式，桶 `stale` + 完全发布。
- “显示生产环境中所有功能标志的发布状态”——Rollout-report 模式，环境子集。
- “查找定向 segment `beta-users`（STANDARD）的功能标志”——Pattern-search，segment 引用谓词。
- “哪些功能标志依赖 `flag-A`？”——Pattern-search，功能标志依赖谓词（`IN_SPLIT`）。
- “功能标志在 staging 和 prod 之间停滞了吗？”——Rollout-report 带晋级检查；需要每个功能标志已确认的环境 ID、序列和预期 treatment。

## 性能注意事项

- **Inventory 模式：** 一份已分页的功能标志清单；无定义。
- **Rollout-report / stale-audit / pattern-search：** 每个功能标志一份已分页的定义清单。50 个功能标志处有成本护栏；先按标签、名称、发布状态或状态缩小。
- **Stale-audit 实验检查：** 仅对 ready/caution 候选运行，而非每个功能标志。分别分页 ACTIVE 和 PAUSED。
- **Pattern-search segment 解析：** 每种需要的 segment 类型列出一次；跨所有功能标志复用。
- **并行化定义读取：** 在客户端支持并行调用处批处理 list-definitions 调用。
- **分页：** 参见 [tool-map.md](../../../references/fme/tool-map.md#pagination)。

## 故障排查

| 问题 | 修复 |
|-------|-----|
| `impressions.lastImpressionAt` 缺失 | 视为 `unknown` 桶；绝不推断“未使用” |
| 定义调用以 404 失败 | 重新列出功能标志；确认确切名称（区分大小写） |
| “Too many requests” 或超时 | 按标签、发布状态或名称缩小；或分批处理 |
| Pattern-search 返回未解析的行 | 参见 [rule-patterns.md §Unparsed Shapes](../../../references/fme/rule-patterns.md#unparsed-shapes) |
| 晋级检查无法比较 | 按 [promotion-check.md](references/promotion-check.md) 确认环境 ID、序列和每个功能标志的预期 treatment |

通用错误参见 [tool-map.md](../../../references/fme/tool-map.md#common-errors)。
