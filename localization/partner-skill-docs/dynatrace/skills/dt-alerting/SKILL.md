---
name: dt-alerting
description: "端到端的 Dynatrace 告警生命周期 —— 异常检测器设置与模型选择（静态阈值、自适应基线、季节性基线）、Grail 中的告警事件存储、通过根因分析进行的问题分组与降噪，以及基于工作流的通知路由（电子邮件、Slack、ServiceNow、webhook）。用于配置告警、在检测器类型之间进行选择、查询告警事件历史、理解告警为何合并为问题，或设置由问题触发的通知。"
license: Apache-2.0
---

# dt-alerting

配置并理解 Dynatrace 中完整的告警生命周期 —— 从异常
检测器设置，到 Grail 事件存储、问题分组，以及工作流
通知投递。

## 告警生命周期

```
┌─────────────────────────────────────────────────────────────────────┐
│  Alert Sources — five categories, each fires a DAVIS_EVENT          │
│  ─────────────────────────────────────────────────────────────────  │
│  1. DQL-based  · Grail-scheduled server-side detector               │
│  2. Edge       · OneAgent on monitored host or process              │
│  3. Pipeline   · OpenPipeline ingest-stream filter matcher          │
│  4. Synthetic  · Worldwide synthetic checker node                   │
│  5. External   · Events API, Workflow, or OneAgent local ingest     │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ DAVIS_EVENT created per trigger per entity
                               ▼
             ┌─────────────────────────────────────┐
             │  Event stored in Grail              │  Persisted and queryable via DQL.
             └──────────────────┬──────────────────┘  One event per trigger per entity.
                                │ correlated by root-cause and impact graph
                                ▼
             ┌─────────────────────────────────────┐
             │  Problem (Denoising)                │  Events sharing the same root-cause
             └──────────────────┬──────────────────┘  and impact graph → one Problem.
                                │ problem event triggers workflow
                                ▼
             ┌─────────────────────────────────────┐
             │  Workflow Notification              │  Filters problems and routes to
             └─────────────────────────────────────┘  email, Slack, ServiceNow, webhook.
```

## 何时使用此技能

- **检测器设置** —— "我如何创建异常检测器？"、"我应该使用哪种
  检测器？"、"自适应和季节性有什么区别？"
- **告警事件历史** —— "查询此服务的所有告警事件"、"显示
  上周哪些指标触发了告警"
- **问题降噪** —— "为什么这两个告警合并成了一个问题？"、
  "Davis 如何对告警分组？"
- **通知设置** —— "问题打开时我如何发送 Slack 消息？"、
  "在关键问题上设置 ServiceNow 工单"
- **最佳实践** —— "我如何避免告警风暴？"、"我应该使用哪个敏感性设置？"
- **过度告警分析** —— "为什么我收到太多告警？"、"我如何
  减少告警疲劳？"、"哪个检测器触发最多？"、"我如何调整
  敏感性或阈值以避免噪声？"
- **通知路由** —— "我如何将告警路由到正确的团队？"、"在
  工作流中设置可扩展的问题过滤器"、"只向负责受影响服务的
  团队发送 Slack 通知"

## 智能体指令

**任何告警设置请求的第一步** —— 在推荐特定
检测器或模型之前，加载 `references/anomaly-detectors.md` 并使用其类别
和模型决策指南，确定哪个检测器类别（基于 DQL、Edge、
Pipeline、Synthetic、外部）以及哪个模型（静态、自适应、季节性）
最适合用户的用例。只有在确定了正确的检测器类型之后，
才继续提供配置指导。

**合并，而不是倍增** —— 当用户要求对同类多个
实体告警时（例如"对服务 A、B 和 C 告警"），始终
推荐**单个组合检测器**，而不是每个实体一个检测器。
在 DQL `timeseries` 调用中使用 `by: { <dimension> }` 按
实体拆分结果，并使用单个 `filter:` 子句限定到相关实体。
将组合检测器与一个在所有告警条件和相应工作流通知过滤器中
共享的**单个 `dt.alert_group` 标签**配对。
这使检测器配置数量保持较少，确保一致的路由，
并使工作流通知渠道可复用于添加到同一组的未来实体。

三个服务的示例 —— 一个检测器，一个工作流：

```dql
timeseries avg(dt.service.request.response_time),
  by: { dt.smartscape.service },
  filter: { in(dt.smartscape.service, {toSmartscapeId("SERVICE-0000000000000001"), toSmartscapeId("SERVICE-0000000000000002"), toSmartscapeId("SERVICE-0000000000000003")}) }
```

在检测器的事件属性中设置 `dt.alert_group: "checkout-team"`，然后
在通知工作流上按 `matchesPhrase(dt.alert_group, "checkout-team")` 过滤。
如果必须覆盖新服务，将其添加到单个 `filter:` 列表中 —— 无需新的
检测器或工作流规则。

### 意图映射

| 用户请求 | 行动 | 参考 |
|---|---|---|
| "how to alert on ..."、"create an alert on ..."、"create anomaly detector"、"set up alerting"、"configure alert rule" | 解释检测器类别和变体，引导完成模型选择 | anomaly-detectors.md |
| "what kinds of anomaly detectors"、"edge alert"、"pipeline alert"、"synthetic alert"、"OneAgent alert" | 解释五种告警来源类别及其权衡 | anomaly-detectors.md |
| "static vs adaptive"、"which detector model"、"seasonal detector" | 比较模型，应用决策指南 | anomaly-detectors.md |
| "query alert history"、"which alerts fired"、"Davis events in Grail" | 通过 `fetch dt.davis.events` 在 Grail 中查询 `dt.davis.events` | davis-events.md |
| "why did alerts merge"、"problem grouping"、"denoising" | 不要在此处解释合并规则 —— 加载 `dt-obs-problems` 并参考 `problem-merging.md` 获取完整合并逻辑 | dt-obs-problems/references/problem-merging.md |
| "send Slack notification"、"email on problem"、"ServiceNow ticket"、"notify on alert" | 解释由问题触发的工作流设置 | workflow-notifications.md |
| "alert storm"、"too many notifications"、"reduce noise" | 过滤策略、降噪、敏感性调优 | workflow-notifications.md + anomaly-detectors.md |

> **分析现有问题** —— 如果用户想要查询或调查
> 活跃/已关闭的问题（根因、影响、趋势），加载 `dt-obs-problems`
> 代替。此技能涵盖*配置和流程*，而非问题查询分析。

> **检测器健康监控** —— 如果用户询问检测器是否
> 正在运行或失败，加载 `dt-platform`（ANALYZER_EXECUTION_EVENT、
> ANOMALY_DETECTOR_STATUS_EVENT）。此技能涵盖*设置*，而非运维健康。

## 前提条件

- 访问具有 Settings v2 写权限的 Dynatrace 环境以
  配置检测器
- 查询告警历史：对 `dt.davis.events` 的 DQL 权限
- 在编写 DQL 查询之前加载 `dt-dql-essentials`

## 知识库结构

| # | 参考 | 内容 |
|---|-----------|---------|
| 1 | [anomaly-detectors.md](references/anomaly-detectors.md) | 检测器类型、模型选择、配置、最佳实践 |
| 2 | [davis-events.md](references/davis-events.md) | Grail 中的 Davis 事件存储、关键字段、DQL 查询模式 |
| 3 | [workflow-notifications.md](references/workflow-notifications.md) | 由问题触发的工作流、过滤、通知渠道 |

## 关键概念

### 告警来源类别

五个基本类别的异常检测器，按检测运行位置以及
告警事件如何到达 Dynatrace 来区分：

| # | 类别 | 检测运行于 | 延迟 | 告警逻辑所有者 |
|---|----------|-------------------|---------|-------------------|
| 1 | **基于 DQL** | Grail（服务端，已调度） | 分钟 | Dynatrace |
| 2 | **Edge** | 受监控主机/进程上的 OneAgent | 秒 | Dynatrace（OneAgent） |
| 3 | **Pipeline** | OpenPipeline 摄取路径（流内） | 接近零 | Dynatrace（管道规则） |
| 4 | **Synthetic** | 合成检查器节点（全球） | 秒 | Dynatrace（合成节点） |
| 5 | **外部** | 客户 / 外部工具 | 调用者定义 | 客户 |

关于每个类别的完整细分（包括权衡和配置入口点），
参见 `references/anomaly-detectors.md`。

### 检测器模型速览

| 模型 | 阈值 | 最适合 |
|-------|-----------|----------|
| **静态** | 你定义的固定值 | 已知的硬限制（例如错误率 > 5%） |
| **自适应基线** | 从近期历史学习 | 没有固定限制但有明确正常行为的指标 |
| **季节性基线** | 结合一天中的时间 / 星期几学习 | 流量、请求速率或任何具有周期性模式的指标 |

### Davis 事件 vs. 问题

| 概念 | 表 | 范围 |
|---------|-------|-------|
| **Davis 事件** | `fetch dt.davis.events` | 每个检测器每次触发每个实体一条记录 |
| **问题** | `fetch dt.davis.problems` | 每个共享根因和影响的相关事件组一条记录 |

单个问题通常包含多个事件。查询问题提供
运维视角；查询事件提供原始告警历史。

### 问题降噪

关于告警为何合并为问题或 Davis 如何对事件分组的疑问，
加载 `dt-obs-problems` —— 合并逻辑和规则记录在
`dt-obs-problems/references/problem-merging.md` 中。此技能仅涵盖告警
*配置和流程*。

## 快速开始

### 检查过去 24 小时内触发了哪些告警

```dql
fetch dt.davis.events, from: -24h
| filter event.status == "ACTIVE"
| summarize alert_count = count(), by: {event.name, event.category, dt.smartscape_source.id}
| sort alert_count desc
| limit 20
```

### 按类别检查告警量

```dql
fetch dt.davis.events, from: -24h
| summarize count = count(), by: {event.category, event.status}
| sort count desc
```

### 查看所有活跃问题（→ 加载 dt-obs-problems 获取完整查询模式）

```dql
fetch dt.davis.problems, from: -24h
| filter not(dt.davis.is_duplicate) and event.status == "ACTIVE"
| fields event.start, display_id, event.name, event.category
| sort event.start desc
| limit 20
```

## 最佳实践

1. **让模型匹配指标的行为** —— 对硬性 SLO
   边界使用静态，对没有自然固定限制的指标使用自适应，对
   任何遵循营业时间或每周模式的指标使用季节性。
2. **窄范围限定检测器** —— 只覆盖相关
   实体的实体选择器减少噪声，并使问题更可操作。
3. **在投入生产前调优敏感性** —— 从 LOW 敏感性
   开始，只有在观察误报率后才转为 MEDIUM 或 HIGH。
4. **让 Davis 在通知前降噪** —— 在*问题*上而不是单个告警事件上
   触发工作流通知。一个问题将对相关告警分组，
   因此你每个事件通知一次，而不是每个指标通知一次。
5. **按严重程度级别过滤通知** —— 将 `event.severity <= 2` 的问题立即路由到
   待命渠道；将 `event.severity >= 3` 的问题路由到较低
   紧迫度的渠道。可以在检测器配置中设置严重程度，或在管道规则或工作流中分配。
6. **使用 `dt.alert_group` 事件属性进行路由** —— 分配 `dt.alert_group` 以将告警路由到正确的团队。可以在检测器配置中设置静态值，通过 DQL 查询结果映射进行动态分配，或在管道规则中分配。
7. **将同条件告警合并为一个检测器和一个工作流** —— 当
   对具有相同指标和阈值的多个实体告警时，使用 `by: { <dimension> }` 和一个组合
   `filter:` 子句将它们合并到单个基于 DQL 的检测器中。将相同的 `dt.alert_group` 值分配给该检测器中的每个条件，
   并将工作流通知渠道指向该单个
   组。每个逻辑告警组一个检测器 + 一个工作流，比
   N 个检测器 + N 个通知规则扩展得更好，并且添加新实体只需一行
   过滤器更改，而不是完整的检测器/工作流添加。

## 相关技能

- **dt-obs-problems** —— 查询、分析和趋势检测到的问题
- **dt-obs-predictive-analytics** —— 使用
  MCP analyzer 工具的临时异常和新颖性检测（非持久告警配置）
- **dt-platform** —— 异常检测器的运维健康（执行事件、
  失败率）
- **dt-platform-costs** —— 异常检测器 DQL 产生的查询成本
- **dt-sdlc-quality-gates** —— 用于部署门禁告警的 Site Reliability Guardian
- **dt-dql-essentials** —— 用于编写检测器查询和告警历史
  查询的 DQL 语法
