---
name: build-gtk
description: >-
  在 Unity 6.6+ 上使用 Unity Graph Toolkit（GTK）构建基于节点的编辑器工具：图、节点、端口
  和验证，6.7+ 上的状态机 API 工具，以及通过脚本化导入器生成的运行时资产。用于
  自定义图、节点或状态机编辑器，或迁移 GraphView 工具。不用于 Shader Graph、VFX
  Graph 或 Animator Controller。
required_editor_version: ">=6000.6"
---

# Unity Graph Toolkit（GTK）

使用 Unity 的 Graph Toolkit 模块构建编辑器图工具和状态机工具，仅使用其在 `Unity.GraphToolkit.Editor` 命名空间中的公开 API。

## 重要

- 创建一个还原点，以便在你的更改失败时回滚。
- 只做所要求的事情。不要更改无关的资产或文件。避免冗长的解释。
- 在你继续工作流或诊断之前，打开并阅读该工作流中指定的参考文件以及涵盖你打算做的事情的[主题地图](#topic-map)页面。在回答中说明你阅读的文件。这是因为你关于 Unity 的训练知识可能过时、不正确或针对错误的 Unity 版本，而 Graph Toolkit 在 6000.4、6000.6 和 6000.7 之间发生了变化。

## 参考

按需阅读这些内容。路径相对于本技能文件夹。

- `references/graph-api.md` —— Graph API 接口：Graph、Node、端口和选项构建器、上下文
  和块节点、子图、变量、验证、工具栏和上下文菜单。在编写任何
  图工具代码之前阅读。
- `references/state-machine-api.md` —— 状态机 API（Unity 6.7+）：StateMachine、State、
  Condition、转换和规则、自转换、自定义视图。只要涉及状态、转换
  或条件时就阅读。
- `references/runtime-and-visualization.md` —— 使用 ScriptedImporter 将图或状态机编译为运行时资产，
  并在图编辑器中显示实时执行。当用户希望将编写的数据用于游戏或在运行时调试时阅读。
- `references/pitfalls.md` —— 通过编译但仍存在的错误。在交接之前阅读，以及
  每当用户报告编译错误、空的 Add 菜单、缺失的节点或异常时。

## 第 1 步：检查编辑器版本并选择 API

在编写代码之前读取 `ProjectSettings/ProjectVersion.txt` 中的 `m_EditorVersion`。Graph Toolkit 是
编辑器模块，因此无需安装包。`com.unity.graphtoolkit` 是一个已弃用的垫片，
不得添加到 manifest。

| 编辑器版本 | 可用内容 |
|---|---|
| 早于 6000.4 | 仅有已退役的实验性包（0.x）。其 API 与本技能不同。建议升级。 |
| 6000.4 到 6000.5 | 模块存在，但没有端口容量、类型转换、连线与节点可视化、USS 节点样式或元素 ID。 |
| 6000.6 | 本技能记录的 Graph API。 |
| 6000.7 及更新版本 | 上述所有内容加上状态机 API、`NodeView<T>` / `StateView<T>` / `ConditionView<T>` 自定义 UI、`[GraphMenu]` / `[BlackboardMenu]` 上下文菜单、`GraphLogger.GraphChanges` 变更增量、端口类型跟随以及 Blackboard 类型限制。参考中标记为 **6.7** 的成员。 |

如果用户在早于 6000.7 的编辑器上要求状态机工具，请明确说明该编辑器上
状态机 API 不可用。除非被要求，不要用 Graph API 模拟它。

## 心智模型

- Graph Toolkit 仅是创作框架。它绘制并持久化图；它从不执行它们。
  用户编写运行时数据模型和运行它的代码，通常由 ScriptedImporter 提供。
- 每个 `Graph` 或 `StateMachine` 子类一个资产类型，由传给
  `[Graph("ext")]` 或 `[StateMachine("ext")]` 的文件扩展名标识。
- 通过反射发现。与图类同一程序集中的节点、状态和条件类会被自动
  列出。其他程序集中的类通过 `[UseWithGraph]` 或
  `[UseWithStateMachine]` 选择加入。抽象类从不被列出。
- 每个创作类都是 `[Serializable]` 并位于仅编辑器程序集中，要么是 `Editor`
  文件夹，要么是限制在编辑器平台的 asmdef。
- 只有公开 API 才能为用户编译。如果左列中的名称出现在草稿中，请停止并使用
  右列：

  | 绝不编写 | 改为编写 |
  |---|---|
  | `GraphModel`、`GraphObject`、`GraphTool`、`Stencil`、`BaseGraphTool` | `Graph` 和 `GraphDatabase` |
  | `NodeModel`、`PortModel`、`WireModel` | `Node`、`IPort`、`Wire` |
  | `StateModel`、`TransitionModel`、`ConditionModel` | `State`、`ITransition`、`Condition<T>` |
  | `GraphViewEditorWindow`、`GraphElementsExtensionMethodsCache`、`ModelView` | 窗口已提供；6000.7 上的 `NodeView<T>` 用于自定义 UI |
  | `UnityEditor.Experimental.GraphView`、`graphViewChanged`、`Port.Create` | 没有等价物；将工具建模为 `Graph` 和 `Node` 类 |
  | manifest 中的 `com.unity.graphtoolkit` | 什么都不写；该模块是内置的 |

## 工作流 A：构建图工具

现在阅读 `references/graph-api.md`，在编写代码之前；成员名称和构建器链来自
那里，而不是记忆。当第 5 步适用时，也阅读 `references/runtime-and-visualization.md`。

1. **图类。** `[Graph(AssetExtension)] [Serializable] class MyGraph : Graph`，带一个
   `public const string AssetExtension`。添加一个 `[MenuItem("Assets/Create/...")]` 静态方法，调用
   `GraphDatabase.PromptInProjectBrowserToCreateNewAsset<MyGraph>()`。当需要子图时，在特性中传入
   `GraphOptions.SupportsSubgraphs`。
2. **节点类。** `[Serializable] class MyNode : Node`。重写 `OnDefinePorts` 并以 `.Build()` 结束每个端口
   构建器链。重写 `OnDefineOptions` 用于检视面板可编辑的设置，并在 `OnDefinePorts` 内
   当端口依赖它们时用 `GetNodeOptionByName(name).TryGetValue<T>(out var v)` 读取它们。对计数类选项调用 `.Delayed()`，以免每次按键都重建端口。
   使用 `[Node("Category/Path", iconPath, title, stylesheet)]` 用于放置、图标、默认标题和 USS。
3. **验证。** 重写 `OnGraphChanged(GraphLogger logger)` 并用
   `logger.LogError`、`LogWarning` 或 `Log` 报告，将违规的节点或端口作为上下文传入，使
   标记出现在其上。绝不要在此回调中修改图；将修复放在附加到消息的 `GraphLogAction`、
   菜单项或导入器中。
4. **结构，按要求。** 上下文和块节点、子图、黑板变量、通过
   `IsConnectionAllowed` 进行类型转换、工具栏元素或上下文菜单。详情见 `graph-api.md`。
5. **输出。** 在同一扩展名上注册的 `ScriptedImporter` 将图编译为普通的
   运行时资产。形状总是相同：

   ```csharp
   var graph = GraphDatabase.LoadGraphForImporter<MyGraph>(ctx.assetPath);   // never LoadGraph here
   if (graph == null) return;                                                 // bad path or type: log and stop
   var start = graph.GetNodes().OfType<StartNode>().FirstOrDefault();
   if (start == null) return;                                                 // OnGraphChanged already reported it
   var next = start.GetOutputPortByName("Next").FirstConnectedPort?.GetNode(); // null when unconnected
   var titlePort = next.GetInputPortByName("Title");
   titlePort.TryGetValue<string>(out var title);                              // the value typed on the node
   if (titlePort.IsConnected) { /* resolve titlePort.FirstConnectedPort.GetNode() upstream instead */ }
   ctx.AddObjectToAsset("Runtime", runtime); ctx.SetMainObject(runtime);
   ```

   运行时资产及其程序集不得引用 `Unity.GraphToolkit.Editor`；将 `Hash128`
   ID 保持为 `Hash128`。调试视图和代码构建的图在 `runtime-and-visualization.md` 中。
6. 如下所述**验证**。

## 工作流 B：构建状态机工具（Unity 6.7 及更新版本）

现在阅读 `references/state-machine-api.md`；此 API 尚无手册演练，因此该
文件和 Script Reference 是其成员名称的唯一准确来源。

1. **状态机类。** `[StateMachine(AssetExtension)] [Serializable] class MySM : StateMachine`
   外加一个调用 `StateMachineDatabase.PromptInProjectBrowserToCreateNewAsset<MySM>()` 的菜单项。
2. **状态。** `[Serializable] class Patrol : State`。状态没有端口；状态机拥有
   转换。在 `OnDefineOptions` 中声明的选项仅出现在 Graph Inspector 中。
3. **条件。** `[Serializable] [Condition("Health")] class HealthCondition : Condition<float>`，当需要比较运算符时
   带 `protected override bool DisplayComparisonDropdown => true`。
   对于无值触发器，直接从 `Condition` 派生。分组（And/Or）和变量条件
   是内置的；不要重新实现它们。
4. **可选。** 自定义自转换（`SelfTransition` + `[Transition(...)]`）、通过
   `StateView<T>` 和 `ConditionView<T>` 的自定义 UI，以及 `[StateMachineMenu]` / `[ConditionMenu]` 条目。
5. **验证。** 重写 `OnStateMachineChanged(StateMachineLogger logger)`。规则与
   `OnGraphChanged` 相同。
6. **输出。** `ScriptedImporter` 用 `StateMachineDatabase.LoadStateMachineForImporter<MySM>` 加载，
   然后遍历 `GetStates()`、每个状态的 `GetOutgoingTransitions()`、每个转换的 `GetRules()`，
   以及每个规则的 `RootCondition` 树。该树总是包含内置种类以及
   用户的类，因此编译器必须在匹配自定义 `Condition<T>`
   类型之前处理 `IGroupCondition`（递归，遵守 `Operation`）和
   `IVariableCondition`（`Variable.Name`、`Comparison`、`Value`）。

## 从代码编辑图

当菜单项、生成器或工具构建或编辑资产时，用以下方式括住变更：
`LoadGraph`/`CreateGraph` → `UndoBeginRecordGraph("Action")` → `AddNode`、`Connect`、
`port.TrySetValue`、`CreateVariable` → `GraphDatabase.SaveGraph(graph)` → `UndoEndRecordGraph()`。
状态机等价物是 `UndoBeginRecordStateMachine`、`Connect(fromState, toState)`、
`SaveStateMachine` 和 `UndoEndRecordStateMachine`。在 `OnEnable`、`OnDisable`、
`OnGraphChanged` 或 `OnStateMachineChanged` 内部变更会抛出 `InvalidOperationException`。

## 决策

| 用户想要 | 这样做 | 原因 |
|---|---|---|
| 限制端口接受多少条连线 | 在端口构建器中使用 `.WithCapacity(PortCapacity.Single)`（或 `Multi`、`None`） | 端口默认为多连线，因此只有你声明限制时框架才会强制执行 |
| 将 `int` 输出连接到 `float` 输入 | 重写 `Graph.IsConnectionAllowed(IPort output, IPort input)` | 不同类型的端口默认拒绝连接；图只记录连线，由你的导入器转换 |
| 一个端口接受多种类型，如 Shader Graph | 6000.7+：在构建器上使用 `.WithDataTypes(typeof(float), typeof(int), typeof(Vector3))`。6000.6：无类型端口加 `IsConnectionAllowed` | `WithDataTypes` 在 6000.6 上不存在 |
| 无数据类型的执行流端口 | `context.AddInputPort("In")` 不带类型；其 `DataType` 为 `Untyped`。添加 `.WithConnectorUI(PortConnectorUI.Arrowhead)` 以获得流外观 | 流端口不携带值；为它们指定类型会招致错误连接 |
| 从 Add 菜单隐藏节点类型 | 使其 `abstract`，或将其移到没有 `[UseWithGraph]` 的另一个程序集，或设置 `GraphOptions.DisableAutoInclusionOfNodesFromGraphAssembly` 并显式选择加入节点 | 图程序集中的每个具体节点类都会被自动列出 |
| 在 Add 菜单中分组节点 | `[Node("Category/Sub")]`。类名或标题名附加在路径之后 | 特性的第一个参数是文件夹路径，不是节点的标题 |
| 知道什么变了，像旧的 `graphViewChanged` | 6000.7+：`OnGraphChanged` 和 `logger.GraphChanges.ChangedNodes`，带用于添加和修改节点的 `ChangeKinds` 标志。任何版本上的已移除节点，以及 6000.6 上的一切：将节点 ID 的缓存 `HashSet<Hash128>` 与 `GetNodes()` 对比 | `GraphChanges` 在 6000.7 中添加，且从不报告已移除的节点，只报告已移除的端口 |
| 多种子图 | 主图上使用 `GraphOptions.SupportsSubgraphs`，每个子图 `Graph` 类上使用 `[Subgraph(typeof(MainGraph))]` | 没有该特性时，主图类型兼作唯一的子图类型 |
| 子图节点上的端口 | 子图内 `VariableKind.Input` 或 `Output` 种类的黑板变量 | 子图节点没有 `OnDefinePorts`；其端口镜像子图的变量 |
| 节点图标或 USS 外观 | `[Node(category, iconPath, title, stylesheet)]`；深色主题图标文件使用 `d_` 前缀 | 编辑器在深色主题中选择 `d_` 文件，否则回退 |
| 显示运行时哪个节点运行以及什么流经端口 | GraphVisualization API，参见 `runtime-and-visualization.md` | Graph Toolkit 没有运行时；游戏必须将状态推回打开的窗口 |
| 类似 Animator 的状态机编辑器 | 6000.7+ 上的工作流 B。在 6000.6 上，说明它不可用 | 状态机 API 在 6000.7 之前不存在 |
| 节点内的额外 UI | 6000.7+ 上的 `NodeView<MyNode>`。在 6000.6 上，仅 USS、`DefaultColor` 和 `FillAmount` | `NodeView<T>` 在 6000.7 中添加 |

## 约束

- 使用与参考完全一致的成员名称：属性为 PascalCase
  （`FirstConnectedPort`、`IsConnected`），特性采用位置构造函数参数，ID 为
  `Hash128`。当成员未在参考中列出时，请在下面的 URL 模式中查找，而不是
  猜测其名称或大小写，因为猜测的成员无法编译，用户无法区分
  拼写错误和缺失的功能。
- 链接到 Script Reference 或手册，而不是重述它们，以便文档变化时答案保持正确。
- 使运行时程序集不含 `Unity.GraphToolkit.Editor`，并将可视化代码放在
  `#if UNITY_EDITOR` 下的运行时程序集中，因为该模块仅用于编辑器，任何对它的引用
  都会破坏播放器构建。
- 保持用户现有的工具结构，不要重新设计或重组未提及的节点，因为节点和端口名称是导入器和保存的资产所依赖的查找键。
- 不要使用 Graph Toolkit 内部或私有类型作为变通方案，因为它们无法从用户代码访问
  且会无预警地更改。如果公开 API 无法做到某事，请说明并指向下面的社区线程列表。

## 验证

0. 阅读 `references/pitfalls.md` 并在向用户展示代码之前对照它检查代码。
1. 项目编译无错误。如果 Unity CLI 可用，请使用它以无头方式构建或运行
   编辑器；否则请用户让编辑器获得焦点并报告 Console。
2. 从新菜单项创建资产，双击它，从 Add
   菜单添加每个节点或状态类型，连接它们，保存，关闭并重新打开。Console 必须不显示错误或警告。
3. 使用导入器时，选择资产并确认生成的运行时对象是 Inspector 中的主资产。
3b. 当你编写运行时代码（执行器、调试视图）时，添加证明
   行为的 `Debug.Log` 行，例如进入的状态或执行的节点，进入 Play 模式并阅读它们。一旦行为确认，
   移除或保护它们。
4. 重新阅读 `references/pitfalls.md` 并修复它标记的任何内容。
5. 如果某步骤失败或 Console 报告错误，请返回并重新阅读该步骤的参考文件和
   [主题地图](#topic-map)页面，然后重试；修复通常是成员名称或你遗漏的
   版本门控。

## 最终报告

给用户一个简短的清单：你创建或更改的文件及其放置位置、如何创建
和打开第一个资产、导入器生成什么，以及代码针对哪个编辑器版本。列出
留给他们决定或下一步做的事情，例如更多节点类型、运行时执行器或调试
视图，以及任何因没有可用编辑器而无法验证的 Console 错误。

## 主题地图

优先使用 `WebFetch` 而非 `WebSearch`；它更快且能落到确切的页面。只获取你需要的内容。
获取前替换 `<VERSION>`：

- `docs.unity.com/en-us/engine/<VERSION>` 和 `docs.unity3d.com/<VERSION>/Documentation`：项目的
  编辑器版本，来自 `ProjectSettings/ProjectVersion.txt`，例如 `6000.6` 或 `6000.7`。
- `docs.unity3d.com/Packages/com.unity.graphtoolkit-samples@<VERSION>`：Package Manager 中显示的示例包
  版本，例如 `0.6`。

页面，全部位于 `https://docs.unity.com/en-us/engine/<VERSION>/` 下，保留 `.md`
后缀时以 markdown 形式提供：

- 手册索引：`manual/extending-the-editor/gtk-index.md`
- 实现图工具：`manual/extending-the-editor/gtk-index/implementing-a-graph-tool.md`，其
  子页面 `implement-a-graph-tool.md`、`implement-nodes.md`、`implement-node-options.md`、
  `implement-context-nodes.md`、`implement-block-nodes.md`、`type-cast-ports.md`、
  `add-custom-toolbar-actions.md`、`add-subgraph-support.md`、`graph-processing.md` 位于该文件夹下
- 图窗口和面板：`manual/extending-the-editor/gtk-index/landing-graph-interface.md`，其下
  `graph-window.md`、`blackboard.md`、`graph-inspector.md`、`minimap.md`
- Script Reference：`script-reference/unity/graphtoolkit/editor/<type>.md` 和
  `.../<type>/<member>.md`，全部小写，泛型参数数量去掉（`Condition<T>` 对应 `condition.md`）。
  示例：`script-reference/unity/graphtoolkit/editor/graph/ongraphchanged.md`。状态机类型
  从 `6000.7` 起存在。较旧的形式 `https://docs.unity3d.com/<VERSION>/Documentation/ScriptReference/Unity.GraphToolkit.Editor.<Type>.html`
  也能 resolves，作为 HTML。
- 示例：`https://docs.unity3d.com/Packages/com.unity.graphtoolkit-samples@<VERSION>/manual/index.html`。
  在 Package Manager 中按名称安装 `com.unity.graphtoolkit-samples`，然后导入 Texture Maker
  （导入器）、Visual Novel Director（自定义运行时和调试视图）或 Dungeon Graph Generator
  （从代码构建图）。
- 社区：https://discussions.unity.com/tag/graph-toolkit
