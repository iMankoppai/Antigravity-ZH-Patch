---
name: figma-spec
description: "此技能用于创建、读取、编辑、审阅或评论 Figma 规格（spec）。当你处理 PRD、简报、RFC 或任何类型的文档——无论是在独立的 Figma 规格中，还是嵌入在 Figma Design 或 FigJam 文件中的 Figma 规格时，都必须阅读它。"
disable-model-invocation: false
---

# 使用 Figma 规格

在使用任何 `figma.spec.*` API 之前，你必须始终调用 `whoami`，并确认目标文件的计划（或新文件的目标计划）具有 `specs_enabled: true`。`whoami` 不会标识哪个计划拥有某个文件。如果计划不明确，你必须询问用户；绝不要从文件 key 或另一个计划的访问权限去推断。如果该计划的 `specs_enabled` 为 false 或缺失，说明 Specs 不可用并停止工作流。

原生 Figma 规格是位于 `SPEC_BLOCK` 节点下的 GitHub-Flavored Markdown（GFM）。独立的 Figma 规格就是一个 spec；FigJam 或 Design 文件可以包含多个嵌入的 spec。

## 发现并选择 Figma 规格

当提供 URL 中的 `node-id` 时，用 `figma.getNodeByIdAsync` 解析它，并要求 `type === "SPEC_BLOCK"` 且 `specBlockType === "DOCUMENT"`。否则，用 `findAllWithCriteria({ types: ['SPEC_BLOCK'] })` 搜索当前页面，筛选 `specBlockType === "DOCUMENT"`（需要时用 `figma.spec.getContent` 检查内容），直到找到目标。如果它不在当前页面，用 `page.loadAsync()` 一次加载一个其他页面并重复查询，一旦解析到目标就停止。

把解析出的根 ID 传给每个内容调用。仅当已知文件恰好包含一个 Figma 规格时才省略 `specNodeId`；否则省略会抛出错误。绝不要退而编辑普通的画布文本节点。

## 在画布上创建 Figma 规格

```js
// Creates an embedded Figma spec on a Design or FigJam canvas (not a standalone Figma spec file).
const { specNodeId } = await figma.spec.createOnCanvasAsync({
  title: 'Untitled spec',
  content: '# Title\n\nA paragraph.\n',
})

const specNode = await figma.getNodeByIdAsync(specNodeId)
if (!specNode) throw new Error('The created Figma spec could not be resolved')

const after = await figma.spec.getContent({ specNodeId })
if (!after.markdown.includes('A paragraph.')) {
  throw new Error('The new Figma spec content was not applied')
}
```

务必传入非空的 `title` 和一个 `content` 字符串（允许 `''`）。`title` 为根节点命名；在 `content` 中包含任何想要的 `# H1`。

## 内容方法

```js
// READ — returns specNodeId, markdown, title, etc.
// The body is `markdown`, not `content`.
const before = await figma.spec.getContent({ specNodeId: chosenSpec.id })
const page = await figma.spec.getContent({
  specNodeId: before.specNodeId,
  offset: 100,
  maxLines: 50,
})

// REPLACE — clears + recreates the document; use only for an empty first draft.
await figma.spec.setContent({
  specNodeId: before.specNodeId,
  content: '# Title\n\nA paragraph.\n',
})

// EDIT — find/replace; each oldText must match exactly once.
await figma.spec.editContent({
  specNodeId: before.specNodeId,
  edits: [{ oldText: 'First paragraph.', newText: 'Edited first paragraph.' }],
})

const after = await figma.spec.getContent({ specNodeId: before.specNodeId })
if (!after.markdown.includes('Edited first paragraph.')) {
  throw new Error('The targeted Figma spec edit was not applied')
}
```

- 在编辑前以及验证写入时，用相同的 `specNodeId` 使用 **`getContent`**；不要依赖截图。
- 默认使用多人协作安全、精准的 **`editContent`**。
- 仅对空的初稿或明确的整文档替换使用破坏性的 **`setContent`**。

## 关键规则

1. **`editContent` 要求恰好匹配一次。** 零个或多个 `oldText` 匹配都会失败且不做更改。添加上下文使其唯一。
2. **把 Markdown 作为普通字符串传入。** 绝不要用 `Buffer`/base64 编码它，或用 `atob()` 解码它。Base64 仅用于 Markdown 内的图片 data URL。
3. **让 Markdown 与遍历分离。** `figma.spec.*` 处理内容；节点遍历仅暴露文档根和嵌入画布分支。
4. **保留注释标记。** 保持同一文本周围重叠的 `[comment:<uuid>]…[/comment:<uuid>]` 对不变，否则线程可能脱离或消失。拿不准时，原样复制被标记的片段，并在其周围编辑。
5. **使用可移植引用。** 共享的 Figma 规格必须使用链接（如 GitHub 永久链接），绝不用机器本地路径或 `localhost` URL。

## 样式

- 保持标题块在最前并格式化为 H1，即使其文本为空。绝不要移除它或在它之前插入块。
- 表格标题行优先使用粗体。
- 下划线使用 `<ins>`，包括组合格式：`<ins>**bold and underlined**</ins>`。不要使用 `<u>`，它只在 HTML 导入中有效。

## 图片

图片在 `setContent` 或 `editContent` 内使用 GFM 图片语法：

- `![alt](data:image/png;base64,...)` 嵌入会被解码并上传的字节。
- `![alt](https://host/img.png)` 在服务端获取；不允许的主机会被拒绝。

`getContent` 以 `https://<host>/spec/<fileKey>/image/<sha>?w=<width>&h=<height>` 形式输出图片 URL。

## 评论

使用 `figma.spec.comments.*` 进行锚定线程。当你不确定某处改动时，优先用评论而不是留下静默编辑。

```js
const comment = await figma.spec.comments.create({
  specNodeId: before.specNodeId,
  anchorText: 'the exact rendered text to anchor to', // MUST appear exactly once
  contextText: 'a longer unique substring containing anchorText', // optional; disambiguates repeats
  message: 'Comment body (markdown).',
})

const { root, replies, hasMore } = await figma.spec.comments.getThread({ uuid: comment.uuid })
await figma.spec.comments.reply({ uuid: comment.uuid, message: 'A reply.' })
```

- `anchorText` 在渲染后的 Figma 规格中必须恰好匹配一次。使用包含它的更长 `contextText` 来区分重复文本。
- `getThread` 和 `reply` 需要由 `[comment:<uuid>]` 标记暴露的根评论 UUID；绝不要向 `reply` 传入回复 UUID。
