---
name: explain-flag
description: >-
  用平实语言解释单个 FME 功能标志：用途、默认规则，
  以及按环境的定向状态，并就地标记跨环境
  的不一致。这是一个快速查询/解释能力，而非跨多个
  功能标志的搜索——当给定的名称/键含糊时会进行消歧。不
  创建、终止或修改任何东西——定向更改见 update-flag-targeting，
  元数据/归档见 manage-flag-lifecycle，多功能标志问题见 discover-feature-flags，
  实验见 manage-experiments。触发短语：这个功能标志是做什么的、
  解释这个功能标志、X 是如何配置的、X 在生产中开启了吗、X 定向了什么。
metadata:
  author: Harness
  version: 1.3.2
  mcp-server: harness-mcp
  summary: Explain one flag's purpose, treatments, and per-environment targeting, flagging inconsistencies (read-only)
license: Apache-2.0
compatibility: Requires the Harness MCP server or the Harness CLI
---

# 解释功能标志

针对一个具名功能标志回答“这个功能标志现在做什么”：它的用途、默认服务什么，以及定向在各环境之间如何不同（或相同）——而不触碰任何东西。

## 工具

通过 Harness MCP 服务器或 Harness CLI 工作；名称来自 [tool-map.md](../../../references/fme/tool-map.md)。

| 操作 | MCP | CLI |
|-----------|-----|-----|
| 列出环境 | `harness_list` · `fme_environment` · `filters: { offset: 0, limit: 100 }` · `compact: false` | `harness list fme_environment --json` |
| 列出功能标志 | `harness_list` · `fme_feature_flag` · `size: 50` · `filters: { name, offset: 0 }` · `compact: false` | `harness list feature_flag --search <substring> --json` |
| 获取功能标志 | `harness_get` · `fme_feature_flag` · `params: { feature_flag_name }` | `harness get feature_flag <name> --json` |
| 获取定义 | `harness_get` · `fme_feature_flag_definition` · `params: { feature_flag_name, environment_id }` | `harness get feature_flag:definition <flag> --env <env-id> --json` |
| 列出定义 | `harness_list` · `fme_feature_flag_definition` · `params: { feature_flag_name }` · `filters: { offset: 0, limit: 100 }` · `compact: false` | `harness list feature_flag:definition <flag> --json` |

## 说明

### 步骤 1：解析范围

如果尚不知道，获取 `org_id` + `project_id`。不要使用已弃用的 `workspace_id`：步骤 4 的定义列表仅限 Harness 原生。

**预先列出环境**，因为步骤 4 需要每个环境。按[分页](../../../references/fme/tool-map.md#pagination)完成清单，使用显式 MCP `filters.limit: 100`；一个 `total` 等于其长度的整页可以作为回退，所以再获取一页——一次调用不保证返回所有环境，一个你从未获取的环境是**未看到**，而非确认**不存在**；不要用部分列表去 diff 步骤 4。保留含每个环境 `isProduction` 的完整列表：步骤 4 用它来 diff 缺失的定义，步骤 6 用它标注生产环境（“X 开启了吗”的问题几乎总是指“在生产中”）。

### 步骤 2：找到功能标志，必要时消歧

**停止条件：** 如果用户完全没有给出任何标识符（没有可搜索的名称、键或标签），索要一个，而不是把项目中的每个功能标志列出来作为替代。

对子串**列出功能标志**，翻遍每个 offset 直到某页返回的数量少于请求——后面页上的候选是未看到的，而非不存在，提前停止可能把真正的冲突变成错误的单一匹配。名称过滤器是子串匹配，因此常返回多个候选（例如搜索 `checkout` 也会返回 `checkout_v2` 和 `new_checkout`）。

**如果恰好有一个候选的 `name` 与用户输入精确、区分大小写地匹配，则无需询问直接使用它**——其他命中是子串噪声。只有当没有候选精确匹配且多个看似合理时，才是真正含糊。

**停止条件：** 对于真正的歧义，列出候选（name、description、`rolloutStatus.name`、`createdAt`、`openInHarness` 链接）并询问是哪一个——不要按时间新旧猜测。近乎相同的功能标志常常共享复制粘贴的描述和发布状态，因此 `createdAt` 和链接可能是唯一能区分的细节。

子串搜索无法发现与用户输入存在换位或多余字符差异的近似重复项——两者名称互不包含，因此彼此对对方的搜索都不可见。如果名称看起来通用（简短、带编号、某一家族之一）或用户似乎不确定拼写，先对其更短的片段做第二次搜索，再把单一命中视为确定。

### 步骤 3：获取功能标志元数据

为该名称**获取功能标志**。

读取 `description`、`tags`、`trafficType`（一个对象——使用 `.name`，不要打印原始对象）、`owners`（`{type, name}` 数组——用逗号连接名称）、`rolloutStatus.name`（例如 `Pre-Production`、`Killed`）和 `openInHarness`（直接链接）。将缺失的 `description` 视为空描述：“no description set”。

`rolloutStatus` 是手动设置的、项目级生命周期标签，而非实时状态——一个标记为 `Killed` 的功能标志在某些环境中仍可能生效（`isKilled: false`）。当它与步骤 4 的 `isKilled` 不一致时，如实说明并信任 `isKilled`。

### 步骤 4：获取每个环境的定向

对该功能标志**列出定义**并遍历每一页，显式设置 MCP `filters.limit: 100` 并递增 `filters.offset` 直到出现短页。此处 `size` 被忽略，`total` 可能只是页长度。不要把不完整的定义清单与环境列表做 diff，也不要把未看到的环境称为未配置；而是报告缺失的覆盖。

对于每个环境的定义，读取 `isKilled`（按环境——功能标志可在一个环境中终止而在另一个中生效）、`treatments`（包括嵌套在单个 treatment 上的任何 `keys`/`segments`/`largeSegments`/`ruleBasedSegments` 成员——这些是个体目标，在规则之前评估）、`defaultTreatment`（当功能标志被终止或流量未分配时服务）、`defaultRule`（当无定向规则匹配时服务的桶）、`rules`（每个带 `buckets` + `condition`）、`trafficAllocation` 和 `impressions.lastImpressionAt`（最近的曝光；`null` = 从未收到流量）。如果 `impressions` 缺失，将最后曝光报告为未知，而非未使用。

将返回的环境与步骤 1 的完整列表显式 diff。没有定义的环境是“在 `<env>` 中未配置”——一种不同的状态，而不是另一个环境配置的副本。

### 步骤 5：综合并标记不一致

在写摘要之前（而非之后）跨环境比较——发现不一致正是此技能的意义，而非事后补充：

- `isKilled` 在各环境中是否相同？在一个环境中终止而在另一个中生效的功能标志是要呈现的最重要的一处不一致——它通常意味着某处发生了回滚且从未传播，或者本就不打算传播。
- `defaultTreatment` 和 `defaultRule` 的 treatment 分配是否相同，还是某个环境默认不同（例如 prod 30/70，staging 50/50）？
- 定向 `rules` 是否相同（相同条件、相同 treatment 分配），还是某个环境有而其他环境没有的规则？
- `trafficAllocation` 是否相同，还是一个环境在部分发布而另一个在 100%？

明确点出每一处差异——一个在 staging 和 prod 之间行为不同的功能标志往往正是用户需要知道的，而不是可被总结抹去的噪声。

### 步骤 6：交付解释

```
## <flag_name>
<description, or "no description set">

**Traffic type:** <trafficType>   **Owners:** <owners, or "none set">
**Rollout status:** <rolloutStatus.name>   **Link:** <openInHarness URL>

### Per-environment state
| Environment | Prod? | Killed | Default treatment | Individual targets | Rules | Traffic allocation | Last impression |
|---|---|---|---|---|---|---|---|
| <env> | yes/no | yes/no | <defaultTreatment> (<defaultRule treatment allocation>) | <n> key(s)/segment(s) across treatments, or "none" | <n> rule(s) - <one-line summary each> | <trafficAllocation>% | <lastImpressionAt, "never", or "unknown"> |

### Notable
<any cross-environment inconsistency from Step 5, or "consistent across all environments" if none>
```

每条规则一行（条件 -> treatment 分配）；提供**获取定义**（来自工具表）以获取完整匹配器细节，而不是倾倒原始 JSON。`Prod?` 列来自步骤 1 的 `isProduction`，绝不来自环境名称（`env-7` 或 `blue` 之类的名称说明不了什么）。

如果没有环境有定义，跳过表格：

```
## <flag_name>
<description, or "no description set">

**Traffic type:** <trafficType>   **Owners:** <owners, or "none set">
**Rollout status:** <rolloutStatus.name>   **Link:** <openInHarness URL>

This flag exists but has no targeting configured in any environment yet.
```

如果问题是限定范围的（“X 在生产中开启了吗？”），在这种情况下也要直接回答，而不是留给读者推断：由于那里没有定义，该功能标志在该环境中不服务任何内容，SDK 回退到 control treatment——它是未配置，而非开启或关闭。

## 示例

- “`new-checkout` 功能标志是做什么的？”——步骤 2-3 了解用途，步骤 4-6 给出完整的按环境细分。
- “`dark-mode` 在生产中开启了吗？”——步骤 2-4，但答案可限定为仅生产环境的默认 treatment/规则，而非完整表格。
- “explain checkout”（含糊）——步骤 2 呈现 `checkout-v2` 和 `checkout-v2-mobile`；询问是哪一个。
- “为什么 `beta-banner` 在 staging 与 prod 中行为不同？”——跳到步骤 4 比较，并以步骤 5 的不一致开头作答。

## 性能注意事项

- 构建一份完整的已分页环境清单（步骤 1）和一份完整的已分页定义清单（步骤 4）；每个都可能需要多次调用。
- 只读：绝不调用 create/update/delete/execute。如果用户要求更改某些东西，按描述路由。

## 故障排查

| 问题 | 原因 | 修复 |
|---------|-------|-----|
| 功能标志名称什么都匹配不到 | 先确认 `org_id`/`project_id`——不同项目中的功能标志看起来像不存在 | 不要假设它已被删除 |
| `isKilled` 与默认 treatment 看起来的样子不一致 | 信任 `isKilled`——功能标志可以默认 `off` 而不被终止 | 将 `isKilled` 报告为“此处是否生效”，并单独报告默认规则/treatment |
| 所有环境的定义列表都为空 | 功能标志存在（步骤 3 成功）但从未在任何地方配置，对于在发布规划之前创建的标志很常见 | 如实说明；不要将其视为错误或重试 |

通用错误：参见 [tool-map.md](../../../references/fme/tool-map.md#common-errors)。

## 参考资料

- [tool-map.md](../../../references/fme/tool-map.md) — 工具名称、参数、常见错误
- [concepts.md](../../../references/fme/concepts.md) — treatment、评估顺序、终止状态
