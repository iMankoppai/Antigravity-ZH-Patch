---
name: asset-transformer-toolkit
description: >-
  使用 Asset Transformer Toolkit（原 Pixyz）导入 3D 模型和点云，并创建、
  编辑和运行 RuleSet、Action 和 LOD。用于 Pixyz 或 Asset Transformer 导入、RuleSet，
  或 ImporterScriptableObject。需要 toolkit 4.0+。
required_packages:
    com.unity.industry.toolkit: ">=4.0.0"
---
### 开始之前：检查包版本
本技能需要 Asset Transformer Toolkit 4.0.0 或更高版本（`com.unity.industry.toolkit`）。更早的版本没有下面每个工作流都依赖的 `ATTAssistantUtilities` API。

1. 从 `Packages/packages-lock.json` 读取 `com.unity.industry.toolkit` 的已解析版本（若没有则回退到 `Packages/manifest.json`）。
2. **未安装：** 告知用户此工作流需要 Asset Transformer Toolkit 4.0 或更高版本，这是一个需要授权的 Unity 包，用户可能需要通过其 Unity 方案获得访问权限，然后停止。不要自行将其添加到 manifest。
3. **已安装但低于 4.0.0：** 告知用户你找到的版本，以及需要 4.0 或更高版本，并在升级前询问。不要回退到旧 API、针对内部类型的原始 C#，或反射。
4. **4.0.0 或更高版本：** 继续。

### API 参考
工具函数由 `Unity.Pixyz.Plugin4Unity.Editor.AI.ATTAssistantUtilities` 提供。它们在各参考文件中与所操作的类一起就地记录。

### 技术说明
Pixyz Plugin 是 Asset Transformer Toolkit 的曾用名。在与用户交流时优先使用术语 “Asset Transformer Toolkit”，除非用户正在使用 “Pixyz” 一词。
大多数类和代码位于 Unity.Pixyz.Plugin4Unity.Editor 程序集中。
Asset Transformer Toolkit 与 Asset Transformer Studio/Pixyz Studio 不是同一个东西。切勿依赖关于 Asset Transformer Studio 的信息。

### 导入器（Importer）
Asset Transformer Toolkit 可以从项目外部导入 3D 文件。
在修改导入器时，切勿假设其后应紧接着重新导入。导入过程可能非常耗时，因此只有在用户请求时才可启动。
使用 ScriptableObject API 修改导入器中的字段。切勿使用反射访问或修改导入器字段——反射不可用。
要为导入文件创建 Pixyz/Asset Transformer Toolkit 导入器，或使用现有 ImporterScriptableObject 重新导入模型，请阅读 [references/create-importer](references/create-importer.md)

### RuleSet 与 Action
阅读 [references/rulesets-and-actions](references/rulesets-and-actions.md)
当需要 RuleSet API 时阅读 [api-docs/ruleset-api](api-docs/ruleset-api.md)。
当需要 Rule API 时阅读 [api-docs/rule-api](api-docs/rule-api.md)。
当需要 RuleBlock API 时阅读 [api-docs/ruleblock-api](api-docs/ruleblock-api.md)，包括用于构造 `RuleBlock` 实例的 `ActionBase.Id`。

### 细节层级（LOD）
阅读 [references/lods](references/lods.md)
