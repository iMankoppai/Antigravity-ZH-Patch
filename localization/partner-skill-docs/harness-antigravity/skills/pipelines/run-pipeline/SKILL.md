---
name: run-pipeline
description: >-
  通过 MCP 工具执行并监控 Harness 流水线运行。查找流水线、提供运行时输入、触发
  执行、监控进度、处理审批、重试失败，并中止正在运行或卡住的执行。
  在要求运行流水线、执行部署、触发构建、启动流水线、部署
  服务、检查执行状态、批准流水线，或中止/停止/中断执行时使用。触发短语：
  运行流水线、执行流水线、部署、启动构建、触发流水线、检查执行、批准
  部署、重试失败流水线、中止执行、停止流水线、中断执行、终止卡住的
  流水线。
metadata:
  author: Harness
  version: 2.1.0
  mcp-server: harness-mcp-v2
  summary: Execute and monitor pipeline runs
license: Apache-2.0
compatibility: Requires Harness MCP v2 server (harness-mcp-v2)
---

# 运行流水线

通过 MCP 执行并监控 Harness 流水线运行。

## 说明

### 步骤 1：查找流水线

```
Call MCP tool: harness_search
Parameters:
  query: "<user's pipeline name or keyword>"
  resource_types: ["pipeline"]
  compact: true
```

或列出项目中的所有流水线：

```
Call MCP tool: harness_list
Parameters:
  resource_type: "pipeline"
  org_id: "<organization>"
  project_id: "<project>"
  search_term: "<optional filter>"
```

### 步骤 2：获取流水线详情

```
Call MCP tool: harness_get
Parameters:
  resource_type: "pipeline"
  resource_id: "<pipeline_identifier>"
  org_id: "<organization>"
  project_id: "<project>"
```

从响应中提取：
- 必需的运行时输入（`<+input>` 字段）
- 带类型和默认值的流水线变量
- 阶段结构和部署目标

### 步骤 3：检查可用输入集

```
Call MCP tool: harness_list
Parameters:
  resource_type: "input_set"
  org_id: "<organization>"
  project_id: "<project>"
```

输入集提供可使用或覆盖的预配置值。

### 步骤 4：执行流水线

```
Call MCP tool: harness_execute
Parameters:
  resource_type: "pipeline"
  action: "run"
  resource_id: "<pipeline_identifier>"
  org_id: "<organization>"
  project_id: "<project>"
```

### 步骤 5：监控执行

```
Call MCP tool: harness_get
Parameters:
  resource_type: "execution"
  resource_id: "<execution_id>"
  org_id: "<organization>"
  project_id: "<project>"
```

执行状态：Running、Success、Failed、Aborted、Waiting（审批/输入）、Expired

### 步骤 6：处理审批

如果执行正在等待审批：

```
Call MCP tool: harness_list
Parameters:
  resource_type: "approval_instance"
  org_id: "<organization>"
  project_id: "<project>"
```

然后批准或拒绝：

```
Call MCP tool: harness_execute
Parameters:
  resource_type: "approval_instance"
  action: "approve"  # or "reject"
  resource_id: "<approval_id>"
```

## 安全：生产部署

关键：在执行面向生产的流水线之前：

1. 与用户明确确认意图
2. 展示将部署什么（版本、服务、环境）
3. 检查流水线是否有审批闸门
4. 核实版本已在较低环境测试

## 响应格式

### 执行前
```
Pipeline: <name>
Project: <project>
Required Inputs: <list variables needing values>
Available Input Sets: <list>
Ready to execute? Confirm to proceed.
```

### 触发后
```
Pipeline: <name>
Execution ID: <id>
Status: Running
View in Harness: <openInHarness link>
```

### 执行完成
```
Pipeline: <name>
Status: Success/Failed
Duration: <time>
Stages: <stage results table>
```

## 重试失败执行

重试是对 `pipeline`（而非 `execution`）的动作。将流水线 ID 作为 `resource_id` 传递，将失败执行的 ID 作为 `execution_id` 传递：

```
Call MCP tool: harness_execute
Parameters:
  resource_type: "pipeline"
  action: "retry"
  resource_id: "<pipeline_id>"
  execution_id: "<execution_id>"
  org_id: "<organization>"
  project_id: "<project>"
```

## 中断正在运行的执行

要中止整个流水线执行：

```
Call MCP tool: harness_execute
Parameters:
  resource_type: "execution"
  action: "interrupt"
  resource_id: "<execution_id>"
  org_id: "<organization>"
  project_id: "<project>"
  params:
    interrupt_type: "AbortAll"
```

`params` 内的 `interrupt_type` 字段是必需的。有效值：

| interrupt_type | 效果 |
|----------------|--------|
| `AbortAll` | 中止整个流水线执行 |
| `UserMarkedFailure` | 将执行标记为由用户导致的失败 |

要中止多个卡住的执行，为每个执行 ID 调用带 `params: {interrupt_type: "AbortAll"}` 的 `harness_execute`。

## 示例

- “运行 ci-pipeline”——搜索流水线，用默认值执行
- “将版本 2.0.0 部署到 staging”——查找部署流水线，提供版本输入，执行
- “执行 xyz123 的状态如何？”——获取执行详情
- “重试上次失败的部署”——列出近期失败执行，重试
- “中止所有卡住的执行”——列出运行/等待中的执行，用 `params: {interrupt_type: "AbortAll"}` 逐个中断
- “停止执行 abc123”——用 `params: {interrupt_type: "AbortAll"}` 中断特定执行

## 性能注意事项

- 在触发执行之前始终确认流水线标识符和必需输入。因缺少输入导致的失败执行会浪费时间。
- 监控执行时，等待终态（Success、Failed、Aborted）后再报告结果。不要假定中间状态是最终状态。
- 如果执行失败，在建议修复之前从日志收集完整错误上下文。不要猜测根因。

## 故障排查

### 流水线无法启动
- 用 `harness_status` 检查 delegate 可用性
- 校验所有必需输入都有值
- 用 `harness_execute`（resource_type: "connector"，action: "test_connection"）测试连接器凭据

### 缺少输入
- 对流水线使用 `harness_get` 查看所有 `<+input>` 字段
- 检查输入集中的预配置值

### 执行卡住
- 用 `harness_list`（resource_type: "approval_instance"）检查待审批
- 用 `harness_status` 检查 delegate 状态
- 用 `harness_execute`（resource_type: "execution"，action: "interrupt"，params: {interrupt_type: "AbortAll"}）中止卡住的执行
