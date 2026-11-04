---
name: figma-code-connect
description: 创建和维护将 Figma 组件映射到代码片段的 Figma Code Connect 模板文件。当用户提到 Code Connect、Figma 组件映射、设计到代码的转换，或要求创建/更新 .figma.ts 或 .figma.js 文件时使用。
disable-model-invocation: false
---

# Code Connect

## 概述

创建把 Figma 组件映射到代码片段的 Code Connect 模板文件（`.figma.ts`）。给定一个 Figma URL，按下面的步骤创建模板。

> **你只编写 `.figma.ts` 模板文件——绝不写 `.figma.tsx`。** 此技能产出*无解析器模板*：一个 `.figma.ts` 文件，其默认导出使用 `` figma.code`...` `` 标签模板。**不要**编写 `.figma.tsx` 文件，也**不要**使用 `figma.connect()`——那是另一种**基于解析器**的 Code Connect 格式（以不同方式发布），对本技能来说是**错误的产物**；写成 `.figma.tsx` 的输出会被直接拒绝。如果某组件已存在 `.figma.tsx`，不要动它，并在它旁边添加你的 `.figma.ts` 模板。能力强的模型可能会忍不住凭记忆采用更熟悉的 `.figma.tsx` / `figma.connect()` 模式——请抵抗这种冲动；这里正确的输出**始终**是 `.figma.ts` + `figma.code`。

## 前置条件

- **必须连接 Figma MCP 服务器**——在继续之前验证 Figma MCP 工具（例如 `get_code_connect_suggestions`）可用。如果不可用，引导用户启用 Figma MCP 服务器并重启其 MCP 客户端。
- **组件必须已发布**——Code Connect 仅适用于发布到 Figma 团队库的组件。如果某组件未发布，告知用户并停止。
- **需要组织或企业（Organization 或 Enterprise）计划**——Code Connect 在免费或专业（Professional）计划上不可用。
- **URL 必须包含 `node-id`**——Figma URL 必须包含 `node-id` 查询参数。
- **TypeScript 类型**——为了让编辑器在 `.figma.ts` 文件中自动补全和类型检查，必须把 `@figma/code-connect/figma-types` 添加到 `tsconfig.json` 的 `types` 中：
  ```json
  {
    "compilerOptions": {
      "types": ["@figma/code-connect/figma-types"]
    }
  }
  ```

## 步骤 1：解析 Figma URL

从 URL 中提取 `fileKey` 和 `nodeId`：

| URL 格式 | fileKey | nodeId |
|---|---|---|
| `figma.com/design/:fileKey/:name?node-id=X-Y` | `:fileKey` | `X-Y` → `X:Y` |
| `figma.com/file/:fileKey/:name?node-id=X-Y` | `:fileKey` | `X-Y` → `X:Y` |
| `figma.com/design/:fileKey/branch/:branchKey/:name` | 使用 `:branchKey` | 来自 `node-id` 参数 |

始终把 `nodeId` 的连字符转换为冒号：`1234-5678` → `1234:5678`。

**示例演示：**

给定：`https://www.figma.com/design/QiEF6w564ggoW8ftcLvdcu/MyDesignSystem?node-id=4185-3778`
- `fileKey` = `QiEF6w564ggoW8ftcLvdcu`
- `nodeId` = `4185-3778` → `4185:3778`

## 步骤 2：发现未映射的组件

用户可能提供一个指向画框、实例或变体的 URL——不一定是组件集或独立组件。用以下参数调用 MCP 工具 `get_code_connect_suggestions`：
- `fileKey`——来自步骤 1
- `nodeId`——来自步骤 1（冒号格式）
- `excludeMappingPrompt`——`true`（返回未映射组件的轻量列表）

此工具识别所选内容中尚未有 Code Connect 映射的已发布组件。

**处理响应：**

- **“No published components found in this selection”**——该节点不包含已发布组件。告知用户需要先在 Figma 中把组件发布到团队库，然后停止。
- **“All component instances in this selection are already connected to code via Code Connect”**——一切都已映射。告知用户并停止。
- **返回组件列表的正常响应**——为每个返回的组件提取 `mainComponentNodeId`。在所有后续步骤中使用这些解析出的节点 ID（而不是 URL 中的原始 ID）。如果返回多个组件（例如用户选择了一个包含多个不同组件实例的画框），为每个组件重复步骤 3–6。

## 步骤 3：获取组件属性

用以下参数调用 MCP 工具 `get_context_for_code_connect`：
- `fileKey`——来自步骤 1
- `nodeId`——来自步骤 2 解析出的 `mainComponentNodeId`
- `clientFrameworks`——根据 `figma.config.json` 的 `parser` 字段确定（例如 `"react"` → `["react"]`）
- `clientLanguages`——根据项目文件扩展名推断（例如 TypeScript 项目 → `["typescript"]`，JavaScript → `["javascript"]`）

对于多个组件，每个节点 ID 调用一次该工具。

响应包含 Figma 组件的**属性定义**——记下每个属性的名称和类型：
- **TEXT**——文本内容（标签、标题、占位符）
- **BOOLEAN**——开关（显示/隐藏图标、禁用状态）
- **VARIANT**——枚举选项（尺寸、变体、状态）
- **INSTANCE_SWAP**——绑定到特定组件的可交换嵌套实例（图标、头像）
- **SLOT**——灵活的内容区域（自由布局、混合子节点）；在模板中使用 `getSlot()`（与 INSTANCE_SWAP 不同）

保存此属性列表——你将用它编写步骤 5 的模板。

## 步骤 4：确定代码组件

如果用户未指定要连接哪个代码组件：

1. 检查 `figma.config.json` 的 `paths` 和 `importPaths` 以找到组件所在位置
2. 在代码库中搜索与 Figma 组件名称匹配的组件。如果 `figma.config.json` 未指定路径，检查常见目录（`src/components/`、`components/`、`lib/ui/`、`app/components/`）
3. 读取候选文件，并将其 props 接口与步骤 3 的 Figma 属性进行比较——寻找匹配的变体类型、尺寸选项、布尔标志和 slot props
4. 如果有多个候选匹配，选择 prop 接口最接近的一个，并向用户解释你的理由
5. 如果未找到匹配，展示最接近的 2 个候选，请用户确认或提供正确路径

在继续步骤 5 之前**请用户确认**。呈现匹配结果：你找到了哪个代码组件、它在哪里，以及为什么匹配（prop 对应关系、命名、用途）。

读取 `figma.config.json` 了解导入路径别名——`importPaths` 部分把 glob 模式映射到导入说明符，`paths` 部分把这些说明符映射到目录。

阅读代码组件的源码以理解其 props 接口——这有助于在步骤 5 中把 Figma 属性映射到代码 props。

## 步骤 5：创建模板文件（.figma.ts）

### 文件位置

把文件放在现有 Code Connect 文件旁边。检查 `figma.config.json` 的 `include` 模式以确定正确目录。**将其命名为 `ComponentName.figma.ts`——绝不 `ComponentName.figma.tsx`。** `.figma.tsx` 扩展名是基于解析器的格式；不要创建它，也不要修改现有的。

### 模板结构

每个模板文件都遵循此结构：

```ts
// url=https://www.figma.com/file/{fileKey}/{fileName}?node-id={nodeId}
// source={path to code component from Step 4}
// component={code component name from Step 4}
import figma from 'figma'
const instance = figma.selectedInstance

// Extract properties from the Figma component (see property mapping below)
// ...

export default {
  example: figma.code`<Component ... />`,       // Required: code snippet
  imports: ['import { Component } from "..."'], // Optional: import statements
  id: 'component-name',                         // Required: unique identifier
  metadata: {                                    // Optional
    nestable: true,                              // true = inline in parent, false = show as pill
    props: {}                                    // data accessible to parent templates
  }
}
```

### 属性映射

使用步骤 3 的属性列表提取值。对于每种 Figma 属性类型，使用对应方法：

| Figma 属性类型 | 模板方法 | 何时使用 |
|---|---|---|
| TEXT | `instance.getString('Name')` | 标签、标题、占位符文本 |
| BOOLEAN | `instance.getBoolean('Name', { true: ..., false: ... })` | 切换可见性、条件 props |
| VARIANT | `instance.getEnum('Name', { 'FigmaVal': 'codeVal' })` | 尺寸、变体、状态枚举 |
| INSTANCE_SWAP | `instance.getInstanceSwap('Name')` | 固定组件槽位的交换实例（然后 `hasCodeConnect()` / `executeTemplate()`）——不要与下面的 SLOT 属性混淆 |
| SLOT | `instance.getSlot('Name')` | 仅当 Figma 属性类型为 **SLOT** 时才用于自由 slot 内容
| （子图层） | `instance.findInstance('LayerName')` | 无属性的命名子实例 |
| （文本图层） | `instance.findText('LayerName')` → `.textContent` | 来自命名图层的文本内容 |

**TEXT**——直接获取字符串值：
```ts
const label = instance.getString('Label')
```

**VARIANT**——把 Figma 枚举值映射到代码值：
```ts
const variant = instance.getEnum('Variant', {
  'Primary': 'primary',
  'Secondary': 'secondary',
})

const size = instance.getEnum('Size', {
  'Small': 'sm',
  'Medium': 'md',
  'Large': 'lg',
})
```

**BOOLEAN**——简单布尔或映射到值：
```ts
// Simple boolean
const disabled = instance.getBoolean('Disabled')

// Mapped to code values (e.g. when the code prop is an enum, not a boolean)
const size = instance.getBoolean('Show Label', { true: 'large', false: 'small' })
```

**在存在有效对应关系时把 Figma 属性映射到代码 props。** Figma 属性和代码 props 并不总是 1:1 对应——有些 Figma 属性直接映射（按名称，或通过上面的 API 方法），其他则没有代码等价物。存在映射时使用它；不合适时省略 Figma 属性，而不是发明一个代码 prop。绝不要输出名称未出现在代码组件 `Props` 接口中的属性。

### 穷尽式变体处理

当 VARIANT 属性有多个可能值时，`getEnum` 映射**必须列出 `get_context_for_code_connect` 返回的每个值**。不要遗漏值——未映射的值会静默返回 `undefined`，产生损坏的输出。

```ts
// WRONG — omits 'Warning', which will render as undefined
const status = instance.getEnum('Status', {
  'Success': 'success',
  'Error': 'error',
})

// CORRECT — every value is mapped
const status = instance.getEnum('Status', {
  'Success': 'success',
  'Error': 'error',
  'Warning': 'warning',
  'Info': 'info',
})
```

当**两个或更多 VARIANT 属性组合**产生不同代码输出时，生成穷尽的条件分支。例如，2 个变体 × 2 个值 = 4 个分支：

```ts
const type = instance.getEnum('Type', { 'Filled': 'filled', 'Outlined': 'outlined' })
const status = instance.getEnum('Status', { 'Success': 'success', 'Error': 'error' })

let colorClass
if (type === 'filled' && status === 'success') {
  colorClass = 'bg-green-500 text-white'
} else if (type === 'filled' && status === 'error') {
  colorClass = 'bg-red-500 text-white'
} else if (type === 'outlined' && status === 'success') {
  colorClass = 'bg-transparent border-green-500'
} else if (type === 'outlined' && status === 'error') {
  colorClass = 'bg-transparent border-red-500'
}
```

如果这些组合产生**重复**输出（例如 `Size` 不改变片段结构——它只是作为 prop 传递），每个变体单个 `getEnum` 映射就足够了——无需交叉组合分支。

**INSTANCE_SWAP**——访问可交换的组件实例：
```ts
const icon = instance.getInstanceSwap('Icon')
let iconCode
if (icon && icon.type === 'INSTANCE') {
  iconCode = icon.executeTemplate().example
}
```

**SLOT**——`getSlot(propName)` 仅在步骤 3 报告的 Figma 组件属性类型为 **`SLOT`** 时有效。不要对 **INSTANCE_SWAP** 属性使用 `getSlot()`（那些使用 `getInstanceSwap()`）。slot 是组件定义中明确的“内容区域”，而不是通用的嵌套实例。

- **签名：** `getSlot(propName: string): ResultSection[] | undefined`
```ts
// Figma property "Content" must be type SLOT in component properties
const content = instance.getSlot('Content')

export default {
  example: figma.code`<Card>${content}</Card>`,
  // ...
}
```

### 标签模板中的插值

在标签模板中插值时，使用正确的包裹方式：
- **字符串值**（`getString`、`getEnum`、`textContent`）：用引号包裹 → `variant="${variant}"`
- **实例/分节值**（`executeTemplate().example`）：用花括号包裹 → `icon={${iconCode}}`
- **Slot 分节**（`getSlot()` 结果——`ResultSection[] | undefined`）：直接在 `` figma.code`...` `` 内插值（与嵌套片段分节形状相同），例如 `` figma.code`<Select>${content}</Select>` ``——不要当作普通字符串处理
- **布尔裸 props**：使用条件 → `${disabled ? 'disabled' : ''}`

### 查找后代图层

当你需要访问未作为组件属性暴露的子节点时：

| 方法 | 何时使用 |
|---|---|
| `instance.getInstanceSwap('PropName')` | Figma 属性类型为 **INSTANCE_SWAP**（固定交换实例） |
| `instance.getSlot('PropName')` | Figma 属性类型为 **SLOT**（自由内容区域） |
| `instance.findInstance('LayerName')` | 你知道子图层名称（无组件属性） |
| `instance.findText('LayerName')` → `.textContent` | 你需要来自命名文本图层的文本内容 |
| `instance.findConnectedInstance('id')` | 你知道子节点的 Code Connect `id` |
| `instance.findConnectedInstances(fn)` | 你需要多个匹配过滤器的已连接子节点 |
| `instance.findLayers(fn)` | 你需要任何匹配过滤器的图层（文本 + 实例） |

### 嵌套的可配置实例

组件可能包含**未作为组件属性暴露**（无 INSTANCE_SWAP）但仍**可独立配置**的子实例——它们有自己的变体、属性或交换槽位。这些必须动态解析，而不是硬编码。

1. **检查子节点是否已有 Code Connect 模板**——使用 `get_code_connect_suggestions` 或检查项目中现有的 `.figma.ts` 文件。
2. **如果没有模板，为子节点创建一个**，使其在独立使用和嵌套时都能正确渲染。
3. **从父级引用子节点**，使用 `findInstance()` 或 `findConnectedInstance()`，然后调用 `executeTemplate()`。

```ts
// Parent template — the Badge child isn't a prop, but it's configurable
const badge = instance.findInstance('Status Badge')
let badgeCode
if (badge && badge.type === 'INSTANCE') {
  badgeCode = badge.executeTemplate().example
}

export default {
  example: figma.code`<Card>${badgeCode}</Card>`,
  // ...
}
```

这适用于图标、徽章、标签以及任何其他本身可配置的嵌套实例——始终连接它们并动态渲染，绝不硬编码其内容。

### 嵌套组件示例

对于多级嵌套组件或模板间的元数据 prop 传递，见 [advanced-patterns.md](references/advanced-patterns.md)。

```ts
const icon = instance.getInstanceSwap('Icon')
let iconSnippet
if (icon && icon.type === 'INSTANCE') {
  iconSnippet = icon.executeTemplate().example
}

export default {
  example: figma.code`<Button ${iconSnippet ? figma.code`icon={${iconSnippet}}` : ''}>${label}</Button>`,
  // ...
}
```

### 条件 props

```ts
const variant = instance.getEnum('Variant', { 'Primary': 'primary', 'Secondary': 'secondary' })
const disabled = instance.getBoolean('Disabled')

export default {
  example: figma.code`
    <Button
      variant="${variant}"
      ${disabled ? 'disabled' : ''}
    >
      ${label}
    </Button>
  `,
  // ...
}
```

## 步骤 6：验证

读回 `.figma.ts` 文件并根据以下内容审查：

- **正确的文件类型与格式（先检查这一项）**——文件是 `ComponentName.figma.ts`（不是 `.figma.tsx`），其默认导出是使用 `` figma.code`...` `` 标签模板的无解析器模板。它**不得**使用 `figma.connect()`（基于解析器的格式）。如果你写了 `.figma.tsx` 或 `figma.connect()`，丢弃它并改写为 `.figma.ts` 的 `figma.code` 模板。
- **属性覆盖**——步骤 3 的每个 Figma 属性都应在模板中有交代。标出任何缺失的，并询问用户是否有意省略。
- **有效、类型正确的代码**——所有输出的代码都必须有效，并针对代码组件的 `Props` 接口类型正确。绝不要编造组件属性——如果某个 Figma 属性没有对应的代码 prop，省略它而不是发明一个。
- **无硬编码子节点**——验证每个 INSTANCE_SWAP 属性和子组件 slot 都使用动态 API（`getInstanceSwap()`、`findInstance()`、`findConnectedInstance()` 等）配合 `executeTemplate()`。任何 slot 都不应包含硬编码的组件内容。
- **规则与陷阱**——检查下面列出的常见错误（模板结果的字符串拼接、不必要的 `hasCodeConnect()` 守卫、缺少 `type === 'INSTANCE'` 检查等）
- **插值包裹**——字符串（`getString`、`getEnum`、`textContent`）用引号包裹，实例/分节值（`executeTemplate().example`）用花括号包裹，slot 分节（`getSlot`）在 `` figma.code`...` `` 内作为片段分节插值，布尔使用条件

如果有任何不确定之处，查阅 [api.md](references/api.md) 了解 API 细节，查阅 [advanced-patterns.md](references/advanced-patterns.md) 了解复杂嵌套。

## 行内速查

### `instance.*` 方法

| 方法 | 签名 | 返回 |
|---|---|---|
| `getString` | `(propName: string)` | `string` |
| `getBoolean` | `(propName: string, mapping?: { true: any, false: any })` | `boolean \| any` |
| `getEnum` | `(propName: string, mapping: { [figmaVal]: codeVal })` | `any` |
| `getInstanceSwap` | `(propName: string)` | `InstanceHandle \| null` |
| `getSlot` | `(propName: string)` | `ResultSection[] \| undefined` |
| `getPropertyValue` | `(propName: string)` | `string \| boolean` |
| `findInstance` | `(layerName: string, opts?: SelectorOptions)` | `InstanceHandle \| ErrorHandle` |
| `findText` | `(layerName: string, opts?: SelectorOptions)` | `TextHandle \| ErrorHandle` |
| `findConnectedInstance` | `(codeConnectId: string, opts?: SelectorOptions)` | `InstanceHandle \| ErrorHandle` |
| `findConnectedInstances` | `(selector: (node) => boolean, opts?: SelectorOptions)` | `InstanceHandle[]` |
| `findLayers` | `(selector: (node) => boolean, opts?: SelectorOptions)` | `(InstanceHandle \| TextHandle)[]` |

### InstanceHandle 方法

| 方法 | 返回 |
|---|---|
| `hasCodeConnect()` | `boolean` |
| `executeTemplate()` | `{ example: ResultSection[], metadata: Metadata }` |
| `codeConnectId()` | `string \| null` |

### TextHandle 属性

| 属性 | 类型 |
|---|---|
| `.textContent` | `string` |
| `.name` | `string` |

### SelectorOptions

```ts
{ path?: string[], traverseInstances?: boolean }
```

- `traverseInstances: true`——当目标位于另一个嵌套实例内时必需。没有它，`findInstance`/`findText` 只搜索当前实例自身的图层，并在嵌套实例边界停止。
- `path: string[]`——当多个后代共享同一图层名称时用于消歧。列出必须出现在通往目标路径上的父图层名称。

**示例：**

```ts
// Layer hierarchy:
//   A > C (instance) > "mychild"
// "mychild" sits inside nested instance C, so plain findInstance returns ErrorHandle.
instance.findInstance('mychild', { traverseInstances: true })

// Layer hierarchy:
//   A > C (instance) > "mychild"
//   A > D (instance) > "mychild"
// Two "mychild" layers exist — use path to pick the one under C.
instance.findInstance('mychild', { traverseInstances: true, path: ['C'] })
```

**何时从父模板深入嵌套实例：** 仅当父代码组件（来自步骤 4）本身把嵌套图层作为 prop 值接收时（例如 `<C show={<B />} />`——A 把 B 转发进 C）。如果父级只是组合 C 而 C 在内部渲染 B，用 `executeTemplate()` 解析 C，让 C 自己的模板处理 B——不要在父级重复 B 的渲染。

### 导出结构

```ts
export default {
  example: figma.code`...`,                      // Required: ResultSection[]
  id: 'component-name',                         // Required: string
  imports: ['import { X } from "..."'],          // Optional: string[]
  metadata: { nestable: true, props: {} }        // Optional
}
```

## 规则与陷阱

1. **绝不字符串拼接模板结果。** `executeTemplate().example` 是 `ResultSection[]` 对象，不是字符串。使用 `+` 或 `.join()` 会产生 `[object Object]`。始终在标签模板内插值：`` figma.code`${snippet1}${snippet2}` ``

2. **不要使用 `hasCodeConnect()` 守卫。** 在 `type === 'INSTANCE'` 检查之后，直接对任何实例调用 `executeTemplate()`。运行时会自动处理没有 Code Connect 的实例。

   ```ts
   // WRONG — hasCodeConnect() gate drops non-CC instances
   if (icon && icon.type === 'INSTANCE' && icon.hasCodeConnect()) {
     iconCode = icon.executeTemplate().example
   }

   // CORRECT — let the runtime handle all instances
   if (icon && icon.type === 'INSTANCE') {
     iconCode = icon.executeTemplate().example
   }
   ```

3. **在调用 `executeTemplate()` 之前检查 `type === 'INSTANCE'`。** `findInstance()`、`findConnectedInstance()` 和 `findText()` 在失败时返回 `ErrorHandle`（真值，但不是真实节点）——不是 `null`。始终添加类型检查以避免崩溃：`if (child && child.type === 'INSTANCE') { ... }`

4. **当槽位存在组件属性时，优先使用 `getInstanceSwap()` 而非 `findInstance()`。** 当图标被交换为不同名称时，`findInstance('Star Icon')` 会失效；无论槽位中是哪个实例，`getInstanceSwap('Icon')` 始终有效。

5. **仅当 Figma 属性类型为 `SLOT` 时才使用 `getSlot()`。** 对于 **INSTANCE_SWAP** props，使用 `getInstanceSwap()`（返回 `InstanceHandle`）。`getSlot()` 返回结构化的 slot 分节，而不是实例——绝不要对它的返回值调用 `executeTemplate()`。

6. **属性名称区分大小写**，必须与 `get_context_for_code_connect` 返回的完全一致。

7. **正确处理多个模板数组。** 遍历子节点时，把每个结果放入单独的变量并分别插值——不要使用 `.map().join()`：
   ```ts
   // Wrong:
   items.map(n => n.executeTemplate().example).join('\n')

   // Correct — use separate variables:
   const child1 = items[0]?.executeTemplate().example
   const child2 = items[1]?.executeTemplate().example
   export default { example: figma.code`${child1}${child2}` }
   ```

7. **绝不硬编码 slot 或子节点内容。** 始终动态解析子实例——对 INSTANCE_SWAP 属性使用 `getInstanceSwap()`，对直接子节点使用 `findInstance()`/`findConnectedInstance()`——并通过 `executeTemplate()` 渲染它们。绝不根据图层名构造 JSX（例如 `<StarIcon />`）或猜测导入路径。如果实例没有 Code Connect，省略它——不要添加硬编码的后备。

   ```ts
   // WRONG — hardcodes the icon from its layer name
   example: figma.code`<Button icon={<StarIcon />}>Submit</Button>`

   // CORRECT — resolves dynamically, works for any swapped icon
   const icon = instance.findInstance('Icon')
   let iconCode
   if (icon && icon.type === 'INSTANCE') {
     iconCode = icon.executeTemplate().example
   }
   example: figma.code`<Button${iconCode ? figma.code` icon={${iconCode}}` : ''}>...</Button>`
   ```

8. **尝试通过代码 prop 表示每个 Figma 属性。** 代码组件的 `Props` 接口（来自步骤 4）是属性名称的权威列表。对于每个 Figma 属性，弄清楚用步骤 5 的 API 方法表示它的正确方式——直接名称匹配、值转换，或任何合适的方法。如果完全找不到合适的代码 prop，省略它——不要发明一个 prop 名称。

## 完整示例演示

给定 URL：`https://figma.com/design/abc123/MyFile?node-id=42-100`

**步骤 1：** 解析 URL。
- `fileKey` = `abc123`
- `nodeId` = `42-100` → `42:100`

**步骤 2：** 用 `fileKey: "abc123"`、`nodeId: "42:100"`、`excludeMappingPrompt: true` 调用 `get_code_connect_suggestions`。
响应返回一个带有 `mainComponentNodeId: "42:100"` 的组件。如果响应为空，停止并告知用户。如果返回多个组件，为每个重复步骤 3–6。

**步骤 3：** 用 `fileKey: "abc123"`、`nodeId: "42:100"`（来自步骤 2）、`clientFrameworks: ["react"]`、`clientLanguages: ["typescript"]` 调用 `get_context_for_code_connect`。

响应包含属性：
- Label (TEXT)
- Variant (VARIANT): Primary, Secondary
- Size (VARIANT): Small, Medium, Large
- Disabled (BOOLEAN)
- Has Icon (BOOLEAN)
- Icon (INSTANCE_SWAP)

**步骤 4：** 搜索代码库 → 找到 `Button` 组件。阅读其源码以确认 props：`variant`、`size`、`disabled`、`icon`、`children`。导入路径：`"primitives"`。

**步骤 5：** 创建 `src/figma/primitives/Button.figma.ts`：

```ts
// url=https://figma.com/design/abc123/MyFile?node-id=42-100
// source=src/components/Button.tsx
// component=Button
import figma from 'figma'
const instance = figma.selectedInstance

const label = instance.getString('Label')
const variant = instance.getEnum('Variant', {
  'Primary': 'primary',
  'Secondary': 'secondary',
})
const size = instance.getEnum('Size', {
  'Small': 'sm',
  'Medium': 'md',
  'Large': 'lg',
})
const disabled = instance.getBoolean('Disabled')
const hasIcon = instance.getBoolean('Has Icon')
const icon = hasIcon ? instance.getInstanceSwap('Icon') : null
let iconCode
if (icon && icon.type === 'INSTANCE') {
  iconCode = icon.executeTemplate().example
}

export default {
  example: figma.code`
    <Button
      variant="${variant}"
      size="${size}"
      ${disabled ? 'disabled' : ''}
      ${iconCode ? figma.code`icon={${iconCode}}` : ''}
    >
      ${label}
    </Button>
  `,
  imports: ['import { Button } from "primitives"'],
  id: 'button',
  metadata: { nestable: true }
}
```

**步骤 6：** 读回文件以验证语法。

## 附加参考

对于高级模式（多级嵌套组件、`findConnectedInstances` 过滤、父/子模板间的元数据 prop 传递）：

- [api.md](references/api.md) —— 完整的 Code Connect API 参考
- [advanced-patterns.md](references/advanced-patterns.md) —— 高级嵌套、元数据 props 和后代模式
