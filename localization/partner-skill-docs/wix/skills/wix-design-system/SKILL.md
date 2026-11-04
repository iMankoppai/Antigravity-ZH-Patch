---
name: wix-design-system
description: Wix Design System 组件参考。在使用 @wix/design-system 构建 UI、选择组件、检查 props 和示例，或使用组件 testkit 编写测试时使用。触发词包括 "what component"、"how do I make"、"WDS"、"show me props"、"testkit"、"driver"，或组件名称如 Button、Card、Modal、Box、Text。
metadata:
  verified: true
---

# WDS 文档导航器

**前置条件：** 必须已安装 `@wix/design-system`（`npm i @wix/design-system` 或 `yarn add @wix/design-system`）。

## 辅助脚本

本技能捆绑了 `scripts/wds.cjs`——一个 Node.js 辅助脚本，它会在 node_modules 中自动发现 `@wix/design-system`（处理 monorepo 和工作区），并提供聚焦的查询。在用户的项目目录中，使用捆绑脚本的绝对路径运行它：

```bash
# WDS is the absolute path to this skill's scripts/wds.cjs
WDS="<this-skill-dir>/scripts/wds.cjs"

node $WDS search <keyword>                 # Find components by keyword
node $WDS component <Name>                 # Get props + example list (one component)
node $WDS components <Name1> <Name2>...    # Same as `component`, but for several at once
node $WDS example <Name> "<ExampleName>"   # Get a specific example
node $WDS testkit <Name> [method]          # Get testkit imports + driver API
node $WDS icons <query>                    # Search for icons
```

## 工作流

### 第 1 步：找到合适的组件

```bash
node $WDS search table
node $WDS search form input validation
node $WDS search modal dialog popup
```

多个关键字按 OR 匹配。返回组件名称、描述和用法指南。

### 第 2 步：获取 props 和可用示例

```bash
node $WDS component Button
```

返回完整的 props 列表（类型和描述）以及所有可用示例的列表。对于较大的 prop 文件（>200 行），返回包含 prop 名称和类型的摘要。

如果你已经知道需要哪几个组件（例如在第 1 步返回简短清单之后），优先使用批量形式，以避免每个组件一次往返：

```bash
node $WDS components Button Card Table Input Text Thumbnail
```

输出是每个组件的 props 块，以 `---` 分隔。缺失的组件会记录到 stderr 并被跳过；仅当所有请求的组件都缺失时命令才失败。

### 第 3 步：获取特定示例

```bash
node $WDS example Button "Loading state"
```

返回示例描述和 JSX 代码。匹配不区分大小写并支持子串（例如 "loading" 匹配 "Loading state"）。

### 第 4 步：使用组件 testkit 编写测试

```bash
node $WDS testkit Button             # Imports + full driver API for Button
node $WDS testkit Button click       # Just the click() method details
```

返回 unidriver、vanilla、puppeteer 和 playwright 变体的导入片段，以及 driver 方法 API（名称、参数、返回类型、描述）。方法名称匹配是不区分大小写的子串匹配。

### 第 5 步：查找图标

```bash
node $WDS icons Add Edit Delete
```

图标来自 `@wix/wix-ui-icons-common`。每个图标都有一个 `Small` 变体（例如 `Add` + `AddSmall`）。

## 回退：直接文件访问

如果脚本不可用，文档位于 `node_modules/@wix/design-system/dist/docs/`：

- `components.md` —— 组件目录（约 978 行，仅用 grep）
- `components/{Name}Props.md` —— 每个组件的 props
- `components/{Name}Examples.md` —— 每个组件的示例（用 `grep ^### ` 列出章节）
- `components/{Name}Testkit.md` —— 每个组件的 testkit 导入 + driver API（用 `grep ^### ` 列出方法）
- `testkits.md` —— testkit 目录（带有生成的 testkit 文档的组件列表）
- `icons.md` —— 图标目录（约 818 行，仅用 grep）

不要完整读取这些文件。用 grep 搜索关键字，然后用 offset/limit 读取特定章节。有关确切的文档文件布局和章节形态，请参阅 [references/file-structure.md](references/file-structure.md)。

---

## 快速组件映射（设计到 WDS）

| 设计元素      | WDS 组件                     | 备注             |
| ------------------- | --------------------------------- | ----------------- |
| 矩形/容器 | `<Box>`                           | 布局包装器    |
| 文本按钮         | `<TextButton>`                    | 次要操作 |
| 带标签的输入    | `<FormField>` + `<Input>`         | 包装输入       |
| 开关              | `<ToggleSwitch>`                  | 开/关设置   |
| 模态框               | `<Modal>` + `<CustomModalLayout>` | 一起使用      |
| 网格                | `<Layout>` + `<Cell>`             | 响应式        |

## 间距（px 到 SP 转换）

当设计师指定像素时，转换为最接近的 SP 标记：

| 标记 | 经典 | Studio |
| ----- | ------- | ------ |
| `SP1` | 6px     | 4px    |
| `SP2` | 12px    | 8px    |
| `SP3` | 18px    | 12px   |
| `SP4` | 24px    | 16px   |
| `SP5` | 30px    | 20px   |
| `SP6` | 36px    | 24px   |

```tsx
<Box gap="SP2" padding="SP3">
```

仅对 `gap`、`padding`、`margin` 使用 SP 标记——不要用于宽度/高度。

## 导入

```tsx
import { Button, Card, Image } from "@wix/design-system";
import { Add, Edit, Delete } from "@wix/wix-ui-icons-common";
```

## 指南

1. 绝不要覆盖 WDS CSS 标记。只有在别无他法时，才非常清晰地向提示者说明，这是一种反模式，应不惜一切代价避免。

### 故障排查

- **组件渲染无样式**（纯 HTML 外观，缺少 WDS 间距/排版）：在根/主组件（例如 `page.tsx`、模态框入口）中一次性添加 `import "@wix/design-system/styles.global.css";`——而不是在子级/标签页/辅助文件中。
