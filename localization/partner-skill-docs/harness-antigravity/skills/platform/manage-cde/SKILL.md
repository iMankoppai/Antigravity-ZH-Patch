---
name: manage-cde
description: >-
  通过 MCP 管理 Harness Cloud Development Environments（CDE）。配置带预装工具链的按需开发
  环境，为团队设计标准化工作区模板，
  设置自动休眠和成本控制，并管理环境生命周期。在要求
  设置云开发环境、创建工作区模板、配置远程开发，
  或管理 CDE 生命周期和成本时使用。触发短语：云开发环境、CDE、远程
  开发、工作区模板、开发环境、gitpod、codespace、自动休眠、
  开发者工作区、临时环境。
metadata:
  author: Harness
  version: 1.0.0
  mcp-server: harness-mcp-v2
  summary: Cloud development environments, workspace templates, and auto-hibernation
license: Apache-2.0
compatibility: Requires Harness MCP v2 server (harness-mcp-v2)
---

# 管理 CDE

在 Harness 中配置带工作区模板、自动休眠和成本控制的按需 Cloud Development Environments。

## 说明

### 步骤 1：确定范围

确认用户的 org、project、团队和技术栈。

```
Call MCP tool: harness_list
Parameters:
  resource_type: "project"
  org_id: "<organization>"
```

### 步骤 2：识别 CDE 任务

确定用户需要哪个工作流：

1. **按需环境设置**——带资源分配和生命周期的环境模板
2. **工作区标准化**——为每个团队/技术栈预配置带一致工具链的模板

### 步骤 3：配置按需环境

从用户处收集：
- 技术栈和运行时版本
- 云提供方（AWS、GCP、Azure）
- IDE 偏好（VS Code 浏览器、VS Code SSH、JetBrains Gateway）
- 用于启动时自动克隆的 Git 提供方

设计环境模板：

**资源分配：**
- 默认规格（例如 4 vCPU、8GB RAM）及升级选项
- 工作区文件的持久存储
- 停止时清除的临时存储

**生命周期配置：**
- 预配触发器：开发者请求、PR 创建或分支推送
- 启动时间目标（建议 30 秒以内）
- 空闲超时后自动停止（默认 30 分钟）
- 用于长时间运行工作的持久模式选项

**集成：**
- 从 Harness Secrets、Vault 或云密钥管理器注入密钥
- 通过 Docker Compose 或 Kubernetes 提供支持服务（数据库、缓存、消息队列）
- 自定义访问 URL 模式（例如 {user}-{env}.dev.company.com）

**成本控制：**
- 每个环境的每日成本上限
- 团队级月度预算
- 空闲环境的自动休眠

### 步骤 4：创建工作区模板

跨团队标准化时，为每个角色/技术栈创建模板：

**后端服务开发者：**
- 运行时、构建工具、测试框架
- 数据库客户端、API 测试工具
- 预配置的调试器和 linter

**前端开发者：**
- Node.js 运行时、包管理器
- 浏览器开发工具、组件库
- 热重载和预览服务器

**全栈开发者：**
- 组合的后端 + 前端工具链
- 用于本地服务网格的 Docker Compose
- API mock 工具

**平台 / DevOps 工程师：**
- kubectl、Helm、Terraform、云 CLI
- 监控和可观测性工具
- 基础设施测试框架

每个模板应包含：
- 基础镜像和预装工具
- IDE 扩展/插件列表
- Git 钩子和代码格式化配置
- 环境变量和密钥

## 示例

- “为我们的后端团队设置云开发环境”——配置带 Java/Go 工具链和自动休眠的按需 CDE
- “为前端和后端开发者创建工作区模板”——带技术栈特定工具链的标准化模板
- “配置自动休眠以降低 CDE 成本”——设置空闲超时和每日成本上限
- “在创建 PR 时预配开发环境”——配置 PR 触发的临时环境

## 性能注意事项

- 30 秒以内的启动时间需要预构建镜像——避免在启动时安装工具。
- 自动休眠超时应平衡开发者生产力（太短 = 摩擦）与成本（太长 = 浪费）。
- 持久存储应按代码仓库加构建制品的大小配置——过小会导致构建失败。
- 预拉取常见基础镜像以减少冷启动时间。

## 故障排查

### 环境启动慢
- 检查基础镜像是否正从远程镜像仓库拉取——使用本地缓存或预拉取
- 减少启动时安装的工具数量——将它们烘焙进基础镜像
- 核实到 Git 提供方的网络连通性以进行自动克隆

### 环境自动停止过于激进
- 为进行研究或设计工作的开发者增加空闲超时
- 为长时间运行任务启用持久模式
- 检查 IDE 保活信号是否到达 CDE 控制器

### 成本超支
- 审查运行超过 24 小时的环境
- 检查来自已删除分支的孤立环境
- 核实所有非生产环境已启用自动休眠
