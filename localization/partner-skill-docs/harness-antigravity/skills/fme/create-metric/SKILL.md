---
name: create-metric
description: >-
  创建一个 Harness FME 指标：帮助决定测量什么、从应用代码中建议候选
  指标、解析流量类型和事件类型 ID、
  起草 payload，然后创建。在要求创建或定义新
  指标、决定测量什么，或从应用代码获取指标建议时使用。不将指标附加到
  实验（manage-experiments），也不添加跟踪调用
  （instrument-metric）。触发短语：创建/定义指标、
  新指标、我们应该创建哪些指标、建议指标。
metadata:
  author: Harness
  version: 1.4.2
  mcp-server: harness-mcp
  summary: Design and create an FME metric, with intent-to-config guidance, traffic type, events, cap, and owners
license: Apache-2.0
compatibility: Requires the Harness MCP server or the Harness CLI
---

# 创建指标

创建一个 FME 指标定义，并提供关于什么构成良好指标以及测量什么的指导。针对真实数据解析流量类型和事件，并要求用户选择一个 owner，而不是猜测 ID。Owner 是否存在于创建/读回时由 API 校验；声明的工具不提供 owner 目录查询。设计指导见 [metric-design.md](../../../references/fme/metric-design.md)。相关：`/manage-experiments` 附加指标；`/instrument-metric` 添加跟踪调用。

对于每个标记为**停止条件**的阶段，在即兴发挥之前先参见 [stop-conditions.md](references/stop-conditions.md)。

## 工具

通过 Harness MCP 服务器或 Harness CLI 工作；名称来自 [tool-map.md](../../../references/fme/tool-map.md)。

| 操作 | MCP | CLI |
|-----------|-----|-----|
| 列出指标 | `harness_list` · `fme_metric` · `filters: { name?, traffic_type_id?, limit }` · `compact: false` | `harness list metric --name <substring> --traffic-type-id <id> --json` |
| 列出流量类型 | `harness_list` · `fme_traffic_type` · `compact: false` | `harness list traffic_type --json` |
| 列出事件类型 | `harness_list` · `fme_event_type` · `filters: { traffic_type?, name? }` · `compact: false` | `harness list event_type --traffic-type <name or id> --name <substring> --json` |
| **获取事件类型** | `harness_get` · `fme_event_type` · `params: { event_type_id }` | `harness get event_type <event-name> --json` |
| 创建指标 | `harness_create` · `fme_metric` · `body: { name, trafficType, format, aggregation, isPositive, baseEventTypes, owners, description?, filterEventType?, triggerEventType?, cap?, tags? }` | `harness create metric <name> -f metric.json --json`（文件保存完整已确认的 payload，包括 `owners` 及任何嵌套的 `filterEventType`/`triggerEventType`/`cap` 对象——与 MCP 的 `body` 字段相同） |
| 获取指标 | `harness_get` · `fme_metric` · `params: { metric_id }` | `harness get metric <id> --json` |
| 删除指标 | `harness_delete` · `fme_metric` · `params: { metric_id }` | `harness delete metric <id>` |

## 说明

### 阶段 1：确定范围

参见 [scope-establishment.md](../../../references/scope-establishment.md)。在进行任何 list 或 get 操作之前确认组织和项目——这是 Harness 的 org/project，与本地应用代码仓库的名称或 git remote 无关；绝不要从你正在阅读代码的代码仓库推断范围。如果 `/choose-metric` 已运行且未找到合适的指标，复用它提供的上下文（假设、流量类型）。

### 阶段 2：理解意图

该指标支持什么决策（实验主要指标/护栏/支撑，还是发布监控）？什么应该朝哪个方向变化？如果 `/choose-metric` 运行过，复用它提供的上下文。如果用户不知道测量什么或要求建议，运行[从代码建议指标](../../../references/fme/metric-design.md#suggest-metrics-from-code)，展示覆盖表，并让他们每轮挑选一个指标。通过询问[意图到配置](../../../references/fme/metric-design.md#intent-to-configuration)中的简单问题（“多少次？”、“他们是否至少做过一次？”、“多少 / 多久？”）来挑选形态，而不是询问 aggregation 名称。

### 阶段 3：先检查是否已有指标

使用完整定义**列出指标**，按名称子串以及（如果已知）流量类型缩小范围——你需要 `aggregation` 和 `baseEventTypes` 来判断重复。从此列表中读取命名和标签约定。后端对重复名称或重复定义（相同属性组合但不同名称）返回 409。尽早捕获这一点可节省一次往返。在创建延迟或错误指标之前，检查[自动创建的 ` - Split Agents` 指标](../../../references/fme/metric-design.md#auto-created-metrics)。如果存在相近的指标，先确认确实需要新指标，而不是复用/更新现有指标。

**停止条件** 如果请求含糊（例如 "track checkouts" 但未指定 aggregation）——参见[含糊的指标意图](references/stop-conditions.md#ambiguous-metric-intent)。

### 阶段 4：解析 `trafficType`

**列出流量类型**并使用流量类型**名称**（创建后不可变，如同 `name` 本身）。不要向用户索要 ID——从此列表中解析它。

### 阶段 5：解析 `baseEventTypes[].eventTypeId`

**列出事件类型**，按流量类型以及（如果用户指定了名称）事件名称缩小范围。事件名称过滤是不区分大小写的子串匹配；流量类型过滤接受 ID 或精确名称，而非子串。在将列表视为完整之前检查分页；对已约定的精确名称使用**获取事件类型**，并核实返回的 `trafficTypes` 包含预期类型。注意：RUM/集成事件可能在没有代码中 `track()` 的情况下流动。

**停止条件** 如果该事件不在此列表中，*或者* 如果多个事件匹配且没有一个与用户所述精确匹配——对 `purchase` 这样的词做子串搜索常会返回十几个变体，因此要呈现真实存在的事件并询问，而不是挑选最短或看起来最干净的名称。不要臆造 ID，也不要静默替换为最接近的真实事件；参见[缺失或含糊的事件](references/stop-conditions.md#missing-or-ambiguous-event)。如果需要埋点，在移交之前先确定下面所述的 aggregation/值契约以及适用的属性过滤器。传递范围、环境、确切事件名称、流量类型、单位、值来源和必需属性；带着相同的契约再加上代码测试和交付证据回到此处，而不仅仅是成功声明。

### 阶段 6：决定 aggregation、format、isPositive

从[意图表](../../../references/fme/metric-design.md#intent-to-configuration)中匹配的行开始。关键细节：
- **`aggregation`**：`COUNT`、`TOTAL`、`AVERAGE`、`RATE`——哪个合适见意图表。
- **`spread`**：不属于 create body——每个新指标都是 `PER`。不要包含它。
- **`format`**：`NUMBER`、`DOLLAR`、`PERCENTAGE`、`SECONDS`、`MILLISECONDS`、`BYTES`。`RATE`+`PER` 会强制为 `PERCENTAGE`。
- **`isPositive`**：如果增加是好的则为 `true`。驱动显著性方向解释。
- **`baseEventTypes[].propertyForValue`**：对于 `TOTAL`/`AVERAGE`，值可以来自事件上的命名属性，而不是数值 `track()` 值参数——当用户说值存在于某个属性中（例如 `order_total`）而不是按位置传递时设置此项。
- **推荐 Cap** 用于无界值（收入、时长）的 TOTAL/AVERAGE——减少重度用户带来的噪声。

这是 `/instrument-metric` 必须精确匹配的事件**契约**（`trafficType`、`aggregation`、值单位、值 vs `propertyForValue`，以及任何必需的 `properties`）——如果事件尚未埋点，现在就确定此契约，以免跟踪调用写在猜测之上。

### 阶段 7：名称、描述和 owners

- `name`：必须匹配 `^[A-Za-z][-_A-Za-z0-9]*$`，最多 100 字符，不可变。不能有空格——如果用户给出人类可读的标题，派生一个有效名称并确认。遵循阶段 3 观察到的命名约定。
- `description`：[计数什么、事件在哪里触发、哪个方向是好的](../../../references/fme/metric-design.md#naming-description-and-tags)。
- `owners`：必需；`{type: "USER", email}` 或 `{type: "GROUP", identifier}`（组的 `id` 字段，而非显示名称）。

**停止条件** 如果未指定 owner，或者某个 owner 结果无效——参见[缺失或无效的 owner](references/stop-conditions.md#missing-or-invalid-owner)。没有实际查找，不要声称 owner 已通过目录验证。

### 阶段 8：可选字段

- `filterEventType`——`{eventTypeId, filterAggregation, propertyFilters}`，解析方式与阶段 5 相同。两种用途，由 `filterAggregation` 选择：
  - `"RATE"`——HAS_DONE 过滤器：仅计数做过此事件的单元。
  - `"COUNT"` 且 `aggregation: COUNT`——比率指标（“每单元两个事件的比率”）：`baseEventTypes` 是分子，`filterEventType` 是分母。
- `triggerEventType`——`{eventTypeId}`，解析方式与阶段 5 相同。前序/触发关系（HAS_DONE_BEFORE）：仅计数在基础事件*之前*做过此事件的单元。当用户要求“只计数在 Y 之前做过 X 的用户”、“先于”或“作为触发器”时使用此项——不要替换为普通的 `filterEventType`（HAS_DONE，无排序），因为它会丢弃排序约束。

**停止条件** 如果请求在普通“已做过”过滤器和前序/触发关系之间含糊不清——参见[过滤器与有序触发器](references/stop-conditions.md#filter-versus-ordered-trigger)。

- `cap`——离群值封顶；7 个子字段（`baseEventCountCap`、`baseEventSumCap`、`baseEventValueCap`、`filterEventCountCap`、`filterEventSumCap`、`filterEventValueCap`、`metricValueCap`，全部默认 `0` = 不封顶）加上 `granularity`（`MINUTES|HOURS|DAYS|WEEKS`，默认 `DAYS`）——评估每个 cap 值的时间窗口。只有与指标 `aggregation` 匹配的 cap 字段才有效果——不要设置其他字段；如果用户提到封顶但未指定，询问他们想要哪个 cap。
- `tags`——将每个条目作为 `{name: "..."}` 发送。

### 阶段 9：起草并确认

在调用任何东西之前展示完整 payload：

```
name: <name>
trafficType: <name>
format: <FORMAT>
aggregation: <AGGREGATION>
isPositive: <true|false>
baseEventTypes: [{ eventTypeId: <resolved id>, propertyForValue: null, propertyFilters: [] }]
owners: [{ type: "USER", email: <email> }]
description: <optional>
# + filterEventType / triggerEventType / cap / tags if applicable
```

使用时用确认的值属性和过滤器替换模板的属性字段；否则在每个 base event 上显式包含 `propertyForValue: null` 和 `propertyFilters: []`，以保持 CLI/MCP 一致。将完整已批准的 body 写为 JSON/YAML 供 CLI `-f` 使用，或将其作为 MCP `body` 传递；不要把文件与 `--set`/`--add` 组合并期望合并。

质量检查（在 payload 之外，不是发送给 API 的 body 的一部分）：[良好指标检查清单中失败的警告——例如收入无 cap、方向不明确、事件未流动]

**在此停止。暂时不要调用 Create。** 等待用户明确确认草稿。

### 阶段 10：创建

使用确认的 payload **创建指标**。确认协议参见 [write-safety.md](../../../references/fme/write-safety.md)。

**遇到 409 时，回到阶段 9——每一次都是，而不仅是第一次尝试**——并在起草修订版之前指出具体冲突的指标。完整协议：[retry-and-troubleshooting.md](references/retry-and-troubleshooting.md)。

### 阶段 11：验证

使用创建响应中的字面 `id` 字符串（不要重新输入它）**获取指标**。对照已确认的阶段 9 草稿读回每个字段，而不仅是 `format`/`aggregation`：`name`、`trafficType`、每个事件引用（`baseEventTypes`，以及若已设置的 `filterEventType`/`triggerEventType`——包括它们的 `propertyForValue`/`propertyFilters`/`filterAggregation`）、`aggregation`/`format`/`isPositive`（方向）、`owners`、`cap`、`tags`。考虑已记录的默认值/规范化（例如省略的 cap 字段变为零）。报告任何实质性不匹配；不要静默更新指标来修复它。如果 `format` 被强制转换（阶段 6），告知用户。如果响应包含 UI 链接，分享那个确切的链接——绝不要构建或猜测一个。没有此 get 成功，绝不要报告创建成功。

### 阶段 12：需要时移交

创建指标**不会**将其附加到任何东西。如果这是为实验而做，告知用户指标 ID，并说明附加它（通过实验的 `keyMetrics` / `supportingMetrics`）是单独的步骤——`/manage-experiments` 处理附加；`/choose-metric` 涵盖它属于哪个列表。

## 示例

- “结账我们可以创建哪些指标？”——阶段 2 通过覆盖表给出代码建议；用户挑选；解析、起草、创建。
- “跟踪平均页面加载时间”——阶段 3 先检查自动创建的 `Average Page Load Time - Split Agents` 指标；如果存在则复用。
- “为结账转化率创建指标”——解析流量类型 + 事件，`aggregation: RATE`，起草、确认、创建。
- “基于 purchase_completed 事件添加收入指标”——阶段 5 解析 `purchase_completed`；`aggregation: TOTAL`，`format: DOLLAR`。

## 性能注意事项

- 解析流量类型和事件类型一次，而非每个字段一次。
- 如果创建返回 400，在重试之前按名称**列出指标**——被拒绝的创建仍可能留下一个已持久化的指标，因此不要假设 400 意味着什么都没发生。
- 删除前检查指标使用情况：参见 [tool-map.md](../../../references/fme/tool-map.md#reverse-lookup-scans)。

## 故障排查

有关以下内容参见 [retry-and-troubleshooting.md](references/retry-and-troubleshooting.md)：409、400、反模式表、owner 校验、名称模式失败。
