---
name: arize-link
description: 为项目、trace、span、会话、数据集、实验、标注队列、评估器和标注配置生成指向 Arize UI 的深层链接。使用 ax CLI 发现组织和项目 ID，并生成可点击的 URL，以便与团队成员共享 Arize 资源。当用户想要链接到或在 Arize UI 中打开项目、trace、span、会话、数据集、实验、评估器或标注配置时使用。
metadata:
  author: arize
  version: "1.0"
---

# Arize 链接

为项目、trace、span、会话、数据集、实验、标注队列、评估器和标注配置生成指向 Arize UI 的深层链接。

## 何时使用

- 用户想要一个指向项目、trace、span、会话、数据集、标注队列、评估器或标注配置的链接
- 你从导出数据或日志中获得了 ID，需要链接回 UI
- 用户要求在 Arize 中“打开”或“查看”上述任一内容

## 必需输入

从用户、上下文（导出的 trace 数据或解析出的 URL）或 `ax` CLI 收集：

| 始终必需 | 资源特定 |
|---|---|
| `org_id`（base64） | `project_id` + `trace_id` [+ `span_id`] — trace/span |
| `space_id`（base64） | `project_id` + `session_id` — 会话 |
| | `dataset_id` — 数据集 |
| | `dataset_id` + `experiment_id`（一个或多个）— 实验或比较 |
| | `experiment_id` — 无数据集的实验 |
| | `queue_id` — 特定队列（省略则为列表） |
| | `evaluator_id` [+ `version`] — 评估器 |

### 发现组织和项目 ID

优先使用 CLI，而不是向用户索要它就能提供的 ID：

```bash
ax organizations list --output json
```

使用 `.organizations[].id` 作为组织 ID。如果返回多个组织，匹配用户提供的组织名称，或请他们选择。

要发现项目 ID，请列出相关空间中的项目：

```bash
ax projects list --space "{space_name_or_id}" --limit 100 --output json
```

使用匹配项目的 `id`；它的 `space_id` 提供 URL 中所需要的空间 ID。该命令接受空间名称或 ID；如果不知道空间，运行 `ax projects list --limit 100 --output json` 并选择匹配的项目。

要发现实验 ID，请列出数据集上的实验；每个都有 `id` 和 `dataset_id`：

```bash
ax experiments list --dataset "{dataset_name_or_id}" --space "{space_name_or_id}" --output json
```

**所有路径 ID 都必须 base64 编码**（字符：`A-Za-z0-9+/=`）。原始数字 ID 会产生看似有效但 404 的 URL。如果用户提供了一个数字，请他们直接从自己的 Arize 浏览器 URL（`https://app.arize.com/organizations/{org_id}/spaces/{space_id}/…`）复制 ID。如果你有原始内部 ID（例如 `Organization:1:abC1`），请先对其 base64 编码，再插入 URL。

## URL 模板

基础 URL：`https://app.arize.com`（本地部署可覆盖）

**项目：**
```
{base_url}/organizations/{org_id}/spaces/{space_id}/projects/{project_id}
```

**Trace**（添加 `&selectedSpanId={span_id}` 以高亮特定 span）：
```
{base_url}/organizations/{org_id}/spaces/{space_id}/projects/{project_id}?selectedTraceId={trace_id}&queryFilterA=&selectedTab=llmTracing&timeZoneA=America%2FLos_Angeles&startA={start_ms}&endA={end_ms}&envA=tracing&modelType=generative_llm
```

**会话：**
```
{base_url}/organizations/{org_id}/spaces/{space_id}/projects/{project_id}?selectedSessionId={session_id}&queryFilterA=&selectedTab=llmTracing&timeZoneA=America%2FLos_Angeles&startA={start_ms}&endA={end_ms}&envA=tracing&modelType=generative_llm
```

**数据集**（`selectedTab`：`examples` 或 `experiments`）：
```
{base_url}/organizations/{org_id}/spaces/{space_id}/datasets/{dataset_id}?selectedTab=examples
```

**实验**（重复 `experimentId` 以并排比较实验）：
```
{base_url}/organizations/{org_id}/spaces/{space_id}/datasets/{dataset_id}/experiments/compare?experimentId={experiment_id}
{base_url}/organizations/{org_id}/spaces/{space_id}/datasets/{dataset_id}/experiments/compare?experimentId={experiment_id_a}&experimentId={experiment_id_b}
```

**无数据集的实验：**
```
{base_url}/organizations/{org_id}/spaces/{space_id}/experiments/{experiment_id}
```
对实验 ID 进行 URL 编码（`=` → `%3D`，`+` → `%2B`，`/` → `%2F`）。

**队列列表 / 特定队列：**
```
{base_url}/organizations/{org_id}/spaces/{space_id}/queues
{base_url}/organizations/{org_id}/spaces/{space_id}/queues/{queue_id}
```

**评估器**（省略 `?version=…` 表示最新版）：
```
{base_url}/organizations/{org_id}/spaces/{space_id}/evaluators/{evaluator_id}
{base_url}/organizations/{org_id}/spaces/{space_id}/evaluators/{evaluator_id}?version={version_url_encoded}
```
`version` 值必须经过 URL 编码（例如结尾的 `=` → `%3D`）。

**标注配置：**
```
{base_url}/organizations/{org_id}/spaces/{space_id}/annotation-configs
```

## 时间范围

关键：`startA` 和 `endA`（epoch 毫秒）对于 trace/span/会话链接是**必需的**——省略它们会默认为最近 7 天，如果 trace 落在该窗口之外就会显示“无近期数据”。

**优先级顺序：**
1. **用户提供的 URL**——直接提取并复用 `startA`/`endA`。
2. **Span 的 `start_time`**——前后各放宽 1 天（或对更紧的窗口放宽 1 小时）。
3. **回退**——最近 90 天（`now - 90d` 到 `now`）。

优先使用紧凑窗口；90 天窗口加载缓慢。

## 说明

1. 从用户、导出数据、URL 上下文或 CLI 收集 ID。使用 `ax organizations list --output json` 获取 `org_id`；需要时使用 `ax projects list` 获取 `project_id`。
2. 验证所有路径 ID 都已 base64 编码。
3. 对 trace、span 和会话链接，按上述优先级顺序确定 `startA`/`endA`。
4. 代入相应模板，并以可点击的 Markdown 链接呈现。

## 故障排查

| 问题 | 解决方案 |
|---|---|
| “无数据” / 视图为空 | Trace 在时间窗口之外——放宽 `startA`/`endA`（±1h → ±1d → 90d）。 |
| 404 | ID 错误或未 base64 编码。用 `ax organizations list --output json` 重新检查 `org_id`，用 `ax projects list` 检查 `project_id`，并从浏览器 URL 检查 `space_id`。 |
| Span 未高亮 | `span_id` 可能属于不同的 trace。对照导出的 span 数据进行验证。 |
| `org_id` 未知 | 运行 `ax organizations list --output json` 并使用 `.organizations[].id`。如果 CLI 无法访问该组织，请用户从他们的 Arize 浏览器 URL 复制。 |

## 相关技能

- **arize-trace**：导出 span 以获取 `trace_id`、`span_id` 和 `start_time`。

## 示例

关于每种链接类型的完整具体 URL 示例集，参见 [references/EXAMPLES.md](references/EXAMPLES.md)。
