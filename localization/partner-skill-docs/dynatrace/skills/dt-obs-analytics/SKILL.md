---
name: dt-obs-analytics
description: >-
  使用 Davis 分析器分析仪表板和笔记本 —— 异常检测、新颖性评分
  和关联。当用户引用特定 Dynatrace 仪表板或笔记本
  （通过 URL、UUID 或名称）并询问它显示什么、运行哪些 DQL 查询、某个磁贴
  是否有问题，或想要查找异常、评分新颖性或关联其指标时使用。
  触发条件是以仪表板或笔记本作为数据源，而不是一般 DQL 问题。
  此技能在不读取完整原始文档 JSON 的情况下高效提取时间序列查询，
  然后可选地对提取的指标运行 Davis 分析器。
  触发短语："what's wrong on this dashboard"、"analyze this notebook"、"find anomalies"、
  "novelty score"、"correlate metrics"、"extract DQL from dashboard"、"dashboard URL"、"tile"、
  "run-analyzer"、"timeseries extraction"、"Davis analyzer"。
license: Apache-2.0
---

# 分析 —— 仪表板与笔记本查询提取

`scripts/` 下三个平台 JavaScript 脚本组成的流水线 —— 两个提取器喂给一个共享分析器运行器：

```
scripts/extract-timeseries-dashboard.js ──┐
scripts/extract-timeseries-notebook.js  ──┴──► queryset.json ──► scripts/run-analyzer.js (any Davis analyzer)
```

每个脚本通过以下方式调用：
```bash
dtctl exec function -f scripts/<script>.js --payload '<json>' -o json
```

`-o json` 将函数返回值包裹在 `.result` 下。当你需要检查结果时，直接从输出中读取 —— 无需 `jq`。将完整原始输出作为 `queries` 传给 `run-analyzer.js`，它会自动解包。

## 解析仪表板 URL

当入口点是 Dynatrace 仪表板 URL 时，提取脚本所需的三个组成部分：

```
https://<tenant>/ui/apps/dynatrace.dashboards/dashboard/<ID>#from=<from>&to=<to>&vfilter_<name>=<val>...
```

| URL 部分 | 脚本目标 |
|---|---|
| `/dashboard/` 之后的路径段（`#` 之前） | extract-timeseries-dashboard.js payload 中的 `id` |
| `#from=` 值（URL 解码 `%3A` → `:`） | run-analyzer.js 中的 `timeframe.startTime`（仅在运行分析时需要） |
| `#to=` 值（URL 解码） | run-analyzer.js 中的 `timeframe.endTime`（仅在运行分析时需要） |
| `vfilter_<name>=<value>` 参数 | run-analyzer.js 中的 `variables` 映射（去掉 `vfilter_` 前缀） |

URL 片段中的时间范围是仪表板的*显示*窗口。它**不会**注入到提取的 DQL 中 —— **提取器**逐字返回 DQL，保留其原始 `$variable` 标记和任何嵌入的 `| timeframe` 子句。仅在调用 `run-analyzer.js` 设置分析窗口时才使用解析出的 `from`/`to` 值。如果用户只是想列出查询，时间范围仅供参考。

注意：当你向 `run-analyzer.js` 传入**绝对** `timeframe.startTime`（不是 `now...` 表达式）时，它会在分析前剥离 DQL 中任何嵌入的 `| timeframe ...` 阶段，因此分析器遵循你请求的窗口而不是查询内置的窗口。对于相对（`now...`）窗口，嵌入的 `| timeframe` 保持原样。这意味着实际分析的查询可能与提取的文本不同 —— 这是预期行为，在此说明是为了让结果与你请求的窗口对齐。

快速 bash 解析（纯 bash + sed/awk —— 不需要 python）：
```bash
DASHBOARD_URL="https://abc123.apps.dynatrace.com/ui/apps/dynatrace.dashboards/dashboard/5bea16c7-029b-43b6-9735-459db2d25bbf#from=2026-05-28T04%3A00Z&to=2026-05-28T05%3A00Z&vfilter_host_group=prod&vfilter_workload=my-svc"

# Minimal URL-decoder: turn %XX into \xXX and let printf interpret it.
urldecode() { local s="${1//+/ }"; printf '%b' "${s//%/\\x}"; }

DOC_ID=$(echo "$DASHBOARD_URL" | sed 's/#.*//' | awk -F/ '{print $NF}')
FROM=$(urldecode "$(echo "$DASHBOARD_URL" | sed -n 's/.*[#&]from=\([^&]*\).*/\1/p')")
TO=$(urldecode "$(echo "$DASHBOARD_URL"   | sed -n 's/.*[#&]to=\([^&]*\).*/\1/p')")
HOST_GROUP=$(echo "$DASHBOARD_URL" | sed -n 's/.*[#&]vfilter_host_group=\([^&]*\).*/\1/p')
WORKLOAD=$(echo "$DASHBOARD_URL"   | sed -n 's/.*[#&]vfilter_workload=\([^&]*\).*/\1/p')
```

对于笔记本：`/notebook/` 之后的路径段，或 `/document/v0/#share=<ID>` 链接的 `#share=` 值。

## 第 1 步 —— 提取查询

### 从仪表板

```bash
# All tiles
dtctl exec function -f scripts/extract-timeseries-dashboard.js \
  --payload '{"id":"<dashboard-id-or-name>"}' -o json

# Only tiles whose title matches a name the user mentioned (e.g. "CPU usage", "Kafka lag")
dtctl exec function -f scripts/extract-timeseries-dashboard.js \
  --payload '{"id":"<dashboard-id>","titleFilter":"CPU usage"}' -o json
```

**当用户指定了具体的磁贴、图表或部分时**，将其名称作为 `titleFilter` 传入，而不是提取整个仪表板。`titleFilter` 是不区分大小写的子串或 `/regex/flags` 模式。这让查询集保持小而聚焦。

**当不清楚用户想要哪些磁贴时**，不要提取所有 DQL —— 仪表板可能有 20–50 个磁贴，返回所有查询会导致显著的上下文膨胀。改用两步流程：

1. 用 `listOnly: true` 列出磁贴名称（无 DQL，仅标题）：
   ```bash
   dtctl exec function -f scripts/extract-timeseries-dashboard.js \
     --payload '{"id":"<dashboard-id>","listOnly":true}' -o json
   # Returns: {"result":{"ok":true,"tiles":[{"id":"...","title":"CPU Usage","visualization":"lineChart"},...]}}
   ```
2. 向用户显示磁贴名称并询问他们指的是哪个（些）磁贴。
3. 仅对感兴趣的磁贴用 `titleFilter` 重新运行。

这避免了在只有 1–2 个相关时把 20–50 个 DQL 查询拉入上下文。

Payload 参数：
- `id`（必填）—— 仪表板 ID（UUID）或精确名称。像 `my.dynatrace.infraops.preview.*` 这样的预设 ID 也可用。
- `titleFilter` —— 不区分大小写的子串（`"CPU usage"`）或 `/regex/flags`（`"/^kafka/i"`）。
- `listOnly` —— 当为 `true` 时，返回 `tiles: [{id, title, visualization}]` 而不含 DQL。用于消歧。
- `compact` —— 当为 `true` 时，每个磁贴只返回 `{id, title, dqlQuery}`（丢弃 description、visualization、isTimeseries）。每磁贴节省约 40% 的 token。在 `listOnly` 模式下，也丢弃 visualization。
- `includeSkipped` —— 当为 `true` 时，返回完整的 `skipped[]` 数组。默认：仅返回 `skippedCount`。

响应信封：
```json
{
  "ok": true,
  "documentId": "...", "documentName": "...", "documentVersion": 7,
  "queries": [
    { "id": "<tile-key>", "title": "...", "description": "...",
      "dqlQuery": "timeseries avg(dt.host.cpu.usage)",
      "visualization": "lineChart", "isTimeseries": true }
  ],
  "skipped": [{ "id": "...", "reason": "non-data tile (markdown)" }]
}
```

失败时：`{ "ok": false, "error": { "code": "...", "message": "..." } }`。

### 从笔记本

相同的信封，不同的模式遍历：

```bash
# All cells
dtctl exec function -f scripts/extract-timeseries-notebook.js \
  --payload '{"id":"<notebook-id-or-name>"}' -o json

# A specific section (if cell titles are set)
dtctl exec function -f scripts/extract-timeseries-notebook.js \
  --payload '{"id":"<notebook-id>","titleFilter":"JVM memory"}' -o json
```

笔记本单元格通常标题为空 —— 如果针对特定单元格，优先使用信封中的 `id` 来寻址。

## 第 2 步 —— 运行分析器

将提取器输出保存到文件，然后通过 shell 替换传入 —— shell 读取文件，因此 JSON 永远不会进入模型的上下文：

```bash
# Run extractor, save output
dtctl exec function -f scripts/extract-timeseries-dashboard.js \
  --payload '{"id":"<id>","titleFilter":"CPU usage","compact":true}' -o json > queryset.json

# Shell substitution: $(cat queryset.json) is expanded by the shell, not the model
dtctl exec function -f scripts/run-analyzer.js \
  --payload '{
    "analyzerName": "dt.statistics.NoveltyScoreAnalyzer",
    "queries": '"$(cat queryset.json)"',
    "timeframe": { "startTime": "...", "endTime": "..." },
    "analyzerParams": { ... }
  }' -o json
```

`run-analyzer.js` 会自动解包 `{"result":{...}}` dtctl 信封 —— 按原样传入原始保存的输出。无需 `jq` 或解析步骤：数组 / 信封 / dtctl 输出形态的规范化在脚本内部发生。

对于大型查询集（许多磁贴），内联 `$(cat ...)` 形式可能触及 shell 参数长度限制。改为构建 payload 文件并使用 dtctl 的 `--data` 标志 —— 仍然不需要 `jq`，且仍在模型上下文之外：

```bash
{ printf '{"analyzerName":"dt.statistics.NoveltyScoreAnalyzer","timeframe":{"startTime":"now-1h","endTime":"now"},"queries":'
  cat queryset.json
  printf '}'; } > payload.json

dtctl exec function -f scripts/run-analyzer.js --data payload.json -o json
```

`run-analyzer.js` 的关键 payload 参数：
- `minScore` —— 丢弃低于此阈值的结果（例如 `0.5`）。从 `noveltyScore`、`anomalyScore`、`correlationCoefficient`、`correlation`、`coefficient` 自动检测分数字段。传入 `scoreField` 以覆盖。
- `scoreField` —— 从中读取分数的显式字段名（例如 `"noveltyScore"`）。

`queries` 字段接受以下任一：原始数组、提取器信封（`{queries:[...]}`），或完整 dtctl 输出（`{"result":{"queries":[...]}}`）。三者都会自动规范化。

### 常见分析器

| 目标 | analyzerName | analyzerParams |
|---|---|---|
| 查找异常指标 | `dt.statistics.anomaly_detection.SeasonalBaselineAnomalyDetectionAnalyzer` | `{ "trainingTimeframe": { "startTime": "now-8d", "endTime": "now-1d" } }`（可选） |
| 为每个指标的新颖性评分 | `dt.statistics.NoveltyScoreAnalyzer` | `{ "detectionMode": "ALL", "minNoveltyScore": 0 }`（可选） |
| 与主指标关联 | `dt.statistics.SimplePearsonCorrelationAnalyzer` | 改为设置 `metricQuery`（改变调用形态） |

### 关联模式

传入 `metricQuery`，将集合中的每个查询与单个主 DQL 字符串关联：

```bash
dtctl exec function -f scripts/run-analyzer.js \
  --payload '{
    "analyzerName": "dt.statistics.SimplePearsonCorrelationAnalyzer",
    "queries": '"$(cat queryset.json)"',
    "metricQuery": "<dqlQuery of the primary tile, copied from extractor output>",
    "timeframe": { "startTime": "...", "endTime": "..." }
  }' -o json
```

当从先前的分析器运行链接时（例如异常检测 → 关联），改用 `metricQueryFrom`。脚本会自动选取得分最高结果的 `dqlQuery`：

```bash
dtctl exec function -f scripts/run-analyzer.js \
  --payload '{
    "analyzerName": "dt.statistics.SimplePearsonCorrelationAnalyzer",
    "queries": '"$(cat queryset.json)"',
    "metricQueryFrom": '"$(cat findings.json)"',
    "timeframe": { "startTime": "...", "endTime": "..." }
  }' -o json
```

如果两者都设置，`metricQuery` 优先。

### 变量替换

仪表板查询通常包含 `$variable` 标记（来自 URL `vfilter_*` 参数）。通过 `variables` 传入它们以在执行前替换：

```bash
dtctl exec function -f scripts/run-analyzer.js \
  --payload '{
    "analyzerName": "dt.statistics.anomaly_detection.SeasonalBaselineAnomalyDetectionAnalyzer",
    "queries": [...],
    "timeframe": { "startTime": "2026-05-28T04:00Z", "endTime": "2026-05-28T05:00Z" },
    "variables": { "host_group": "prod", "workload": "my-svc" }
  }' -o json
```

通过去掉 `vfilter_` 前缀从 `vfilter_*` URL 参数构建 `variables`。尾部 `*` 通配符会自动剥离。未解析的标记会从 DQL 过滤子句中清理掉，而不是留待报错。

### 响应形态

```json
{
  "ok": true,
  "checkedAt": "...",
  "analyzerName": "...",
  "summary": { "checked": 12, "completed": 11, "errors": 1 },
  "results": [
    {
      "id": "tile-key", "title": "CPU usage", "dqlQuery": "...",
      "output": <raw analyzer output>,
      "executionStatus": "COMPLETED"
    }
  ],
  "errors": [ { "id": "...", "error": "..." } ]
}
```

`output` 字段是原始分析器结果。根据分析器解读它：
- **异常检测**：在每个输出条目中寻找 `anomalyScore`、`anomalies[]` 或 `raisedAlerts[]`。分数 ≥ 0.7 → 异常，≥ 0.4 → 临界。
- **新颖性**：寻找 `noveltyScore`（或最接近的类似分数的数值字段）。分数 ≥ 0.7 → 新颖。
- **关联**：寻找 `correlationCoefficient`。按 `|correlationCoefficient|` 降序排序；丢弃 `|correlationCoefficient| < 0.5` 的条目。

## 端到端："这个仪表板上有什么异常？"

```bash
# 1. Extract queries — shell reads file, JSON stays out of model context
dtctl exec function -f scripts/extract-timeseries-dashboard.js \
  --payload '{"id":"5bea16c7-029b-43b6-9735-459db2d25bbf","compact":true}' \
  -o json > queryset.json

# 2. Run anomaly detection — $(cat queryset.json) expanded by shell, not model
dtctl exec function -f scripts/run-analyzer.js \
  --payload '{
    "analyzerName": "dt.statistics.anomaly_detection.SeasonalBaselineAnomalyDetectionAnalyzer",
    "queries": '"$(cat queryset.json)"',
    "timeframe": { "startTime": "2026-05-28T04:00Z", "endTime": "2026-05-28T05:00Z" },
    "variables": { "host_group": "prod", "workload": "my-svc" }
  }' -o json > findings.json

# 3. Correlate — metricQueryFrom picks the top finding automatically
dtctl exec function -f scripts/run-analyzer.js \
  --payload '{
    "analyzerName": "dt.statistics.SimplePearsonCorrelationAnalyzer",
    "queries": '"$(cat queryset.json)"',
    "metricQueryFrom": '"$(cat findings.json)"',
    "timeframe": { "startTime": "2026-05-28T04:00Z", "endTime": "2026-05-28T05:00Z" }
  }' -o json
```

## 验证单个提取的查询

从提取器输出中读取 `dqlQuery` 字段并直接传入：

```bash
dtctl query --query "<dqlQuery copied from extractor output>" -o json | head -40
```

## 注意事项

- **切勿自行读取原始仪表板 JSON。** `dtctl get dashboard <id> -o json` 通常有 50–200 KB。提取器在平台上读取它，并返回紧凑的信封（约 5–15 KB）。
- **在只需要一个磁贴时切勿提取所有磁贴。** 50 个磁贴的仪表板会把 50 个 DQL 查询返回进上下文。如果用户指定了磁贴，使用 `titleFilter`。如果含糊不清，先使用 `listOnly: true` 询问是哪个磁贴 —— 然后只提取那个。
- **过滤型仪表板需要变量。** 带有未替换 `$variable` 标记的查询会静默丢弃实体过滤器（例如 `in(field, $undefined)` 求值为 `true`）。当 URL 有 `vfilter_*` 参数时始终传入 `variables`。
- **模式漂移。** 如果某个磁贴落入 `skipped`，原因为 `no DQL query found`，则仪表板模式有一个提取器不知道的查询位置 —— 将其添加到脚本中的 `pickQuery` 候选列表。
- **分析器可用性。** 并非所有 Davis 分析器在每个租户上都可用。如果调用返回 `Could not find an analyzer with name '...'` 或 `is not a function`，列出实际注册的内容：`dtctl get analyzers -o json`。
- **统计后备已移除。** `run-analyzer.js` 只调用 Davis 分析器。对于历史异常检测，通过 `analyzerParams` 传入较长的 `trainingTimeframe`（例如 `{ "trainingTimeframe": { "startTime": "now-30d", "endTime": "now-1d" } }`），或直接查询 DQL。
- **查询中的注释。** 以 `// comment` 行开头的查询会被提取器正确分类（在 `timeseries` 检查之前会剥离前导行/块注释）。

## 脚本参考

- [scripts/extract-timeseries-dashboard.js](scripts/extract-timeseries-dashboard.js) —— 从仪表板提取 timeseries DQL
- [scripts/extract-timeseries-notebook.js](scripts/extract-timeseries-notebook.js) —— 对笔记本执行相同操作
- [scripts/run-analyzer.js](scripts/run-analyzer.js) —— 通用 Davis 分析器运行器
