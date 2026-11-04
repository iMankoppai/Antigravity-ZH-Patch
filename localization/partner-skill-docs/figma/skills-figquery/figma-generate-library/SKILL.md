---
name: figma-generate-library
description: "从代码库在 Figma 中构建或更新专业级设计系统。当用户想要创建变量/令牌、构建组件库、创建具有正确变体集和变量绑定的单个组件、设置主题（浅色/深色模式）、记录基础，或调和代码与 Figma 之间的差距时使用。当用户要求创建或生成 Figma 中的任何组件时也使用——即使是单个组件——因为组件需要正确的变量基础、变体状态和设计令牌绑定才能达到生产质量。此技能教你构建什么以及以什么顺序构建——它补充了教如何调用 Plugin API 的 `figma-use` 技能。两个技能应一起加载。"
disable-model-invocation: false
---

# 设计系统构建器 —— Figma MCP 技能

在 Figma 中构建与代码匹配的专业级设计系统。此技能编排跨 20–100+ 次 `use_figma` 调用的多阶段工作流，强制执行来自真实世界设计系统（Material 3、Polaris、Figma UI3、Simple DS）的质量模式。

**前置条件**：每次 `use_figma` 调用都必须同时加载 `figma-use` 技能。它提供 Plugin API 语法规则（返回模式、页面重置、ID 返回、字体加载、颜色范围）。此技能提供设计系统领域知识和工作流编排。

**在作为此技能一部分调用 `use_figma` 时，务必在逗号分隔的 `skillNames` 参数中包含 `figma-generate-library`。如果本技能是通过 MCP 资源加载的，你必须在名称前加上 `resource:` 前缀（例如 `resource:figma-generate-library`）。** 这是一个日志参数——它不影响执行。

---

## 1. 最重要的一条规则

对每个阶段，遵循此沟通契约。

开始阶段之前：
- 发布一份面向用户的检查清单，标题为 `Phase N Checklist`。
- 包含该阶段将尝试的每个任务/子任务。
- 包含阶段的退出标准。
- 在此检查清单发布之前，不要开始该阶段的改动工作。

执行期间：
- 在每个主要小节之前，发布一条简短更新，指明正在处理的确切小节，使用此格式：
  `Working on Phase N.X: <section name>`
- 保持更新简洁，但让当前工作可见。
- 当某个小节完成时，如果界面支持检查清单/状态更新，就在运行中的检查清单中将其标记为已完成；否则在下次进度更新中提及完成。

每个阶段结束时：
- 发布一个 `Phase N Summary`，包含：
  - 已完成的任务
  - 创建或更改的 Figma 对象
  - 执行的验证
  - 已解决的决策或冲突
  - 剩余风险或后续事项
- 然后展示该阶段所需的阶段产物并自动继续。

### 稳定任务 ID

在所有地方使用一种任务 ID 格式：`P{phase}.{step}`。

规则：
- 仅使用带字母的步骤 ID：`P0.a`、`P0.b`、`P1.a`、`P3.d`。
- 不要对任务列表使用普通项目符号。
- 每个阶段检查清单、进度更新、验证说明和阶段总结都必须引用相同的任务 ID。

**没有设置例外：** 创建新的 Figma 文件、导入库、创建页面、变量、集合、样式或组件都算创建/改动。不要把其中任何一个当作无害的设置。

**这绝不是一个一次性任务。** 构建设计系统需要跨多个阶段的 20–100+ 次 `use_figma` 调用，其间有强制的进度。任何试图在一次调用中创建所有内容的尝试都会产生损坏、不完整或无法恢复的结果。把每个操作分解到最小的有用单元，验证、获取反馈、继续。

---

## 2. 强制工作流

按顺序完成各阶段。在当前阶段所需的操作和验收检查完成之前，不要进入下一阶段。如果某个阶段无法通过，停止并报告阻碍。除非用户明确批准该限制，否则不要近似、跳过或推迟失败的阶段。不要尽力替代。不要静默近似。不要在缺少源真实信息、缺少视觉真实信息、假资产、近似排版、损坏的交互或未验证状态的情况下交付。

### 阶段 0：发现（始终第一——尚无 `use_figma` 写入）

- [ ] 0a. 分析代码库 → 提取令牌、组件、命名约定
- [ ] 0b. 检查 Figma 文件 → 页面、变量、组件、样式、现有约定
- [ ] 0c. 发现并搜索库 → 在 `search_design_system` 之前为目标文件调用 `get_libraries`
- [ ] 0d. 锁定 v1 范围 → 在任何创建之前记录确切的令牌集 + 组件列表
- [ ] 0e. 映射代码 → Figma → 解决并记录每个冲突（代码与 Figma 不一致）
- [ ] 0f. 在聊天中打印**差距分析**：代码中有但 Figma 中没有的、Figma 中有但代码中没有的，以及来自 0e 的每个冲突及其解决方案

### 阶段 1：基础（令牌优先——始终在组件之前）

- [ ] 1a. 创建变量集合和模式
- [ ] 1b. 创建原始变量（原始值，1 个模式）
- [ ] 1c. 创建语义变量（别名为原始值，模式感知）
- [ ] 1d. 在**所有**变量上设置作用域（绝不 `ALL_SCOPES`）
- [ ] 1e. 在**所有**变量上设置代码语法
- [ ] 1f. 创建效果样式（阴影）和文本样式（排版）
- [ ] 1g. 在聊天中打印**变量摘要**：N 个集合、M 个变量、K 个模式，按集合细分
- [ ] 1h. 在聊天中打印**样式列表**：创建的每个效果样式和文本样式，带名称
- [ ] 退出标准已满足：约定计划中的每个令牌都存在，所有作用域已设置，所有代码语法已设置

### 阶段 2：文件结构（在组件之前）

- [ ] 2a. 创建页面骨架：Cover → Getting Started → Foundations → --- → Components → --- → Utilities
- [ ] 2b. 创建基础文档页面（色板、字体标本、间距条）
- [ ] 2c. 捕获每个基础页面的 `get_screenshot`，并在截图旁在聊天中打印**页面列表**
- [ ] 退出标准已满足：所有计划页面都存在，基础文档可导航

### 阶段 3：组件（一次一个——绝不批量）

对**每个**组件（按依赖顺序：原子先于分子），运行下面的检查清单。在开始下一个组件之前完成当前组件。

- [ ] 3a. 创建专用页面
- [ ] 3b. 用自动布局 + 完整变量绑定构建基础组件
- [ ] 3c. 创建所有变体组合（`combineAsVariants` + 网格布局）
- [ ] 3d. 添加组件属性（TEXT、BOOLEAN、INSTANCE_SWAP）
- [ ] 3e. 把属性链接到子节点
- [ ] 3f. 添加页面文档（标题、描述、使用说明）
- [ ] 3g. 验证：`get_metadata`（结构）+ `get_screenshot`（视觉）
- [ ] 3h. 可选：在上下文还新鲜时进行轻量 Code Connect 映射
- [ ] 退出标准已满足：变体数量正确、所有绑定已验证、截图看起来正确

### 阶段 4：集成 + QA（最终检查）

- [ ] 4a. 完成所有 Code Connect 映射
- [ ] 4b. 可访问性审计（对比度、最小触控目标、焦点可见性）
- [ ] 4c. 命名审计（无重复、无未命名节点、大小写一致）
- [ ] 4d. 未解析绑定审计（无残留硬编码填充/描边）
- [ ] 4e. 每个页面的最终审查截图

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
1. **变量先于组件**——组件绑定到变量。没有令牌 = 没有组件。
2. **创建前先检查**——运行只读 `use_figma` 以发现现有约定。匹配它们。
3. **每个组件一页** *（默认）*——例外：紧密相关的组件族（例如 Input + 辅助件）可以共用一个页面，并有清晰的分节分隔。
4. **把视觉属性绑定到变量** *（默认）*——填充、描边、内边距、圆角、间隙。在 `$fig` 中，通过把变量句柄直接传入属性（`fills` 颜色、`cornerRadius`、`itemSpacing`、内边距）来绑定；只要某个值存在令牌，就优先绑定它而不是字面量（[实用配方](../figma-use/references/fig-builder.md#building-a-component-with-bound-variables-the-default-for-components)）。由于组件通常在与令牌基础**不同的 `use_figma` 调用**中构建，在构建调用中重新水合变量 ID（`figma.variables.getVariableByIdAsync` / `$fig.getVar`）再进行绑定——句柄不会跨调用存活，跳过这一步正是构建静默回退到字面量的原因。例外：有意固定的几何（图标的像素网格尺寸、静态分隔线）。
5. **每个变量都要有作用域**——绝不保留为 `ALL_SCOPES`。背景：`FRAME_FILL, SHAPE_FILL`。文本：`TEXT_FILL`。边框：`STROKE_COLOR`。间距：`GAP`。圆角：`CORNER_RADIUS`。原始值：`[]`（隐藏）。
6. **每个变量都要有代码语法**——WEB 语法必须使用 `var()` 包裹：`var(--color-bg-primary)`，而不是 `--color-bg-primary`。使用代码库中实际的 CSS 变量名。ANDROID/iOS 不使用包裹。
7. **把语义别名到原始值**——`{ type: 'VARIABLE_ALIAS', id: primitiveVar.id }`。绝不要在语义层复制原始值。
8. **在 combineAsVariants 之后为变体布局**——它们会堆叠在 (0,0)。手动进行网格布局 + 调整大小。
9. **图标使用 INSTANCE_SWAP**——绝不要为每个图标创建一个变体。限制变体矩阵：如果 Size × Style × State > 30 种组合，拆分为子组件。
10. **确定性命名**——使用一致、唯一的节点名称以实现幂等清理和可恢复性。通过返回值和状态台账跟踪创建的节点 ID。
11. **不进行破坏性清理**——清理脚本按名称约定或返回的 ID 识别节点，而不是靠猜测。
12. **继续前先验证**——绝不要在未验证的工作上构建。每次创建后用 `get_metadata`，每个组件后用 `get_screenshot`。
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
  "phase": "phase3",
  "step": "component-button",
  "entities": {
    "collections": { "primitives": "id:...", "color": "id:..." },
    "variables": { "color/bg/primary": "id:...", "spacing/sm": "id:..." },
    "pages": { "Cover": "id:...", "Button": "id:..." },
    "components": { "Button": "id:..." }
  },
  "pendingValidations": ["Button:screenshot"],
  "completedSteps": ["phase0", "phase1", "phase2", "component-avatar"]
}
```

**创建前做幂等检查**：按名称 + 状态台账 ID 查询。如果存在，跳过或更新——绝不重复。

**恢复协议**：在会话开始时或上下文截断后，运行只读 `use_figma` 按名称扫描所有页面、组件、变量和样式，以重建 `{key → id}` 映射。然后在可用时从磁盘重新读取状态文件。

**继续提示词**（在新聊天中恢复时给用户）：
> "I'm continuing a design system build. Run ID: {RUN_ID}. Load the figma-generate-library skill and resume from the last completed step."

---

## 5. 库发现与 search_design_system —— 复用决策矩阵

在阶段 0 先搜索，然后在每次创建组件之前再次搜索。

在为目标文件调用 `search_design_system` 之前，你必须先为该文件调用 `get_libraries`。你不得假定库已添加或可用。

`get_libraries` 返回空并不免除跳过搜索——它只意味着你没有可用于限定范围的库 key。`get_libraries` 是分页的（社区 UI 套件只出现在第一页，组织库每 20 个一批分页），所以空列表不是没有库的证明。如何依据结果行事：

- **返回了库**——用 `includeLibraryKeys` 限定运行 `search_design_system`。`libraries_available_to_add` 中的库默认不被搜索；传入它们的 `libraryKey` 以访问它们。
- **没有返回库**——仍运行 `search_design_system`，但省略 `includeLibraryKeys`。省略它会把搜索范围限定在文件本身，这正是当发现没有可限定内容时你想要的。

只有当搜索本身返回空时，你才可以在阶段 0f 差距分析中记录“没有可用的设计系统资产”并从代码令牌构建。绝不要从失败或未尝试的 `get_libraries` 调用推断“没有库”。

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

## 9. 各阶段反模式

**阶段 0 反模式：**
- ❌ 忽略现有文件约定并强加新约定
- ❌ 在规划组件创建之前跳过 `search_design_system`

**阶段 1 反模式：**
- ❌ 在任何变量上使用 `ALL_SCOPES`
- ❌ 在语义层复制原始值而不是别名
- ❌ 不设置代码语法（破坏 Dev Mode 和往返）
- ❌ 在约定令牌分类法之前创建组件令牌

**阶段 2 反模式：**
- ❌ 跳过封面页或基础文档
- ❌ 把多个不相关的组件放在一个页面上

**阶段 3 反模式：**
- ❌ 在基础存在之前创建组件
- ❌ 在组件中硬编码任何填充/描边/间距/圆角值
- ❌ 为每个图标创建一个变体（改用 INSTANCE_SWAP）
- ❌ 在 combineAsVariants 之后不定为变体（它们全都堆叠在 0,0）
- ❌ 构建大于 30 的变体矩阵而不拆分（变体爆炸）
- ❌ 导入远程组件后立即分离它们

**通用反模式：**
- ❌ 在 `safeToRetryWithoutCanvasRead` 为 `false` 时未读取画布就重试
- ❌ 使用名称前缀匹配进行清理（会删除用户拥有的节点）
- ❌ 在上一步未验证的工作上构建
- ❌ 并行化 use_figma 调用（始终按顺序）
- ❌ 凭记忆猜测/幻觉节点 ID（始终从状态台账读取）
- ❌ 编写大量内联脚本，而不是使用提供的辅助脚本
- ❌ 在阶段 0-2 未完成时因用户说"build the button"就开始阶段 3

---

## 10. 参考文档

按需加载——每个参考对其阶段是权威的：

需要时使用你的文件读取工具阅读这些文档。不要从文件名假定其内容。

| 文档 | 阶段 | 必需 / 可选 | 何时加载 |
|-----|-------|---------------------|-----------|
| [discovery-phase.md](references/discovery-phase.md) | 0 | **必需** | 开始任何构建——代码库分析 + Figma 检查 |
| [token-creation.md](references/token-creation.md) | 1 | **必需** | 创建变量、集合、模式、样式 |
| [documentation-creation.md](references/documentation-creation.md) | 2 | 必需 | 创建封面页、基础文档、色板 |
| [component-creation.md](references/component-creation.md) | 3 | **必需** | 创建任何组件或变体 |
| [code-connect-setup.md](references/code-connect-setup.md) | 3–4 | 必需 | 设置 Code Connect 或变量代码语法 |
| [naming-conventions.md](references/naming-conventions.md) | 任意 | 可选 | 命名任何东西——变量、页面、变体、样式 |
| [error-recovery.md](references/error-recovery.md) | 任意 | **出错时必需** | 脚本失败、多步工作流恢复、废弃工作流状态的清理 |

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
