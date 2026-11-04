---
name: figma-use-figjam
description: "此技能帮助智能体在 FigJam 上下文中使用 Figma 的 use_figma MCP 工具。可与 figma-use 一起使用，后者为使用 use_figma 工具提供基础上下文。"
disable-model-invocation: false
---

# use_figma —— 用于 FigJam 的 Figma Plugin API 技能

此技能包含 `use_figma` MCP 工具针对 FigJam 的特定上下文。[figma-use](../figma-use/SKILL.md) 技能通过 MCP 提供插件 API 执行的基础上下文，以及此处未描述的更高级用例所需的完整 Figma 插件 API。

**在调用 `use_figma` 进行 FigJam 操作时，务必在逗号分隔的 `skillNames` 参数中包含 `figma-use-figjam`。如果本技能是通过 MCP 资源加载的，你必须在名称前加上 `resource:` 前缀（例如 `resource:figma-use-figjam`）。** 这是一个用于跟踪技能使用情况的日志参数——它不影响执行。

> **FigJam URL 是 `figma.com/board/...`。** 在 FigJam 中不要调用 `figma.createPage()` —— 它会抛出 `TypeError: figma.createPage no such property 'createPage' on the figma global object`。`createPage()` 仅是 Design 文件的 API（`figma.com/design/...`）。FigJam 文件只有一个隐式页面；改用分节来组织内容（见 [create-section](references/create-section.md)）。

## 检查 FigJam 文件

**`get_figjam` 是 FigJam 文件的检查工具。** 它以 XML 返回完整节点树，包括页面、分节、便签、连接线以及其他你在后续 `use_figma` 调用中需要引用的节点的 ID。

- **在编写任何需要引用现有节点（页面 ID、分节 ID 等）的 `use_figma` 代码之前，先使用 `get_figjam`。** 不要试图通过运行检查脚本来发现 ID——来自 `use_figma` 的 `console.log` 输出**不会返回给智能体**（见 [figma-use 关键规则 #4](../figma-use/SKILL.md)）。只有 `return` 值会返回。
- **`get_metadata` 在 FigJam 文件上不起作用** —— 它仅适用于设计模式，会立即失败并报错“unsupported for FigJam files”。
- **`get_screenshot` 需要有效的 `nodeId`** —— 传入空 nodeId 会返回“invalid nodeId”错误。先通过 `get_figjam` 获取 ID。
- 如果你忘了从上一次 `use_figma` 调用中 `return` 某个 ID，而现在需要它，请调用 `get_figjam`，而不是重新运行检查脚本。

## 高效加载参考文档

只加载任务所需的参考文档——但当你确实需要加载多个时，**在单个并行的工具调用批次中发出所有读取**，而不是跨回合顺序执行。对于典型的看板创建任务，这意味着用单条消息包含对 `plan-board-content` 的读取，以及你将使用的 3-4 个特定节点类型参考。

## 延迟工具 —— 批量加载 schema

Figma MCP 工具（`use_figma`、`get_figjam`、`get_screenshot`、`get_metadata`、`create_new_file`、`whoami`）通常表现为延迟工具，需先用 `ToolSearch` 加载其 schema 才能调用。**在单次 `ToolSearch` 调用中加载所有 schema**，使用 `select:` 语法，而不是每个工具一次调用：

```
ToolSearch query="select:use_figma,get_figjam,get_screenshot,get_metadata,create_new_file"
```

六次顺序的 `ToolSearch` 调用意味着在开始任何工作前有六次往返。一次批量调用只有一次往返。

## 文本修改 —— 规范配方

每次 FigJam 文本修改（便签/形状/标签/表格单元格/连接线文本、独立文本节点）都遵循与 Design 文件相同的配方：加载字体 → `await` → 修改 → 返回受影响的 ID。跳过加载会抛出 `Cannot write to node with unloaded font "<family> <style>"`。见 [figma-use → gotchas.md → 规范文本编辑配方](../figma-use/references/gotchas.md#canonical-text-edit-recipe-font-load--await--mutate--return-ids)。FigJam 特有说明：子层默认值各不相同（便签 → `Inter Medium`，形状 → `Inter Medium`，连接线 → 在设置前无效），因此务必从 `node.text.fontName` 加载，而不是硬编码 `{ family: 'Inter', style: 'Regular' }`。

## 向 FigJam 看板添加图片

**`upload_assets` 是向 FigJam 文件添加图片的唯一受支持方式。** 用 FigJam 的 `fileKey` 调用 `upload_assets`；该工具返回一次性上传 URL，你向其中 POST 原始图片字节，图片会被自动提交并放置。传入 `nodeIds`（每次上传对应一个条目）可把上传内容作为填充附加到现有 FigJam 节点；省略 `nodeIds` 则把图片作为新图层放到看板上。

有关完整的请求/响应结构，见 [figma-use → api-reference.md → 图片](../figma-use/references/api-reference.md#images)。

## 参考文档

- [plan-board-content](references/plan-board-content.md) - 任何看板内容请求都读这个——看板模板、回顾、头脑风暴、破冰、会议看板、脚手架
  - 涵盖生成看板内容的规划，包括顺序大纲、分节、意图和层级文本
  - 会转到其他参考以获取具体 API 详情
- [create-section](references/create-section.md) —— 创建和配置 FigJam 分节（尺寸、命名、颜色、内容可见性、组织节点、列布局）
- [create-sticky](references/create-sticky.md) —— 创建和配置 FigJam 便签（颜色、尺寸、文本、作者可见性、批量创建）
- [create-connector](references/create-connector.md) —— 创建和配置 FigJam 连接线（端点、箭头、线型、标签、颜色、图表接线）
- [create-text](references/create-text.md) —— 创建和配置 FigJam 文本节点（字体加载、预设字体和颜色、尺寸、列表、思维导图操作）
- [position-figjam-nodes](references/position-figjam-nodes.md) —— 在画布上定位、调整大小和重新设置父级（包括在分节内）
- [create-shape-with-text](references/create-shape-with-text.md) —— 创建和配置带嵌入文本的 FigJam 形状（形状类型、颜色预设、适配文本的尺寸、图表布局）
- [create-code-block](references/create-code-block.md) —— 创建和配置 FigJam 代码块节点（语言、语法高亮、定位、嵌入分节）
- [create-table](references/create-table.md) —— 创建和配置 FigJam 表格（行、列、单元格文本、颜色预设、调整大小）
- [edit-text](references/edit-text.md) —— 编辑现有文本节点（字体加载、样式化范围、查找/替换、FigJam Charcoal 默认颜色）
- [create-label](references/create-label.md) —— 创建和配置 FigJam 标签节点（小型数字/字母圆圈标注标记、序列、定位）
- [batch-modify](references/batch-modify.md) —— 一次修改多个现有节点的模式（批量样式更改、重新定位、属性更新）
- [figjam-colors](references/figjam-colors.md) —— 每种节点类型（便签、分节、连接线、形状、标签）的规范 FigJam 调色板，以及 `hex/255` 记法规则和 `h()` 辅助函数
