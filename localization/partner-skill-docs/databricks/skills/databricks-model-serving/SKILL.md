---
name: databricks-model-serving
description: "Databricks Model Serving 端点生命周期与运维。适用于被要求：CRUD 服务端点（CLI 或 MLflow Deployments 客户端）；为 A/B / 金丝雀部署和零停机版本切换配置流量路由；获取 OpenAPI schema；检查日志、指标或权限；管理旧版 AI Gateway 速率限制（非 Unity Gateway）；在运行时发现 Foundation Model API 端点；将端点集成到 Databricks Apps；或从平台外客户端（Vercel AI SDK v6、独立 Node.js）流式传输。不适用于：Unity Gateway CRUD 和管理（databricks-unity-gateway）、训练、MLflow 自动记录、UC 注册、自定义 PyFunc/ResponsesAgent 编写（databricks-ml-training）；Knowledge Assistants/Supervisor Agents（databricks-agent-bricks）；MLflow 评估（databricks-mlflow-evaluation）。"
compatibility: Requires databricks CLI (>= v0.294.0)
metadata:
  version: "0.4.0"
parent: databricks-core
---

# Model Serving 端点

**首先**：使用父级 `databricks-core` 技能了解 CLI 基础、身份验证和 profile 选择。

> **Gateway 边界：** 本技能负责附加在 Model Serving 端点上的旧版 AI Gateway 配置，例如
> `serving-endpoints put-ai-gateway`。明确的 Unity Gateway / Unity AI Gateway 请求，或任何
> `databricks ai-gateway` 模型服务、MCP 服务或模型提供商服务，都属于 `databricks-unity-gateway`。

Model Serving 提供托管端点，将 LLM、自定义 ML 模型和外部模型作为可扩展的 REST API 提供服务。端点由**名称**标识（每个工作区唯一）。

## 端点类型

| 类型 | 何时使用 | 关键细节 |
|------|-------------|------------|
| 按 token 付费 | Foundation Model API（Llama、GPT-5、Claude、Gemini 等） | 使用 `system.ai.*` catalog 模型，在每个工作区中预置。运行时发现 —— 见下方 [Foundation Model API 端点](#foundation-model-api-endpoints)。 |
| 预置吞吐量 | 专用 GPU 容量 | 保证吞吐量，成本更高 |
| 自定义模型 | 你自己的 MLflow 模型或容器 | 部署任何带 MLflow 签名的模型 |

## 端点结构

```
Serving Endpoint (top-level, identified by NAME)
  ├── Config
  │     ├── Served Entities (model references + scaling config)
  │     └── Traffic Config (routing percentages across entities)
  ├── AI Gateway (rate limits, usage tracking)
  └── State (READY / NOT_READY, config_update status)
```

- **Served Entities**：每个实体引用一个模型（来自 Unity Catalog 或 MLflow）及扩缩参数。从 `get` 输出中的 `served_entities[].name` 获取实体名称 —— `build-logs` 和 `logs` 命令需要它。
- **Traffic Config**：按百分比在已服务实体间路由请求（用于 A/B 测试、金丝雀部署）。
- **State**：端点在创建或配置更新后经历 `NOT_READY` → `READY`。通过 `get` 轮询检查 `state.ready`。

## CLI 发现 —— 始终先这样做

**不要猜测命令语法。** 动态发现可用命令及其用法：

```bash
# List all serving-endpoints subcommands
databricks serving-endpoints -h

# Get detailed usage for any subcommand (flags, args, JSON fields)
databricks serving-endpoints <subcommand> -h
```

在构造任何命令之前运行 `databricks serving-endpoints -h`。运行 `databricks serving-endpoints <subcommand> -h` 以发现该子命令的确切标志、位置实参和 JSON 规范字段。

## 创建端点

> **创建之前不要列出端点。**

```bash
databricks serving-endpoints create <ENDPOINT_NAME> \
  --json '{
    "served_entities": [{
      "entity_name": "<MODEL_CATALOG_PATH>",
      "entity_version": "<VERSION>",
      "min_provisioned_throughput": 0,
      "max_provisioned_throughput": 0,
      "workload_size": "Small",
      "scale_to_zero_enabled": true
    }],
    "traffic_config": {
      "routes": [{
        "served_entity_name": "<ENTITY_NAME>",
        "traffic_percentage": 100
      }]
    }
  }' --profile <PROFILE>
```

- 发现可用的 Foundation Models：见下方 [Foundation Model API 端点](#foundation-model-api-endpoints)了解运行时列出代码片段和默认选择规则。你也可以检查 Unity Catalog 中的 `system.ai` catalog，或运行 `databricks serving-endpoints list --profile <PROFILE>` 查看工作区中已部署的内容。使用 `databricks serving-endpoints get-open-api <ENDPOINT_NAME> --profile <PROFILE>` 检查特定端点的 API schema。
- 长时间运行的操作；CLI 默认等待完成。使用 `--no-wait` 立即返回，然后轮询：
  ```bash
  databricks serving-endpoints get <ENDPOINT_NAME> --profile <PROFILE>
  # Check: state.ready == "READY"
  ```
- 对于预置吞吐量或自定义模型端点，运行 `databricks serving-endpoints create -h` 以发现你的端点类型所需的 JSON 字段。

### MLflow Deployments 客户端（Python 替代方案）

`mlflow.deployments.get_deploy_client("databricks").create_endpoint(name=..., config={...})` 采用与 CLI 相同的 JSON 形状。两个陷阱：

- **`tags=` 是一个顶层 kwarg**，而非 `config` 内的字段。与 `serving-endpoints patch --add-tags` 相同的 `[{key, value}]` 形状。
- **`traffic_config.routes[].served_model_name` = `"<model>-<version>"`**（例如 `"turbine_failure-3"`）。API 会从实体自动推导它，但你在 `traffic_config` 中引用的正是这个确切字符串 —— 格式弄错，路由就会静默不匹配。

### 零停机版本切换

要将端点滚动到新的模型版本：重新指向别名**并**用新的 `served_entities` + 匹配的 `traffic_config` 调用 `update_endpoint`。缺少任一半是最常见的 bug —— 仅改别名不会更新端点；仅 `update_endpoint` 会让别名仍指向旧版本。

```python
from mlflow.tracking import MlflowClient
from mlflow.deployments import get_deploy_client

registry = MlflowClient(registry_uri="databricks-uc")
deploy   = get_deploy_client("databricks")

registry.set_registered_model_alias(FULL_NAME, "prod", new_version)
deploy.update_endpoint(endpoint=ENDPOINT_NAME, config={
    "served_entities": [{"entity_name": FULL_NAME, "entity_version": new_version,
                         "workload_size": "Small", "scale_to_zero_enabled": True}],
    "traffic_config": {"routes": [
        {"served_model_name": f"{NAME}-{new_version}", "traffic_percentage": 100}
    ]},
})
```

CLI 等效项是 `databricks serving-endpoints update-config <NAME> --json '...'`。无论哪种方式，之后都要轮询 `state.ready` 和 `state.config_update` —— 见下方端点就绪。

### 端点就绪

在 `create` 或 `update-config` 之后，端点会置备计算并加载模型。**在它就绪之前不要查询端点。** 两个状态字段很重要，且含义不同：

- `state.ready` —— 一旦端点有任何可用的配置即 `READY`。在版本切换期间保持 `READY`。
- `state.config_update` —— *当前*配置更新完成后为 `NOT_UPDATING`；在版本切换期间为 `IN_PROGRESS`。

只监视 `state.ready` 的循环会在版本切换中途旧版本仍在服务时就说"就绪"。**两者都要轮询：**

```bash
databricks serving-endpoints get <ENDPOINT_NAME> --profile <PROFILE> \
  | jq '{ready: .state.ready, config_update: .state.config_update}'
# Fully ready when ready == "READY" AND config_update == "NOT_UPDATING"
```

置备可能需要几分钟。预置吞吐量端点耗时最长（GPU 分配）。对尚未 `READY` 的端点的查询返回 404 或 503。

## 查询端点

聊天 / 智能体端点使用 `messages` 数组：

```bash
databricks serving-endpoints query <ENDPOINT_NAME> \
  --json '{"messages": [{"role": "user", "content": "Hello"}]}' --profile <PROFILE>
```

经典 ML 端点使用 `dataframe_records`（每行一条记录）：

```bash
databricks serving-endpoints query <ENDPOINT_NAME> \
  --json '{"dataframe_records": [{"vibration": 0.42, "rpm": 18.3, "temp_c": 71.2}]}'
```

- 在聊天端点上用 `--stream` 获取流式响应。
- 对于嵌入或其他自定义 schema：先使用 `get-open-api <ENDPOINT_NAME>` 发现请求/响应形状。

## 获取端点 Schema（OpenAPI）

返回 OpenAPI 3.1 JSON schema，描述每个已服务模型接受和返回什么。在查询端点之前用它来了解端点的输入/输出格式。

```bash
databricks serving-endpoints get-open-api <ENDPOINT_NAME> --profile <PROFILE>
```

该 schema 显示每个已服务模型的路径（例如 `/served-models/<model-name>/invocations`），包含完整的请求/响应定义，包括参数类型、枚举和可空字段。

## 其他命令

运行 `databricks serving-endpoints <subcommand> -h` 了解用法细节。

| 任务 | 命令 | 备注 |
|------|---------|-------|
| 列出所有端点 | `list` | |
| 获取端点详情 | `get <NAME>` | 显示状态、配置、已服务实体 |
| 删除端点 | `delete <NAME>` | |
| 更新已服务实体或流量 | `update-config <NAME> --json '...'` | 零停机：旧配置服务直到新配置就绪 |
| 速率限制与用量跟踪 | `put-ai-gateway <NAME> --json '...'` | |
| 更新标签 | `patch <NAME> --json '...'` | |
| 构建日志 | `build-logs <NAME> <SERVED_MODEL>` | 从 `get` 输出获取 `SERVED_MODEL`：`served_entities[].name` |
| 运行时日志 | `logs <NAME> <SERVED_MODEL>` | |
| 指标（Prometheus 格式） | `export-metrics <NAME>` | |
| 权限 | `get-permissions <ENDPOINT_ID>` | ⚠️ 使用端点 **ID**（十六进制字符串），而非名称。通过 `get` 查找 ID。 |

## 后续步骤

### 与 Databricks App 集成

创建服务端点后，将其接入 Databricks App。

**步骤 1 —— 检查 AppKit 模板中是否有 `serving` 插件：**

```bash
databricks apps manifest --profile <PROFILE>
```

如果输出包含 `serving` 插件，用以下命令脚手架化：

```bash
databricks apps init --name <APP_NAME> \
  --features serving \
  --set "serving.serving-endpoint.name=<ENDPOINT_NAME>" \
  --run none --profile <PROFILE>
```

**步骤 2 —— 如果没有 `serving` 插件**，手动将端点资源添加到现有应用的 `databricks.yml`：

```yaml
resources:
  apps:
    my_app:
      resources:
        - name: my-model-endpoint
          serving_endpoint:
            name: <ENDPOINT_NAME>
            permission: CAN_QUERY
```

并在 `app.yaml` 中将端点名称作为环境变量注入：

```yaml
env:
  - name: SERVING_ENDPOINT
    valueFrom: serving-endpoint
```

然后通过 `serving()` 插件或 `onPluginsReady` 中的自定义路由将端点接入你的应用。完整的应用集成模式，请使用 **`databricks-apps`** 技能并阅读 [Model Serving 指南](../databricks-apps/references/appkit/model-serving.md)。

### 开发和部署新模型

本技能以运维为重点（管理现有端点）。对于开发侧的流程 —— 训练、MLflow 跟踪、UC 注册、自定义 PyFunc 编写，以及手工编写的 `ResponsesAgent` 代码 —— 参见 **[databricks-ml-training](../databricks-ml-training/SKILL.md)**（实验性）。

## Foundation Model API 端点

按 token 付费，在每个工作区中预置。新模型定期上线，静态的技能列表很快过时 —— **始终在运行时列出，而不要硬编码名称**。按 `databricks-` 名称前缀**且**已服务实体位于 `system.ai.*` 中过滤（像 `databricks-app-template-serving` 这样的其他端点共享此前缀，但不是 FM API 端点）。使用 Databricks Unity Gateway（databricks-unity-gateway）管理对基础模型端点的访问。不要使用 databricks-model-serving 的旧版 AI Gateway。

```bash
# FM API endpoints in this workspace, grouped by task (chat / embeddings / etc.)
databricks serving-endpoints list \
  | jq -r '.[]
      | select(.name | startswith("databricks-"))
      | select((.config.served_entities[0].entity_name // "") | startswith("system.ai."))
      | "\(.task)\t\(.name)"' \
  | sort
```

**用户未指定时的默认值**：为智能体选编号最高的 Claude Sonnet，为代码选编号最高的 `-codex-max`，嵌入用 `databricks-gte-large-en` —— 从上面的实时列表解析实际名称。

## 平台外流式传输

对于部署在 Databricks Apps **之外**（Vercel、AWS、独立 Node.js）且用 Vercel AI SDK v6 访问 Databricks 旧版 AI Gateway 的应用，参见 [references/off-platform-streaming.md](references/off-platform-streaming.md)。平台外应用应更新为访问 Databricks Unity Gateway（databricks-unity-gateway）。对于基于 AppKit 的应用，改用 `databricks-apps` 技能内置的 serving 插件。

## 故障排查

| 错误 | 解决方案 |
|-------|----------|
| `cannot configure default credentials` | 使用 `--profile` 标志或先进行身份验证 |
| `PERMISSION_DENIED` | 检查工作区权限；对于应用，确保以 `CAN_QUERY` 声明了 `serving_endpoint` 资源 |
| 端点卡在 `NOT_READY` | 对于预置吞吐量最多等待 30 分钟。检查构建日志：`build-logs <NAME> <ENTITY_NAME>`（从 `get` 输出 → `served_entities[].name` 获取实体名称） |
| `RESOURCE_DOES_NOT_EXIST` | 用 `list` 核实端点名称 |
| 查询返回 404 | 端点可能仍在置备；通过 `get` 检查 `state.ready` |
| `RATE_LIMIT_EXCEEDED`（429） | AI Gateway 速率限制；检查 `put-ai-gateway` 配置或在退避后重试 |
| 部署后 Serving UI 中缺少端点 | UI 筛选默认"Owned by me"。部署作业以服务主体（service principal）身份运行，因此端点会隐藏，直到你切换到"All"。`databricks serving-endpoints list` 始终显示它。 |
