---
name: setup-vivox-voice-chat
description: 使用 Unity Vivox 添加并配置游戏内语音和文本聊天。用于用户询问语音聊天、麦克风权限、静音控制、邻近语音、队伍和大厅频道或私信时。
required_packages:
  com.unity.services.vivox: ">=16.4.0"
---

# Unity Vivox —— 语音与文本聊天

命名空间：`Unity.Services.Vivox` | 包：`com.unity.services.vivox`
配套包：`Unity.Services.Core`、`Unity.Services.Authentication`

Vivox v16+ 用单一静态入口点替换了 v4 的 `Client` / `ILoginSession` / `IChannelSession` 模型：**`VivoxService.Instance`**。所有操作——初始化、登录、加入频道、消息、静音——都通过它进行。**不要**使用 v4 模式（`Client.Instance`、`AccountId`、`ChannelId`、`ILoginSession`、`UnityPurchasing.*` 等）；这些在 v16 中已不存在。

## 文档地图

当具体细节不同时，以 [Unity Vivox 精选文档地图](https://docs.unity.com/en-us/vivox-unity/llms.txt)为准，而非记忆中的内容，用于主题、API 和错误代码。本技能及其参考资料定义**如何**应用 SDK；该资源定义**记录了什么**。**切勿**向用户提及 `llms.txt` 文件名。如果它无法访问，则将本技能的参考资料加上工作区中已安装的包（Package Manager / 源码）视为事实依据。

## 详细参考

按需阅读——仅当你需要本文件之外的签名、事件细节或平台注意事项时。

- **初始化、登录和访问令牌：** [references/init-and-login.md](references/init-and-login.md)
- **语音频道（位置性和非位置性）：** [references/voice-channels.md](references/voice-channels.md)
- **文本聊天（频道消息和定向消息）：** [references/text-chat.md](references/text-chat.md)
- **事件、参与者和清理：** [references/events-and-participants.md](references/events-and-participants.md)
- **故障排除和平台说明：** [references/troubleshooting.md](references/troubleshooting.md)

## 初始化顺序（不要跳过步骤）

正确的顺序是 **UGS Core → Authentication 登录 → Vivox 初始化 → Vivox 登录**。跳过或重新排序这些步骤会静默失败或抛出难以理解的错误。

```csharp
using Unity.Services.Core;
using Unity.Services.Authentication;
using Unity.Services.Vivox;

async void Start()
{
    await UnityServices.InitializeAsync();
    await AuthenticationService.Instance.SignInAnonymouslyAsync();
    await VivoxService.Instance.InitializeAsync();
    // subscribe to events (see table below) BEFORE calling LoginAsync
    await VivoxService.Instance.LoginAsync(new LoginOptions { DisplayName = "Bob" });
}
```

- 调用 `VivoxService.Instance.InitializeAsync()` 两次会抛出 `5041 VxErrorAlreadyInitialized`。在场景重新加载时防止重新初始化。
- 如果不使用 Unity Authentication（`AuthenticationService`），玩家身份会回退到按会话生成的 GUID——显示名称仍然有效，但你会失去跨会话身份。有关 Vivox 访问令牌（VAT）替代方案，请参阅 [references/init-and-login.md](references/init-and-login.md)。

## 加入频道

Vivox 有三种加入方法，每种频道类型一种。它们都是异步的，但加入**通过 `ChannelJoined` 事件完成，而不是通过等待调用**——先订阅，再调用。

| 方法 | 用途 |
|---|---|
| `VivoxService.Instance.JoinGroupChannelAsync(name, ChatCapability, ChannelOptions?)` | 非位置性（队伍、团队、大厅、公会） |
| `VivoxService.Instance.JoinEchoChannelAsync(name, ChatCapability, ChannelOptions?)` | 回显你自己音频的测试频道 |
| `VivoxService.Instance.JoinPositionalChannelAsync(name, ChatCapability, Channel3DProperties, ChannelOptions?)` | 由变换位置驱动的 3D 空间音频 |

`ChatCapability` 值：`TextOnly`、`AudioOnly`、`TextAndAudio`。

**限制：** 每个用户最多 10 个非位置性频道；每个频道最多 200 名参与者。超过任一限制会以 `20502 VxXmppServerErrorServiceUnavailable` 失败。对于位置性频道中超过 200 人的情况，请使用 Large 3D channels 企业设置。

使用 `VivoxService.Instance.LeaveChannelAsync(channelName)` 或 `LeaveAllChannelsAsync()` 离开。有关 `Channel3DProperties` 字段以及 Android/iOS 上的麦克风权限处理，请参阅 [references/voice-channels.md](references/voice-channels.md)。

## 文本消息

**频道消息**（广播给具有 `TextOnly` 或 `TextAndAudio` 的频道的所有参与者）：

- 发送：`VivoxService.Instance.SendChannelTextMessageAsync(string channelName, string message)`
- 接收：订阅 `VivoxService.Instance.ChannelMessageReceived`（`Action<VivoxMessage>`）

**定向消息**（点对点，无需频道）：

- 发送：`VivoxService.Instance.SendDirectTextMessageAsync(string playerId, string message)`
- 接收：订阅 `VivoxService.Instance.DirectedMessageReceived`（`Action<VivoxMessage>`）

**常见幻觉：** 发送方法是 `SendDirectTextMessageAsync`——**不是** `SendDirectedTextMessageAsync`。然而事件**是** `DirectedMessageReceived`。注意这种不对称性。

`VivoxMessage` 字段：`ChannelName`（定向消息为 null）、`SenderDisplayName`、`SenderPlayerId`、`MessageText`、`ReceivedTime`、`Language`、`FromSelf`、`MessageId`。

编辑/删除 API（`EditChannelTextMessageAsync`、`DeleteChannelTextMessageAsync`、`EditDirectTextMessageAsync`、`DeleteDirectTextMessageAsync`）和历史记录（`GetChannelTextMessageHistoryAsync`、`GetDirectTextMessageHistoryAsync`）在 [references/text-chat.md](references/text-chat.md) 中涵盖。聊天历史默认保留 7 天。

## 必需的事件订阅

在相应的异步调用**之前**订阅事件。`LoggedIn` 可能在重连时立即触发；`ChannelJoined` 在加入完成时触发。

| 调用 | 成功事件 | 失败 / 对应事件 |
|---|---|---|
| `LoginAsync()` | `LoggedIn` | `LoggedOut` |
| `JoinGroupChannelAsync()` / `JoinEchoChannelAsync()` / `JoinPositionalChannelAsync()` | `ChannelJoined(string channelName)` | `ChannelLeft(string channelName)` |
| —（任何已加入的频道） | `ParticipantAddedToChannel(VivoxParticipant)` | `ParticipantRemovedFromChannel(VivoxParticipant)` |
| `SendChannelTextMessageAsync()`（远程接收） | `ChannelMessageReceived(VivoxMessage)` | — |
| `SendDirectTextMessageAsync()`（远程接收） | `DirectedMessageReceived(VivoxMessage)` | — |

**始终在 `OnDestroy` / `OnDisable` 中取消订阅。** `VivoxService.Instance` 是持久单例——已销毁的 MonoBehaviour 上的事件处理程序会双重触发，并在场景重新加载时出现 NRE。

每个参与者的事件（`ParticipantMuteStateChanged`、`ParticipantSpeechDetected`、`ParticipantAudioEnergyChanged`）位于你从 `ParticipantAddedToChannel` 收到的 `VivoxParticipant` 实例上——而不是 `VivoxService.Instance` 上。请参阅 [references/events-and-participants.md](references/events-and-participants.md)。

## 访问令牌（简要）

默认路径使用 **UGS Authentication**——一旦 `AuthenticationService.Instance.SignInAnonymouslyAsync()`（或其他登录方法）完成，Vivox 就会从你的 UGS 项目自动铸造访问令牌。对于标准流程，**无需手动令牌代码**。

仅当你使用非 UGS 身份系统，或需要频道范围的特权令牌（踢出、全体静音、转录）时，才需要服务器端 Vivox 访问令牌（VAT）铸造。请参阅文档地图的 "Access Token Developer Guide" 部分以获取特定语言的服务器示例。不要在客户端中嵌入 HMAC 签名密钥。

## 验证

在编写使用此包的代码后：

1. 验证项目编译无错误，且 `using Unity.Services.Vivox;` 能解析。
2. 确认初始化顺序：`UnityServices.InitializeAsync` → `AuthenticationService.Instance.SignInAnonymouslyAsync` → `VivoxService.Instance.InitializeAsync` → `VivoxService.Instance.LoginAsync`。
3. 没有 v4 旧模式：没有 `Client.Instance`，没有 `AccountId`，没有 `ChannelId`，没有 `ILoginSession`，没有 `IChannelSession`。所有访问都通过 `VivoxService.Instance`。
4. 代码消费的所有事件都在触发它们的异步调用**之前**订阅，并在 `OnDestroy` 中取消订阅。
5. 频道加入代码不会将加入调用 `await` 为仿佛它完成了加入——它订阅 `ChannelJoined` 并在那里响应。
6. 定向消息发送使用 `SendDirectTextMessageAsync`（而非 `SendDirectedTextMessageAsync`）。定向消息接收使用 `DirectedMessageReceived`。
7. Android 构建在加入音频频道之前会在运行时请求 `RECORD_AUDIO`；iOS 构建在 plist 中有 `NSMicrophoneUsageDescription`。
8. 客户端代码中不嵌入 HMAC 签名密钥或 Vivox `SECRET`/`APP_ID`——基于 VAT 的流程已有文档记录，但交由服务器处理。
