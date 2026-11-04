---
name: dt-setup-flutter
license: Apache-2.0
description: >-
  将 Dynatrace Flutter 插件集成到 Flutter 项目中 —— 依赖设置、配置、
  SDK 启动引导、导航追踪和验证。
  触发词："add Dynatrace to Flutter"、"Flutter plugin setup"、"instrument Flutter app"、
  "integrate Dynatrace Flutter"、"mobile observability Flutter"、"dynatrace_flutter_plugin"。
  不用于：查询 Flutter RUM 数据（请使用 dt-obs-frontends）、非 Flutter 的移动端设置，
  或 Dynatrace 服务端配置。
---

# Dynatrace Flutter 插件集成技能

## 前提条件

- 已安装 Flutter SDK，且 `flutter` 在 `PATH` 上可用
- 有一个现有的 Flutter 项目，项目根目录下有 `pubspec.yaml`
- 有一个可访问 Experience Vitals 的 Dynatrace 环境（以获取 `applicationId` 和 `beaconUrl`，或下载 `dynatrace.config.yaml`）
- 可通过控制台访问 Experience Vitals → Mobile 以配置应用设置（数据隐私、启用与成本控制）
- `dart` CLI 可用（随 Flutter SDK 提供；用于运行插件配置脚本）

按顺序完成以下步骤，在每个决策点与用户交互。在建议更改之前先阅读实际项目文件 —— 不要假设当前状态。

## 第 1 步 —— 检查是否已存在 `dynatrace.config.yaml`

在询问用户任何内容之前，先检查项目根目录下是否存在 `dynatrace.config.yaml`。

- **文件存在：** 读取它，显示 `applicationId` 和 `beaconUrl`，并确认它们与目标环境匹配。如果正确，运行下面的 `userOptIn` 检查并跳到第 3 步。
- **文件不存在：** 继续到第 2 步。

**`userOptIn` 检查：**

检查文件中的 `userOptIn`（Android）和 `DTXUserOptIn`（iOS）。

- **两个平台都存在：** 按原样信任该值。如果为 `true`，标记第 7a 步。如果为 `false`，跳过第 7a 步。
- **任一平台缺失：** 询问用户：**"你的 User Opt-In 模式是启用还是禁用？"**（如果不确定：Experience Vitals → Mobile → [你的应用] → Settings → Data Privacy。）将缺失的值添加到相关平台，然后在最终值为 `true` 时标记第 7a 步。

## 第 2 步 —— 获取 `dynatrace.config.yaml`（仅当第 1 步未找到文件时）

询问用户更倾向于哪种方式：

**选项 A —— 从控制台下载（推荐）：**

1. 打开他们的 Dynatrace 环境
1. 导航到：Experience Vitals → New Frontend → Mobile
1. 输入应用名称并选择 **Flutter** 作为平台
1. 在 **Select capability and settings** 屏幕上，配置监控功能（崩溃报告、用户操作监控等）。用户操作监控可稍后通过 Experience Vitals → [应用] → Settings → Enablement and Cost Control 更改。
1. 下载 `dynatrace.config.yaml` 并将其放到项目根目录（与 `pubspec.yaml` 同级）

文件就位后，应用第 1 步中的 `userOptIn` 检查，并在需要时标记第 7a 步。

**选项 B —— 手动提供凭据：**
阅读 `references/config-yaml.md` 获取完整模板和条件块。在创建任何文件之前从用户收集所有必需的值，然后应用 `userOptIn` 检查，并在需要时标记第 7a 步。

## 第 3 步 —— 添加依赖

先阅读 `pubspec.yaml`。

- **不存在：** 运行：
  ```bash
  flutter pub add dynatrace_flutter_plugin
  ```
- **已在 `dependencies` 下：** 无需更改 —— 继续到第 4 步。
- **在 `dev_dependencies` 下：** 将其从 `dev_dependencies` 中移除，然后运行 `flutter pub add dynatrace_flutter_plugin`。该插件在运行时需要，包括在发布构建中。

## 第 4 步 —— 获取依赖

如果第 3 步运行了 `flutter pub add`，依赖已经获取 —— 跳过此步骤。

否则运行：

```bash
flutter pub get
```

在继续之前确认成功。

## 第 5 步 —— 运行 Dynatrace 配置脚本

```bash
dart run dynatrace_flutter_plugin
```

这会读取 `dynatrace.config.yaml` 并自动配置 Android Gradle 和 `ios/Runner/Info.plist`。无需手动编辑原生文件。

需要指出并纠正的常见错误：

- `flutter pub run dynatrace_flutter_plugin` —— 错误，应使用 `dart run dynatrace_flutter_plugin`
- 手动编辑 `build.gradle` / `build.gradle.kts` 或 `Info.plist` —— 不需要

## 第 6 步 —— 在 `main.dart` 中启动引导 SDK

阅读 `lib/main.dart`。将 `runApp(...)` 替换为 `Dynatrace().start(...)`：

```dart
import 'package:dynatrace_flutter_plugin/dynatrace_flutter_plugin.dart';
import 'package:flutter/material.dart';

void main() {
  Dynatrace().start(const MyApp());
}
```

- `Dynatrace().start()` 会在内部调用 `runApp` —— 移除任何单独的 `runApp` 调用
- Dynatrace 在 `start()` 之前不要求 `WidgetsFlutterBinding.ensureInitialized()`，但如果你的应用需要它进行其他启动前初始化（例如插件或平台设置），请保留它
- 不要 `await` `Dynatrace().start()` 本身；只对必须在调用 `start()` 之前完成的其他应用初始化使用 `await`

## 第 7 步 —— 添加导航追踪

在根 `MaterialApp` 或 `CupertinoApp` 中，将 `DynatraceNavigationObserver()` 添加到 `navigatorObservers`：

```dart
MaterialApp(
  navigatorObservers: [DynatraceNavigationObserver()],
  ...
)
```

```dart
CupertinoApp(
  navigatorObservers: [DynatraceNavigationObserver()],
  ...
)
```

## 第 7a 步 —— 隐私选项调用（仅当 `userOptIn: true` 时）

**如果 `userOptIn` 在第 1 步或第 2 步期间未被设置为 `true`，则跳过此步骤。**

阅读 `references/user-opt-in.md` 获取关于 `DataCollectionLevel`、`crashReportingOptedIn` 和放置选项的完整指导。询问其中定义的用户问题，然后将该调用应用到相关文件。

## 第 8 步 —— HTTP 插桩（如适用）

检查 `pubspec.yaml` 中是否有 `http` 包依赖。另外，在代码库中搜索 `import 'dart:io'` 和 `HttpClient` 用法。如果存在任一项，应用插桩：

| 包 | 插桩 |
|---|---|
| `http` | `Dynatrace().createHttpClient()` —— 在构造处替换 `http.Client()` |
| `dart:io HttpClient` | 通过 `Dynatrace().createWebRequestTiming(...)` 手动计时 —— 没有可直接替换的包装器 |

`createHttpClient()` 接受一个可选的 `client:` 参数，用于包装现有的客户端实例。找到项目中每个 `http.Client()` 构造处，并将其替换为 `Dynatrace().createHttpClient()`。


如果都不存在，记录下来，以便日后添加网络调用时参考。

## 第 9 步 —— 设置后摘要

向用户确认哪些功能已启用：

**默认启用**（当 `userOptIn` 为 `false` 或缺失时）：

- ✅ 崩溃报告
- ✅ 用户操作追踪
- ✅ 网络监控
- ✅ 生命周期监控
- ✅ 自动启动

> 当 `userOptIn: true` 时，所有数据收集 —— 包括崩溃报告 —— 都以 `applyUserPrivacyOptions(...)` 调用为前提。

**在此次设置期间配置：**

- 隐私模式：[userOptIn: true —— 已添加同意调用 / 退出（SDK 默认）]
- 导航追踪：[已添加 DynatraceNavigationObserver]
- HTTP 插桩：[已应用 / 暂不适用]

## 第 10 步 —— 验证

阅读 `references/verification.md` 并向用户展示验证清单。如果 5 分钟后仍无数据出现，请按该文件中的故障排查步骤逐项处理。

## 参考文件

- `references/config-yaml.md` —— 完整的 `dynatrace.config.yaml` 模板，含 Grail 和 userOptIn 条件块
- `references/user-opt-in.md` —— `applyUserPrivacyOptions` 指导、`DataCollectionLevel` 选项、放置选项
- `references/verification.md` —— 设置后验证清单和故障排查

## 外部参考

- [pub.dev 上的 dynatrace_flutter_plugin](https://pub.dev/packages/dynatrace_flutter_plugin) —— 包变更日志、API 文档和最新版本
- [Dynatrace Flutter 安装文档](https://docs.dynatrace.com/docs/observe/digital-experience/new-rum-experience/mobile-frontends/flutter/id-01-initial-setup) —— 初始设置文档
