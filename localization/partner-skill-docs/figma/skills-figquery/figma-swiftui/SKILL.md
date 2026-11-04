---
name: figma-swiftui
description: "SwiftUI ↔ Figma 互译。每当用户提到 Swift、SwiftUI、iOS、iPhone 或 iPad 时使用——无论哪个方向——将 Figma 设计翻译为 SwiftUI（设计 → 代码），或将 SwiftUI 视图/屏幕/令牌推送回 Figma 文件（代码 → 设计）。触发短语如“用 SwiftUI 实现这个 Figma 设计”“用 Swift 构建此屏幕”“把这个 SwiftUI 视图推送到 Figma”“在 Figma 文件中镜像我的 Swift 代码”，或当 Figma URL 与 `.swift` 文件/`.xcodeproj` 同时出现时。会路由到对应方向的参考文档；在代码 → 设计路径上与 `figma-use` 一起加载。"
disable-model-invocation: false
---

# Figma ↔ SwiftUI

Figma 设计与 SwiftUI 代码之间的双向互译。本文件是一个路由——实际指导位于下面的参考文档中。

## 选择方向

| 方向 | 触发条件 | 参考 |
|---|---|---|
| **设计 → 代码** | 用户想根据 Figma 文件/画框在其 iOS 项目中获得 SwiftUI | [references/design-to-code.md](references/design-to-code.md) |
| **代码 → 设计** | 用户想把 SwiftUI 视图/屏幕/令牌推送到 Figma 文件 | [references/code-to-design.md](references/code-to-design.md) |

如果请求含糊——同时存在 Figma URL 和 `.swift` 文件，且没有动词能表明方向——在加载参考之前先询问用户想要哪个方向。

## 共享上下文（适用于两个方向）

这些要点无论哪个方向都成立；各方向的参考文档均以其为前提。

1. **`get_design_context` 是读取 Figma 的工具。** 传入 `clientLanguages: "swift"` 和 `clientFrameworks: "swiftui"`，使响应以 Swift 的框架呈现。URL → 工具参数：`figma.com/design/:fileKey/:fileName?node-id=:nodeId` → 使用 `fileKey`，将 `nodeId` 中的 `-` 替换为 `:`。对于 `figma.com/design/:fileKey/branch/:branchKey/:fileName`，使用 `branchKey` 作为 `fileKey`。
2. **`get_design_context` 输出中的 React+Tailwind 是结构参考，而非字面来源。** 它近似视觉。绝不可将 `position: absolute`、像素画框、`mix-blend-mode` 堆叠照搬进 SwiftUI 或 Figma——两个方向都以截图为事实来源。
3. **iOS HIG 语义颜色是令牌，不是十六进制值。** `var(--backgrounds/primary, …)`、`var(--labels/secondary, …)`、`var(--separators/non-opaque, …)` 等分别映射到 SwiftUI 中的 `Color(.systemBackground)`、`Color.secondary`、`Color(.separator)`，以及 Figma 中某个语义集合里的变量。保留该映射；丢弃字面 RGBA。
4. **SF Symbols 在两个方向上都按名称往返——绝不按码点。** 设计 → 代码：`get_design_context` 会将 Figma 的 SF Symbol 字形序列替换回响应中的 `<SFSymbol>{Image(systemName: "...")}</SFSymbol>` 包裹。原样使用这些名称。代码 → 设计：在 `use_figma` 内调用 `figma.util.getSfSymbolCharacter(name)` 将符号名称转换为对应的字符——绝不手工查找码点。
5. **识别底层的 iOS 模式，而不是字面的节点/视图名称。** 相同的模式在两个方向上都反复出现：大标题 + 返回箭头 + 尾部操作 = `NavigationStack` 外壳；底部一行图标+标签对 = `TabView`；重复的等高行带首尾装饰 = `List`。匹配这些系统模式，而不是用原始组件重建它们。
6. **对于代码 → 设计，`use_figma` 就是 API。** 在任何 `use_figma` 调用之前，务必加载 [`figma-use`](../figma-use/SKILL.md)。如果任务涉及构建完整屏幕，还要加载 [`figma-generate-design`](../figma-generate-design/SKILL.md)；如果涉及构建组件或设计系统，还要加载 [`figma-generate-library`](../figma-generate-library/SKILL.md)。

## 参考

| 文档 | 何时加载 |
|---|---|
| [references/design-to-code.md](references/design-to-code.md) | 将 Figma 设计/画框翻译为 SwiftUI |
| [references/code-to-design.md](references/code-to-design.md) | 将 SwiftUI 视图/屏幕/令牌推送到 Figma |
