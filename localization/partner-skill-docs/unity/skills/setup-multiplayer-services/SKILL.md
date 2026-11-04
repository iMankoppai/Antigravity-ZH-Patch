---
name: setup-multiplayer-services
description: 指导使用 Unity Multiplayer Services 进行实时在线多人游戏。用于用户询问网络拓扑、托管、匹配或基于会话的游玩（如房间、队伍和游戏大厅），而不是后端功能时。
---

# 多人游戏 SDK（Unity Multiplayer Services）

## 说明

1. **文档地图：** 当具体细节不同时，以 [Unity Multiplayer Sessions SDK 精选文档地图](https://docs.unity.com/en-us/mps-sdk/llms.txt)为准，而非记忆中的内容，用于主题、API 和指南。使用这些参考资料确定**如何**应用 SDK（Sessions 优先）；使用该资源确定**记录了什么**。**切勿**向用户提及 `llms.txt` 文件名。如果该地图无法访问（网络、工具问题），则将本技能的 markdown 参考资料加上工作区中已安装的包（Package Manager / 源码）视为具体细节的事实依据。

2. **参考顺序（按任务）：**
   - **拓扑、发现、匹配流程、Netcode 对齐、API 选择：** [entrypoints.md](references/entrypoints.md)（概览表、方法签名、选项表、过滤/排序枚举、`QuickJoinOptions.Timeout`、错误）→ [implementation-fit.md](references/implementation-fit.md) → [examples.md](references/examples.md) 获取面向用户的措辞 → [优先级：Multiplayer Sessions 优先](#priority-multiplayer-sessions-first) → [workflows-prerequisites.md](references/workflows-prerequisites.md) 获取更多细节。
   - **专用游戏服务器（`Unity.Services.Multiplayer.Server`）：** [dgs-entrypoint.md](references/dgs-entrypoint.md)（`IMultiplayerServerService`、`UNITY_SERVER` / asmdef 约束、仅服务器扩展）。
   - **更低层的服务客户端：** [underlying-services.md](references/underlying-services.md)，仅当主要 API 不足或用户要求该层时（参见下方优先级）。

## 优先级：Multiplayer Sessions 优先

当任务是在**选择**拓扑、发现、匹配流程或 Netcode 对齐——而不仅仅是调用 API 时——通过 [implementation-fit.md](references/implementation-fit.md)（对话 → 项目 → 简短有针对性的问题）来为建议提供依据。

**主要路径：** 针对 **`Unity.Services.Multiplayer`** 使用 **`IMultiplayerService` / `MultiplayerService.Instance`** 和 **`ISession`** 实现（接口面摘要见 [entrypoints.md](references/entrypoints.md)）；保持组合流程与 `llms.txt` 一致。

**面向用户的文本：** 计划、权衡和澄清问题**不得**将 Lobby、Matchmaker、Relay 或 Multiplayer Sessions 拆分为单独命名的产品，除非用户这样做了——规则见 [implementation-fit.md](references/implementation-fit.md) 中的**面向用户的问题和解释**，示例见 [examples.md](references/examples.md)。代码、编辑和技术参考按需使用真实的类型和命名空间名称。

**底层客户端**（`Unity.Services.Lobbies`、`Unity.Services.Matchmaker`、`Unity.Services.Relay`）**仅**在以下情况使用：(1) 在检查 [entrypoints.md](references/entrypoints.md) 后，目标**无法**通过主要 API 达成；或 (2) 用户**明确**要求这些命名空间或产品。**不要**默认在那里实现。

## 其他资源

仅从此入口点读取；链接位于此技能文件夹下一层（没有 `references/index.md` 或 README 中心页）。

- **[implementation-fit.md](references/implementation-fit.md)** — 为建议提供依据：对话 → 项目 → 用户问题；面向用户的语言规则；需求维度（拓扑、发现、韧性、平台、网络栈）。
- **[examples.md](references/examples.md)** — 澄清问题和面向用户解释的前/后示例（不是代码）。
- **[entrypoints.md](references/entrypoints.md)** — `IMultiplayerService`、`ISession`、概览和能力表、方法签名、选项表（默认值、限制）、过滤/排序枚举、会话/网络/宿主流程、错误、编辑器组件。
- **[dgs-entrypoint.md](references/dgs-entrypoint.md)** — 专用服务器：`Unity.Services.Multiplayer.Server`、`IMultiplayerServerService`、`MultiplayerServerService` / `GetMultiplayerServerService`、`MatchmakerServerExtensions`、`UNITY_SERVER` 和 asmdef 约束；将共享的 `SessionOptions` 细节交由 entrypoints 处理。
- **[workflows-prerequisites.md](references/workflows-prerequisites.md)** — 按工作流划分的包和云前提条件（表格）。
- **[underlying-services.md](references/underlying-services.md)** — 回退命名空间和 `IUnityServices` 访问器（仅限智能体；不是默认路径）。
