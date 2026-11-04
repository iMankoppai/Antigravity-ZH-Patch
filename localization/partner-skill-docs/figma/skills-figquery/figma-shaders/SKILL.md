---
name: figma-shaders
description: "**强制前置条件** —— 在调用 `create_shader` 或 `update_shader` 之前加载此技能。当用户要求创建、编写、更改、修复或迭代 shader 效果、shader 填充、自定义效果、自定义填充或 Figma 中的程序化 shader 时使用。"
disable-model-invocation: false
---

# 创建和更新 Figma shader

在每次调用 `create_shader` 或 `update_shader` 之前加载此技能。它涵盖通过 Figma MCP 服务器编写账户库 shader。读取或应用现有 shader 不需要此技能。

Shader 有两种：

- `effect` 对其下方渲染的图层进行采样和变换。用于模糊、扭曲、发光、调色、像素化、半色调或其他后处理。
- `fill` 在没有输入栅格的情况下生成像素。用于渐变、图案、噪声、纹理和程序化背景。

不要在更新时悄悄切换种类。传给 `update_shader` 的 `kind` 必须与现有 shader 匹配。

## 创建工作流

1. 判断请求是效果还是填充。仅当视觉意图无法区分时才询问。
2. 解析 `planKey`。复用用户提供的计划；否则调用 `whoami`。自动使用唯一符合条件的计划，或在存在多个实质不同的计划时请用户选择。
3. 使用简洁的名称、描述、选定的 `kind` 和 `planKey` 调用一次 `create_shader`。这会创建一个起始脚手架，而不是所请求的最终 shader。
4. 用返回的 `id` 调用 `get_shader`，然后读取每个源 URI。如果客户端无法读取 MCP 资源，改用 `includeSource: true` 调用 `get_shader`。这会确立运行时导入和脚手架固定的元数据契约。
5. 为所请求的结果编写完整的替换 `main.ts`。
6. 用返回的 `id`、相同的 `kind`、`files: [{ path: "main.ts", content: "..." }]` 以及具体的 `commitMessage` 调用 `update_shader`。更改名称、描述或动画能力时使用 `metadata`。当源码读取与时间相关的帧输入时设置 `metadata.isAnimated: true`，当读取 `frame.mousePosition` 时设置 `metadata.usesMouse: true`。

绝不要在 `create_shader` 之后停下：起始脚手架只是一个结构起点。

## 更新工作流

1. 用 `list_shaders` 确定 shader，然后调用 `get_shader`。使用其 `type`（`effect` 或 `fill`）作为所需的更新种类。
2. 在编辑前读取 `get_shader` 返回的每个源 URI。如果客户端无法读取 MCP 资源，使用 `includeSource: true` 调用它。把这些文件视为当前的事实来源。
3. 除非用户要求更改，否则保留现有控件和行为。
4. 用 `files` 数组中完整的替换 `main.ts` 调用 `update_shader`，而不是差异片段或部分片段。空的 `files` 数组仅在仅更新元数据时有效。

## 编写规则

- 在编写 `main.ts` 替换之前，阅读 [Shader 源编写](references/authoring.md)。它包含所需的模块结构、WebGPU 生命周期、支持的参数 schema、效果/填充的 alpha 规则以及 WGSL 失败检查清单。
- 让动画元数据与源码匹配。如果 `main.ts` 读取 `frame.time`、`frame.deltaTime` 或 `frame.frame`，则设置 `metadata.isAnimated: true`；如果读取 `frame.mousePosition`，则设置 `metadata.usesMouse: true`。当移除最后一次此类使用时，将对应值设为 `false`。`update_shader` 会将这些元数据字段应用到固定的 `features.json` manifest，即使该文件无法直接替换。
- 优先使用 `frame.time` 做动画，这样跳过的帧不会改变结果。它是绝对毫秒时钟；需要时用 `Number(frame.time) * 0.001` 将其转换为秒。
- 为用户可能按图层调整的值暴露控件；硬编码实现细节。
- 保持数值范围有界，默认值在视觉上有用。
- 对于效果，要特意采样输入栅格。对于填充，不要假设存在输入栅格。
- 将非错误的 `update_shader` 结果视为成功。存在时记录返回的版本；成功响应可能省略它。
- 遇到构建错误时，使用返回的编译器输出做最小的源码修正并重试一次。如果仍然失败，请展示该错误，而不是反复重写 shader。
- 如果工具报告动画或鼠标输入不可用，将其视为终局能力门槛：不要重试或尝试绕过它。改为提出编写一个静态 shader，其暴露的属性可在 Motion 模式中设关键帧。

## 完成

报告 shader 的名称、种类和 id，存在时还有返回的版本。简要说明添加的控件或行为。构造并包含一个可点击的 URL，打开一个新的 Design 文件且未发布的 shader 已准备好试用，使用确切的 shader id 作为 `try-tool-resource-content-id`。根据 shader 种类设置 `try-tool-resource-type`：效果用 `gen_effect`，填充用 `gen_fill`。

`https://www.figma.com/file/new?try-tool-resource-content-id=<id>&try-tool-resource-type=<gen_effect|gen_fill>&type=design&mode=design`

在给出新文件链接后，询问用户是否想在现有的 Figma Design 文件中打开该 shader。如果是，复用已提供的文件 URL 或索取一个，然后把相同的 `try-tool-resource-content-id` 和解析后的 `try-tool-resource-type` 查询参数添加到该 URL。绝不要猜测文件 URL。

将类型占位符替换为恰好一个值；返回的 URL 中不要包含尖括号或竖线。
