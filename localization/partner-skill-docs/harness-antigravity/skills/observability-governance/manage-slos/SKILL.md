---
name: manage-slos
description: >-
  协助完成 MCP 服务器当前支持的 Harness Service Reliability Management（SRM）任务：
  拉取近期部署用于事故关联、从部署/执行历史生成值班交接
  报告，以及起草运维运行手册。在询问
  SLO、错误预算、燃尽率告警、值班交接、运行手册或事故分诊时使用。
  不要用于 DORA 指标（请改用 dora-metrics）或混沌实验（请改用
  chaos-experiment）。触发短语：SLO、SLI、错误预算、燃尽率、值班交接、
  运行手册、服务可靠性、事故响应、值班轮班。
metadata:
  author: Harness
  version: 2.0.0
  mcp-server: harness-mcp-v2
  summary: SLO definition, error budgets, incident detection, and operational runbooks
license: Apache-2.0
compatibility: |
  Requires Harness MCP v2 server (harness-mcp-v2).
  NOTE: SRM CRUD resources (`slo`, `slo_alert`, `monitored_service`) are NOT currently exposed
  by the MCP server. Creating/managing SLOs and monitored services must be done in the Harness
  UI. This skill focuses on the incident-correlation and reporting workflows that the MCP server
  does support today (via `execution`, `service`, `environment`).
---

# 管理 SLO / SRM

> **限制：** MCP 服务器当前不暴露 `slo`、`slo_alert` 或
> `monitored_service` 资源类型。SLO 定义、燃尽率告警和受监控服务
> 配置必须在 Harness UI 的
> **Service Reliability Management** 中创建和编辑。此技能涵盖 SRM 工作流中
> *通过 MCP 支持*的部分：部署关联、值班交接报告和运维
> 运行手册。

## 此技能通过 MCP 能做什么

| 工作流 | 当前是否支持 |
|---|---|
| 定义 SLO 或 SLI | ❌ 使用 Harness UI |
| 配置错误预算 / 燃尽率告警 | ❌ 使用 Harness UI |
| 配置受监控服务 | ❌ 使用 Harness UI |
| 将部署与事故关联 | ✅ 通过 `execution` |
| 为值班交接汇总近期发布 | ✅ 通过 `execution`、`service`、`environment` |
| 起草运维运行手册 | ✅（LLM 编写；从 MCP 拉取上下文） |

## 说明

### 步骤 1：确定范围

```
Call MCP tool: harness_list
Parameters:
  resource_type: "project"
  org_id: "<organization>"
```

### 步骤 2：事故分诊——关联部署

当用户报告活动事故时：

1. 识别受影响的服务和环境。
2. 拉取部署该服务的近期执行。

```
Call MCP tool: harness_list
Parameters:
  resource_type: "execution"
  org_id: "<organization>"
  project_id: "<project>"
  # filter by service or environment as needed
```

3. 将事故开始时间与部署时间戳关联。
4. 拉取失败执行的详情：

```
Call MCP tool: harness_get
Parameters:
  resource_type: "execution"
  resource_id: "<execution_id>"
  org_id: "<organization>"
  project_id: "<project>"
```

5. 引导用户完成结构化 RCA：爆炸半径、疑似根因、缓解步骤、回滚候选。

### 步骤 3：值班交接报告

从用户处收集：交班/接班工程师、轮班窗口、负责的服务。

拉取近期执行和服务：

```
Call MCP tool: harness_list
Parameters:
  resource_type: "execution"
  org_id: "<organization>"
  project_id: "<project>"
```

```
Call MCP tool: harness_list
Parameters:
  resource_type: "service"
  org_id: "<organization>"
  project_id: "<project>"
```

生成结构化交接，涵盖：用户描述的活动/近期事故、
轮班期间的部署、失败计数升高的服务，以及需要关注的
事项。

> 对于 SLO 燃尽率和错误预算状态，引导用户使用 SRM UI——
> MCP 服务器不暴露这些指标。

### 步骤 4：运维运行手册（LLM 编写）

从用户处收集：服务名称、团队、技术栈、依赖、SLO 目标、常见
故障模式。

构建运行手册结构：
- 服务概览（目的、负责人、技术栈）
- 健康检查（指向 Harness UI 中 SRM 受监控服务仪表盘的指针）
- 常见告警及响应程序
- 升级路径
- 回滚程序（通过 `harness_list resource_type: pipeline` 引用相关流水线）
- 依赖联系人

## 定义 SLO（目前仅 UI）

当用户要求定义 SLO、燃尽率告警或受监控服务时，回应：

1. 收集需求（服务层级、健康源、SLO 目标、滚动窗口、SLI 类型）。
2. 说明目前 SLO CRUD 不通过 MCP 暴露，并将用户链接到 Harness SRM UI。
3. 提议以文本形式起草 SLO 规范（名称、目标 %、SLI 类型、燃尽率阈值），
   用户可粘贴到 UI。
4. 建议的燃尽率告警窗口：14.4×/1h（page）、6×/6h（ticket）、1×/3d（log）。

## 示例

- “我们的支付服务宕了，帮我分诊”——拉取该服务的近期 `execution`，与事故开始关联，建议回滚候选。
- “生成值班交接报告”——拉取轮班期间的执行和服务，汇总活动问题。
- “为 auth-service 创建运行手册”——使用 MCP 列出流水线/服务/环境以准确引用，起草运行手册。
- “为我们的 payment-gateway 服务定义 SLO”——以文本起草 SLO 规范；指向 Harness SRM UI 进行创建。
- “配置燃尽率告警”——起草告警配置；指向 SRM UI。

## 性能注意事项

- 将事故与部署关联时，拉取足够宽的 execution 窗口（±30 分钟）以捕获慢燃故障。
- 对于交接报告，包含成功和失败的执行——一串成功是有用的上下文。

## 故障排查

### "SLO not found" 或 "Monitored service not found"
- 这些资源目前不由 MCP 服务器暴露。在 Harness UI 的 Service Reliability Management 中管理它们。

### 事故关联缺少执行
- 确认 `org_id` 和 `project_id` 限定了该服务
- 扩大 execution 过滤器时间窗口
- 检查该服务的流水线是否实际运行过（无部署 = 无执行）
