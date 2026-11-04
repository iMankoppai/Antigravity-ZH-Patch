---
name: pingone-platform-ops
description: "当用户需要进行 PingOne 审计事件调查时使用本技能：登录失败、身份验证历史、管理员操作、合规或事件历史查询、关联 ID、资源事件、密码或 MFA 事件、分页，或基于 BOM 的关于 DaVinci 执行故障排查的提示。"
compatibility: "Requires authorized PingOne MCP audit tools or Ping CLI access."
metadata:
  publisher: Ping Identity
  version: "2.0.0"
---

# PingOne 平台运维

将 PingOne 审计和运维调查路由到最小够用的参考文档。保全证据，将每次查询限定在单一环境内，并避免持久化审计输出或 PII。

## 何时使用本技能

- 调查登录失败、身份验证历史、管理员操作、合规事件或事件历史。
- 追踪 PingOne 关联 ID，或检查应用、用户、用户群体、密码或 MFA/设备事件。
- 解释谁在何时更改了什么、某事件何时发生，或为什么某次审计查询返回空结果。
- 检索分页的审计活动，并呈现完整的事件表和模式摘要。
- 检查环境的物料清单（BOM）以了解 DaVinci 是否可用。

## 何时不要使用本技能

- DaVinci 节点级执行追踪。
- 用户、应用、目录或租户配置。
- 流程设计或通用服务策略更改。
- 应用或 SDK 集成。

## 多技能用例

审计发现常常识别出某个运维症状，而补救措施属于另一学科：

1. 在此处调查审计事件，并将关联 ID 作为证据保全。
2. 如果某项发现指向 DaVinci 流程执行，请将节点级追踪交给会话中可用的流程执行故障排查工作流。
3. 如果某项发现指向配置或策略，请将修复交给负责它的平台配置或通用服务工作流。

在此处完成审计调查，然后移交给负责补救的工作流。

## 路由 —— 步骤 1：调查需求

| 需求 | 首先加载 |
|---|---|
| 参考文档选择与检索停止 | `references/troubleshooting.md` |
| 环境、执行者、标识符、时间窗口或类型化过滤器准备 | `references/playbooks/audit-investigation.md` |
| 审计调用、分页、完整事件详情或 DaVinci 权益检查 | `references/playbooks/audit-execution.md` |
| 常见登录失败、管理员、资源、用户群体、密码、MFA 或客户端场景 | `references/playbooks/audit-scenarios.md` |
| 结果表、摘要、结构化状态和完整性检查 | `references/catalogs/audit-output.md` |
| 错误、PII、执行模式回退和跨技能边界 | `references/catalogs/audit-guardrails.md` |
| Ping CLI 审计和 BOM 操作 | `references/cli.md` |
| 合成路由和行为示例 | `references/examples/sample-prompts.md` |

## 检索升级

1. 加载 `references/troubleshooting.md` 以选择最小够用的参考文档。
2. 加载一个匹配的剧本，然后仅添加所需的目录或执行模式参考文档。
3. 仅在评估或有歧义的路由时，才加载 `references/examples/sample-prompts.md`。
4. 当基于证据的回答完整时停止。

## 执行边界

在检查过 MCP 工具的模式后再使用已连接的工具。必需的审计能力是 `listEnvironments`、`searchAuditActivities` 和 `getAuditActivity`；仅在需要解析标识符时使用 `listUsers`、`listApplications` 或 `listPopulations`。当 MCP 不可用时，使用 Ping CLI 指引。当类型化审计工具暴露了离散字段时，绝不要构造原始 SCIM 过滤器。
