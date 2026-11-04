---
name: databricks-unity-gateway
description: >-
  在查询或调用按 token 付费的基础模型时使用，或在创建、更新、列出或查询 Unity Gateway（也称 Unity AI
  Gateway）服务时使用，包括模型提供商服务、MCP 服务、system.ai
  服务，以及三段式 Unity Catalog 服务名（catalog.schema.service）。
  也用于管理 Unity Gateway 的花费预算和用量告警，以及从旧版 AI Gateway
  迁移。还用于当拥有 Model Serving 端点权限（例如 CAN_QUERY）的工作负载在查询
  三段式模型名时遇到 PERMISSION_DENIED，因为 serving-endpoint 访问并不授予对
  Unity Gateway 服务的访问权限。不适用于在 Model Serving 端点上配置旧版 AI Gateway；
  那请使用 databricks-model-serving。
compatibility: Requires databricks CLI (>= v1.11.0)
metadata:
  version: "0.1.0"
parent: databricks-core
---

# Unity Gateway

使用父级 `databricks-core` 技能进行 CLI 身份验证和 profile 选择。

Unity Gateway 提供 Unity Catalog 安全对象（securables），用于对 AI 服务的受治理访问。CLI
命令组保留了较早的产品名：`databricks ai-gateway --help`。

## 选择正确的 Gateway

| 请求 | 使用 |
|---|---|
| Unity Gateway 模型服务、MCP 服务或模型提供商服务 | 本技能和 `databricks ai-gateway` |
| Model Serving 端点上的 AI Gateway 配置，包括 `put-ai-gateway` | `databricks-model-serving` 和 `databricks serving-endpoints` |
| Lakeflow Connect 摄取网关 | `databricks-lakeflow-connect` |

当资源是 Unity Catalog 安全对象时，将 **Unity AI Gateway** 视为 **Unity Gateway** 的较早名称。除非用户明确要求迁移，否则不要将旧版 Model Serving AI Gateway 资源转换为 Unity Gateway 资源。

## CLI 工作流

使用 Databricks CLI 进行资源生命周期和权限管理。不要用直接 REST 调用或 Databricks SDK 替代这些操作。查询模型和模型提供商服务支持 Python 客户端；请阅读[查询服务](references/querying.md)。

对 **Unity Gateway**、**Unity AI Gateway** 或 `databricks ai-gateway` 的明确请求属于本技能。不要仅仅因为请求涉及模型服务或工作区就切换到 `databricks-model-serving`。只有当涉及旧版按端点 AI Gateway 操作，或当预置吞吐量目标需要 Model Serving 端点细节时，才使用那个技能。

1. 确认 CLI 满足最低版本：

   ```bash
   databricks --version
   ```

2. 在构造负载之前，先查看命令和相关操作：

   ```bash
   databricks ai-gateway --help
   databricks ai-gateway <operation> --help
   ```

3. 通过 `--json` 传入创建和更新配置。当需要基于 profile 的身份验证时，使用显式的 profile：

   ```bash
   databricks ai-gateway <operation> --json @payload.json --profile <PROFILE>
   ```

不要从命名相似的旧版 API 中臆造 JSON 字段。应根据已安装的 CLI 帮助，以及所选服务类型的 Unity Gateway 文档来构建负载。

## 服务类型

| 服务类型 | CLI 操作 |
|---|---|
| 模型服务 | `create-model-service`、`get-model-service`、`list-model-services`、`update-model-service`、`delete-model-service`；阅读[模型服务](references/model-services.md) |
| MCP 服务 | `create-mcp-service`、`get-mcp-service`、`list-mcp-services`、`update-mcp-service`、`delete-mcp-service`；阅读 [MCP 服务](references/mcp-services.md) |
| 模型提供商服务 | `create-model-provider-service`、`get-model-provider-service`、`list-model-provider-services`、`update-model-provider-service`、`delete-model-provider-service`；阅读[模型提供商服务](references/model-provider-services.md) |

## 查询与权限

- 在编写调用模型或模型提供商服务的 Python 之前，阅读 [references/querying.md](references/querying.md)。
- 在检查、授予或撤销 Unity Gateway 访问权限之前，阅读 [references/permissions.md](references/permissions.md)。
- 在任何模型服务操作之前，阅读 [references/model-services.md](references/model-services.md)。它包含当前的资源命名约定、JSON 负载字段、必需输入门禁和生命周期命令。
- 在任何 MCP 服务操作之前，阅读 [references/mcp-services.md](references/mcp-services.md)以了解等效的 MCP 专属契约。
- 在任何模型提供商服务操作之前，阅读 [references/model-provider-services.md](references/model-provider-services.md)。
- 在设置 Unity Gateway 用量的花费预算或花费告警之前，阅读 [references/budgets.md](references/budgets.md)。
- 在任何账户范围的操作（将账户组作为授权主体、账户预算）之前，阅读 [references/account-access.md](references/account-access.md)。

不要为这些参考已涵盖的字段去抓取公开文档。只有当某个必需字段在参考中缺失，或用户明确要求最新文档时，才查阅权威文档。除非已安装的 CLI 帮助或当前文档明确如此说明，否则不要赋予 Beta 或预览状态。

## 从 Model Serving 迁移到 Unity Gateway

当从工作区范围的 Model Serving 端点迁移到 Unity Catalog 范围的 Unity Gateway 服务时，阅读 [references/model-serving-migration.md](references/model-serving-migration.md)。

## 权威文档

- [Unity Gateway 概述](https://docs.databricks.com/aws/en/ai-gateway/)
- [Unity Gateway 发布说明](https://docs.databricks.com/aws/en/release-notes/unity-gateway/)
- [Unity Gateway 开发者文档](https://developers.databricks.com/docs/agents/ai-gateway)
- [模型服务 API 参考](https://docs.databricks.com/api/ai-gateway/v1/model-service)
- [MCP 服务 API 参考](https://docs.databricks.com/api/ai-gateway/v1/mcp-service)
- [模型提供商服务 API 参考](https://docs.databricks.com/api/ai-gateway/v1/model-provider-service)
- [查询模型服务](https://docs.databricks.com/aws/en/ai-gateway/query-model-services)
- [Open Responses 规范](https://www.openresponses.org/specification)
- [Databricks 上的 Open Responses 提供商行为](https://docs.databricks.com/aws/en/machine-learning/model-serving/query-open-responses-models)
- [查询模型提供商服务](https://docs.databricks.com/aws/en/ai-gateway/query-model-provider-services)
- [模型服务要求与授权](https://docs.databricks.com/ai-gateway/model-services)
- [模型提供商服务治理](https://docs.databricks.com/aws/en/ai-gateway/govern-model-provider-services)
- [路由与回退](https://docs.databricks.com/aws/en/ai-gateway/configure-traffic-splitting)
- [速率限制](https://docs.databricks.com/aws/en/ai-gateway/rate-limits)
- [注册外部 MCP 服务器](https://docs.databricks.com/aws/en/ai-gateway/register-mcp-service)
