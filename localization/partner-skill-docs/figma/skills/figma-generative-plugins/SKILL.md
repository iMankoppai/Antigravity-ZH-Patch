---
name: figma-generative-plugins
description: "**强制前置条件** —— 在调用 `create_generative_plugin` 或 `update_generative_plugin` 之前加载此技能。当用户要求创建、编写、更改、修复或扩展可复用的生成式 Figma 插件时使用。"
disable-model-invocation: false
---

# 创建和更新生成式 Figma 插件

在每次调用 `create_generative_plugin` 或 `update_generative_plugin` 之前加载此技能。在面向用户的语言中，把结果称为“插件”。“generative（生成式）”限定词只是将此账户库工具与其他插件系统区分开。

## 预检

在编写之前，确认请求契合此范围：

- 插件在 Figma Design 编辑器中运行。
- 每个插件都必须为其核心工作流提供可用的 UI。即使没有可配置输入的插件，也仍需一个清晰的主操作和有用的状态或校验反馈。
- 绝不可内嵌 API 密钥、OAuth 令牌、签名 URL 或其他机密。插件源代码对有权访问它的人可读。对于需要身份验证的集成，请停止并提供静态数据集、公开的免认证端点或不同的架构。

## 创建工作流

1. 明确所请求的工作流及其有用的控件。仅在所需输入或行为确实含糊时提出一个简洁的问题。
2. 解析 `planKey`。复用用户提供的计划；否则调用 `whoami`。自动使用唯一符合条件的计划，或在存在多个实质不同的计划时请用户选择。
3. 使用简洁的名称、描述和 `planKey` 调用一次 `create_generative_plugin`。这会创建一个可运行的画方框脚手架，而不是所请求的最终插件。
4. 用返回的 `id` 调用 `get_generative_plugin`，然后读取每个源 URI。这会确立脚手架的 manifest、UI 消息契约和当前 TypeScript 入口点。
5. 用为所请求行为和 UI 编写的完整文件替换脚手架。
6. 用返回的 `id`、一个包含 `code.ts` 完整替换内容（以及 UI 变化时的 `ui.html`）的 `files` 数组，以及具体的 `commitMessage` 调用 `update_generative_plugin`。更改名称或描述时使用 `metadata`。

绝不要在 `create_generative_plugin` 之后停下：必须用所请求的体验替换起始脚手架。

## 更新工作流

1. 确定插件。如需要，调用 `list_generative_plugins`，然后调用 `get_generative_plugin`。
2. 在编辑前读取 get 工具返回的每个源 URI。把这些文件视为当前的事实来源。
3. 除非用户要求更改，否则保留现有的 UI、控件、重新启动行为、校验和用户可见的交互提示。
4. 对每个变更的现有文件，用完整的替换内容调用 `update_generative_plugin`。入口点使用 `{ path: "code.ts", content: "..." }`，UI 使用 `{ path: "ui.html", content: "..." }`。未指定的文件会被保留。

## 编写规则

- 在编写替换文件之前，阅读 [插件源编写](references/authoring.md)。它涵盖文件替换契约、UI/消息生命周期、PropsKit 控件、动态页面兼容性、字体、重新启动行为、有界工作、几何以及 Plugin API 的注意事项。
- 保持插件的主操作显而易见，并让无效的选择或输入状态可被理解。
- `update_generative_plugin` 可以替换现有的 `code.ts` 和 `ui.html` 文件，但不能替换 `manifest.json` 或创建新文件。在 `code.ts` 中保留 `figma.showUI(__html__, ...)`，当所请求的工作流需要不同控件时替换 `ui.html`。
- 除非这是插件的明确目的且 UI 清楚表明了这一点，否则避免破坏性的画布更改。
- 不要在异步工作和 UI 消息完成之前关闭。
- 将非错误的 `update_generative_plugin` 结果视为成功。存在时记录返回的版本；成功响应可能省略它。
- 遇到构建错误时，使用返回的编译器输出做最小的源码修正并重试一次。如果仍然失败，请展示该错误，而不是反复重写插件。

## 完成

报告插件名称和 id，存在时还有返回的版本，以及对其 UI 和主操作的简短描述。构造并包含一个可点击的 URL，打开一个新的 Design 文件且未发布的插件已准备好试用，使用确切的插件 id 作为 `try-tool-resource-content-id`：

`https://www.figma.com/file/new?try-tool-resource-content-id=<id>&try-tool-resource-type=gen_tool&type=design&mode=design`

在给出新文件链接后，询问用户是否想在现有的 Figma Design 文件中打开该插件。如果是，复用已提供的文件 URL 或索取一个，然后把相同的 `try-tool-resource-content-id` 和 `try-tool-resource-type` 查询参数添加到该 URL。绝不要猜测文件 URL。
