---
name: create-service
description: >-
  为可部署工作负载生成 Harness 服务 YAML 并通过 MCP 创建。支持 Kubernetes、Helm、
  ECS、Serverless、SSH 和 WinRm 部署类型，制品源来自 Docker Hub、ECR、GCR、ACR、
  Nexus 和 S3。在要求创建服务、定义 Kubernetes 服务、设置 Helm chart
  部署、配置 ECS 服务或定义要部署的内容时使用。触发短语：创建服务、
  服务定义、Kubernetes 服务、Helm 服务、ECS 服务、部署服务、制品源。
metadata:
  author: Harness
  version: 2.0.1
  mcp-server: harness-mcp-v2
  summary: Define services (Kubernetes, Helm, ECS) with artifact sources
license: Apache-2.0
compatibility: Requires Harness MCP v2 server (harness-mcp-v2)
---

# 创建服务

生成 Harness 服务 YAML 并通过 MCP 推送到 Harness。

## 说明

1. **从代码库检测服务类型**（如果源代码可用）——扫描项目中的部署清单以自动选择正确的 `serviceDefinition.type` 和清单配置：
   - 带 YAML 文件的 `k8s/`、`kubernetes/`、`manifests/` → 使用 `K8sManifest` 的 `Kubernetes`
   - `kustomization.yaml` → 使用 `Kustomize` 的 `Kubernetes`
   - `Chart.yaml`、`charts/`、`helm/` → 使用 `HelmChart` 的 `NativeHelm`
   - `task-definition.json` → 使用 `EcsTaskDefinition` 的 `ECS`
   - `serverless.yml` / `template.yaml`（SAM）→ `ServerlessAwsLambda`
   - `function.json`（Azure）→ `AzureWebApp`
   - `.NET` + Windows → `WinRm`
   - 无容器的传统应用（JAR/WAR）→ `Ssh`
   - 完整的决策树见 [codebase-analysis.md](../../pipelines/create-pipeline/references/codebase-analysis.md) 第 4 步
2. **检测制品源**——将 Dockerfile 中的镜像仓库引用匹配到制品源类型：
   - Docker Hub → `DockerRegistry`
   - `*.dkr.ecr.*.amazonaws.com` → `Ecr`
   - `gcr.io` / `*-docker.pkg.dev` → `Gcr`
   - `*.azurecr.io` → `Acr`
3. **与用户确认**——展示检测到的服务类型、清单类型和制品源以供确认
4. **生成 YAML**，遵循下面的结构
5. **通过 MCP 创建**，使用 `harness_create`，resource_type 为 `service`

## 服务结构

```yaml
service:
  name: My Service
  identifier: my_service
  orgIdentifier: default
  projectIdentifier: my_project
  serviceDefinition:
    type: Kubernetes        # Kubernetes, NativeHelm, ECS, ServerlessAwsLambda, Ssh, WinRm, AzureWebApp, AzureFunction, CustomDeployment
    spec:
      artifacts:
        primary:
          primaryArtifactRef: docker_image
          sources:
            - identifier: docker_image
              type: DockerRegistry
              spec:
                connectorRef: dockerhub
                imagePath: myorg/myimage
                tag: <+input>
      manifests:
        - manifest:
            identifier: k8s_manifest
            type: K8sManifest
            spec:
              store:
                type: Github
                spec:
                  connectorRef: github_connector
                  repoName: my-manifests
                  branch: main
                  paths: [manifests/]
      variables:
        - name: replicas
          type: String
          value: "3"
```

## 部署类型

### Kubernetes 服务
```yaml
serviceDefinition:
  type: Kubernetes
  spec:
    artifacts:
      primary:
        primaryArtifactRef: main_image
        sources:
          - identifier: main_image
            type: DockerRegistry
            spec:
              connectorRef: dockerhub
              imagePath: myorg/api
              tag: <+input>
    manifests:
      - manifest:
          identifier: manifests
          type: K8sManifest
          spec:
            store:
              type: Github
              spec:
                connectorRef: github
                repoName: k8s-manifests
                branch: main
                paths: [deploy/]
```

### Helm 服务
```yaml
serviceDefinition:
  type: NativeHelm
  spec:
    artifacts:
      primary:
        primaryArtifactRef: chart
        sources:
          - identifier: chart
            type: DockerRegistry
            spec:
              connectorRef: dockerhub
              imagePath: myorg/api
              tag: <+input>
    manifests:
      - manifest:
          identifier: helm_chart
          type: HelmChart
          spec:
            store:
              type: Http
              spec:
                connectorRef: helm_repo
            chartName: my-chart
            chartVersion: <+input>
            helmVersion: V3
```

### Kustomize 服务
```yaml
serviceDefinition:
  type: Kubernetes
  spec:
    artifacts:
      primary:
        primaryArtifactRef: main_image
        sources:
          - identifier: main_image
            type: DockerRegistry
            spec:
              connectorRef: dockerhub
              imagePath: myorg/api
              tag: <+input>
    manifests:
      - manifest:
          identifier: kustomize
          type: Kustomize
          spec:
            store:
              type: Github
              spec:
                connectorRef: github
                repoName: k8s-config
                branch: main
                folderPath: overlays/production
            pluginPath: ""
```

### ECS 服务
```yaml
serviceDefinition:
  type: ECS
  spec:
    artifacts:
      primary:
        primaryArtifactRef: ecr_image
        sources:
          - identifier: ecr_image
            type: Ecr
            spec:
              connectorRef: aws_connector
              region: us-east-1
              imagePath: my-image
              tag: <+input>
    manifests:
      - manifest:
          identifier: task_def
          type: EcsTaskDefinition
          spec:
            store:
              type: Github
              spec:
                connectorRef: github
                repoName: ecs-config
                branch: main
                paths: [task-definition.json]
```

### Serverless Lambda 服务
```yaml
serviceDefinition:
  type: ServerlessAwsLambda
  spec:
    artifacts:
      primary:
        primaryArtifactRef: s3_artifact
        sources:
          - identifier: s3_artifact
            type: AmazonS3
            spec:
              connectorRef: aws_connector
              region: us-east-1
              bucketName: my-deployments
              filePath: serverless-app.zip
    manifests:
      - manifest:
          identifier: serverless_manifest
          type: ServerlessAwsLambda
          spec:
            store:
              type: Github
              spec:
                connectorRef: github
                repoName: serverless-config
                branch: main
                paths: [serverless.yml]
```

## 制品源类型

- `DockerRegistry`——Docker Hub（connectorRef、imagePath、tag）
- `Ecr`——AWS ECR（connectorRef、region、imagePath、tag）
- `Gcr`——Google GCR（connectorRef、registryHostname、imagePath、tag）
- `GoogleArtifactRegistry`——Google Artifact Registry（connectorRef、region、repositoryName、package、version）
- `Acr`——Azure ACR（connectorRef、subscriptionId、registry、repository、tag）
- `ArtifactoryRegistry`——JFrog Artifactory（connectorRef、repository、artifactPath、repositoryFormat、tag）
- `Nexus3Registry`——Nexus（connectorRef、repository、artifactPath、repositoryFormat、tag）
- `GithubPackageRegistry`——GitHub Packages（connectorRef、packageType、org、packageName、version）
- `AmazonS3`——S3（connectorRef、region、bucketName、filePath）
- `GoogleCloudStorage`——GCS（connectorRef、project、bucket、artifactPath）
- `CustomArtifact`——自定义源（scripts、delegateSelectors、version）

## 通过 MCP 创建

```
Call MCP tool: harness_create
Parameters:
  resource_type: "service"
  org_id: "<organization>"
  project_id: "<project>"
  body: <service YAML>
```

列出现有服务：
```
Call MCP tool: harness_list
Parameters:
  resource_type: "service"
  org_id: "<organization>"
  project_id: "<project>"
```

## 示例

- “创建带 Docker Hub 制品的 K8s 服务”——使用 DockerRegistry 源的 Kubernetes 类型
- “创建 Helm 服务”——带 HelmChart 清单的 NativeHelm 类型
- “创建带 ECR 的 ECS 服务”——使用 Ecr 制品源的 ECS 类型

## 性能注意事项

- 创建服务定义之前，核实被引用的连接器存在。
- 确保部署类型与流水线中将使用的基础设施类型匹配。
- 对于制品源，确认镜像路径和镜像仓库可访问。
- 服务配置的质量比速度更重要。

## 故障排查

- `CONNECTOR_NOT_FOUND`——先创建连接器或修正 connectorRef
- `DUPLICATE_IDENTIFIER`——服务已存在；使用 `harness_update`
- 制品标签 `<+input>` 表示标签在运行时提供
