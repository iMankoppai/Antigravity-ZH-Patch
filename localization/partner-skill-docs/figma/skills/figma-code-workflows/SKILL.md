---
name: figma-code-workflows
description: 将本地 HTML 或项目文件导入或上传到 Figma，选择可编辑的 Design 画框、可运行的 Code Layer 或独立的 Code（又称 Make），并修复导入的预览。仅在用户明确点名可编辑的 Design 图层、可运行的 Code Layer 或独立的 Code/Make 文件，或提供 Figma 文件 key/链接作为导入目标时使用。通用的代码或代码组件请求在采用此工作流前需要先澄清输出。
disable-model-invocation: false
---

# 将项目导入 Figma

仅当明确请求了 Figma 输出（独立的 Code/Make、可运行的 Code Layer 或可编辑的 Design 图层），或给出了作为目标的 Figma 文件 key/链接时，才使用此工作流。通用的“做一个代码项目”或“创建一个代码组件”请求，以及仅出现 Figma Code/Make 名称，并未指明该输出。如果输出意图不清楚，先询问用户想要本地代码还是 Figma 输出，然后等待再开始此工作流。

保留用户的项目。使用每个工具的当前描述和 schema 获取前置条件与参数。

在主要阶段保持向用户更新：准备并校验项目、上传归档、在 Figma 中完成导入。如实报告进行中的导入、恢复工作和阻碍；不要把未经确认的阶段描述为已完成。

## 1. 选择输出和目标

确定用户想要的输出，然后按下表加载相应的技能。如果输出不清楚，在继续之前询问用户。

| 输入 | 用户请求的输出 | 下一步 |
| --- | --- | --- |
| 运行中的应用或静态 HTML | 未指定——只是把它放进/导入 Figma | 询问 **“可编辑的设计图层还是一个代码层？”并结束你的回合。** 等待回答。 |
| 运行中的应用 | 可编辑的 Design 图层 | 加载 `figma-generate-design`，然后在 Design 文件中调用 `generate_figma_design`。 |
| 静态 HTML | 可编辑的 Design 图层 | 在 Design 文件中调用 `html_to_figma`。 |
| 运行中的应用 | 可运行的 Code Layer 或独立 Code/Make | 继续使用本技能并调用 `send_code_to_figma`。 |
| 静态 HTML | 可运行的 Code Layer 或独立 Code/Make | 继续使用本技能并调用 `send_code_to_figma`。 |

当用户尚未选择输出时，一个按钮可用的 HTML 项目仍然是有歧义的。Design 链接只选择目标，不选择输出。

在选择可运行的目标之前，调用 `whoami`。仅当 `whoami.code_layers_enabled` 为 true 时才能选择或导入 Design Code Layer；否则使用独立 Code/Make，或说明限制并在更改用户明确提供的 Design 目标前先询问。

在应用屏幕数量启发式之前，优先遵从明确的代码层或独立请求。对于带 Design 链接的可运行代码，使用 Code Layer。对于独立 Code 链接，使用独立模式。在没有目标或没有明确代码层/独立选择时，估算屏幕数量：少于 10 或未知 → Code Layer；10 或更多 → 独立。绝不要询问 Code Layer 还是独立，也不要让用户去数屏幕。明确的目标和链接在输出选定后优先。

使用提供的文件 URL。如果需要新文件，使用 `create_new_file`，并采用选定的目标类型和用户选择的计划。

当未提供目标时，为所请求的代码层创建一个 Design 文件。

保持已确认的输出选择固定不变；创建文件后不要再让用户选择一次。

对于可编辑的 Design 图层，遵循所选工具的说明：`generate_figma_design` 捕获运行中应用的渲染页面；`html_to_figma` 转换自包含的静态 HTML 文档。检查生成的图层并分享 Design 链接。以下内容仅针对可运行的代码输出继续。

## 2. 遵循导入响应

使用其当前 schema，以选定的本地来源和目标调用 `send_code_to_figma`。遵循返回的准备和归档说明；在有指示时，先保留应用并在本地校验再上传。

严格遵循每个响应的说明和返回的 `nextStep`，用于准备、校验、上传、进行中的导入和安装恢复。在推进之前完成返回的前置条件，并原样传递完整的继续参数。不要臆造缺失的恢复步骤。当没有 `nextStep` 时，遵循响应中的说明和工具的当前描述。

以返回的文件/图层链接结束，并且只报告结果所确立的导入和预览情况。
