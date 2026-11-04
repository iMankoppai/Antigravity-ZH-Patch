---
name: figma-generate-library
description: "从代码库在 Figma 中构建或更新专业级设计系统。当用户想要创建变量/令牌、构建组件库、创建具有正确变体集和变量绑定的单个组件、设置主题（浅色/深色模式）、记录基础，或调和代码与 Figma 之间的差距时使用。当用户要求创建或生成 Figma 中的任何组件时也使用——即使是单个组件——因为组件需要正确的变量基础、变体状态和设计令牌绑定才能达到生产质量。此技能教你构建什么以及以什么顺序构建——它补充了教如何调用 Plugin API 的 `figma-use` 技能。两个技能应一起加载。"
disable-model-invocation: false
---

# 设计系统构建器 —— Figma MCP 技能

在 Figma 中构建与代码匹配的专业级设计系统资产。按所请求的交付物缩放工作流：一个令牌集、一个组件、一个完整库或一次有针对性的调和。在连贯、可安全重试的构建阶段中运行所选路径，并进行基于证据的验证。

**前置条件**：每次 `use_figma` 调用都必须同时加载 `figma-use` 技能。它提供 Plugin API 语法规则（返回模式、页面重置、ID 返回、字体加载、颜色范围）。此技能提供设计系统领域知识和工作流编排。

**在作为此技能一部分调用 `use_figma` 时，务必在逗号分隔的 `skillNames` 参数中包含 `figma-generate-library`。如果本技能是通过 MCP 资源加载的，你必须在名称前加上 `resource:` 前缀（例如 `resource:figma-generate-library`）。** 这是一个日志参数——它不影响执行。

---

## 1. 范围与完成契约

在首次改动之前，从用户请求中选择一个主要范围，并记录其包含的交付物和验收检查。不要悄悄地把更窄的请求提升为完整库项目。

| 请求的范围 | 必需工作 | 除非请求或必要，否则排除 |
|---|---|---|
| **仅令牌 / 基础** | 请求的变量、模式、作用域、代码语法、样式，以及任何请求的标本页 | 组件、组件页面、Code Connect、完整库导航 |
| **单个组件或组件族** | 检查并复用兼容的基础；只创建组件所需的缺失令牌；构建请求的变体/属性/绑定；验证组件 | 无关基础、其他组件、完整文件骨架、广泛文档或审计 |
| **完整库 / 设计系统** | 发现、基础、文件结构、请求的组件清单、文档、集成和最终 QA | 约定 v1 清单之外的工作 |
| **调和 / 更新** | 对比代码与 Figma，然后只更新受影响的令牌、样式、组件、文档和依赖项 | 重建有效资产或扩展库 |

按比例沟通：在改动前发布一份简洁的范围与验收检查清单，在有意义的边界处给出更新，并以一份关于创建或更改对象、验证证据和未解决限制的总结结束。不要重复未变更的检查清单或叙述每次 API 调用。

当生成的脚本保持可安全重试时，批量相关操作。在页面上下文边界、难以恢复的改动或实际失败后的有针对性的重试处拆分；绝不要仅为创建验证检查点而拆分一个正常工作的操作。保持改动按顺序进行。使用写入返回的结构证据（ID 加上相关计数、名称和边界），仅当证据缺失或后续改动使其过时时才运行单独审计。每个连贯组合阶段做一次视觉审查，仅在有针对性的视觉修正后才截一张修正后截图；最近一张通过的截图就是最终版本。

### 完成定义

当所选范围的所有条件都为真时停止：

- 最终交付物覆盖锁定的清单，并在实质上忠实于适用的真实来源，包括请求的变体/状态覆盖、所需资产和范围内的审查示例。
- 对于组件任务，把主组件和构建资产保持在最终审查画框之外，并在一张紧凑画框中以实例展示请求的状态。停止前，以正常比例检查该画框，并修复被裁剪、截断、低对比度、空白、错位或脱离的内容。
- 验证所需的变量作用域、别名、代码语法、组件属性、变体和绑定。
- 请求的产物通过适用的结构和视觉验证。确认请求的内容完全可见，除非裁剪或截断是有意的；修复缺陷并只重新检查受影响的输出。
- 当来源提供所需资产时替换占位符；移除临时实例、测试画框、捕获、废弃产物和无关的游离节点。
- 没有已知缺陷或未解决的决策妨碍约定的验收检查通过。报告范围外的限制，但不启动额外工作。

额外的文档、组件、Code Connect 映射、可访问性扫描或推测性审计属于后续工作，除非所选范围要求它们。一旦完成定义通过，就停止。

### 范围变更

如果用户更改交付物，更新范围和验收检查清单。保留已验证的工作，只运行新适用的步骤，不要追溯添加来自未选路径的工作。

---

## 2. 范围化工作流

每个范围都从聚焦的发现开始：分析相关代码，检查目标 Figma 资产和约定，在 `search_design_system` 之前调用 `get_libraries`，并在改动前解决代码/Figma 冲突。批量独立的搜索并复用其结果。锁定请求的清单，然后只运行其下方的路径。

### 令牌 / 基础

1. 创建或更新请求的集合、模式、原始值、语义别名、作用域和代码语法。
2. 创建请求的文本和效果样式。
3. 仅在被请求时创建标本或文档页面。
4. 验证计数、模式值、别名、作用域、语法、样式以及任何请求的视觉产物；然后停止。

### 单个组件或组件族

1. 检查并复用兼容的本地或库变量、文本样式和效果样式。只创建组件所需的缺失基础。对于源码定义的、库标准的或重复的组件角色，创建或复用一个共享的文本或效果样式，并应用到每个匹配的组件节点；一次性文档保持内联。
2. 构建请求的基础组件、变体、属性、绑定和依赖组件。
3. 当有专用页面契合文件约定或请求需要记录式展示时，使用专用页面；否则放在现有组件区域。
4. 验证变体数量、属性、变量绑定、代表性节点上应用的文本/效果样式 ID、结构和外观；然后停止。

### 完整库 / 设计系统

1. **发现：** 锁定令牌和组件清单并打印差距分析。
2. **基础：** 创建集合、变量、别名、作用域、代码语法和样式。
3. **文件结构：** 创建约定的封面、入门、基础、组件和工具页面以及请求的文档。
4. **组件：** 按依赖顺序构建约定的清单，包含属性、绑定、文档和验证。
5. **集成与 QA：** 完成约定组件清单的 Code Connect 映射；审计可访问性、命名和绑定；并对每个约定页面进行视觉验证。

### 调和 / 更新

1. 盘点现有资产并识别与当前代码源的精确偏差。
2. 就地更新受影响的资产，尽可能保留有效的名称、ID、绑定和库结构。
3. 验证更改的资产及其已知依赖项；然后停止。

如果某个必需的验收检查失败，在继续前修复范围内的缺陷。不要用假资产、近似排版、损坏的交互或未验证的状态来替代。

此技能所选的工作流、搜索节奏、验证规则和完成定义优先于参考文档中更广泛的说明、检查清单和示例。只加载所选路径所需的参考。

---

## 3. 关键规则

**Plugin API 基础**（来自 use_figma 技能——此处同样强制执行）：
- 用 `return` 把数据送回去（自动序列化）。不要包在 IIFE 中，也不要调用 closePlugin。
- 在每个返回值中返回所有创建/修改的节点 ID。
- 页面上下文每次调用都会重置——始终在开头 `await figma.setCurrentPageAsync(page)`。**每个脚本最多调用一次**：每个组件或文档页面都是它自己的 `use_figma` 调用。绝不要在改动脚本内循环 `figma.root.children` 并切换页面——把该工作拆分为每个目标页面一次聚焦调用（见 [figma-use → gotchas.md → 每次 `use_figma` 调用只设置一次当前页面](../figma-use/references/gotchas.md#set-current-page-once-per-use_figma-call--split-multi-page-work-across-calls)）
- `figma.notify()` 会抛出——绝不使用它
- 颜色是 0–1 范围，不是 0–255
- 在任何文本写入之前必须加载字体：`await figma.loadFontAsync({family, style})`。用 `await figma.listAvailableFontsAsync()` 发现可用字体并验证确切的样式字符串——如果加载失败，查询可用字体以找到正确名称或后备字体。

**设计系统规则**：
1. **基础先于依赖组件**——复用兼容的现有变量和样式。在构建依赖它们的组件之前创建缺失的基础；不要重建有效的基础。
2. **创建前先检查**——运行只读 `use_figma` 以发现现有约定。匹配它们。
3. **匹配文件的组件组织**——完整库通常每个组件一个页面；紧密相关的组件族可以共用一个页面。单组件任务可以使用现有的组件区域，而不是创建库骨架。
4. **把视觉属性绑定到变量** *（默认）*——填充、描边、内边距、圆角、间隙。例外：有意固定的几何（图标的像素网格尺寸、静态分隔线）。当使用来自较早 `use_figma` 调用的变量时，使用该调用返回的真实 Figma 变量 ID 在绑定前解析出新的句柄；JavaScript 引用不会跨调用持久存在。
   使用 Plugin API 时，在绑定前用 `await figma.variables.getVariableByIdAsync(id)` 解析变量。
5. **每个变量都要有作用域**——绝不保留为 `ALL_SCOPES`。背景：`FRAME_FILL, SHAPE_FILL`。文本：`TEXT_FILL`。边框：`STROKE_COLOR`。间距：`GAP`。圆角：`CORNER_RADIUS`。原始值：`[]`（隐藏）。
6. **每个变量都要有代码语法**——WEB 语法必须使用 `var()` 包裹：`var(--color-bg-primary)`，而不是 `--color-bg-primary`。使用代码库中实际的 CSS 变量名。ANDROID/iOS 不使用包裹。
7. **把语义别名到原始值**——`{ type: 'VARIABLE_ALIAS', id: primitiveVar.id }`。绝不要在语义层复制原始值。
8. **在 combineAsVariants 之后为变体布局**——它们会堆叠在 (0,0)。手动进行网格布局 + 调整大小。
9. **图标使用 INSTANCE_SWAP**——绝不要为每个图标创建一个变体。限制变体矩阵：如果 Size × Style × State > 30 种组合，拆分为子组件。
10. **确定性命名**——使用一致、唯一的节点名称以实现幂等清理和可恢复性。通过返回值和状态台账跟踪创建的节点 ID。
11. **不进行破坏性清理**——清理脚本按名称约定或返回的 ID 识别节点，而不是靠猜测。
12. **继续前从证据验证**——绝不要在未验证的工作上构建。依赖写入返回的结构证据（ID 加上相关计数、名称和边界）；仅在建立验收检查所需或相关改动使先前证据失效时，每个连贯阶段运行一次批量结构审计。每个连贯组合阶段做一次视觉审查，仅在有针对性的视觉修正后才截一张修正后截图。
13. **绝不要并行化 `use_figma` 调用**——Figma 状态改动必须严格按顺序。即使你的工具支持并行调用，也绝不要同时运行两个 use_figma 调用。
14. **绝不幻觉 Node ID**——始终从先前调用返回的状态台账读取 ID。绝不凭记忆重建或猜测 ID。
15. **使用辅助脚本**——把 `scripts/` 中的脚本嵌入你的 use_figma 调用。不要从零编写 200 行的内联脚本。

---

## 4. 状态管理（长工作流所需）

> 不要把工作流状态存储在 Figma 对象上。使用确定性名称进行发现，并在状态台账中使用确切的返回 ID。把人类可读的组件用途和使用指导放在组件或组件集的 `description` 中。

| 实体类型 | 稳定身份 | 如何检查存在性 |
|-------------|----------------|----------------------|
| 页面和画框 | 确定性名称 + 状态台账 ID | `figma.root.children.find(p => p.name === pageName)` 或 `await figma.getNodeByIdAsync(id)` |
| 组件和组件集 | 变体/集名称 + 状态台账 ID | `page.findOne(n => n.name === name)` 或 `await figma.getNodeByIdAsync(id)` |
| 变量 | 集合内的名称 | `(await figma.variables.getLocalVariablesAsync()).find(v => v.name === name && v.variableCollectionId === collId)` |
| 样式 | 名称 | `getLocalTextStyles().find(s => s.name === name)` |

在创建后立即把每个返回的 ID 记录到状态台账中。绝不要用模糊查找来授权删除。

**状态持久化**：不要仅依赖对话上下文来保存状态台账。把它写到磁盘：
```
/tmp/design-system-state-{RUN_ID}.json
```
在每个回合开始时重新读取此文件。在长工作流中，对话上下文会被截断——文件是事实来源。

维护一个状态台账，跟踪：
```json
{
  "runId": "ds-build-2024-001",
  "scope": "single-component",
  "step": "component-button",
  "entities": {
    "collections": { "primitives": "id:...", "color": "id:..." },
    "variables": { "color/bg/primary": "id:...", "spacing/sm": "id:..." },
    "pages": { "Cover": "id:...", "Button": "id:..." },
    "components": { "Button": "id:..." }
  },
  "pendingValidations": ["Button:screenshot"],
  "completedSteps": ["discovery", "foundations/verified", "component-button/base"]
}
```

**创建前做幂等检查**：按名称 + 状态台账 ID 查询。如果存在，跳过或更新——绝不重复。

**恢复协议**：在会话开始时或上下文截断后，运行只读 `use_figma` 按名称扫描所有页面、组件、变量和样式，以重建 `{key → id}` 映射。然后在可用时从磁盘重新读取状态文件。

**继续提示词**（在新聊天中恢复时给用户）：
> "I'm continuing a design system build. Run ID: {RUN_ID}. Load the figma-generate-library skill and resume from the last completed step."

---

## 5. 库发现与 search_design_system —— 复用决策矩阵

在范围化发现阶段搜索并复用结果。仅在某个组件不在原始清单中、可用库发生变化，或先前结果未能解析它时，才在为该组件构建前再次搜索。

在为目标文件调用 `search_design_system` 之前，你必须先为该文件调用 `get_libraries`。你不得假定库已添加或可用。

`get_libraries` 返回空并不免除跳过搜索——它只意味着你没有可用于限定范围的库 key。`get_libraries` 是分页的（社区 UI 套件只出现在第一页，组织库每 20 个一批分页），所以空列表不是没有库的证明。如何依据结果行事：

- **返回了库**——用 `includeLibraryKeys` 限定运行 `search_design_system`。`libraries_available_to_add` 中的库默认不被搜索；传入它们的 `libraryKey` 以访问它们。
- **没有返回库**——仍运行 `search_design_system`，但省略 `includeLibraryKeys`。省略它会把搜索范围限定在文件本身，这正是当发现没有可限定内容时你想要的。

只有当搜索本身返回空时，你才可以在差距分析中记录“没有可用的设计系统资产”并从代码令牌构建。绝不要从失败或未尝试的 `get_libraries` 调用推断“没有库”。

```
// Discover all libraries accessible to the file
get_libraries({ fileKey })
// Returns:
//   libraries_added_to_file: [{ name, libraryKey, description, source }, ...]
//   libraries_available_to_add: [{ name, libraryKey, description, source }, ...]
//   libraries_available_to_add_next_offset: number | null
```

使用返回的 `libraryKey` 值通过 `includeLibraryKeys` 把搜索限定到特定库。这在许多库可用时避免嘈杂的结果。

如果 `libraries_available_to_add_next_offset` 非 null，还有更多组织库可用——用 `offset` 设为该值再次调用 `get_libraries`。组织库每 20 个一批分页；社区 UI 套件只出现在第一页。

```
// Search across all libraries (default)
search_design_system({
  queries: [
    { entity: "component", query },
    { entity: "variable", query },
    { entity: "style", query }
  ],
  fileKey
})

// Search within a specific library only
search_design_system({ queries: [{ entity: "component", query }], fileKey, includeLibraryKeys: ["lk-abc123..."] })
```

**复用**当以下全部为真时：
- 组件属性 API 符合你的需求（相同的变体轴、兼容的类型）
- 令牌绑定模型兼容（使用相同或可别名的变量）
- 命名约定匹配目标文件
- 组件可编辑（未被锁定在你没有的远程库中）

**重建**当以下任一为真时：
- API 不兼容（属性名称不同、变体模型错误）
- 令牌模型不兼容（硬编码值、变量 schema 不同）
- 所有权问题（无法修改该库）

**包裹**当视觉匹配但 API 不兼容时：
- 把库组件作为嵌套实例导入到新的包裹组件内
- 在包裹上暴露干净的 API

**优先级顺序**：本地现有 → 已订阅库导入 → 来自 `libraries_available_to_add` 的未订阅 UI Kit 库（尤其是图标）→ 创建新的。

---

## 6. 决策分叉

当路径分叉时询问用户——当存在两个或更多合理答案，且从代码库、Figma 文件或锁定的计划中都无法得出明确优胜者时。不要悄悄默认。呈现每个选项及其权衡和你的建议；仅在用户引导后才选择。

**何时不要询问：** 如果从真实来源（代码、Figma 文件、约定计划）看恰好只有一条路径明显正确，就采用它。本节针对真正的含糊，而不是把每个决定都外包出去。

| 分叉情况 | 要呈现什么 | 示例询问 |
|---|---|---|
| 某个令牌、组件或值上代码 ≠ Figma | 两个版本并排，带出处（文件/行 vs 节点） | "Code says `--color-bg-primary = #FFFFFF`, Figma has `color/bg/primary = #FAFAFA`. Which wins?" |
| 已订阅库有接近但不完全匹配的组件 | 库组件摘要 + 差距列表 | "Library has `Button` with no `loading` state. Reuse + wrap locally, or rebuild from scratch?" |
| 计划锁定（0d）时的范围含糊 | 什么是明确的、什么是明确排除的、什么含糊 | "Spec lists `Button` and `Input`; `Field` is referenced but not defined. In or out of v1?" |

**如果用户拒绝了你已经在其上构建的选项：** 在继续前修正。绝不要在已被拒绝的工作上构建。

---

## 7. 命名约定

匹配现有文件约定。如果从头开始：

**变量**（斜杠分隔）：
```
color/bg/primary     color/text/secondary    color/border/default
spacing/xs  spacing/sm  spacing/md  spacing/lg  spacing/xl  spacing/2xl
radius/none  radius/sm  radius/md  radius/lg  radius/full
typography/body/font-size    typography/heading/line-height
```

**原始值**：`blue/50` → `blue/900`，`gray/50` → `gray/900`

**组件名称**：`Button`、`Input`、`Card`、`Avatar`、`Badge`、`Checkbox`、`Toggle`

**变体名称**：`Property=Value, Property=Value`——例如 `Size=Medium, Style=Primary, State=Default`

**页面分隔符**：`---`（最常见）或 `——— COMPONENTS ———`

> 完整命名参考：[naming-conventions.md](references/naming-conventions.md)

---

## 8. 令牌架构

| 复杂度 | 模式 |
|-----------|---------|
| < 50 个令牌 | 单一集合，2 个模式（Light/Dark） |
| 50–200 个令牌 | **标准**：原始值（1 模式）+ 颜色语义（Light/Dark）+ 间距（1 模式）+ 排版（1 模式） |
| 200+ 个令牌 | **高级**：多个语义集合，4–8 个模式（Light/Dark × Contrast × Brand）。见 [token-creation.md](references/token-creation.md) 中的 M3 模式 |

标准模式（推荐的起点）：
```
Collection: "Primitives"    modes: ["Value"]
  blue/500 = #3B82F6, gray/900 = #111827, ...

Collection: "Color"         modes: ["Light", "Dark"]
  color/bg/primary → Light: alias Primitives/white, Dark: alias Primitives/gray-900
  color/text/primary → Light: alias Primitives/gray-900, Dark: alias Primitives/white

Collection: "Spacing"       modes: ["Value"]
  spacing/xs = 4, spacing/sm = 8, spacing/md = 16, ...
```

---

## 9. 反模式

**发现与范围：**
- ❌ 忽略现有约定或跳过相关的代码、文件和库发现
- ❌ 把窄请求扩展为无关的基础、文档或完整库

**基础：**
- ❌ 使用 `ALL_SCOPES`、在语义层复制原始值，或省略代码语法
- ❌ 在基础存在之前创建依赖组件

**组件：**
- ❌ 在存在兼容变量时硬编码组件的填充、描边、间距或圆角
- ❌ 为每个图标创建变体，而不是使用 INSTANCE_SWAP
- ❌ 在 `combineAsVariants` 之后让变体堆叠在 (0,0)
- ❌ 构建大于 30 的变体矩阵而不拆分
- ❌ 导入远程组件后立即分离它们

**执行与恢复：**
- ❌ 在 `safeToRetryWithoutCanvasRead` 为 `false` 时未读取画布就重试
- ❌ 使用名称前缀匹配进行清理（会删除用户拥有的节点）
- ❌ 在上一步未验证的工作上构建
- ❌ 并行化 use_figma 调用（始终按顺序）
- ❌ 凭记忆猜测/幻觉节点 ID（始终从状态台账读取）
- ❌ 编写大量内联脚本，而不是使用提供的辅助脚本

---

## 10. 参考文档

按需阅读参考；不要从文件名推断其内容。

| 文档 | 何时加载 |
|-----|-----------|
| [discovery-phase.md](references/discovery-phase.md) | 在改动前分析相关代码和 Figma 资产 |
| [token-creation.md](references/token-creation.md) | 创建变量、集合、模式或样式 |
| [documentation-creation.md](references/documentation-creation.md) | 所选范围包含封面或基础文档 |
| [component-creation.md](references/component-creation.md) | 创建组件或变体 |
| [code-connect-setup.md](references/code-connect-setup.md) | 所选范围包含 Code Connect 或变量代码语法 |
| [naming-conventions.md](references/naming-conventions.md) | 命名变量、页面、变体或样式 |
| [error-recovery.md](references/error-recovery.md) | 脚本失败或需要清理废弃的工作流状态 |

---

## 11. 脚本

可复用的 Plugin API 辅助函数。嵌入 `use_figma` 调用：

| 脚本 | 用途 |
|--------|---------|
| [inspectFileStructure.js](scripts/inspectFileStructure.js) | 发现所有页面、组件、变量、样式；返回完整清单 |
| [createVariableCollection.js](scripts/createVariableCollection.js) | 创建带模式的命名集合；返回 `{collectionId, modeIds}` |
| [createSemanticTokens.js](scripts/createSemanticTokens.js) | 从令牌映射创建别名语义变量 |
| [createComponentWithVariants.js](scripts/createComponentWithVariants.js) | 从变体矩阵构建组件集；处理网格布局 |
| [bindVariablesToComponent.js](scripts/bindVariablesToComponent.js) | 把设计令牌绑定到所有组件视觉属性 |
| [createDocumentationPage.js](scripts/createDocumentationPage.js) | 创建带标题 + 描述 + 分节结构的页面 |
| [validateCreation.js](scripts/validateCreation.js) | 验证创建的节点匹配预期计数、名称、结构 |
| [cleanupOrphans.js](scripts/cleanupOrphans.js) | 仅移除从状态台账提供的精确节点、变量和集合 ID |
