---
name: ui-imgui
description: 生成并修改 Unity IMGUI 编辑器代码，如 EditorWindow、自定义 Inspector、PropertyDrawer 和 OnGUI 脚本。用于 IMGUI 或 OnGUI，或维护现有 IMGUI 代码。
---

**继续之前：** 如果用户询问创建**新的**编辑器窗口、自定义检视面板或 PropertyDrawer，而没有明确提及 IMGUI/OnGUI，请推荐改用 UI Toolkit（CreateGUI），因为它是现代方法。仅在以下情况下继续使用 IMGUI：
- 用户正在修改现有 IMGUI 代码
- 用户明确要求 IMGUI/即时模式
- 项目专门使用 IMGUI 作为编辑器工具

激活后，阅读参考文件：
- [references/templates.md](references/templates.md) —— EditorWindow、Inspector、PropertyDrawer 模板
- [references/gui-elements.md](references/gui-elements.md) —— GUI 元素、布局组、样式

## 何时使用本技能

**重要：** 本技能**仅适用于旧版 IMGUI 代码**。在以下情况下使用本技能：

- 用户正在维护/更新**现有的** IMGUI 编辑器代码（含 `OnGUI()`、`OnInspectorGUI()` 的文件）
- 用户**明确要求** IMGUI/即时模式 GUI
- 项目专门使用 IMGUI 处理所有编辑器工具

**不要将本技能用于：**
- 新的编辑器窗口（改用带 `CreateGUI()` 的 UI Toolkit）
- 新的自定义检视面板（改用 UI Toolkit）
- 未明确提及 IMGUI 或 OnGUI 的请求

**旧版 IMGUI 用于：**
- **编辑器窗口** —— 带 `OnGUI()` 的 `EditorWindow` 类
- **自定义检视面板** —— 带 `OnInspectorGUI()` 的 `Editor`、`PropertyDrawer` 类
- **调试叠加层** —— MonoBehaviour 中的 `OnGUI()`（运行时）

IMGUI **不**用于运行时游戏 UI——请改用 UI Toolkit 或 uGUI。

## 范围

**只生成所请求的内容（对于旧版 IMGUI 代码）：**

| 请求 | 输出 | 备注 |
|---------|--------|------|
| 编辑器窗口（IMGUI/OnGUI） | 带 `OnGUI()` 的 `EditorWindow` | 仅在明确 IMGUI 时 |
| 自定义检视面板（IMGUI） | 带 `OnInspectorGUI()` 的 `Editor` | 仅在明确 IMGUI 时 |
| 属性绘制器（IMGUI） | 带 `OnGUI()` 的 `PropertyDrawer` | 仅在明确 IMGUI 时 |
| 调试叠加层 | 带 `OnGUI()` 的 `MonoBehaviour` | 运行时调试 |
| 更新现有 IMGUI 脚本 | 修改现有 OnGUI 代码 | 始终合适 |

**如果有歧义请澄清：**
- "inspector" → 针对特定类型的自定义 Editor，还是 PropertyDrawer？**还要问：** 这应使用 UI Toolkit（现代）还是 IMGUI（旧版）？
- "editor window" → **先问：** 这应使用 UI Toolkit（现代/CreateGUI）还是 IMGUI（旧版/OnGUI）？
- "tool window" → 具有什么功能的 EditorWindow？哪个 UI 系统？

## 约定

**优先遵循项目模式。** 在应用默认值之前先搜索现有编辑器脚本。

| 类型 | 约定 | 好 | 差 |
|------|------------|------|-----|
| 脚本名称 | PascalCase | `MyToolWindow.cs` | `my-tool-window.cs` |
| EditorWindow | `[Name]Window.cs` | `LevelEditorWindow.cs` | `LevelEditor.cs` |
| 自定义 Editor | `[Type]Editor.cs` | `EnemyEditor.cs` | `EnemyInspector.cs` |
| PropertyDrawer | `[Type]Drawer.cs` | `RangeDrawer.cs` | `RangePropertyDrawer.cs` |
| 位置 | `Editor` 文件夹 | `Assets/Editor/` | `Assets/Scripts/` |

**必须使用 Editor 文件夹**——使用 `UnityEditor` 命名空间的脚本必须位于 `Editor` 文件夹中，否则将无法构建。

## 工作流

1. **分析** —— 确定需要哪种脚本类型（EditorWindow、Editor、PropertyDrawer 等）
2. **搜索** —— 查找现有编辑器脚本以匹配模式
3. **遵循项目模式** —— 匹配文件夹结构和命名
4. **创建脚本** —— 使用适当的基类和特性
5. **实现 OnGUI** —— 使用布局组构建界面

## 脚本结构

### EditorWindow
```
[MenuItem attribute] → adds to menu
ShowWindow() static method → opens window
OnGUI() → draws interface
OnEnable/OnDisable → initialization/cleanup
```

### 自定义 Editor
```
[CustomEditor attribute] → targets component type
OnInspectorGUI() → draws inspector
OnEnable() → cache SerializedProperties
serializedObject.Update/ApplyModifiedProperties → undo support
```

### PropertyDrawer
```
[CustomPropertyDrawer attribute] → targets type or attribute
OnGUI(Rect, SerializedProperty, GUIContent) → draws property
GetPropertyHeight() → custom height if needed
```

## 关键规则

- **缓存 GUIStyle 对象** —— 绝不要在 OnGUI 中创建新的 GUIStyle（每帧都会造成内存分配）
- **使用 SerializedProperty** —— 以便在检视面板中获得正确的撤销/重做支持
- **调用 ApplyModifiedProperties()** —— 在任何序列化对象更改之后
- **使用 EditorGUILayout** —— 用于编辑器脚本（自动布局）
- **使用 GUILayout** —— 用于运行时 OnGUI
- **Begin/End 配对** —— 始终将 BeginHorizontal 与 EndHorizontal 配对，等等。
- **需要 Editor 文件夹** —— 脚本若不在 Editor 文件夹中将无法构建

## 布局基础

**水平分组：**
```csharp
EditorGUILayout.BeginHorizontal();
// elements appear side by side
EditorGUILayout.EndHorizontal();
```

**垂直分组：**
```csharp
EditorGUILayout.BeginVertical("box");
// elements appear stacked, with box style
EditorGUILayout.EndVertical();
```

**滚动视图：**
```csharp
scrollPos = EditorGUILayout.BeginScrollView(scrollPos);
// scrollable content
EditorGUILayout.EndScrollView();
```

**折叠区域：**
```csharp
showSection = EditorGUILayout.Foldout(showSection, "Section Name");
if (showSection)
{
    EditorGUI.indentLevel++;
    // section content
    EditorGUI.indentLevel--;
}
```

## 常用模式

**带操作的按钮：**
```csharp
if (GUILayout.Button("Do Something"))
{
    // action here
}
```

**带标签的属性字段：**
```csharp
EditorGUILayout.PropertyField(myProperty, new GUIContent("Label"));
```

**对象引用字段：**
```csharp
myObject = (MyType)EditorGUILayout.ObjectField("Label", myObject, typeof(MyType), true);
```

**禁用组：**
```csharp
EditorGUI.BeginDisabledGroup(condition);
// disabled elements
EditorGUI.EndDisabledGroup();
```

## 最佳实践

- 使用 `SerializedObject` 和 `SerializedProperty` 以支持撤销
- 在 `OnEnable()` 中缓存属性引用
- 仅在非序列化更改时使用 `EditorUtility.SetDirty()`
- 直接修改对象之前使用 `Undo.RecordObject()`
- 使用 `EditorStyles` 以保持一致的外观
- 使用 `GUILayout.FlexibleSpace()` 将元素分开

完整脚本模板见 `references/templates.md`。
完整元素参考见 `references/gui-elements.md`。
