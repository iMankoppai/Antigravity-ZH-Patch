---
name: manage-sprite-atlas
description: 通过预构建管线管理 SpriteAtlas 资产，涵盖主图集和变体图集、打包设置以及平台覆盖。用于被要求创建或优化精灵图集时。
---

# Unity SpriteAtlas V2

为在 Unity 项目中脚本化图集提供*编辑器安全*的程序化知识。**V2 强制严格分离编辑器创作和运行时访问。**

> ⚠ **关键 V2 原则**：`SpriteAtlas` **仅用于运行时**。`SpriteAtlasAsset` **仅用于编辑器**。绝不要混用上下文。始终使用 V2。

## 🚨 关键：实现前的必需检查和用户输入

**在生成任何代码之前，始终执行这些检查并询问这些问题：**

### 编写代码前阅读随附资源（必需）

本技能在 `resources/` 下随附了可用的 C#，而出错的图集代码几乎总是
在未先阅读它的情况下编写的代码。打开你正在走的路径对应的文件，然后编写。

| 走此路径 | 先阅读 |
|---|---|
| 任何图集工作 | [resources/authoringvsruntime.cs](resources/authoringvsruntime.cs)、[references/common-errors.md](references/common-errors.md) |
| 预构建生成（默认） | [resources/spriteatlasprebuildgenerator.cs](resources/spriteatlasprebuildgenerator.cs)、[resources/enablespritepacking.cs](resources/enablespritepacking.cs)、[resources/savespriteatlasasset.cs](resources/savespriteatlasasset.cs) |
| 选项 B，Addressables 延迟绑定 | [resources/buildaddressablespostprocess.cs](resources/buildaddressablespostprocess.cs)、[resources/spriteatlaslatebinding.cs](resources/spriteatlaslatebinding.cs)、[resources/handlelatebinding.cs](resources/handlelatebinding.cs) |
| 任何可能使用较旧 API 的内容 | [resources/deprecatedmethods.cs](resources/deprecatedmethods.cs)、[resources/dontscriptspriteatlasineditor.cs](resources/dontscriptspriteatlasineditor.cs)、[resources/dontpackinruntimebuilds.cs](resources/dontpackinruntimebuilds.cs) |

`resources/` 总共包含 38 个文件，涵盖自定义打包器、变体、平台设置和
运行时访问。当你的任务不在上表中时，浏览该目录，而不是发明
方法。凭记忆使用 API 而不是阅读这些文件，是图集干净导入却在运行时
什么都不做的最常见单一原因。

### 0. 检查现有脚本（必需的第一个步骤）

**在生成任何代码之前，扫描项目以查找由本技能生成的现有 SpriteAtlas 脚本。**

搜索包含标识符的文件：`// [UNITY-SKILL:SPRITEATLAS]`

**如果找到现有脚本，始终使用此格式询问用户：**

> "I found existing SpriteAtlas scripts in your project:
>
> **Prebuild Generator:**
> - `Assets/Editor/SpriteAtlas/SpriteAtlasPrebuildGenerator.cs`
>
> **Addressables Builder:**
> - `Assets/Editor/SpriteAtlas/BuildAddressablesPostprocess.cs`
>
> **Runtime Loader:**
> - `Assets/Scripts/SpriteAtlas/SpriteAtlasLateBinding.cs`
>
> What would you like to do?"

**然后提供选项：**

- **选项 A：更新现有脚本**（如果需求发生变化则推荐）
  - 在现有路径重新生成脚本
  - 保留文件位置
  - 更新到最新版本
  - ⚠ 可能覆盖自定义修改

- **选项 B：用不同名称创建新脚本**
  - 与现有脚本并排生成
  - 允许多个图集配置
  - 原始脚本保持不变
  - 你需要指定新的名称/路径

- **选项 C：中止（保持现有不变）**
  - 不生成代码
  - 不对项目做任何更改
  - 如果你想保持当前设置，请使用此选项

**用户选择处理：**

- **如果选择 A**：在现有路径重新生成，将版本递增到 2.0.1+
- **如果选择 B**：询问新的脚本名称（例如 "SpriteAtlasPrebuild_Custom.cs"），然后生成
- **如果选择 C**：立即停止，告知用户未做任何更改

### 1. 交付机制（必需）

询问："How do you want to deliver the sprite atlases?"

**选项 A：内置数据（立即加载）**
- 图集包含在构建中并立即加载
- 设置 `includeInBuild = true`
- **适用于**：核心 UI、主要玩法精灵、始终需要的资产
- **优点**：简单，无需额外包，即时访问
- **缺点**：增加初始构建体积，无法在不重新构建的情况下更新

**选项 B：通过 Addressables 延迟绑定（按需加载）**
- 图集不包含在构建中，通过 Addressables 按需加载
- 设置 `includeInBuild = false`
- 为每个图集创建 Addressables 条目
- 将可寻址设置添加为预构建步骤
- **🚨 必需**：作为构建步骤构建 Addressables 内容
- **🚨 必需**：创建延迟绑定运行时加载器脚本
- **适用于**：DLC 内容、可选功能、大型资产、可下载内容
- **优点**：初始构建更小，可独立更新，按需加载
- **缺点**：需要 Addressables 包、异步加载、网络依赖

| 使用场景 | 推荐 |
|----------|-------------|
| 始终可见的核心 UI 精灵 | **选项 A：内置** |
| 教程或新手引导精灵 | **选项 A：内置** |
| 关卡特定精灵（100+ 关卡） | **选项 B：Addressables** |
| DLC 或季节性内容 | **选项 B：Addressables** |
| 本地化 UI 精灵（多种语言） | **选项 B：Addressables** |
| 角色皮肤或装饰品 | **选项 B：Addressables** |

### 2. SpritePacker 模式（必需）

**在创建图集之前启用 Sprite Packer 模式，然后回读该设置并确认它已生效。**
使用 [resources/enablespritepacking.cs](resources/enablespritepacking.cs) 中的代码；它设置
`EditorSettings.spritePackerMode` 并配置导入器的打包设置。

这一步决定你产出的图集是否真实有效。`Disabled` 是
`SpritePackerMode` 的零值，因此任何没人设置过它的项目都带有打包**已禁用**状态，而在其禁用时
创建的图集仍会导入、仍会显示为资产、仍看起来已完成，但
永远无法打包。Unity 在检视面板中这样说：*"Sprite Atlas packing is disabled"*。工作流中
没有其他东西失败，因此这样发布的图集读起来像是成功。不要假设项目已
配置：读取该值。

所以不要将“我设置了它”当作完成。设置后，回读 `EditorSettings.spritePackerMode`，
确认它**不是** `Disabled`，并报告你实际读到的值。如果你无法回读，
请说明，而不是假设写入已生效。

**不要直接编辑 meta 文件。**

## 🚨 关键：默认方法是预构建生成

**始终使用 `IPreprocessBuildWithReport` 在构建管线期间自动生成或更新 SpriteAtlas。** 这是默认且必需的方法，除非用户**明确**要求手动创作。

### ❌ 不要创建手动菜单项脚本

**除非明确要求，绝不创建带 `[MenuItem]` 特性的脚本用于图集生成。** 预构建方法消除了手动点击的需要。**仅对以下情况使用手动创作**：手工优化的布局、特定精灵排列或编辑器预览需求。参见[高级：手动创作](#advanced-manual-authoring)。

## 🚨 关键：精灵源位置限制

**只从项目的 Assets 文件夹添加精灵。绝不要从 Unity 内置资产、包或外部位置添加精灵。** Unity 内置资产无法打包到 SpriteAtlas，包资产可能导致导入/依赖问题。

## 关键 V2 架构

| 上下文 | 组件 | 用途 | 允许的用法 |
|---------|-----------|---------|---------------|
| **编辑器创作** | `SpriteAtlasAsset` | 添加/移除精灵/文件夹；存储元数据 | ✅ 仅编辑器脚本 |
| **编辑器设置** | `SpriteAtlasImporter` | 配置纹理、打包、平台设置 | ✅ 仅编辑器脚本 |
| **编辑器打包** | `SpriteAtlasUtility.PackAtlases()` | *可选*编辑器预览打包（不用于构建） | ⚠ 仅用于预览；图集在构建时自动打包 |
| **运行时** | `SpriteAtlas` | 查询已打包的精灵（只读） | ✅ 仅运行时脚本 |
| **运行时加载** | `SpriteAtlasManager` | 动态加载回调 | ✅ 仅运行时脚本 |

### 禁止的跨上下文用法（常见错误来源）

| ❌ 无效模式 | ✅ 正确模式 |
|--------------------|-------------------|
| 在编辑器代码中使用 `new SpriteAtlas()` | 使用 `SpriteAtlasAsset` + `SpriteAtlasImporter` |
| 在编辑器中使用 `AssetDatabase.LoadAssetAtPath<SpriteAtlas>(...)` | 使用 `SpriteAtlasAsset.Load(...)` |
| 在编辑器中使用 `SpriteAtlasAsset.GetPackables()` | 使用 `SpriteAtlas.GetPackables()` |
| 在编辑器脚本中修改 `SpriteAtlas` | 修改 `SpriteAtlasAsset` → 重新导入 → 使用 `SpriteAtlasImporter` |
| 从原始可打包对象（精灵/文件夹）创建变体 | 从 Master 运行时 `SpriteAtlas` 创建变体 |

**绝不要在编辑器代码中针对 `SpriteAtlas` 编写脚本**——在 V2 中它*仅*用于运行时，除了 GetPackables。

## 核心 V2 工作流（仅供参考——请改用预构建）

> 🚨 **重要**：此工作流仅供参考。**始终在 `IPreprocessBuildWithReport.OnPreprocessBuild()` 中实现它**，而不是在手动脚本中。参见[快速开始](#quick-start-automated-prebuild-generation-default-approach)。

## 前提条件

- Unity 6000.3 或更高版本
- 对 Unity 资产导入管线的基本理解
- 熟悉用于图集创作的编辑器脚本

## 快速开始：自动预构建生成（默认方法）

### 概述

**这是创建 SpriteAtlas 的主要且默认方式。** 实现 `IPreprocessBuildWithReport` 以在每次构建之前根据分类规则自动生成或更新 SpriteAtlas。无需手动菜单点击。

### 工作流步骤

**步骤 1：询问用户交付机制**

在生成代码之前，询问："How do you want to deliver the sprite atlases: (A) Built-in data or (B) Late-binding via Addressables?"

**步骤 2：创建预构建脚本**

在 Editor 文件夹中创建此脚本。根据用户的交付选择进行自定义：

### 选项 A：内置数据（立即加载）

内置数据（立即加载）

### 选项 B：通过 Addressables 延迟绑定（按需加载）

> 🚨 **关键强制要求**：当用户选择 Addressables 时，你**必须**生成下面**全部三个**脚本。绝不要只生成一两个——Addressables 交付要正常工作，三个都是必需的。

**必需脚本（全部三个强制）：**

1. **预构建脚本**（IPreprocessBuildWithReport）—— 生成图集，创建 Addressables 条目
2. **构建 Addressables 脚本**（IPostprocessBuildWithReport）—— 构建 Addressables 内容包
3. **延迟绑定运行时加载器**（MonoBehaviour）—— 在运行时处理按需加载

完整实现参见 [references/addressables-delivery.md](references/addressables-delivery.md)。

#### 完整工作流

```
User Request
    ↓
Step 0: Check for existing scripts with [UNITY-SKILL:SPRITEATLAS] identifier
    ↓
    ├─ Found existing scripts?
    │   ↓ YES
    │   Ask user: Update existing / Create new / Abort
    │   ↓
    │   Handle user choice
    │
    └─ NO existing scripts or user chose "Create new"
        ↓
        Ask "Built-in data or Addressables?"
        ↓
        ├─ Option A: Built-in
        │   ↓
        │   Generate 1 script: Prebuild generator (includeInBuild=true)
        │
        └─ Option B: Addressables
            ↓
            Generate 3 scripts:
              1. Prebuild: Generate atlases + create Addressables entries (includeInBuild=false)
              2. Postprocess: Build Addressables bundles
              3. Runtime: Late-binding loader component
```

**步骤 3：自定义分类规则**

编辑 `OnPreprocessBuild` 方法以匹配你项目的精灵组织。选择一种或组合多种策略：

| 策略 | 何时使用 | 实现 |
|----------|-------------|----------------|
| **基于文件夹** | 精灵按文件夹结构组织 | `GenerateAtlasByFolder("Assets/Art/UI", "Assets/Atlases/UI.spriteatlasv2")` |
| **命名约定** | 精灵遵循命名模式 | `GenerateAtlasByNaming("Assets/Art", "icon_", "Assets/Atlases/Icons.spriteatlasv2")` |
| **资产标签** | 精灵用标签标记 |
| **基于场景** | 精灵用于特定场景 | 查询场景引用 |

**步骤 4：构建你的项目**

图集在构建期间自动生成/更新。**无需手动菜单点击。** 这就是预构建成为默认方法的原因。

**对于内置数据（选项 A）：**
- 图集包含在构建中
- 运行时立即可用

**对于 Addressables（选项 B）—— 额外必需步骤：**

你必须生成三个脚本（而不是只生成一个）：

1. **预构建脚本**（IPreprocessBuildWithReport）—— 自动生成图集并创建 Addressables 条目
2. **构建 Addressables 脚本**（IPostprocessBuildWithReport）—— 构建 Addressables 内容包
3. **延迟绑定运行时加载器**（MonoBehaviour）—— 通过 SpriteAtlasManager 处理按需加载

构建过程将：
- 生成图集（预构建步骤）
- 自动创建可寻址条目
- 构建 addressables 内容包（后处理步骤）
- 运行时：延迟绑定加载器在首次访问精灵时自动加载图集

### 常见分类模式

**按文件夹结构：**
```csharp
GenerateAtlasByFolder("Assets/Art/UI/Buttons", "Assets/Atlases/UI_Buttons.spriteatlasv2");
GenerateAtlasByFolder("Assets/Art/UI/Icons", "Assets/Atlases/UI_Icons.spriteatlasv2");
GenerateAtlasByFolder("Assets/Art/Characters/Player", "Assets/Atlases/Player.spriteatlasv2");
```

**按命名约定：**
```csharp
GenerateAtlasByNaming("Assets/Art", "icon_", "Assets/Atlases/Icons.spriteatlasv2");
GenerateAtlasByNaming("Assets/Art", "bg_", "Assets/Atlases/Backgrounds.spriteatlasv2");
```

### 预构建中的变体生成

为不同分辨率生成变体图集。

## 高级：手动创作（默认之外——仅在明确要求时使用）

> ⚠ **警告**：手动创作**不是**默认方法。仅在用户**明确**要求手动控制或开发期间的编辑器预览时使用这些模式。

> 🚨 **默认方法**：请改用带 `IPreprocessBuildWithReport` 的预构建生成。参见[快速开始](#quick-start-automated-prebuild-generation-default-approach)。

**手动创作仅适用于：**
- 精确位置重要的手工优化精灵布局
- 自定义精灵排序需求
- 创作工作流期间的编辑器预览
- 用户明确要求

**不要使用手动创作的情况：**
- 用户要求 "create sprite atlas"（使用预构建）
- 用户要求 "optimize sprites"（使用预构建）
- 用户要求自动化工作流（使用预构建）
- 未提及特定的手动控制需求

有关完整的手动创作模式，包括主图集创建、变体创建和运行时加载，请参见 [references/manual-authoring.md](references/manual-authoring.md)。

## 关键要求（V2 专用）

1. **🚨 始终先检查现有脚本**：在生成代码之前，扫描带 `[UNITY-SKILL:SPRITEATLAS]` 标识符的脚本并提示用户更新或创建新脚本
2. **🚨 始终标记生成的脚本**：在每个生成的脚本顶部包含技能标识符以便将来检测
3. **🚨 始终询问交付机制**：在生成代码之前询问用户 "Built-in data or Addressables?"
4. **🚨 始终启用 Sprite Packer 模式**：在预构建脚本中设置 `EditorSettings.spritePackerMode = SpritePackerMode.SpriteAtlasV2`
5. **🚨 始终使用预构建生成**：实现 `IPreprocessBuildWithReport` 作为创建图集的默认方法
6. **🚨 只从 Assets/ 文件夹添加精灵**：绝不要从 Packages、内置资产或外部位置添加精灵
7. **🚨 对于 Addressables 交付，始终生成三个脚本**：
   - 带 Addressables 设置的预构建图集生成器
   - 用于构建 Addressables 内容的 `IPostprocessBuildWithReport`
   - 延迟绑定运行时加载器脚本（扩展 `SpriteAtlasManager`）
8. **正确设置 includeInBuild**：内置数据为 `true`，Addressables 为 `false`
9. **两步编辑器模式**：使用 `SpriteAtlasAsset` 创建 → 保存 → 导入 → 通过 `SpriteAtlasImporter` 配置 → SaveAndReimport()
10. **绝不要在编辑器代码中使用 `SpriteAtlas`** —— 除了在已加载的运行时图集上调用 `SpriteAtlas.GetPackables()` 实例方法
11. **变体引用主图集**：使用 `SetMasterAtlas(SpriteAtlas)`，运行时实例通过 `AssetDatabase.LoadAssetAtPath<SpriteAtlas>()` 加载
12. **平台格式分配**：直接使用 `format = TextureImporterFormat.ASTC_6x6`（无需强制转换）
13. **文件扩展名**：V2 图集使用 `.spriteatlasv2`（而非 `.spriteatlas`）
14. **`SpriteAtlasUtility.PackAtlases()` 是可选的**：仅用于编辑器预览；构建时打包是自动的

常见错误和无效模式参见 [references/common-errors.md](references/common-errors.md)。

## 详细参考

- **Addressables 交付**：[references/addressables-delivery.md](references/addressables-delivery.md) —— 使用 Addressables 的完整延迟绑定设置
- **手动创作**：[references/manual-authoring.md](references/manual-authoring.md) —— 手动模式（非默认——仅在明确要求时使用）
- **常见错误**：[references/common-errors.md](references/common-errors.md) —— 无效模式和 API 更正
- **API 参考**：[references/api.md](references/api.md) —— 完整的 V2 类文档
- **自定义打包**：[references/custom-packing.md](references/custom-packing.md) —— `ScriptablePacker` 实现
- **最佳实践**：[references/best-practices.md](references/best-practices.md) —— 优化和常见陷阱

## 命名空间

**编辑器脚本：**
```csharp
using UnityEditor;            // AssetImporter, AssetDatabase
using UnityEditor.U2D;        // SpriteAtlasAsset, SpriteAtlasImporter, SpriteAtlasUtility
using UnityEngine;            // Runtime types (e.g., TextureImporterFormat)
using UnityEngine.U2D;        // SpriteAtlas
```

**运行时脚本：**
```csharp
using UnityEngine;            // Core Unity types
using UnityEngine.U2D;        // SpriteAtlas, SpriteAtlasManager
```
