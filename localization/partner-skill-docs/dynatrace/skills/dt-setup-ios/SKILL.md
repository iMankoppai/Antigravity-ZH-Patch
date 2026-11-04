---
name: dt-setup-ios
description: '在 iOS 项目中使用 Swift Package Manager 设置 Dynatrace iOS SDK（OneAgent）。自动完成添加 SPM 依赖、创建 Dynatrace.plist 配置文件、添加 import 语句、添加隐私选择加入代码，以及构建项目。当用户想要在其 iOS 应用中集成、安装、添加或设置 Dynatrace 监控时使用此技能。关键词：Dynatrace、iOS、SDK、OneAgent、setup、install、integrate、SPM、Swift Package Manager、Info.plist、DTXApplicationID、DTXBeaconURL、mobile monitoring、RUM。'
license: Apache-2.0
compatibility: 需要 macOS、Xcode 16+ 和 Xcode MCP 服务器
argument-hint: 粘贴你的 dynatrace-ios-setup-config 块，或提供 DTXApplicationID 和 DTXBeaconURL
metadata:
  author: dynatrace
  version: '1.0'
---

# Dynatrace iOS SDK 设置

此技能在用户的 iOS 项目中设置 Dynatrace iOS SDK（OneAgent）—— 从零到首个事件。它遵循 [Dynatrace 文档](https://docs.dynatrace.com/docs/observe/digital-experience/new-rum-experience/mobile-frontends/ios/id-01-initial-setup)中的官方设置流程。

## 何时使用此技能

- 用户想要向其 iOS 应用添加 Dynatrace 监控
- 用户要求集成、安装或设置 Dynatrace iOS SDK
- 用户想要用 Dynatrace 对其 iOS 应用进行插桩
- 用户粘贴从 Experience Vitals 向导复制的设置提示词

## 预填值

当从 Experience Vitals 向导调用时，用户的消息将包含
标记为 `dynatrace-ios-setup-config` 的围栏块中的预填配置值。示例：

````text
```dynatrace-ios-setup-config
DTXApplicationID: ABC-123
DTXBeaconURL: https://example.dynatrace.com/mbeacon
Product: DynatraceSessionReplay
DTXUserOptIn: true
```
````

当这些值存在时：

- **跳过第 2 步**（收集应用标识键）—— 使用提供的
  `DTXApplicationID` 和 `DTXBeaconURL`。
- **跳过第 3 步中的产品问题** —— 使用提供的 `Product` 值
  （`Dynatrace` 或 `DynatraceSessionReplay`）。
- **使用 `DTXUserOptIn`** 决定是否在第 5 步添加隐私选择加入代码。如果为 `true`，添加选择加入代码。如果为 `false`，跳过第 5 步。

所有其他步骤（前提条件、SPM 依赖、plist 创建、import、构建、
验证）照常进行。

## 流程

### 1. 检查前提条件

在继续之前主动验证每个前提条件。如果任何检查失败，告知用户并停止。

**a) Xcode MCP 服务器可用**
这是硬性要求。该技能使用 Xcode MCP 服务器与 Xcode 项目交互（添加 SPM 依赖、构建等）。验证 Xcode MCP 工具可访问（例如 `mcp_xcode_XcodeListWindows`）。如果不可用，告知用户先安装并启用 Xcode MCP 服务器再继续。

**b) iOS 部署目标 >= 12.0**
`.pbxproj` 文件无法通过 Xcode MCP 服务器访问（它是项目元数据，不是导航器文件）。改为在终端中使用 `grep`：

```bash
grep 'IPHONEOS_DEPLOYMENT_TARGET' <path/to/project.pbxproj>
```

检查所有部署目标值都 >= 12.0。如果任何值低于 12.0，告知用户更新它们。

**c) Xcode 版本 >= 16.0**
在终端中运行 `xcodebuild -version` 验证。如果低于 16.0，告知用户更新 Xcode。

**d) Ruby + `xcodeproj` gem**
第 3 步中的 [scripts/add_spm_dependency.rb](./scripts/add_spm_dependency.rb) 需要它。检查：

```bash
ruby -e 'require "xcodeproj"; puts Xcodeproj::VERSION'
```

如果失败，运行 `gem install xcodeproj` 并重试。

### 2. 收集应用标识键

如果用户的消息包含 `dynatrace-ios-setup-config` 块（参见
[预填值](#预填值)），从中提取 `DTXApplicationID` 和
`DTXBeaconURL` 并跳到第 3 步。

否则，向用户询问这两个必需的值：

- **DTXApplicationID** —— 应用的唯一标识符
- **DTXBeaconURL** —— beacon 端点 URL（例如 `https://{environment}.dynatrace.com/mbeacon`）

如果用户已在消息中提供了这些值，则跳过询问。

如果用户没有这些值或不知道如何获取它们，请将他们引向官方设置文档：https://docs.dynatrace.com/docs/observe/digital-experience/new-rum-experience/mobile-frontends/ios/id-01-initial-setup

### 3. 将 OneAgent 添加到项目（SPM 依赖）

通过 Swift Package Manager 添加 Dynatrace Swift Mobile SDK。

如果用户的消息包含带有
`Product` 值的 `dynatrace-ios-setup-config` 块，直接使用它。否则，询问用户想要哪个产品：

- **Dynatrace** —— 用于自动移动应用插桩的 OneAgent
- **DynatraceSessionReplay** —— OneAgent + Session Replay 模块（崩溃时回放）

**SPM 包 URL：** `https://github.com/Dynatrace/swift-mobile-sdk.git`

运行捆绑的 Ruby 脚本 [scripts/add_spm_dependency.rb](./scripts/add_spm_dependency.rb)。它使用 `xcodeproj` gem 正确添加包引用、产品依赖和 frameworks 构建文件条目 —— 不对 `.pbxproj` 进行字符串操作。

```bash
ruby ./scripts/add_spm_dependency.rb \
  <ProjectPath> \
  https://github.com/Dynatrace/swift-mobile-sdk.git \
  8.0.0 \
  <Product> \
  [TargetName]
```

- `ProjectPath` —— 例如 `./MyApp.xcodeproj`
- `<Product>` —— `Dynatrace` 或 `DynatraceSessionReplay`（来自第 3 步的选择）
- `TargetName` —— 可选；默认为项目中的第一个应用 target

该脚本是幂等的 —— 运行两次是无操作。成功时打印 `OK: project saved`。

**如果脚本因任何原因失败**（不寻常的项目布局、Ruby 不可用），回退到手动引导用户通过 Xcode 操作：

1. 在 Xcode 中打开项目
1. **File > Add Package Dependencies...**
1. 输入 URL：`https://github.com/Dynatrace/swift-mobile-sdk.git`
1. 从 `8.0.0` 选择 **Up to Next Major Version**
1. 将所选库添加到应用 target
1. 点击 **Add Package**

脚本成功后（或用户确认手动添加后），继续到第 4 步。

### 4. 创建 Dynatrace.plist 配置

使用 `mcp_xcode_XcodeWrite` 在应用的主源码目录中创建新的 `Dynatrace.plist` 文件。这确保文件自动注册到 Xcode 项目。

内容：

```text
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>DTXApplicationID</key>
    <string>{USER_PROVIDED_APP_ID}</string>
    <key>DTXBeaconURL</key>
    <string>{USER_PROVIDED_BEACON_URL}</string>
    <key>DTXUserOptIn</key>
    {USER_OPT_IN_VALUE}
    <key>DTXStartupLoadBalancing</key>
    <true/>
    <key>DTXStartupWithGrailEnabled</key>
    <true/>
</dict>
</plist>
```

将 `{USER_PROVIDED_APP_ID}` 和 `{USER_PROVIDED_BEACON_URL}` 替换为第 2 步的实际值。
根据配置块中的 `DTXUserOptIn` 值，将 `{USER_OPT_IN_VALUE}` 替换为 `<true/>` 或 `<false/>`。如果未提供配置块，默认为 `<true/>`。

- `DTXUserOptIn` —— 当为 `true` 时，以数据收集关闭的状态启动代理，需要通过隐私 API（在第 5 步配置）显式选择加入。当为 `false` 时，数据收集立即开始，无需选择加入，并跳过第 5 步。
- `DTXStartupLoadBalancing` —— 启动时启用跨集群节点的负载均衡。
- `DTXStartupWithGrailEnabled` —— 在收到集群配置之前，首次应用启动时在最新 Dynatrace 上启用 RUM。一旦集群配置被缓存，此标志将被永久覆盖。

### 5. 添加用户选择加入隐私配置

使用 `mcp_xcode_XcodeRead` 读取应用的入口点文件，然后使用 `mcp_xcode_XcodeUpdate` 添加带 TODO 注释的隐私配置代码，以便用户知道将其移动到适当位置（例如隐私设置屏幕）：

**对于 SwiftUI 应用（`@main` App struct 文件）：**
在 `App` struct 的 `init()` 方法内添加以下内容（如果不存在则创建一个）：

```text
init() {
    // TODO: Move this privacy configuration to your app's privacy settings screen.
    // These settings are provided here for a quick start with capturing monitoring data.
    // In production, this should be driven by user consent (e.g., a privacy settings screen).
    let privacyConfig = Dynatrace.userPrivacyOptions()
    privacyConfig.dataCollectionLevel = .userBehavior
    privacyConfig.crashReportingOptedIn = true
    Dynatrace.applyUserPrivacyOptions(privacyConfig) { (successful) in
        // callback after privacy changed
    }
}
```

**对于 UIKit 应用（AppDelegate）：**
在 `application(_:didFinishLaunchingWithOptions:)` 内添加相同的代码。

### 6. 添加 Dynatrace import

使用 `mcp_xcode_XcodeUpdate` 将 `import Dynatrace` 添加到应用的入口点文件。

**对于 SwiftUI 应用：** 添加到包含 `@main` App struct 的文件。

**对于 UIKit 应用：** 添加到 `AppDelegate.swift`。

### 7. 构建并运行

使用 Xcode MCP 服务器构建项目：

- 使用 `mcp_xcode_BuildProject` 构建项目
- 如果构建成功，向用户报告成功
- 如果构建失败，显示构建错误并帮助用户解决

### 8. 验证安装

运行捆绑的验证脚本 [scripts/verify-setup.sh](./scripts/verify-setup.sh)。它会断言构建输出、plist 值、模拟器启动和代理启动 —— 全部以 `set -e` 串行执行，失败时以不同的退出码硬失败。

**调用：**

```bash
./scripts/verify-setup.sh <ProjectPath> <SchemeName> \
  <ExpectedAppID> <ExpectedBeaconURL> [ExpectedOptIn]
```

参数（从 Xcode 项目和第 2/4 步使用的值中发现）：

- `ProjectPath` —— 例如 `./MyApp.xcodeproj`
- `SchemeName` —— 运行 `xcodebuild -list -project <ProjectPath>` 查看可用 scheme，然后选择正确的应用 scheme（不是测试或不相关的 scheme）
- `ExpectedAppID` —— 写入 `Dynatrace.plist` 的 `DTXApplicationID` 值
- `ExpectedBeaconURL` —— 写入 `Dynatrace.plist` 的 `DTXBeaconURL` 值
- `ExpectedOptIn` —— 可选；`true` 或 `false`。传入第 4 步使用的 `DTXUserOptIn` 值以断言它。省略则跳过。

**退出码：**

| 代码 | 含义                                                                             | 行动                                                                                                    |
| ---- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `0`  | 所有检查通过；plist 值正确；看到代理启动日志                     | 报告成功                                                                                            |
| `2`  | 构建输出缺少 framework、缺少 plist，或 plist 值与预期不匹配 | SPM 链接 / plist target 成员关系 / 错误的值 —— stderr 会说明是哪一个                                     |
| `3`  | 模拟器启动 / 安装 / 启动失败                                            | 检查 stderr；如果应用 bundle 过时则重新运行第 7 步                                                      |
| `4`  | 启动后未找到 `Dynatrace Core` 日志                                         | 验证入口点中有 `import Dynatrace`；建议手动启动并检查 Dynatrace 环境 |
| `5`  | `log show` 本身失败                                                            | 模拟器状态问题；重启模拟器后重试                                               |

脚本会打印 `=== Phase N: ... ===` 标题，以便从 stdout 调试部分失败。

#### 验证后指导

让模拟器保持运行且应用打开，以便用户与之交互并生成将出现在其 Dynatrace 环境中的事件。不要关闭模拟器。

成功验证后，告知用户：

- 模拟器正随应用运行 —— 要验证数据到达其 Dynatrace 环境，他们应该：
  1. 与应用交互：点击按钮、在屏幕之间导航以生成用户操作和事件
  1. 将应用发送到后台（在模拟器中按 Home 按钮）再带回前台 —— 这会触发向 Dynatrace 集群的即时会话刷新
  1. 几分钟内，生成的事件将出现在其 Dynatrace 环境中
- 查看数据：Experience Vitals > Overview > Mobile > 选择前端
- 也可以使用 DQL 直接在 Grail 中查询数据
- 高级配置选项参见：https://docs.dynatrace.com/docs/observe/digital-experience/new-rum-experience/mobile-frontends/ios/id-03-configuration

## 重要说明

- 此技能仅涵盖 **SPM 集成**。不支持 CocoaPods 和手动 framework 集成。
- 除非用户明确要求，否则不要添加额外的 DTX 配置键 —— 默认值已针对良好的首次体验进行了优化。
- 此设置的公开文档位于：https://docs.dynatrace.com/docs/observe/digital-experience/new-rum-experience/mobile-frontends/ios/id-01-initial-setup
