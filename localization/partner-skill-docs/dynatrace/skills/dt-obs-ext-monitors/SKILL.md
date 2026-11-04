---
name: dt-obs-ext-monitors
description: >-
  通过平台事件摄取 API（platform/ingest/custom/events/）将第三方测试与监控结果摄取到 Dynatrace Grail。用于将外部合成测试结果、
  CI 监控数据或第三方检查结果发送到 Dynatrace。涵盖令牌作用域、external_test_run 和 external_test_step 的完整事件
  模式（包括 dt.security_context、ci.*、追踪关联以及管道添加的字段）、curl 和 Java DTO 示例，以及 DQL 验证。
  触发词："ingest test results"、"send monitor results"、"third party monitor"、
  "external test ingestion"、"send synthetic results to Grail"、"external test run event schema"。
  不适用于 Dynatrace 原生的 Synthetic Monitoring 浏览器/HTTP 检查或 RUM（请使用 dt-obs-frontends）。
  要从已弃用的 POST /api/v1/synthetic/ext/tests API 迁移，请加载 dt-upgrade。
license: Apache-2.0
---

# 外部监控摄取

使用事件摄取 API 将第三方测试与监控结果发送到 Dynatrace Grail。
这是已弃用的 `POST /api/v1/synthetic/ext/tests` 端点的规范替代方案。

## 概述

发布到 `/platform/ingest/custom/events/{endpoint}` 的事件会落到 Grail，并由 OpenPipeline 处理，后者会：

- 提取指标（`external.test.availability`、`external.test.duration`）用于告警和 SLO
- 将每个唯一的 `test.id` 注册为 `EXT_TEST` Smartscape 节点 —— 使 Davis Problems 能够
  附着到具名实体（"外部测试 X 宕机了"），而不是在没有拓扑上下文的情况下漂浮
- 为步骤事件添加 `result.status.category`（`SUCCESS` / `SKIPPED` / `FAIL`），用于仪表板过滤

两种事件类型构成一个测试结果：

| 类型 | 用途 |
|------|---------|
| `external_test_run` | 一次测试执行的整体通过/失败结果 |
| `external_test_step` | 该次运行中的一个步骤（可选；启用步骤级指标） |

## 身份验证

接受两种令牌类型：

| 令牌类型 | 作用域 |
|------------|-------|
| Classic Api-Token | `openpipeline.events.custom` |
| Platform Token / OAuth | `openpipeline:events.custom:ingest` |

常见但不起作用的错误猜测：`events.ingest`。

## 快速开始

> **前提条件：** 在发送事件之前，必须在 OpenPipeline 中创建摄取端点。
> `external.tests` 端点由默认的 Dynatrace 第三方监控 Monaco 捆绑包
> 自动预置。
> 设置细节和自定义端点创建请参见 `references/event-ingestion.md`。

发送一条最小的测试结果（将 `external.tests` 替换为你配置的端点名称）：

```text
curl -X POST "https://{env-id}.live.dynatrace.com/platform/ingest/custom/events/external.tests" \
  -H "Authorization: Api-Token {token}" \
  -H "Content-Type: application/json" \
  -d '[{
    "event.kind": "EXTERNAL_TEST_EVENT",
    "event.type": "external_test_run",
    "test.id": "my-api-health-check",
    "test.run.id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "test.name": "My API Health Check",
    "test.type": "api",
    "test.run.status": "passed",
    "test.run.availability": 1,
    "test.run.duration_ms": 245,
    "test.run.location": "us-east-1",
    "dt.security_context": "team-checkout",
    "timestamp": "2024-01-15T10:30:00Z"
  }]'
```

**预期响应：** HTTP 200（空响应体）。

> 完整事件模式、步骤事件、带错误字段和 CI 元数据的扩展示例、
> Java DTO 形态以及 DQL 查询：`references/event-ingestion.md`

## 在 Grail 中验证

发送后，确认事件出现：

```dql
fetch events, from:now()-1h
| filter event.type == "external_test_run"
| fields timestamp, test.id, test.name, test.run.status, test.run.duration_ms, test.run.location
| sort timestamp desc
| limit 20
```

## 关键约束

- 请求体**必须**是 JSON 数组（`[{...}]`），而不是对象包装（`{"events":[...]}`）。
- 单个请求可以在同一数组中混合运行事件和步骤事件。
- `timestamp` 必须是 ISO 8601 UTC（例如 `"2024-01-15T10:30:00Z"`）。
- `test.run.availability` 必须是整数 `1` 或 `0`，而不是字符串。
- 一次运行中的所有步骤事件必须与父运行事件共享相同的 `test.run.id` 和 `test.id`。
- 步骤事件除 `test.run.id` 外还必须包含 `test.step.id`（在运行内唯一）。
- `event.kind: "EXTERNAL_TEST_EVENT"` 必须存在 —— Grail 用它进行事件分类。
  到正确管道的路由由 `event.type` 驱动，而不是 `event.kind`。
- **切勿**发送 `dt.smartscape.ext_test` 或 `result.status.category` —— 这些由
  管道在摄取后写入，如果包含将被覆盖。
- `dt.security_context` 控制数据访问策略；建议在每个事件上都设置它，以在多团队租户中启用
  按团队访问控制和成本归因。

## 多位置测试

从多个位置发送相同的 `test.id` —— 每个位置使用不同的 `test.run.location`
值 —— 即可构建多位置测试。OpenPipeline 会为每个 `test.id` 创建一个 `EXT_TEST` 节点，
并为每个 `(test.id, location)` 对创建一条可用性指标时间序列。

这开箱即用地支持两个告警层级：

| 告警类型 | 触发时机 |
|------------|-----------|
| 局部中断 | 单个位置的可用性下降（按位置的时间序列） |
| 全局中断 | 所有位置的平均值跌破阈值（例如大多数失败） |

3 个位置测试的阈值数学：1 个位置失败 → 平均 0.67（0.5 阈值下不告警）；
2 个失败 → 平均 0.33（触发）；全部 3 个失败 → 平均 ≈ 0（立即触发）。

在所有位置间保持 `test.id` 稳定 —— 更改它会创建一个新的 Smartscape 节点，并
破坏指标历史。

## 相关技能

- **dt-dql-essentials** —— 用于查询已摄取事件和构建分析查询的 DQL 语法
- **dt-obs-frontends** —— 通过 `dt.smartscape.frontend` 将测试运行链接到前端实体，以
  在 Smartscape 中绘制 EXT_TEST → FRONTEND 依赖边
