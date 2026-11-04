---
name: sprite-editor
description: 通过生成 C# 脚本编辑 Unity 精灵的矩形、边界、轴心、轮廓和切片。用于用户处理精灵图集或精灵切片时。
modes: [agent, ask]
---

# 精灵编辑器（Sprite Editor）

精灵元数据（矩形、边界、轴心、轮廓）存在于导入器内部，而不在你可编辑的文件中——要访问它意味着通过运行中的编辑器执行 C#。

**`unity-cli` 技能负责带你到达那里**——安装 CLI、确认已连接的编辑器、添加项目的 `com.unity.pipeline` 包、区分真正缺失的编辑器与卡在安全模式中的编辑器，以及发现编辑器的命令目录。先遵循它；不要在这里重新推导任何这些内容。

有两件事它无法替你了解：

- **你特别需要 `script eval`**，而不仅仅是一个可访问的编辑器。确认它出现在目录中——它的存在取决于 Pipeline 包版本，而不是 CLI。
- **切勿手动编辑 `.meta` 文件来更改精灵元数据。** 导入器拥有该数据，下面的能力检查正是为了防止损坏，因此无法访问的编辑器是停止信号，而不是随机应变的提示。

通过 `script eval` 命令在已连接的编辑器中运行 C#。从 `unity command --format json` 发现其参数形态，而不要假设——内联形式为
`unity command script eval --caller plugin --skill sprite-editor --code '<snippet>'`，某些 Pipeline 版本还注册了
`script eval_file` 以便从文件运行代码段。**在动用 `script eval_file` 之前先检查目录；它经常缺失。** `unity command` 默认超时为 30 秒。

生成 C# 编辑器脚本以使用 ISpriteEditorDataProvider 操作 Unity 精灵。适用于 TextureImporter、PSBImporter 和自定义导入器。

### 将 C# 传给 `script eval`

`script eval` 编译的是**语句块，而不是文件**。由此产生两个后果，两者都会导致编译错误而非警告：

- **没有 `using` 指令。** 编译器会将 `using UnityEngine;` 读取为资源释放语句并拒绝它（`CS0210`）。
- **类型必须完全限定。** 裸的 `AssetDatabase` 或 `Volume` 无法解析（`CS0246` / `CS0103`），而裸的 `Object` 会与 `object` 产生歧义（`CS0104`）。

如果下面的代码段是以文件形式编写的——为了可读性带有 using，或因需要保存到项目中——在将其传给 `script eval` 之前请先限定类型。

## 工作流

所有生成的脚本都必须遵循 [references/templates.md](references/templates.md) 中的 Safe Core 模式，其中包含强制性的能力检查。如果能力检查失败，绝不要尝试操作——这可以防止数据损坏。执行后，在 Unity 控制台和 Project 窗口中验证结果。

## 常见操作

**修改名称/矩形/边界/轴心：** 更新相应的 `SpriteRect` 字段（轴心示例见 scripts/SetPivotExample.cs）
- 需要：`EditSpriteName`、`EditSpriteRect`、`EditBorder` 或 `EditPivot`

**添加/移除/切片：** 创建或筛选 `SpriteRect` 数组（Unity 2021.2+ 的要求见 [references/background.md](references/background.md)）
- 需要：`CreateAndDeleteSprite`

**设置轮廓：** 获取 `ISpriteOutlineDataProvider` → 使用 GUID + Vector2 数组调用 `SetOutlines()`

## 重要说明

- 不要使用 AssetPostprocessor 或 MenuItem 模式
- 只生成独立的代码段——不要 `AssetPostprocessor`，不要 `MenuItem`
- **枚举赋值：** 始终使用枚举值并强制转换为数值类型。切勿使用原始数字。
  - ✅ 正确：`(int)SpriteAlignment.Center`
  - ❌ 错误：`1`（魔法数字）
