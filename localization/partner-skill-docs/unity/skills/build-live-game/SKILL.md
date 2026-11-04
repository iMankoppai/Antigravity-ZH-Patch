---
name: build-live-game
description: 使用 Unity Gaming Services 构建并运营实时游戏的后端。当用户想要可信的服务器端游戏逻辑、玩家进度、远程配置、登录、成就、战斗通行证或排行榜时，务必使用本技能。
---

# 使用 Unity Gaming Services 构建实时游戏

## 开始之前

1. 从 `ProjectSettings/ProjectVersion.txt` 读取编辑器版本，从 `Packages/packages-lock.json` 读取已安装的 UGS 包版本。选择下面匹配的步骤（例如 `.ccmu` 或 `.ccmr` 模块），因为正确的工作流取决于编辑器和包版本。
2. 检查项目是否链接到 Unity 项目 ID 和环境（**Edit > Project Settings > Services**），如果未链接，请用户链接它。
3. 创建一个还原点，以便在你的更改失败时回滚：在版本控制中提交项目。如果没有版本控制，请改为复制项目文件夹。
4. 在你继续工作流或诊断之前，打开并阅读你将使用的服务的文档页面（参见[文档地图](#documentation-map)）以及 `references/` 下的匹配文件，并在回答中说明你阅读的页面。这是因为你关于 Unity Gaming Services 的训练知识可能过时、不正确，或针对错误的包版本。
5. 只做所要求的事情。不要更改无关的资产或文件。避免冗长的解释。
6. 当你更改运行时行为时，在需要验证的点添加 `Debug.Log` 行（登录完成、模块调用返回、配置已获取）。你在[验证](#validation)期间在 Play 模式中阅读它们。

## 术语表

| 术语 | 含义 |
|---|---|
| **UGS** | Unity Gaming Services：后端服务（Authentication、Cloud Code、Cloud Save、Remote Config、Leaderboards 等）。Package Manager 称它们为 "Unity Services" |
| **Building Block** | 针对单个功能的免费 Asset Store 包，包含 UI、运行时代码和云资源文件。其 Cloud Code 是旧版 `.ccmr` |
| **Cloud Code 模块** | 服务器端 C# 类库。在 Unity 6000.5+ 上作为 `.ccmu` 资产在 Unity 项目中编写 |
| **`.ccmr`** | 旧版模块引用文件，指向在 Unity 外部构建的 C# 解决方案 |
| **Script** | 服务器端 JavaScript 端点。旧版：维护现有的，不要编写新的 |
| **CloudBehaviour** | 实验性 Cloud Code 类，生成客户端绑定、同步状态和推送事件 |
| **受保护数据** | Cloud Save 玩家数据，玩家可以读取但只有服务器代码可以写入 |
| **自定义数据** | Cloud Save 游戏范围数据，不绑定到单个玩家，仅由服务器代码写入 |
| **云资源文件** | 可部署的配置文件（`.rc`、`.ac`、`.ccmu`、`.ccmr`、`.lb`、`.ugo`），Deployment Window 将其推送到 UGS 环境 |

## 文档地图

优先使用 `WebFetch` 而非 `WebSearch`：它更快且能落到确切的参考。只获取你需要的内容。当 URL 以 `.md` 结尾时，docs.unity.com 上的页面以 Markdown 形式提供。获取前将 `<VERSION>` 替换为以下内容：

- **docs.unity3d.com 上的包**：已安装的包版本，`major.minor` 形式，例如 `3.0`。如果不确定，从 `Packages/packages-lock.json` 读取。
- **docs.unity.com**：下面的 UGS 产品页面未版本化，因此无需替换。

行动前要阅读的页面：

- Cloud Code C# 模块：[Overview](https://docs.unity.com/en-us/cloud-code/modules/overview.md)、[Get started](https://docs.unity.com/en-us/cloud-code/modules/getting-started.md)、[Module structure](https://docs.unity.com/en-us/cloud-code/modules/how-to-guides/module-structure.md)、[Error handling](https://docs.unity.com/en-us/cloud-code/modules/how-to-guides/error-handling.md)、[Limits](https://docs.unity.com/en-us/cloud-code/modules/reference/limits.md)
- Cloud Code 服务器权威：[Server authority](https://docs.unity.com/en-us/cloud-code/server-authority.md)、[Cheat prevention](https://docs.unity.com/en-us/cloud-code/cheat-prevention.md)、[UGS integration and access control](https://docs.unity.com/en-us/cloud-code/server-access-control.md)
- Authentication：[How Authentication works](https://docs.unity.com/en-us/authentication/how-authentication-works.md)、[Sessions and cached players](https://docs.unity.com/en-us/authentication/session-management.md)、[Common errors](https://docs.unity.com/en-us/authentication/common-errors.md)
- Cloud Save：[Player Data](https://docs.unity.com/en-us/cloud-save/concepts/player-data.md)、[Game Data](https://docs.unity.com/en-us/cloud-save/concepts/game-data.md)、[Cloud Save for Cloud Code](https://docs.unity.com/en-us/cloud-save/tutorials/cloud-code.md)
- Remote Config：[Remote Config files](https://docs.unity.com/en-us/remote-config/remote-config-files.md)、[Code integration](https://docs.unity.com/en-us/remote-config/code-integration.md)
- Leaderboards：[Overview](https://docs.unity.com/en-us/leaderboards.md)、[Unity SDK tutorial](https://docs.unity.com/en-us/leaderboards/tutorials/unity-sdk.md)
- Deployment Window：[Deployment package manual](https://docs.unity3d.com/Packages/com.unity.services.deployment@<VERSION>/manual/index.html)

## UGS 包

| 包 | 最低版本 | 用途 |
|---|---|---|
| `com.unity.services.core` | 1.16.0 | 初始化、依赖图 |
| `com.unity.services.authentication` | 3.6.1 | 玩家登录和身份 |
| `com.unity.services.cloudcode` | 3.0.0 | 服务器权威 C# 模块，在项目内作为 `.ccmu` 编写。`2.10.x` 系列仅部署旧版 `.ccmr` —— 见下文 |
| `com.unity.services.cloudsave` | 3.4.0 | 每玩家和共享键值存储 |
| `com.unity.remote-config` | 4.2.5 | 服务器端游戏配置 |
| `com.unity.services.deployment` | 1.7.2 | 从编辑器部署云资源 |
| `com.unity.services.tooling` | 1.4.1 | Access Control 和 Game Overrides |
| `com.unity.services.apis` | 1.1.1 | 为所有 UGS 服务生成的 REST 客户端 |

- [开始之前](#before-you-start)
- [术语表](#glossary)
- [文档地图](#documentation-map)
- [初始化模式](#initialization-pattern)
- [架构——包如何组合](#architecture--how-packages-combine)
- [核心服务——快速参考](#core-services--quick-reference)
- [常见架构模式](#common-architecture-patterns)
- [验证](#validation)
- [详细参考](#detailed-references)
- [最终报告](#final-report)

## 初始化模式

每个 UGS 游戏都以相同方式开始。`com.unity.services.core` 必须先初始化，然后玩家登录：

```csharp
using Unity.Services.Core;
using Unity.Services.Authentication;

await UnityServices.InitializeAsync();
await AuthenticationService.Instance.SignInAnonymouslyAsync();
// All other services are now ready
```

## 架构——包如何组合

```
                    UnityServices.InitializeAsync()
                              │
                              ▼
                     AuthenticationService
                    (sign in → PlayerId)
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        Remote Config     Cloud Save      Multiplayer
      (game config,    (player state,   (sessions,
       definitions,     progress,        matchmaking,
       feature flags)   preferences)     lobbies)
              │               │
              └───────┬───────┘
                      ▼
                 Cloud Code
              (server-authoritative
               writes, validation,
               anti-cheat logic)
                      │
              ┌───────┴───────┐
              ▼               ▼
         Cloud Save       Leaderboards
         (Protected       (score
          writes)          submission)
```

**关键原则：** 对于任何影响游戏完整性的数据（XP、奖励、货币），通过 Cloud Code 模块路由写入。直接客户端写入仅适用于非敏感数据（偏好、显示设置）。

## 核心服务——快速参考

### Authentication

**包：** `com.unity.services.authentication`（>= 3.6.1）

处理玩家身份；[How Authentication works](https://docs.unity.com/en-us/authentication/how-authentication-works.md) 涵盖登录方法。登录后 `PlayerId` 可用且 `SignedIn` 事件触发。`PlayerAccountService`（Unity 浏览器登录）位于**独立程序集**：`Unity.Services.Authentication.PlayerAccounts`。

- **完整参考：** [references/authentication.md](references/authentication.md)

### Cloud Code

**包：** 用于原生 `.ccmu` 编写的 `com.unity.services.cloudcode` **`3.0.0`**（Unity 6000.5+）；`>= 2.10.3` 维护旧版 `.ccmr` 模块。在编写 `.ccmu` 之前，将固定 `2.10.x` 的 manifest 升级到 `3.0.0` 或更高。

运行服务器端 C# 模块（.NET 8；Unity 6.7+ 上为 .NET 10）以执行可信操作。检查项目的编辑器版本，然后**在 Unity 6000.5+ 上将新模块编写为 `.ccmu`**：用 **Create > Services > Cloud Code Module Script** 在 Unity 项目内创建模块。Unity 随项目一起编译它并在编译时生成其客户端绑定。`.ccmr` 是旧版：在 6000.5+ 上仅维护现有的；在较旧的编辑器上，将新模块编写为 `.ccmr`。
仅通过生成的绑定从客户端调用 `.ccmu` 模块，绝不要使用 `CallModuleEndpointAsync`。仅对旧版 `.ccmr` 模块使用 `CloudCodeService.Instance.CallModuleEndpointAsync`。
仅在用户要求时编写新的 JavaScript 脚本；维护现有的。

- **完整参考：** [references/cloud-code-modules.md](references/cloud-code-modules.md)

**CloudBehaviour**（实验性）从一个 C# 类生成模块的客户端绑定——RPC、同步状态、推送
事件。将它们用于共享比赛状态、每玩家秘密状态或服务器拥有的
计时器；否则使用普通的 Cloud Code 模块。需要 `com.unity.services.cloudcode` `3.1.0-exp.1`+
和 Unity 6000.5+。先检查已安装的包：如果 CloudBehaviour 不可用，请改用普通
有状态模块（`[StateScope]`，参见模块参考）而不是停止，除非用户要求
实验性包。

- **完整参考：** [references/cloud-code-cloudbehaviours.md](references/cloud-code-cloudbehaviours.md)

### Cloud Save

**包：** `com.unity.services.cloudsave`（>= 3.4.0）

每玩家键值存储，分三个访问类别（Default、Public、Protected），外加游戏范围 Custom 数据。Protected 和 Custom 数据只能由服务器代码写入，因此将反作弊和服务器授予的状态存储在那里。有关每个类别的读写规则，参见 [Player Data](https://docs.unity.com/en-us/cloud-save/concepts/player-data.md) 和 [Game Data](https://docs.unity.com/en-us/cloud-save/concepts/game-data.md)。

- **完整参考：** [references/cloud-save.md](references/cloud-save.md)

### Remote Config

**包：** `com.unity.services.remote-config`（>= 4.2.5）

服务器端游戏配置。将游戏定义（成就列表、战斗通行证层级、商店目录）存储为 JSON 条目，无需客户端构建即可更新。通过 Deployment Window 以 `.rc` 文件部署。

对于 A/B 测试和受众定位，通过 Tooling 包使用 Game Overrides（`.ugo`）。

- **完整参考：** [references/remote-config.md](references/remote-config.md)

### Tooling

**包：** `com.unity.services.tooling`（>= 1.4.1）

仅编辑器包。向 Deployment Window 注册 **Access Control**（`.ac`）和 **Game Overrides**（`.ugo`）文件类型。使用 Access Control 拒绝玩家对受保护键的直接写入；Deny 优先于 Allow。

- **完整参考：** [references/tooling.md](references/tooling.md)

### Deployment

**包：** `com.unity.services.deployment`（>= 1.7.2）

仅编辑器包，提供 **Deployment Window**（Services > Deployment）。将云资源部署到目标环境：

Deployment Window 部署云资源文件：`.rc`（Remote Config）、`.ac`（Access Control）、`.ccmu`（项目内 Cloud Code 模块，首选）、`.ccmr`（旧版模块引用）、`.lb`（Leaderboard）和 `.ugo`（Game Overrides）。

- **完整参考：** [references/deployment.md](references/deployment.md)

### UGS CLI

UGS CLI 作为 Unity CLI 插件发布，以 `unity ugs <command>` 运行，用于在编辑器外部部署和获取云资源。安装、认证/设置以及它部署哪些文件类型：[references/ugs-cli.md](references/ugs-cli.md)。插件系统：**unity-cli** 技能。

### Services API

**包：** `com.unity.services.apis`（>= 1.1.1）

为所有 UGS 服务自动生成的 REST 客户端，分四种客户端类型（`IGameClient`、`IAdminClient`、`IServerClient`、`ITrustedClient`）。默认使用高级包 SDK；仅用于管理 API 访问或无包 SDK 覆盖该调用时使用 Services API。

- **完整参考：** [references/apis.md](references/apis.md)

## 常见架构模式

### 模式 1：配置 + 状态 + 服务器写入

由**战斗通行证**和**成就**使用：

1. **定义**在 Remote Config 中（`.rc` 文件）—— 游戏中存在什么
2. **玩家状态**在 Cloud Save 中 —— 每玩家进度
3. **通过 Cloud Code 写入** —— 服务器权威变更
4. **Access Control**（`.ac` 文件）—— 阻止玩家对敏感键的直接写入

### 模式 2：客户端直接数据

由**玩家账户**（偏好、显示设置）使用：

1. **玩家数据**在 Cloud Save 的 Default 或 Public 访问类别中
2. **直接客户端写入** —— 非敏感数据无需 Cloud Code

### 模式 3：竞争性功能

由**排行榜**和排名系统使用：

1. **分数提交**通过 Leaderboards API（或通过 Cloud Code 进行验证）
2. **排名**在客户端检索，支持分页和玩家相对查询

## 验证

在编写实时游戏功能的代码后，按顺序运行这些检查。如果一项失败，修复原因并在继续之前重新运行它；如果修复不起作用，请返回并重新阅读匹配的文档页面和 `references/` 文件。

1. 检查项目编译：读取编辑器控制台（或编辑器日志）并确认零编译错误。
2. 检查代码中的初始化顺序：搜索 `UnityServices.InitializeAsync()` 并确认它在登录调用之前运行，且登录在任何服务调用之前完成。
3. 检查敏感写入（XP、奖励、货币）是否通过 Cloud Code：在客户端代码中搜索对这些键的 Cloud Save `SaveAsync` 调用，并将发现的任何此类调用移到模块中。还要确认每次 Cloud Save 读取都使用写入的存储桶的访问类别，因为类别不匹配会返回无数据。
4. 使用 `references/deployment.md` 中的 `Deploy.cs` 脚本，将该功能使用的云资源文件（`.rc`、`.ac`、`.ccmu` 或 `.ccmr`、`.lb`；跳过它不使用的类型）部署到活动环境，并阅读其输出：每个文件都必须报告 `Success`。报告为 `not a deployable item` 或状态为 `Error` 的文件已失败。如果项目没有脚本所需的两个包（`com.unity.pipeline` 和 `com.unity.services.deployment.api`），请用户从 Deployment Window 部署并报告每个文件的状态。
5. 通过其效果检查 Access Control：如果该功能部署了拒绝玩家直接写入的 `.ac` 策略，进入 Play 模式，运行一次对策略覆盖的键的直接客户端 Cloud Save 写入（临时的 `SaveAsync` 调用），并确认它失败并返回 `403`。之后移除临时调用。当功能没有 `.ac` 文件时跳过此步骤。
6. 进入 Play 模式，运行该功能一次，并确认来自[开始之前](#before-you-start)的 `Debug.Log` 行按预期顺序出现，且控制台零错误。

## 详细参考

### 服务参考
- **Authentication** —— 登录方法、事件、配置文件、身份提供程序、代码模板：[references/authentication.md](references/authentication.md)
- **Cloud Code** —— 选择模型：[references/cloud-code.md](references/cloud-code.md)；脚本和模块：[references/cloud-code-modules.md](references/cloud-code-modules.md)；CloudBehaviour：[references/cloud-code-cloudbehaviours.md](references/cloud-code-cloudbehaviours.md)
- **Cloud Save** —— 访问类别、数据操作、文件、查询、代码模板：[references/cloud-save.md](references/cloud-save.md)
- **Remote Config** —— 定义、`.rc` 格式、Game Overrides、代码模板：[references/remote-config.md](references/remote-config.md)
- **Tooling** —— Access Control（`.ac`）策略、Game Overrides（`.ugo`）、URN 参考：[references/tooling.md](references/tooling.md)
- **Deployment** —— 文件类型、工作流、程序化 API：[references/deployment.md](references/deployment.md)
- **UGS CLI** —— `unity ugs` 插件安装、认证/设置、按文件类型的无头部署：[references/ugs-cli.md](references/ugs-cli.md)
- **Services API** —— 四种客户端类型、服务区域、代码模板：[references/apis.md](references/apis.md)

### 功能蓝图
- **选择起点** —— 本技能的蓝图、Asset Store Building Block 和示例项目，以及如何复用其旧版 Cloud Code：[references/blueprints-and-samples.md](references/blueprints-and-samples.md)
- **成就** —— 包含数据模型、客户端代码、Cloud Code 模块、云资源的完整实现：[references/achievements.md](references/achievements.md)
- **战斗通行证** —— 包含分层 XP、免费/付费轨道、Cloud Code 模块、云资源的实现（高级购买是一个你必须完成的集成存根）：[references/battlepass.md](references/battlepass.md)
- **玩家账户** —— 登录流程、身份管理、Cloud Save 数据、代码模板：[references/player-account.md](references/player-account.md)

## 最终报告

工作完成后，以简短报告结束你的回答：

1. 你创建或更改了什么：文件、添加到 `Packages/manifest.json` 的包，以及云资源文件。
2. 你运行的[验证](#validation)检查及其结果，包括任何你无法运行的检查及原因。
3. 只有用户才能做的后续工作，例如：将云资源部署到目标环境、将项目链接到 Unity 项目 ID 和环境、完成存根化的集成（例如战斗通行证 `PurchasePremium`），或如果他们拒绝更改，从你创建的还原点恢复。
4. 你阅读了哪些文档页面。
