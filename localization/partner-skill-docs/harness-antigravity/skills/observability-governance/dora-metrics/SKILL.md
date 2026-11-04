---
name: dora-metrics
description: 使用 Harness SEI 通过 MCP 生成 DORA 指标和工程绩效报告。跟踪部署频率、前置时间、变更失败率和 MTTR。当用户说 "DORA metrics"、"deployment frequency"、"lead time"、"engineering metrics"，或询问团队绩效时使用。
metadata:
  author: Harness
  version: 2.1.1
  mcp-server: harness-mcp-v2
  summary: DORA metrics and engineering performance reports
license: Apache-2.0
compatibility: Requires Harness MCP v2 server (harness-mcp-v2). All six DORA metric variants are served by a single consolidated `sei_dora_metric` resource; pick the variant via the `metric` parameter.
---

# DORA 指标

使用 Harness Software Engineering Insights（SEI）通过 MCP 生成 DORA 指标报告。

## 说明

所有 DORA 指标都由单一资源类型提供：`sei_dora_metric`。传递 `metric` 参数以选择变体：

- `deployment_frequency`
- `deployment_frequency_drilldown`
- `lead_time`
- `change_failure_rate`
- `change_failure_rate_drilldown`
- `mttr`

每次 DORA 调用的必需输入：`team_ref_id`、`date_start`、`date_end`、`granularity`（DAILY | WEEKLY | MONTHLY）。

### 步骤 1：获取 DORA 指标

部署频率：
```
Call MCP tool: harness_get
Parameters:
  resource_type: "sei_dora_metric"
  metric: "deployment_frequency"
  team_ref_id: "<team_id>"
  date_start: "2026-03-01"
  date_end: "2026-04-01"
  granularity: "WEEKLY"
```

变更前置时间：
```
Call MCP tool: harness_get
Parameters:
  resource_type: "sei_dora_metric"
  metric: "lead_time"
  team_ref_id: "<team_id>"
  date_start: "2026-03-01"
  date_end: "2026-04-01"
  granularity: "WEEKLY"
```

变更失败率：
```
Call MCP tool: harness_get
Parameters:
  resource_type: "sei_dora_metric"
  metric: "change_failure_rate"
  team_ref_id: "<team_id>"
  date_start: "2026-03-01"
  date_end: "2026-04-01"
  granularity: "WEEKLY"
```

平均恢复时间：
```
Call MCP tool: harness_get
Parameters:
  resource_type: "sei_dora_metric"
  metric: "mttr"
  team_ref_id: "<team_id>"
  date_start: "2026-03-01"
  date_end: "2026-04-01"
  granularity: "WEEKLY"
```

### 步骤 2：获取下钻数据

频率的按部署明细：
```
Call MCP tool: harness_get
Parameters:
  resource_type: "sei_dora_metric"
  metric: "deployment_frequency_drilldown"
  team_ref_id: "<team_id>"
  date_start: "2026-03-01"
  date_end: "2026-04-01"
  granularity: "DAILY"
```

CFR 的按失败明细：
```
Call MCP tool: harness_get
Parameters:
  resource_type: "sei_dora_metric"
  metric: "change_failure_rate_drilldown"
  team_ref_id: "<team_id>"
  date_start: "2026-03-01"
  date_end: "2026-04-01"
  granularity: "DAILY"
```

### 步骤 3：获取团队数据

列出团队：
```
Call MCP tool: harness_list
Parameters:
  resource_type: "sei_team"
```

获取团队详情（集成、开发者、集成过滤器）：
```
Call MCP tool: harness_list
Parameters:
  resource_type: "sei_team_detail"
  team_ref_id: "<team_id>"
  aspect: "developers"   # or "integrations" | "integration_filters"
```

### 步骤 4：AI 指标（可选）

```
Call MCP tool: harness_get
Parameters:
  resource_type: "sei_ai_adoption"
```

相关：`sei_ai_impact`、`sei_ai_usage`、`sei_ai_raw_metric`。

## DORA 基准

| 指标 | Elite | High | Medium | Low |
|--------|-------|------|--------|-----|
| 部署频率 | 每天多次 | 每周-每月 | 每月-6 个月 | 6 个月以上 |
| 前置时间 | < 1 小时 | 1 天-1 周 | 1-6 个月 | 6 个月以上 |
| 变更失败率 | < 5% | 5-10% | 10-15% | > 15% |
| MTTR | < 1 小时 | < 1 天 | 1 天-1 周 | 1 周以上 |

## 报告格式

```
## DORA Metrics Report

**Period:** <date range>
**Team:** <team or org>

### Performance Summary

| Metric | Value | Rating | Trend |
|--------|-------|--------|-------|
| Deployment Frequency | X/week | High | Improving |
| Lead Time | X hours | Elite | Stable |
| Change Failure Rate | X% | Medium | Needs attention |
| MTTR | X hours | High | Improving |

### Overall Rating: <Elite/High/Medium/Low>

### Recommendations
1. CFR at X% - invest in test automation and code review
2. Lead time trending up - look at PR review bottlenecks
3. Consider feature flags to decouple deploy from release
```

## SEI 资源类型

| 资源类型 | 操作 | 描述 |
|--------------|-----------|-------------|
| `sei_dora_metric` | get（+ `metric` 参数） | 全部 6 个 DORA 变体：deployment_frequency、deployment_frequency_drilldown、lead_time、change_failure_rate、change_failure_rate_drilldown、mttr |
| `sei_team` | list, get | 团队定义 |
| `sei_team_detail` | list（+ `aspect` 参数：developers / integrations / integration_filters） | 按团队子资源 |
| `sei_metric` | list, get | 通用指标 |
| `sei_productivity_metric` | get | 生产力指标 |
| `sei_org_tree` | list, get | 组织结构 |
| `sei_org_tree_detail` | list, get | 组织树详情 |
| `sei_business_alignment` | get | 业务对齐 |
| `sei_ai_adoption` | get | AI 采用指标 |
| `sei_ai_impact` | get | AI 影响指标 |
| `sei_ai_usage` | get | AI 使用指标 |
| `sei_ai_raw_metric` | get | 原始 AI 指标 |

## 示例

- “我们的 DORA 指标表现如何？”——用每个主要 `metric` 调用 `sei_dora_metric` 四次
- “比较各团队的 DORA”——列出 `sei_team`，然后按 `team_ref_id` 调用 `sei_dora_metric`
- “我们的部署频率趋势如何？”——用 `metric: deployment_frequency` 获取 `sei_dora_metric`，然后下钻
- “显示 AI 采用指标”——获取 `sei_ai_adoption` 及相关 AI 资源

## 性能注意事项

- 始终传递 `team_ref_id`、`date_start`、`date_end`、`granularity`——这些是必需的。
- 在生成报告之前，汇总整个所请求时间范围的指标。部分数据会使结果产生偏差。
- 跨多个时间段比较指标以识别趋势，而不仅是快照。

## 故障排查

### 无指标数据
- 核实 SEI 集成已配置（Git、CI/CD、问题跟踪）
- 确认 `team_ref_id` 属于活动 SEI 团队（`harness_list resource_type: sei_team`）
- 检查日期范围覆盖了集成已摄取的数据
- 添加新集成后留出数据收集和计算的时间

### 指标似乎不正确
- 核实 SEI 设置中的部署检测规则
- 检查失败分类标准
- 通过 `sei_team_detail aspect: developers` 查看团队成员映射
