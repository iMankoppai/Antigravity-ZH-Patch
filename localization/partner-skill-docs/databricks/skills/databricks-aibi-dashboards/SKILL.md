---
name: databricks-aibi-dashboards
description: "创建 Databricks AI/BI 仪表板。在创建、更新或部署 Lakeview 仪表板时必须使用，因为 Databricks Dashboard 有独特的 json 结构。关键：部署之前你必须通过 CLI 测试所有 SQL 查询。严格遵循准则。"
compatibility: Requires databricks CLI (>= v1.0.0)
metadata:
  version: "0.2.1"
parent: databricks-core
---

# AI/BI 仪表板技能

创建 Databricks AI/BI 仪表板（原名 Lakeview 仪表板）。
仪表板应该向人展示相关的东西，通常顶部是一些 KPI，并基于故事，一些图表（常常是时间序列），我们看到"某事发生了"。
**严格遵循这些准则。**

## 选择控件

默认使用标准控件。当所需可视化无法用标准控件表达时，使用 Vega-Lite。不同的聚合、调色板、工具提示、参考线或小多图通常不需要自定义规范。

| 需要展示什么？ | 使用 |
|------------------------|-----|
| KPI、趋势、排名、分布或地理比较 | 标准计数器、线/柱、直方图/箱线或地图控件 |
| 带利润率线（第二轴）的收入柱状图 | 标准 `combo` |
| 按群组和已过周期的留存 | 带色阶的标准 `pivot` |
| 时间表上的任务开始/结束时间 | 标准 `gantt` |
| 配送路线或有序 GPS 轨迹 | 标准 `path-map` |
| 目标线或按区域重复的同一图表 | 标准注释或分面；参见[控件规范](references/1-widget-specifications.md#annotations-event-markers) |
| 每个类别都有实际值柱和目标标记的子弹图 | `custom-vega-viz`；参见[子弹图示例](references/6-custom-visualizations.md#example-bullet-chart) |
| 绘制为点的原始观测并叠加滚动均值线 | `custom-vega-viz`；参见[分层时间序列示例](references/6-custom-visualizations.md#example-raw-points-with-a-rolling-mean) |
| 请求的仪表盘、雷达图或嵌套径向/旭日布局 | `custom-vega-viz`；参见[自定义图表模式](references/6-custom-visualizations.md#more-custom-chart-patterns) |

对于自定义图表，确认所需标记和转换受 **Vega-Lite** 支持。它并不支持每一个 Vega 示例或图表类型。将 join 和业务计算保留在数据集 SQL 中；自定义规范控制返回数据如何绘制。

> **改用自定义应用更合适时：** 托管 AI/BI 仪表板是对受治理表进行只读 KPI、图表和过滤的正确工具。如果用户需要的是*自定义代码交互应用* —— 写回 / 数据录入、定制 UI 或超出仪表板网格的交互、嵌入式或需认证的工作流，或作为主要界面的对话式 Genie/聊天助手 —— 则改用 `databricks-apps` 技能构建 Databricks App（它会引入 `databricks-app-design` 处理数据界面 UX）。将"Ask Genie"空间关联到*这个*仪表板仍留在这里（见下文关联 Genie Space）。

## 快速参考

| 任务 | 命令 |
|------|---------|
| 列出数仓 | `databricks warehouses list` |
| 列出表 | `databricks experimental aitools tools query --warehouse WH "SHOW TABLES IN catalog.schema"` |
| 获取 schema | `databricks experimental aitools tools discover-schema catalog.schema.table1 catalog.schema.table2` |
| 测试查询 | `databricks experimental aitools tools query --warehouse WH "SELECT..."` |
| 创建仪表板 | `databricks lakeview create --display-name "X" --warehouse-id "WH" --dataset-catalog CATALOG --dataset-schema SCHEMA --serialized-dashboard "$(cat file.json)" --json '{"parent_path": "/Workspace/Users/<you>/path"}'` —— `--dataset-catalog` / `--dataset-schema` 是**仅标志**（必需；如果放进 `--json`，CLI 会静默丢弃）；`parent_path` 仅 JSON（无标志）。查询必须使用裸表名。 |
| 更新仪表板 | `databricks lakeview update DASHBOARD_ID --dataset-catalog CATALOG --dataset-schema SCHEMA --serialized-dashboard "$(cat file.json)"` —— **更新时始终重新传入 `--dataset-catalog` / `--dataset-schema`**（与 create 相同的仅标志规则）；update 会替换序列化仪表板，因此省略它们会把每个数据集的默认值置空并破坏每个裸表查询。 |
| 发布 | `databricks lakeview publish DASHBOARD_ID --warehouse-id WH` |
| 删除 | `databricks lakeview trash DASHBOARD_ID` |

> **`--warehouse` 标志**：如果你的 CLI 版本中 `databricks experimental aitools tools query --warehouse WH "..."` 失败并报 `unknown flag: --warehouse`，改为在环境中设置 `DATABRICKS_WAREHOUSE_ID=WH` 并去掉该标志 —— 命令会自动从那里拾取。

---

## 控件索引（版本 + 文档位置）

> **版本错了 = 控件坏了！** 这是仪表板错误的第一大原因。

| 控件类型 | 版本 | 记录于 |
|-------------|---------|---------------|
| text（markdown，无 spec 块） | 不适用 | [1-widget-specifications.md#text-headersdescriptions](references/1-widget-specifications.md#text-headersdescriptions) |
| `counter`（KPI + 迷你走势图 + 对比） | **2** | [1-widget-specifications.md#counter-kpi](references/1-widget-specifications.md#counter-kpi) |
| `table` | **2** | [1-widget-specifications.md#table](references/1-widget-specifications.md#table) |
| `bar`、`line` | **3** | [1-widget-specifications.md#line--bar-charts](references/1-widget-specifications.md#line--bar-charts) |
| `pie` | **3** | [1-widget-specifications.md#pie-chart](references/1-widget-specifications.md#pie-chart) |
| `symbol-map`（经纬度点地图） | **2** | [1-widget-specifications.md#symbol-map-bubble-map](references/1-widget-specifications.md#symbol-map-bubble-map) |
| `area` | **3** | [2-advanced-widget-specifications.md#area-chart](references/2-advanced-widget-specifications.md#area-chart) |
| `scatter` | **3** | [2-advanced-widget-specifications.md#scatter-plot--bubble-chart](references/2-advanced-widget-specifications.md#scatter-plot--bubble-chart) |
| `combo`（柱+线，双轴） | **1** | [2-advanced-widget-specifications.md#combo-chart-bar--line](references/2-advanced-widget-specifications.md#combo-chart-bar--line) |
| `choropleth-map`（按值为区域着色） | **1** | [2-advanced-widget-specifications.md#choropleth-map](references/2-advanced-widget-specifications.md#choropleth-map) |
| `forecast-line`（配合 `AI_FORECAST` SQL） | **1** | [2-advanced-widget-specifications.md#forecast-line-with-ai_forecast](references/2-advanced-widget-specifications.md#forecast-line-with-ai_forecast) |
| `pivot`（带条件单元格规则） | **3** | [2-advanced-widget-specifications.md#pivot](references/2-advanced-widget-specifications.md#pivot) |
| `histogram`（配合 `bin(col, binWidth=N)`） | **3** | [2-advanced-widget-specifications.md#histogram](references/2-advanced-widget-specifications.md#histogram) |
| `sankey` | **1** | [2-advanced-widget-specifications.md#sankey](references/2-advanced-widget-specifications.md#sankey) |
| `heatmap` | **3** | [2-advanced-widget-specifications.md#heatmap](references/2-advanced-widget-specifications.md#heatmap) |
| `funnel` | **1** | [2-advanced-widget-specifications.md#funnel](references/2-advanced-widget-specifications.md#funnel) |
| `box` | **1** | [2-advanced-widget-specifications.md#box](references/2-advanced-widget-specifications.md#box) |
| `waterfall` | **1** | [2-advanced-widget-specifications.md#waterfall](references/2-advanced-widget-specifications.md#waterfall) |
| `gantt`（任务时间表和范围） | **1** | [2-advanced-widget-specifications.md#gantt](references/2-advanced-widget-specifications.md#gantt) |
| `path-map`（路线和有序轨迹） | **1** | [2-advanced-widget-specifications.md#path-map](references/2-advanced-widget-specifications.md#path-map) |
| `filter-single-select`、`filter-multi-select`、`filter-date-range-picker` | **2** | [3-filters.md#filter-widget-structure](references/3-filters.md#filter-widget-structure) |
| `filter-date-picker`、`filter-text-entry` | **2** | [日期选择器](references/3-filters.md#single-date-picker)、[文本输入](references/3-filters.md#text-entry-filter) |
| `range-slider` | **2** | [3-filters.md#range-slider-numeric-range-filter](references/3-filters.md#range-slider-numeric-range-filter) |
| `custom-vega-viz`（Vega-Lite 自定义可视化） | **1** | [6-custom-visualizations.md](references/6-custom-visualizations.md) |

> 群组留存图作为带色阶单元格样式的 `pivot` 构建 —— 没有 `cohort` 控件类型。参见 [2-advanced-widget-specifications.md](references/2-advanced-widget-specifications.md) 中的 pivot。

---

## 新仪表板创建工作流

**部署之前你必须通过 CLI 测试所有 SQL 查询。对于新仪表板，遵循这些步骤中的整体逻辑 —— 跳过验证会导致仪表板损坏。**

### 步骤 1：获取数仓 ID（如果尚不知道）

```bash
# List warehouses to find one for SQL execution
databricks warehouses list
```

### 步骤 2：发现表 Schema 和现有数据模式

好的仪表板来自先了解数据。在这里花时间 —— 探索驱动步骤 4 的设计决策（哪些控件、哪些过滤器、哪些分组）。

默认使用 `discover-schema` —— 一次调用返回列、类型、样本行、空值计数和行数。如果你只知道 schema，先用 `query "SHOW TABLES IN ..."` 列出表。

`databricks experimental aitools tools discover-schema catalog.schema.orders catalog.schema.customers`

仅样本行不能告诉你该构建什么。你可以通过 `databricks experimental aitools tools query --warehouse <WH> "..."` 编写聚合 SQL 来探测，通常：

- 候选分组列的**基数** → 决定图表颜色分组 vs. 表格（图表 ≤8 个不同值，见下方基数和可读性）。
- **顶级分类值** → 有意义地填充过滤器选项和图表图例。
- **数值分布**（最小/最大/平均/百分位数）→ 决定用带增减的 KPI 还是趋势图（扁平指标不应做折线图，见下方数据方差考量）。
- **趋势可行性**（日/周/月粒度）→ 选择正确的趋势粒度。
- **故事确认** —— 运行你计划放进仪表板的聚合，检查它们不是扁平的、空的或无趣的。在继续之前修复查询或调整故事。

在一次调用中扇出独立探测 —— 传入多个位置 SQL（和/或重复的 `--file`），它们并行运行（默认 `--concurrency 8`）：

```bash
DATABRICKS_WAREHOUSE_ID=<WH> databricks experimental aitools tools query --output json \
  "SELECT COUNT(*) FROM catalog.schema.orders" \
  "SELECT region, COUNT(*) FROM catalog.schema.orders GROUP BY region ORDER BY 2 DESC LIMIT 10" \
  "SELECT MIN(ts), MAX(ts) FROM catalog.schema.orders"
```

- **多查询模式下 `--output json` 是强制的**。每条语句返回一个对象：`{sql, state, rows, error}`；失败是按语句的（`state: "FAILED"`），其他仍会成功。
- ⚠️ **不要相信退出码**（失败的语句仍可能退出 `0`）—— 以每个对象的 `state != "SUCCEEDED"` 为准。

> **仪表板查询不同** —— 在仪表板 JSON 内，`FROM` 子句必须只引用表名，不带 catalog 或 schema 前缀：
> - ✅ 正确：`FROM trips`
> - ❌ 错误：`FROM nyctaxi.trips`
> - ❌ 错误：`FROM samples.nyctaxi.trips`
>
> catalog 和 schema 在你运行 `databricks lakeview create` 时通过 `--dataset-catalog` 和 `--dataset-schema` 标志单独提供。这些标志不会重写查询 —— 它们只在查询省略 catalog/schema 时填充。如果你在 `FROM` 子句中硬编码 catalog 或 schema，该查询的这些标志会被忽略，仪表板将无法跨环境移植。


### 步骤 3：验证数据匹配故事
仪表板 json 中的 datasets.querylines（见下方示例）必须经过测试，以确保

在最终确定之前，运行你打算在每个数据集中添加的 SQL 查询，确认它们能正确运行且结果有效。
这一点至关重要，因为 json 中定义的控件将使用 query 字段输出渲染可视化。该值在业务层面也应合理。
记住，为使过滤器生效，查询应具有该字段可用（通常按过滤字段分组）

如果值与预期不符，确保查询正确、如果能够修复数据就修复，或在创建仪表板前调整故事。

### 步骤 4：规划仪表板结构

在编写 JSON 之前，规划你的仪表板：

1. 你必须知道确切的 JSON 结构。为此，**阅读参考文件**：[1-widget-specifications.md](references/1-widget-specifications.md)、[3-filters.md](references/3-filters.md)。

始终确保完整阅读一个示例以理解结构，例如 [4-examples.md](references/4-examples.md)。

2. 思考：**哪些控件？** 将每个可视化映射到一个数据集：
   | 控件 | 类型 | 数据集 | 有过滤字段？ |
   |--------|------|---------|-------------------|
   | 收入 KPI | counter | ds_sales | ✓ date, region |
   | 趋势图 | line | ds_sales | ✓ date, region |
   | 热门产品 | table | ds_products | ✗ 无 date |
   ...

3. **哪些过滤器？** 对于每个过滤器，核实你想过滤的所有数据集都包含该过滤字段。
   > **过滤器只影响具有该过滤字段的数据集。** 没有日期的预聚合表不会被日期过滤。

4. **构建仪表板 JSON** 作为本地工作文件（中间步骤，非交付物）。

### 步骤 5：部署

**现在将 JSON 部署到工作区。** 运行 `databricks lakeview create`（下方）。你的任务在命令成功并返回仪表板 ID 之前不算完成 —— JSON 文件本身只是中间工作产物。

**向用户提供仪表板链接**（主机来自 `databricks auth env -o json` → `.env.DATABRICKS_HOST`）。注意 `v3` —— 没有它的 `/sql/dashboards/` 是错误的旧版路径：
- **草稿：** `https://<host>/sql/dashboardsv3/<DASHBOARD_ID>`
- **已发布：** 追加 `/published`（仅在你运行 `databricks lakeview publish DASHBOARD_ID` 后有效）

部署后，相同的 `lakeview` 子命令管理仪表板生命周期（list、get、update、publish、trash）。

```bash
# Deploy: creates the dashboard in the workspace and returns a dashboard ID.
# Canonical form — MIX flags + --json. Each field has exactly ONE valid place:
#   --dataset-catalog / --dataset-schema : FLAG-ONLY (REQUIRED — no JSON field).
#       The CLI silently warns "unknown field" and drops them if put in --json,
#       leaving every dataset query unable to resolve its catalog.schema.
#   parent_path : JSON-ONLY (no flag). Without it, dashboard lands at
#       /Users/<you>/<display-name>.
#   display_name / warehouse_id / serialized_dashboard : either form works;
#       prefer flags for readability.
# Queries inside dashboard.json MUST use bare table names ("FROM trips", never
# "FROM schema.trips" or "FROM catalog.schema.trips") — --dataset-catalog and
# --dataset-schema only fill in missing parts, they do NOT rewrite hardcoded
# prefixes.
#
# parent_path must ALREADY EXIST or create fails "Tree node ... does not exist":
databricks workspace mkdirs /Workspace/Users/me@co.com/dashboards

# Capture the dashboard_id with -o json. Do NOT add 2>&1: create echoes the
# serialized dashboard back, and merging stderr breaks the output so jq can't
# parse it (the dashboard IS created, but you lose the id and the step looks failed).
DASHBOARD_ID=$(databricks lakeview create \
  --display-name "My Dashboard" \
  --warehouse-id "abc123def456" \
  --dataset-catalog "my_catalog" \
  --dataset-schema "my_schema" \
  --serialized-dashboard "$(cat dashboard.json)" \
  --json '{"parent_path": "/Workspace/Users/me@co.com/dashboards"}' \
  -o json | jq -r '.dashboard_id')

# List all dashboards
databricks lakeview list

# Get dashboard details
databricks lakeview get DASHBOARD_ID

# Update a dashboard
# ALWAYS re-pass --dataset-catalog / --dataset-schema: update replaces the
# serialized dashboard, so omitting them nulls the defaults and breaks queries.
databricks lakeview update DASHBOARD_ID \
  --dataset-catalog "my_catalog" \
  --dataset-schema "my_schema" \
  --serialized-dashboard "$(cat dashboard.json)"

# Publish a dashboard
databricks lakeview publish DASHBOARD_ID --warehouse-id WAREHOUSE_ID

# Unpublish a dashboard
databricks lakeview unpublish DASHBOARD_ID

# Delete (trash) a dashboard
databricks lakeview trash DASHBOARD_ID

# By default, after creation, tag dashboards to track resources created with this skill
databricks workspace-entity-tag-assignments create-tag-assignment \
  dashboards DASHBOARD_ID aidevkit_project --tag-value ai-dev-kit
```

---

## 更新现有仪表板

要更改已存在的仪表板，用上方的[创建工作流](#new-dashboard-creation-workflow)构建更新后的 JSON，然后在**同一个** `DASHBOARD_ID` 上用 `update` + `publish` 部署它 —— 绝不要重新运行 `create`/import。

- **不要用 `create`/import 来更新。** 那会生成新的仪表板 id + URL，并破坏你已分享的任何链接；`create` 仅用于全新仪表板。
- **`update` 只更改草稿。** 查看者看到的 `/published` 链接在你再次 `publish` 之前保持在上个快照 —— 因此 `update` 后始终 `publish`。

---

## JSON 结构（必需骨架）

每个仪表板的 `serialized_dashboard` 内容必须遵循这个确切结构：

重要：始终在每个 `queryLines` 值的末尾加一个空格或 `\n`，因为它们会被连接起来创建数据集。

```json
{
  "datasets": [
    {
      "name": "ds_x",
      "displayName": "Dataset X",
      "queryLines": ["SELECT col1, col2 ", "FROM my_table"]
    }
  ],
  "pages": [
    {
      "name": "main",
      "displayName": "Main",
      "pageType": "PAGE_TYPE_CANVAS",
      "layout": [
        {"widget": {/* INLINE widget definition */}, "position": {"x":0,"y":0,"width":2,"height":3}}
      ]
    }
  ]
}
```

**结构规则（违反会导致 "failed to parse serialized dashboard"）：**
- `queryLines`：字符串数组，而非 `"query": "string"`。元素被**逐字连接**，无分隔符 —— 每行以 ` ` 或 `\n` 结尾（或去掉 `-- 注释`）。以 `-- 注释` 结尾且无换行的一行会吞掉下一行。
- 控件：内联在 `layout[].widget` 中，而非单独的 `"widgets"` 数组
- `pageType`：每个页面必需（`PAGE_TYPE_CANVAS` 或 `PAGE_TYPE_GLOBAL_FILTERS`）
- 查询绑定：chart、table、counter 和 custom-viz 的 `query.fields[].name` 值必须与其 `encodings.*.fieldName` 值完全匹配。过滤器有控件专属的绑定；范围滑块为一个底层 `fieldName` 暴露 `MIN`/`MAX` 查询字段，参数绑定的日期过滤器使用 `query.parameters`。

### 主题与颜色（始终设置 —— 它成就或毁掉仪表板）

顶层 `uiSettings.theme` 控制仪表板上每个控件的颜色、字体和控件外观。没有它，仪表板继承工作区默认值，看起来平庸。**在你创建的每个仪表板上设置完整块** —— 一致的调色板是单项影响最大的润色项。

心智模型 —— **60/30/10 规则**映射到主题键：**60% 中性** = 画布/控件/边框背景（设置 `widgetBorderColor = widgetBackgroundColor` 以隐藏边框）；**30% 次要** = `fontColor` + `visualizationColors`（内容权重）；**10% 强调** = 用于过滤器 / 标签页 / 活动选择的 `selectionColor` —— 选一个与文本和调色板不同的事物；约 `#2272B4` 的安全蓝符合超链接惯例，可作为默认。

```json
{
  "datasets": [...],
  "pages": [...],
  "uiSettings": {
    "theme": {
      "canvasBackgroundColor": {"light": "#FCFCFC", "dark": "#1F272D"},
      "widgetBackgroundColor": {"light": "#FFFFFF", "dark": "#11171C"},
      "fontColor":             {"light": "#11171C", "dark": "#E8ECF0"},
      "selectionColor":        {"light": "#2272B4", "dark": "#8ACAFF"},
      "visualizationColors": [
        "#FFA600", "#FF7054", "#DE5582", "#995495",
        "#4E5185", "#1D425C", "#99DDB4"
      ],
      "widgetHeaderAlignment": "LEFT"
    }
  }
}
```

**主题键**（机制）：

- `visualizationColors`：每个图表系列和类别映射循环经过的有序调色板。**位置从 0 开始索引**：`position: 0` = 第一个颜色（上方的 `#FFA600`），`position: 6` = 第七个（`#99DDB4`）。长度通常为 5–8。
- 背景 / 字体 / 选择颜色采用 `light` + `dark` 对；仪表板根据查看者模式自动选择。
- `fontColor` 也驱动**计数器数字颜色** —— 计数器没有逐控件颜色，因此这是它们唯一的杠杆（它为仪表板上每个计数器的值着色，而非逐块）。
- `widgetHeaderAlignment`：`"LEFT"`（默认）、`"CENTER"` 或 `"RIGHT"`。可选顶层：`fontFamily`（例如 `"Space Grotesk"`、`"Inter"` —— 无衬线保持密集数据可读；不要逐控件覆盖）和 `widgetCornerRadius`（整数 px，例如 `12` 表示圆角；`0` 或省略 = 方形）。
- 逐控件颜色引用（仅图表）：`{"themeColorType": "visualizationColors", "position": N}`（从 0 开始索引）以固定到某个调色板槽位，或 `{"hex": "#FF0000"}` 表示调色板之外的精确颜色。**计数器不支持逐控件颜色** —— 计数器 `value` 上的 `color` 会将控件渲染为 "unsupported widget definition"；通过上述 `fontColor` 给计数器着色。

**调色板设计规则**（这是polished仪表板与嘈杂仪表板的分水岭）：

1. **每个仪表板一个连贯的色系，在整个系列中彼此区分。** **跨色相**行走（例如琥珀 → 珊瑚 → 粉 → 紫 → 藏青），而非一种颜色向白色淡出 —— 单色相明度渐变读起来像一种颜色，查看者无法区分类别。相邻色标必须在视觉上不同：如果你眯眼看两个色融为一个，就把它们推得更远。单色相渐变仅用于**定量**控件（`colorRamp.mode: "custom-sequential"`），绝不用于 `visualizationColors`。
2. **将语义色固定为字面 hex，放在调色板之外。** "坏" = 温暖的珊瑚色（例如 `#FF7E5C`），"好" = 平静的青/绿色。使用 `color.scale.mappings` 配合裸 hex 字符串 —— `{"value": "Critical", "color": "#FF7E5C"}` —— **而非** `{"hex": "..."}` 或 `themeColorType: position`（两者在图表控件上都会被静默丢弃）。复用调色板中已有的好青色，使其永不冲突。
3. **显式给非分类控件着色，使其加入色系。** 地图和热力图：`colorRamp.mode: "custom-sequential"` 配来自色系的 `{start, end}`（如有方向：`start` = 坏颜色，`end` = 好颜色）。预测 / 多系列：按 `displayName` 键通过 `color.scale.mappings` 逐系列固定（实际 = 实心色系色，预测 = 对比/警示，阈值 = 柔和色调）。计数器（包括迷你走势图计数器）**不**接受逐控件颜色 —— 其数字颜色来自主题的 `fontColor`；不要设置 `value.color`（会渲染为 "unsupported widget definition"）。
4. **"更浅 / 更柔和"微调**：将所有色标一起向明度上移；不要单独重新着色。重新同步固定的语义 hex 值；在警示色上保持足够对比度，使其仍读作警告。

**入门调色板**（选一个并调整 —— 需要时扩展到 7-8 个色标；语义红/绿按规则 2 保持字面 hex）：

```
#094074  #3C6997  #5ADBFF  #FFDD4A  #FE9000
#003F5C  #594E90  #BC4C96  #FF5F66  #FFA600
#4A8CC7  #F59770  #FFD84A  #F0E09E  #6DD980
#440154  #3B528B  #21918C  #5EC962  #FDE725
#4E79A7  #F28E2C  #E15759  #76B7B2  #59A14F
#0072B2  #E69F00  #009E73  #CC79A7  #D55E00
#0D0887  #7E03A8  #CC4778  #F89441  #F0F921
#6929C4  #1192E8  #005D5D  #9F1853  #FA4D56
```

约 4-5% 的查看者有色盲（主要是红/绿）。上方第 4 行和第 6 行（viridis、Okabe-Ito）按设计对色盲安全；通过模拟器（Adobe Color、`colorbrewer2.org`）验证自定义调色板。不要把红和绿相邻，并依赖明度对比 —— 而非仅色相 —— 来区分相邻色标。

### 关联 Genie Space（可选）

要向仪表板添加"Ask Genie"按钮，或关联一个带 ID 的 genie 空间/房间，将 `uiSettings.genieSpace` 添加到 JSON 中（与 `theme` 并列，如果你有的话）：

```json
"uiSettings": {
  "theme": { /* ... */ },
  "genieSpace": {
    "isEnabled": true,
    "overrideId": "your-genie-space-id-here",
    "enablementMode": "ENABLED"
  }
}
```

> **Genie 不是控件。** 仅通过 `uiSettings.genieSpace` 关联。没有 `"widgetType": "assistant"`。

---

## 设计最佳实践

除非用户另有指定，否则应用：
- **全局日期过滤器**：当数据有时间列时，添加日期范围过滤器。大多数仪表板需要基于时间的过滤。
- **KPI 时间界限**：使用有时间界限的指标，以支持周期对比（MoM、YoY）。无界限的"全时"总计可操作性较弱。
- **值格式化**：根据含义格式化值 —— 货币带符号、百分比带 %、大数字压缩（K/M/B）。
- **图表选择**：将基数匹配到图表类型。少量不同值 → 带颜色分组的柱状图（或如果你真想要快照则用饼图）；大量值 → 表格。

## 参考文件

> **在生成任何仪表板 JSON 之前，先阅读 [4-examples.md](references/4-examples.md)。** 它是一个完整的参考仪表板，练习每一种构造（数据集度量 + `MEASURE()`、迷你走势图计数器、带注释的预测线、带条件单元格的 pivot、symbol-map、直方图、范围滑块过滤器、主题）。用它学习 JSON 形状；然后适应用户的数据和演示故事 —— 保持结构，替换表、指标、调色板和叙事为你正在构建的案例。

| 你在构建什么？ | 参考 |
|------------------------|-----------|
| **从这里开始** —— 完整的可运行仪表板模板 | [4-examples.md](references/4-examples.md) |
| 任何控件（text、counter、table、chart） | [1-widget-specifications.md](references/1-widget-specifications.md) |
| 高级图表（area、scatter/bubble、combo、Gantt、choropleth/path maps） | [2-advanced-widget-specifications.md](references/2-advanced-widget-specifications.md) |
| 带过滤器的仪表板（全局或页面级） | [3-filters.md](references/3-filters.md) |
| 自定义 Vega-Lite 控件（分层图表、bullet、gauge、radar、sunburst） | [6-custom-visualizations.md](references/6-custom-visualizations.md) |
| 调试损坏的仪表板 | [5-troubleshooting.md](references/5-troubleshooting.md) |

---

## 实现准则

### 1) 数据集架构

- **数据集越少越好 —— 目标是让一个数据集支撑尽可能多的控件。** 点击图表上的某个值（例如一个柱、一个扇区）会作为**该数据集**上的过滤器，共享该数据集的其他每个控件都会在应用该点击后重新渲染。将控件拆分到许多窄数据集会破坏这种交叉过滤，并迫使用户为理应"开箱即用"的功能设置显式过滤控件。优先为每个领域（orders、cases、customers）使用一个宽数据集；只有当某个控件确实需要不同的粒度、预聚合或其他控件无法容忍的参数时才拆分。
- **定义数据集的两种方式**：
  - **SQL 查询**：`{"name": "ds_x", "displayName": "...", "queryLines": ["SELECT ...", "FROM table"]}` —— 完全控制，可包含 `WITH` / `JOIN` / `AI_FORECAST` 等。
  - **UC 资产简写**：`{"name": "ds_x", "asset_name": "catalog.schema.table_or_view"}` —— 无需 SQL。适用于表、视图和指标视图。你仍可在其上叠加 `columns`（度量 + 派生维度）：`{"name": "ds_x", "asset_name": "...", "columns": [{"displayName": "Total Revenue", "expression": "SUM(\`amount_usd\`)"}]}` —— 相同的 `MEASURE()` 模式。
- 使用 `queryLines` 时每个数据集**恰好一个有效 SQL 查询**（不要用 `;` 分隔多个查询）
- **查询必须只使用裸表名** —— 无 catalog，无 schema 前缀。例如：`FROM orders`，绝不是 `FROM gold.orders` 或 `FROM main.gold.orders`。catalog 和 schema 在创建时来自 `--dataset-catalog` 和 `--dataset-schema` 标志。这些标志只填充缺失部分 —— 它们不会覆盖查询中写入的任何 catalog/schema。
- SELECT 必须包含控件所需的所有维度，以及通过 `AS` 别名的所有派生列
- 将所有业务逻辑（CASE/WHEN、COALESCE、比率）放入数据集 SELECT 中并带显式别名
- **可视化的契约规则**：对于 chart、table、counter 和 custom-viz 控件，每个 `fieldName` 必须匹配其对应的 `query.fields[].name`；该查询字段的表达式引用数据集列或别名。使用 [3-filters.md](references/3-filters.md) 中过滤器专属的契约，包括范围滑块和参数绑定的例外。
- **当可视化依赖数据顺序时添加 ORDER BY**：
  - 时间序列：`ORDER BY date` 用于按时间显示
  - 排名/Top-N：`ORDER BY metric DESC LIMIT 10` 用于"Top 10"图表
  - 分类图表：`ORDER BY metric DESC` 以先显示最大值

#### 数据集级度量 + `MEASURE()`

控件表达式通常是内联聚合（`{"name": "sum(x)", "expression": "SUM(\`x\`)"}`）。但你也可以在**数据集自身上声明可复用度量**并按名称引用它们 —— 每个消费该数据集的控件都能使用同一指标而无需重新定义。

定义度量的两种方式：

1. **仪表板级 `columns`**（适用于任何数据集 —— SQL 查询或 `asset_name`）：
   ```json
   {
     "name": "ds_support",
     "queryLines": ["SELECT * FROM support_cases"],
     "columns": [
       {"displayName": "Total Cases",     "description": "Count of cases",
        "expression": "COUNT(`case_id`)"},
       {"displayName": "Reopen Rate %",   "description": "% of reopened cases",
        "expression": "SUM(CASE WHEN `reopened_flag` THEN 1 ELSE 0 END) * 100.0 / COUNT(`case_id`)"},
       {"displayName": "Priority Level",  "description": "Sorted priority label",
        "expression": "CASE WHEN `priority`='Critical' THEN '1-Critical' ELSE '4-Low' END"}
     ]
   }
   ```

2. **指标视图来源** —— 如果数据集的 `asset_name`（或 `FROM` 子句）是 UC 指标视图，其 YAML 定义的度量已可查询。**不要在 `columns` 中重复声明它们**。参见 [databricks-metric-views](../databricks-metric-views/SKILL.md)。

无论哪种方式，控件按名称引用度量：

```json
"fields": [{"name": "measure(Total Cases)", "expression": "MEASURE(`Total Cases`)"}],
"encodings": {"value": {"fieldName": "measure(Total Cases)", "displayName": "Total Cases"}}
```

`MEASURE(\`...\`)` 在 counter、table、bar、line、pie、pivot 中均可用 —— 任何接受字段表达式的控件。可与内联聚合自由混用。

### 2) 控件字段表达式

> **关键：字段名匹配规则**
> 对于 chart、table、counter 和 custom-viz 控件，`query.fields` 中每个选中的 `name` 必须与其在 `encodings` 中的 `fieldName` 完全匹配。
> 如果它们不匹配，控件会显示 "no selected fields to visualize" 错误！

对于 `custom-vega-viz`，还要将 `spec.encodings.fields[].fieldName` 匹配到 Vega-Lite 输入的 `field` 名。将 `spec.data.queryName` 设为控件查询名。内部 Vega-Lite 规范读取 `data.name: "databricks_query"`，并作为**JSON 字符串**存储在 `spec.jsonSpec.spec` 中。生成自定义控件前阅读 [6-custom-visualizations.md](references/6-custom-visualizations.md)。

**聚合的正确模式：**
```json
// In query.fields:
{"name": "sum(spend)", "expression": "SUM(`spend`)"}

// In encodings (must match!):
{"fieldName": "sum(spend)", "displayName": "Total Spend"}
```

**错误 —— 名称不匹配：**
```json
// In query.fields:
{"name": "spend", "expression": "SUM(`spend`)"}  // name is "spend"

// In encodings:
{"fieldName": "sum(spend)", ...}  // ERROR: "sum(spend)" ≠ "spend"
```

控件查询中允许的表达式（表达式内不能使用 CAST 或其他 SQL）：

```json
{"name": "(sum|avg|count|countdistinct|min|max)(col)", "expression": "(SUM|AVG|COUNT|COUNT(DISTINCT)|MIN|MAX)(`col`)"}
{"name": "(daily|weekly|monthly)(date)", "expression": "DATE_TRUNC(\"(DAY|WEEK|MONTH)\", `date`)"}
{"name": "field", "expression": "`field`"}
```

如果你需要条件逻辑或多字段公式，先在数据集 SQL 中计算派生列。

一些控件支持额外的表达式：Gantt 可用 `FIRST(...)` 表示状态字段，几何地图绑定需要 `ST_ASGEOJSON(...)`。这些形状参见相应的控件参考。

### 3) SPARK SQL 模式

- 日期运算：天数用 `date_sub(current_date(), N)`，月份用 `add_months(current_date(), -N)`
- 日期截断：`DATE_TRUNC('DAY'|'WEEK'|'MONTH'|'QUARTER'|'YEAR', column)`
- **避免** `INTERVAL` 语法 —— 改用函数

### 4) 布局（12 列网格，无空隙）

**每个页面必须包含 `"layoutVersion": "GRID_V1"`** 并配合 `pageType`。

```json
{
  "name": "overview",
  "displayName": "Overview",
  "pageType": "PAGE_TYPE_CANVAS",
  "layoutVersion": "GRID_V1",
  "layout": [...]
}
```

每个控件有一个位置：`{"x": 0, "y": 0, "width": 4, "height": 4}`

**根据受众选择细分。** 12 列网格可干净地分为 3、4 或 6 列：3 列布局（每个控件 `width: 4`）降低认知负荷，适合高管概览；4 列（`width: 3`）是全能型；6 列（`width: 2`）为技术/运营仪表板（读者同时查阅许多指标）打包最高密度。

**默认规则**：每行应恰好填满 width=12 —— 无空隙。一旦你对网格有信心，可以跨列交错高度（左侧一个高控件搭配右侧几个较矮的），使两半不共享行边界 —— 参见 [4-examples.md](references/4-examples.md#layout-12-col-grid) 了解模式。从严格的行开始；只有当交错在视觉上更好时才放宽。

```
CORRECT:                            WRONG:
y=0: [w=12]                         y=0: [w=8]____  ← gap!
y=1: [w=4][w=4][w=4]  ← fills 12    y=1: [w=2][w=2][w=2][w=2]__  ← gap!
y=4: [w=6][w=6]       ← fills 12
```

**推荐的控件尺寸：**

| 控件类型 | 宽度 | 高度 | 备注 |
|-------------|-------|--------|-------|
| 文本标题 | 12 | 1 | 全宽；标题和副标题使用单独的控件 |
| 计数器/KPI | 4 | **3-4** | **绝不用 height=2** —— 太挤！ |
| 线/柱/面积图 | 6 | **5-6** | 并排配对以填满行 |
| 饼图 | 6 | **5-6** | 需要空间放图例 |
| 全宽图表 | 12 | 5-7 | 用于详细时间序列 |
| 表格 | 12 | 5-8 | 全宽以提高可读性 |

**标准仪表板结构：**
```text
y=0:  Title (w=12, h=1) - Dashboard title (use separate widget!)
y=1:  Subtitle (w=12, h=1) - Description (use separate widget!)
y=2:  KPIs (w=4 each, h=3) - 3 key metrics side-by-side
y=5:  Section header (w=12, h=1) - "Trends" or similar
y=6:  Charts (w=6 each, h=5) - Two charts side-by-side
y=11: Section header (w=12, h=1) - "Details"
y=12: Table (w=12, h=6) - Detailed data
```

### 5) 基数与可读性（关键）

**仪表板可读性取决于限制不同值：**

| 维度类型 | 最大值的数量 | 示例 |
|----------------|------------|----------|
| 图表颜色/分组 | **3-8** | 4 个区域、5 条产品线、3 个层级 |
| 过滤器 | 4-15 | 8 个国家、5 个渠道 |
| 高基数 | **仅表格** | customer_id、order_id、SKU |

**在创建任何带颜色/分组的图表之前：**
1. 通过 discover-schema 或 COUNT DISTINCT 查询检查列基数
2. 如果不同值 >10，聚合到更高层级，或用 TOP-N + "其他"桶
3. 对于高基数维度，使用表格控件而非图表

### 6) 质量检查清单

在部署之前，核实：
1. 所有控件名称仅使用字母数字 + 连字符 + 下划线
2. **每个页面都有 `"layoutVersion": "GRID_V1"`**
3. 所有行合计为 width=12 且无空隙
4. KPI 使用高度 3-4，图表使用高度 5-6
5. 图表维度具有合理基数（颜色/分组 ≤8）
6. 所有控件查询表达式引用现有数据集列或别名
7. **可视化字段绑定完全匹配**：对于图表、表格、计数器和自定义可视化，每个 `query.fields[].name` 匹配其编码 `fieldName`（例如，两者都是 `"sum(spend)"`）。过滤器则按控件专属规则验证。
8. 计数器数据集：1 行数据集用 `disaggregated: true`，多行用 `disaggregated: false` 配合聚合
9. **`number-percent` 格式的百分比值必须为 0-1**（0.865 显示为 "86.5%"，别忘了设置格式）。如果数据是 0-100，在 SQL 中除以 100 或改用 `number` 格式。
10. SQL 使用 Spark 语法（date_sub，而非 INTERVAL）
11. **所有 SQL 查询都通过 CLI 测试并返回预期数据**
12. **你想过滤的每个数据集都必须包含过滤字段** —— 过滤器只影响查询中具有该列的数据集
13. **`abbreviation: "compact"` 需要 `decimalPlaces`** —— 没有它值不会被舍入（渲染为 `$9.756278496M`，而非 `$9.76M`）

---

## 数据方差考量

在创建趋势图之前，检查指标是否有足够方差以有意义地可视化：

```sql
SELECT MIN(metric), MAX(metric), MAX(metric) - MIN(metric) as range FROM dataset
```

如果范围相对于刻度非常小（例如 0-100 刻度上的 83-89%），图表会看起来几乎扁平。考虑：
- 显示为带增减/对比的 KPI 而非图表
- 使用表格显示精确值
- 调整可视化以聚焦方差

---

## 相关技能

- **[databricks-apps](../../skills/databricks-apps/SKILL.md)** - 当用户需要自定义代码交互应用（写回、定制 UI、应用内聊天 / Genie）而非托管仪表板时
- **[databricks-unity-catalog](../databricks-unity-catalog/SKILL.md)** - 用于查询底层数据和系统表
- **[databricks-pipelines](../databricks-pipelines/SKILL.md)** - 用于构建为仪表板提供数据的管道
- **[databricks-jobs](../databricks-jobs/SKILL.md)** - 用于调度仪表板数据刷新
