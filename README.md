# Antigravity 中文汉化管理器

[![Release](https://img.shields.io/badge/Release-v1.0.3-blue.svg)](https://github.com/iMankoppai/Antigravity-ZH-Patch/releases)
[![Antigravity](https://img.shields.io/badge/Antigravity-2.23.0-4285F4.svg)](https://github.com/iMankoppai/Antigravity-ZH-Patch/releases)
[![Platform](https://img.shields.io/badge/Platform-Windows%20x64-0078D6.svg)](https://github.com/iMankoppai/Antigravity-ZH-Patch)
[![Framework](https://img.shields.io/badge/.NET-8.0%20WPF-512BD4.svg)](https://dotnet.microsoft.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Google Antigravity 官方 Windows 客户端的专属汉化与原生体验管理工具。提供免重启热加载、纯净 ASAR 原生内嵌固化、全量工作状态深度汉化及托盘常驻交互增强。

> **当前版本 v1.0.3 适配 Google Antigravity 2.23.0（Windows x64）**，汉化内核 v40、词条 3,513 条。官方客户端升级后旧补丁会被更新包覆盖，重新执行一次安装即可。

---

## ✨ 核心特性

- **⚡ 免重启实时汉化（热加载模式）**  
  软件在前台运行中无需退出，通过 CDP 协议秒级动态注入最新翻译引擎，界面即时切换为中文，**AI 正在进行的思考与会话连接完全不受影响**。
  内核 v39 适配 Antigravity 2.23.0（前端 bundle 本次确有改动，新增 437 条可读串）：新增 137 条界面词条（插件包、Google Drive、SSO 登录、会话已读标记、权限详情等），修复模型名被逐词翻译（`Gemini 3.8 Flash High` 不再变成 `…Flash 高`），清理 6 条永不命中的死词条，并补齐两条动态模板规则。
- **📦 永久原生内嵌汉化（终极洁癖模式）**  
  直接将翻译引擎与完整深度精校词库无缝封包进 `resources/app.asar` 内部：
  - **零外置文件夹**：安装后，Antigravity 根目录下**无需存在任何外部补丁文件夹**，也没有任何散落的 `.cmd` / `.ps1` 脚本，目录纯净整洁；
  - **自动安全备份**：首次安装自动将官方原版备份为 `app.asar.bak`。
- **🧠 工作状态与动态动作汉化**
  深度覆盖智能体运行全周期文本：
  - **实时思考计时**：支持思考中动态计时（如 `Thinking for 22s ›` ➔ `正在思考 22 秒`）与思考完成折叠（`已思考 22 秒`）；
  - **复合动作折叠行**：覆盖多动作拼接场景（如 `正在探索文件，正在运行命令，正在编辑成果 ⌄`）；
  - **智能体与任务操作**：`已列出 1 个任务`、`已终止任务`、`已向任务发送输入`、`已调用子代理`、`已设定定时任务` 等。
  - **内核 v32 状态修复**：识别应用状态栏内的思考计时、复合动作及文件/任务操作前缀，支持 React 拆分节点与动态更新；文件名、行号、命令和任务名称保持原样。
- **🎨 界面与生态全面汉化**  
  深度覆盖插件扩展市场（Google Workspace、科学计算套件、开发工具等）、所有个性化外观主题（包括 Gruvbox Material 复古材质、一号深色专业版等）及权限审查弹窗。
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
2. 下载 **`Antigravity汉化管理器.exe`** 或 **`Antigravity-ZH-1.0.3-Windows-x64.zip`**；
3. 双击运行 `Antigravity汉化管理器.exe`（单文件自包含，已内置 .NET 8 运行时，无需安装任何前置依赖）；
4. 点击 **【⚡ 开启汉化】**（免重启实时生效）或 **【📦 永久安装汉化（洁癖模式）】** 即可。

### 方式二：手动固化
在管理器中点击【📦 永久安装汉化】，管理器会自动备份 `app.asar.bak` 并将最新汉化内核安全写入。完成后即使重启电脑或不运行管理器，客户端也始终保持中文。

---

## 🛠️ 项目源码与技术架构

```text
Antigravity ZH/
├── Antigravity汉化管理器.exe    # 独立单文件发布程序（C# WPF Self-Contained）
├── README.md                 # 项目文档
├── src/                      # C# / .NET 8 完整工程源代码
│   └── AntigravityZhManager/ # 管理器源码、XAML 界面与内嵌资源 Assets
├── work/                     # 词库挖掘、版本适配与测试验证资产
└── 维护工具/                  # 自动化回归测试与词条构建脚本
```

### 技术规格
- **适配软件**：**Google Antigravity 2.23.0**（Windows x64）
- **汉化内核**：v40（词条 3,513 条）
- **词库规模**：全量深度精校词库（涵盖核心 UI、系统菜单、工作状态、插件市场与主题设置）
- **技术实现**：C# .NET 8 WPF 现代化界面 + ASAR 虚拟模块字节级封包 + CDP WebSocket 动态管道注入

### 维护与回归

从核心 Assets 重建内嵌资源：`node 维护工具/重建汉化内核.js`；仅校验同步：追加 `--check`。

状态标签回归：`node 维护工具/状态标签回归.cjs`。测试使用独立无界面 Chrome，不操作真实客户端；需安装 Chrome 与 Node.js。
回归包含千个控件页面切换的逐帧检查、样式变化时的中文保留，以及词库更新、内容保护和英文还原。

汉化范围与保留项说明：`docs/汉化范围说明-哪些不翻译.md`（为什么内容、专名与程序内部标识故意保留英文）。

本次 2.23.0 适配的完整说明：`docs/2.23.0-适配说明.md`。

---

## 📦 版本记录

### v1.0.3 — 通知/提示类漏译修复（2026-10-13）

- **汉化内核**：v39 → **v40**；词条 3,497 → **3,513 条**。
- **修复归档提示正文漏译**：官方把提示按 markdown 渲染，内联图标把正文切成 `View archived in the sidebar (` + 图标 + ` menu).` 两个文本节点，整句永远命不中词典。现按结构改写首尾节点，保留中间图标与 React 节点。
- **新增两条通用兜底规则**：① `界面文案 (快捷键/计数)`（`Clear search (Esc)`、`Reset zoom (0)`、`Select Environment (Ctrl+.)`、`Tool Calls (5)` 等）；② `状态/错误行「标签: 值」`（`Code search: "x"`、`Opened browser: url`、`Failed to load trajectory: err` 等）。
- **词库补齐 16 条**：`Failed to load resources`、`Failed to validate the saved GitHub token.`、认证/登录提示片段、媒体控件（`Back 5s (←)`、`≥ 1s`…`≥ 5m`）、`Zoom`、`Send feedback as ` 等。
- **同类排查**：通知正文未覆盖 5 → 1 条、`aria-label` 0 条、`label` 12 → 2 条；剩余项均为内部串、产品名或示例 URL，按策略保留原文。
- **质量守护**：渲染回归断言 80 → **86** 条；统一门禁 17 项全通过。

### v1.0.2 — 适配 Antigravity 2.23.0（2026-10-13）

- **适配客户端**：Google Antigravity **2.23.0**（Windows x64）。官方 2.23.0 的渲染层 bundle 相对 2.21.1/2.22.0 确有改动（9,607,177 → 9,902,207 字节，新增 437 条可读字符串），因此本轮为真实适配，不是单纯重装。
- **汉化内核**：v37 → **v39**；词条 3,361 → **3,497 条**。
- **新增覆盖**：插件包（Bundles）、Google Drive 连接与上传、SSO / 企业账号登录、会话已读与未读标记、权限详情、排序与最近使用、Zip 附件、音量与播放、文件夹校验提示、新引导页文案等 137 条界面词条。
- **修复误译**：模型名不再被逐词翻译（`Gemini 3.8 Flash High` 曾渲染为 `Gemini 3.8 Flash 高`，与同一按钮的无障碍标签自相矛盾）；模型名与推理档位选项统一保持英文。
- **修复死词条**：清理 6 条键里带前后空格、永远无法命中的词条（程序查表前会 trim）。
- **补齐模板**：新增权限预设按钮的 `aria-label` 与悬浮提示两条动态模板规则；修正会话行标题保护选择器（官方 testid 是动态的 `conversation-row-${kind}`）。
- **质量守护**：渲染回归断言 73 → 80 条，覆盖模型名/档位保持英文、面板其他文案仍汉化的边界；统一门禁 17 项全通过。

### v1.0.1 — 适配 Antigravity 2.21.1 / 2.22.0

- 修复最终审计的 P0/P1/P2 问题（重复安装、内容保护、词库扩充）；新增 requireAdministrator 清单与全局异常处理，支持直接双击启动。

### v1.0.0 — 首个版本

- Antigravity 中文汉化管理器：原生内嵌洁癖模式、免重启热加载、官方英文一键还原。

---

## ⚠️ 免责声明

本项目为开源非官方本地化增强工具，仅供个人学习研究与体验优化使用。所有版权与商标均归 Google 及相关权利人所有。
