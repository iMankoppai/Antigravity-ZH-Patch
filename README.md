# Antigravity 中文汉化管理器

[![Release](https://img.shields.io/badge/Release-v1.3.5-blue.svg)](https://github.com/iMankoppai/Antigravity-ZH-Patch/releases)
[![Antigravity](https://img.shields.io/badge/Antigravity-2.28.2-4285F4.svg)](https://github.com/iMankoppai/Antigravity-ZH-Patch/releases)
[![Platform](https://img.shields.io/badge/Platform-Windows%20x64-0078D6.svg)](https://github.com/iMankoppai/Antigravity-ZH-Patch)
[![Framework](https://img.shields.io/badge/.NET-8.0%20WPF-512BD4.svg)](https://dotnet.microsoft.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Google Antigravity 官方 Windows 客户端的专属汉化与原生体验管理工具。提供免重启热加载、纯净 ASAR 原生内嵌固化、全量工作状态深度汉化及托盘常驻交互增强。

> **当前源码版本 v1.3.5（汉化内核 v73）适配 Google Antigravity 2.28.2（Windows x64）；v1.3.5 为本地构建，尚未发布到 GitHub Releases（已发布最新为 v1.3.4）。** 界面词条 **6,047 条**，另含 17 个官方插件、140 份完整插件技能正文、9 份内置技能正文及 6 份规则／智能体详情。官方更新导致汉化失效时，可运行管理器重新安装，或点击【新版汉化适配】热恢复，详见 [`docs/新版汉化适配.md`](docs/新版汉化适配.md)。

---

## ✨ 核心特性

- **🔁 新版汉化适配（v1.1.0）**
  Antigravity 更新后汉化丢失时，点击右上角【新版汉化适配】。按钮按需检查兼容性：客户端运行时恢复当前窗口中文；彻底退出客户端后再点击，可恢复永久汉化。没有后台升级监测、自动重试或退出后自动安装。旧版备份按版本和哈希保存；不兼容的版本会提示等待适配。

- **⚡ 免重启实时汉化（热加载模式）**  
  软件在前台运行中无需退出，通过 CDP 协议秒级动态注入最新翻译引擎，界面即时切换为中文，**AI 正在进行的思考与会话连接完全不受影响**。
  支持多文本节点拼接还原、动态模板与弹窗外定时任务翻译，同时严格保护模型名与推理档位（如 `Gemini 3.8 Flash High`、`Chief of Staff`、`Best of N` 等专有名词保持英文原名）。

- **📦 永久原生内嵌汉化（终极洁癖模式）**  
  直接将翻译引擎与完整深度精校词库无缝封包进 `resources/app.asar` 内部：
  - **零外置文件夹**：安装后，Antigravity 根目录下**无需存在任何外部补丁文件夹**，也没有任何散落的 `.cmd` / `.ps1` 脚本，目录纯净整洁；
  - **自动安全备份**：安装时自动将官方原版备份为 `app.asar.bak`，按版本与哈希核对，不覆盖旧版备份。

- **🧠 工作状态与动态动作汉化**
  深度覆盖智能体运行全周期文本：
  - **实时思考计时**：支持思考中动态计时（如 `Thinking for 22s ›` ➔ `正在思考 22 秒`）与思考完成折叠（`已思考 22 秒`）；
  - **复合动作折叠行**：覆盖多动作拼接场景（如 `正在探索文件，正在运行命令，正在编辑成果 ⌄`）；
  - **智能体与任务操作**：`已列出 1 个任务`、`已终止任务`、`已向任务发送输入`、`已调用子代理`、`已设定定时任务` 等，支持 React 拆分节点与动态更新；文件名、行号、命令和任务名称保持原样。

- **🎨 界面与生态全面汉化**  
  深度覆盖插件扩展市场（Google Workspace、科学计算套件、开发工具等）、所有个性化外观主题及权限审查弹窗。

- **💠 天青蓝对话气泡（可选外观）**  
  可选开启纯净天青蓝用户消息气泡：图文上下分离、短句单行舒展、长句安全折行、时间/复制/撤销按钮下移至气泡外、解除官方吸顶悬浮。客户端运行时**即时生效**，**永久安装后启动自动应用**，随时一键还原官方默认。纯 CSS 外观补丁，**不修改任何文本内容与业务逻辑**。

- **📊 会话统计状态条（可选）**  
  在客户端底部实时显示当前会话的 **轮数 / 步数 / tok/秒 / 总 token / 缓存命中率 / 缓存 TTL 倒计时 / 上下文占用 / 距 auto-compact 约几步 / 成本估算 / 配额积分**（上下文按 App 的**自动压缩上限**计：Gemini 3.8 Flash ≈256k、Claude 4.6 ≈160k、GPT-OSS 120B ≈80k，**不是模型理论 1M 窗口**；成本为 API 等价估算；配额/积分来自 App 自身的 `GetUserStatus`）。数据来自本机会话日志 `transcript.jsonl`（**只读、不外传**）。**开启常驻后随 Antigravity 启动自动显示（内嵌内核）**：底栏三组内联（⏱ 轮/步·tok/s ｜ 🗄 总token·缓存命中 ｜ ◔ 上下文%）在模型选择器与右侧控件之间的中间空白区**居中**，点击某一组只弹出对应的一张卡片（会话统计 / Token 用量 / 上下文已用），三卡独立不连体；也可随时在管理器中关闭。类似 DSH/Claude Code 的 statusline 体验。

- **↩️ 官方纯净英文一键秒级还原**  
  随时从官方备份文件还原原生 ASAR，清除内存热注入，100% 恢复官方初始状态。

- **🩺 智能运行环境诊断与健康检查**  
  自动定位安装路径，全方位诊断 ASAR 内核完整性、原版备份就绪度、调试通信通道及读写权限，官方静默更新或环境异常时支持一键排查。

- **🎛️ Windows 原生交互增强**  
  原生支持关闭窗口最小化至系统托盘、双击托盘图标快速激活主界面及右键中文托盘菜单。

---

## 🚀 快速上手

### 方式一：直接运行独立程序（推荐）
1. 前往 [Releases](https://github.com/iMankoppai/Antigravity-ZH-Patch/releases/latest) 页面；
2. 下载 **`AntigravityZhManager.exe`** 或 **`Antigravity-ZH-1.3.5-Windows-x64.zip`**；
   > 说明：**v1.3.5 目前是本地构建、尚未上传 GitHub Releases**（已发布最新为 v1.3.4）。需要 v1.3.5 可先从本项目 `dist/` 取包，或等发布后再下。
3. 双击下载的 EXE，或解压 ZIP 后运行其中的 `Antigravity汉化管理器.exe`（单文件自包含，已内置 .NET 8 运行时，无需安装任何前置依赖）；
4. 点击 **【⚡ 开启汉化】**（免重启实时生效）或 **【📦 永久安装汉化（洁癖模式）】** 即可。

### 方式二：手动固化
在管理器中点击【📦 永久安装汉化】，管理器会自动备份 `app.asar.bak` 并将最新汉化内核安全写入。完成后即使重启电脑或不运行管理器，客户端也始终保持中文。

> **官方更新后怎么办**：官方更新会整体替换 `app.asar` 并移除 `app.asar.bak`。退出客户端后用管理器重新永久安装即可；已登记版本的旧补丁可平滑覆盖，未知版本会提示等待适配。

---

## 🛠️ 项目源码与技术架构

```text
Antigravity ZH/
├── Antigravity汉化管理器.exe    # 独立单文件发布程序（C# WPF Self-Contained）
├── README.md                 # 项目文档（用户向）
├── HANDOFF.md                # 交接文档（维护者向：现状、playbook、踩坑记录）
├── 当前状态.json              # 当前基线台账（版本/哈希/验证结果）
├── src/                      # C# / .NET 8 完整工程源代码
│   └── AntigravityZhManager/ # 管理器源码、XAML 界面与内嵌资源 Assets
├── localization/             # 官方基线清单与逐版本词条增量
├── tests/                    # 渲染/打包/词库质量门禁（统一入口 scripts/check-current.ps1）
├── docs/                     # 使用说明与维护文档；docs/history/ 为历次版本说明归档
├── work/                     # 本机验证证据（git 忽略）
└── 维护工具/                  # 内核生成与基线清单脚本
```

### 技术规格
- **适配软件**：**Google Antigravity 2.28.2**（Windows x64）
- **汉化内核**：v73（词条 6,047 条）
- **词库规模**：全量深度精校词库（涵盖核心 UI、系统菜单、工作状态、插件市场与主题设置）
- **技术实现**：C# .NET 8 WPF 现代化界面 + ASAR 虚拟模块字节级封包 + CDP WebSocket 动态管道注入
- **可选增强**：天青蓝气泡外观（`theme-azure-bubble.css`，运行时+永久）；会话统计状态条（`stats-hud.js` + `StatsHudService`，主进程读 `transcript.jsonl`、内嵌 `attach()` 随启动自动显示、默认 DSH 风格三组内联居中、点击各组弹对应独立卡片）

### 维护与回归

- **接手维护从 [`HANDOFF.md`](HANDOFF.md) 开始**——现状快照、适配/排查/发布三套 playbook、踩坑记录。
- **统一检查入口**：`powershell -File scripts/check-current.ps1`——依赖检查、词库质量、渲染回归、打包一致性、版本一致性、引擎测试共 33 项门禁，任一必需项失败即非零退出。
- **从核心 Assets 重建内嵌资源**：`node 维护工具/重建汉化内核.js`；仅校验同步：追加 `--check`。
- **逐版词条增量**：`localization/vXX-ui-additions.json` + `scripts/sync-vXX-localization.cjs`。
- 汉化范围与保留项说明：[`docs/汉化范围说明-哪些不翻译.md`](docs/汉化范围说明-哪些不翻译.md)（为什么内容、专名与程序内部标识故意保留英文）。
- 维护流程与发布判定：[`docs/项目维护与交付指导书.md`](docs/项目维护与交付指导书.md)。

---

## 📦 版本记录

### v1.3.5 (内核 v73) — 新增天青蓝气泡外观 + 会话统计状态条（本地构建，未发布 GitHub）

- **适配客户端**：Google Antigravity **2.28.2**（Windows x64），汉化内核保持 **v73**（词条 6,047 条不变）。
- **新增可选外观：天青蓝对话气泡**：纯净天青蓝用户消息气泡、图文上下分离、短句单行舒展、长句安全折行、时间/复制/撤销按钮移至气泡外、解除官方吸顶悬浮。客户端运行时**即时生效**；永久安装后**启动自动应用**；随时一键还原官方默认。纯 CSS 外观，**不修改任何文本内容与业务逻辑**。技术：CSS 内嵌进 `zh-bundle.js`，`attach()` 读 `%APPDATA%\Antigravity\zh-theme.json`。
- **新增可选：会话统计状态条（DSH 风格）**：读本机会话日志 `transcript.jsonl`，底栏三组内联（⏱ 轮/步·tok/s ｜ 🗄 总token·缓存命中 ｜ ◔ 上下文%）在模型选择器与右侧控件之间的中间空白区**居中**；点击某一组只弹出对应的一张卡片——**⏱ 会话统计 / 🗄 Token 用量（含缓存命中、未缓存输入、缓存读取、输出）/ ◔ 上下文已用（进度条 + 已用/上限 + 距压缩 + 成本 + 配额）**，三卡各自独立、互不连体，单色、数值常规字重、组内正常空格，且保护模型名不被截断。**开启常驻后随 Antigravity 启动自动显示（内嵌内核）**，开关存 `%APPDATA%\Antigravity\zh-stats.json`，只读日志、不外传。
- **说明**：DSH statusline 中的「模型用时 / 工具调用用时 / 首 token 平均(TTFT) / 上下文分类占比」依赖的数据在 `transcript.jsonl` 中不存在，故未显示；其余指标均已提供。
- **口径说明**：上下文按 App 的**自动压缩上限**计（Gemini 3.8 Flash ≈256k、Claude 4.6 ≈160k、GPT-OSS 120B ≈80k），**不是模型理论 1M 窗口**；成本为 API 等价估算（GPT-OSS 无单价显示 —）；配额/积分来自页面挂钩捕获的 `GetUserStatus`，App 未拉取时显示 —。
- **验证**：引擎回归 **41/41**（另含 **6** 项统计指标用例）；新增天青蓝外观渲染回归 11 项 + 统计条无头夹具回归；统一门禁 **33/33**；真实客户端安装归档 `36c5c16a…`，安装内嵌 bundle == 源码 `b2d318fd…`。**本地构建，尚未发布 GitHub。**

### v1.3.4 (内核 v73) — 适配 Antigravity 2.28.2

- **适配客户端**：Google Antigravity **2.28.2**（Windows x64），汉化内核保持 **v73**（词库 6,047 条不变）。2.28.2 更新再次清除补丁与原件备份，需重新永久安装。
- **官方更新内容**：纯版本号更新（与 2.28.1 主进程逐字节一致，仅 `package.json` 版本号变化）；前端字面量差分为零（34,971 个字符串完全一致，22 字节差异为构建注入物）。
- **验证**：2.28.2 基线登记（原版 `046fa2ba…`）；真实原版隔离安装/重复安装/还原演习与引擎回归 41/41 通过；统一门禁 **32/32**；生产安装后 CDP 只读抽查确认 2.28.2 客户端原生自动加载 v73（词库 6,047 条，菜单栏中文）。
- 证据：`work/v74/`；说明：[v74 适配说明](docs/history/v74-2.28.2适配.md)。

### v1.3.3 (内核 v73) — 适配 Antigravity 2.28.1

- **适配客户端**：Google Antigravity **2.28.1**（Windows x64），汉化内核升级至 **v73**，词条扩充至 **6,047 条**。2.28.1 更新再次清除补丁与原件备份，需重新永久安装。
- **官方更新内容**：主进程归档与 2.28.0 逐字节一致（纯版本号更新），锚点与引擎零改动；前端仅新增插件详情页脚（`Links`/`Website`/`Repository`）与市场页脚区块。
- **词条**：新增 `Website`（网站）、`Repository`（代码仓库）、`Marketplace notice`（市场提示）3 条；v72 词典键在新前端中零消失。
- **验证**：2.28.1 基线登记（原版 `cec1039f…`）；真实原版隔离安装/重复安装/还原演习与引擎回归 41/41 通过；统一门禁 **32/32**（v228 回归 192 断言）；生产安装后 CDP 只读抽查确认 2.28.1 客户端原生自动加载 v73（词库 6,047 条，菜单栏中文）。
- 证据：`work/v73/`；说明：[v73 适配说明](docs/history/v73-2.28.1适配.md)。

### v1.3.2 (内核 v72) — 适配 Antigravity 2.28.0

- **适配客户端**：Google Antigravity **2.28.0**（Windows x64），汉化内核升级至 **v72**，词条扩充至 **6,044 条**。2.28.0 更新再次清除已安装补丁与原件备份，需重新永久安装。
- **2.28.0 新界面覆盖**：新增 81 条词条——webview 站点信息/证书面板、快捷键设置面板（搜索/重置/录制器/浏览器占用提示）、命令面板搜索占位符、Cog 云工作区、插件连接与市场、远程数据删除确认、外观与链接打开设置、`Open in Side Panel` 及原生菜单 `Side Panel (Default)` 变体等。
- **实机巡航审计轮**（用户反馈驱动）：CDP 多界面扫描与悬停 tooltip 全量遍历补漏——组合式 tooltip 根因为 base-ui 将 JSX 内容序列化成单文本节点，新增「已知文案+快捷键」整串模板（`发送消息 Enter` 等）；`Turbo`/`Turbo mode` 修订为「极速/极速模式」；补齐快捷键命令行与成果审阅覆盖行。
- **热注入缺陷修复**：`CdpHotPatcher` 在已注入旧实例的页面上直接叠加新实例，新旧词典的观察器互相改写节点；现注入前先卸载旧实例再重扫。
- **验证**：官方基线登记 2.28.0（原版 `4a145127…`）；隔离安装/重复安装/还原演习（还原逐字节一致）；统一门禁 **32/32**（v228 回归 186 断言）；生产安装后 CDP 只读抽查确认原生自动加载 v72（`极速`、`发送消息 Enter` 实机复核通过）。
- 证据与工具：`work/v72/`；说明：[v72 适配说明](docs/history/v72-2.28.0适配.md)。

### 更早版本

<details>
<summary>v1.0.0 – v1.3.1（2026-10-08 至 2026-10-28，点击展开）</summary>

| 发布 | 内核 | 适配客户端 | 要点 |
|---|---|---|---|
| [v1.3.1](https://github.com/iMankoppai/Antigravity-ZH-Patch/releases/tag/v1.3.1) | v71 | 2.27.0 | 语音模式/实时通话、Drive 集成、多账号提示、浏览器子代理状态、Passkey 弹窗（含并入了内核 v70 的 3 处实机漏译修复）——[说明](docs/history/v71-2.27.0适配.md) |
| [v1.3.0](https://github.com/iMankoppai/Antigravity-ZH-Patch/releases/tag/v1.3.0) | v69 | 2.26.0 | 全局漏译排查收口，20 条低频词条 + 展示上限模板——[说明](docs/history/v69-低频界面补漏.md) |
| [v1.2.0](https://github.com/iMankoppai/Antigravity-ZH-Patch/releases/tag/v1.2.0) | v68 | 2.26.0 | 内置技能正文 488 单元、全局漏译修复；并入了内核 v62–v67 的全部本地修复（技能详情、原生菜单、2.25.0/2.26.0 适配）——[说明](docs/history/v1.2.0-发布说明.md) |
| （本地版） | v57–v67 | 2.24.0–2.26.0 | v1.1.2–v1.1.7 技能详情系列、v63/v64/v67 适配与修复——[历史归档](docs/history/README.md) |
| [v1.1.1](https://github.com/iMankoppai/Antigravity-ZH-Patch/releases/tag/v1.1.1) | v41 | 2.24.0 | 基线登记与适配——[说明](docs/history/2.24.0-适配说明.md) |
| [v1.1.0](https://github.com/iMankoppai/Antigravity-ZH-Patch/releases/tag/v1.1.0) | v40 | 2.23.1 | 新版汉化适配按钮——[说明](docs/新版汉化适配.md) |
| [v1.0.4](https://github.com/iMankoppai/Antigravity-ZH-Patch/releases/tag/v1.0.4) | v40 | 2.23.1 | 基线登记——[说明](docs/history/2.23.1-适配说明.md) |
| [v1.0.3](https://github.com/iMankoppai/Antigravity-ZH-Patch/releases/tag/v1.0.3) | v40 | 2.23.1 | 归档提示与通用兜底规则 |
| [v1.0.2](https://github.com/iMankoppai/Antigravity-ZH-Patch/releases/tag/v1.0.2) | v39 | 2.23.0 | 真实适配（前端 437 新串）、模型名误译修复——[说明](docs/history/2.23.0-适配说明.md) |
| [v1.0.1](https://github.com/iMankoppai/Antigravity-ZH-Patch/releases/tag/v1.0.1) | v37 | 2.21.1 / 2.22.0 | 审计修复、requireAdministrator |
| [v1.0.0](https://github.com/iMankoppai/Antigravity-ZH-Patch/releases/tag/v1.0.0) | v32 | 2.21.1 | 首个版本：原生内嵌洁癖模式、热加载、一键还原 |

</details>

逐版完整说明（含验证细节与范围边界）：[`docs/history/`](docs/history/README.md)。

---

## ⚠️ 免责声明

本项目为开源非官方本地化增强工具，仅供个人学习研究与体验优化使用。所有版权与商标均归 Google 及相关权利人所有。
