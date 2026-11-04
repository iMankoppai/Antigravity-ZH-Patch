---
name: chaos-experiment
description: >-
  当用户要求创建、编辑、更新、设计或配置 Harness Chaos
  实验时使用——包括故障、探针、动作、实验 YAML、故障注入、
  pod-delete 或韧性测试。不要用于流水线或
  DRTest 阶段中的 Chaos 步骤；那些请用 chaos-dr-test。不要用于运行实验、列出过去的
  运行或检查运行结果——那些直接调用 Chaos MCP 工具（参见
  性能注意事项）。触发短语：chaos 实验、混沌工程、韧性
  测试、故障注入、pod-delete、chaos hub 模板。
metadata:
  author: Harness
  version: 3.0.0
  mcp-server: harness-mcp-v2
  module: CHAOS
  summary: Create, edit, and reference chaos experiments (faults, probes, actions)
license: Apache-2.0
compatibility: Requires Harness MCP v2 server (harness-mcp-v2)
---

# Chaos 实验

通过 MCP 创建、编辑并回答有关 Harness Chaos 实验的参考问题——故障、
探针、动作以及底层的 `ChaosExperiment` 清单。

强制要求——工具结果验证：
- 没有来自工具的明确成功响应，绝不要声称工具调用成功。
- 绝不虚构、假定或预先占用工具结果。如果你调用了工具但未收到确认的结果，如实说明并重试。
- 当工具返回审查/征询提示（例如 "Waiting for user to review before update..."），用户批准并**不**意味着操作已完成。在报告成功之前，你必须等待确认执行的后续工具响应。
- 如果工具响应含糊或缺失，如实告知用户并提供重试。

## 说明

### 步骤 1：确定范围

在此技能中的任何 `harness_list`、`harness_get`、`harness_create`、`harness_update` 或
`harness_execute` 调用之前，使用仓库范围的
手册 [`references/scope-establishment.md`](../../../references/scope-establishment.md) 建立 org/project 范围：

- 首先从用户消息或粘贴的 Harness UI URL 解析 `org` / `project`。
- 仅询问缺失的内容——不要重复询问已知的值。
- 在第一次变更调用之前重申活动范围（例如 `org=default, project=payments`）。
- 绝不要假定默认 org/project，除非用户明确确认。

### 步骤 2：先路由再行动

选择下面第一个匹配的入口路由。先读取该入口文件；它之后可能会指示你读取额外的共享参考。

- **参考问题**——用户询问故障、探针、动作、目标工作负载、可调项、顶点、清单字段或 YAML 结构如何工作，而未要求创建或修改实验：读取 `references/components.md`。仅参考性答案不需要脚手架 YAML。
- **现有实验**——用户明确要求编辑、更新、修改、更改、重命名、修复、移除或添加到现有实验，说实验已存在，或提供现有实验 UUID：读取 `references/edit.md`。保留 `experimentId` 和 `identity`。不要生成新 UUID。保存编辑会复用 `harness_create` 作为 upsert——`chaos_experiment` 没有单独的 update 操作；不要为此资源类型调用 `harness_update`。
- **新实验**——用户要求创建、构建、设置、制作、设计或启动新实验：读取 `references/create.md`。当用户为新实验提供所需名称时，此路由仍然适用。生成新 UUID；不要加载现有实验。
- **不确定**——询问："Would you like to **create** a new chaos experiment, **edit** an existing one, or ask a **reference question** about experiment YAML/components?"

故障 / 探针 / 动作的添加移除机制见 `references/components.md`。创建和编辑流程在已有可用 YAML 后读取它；仅参考性问题可以直接读取它。

对于流水线或 DRTest 阶段中的 ChaosFault / ChaosProbe / ChaosAction / Chaos 步骤，请停止并改用 `chaos-dr-test`。

## 示例

- “在我的 checkout-service 上创建一个 pod-delete chaos 实验” -> 路由到 `references/create.md`
- “向我的 `test-exp-007` 实验添加一个 HTTP 探针” -> 路由到 `references/edit.md`
- “编辑 UUID 为 `218b1053-...` 的实验，移除 CPU hog 故障” -> 路由到 `references/edit.md`
- “ChaosExperiment 清单中的 `vertices` 数组是什么意思？” -> 路由到 `references/components.md`（仅参考，无 YAML 更改）
- “我如何按标签而不是名称定向工作负载？” -> 路由到 `references/components.md`

## 性能注意事项

- 不要猜测故障、探针或动作的身份、基础设施 ID 或运行时变量名。始终调用匹配的 `harness_list` / `harness_get` / `harness_execute(action="get_variables")` 并使用返回的值。
- 在呈现或保存之前，按照 `references/components.md` 中的 YAML 校验规则校验清单——无重复键、无孤立 `vertices` 引用、无空行。
- 在报告成功之前等待工具确认的保存响应；审查/征询提示不是已完成的保存。
- **此技能未涵盖：** 运行实验、列出现有实验或检查运行结果。直接使用 Chaos MCP 工具——`harness_execute(resource_type="chaos_experiment", action="run", resource_id="<experiment_id>", ...)`、`harness_list(resource_type="chaos_experiment_run", ...)`、`harness_get(resource_type="chaos_experiment_run", resource_id="<run_id>", ...)`。

## 故障排查

- **实验保存失败 / 校验错误**——调用 `harness_describe(resource_type="chaos_experiment")` 检查权威的 `create` body schema，修复有问题的字段，然后重试。
- **未返回企业或自定义故障**——确认所选基础设施类型（`Kubernetes` -> `KubernetesV2`、`Linux`、`Windows`）与故障支持的基础设施匹配；用更正后的 `infrastructure` 过滤器重新运行 `harness_list(resource_type="chaos_fault", ...)`。
- **目标工作负载发现返回空**——chaos 基础设施的 Service Discovery 代理可能尚未扫描该命名空间；请用户核实基础设施为 `ACTIVE` 且 `isChaosEnabled: true`，然后重试 `discovered_service` / `discovered_namespace` 调用。
- **创建与编辑意图含糊**——如果用户请求可能意味着任一，按上面步骤 2 明确询问，而不是猜测；创建重复实验比问一个澄清问题更难撤销。
