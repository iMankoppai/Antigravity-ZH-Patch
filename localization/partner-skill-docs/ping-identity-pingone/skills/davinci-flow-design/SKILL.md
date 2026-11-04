---
name: davinci-flow-design
description: "在设计或构建 PingOne DaVinci 流程时使用 —— 带邮箱验证的注册、登录、MFA 注册与逐步提升、无密码和通行密钥流程、渐进式画像、社交登录、子流程组合、错误路径设计，以及为在环境之间推广准备流程和连接器凭据。以工件形式产出流程设计和连接器接线。"
compatibility: "Design-time skill for PingOne DaVinci. Produces flow designs and connector wiring as artifacts; deploying, testing, and inspecting live executions requires DaVinci console access, PingOne MCP tools, or Ping CLI 1.4.0 or later."
metadata:
  publisher: Ping Identity
  version: "1.0.0"
  product_family: pingone-mt
---

# DaVinci 流程设计

设计和构建 PingOne DaVinci 流程：连接器选择与排序、逻辑运算符分支、变量、子流程组合和错误路径。以工件形式产出流程设计和连接器接线；实时执行的工作属于 DaVinci 控制台。

## 何时使用

- 构建或审查 DaVinci 流程：登录、带邮箱验证的注册、MFA 注册、风险驱动的逐步提升、渐进式画像、社交登录。
- 选择连接器能力、接线分支、声明变量并组合子流程。
- 设计错误路径：用户错误、系统错误和安全阻断类别。
- 为在环境之间推广准备流程、流程策略和连接器凭据。

## 何时不要使用

- 诊断已经运行过的流程执行中发生了什么 —— 使用 DaVinci 控制台的执行历史和调试日志（[DaVinci flows documentation](https://docs.pingidentity.com/davinci/flows/davinci_flows.html)）。
- 设置 PingOne 环境、组织或应用 —— 使用 PingOne 文档。
- 通过 SDK 将流程嵌入应用 —— 使用适用于你的应用技术栈的客户端平台集成文档。

## 路由

| 请求信号 | 从以下开始 |
|---|---|
| 流程模型、逻辑运算符、连接器、变量、版本管理、调用方式 | `references/flow-model.md` |
| 登录、注册、逐步提升、渐进式画像、错误处理模式 | `references/flow-patterns.md` |
| 注册 + 邮箱验证、MFA 注册、Protect 驱动的逐步提升 | `references/registration-and-mfa.md` |
| 通行密钥 / 无密码流程与恢复路径 | `references/passkey-flows.md` |
| 推广流程、流程策略和连接器凭据 | `references/flow-promotion.md` |
