---
name: verify-sign
description: >-
  向现有 Harness 流水线添加制品验证（SscaArtifactVerification）步骤，以
  验证容器或本地阶段制品上的 Cosign 签名。支持 CI、Security 和 CD
  Deploy（容器化步骤组）。支持第三方镜像仓库（Docker、ECR、GCR、GAR、ACR）、
  Harness Artifact Registry（HAR）和 Harness Local Stage 制品。仅适用于现有
  流水线。在要求验证已签名制品、验证制品签名、verify-sign、
  校验 Cosign 签名，或配置 SscaArtifactVerification 时使用。
  触发短语：verify sign、验证制品、制品验证、验证签名、verify-sign、
  SscaArtifactVerification、验证已签名镜像、验证 Cosign、HAR 验证。
metadata:
  author: Harness
  version: 1.0.0
  mcp-server: harness-mcp-v2
  summary: Add Artifact Verification (verify Cosign signature) to existing pipelines (SSCA)
license: Apache-2.0
compatibility: Requires Harness MCP v2 server (harness-mcp-v2)
---

# 验证签名

向现有 Harness 流水线添加一个**制品验证**（`SscaArtifactVerification`）步骤。该步骤验证制品上的 Cosign 签名——通常在 `SscaArtifactSigning` 之后立即进行。

此技能仅适用于**现有流水线**——不要创建独立的仅验证流水线。

**前置条件：** 制品必须已签名（通常通过 `/sign-artifact` / `SscaArtifactSigning`）。基于密钥的验证需要与签名私钥匹配的 Cosign **公**钥文件密钥（`/create-secret`）。如果签名未将 `.sig` 上传到镜像仓库，Harness 会在验证期间从其数据库拉取签名。

**支持的阶段：** CI、Security 和 CD（部署前容器化步骤组中的 `Deployment`）。

通过**逐步交互式向导**引导用户（与 `/sign-artifact` 相同 UX）：

- 向导：`references/interactive-wizard-flow.md`
- UI ↔ YAML：`references/artifact-verification-step.md`
- CD 容器化步骤组：`references/cd-containerized-step-group.md`

---

## 交互模型（强制）

1. **每轮一个问题**——可用时使用 `AskQuestion`；否则使用带 `(Recommended)` 的编号选项。
2. **开场消息**——添加制品验证；提及签名前置条件 + HAR 支持。
3. **进度面包屑**——流水线获取后：
   `Pipeline · Placement · Source · Details · Verify · Submit`
4. **记录答案**——运行摘要；除非用户改变方向，否则不要重复询问。
5. **先获取再配置**——在放置/来源问题之前 `harness_get`。
6. **展示流水线结构**——突出 `SscaArtifactSigning` 和连接器。
7. **从签名推断来源**——当存在一个 `SscaArtifactSigning` 步骤时，复用其来源。如果
   存在多个，询问镜像哪个步骤。
8. **绝不猜测镜像标签**——默认来自签名步骤；含糊时询问。
9. **写入前确认**——摘要 + 仅在用户确认后 `harness_update`。
10. **更新后停止**——成功 `harness_update` 后，提供配置摘要并
    指向 `/run-pipeline` 以执行。**不要**在此技能中调用 `harness_execute`、轮询
    执行或运行 `harness_diagnose`（与 `/configure-repo-scan` 相同模式）。
11. **仅在 CI 流水线上的 CD**——不要拒绝 CD 验证；运行阶段 3b 添加 Deploy 阶段 + 容器化组。
12. **验证方法必须与签名匹配**——keyless ↔ keyless、keybased/cosign ↔ 同一密钥对的公钥。
13. **提供全部三个来源磁贴**——Third-Party、**HAR** 和 Harness Local Stage。
14. **在阶段 6 列出所有连接器**——与 `/sign-artifact` 相同规则：`harness_list` 搭配
    `filters.type`、所有范围、`size: 100`、分页；绝不手动挑选子集。参见向导阶段 6。
15. **在阶段 3b 列出所有基础设施**——按环境 `harness_list` 搭配
    `filters.environment_id`；绝不只显示一个预选环境的基础设施。
16. **CD 镜像默认 `<+artifact.image>`**——对于 Deploy 阶段验证，推荐服务
    制品表达式而非签名中的静态标签。当静态镜像 ≠ 服务默认标签时警告。
17. **CD 更新前预检 delegate**——`harness_list(resource_type="delegate")` 或
    对 `stepGroupInfra` 中使用的 K8s 连接器 `harness_execute(test_connection)`。如果
    可能 `DELEGATE_NOT_AVAILABLE`（连接器有 `delegateSelectors` 但无活动 delegate），中止或警告。
18. **CD Deploy 阶段 YAML 要求**——新 Deploy 阶段需要 `failureStrategies: StageRollback`、
    带 `K8sRollingRollback` + `spec: {}` 的 `rollbackSteps`，CI 阶段缺失时需要 `MarkAsFailure`。参见
    `references/cd-containerized-step-group.md`。

完整阶段提示词：`references/interactive-wizard-flow.md`。

---

## 说明

### 向导阶段

| 阶段 | 面包屑 | 操作 |
|-------|------------|--------|
| 0 | Pipeline | AskQuestion：流水线 URL 准备好了吗？ |
| 1 | Pipeline | 收集 URL → `harness_get` |
| 2 | Pipeline | 显示结构；注明缺少 `SscaArtifactSigning` |
| 3 | Placement | AskQuestion：签名之后、CD 部署前等 |
| 3b | Placement（CD） | 如果新建 Deploy 阶段，则服务、环境、基础设施、步骤组 |
| 4 | Source | 从签名推断或选择镜像仓库磁贴 |
| 5 | Source | 镜像仓库提供方（仅 Third-Party） |
| 6 | Details | 连接器——通过 `harness_list` + `filters.type` 列出**所有**（明显则跳过） |
| 7 | Details | 镜像 / 制品字段（默认来自签名） |
| 8 | Verify | AskQuestion：验证签名方法 |
| 9 | Submit | AskQuestion：确认流水线更新 |

阶段 9 `confirm` 后 → 插入步骤、`harness_update`，然后提供摘要（不要运行流水线）。

### 支持的阶段类型

| 阶段类型 | 步骤 `type` | 放置说明 |
|------------|-------------|-----------------|
| `CI` | `SscaArtifactVerification` | 同一阶段中 `SscaArtifactSigning` **之后** |
| `Deployment` | `SscaArtifactVerification` | 容器化步骤组；部署**之前** |
| `Security` | `SscaArtifactVerification` | 制品在镜像仓库中时在签名之后 |

### CD 边界情况

如果没有 `Deployment` 阶段且用户选择 CD 验证：

> No CD Deploy stage yet. We can add a **Deployment** stage with a **containerized step group** and
> place **Artifact Verification** before deploy.

运行阶段 3b（服务、环境、基础设施、`stepGroupInfra`）——参见
`references/cd-containerized-step-group.md`。

#### CD 阶段写入前预检

1. 对 `stepGroupInfra` 中使用的 K8s 连接器 **`harness_get`**——记录 `delegateSelectors`。
2. **`harness_list(resource_type="delegate")`**——确认有**活动** delegate 匹配所需
   选择器（例如 `ssca-prod2-at`）。若无匹配，在 `harness_update` 前警告。
3. **`harness_get(resource_type="service")`**——记录主制品标签；如果用户选择了静态
   验证镜像，当它与服务默认值不同时警告。

#### CD Deploy 阶段 YAML（追加到流水线）

添加新 Deploy 阶段时，包含**所有**必需块（API 拒绝不完整的 YAML）：

```yaml
    - stage:
        name: Deploy
        identifier: Deploy
        type: Deployment
        spec:
          deploymentType: Kubernetes
          service:
            serviceRef: <service_id>
          environment:
            environmentRef: <env_id>
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
                      connectorRef: <k8s_connector>
                      namespace: <namespace>
                  steps:
                    - step:
                        identifier: artifactverification_cd
                        name: Artifact Verification
                        type: SscaArtifactVerification
                        spec:
                          source:
                            type: docker
                            spec:
                              connector: <registry_connector>
                              image: <+artifact.image>
                          verifySign:
                            type: keyless
                            spec:
                              oidcProvider: harness
                        timeout: 15m
              - step:
                  identifier: rolling_deployment
                  name: Rolling Deployment
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

还要确保现有 CI 阶段缺失时加上 `failureStrategies: MarkAsFailure`。

#### 检查前置条件

1. **制品签名**——流水线包含 `SscaArtifactSigning`（或用户确认签名存在）。
2. **公钥密钥**（基于密钥）——与签名私钥匹配的 Cosign 公钥文件密钥。

#### 从流水线 YAML 提取上下文

从 `SscaArtifactSigning`（如果存在）复制来源并映射签名 → 验证：

| 签名 | 验证 |
|---------|--------------|
| `source.type: docker` | 相同 `source.type: docker` |
| `source.spec.image` | 相同 `source.spec.image` |
| `source.spec.connector` | 相同 `source.spec.connector` |
| `source.type: har` | 相同 `source.type: har` + `registry` + `image` |
| `signing.type: keyless` | `verifySign` keyless（匹配 OIDC 提供方） |
| `signing.type: cosign` / `keybased` | `verifySign` 带**公**钥密钥 |

#### 生成制品验证步骤 YAML

**CI——Docker 镜像仓库，基于密钥的验证（Harness 文档）：**

```yaml
- step:
    identifier: artifactverification
    name: Artifact Verification
    type: SscaArtifactVerification
    spec:
      source:
        type: docker
        spec:
          connector: lavakush07
          image: lavakush07/easy-buggy-app:v5
      verifySign:
        type: cosign
        spec:
          public_key: account.cosign_public_key
    timeout: 15m
```

**Keyless 验证**（当签名使用 keyless Harness OIDC 时）：

```yaml
      verifySign:
        type: keyless
        spec:
          oidcProvider: harness
```

如果 API 校验拒绝扁平的 `keyless`，用嵌套的 `cosign` 包装重试——参见
`references/artifact-verification-step.md`。

**HAR 验证：**

```yaml
      source:
        type: har
        spec:
          registry: prod_har
          image: my-service:v3
```

**CD Deploy**——容器化 `stepGroup` 内相同步骤类型；验证服务制品时对 `image` 使用 `<+artifact.image>`。

完整提供方映射：`references/artifact-verification-step.md`。

#### 将步骤插入流水线 YAML

**关键：** 使用 `harness_get` 的**确切** `yamlPipeline` 作为基础。**仅**插入或更新
`SscaArtifactVerification`（以及适用时的 CD 步骤组基础设施）。**绝不**添加 `HarnessSAST`、STO
扫描器或其他步骤——签名/验证技能不配置代码扫描。

- 在阶段 3 放置处插入——尽可能在 `artifactsigning` **之后**。
- 不要修改无关步骤。
- 步骤标识符：`artifactverification`（当 CI 已有一个时在 CD 中使用 `artifactverification_cd`）。
- **CD：** 仅在容器化步骤组内。

#### 通过 MCP 更新流水线

```
harness_update
  resource_type: pipeline
  resource_id: <pipeline_identifier>
  org_id: <organization>
  project_id: <project>
  body: { yamlPipeline: "<updated pipeline YAML>" }
```

遇到校验错误时，检查 `verifySign` 形状、`image` 字段和公钥密钥引用。

#### 提供摘要

向用户报告结果（与 `/configure-repo-scan` 相同模式——**不要**执行流水线）：

```
## Artifact Verification Configured

**Pipeline:** <pipeline_name>
**Step:** Artifact Verification (SscaArtifactVerification)
**Location:** Stage "<stage_name>", <position>
**Source:** docker — <connector> — <image>
**Verify signature:** Keyless (Harness OIDC) — or as configured

**Pipeline URL:** https://app.harness.io/ng/account/<account_id>/module/ci/orgs/<org_id>/projects/<project_id>/pipelines/<pipeline_id>/pipeline-studio/

**Note:** Review the Artifact Verification step in Pipeline Studio to adjust Advanced settings.

### Next Steps
1. Run the pipeline via `/run-pipeline` to verify artifact verification executes successfully
2. If the run fails, diagnose with `/debug-pipeline`
3. View verification outcome on the execution **Supply Chain** tab
4. If **Failed**, confirm verify method matches signing; check public key for keybased
5. Add signing with `/sign-artifact` if signature was missing — ensure `uploadSignature.upload: true`
6. Add SBOM/SLSA if not present (`/manage-supply-chain` or pipeline `SscaOrchestration` / `provenance`)
7. Automate with `/create-trigger`
```

**CD 流水线：** 在摘要中注明运行时是否需要输入（服务制品、环境、基础设施、
制品标签/digest）——用户通过 `/run-pipeline` 或
Harness UI Run 提供这些。运行 CI+CD 时，检查 `runtime_input_template`——服务 `primaryArtifactRef: <+input>`
即使在模板只显示 `build` 时，也可能需要在 `inputs` 中提供制品标签/digest。

---

## 示例

### 在制品签名之后验证

```
/verify-sign
Add artifact verification after artifactsigning — public key account.cosign_public_key
```

### CD 在部署前

```
/verify-sign
Verify signed artifact in deploy stage before K8s rolling deploy — keyless verify
```

### HAR 验证

```
/verify-sign
Verify signature for HAR image payment-service:v2 — same registry as signing step
```

### Keyless 验证（匹配 keyless 签名）

```
/verify-sign
Verify with keyless Harness OIDC — same image as signing step
```

---

## 性能注意事项

- 仅**现有流水线**（可追加 Deploy 阶段）。
- **向导 UX 强制**——每轮一个问题。
- **复用签名来源**——与 `SscaArtifactSigning` 相同的小写 `source.type` 和 `image`。
- **字段是 `verifySign`**（camelCase）——不是 `verify_attestation`（SLSA）或 `signing`。
- **HAR 是一等来源**——`source.type: har`；即使 UI 只显示两个磁贴也要提供。
- **支持 CD 验证**——仅容器化步骤组；Deploy 中的签名不受支持。
- **不要在此技能中执行流水线**——配置后使用 `/run-pipeline`（与 `/configure-repo-scan` 相同）。
- 与 `/sign-artifact`（签名）配合使用——验证方法必须与签名匹配。

---

## 故障排查

### 无制品签名步骤
- 先添加 `/sign-artifact` 并上传签名或使用 Harness DB 签名存储。
- 扫描 `SscaArtifactSigning` 或 `identifier: artifactsigning`。

### 签名验证失败
- 验证方法必须与签名匹配（`keyless` vs `keybased`/`cosign`）。
- Keybased：使用**公**钥密钥（签名使用**私**钥）。
- 如果 `.sig` 不在镜像仓库中，签名步骤可能未设置 `uploadSignature.upload: true`（Harness
  默认未勾选）。更新签名步骤并重新运行，或依赖 Harness DB 签名存储。

### 多个签名步骤
- 询问用户镜像哪个 `SscaArtifactSigning` 步骤的来源、镜像和验证方法。

### Vault 验证失败
- 确认 Vault 连接器和公钥路径与签名的 `secret-manager` 块匹配。

### 镜像错误
- CI：使用与签名步骤 `source.spec.image` 相同的 `image`。
- CD：**默认使用** `<+artifact.image>`——静态签名标签（例如 `:v5`）可能不匹配服务
  制品（例如 `:v24`），验证将失败或验证错误的镜像。

### CD Deploy 失败——无 Delegate（`DELEGATE_NOT_AVAILABLE`）
- 症状：Deploy 立即失败；消息提到缺少 delegate 或选择器不匹配
  （例如 `Delegate(s) don't have selectors [ssca-prod2-at]`）。
- 修复：启动具有匹配选择器的 delegate（`/manage-delegates`），或选择由活动
  delegate 支撑的基础设施/K8s 连接器。delegate 健康后重新运行。

### CD YAML 校验错误（新 Deploy 阶段）
- `failureStrategies: is missing`——在 Deploy 阶段添加 `StageRollback`。
- `rollbackSteps[0].step.spec: is missing`——`K8sRollingRollback` 需要 `spec: {}`。
- 完整模板见 `references/cd-containerized-step-group.md`。

### YAML 校验错误
- 步骤 `type` 必须为 `SscaArtifactVerification`。
- Docker 来源需要 `connector` + `image`（不是 `repo` 或 `image_path`）。
- `verifySign`：优先扁平 `type: keyless`；keybased 使用 `type: cosign` + `public_key`。
- `DUPLICATE_IDENTIFIER`——重命名 `artifactverification`。

### CD 步骤错误
- 放在带 `stepGroupInfra` 的 `stepGroup` 内——而非顶层 `execution.steps`。
- 参见 `references/cd-containerized-step-group.md`。

### 用户在仅 CI 流水线上选择了 CD
- 预期——运行阶段 3b；除非用户改变方向，否则不要强制仅 CI。

### 连接器 / 基础设施列表不完整
- 使用 `harness_list` + `filters: { type: "DockerRegistry" }`（不是 `harness_search` 或
  `params.filterType`）。查询项目、组织和账户范围。对于基础设施，按
  环境列出并搭配 `filters: { environment_id: "<env>" }`——参见向导阶段 3b 和阶段 6。

### 流水线运行失败
- 使用 `/run-pipeline` 执行，使用 `/debug-pipeline` 诊断失败
- 缺少运行时输入：通过 `/run-pipeline` 或 Harness UI Run 提供分支/标签、制品标签/digest 或部署输入

### MCP 错误
- `CONNECTOR_NOT_FOUND`——在 Project Settings 中核实连接器；重新运行限定范围的 `harness_list`。
- `ACCESS_DENIED`——PAT 需要流水线编辑权限。
- **`harness_update` 超时**——重试一次；如果 MCP 持续超时，提供 YAML 供手动粘贴。
