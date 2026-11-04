---
name: localization
description: 设置并配置 Unity Localization，包括区域设置、String 和 Asset Table 以及 CJK 字体。用于用户要求添加语言、翻译 UI 文本，或提及 i18n 或多语言支持时。
---

本指南涵盖设置和配置 Unity Localization，包括区域设置、String 和 Asset Table、Addressables 集成，以及通过 Asset Table 的 CJK 字体支持。

## 0. 包安装检查
在做任何其他事情之前，验证 Localization 包已安装。如果包不存在，本技能中的许多 API
会静默失败或抛出令人困惑的错误。

1. **通过读取项目而不是询问 Package Manager 来检查。** 在 **`Packages/packages-lock.json`** 中查找
   `com.unity.localization`。该文件记录 Unity
   实际解析的内容，它是纯 JSON，读取它无需编辑器也无需异步调用。
   （`Packages/manifest.json` 只记录*请求*的内容，因此检查锁文件。）
2. **如果缺失则安装：** `UnityEditor.PackageManager.Client.Add("com.unity.localization")`。
3. **正确地等待。** `Client.Add` 和 `Client.List` 是**异步的**：它们返回一个请求，在调用返回时
   仍为 `InProgress`，因此在同一语句中读取结果告诉不了你
   任何东西。也不要在 `IsCompleted` 上忙等；那会阻塞你正在运行的主线程。
   相反，在触发安装后返回，然后**在稍后的调用中轮询 `packages-lock.json`** 直到
   id 出现。安装还会触发域重载，因此预计前一次或两次轮询会
   失败；全新安装通常在几秒内解析。
4. **确认类型实际上已加载**后再使用它们，因为锁文件可能在程序集就绪
   之前就被写入：
   ```csharp
   var t = System.Type.GetType(
       "UnityEngine.Localization.Settings.LocalizationSettings, Unity.Localization");
   return t != null ? "ready" : "not loaded yet";
   ```
   仅在该调用返回 `ready` 后才继续。

## 1. 本地化设置与区域设置
如果 `LocalizationEditorSettings.ActiveLocalizationSettings` 为 null，你必须找到或创建它：
1. **查找：** 使用 `AssetDatabase.FindAssets("t:LocalizationSettings", new[] { "Assets" })`。如果找到，加载第一个并将其赋值给 `LocalizationEditorSettings.ActiveLocalizationSettings`。
   - **始终传入搜索文件夹。** 未限定范围的 `FindAssets` 会搜索整个项目，包括
     只读包，因此它可能返回包中的资产，最终你将项目
     指向你无法编辑的东西。这适用于本技能中的每个 `FindAssets` 调用。
2. **创建：** 如果未找到，创建一个新实例并保存到 `Assets/Localization/LocalizationSettings.asset`。使用 `ScriptableObject.CreateInstance<LocalizationSettings>()` 后跟 `AssetDatabase.CreateAsset()`。
3. **激活：** 设置 `LocalizationEditorSettings.ActiveLocalizationSettings = settings`。
4. **区域设置：** 确保区域设置（en、fr、de 等）存在。如果缺失则创建它们，并使用 `LocalizationEditorSettings.AddLocale(locale)` 将它们添加到设置。

## 2. 修改本地化表
对 String 或 Asset 表的程序化更改需要通知编辑器。
始终创建所需的资产表，除非项目中已有现有的表。

### **安全填充模式**
从数据集填充表时，按 `Locale.Identifier.Code` 显式匹配。`GetLocales()` 的顺序不保证
匹配你的输入数据数组——假设它会匹配将导致静默的数据不匹配，非常难以调试。
对于 **Asset Table**，使用资产的 GUID：`table.GetEntry(sharedId) ?? table.AddEntry(sharedId, guid);`。

### **刷新与通知**
在任何修改（添加键、更新值）之后，通知编辑器以便它刷新其内部状态。跳过此操作将使编辑器显示陈旧数据直到下次重新导入。
1. 对每个修改的 `Table` 调用 `EditorUtility.SetDirty(collection)`、`EditorUtility.SetDirty(collection.SharedData)`。
2. **Unity 6+ 通知：** `LocalizationEditorSettings.EditorEvents.RaiseCollectionModified(sender, collection);`
3. 最后始终调用 `AssetDatabase.SaveAssets()`。

## 3. UI 本地化与布局
### **命名空间与冲突**
- **始终限定名称：** 使用 `UnityEngine.UI.Image`、`UnityEngine.UI.VerticalLayoutGroup`、`UnityEngine.UI.ScrollRect`、`UnityEngine.UI.Mask`、`UnityEngine.UI.CanvasScaler`、`UnityEngine.UI.GraphicRaycaster`、`UnityEngine.UI.ContentSizeFitter`、`UnityEngine.UI.LayoutRebuilder` 等。
- `UnityEngine.UI` 既是命名空间又是类容器，因此未限定的名称会产生 `CS0118`（命名空间被当作类型使用）。完全限定可完全避免这一点。
- **单一实例：** 始终检查 `GameObject.Find("YourCanvasName")` 并在创建新的之前销毁旧的。
- **区域设置切换：使用包，并将预览和运行时分开。** 这是两种
  不同的机制，混淆它们正是区域设置切换经常最终被手写的原因。
  - **在创作时预览区域设置**，使用 **Localization Scene Controls** 窗口
    （`Window > Asset Management > Localization Scene Controls`）。这仅用于编辑器。它不是
    运行时功能，因此当游戏本身需要语言设置时它不是答案。
  - **在运行时切换区域设置**，赋值 `LocalizationSettings.SelectedLocale`。那是
    受支持的入口点，所有通过 `LocalizeStringEvent` 绑定的内容都会从中更新。
  - **固定游戏启动时的区域设置**，在 Localization Settings 资产上配置启动区域设置选择器。
    `SpecificLocaleSelector` 是强制选定区域设置的那个；
    默认链否则会选取系统语言。
  - **绝不要手写区域设置状态。** 真正的游戏内语言菜单是好的且符合预期，只要
    它设置 `SelectedLocale` 并让包传播更改。被禁止的是调试
    下拉菜单或菜单跟踪自己的 "current language" 变量、自己交换字符串或
    绕过包，因为项目中没有其他东西会跟随它。

### **本地化字符串事件（稳健绑定）**
- **检查组件类型：** 识别目标是 `TextMeshPro` 还是旧版 `UnityEngine.UI.Text`。
- **正确绑定：** 添加公开的 `UnityEngine.Localization.Components.LocalizeStringEvent`
  组件并自行接线——将 `StringReference` 设置为表条目，然后添加一个
  `OnUpdateString` 监听器，将值赋给文本组件（TextMeshPro 用 `TMP_Text.text`，
  旧版 Text 用 `UnityEngine.UI.Text.text`）。

  **不要**反射进入 `UnityEditor.Localization.Plugins.TMPro.LocalizeComponent_TMPro` 或其
  UGUI 对应物。它们是 `internal`（在 Localization 1.5.12 上测量），因此访问它们意味着
  绕过访问控制来触及 Unity 不做稳定性承诺的 API——它可以在任何包版本中
  更改或消失。`LocalizeStringEvent` 是公开的，并通过显式接线完成相同的工作。
- **布局重建：** 在设置本地化文本或填充列表后，调用 `UnityEngine.UI.LayoutRebuilder.ForceRebuildLayoutImmediate(parentTransform)` 以确保尺寸更新。

## 4. 亚洲语言字体支持（CJK）
避免为 CJK 区域设置使用 TMP 回退字体。改为为每个特定区域设置使用 **Asset Table 字体交换**——回退在字形缺失时不可靠且难以调试。

### 前提条件：必须导入 TMP Essential Resources

**在触及任何 TMP API 之前检查这个。** 在从未导入它们的项目中，
`TMP_Settings.instance` 为 `null` 且 TMP 调用以裸的
`NullReferenceException` 失败，不指明任何有用的东西。`TMP_FontAsset.CreateFontAsset` 是其中之一，因此
字体创建在第一行就死亡，错误看起来像你代码中的 bug。

```csharp
// The check.
var ready = TMPro.TMP_Settings.instance != null;
```

如果未就绪，**非交互式**导入它们：

```csharp
// Do NOT use EditorApplication.ExecuteMenuItem("Window/TextMeshPro/Import TMP Essential Resources").
// It returns true and then opens a dialog that waits for a human, so nothing gets imported and the
// run appears to hang. Import the package directly instead.
string package = null;
var cache = System.IO.Path.GetFullPath(System.IO.Path.Combine(
    UnityEngine.Application.dataPath, "..", "Library", "PackageCache"));
foreach (var dir in System.IO.Directory.GetDirectories(cache))
{
    // TMP ships inside com.unity.ugui in Unity 6, and the folder name carries a version hash,
    // so search for the file rather than hardcoding a path.
    var candidate = System.IO.Path.Combine(dir, "Package Resources", "TMP Essential Resources.unitypackage");
    if (System.IO.File.Exists(candidate)) { package = candidate; break; }
}
UnityEditor.AssetDatabase.ImportPackage(package, false);   // false = non-interactive
```

然后在**稍后**的调用中轮询 `TMP_Settings.instance != null`，与步骤 0 中的包检查
相同，且仅在其非 null 后继续。在 Unity 6000.5.8f1 上验证：非交互式
导入在几秒内完成，资产落在 `Assets/TextMesh Pro` 中。

1. **使用区域设置特定字体：** 诸如 Arial 或 Liberation Sans 的西方字体不包含 CJK 字形，这导致 "tofu"（方块）。始终使用为目标语言设计的字体：
   - 对于**简体中文（zh-Hans）**：使用 `msyh.ttc`（Microsoft YaHei）或等价物。
   - 对于**日文（ja）**：使用 `msgothic.ttc`（MS Gothic）或等价物。
   - 对于**韩文（ko）**：使用 `malgun.ttf`（Malgun Gothic）或等价物。
   - 如果系统字体复制失败，请停止并报告。不要用西方字体替代。
2. **稳健字体创建：** 从导入的字体创建动态 `TMP_FontAsset`。
3. **多图集与动态：** CJK 字符集对于静态图集来说太大；单个图集将立即耗尽空间。
   - `fontAsset.atlasPopulationMode = AtlasPopulationMode.Dynamic;`
   - `fontAsset.isMultiAtlasTexturesEnabled = true;`
4. **子资产：** 添加图集纹理**以及材质**。仅添加纹理是常见的
   错误，然后材质根本不会到达文件：在 Unity 6000.5.8f1 上测量，未进行第二次调用
   保存的字体资产在磁盘上包含**零**个 `Material` 对象，而带它的包含一个。
   仅存在于内存中的材质不是资产的一部分，因此任何重新加载该资产的东西
   得到的是 TMP 重建的任何内容，而不是你配置的材质，你对其应用的任何设置都会
   静默消失。
    ```csharp
    // Every atlas texture, not just the first. Step 3 enabled multi-atlas, so there may be several.
    foreach (var atlas in fontAsset.atlasTextures)
    {
        UnityEditor.AssetDatabase.AddObjectToAsset(atlas, fontAsset);
    }
    // The material too. Without this line it is not written into the asset.
    UnityEditor.AssetDatabase.AddObjectToAsset(fontAsset.material, fontAsset);
    ```
    - 显式链接材质的纹理：`fontAsset.material.mainTexture = fontAsset.atlasTexture;`
      并在保存前将字体资产、其材质及其纹理标记为脏。（`atlasTexture` 是
      `atlasTextures` 的第一个条目，主材质从中绘制，因此这与上面添加每个纹理
      一致。）
    - **针对文件而非你持有的对象进行验证。** 在
      `AssetDatabase.SaveAssets()` 之后，调用 `AssetDatabase.LoadAllAssetsAtPath(path)` 并确认
      返回的对象中包含一个 `Material`。不要满足于 `fontAsset.material != null`：无论
      材质是否已保存它都保持为 true，因为 TMP 会交回一个内存中的材质，
      因此它无法区分已保存的材质和未保存的材质。
5. **Addressables：** Asset Table 中引用的每个资产都必须标记为 Addressable。
    - 不要在 Asset Table 中引用 `Resources/` 文件夹内的资产。这会导致 `OperationException: Failed to load sub-asset` 错误。如果资产在 `Resources/` 中，请先将其复制到 `Assets/Fonts/` 或类似位置，然后再将其设为 Addressable。
    - 如果字体资产被删除并重新创建，新 GUID 必须在 Asset Table 中手动更新并重新添加到 Addressables。
6. **专用类型：** 对于 TextMesh Pro 字体交换，优先使用 `LocalizedTmpFont` 而非 `LocalizedAsset<TMP_FontAsset>` 以避免隐式转换错误。
7. **构建要求：** 更新 Asset Table 或 Addressable 组后，触发构建：`AddressableAssetSettings.BuildPlayerContent();`。

### **验证步骤**
在结束任何 CJK 本地化任务之前：
1. **豆腐检查：** 将编辑器区域设置切换为 `zh-Hans`、`ja` 和 `ko`。检查 UI。如果任何字符显示为方块（豆腐），字体设置已失败。
2. **Asset Table 检查：** 验证 CJK 区域设置的 `AssetTable` 指向正确的 CJK `TMP_FontAsset`，而不是默认的西方字体。
3. **多图集检查：** 确认 CJK 字体资产上的 `isMultiAtlasTexturesEnabled` 为 `true`。

## 5. 自动布局（UGUI）
- **父对象：** `VerticalLayoutGroup`，`Child Control Height: True`、`Child Force Expand Height: False`。
- **标签：** 每个标签必须有一个设置为 `Vertical Fit: Preferred Size` 的 `ContentSizeFitter`。
- **TMP：** 设置 `Enable Word Wrapping: True` 和 `Overflow: Overflow`。

### 翻译现有项目时的注意事项
- **最小代码更改**：绝不要修改与本地化无关的代码。使用静态辅助类（例如 `L10n`）包装 `LocalizationSettings.StringDatabase.GetLocalizedString`，以便轻松注入现有脚本。
- **稳健映射策略**：将现有 UI 文本映射到键时，按键的字符串长度（降序）排序并先匹配最长的字符串。这防止短字符串（如 "NO"）匹配较长句子的部分。在适当处使用不区分大小写的匹配。
- **组件事件监听器**：用
  `UnityEventTools.AddPersistentListener` 接线 `LocalizeStringEvent.OnUpdateString`，传入基于文本组件公开的
  `text` setter 构建的委托。该 setter 没有 C# 方法组名称，因此按名称构建委托：
  `(UnityAction<string>)Delegate.CreateDelegate(typeof(UnityAction<string>), text, "set_text")`。
  这是对**公开**成员的反射，没问题。关于可用版本，参见
  [resources/L10nBatchProcessor.cs](resources/L10nBatchProcessor.cs)，包括先清除任何现有的持久监听器，以便重复运行不会堆叠重复项。
  - **不要**通过 `SerializedObject` 直接写入持久调用字段（`m_MethodName`、
    `m_Mode`、`m_PersistentCalls`）。那些是没有兼容性
    保证的私有序列化名称，而且没有必要：使用上面的委托 `AddPersistentListener` 会产生
    相同的序列化调用（target = 文本组件，method = `set_text`，mode = `EventDefined`）。
  - **然后你必须设置调用状态，否则标签在编辑器中不会更新。**
    `AddPersistentListener` 将调用留在 `UnityEventCallState.RuntimeOnly`，因此绑定是
    正确的但在 Play 模式外处于休眠状态：在编辑器中切换区域设置什么都不改变，且它
    在保存和重新加载后仍保持那样。用公开的
    `UnityEventBase.SetPersistentListenerState` 修复它：
    ```csharp
    UnityEventTools.AddPersistentListener(lse.OnUpdateString, setText);
    var index = lse.OnUpdateString.GetPersistentEventCount() - 1;
    lse.OnUpdateString.SetPersistentListenerState(
        index, UnityEngine.Events.UnityEventCallState.EditorAndRuntime);
    ```
    在 Unity 6000.5.8f1 上验证：没有第二次调用，监听器即使在预制体保存和重新加载后
    也不会在 Edit 模式触发；有了它，调用状态变为 `EditorAndRuntime` 且
    文本立即更新。
  - 持久监听器**必须**指向 `UnityEngine.Object` 上的方法；lambda 将失败。
  - **然后确认绑定是活动的，不要假设。** 在 Inspector 中看起来正确
    但什么都不做的接线是此步骤的特征性失败。你需要的所有回读都是事件上的
    公开 API，因此这一切都不需要触及序列化字段：

    | 检查 | 调用 | 期望 |
    |---|---|---|
    | 有东西被接线了 | `GetPersistentEventCount()` | `> 0` |
    | 它指向文本组件 | `GetPersistentTarget(i)`、`GetPersistentMethodName(i)` | 该组件、`set_text` |
    | 它将在创作时触发 | `GetPersistentListenerState(i)` | `EditorAndRuntime` |
    | 它实际更新标签 | `lEvent.RefreshString()` | 文本值改变 |

    全部四项都要做。计数大于零只证明有东西被接线了，而 `RuntimeOnly` 调用在
    最后一项检查中失败，同时对构建完全正确，因此读取状态是区分
    休眠绑定和损坏绑定的方法。一个被添加并配置但从不
    触发的组件比未本地化的标签更糟，因为它读起来像是完成。
- **初始化与刷新**：
    - `LocalizationEditorSettings.CreateStringTableCollection` 期望**目录路径**（例如 `Assets/Localization`），而不是完整资产路径。
    - 在以编程方式赋值 `LocalizedString` 引用后始终调用 `lEvent.RefreshString()` 以立即更新 UI。
    - 键必须在集合的**每个表**（en、de、ja、……）中具有**非空值**。存在但值为空
      的键是常见缺口，而且它不是静默的：包会将它自己的 "No translation found for …" 文本
      **打印到游戏 UI 中**，因此发布的屏幕显示开发者消息。不要对此用肉眼检查。运行下面的完整性检查。
- **命名空间与 Linq**：搜索集合时始终包含 `using System.Linq;`，处理区域设置或表时包含 `using UnityEngine.Localization;`。
- **验证**：修改表或 addressables 后，运行 `AddressableAssetSettings.BuildPlayerContent()` 并将编辑器区域设置切换以验证更改。激活后检查 `LocalizationSettings.Instance` 状态。

### 表完整性检查（在声明工作完成之前运行此检查）

枚举表以机械方式回答 "每个键在每个区域设置中是否都获得了值"，因此缺失的
条目会在任何人玩这个游戏之前被发现。运行它并报告输出。

```csharp
var gaps = new System.Collections.Generic.List<string>();
var checkedCount = 0;

foreach (var col in UnityEditor.Localization.LocalizationEditorSettings.GetStringTableCollections())
{
    foreach (var key in col.SharedData.Entries)
    {
        foreach (var table in col.StringTables)
        {
            checkedCount++;
            var entry = table.GetEntry(key.Id);
            // A missing entry and a present-but-empty entry both show as untranslated in game.
            if (entry == null || string.IsNullOrWhiteSpace(entry.Value))
            {
                gaps.Add($"{col.TableCollectionName} / {table.LocaleIdentifier.Code} / {key.Key}");
            }
        }
    }
}

// Zero entries is not a pass. It means no collections or no locales were found, so the check
// examined nothing: report that distinctly instead of letting it read as success.
if (checkedCount == 0)
{
    return "INCONCLUSIVE: no table entries found. Either no String Table Collection exists yet, "
         + "or the collection has no locale tables. Fix that before trusting this check.";
}

return gaps.Count == 0
    ? $"COMPLETE: {checkedCount} entries checked, no gaps"
    : $"GAPS ({gaps.Count} of {checkedCount} checked):\n  " + string.Join("\n  ", gaps);
```

在 Unity 6000.5.8f1 上针对一个故意清空了一个 `ja` 值的表验证：它报告
`GAPS 1 of 4` 并确切命名该条目，填充值后为 `COMPLETE (4 checked)`，在没有表的项目中为
`INCONCLUSIVE`。

**报告缺口列表而不是静默解决它。** 有些缺口是决策，不是错误：一个
你未被要求翻译的区域设置，或一个跨语言有意相同的键。
用英文文本填充它们会隐藏该决策。列出它们并让用户说明哪些是
有意的。
- **Smart Strings**：在需要处设置智能字符串。通过将字符串所在的整个 UI 以及任何影响它的脚本
  纳入考量的方式，检查每个字符串的上下文。在字符串表上设置上下文以确保翻译合理。

## 6. 推荐的翻译策略
要高效地翻译现有项目，请遵循此多步工作流：

1. **提取与组件设置：**
   - **查找所有出现。有两个独立的隐藏位置，扫描一个会遗漏另一个。**
     - **编写的文本**位于场景和预制体中的组件上：旧版 `UnityEngine.UI.Text` 和
       TextMeshPro（`TMP_Text`，`TextMeshProUGUI` 和 `TextMeshPro` 的基类）。遍历**两个**
       家族。在真实项目上测量：`FindObjectsByType<Text>` 找到 1 个组件，而
       `FindObjectsByType<TMP_Text>` 找到 13 个，因此仅旧版的遍历在几乎什么都没做的情况下报告成功。
     - **在代码中组合的文本**在编辑时从不出现在组件上，因此任何场景遍历都无法看到
       它。`scoreLabel.text = $"EXP {value}"` 对每个基于组件的扫描都不可见，并且是
       在 "finished" 本地化遍历中幸存下来的字符串。改为在 C# 中查找它：
       ```bash
       # Assignments and SetText calls that carry a string literal.
       grep -rnE '\.text\s*(=|\+=)\s*\$?"|SetText\(\s*\$?"' --include='*.cs' Assets/
       ```
       该模式捕获普通、插值、连接和 `+=` 形式加上 `SetText`，并
       刻意不匹配 `label.text = someVariable` 或 `label.text = Localize("KEY")`
       （前者无可提取，后者已路由）。它的盲点是保存在别处声明的变量或 const 中的字面量；
       如果项目的计数看起来偏低，也 grep 该文件的字符串字面量。
   - **报告你没有转换的内容。** 组合字符串通常需要智能字符串或格式
     参数，这是一个判断决定，有些确实不值得本地化。无论你
     选择哪个，列出扫描发现的每个位置以及是否转换了，以及如果未转换为何未转换。
     报告 "localized 24 strings" 而九个发现的位置未处理正是此列表存在所要防止的
     失败模式：工作看起来完成了，缺口只在另一个区域设置的截图
     中浮现。
   - **共享表：** 创建一个中心 String Table（例如 `UIStrings`），包含基础语言和每个键的 "Context" 列以指导译者。
   - **附加组件：** 对找到的每个 UI 元素，附加 `LocalizeStringEvent`（用于文本）和 `LocalizedFont` 辅助程序（用于字体交换）。
   - **验证：** 确保这些组件用持久监听器（`EditorAndRuntime`）设置，以便区域设置更改时它们在编辑器中立即更新。

2. **上下文感知翻译：**
   - **翻译：** 一旦表被填充，为每个区域设置提供翻译。
   - **上下文为王：** 始终参考 "Context" 列或检查 UI 布局以确保翻译符合预期含义和空间。
   - **语法与语气：** 确保语气匹配游戏风格。例如，按钮使用祈使动词（例如德语："Lauf!" 而非 "Laufen"），标签使用正确的复数（例如 "Punkte" 而非 "Punkt"）。

3. **质量保证（QA）：**
   - **Scene Controls：** 使用 `Window > Asset Management > Localization Scene Controls` 或脚本：`LocalizationSettings.SelectedLocale = LocalizationSettings.AvailableLocales.GetLocale("de");`。
   - **视觉检查：** 有条不紊地检查基础语言和所有目标语言中的每个预制体和场景。
   - **布局适配：** 检查文本溢出或 "tofu"（缺失字形）。如果字符串太长，调整字体大小或使用 `ContentSizeFitter`。


## API 参考
有关详细 API 用法、常见命名空间冲突、Addressables 模式和字体修复步骤，请参见 [references/api-notes.md](references/api-notes.md)。

## 7. 加速本地化工作流
要高效地本地化整个项目，使用批处理脚本一次处理所有场景。

**行动前询问：** 在运行任何批处理操作之前，与用户确认：
> "This will open every scene in the project, attach `LocalizeStringEvent` components, and save all modified scenes. This cannot be undone automatically. Shall I proceed?"

仅在用户确认后继续。批处理器模板在 [resources/L10nBatchProcessor.cs](resources/L10nBatchProcessor.cs) 中。

`LocalizeAll` 自身也强制执行这一点，因此在改编模板时不要移除或绕过这些检查：它拒绝在批处理模式下运行，提示用户保存或丢弃未保存的场景更改，并显示一个列出它将重写哪些场景的阻塞式编辑器对话框。告诉用户观察编辑器并单击确认按钮；如果他们取消，它抛出 `OperationCanceledException` 且什么都不写。将此报告为取消，而不是要设法绕过的错误。

它遍历**两个** `Text` 和 `TMP_Text`，且 `LocalizeAll` **返回它无法匹配的标签**
（作为 `scene :: object :: "text"`）。打印该列表。这就是返回值的全部意义：一次
接线 20 个标签并静默留下 9 个的运行，否则看起来与完整的运行完全相同。该
列表仅涵盖编写的文本，因此将其与第 6 节的代码扫描和第 5 节的表完整性
检查配合使用。

### **速度技术提示**
- **表引用：** 使用 `TableReference` 名称（字符串）而非 GUID——它们更易读和维护。
- **批量刷新：** 修改后使用 `LocalizationSettings.Instance.ForceRefresh()` 强制 UI 在编辑器中更新。
- **字体交换自动化：** 创建一次 `GameAssets` 表并使用脚本一次为所有标签重新分配 `LocalizeFontEvent`。
- **LocalizedFontAsset 组件：** 模板在 [resources/LocalizedFontAsset.cs](resources/LocalizedFontAsset.cs) 中。
