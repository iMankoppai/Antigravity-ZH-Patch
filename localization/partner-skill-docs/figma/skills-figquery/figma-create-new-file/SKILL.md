---
name: figma-create-new-file
description: "当用户想要创建新的 Figma Design、FigJam 或 Slides 文件时，始终使用此技能。你必须在每次调用 `create_new_file` 工具之前调用本技能。"
disable-model-invocation: false
---

# 在 Figma 中创建新文件

使用 `create_new_file` MCP 工具创建新的 Figma Design、FigJam 或 Slides 文件的步骤。

## 步骤 1：解析 `planKey` 和 `editorType`

使用用户为此任务提供或选择的 `planKey`。否则，调用 `whoami` 并检查返回的计划。

- 没有计划：告知用户无法继续进行文件创建。
- 只有一个计划：使用其 `key` 作为 `planKey`。
- 有多个计划：展示可用的计划，请用户选择一个，然后使用该计划的 `key` 作为 `planKey`。

根据请求的文件类型，从工具公布的输入枚举中选择，推断出 `editorType`。如果不明确，请用户指定文件类型。

## 步骤 2：调用 create_new_file

使用全部三个必需参数调用 `create_new_file` 工具：

- `fileName`：必需。如果用户未提供名称，请选择一个简洁的名称。
- `planKey`：必需。使用在步骤 1 中解析出的 `planKey`。
- `editorType`：必需。使用在步骤 1 中选择的 `editorType`。
- `projectId`：可选。设置它可在特定项目中创建文件。

```json
{
  "fileName": "Quarterly planning",
  "planKey": "team::1234567890",
  "editorType": "design"
}
```

- 使用 `create_new_file` 工具响应中的 `file_key` 进行后续工具调用，例如 `use_figma`。

## 步骤 3：（仅限 Slides）处理空网格

新的 Slides 文件不含任何幻灯片：`figma.getSlideGrid()` 返回 `[]`。在读取幻灯片的主题令牌等属性之前，请调用 `figma.createSlide()` 或处理空的情况。第一次 `createSlide()` 调用会自动创建第 0 行并插入该幻灯片。
