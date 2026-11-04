---
name: ui
description: 将 Unity UI 请求路由到正确的框架技能（UI Toolkit、uGUI 或 IMGUI），并回答 UI 比较问题。用于菜单、HUD、面板或编辑器 UI，且请求未指明框架时。在编写任何 UI 代码之前先查阅。
---

确定项目合适的 UI 系统，并路由到正确的专用技能。

## 何时路由 vs 直接回答

**在以下情况下路由到专用技能：**
- 用户想要了解、编辑或生成特定的 UI 元素
- 用户引用了特定的文件或 UI 对象
- 用户要求 UI 更改或创建

**在以下情况下直接回答（不路由）：**
- 用户提出比较性/教育性问题（"What's the difference between UI Toolkit and uGUI?"）
- 用户询问 UI 系统能力或建议（"Should I use UITK or uGUI for mobile?"）
- 用户需要 Unity UI 架构的概念性解释

## 路由逻辑

**第 1 步：检查明确的文件引用或关键字：**

| 用户提及 | 路由到 |
|---------------|----------|
| `.uxml` 或 `.uss` 文件（包括 `/Editor/` 中的） | `ui-uitk` |
| "UI Toolkit"、"UITK"、"UIElements"、"CreateGUI" | `ui-uitk` |
| Canvas 预制体/对象、带 UI 的 `.prefab` | `ui-ugui` |
| "uGUI"、"Canvas"、"RectTransform"、"legacy UI" | `ui-ugui` |
| "IMGUI"、"OnGUI"、"OnInspectorGUI"、"immediate mode" | `ui-imgui` |
| Figma URL（`figma.com/design/...`）、"Figma"、"import from Figma" | 不可用——见下文 |

**对于编辑器相关请求（EditorWindow、自定义检视面板、PropertyDrawer）：**
- 如果未提及明确的 UI 系统 → **转到第 2 步**以检测项目的编辑器 UI 系统
- 如果未检测到现有模式，默认对新编辑器 UI 使用 `ui-uitk`
- 仅在项目专门使用 IMGUI 或用户明确要求时才使用 `ui-imgui`

如果找到明确的文件或关键字，立即激活相应技能。

**第 2 步：如果有歧义，从项目检测：**

搜索项目以确定正在使用哪个 UI 系统：

| 查找 | 表示 |
|----------|-----------|
| `.uxml` 或 `.uss` 文件（包括 `/Editor/` 中的） | UI Toolkit（运行时或编辑器） |
| 场景中的 `UIDocument` 组件 | UI Toolkit（运行时） |
| 带 `CreateGUI()` 方法的编辑器脚本 | UI Toolkit（编辑器） |
| 场景/预制体中的 `Canvas` | uGUI |
| 大量使用 `RectTransform` | uGUI |
| 带 `OnGUI()` 或 `OnInspectorGUI()` 的编辑器脚本 | IMGUI（旧版编辑器） |

**第 3 步：如果仍不清楚，询问或使用默认值：**

- 对于现有项目：检测并遵循已在使用的框架（第 2 步）
- 对于尚无 UI 的新项目：询问用户偏好哪个框架（UI Toolkit vs uGUI），简要说明 UI Toolkit 是现代/CSS 式的，而 uGUI 基于 Canvas/成熟
- 对于用户没有偏好的新运行时/游戏 UI：默认使用 uGUI（`ui-ugui`）
- 当用户提及移动端/性能约束或较旧 Unity 版本（6.0 之前）时：倾向于 uGUI（`ui-ugui`）

## 请求类型

专用技能处理三种类型的请求：

| 类型 | 示例 |
|------|----------|
| **理解** | "What does this button do?"、"How is this laid out?"、"Explain this UI" |
| **编辑** | "Change this color"、"Add a label here"、"Fix this layout" |
| **生成** | "Create a menu"、"Make an inventory screen"、"Build a settings panel" |

根据 UI 系统将所有类型路由到相应的专用技能。

## 可用子技能

### UI Toolkit — `ui-uitk`
- 适用于使用 UI Toolkit 的 Unity 6.0+ 项目（运行时游戏 UI 和编辑器工具）
- **理解**、**编辑**和**生成** `.uxml` 和 `.uss` 文件
- 现代、CSS 式的样式方法
- 首选用于新的编辑器窗口（CreateGUI）和现有 UI Toolkit 项目

### uGUI — `ui-ugui`
- 适用于使用 Unity 基于 Canvas 的 UI 系统的项目
- **理解**、**编辑**和**生成** Canvas 层级
- 使用 Layout Group 实现响应式设计
- 当用户没有框架偏好时，作为新运行时/游戏 UI 的默认选择

### IMGUI — `ui-imgui`
- 适用于使用 OnGUI/即时模式的旧版编辑器工具
- 仅在项目已有 IMGUI 编辑器代码或用户明确要求 IMGUI 时使用
- **理解**、**编辑**和**生成**用 OnGUI 构建的 EditorWindow、检视面板、PropertyDrawer
- 不用于运行时游戏 UI——对于新的编辑器工具，除非项目已经专门使用 IMGUI，否则使用 UI Toolkit

### Figma 设计导入——此处不可用

导入 Figma 设计需要 Unity 的 Figma 集成服务，该服务仅存在于 Unity AI Assistant 内部。没有客户端等价物，因此不要承诺它。

如果用户带来 Figma URL，请说明此处无法进行自动导入，并提供替代方案：请他们描述或截图该界面，然后用上面的相应框架技能构建它。

## 通用指南（所有 UI 系统）

### 范围纪律

**只做所请求的事情：**
- 问题 → 回答而不做更改
- 针对性编辑 → 只修改指定的内容
- 生成 → 只创建所请求的文件
- 除非明确要求，不要主动添加脚本

**这些并不意味着需要脚本：**
- "proper buttons" → 样式良好的按钮
- "working UI" → 能正确渲染的有效 UI
- "menu screen" → 仅视觉布局

### 约定

**优先遵循项目模式。** 在应用默认值之前先搜索现有文件。

| 类型 | 约定 |
|------|------------|
| 元素名称 | 遵循项目模式，或 camelCase |
| 文件组织 | 匹配现有项目结构 |

### 工作流

1. **确定 UI 系统** —— 使用上面的路由逻辑
   - 对于 Figma 请求，告诉用户此处无法进行自动导入，然后
     根据他们的描述或截图工作，并继续框架检测
2. **激活专用技能** —— 路由到 `ui-uitk`、`ui-ugui` 或 `ui-imgui`
3. **技能处理请求** —— 按需进行理解、编辑或生成

## 处理混合项目

许多 Unity 项目同时使用多个 UI 系统（例如，运行时游戏 UI 用 UI Toolkit 加上编辑器工具）。当你检测到多个系统时：

- **对于运行时 UI 请求**（菜单、HUD、游戏界面）→ 路由到已在使用的运行时系统（UITK 或 uGUI）
- **对于编辑器工具请求**（自定义检视面板、编辑器窗口）：
  - **首选 UI Toolkit**（CreateGUI）用于新的编辑器 UI——它是现代方法
  - 仅当项目现有编辑器工具专门使用 IMGUI，或用户明确要求 IMGUI 时才使用 IMGUI
  - 检查现有的编辑器 `.uxml` 文件以确认 UITK 的使用
- **如果在混合项目中创建新的运行时 UI** → 匹配类似现有 UI 所使用的模式；如果没有类似的现有 UI 且用户没有偏好，则使用 uGUI
