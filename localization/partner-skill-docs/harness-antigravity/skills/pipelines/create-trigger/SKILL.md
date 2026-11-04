---
name: create-trigger
description: 为自动化流水线执行生成 Harness 触发器 YAML 并通过 MCP 创建。当用户说 "create trigger"、"webhook trigger"、"cron trigger"、"scheduled build"、"artifact trigger"，或希望流水线自动运行时使用。
metadata:
  author: Harness
  version: 2.0.0
  mcp-server: harness-mcp-v2
  summary: Create webhook, scheduled, and artifact triggers
license: Apache-2.0
compatibility: Requires Harness MCP v2 server (harness-mcp-v2)
---

# 创建触发器

生成 Harness 触发器 YAML 并通过 MCP 推送到 Harness。

## 说明

1. **确定触发器类型**——Webhook（Git 事件）、Scheduled（cron）、Artifact（镜像仓库更新）或 Manifest（Helm chart 更新）
2. **配置条件**——分支过滤器、负载条件、cron 表达式或制品路径
3. **生成 YAML**，使用下面的模板，引用目标流水线
4. **通过 MCP 创建**，使用 `harness_create`，resource_type 为 `trigger`
5. **验证 webhook 注册**——对于 webhook 触发器，确认 webhook 已在 Git 提供方中注册

## 触发器类型

- **Webhook**——GitHub、GitLab、Bitbucket、Azure Repos、Custom
- **Scheduled**——基于 Cron 的调度
- **Artifact**——Docker Hub、ECR、GCR、ACR、Nexus
- **Manifest**——Helm chart 更新

## Webhook 触发器（GitHub）

```yaml
trigger:
  name: PR Trigger
  identifier: pr_trigger
  orgIdentifier: default
  projectIdentifier: my_project
  pipelineIdentifier: ci_pipeline
  source:
    type: Webhook
    spec:
      type: Github
      spec:
        type: PullRequest
        spec:
          connectorRef: github_connector
          autoAbortPreviousExecutions: true
          payloadConditions:
            - key: targetBranch
              operator: Equals
              value: main
          headerConditions: []
          jexlCondition: ""
          actions:
            - Open
            - Reopen
            - Synchronize
  inputYaml: |
    pipeline:
      identifier: ci_pipeline
      properties:
        ci:
          codebase:
            build:
              type: PR
              spec:
                number: <+trigger.prNumber>
```

### GitHub 事件类型
- `Push`——代码推送到分支
- `PullRequest`——PR 事件（Open、Close、Reopen、Synchronize、Edit）
- `IssueComment`——PR 评论（Create、Edit、Delete）
- `Release`——发布事件（Create、Publish、Edit）

## Webhook 触发器（GitLab）

```yaml
trigger:
  name: GitLab Push
  identifier: gitlab_push
  pipelineIdentifier: ci_pipeline
  source:
    type: Webhook
    spec:
      type: Gitlab
      spec:
        type: Push
        spec:
          connectorRef: gitlab_connector
          payloadConditions:
            - key: ref
              operator: Contains
              value: main
```

## 定时（Cron）触发器

```yaml
trigger:
  name: Nightly Build
  identifier: nightly_build
  orgIdentifier: default
  projectIdentifier: my_project
  pipelineIdentifier: ci_pipeline
  source:
    type: Scheduled
    spec:
      type: Cron
      spec:
        expression: "0 2 * * *"    # 2 AM daily
  inputYaml: |
    pipeline:
      identifier: ci_pipeline
      properties:
        ci:
          codebase:
            build:
              type: branch
              spec:
                branch: main
```

Cron 格式：`<minute> <hour> <day-of-month> <month> <day-of-week>`

## 制品触发器（Docker 镜像仓库）

```yaml
trigger:
  name: New Image Trigger
  identifier: new_image
  pipelineIdentifier: deploy_pipeline
  source:
    type: Artifact
    spec:
      type: DockerRegistry
      spec:
        connectorRef: dockerhub
        imagePath: myorg/myimage
        tag: <+trigger.artifact.build>
  inputYaml: |
    pipeline:
      identifier: deploy_pipeline
      stages:
        - stage:
            identifier: deploy
            spec:
              service:
                serviceRef: my_service
```

### 制品源类型
- `DockerRegistry`——Docker Hub
- `Ecr`——AWS ECR
- `Gcr`——Google Container Registry
- `Acr`——Azure Container Registry
- `Nexus3Registry`——Nexus
- `AmazonS3`——S3 制品

## 通过 MCP 创建

```
Call MCP tool: harness_create
Parameters:
  resource_type: "trigger"
  org_id: "<organization>"
  project_id: "<project>"
  body: <trigger YAML>
```

要列出现有触发器：

```
Call MCP tool: harness_list
Parameters:
  resource_type: "trigger"
  org_id: "<organization>"
  project_id: "<project>"
```

## 负载条件

按 webhook 负载过滤触发器：

```yaml
payloadConditions:
  - key: targetBranch
    operator: Equals        # Equals, NotEquals, In, NotIn, StartsWith, EndsWith, Contains, Regex
    value: main
  - key: sourceBranch
    operator: StartsWith
    value: feature/
```

常见键：`sourceBranch`、`targetBranch`、`ref`、`action`、`tag`

## 示例

- “为 CI 创建 GitHub PR 触发器”——带 PullRequest 类型的 Webhook 触发器
- “设置凌晨 2 点的夜间构建”——带 cron 的 Scheduled 触发器
- “推送新 Docker 镜像时触发部署”——带 DockerRegistry 的 Artifact 触发器
- “为标签创建发布触发器”——带 Push 类型、标签过滤的 Webhook

## 性能注意事项

- 核实负载条件与 Git 提供方的实际 webhook 负载匹配。
- 对于 cron 触发器，仔细检查表达式——cron 使用 UTC 时区。
- 确认目标流水线标识符和 inputYaml 与流水线的预期输入匹配。

## 故障排查

### 触发器未触发
- 核实 webhook 已在 Git 提供方中注册
- 检查负载条件与实际负载匹配
- 确保连接器具有正确权限
- 对触发器使用 `harness_get` 测试以验证配置

### 重复执行
- 为 PR 触发器启用 `autoAbortPreviousExecutions`
- 检查重叠的触发器条件

### Cron 未运行
- 核实 cron 表达式语法（5 个字段，UTC 时区）
- 检查流水线标识符正确
- 确保触发器已启用
