---
name: debug-pipeline
description: >-
  通过 MCP 诊断 Harness 流水线执行。分析任何执行（失败或成功）以产出
  带阶段/步骤细分、耗时、瓶颈、失败详情、链式流水线下钻
  和执行日志的结构化报告。在要求调试流水线、调查失败、查明
  构建为何失败、分析流水线错误、检查执行日志、审查执行性能或
  查找瓶颈时使用。触发短语：调试流水线、流水线失败、我的构建为何失败、分析
  失败、流水线错误、执行日志、修复流水线、执行瓶颈、慢流水线。
metadata:
  author: Harness
  version: 2.1.0
  mcp-server: harness-mcp-v2
  summary: Diagnose pipeline execution failures
license: Apache-2.0
compatibility: Requires Harness MCP v2 server (harness-mcp-v2)
---

# 调试流水线

通过 MCP 诊断流水线执行并建议修复。

## 说明

### 步骤 1：诊断执行（首选）

使用专用的诊断工具。它接受 execution_id、pipeline_id（自动获取最新执行）或 Harness URL：

```
Call MCP tool: harness_diagnose
Parameters:
  pipeline_id: "<pipeline_identifier>"   # or execution_id or url
  org_id: "<organization>"
  project_id: "<project>"
```

它一次性返回带阶段/步骤细分、耗时、瓶颈和失败详情的结构化报告。它还会自动跟踪链式（子）流水线失败。

### 步骤 1b：完整诊断模式

要进行更深入分析，请求日志和流水线 YAML：

```
Call MCP tool: harness_diagnose
Parameters:
  execution_id: "<execution_id>"
  org_id: "<organization>"
  project_id: "<project>"
  summary: false               # raw diagnostic payload
  include_yaml: true           # include pipeline definition
  include_logs: true           # include failed step logs
  log_snippet_lines: 120       # tail N lines per step (0 = unlimited)
  max_failed_steps: 5          # cap number of steps to fetch logs for
```

### 诊断参数

| 参数 | 默认值 | 描述 |
|-----------|---------|-------------|
| `execution_id` | -- | 要分析的具体执行 |
| `pipeline_id` | -- | 获取此流水线的最新执行 |
| `url` | -- | Harness UI URL（自动提取 ID） |
| `summary` | true | 结构化报告（true）或原始负载（false） |
| `include_yaml` | false（摘要）/ true（原始） | 包含流水线 YAML 定义 |
| `include_logs` | false（摘要）/ true（原始） | 包含失败步骤日志 |
| `log_snippet_lines` | 120 | 每步骤最大日志行数（尾部）。0 = 无限 |
| `max_failed_steps` | 5 | 获取日志的最大步骤数。0 = 无限 |

### 步骤 2：项目健康概览

检查整体项目健康以了解上下文：

```
Call MCP tool: harness_status
Parameters:
  org_id: "<organization>"
  project_id: "<project>"
```

显示近期失败的执行、正在运行的执行和部署活动。

### 步骤 3：查找失败执行（如需要）

```
Call MCP tool: harness_list
Parameters:
  resource_type: "execution"
  org_id: "<organization>"
  project_id: "<project>"
  search_term: "<pipeline name>"
```

### 步骤 4：获取执行详情

```
Call MCP tool: harness_get
Parameters:
  resource_type: "execution"
  resource_id: "<execution_id>"
  org_id: "<organization>"
  project_id: "<project>"
```

### 步骤 5：获取执行日志

```
Call MCP tool: harness_get
Parameters:
  resource_type: "execution_log"
  resource_id: "<execution_id>"
  org_id: "<organization>"
  project_id: "<project>"
```

### 步骤 6：获取流水线定义

```
Call MCP tool: harness_get
Parameters:
  resource_type: "pipeline"
  resource_id: "<pipeline_identifier>"
  org_id: "<organization>"
  project_id: "<project>"
```

## 分析框架

对错误分类并提供有针对性的修复：

### 构建失败
- 缺少依赖——检查 package.json/requirements.txt
- 编译错误——审查近期代码变更
- Docker 构建失败——检查 Dockerfile 和基础镜像

### 基础设施错误
- "No delegate available"——检查 delegate 状态、核实标签匹配
- 连接器失败——轮换凭据、测试连接
- 资源限制——检查云配额和限制

### 配置错误
- "Secret not found"——核实密钥在正确范围（account/org/project）存在
- "Could not resolve expression"——检查表达式语法
- "Connector not found"——核实 connectorRef 标识符

### 部署错误
- ImagePullBackOff——检查镜像仓库凭据和镜像标签
- CrashLoopBackOff——检查容器日志、资源限制
- 就绪探针失败——查看探针配置

### 超时错误
- 步骤/阶段超出超时——增大超时或优化
- delegate 任务排队过久——扩容 delegate

### 制品错误
- "Artifact not found"——核实制品路径、检查上游构建

## 响应格式

```
## Pipeline Failure Analysis

**Pipeline:** <name>
**Execution:** <id>
**Failed At:** <timestamp>

### Failure Summary
**Stage:** <failed_stage>
**Step:** <failed_step>
**Error:** <error message>

### Root Cause
<explanation>

### Fix
**Immediate:** <specific steps>
**Prevention:** <how to avoid in future>
```

## 示例

- “我的构建流水线为什么失败？”——用 pipeline_id 使用 `harness_diagnose`
- “调试执行 abc123”——用 execution_id 使用 `harness_diagnose`
- “显示我最近的失败”——使用 `harness_status` 然后深入失败
- “分析 https://app.harness.io/... 处的流水线”——直接将 URL 传给 `harness_diagnose`
- “我的流水线中哪个阶段是瓶颈？”——对成功的执行使用 `harness_diagnose`
- “获取失败部署步骤的完整日志”——使用带 `include_logs: true` 的 `harness_diagnose`

## 性能注意事项

- 花时间彻底分析日志。在诊断之前阅读完整的错误消息和堆栈跟踪。
- 检查所有失败步骤，而不仅是第一个。多个失败可能共享一个根因或揭示依赖链。
- 诊断的质量比速度更重要。错误的诊断比彻底的诊断浪费更多时间。

## 故障排查

### 日志不可用
- 日志根据保留设置过期
- 非常近期的执行可能有延迟的日志
- 已中止的执行可能没有完整日志

### 无法找到执行
- 核实 org/project 范围
- 移除过滤器以查看所有执行
- 检查 RBAC 权限

### MCP 连接问题
- 核实 MCP 服务器正在运行并已连接
- 检查 API 密钥有效性
- 确保已启用所需的工具集（pipelines、logs）
