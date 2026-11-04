---
name: create-sbom
description: >-
  使用 Harness SCS SscaOrchestration（SBOM Orchestration）向现有 Harness 流水线
  添加 SBOM（软件物料清单）生成步骤。支持容器镜像和代码
  仓库。来源：docker、ECR、GCR、GAR、ACR、Harness AR（har）、repository 和 local workspace。
  Syft 或 cdxgen、SPDX 或 CycloneDX、可选 SBOM 证明。
  仅适用于现有流水线。在要求创建 SBOM、生成物料
  清单、向流水线添加 SBOM、扫描容器镜像或代码仓库以获取组件，或设置
  SBOM Orchestration 时使用。
  触发短语：创建 SBOM、生成 SBOM、添加 SBOM 步骤、镜像的 SBOM、代码仓库的 SBOM、
  扫描依赖、SBOM Orchestration、添加 Generate SBOM 步骤。
metadata:
  author: Harness
  version: 1.0.1
  mcp-server: harness-mcp-v2
  summary: Add SBOM Orchestration (generation/attestation) to existing pipelines
license: Apache-2.0
compatibility: Requires Harness MCP v2 server (harness-mcp-v2)
---

# 创建 SBOM

为容器镜像或代码仓库向现有 Harness 流水线添加一个 **SBOM Orchestration**（`SscaOrchestration`）步骤。此技能仅适用于**现有流水线**——不要创建独立的 SBOM 流水线。

**支持的阶段：** SBOM Orchestration 在 **CI**、**CD**（`Deployment`）和 **Security**（`Security`）阶段中运行。在阶段 2 中展示阶段类型，并提供与该阶段类型匹配的放置选项（参见 `references/interactive-wizard-flow.md`）。

通过**逐步交互式向导**引导用户（与 `/configure-repo-scan` 相同的 UX）：
每轮一个决策、标记推荐选项、获取后展示流水线结构，然后在 `harness_update` 之前确认。

- 向导脚本：`references/interactive-wizard-flow.md`
- UI ↔ YAML 映射：`references/sbom-orchestration-step.md`
- CD 容器化步骤组：`references/cd-containerized-step-group.md`

---

## 交互模型（强制）

每次调用都遵循此 UX。**不要**在一条消息中倾倒所有 Pipeline Studio 字段。

1. **每轮一个问题**——可用时使用 `AskQuestion` 工具。如果不可用，使用带默认选项 `(Recommended)` 的编号选项列表（与容器扫描相同模式）。
2. **开场消息**——简要说明目标：向现有流水线添加 SBOM Orchestration。
3. **进度面包屑**——流水线获取后，在每个向导轮次显示：
   `Pipeline · Placement · Method · Source · Details · Attestation · Submit`
4. **记录答案**——保留选择的运行摘要；除非用户改变方向，否则不要重复询问。
5. **先获取再配置**——在放置/来源问题之前 `harness_get`（URL 或 id）。
6. **展示流水线结构**——在询问放置之前列出阶段和步骤（阶段 2）。
7. **推断，而非假定**——从 YAML 建议连接器/来源；如果不含糊则跳过连接器问题。
8. **绝不猜测镜像标签**——在阶段 8 始终询问镜像或代码仓库+分支。
9. **写入前确认**——阶段 10 摘要 + 仅在用户确认后 `harness_update`。
10. **更新后停止**——成功 `harness_update` 后，提供配置摘要并
    指向 `/run-pipeline` 以执行。**不要**在此技能中调用 `harness_execute`、轮询
    执行或运行 `harness_diagnose`（与 `/configure-repo-scan` 相同模式）。
11. **"Defaults" 快捷方式**——应用推荐的向导选择（参见参考），但仍询问镜像/代码仓库。
12. **阶段 3 放置从不是可选的**——始终在方法/来源/证明**之前**运行阶段 2（结构）然后阶段 3
    （`AskQuestion` 询问阶段 + 位置），即使：
    - 流水线只有一个 CI 阶段
    - CI 中已存在 `SscaOrchestration` 步骤
    - 用户说“向流水线添加 SBOM”但未指定阶段
    - 先前的聊天配置了同一流水线（**不要**复用它来跳过 Placement）
13. **绝不从会话历史假定流水线或阶段**——除非用户在**当前消息**中粘贴，否则在阶段 0/1 确认流水线 URL/ID。先前的工作区上下文可提供建议，但不能替代向导。
14. **CD 是不同放置路径**——如果用户选择 `Deployment` 阶段（或要求 CD），
    端到端遵循 `references/cd-containerized-step-group.md`（步骤组、`<+artifact.image>`、
    基础设施）。不要将 CD SBOM 放在阶段顶层的 `execution.steps` 下。
15. **仅 CI 流水线 + CD SBOM**——如果阶段 2 显示**没有** `Deployment` 阶段而用户想要
    CD，在 `harness_update` 之前运行 **CD 前置条件**子流程（服务、环境、基础设施、用于
    `stepGroupInfra` 的 K8s 连接器）。参见下面的 **CD 边界情况**。

完整阶段提示词和选项 id：`references/interactive-wizard-flow.md`。

---

## 说明

### 向导阶段（面向用户）

按顺序运行。**每个阶段后停止**直到用户回答。

| 阶段 | 面包屑 | 操作 |
|-------|------------|--------|
| 0 | Pipeline | AskQuestion：流水线 URL 准备好了吗？ |
| 1 | Pipeline | 收集 URL 或 org/project/id → `harness_get` |
| 2 | Pipeline | 显示流水线结构（无问题） |
| 3 | Placement | **强制** `AskQuestion`：目标阶段（CI / Deployment / Security）+ 位置；如无 Deploy 阶段见 **CD 边界情况** |
| 3b | Placement（仅 CD） | 如无 `Deployment` 阶段：服务、环境、基础设施、`stepGroupInfra` 连接器——然后添加阶段 + SBOM |
| 4 | Method | AskQuestion：Syft/SPDX、CycloneDX、cdxgen 或 ingestion |
| 5 | Source | AskQuestion：来源磁贴（Third-Party、HAR、Repository、Local） |
| 6 | Source | AskQuestion：镜像仓库提供方（仅 Third-Party） |
| 7 | Details | AskQuestion：连接器（从 YAML 明显则跳过） |
| 8 | Details | 询问：镜像、代码仓库 URL 或本地制品（自由文本） |
| 9 | Attestation | AskQuestion：是否证明；keyless vs cosign |
| 10 | Submit | AskQuestion：确认流水线更新 |

阶段 10 `confirm` 后 → 生成 YAML、插入步骤、`harness_update`，然后提供摘要（不要运行流水线）。

### 支持的阶段类型

| 阶段类型（YAML） | 模块 | SBOM 放置说明 |
|-------------------|--------|----------------------|
| `CI` | CI | 阶段末尾或构建/推送后；代码仓库来源需要 `cloneCodebase: true` + codebase |
| `Deployment` | CD | 在带 `stepGroupInfra` 的**容器化步骤组**内；部署**之前**——参见 `references/cd-containerized-step-group.md` |
| `Security` | STO / SCS | `spec.execution.steps` 末尾（与其他安全步骤并列） |

在阶段 2 中列出阶段时，包含阶段**类型**（`CI`、`Deployment`、`Security` 等）。
对于 **Deployment** 阶段，将每个 `stepGroup` 标记为**容器化**或**非容器化**（是否存在
`stepGroupInfra`）。在阶段 3 中，仅提供对所选阶段有效的放置选项（参见向导
参考）。**绝不**在 CD 阶段 `execution.steps` 的顶层插入 `SscaOrchestration`。

### CD 边界情况（强制工作流）

当 Placement 面向 **`Deployment`** 阶段，或用户想要在部署时获取 SBOM 时使用。

#### 阶段 2——仅 CI 流水线警告

如果流水线**只有** `CI`（或 `Security`）阶段且**没有** `type: Deployment` 阶段，打印：

> This pipeline has no CD Deploy stage yet. SBOM in CD must run in a **Deployment** stage inside a
> **containerized step group** before the deploy step.

然后 **AskQuestion**：添加新的 Deploy 阶段、使用不同的流水线 URL，或仅将 SBOM 保留在 CI 中。
**不要**不经询问就默认使用现有 CI 阶段。

#### 阶段 3——放置（始终询问）

即使只有一个 `Build` CI 阶段，也要询问：

1. **哪个阶段？**——按标识符列出每个 `CI`、`Deployment` 和 `Security` 阶段。
2. **该阶段中的位置？**——按向导参考的 `ci_*`、`cd_*` 或 `security_*` 选项。

如果 `SscaOrchestration` 已在 CI 中存在，包含如下选项：

| 选项 | 含义 |
|--------|---------|
| 保留 CI SBOM + 添加 CD SBOM | 在 Deploy 阶段添加新步骤（例如 `generate_sbom_cd`） |
| 仅 CD | 用户将移除或跳过 CI SBOM（在阶段 10 确认） |
| 替换 / 移动 | 罕见——明确确认来源和目标阶段 |

#### 阶段 3b——CD 前置条件（尚无 Deploy 阶段）

**每轮一个主题**运行（尽可能用 `AskQuestion`）：

| 步骤 | 操作 |
|------|--------|
| 服务 | `harness_list` / 用户选择 → `serviceRef`（制品连接器驱动镜像仓库 SBOM 连接器） |
| 环境 | 用户选择 → `environmentRef` |
| 基础设施 | 用 `params: { environment_id: "<env>" }` 调用 `harness_list`；如果没有，按 `/create-infrastructure` 用 `harness_create`（`KubernetesDirect`）——**绝不**在 Deploy 阶段省略 `infrastructureDefinitions` |
| 步骤组基础设施 | `AskQuestion`：用于 `stepGroupInfra` 的 K8s 集群连接器 + 命名空间（尽可能从阶段基础设施复制） |
| 部署步骤类型 | 对于 `deploymentType: Kubernetes` 服务，默认 `K8sRollingDeploy` |

在 CI 之后追加新阶段（典型）：

```yaml
- stage:
    identifier: Deploy_Dev
    name: Deploy Dev
    type: Deployment
    spec:
      deploymentType: Kubernetes
      service:
        serviceRef: <service_id>
      environment:
        environmentRef: <environment_id>
        deployToAll: false
        infrastructureDefinitions:
          - identifier: <infra_id>
      execution:
        steps:
          - stepGroup:
              identifier: scs_before_deploy
              name: Supply Chain Security
              stepGroupInfra:
                type: KubernetesDirect
                spec:
                  connectorRef: <k8s_cluster_connector>
                  namespace: <namespace>
              steps:
                - step:
                    identifier: generate_sbom_cd
                    name: Generate SBOM
                    type: SscaOrchestration
                    # ... wizard spec; image: <+artifact.image> for service artifacts ...
          - step:
              identifier: rolling_deployment
              type: K8sRollingDeploy
              spec:
                skipDryRun: false
              timeout: 10m
      rollbackSteps:
        - step:
            identifier: rollback
            type: K8sRollingRollback
            spec: {}
            timeout: 10m
    failureStrategies:
      - onFailure:
          errors: [AllErrors]
          action:
            type: StageRollback
```

完整规则和示例：`references/cd-containerized-step-group.md`。

#### CD 步骤标识符和镜像

- 当 CI 已有 `generate_sbom` 时，在 CD 中使用**唯一**的步骤 id（例如 `generate_sbom_cd`）。
- **CD 镜像：** 优先使用服务主制品中的 `<+artifact.image>`；仅当用户在阶段 8 提供时才使用字面标签。
- **镜像仓库连接器：** 来自 `service.serviceDefinition.spec.artifacts` 或现有 CI SBOM 步骤。

### 向导之后——后端步骤

#### 从流水线 YAML 提取连接器

**容器 / Third-Party：** `BuildAndPushDockerRegistry`、`Run`、
`Plugin`、`StoAgent`、`SscaOrchestration`、`SscaArtifactSigning` 中的 `connectorRef` 或 `connector`。

**代码仓库：** v0 `pipeline.properties.ci.codebase.connectorRef`；v1 codebase 连接器 →
`spec.overrideConnectorRef`。

如果代码仓库 SBOM 且无 codebase 连接器 → 停止并说明。如果容器 SBOM 且无镜像仓库
连接器 → `harness_search`（连接器）或 `/create-connector`。

#### 生成 SBOM 步骤配置

**仅使用向导中记录的选项**生成原生 `SscaOrchestration` YAML——而非
`Run: syft` 步骤。如果用户选择 **defaults** 快捷方式，使用 Generation + Syft + SPDX +
Third-Party/docker + keyless 证明。

**Third-Party——Docker 镜像仓库（默认）：**

```yaml
- step:
    identifier: generate_sbom
    name: Generate SBOM
    type: SscaOrchestration
    spec:
      mode: generation
      source:
        type: docker
        spec:
          connector: <docker_registry_connector_from_step_2>
          image: <repo/name:tag_or_digest>
      tool:
        type: Syft
        spec:
          format: spdx-json
      attestation:
        type: keyless
        spec:
          oidcProvider: harness
    timeout: 15m
```

**代码仓库：**

```yaml
- step:
    identifier: generate_sbom
    name: Generate SBOM
    type: SscaOrchestration
    spec:
      mode: generation
      overrideConnectorRef: <git_connector_from_step_2>
      source:
        type: repository
        spec:
          url: <full_repo_url>
          variant_type: branch
          variant: <branch>
      tool:
        type: Syft
        spec:
          format: spdx-json
      attestation:
        type: keyless
        spec:
          oidcProvider: harness
    timeout: 15m
```

**Amazon ECR（`source.type: ecr`）：**

```yaml
      source:
        type: ecr
        spec:
          connector: <registry_connector>
          image: <repo/name:tag_or_digest>
          region: <aws_region>
          account: <aws_account_id>
```

**Google GCR（`source.type: gcr`）：**

```yaml
      source:
        type: gcr
        spec:
          connector: <docker_registry_connector>
          host: gcr.io
          project_id: <gcp_project_id>
          image: <repo/name:tag_or_digest>
```

**Google GAR（`source.type: gar`）：**

```yaml
      source:
        type: gar
        spec:
          connector: <docker_registry_connector>
          host: <region>-docker.pkg.dev
          project_id: <gcp_project_id>
          image: <repo/name:tag_or_digest>
```

**Azure ACR（`source.type: acr`）：**

```yaml
      source:
        type: acr
        spec:
          connector: <docker_registry_connector>
          image: <registry>.azurecr.io/<repo>:<tag>
          subscription_id: <azure_subscription_id>
```

**Harness Artifact Registry（`source.type: har`）：**

```yaml
      source:
        type: har
        spec:
          registry: <harness_artifact_registry_identifier>
          image: <image_name:tag_or_digest>
```

**Harness Local Stage（`source.type: local`）：**

```yaml
      source:
        type: local
        spec:
          artifact_name: <artifact_name>
          workspace: <optional_workspace_path>
          version: <optional_version>
```

当制品已存在于阶段工作区时使用。对于没有镜像仓库镜像的 JAR/Helm/非容器制品，
用户可能需要改用 **ingestion** 模式——参见 Harness ingest SBOM 文档。

**CycloneDX（当请求时）：** 将 `format` 改为 `cyclonedx-json`。

**无证明（当请求时）：** 省略 `attestation` 块。

完整 UI 映射和说明：`references/sbom-orchestration-step.md`。

**镜像格式（docker / ecr / gcr / gar / acr / har）：**
- Docker Hub：`lavakush07/myapp:v7`——无前导 `/`、无 `https://`、除非必要否则无 `docker.io/`
- 对 `docker` 来源使用单个 `image` 字段——而非拆分 `url` + `variant`

---

#### 将步骤插入流水线 YAML

在阶段 3 选择的放置处插入。确保正确的缩进。

**关键规则：**
- 仅插入新步骤——不要修改现有步骤、变量或失败策略
- **CI / Security：** 添加在 `stage.spec.execution.steps` 下（或用户选择的非 CD 步骤组内）
- **CD（Deployment）：** **强制**——插入到容器化组的 `stepGroup.steps` 下（`stepGroupInfra` 已设置）。参见 `references/cd-containerized-step-group.md`
- **CI + 代码仓库来源：** 确保 CI 阶段上有 `cloneCodebase: true` 和 `properties.ci.codebase`
- **CD 放置：** 在部署步骤之前；尽可能为 `image` 使用制品表达式（`<+artifact.image>`）
- **CD——无容器化组：** 创建 `cd_new_containerized_group`（新的 `stepGroup` + `stepGroupInfra`）或停止并指导用户——不要使用顶层 `execution.steps`
- **Security：** 追加到阶段 `execution.steps`；按来源选择使用镜像仓库或代码仓库
- 步骤标识符：CI 中为 `generate_sbom`；当 CI 已有 `generate_sbom` 时在 CD 中使用 `generate_sbom_cd`（或后缀）

**CD 容器化步骤组（摘要）：**

```yaml
- stepGroup:
    identifier: <scs_step_group_id>
    name: Supply Chain Security
    stepGroupInfra:
      type: KubernetesDirect
      spec:
        connectorRef: <k8s_cluster_connector>
        namespace: <namespace>
    steps:
      - step:
          identifier: generate_sbom
          type: SscaOrchestration
          # ... spec from wizard ...
- step:
    identifier: <deploy_step>
    type: K8sRollingDeploy   # unchanged; SBOM group must appear BEFORE this
```

尽可能从流水线中现有容器化组复制 `stepGroupInfra`。

创建完整的更新后流水线 YAML 字符串。

---

#### 通过 MCP 更新流水线

```
Call MCP tool: harness_update
Parameters:
  resource_type: "pipeline"
  resource_id: "<pipeline_identifier>"
  org_id: "<organization>"
  project_id: "<project>"
  body: { yamlPipeline: "<updated pipeline YAML string>" }
```

遇到校验错误时，读取 API 消息、修复字段、重试。

---

#### 提供摘要和下一步

向用户报告结果（与 `/configure-repo-scan` 相同模式——**不要**执行流水线）：

```
## SBOM Orchestration Configured

**Pipeline:** <pipeline_name>
**Step:** Generate SBOM (SscaOrchestration)
**Location:** Stage "<stage_name>", <position description>
**Mode:** Generation
**Source:** Third-Party → Docker Registry (or Repository / HAR as configured)
**Connector:** <connector_identifier>
**Image / repo:** <image_or_repo_url>
**Tool / format:** Syft / SPDX (spdx-json)
**Attestation:** Keyless (Harness OIDC) — or as configured

**Pipeline URL:** https://app.harness.io/ng/account/<account_id>/module/ci/orgs/<org_id>/projects/<project_id>/pipelines/<pipeline_id>/pipeline-studio/

**Note:** Review the SBOM Orchestration step in Pipeline Studio to adjust Advanced settings
(resources, SBOM drift, expressions on image field).

### Next Steps
1. Run the pipeline via `/run-pipeline` to verify the SBOM Orchestration step executes successfully
2. If the run fails, diagnose with `/debug-pipeline`
3. View the SBOM on the **Supply Chain** tab of the execution and in SCS **Artifacts**
4. Download SBOM via Artifacts UI or [SBOM API](https://apidocs.harness.io/sbom/downloadsbomforartifact)
5. Enforce SBOM policies via `/enforce-sbom` (pipeline step) and `/create-policy` (OPA rules)
6. For automatic runs on push/PR, add a trigger via `/create-trigger`
```

**CD 流水线：** 在摘要中注明运行时是否需要输入（服务制品、环境、基础设施）——用户通过 `/run-pipeline` 或 Harness UI Run 提供这些。

---

## 示例

### 向现有 CI 流水线添加 SBOM（容器）

```
/create-sbom
Add SBOM generation to my backend-api pipeline in the platform project for lavakush07/myapp:v7
```

### 代码仓库 SBOM

```
/create-sbom
Add Generate SBOM to my PR pipeline — repository source, branch main
```

### SPDX + 证明默认值

```
/create-sbom
Configure SBOM Orchestration on ci-build-deploy after docker push — Syft, SPDX, keyless attest
```

### CycloneDX，无证明

```
/create-sbom
Add SBOM step with CycloneDX only, no attestation
```

### CD Deploy 阶段（容器化步骤组）

```
/create-sbom
Add Generate SBOM to Deploy_Production before K8s rolling deploy — use artifact image expression
```

### 仅 CI 流水线——在新 CD 阶段添加 SBOM

```
/create-sbom
Pipeline has only a Build CI stage — add a Deploy Dev stage with containerized Generate SBOM before K8s rolling deploy
```

### 放置必须明确（反模式）

```
/create-sbom
add the sbom step to the pipeline
```

Agent 仍必须运行阶段 2 + 阶段 3（阶段选择器），而不是假定 CI 或先前会话配置。

---

## 性能注意事项

- 仅适用于**现有流水线**——不要提供创建新流水线
- **向导 UX 是强制的**——每轮一个 `AskQuestion`（或一个编号菜单）；参见 `references/interactive-wizard-flow.md`
- **阶段 3 放置每次调用都是强制的**——绝不因单个 CI 阶段、现有 SBOM 或先前的聊天上下文而跳过
- **不要**从工作区历史假定流水线/阶段——除非 URL/ID 在当前用户消息中，否则在阶段 0/1 确认
- **不要**在单条消息中粘贴完整的 Pipeline Studio 检查清单
- 阶段 1 后 `harness_get` 一次；在 Placement 之前显示结构
- 从 YAML 提取连接器；明显时跳过阶段 7
- **Defaults** 快捷方式：Syft + SPDX + Third-Party/docker + keyless——仍在阶段 8 询问镜像/代码仓库
- 容器 SBOM 在镜像推送之后；代码仓库 SBOM 需要 `cloneCodebase: true` + codebase
- 绝不从 `Run` 脚本推断镜像标签
- 使用 `source.type: docker` 搭配 `connector` + `image`——而非在 docker 来源上使用旧式 `url`/`variant`
- **顺序**运行 SBOM 和 SLSA 证明，而非并行（Cosign 镜像仓库竞态）
- 按提供方的 YAML：`references/sbom-orchestration-step.md`
- **支持的阶段：** CI、CD（`Deployment`）、Security——在阶段 2 标注类型；过滤阶段 3 选项
- **CD 边界情况：** SBOM 仅在带 `stepGroupInfra` 的 `stepGroup` 内；仅 CI → CD 需要阶段 3b——`references/cd-containerized-step-group.md`
- **不要在此技能中执行流水线**——配置后使用 `/run-pipeline`（与 `/configure-repo-scan` 相同）

---

## 故障排查

### 流水线未找到
- 核实 `org_id` 和 `project_id` 正确
- 用 `harness_list`（resource_type: `pipeline`）确认流水线存在

### 流水线中未找到连接器
- **docker / image / ecr / gcr / gar / acr：** 在流水线 YAML 中搜索 `connectorRef` 或用 `harness_search` 搜索镜像仓库连接器
- **har：** 用户必须提供 Harness Artifact Registry 标识符（`registry` 字段）
- **代码仓库：** 设置 `properties.ci.codebase.connectorRef`（v0）或 v1 codebase 块
- **local：** 无镜像仓库连接器——制品必须已由先前步骤存在于工作区

### 镜像仓库来源类型错误
- Docker Hub / 通用镜像仓库 → `docker`（除非镜像在 ECR 中，否则不用 `ecr`）
- ECR 镜像 → `ecr` + `region` + `account`
- GCR vs GAR → `gcr` vs `gar`，使用正确的 `host` 和 `project_id`
- ACR → `acr` + `.azurecr.io` 下的完整镜像路径

### 镜像未找到 / 无效引用
- 症状：`invalid reference format` 或 `skopeo fallback failed`
- 使用单个 `source.spec.image`——例如 `lavakush07/myapp:v7`，而非 `/lavakush07/myapp` 或拆分字段

### SBOM 证明失败（Keyless）
- Harness OIDC 需要 Harness CI 执行上下文
- **non-harness：** SCS → Manage → Configuration → **Connector for Keyless Signing**
- JFrog：连接器需要 `Read`、`Annotate`、`Create/Deploy`、`Delete` 以上传 `.att`

### 代码仓库 SBOM——0 个组件
- CI 阶段上 `cloneCodebase: false` 或缺少 `properties.ci.codebase`

### 流水线更新校验错误
- 步骤标识符模式：`^[a-zA-Z_][0-9a-zA-Z_]{0,127}$`
- 按提供方的有效 `source.type` 和必需 `spec` 字段
- `DUPLICATE_IDENTIFIER`——重命名 `generate_sbom`

### 运行后 Artifacts 中无 SBOM
- 确认执行在 SBOM Orchestration 步骤上达到成功
- 检查步骤日志；核实镜像在扫描时存在于镜像仓库
- 稍后通过 `/security-report` 或 `scs_artifact_component` MCP 资源列出组件

### MCP 错误
- `CONNECTOR_NOT_FOUND`——在 Project Settings → Connectors 中核实连接器标识符
- `ACCESS_DENIED`——具有流水线编辑权限的 PAT

### 跳过了 Placement / 阶段错误
- 症状：用户想要 CD 时 SBOM 被添加到 CI（或反之）
- 原因：代理跳过了阶段 3 或从先前会话假定阶段
- 修复：从阶段 2 重新运行向导；询问阶段 + `cd_*` vs `ci_*` 放置；将步骤移到 CD `stepGroup.steps` 下

### CD——缺少 infrastructureDefinitions
- 症状：`infrastructureDefinitions or infrastructureDefinition should be present in stage`
- 修复：添加 `environment.infrastructureDefinitions[].identifier` 或通过 `harness_create` 创建基础设施（`/create-infrastructure`）

### 流水线运行失败
- 使用 `/run-pipeline` 执行，使用 `/debug-pipeline` 诊断失败
- **凭据错误（codebase-sync）：** 修复 CI/代码仓库 SBOM 流水线上的 Git 连接器
- **缺少运行时输入：** 通过 `/run-pipeline` 或 Harness UI Run 提供分支/标签或部署输入
- **CD 容器化：** SBOM 必须在带 `stepGroupInfra`（`KubernetesDirect` 或 `VM`）的 `stepGroup.steps` 下——而非顶层 `execution.steps`；参见 `references/cd-containerized-step-group.md`
- **CD——无 Initialize / SSCA pod：** 步骤组缺少 `stepGroupInfra` 或未启用基于容器的执行
- **CD——镜像错误：** 使用 `<+artifact.image>`（或来自服务制品的表达式），而非陈旧的文字标签
- **Security 阶段：** 确认阶段 `type: Security` 且制品来源与先前步骤匹配（镜像仓库 vs 代码仓库）
