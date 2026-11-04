---
name: create-pipeline-v1
description: >-
  使用新的简洁语法生成 Harness v1 简化流水线 YAML，采用扁平结构、${{ }}
  表达式、script 字段和 action 步骤。支持 CI 阶段（run、run-test、background）、CD 阶段
  （带 K8s、Helm、ECS action 步骤的 service/environment）、审批（阶段级和内联）、并行
  执行、matrix/for/while 策略、缓存、卷和模板。在要求 v1 流水线、
  简化流水线、新流水线格式，或用户明确要求 v1 语法时使用。不要用于
  v0/标准流水线（请使用 create-pipeline）。触发短语：v1 流水线、简化流水线、新
  流水线格式、创建 v1、现代流水线语法。
metadata:
  author: Harness
  version: 3.1.0
  mcp-server: harness-mcp-v2
  summary: Generate v1 simplified pipeline YAML
license: Apache-2.0
compatibility: Requires Harness MCP v2 server (harness-mcp-v2)
---

# 创建流水线 v1

生成 Harness v1 简化流水线 YAML，并可选地通过 MCP 推送到 Harness。

**Alpha：此技能目前仅限内部测试。**

## 说明

1. **确认 v1 格式**——用户必须明确想要 v1 语法。不明确时默认 v0（`/create-pipeline`）。
2. **澄清需求**——流水线类型（CI、CD 或两者）、语言/框架、部署目标
3. **查阅规范参考**——使用 `references/v1-spec-schema.md` 获取完整的 v1 schema、步骤类型、action 目录和示例
4. **选择原生 action**——始终优先使用原生 action 和模板步骤而非 `run:` 步骤。完整映射见 `references/native-actions.md`。关键规则：
   - Docker 构建/推送 → 使用 `template: uses: buildAndPushToDocker` / `buildAndPushToECR` / `buildAndPushToGAR`（绝不使用 `run: docker build && docker push`）
   - K8s 部署 → 使用 `action: uses: kubernetes-rolling-deploy` 或 `template: uses: k8sRollingDeployStep`（绝不使用 `run: kubectl apply`）
   - Helm 部署 → 使用 `action: uses: helm-deploy` 或 `template: uses: helmDeployBasicStep`（绝不使用 `run: helm upgrade --install`）
   - ECS 部署 → 使用 `template: uses: ecsBluegreenDeployStep`（绝不使用 `run: aws ecs update-service`）
   - Terraform → 使用 `template: uses: terraformStep`（绝不使用 `run: terraform apply`）
   - 安全扫描 → 使用原生 STO 模板（`gitleaksStep`、`banditStep`、`sbomOrchestrationStep`）
   - 上传 → 使用 `template: uses: uploadArtifactsToS3` / `uploadArtifactsToGCS`（绝不使用 `run: aws s3 cp`）
   - 审批 → 使用 `approval: uses: harness` 或 `approval: uses: jira`（绝不使用轮询脚本）
   - 工单 → 使用 `action: uses: jira-create` / `snow-create`（绝不使用 `run: curl`）
   - HTTP 请求 → 使用 `action: uses: http` 或 `template: uses: httpStep`（绝不使用 `run: curl`）
   - 仅对没有原生等价的自定义构建/测试/lint 命令使用 `run:` 步骤
5. **生成 v1 YAML**，使用扁平结构、`${{ }}` 表达式、run 步骤的 `script` 字段，以及部署的 `action`/`template` 步骤
6. **可选地通过 MCP 创建**，使用 `harness_create`，resource_type 为 `pipeline`

## v1 与 v0 的主要差异

| v0 语法 | v1 语法 |
|-----------|-----------|
| `<+variable>` 表达式 | `${{ variable }}` 表达式 |
| `type: CI` / `type: Deployment` 阶段类型 | 扁平阶段——无 `type` 字段 |
| Run 步骤中的 `command:` 字段 | `run:` 步骤中的 `script:` 字段 |
| 原生步骤（`K8sRollingDeploy`、`HelmDeploy`） | Action 步骤（`action: uses: kubernetes-rolling-deploy`） |
| `failureStrategies:` | `on-failure:` |
| `HarnessApproval` 步骤类型 | `approval: uses: harness`（阶段级或内联） |
| 深层嵌套（`spec: execution: steps:`） | 扁平结构（`steps:`） |
| 阶段 `spec` 下的 `strategy: matrix:` | 直接位于阶段或步骤上的 `strategy: matrix:` |

## 流水线结构

```yaml
pipeline:
  name: My Pipeline
  repo:                          # optional: repository config
    connector: account.github
    name: myorg/my-repo
  clone:                         # optional: clone config
    depth: 1
  on:                            # optional: event triggers
  - push:
      branches: [main]
  env:                           # optional: global env vars
    NODE_ENV: production
  inputs:                        # optional: pipeline inputs
    branch:
      type: string
      default: main
  stages:
  - name: build
    steps:
    - run:
        script: go build
```

没有 `version:`、`kind:` 或 `spec:` 包装——`pipeline:` 是根键。

## 阶段

阶段没有 `type` 字段。其用途由其键决定。

### CI 阶段

```yaml
- name: build
  runtime: cloud
  platform:
    os: linux
    arch: arm
  cache:
    path: node_modules
    key: npm.${{ branch }}
  steps:
  - run:
      script: npm ci
```

### 部署阶段

```yaml
- name: deploy
  service: my-service
  environment: staging
  steps:
  - action:
      uses: kubernetes-rolling-deploy
      with:
        dry-run: false
```

### 审批（阶段级）

```yaml
- approval:
    uses: harness
    with:
      timeout: 30m
      message: "Approve deployment?"
      groups: [admins, ops]
      min-approvers: 1
```

## 步骤类型

### Run 步骤

使用 `script:` 字段（而非 `command:` 或 `run:`）。

```yaml
# long syntax
- run:
    script: npm test

# short syntax
- run: npm test

# with container
- run:
    container: node:18
    script: npm test

# with shell and env
- run:
    shell: bash
    script: |
      npm ci
      npm test
    env:
      NODE_ENV: test

# with output variables
- id: build
  run:
    script: echo "TAG=v1" >> $HARNESS_OUTPUT
    output: [TAG]
```

### Run Test 步骤

```yaml
- run-test:
    container: maven
    script: mvn test
    report:
      type: junit
      path: target/surefire-reports/*.xml
    splitting:
      concurrency: 4
```

### Action 步骤

Action 替代 v0 原生步骤。完整 action 目录见 `references/v1-spec-schema.md`。

```yaml
# Kubernetes deploy
- action:
    uses: kubernetes-rolling-deploy
    with:
      dry-run: false

# Helm deploy
- action:
    uses: helm-deploy
    with:
      timeout: 10m

# Terraform plan
- action:
    uses: terraform-plan
    with:
      command: apply
      aws-provider: account.aws_connector

# HTTP request
- action:
    uses: http
    with:
      method: GET
      endpoint: https://acme.com
```

### Background 步骤

```yaml
- background:
    container: redis
- run:
    script: npm test
```

### 模板步骤

```yaml
- template:
    uses: account.docker@1.0.0
    with:
      push: true
      tags: latest
```

### 审批步骤（内联）

```yaml
- approval:
    uses: jira
    with:
      connector: account.jira
      project: PROJ
```

## 并行与分组

```yaml
# parallel steps
- parallel:
    steps:
    - run:
        script: npm run lint
    - run:
        script: npm test

# parallel stages
- parallel:
    stages:
    - steps:
      - run: go test
    - steps:
      - run: npm test

# step group
- group:
    steps:
    - run:
        script: go build
    - run:
        script: go test
```

## 策略

```yaml
# matrix (stage-level)
- strategy:
    matrix:
      node: [16, 18, 20]
      os: [linux, macos]
    max-parallel: 3
  steps:
  - run:
      container: node:${{ matrix.node }}
      script: npm test

# matrix (step-level)
- strategy:
    matrix:
      go: [1.19, 1.20, 1.21]
  run:
    container: golang:${{ matrix.go }}
    script: go test
```

## 失败策略

```yaml
# step-level
- run:
    script: go test
  on-failure:
    errors: all
    action: ignore       # abort, ignore, retry, fail, success

# retry with attempts
- run:
    script: go test
  on-failure:
    errors: [unknown]
    action:
      retry:
        attempts: 5
        interval: 10s
        failure-action: fail

# stage-level
- steps:
  - run:
      script: go test
  on-failure:
    errors: all
    action: abort
```

## 条件执行

```yaml
# stage conditional
- if: ${{ branch == "main" }}
  steps:
  - run:
      script: deploy.sh

# step conditional
- if: ${{ branch == "main" }}
  run:
    script: deploy.sh
```

## 完整 CI 示例

```yaml
pipeline:
  repo:
    connector: account.github
    name: myorg/my-app
  clone:
    depth: 1
  on:
  - push:
      branches: [main]
  - pull_request:
      branches: [main]
  stages:
  - name: build-and-test
    runtime: cloud
    platform:
      os: linux
      arch: arm
    cache:
      path: node_modules
      key: npm.${{ branch }}
    steps:
    - run:
        script: npm ci
    - parallel:
        steps:
        - run:
            script: npm run lint
        - run-test:
            script: npm test
            report:
              type: junit
              path: junit.xml
    - action:
        uses: docker-build-push
        with:
          connector: dockerhub
          repo: myorg/my-app
          tags: [${{ pipeline.sequenceId }}, latest]
```

## 完整 CD 示例

```yaml
pipeline:
  inputs:
    skip_dry_run:
      type: boolean
      default: false
  stages:
  - name: deploy-staging
    service: petstore
    environment: staging
    steps:
    - action:
        uses: manifest-download
    - action:
        uses: manifest-bake
    - action:
        uses: kubernetes-rolling-deploy
        with:
          dry-run: ${{ inputs.skip_dry_run }}
  - approval:
      uses: harness
      with:
        timeout: 1d
        message: "Approve production deployment?"
        groups: [prod-approvers]
        min-approvers: 1
  - name: deploy-prod
    service: petstore
    environment: prod
    steps:
    - action:
        uses: manifest-download
    - action:
        uses: manifest-bake
    - action:
        uses: kubernetes-rolling-deploy
        with:
          dry-run: false
```

## 通过 MCP 创建

1. **核实项目存在**——用 `harness_list`（resource_type: `project`，org_id）列出项目以确认。如果项目不存在，先用 `harness_create`（resource_type: `project`，body: `{ identifier, name }`）创建，或询问用户。
2. **创建流水线**——使用 `harness_create`，将 v1 流水线 YAML 序列化为 body 中的 **`yamlPipeline`** 字符串。不要传递嵌套的 JSON `pipeline` 对象；它会导致序列化错误。

```
Call MCP tool: harness_create
Parameters:
  resource_type: "pipeline"
  org_id: "<organization>"
  project_id: "<project>"
  body: { yamlPipeline: "<full v1 pipeline YAML string, including 'pipeline:' root key>" }
```

## 示例

### 创建 v1 CI 流水线

```
/create-pipeline-v1
Create a v1 CI pipeline for a Node.js app with caching, parallel lint and test, and Docker push
```

### 创建 v1 部署流水线

```
/create-pipeline-v1
Create a v1 Kubernetes deployment pipeline with staging approval and production stages
```

### 创建 v1 matrix 构建

```
/create-pipeline-v1
Create a v1 pipeline that tests across Go 1.19, 1.20, and 1.21 using matrix strategy
```

## 性能注意事项

- 使用 `run:` 步骤之前始终检查 `references/native-actions.md`。原生 action 提供更好的错误处理、回滚支持和 UI 集成。
- 生成 YAML 之前始终查阅 `references/v1-spec-schema.md` 以获取完整 v1 规范。
- run 步骤中使用 `script:` 字段，绝不以 `command:` 或 `run:` 作为字段名。
- 部署使用 `action: uses:` 或 `template: uses:`，绝不使用 v0 原生步骤类型如 `K8sRollingDeploy`。
- 不要混合 v0 和 v1 语法。没有 `<+...>` 表达式，阶段上没有 `type:`，没有 `spec:` 包装。
- 呈现之前校验所有表达式使用 `${{ }}` 语法。

## 故障排查

### 常见 v1 语法错误

- 使用 `<+...>` 而非 `${{ ... }}` 表达式
- 在阶段上添加 `type:` 字段（v1 阶段没有类型）
- 以 `command:` 或 `run:` 作为字段名而非 `script:`
- 将流水线包裹在 `version:`、`kind:`、`spec:` 中（v1 使用裸 `pipeline:`）
- 使用 v0 步骤类型（`K8sRollingDeploy`）而非 action（`action: uses: kubernetes-rolling-deploy`）
- 使用 `failureStrategies:` 而非 `on-failure:`

### MCP 错误

- **Project not found**——用 `harness_list`（resource_type: `project`，org_id）核实项目存在。先创建它或确认 org_id/project_id 正确。
- **Missing required fields for pipeline: pipeline**——将 body 作为 `{ yamlPipeline: "<full v1 pipeline YAML string>" }` 传递，而非嵌套 JSON `pipeline` 对象。
- `DUPLICATE_IDENTIFIER`——流水线已存在；使用 `harness_update`
- `INVALID_REQUEST`——检查 YAML 结构与 v1 schema 匹配
