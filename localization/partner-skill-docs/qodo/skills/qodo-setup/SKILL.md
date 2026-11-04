---
name: qodo-setup
description: 在一个编码智能体中设置 Qodo——安装 CLI、登录，并验证工具。在插件安装之后、收到设置请求时，或 Qodo 技能发现缺少 CLI 或登录时使用。
owner: Qodo
metadata:
  vendor: qodo
  version: "1.0.10"
  recommended: "true"
  package: "qodo"
  distribution: "marketplace"
  instruction_mode: "embedded"
---

# 设置 Qodo

## 描述

验证可用的 Qodo 路径。技能安装并不证明账户或工具访问。

## 先决条件

一个用于 CLI 设置的 shell，或一个宿主已连接的 QAR MCP 服务器。绝不处理凭据。

## 说明

### 已连接的 MCP 路径

检查已连接的 QAR 工具 schema 和标注。用一个无害的输入调用一个只读工具；目录可见性并不证明读取访问。在 `structuredContent` 之前检查 `isError`；执行错误不是就绪。一次读取无法证明写入授权：在用户授权的动作之前，把写入报告为未核实。绝不进行测试写入。宿主和 QAR 拥有 MCP 认证。把缺失的工具、`MT-AUTH-FORBIDDEN` 和连接错误报告为 MCP 访问问题；绝不索取 API 密钥。对于仅 MCP 的设置，报告已核实的范围并在此交接。跳过下面每一个 CLI 步骤。只有当请求了 CLI 访问或本地采集需要它时才继续，且使用相同的部署。

相对于本已安装的 `SKILL.md` 目录来解析 `references/...` 链接。运行时/登录设置不授权企业安装或维护。对于请求的企业安装，在批准前披露包和维护；保留选择退出、编辑、所有者和可选包选择。

### 1. 找到或安装运行时

在 PowerShell 中，先在 [runtime.md](references/runtime.md) 里解析已核实的原生/Node 调用；下面的 `qodo` 代表那个调用。在 POSIX 上，直接探测 PATH：

```sh
qodo --version
```

如果在 POSIX 上缺失，尝试 `"${QODO_HOME:-$HOME/.qodo}/bin/qodo" --version`。对于缺失、过旧或无法解析的运行时，遵循该参考。设置请求在宿主批准的前提下覆盖安装；仅插件安装则不然。保留所选的部署。

把可执行文件保持为 `<qodo>`。在认证之前要求 Qodo CLI **1.6.0 或更新**。

### 2. 连接

运行：

```sh
<qodo> read whoami --json --skill qodo-setup --skill-version 1.0.10 --distribution marketplace --host antigravity
```

复用一次成功的身份检查。失败时，在选择登录之前阅读 [authentication.md](references/authentication.md)。

对于 Cloud，在登出状态下运行 `<qodo> login`。对于客户部署，保留有文档记录的登录端点；绝不回退到 Cloud。等待登录，然后重新检查身份。

复用成功的执行上下文，请求每一次所需的宿主批准。一次诊断批准不是一揽子的许可。在取消或权限被拒时停止。

### 3. 验证工具

只有在身份成功之后，才运行：

```sh
<qodo> tools --refresh --json --skill qodo-setup --skill-version 1.0.10 --distribution marketplace --host antigravity
```

要求一个可用的目录和任务所需的能力；不相关的工具不能确立访问。如果刷新失败，报告登录成功但工具不可用，附上确切的错误和 `<qodo> tools --refresh` 作为重试。不要因为目录失败而再次登录。

## 配置

CLI 拥有凭据、传输和运行时更新；包的生命周期所有者更新技能。对于 `QODO_NOTICE` 更新或反复出现的 Kiro 读取批准，只在遇到时阅读 [host-recovery.md](references/host-recovery.md)。

## 错误处理

给出实际的错误和一个下一步动作。在身份失败、登录取消或目录不可用之后，绝不报告就绪。绝不为让设置通过而禁用钥匙串、复制凭据、更改宿主权限文件，或提供不受限制的命令批准。

## 4. 交接

确认 Qodo 连接和相关工具就绪，然后回到经授权的任务。就绪并不证明后续的工具调用会成功。不要安装可选的 Standards。
