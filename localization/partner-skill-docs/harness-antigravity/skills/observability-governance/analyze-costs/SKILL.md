---
name: analyze-costs
description: 使用 Harness CCM 通过 MCP 分析云成本、查找优化机会并跟踪异常。当用户说 "cloud costs"、"analyze costs"、"cost optimization"、"reduce spending"、"cost report"，或询问云账单时使用。
metadata:
  author: Harness
  version: 2.0.0
  mcp-server: harness-mcp-v2
  summary: Cloud cost analysis, recommendations, and anomaly detection
license: Apache-2.0
compatibility: Requires Harness MCP v2 server (harness-mcp-v2)
---

# 分析成本

使用 Harness Cloud Cost Management（CCM）通过 MCP 分析云成本并识别节省。

## 说明

### 步骤 1：获取成本概览

```
Call MCP tool: harness_get
Parameters:
  resource_type: "cost_account_overview"
```

返回总支出、提供方明细以及与上一周期的趋势。

### 步骤 2：获取成本明细

```
Call MCP tool: harness_get
Parameters:
  resource_type: "cost_breakdown"
```

按服务、环境、团队、区域的多维明细。

### 步骤 3：探索视角

```
Call MCP tool: harness_list
Parameters:
  resource_type: "cost_perspective"
```

然后获取特定视角的详细数据：

```
Call MCP tool: harness_get
Parameters:
  resource_type: "cost_perspective"
  resource_id: "<perspective_id>"
```

### 步骤 4：获取成本趋势

```
Call MCP tool: harness_get
Parameters:
  resource_type: "cost_timeseries"
```

### 步骤 5：获取优化建议

```
Call MCP tool: harness_list
Parameters:
  resource_type: "cost_recommendation"
```

获取详细建议信息：

```
Call MCP tool: harness_get
Parameters:
  resource_type: "cost_recommendation_detail"
  resource_id: "<recommendation_id>"
```

汇总统计：

```
Call MCP tool: harness_get
Parameters:
  resource_type: "cost_recommendation_stats"
```

### 步骤 6：检查异常

```
Call MCP tool: harness_list
Parameters:
  resource_type: "cost_anomaly"
```

要忽略已知异常：

```
Call MCP tool: harness_execute
Parameters:
  resource_type: "cost_anomaly"
  action: "report_feedback"
  resource_id: "<anomaly_id>"
  body: { feedback: "FALSE_ANOMALY" }  # or TRUE_ANOMALY / NOT_RESPONDED
```

### 步骤 7：承诺分析

```
Call MCP tool: harness_get
Parameters:
  resource_type: "cost_commitment"
```

## 报告格式

```
## Cloud Cost Analysis

**Period:** Last 30 Days

### Summary
| Provider | Spend | vs Previous |
|----------|-------|-------------|
| AWS      | $X    | +X%         |
| GCP      | $X    | +X%         |
| Azure    | $X    | -X%         |

### Top Recommendations
1. **Rightsize <resource>** - Save $X/month (95% confidence)
2. **Convert to Reserved** - Save $X/month
3. **Delete unused resources** - Save $X/month

### Anomalies
- <date>: <service> spiked $X above expected

### Actions
- [ ] Rightsize instance X
- [ ] Purchase reserved capacity
- [ ] Clean up unused volumes
```

## 成本资源类型参考

| 资源类型 | 操作 | 描述 |
|--------------|-----------|-------------|
| `cost_account_overview` | get | 账户级总支出摘要 |
| `cost_summary` | get | 视角范围的成本摘要 |
| `cost_timeseries` | get | 随时间变化的成本趋势 |
| `cost_breakdown` | get | 多维明细 |
| `cost_perspective` | list, get | 自定义成本视图 |
| `cost_recommendation` | list | 优化建议 |
| `cost_recommendation_detail` | get | 详细建议 |
| `cost_recommendation_stats` | get | 汇总统计 |
| `cost_anomaly` | list, get, execute(report_feedback) | 成本突增 |
| `cost_anomaly_summary` | get | 异常聚合摘要 |
| `cost_category` | list, get | 成本分配 |
| `cost_commitment` | get | 承诺覆盖/利用率/节省 |
| `cost_filter_value` | get | 可用过滤器值 |

## 示例

- “我们在云上花了多少钱？”——获取 cost_account_overview
- “找出每月 $5,000 的节省”——列出 cost_recommendations，按节省优先排序
- “上周我们的账单为什么突增？”——列出 cost_anomaly
- “按团队细分成本”——获取 cost_breakdown 或 cost_perspective
- “我们在使用预留实例吗？”——获取 cost_commitment

## 性能注意事项

- 在得出成本结论之前，从所有相关视角收集数据。部分数据会导致错误的建议。
- 将建议与异常数据交叉引用，以区分趋势与突增。
- 成本分析的质量比速度更重要。在呈现之前核实节省估算。

## 故障排查

### 无成本数据
- 检查云连接器已配置且正在同步
- 初始同步需要 24-48 小时
- 核实账单访问权限（Cost Explorer、Billing API）

### 无建议
- 资源需要足够的使用历史才能分析
- 较小的节省可能被过滤掉
- 检查最低运行时间要求
