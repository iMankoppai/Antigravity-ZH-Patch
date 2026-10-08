# Antigravity 中文汉化管理器

[![Release](https://img.shields.io/badge/Release-v1.0.0-blue.svg)](https://github.com/iMankoppai/Antigravity-ZH-Patch/releases)
[![Platform](https://img.shields.io/badge/Platform-Windows%20x64-0078D6.svg)](https://github.com/iMankoppai/Antigravity-ZH-Patch)
[![Framework](https://img.shields.io/badge/.NET-8.0%20WPF-512BD4.svg)](https://dotnet.microsoft.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Google Antigravity 官方 Windows 客户端的专属汉化与原生体验管理工具。提供免重启热加载、纯净 ASAR 原生内嵌固化、全量工作状态深度汉化及托盘常驻交互增强。

---

## ✨ 核心特性

- **⚡ 免重启实时汉化（热加载模式）**  
  软件在前台运行中无需退出，通过 CDP 协议秒级动态注入最新翻译引擎，界面即时切换为中文，**AI 正在进行的思考与会话连接完全不受影响**。
- **📦 永久原生内嵌汉化（终极洁癖模式）**  
  直接将翻译引擎与完整深度精校词库无缝封包进 `resources/app.asar` 内部：
  - **零外置文件夹**：安装后，Antigravity 根目录下**无需存在任何外部补丁文件夹**，也没有任何散落的 `.cmd` / `.ps1` 脚本，目录纯净整洁；
  - **自动安全备份**：首次安装自动将官方原版备份为 `app.asar.bak`。
- **🧠 全场景工作状态与动态动作全覆盖**  
  深度覆盖智能体运行全周期文本：
  - **实时思考计时**：支持思考中动态计时（如 `Thinking for 22s ›` ➔ `正在思考 22 秒`）与思考完成折叠（`已思考 22 秒`）；
  - **复合动作折叠行**：覆盖多动作拼接场景（如 `正在探索文件，正在运行命令，正在编辑成果 ⌄`）；
  - **智能体与任务操作**：`已列出 1 个任务`、`已终止任务`、`已向任务发送输入`、`已调用子代理`、`已设定定时任务` 等。
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
2. 下载 **`Antigravity汉化管理器.exe`** 或 **`Antigravity-ZH-1.0.0-Windows-x64.zip`**；
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
- **适配软件**：Google Antigravity 2.21.1+ (Windows x64)
- **词库规模**：全量深度精校词库（涵盖核心 UI、系统菜单、工作状态、插件市场与主题设置）
- **技术实现**：C# .NET 8 WPF 现代化界面 + ASAR 虚拟模块字节级封包 + CDP WebSocket 动态管道注入

---

## ⚠️ 免责声明

本项目为开源非官方本地化增强工具，仅供个人学习研究与体验优化使用。所有版权与商标均归 Google 及相关权利人所有。
