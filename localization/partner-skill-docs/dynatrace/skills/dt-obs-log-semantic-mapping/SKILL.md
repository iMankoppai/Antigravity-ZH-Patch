---
name: dt-obs-log-semantic-mapping
description: "为审计日志集成建议并校验语义字典（SD）映射，可使用原始厂商日志负载或实时摄取的事件。何时使用：将厂商审计日志馈送、身份验证日志、用户活动日志映射到 Dynatrace SD；检查必需的语义字段；基于 DQL 提出 OpenPipeline 处理器提取规则；运行运行时校验（按 log.source 获取实时日志，然后应用静态校验）。"
license: Apache-2.0
---

# dt-obs-log-semantic-mapping

为审计日志集成构建并校验对齐语义字典的映射。

## 用途

当用户想要执行以下操作时使用此技能：

- **建议**从原始厂商审计日志负载到 Dynatrace `fetch logs` 字段的映射（工作流 A）。
- **校验**映射相对于粘贴的已摄取日志事件是否成立（工作流 B1 —— 静态）。
- **校验**映射相对于实时租户数据是否成立，可通过实时租户访问（工作流 B2 —— 运行时：按 `log.source` 获取日志，然后对结果运行 B1）。

## 日志类别

| 类别 | 描述 | 关键命名空间 | 示例来源 |
|---|---|---|---|
| `authentication` | 登录、登出、MFA、令牌 | `audit.*`、`actor.*`、`browser.*`、`device.*` | CyberArk、Okta、Azure SignInLogs |
| `authorization` | 访问决策、权限变更 | `audit.*`、`actor.*`、`object.*` | CyberArk、Okta |
| `user_action` | 对平台资源的增删改查 | `audit.*`、`actor.*`、`object.*`、`product.*` | Okta、GitHub、Sonatype |
| `http` | HTTP 请求/响应（WAF、网络设备） | `http.*`、`url.*`、`server.*`、`geo.*`、`client.*` | Akamai SIEM、Cloudflare |

## 工作流

| 模式 | 输入 | 来源 |
|---|---|---|
| **工作流 A** —— 建议映射 | 原始厂商日志负载 | `references/mapping-workflow.md § Workflow A` |
| **工作流 B1** —— 静态校验 | 粘贴的已摄取日志事件 | `references/mapping-workflow.md § Workflow B1` |
| **工作流 B2** —— 运行时校验 | `log.source` 值 + 实时租户访问权限 | `references/runtime-validation.md` —— 获取日志，然后运行 B1 |

## 关键概念

**内容字段埋没：** 首要的校验关注点。位于 `content`（原始厂商负载）中、本可提升为顶层语义属性但未被提升的字段。该技能始终会清点被埋没与已提升的字段，并提出 OpenPipeline 提取规则以修复差距。

> **前提条件：** 在提出 OpenPipeline 处理器提取规则时，请先加载 `dt-dql-essentials` 技能。OpenPipeline 处理器使用 DQL 函数（`parse`、`fieldsAdd`、`splitString` 等）—— 使用非 DQL 语法会产生无效规则。

**稀疏映射是有效的：** 像 GitHub 或 Sonatype 这类集成可能只填充核心字段。最低要求：`timestamp`、`log.source`、`content`、`loglevel`、`audit.action`、`audit.identity`。

## 参考

- `references/data-model-notes.md` —— 日志 SD 字段分类法、审计命名空间、枚举、由样本推导出的模式及已知差异
- `references/mapping-workflow.md` —— 摄取清单、工作流 A 和 B1 的流程、内容字段分析、字段优先级顺序
- `references/validation-rules.md` —— 必需字段、内容/枚举/类型规则、差异严重程度
- `references/openpipeline-constraints.md` —— OpenPipeline 处理器命令/函数/运算符/匹配器限制；`parseJson` 不可用及 `parse`→`fieldsFlatten` 替代方案；用于数组类型转换的迭代运算符
- `references/report-format.md` —— 映射表、差异表、OpenPipeline 草图、校验摘要模板
- `references/runtime-validation.md` —— 工作流 B2：获取实时记录，然后运行 B1
- `samples/audit-logs.json` —— 已映射样本：CyberArk、Okta、Azure SignInLogs、Sonatype、GitHub
- `samples/http-logs.json` —— 已映射样本：Akamai SIEM（WAF/HTTP 类别）
- [Dynatrace 日志语义字典](https://docs.dynatrace.com/docs/semantic-dictionary/model/log)
