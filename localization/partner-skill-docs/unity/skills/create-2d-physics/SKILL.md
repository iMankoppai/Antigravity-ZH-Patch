---
name: create-2d-physics
description: "在 2D Physics Core 和旧版 Rigidbody 2D 系统这两个系统中创建并修复 Unity 2D 物理。用于用户询问任何 2D 物理任务时，即使未提及任一系统。不用于 3D 物理。"
allowed-tools: WebFetch, WebSearch
metadata:
  version: 0.3.0
  support: "https://unity.com/support-services"
---

# 创建并修复 Unity 2D 物理

不要权衡 3D 物理选项。如果有证据表明用户指的是 3D，请说明并停止。

## 重要

- 每一步都使用 unity cli（`unity command --format json`）以及 `unity-cli` 和 `unity-pipeline` 技能。
- 在做出更改之前，先建立当前行为的基线，以便你能判断后续结果是否确实由你的更改引起。
- 创建一个还原点，以便在你的更改失败时回滚。
- 只做所要求的事情。不要更改无关的资产或文件。
- 避免冗长的解释。
- 用临时 `Debug.Log` 行验证运行时行为，然后移除它们，因为用户没有要求日志，而残留的行会弄乱他们的脚本和控制台。不要构建他们未要求的稳定检测或永久日志。请参阅[最后一步](#final-step)。
- 绝不要通过反射类型来发现 API——请改为获取成员页面。系统探测是唯一的例外。

### 将 C# 传给 `script eval`

`script eval` 编译的是一个语句块，而不是文件，因此编写代码时不要带 `using` 指令，并使用完全限定的类型。`return` 你想读取的内容；它会到达 `data.result.result`。如果代码无法编译，请在此查找错误：

| 错误 | 原因 | 修复 |
| --- | --- | --- |
| `CS0210` | `using` 指令，编译器将其读取为资源释放语句 | 移除该指令并限定类型 |
| `CS0246` / `CS0103` | 未限定的类型，如 `Rigidbody2D` 或 `PhysicsWorld` | 使用完整名称，如 `UnityEngine.Rigidbody2D` 或 `Unity.U2D.Physics.PhysicsWorld` |
| `CS0104` | 裸 `Object`，与 `object` 产生歧义 | 使用 `UnityEngine.Object` |

## 步骤 0：哪个物理系统

Unity 有两个 2D 物理系统。它们不共享代码，且从不交互。在编写任何物理代码之前先确定是哪一个——来自错误系统的答案会编译、运行，但什么也不做。

按此顺序对照下表检查请求、场景和现有脚本：

1. 先检查场景组件和现有脚本，因为组件是可靠的信号。
2. 检查用户的请求措辞："add a collider" 是组件语言，"spawn a thousand" 是脚本语言。
3. 如果仍不确定安装了哪些系统，请运行下面的探测。
4. 如果路由仍未知，请停止并询问——提供全部三条路由，绝不为用户做选择。

| 信号 | 系统 |
| --- | --- |
| Physics Pose、Area、Constraint 或 Simulation 组件 | Core 组件，6000.7+ 且有该包 |
| Rigidbody 2D、Collider 2D、Joint 2D、Effector 2D | 旧版 |
| 脚本中包含 `Unity.U2D.Physics` 或 `UnityEngine.LowLevelPhysics2D` 类型 | 脚本中的 Core |
| `Rigidbody2D`、`Collider2D`、`Physics2D` 类型 | 旧版 |
| 两者都存在 | 独立的模拟。请说明，分开处理 |
| 无信号 | 停止并询问，提供上面三条路由 |

要点：
- 旧版 = Rigidbody 2D 和 Collider 2D 组件。
- Core 组件 = Physics Pose 和 Physics Area，需要 `com.unity.2d.physics` 和 Unity 6000.7+。
- 脚本中的 Core = `Unity.U2D.Physics` API，无需包。

探测：
```
unity command script eval --caller plugin --skill create-2d-physics --code 'var r = ""; foreach (var n in new[] { "UnityEngine.Rigidbody2D", "Unity.U2D.Physics.PhysicsWorld", "UnityEngine.LowLevelPhysics2D.PhysicsWorld", "Unity.U2D.Physics.PhysicsPose" }) { var f = false; foreach (var a in System.AppDomain.CurrentDomain.GetAssemblies()) if (a.GetType(n) != null) f = true; r += f + ","; } return r;'
```
探测返回：旧版是否存在、Core 是否为 `Unity.U2D.Physics`、Core 是否为 `UnityEngine.LowLevelPhysics2D`、Core 组件是否存在。如果任一 Core 值为 true，则 Core 存在；为 true 的那个给出命名空间。`false` 排除该路由。

## 完整主题地图

在你继续工作流或诊断之前：

1. 打开并阅读涵盖与你打算做或修复的内容相关的具体主题的[文档页面](#full-topic-map)，并检查你是否遗漏了什么。
2. 在回答中说明你阅读的文件。

这是因为你关于 Unity 的训练知识可能过时、不正确，或针对错误的 Unity 版本。

优先使用 `WebFetch` 而非 `WebSearch`——更快且能落到确切的参考。只获取你需要的内容。获取前将 `<VERSION>` 替换为以下内容：

- **docs.unity3d.com 上的包**：包版本，例如 `@6.6` 或 `@2.0`。如果不确定请检查包版本。
- **docs.unity.com**：产品版本，例如 `7000.0`

对于 docs.unity.com 引擎页面，使用 Unity 版本，例如 `6000.7`。页面是 markdown——URL 以 `.md` 结尾。在 `Packages/packages-lock.json` 中查找包版本，因为 `manifest.json` 可能包含范围或 git URL，而不是已解析的版本。

如果编辑器安装文件夹有 `Data/Documentation` 文件夹（例如 `...Unity/Hub/Editor/6000.6.0b2/Editor/Data/Documentation`），请从 `en/Manual` 文件夹读取 html 文件。否则使用下面参考中列出的在线 `.md` 页面。

一旦你知道路由，在行动前阅读匹配的参考：
- [2D Physics Core 参考](references/2d-physics-core.md) —— 组件、配置它们、在脚本中创建刚体、所有权，以及完整的 Core 主题地图。
- [旧版 2D 物理参考](references/legacy-2d-physics.md) —— 旧版手册主题地图。

### API 参考

Core 和旧版 API（`Unity.U2D.Physics` 或 `UnityEngine.LowLevelPhysics2D`，以及 `UnityEngine.Rigidbody2D`、`Collider2D`、`Physics2D`）是 Unity 引擎的一部分。它们按 Unity 版本进行版本化，因此在依赖特定类或方法之前，请检查项目的 Unity 版本。

1. 使用 `unity-cli` 技能检查项目的 Unity 版本。
2. 如果编辑器安装文件夹有 `Data/Documentation` 文件夹，请 grep 其中 `en/ScriptReference` 文件夹内的 html 文件，并跳过其余步骤。
3. 否则，获取并缓存 `https://docs.unity3d.com/<VERSION>/Documentation/ScriptReference/xrefmap.yml`（将 `<VERSION>` 替换为项目的 Unity 版本，major.minor 形式）。此文件将每个公开 API 成员的完全限定名列为 `uid`（例如 `uid: 'UnityEngine.Rigidbody2D.AddForce(UnityEngine.Vector2,UnityEngine.ForceMode2D)'`）。
4. 在本地 grep yml 文件以查找类或方法，而不是每次查找都重新获取。该文件很大（约 6 MB），所以不要读取整个文件。
5. 将 `uid` 转换为 markdown 页面：移除括号中的参数，转为小写，将 `.` 替换为 `/`，并添加 `.md`。然后获取 `https://docs.unity.com/en-us/engine/<VERSION>/script-reference/<converted uid>`。例如，`UnityEngine.Rigidbody2D.AddForce(UnityEngine.Vector2,UnityEngine.ForceMode2D)` => `https://docs.unity.com/en-us/engine/<VERSION>/script-reference/unityengine/rigidbody2d/addforce.md`。所有重载都在同一页面上。
   - 构造函数使用 `ctor`（例如 `unityengine/vector2/ctor.md`），索引器使用 `item`（例如 `unityengine/vector2/item.md`）。
   - 对于运算符，获取类页面（例如 `unityengine/vector2.md`）并跟随其链接。
   - 页面内的链接以 `/engine/` 开头。在它们前面加上 `https://docs.unity.com/en-us`。
   - 如果该 Unity 版本没有该页面，请改用 `xrefmap.yml` 条目中的 `href`（例如 `href: 'Rigidbody2D.AddForce.html'` => `https://docs.unity3d.com/<VERSION>/Documentation/ScriptReference/Rigidbody2D.AddForce.html`）。

Core **组件**（Physics Pose、Area、Constraint、Simulation）位于 `com.unity.2d.physics` 包的 `Unity.U2D.Physics` 命名空间中。它们按包版本而非 Unity 版本进行版本化，因此在依赖特定类或方法之前，请检查已安装的包版本。

1. 使用 `unity-cli` 技能检查已安装的包版本。
2. 获取并缓存 `https://docs.unity3d.com/Packages/com.unity.2d.physics@<version>/xrefmap.yml`（将 `<version>` 替换为已安装的包版本，major.minor 形式）。此文件将每个公开 API 成员的完全限定名映射到其文档页面 `href`（例如 `href: api/Unity.U2D.Physics.PhysicsPose.html` => `https://docs.unity3d.com/Packages/com.unity.2d.physics@<version>/api/Unity.U2D.Physics.PhysicsPose.html`）。
3. 在本地 grep yml 文件以查找类或方法，而不是每次查找都重新获取。不要读取整个文件。

始终使用与项目 Unity 版本和已安装包版本匹配的文档，而不是依赖训练知识，因为 API 经常在版本之间被标记为过时，你记得的成员在项目版本中可能已过时或已移除。

## 已完成的示例

按顺序优先：你所使用的类型或成员页面上的 C# 示例；现有项目脚本（匹配其风格）；位于 `https://github.com/Unity-Technologies/PhysicsExamples2D` 的示例项目。在发明模式之前检查全部三者。

## 最后一步

物理更改会改变运行时行为，因此干净编译还不够。按顺序运行这些检查。如果任何检查失败，请重新阅读[文档页面](#full-topic-map)以找出你遗漏的内容，修复它，然后再次运行检查。

1. 使用 `console_status` 检查项目控制台错误为零。
2. 回读你所更改的内容，因为更改可能干净编译但仍什么也不做：
   - 对于你在场景中添加或配置的组件，使用 `script eval` 检查每个组件存在于其 GameObject 上，且其属性持有你设置的值，例如 Collider 2D 的 `isTrigger` 或 Core 组件类型页面上列出的成员。
   - 对于脚本，回读并检查它使用[步骤 0](#step-0-which-physics-system)中的系统和命名空间，并显式设置每个 Core 刚体的 `type`。
3. 添加临时 `Debug.Log` 行以打印你所更改的行为，例如刚体的位置或速度，或接触或触发回调的触发。
4. 进入 Play 模式并检查控制台显示预期的日志行且仍然零错误。你也可以通过 `script eval` 读取世界。不要截图，因为太耗时。
5. 退出 Play 模式，移除临时 `Debug.Log` 行，并再次检查控制台零错误。

## 最终报告

简短清单：你更改了什么以及为什么、你使用了哪个物理系统、任何留待用户决定或执行的事项。
