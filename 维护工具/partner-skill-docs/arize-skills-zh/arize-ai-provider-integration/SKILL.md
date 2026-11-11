---
name: arize-ai-provider-integration
description: 创建、读取、更新和删除 Arize AI 集成，这些集成存储供评估器和其他 Arize 功能使用的 LLM provider 凭据。支持任意 LLM provider（例如 OpenAI、Anthropic、Azure OpenAI、AWS Bedrock、Vertex AI、Gemini、NVIDIA NIM、Fireworks AI、Together AI、DeepSeek）。当用户提到 AI 集成、LLM provider 凭据、创建集成、列出集成、更新凭据、删除集成或将 LLM provider 连接到 Arize 时使用。
metadata:
  author: arize
  version: "1.0"
compatibility: Requires the ax CLI and a configured Arize profile.
---

# Arize AI 集成技能

> **`SPACE`** — `--space` 标志接受空间**名称**（例如 `my-workspace`）或 base64 空间 **ID**（例如 `U3BhY2U6...`）。已知名称可用 `ax spaces get NAME` 解析；名称未知时可用 `ax spaces list` 浏览。
> **注意：** `ai-integrations create` **不**接受 `--space`——AI 集成是账户级的。仅对 `list`、`get`、`update` 和 `delete` 使用 `--space`。

## 概念

- **AI 集成（AI Integration）** = 在 Arize 中注册的、存储的 LLM provider 凭据；供评估器调用 judge 模型，以及其他需要代表你调用 LLM 的 Arize 功能使用
- **Provider** = 支撑该集成的 LLM 服务（例如 `OPEN_AI`、`ANTHROPIC`、`AWS_BEDROCK`）
- **集成 ID（Integration ID）** = 集成的 base64 编码全局标识符（例如 `TGxtSW50ZWdyYXRpb246MTI6YUJjRA==`）；创建评估器和其他下游操作需要它
- **作用域（Scoping）** = 控制哪些空间或用户可以使用某个集成的可见性规则
- **认证类型（Auth type）** = Arize 与 provider 进行认证的方式：`DEFAULT`（provider API key）、`PROXY_WITH_HEADERS`（通过自定义请求头代理）、`BEARER_TOKEN`（bearer token 认证）或 `OAUTH2_CLIENT_CREDENTIALS`

## 前置条件

直接开始任务——运行你需要的 `ax` 命令。不要预先检查版本、环境变量或 profile。

如果 `ax` 命令失败，请根据错误进行排查：
- `command not found` 或版本错误 → 参见 [references/ax-setup.md](references/ax-setup.md)
- `401 Unauthorized` / 缺少 API key → 运行 `ax profiles show` 检查当前 profile。如果 profile 缺失或 API key 有误，按 [references/ax-profiles.md](references/ax-profiles.md) 创建/更新它。如果用户没有自己的 key，请引导他们前往 https://app.arize.com/admin > API Keys
- 空间未知 → 参见 [Space](references/ax-profiles.md#space)
- LLM provider 调用失败（缺少 provider 凭据）→ 运行 `ax ai-integrations list --space SPACE` 检查是否存在平台托管的凭据。如果不存在：
  - **首选：** 将下面“支持的 Provider”中的确切 `ax ai-integrations create` 命令交给用户（引用环境变量名如 `$OPENAI_API_KEY`，绝不使用原始值）。请用户在**他们自己的终端**中导出 provider key 并在那里运行命令——绝不要将 key 粘贴到聊天中。除非该变量已在**本**终端会话中导出，否则不要自行运行创建命令。
  - **Bedrock/Vertex：** 使用 `--provider-metadata` 而非 `--api-key`（参见下方“支持的 Provider”）。
- **安全：** 绝不要读取 `.env` 文件或在文件系统中搜索凭据。例外：非机密的 `ARIZE_SPACE_ID` 行（参见 [Space](references/ax-profiles.md#space)）。Arize 凭据使用 `ax profiles`，LLM provider key 使用 `ax ai-integrations`。绝不要要求用户将机密粘贴到聊天中。缺少凭据时，参见 [references/ax-profiles.md](references/ax-profiles.md)。

---

## 列出 AI 集成

列出空间中可访问的所有集成：

```bash
ax ai-integrations list --space SPACE
```

按名称过滤（不区分大小写的子串匹配）：

```bash
ax ai-integrations list --space SPACE --name "openai"
```

对大型结果集分页：

```bash
# Get first page
ax ai-integrations list --space SPACE --limit 20 -o json

# Get next page using cursor from previous response
ax ai-integrations list --space SPACE --limit 20 --cursor CURSOR_TOKEN -o json
```

运行 `ax ai-integrations list --help` 查看标志。当集成名称或 ID 已知时，使用 `ax ai-integrations get`（见下文）而非对列表分页；`list` 用于浏览。

**响应字段：**

| 字段 | 说明 |
|-------|-------------|
| `id` | Base64 集成 ID——复制它用于下游命令 |
| `name` | 人类可读名称 |
| `provider` | LLM provider 枚举（参见下方“支持的 Provider”） |
| `has_api_key` | 若凭据已存储则为 `true` |
| `model_names` | 允许的模型列表；若启用了所有模型则为 `null` |
| `enable_default_models` | 是否允许使用此 provider 的默认模型 |
| `function_calling_enabled` | 是否启用工具/函数调用 |
| `auth_type` | 认证方式：`DEFAULT`、`PROXY_WITH_HEADERS`、`BEARER_TOKEN` 或 `OAUTH2_CLIENT_CREDENTIALS` |

---

## 获取特定集成

```bash
ax ai-integrations get NAME_OR_ID
ax ai-integrations get NAME_OR_ID -o json
ax ai-integrations get NAME_OR_ID --space SPACE   # required when using name instead of ID
```

用它来检查集成的完整配置，或在创建后确认其 ID。

---

## 创建 AI 集成

在创建之前，务必先列出集成——用户可能已有合适的集成：

```bash
ax ai-integrations list --space SPACE
```

如果不存在合适的集成，则创建一个。所需的标志取决于 provider。

每个创建命令都遵循以下形态；provider 特定的标志来自下方表格：

```bash
ax ai-integrations create \
  --name "My OpenAI Integration" \
  --provider OPEN_AI \
  --api-key $OPENAI_API_KEY \
  --enable-default-models
```

除 LiteLLM、Fireworks AI、Together AI 和 DeepSeek 外，每个集成都需要一个模型来源：传入 `--enable-default-models`（Arize 为该 provider 提供的默认模型列表）和/或一个或多个 `--model-name` 标志。两者都不提供，服务器会以 `400: An integration must have at least one model available` 拒绝创建。

关于某个 provider 的完整示例和说明（Bedrock/Vertex 元数据、base URL、应避免的标志），只打开下方 **Details** 列中该 provider 的文件。

### 支持的 Provider

| Provider | 必需的额外标志（"模型来源" = `--enable-default-models` 或 `--model-name`） | 关键环境变量 | 详情 |
|----------|---------------------|-------------|---------|
| `OPEN_AI` | `--api-key <key>`、模型来源 | `$OPENAI_API_KEY` | [provider-openai.md](references/provider-openai.md) |
| `ANTHROPIC` | `--api-key <key>`、模型来源 | `$ANTHROPIC_API_KEY` | [provider-anthropic.md](references/provider-anthropic.md) |
| `AZURE_OPEN_AI` | `--api-key <key>`、`--base-url <azure-endpoint>`、`--model-name <deployment>` | `$AZURE_OPENAI_API_KEY` | [provider-azure-openai.md](references/provider-azure-openai.md) |
| `AWS_BEDROCK` | `--provider-metadata '{"role_arn": "<arn>"}'`（无 API key）、模型来源 | — | [provider-aws-bedrock.md](references/provider-aws-bedrock.md) |
| `VERTEX_AI` | `--provider-metadata '{"project_id": "<gcp-project>", "location": "<region>", "project_access_label": "<label>"}'`（无 API key）、模型来源 | — | [provider-vertex-ai.md](references/provider-vertex-ai.md) |
| `GEMINI` | `--api-key <key>`、模型来源 | `$GEMINI_API_KEY` | [provider-gemini.md](references/provider-gemini.md) |
| `NVIDIA_NIM` | 模型来源；`--api-key` 和 `--base-url` 可选（默认：NVIDIA 托管） | `$NVIDIA_API_KEY` | [provider-nvidia-nim.md](references/provider-nvidia-nim.md) |
| `CUSTOM` | `--base-url <endpoint>`、模型来源 | `$CUSTOM_LLM_API_KEY` | [provider-custom.md](references/provider-custom.md) |
| `LITELLM` | `--base-url <endpoint>`、`--api-key <key>` | `$LITELLM_API_KEY` | [provider-litellm.md](references/provider-litellm.md) |
| `FIREWORKS` | 仅 `--api-key <key>`——不要 `--base-url` 或 `--headers` | `$FIREWORKS_API_KEY` | [provider-fireworks.md](references/provider-fireworks.md) |
| `TOGETHER_AI` | 仅 `--api-key <key>`——不要 `--base-url` 或 `--headers` | `$TOGETHER_API_KEY` | [provider-together-ai.md](references/provider-together-ai.md) |
| `DEEP_SEEK` | 仅 `--api-key <key>`——不要 `--base-url` 或 `--headers` | `$DEEPSEEK_API_KEY` | [provider-deepseek.md](references/provider-deepseek.md) |

运行 `ax ai-integrations create --help` 查看可选标志。当 provider 位于代理之后时，将 `--headers` 与 `--auth-type PROXY_WITH_HEADERS` 搭配使用。

### 创建之后

记录返回的集成 ID（例如 `TGxtSW50ZWdyYXRpb246MTI6YUJjRA==`）——创建评估器和其他下游命令都需要它。如果你遗漏了它，可以检索：

```bash
ax ai-integrations get NAME_OR_ID --space SPACE -o json
```

---

## 更新 AI 集成

`update` 是部分更新——只改动你提供的标志。省略的字段保持原样。

```bash
# Rename
ax ai-integrations update NAME_OR_ID --name "New Name"

# Rotate the API key
ax ai-integrations update NAME_OR_ID --api-key $OPENAI_API_KEY

# Change the model list (replaces all existing model names)
ax ai-integrations update NAME_OR_ID --model-name gpt-4o --model-name gpt-4o-mini

# Update base URL (for Azure, custom, or NIM)
ax ai-integrations update NAME_OR_ID --base-url "https://new-endpoint.example.com/v1"

# Restrict visibility to specific spaces (full replace — lists all spaces that should have access)
ax ai-integrations update NAME_OR_ID \
  --scopings '[{"space_id": "SPACE_GLOBAL_ID", "scoping_type": "include"}]'
```

当使用名称而非 ID 时，添加 `--space SPACE`。`create` 接受的任何标志都可以传给 `update`。

**`--scopings` 标志：** 控制哪些空间可以使用此集成。接受一个作用域规则的 JSON 数组。更新时会替换所有现有作用域。使用 `ax spaces list -o json` 查找空间全局 ID。

---

## 删除 AI 集成

**警告：** 删除是永久性的。引用此集成的评估器将无法再运行。

```bash
ax ai-integrations delete NAME_OR_ID --force
ax ai-integrations delete NAME_OR_ID --space SPACE --force   # required when using name instead of ID
```

省略 `--force` 将得到确认提示，而不是立即删除。

---

## `ax integrations`（LLM 和 agent 集成）

`ax integrations` 在一个命令组中管理 LLM 和 agent 集成（`list`、`get`、`delete`、`create llm|agent`、`update llm|agent`）。运行 `ax integrations <sub> --help` 查看标志。

- **选择创建命令：** 对 `AZURE_OPEN_AI` 或需要 `--auth-type` 时使用 `ax ai-integrations create`（即上面的示例）；`ax integrations create llm` 不接受两者。当必须在创建时设置作用域（`--scopings`）时，使用 `ax integrations create llm`。
- **`create llm` 的 provider 标志不同**于 `ax ai-integrations create`：Bedrock 和 Vertex AI 使用专用标志而非 `--provider-metadata`。运行 `ax integrations create llm --help` 查看按 provider 的列表。
- **Agent 端点：** 使用 `ax integrations create agent` 注册 agent 端点；运行其 `--help` 查看标志。
- **Provider 不可变**，位于 `ax integrations update llm` 中；要更改需删除后重建。
- **`--type`：** `list` 返回合并的所有类型；用 `--type LLM` 或 `--type AGENT` 过滤。按名称 `get` 和 `delete` 需要 `--type`，因为名称仅在每种类型内唯一；使用 ID 则无需它。

---

## 故障排查

| 问题 | 解决方案 |
|---------|----------|
| `ax: command not found` | 参见 [references/ax-setup.md](references/ax-setup.md) |
| `401 Unauthorized` | API key 可能无权访问此空间。请在 https://app.arize.com/admin > API Keys 验证 key 和空间 ID |
| `No profile found` | 运行 `ax profiles show --expand`；设置 `ARIZE_API_KEY` 环境变量或写入 `~/.arize/config.toml` |
| `Integration not found` | 用 `ax ai-integrations get NAME_OR_ID --space SPACE` 检查名称或 ID；仅用 `ax ai-integrations list --space SPACE --name TEXT` 浏览以找到正确名称 |
| 创建后 `has_api_key: false` | 凭据未保存——用正确的 `--api-key` 或 `--provider-metadata` 重新运行 `update` |
| 评估器运行因 LLM 错误失败 | 用 `ax ai-integrations get INT_ID` 检查集成凭据；如有需要，轮换 API key |
| 对 `FIREWORKS`、`TOGETHER_AI` 或 `DEEP_SEEK` 报 `Invalid value for '--provider'` | 已安装的 ax CLI 早于这些 provider——升级 ax CLI（参见 [references/ax-setup.md](references/ax-setup.md)） |
| `An integration must have at least one model available` | 添加 `--enable-default-models` 或至少一个 `--model-name`（除 LiteLLM、Fireworks AI、Together AI 和 DeepSeek 外，所有 provider 都必需） |
| 集成的 `provider` 错误 | `ax ai-integrations update NAME_OR_ID --provider NEW_PROVIDER` 可更改它，但其他字段保持原样——在同一调用中传入新 provider 的必需标志（API key、base URL、模型来源）。当两个 provider 需要非常不同的设置时，删除后重建更干净 |

---

## 相关技能

- **arize-evaluator**：创建使用 AI 集成的 LLM-as-judge 评估器 → 使用 `arize-evaluator`
- **arize-experiment**：运行使用由 AI 集成支持的评估器的实验 → 使用 `arize-experiment`

---

## 保存凭据以备将来使用

参见 [references/ax-profiles.md](references/ax-profiles.md) § 保存凭据以备将来使用。
