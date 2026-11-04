---
name: figma-implement-motion
description: 将 Figma 动作和动画翻译为可用于生产环境的应用程序代码。在实现 Figma 设计中的动画/动作时使用——用户提到“实现这个动作”“添加来自 Figma 的动画”“为这个组件做动画”、提供节点带动画的 Figma URL，或当 `get_design_context` 返回动作数据或指示你调用 `get_motion_context` 时。
disable-model-invocation: false
---

# 实现 Motion

## 概述

此技能指导把 Figma 动画和过渡翻译为可运行代码（motion.dev、CSS keyframes 或框架特定的库）。

Figma 通过两个工具暴露动作：

- `get_motion_context` —— 权威动作工具。返回完整的动画节点清单、预计算的代码片段（CSS `@keyframes` + motion.dev）、片段不可用时的后备关键帧绑定，以及递归时间线协调提示（`timelineCohorts`）。**动画数据以及哪些节点 ID 会做动画的事实来源。**
- `get_design_context` —— 设计的**结构**：布局、尺寸、素材、样式、Code Connect 提示、截图上下文，有时还有动画元素上的**动作放置标记**（`data-node-id`，在拆分节点上还有 `data-motion-keys` / `data-motion-wrapper-for` / `data-motion-transform-template`）。它可能把动画节点渲染为普通元素（`div`、`p`、`span` 等）或 motion 元素（`motion.div`）；它不会内联动画值。

**两者通过节点 id 关联，这就是整个工作流。** `get_motion_context` 告诉你哪些节点做动画，并给出关键帧值、缓动、时序和片段。`get_design_context` 告诉你那些节点长什么样、位于何处。对于 `get_motion_context.nodes` 中的每个节点，在设计上下文中找到匹配的 `data-node-id`，把动作合并到该结构中——当结构元素是普通元素时，添加或包裹一个 `motion.{tag}`。当设计上下文复用了 Figma 组件时，动作节点还可能包含 `fallbackNodeId`；仅在尝试确切的 `nodeId` 之后作为后备使用它。

## 技能边界

- 当交付物是用户代码库中的动作代码时使用此技能。
- 如果用户要求在 Figma 内部创建/编辑动画，切换到 [figma-use](../figma-use/SKILL.md) 并改遵循该技能。
- 此技能目前涵盖由 `get_motion_context` 发出的**动画**（片段加后备关键帧轨道，包括解析为这些形式的预设编写动作）。更广泛的交互式变体流可能仍需在代码中做产品特定的状态处理。

## 前置条件

- Figma MCP 服务器已连接且可访问。
- 从用户提供的 Figma URL 解析节点 ID。URL 格式：`https://figma.com/design/:fileKey/:fileName?node-id=1-2`——提取 `fileKey`（`/design/` 后的片段）和 `nodeId`（`node-id` 查询参数的值，例如 `42-15`）。
- 目标代码库。动作输出格式会适配技术栈（见[框架建议](#framework-recommendations)）。

## 工具选择

对于动作实现，使用两个工具并各司其职：

| 情况 | 工具 | 原因 |
|---|---|---|
| 理解静态结构、素材、样式、Code Connect 或视觉布局 | `get_design_context` | 提供正确放置动画节点所需的组件/页面代码参考和素材 URL。 |
| 获取任何节点的动画数据 | `get_motion_context` | 专为动作构建，是时序、缓动、片段和关键帧的事实来源。 |
| 节点带有动作标记（`data-motion-keys`、`data-motion-wrapper-for`） | 标记给出拆分的*放置*，`get_motion_context` 给出*值* | 拆分标记告诉你哪些轨道放在哪个元素上；关键帧/缓动/时序以及动画节点清单来自 `get_motion_context`。 |

当需要一次调用获取后代动作时，`get_motion_context` 接受 `recursive: true`（上限 500 个节点）。

## 必需工作流

### 步骤 1：确认静态设计上下文可用

```
get_design_context(fileKey=":fileKey", nodeId="<node-id>")
```

如果已为该节点调用过 `get_design_context`，复用其输出。如果未调用，现在正常调用。

把它作为**记录结构**——层级、尺寸、样式、素材、Code Connect 提示、截图上下文，以及它恰好包含的任何动作放置标记（步骤 3）。动画节点清单和动画值来自 `get_motion_context`（步骤 2）。

### 步骤 2：获取权威动作数据

```
get_motion_context(fileKey=":fileKey", nodeId="<node-id>", recursive=true)
```

响应结构（每个动画节点一个条目）：

- `codeSnippets` —— 预生成的 CSS `@keyframes` 和 motion.dev 字符串。**直接使用这些。** 不要从后备轨道数据重新生成它们。
- `keyframeBindings` —— 绑定的关键帧轨道，包括解析为轨道数据的预设派生动作，仅当两种片段格式都缺失时作为后备数据包含。
- `motionSummary` —— 每字段一行的动画自然语言描述。**仅在无片段时**出现（仅有键帧绑定的动作代码生成无法表示为 CSS/motion.dev）。存在时据此构建；只要有片段就忽略它。
- `fallbackNodeId` —— 用于匹配组件化设计上下文的可选后备 id。如果 `nodeId` 是实例限定的 id，如 `I4005:6111;30:8005`，D2R 可能改为用后备组件 id（如 `4002:3957`）渲染可复用组件主体。此时，如果精确 `nodeId` 查找失败，`fallbackNodeId` 就是要找的 `data-node-id`。

递归响应还包含 `timelineCohorts`——一个**顶层**数组（不是每节点），列出共享一条时间线的节点：`{ rootNodeId, durationMs, loopMode: 'once' | 'loop' | 'boomerang', memberNodeIds[] }`。对于协调的多节点动作，用 `durationMs`（÷1000 为秒）和 `loopMode` 从一个共享生命周期驱动所有 `memberNodeIds`——不要从兄弟顺序推断时序。

对 LLM 重要的实现细节：

- 片段存在时，可能省略 `motionSummary`、`timelineDurationMs` 和 `transformOrigin` 以缩小负载——片段已携带时长 + 变换原点（motion.dev `duration` / `style={{ transformOrigin }}`，或 CSS `animation` / `transform-origin`）且 cohort 携带 `durationMs`。字段缺失绝不意味着“无动画”。
- 递归响应会去重完全重复的片段。片段可能被替换为指向第一个具有相同动作的节点的注释；复用同一组件、变体、类或常量，而不是编写第二个动画。
- MCP 服务器从 `clientFrameworks` 推断 CSS 还是 motion.dev 片段；如果响应只包含一种片段格式，将该格式适配到用户的技术栈，而不是假定另一种格式失败。

### 步骤 3：合并静态和动作上下文

- 从 `get_motion_context.nodes` 开始，而不是从静态 JSX 中可见的 `motion.*` 标签开始。**每个返回的节点都做动画。** 先通过精确的 `nodeId` / `data-node-id` 把每个动作节点匹配回 `get_design_context`。当且仅当没有精确匹配时，尝试 `fallbackNodeId` / `data-node-id`。只有在两个 id 都失败后才退回节点名称/类型和截图位置。
- **精确 id 匹配优先于 `fallbackNodeId`。** `fallbackNodeId` 指向 D2R 可能在可复用组件内发出的后备组件 id。它被该组件的每个实例共享。如果精确 `nodeId` 存在于设计上下文中，就在那里应用动作并忽略后备。这对根实例动画至关重要：一个实例的旋转或移动可能不同于同一组件的另一个实例，而把该动作应用于共享组件主体会错误地对所有实例做动画。
- **把每个动作节点应用到匹配的设计上下文结构，以 `data-node-id` 为键。** 匹配的 `data-node-id` 是结构锚点，不总是接收动作的最终 DOM 元素。使用片段形状和放置标记来决定动作是放在该确切元素、包裹元素、内部元素还是内联的 SVG 路径上。`get_design_context` 可能已发出值被剥离的 `motion.{tag}`，或发出一个普通结构元素（`div`、`p`、`span`、组件根等）。如果它是普通元素且片段针对元素本身，将其转换为适当的 `motion.{tag}` 或添加动作包裹，同时保留节点的文本、子节点、类/样式、属性和 `data-node-id`。加载 [references/examples-and-anti-examples.md](references/examples-and-anti-examples.md) 查看此合并步骤的示例。
- **组件化子动作通常按后备匹配。** 当设计上下文把 Figma 实例提取为可复用 React 组件时，该组件主体内的子节点通常具有后备组件 id（`4002:3957`），而动作上下文报告的是活动实例 id（`I4005:6111;30:8005`）。此时，用 `fallbackNodeId` 找到组件主体的 `data-node-id`，但把动作范围限定在你正在实现的渲染实例上。如果存在多个实例且只有一个具有不同的根动作，精确 id 匹配会把该每实例动作分开。
- 拆分节点带有 `data-motion-keys` / `data-motion-wrapper-for` 标记——见下文_处理交错的变换_。
- **保留 `display: contents` 包裹——除非组本身做动画。** 布局透明的组包裹会以 `contents` 形式出现（Tailwind `contents`），通常伴随一个失效的 `absolute`/`inset-[…]`（这些在 `contents` 盒子上无作用）。对于*静态*组，保留 `display: contents`，让子节点相对于最近的真实祖先定位——把包裹的 `inset` 转换为定位盒子会把子节点重新父级到更小的盒子，导致它们渲染得太小/向内偏移。对于*动画*组（组节点本身有动作），`display: contents` 无法承载变换——把它替换为真实的定位包裹，并在那里应用组动作。实现此情况前加载 [references/gotchas.md](references/gotchas.md)。
- **`get_motion_context` 是完整的动画节点清单。** 一些动画节点渲染为普通（非 `motion`）元素——组件实例根（普通定位 `<div>`）、文本（`<p>`）、蒙版——它们仍带有 `data-node-id`。遍历动作响应中的每个节点，把其动作应用到具有匹配 `data-node-id` 的元素上，按需包裹或转换。如果某个动画节点在输出中完全没有元素（例如动画蒙版被压平为静态 `mask-image`），不要静默丢弃它——留下 `// TODO: <nodeId> motion unsupported` 注释并在你的总结中指出。
- 如果某个节点出现在动作上下文但不在静态 JSX 中，添加表示它所需的元素——设计上下文代码是参考，不是完整的动画清单。
- 当设计与动作上下文冲突（时序/缓动/动画值）时，优先 `get_motion_context`。
- **路径级 SVG 动作：内联 SVG 并对真实 `<path>` 做动画。** 当 `get_motion_context` 针对矢量的路径（`PATH_TRIM`、`motion.path`、`stroke-dasharray`）但设计上下文将其渲染为 `<img>` 时，内联 SVG 并把片段应用到 `<path>`，保留布局包裹。加载 [references/svg-and-path-motion.md](references/svg-and-path-motion.md) 获取此情况的完整做法（motion.path、`pathLength="1"`、包裹+路径分层、CSS path-trim）。

#### 处理交错的变换

一个节点**同时**具有静态基础变换和动画变换时，会被拆分到嵌套元素，使两者正确组合而不是相互对抗：一个无 id 的 `motion.div` 携带 `data-motion-wrapper-for="<nodeId>"`（外层包裹）包裹一个静态变换 div（例如 `rotate-45` + `hypot()` 尺寸——或包裹本身携带 `data-motion-transform-template="<css>"`），后者包裹内层节点（`data-node-id`）。保持 `wrapper > static-transform div > inner` 的嵌套——折叠它会破坏尺寸和基础变换。

- **按 `data-motion-keys` 放置轨道。** 包裹的 `data-motion-keys`（变换轨道——`x`/`y`/`rotate`/`scaleX`/`scaleY`/`skewX`）放在外层包裹上；内层元素的 `data-motion-keys` 放在内层元素上。
- **重新应用 `data-motion-transform-template`。** 如果包裹携带一个，设置 `transformTemplate={(_, generated) => "<css> " + generated}`，使动画变换组合在那个静态布局变换之上。
- **用静态基础偏移动画变换（避免双重旋转）。** `get_motion_context` 给出节点的*绝对*变换，其中已包含那些 div 应用的任何静态基础。`[45, 125, 125]` 的 `rotate` 片段在 `rotate-45` 基础上意味着包裹动画的是**偏移** `[0, 80, 80]`（= 绝对 − 45），而不是绝对值——否则 45° 会应用两次，元素在静止时位于 90°。没有静态基础的轨道（例如从 0 开始的 `x`/`y`）原样通过。见交错变换示例。
- **让布局变换与 Motion 变换分离。** 对于每个动画 `rotate`、`scale` 或 `skew` 的 `motion.*` 元素，验证它是否还依赖 Tailwind 布局变换（如 `-translate-x-1/2` 或 `-translate-y-1/2`）来居中/定位。这些工具类共享 Motion.dev 内联写入的 CSS `transform` 属性，因此 Motion 的变换可能擦除布局平移。如果两者都需要，把元素拆分为一个承载居中/定位变换的静态布局包裹和一个承载动画 rotate/scale/opacity 的内层 `motion.*` 元素，或在 Motion 本身中编码布局偏移（`x: "-50%"`）并在每个关键帧中保持它存在。

### 步骤 4：在代码中应用动作

- **片段中存在 motion.dev？** 对 React 目标原样使用 motion.dev 代码。从 `motion/react` 导入——除非代码库已使用其他动作库（Framer Motion、React Spring、GSAP），此时将片段适配到它。适配到另一技术栈或选择库时加载 [references/framework-recommendations.md](references/framework-recommendations.md)。
- **存在 CSS keyframes？** 用于原生/非 React 目标，或当代码库没有 React 动作库时。
- **没有片段（仅有键帧绑定）？** 从 `keyframeBindings` + `motionSummary` 构建等效的 motion.dev/CSS，从 cohort 的 `durationMs` / `loopMode` 获取循环时序，并从结构化字段读取 `transformOrigin` / 时长。罕见——片段通常存在，包括 SwiftUI/iOS（它们获得 CSS 格式）。

### 步骤 5：验证

- 在添加新的动作导入/约定之前，阅读组件现有的动作导入/约定。如果用户已使用 Framer Motion / React Spring / anime.js，适配而不是强行使用 motion.dev。
- 在跨许多节点批量更改之前，抽查一个动画端到端运行（重载、观察、迭代）。
- 加载 [references/gotchas.md](references/gotchas.md)，它涵盖 Figma 动作输出中见到的具体 bug 和边界情况，并在生成的代码中修正任何此类情况。

## 关键规则

这些是通用原则。具体陷阱（旋转枢轴、HOLD 语义、颜色插值等）位于分类的[参考](#references)中。当本技能文本提到某个链接参考且情况适用时，在继续前加载该文件。

1. **尊重工具输出的*值*，而不是其布局。** 保留 `codeSnippets` 中确切的时序、缓动、关键帧值和 `transformOrigin`——当片段存在时不要从 `keyframeBindings` 或结构化字段重新生成它们（重新生成会在自定义贝塞尔缓动、弹簧近似和过冲值上损失保真度）。`transformOrigin` 是**按元素**的：应用每个缩放/旋转节点自己的——包括嵌套缩放器，不只是外层包裹——否则元素从默认中心枢转，并从错误的角生长/旋转（见按元素 `transformOrigin` 示例）。但片段是一个节点的数据，不是复制粘贴模板：当许多节点共享它时，按规则 7 提取它，而不是把块粘贴 N 次。
2. **匹配用户现有的动作技术栈。** 在添加依赖前阅读组件的导入和任何同级动画。如果用户已有 Framer Motion、React Spring、anime.js、GSAP——把输出适配到他们的技术栈，而不是强行用 motion.dev。
3. **遵守 `prefers-reduced-motion`。** 添加的任何动作都必须在 `@media (prefers-reduced-motion: reduce)` 下减弱或禁用——通常跳过 `animate`（渲染初始/静止状态）或把时长削减到接近零。这是可访问性默认，不是可选加入。
4. **批量前先端到端验证一个动画。** 构建、重载并观看一个完整时间线循环——确认每个动画节点在其关键帧轨道所述的时间出现。“渲染无错误”不是“渲染正确”。批量时动作失败会叠加——一个节点上错误的缓动容易发现；同样 bug 跨二十个节点则是数小时的梳理。
5. **不要虚构动作。** 如果节点在响应中没有动作数据，保持静态。不要从设计其他地方借用缓动/时长默认值，也不要“因为组件其余部分都动画”就自动动画。
6. **不要为了让 `Read` 读一个素材而下载它。** `get_design_context` / `get_motion_context` 把素材返回为 URL（`/api/mcp/asset/...`），通常是 SVG。在消费方获取它的地方直接引用 URL（`<img src>`、CSS `background-image`、素材导入），或 `curl` 一个以内联其内容（例如内联 SVG 并在 SwiftUI 上通过 `NSImage(data:)` 渲染）。重要的例外是路径级 SVG 动作：如果动作片段针对 SVG 素材内部的路径，内联 SVG 并对真实路径做动画，而不是把它留在 `<img>` 后面。不要下载素材并把文件喂给 `Read` 工具：SVG 不是可 `Read` 的图片格式，读取会被拒绝且白费——而且一个不把 SVG 当作图片检测的文件工具可能让它让循环停滞。
7. **提取重复动作——绝不要按元素复制粘贴片段。** 许多节点通常共享*相同*动画，仅交错延迟、偏移或目标值不同。**一次**实现共享动作——一个可复用的动画组件或一个按变化值参数化的 `variants` 对象——从映射数组（`items.map(...)`）渲染，并把重复字面量（时长、缓动数组、偏移）提取到命名常量。动画的*值*保持片段原样（规则 1）；*代码*保持 DRY。同一个过渡对象粘贴 15+ 次（本应 150 行却有 800 行）是低质量结果——保真度和可维护性都会评分。

## 框架建议

规则 2 涵盖总体姿态：优先用户现有的技术栈。当没有时，默认：

- **React**：[motion.dev](https://motion.dev)（`motion` 包）。工具直接返回 motion.dev 代码——使用它。
- **原生 / 非 React web**：用 `animation` 简写的 CSS `@keyframes`，由工具直接返回。
- **SwiftUI**：原生 `.animation(...)` 修饰符，从 **CSS** 片段翻译（`get_motion_context` 不发出 SwiftUI 代码，但 SwiftUI/iOS 客户端仍获得 CSS 格式；仅在无片段时退回 `keyframeBindings` / `motionSummary` / cohort）。**只使用真实的 SwiftUI API**——没有修饰符直接接受 Figma/CSS 缓动，所以加载 [references/framework-recommendations.md](references/framework-recommendations.md#swiftui-translation)，把缓动映射到其 SwiftUI 等效项，并验证而不是发明。此路径仍在演进；不确定时与用户确认。

**对于成熟的效果类别，优先使用库而不是手写 CSS。** 玻璃/玻璃拟态、彩带、粒子系统、基于物理的交互和滚动联动动作等效果都有久经考验的库实现，在处理跨浏览器怪异、可访问性和性能方面远胜于生成的关键帧。加载 [references/framework-recommendations.md](references/framework-recommendations.md) 获取完整的按效果类别划分的库表。将这些作为建议而非强制提出——由用户决定。

## 示例

当你需要工作示例或失败模式时加载 [references/examples-and-anti-examples.md](references/examples-and-anti-examples.md)。它涵盖简单合并流、需要添加 `motion.*` 的纯文本元素、交错的静态+动画变换、SVG 路径级动作，以及针对 DOM 重建、node-id/位置漂移和缺少按元素 `transformOrigin` 的反例。

## 参考

六个深入专题，按需获取。通用前端关注点（性能、单位、可访问性机制）由上面的关键规则处理——这些参考仅聚焦 Figma 特定信号。如果本技能在内联说明中提到这些文件之一，在继续任务的该部分前加载该文件。

- [references/examples-and-anti-examples.md](references/examples-and-anti-examples.md) —— 工作示例和失败模式。在应用合并工作流、处理交错变换或检查生成的实现是否重建了 DOM、交换了节点位置或丢失 `transformOrigin` 时加载。
- [references/gotchas.md](references/gotchas.md) —— Figma 特定的动作 bug 及其修正。嵌套组上的旋转/缩放原点、HOLD 缓动语义、CUSTOM_SPRING 保留、独立轴缩放歧义、颜色插值。排查意外运行时行为时加载。**务必同时加载 [references/motion-lint-rules.md](references/motion-lint-rules.md)**——陷阱条目引用了必须向用户呈现的具体 lint 规则。
- [references/svg-and-path-motion.md](references/svg-and-path-motion.md) —— 实现针对 SVG 矢量路径的动作（内联素材、`motion.path`、`pathLength="1"`、包裹+路径分层、CSS path-trim）。当矢量的片段针对路径而非包裹变换时加载。
- [references/framework-recommendations.md](references/framework-recommendations.md) —— motion.dev、CSS keyframes、SwiftUI 默认值、按效果类别划分的库表（玻璃、彩带、粒子、物理、滚动联动）。手写效果前加载。
- [references/unsupported-and-fallbacks.md](references/unsupported-and-fallbacks.md) —— 目前无法干净导出的 Figma 动作特性（文本动画、路径动画、蒙版/布尔、变体/过渡）。包含视频/lottie 后备指导。当工具响应似乎不完整时加载。**务必同时加载 [references/motion-lint-rules.md](references/motion-lint-rules.md)**——不支持条目引用了必须向用户呈现的具体 lint 规则。
- [references/motion-lint-rules.md](references/motion-lint-rules.md) —— Lint 规则：必须向用户呈现的已知导出限制（错误和警告）。在生成动作代码时检查是否有任何活动限制适用。
