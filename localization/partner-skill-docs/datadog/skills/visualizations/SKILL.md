---
name: visualizations
description: 仅当用户明确要求查看、展示、绘图、可视化、制图或绘制数据时使用，或当另一个已加载的 Datadog 数据领域技能指示你参考可视化指引时使用。这是插件对 `datadog/visualizations` 服务器技能的本地副本；优先使用它，而不是获取服务器版本。
---

# 可视化指南

当用户要求查看、展示、绘图、可视化或绘制数据时，使用本指南。

## 当可视化工具不可用时

先检查这一点。下面的工具来自 Datadog MCP 服务器的 `visualizations` 工具集，它并非在每个客户端上都默认启用。如果 `get_widget` 和 `visualize_tabular_data` 都不可用，不要调用它们，也不要猜测其他工具名称：

- 如果其他 Datadog MCP 工具可用，则 `visualizations` 工具集已禁用。告诉用户 Datadog 图表未启用，并建议运行 `/ddtoolsets` 来启用可视化。
- 如果没有 Datadog MCP 工具可用，则服务器未设置或无法工作。建议运行 `/ddsetup`。

然后用你能检索到的数据以文本或表格形式作答。仅在这种情况下，下面的可视化规则不适用。

## 工具选择

| 用户意图                    | 工具                     | 何时使用                                                                                             |
| ------------------------------ | ------------------------ | ------------------------------------------------------------------------------------------------------- |
| 展示 Datadog 数据的图表   | `get_widget`             | 时间序列、排行榜、查询表格、查询值、热力图、分布 —— 任何标准的 Datadog 挂件 |
| 将表格数据渲染为图表 | `visualize_tabular_data` | 当你拥有的行/列无法通过 Datadog 挂件定义直接查询时               |

**关键规则**：如果用户说“show me”“graph”“visualize”“chart”或“plot”—— 始终使用 `get_widget` 或 `visualize_tabular_data`。对于这些请求，不要只返回 markdown 表格或文本摘要。

## 图表类型选择

| 数据形态                                        | 推荐的图表类型                                                            |
| ------------------------------------------------- | --------------------------------------------------------------------------------- |
| 指标随时间变化                                  | 通过 get_widget 使用 `timeseries`                                                       |
| 分组数据 / 比例构成 / 饼图 | 通过 visualize_tabular_data 使用 `sunburst`                                             |
| 排名列表 / 条形图（按值取前 N）          | 通过 get_widget 或 visualize_tabular_data 使用 `toplist`                                |
| 嵌套 / 层级构成                   | 通过 visualize_tabular_data 使用 `treemap`                                              |
| 单个数字 / KPI                               | 通过 get_widget 使用 `query_value`（支持背景时间序列和变化指示器） |
| 跨组的随时间变化                    | 通过 get_widget 使用 `change`                                                           |
| 值的分布                            | 通过 get_widget 使用 `distribution`                                                     |

## 常见模式

**指标可视化**：调用 `get_widget`，传入包含指标查询的 widget_definition：

```json
{
  "type": "timeseries",
  "requests": [
    {
      "response_format": "timeseries",
      "queries": [{ "name": "query1", "data_source": "metrics", "query": "avg:system.cpu.user{*}" }]
    }
  ]
}
```

**将日志/span 分析作为图表**：直接在 `get_widget` 调用中构建查询（`data_source: "logs"`、`"spans"` 等）—— 这能让挂件保持可导出到 Datadog。仅当查询无法在挂件定义中表示时，才把 `visualize_tabular_data` 作为最后手段。

## 调用 get_widget

三种输入模式互斥：

- **直接定义**（临时）：通过提供 `widget_definition` 对象从头编写一个新挂件。关于 schema 查找工作流，见[构建 widget_definition](#building-widget_definition)。
- **按 ID**（`dashboard_id` + `widget_id`）：为你通过 `search_datadog_dashboards` 找到的现有仪表板挂件获取数据。
- **按 URL**：提供一个 Datadog `widget_url`（从 Web UI 复制的链接）。支持分享链接（`/s/...`）、短链接（`/u/...`）以及仪表板链接（带聚焦或全屏挂件的 `/dashboard/...`）。

将挂件对象作为 `widget_definition` 传入，而不是 `definition`（错误的键是最常见的 400）。

## 构建 widget_definition

对于临时挂件（widget_definition 模式），每种挂件类型都有其独特的 schema。通过调用 `get_widget_reference` 并传入你正考虑构建的挂件类型列表来了解 schema，然后根据返回的 schema 构造 `widget_definition` 并将其传给 `get_widget`。

对于现有的仪表板挂件，优先使用 `search_datadog_dashboards` → `get_widget`，因为已保存的定义已经有效。

如果 schema 正确的重试仍然失败，调用 `ask_widget_expert` 进行有针对性的调试。

## get_widget 响应

响应包含 METADATA（widget_type、查询元数据）和 DATA 部分。DATA 的形态因 widget_type 而异；关于返回了什么，见每个响应中的 `data_shape` 和 `render_summary.text` 字段。

## 当 get_widget 失败时

错误响应包含一个 `[RECOVERY]` 或 `[EMPTY WIDGET]` 操作列表 —— 遵循它。将重试集中在 schema 层面的更正上；外观更改（标题、display_type）很少能解决验证错误。如果你本轮尚未为受影响的 widget_type 调用 `get_widget_reference`，那就调用它，然后重试。在同一个可视化上失败 2 次之后，用文本向用户解释阻碍，而不是循环尝试。

## 不要做的事

- 当用户要求可视化时，不要只返回一个 markdown 表格
