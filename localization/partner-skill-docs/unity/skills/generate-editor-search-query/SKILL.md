---
name: generate-editor-search-query
description: 生成 Unity Search 查询并打开 Search 窗口以查找资产或场景对象。用于用户要求在编辑器中（而非磁盘上）查找、筛选或列出资产、GameObject、组件或引用时。
enabled: true
modes: [agent, ask]
---

将自然语言的 Unity 编辑器搜索请求转换为有用的 Unity Search 查询，简要解释它们，并在适当时使用该查询打开 Unity Search 窗口。

## 默认行为

如果提示明确说 Unity Search、Quick Search、Search window、open Search，或要求 Unity Search 查询，则即使目标属于其他领域（如光照、UI、物理、音频或动画），也使用本技能处理该搜索请求。

对于诸如 “find”、“search”、“locate”、“list”、“filter”、“look up”、“where is”、“which assets use” 或 “what references” 具体 Unity 资产或场景对象的请求：

1. 确定该请求主要针对项目资产、场景对象，还是两者兼有。
2. 构建一个简洁的 Unity Search 查询。
3. 在回答中、打开 Search 之前或同时展示该查询。
4. 通过运行编辑器端代码段打开 Unity Search，除非用户明确只要求查询文本。
5. 如果打开 Search 失败，返回该查询并告诉用户手动将其粘贴到 Unity Search 中。

当用户说 “do not open Search”、“query only”、“what query should I use”、“just give me the query” 或类似话语时，不要打开 Search。

如果用户要求一般性解释、项目概览、文件夹结构摘要、架构讲解、玩法系统摘要或“如何做”的编程解答，则不要使用本技能，除非提示明确要求 Unity Search、Search 查询或打开 Search 窗口。

如果用户提及 “this”、“selected” 或 “current” 但没有附加的资产、场景对象、可见名称或路径，请询问名称/路径，而不要凭空编造。

## 范围

将只读的 Unity Search / Quick Search 查询限定为：

- 项目资产，如材质、纹理、预制体、场景、脚本、着色器、音频剪辑、精灵、网格、模型、动画、字体、渲染纹理和 ScriptableObject 资产
- 场景对象和组件，如 Camera、Light、Rigidbody、Collider、Renderer、Canvas 对象、UI 组件、ParticleSystem、AudioSource、Animator、Terrain 对象和具名 GameObject
- 面向路径、标签、类型、文件名、关键字和引用的资产搜索
- 当选中的或具名资产的名称/路径可从对话或附件中获得时

不要安装包、运行菜单命令、编辑资产、修改场景、搜索外部文档、搜索代码仓库文本、检查构建日志、删除结果、修复搜索结果或执行依赖图分析。如果用户要求对结果执行操作，请先打开 Search 或提供查询，然后在任何单独的修改类技能或工作流之前请求确认。

## 参考

在生成非平凡查询之前，阅读 [references/query-patterns.md](references/query-patterns.md)。

在打开 Search 窗口之前，阅读 [references/open-search-window.md](references/open-search-window.md)。

官方英文参考：

- [Unity Search](https://docs.unity3d.com/Manual/search-overview.html)
- [Search expressions](https://docs.unity3d.com/Manual/search-expressions.html)
- [SearchService.ShowWindow](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Search.SearchService.ShowWindow.html)

## 将 C# 传给 `script eval`

`script eval` 编译的是**语句块，而不是文件**。由此产生两个后果，两者都是编译错误：

- **没有 `using` 指令。** 编译器会将 `using UnityEditor;` 读取为资源释放语句并拒绝它（`CS0210`）。
- **类型必须完全限定。** 裸的 `SearchService` 无法解析（`CS0246`），而裸的 `Object` 会与 `object` 产生歧义（`CS0104`）。

`unity-cli` 技能负责前提条件——安装 CLI、确认已连接的编辑器、添加项目的 `com.unity.pipeline` 包，以及发现命令目录。你特别需要 `script eval`；如果它不存在，生成查询文本并说明无法打开窗口。

## 查询生成规则

使用最简单且可能产生所请求结果的查询。

- 对资产和组件请求优先使用类型过滤器，例如 `t:material`、`t:texture`、`t:prefab`、`t:scene`、`t:script`、`t:shader`、`t:Light` 或 `t:Rigidbody`。
- 除非需要引号，否则将用户提供的名称和关键字保留为普通查询词。
- 当用户给出文件夹或说 “in Assets/...” 或 “under ...” 时使用 `dir:`。
- 当用户要求 Unity 资产标签时使用 `l:`。
- 当用户询问某个资产被什么引用、使用、依赖、包含或与什么相连时使用 `ref=`。
- 仅当搜索表达式明显能改善查询时才使用，例如 `t:prefab ref={t:texture}` 或 `t:scene ref={t:prefab}`。
- 对于选中/当前的措辞，仅当已知的选中资产名称或路径出现在聊天上下文中时才使用；否则询问。
- 对于诸如 “where is Rigidbody used” 的宽泛关系请求，先使用简单的关键字或组件查询，然后如果用户需要详尽的代码/属性分析，提及脚本化审计是另一回事。
- 对于将搜索与修复工作混合的请求，先生成并打开查询；除非用户明确确认单独的后续操作，否则不要修改结果。
- 不要为不确定的请求编造不受支持的过滤器。如果某个请求无法用 Unity Search 语法可靠表达，请打开最接近的安全查询并说明局限性。

## 打开 Unity Search

仅在编辑器中运行 C# 以打开 Search 窗口。这是一个编辑器 UI 操作，不得更改项目资产或场景内容。

打开 Search 时：

1. 对查询进行 Base64 编码（UTF-8），在生成的 C# 字符串中只嵌入 base64 文本，并在代码段内部将其解码回字符串。
2. 对于此 v1 技能，优先使用资产和场景提供程序。
3. 如果某个提供程序不可用，则回退到活动提供程序。
4. 记录所打开的查询。
5. 如果命令失败，绝不要声称 Search 已打开。

## 回答格式

保持面向用户的回答简短：

```text
Query: `t:material`
Opened Unity Search with that query.
```

如果不打开 Search：

```text
Query: `t:prefab ref={t:texture}`
Paste this into Unity Search.
```

如果请求有歧义但仍可搜索，选择最可能的查询并说明该假设。只有在无法推断搜索目标时才提问，例如 “find the thing” 且没有资产、场景、类型、名称或上下文。

## 验证清单

在报告成功之前：

- 生成的查询已向用户展示
- 查询针对资产、场景对象或两者
- 仅在用户未选择退出的情况下打开了 Search
- 任何回退或不确定性都已如实说明
- 没有修改任何资产、场景、包、项目设置或搜索结果
