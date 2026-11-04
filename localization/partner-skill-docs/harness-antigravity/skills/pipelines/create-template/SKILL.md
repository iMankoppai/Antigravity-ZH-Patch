---
name: create-template
description: >-
  为可复用流水线组件（Step、Stage、Pipeline、StepGroup）生成 Harness v0 模板 YAML
  并通过 MCP 创建。在要求创建模板、构建步骤模板、阶段模板、
  流水线模板或可复用步骤时使用。不要用于检查模板使用情况或引用（请改用
  template-usage）。触发短语：创建模板、步骤模板、阶段模板、流水线
  模板、可复用步骤、模板 YAML。
metadata:
  author: Harness
  version: 2.0.0
  mcp-server: harness-mcp-v2
  summary: Create reusable step, stage, pipeline, and step group templates
license: Apache-2.0
compatibility: Requires Harness MCP v2 server (harness-mcp-v2)
---

# 创建模板

为可复用组件生成 Harness v0 模板 YAML 并通过 MCP 推送。

## 说明

1. **确定模板类型**——Step、Stage、Pipeline 或 StepGroup
2. **识别可复用参数**——用 `<+input>` 标记可配置字段以作为运行时输入
3. **生成 YAML**，使用下面的结构并带唯一的 `versionLabel`
4. **通过 MCP 创建**，使用 `harness_create`，resource_type 为 `template`
5. **验证创建**，使用 `harness_list`，resource_type 为 `template`

## 模板类型

- **Step**——可复用步骤定义
- **Stage**——可复用阶段定义
- **Pipeline**——完整的可复用流水线
- **StepGroup**——相关步骤组

## 模板结构

```yaml
template:
  name: My Template
  identifier: my_template
  versionLabel: "1.0.0"
  type: Step           # Step, Stage, Pipeline, StepGroup
  orgIdentifier: default
  projectIdentifier: my_project
  tags: {}
  spec: ...            # Content depends on type
```

## 步骤模板

```yaml
template:
  name: Docker Build Push
  identifier: docker_build_push
  versionLabel: "1.0.0"
  type: Step
  spec:
    type: BuildAndPushDockerRegistry
    spec:
      connectorRef: <+input>
      repo: <+input>
      tags: <+input>
      dockerfile: Dockerfile
      context: .
    timeout: 15m
```

## 阶段模板

```yaml
template:
  name: K8s Deploy Stage
  identifier: k8s_deploy_stage
  versionLabel: "1.0.0"
  type: Stage
  spec:
    type: Deployment
    spec:
      deploymentType: Kubernetes
      service:
        serviceRef: <+input>
      environment:
        environmentRef: <+input>
        infrastructureDefinitions:
          - identifier: <+input>
      execution:
        steps:
          - step:
              identifier: rollout
              name: Rollout
              type: K8sRollingDeploy
              spec:
                skipDryRun: false
              timeout: 10m
        rollbackSteps:
          - step:
              identifier: rollback
              name: Rollback
              type: K8sRollingRollback
              spec: {}
              timeout: 10m
    failureStrategies:
      - onFailure:
          errors: [AllErrors]
          action:
            type: StageRollback
```

## 流水线模板

```yaml
template:
  name: Standard CI/CD
  identifier: standard_cicd
  versionLabel: "1.0.0"
  type: Pipeline
  spec:
    stages:
      - stage:
          identifier: build
          name: Build
          type: CI
          spec:
            cloneCodebase: true
            platform:
              os: Linux
              arch: Amd64
            runtime:
              type: Cloud
              spec: {}
            execution:
              steps:
                - step:
                    identifier: build
                    name: Build
                    type: Run
                    spec:
                      shell: Bash
                      command: <+input>
```

## StepGroup 模板

```yaml
template:
  name: Test Suite
  identifier: test_suite
  versionLabel: "1.0.0"
  type: StepGroup
  spec:
    steps:
      - step:
          identifier: unit_tests
          name: Unit Tests
          type: Run
          spec:
            shell: Bash
            command: <+input>
      - step:
          identifier: integration_tests
          name: Integration Tests
          type: Run
          spec:
            shell: Bash
            command: <+input>
```

## 使用运行时输入

用 `<+input>` 标记可配置字段，以便用户在使用模板时提供值：

```yaml
spec:
  connectorRef: <+input>          # User selects connector
  repo: <+input>                   # User provides repo name
  tags:
    - <+input>                     # User provides tag
    - <+pipeline.sequenceId>       # Fixed value
```

## 通过 MCP 创建

```
Call MCP tool: harness_create
Parameters:
  resource_type: "template"
  org_id: "<organization>"
  project_id: "<project>"
  body: <the template YAML>
```

要更新模板版本：

```
Call MCP tool: harness_update
Parameters:
  resource_type: "template"
  resource_id: "<template_identifier>"
  org_id: "<organization>"
  project_id: "<project>"
  body: <updated template YAML with new versionLabel>
```

要列出现有模板：

```
Call MCP tool: harness_list
Parameters:
  resource_type: "template"
  org_id: "<organization>"
  project_id: "<project>"
```

## 在流水线中引用模板

```yaml
- stage:
    identifier: deploy
    name: Deploy
    template:
      templateRef: k8s_deploy_stage
      versionLabel: "1.0.0"
      templateInputs:
        type: Deployment
        spec:
          service:
            serviceRef: my_service
          environment:
            environmentRef: prod
```

## 示例

- “创建 Docker 构建和推送步骤模板”——生成带 BuildAndPushDockerRegistry 的 Step 模板
- “创建可复用的 K8s 部署阶段”——生成带 Deployment 类型的 Stage 模板
- “制作标准 CI/CD 流水线模板”——生成带 CI + CD 阶段的 Pipeline 模板

## 性能注意事项

- 用 `<+input>` 标记所有可配置字段以最大化模板可复用性。
- 核实每次模板更新的 versionLabel 唯一。
- 在分发给其他团队之前，在流水线中测试模板引用。

## 故障排查

### 模板创建错误
- `DUPLICATE_IDENTIFIER`——模板已存在；用新的 versionLabel 更新
- `INVALID_VERSION`——versionLabel 必须对每个模板唯一
- 标识符必须匹配 `^[a-zA-Z_][0-9a-zA-Z_]{0,127}$`

### 模板使用错误
- `TEMPLATE_NOT_FOUND`——检查 templateRef 和范围（account/org/project）
- `VERSION_NOT_FOUND`——核实 versionLabel 存在
- 缺少 templateInputs——提供所有 `<+input>` 值
