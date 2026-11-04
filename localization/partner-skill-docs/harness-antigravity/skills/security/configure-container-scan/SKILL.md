---
name: configure-container-scan
description: >-
  使用 Harness STO 扫描器向现有 Harness 流水线添加容器镜像扫描步骤。
  支持 Harness SCA（默认）、Aqua Trivy、Grype、Snyk、Prisma Cloud、Anchore、Black Duck 和 Wiz。
  支持 Docker Hub、ECR、GCR 和其他第三方镜像仓库，以及 Harness 和 Local 镜像仓库。
  可将扫描步骤插入现有 CI 阶段，或创建专用的 SecurityTests 阶段。
  在要求添加容器扫描、配置镜像扫描、为 Docker 镜像设置 SCA、扫描容器
  镜像以查漏洞，或向流水线添加容器安全检查时使用。
  触发短语：添加容器扫描、扫描 docker 镜像、配置镜像扫描、设置 SCA、为容器添加漏洞
  扫描、部署前扫描容器、添加 Trivy 扫描、添加 Grype 扫描、添加 Snyk 容器扫描。
metadata:
  author: Harness
  version: 1.0.0
  mcp-server: harness-mcp-v2
  summary: Add container image scanning to pipelines using Harness STO scanners (Trivy, Grype, Snyk, and more)
license: Apache-2.0
compatibility: Requires Harness MCP v2 server (harness-mcp-v2)
---

# 配置容器扫描

使用原生 `HarnessSCA` STO 扫描器向现有 Harness 流水线添加容器镜像扫描步骤。

## 说明

### 步骤 1：确定范围和流水线上下文

如果尚不知道，询问 org、project 和流水线标识符。此技能仅适用于现有流水线。

```
Call MCP tool: harness_get
Parameters:
  resource_type: "pipeline"
  resource_id: "<pipeline_identifier>"
  org_id: "<organization>"
  project_id: "<project>"
```

### 步骤 2：分析流水线结构

解析流水线 YAML 以识别：
- 所有阶段及其类型（`CI`、`SecurityTests`、`Deployment`、`Approval`）
- 是否已存在 `SecurityTests` 阶段
- 每个阶段中的现有步骤

向用户呈现结构：

```
Pipeline: <name>

Stage 1: <stage_name> (type: <stage_type>)
  - Step 1: <step_name> (type: <step_type>)
  ...
```

**询问用户希望在哪里添加扫描器步骤：**

呈现可用的插入点：
- 任何现有 `CI` 阶段（扫描器步骤直接添加到该阶段的 `execution.steps`）
- 任何现有 `SecurityTests` 阶段（扫描器步骤添加到该阶段的 `execution.steps`）
- 新的 `SecurityTests` 阶段（如果没有合适阶段或用户偏好隔离，则追加到流水线）

**建议指导：**
- 添加到现有 `CI` 阶段——更简单，无需额外基础设施，扫描作为构建的一部分运行
- 添加新的 `SecurityTests` 阶段——隔离、独立运行，适用于扫描在其他地方构建或来自镜像仓库的镜像

如果用户未指定，默认添加到现有 `CI` 阶段（如果存在）。

### 步骤 3：推荐扫描器类型

呈现 Harness STO 中支持的可用容器镜像扫描器：

**可用的容器扫描器：**
- **Harness SCA**（默认——Harness 原生容器扫描器，零配置）
- **Aqua Trivy**（开源，广泛的 OS 和库覆盖）
- **Grype**（Anchore 出品，开源，快速且准确）
- **Snyk**（商业，开发者友好，提供修复建议）
- **Prisma Cloud**（商业，企业级运行时 + 镜像扫描）
- **Anchore Enterprise**（商业，基于策略的执行）
- **Black Duck**（商业，许可证合规 + 漏洞）
- **Wiz**（商业，云原生安全）

**默认推荐：** 使用 **Harness SCA**——原生，无需额外凭据，直接与 Harness STO 结果集成。

询问用户偏好哪个扫描器。如果未指定，使用 Harness SCA 作为默认。

**步骤类型映射和扫描器产品认证要求：**

| 扫描器 | `type` 字段 | 需要产品认证？ | 认证字段 |
|---------|-------------|----------------------|-------------|
| Harness SCA | `HarnessSCA` | 否 | — |
| Aqua Trivy | `AquaTrivy` | 否 | — |
| Grype | `Grype` | 否 | — |
| Snyk | `Snyk` | 是 | `access_token`（Snyk API 令牌） |
| Prisma Cloud | `PrismaCloud` | 是 | `access_id`（Access Key）、`access_token`（Secret Key） |
| Anchore Enterprise | `AnchoreEnterprise` | 是 | `access_id`（用户名）、`access_token`（密码/API 密钥） |
| Black Duck | `BlackDuck` | 是 | `access_token`（Hub API 令牌） |
| Wiz | `Wiz` | 是 | `access_id`（Client ID）、`access_token`（Client Secret） |

**如果用户选择商业扫描器（Snyk、Prisma Cloud、Anchore Enterprise、Black Duck、Wiz）：**

1. 告知用户此扫描器需要产品级认证凭据
2. 询问上表所需的密钥引用——这些必须已作为 Harness 密钥存在
3. 将它们格式化为 `<+secrets.getValue("project.<secret_identifier>")>`
4. 这些放入步骤 spec 的 `auth` 块——与镜像仓库镜像凭据分开

给用户的示例提示词：
> "Snyk requires an API token. Please provide the Harness secret identifier for your Snyk API token (e.g., `snyk_api_token`). I'll reference it as `<+secrets.getValue("project.snyk_api_token")>`."

如果密钥尚不存在，建议先通过 `/create-secret` 创建再继续。

### 步骤 4：收集容器镜像详情（Prisma Cloud / Wiz 跳过——它们通过连接器从镜像仓库拉取）

询问用户镜像所在镜像仓库类型，然后收集该类型的字段：

---

**选项 A——Harness 镜像仓库**

镜像存储在 Harness 内部容器镜像仓库中。

| 字段 | 必需 | 描述 |
|-------|----------|-------------|
| Registry | 是 | Harness 镜像仓库连接器引用（例如 `account.account-level-test`） |
| Image Path | 是 | 例如 `harness/todolist-sample`——映射到 YAML 中的 `image_path` |

YAML：
```yaml
      image:
        type: harness
        registry: <harness_registry_connector_ref>
        image_path: <image_path>
```

---

**选项 B——第三方镜像仓库**（Docker Hub、ECR、GCR、ACR、JFrog 等）

| 字段 | 必需 | 描述 |
|-------|----------|-------------|
| Type | 是 | 镜像仓库协议——几乎总是 `docker_v2` |
| Domain | 否 | 默认 `docker.io`。对于 ECR：`123456789.dkr.ecr.us-east-1.amazonaws.com`，对于 GCR：`gcr.io` |
| Name | 是 | 镜像名称，例如 `harness/todolist-sample` 或 `myorg/myapp` |
| Tag / Digest | 是 | 例如 `latest`、`123` 或 `sha256:1234567890abcdef...` |
| Access Id | 否 | 私有镜像仓库用户名/访问密钥的密钥引用，例如 `<+secrets.getValue("project.access_id")>` |
| Access Token | 否 | 私有镜像仓库密码/令牌的密钥引用，例如 `<+secrets.getValue("project.access_token")>` |

YAML：
```yaml
      image:
        type: docker_v2
        domain: <domain>              # omit if Docker Hub (docker.io)
        name: <image_name>
        tag: <tag>
        access_id: <+secrets.getValue("project.access_id")>     # omit if public image
        access_token: <+secrets.getValue("project.access_token")>  # omit if public image
```

---

**选项 C——Local（在此阶段构建的镜像）**

镜像在同一流水线阶段早些时候构建，并在构建节点本地可用。

| 字段 | 必需 | 描述 |
|-------|----------|-------------|
| Name | 是 | 镜像名称，例如 `harness/todolist-sample` |
| Tag / Digest | 是 | 例如 `latest`、`123` 或 `sha256:1234567890abcdef...` |
| Domain | 否 | 默认 `docker.io` |

YAML：
```yaml
      image:
        type: local_image
        name: <image_name>
        tag: <tag>
        domain: <domain>   # omit if not needed
```

---

**默认：** 如果用户未指定，第三方 → Docker Hub（`docker_v2`，domain `docker.io`）配合 `latest` 标签。

### 步骤 4：收集基础设施详情（如需要）

**仅在添加新 `SecurityTests` 阶段时必需。** 如果插入现有 CI 或 SecurityTests 阶段，跳过此步骤——阶段已有基础设施。

如果正在创建新 `SecurityTests` 阶段且尚未定义基础设施，询问：
- **Delegate 连接器**（例如 `account.stoqadelegate`）
- **命名空间**（例如 `harness-delegate`）

### 步骤 5：生成扫描器步骤 YAML

使用步骤 3 扫描器映射中的步骤 `type`。示例如下。

**对于 Harness SCA（默认扫描器）：**

```yaml
- step:
    type: HarnessSCA
    name: Container_Scan
    identifier: Container_Scan
    spec:
      mode: orchestration
      config: default
      target:
        type: container
        detection: auto
      advanced:
        log:
          level: info
      resources:
        limits:
          memory: 2G
          cpu: 1000m
      privileged: true
      image:
        <use the image block from Step 4 based on registry type>
```

使用步骤 4 中生成的 `image` 块（Harness / Third-Party / Local）。步骤 spec 的其余部分无论镜像仓库类型如何都相同。

**对于 Aqua Trivy（开源）：**

```yaml
- step:
    type: AquaTrivy
    name: Aqua_Trivy_Scan
    identifier: Aqua_Trivy_Scan
    spec:
      mode: orchestration
      config: default
      target:
        type: container
        detection: auto
      advanced:
        log:
          level: info
      privileged: true
      image:
        type: docker_v2
        name: <image_name>
        tag: <tag>
```

**对于 Grype（开源）：**

```yaml
- step:
    type: Grype
    name: Grype_Scan
    identifier: Grype_Scan
    spec:
      mode: orchestration
      config: default
      target:
        type: container
        detection: auto
      advanced:
        log:
          level: info
      privileged: true
      image:
        type: docker_v2
        name: <image_name>
        tag: <tag>
```

**对于商业扫描器——添加带扫描器产品凭据的 `auth` 块：**

```yaml
- step:
    type: Snyk                       # or PrismaCloud, AnchoreEnterprise, BlackDuck, Wiz
    name: Snyk_Container_Scan
    identifier: Snyk_Container_Scan
    spec:
      mode: orchestration
      config: default
      target:
        type: container
        detection: auto
      auth:
        access_id: <+secrets.getValue("project.snyk_access_id")>     # omit if scanner only needs token
        access_token: <+secrets.getValue("project.snyk_api_token")>
      advanced:
        log:
          level: info
      privileged: true
      image:
        type: docker_v2
        name: <image_name>
        tag: <tag>
```

使用步骤 3 扫描器产品认证表中的 `auth` 字段名称。仅当扫描器需要时才包含 `access_id`（Snyk 仅需 `access_token`；Prisma Cloud、Anchore 和 Wiz 需要两者）。

### 步骤 6：构建更新后的流水线 YAML

**场景 A——添加到现有 `CI` 阶段：**

将步骤插入所选 CI 阶段的 `spec.execution.steps`。该阶段已有自己的基础设施和 `cloneCodebase: true`。无需更改阶段本身——只需追加步骤：

```yaml
- step:
    type: HarnessSCA
    name: Container_Scan
    identifier: Container_Scan
    spec:
      mode: orchestration
      config: default
      target:
        type: container
        detection: auto
      advanced:
        log:
          level: info
      resources:
        limits:
          memory: 2G
          cpu: 1000m
      privileged: true
      image:
        type: docker_v2
        name: <image_name>
        tag: <tag>
```

**场景 B——添加到现有 `SecurityTests` 阶段：**

将步骤插入现有阶段的 `spec.execution.steps`。确保该阶段具有：
- `cloneCodebase: false`
- 步骤上的 `privileged: true`

**场景 C——没有合适阶段，创建新 `SecurityTests` 阶段：**

向流水线追加新阶段：

```yaml
- stage:
    name: Container Scan
    identifier: Container_Scan_Stage
    type: SecurityTests
    spec:
      cloneCodebase: false
      infrastructure:
        type: KubernetesDirect
        spec:
          connectorRef: <delegate_connector>
          namespace: <namespace>
          automountServiceAccountToken: true
          nodeSelector: {}
          os: Linux
      execution:
        steps:
          - step:
              type: HarnessSCA
              name: Container_Scan
              identifier: Container_Scan
              spec:
                mode: orchestration
                config: default
                target:
                  type: container
                  detection: auto
                advanced:
                  log:
                    level: info
                resources:
                  limits:
                    memory: 2G
                    cpu: 1000m
                privileged: true
                image:
                  type: docker_v2
                  name: <image_name>
                  tag: <tag>
```

### 步骤 7：通过 MCP 更新流水线

```
Call MCP tool: harness_update
Parameters:
  resource_type: "pipeline"
  resource_id: "<pipeline_identifier>"
  org_id: "<organization>"
  project_id: "<project>"
  body: { yamlPipeline: "<updated pipeline YAML string>" }
```

### 步骤 8：提供摘要和下一步

```
## Container Scan Configured

**Pipeline:** <pipeline_name>
**Scanner:** <scanner_name> (<scanner_type>)
**Stage:** <stage_name> (SecurityTests)
**Image:** <image_name>:<tag>
**Registry:** <registry_type>

**Pipeline URL:** https://app.harness.io/ng/account/<account_id>/module/sto/orgs/<org_id>/projects/<project_id>/pipelines/<pipeline_id>/pipeline-studio/

### Next Steps
1. Run the pipeline to verify the scan step executes successfully
2. View scan results in the Security Tests tab of the execution
3. Set failure thresholds using `failOnSeverity` (CRITICAL, HIGH, MEDIUM, LOW) in the step's Advanced tab
4. Configure exemptions for false positives via `/security-report` skill
5. Enforce pipeline gates on severity via `/create-policy` skill
```

## 示例

### 扫描公共 Docker Hub 镜像

```
/create-container-scan
Add a container scan to my pipeline for the image johnkday/nodegoat:latest
```

### 扫描私有 ECR 镜像

```
/create-container-scan
Add container scanning to my deploy pipeline. The image is in ECR:
123456789.dkr.ecr.us-east-1.amazonaws.com/my-service:v2.1.0
Use our ECR credentials stored in secrets.
```

### 部署前添加扫描

```
/create-container-scan
I want to scan my Docker image myorg/api-server:latest before it gets deployed.
Add it to the existing SecurityTests stage in my backend-deploy pipeline.
```

## 性能注意事项

- 仅适用于**现有流水线**——不要提供创建新的独立流水线
- 始终询问用户想要哪个扫描器——呈现完整列表；未指定则默认 **Harness SCA**
- `HarnessSCA`（及所有其他扫描器）可添加到 **CI 阶段**（与构建内联）或 **SecurityTests 阶段**（隔离）——询问用户，如果存在 CI 阶段则默认 CI 阶段
- 对于商业扫描器（Snyk、Prisma Cloud、Anchore、Black Duck、Wiz），生成 YAML 之前始终询问扫描器产品凭据（`auth.access_id` / `auth.access_token`）——这些与镜像仓库凭据不同
- 如果所需密钥尚不存在，在继续之前提示用户通过 `/create-secret` 创建
- `auth` 块位于步骤 `spec` 级别，与 `image` 凭据分开
- 始终在 `HarnessSCA` 步骤上设置 `privileged: true`——容器扫描需要它
- 仅在创建**新** `SecurityTests` 阶段时询问 delegate 基础设施——现有阶段已有基础设施
- 仅在 `SecurityTests` 阶段设置 `cloneCodebase: false`——CI 阶段已管理自己的 codebase 设置
- 默认 `mode: orchestration` 和 `config: default`，除非用户另有指定
- 设置资源限制 `memory: 2G` 和 `cpu: 1000m` 以避免扫描期间 OOM 失败
- 对于 ECR 镜像，domain 必须包含完整镜像仓库 URL，而不仅是 region

## 故障排查

### 流水线未找到
- 核实 `org_id` 和 `project_id` 正确
- 用 `harness_list`（resource_type: "pipeline"）确认流水线存在

### 扫描步骤因权限错误失败
- 确保步骤 spec 上设置了 `privileged: true`
- 核实 delegate 在命名空间中具有 Docker socket 访问权限

### 镜像拉取失败
- 对于私有镜像仓库，确保 `image.access_id` 和 `image.access_token` 引用有效密钥
- 对于 ECR，确认 delegate 具有正确的 IAM 角色来拉取镜像
- 对于 Docker Hub，检查速率限制；提供凭据以避免匿名拉取限制

### 扫描器认证失败（商业扫描器）
- 核实 `auth.access_token`（以及需要时的 `auth.access_id`）引用有效 Harness 密钥
- 确认密钥标识符精确匹配——用 `harness_get(resource_type="secret")` 检查
- 对于 Snyk：仅需 `access_token`（API 令牌），不需要 `access_id`
- 对于 Prisma Cloud / Wiz / Anchore：`access_id` 和 `access_token` 都需要
- 如果密钥不存在，先通过 `/create-secret` 创建然后重新运行技能

### Security Tests 标签中无结果
- 确认账户已启用 STO 模块
- 检查执行日志中的扫描器错误
- 核实镜像名称和标签正确且镜像存在于镜像仓库

### 流水线更新校验错误
- 核实 YAML 缩进（全程 2 个空格）
- 确保步骤 `identifier` 匹配模式 `^[a-zA-Z_][0-9a-zA-Z_]{0,127}$`
- 确认 `SecurityTests` 阶段具有带有效 delegate 连接器的有效 `infrastructure` 块
