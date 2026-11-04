---
name: dt-setup-react-native
license: Apache-2.0
description: >-
  将 Dynatrace React Native 插件集成到 React Native 或 Expo 项目中 ——
  依赖设置、dynatrace.config.js、Babel 注册、npx 插桩、
  导航追踪、用户隐私选项和验证。自动处理裸 React Native
  和 Expo（babel-preset-expo）的 Babel 配置。
  触发词："add Dynatrace to React Native"、"React Native plugin setup"、"instrument React Native app"、
  "integrate Dynatrace RN"、"mobile observability React Native"、"react-native-plugin"、
  "dynatrace react native"、"add Dynatrace to Expo"、"instrument Expo app"、"Dynatrace Expo setup"。
  不用于：查询 RN RUM 数据（请使用 dt-obs-frontends）、非 React Native 的移动端设置，
  或 Dynatrace 服务端配置。
---

# Dynatrace React Native 插件集成技能

## 前提条件

- Node.js 16.0+ 且 npm 在 `PATH` 上可用
- 有一个现有的 React Native 项目（v0.68+）或 Expo 项目（v45+），项目根目录下有 `package.json`
- `android/` 和 `ios/` 平台文件夹存在（Expo 托管工作流需要先 `npx expo prebuild`）
- 有一个可访问 Experience Vitals 的 Dynatrace 环境（以获取 `applicationId` 和 `beaconUrl`，或下载 `dynatrace.config.js`）
- 可通过控制台访问 Experience Vitals → Mobile 以配置应用设置（数据隐私、启用与成本控制）
- 用于 iOS 构建的 macOS + CocoaPods

按顺序完成以下步骤，在每个决策点与用户交互。在建议更改之前先阅读实际项目文件 —— 不要假设当前状态。

## 第 1 步 —— 检查是否已存在 `dynatrace.config.js`

在询问用户任何内容之前，先检查项目根目录下是否存在 `dynatrace.config.js`。

- **文件存在：** 读取它，显示 `applicationId` 和 `beaconUrl`，并确认它们与目标环境匹配。如果正确，运行下面的 `userOptIn` 检查并跳到第 3 步（配置已存在 —— 不需要第 2 步）。
- **文件不存在：** 继续到第 2 步。

**`userOptIn` 检查：**

检查文件中的 `userOptIn`（Android 块）和 `DTXUserOptIn`（iOS 块）。

- **两个平台都存在：** 按原样信任该值。如果为 `true`，标记第 9 步。如果为 `false`，跳过第 9 步。
- **任一平台缺失：** 询问用户：**"你的 User Opt-In 模式是启用还是禁用？"**（如果不确定：Experience Vitals → Mobile → [你的应用] → Settings → Data Privacy。）将缺失的值添加到相关平台，然后在最终值为 `true` 时标记第 9 步。

## 第 2 步 —— 获取 `dynatrace.config.js`（仅当第 1 步未找到文件时）

询问用户更倾向于哪种方式：

**选项 A —— 从控制台下载（推荐）：**

1. 打开他们的 Dynatrace 环境
1. 导航到：Experience Vitals → New Frontend → Mobile
1. 输入应用名称并选择 **React Native** 作为平台
1. 在 **Select capability and settings** 屏幕上，配置监控功能（崩溃报告、用户操作监控等）
1. 下载 `dynatrace.config.js` 并将其放到项目根目录（与 `package.json` 同级）

文件就位后，应用第 1 步中的 `userOptIn` 检查，并在需要时标记第 9 步。

**选项 B —— 手动提供凭据：**
阅读 `references/config-js.md` 获取完整模板和条件块。在创建任何文件之前从用户收集所有必需的值，然后应用 `userOptIn` 检查，并在需要时标记第 9 步。

## 第 3 步 —— 安装插件

先阅读 `package.json`。

- **不存在：** 运行：
  ```bash
  npm install @dynatrace/react-native-plugin
  ```
- **已在 `dependencies` 下：** 无需更改。
- **在 `devDependencies` 下：** 将其移除并运行 `npm install @dynatrace/react-native-plugin`。该插件在运行时需要，包括在发布构建中。

注意：`npm install` 会按字母顺序排序 `package.json` 中的 `dependencies` 对象。此步骤后现有条目可能显示为重新排序 —— 这是预期的 npm 行为，不是错误。

## 第 4 步 —— 安装 iOS pods（仅 macOS）

如果在 macOS 上并面向 iOS，运行：

```bash
cd ios && pod install && cd ..
```

在继续之前确认成功。必须安装 CocoaPods（如缺失则 `gem install cocoapods`）。

## 第 5 步 —— 在 `babel.config.js` 中注册 Babel 插件

阅读 `babel.config.js`。将 `BabelPluginDynatrace` 追加到 `plugins` 数组，如果存在 `react-native-reanimated/plugin`，则**紧挨着它之前**添加（reanimated 必须始终最后）：

```js
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // ... existing plugins ...
    '@dynatrace/react-native-plugin/instrumentation/BabelPluginDynatrace',
    // react-native-reanimated/plugin goes here if present — must stay last
  ],
};
```

- 如果 plugins 数组已包含 `'@dynatrace/react-native-plugin/instrumentation/BabelPluginDynatrace'`：跳过此步骤。
- 如果 `dynatrace.config.js` 中设置了 `useLegacyJscodeshift: true`：Babel 插件已在内部应用 —— 跳过此步骤。
- 如果项目已配置 `metro.config.js` 使用 `babelTransformerPath: '@dynatrace/react-native-plugin/lib/dynatrace-transformer'`：那是旧版 Metro transformer 方法 —— 自动插桩已处理；跳过此步骤和第 6 步。

需要指出并纠正的常见错误：

- 将插件放在 `presets` 而不是 `plugins`
- 将 `BabelPluginDynatrace` 放在 `react-native-reanimated/plugin` 之后 —— reanimated 必须始终是绝对最后的插件

## 第 6 步 —— 在 `babel.config.js` 中注册 JSX runtime

阅读 `babel.config.js` 并确定项目使用哪个 preset —— 这决定 JSX runtime 如何注册。

### Expo（`babel-preset-expo`）

如果 `presets` 中出现 `babel-preset-expo`，**在 preset 本身上**设置 `jsxImportSource`。不要添加单独的 `@babel/plugin-transform-react-jsx` 插件 —— Expo 的 preset 已拥有 JSX 转换，在其上叠加第二个 JSX 插件会破坏插桩。

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', {
        jsxRuntime: 'automatic',
        jsxImportSource: '@dynatrace/react-native-plugin',
      }],
    ],
    plugins: [
      '@dynatrace/react-native-plugin/instrumentation/BabelPluginDynatrace',
      'react-native-reanimated/plugin',  // stays last
    ],
  };
};
```

- 如果 `babel-preset-expo` 已有 `jsxImportSource: '@dynatrace/react-native-plugin'`：无需更改。
- 如果已设置不同的 `jsxImportSource`：将其替换为 `'@dynatrace/react-native-plugin'`。
- 移除任何现有的 `@babel/plugin-transform-react-jsx` 插件条目 —— 它不得与 `babel-preset-expo` 上的 preset 级 `jsxImportSource` 共存。

### 裸 React Native（`@react-native/babel-preset` 或 `metro-react-native-babel-preset`）

对于 metro 0.72.0+（React Native 0.71+），在 plugins 数组中将带 Dynatrace `importSource` 的 `@babel/plugin-transform-react-jsx` 添加到 `BabelPluginDynatrace` **之前**：

```js
module.exports = {
  presets: [
    ['module:@react-native/babel-preset', { unstable_transformProfile: 'hermes-stable' }],
  ],
  plugins: [
    ['@babel/plugin-transform-react-jsx', {
      runtime: 'automatic',
      importSource: '@dynatrace/react-native-plugin',
    }],
    '@dynatrace/react-native-plugin/instrumentation/BabelPluginDynatrace',
    'react-native-reanimated/plugin',  // stays last
  ],
};
```

所需的插件顺序是：

1. `@babel/plugin-transform-react-jsx`（JSX runtime —— 第一）
1. `BabelPluginDynatrace`（自动插桩 —— 在 reanimated 之前）
1. `react-native-reanimated/plugin`（必须绝对最后）

- 如果项目已有带 `importSource: '@dynatrace/react-native-plugin'` 的 `@babel/plugin-transform-react-jsx`：无需更改。
- 如果设置了不同的 `importSource`：将其替换为 `'@dynatrace/react-native-plugin'`。

任何 Babel 更改后，在下次构建时重置 Metro 缓存：

```bash
npx react-native start --reset-cache
```

## 第 7 步 —— 运行 `npx instrumentDynatrace`

```bash
npx instrumentDynatrace
```

这会读取 `dynatrace.config.js` 并自动配置 Android `build.gradle` 和 iOS `Info.plist`。**每当 `dynatrace.config.js` 更改时都必须重新运行。**

需要指出并纠正的常见错误：

- 更改 `dynatrace.config.js` 后跳过此步骤
- 使用 `react-native instrument-dynatrace` —— 效果相同，但对 RN 0.70+ 已弃用
- 手动编辑 `build.gradle` 或 `Info.plist` —— 不需要，脚本会处理

如果 `android/` 和 `ios/` 文件夹存在但自动 plist 发现失败，传入显式路径：

```bash
npx instrumentDynatrace plist=ios/YourApp/Info.plist
```

**仅 Expo：** 如果 `android/` 和 `ios/` 文件夹尚不存在，先运行 `npx expo prebuild`，然后重新运行 `npx instrumentDynatrace`。

## 第 7a 步 —— 手动 SDK 启动（仅当 `autoStart: false` 时）

**如果 `dynatrace.config.js` 中 `autoStart` 为 `true` 或缺失，则跳过此步骤 —— SDK 会自动启动。**

检查 `dynatrace.config.js` 的 `react` 块中是否有 `autoStart: false`。如果存在，SDK 不会自行启动，且在显式调用 `Dynatrace.start()` 之前不会收集任何数据。

在应用入口文件的顶层（例如 `App.tsx` 或 `index.js`）添加启动调用。任何依赖 SDK 就绪的逻辑都放在 `await` 之后：

```ts
import { Dynatrace, ConfigurationBuilder } from '@dynatrace/react-native-plugin';

await Dynatrace.start(
  new ConfigurationBuilder('<BEACON_URL>', '<APPLICATION_ID>').buildConfiguration()
);
// SDK is initialized — place any SDK-dependent logic here
```

将 `<BEACON_URL>` 和 `<APPLICATION_ID>` 替换为 `dynatrace.config.js` 中**完全相同的值** —— 它们必须匹配，否则 SDK 将报告到错误的环境。

**重要：** 即使 `autoStart: false`，`beaconUrl` 和 `applicationId` 仍必须存在于 `dynatrace.config.js` 中（供 `npx instrumentDynatrace` 配置原生文件）。运行时传给 `ConfigurationBuilder` 的值生效 —— 使用手动启动时，配置文件中的值被忽略。

**权衡：** 手动启动会导致 SDK 错过原生应用启动事件以及调用 `start()` 之前发生的任何交互。除非运行时凭据注入是硬性要求，否则使用 `autoStart: true`（默认值）。

## 第 8 步 —— 启用导航追踪

检查 `dynatrace.config.js` 中的 `react.navigation` 块，并检查 `package.json` 中的 `@react-navigation/native`。

如果存在 `@react-navigation/native` 且 `navigation.enabled` 未设置为 `true`，则添加它：

```js
module.exports = {
  react: {
    navigation: {
      enabled: true,  // requires @react-navigation/native v5–v7
    },
    // ...
  },
  // ...
};
```

然后重新运行 `npx instrumentDynatrace`。

**作用：** 启用后，插件挂接到 React Navigation 的 `NavigationContainer` 并自动检测路由变化。每个导航事件都作为视图变化报告给 Dynatrace，当前路由表示为 URL 风格的路径（例如 `/Home`、`/Home/Details`）。这会填充 Dynatrace 用户会话中的屏幕时间线，并将所有事件关联到当前活跃的屏幕。此设置在插件自身配置模板中默认启用。

如果**不**存在 `@react-navigation/native`：告知用户自动视图追踪需要 `@react-navigation/native`。他们可以改用 `Dynatrace.startView("ScreenName")` 进行手动视图追踪。

## 第 9 步 —— 隐私选项调用（仅当 `userOptIn: true` 时）

**如果 `userOptIn` 在第 1 步或第 2 步期间未被设置为 `true`，则跳过此步骤。**

阅读 `references/user-opt-in.md` 获取关于 `DataCollectionLevel`、`crashReportingOptedIn` 和放置选项的完整指导。询问其中定义的用户问题，然后将该调用应用到相关文件。

## 第 10 步 —— 设置后摘要

向用户确认哪些功能已启用：

**默认启用**（当 `userOptIn` 为 `false` 或缺失时）：

- ✅ 崩溃报告
- ✅ 用户操作追踪（Touchables、Buttons、Pressable、Switch）
- ✅ 网络监控
- ✅ 错误处理程序
- ✅ 自动启动

> 当 `userOptIn: true` 时，所有数据收集 —— 包括崩溃报告 —— 都以 `applyUserPrivacyOptions(...)` 调用为前提。

**在此次设置期间配置：**

- 隐私模式：[userOptIn: true —— 已添加同意调用 / 退出（SDK 默认）]
- 导航追踪：[react.navigation.enabled: true / 通过 Dynatrace.startView() 手动]

## 第 11 步 —— 验证

阅读 `references/verification.md` 并向用户展示验证清单。如果 5 分钟后仍无数据出现，请按该文件中的故障排查步骤逐项处理。

## 参考文件

- `references/config-js.md` —— 完整的 `dynatrace.config.js` 模板，含 Grail 和 userOptIn 条件块
- `references/user-opt-in.md` —— `applyUserPrivacyOptions` 指导、`DataCollectionLevel` 选项、放置选项
- `references/verification.md` —— 设置后验证清单和故障排查

## 外部参考

- [npm 上的 @dynatrace/react-native-plugin](https://www.npmjs.com/package/@dynatrace/react-native-plugin) —— 包变更日志、API 文档和最新版本
- [Dynatrace React Native 安装文档](https://docs.dynatrace.com/docs/observe/digital-experience/new-rum-experience/mobile-frontends/react-native) —— 官方设置指南
