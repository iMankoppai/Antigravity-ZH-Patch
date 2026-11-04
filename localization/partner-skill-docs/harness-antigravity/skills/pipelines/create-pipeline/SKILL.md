---
name: create-pipeline
description: >-
  为 CI/CD 工作流生成 Harness v0 流水线 YAML 并通过 MCP 创建。支持 CI 阶段
  （构建、测试、Docker 推送）、CD 阶段（Kubernetes、Helm、ECS、serverless）、审批闸门、并行
  执行、matrix 策略和失败回滚。在要求创建流水线、构建流水线、
  部署流水线、CI/CD 工作流或设置 Harness 流水线时使用。不要用于 v1 简化流水线
  （请使用 create-pipeline-v1）或 FME 功能标志发布阶段（请使用 fme-pipeline）。触发短语：创建流水线、构建流水线、部署流水线、CI/CD、
  Harness 流水线、Kubernetes 部署流水线。
metadata:
  author: Harness
  version: 2.2.0
  mcp-server: harness-mcp-v2
  summary: Generate v0 pipeline YAML (CI, CD, combined, approvals)
license: Apache-2.0
compatibility: Requires Harness MCP v2 server (harness-mcp-v2)
---

# 创建流水线

生成 Harness v0 流水线 YAML，并可选地通过 MCP 推送到 Harness。

## 说明

1. **分析代码库**（如果源代码可用）——扫描项目以自动检测语言、构建工具、测试框架、容器化、部署清单和目标基础设施。使用 `references/codebase-analysis.md` 中的检测表和决策树确定：
   - 语言和运行时版本（package.json → Node.js、go.mod → Go、pom.xml → Java 等）
   - 构建命令和基础镜像
   - 测试框架和报告格式（Jest → JUnit、pytest → JUnit XML 等）
   - Linter 和格式化工具（ESLint、Prettier、Ruff 等）
   - Dockerfile 是否存在及镜像仓库类型（Docker Hub、ECR、GCR、ACR）
   - 部署清单 → Harness 服务/部署类型（k8s manifests → Kubernetes、Chart.yaml → NativeHelm、task-definition.json → ECS、serverless.yml → ServerlessAwsLambda）
   - 用于迁移的现有 CI/CD 配置（GitHub Actions、Jenkins、GitLab CI 等）
2. **澄清需求**——与用户确认检测到的设置。**询问任何无法自动检测的内容**——不要猜测或使用占位符。如果用户请求含糊，在生成 YAML 之前询问。缺失时需要询问的示例：
   - **部署目标 / 基础设施：** region（例如 us-east-1）、集群名称或 ID、账户 ID（例如 ECR/ECS 的 AWS 账户）
   - **镜像仓库：** 哪个镜像仓库（Docker Hub、ECR、GCR、ACR）、镜像仓库标识符/URL、repo 路径
   - **云提供方：** 哪个账户、region，以及连接器/基础设施的资源标识符
   - **审批闸门、通知渠道**（如相关）
   **关键规则：** 绝不要在用户未指定时硬编码部署目标、region、镜像仓库或集群的占位值（例如 `123456789012`、`us-east-1`、`my-cluster`）——而是询问用户。如果用户未指定 region、账户 ID、集群或镜像仓库（例如说 "deploys to ECS" 但无 region 或集群），在生成 YAML 之前向用户询问这些值。
3. **选择原生步骤**——始终优先使用 Harness 原生步骤而非 `Run` 或 `ShellScript` 步骤。完整映射见 `references/native-steps.md`。关键规则：
   - Docker 构建/推送 → 使用 `BuildAndPushDockerRegistry` / `BuildAndPushECR` / `BuildAndPushGCR` / `BuildAndPushACR`（绝不使用 `Run: docker build && docker push`）
   - K8s 部署 → 使用 `K8sRollingDeploy` / `K8sBlueGreenDeploy` / `K8sCanaryDeploy`（绝不使用 `Run: kubectl apply`）
   - Helm 部署 → 使用 `HelmDeploy`（绝不使用 `Run: helm upgrade --install`）
   - ECS 部署 → 使用 `EcsRollingDeploy`（绝不使用 `Run: aws ecs update-service`）
   - Terraform → 使用 `TerraformPlan` / `TerraformApply`（绝不使用 `Run: terraform apply`）
   - 安全扫描 → 使用原生 STO 步骤（`AquaTrivy`、`Snyk`、`Sonarqube`、`Semgrep` 等）
   - 上传 → 使用 `S3Upload` / `GCSUpload`（绝不使用 `Run: aws s3 cp`）
   - 审批 → 使用 `HarnessApproval` / `JiraApproval`（绝不使用轮询脚本）
   - 工单 → 使用 `JiraCreate` / `ServiceNowCreate`（绝不使用 `Run: curl`）
   - 仅对没有原生等价的自定义构建/测试/lint 命令使用 `Run` 步骤
   - **测试步骤：** 任何运行单元或集成测试的 Run 步骤都必须包含 `reports` 块（例如 `type: JUnit`、`spec.paths`），以便 Harness 能捕获结果；框架 → 报告路径见 `references/codebase-analysis.md`。
4. **生成有效 YAML**，遵循下面的结构，使用检测到的构建/测试/部署命令。**校验规则：** (a) 阶段名称必须匹配 `^[a-zA-Z_0-9-.][-0-9a-zA-Z_\\s.]{0,127}$`——仅使用字母、数字、空格、连字符、下划线或句点（不含逗号）。(b) 每个 CI 和 CD 阶段都必须包含 `failureStrategies` 数组（Approval 阶段不需要）。CI 使用 `MarkAsFailure`（绝不用 `Ignore`——它会隐藏失败）；CD 使用 `StageRollback`。
5. **可选地通过 MCP 创建**——先核实项目存在（见下面的 "通过 MCP 创建" 部分），然后使用 `harness_create`，resource_type 为 `pipeline`，`body: { yamlPipeline: "<YAML string>" }`

## 流水线结构

```yaml
pipeline:
  identifier: my_pipeline       # ^[a-zA-Z_][0-9a-zA-Z_]{0,127}$
  name: My Pipeline
  orgIdentifier: default
  projectIdentifier: my_project
  tags: {}
  properties:
    ci:
      codebase:                  # Required for CI stages
        connectorRef: github_connector
        repoName: my-repo
        build:
          type: branch
          spec:
            branch: <+trigger.branch>
  stages:
    - stage: ...
```

## 阶段类型

### CI 阶段（type: CI）

```yaml
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
        type: Cloud    # Cloud, Kubernetes, VM, Docker
        spec: {}
      execution:
        steps:
          - step: ...
    failureStrategies:
      - onFailure:
          errors: [AllErrors]
          action:
            type: MarkAsFailure
```

### CD 阶段（type: Deployment）

```yaml
- stage:
    identifier: deploy
    name: Deploy
    type: Deployment
    spec:
      deploymentType: Kubernetes  # Kubernetes, NativeHelm, ECS, ServerlessAwsLambda, Ssh, WinRm, AzureWebApp
      service:
        serviceRef: my_service
      environment:
        environmentRef: dev
        infrastructureDefinitions:
          - identifier: k8s_dev
      execution:
        steps:
          - step: ...
        rollbackSteps:
          - step: ...
    failureStrategies:
      - onFailure:
          errors: [AllErrors]
          action:
            type: StageRollback
```

### Approval 阶段（type: Approval）

`HarnessApproval` 需要 `approvers.disallowPipelineExecutor`（API 要求）。将其设为 `true`，使流水线执行者无法批准自己的运行；省略它 API 会返回 "disallowPipelineExecutor: is missing but it is required"。

```yaml
- stage:
    identifier: approval
    name: Approval
    type: Approval
    spec:
      execution:
        steps:
          - step:
              identifier: approve
              name: Approve
              type: HarnessApproval
              spec:
                approvalMessage: "Please review and approve"
                approvers:
                  userGroups: [prod_approvers]
                  minimumCount: 1
                  disallowPipelineExecutor: true
                includePipelineExecutionHistory: true
              timeout: 1d
    failureStrategies:
      - onFailure:
          errors: [AllErrors]
          action:
            type: Abort
```

## 常见步骤类型

### Run 步骤

```yaml
- step:
    identifier: run_tests
    name: Run Tests
    type: Run
    spec:
      shell: Bash          # Sh, Bash, Powershell, Pwsh, Python
      command: |
        npm ci
        npm test
      envVariables:
        NODE_ENV: test
      reports:
        type: JUnit
        spec:
          paths: ["junit.xml"]
```

### 构建并推送 Docker
```yaml
- step:
    identifier: docker_push
    name: Build and Push
    type: BuildAndPushDockerRegistry
    spec:
      connectorRef: dockerhub
      repo: myorg/myimage
      tags: [latest, <+pipeline.sequenceId>]
      dockerfile: Dockerfile
```

### K8s 滚动部署
```yaml
- step:
    identifier: rollout
    name: Rollout
    type: K8sRollingDeploy
    spec:
      skipDryRun: false
    timeout: 10m
```

### K8s 滚动回滚
```yaml
- step:
    identifier: rollback
    name: Rollback
    type: K8sRollingRollback
    spec: {}
    timeout: 10m
```

有关 300+ 原生步骤类型的完整目录（云部署、安全扫描器、IaC、工单、审批、GitOps 等），请参阅 `references/native-steps.md`。使用 `Run` 步骤之前始终检查此参考。

## 变量和表达式

```yaml
pipeline:
  variables:
    - name: env
      type: String
      default: dev
    - name: api_key
      type: Secret
      value: <+secrets.getValue("api_key")>
```

常见表达式：
- `<+pipeline.variables.env>`——流水线变量
- `<+stage.variables.VAR>`——阶段变量
- `<+steps.step_id.output.outputVariables.VAR>`——步骤输出
- `<+trigger.branch>`、`<+trigger.commitSha>`——触发器信息
- `<+secrets.getValue("name")>`——密钥引用
- `<+pipeline.sequenceId>`——构建编号

## 并行执行

```yaml
# Parallel steps
- parallel:
    - step: ...
    - step: ...

# Parallel stages
stages:
  - parallel:
      - stage: ...
      - stage: ...
```

## 失败策略

```yaml
failureStrategies:
  - onFailure:
      errors: [AllErrors]     # AllErrors, Timeout, Authentication, Connectivity
      action:
        type: StageRollback   # Ignore, Retry, MarkAsSuccess, Abort, StageRollback, PipelineRollback
```

## 条件执行

```yaml
- stage:
    when:
      pipelineStatus: Success
      condition: <+pipeline.variables.deploy> == "true"
```

## Matrix 策略

**放置：** `strategy` 必须在**阶段级别**，作为 `spec` 的**同级**，而非在 `spec` 内。如果将 `strategy` 放在 `spec` 下，matrix 将不会应用，UI 也不会显示 matrix 迭代。

在步骤中用 `<+stage.matrix.TAG>` 引用 matrix 值（例如 `<+stage.matrix.python_version>`）。使用无连字符的维度名称（例如 `python_version` 而非 `python-version`）。

```yaml
- stage:
    identifier: test_matrix
    name: Test Matrix
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
              type: Run
              spec:
                image: node:<+stage.matrix.node_version>
                command: npm test
    strategy:
      matrix:
        node_version: ["16", "18", "20"]
        os: [linux, macos]
      maxConcurrency: 3
    failureStrategies:
      - onFailure:
          errors: [AllErrors]
          action:
            type: Abort
```

## 通过 MCP 创建

生成 YAML 后，在 Harness 中创建它：

1. **核实项目存在**——用 `harness_list`（resource_type: `project`，org_id）列出项目以确认。如果项目不存在，先用 `harness_create`（resource_type: `project`，body: `{ identifier, name }`）创建，或询问用户。
2. **创建流水线**——使用 `harness_create`，将流水线 YAML 序列化为 body 中的 **`yamlPipeline`** 字符串。不要传递嵌套的 JSON `pipeline` 对象；它会导致序列化错误。

```
Call MCP tool: harness_create
Parameters:
  resource_type: "pipeline"
  org_id: "<organization>"
  project_id: "<project>"
  body: { yamlPipeline: "<full pipeline YAML string, including 'pipeline:' root key>" }
```

**示例 body**（节选）：
```json
{
  "yamlPipeline": "pipeline:\n  identifier: nodejs_ci\n  name: Node.js CI\n  projectIdentifier: my_project\n  orgIdentifier: default\n  stages:\n    - stage:\n        identifier: build\n        ..."
}
```

要更新现有流水线，使用相同的 `yamlPipeline` 格式：

```
Call MCP tool: harness_update
Parameters:
  resource_type: "pipeline"
  resource_id: "<pipeline_identifier>"
  org_id: "<organization>"
  project_id: "<project>"
  body: { yamlPipeline: "<full updated pipeline YAML string>" }
```

要验证它已创建：

```
Call MCP tool: harness_get
Parameters:
  resource_type: "pipeline"
  resource_id: "<pipeline_identifier>"
  org_id: "<organization>"
  project_id: "<project>"
```

## 完整 CI 示例

```yaml
pipeline:
  identifier: nodejs_ci
  name: Node.js CI
  projectIdentifier: my_project
  orgIdentifier: default
  properties:
    ci:
      codebase:
        connectorRef: github_connector
        repoName: my-app
        build:
          type: branch
          spec:
            branch: <+trigger.branch>
  stages:
    - stage:
        identifier: build_and_test
        name: Build and Test
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
                  identifier: install
                  name: Install
                  type: Run
                  spec:
                    shell: Bash
                    command: npm ci
              - parallel:
                  - step:
                      identifier: lint
                      name: Lint
                      type: Run
                      spec:
                        shell: Bash
                        command: npm run lint
                  - step:
                      identifier: test
                      name: Test
                      type: Run
                      spec:
                        shell: Bash
                        command: npm test
                        reports:
                          type: JUnit
                          spec:
                            paths: ["junit.xml"]
              - step:
                  identifier: docker_push
                  name: Build and Push
                  type: BuildAndPushDockerRegistry
                  spec:
                    connectorRef: dockerhub
                    repo: myorg/my-app
                    tags: [<+pipeline.sequenceId>, latest]
        failureStrategies:
          - onFailure:
              errors: [AllErrors]
              action:
                type: MarkAsFailure
```

## 完整 CD 示例

```yaml
pipeline:
  identifier: k8s_deploy
  name: K8s Deploy
  projectIdentifier: my_project
  orgIdentifier: default
  stages:
    - stage:
        identifier: deploy_staging
        name: Deploy Staging
        type: Deployment
        spec:
          deploymentType: Kubernetes
          service:
            serviceRef: my_service
          environment:
            environmentRef: staging
            infrastructureDefinitions:
              - identifier: k8s_staging
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
    - stage:
        identifier: approval
        name: Production Approval
        type: Approval
        spec:
          execution:
            steps:
              - step:
                  identifier: approve
                  name: Approve Prod
                  type: HarnessApproval
                  spec:
                    approvalMessage: "Approve production deployment?"
                    approvers:
                      userGroups: [prod_approvers]
                      minimumCount: 1
                      disallowPipelineExecutor: true
                    includePipelineExecutionHistory: true
                  timeout: 1d
        failureStrategies:
          - onFailure:
              errors: [AllErrors]
              action:
                type: Abort
    - stage:
        identifier: deploy_prod
        name: Deploy Production
        type: Deployment
        spec:
          deploymentType: Kubernetes
          service:
            serviceRef: my_service
          environment:
            environmentRef: prod
            infrastructureDefinitions:
              - identifier: k8s_prod
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

## 示例

### 创建 CI 流水线

```
/create-pipeline
Create a CI pipeline for a Node.js app that builds, runs tests, and pushes to Docker Hub
```

### 创建带审批的 CD 流水线

```
/create-pipeline
Create a Kubernetes deployment pipeline with staging, manual approval, and production stages
```

### 创建组合 CI/CD 流水线

```
/create-pipeline
Build a pipeline that runs tests, pushes a Docker image, and deploys to ECS with rollback
```

### 创建 matrix 构建流水线

```
/create-pipeline
Create a CI pipeline that tests across Node 16, 18, and 20 on both Linux and macOS
```

### 创建带并行阶段的流水线

```
/create-pipeline
Create a pipeline with parallel test stages for unit tests, integration tests, and linting
```

## 性能注意事项

- 使用 Run 步骤之前始终检查 `references/native-steps.md`。原生步骤提供更好的错误处理和 UI 集成。
- 创建流水线之前核实目标项目存在（`harness_list`，resource_type: `project`）。
- 创建流水线之前校验所有被引用的连接器、服务和环境存在。
- 对于 CD 流水线，确认部署类型与服务定义类型匹配。
- 生成 YAML 的质量比速度更重要。提交之前核实结构。

## 故障排查

### YAML 校验错误
- **流水线/步骤标识符：** 必须匹配 `^[a-zA-Z_][0-9a-zA-Z_]{0,127}$`（仅字母、数字、下划线）。
- **阶段名称：** 必须匹配 `^[a-zA-Z_0-9-.][-0-9a-zA-Z_\\s.]{0,127}$`——不含逗号；使用字母、数字、空格、连字符、下划线或句点（例如使用 "Build Test and Push" 而非 "Build, Test and Push"）。
- **每个 CI 和 CD 阶段**都必须包含 `failureStrategies` 数组（Approval 阶段不需要）；省略它 API 会返回 "failureStrategies: is missing but it is required"。CI 使用 `type: MarkAsFailure`；CD 使用 `type: StageRollback`。
- 阶段类型区分大小写：`CI`、`Deployment`、`Approval`、`Custom`
- 每个阶段都必须有 `spec` 字段
- **Matrix 未应用 / UI 中不可见：** `strategy` 必须是阶段上 `spec` 的同级，而非在 `spec` 内。在阶段级别使用 `strategy.matrix`，并以 `<+stage.matrix.TAG>` 引用值。
- **HarnessApproval：** "disallowPipelineExecutor: is missing but it is required"——向步骤 spec 添加 `approvers.disallowPipelineExecutor: true`。

### MCP 创建错误
- **Project not found**——用 `harness_list`（resource_type: `project`，org_id）核实项目存在。先用 `harness_create`（resource_type: `project`，body: `{ identifier, name }`）创建，或确认 org_id/project_id 正确。
- **Missing required fields for pipeline: pipeline**——将 body 作为 `{ yamlPipeline: "<full pipeline YAML string>" }` 传递，而非嵌套 JSON `pipeline` 对象。嵌套 JSON 会导致序列化错误。
- `DUPLICATE_IDENTIFIER`——流水线已存在；改用 `harness_update`
- `CONNECTOR_NOT_FOUND`——先创建连接器或修正 connectorRef
- `ACCESS_DENIED`——检查 API 密钥权限

### 含糊或不完整的请求
- **"Deploys to ECS" / "K8s deploy" / "push to registry" 但无具体信息**——在生成 YAML 之前向用户询问 region、账户 ID、集群名称/ID，以及哪个镜像仓库（ECR、Docker Hub 等）。不要插入占位值（例如 `us-east-1`、`123456789012`）。

### 执行失败
- 缺少 `<+input>` 值——通过输入集或运行时输入提供
- 连接器认证过期——用 `harness_execute`（resource_type: "connector"，action: "test_connection"）测试
- Delegate 离线——用 `harness_status` 检查
