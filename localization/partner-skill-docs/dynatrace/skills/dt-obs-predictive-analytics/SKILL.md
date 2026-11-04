---
name: dt-obs-predictive-analytics
description: Dynatrace 的预测分析 —— 使用 timeseries-forecast 工具进行时间序列预测、容量饱和规划，以及跨主机、服务和基础设施的趋势与异常检测。
license: Apache-2.0
---

# 预测分析技能

使用 DQL 和 Dynatrace 分析器工具预测资源饱和、检测趋势、分析异常，并刻画信号行为。

## 分析学科

| # | 学科 | 何时使用…… |
|---|------------|-----------|
| 1 | **预测与预见** | 为容量规划、成本估算或主动告警预测未来的指标值 |
| 2 | **检测变化** | 某指标发生了*偏移* —— 找出信号特征改变的时间点，无论是否越过限制 |
| 3 | **检测违规** | 某指标*当前越界* —— 找出超过或低于可接受范围的实体 |
| 4 | **时间序列特征** | 在进一步分析之前，刻画信号的季节性、噪声水平和趋势 |

---

## 选择合适的检测工具

**最重要的单一决策**：你是在问"这个指标*变化*了吗？"还是"这个指标*当前有误*吗？"

| 问题 | 工具 | 原因 |
|----------|------|-----|
| "这个指标在过去 N 小时内变化了吗？" | `timeseries-novelty-detection` | 检测信号特征*何时*改变（尖峰、阶跃、趋势起始、变异性偏移），无需已知的可接受限制 |
| "哪些服务最近尖峰或骤降？" | `timeseries-novelty-detection` 配 `SPIKE` / `CHANGE_IN_VALUES` | 找出发生变化的特定实体和时间戳；对稳定信号返回空 |
| "CPU 何时开始上升？" | `timeseries-novelty-detection` 配 `TREND_IN_VALUES` | 精确定位方向性偏移的起点 |
| "哪些主机当前 CPU 高于 90%？" | `static-threshold-analyzer` | 已知的固定限制 —— 超过时触发告警 | 也可以用标准 DQL 查询完成，但该工具提供内置的违规计数、滑动窗口和告警逻辑 |
| "哪些服务当前高于其通常负载？" | `adaptive-anomaly-detector` | 从数据中学习正常分布，并标记持续的阈值违规 |
| "哪些服务当前偏高 vs. 其每周模式？" | `seasonal-baseline-anomaly-detector` | 在决定何为异常之前，考虑一天中的时间/星期几模式 |

### 用大白话表述的决策规则

- **使用 `timeseries-novelty-detection`**，当问题包含"changed"、"shifted"、"spiked"、"dropped"、"started"、"when did"或"did anything unusual happen"时。该工具回答变化*是否*发生以及*何时*发生。它不需要预定义的阈值。
- **使用异常检测器**（`adaptive`、`seasonal` 或 `static`），当问题关于相对于预期范围的*持续*或*当前*状态时："哪些最高"、"谁在违规"、"什么高于 X"。这些工具统计滑动窗口内的违规样本 —— 它们确认某事物已糟糕*多久*，而不是信号是否改变。

> **陷阱**：在广泛集群上运行 `adaptive-anomaly-detector` 来回答"哪个服务改变了负载？"通常会标记每个有*任何*变化的服务，产生低信号的结果。先使用 `timeseries-novelty-detection` 找出负载特征真正偏移的实体，然后使用异常检测器衡量那些特定信号的严重程度。

## 何时使用此技能

- **容量**："哪些主机将在未来 30 天内达到 90% CPU？"
- **预测**："预测未来 7 天的服务请求量"
- **趋势**："我们的 Kubernetes 节点内存使用是否在增长？"
- **异常**："哪些服务当前有异常的错误率？"
- **基线**："今天的流量与上周相比如何？"
- **信号画像**："在设置告警之前，这个指标是季节性的还是趋势性的？"

---

## 重要约束

**Dynatrace Forecast Analyzer 仅支持单变量预测** —— 基于一个指标自身的历史值进行预测。多变量预测（使用多个指标作为输入）需要外部工具（Python、R、Azure AutoML）。

**工具规则**：使用 Dynatrace 工具运行分析：`timeseries-forecast`、`adaptive-anomaly-detector`、`seasonal-baseline-anomaly-detector`、`static-threshold-analyzer` 和 `timeseries-novelty-detection`。使用 `execute-dql` 进行 DQL 查询。

**结果分析规则**：始终直接从原始工具输出分析和总结结果。内联推导所有数字、趋势和结论。

---

## 结果展示格式

始终将预测结果以结构化表格呈现：

| 列 | 内容 |
|--------|---------|
| 排名 | 🥇 🥈 🥉 按紧迫度或幅度排序 |
| 信号 / 实体 | 指标名称以及实体或维度 |
| 最新实际值 | 历史序列中最近的非空值 |
| 预测 | 预测期结束时的点预测 |
| 范围 | 同一预测期点上的置信区间下限 – 上限 |
| 趋势 | 从最新实际值到预测的百分比变化：🔴 >+20% / 🟠 +5–20% / 🟢 ±5% 稳定 / 🔵 −5–20% 下降 / ⚫ <−20% 急剧下降 |
| 行动 | ✅ 无需行动 / ⚠️ 监控 / 🔴 立即行动 |

始终在表格后附上**关键发现**部分（3–5 个要点，按优先级排序）。

---

## 核心 DQL 技术

DQL 没有原生的 `forecast` 函数。对于前瞻性预测，使用 `timeseries-forecast`（参见 `references/forecasting-analyzer.md`）。

### 关键 DQL 规则

1. `timeseries` 返回数组 —— 每个实体的每个时间槽一个值
2. `arrayLast(arr)` = 最近的值；`arrayFirst(arr)` = 最旧的值
3. 增长 = `(arrayLast - arrayFirst) / number_of_intervals`
4. 排序前始终 `filter isNotNull(field)`，以避免空值排序问题
5. 除以 `Long` 字段时使用 `toLong()`，以避免类型错误
6. 在 DQL 显示字段中使用 `dt.smartscape.*` 而非已弃用的 `dt.entity.*`；在实体级查询的 `by:{}` 分组子句中使用 `dt.smartscape.*`

---

## 标准查询模式

### 移动平均趋势

```dql
timeseries cpu = avg(dt.host.cpu.usage), from: now()-24h, interval: 1h, by: {dt.smartscape.host}
| fieldsAdd moving_avg = arrayMovingAvg(cpu, 4)
| fieldsAdd current = arrayLast(cpu)
| fieldsAdd trend = arrayLast(cpu) - arrayFirst(cpu)
| filter isNotNull(current)
| sort trend desc
| limit 20
| fields dt.smartscape.host, current, trend, moving_avg
```

### 饱和风险分类

```dql
timeseries cpu = avg(dt.host.cpu.usage), from: now()-7d, interval: 1h, by: {dt.smartscape.host}
| fieldsAdd p95 = arrayPercentile(cpu, 95)
| fieldsAdd saturation_risk = if(p95 > 85, "HIGH", else: if(p95 > 70, "MEDIUM", else: "LOW"))
| filter isNotNull(p95)
| sort p95 desc
| fields dt.smartscape.host, p95, saturation_risk
```

### 距饱和天数预测

```dql
timeseries cpu = avg(dt.host.cpu.usage), from: now()-30d, interval: 1d, by: {dt.smartscape.host}
| fieldsAdd current = arrayLast(cpu)
| fieldsAdd daily_growth = (arrayLast(cpu) - arrayFirst(cpu)) / 30
| filter isNotNull(current)
| fieldsAdd days_to_saturation = if(daily_growth > 0, toLong((90 - current) / daily_growth), else: 9999)
| sort days_to_saturation asc
| limit 20
| fields dt.smartscape.host, current, daily_growth, days_to_saturation
```

### 异常评分

```dql
timeseries cpu = avg(dt.host.cpu.usage), from: now()-24h, interval: 1h, by: {dt.smartscape.host}
| fieldsAdd baseline_avg = arrayAvg(cpu)
| fieldsAdd current = arrayLast(cpu)
| fieldsAdd anomaly_score = if(isNotNull(current) and isNotNull(baseline_avg), abs(current - baseline_avg), else: 0)
| sort anomaly_score desc
| limit 20
| fields dt.smartscape.host, current, baseline_avg, anomaly_score
```

### 指标发现

在预测之前，按关键字发现可用的指标：

```dql
metrics from: now() - 1h
| filter contains(metric.key, "cpu")
| summarize count(), by: {metric.key}
| sort `count()` desc
```

---

## 参考指南

- **`references/forecasting-analyzer.md`** —— `timeseries-forecast` 工具：
  数据要求、参数参考、间隔选择、预测期限制、常见陷阱
- **`references/capacity-forecasting.md`** —— CPU/内存/磁盘/K8s 饱和
  预测；多资源风险评分；距饱和天数 DQL 模式
- **`references/anomaly-scoring.md`** —— `adaptive-anomaly-detector`、`seasonal-baseline-anomaly-detector`、
  `static-threshold-analyzer`；DQL 偏差评分
- **`references/novelty-detection.md`** —— `timeseries-novelty-detection` 工具：尖峰、骤降、阶跃变化、
  趋势起始和变异性变化检测；所有新颖性类型；参数参考；示例演练
- **`references/trend-detection.md`** —— 使用 `timeseries-novelty-detection` 检测趋势起始和变化点；
  周环比连接；增长率和加速度检测

## 相关技能

- **dt-dql-essentials** —— DQL 语法、`timeseries` 命令规则、数组函数参考
- **dt-obs-hosts** —— 主机和进程指标目录
- **dt-obs-services** —— 用于服务级趋势分析的服务 RED 指标
- **dt-obs-problems** —— 用于异常关联的 Davis AI 问题历史
