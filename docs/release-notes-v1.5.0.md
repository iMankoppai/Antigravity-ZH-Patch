# v1.5.0 — 适配 Antigravity 2.32.1（SSH 远程 / 舞台面板 / 纯配色天青蓝气泡 / 一键强杀残留进程）

本次版本完成 Google Antigravity **2.32.1**（Windows x64）全量适配，新增强制结束后台残留进程功能，并在本地构建中重新接入轻量纯配色版「天青蓝对话气泡」。

## 适配与界面
- 支持 Google Antigravity **2.32.1**（原版 `app.asar` SHA256 `5b493943…`）；原有 16 个主进程注入锚点全部精确命中，`failures: 0`。
- 汉化内核升级至 **v81**，词条规模达 **7,349 条**（较 v80 新增 **131 条**，见 `localization/v81-ui-additions.json`）。
- 覆盖新增核心界面与模块：
  - **多智能体预览舞台面板**：`Stage` / `Desktop` / `Layout` / `Resume`、隐私策略遮罩、聚焦控制及网络失败提示等；
  - **SSH 远程连接与管理**：连接弹窗（含三文本节点提示 `No hosts in <path> yet.` 的无损还原）、左下角 WSL/SSH 机器切换器、`dist/remote/disconnectedPage.js`（CSP 断线/重连静态页）、认证与安全密钥弹窗及多行报错详述；
  - **原生文件对话框包装**：在 `native-ui.js` 新增 `showOpenDialog` / `showSaveDialog` 及其同步版本的 `title` / `buttonLabel` / `message` 本地化包装。

## 管理器新功能与外观增强
- **一键强制结束残留进程（`BtnForceKill`）**：针对退出托盘后客户端后台工作进程与 `language_server.exe` 持续驻留问题，顶部状态栏新增「🛑 强制结束进程」按钮，自动识别「仅剩后台残留进程」黄灯状态，带二次确认安全清理安装目录及主进程树（永不误杀管理器自身）。
- **轻量纯配色版「天青蓝对话气泡」（本地同步增强）**：遵循 `2.32.1` 官方原生气泡排版与下移操作按钮，不再修改宽度与结构；仅针对用户消息气泡（`[data-testid="user-message-bubble"]`）及外框（`.agy-user-bubble-frame`）覆写柔和天青蓝（亮色 `#EAF3FE` / 暗色 `#1A2E44` 深海蓝），默认勾选启用，可在管理器内随时开关。

## 校验与产物
- 统一门禁（隔离归档演习 `work/2-32-1-probe/isolated/app.asar`）：**37/37 项全 PASS**（0 失败、0 跳过），含：
  - `v232-ui-regression.cjs`（210 项 PASS）；
  - `native-ui.cjs`（103 项 PASS）；
  - `azure-theme-regression.cjs`（12 项 PASS，覆盖亮/暗主题配色与零布局尺寸变更）；
  - C# 引擎回归：`ArchiveCompatibility` / `AsarCleanPatcher` / `CompatibilityRepair`（41 项 PASS）与 `ClientProcessGuardTests`（15 项 PASS）。
- 核心产物 SHA256：
  - 汉化内核 `zh-bundle.js`：`ed87c3d8a7290667ca4a4fd389e08adcd28fbbee087ca7661e0890da5f09de73`
  - 隔离验证归档 `app.asar`：`e80b13336fac9b52bc8e8db38aa77bcd6b6840c08d582fa7fadd252997373002`
  - 管理器 EXE `Antigravity汉化管理器.exe`：`658d57fc8978d56caf4790bfefd2a5a4c2e0a8bbf273e3226c67ecf730668fd9`
  - 发布压缩包 `dist/Antigravity-ZH-1.5.0-Windows-x64.zip`：`5c70154c8269ca623aceb7345ebe25f62c2ded3e7d738433836017ae71df5a31`

> Windows x64 单文件自包含 EXE，无需安装 .NET 运行时。若客户端正在运行或托盘退出后仍有进程残留，可先用管理器「🛑 强制结束进程」清理，再重新执行「一键嵌入汉化」使永久写入与纯配色天青蓝气泡生效。
