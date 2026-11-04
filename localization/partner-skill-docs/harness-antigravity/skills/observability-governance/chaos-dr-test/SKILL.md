---
name: chaos-dr-test
description: >-
  在处理 Harness 流水线内的混沌工程步骤时使用。涵盖
  ChaosFault、ChaosProbe、ChaosAction 步骤（DRTest 阶段）、Chaos 步骤（DRTest
  阶段），以及 DRTest 阶段/流水线结构。当用户要求添加、
  修改或创建混沌步骤、故障注入、探针或灾难恢复
  测试流水线时使用。不要用于独立的 Chaos 实验创建或编辑；
  那些请用 chaos-experiment。触发短语：DR test、DRTest pipeline、
  disaster recovery test、chaos step、ChaosFault step、ChaosProbe step、
  ChaosAction step。
metadata:
  author: Harness
  version: 1.0.0
  mcp-server: harness-mcp-v2
  module: CHAOS
  summary: Create and edit DR Test pipelines with chaos steps
license: Apache-2.0
compatibility: Requires Harness MCP v2 server (harness-mcp-v2)
---

# Chaos DR 测试

通过 MCP 创建和编辑 Harness DR 测试流水线——即包含 `DRTest` 阶段并带有
`ChaosFault`、`ChaosProbe`、`ChaosAction` 和 `Chaos` 步骤的流水线。

强制要求——工具结果验证：
- 没有来自工具的明确成功响应，绝不要声称工具调用成功。
- 绝不虚构、假定或预先占用工具结果。如果你调用了工具但未收到确认的结果，如实说明并重试。
- 当工具返回审查/征询提示（例如 "Waiting for user to review before update..."），用户批准并**不**意味着操作已完成。在报告成功之前，你必须等待确认执行的后续工具响应。
- 如果工具响应含糊或缺失，如实告知用户并提供重试。

## 范围规则

在此技能中调用 `harness_list`、`harness_get`、`harness_create`、`harness_update` 或 `harness_execute` 之前，遵循 [`references/scope-establishment.md`](../../../references/scope-establishment.md) 建立 org/project 范围：

- 首先从用户消息或粘贴的 Harness UI URL 解析 `org` / `project`。
- 仅询问缺失的内容——不要重复询问已知的值。
- 在第一次变更调用之前重申活动范围。
- 绝不要臆造默认 org/project。如果任一缺失，请在调用项目范围资源之前请用户选择；不要静默回退到账户范围。

## 说明

### YAML 输出约定

**输出风格**——始终为流水线清单输出块式 YAML（每个键单独一行，列表项单独一行以 `-` 开头，子级缩进）。`references/components.md` 中展示的 YAML 示例（Series + Parallel Steps、Full DRTest Pipeline、Chaos step）以压缩 JSON 出现仅出于 token 效率——JSON 解析结果与 YAML 相同，因此这些示例对字段名称和结构仍然权威，但你产出的流水线 YAML 必须是与下面规范脚手架一致的块式。绝不要在 `harness_create` 或 `harness_update` 的流水线 YAML 请求 body 中放入 JSON。

### DR 测试流水线规则

#### 识别 DR 测试流水线

有两种方式验证流水线是 DR 测试：

1. **检查流水线标签**——DR 测试流水线在其顶层 `tags` 中带有 `module: drtest`。此外，流水线内的阶段带有 `type: DRTest`。
2. **通过 MCP 列出**——调用 `harness_list(resource_type="chaos_dr_test", org_id="<org_id>", project_id="<project_id>")` 获取项目中的所有 DR 测试流水线。如果该流水线出现在此列表中，它就是 DR 测试。使用活动范围传递 `org_id`/`project_id`（参见上面的范围规则）。

#### DRTest 阶段和步骤

混沌相关步骤（`ChaosFault`、`ChaosProbe`、`ChaosAction`、`Chaos`）只能添加到 `type: DRTest` 的阶段。它们在任何其他阶段类型中均无效。

#### DRTest 流水线——通过 MCP 以空步骤创建

当用户通过 `harness_create(resource_type="chaos_dr_test", org_id="<org_id>", project_id="<project_id>", body={"name": "...", "identifier": "..."})` 创建 DR 测试时，流水线会以 `steps: []` 生成。create 响应仅返回元数据——使用 `harness_get(resource_type="pipeline", resource_id="<identifier>_pipeline", org_id="<org_id>", project_id="<project_id>")` 获取完整 YAML（两次调用都使用活动范围传递 `org_id`/`project_id`）：

```yaml
pipeline:
  description: ""                          # optional, user can update later
  identifier: test_new_dr_test_pipeline    # auto: <identifier>_pipeline, does NOT change
  name: test new dr test pipeline          # auto: <name> Pipeline, user can update
  orgIdentifier: default                   # from account context, does NOT change
  projectIdentifier: ChaosDev1             # from account context, does NOT change
  stages:
    - stage:
        description: Optional Description  # optional, user can set at create or update later
        identifier: test_new_dr_test       # auto-derived from name, does NOT change
        name: test new dr test             # user-provided name, user can update
        objective: Optional Objective      # optional, user can set at create or update later
        spec:
          execution:
            steps: []                      # EMPTY — agent must populate with chaos steps
        tags:
          someTag: value                   # optional, user can add at create or update later
        type: DRTest                       # fixed, set at stage creation — do NOT remove
  tags:
    module: drtest                         # fixed, auto-set by MCP — do NOT remove
```

**注意：** 上面的示例展示最小结构。真实流水线可能包含额外字段（例如 `allowStageExecutions`、`notificationRules`、`flowControl`、`timeout` 等）——原样保留所获取 YAML 中存在的任何额外字段。不要移除或覆盖它们。

DRTest 流水线**不**使用阶段级 `environment` 块。它可能出现在获取的 YAML 中，但会被后端忽略：

    environment:
      environmentRef: demo
      deployToAll: false
      infrastructureDefinitions:
        - identifier: qaauto1

不要要求用户提供阶段级环境或基础设施——每个混沌步骤都有自己的 `infraReference` 字段（参见 `references/components.md` 步骤 1）。如果此块已存在于获取的 YAML 中，原样保留——不要移除它。

代理的工作是使用 `references/components.md` 中描述的工作流，用混沌步骤（`ChaosFault`、`ChaosProbe`、`ChaosAction`、`Chaos`）填充 `steps: []`。只有这些混沌步骤类型在 `DRTest` 阶段内有效。

**命名约定：** 如果用户创建名称 `test new dr test` 的 DR 测试（标识符自动派生为 `test_new_dr_test`）：
- 流水线标识符 = `test_new_dr_test_pipeline`（自动：`<identifier>_pipeline`）
- 流水线名称 = `test new dr test pipeline`（自动：`<name> Pipeline`）
- 阶段标识符 = `test_new_dr_test`（从名称自动派生）
- 阶段名称 = `test new dr test`（= 用户提供的名称）

可选阶段字段：`description`、`objective`、`tags`、`runMode`、`variables`、`delegateSelectors`、`failureStrategies`、`when`、`timeout`。

### 意图路由

#### 步骤 0：检测意图——创建还是编辑

解析用户的**原始**消息（触发此技能的那条）以确定其意图。不要再次询问他们 "create or edit?"——他们的原始消息已经告诉你。

**意图信号：**

| 意图 | 用户原始消息中的关键词 |
|---|---|
| **创建** | create、build、set up、set-up、new、make、add（新的 DR 测试 / 新步骤）、launch |
| **编辑** | edit、update、modify、change、fix、adjust、rename、tweak、remove、delete、add to an existing |
| **含糊** | 仅有 "DR Test" 或 "chaos step"，无动词 |

**路由：**

- **检测到创建意图** -> 读取 `references/create.md`——创建全新的 DR 测试流水线，然后继续到 Choose Action 中心。
- **检测到编辑意图** -> 读取 `references/edit.md`——按名称/标识符查找现有流水线、确认，然后继续到 Choose Action 中心。
- **含糊** -> 询问用户：
  > Would you like to **create** a new DR Test (or add new chaos steps) or **edit** an existing DR Test pipeline?

一旦确定了路径，不要再询问。

步骤构建机制（命名、环境/基础设施选择、故障/探针/动作/实验选择、运行时变量、保存）见 `references/components.md`，由创建和编辑流程共享。

对于独立的 Chaos 实验 YAML（不是流水线步骤），请停止并改用 `chaos-experiment`。

## 示例

- “创建一个名为 payment-db-failover 的新 DR 测试流水线，带一个 pod-delete 故障” -> 路由到 `references/create.md`
- “向我现有的 `test_new_dr_test` DR 测试添加一个探针步骤” -> 路由到 `references/edit.md`
- “从 DR 测试流水线中移除 ChaosAction_1 步骤” -> 路由到 `references/edit.md`
- “DRTest 阶段内可以放什么步骤？” -> 直接从本文件回答（`DRTest 阶段和步骤`）

## 性能注意事项

- 步骤 1（环境/基础设施选择）必须为每个新的 `ChaosProbe` / `ChaosFault` / `ChaosAction` 步骤重新运行，即使并行添加步骤也是如此——绝不要复用先前步骤的 `infraReference`。
- 不要猜测探针/故障/动作身份或基础设施 ID。始终调用匹配的 `harness_list` 并使用返回的值。
- 流水线更新调用（`harness_update`）是全量替换 PUT——始终先获取当前 YAML，仅应用所请求的更改，保留每个现有字段。
- 在报告成功之前等待工具确认的响应；审查/征询提示不是已完成的保存。

## 故障排查

- **流水线更新抹掉了现有步骤/字段**——更新端点是全量替换 PUT；始终在修改并重新发送之前立即 `harness_get` 当前 YAML，按 `references/components.md` 步骤 4。
- **Chaos 步骤在 DRTest 阶段之外被拒绝**——`ChaosFault` / `ChaosProbe` / `ChaosAction` / `Chaos` 步骤仅在 `type: DRTest` 的阶段内有效；添加步骤之前核实目标阶段类型。
- **重复步骤名称/标识符错误**——每个步骤的 `name` 和 `identifier` 在阶段内必须唯一；命名新步骤之前检查现有步骤。
- **创建与编辑意图含糊**——如果步骤 0 的关键词信号无法清晰解决，按步骤 0 明确询问，而不是猜测；创建重复流水线比问一个澄清问题更难撤销。
