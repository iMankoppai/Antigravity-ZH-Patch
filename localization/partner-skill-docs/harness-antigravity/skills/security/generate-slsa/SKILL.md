---
name: generate-slsa
description: >-
  向现有 Harness 流水线添加 SLSA Generation 步骤（YAML 类型：provenance），以生成 SLSA
  来源，并可选地使用 Cosign 证明（keyless、基于密钥或 Vault）。支持容器
  镜像（Docker、ECR、GCR、GAR、ACR、HAR）和 Harness Local Stage 制品。放在镜像
  构建/推送之后；在 SBOM 步骤之后顺序运行，而非并行。仅适用于现有流水线。
  在要求生成 SLSA、添加 SLSA 来源、SLSA Generation 步骤、证明 SLSA，或
  在流水线中配置 SLSA Level 3 来源时使用。
  触发短语：生成 SLSA、SLSA generation、添加 SLSA 步骤、SLSA 来源、证明 SLSA、
  SlsaGeneration、provenance 步骤、SLSA 证明、添加 provenance 步骤。
metadata:
  author: Harness
  version: 1.0.0
  mcp-server: harness-mcp-v2
  summary: Add SLSA Generation (provenance + optional Cosign attestation) to existing pipelines
license: Apache-2.0
compatibility: Requires Harness MCP v2 server (harness-mcp-v2)
---

# 生成 SLSA

向现有 Harness 流水线添加一个 **SLSA Generation** 步骤，以生成 SLSA 来源，并可选地对容器镜像仓库中的 `.att` 文件进行证明/签名。流水线 YAML 使用 `type: provenance`（UI 标签：SLSA Generation；不要使用 `SlsaGeneration`——API 会拒绝它）。

此技能仅适用于**现有流水线**——不要创建独立的仅 SLSA 流水线。

**前置条件：** 在 SLSA 运行之前，镜像必须已构建并推送（或已在镜像仓库中可用）。基于密钥的证明需要 Cosign 密钥对密钥（`/create-secret`）。使用托管基础设施时，Harness Cloud 构建会启用 SLSA Level 3 来源。

通过**逐步交互式向导**引导用户（与 `/configure-repo-scan` 相同 UX）：

- 向导：`references/interactive-wizard-flow.md`
- UI ↔ YAML：`references/slsa-generation-step.md`
- CD 容器化步骤组：`references/cd-containerized-step-group.md`

---

## 交互模型（强制）

1. **每轮一个问题**——可用时使用 `AskQuestion`；否则使用带 `(Recommended)` 的编号选项。
2. **开场消息**——在镜像构建/推送之后添加 SLSA Generation；提及证明选项。
3. **进度面包屑**——流水线获取后：
   `Pipeline · Placement · Source · Details · Attestation · Submit`
4. **记录答案**——运行摘要；除非用户改变方向，否则不要重复询问。
5. **先获取再配置**——在放置/来源问题之前 `harness_get`。
6. **展示流水线结构**——突出构建/推送步骤和现有 `provenance` / `SscaOrchestration` 步骤（UI：SLSA Generation）。
7. **从构建/推送推断连接器**——从 YAML 明显时跳过连接器问题。
8. **绝不猜测镜像标签**——在阶段 7 始终询问镜像/代码仓库。
9. **写入前确认**——摘要 + 仅在用户确认后 `harness_update`。
10. **更新后停止**——成功 `harness_update` 后，提供配置摘要并
    指向 `/run-pipeline` 以执行。**不要**在此技能中调用 `harness_execute`、轮询
    执行或运行 `harness_diagnose`（与 `/configure-repo-scan` 相同模式）。
11. **阶段 3 放置是强制的**——始终运行阶段 2 然后阶段 3，即使只有一个 CI 阶段或先前的会话上下文。
12. **与 SBOM 顺序执行**——如果存在 `SscaOrchestration`，将 SLSA 放在其**之后**；绝不并行（Cosign 竞态）。
13. **CD 路径**——Deploy 阶段步骤仅放在容器化 `stepGroup` 内——参见 CD 参考。

完整阶段提示词：`references/interactive-wizard-flow.md`。

---

## 说明

### 向导阶段

| 阶段 | 面包屑 | 操作 |
|-------|------------|--------|
| 0 | Pipeline | AskQuestion：流水线 URL 准备好了吗？ |
| 1 | Pipeline | 收集 URL → `harness_get` |
| 2 | Pipeline | 显示结构；注明构建/推送 + SBOM 步骤 |
| 3 | Placement | **强制** AskQuestion：阶段 + 位置（建议构建/推送之后） |
| 3b | Placement（CD） | 如果新建 Deploy 阶段，则服务、环境、基础设施、步骤组 |
| 4 | Source | AskQuestion：Third-Party、HAR 或 Local |
| 5 | Source | AskQuestion：镜像仓库提供方（仅 Third-Party） |
| 6 | Details | 连接器（明显则跳过） |
| 7 | Details | 镜像/代码仓库；可选 digest 表达式 |
| 8 | Attestation | AskQuestion：keyless、keybased、vault 或 none |
| 9 | Submit | AskQuestion：确认流水线更新 |

阶段 9 `confirm` 后 → 生成 YAML、插入步骤、`harness_update`，然后提供摘要（不要运行流水线）。

### 支持的阶段类型

| 阶段类型 | 放置说明 |
|------------|-----------------|
| `CI` | **推荐**——紧接在 `BuildAndPush*` 或镜像推送 `Run` 步骤之后 |
| `Deployment` | 仅容器化步骤组；部署之前——生成时少见 |
| `Security` | 扫描预构建镜像仓库镜像时在阶段末尾 |

### 向导之后——后端步骤

#### 从流水线 YAML 提取连接器

从 `BuildAndPushDockerRegistry`、`BuildAndPushECR`、`Run`、`Plugin`、`SscaOrchestration`、
`provenance`（SLSA Generation）或 `SscaArtifactSigning` 步骤——复用 `connectorRef` / `connector`。

#### 生成 SLSA 步骤 YAML

**仅使用向导答案**。默认证明：当用户选择默认值时使用 keyless Harness OIDC。

**Docker 镜像仓库——匹配参考 UI（基于密钥的证明）：**

```yaml
- step:
    identifier: slsageneration
    name: slsa-generation
    type: provenance
    spec:
      source:
        type: docker
        spec:
          connector: lavakush07
          repo: lavakush07/easy-buggy-app:blog
      attestation:
        type: keybased
        spec:
          privateKey: account.cosign_private_key
          password: account.cosign_password
    timeout: 15m
```

**Keyless 证明（"use defaults" 的默认）：**

```yaml
      attestation:
        type: keyless
        spec:
          oidcProvider: harness
```

**使用来自 Build and Push 的 digest：**

```yaml
      source:
        type: docker
        spec:
          connector: <docker_registry_connector>
          repo: <org>/<repo>:<tag>
          digest: <+pipeline.stages.<stage>.spec.execution.steps.<build_step>.output.outputVariables.digest>
```

**Amazon ECR：**

```yaml
      source:
        type: ecr
        spec:
          connector: <registry_connector>
          image: <repo/name>
          region: <aws_region>
          account: <aws_account_id>
```

**Google GCR / GAR / Azure ACR / HAR / Local：** 参见 `references/slsa-generation-step.md`。

**无证明：** 省略 `attestation` 块。

#### 将步骤插入流水线 YAML

- 在阶段 3 放置处插入——在构建/推送**之后**（或当二者都存在时在 `generate_sbom` 之后）。
- 不要修改无关步骤、变量或失败策略。
- 步骤标识符：`slsageneration`（当 CI 已有一个时在 CD 中加 `_cd` 后缀）。
- **CD：** 仅在容器化 `stepGroup.steps` 内。

#### 通过 MCP 更新流水线

```
harness_update
  resource_type: pipeline
  resource_id: <pipeline_identifier>
  org_id: <organization>
  project_id: <project>
  body: { yamlPipeline: "<updated pipeline YAML>" }
```

遇到校验错误时，读取 API 消息、修复字段（通常是 `repo` vs `image`、证明 spec）、重试。

#### 提供摘要

向用户报告结果（与 `/configure-repo-scan` 相同模式——**不要**执行流水线）：

```
## SLSA Generation Configured

**Pipeline:** <pipeline_name>
**Step:** SLSA Generation (`provenance`)
**Location:** Stage "<stage_name>", <position>
**Source:** docker — <connector> — <repo/image>
**Attestation:** Key-based (account.cosign_private_key) — or as configured

**Pipeline URL:** https://app.harness.io/ng/account/<account_id>/module/ci/orgs/<org_id>/projects/<project_id>/pipelines/<pipeline_id>/pipeline-studio/

**Note:** Review the SLSA Generation step in Pipeline Studio to adjust Advanced settings.

**Provenance:** After a successful run, view on the Supply Chain tab and in SCS Artifacts.

### Next Steps
1. Run the pipeline via `/run-pipeline` to verify the SLSA Generation step executes successfully
2. If the run fails, diagnose with `/debug-pipeline`
3. Add SLSA verification with `/enforce-slsa`
4. Pair with `SscaOrchestration` (Generate SBOM) — run SBOM then SLSA sequentially
5. Automate with `/create-trigger`
```

**CD 流水线：** 在摘要中注明运行时是否需要输入（服务制品、环境、基础设施）——用户通过 `/run-pipeline` 或 Harness UI Run 提供这些。

---

## 示例

### Docker 构建/推送之后——基于密钥的证明（参考 UI）

```
/generate-slsa
Add SLSA Generation to my CI pipeline after docker push — lavakush07/easy-buggy-app:blog, key-based attest with account cosign secrets
```

### Harness Cloud 上的 Keyless 默认值

```
/generate-slsa
Use defaults — keyless Harness OIDC after Build_and_Push step
```

### 使用 digest 表达式

```
/generate-slsa
Generate SLSA for image from Build_and_Push digest output — keyless attest
```

### 放置必须明确

```
/generate-slsa
add slsa to the pipeline
```

Agent 仍必须运行阶段 2 + 阶段 3——不要假定阶段或跳过放置。

---

## 性能注意事项

- 仅**现有流水线**——不要创建独立的 SLSA 流水线（可为 CD 追加 Deploy 阶段）。
- **向导 UX 是强制的**——每轮一个问题；参见 `references/interactive-wizard-flow.md`。
- **在构建/推送之后放置**——SLSA 需要已发布的镜像（标签或 digest）。
- **与 SBOM 顺序执行**——绝不并行 SBOM + SLSA 证明（Cosign 镜像仓库竞态）。
- **YAML 步骤 `type` 是 `provenance`**——不是 `SlsaGeneration`（API 枚举拒绝 `SlsaGeneration`）。
- Docker UI 的 **Image** 字段 → YAML `source.spec.repo`（不是 `image`；SBOM `SscaOrchestration` 对 docker 使用 `image`）。
- **基于密钥的证明**——私钥 + 密码必须是 Harness **文件密钥**（`/create-secret`）。
- **CD 生成罕见**——优先 CI 生成 + CD `/enforce-slsa`；参见 CD 参考。
- **不要在此技能中执行流水线**——配置后使用 `/run-pipeline`（与 `/configure-repo-scan` 相同）。
- 不要用于仅仪表盘的 SSCA 配置——请改用 `/manage-supply-chain`。

---

## 故障排查

### 流水线未找到
- 核实 org/project；`harness_list`（resource_type: `pipeline`）。

### 连接器未找到
- 在构建/推送步骤中搜索 `connectorRef`；对 Docker 镜像仓库连接器使用 `harness_search`。

### 镜像未找到 / 无效引用
- 使用单个 `repo` 字符串——例如 `lavakush07/easy-buggy-app:blog`。
- 症状：来源生成失败——在运行时确认镜像存在。

### 证明失败（基于密钥）
- 核实文件密钥存在且 Cosign 密钥为 `ecdsa-p256`。
- 密码密钥必须与密钥对生成密码匹配。
- JFrog 镜像仓库需要额外的连接器权限才能上传 `.att`。

### 证明失败（Keyless）
- 需要 Harness CI 执行上下文；为 non-harness OIDC 配置 Connector for Keyless Signing。

### SBOM + SLSA 竞态
- 症状：镜像仓库中只有一个 `.att`——步骤并行运行了。
- 修复：重新排序——在同一阶段中先 SBOM 再 SLSA 顺序执行。

### CD 校验错误
- Deploy 阶段中的 `provenance`（SLSA Generation）必须在带 `stepGroupInfra` 的 `stepGroup` 内。
- 参见 `references/cd-containerized-step-group.md`。

### YAML 拒绝 `SlsaGeneration` 步骤类型
- 症状：`SlsaGeneration` 的 `does not have a value in the enumeration`。
- 修复：使用 `type: provenance`——用 `harness_schema(resource_type="pipeline", path="steps")` 验证。

### 跳过了 Placement
- 从阶段 2 重新运行向导；明确询问阶段 + 位置。

### 流水线运行失败
- 使用 `/run-pipeline` 执行，使用 `/debug-pipeline` 诊断失败
- 核实镜像存在于镜像仓库且 Cosign 密钥是有效的文件密钥
- CD：通过 `/run-pipeline` 或 Harness UI Run 提供服务/环境/基础设施输入——不要猜测运行时输入

### MCP 错误
- `CONNECTOR_NOT_FOUND`——核实连接器标识符。
- `ACCESS_DENIED`——PAT 需要流水线编辑权限。
