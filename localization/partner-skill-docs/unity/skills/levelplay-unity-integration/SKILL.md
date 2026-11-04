---
name: levelplay-unity-integration
description: 通过 Ads Mediation 包集成 LevelPlay 广告中介 SDK。用于用户询问添加激励、插页或横幅广告、中介或广告隐私设置、Android 或 iOS 广告依赖构建失败，或从 Unity Ads 或 IronSource API 迁移时。
---

# LevelPlay Unity 包/SDK 集成

将编辑器端的检查建立在真实项目而非假设之上——读取项目文件，或请用户在编辑器中确认。本技能中生成的 C# 脚本是供用户保存到其项目的 MonoBehaviour 文件，而非用于内联执行。

本技能仅涵盖 LevelPlay 集成路径；不涵盖其他中介 SDK。如果用户明确询问替代方案，请承认替代方案的存在并指向那些供应商自己的文档——不要描述、刻画或对竞争对手产品做出声明。

遵循这些步骤，只提供本技能所述的文件和配置。不要主动添加步骤、创建文件或基于一般知识提出建议。如果用户提出本技能范围之外的问题，请先检查技能和参考文件以确认它未被涵盖。如果未涵盖，使用一般知识回答，但不要因此将额外步骤或文件纳入集成工作流。

按顺序、一次一步地遵循集成工作流。只询问当前步骤的问题——不要提前收集后续步骤的信息。在每个检查点等待用户回应后再继续。

LevelPlay 是 Unity 的广告中介平台：它同时将你的游戏连接到多个广告网络，并在多个广告网络和竞价方之间运行统一拍卖，以最大化每次展示的竞争。本指南带你完成完整集成：安装 SDK、为 Android 和 iOS 配置依赖、在项目中初始化 LevelPlay，以及实现激励、插页和横幅广告。如果你已经设置好了其中一部分，可以跳到相关步骤。

**本 SKILL.md 是工作流骨干。它保留决策、检查点和确切的问题；较长的代码、完整的 API 细节和边缘情况位于 `references/` 中并从相关步骤链接。到达该步骤时阅读链接的参考——不要改用一般知识回答。**

## 集成工作流

### 0. 新集成还是迁移？

询问："Are you starting a new LevelPlay integration, migrating an existing one (from an older SDK version or from Unity Ads), or troubleshooting an existing setup?"

- **新集成**：继续到第 1 步。
- **迁移**（SDK 升级、替换 IronSource.Agent API、从 Unity Ads 迁移，或修复 Maven Central Android 构建失败）：阅读 `references/migration-sdk-9.md`。询问五种场景中适用哪一种——A = SDK 升级，B = 初始化 API 迁移，C = 广告单元 API 迁移，D = Maven Central 构建失败，E = Unity Ads 迁移——然后遵循匹配的场景。应用所有代码更改后，完成迁移完整性清单（参考的第 C5 节）——它捕获逐行翻译会遗漏的需求，因为旧版代码没有等价行。然后请用户检查 Unity 控制台是否有编译错误，并在呈现结果之前修复出现的任何错误。如果你看不到控制台，不要阻塞或不断重试：列出你更改的文件，说明要查找什么，然后继续。
- **故障排除或添加到现有设置**（ATT、GDPR、ILRD、Test Suite、全新集成上的构建错误，或向已工作的集成添加功能）：确定用户需要什么，并直接从 "When to Read Detailed References" 转到相关步骤或参考。

### 1. 验证 Unity 环境

通过验证 Assets/ 和 ProjectSettings/ 目录存在，检查用户是否在 Unity 项目中工作。如果不在 Unity 项目中，请指导用户导航到其 Unity 项目目录。如果那些目录未找到但用户认为他们在正确的位置，请询问："It looks like you may not be at your project root — can you navigate to the top-level folder of your Unity project and confirm you can see Assets/ and ProjectSettings/ there?"

### 2. 了解业务目标

在实现广告单元之前，确定用户的优化优先级，以推荐适当的广告单元策略。询问：

**"What's your primary optimization goal?"**
- **Revenue-focused**：最大化广告收入和展示机会
- **UX-focused**：优先考虑玩法流程和用户满意度  
- **Balanced**：同时优化收入和 UX
- **Not sure yet**：默认使用 Balanced 并继续。在第 8 步，简要说明由于他们不确定你使用了 Balanced，并邀请他们在看到格式选项后现在表明不同的偏好。

记录此答案以供第 8 步的策略推荐。

### 3. 通过 UPM 安装 LevelPlay SDK

**如果 SDK 看起来已安装：** 不要轻信，也不要让用户替你读 Package Manager
窗口。读取 `Packages/packages-lock.json` 并查找 `com.unity.services.levelplay`。如果它在那里，说明解析到哪个版本并继续到第 4 步。
如果不在，则它未安装，无论目前对话假设了什么：继续下面的安装。

指导通过 Unity Package Manager 安装 LevelPlay Unity 包：

1. 打开 Unity → Window > Package Manager
2. 选择 Unity Registry 下拉菜单或 Services 标签
3. 在 Package Manager 搜索栏中，输入 **Ads Mediation**
4. 确认包名称完全匹配：正确的包标题为 **Ads Mediation**。不要安装以下任一包：
   - **Ads IAP Mediation Adaptor**（单独的应用内购买包，不是 LevelPlay SDK）
   - **Advertisement Legacy**（已弃用的包，与当前 LevelPlay 集成不兼容）
5. 单击 Install 按钮
6. 等待包下载并导入

安装包时，你可能会看到安装 Mobile Dependency Resolver 的提示——如果出现，单击 **Import**。下一步会对此进行更详细的介绍。

**然后通过读取项目而不是询问来验证它已解析。** 包 id 是
`com.unity.services.levelplay`（其 Package Manager 显示名是 **Ads Mediation**；id 是
项目文件记录的内容）。检查两个文件：

- **`Packages/manifest.json`** 列出项目*请求*的内容。`com.unity.services.levelplay`
  必须出现在 `dependencies` 下。
- **`Packages/packages-lock.json`** 记录 Unity 实际*解析*的内容。同一个 id 也必须出现在
  这里，并带有具体版本。这是回答 "did it install" 的文件，也是要信任的
  那个。

两者都是项目中的纯 JSON，因此此检查不需要编辑器、CLI，也不需要用户的任何东西。读取它们。

> **这是硬性关卡，不是形式。** 在 `com.unity.services.levelplay` 出现于 `packages-lock.json` 之前，不要编写、生成或粘贴一行
> LevelPlay 代码。跳过
> 会产生看起来正确、哪里都不编译、并在每个
> LevelPlay 符号上以 `CS0246` 失败的代码。如果 id 在 `manifest.json` 中缺失，安装从未发生。如果它在
> `manifest.json` 中但不在 `packages-lock.json` 中，Unity 尚未解析它：编辑器可能
> 仍在导入，或解析失败。说明你找到的是两者中的哪一个，并停止。
>
> **如果你自己将 id 添加到 `manifest.json` 且此后没有编辑器运行，锁文件将
> 不会显示它。这是预期行为，不是失败。** 绝不要自己将条目写入
> `packages-lock.json`：该文件是 Unity 的解析输出，手动编辑它是迁移指南
> 所禁止的，而你写入的条目是假的 "resolved" 信号，而不是通过的
> 关卡。请用户打开 Unity 编辑器以便解析运行，然后重新读取文件。如果根本
> 没有可用的编辑器，请说明并在那里停止，而不是制造证据。

报告你找到的已解析版本。不要凭 Package
Manager 窗口、之前的回合或用户的回忆来报告 "installed"。

**Network Manager：** 随时访问 **Ads Mediation > Network Manager** 以安装额外的广告网络适配器并检查 SDK 和适配器更新。

对于 iOS 构建，注意稍后需要 SKAdNetwork 配置（准备好进行 iOS 构建时参考 `references/ios-setup.md`）。

### 4. 解析原生依赖（关键）

**对 Android/iOS 构建至关重要**：LevelPlay 需要原生依赖解析。没有它，代码在 Unity 编辑器中编译但会在平台构建期间因 gradle（Android）或 CocoaPods（iOS）错误而失败。

**平台检查点——继续之前询问：** "Which platform(s) are you targeting — iOS, Android, or both?" 记录此信息。它决定此处适用哪些依赖解析步骤、是否需要 ATT（第 6.5 步），以及哪些测试步骤相关（第 10 步）。

**现在设置活动构建目标。** 通过 **File ▸ Build Profiles**（Unity 6 之前称为 **Build Settings**）→ **Switch Platform** 将项目的活动构建目标切换为 Android 或 iOS。这在进行任何测试之前都是必需的：LevelPlay 仅在 Android/iOS 目标上运行，因此即使在编辑器中使用模拟广告（第 10 步），在目标为 Standalone/PC/Mac 时也什么都不做。

**为目标平台解析依赖。** LevelPlay 需要 Unity 包管理器单独无法处理的原生 Android/iOS 库；依赖管理器（MDR、UEDM 或 EDM4U）弥合这一差距。完整过程——检查现有依赖管理器、在 Android vs iOS 上解析、如果用户没有则安装一个、验证，以及较旧版本的 Custom Main Gradle Template——见 **`references/dependency-resolution.md`**。现在引导用户完成它，**如果同时面向 Android 和 iOS，在继续之前为两者都完成解析。**

询问："Have you run dependency resolution for your target platform(s) without errors?"

**Android API 33+（Android 13+）：** 在 AndroidManifest.xml 中声明 AD_ID 权限：

```xml
<uses-permission android:name="com.google.android.gms.permission.AD_ID"/>
```

没有它，广告 ID 访问在 Android 13+ 设备上会失败。详情见 `references/dependency-resolution.md`。

**如果依赖解析失败**，请参见 `references/troubleshooting.md` 获取 gradle 和 CocoaPods 错误指导。

### 5. 获取 App Key 和广告单元 ID

在初始化 LevelPlay 之前，从 LevelPlay 仪表板收集凭据。

**仪表板：** https://platform.ironsrc.com/

**LevelPlay 新手？** 先设置你的应用和广告单元：
- [Add your app](https://docs.unity.com/en-us/grow/levelplay/platform/get-started/add-app)
- [Create ad units](https://docs.unity.com/en-us/grow/levelplay/platform/get-started/ad-units)

**App Key：** 在仪表板中，转到左侧导航中的 **Apps** → 找到你的应用 → 复制应用标题下显示的字母数字字符串。

**广告单元 ID：** 转到左侧导航中的 **Ad units** → 选择你的应用 → 为你计划实现的每种格式（Rewarded、Interstitial、Banner）复制 ID。

**注意：** 你现在需要 App Key 进行初始化（第 7 步）。广告单元 ID 仅在步骤 9 需要——如果你尚未决定要实现哪些广告格式，现在只复制 App Key，在第 8 步之后回到这里。

保持两者可访问——你将在后续步骤中需要它们。

### 6. 配置 AdMob 密钥（如果使用 AdMob 网络）

**何时使用**：仅当在 LevelPlay 中使用 AdMob 作为中介网络适配器时。

如果使用 AdMob，在 Unity 编辑器中配置平台特定的应用密钥：

**访问**：Ads Mediation > Developer Settings > LevelPlay Mediation Settings

**配置：**
- **Android App Key**：AdMob Android 应用密钥
- **iOS App Key**：AdMob iOS 应用密钥

此配置是 AdMob 作为 LevelPlay 中的中介网络工作所必需的。

**故障排除**：如果你在 Unity 编辑器中看不到 'Ads Mediation' 菜单，请验证 Ads Mediation 包已安装（第 3 步）并重启 Unity 编辑器。

### 6.5. 隐私与法规设置（如需要）

> **注意：** 本技能提供技术集成指导，包括 LevelPlay 的隐私 API。它不是法律建议，也不决定哪些法律适用于你的应用——那取决于你的用户、你的数据实践和你的分发方式。请咨询你自己的法律顾问，并参考 [Regulation Advanced Settings for Unity](https://docs.unity.com/en-us/grow/levelplay/sdk/unity/regulation-advanced-settings) 获取权威的 LevelPlay 文档。

询问用户："Do you need to configure privacy settings for GDPR, CCPA/CPRA (or certain state privacy consumer acts), or for child-directed apps?"

**如果任一为是：**

隐私设置必须在 SDK 初始化**之前**配置。完整实现指南（UI、同意管理、组合法规和完整网络密钥列表）见 `references/privacy-settings.md`。

**GDPR —— 正确的 API 取决于用户的 SDK 版本**（在 **Ads Mediation > Network Manager** 中检查）：

**SDK 9.5.0+** —— 全局同意布尔值：
```csharp
using Unity.Services.LevelPlay;

// true = user has granted consent, false = user has not consented
LevelPlayPrivacySettings.SetGDPRConsent(true);
```

**SDK 9.4.x** —— 按网络同意字典（这是 9.4.x 上的当前 API，不是旧版——它仅在 9.5.0+ 上变为 `[Obsolete]`；不要将其误标为已弃用）：
```csharp
using Unity.Services.LevelPlay;
using System.Collections.Generic;

// Add an entry for each ad network you have installed
LevelPlayPrivacySettings.SetGDPRConsents(new Dictionary<string, bool> {
    { "UnityAds", true },
    { "IronSource", true }
    // See references/privacy-settings.md for the full network key list
});
```

如果两个 API 都不编译，你的 Unity 包/SDK 可能低于 9.4.0（旧版）——建议通过 **Ads Mediation > Network Manager** 升级。如果用户无法升级，旧版 `LevelPlay.SetConsent(bool)` API 记录在 `references/privacy-settings.md` 中。

**CCPA（SDK 9.4.0+）：**
```csharp
LevelPlayPrivacySettings.SetCCPA(true); // User opted out of data sale
```

**COPPA（SDK 9.4.0+）：**
```csharp
LevelPlayPrivacySettings.SetCOPPA(true); // Child-directed app
```

如果 CCPA 或 COPPA 编译失败，请通过 **Ads Mediation > Network Manager** 升级你的 Unity 包/SDK。在步骤 7 的 `LevelPlay.Init()` 之前调用所有这些。

**对于 iOS 构建——无论上述隐私法规如何都必需：** 在继续到步骤 7 之前还要实现应用跟踪透明度（ATT）。Apple 要求在你的应用跟踪用户或访问 iOS 14.5+ 上设备的广告标识符之前获得 ATT 授权。在调用 `LevelPlay.Init()` 之前请求 ATT 授权——这既是 Apple 平台要求，也是个性化广告所必需的（这也影响填充率）。ATT 实现代码见 `references/ios-setup.md`。

**如果没有隐私法规且不面向 iOS：** 跳过此步骤并继续到步骤 7。

### 7. 初始化 LevelPlay SDK

**安装检查点：**

**首先，重新读取 `Packages/packages-lock.json` 并确认 `com.unity.services.levelplay` 在那里。**
每次到达此点都这样做，即使第 3 步在对话早前已通过。
它花费一次文件读取，且这是你无需用户就能确定的唯一项目。早前
回合说包已安装并不是证据：此检查存在是因为
安装步骤是最常被跳过的，而生成的代码在每个
LevelPlay 符号上以 `CS0246` 失败。如果 id 缺失，请返回第 3 步且不要编写初始化代码。

然后与用户确认其余前提条件，这些是任何文件都无法回答的。
**如果用户确认他们不使用 AdMob，省略步骤 6 项。** 如果第 4 步在本
对话中已确认，跳过该项并只询问步骤 5 和步骤 6（如果使用 AdMob）。

"Please confirm these are working correctly:
- Step 4: Have you run dependency resolution for your target platform(s) without errors?
- Step 5: Do you have your App Key copied from the LevelPlay dashboard?
- Step 6 (only if using AdMob): Have you configured AdMob keys in Unity Editor settings?

Verify these are working before proceeding."

**如果包检查失败或他们回答否或不确定：**
- 包 id 不在 `packages-lock.json` 中：代码将显示 `CS0246` 命名空间错误 → 直接到第 3 步。这是你自己确定的；不要请用户推翻它。
- 缺少第 4 步：代码编译但 Android/iOS 构建将失败 → 直接到第 4 步
- 缺少第 5 步：他们将没有凭据进行初始化 → 直接到第 5 步
- 在他们确认所有步骤完成之前不要提供 C# 代码

**如果他们回答是：**
- **可选——分析：ILRD 接线。** 逐字询问此问题——不要总结或改写："Do you use an analytics or attribution platform (Firebase, AppsFlyer, Adjust, Singular, or custom backend) that needs ad revenue data? If yes, the init script will include a logging stub for Impression Level Revenue (ILRD) — 3 lines of code, no analytics platform setup required yet. (Yes / No / Not sure — defaults to yes)" 记录答案。
- 继续初始化代码。

LevelPlay SDK 必须在加载或显示任何广告之前初始化。初始化应在应用程序生命周期的早期发生。

**询问他们希望如何处理初始化。完全按所列呈现所有四个选项——不要精简或省略任何：**
1. 为 LevelPlay 初始化创建一个新的专用脚本
2. 添加到他们已有的现有初始化/管理器脚本
3. 创建一个新的 LevelPlay 脚本，由你现有的管理器引用
4. 只向我展示初始化代码——我会决定如何集成它

**每个选项的完整代码在 `references/initialization-api.md`（Code Organization Options）中。** 不得改变的行为：
- **选项 1（新脚本）：** 如果第 6.5 步（iOS）设置了 ATT，请使用 `references/ios-setup.md` 第 3 部分中的 `LevelPlayInitializer.cs`（`IEnumerator Start()` 协程变体）而不是普通模板。
- **选项 4（仅代码）：** 将完整的选项 1 初始化类作为独立代码段提供——不要创建文件或添加 Inspector/GameObject 设置步骤——并附上说明："save it as `LevelPlayInitializer.cs`, attach it to a persistent GameObject in your first scene, and set the App Key field in the Inspector."

**ILRD 接线（如果用户回答 Yes 或 Not Sure）。** 正确的方法取决于 SDK 版本（在 **Ads Mediation > Network Manager** 中检查）：
- **SDK 9.5.0+（当前）：** 初始化器不添加任何内容——ILRD 通过 `OnAdImpressionDataReady` 按广告实例交付，在步骤 9 创建每个广告时接线。全局 `LevelPlay.OnImpressionDataReady` 事件在 **9.5.0+ 上已弃用并产生编译器警告**——不要使用它。
- **SDK 9.4.x 及更早：** 在 `LevelPlay.Init()` **之前**订阅全局 `LevelPlay.OnImpressionDataReady` 事件，添加日志存根，并在 `OnDestroy()` 中取消订阅。在 iOS 协程初始化器上，将订阅放在 `InitializeLevelPlay()` 内紧接 `LevelPlay.Init(appKey)` 之前。

每个选项的确切接线代码（包括 iOS 协程放置）在 `references/initialization-api.md`（Version-Aware ILRD Init Wiring）中。ILRD 回调不会随模拟广告触发——需要设备构建来验证（参见第 10 步）。有关高级选项（用户 ID、分段、同意管理），请参见 `references/initialization-api.md`。

### 8. 推荐广告单元策略

根据第 2 步确定的优化目标，推荐广告单元策略。

**回忆第 2 步中用户的优化目标。** 如果对话很长或答案不清楚，请确认："Earlier you mentioned your optimization goal. To confirm, are you primarily focused on revenue, user experience, or a balance of both?"

**将答案映射到策略**并给出简要建议（完整细节、基准和放置指导见 `references/best-practices.md` 中的 "Ad Format Strategy by Goal"）：

- **以收入为中心** → **收入策略。** 激励（主要变现，多个高价值时刻）→ 插页（次要；在过渡处；频次上限 3–5 分钟）→ 横幅（玩法期间持续）。竞价底线是可选收入杠杆，在步骤 9 配置。实现优先级：**激励 → 插页 → 横幅**。
- **以 UX 为中心** → **UX 策略。** 仅激励，用户发起（显式选择加入），高价值奖励，**绝不强制广告**。插页可选/仅在会话边界偶尔使用；横幅通常避免或仅菜单。实现优先级：**仅激励，或激励 →（可选）插页**。
- **平衡** → **平衡策略。** 激励（2–3 个战略放置）→ 插页（适度；自然断点；频次上限 5–7 分钟）→ 横幅（选择性；菜单/低注意力）。实现优先级：**激励 → 插页 → 横幅（选择性）**。
- **"Not sure yet"**（来自第 2 步）→ 使用**平衡策略**，然后补充："Since you weren't sure of your goal earlier, I've gone with the Balanced approach — if you'd prefer to lean more toward revenue or user experience now that you've seen the options, just say so."
- 如果仍不清楚，询问："Would you prioritize revenue, user experience, or a balance of both?"

下一步询问从此优先级列表中实现哪些广告格式。如果用户想要与建议不同的顺序，请配合该偏好。

### 9. 实现广告单元

**先阅读 `references/best-practices.md`**——其 "Code Generation Guidelines (Step 9)" 部分包含一般广告生命周期、按组织方式的代码生成规则、始终包含的要求（MonoBehaviour、`OnDestroy()` 中的 `DestroyAd()`、放置上限的显示路径检查（使用放置时）、事件取消订阅、null 检查、错误处理），以及竞价底线接线示例。将这些模式纳入所有广告实现。

**实现检查点：**

"Before providing ad implementation code, please confirm:
- Did you complete SDK initialization in Step 7?
- Did you receive the 'LevelPlay SDK initialized successfully' log message in your Unity console?

Verify initialization is working before proceeding with ad units."

**如果他们回答否或不确定：** 直接回到步骤 7 并在初始化确认工作之前不要提供广告实现代码。

**广告格式检查点——在生成任何代码之前询问：** "Which ad formats do you want to implement? Rewarded, Interstitial, Banner, or a combination?" 只实现用户选择的格式。他们可以稍后使用 'Adding More Ad Formats Later' 部分添加更多格式。

**首先，询问用户希望如何组织广告代码。在他们回答之前不要生成任何代码：**

"How would you like to structure your ad implementation?"

1. **为每种广告格式单独的 manager 脚本** - 创建单独脚本，如 `RewardedAdManager.cs`、`InterstitialAdManager.cs`、`BannerAdManager.cs`（适合较大项目，清晰的关注点分离）

2. **一个统一的 AdManager 脚本** - 创建单个 `AdManager.cs` 处理所有广告格式（更简单，一切都在一处）

3. **只向我展示代码片段** - 提供实现代码而不将其包装在特定文件中，以便你可以按自己偏好的方式集成

4. **我已经有广告管理器代码** - 审查并帮助修复/更新现有实现

根据他们的回答，相应调整你的回应（参见 `references/best-practices.md` 中的代码生成指南）。

**如果用户已有广告代码（例如现有管理器脚本），在生成任何代码之前请求查看它**——这样你可以提供针对性修复，而不是从头开始的新代码。这适用于他们选择的任何组织选项（选项 4 专门用于审查现有代码，但每当用户提到他们已有某些代码时，同样的 "先给我看你的代码" 都适用）。

**然后呈现可选的竞价底线功能（选项 4 跳过——改为审查现有代码）：**

仅为此会话中用户正在实现的格式呈现竞价底线范围。参考起始范围：激励：$0.50–$2.00 | 插页：$0.20–$1.00 | 横幅：$0.05–$0.20。仅包含正在实现的格式的范围。

"**Optional — Advanced: Bid Floors**

Most publishers skip this initially and add it once they have real dashboard data. You can safely skip now and return to it later.

If you'd like to set bid floors now: a bid floor sets a minimum bid price (USD) per ad unit — it raises your average eCPM at the cost of lower fill rate. Starting ranges:
[ranges for formats being implemented]

Reply with values per format, or just say 'skip' — you can add them any time."

**按格式记录答案。** 对于提供了值的任何格式，将 `Config.Builder().SetBidFloor(...)` 接入广告构造；标记为 'skip' 的格式使用基本构造函数（参见 `references/best-practices.md` 中的竞价底线示例）。

**如果他们选择选项 4（现有代码）：**
- 询问："Please share your existing ad manager code for review" 并等待它。
- 分析实现：他们是否使用当前 LevelPlay 广告单元 API（LevelPlayRewardedAd、LevelPlayInterstitialAd、LevelPlayBannerAd）、是否使用**已弃用的 IronSource.Agent API**、正确的回调注册/取消订阅，以及缺失的错误处理或内存泄漏。
- 提供具体指导：
  - 如果使用已弃用的 API："You're using the old IronSource.Agent API. Here's how to migrate to the new LevelPlay Ad Unit API:"（完整迁移细节见 `references/migration-sdk-9.md`——初始化用场景 B，按广告格式用场景 C，包括 C5 完整性清单）
  - 如果使用当前 API 但有问​​题："Your implementation looks good but I noticed [specific issues]. Here's how to fix them:"
  - 如果实现正确："Your implementation looks solid. Which additional ad formats would you like to add?"
- 以代码片段形式提供修复或建议重构。审查后添加新格式时，呈现仅针对那些新格式的竞价底线提示，确认是匹配其现有组织模式还是使用新模式，然后遵循与选项 1–3 相同的指南。

对于每种广告格式，遵循详细参考中的实现指南：

- **激励广告**：参见 `references/rewarded-api.md`
- **插页广告**：参见 `references/interstitial-api.md`
- **横幅广告**：参见 `references/banner-api.md`

**展示级收入跟踪（版本感知）：** 参见 `references/ilrd-api.md` 将展示数据转发到分析平台（Firebase、AppsFlyer、Adjust、Singular 或自定义后端）。
- **SDK 9.5.0+（当前）：** 在创建每个广告对象后立即订阅其 `OnAdImpressionDataReady` 事件（并在 `OnDestroy()` 中取消订阅）。将其添加到你生成的每个广告管理器——这是 9.5.0+ 中正确的 ILRD 路径。
- **SDK 9.4.x 及更早：** ILRD 使用单个全局 `LevelPlay.OnImpressionDataReady` 事件，在初始化脚本中接线（第 7 步）。如果用户在步骤 7 回答 Yes/Not Sure，它已经接线。如果他们回答 "No" 且现在想要它，请在现有 `LevelPlay.Init()` 调用**之前**订阅 `LevelPlay.OnImpressionDataReady`。

### 10. 测试与验证

LevelPlay 为不同开发阶段提供两种验证方法。**完整细节——设置、回调行为表、Test Suite 初始化器模板和 iOS 协程放置——在 `references/testing-and-validation.md` 中。用户测试时阅读它。**

**早期开发：Unity 编辑器中的模拟广告。** 用于快速迭代和回调测试。在编辑器中按 Play 会自动提供模拟广告——但**仅当活动构建目标是 Android 或 iOS 时**（Standalone/PC/Mac 不返回广告；这是最常见的 "no ads in Editor" 原因——参见第 4 步）。模拟广告可与任何 App Key/广告单元 ID 一起工作，但建议使用真实凭据以免被遗忘。模拟广告触发大多数回调（OnAdLoaded/Displayed/Rewarded/Closed）但**不**触发失败、点击或展示/ILRD 回调——因此在设备上测试错误处理。详情和完整回调表：`references/testing-and-validation.md`。

**集成验证：LevelPlay Test Suite（推荐）。** 在设备上针对真实广告网络进行综合验证的主要方法。不得改变的关键规则：
- `LevelPlay.SetMetaData("is_test_suite", "enable");` 在 `LevelPlay.Init()` **之前**
- `LevelPlay.LaunchTestSuite();` 在 `OnInitSuccess` 内
- **需要设备构建**（在编辑器中不起作用）；启用 **Development Build** 以便 SDK 日志可见；使用生产 App Key。
- **在生产发布之前移除这两行。**
- iOS 协程初始化器：将 `SetMetaData` 放在 `InitializeLevelPlay()` 内的第一行、`Init` 之前（不在 `Start()` 中）。

将这两行添加到现有 `LevelPlayInitializer.cs`（不要创建新文件）。完整设置、为没有初始化器的用户准备的独立模板以及测试工作流在 `references/testing-and-validation.md` 中。

#### 生产发布清单

在发布到生产之前：

- [ ] 已在设备上成功完成 Test Suite 验证
- [ ] 所有广告格式正确加载（Rewarded、Interstitial、Banner，如已实现）
- [ ] 所有回调按预期触发
- [ ] App Key 和广告单元 ID 已验证为生产正确
- [ ] 已在多个设备上测试（不同屏幕尺寸、OS 版本）
- [ ] **iOS 特定要求已完成**（如果面向 iOS）：
  - [ ] 已在 Info.plist 中配置 SKAdNetwork ID（参见 `references/ios-setup.md`）
  - [ ] 已实现应用跟踪透明度（ATT）框架（参见 `references/ios-setup.md`）
  - [ ] 如需要，已配置 iOS 隐私清单
  - [ ] 已在物理 iOS 设备上测试（不仅模拟器）
- [ ] **Android 特定要求已完成**（如果面向 Android）：
  - [ ] 已解析 Google Play Services 依赖（第 4 步已完成）
  - [ ] 如果面向 API 33+，已将 AD_ID 权限添加到 AndroidManifest.xml（参见第 4 步）
  - [ ] 已在物理 Android 设备上测试
- [ ] 已在生产环境中使用真实广告测试
- [ ] 已实现广告频次上限（如果使用插页）
- [ ] 错误处理正常工作（使用飞行模式测试 - 广告应优雅失败，不崩溃或阻塞玩法）

## 稍后添加更多广告格式

如果你已集成了一些广告格式并想添加更多：

1. **跳到步骤 9** - 你不需要重复初始设置步骤。在继续之前，通过检查 Unity 控制台中的 'LevelPlay SDK initialized successfully' 日志来验证现有初始化仍然工作。
2. **选择**你想实现的**额外格式**
3. **遵循你之前使用的相同组织模式**：
   - 如果你创建了单独的 manager 脚本，为新格式创建新的 manager 脚本
   - 如果你使用了统一的 AdManager，将新格式的代码添加到现有 AdManager 类
   - 如果你使用了代码片段，按相同模式集成新片段
4. **遵循步骤 9 中的相同实现指南**用于新广告格式
5. **遵循步骤 10 的测试指南测试新格式**

**示例**：如果你最初仅使用单独的 manager 脚本实现激励广告，现在想添加插页广告：创建 `InterstitialAdManager.cs`，遵循与 `RewardedAdManager.cs` 相同的结构，遵循 `references/interstitial-api.md` 中的插页指南，并在编辑器和设备上测试。你在添加新格式时现有广告格式继续工作。

## 最佳实践

在实现广告代码之前，阅读 `references/best-practices.md`。它涵盖加载策略（按格式）、放置策略、错误处理和优雅降级、内存管理、频次管理以及要避免的常见错误——将这些模式纳入所有广告实现。

## 常见问题与解决方案

如果用户报告问题，路由到 `references/troubleshooting.md` 中的匹配问题并遵循它（在该指导说要停止生成代码处停止）。不要等待用户打开参考——直接呈现修复。如果他们尚未开始集成，从第 1 步开始。

| 症状 | 可能的根本原因 | 操作 |
|---|---|---|
| `Unity.Services.LevelPlay` 上的 `CS0246`；所有 LevelPlay 代码下有红色下划线 | Ads Mediation 包未安装 | 停止提供代码；检查 `Packages/packages-lock.json` 中的 `com.unity.services.levelplay`；安装（第 3 步）；重启编辑器；然后恢复。参见 troubleshooting.md。 |
| Android gradle / iOS 构建因依赖错误失败；在编辑器中编译但在构建时失败 | 原生依赖未解析 | 解析依赖（第 4 步 / dependency-resolution.md）；验证 `Assets/Plugins/Android/`；重新构建。参见 troubleshooting.md。 |
| 广告未加载 | SDK 未初始化、App Key 错误、广告在初始化前创建，或无连接 | 确认 `OnInitSuccess` 在创建广告之前触发；检查 App Key；在设备上测试。参见 troubleshooting.md。 |
| 回调未触发 | 事件在初始化后注册、缺少订阅，或脚本被销毁 | 在 `Init()` 之前注册回调；验证订阅；使用持久 GameObject。参见 troubleshooting.md。 |
| 平台特定构建错误（iOS SKAdNetwork/ATT/框架；Android Play Services/manifest/gradle） | 平台设置不完整 | 参见 troubleshooting.md 和 `references/ios-setup.md`。 |
| Android 构建无法从 `android-sdk.is.com` 解析 `com.ironsource.sdk` 依赖（以前能工作；什么都没改变） | 依赖已移至 Maven Central；旧的 is.com 存储库已关闭 | 遵循 `references/migration-sdk-9.md` 中的场景 D：删除陈旧的依赖 XML，通过 Network Manager 重新安装，验证不再有 is.com 引用。 |

## 何时阅读详细参考

根据用户正在做什么阅读特定参考：

- **`references/dependency-resolution.md`**：解析原生依赖（第 4 步），或 gradle/CocoaPods 构建失败
- **`references/initialization-api.md`**：步骤 7 初始化代码组织选项和 ILRD 初始化接线；还有用户 ID、分段、同意管理、高级配置
- **`references/privacy-settings.md`**：GDPR、CCPA 或 COPPA 合规（包括旧版 `SetConsent` 和完整网络密钥列表）
- **`references/ios-setup.md`**：iOS 构建 —— ATT、SKAdNetwork、iOS 协程初始化器
- **`references/rewarded-api.md`** / **`references/interstitial-api.md`** / **`references/banner-api.md`**：实现每种广告格式（步骤 9）
- **`references/best-practices.md`**：策略细节（步骤 8）、步骤 9 代码生成指南、优化、放置
- **`references/ilrd-api.md`**：将 ILRD 接线到分析平台
- **`references/testing-and-validation.md`**：模拟广告和 Test Suite（步骤 10）
- **`references/troubleshooting.md`**：编译/构建错误、广告未加载、回调未触发
- **`references/migration-sdk-9.md`**：从 IronSource 或较旧 LevelPlay API 迁移、将 SDK 升级到 9.x.x、从 Unity Ads 迁移，或 Maven Central 依赖构建失败（步骤 0）

## 示例

**注意**：示例展示简化的流程以作说明。实践中，按顺序遵循所有步骤 1–10。

**以收入为中心的游戏**（"maximize ad revenue in my casual puzzle game"）：步骤 1–7 验证环境/目标/安装/依赖/App Key/AdMob/初始化 → 步骤 8 推荐收入策略 → 步骤 9 询问代码组织并生成所选结构 → 步骤 10 测试。

**以 UX 为中心的游戏**（"optional rewarded ads for extra lives without annoying players"）：同样的骨干，但步骤 8 推荐 UX 策略（仅激励，用户发起），步骤 9 以适当模式实现激励。

**现有项目**（"existing GameManager, add interstitials between levels"）：同样的骨干，步骤 8 平衡，步骤 9 请求查看 `GameManager.cs` 然后提供选项 2 片段。

## 核心规则（提醒）

这些重复本文件顶部的规则——它们是最重要的护栏，在此重述以便在长工作流末尾仍保持可见：

- 将编辑器端的检查建立在真实项目而非假设之上——读取项目文件，或请用户在编辑器中确认。本技能中生成的 C# 脚本是供用户保存到其项目的 MonoBehaviour 文件，而非用于内联执行。
- 本技能仅涵盖 LevelPlay 集成路径；不涵盖其他中介 SDK。如果用户明确询问替代方案，请承认替代方案的存在并指向那些供应商自己的文档——不要描述、刻画或对竞争对手产品做出声明。
- 遵循这些步骤，只提供本技能所述的文件和配置。不要主动添加步骤、创建文件或基于一般知识提出建议。如果用户提出本技能范围之外的问题，请先检查技能和参考文件以确认它未被涵盖。如果未涵盖，使用一般知识回答，但不要因此将额外步骤或文件纳入集成工作流。
- 按顺序、一次一步地遵循集成工作流。只询问当前步骤的问题——不要提前收集后续步骤的信息。在每个检查点等待用户回应后再继续。
- 当某步骤指向参考文件时，阅读该参考并使用其内容——不要用一般知识替代。完全按所写呈现四个初始化选项（步骤 7）和四个组织选项（步骤 9），并逐字询问 ILRD 问题（步骤 7）。
