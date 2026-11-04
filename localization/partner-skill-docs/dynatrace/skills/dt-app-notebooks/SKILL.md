---
name: dt-app-notebooks
description: 操作 Dynatrace 笔记本 —— 创建、修改、查询和分析笔记本 JSON，包括章节、DQL 查询和可视化。
license: Apache-2.0
---

# Dynatrace 笔记本技能

## 概述

Dynatrace 笔记本是存储在 Document Store 中的 JSON 文档，包含一个有序的**章节**数组 —— `markdown` 块用于叙述，`dql` 块用于带可视化的 DQL 查询。章节按数组顺序自上而下渲染。

**何时使用：** 创建、修改、查询或分析笔记本。

## 笔记本 JSON 结构

```json
{
  "name": "My Notebook",
  "type": "notebook",
  "content": {
    "version": "7",
    "defaultTimeframe": { "from": "now()-2h", "to": "now()" },
    "sections": [
      { "id": "1", "type": "markdown", "markdown": "# Title" },
      {
        "id": "2", "type": "dql", "title": "Query Section", "showInput": true,
        "state": {
          "input": { "value": "fetch logs | summarize count()" },
          "visualization": "table",
          "visualizationSettings": { "autoSelectVisualization": true, "chartSettings": {} },
          "querySettings": {
            "maxResultRecords": 1000, "defaultScanLimitGbytes": 500,
            "maxResultMegaBytes": 1, "defaultSamplingRatio": 10, "enableSampling": false
          }
        }
      }
    ]
  }
}
```

- 章节按数组顺序渲染。
- 章节类型：`markdown`、`dql`。（`function` 存在但很少见。）
- 使用字符串整数 ID（`"1"`、`"2"`、……）；也接受 UUID。
- `content.defaultTimeframe` 设置默认时间范围；每个章节可通过 `section.state.input.timeframe` 覆盖。DQL 中允许硬编码的时间过滤器。

**可选内容属性：** `defaultSegments`。

## 读取与分析

使用 `dtctl get notebook <id> -o json` 获取完整内容（`describe` 仅返回元数据），然后检查该 JSON 以发现其可用属性。在分析之前，请仔细阅读 [references/analyzing.md](references/analyzing.md)。

## 创建/更新工作流（强制顺序）

请仔细遵循 [references/create-update.md](references/create-update.md) 中描述的工作流。

**关键规则：**
- 在生成查询之前先加载领域技能 —— 不要臆造 DQL。
- 在添加到笔记本之前校验所有章节查询。
- 在部署前设置 `name`。
- **优先使用 `visualizationSettings` 中的 `autoSelectVisualization: true`**，除非用户请求了特定的可视化类型 —— 当其为 `false` 时，必须显式设置 `state.visualization`。
- **更新时 —— 务必先读取当前状态：** `dtctl get notebook <id> -o json`，将其保存为 `notebook.json`，修改该文件，然后再部署。切勿从零重建 JSON 或手动注入 `id` —— 这两种做法都会静默覆盖用户自上次部署以来在 UI 上所做的编辑。
- **使用 `dtctl apply` 部署** —— 校验会自动运行。如果失败，请修复**所有**报告的错误后再重新应用。

## 可视化类型

笔记本支持 Dynatrace 可视化的一部分子集：

- **时间序列**（需要 `timeseries`/`makeTimeseries`）：`lineChart`、`areaChart`、`barChart`、`bandChart`
- **分类**（`summarize ... by:{field}`）：`categoricalBarChart`、`pieChart`、`donutChart`
- **单值 / 仪表 / 计量条**：`singleValue`、`meterBar`、`gauge`
- **表格**（任意数据形态）：`table`、`raw`、`recordView`
- **分布/状态**：`histogram`、`honeycomb`
- **地理地图**：`choropleth`、`dotMap`、`connectionMap`、`bubbleMap`
- **矩阵/相关性**：`heatmap`、`scatterplot`

每种可视化所需的字段类型：[references/sections.md](references/sections.md)。

## 参考

| 文件 | 何时加载 |
|------|-------------|
| [create-update.md](references/create-update.md) | 创建/更新笔记本 |
| [sections.md](references/sections.md) | 章节类型、可视化字段要求、设置 |
| [analyzing.md](references/analyzing.md) | 读取笔记本、提取查询、用途识别 |
