---
name: sign-artifact
description: >-
  向现有 Harness 流水线添加制品签名（SscaArtifactSigning）步骤，以使用 keyless、基于密钥或 Vault 签名对
  容器或本地阶段制品进行 Cosign 签名。支持第三方
  镜像仓库（Docker、ECR、GCR、GAR、ACR）、Harness Artifact Registry（HAR）和 Harness Local Stage
  制品。放在镜像构建/推送之后；可选地将 .sig 上传到镜像仓库。仅适用于
  现有流水线。在要求签名制品、添加制品签名、Cosign 签名镜像、
  将签名附加到镜像仓库，或配置 SscaArtifactSigning 时使用。
  触发短语：签名制品、制品签名、签名镜像、Cosign sign、添加签名步骤、
  SscaArtifactSigning、附加签名、签名容器镜像、HAR 签名。
metadata:
  author: Harness
  version: 1.0.0
  mcp-server: harness-mcp-v2
  summary: Add Artifact Signing (Cosign sign + optional .sig upload) to existing pipelines (SSCA)
license: Apache-2.0
compatibility: Requires Harness MCP v2 server (harness-mcp-v2)
---

# 签名制品

向现有 Harness 流水线添加一个**制品签名**（`SscaArtifactSigning`）步骤。该步骤从镜像仓库或本地工作区检索制品，使用 Cosign 签名，并可选地将 `.sig` 签名文件推回镜像仓库。

此技能仅适用于**现有流水线**——不要创建独立的仅签名流水线。

**前置条件：** 容器镜像必须在签名之前已构建并推送（或已在镜像仓库中可用）。基于密钥的签名需要 Cosign 密钥对文件密钥（`/create-secret`）。Harness 文档指出**尚不支持 Deploy 阶段签名**——优先使用 CI 或 Security 阶段。

通过**逐步交互式向导**引导用户（与 `/verify-sign` 相同 UX）：

- 向导：`references/interactive-wizard-flow.md`
- UI ↔ YAML：`references/artifact-signing-step.md`
- CD 说明：`references/cd-containerized-step-group.md`

---

## 交互模型（强制）

1. **每轮一个问题**——可用时使用 `AskQuestion`；否则使用带 `(Recommended)` 的编号选项。
2. **开场消息**——在构建/推送之后添加制品签名；提及 keyless、基于密钥、Vault 和 HAR。
3. **进度面包屑**——流水线获取后：
   `Pipeline · Placement · Source · Details · Signing · Upload · Submit`
4. **记录答案**——运行摘要；除非用户改变方向，否则不要重复询问。
5. **先获取再配置**——在放置/来源问题之前 `harness_get`。
6. **展示流水线结构**——突出构建/推送和现有 `SscaArtifactSigning` 步骤。
7. **从构建/推送推断连接器**——从 YAML 明显时跳过连接器问题。
8. **绝不猜测镜像标签**——在阶段 7 始终询问镜像。
9. **写入前确认**——摘要 + 仅在用户确认后 `harness_update`。
10. **更新后停止**——成功 `harness_update` 后，提供配置摘要并
    指向 `/run-pipeline` 以执行。**不要**在此技能中调用 `harness_execute`、轮询
    执行或运行 `harness_diagnose`（与 `/configure-repo-scan` 相同模式）。
11. **阶段 3 放置是强制的**——始终运行阶段 2 然后阶段 3。
12. **与 SBOM/SLSA 顺序执行**——如果存在 `SscaOrchestration` 或 `provenance`，将签名顺序放在那些步骤**之后**（Cosign 镜像仓库竞态）。
13. **提供全部三个来源磁贴**——Third-Party、**Harness Artifact Registry（HAR）** 和 Harness Local Stage（即使 UI 截图只显示两个磁贴，YAML 中也支持 HAR）。
14. **现有签名步骤**——如果 `SscaArtifactSigning` 已存在，询问：就地更新、添加第二个步骤，还是中止。如果现有步骤 `uploadSignature.upload: false`（或块缺失）且用户想要镜像仓库中的 `.sig`，设置 `upload: true`。
15. **上传 `.sig` 在 Harness 中默认关闭**——UI 复选框 **Attach signature to Artifact Registry** 默认未勾选。对于容器镜像，**始终**设置 `uploadSignature.upload: true`，除非用户明确选择不使用。在阶段 9 和提交摘要中确认这一点。
16. **运行后验证 `.sig`**——当启用上传时，在用户通过 `/run-pipeline` 运行后，
    检查步骤日志中的签名推送成功；如果镜像仓库未显示签名标签，参见故障排查。
17. **阶段 6 前列出所有连接器**——绝不显示手动挑选的子集。在项目、组织和账户范围调用 `harness_list` 搭配
    `filters: { type: "<ConnectorType>" }` 和 `size: 100`；合并
    并在 `AskQuestion` 中呈现**每一个**匹配。参见 `references/interactive-wizard-flow.md` 阶段 6。
18. **更新时添加 CI `failureStrategies`**——将签名插入 CI 阶段时，确保该阶段
    具有带 `MarkAsFailure` 的 `failureStrategies`（不是 `Ignore`）。缺失或 `Ignore` 会将签名
    失败隐藏为 `IgnoreFailed`，而流水线继续。
19. **无构建/推送步骤时警告**——如果流水线没有镜像构建/推送步骤，警告签名
    将以预先存在的镜像仓库镜像为目标；确认标签存在且在签名前已推送。
20. **仅外科手术式 YAML**——`harness_update` 必须从本会话 `harness_get` 返回的**确切** `yamlPipeline` 开始。**仅**插入或更新 `SscaArtifactSigning` 步骤（以及需要时的 CI
    `failureStrategies`）。**绝不**添加、删除或重排其他步骤。**绝不**添加
    `HarnessSAST`、`HarnessSCA`、STO 扫描器或 `/configure-repo-scan` 步骤——仅在
    用户明确要求代码/容器扫描时才使用那些技能。

完整阶段提示词：`references/interactive-wizard-flow.md`。

---

## 说明

### 向导阶段

| 阶段 | 面包屑 | 操作 |
|-------|------------|--------|
| 0 | Pipeline | AskQuestion：流水线 URL 准备好了吗？ |
| 1 | Pipeline | 收集 URL → `harness_get` |
| 2 | Pipeline | 显示结构；注明构建/推送 + 现有签名步骤；标记缺少 `uploadSignature.upload: true` |
| 2b | Pipeline | 如果存在 `SscaArtifactSigning`——AskQuestion：更新、添加第二个，还是中止 |
| 3 | Placement | **强制** AskQuestion：阶段 + 位置 + 锚定推送步骤（建议构建/推送之后） |
| 4 | Source | AskQuestion：Third-Party、HAR 或 Local |
| 5 | Source | AskQuestion：镜像仓库提供方（仅 Third-Party） |
| 6 | Details | 连接器——通过 `harness_list` + `filters.type` 列出**所有**匹配（明显则跳过） |
| 7 | Details | 镜像 / 镜像仓库字段；可选 digest 表达式 |
| 8 | Signing | AskQuestion：keyless、keybased、vault |
| 9 | Upload | AskQuestion：将 `.sig` 附加到镜像仓库（仅容器镜像） |
| 10 | Submit | AskQuestion：确认流水线更新 |

阶段 10 `confirm` 后 → 生成 YAML、插入步骤、`harness_update`，然后提供摘要（不要运行流水线）。

### 支持的阶段类型

| 阶段类型 | 放置说明 |
|------------|-----------------|
| `CI` | **推荐**——紧接在 `BuildAndPush*` 或镜像推送步骤之后 |
| `Security` | 签名预构建镜像仓库镜像时在阶段末尾 |
| `Deployment` | 目前 Harness **不支持**——警告用户；优先 CI 签名 |

### 向导之后——后端步骤

#### 从流水线 YAML 提取连接器

从 `BuildAndPushDockerRegistry`、`BuildAndPushECR`、`BuildAndPushGCR`、`BuildAndPushGAR`、
`BuildAndPushACR`、Kaniko/`Run` 推送步骤、`SscaOrchestration`、`SscaArtifactSigning` 或
`provenance` 步骤——复用 `connectorRef` / `connector`。签名来源使用 `connector`（不是
`connectorRef`）。

#### 生成制品签名步骤 YAML

**仅使用向导答案**。Docker Third-Party 使用 `source.spec.image`（不是 `repo`）。

**Docker 镜像仓库——基于密钥的签名（Harness 文档参考）：**

```yaml
- step:
    identifier: artifactsigning
    name: Artifact Signing
    type: SscaArtifactSigning
    spec:
      source:
        type: docker
        spec:
          connector: lavakush07
          image: lavakush07/easy-buggy-app:v5
      signing:
        type: cosign
        spec:
          private_key: account.cosign_private_key
          password: account.cosign_password
      uploadSignature:
        upload: true
    timeout: 15m
```

**Keyless 签名（Harness OIDC）——推送 `.sig` 时包含 upload：**

```yaml
      signing:
        type: keyless
        spec:
          oidcProvider: harness
      uploadSignature:
        upload: true
```

**非 Harness keyless OIDC**（需要账户的 Connector for Keyless Signing）：

```yaml
      signing:
        type: keyless
        spec:
          oidcProvider: non-harness
      uploadSignature:
        upload: true
```

**Harness Artifact Registry（HAR）：**

```yaml
      source:
        type: har
        spec:
          registry: <har_registry_identifier>
          image: my-image:v5
```

**Harness Local Stage（非容器）：**

```yaml
      source:
        type: local
        spec:
          workspace: <path_in_workspace>
          artifact_name: my-artifact.jar
          version: "1.0.0"
```

**无镜像仓库上传：** 省略 `uploadSignature` 或设置 `upload: false`。Harness 仍会在内部存储签名
元数据——但外部工具和镜像仓库侧验证需要 `upload: true`。

**Amazon ECR / GCR / GAR / ACR：** 参见 `references/artifact-signing-step.md`——当用户期望镜像仓库中有 `.sig` 时，始终包含
`uploadSignature.upload: true`。

#### 将步骤插入流水线 YAML

**关键：** 解析来自 `harness_get` 的 `yamlPipeline` 并将其视为唯一真相来源。不要
从示例、模板或假设重建流水线（例如 `cloneCodebase: true` **并不**
意味着有 Harness Code Scan 步骤）。

- 在阶段 3 放置处插入——在构建/推送**之后**（或存在 SBOM/SLSA 时在其后）。
- 不要修改无关步骤、变量或失败策略——**除非**该阶段没有或使用 `Ignore` 时添加 CI
  `failureStrategies`（使用 `MarkAsFailure`）。
- `harness_update` 之前，在心里 diff：步骤数必须最多增加**一个**（如果
  更新现有 `SscaArtifactSigning` 则增加零个）。如果出现任何新步骤类型（例如 `HarnessSAST`），
  停止并修复 YAML——不要保存。
- 步骤标识符：`artifactsigning`（若重复则用 `artifactsigning_2` 等）。不支持 CD Deploy 放置
  ——不要为签名步骤使用 `_cd` 后缀。

**CI 阶段必须包含 `failureStrategies`**（API 可能接受不带它的保存，但签名失败时运行会显示
`IgnoreFailed`）：

```yaml
failureStrategies:
  - onFailure:
      errors: [AllErrors]
      action:
        type: MarkAsFailure
```

#### 通过 MCP 更新流水线

```
harness_update
  resource_type: pipeline
  resource_id: <pipeline_identifier>
  org_id: <organization>
  project_id: <project>
  body: { yamlPipeline: "<updated pipeline YAML>" }
```

遇到校验错误时，读取 API 消息。常见修复：`image` vs `repo`、`signing` vs `attestation`、
基于密钥 cosign 的 `private_key` / `password` 密钥引用。

#### 提供摘要

向用户报告结果（与 `/configure-repo-scan` 相同模式——**不要**执行流水线）：

```
## Artifact Signing Configured

**Pipeline:** <pipeline_name>
**Step:** Artifact Signing (SscaArtifactSigning)
**Location:** Stage "<stage_name>", <position>
**Source:** docker — <connector> — <image>
**Signing:** Keyless (Harness OIDC) — or as configured
**Upload .sig:** Yes / No

**Pipeline URL:** https://app.harness.io/ng/account/<account_id>/module/ci/orgs/<org_id>/projects/<project_id>/pipelines/<pipeline_id>/pipeline-studio/

**Note:** Review the Artifact Signing step in Pipeline Studio to adjust Advanced settings.

**Signature:** After a successful run, view on the Supply Chain tab and Chain of Custody.

### Next Steps
1. Run the pipeline via `/run-pipeline` to verify the Artifact Signing step executes successfully
2. If the run fails, diagnose with `/debug-pipeline`
3. If **no `.sig` in registry**, confirm `uploadSignature.upload: true` — see Troubleshooting
4. Add verification with `/verify-sign`
5. Add SBOM/SLSA **before** signing if not present (`/manage-supply-chain` or `SscaOrchestration` / `provenance`)
6. Automate with `/create-trigger`
```

---

## 示例

### Docker 构建/推送之后——基于密钥签名 + 上传 .sig

```
/sign-artifact
Add artifact signing after docker push — lavakush07/easy-buggy-app:v5, key-based with account cosign secrets, upload signature
```

### Harness Cloud 上的 Keyless

```
/sign-artifact
Use defaults — keyless Harness OIDC after Build_and_Push, attach signature to registry
```

### Harness Artifact Registry

```
/sign-artifact
Sign image my-service:v2 from Harness Artifact Registry registry-id prod-har — keyless
```

### 放置必须明确

```
/sign-artifact
add signing to the pipeline
```

Agent 仍必须运行阶段 2 + 阶段 3——不要假定阶段或跳过放置。

### 修复镜像仓库中缺少 `.sig`

```
/sign-artifact
Signing step succeeded but no .sig in Docker Hub — update existing artifactsigning step to upload signature
```

Agent 必须检查现有 YAML 中的 `uploadSignature`、设置 `upload: true`、确保签名在构建/推送**之后**顺序运行，
然后通过 `/run-pipeline` 运行流水线。

---

## 性能注意事项

- 仅**现有流水线**——不要创建独立的签名流水线。
- **向导 UX 是强制的**——每轮一个问题；参见 `references/interactive-wizard-flow.md`。
- **Docker 来源使用 `image`**——不是 `repo`（SLSA `provenance` 使用 `repo`；SBOM 使用 `image`）。
- **签名块是 `signing`**——不是 `attestation`（SLSA 生成）或 `verifySign`（验证）。
- **HAR 是一等来源**——`source.type: har` 搭配 `registry` + `image`；即使 UI 只显示 Third-Party + Local 磁贴也要提供。
- **不支持 Deploy 阶段签名**——如果用户选择 CD Deploy 放置则警告。
- **上传 .sig**——仅容器镜像；映射到 `uploadSignature.upload: true`。Harness UI 默认将其
  **取消勾选**——块缺失 = 无镜像仓库上传。
- **一个签名步骤 = 一个镜像**——monorepo 需要多个步骤或每个镜像顺序运行。
- **基于密钥的签名**——私钥 + 密码必须是 Harness **文件密钥**（`/create-secret`）。
- **不要在此技能中执行流水线**——配置后使用 `/run-pipeline`（与 `/configure-repo-scan` 相同）。
- 不要用于仅仪表盘的 SSCA 配置——请改用 `/manage-supply-chain`。

---

## 故障排查

### 流水线未找到
- 核实 org/project；`harness_list`（resource_type: `pipeline`）。

### 连接器未找到
- 在构建/推送步骤中搜索 `connectorRef`。
- 用 `harness_list` + `filters: { type: "DockerRegistry" }` 列出连接器（不是 `harness_search`，也不是
  `params.filterType`）。查询项目、组织和账户范围；参见阶段 6
  `references/interactive-wizard-flow.md`。

### 镜像未找到 / 无效引用
- Docker：单个 `image` 字符串——例如 `lavakush07/easy-buggy-app:v5`。
- HAR：`registry` 标识符 + 带标签或 digest 的 `image` 名称。

### 签名失败（基于密钥）
- 核实文件密钥存在且 Cosign 密钥为 `ecdsa-p256`。
- 如果 `keybased` 校验失败，尝试 `signing.type: cosign` 搭配 `private_key` + `password`。
- JFrog 镜像仓库需要额外的连接器权限才能上传签名。

### 签名失败（Keyless）
- 需要 Harness CI 执行上下文；为 non-harness OIDC 配置 Connector for Keyless Signing。

### `.sig` 不在镜像仓库中（步骤成功）
最常见原因：**`uploadSignature.upload` 缺失或为 `false`**。Harness 将 UI 复选框
**Attach signature to Artifact Registry** 默认为未勾选——签名仅存储在 Harness 中。

**修复检查清单：**
1. 在 `SscaArtifactSigning` 步骤上设置 `uploadSignature.upload: true`（仅容器镜像）。
2. 更新 YAML 后重新运行流水线——现有的成功运行不会追溯上传。
3. 确认签名步骤使用与构建/推送步骤**相同的连接器和镜像标签**。
4. 将签名**顺序放在**构建/推送**之后**——不要与推送、SBOM 或 SLSA 并行。
5. 检查步骤日志中的上传/推送错误（403 = 连接器缺少推送签名标签的写权限）。
6. **Docker Hub / OCI 镜像仓库：** Cosign 将签名作为单独的 manifest 标签（例如
   `sha256-<digest>.sig`）或 OCI referrer 推送——在 UI 中并不总是显示为 `.sig` 文件。使用
   `cosign verify` CLI 或 Harness Supply Chain 标签确认。
7. **JFrog Artifactory：** 连接器需要有权限在镜像旁推送签名制品。
8. **ECR/GCR/GAR/ACR：** 连接器必须有推送权限；如果在推送和签名之间标签被覆盖，
   使用 digest 固定。

### SBOM / SLSA / 签名竞态
- 症状：镜像仓库中缺少 `.sig` 或证明——步骤并行运行了。
- 修复：重新排序——在同一阶段按 build/push → SBOM → SLSA → 签名顺序执行。

### 现有签名步骤无上传
- 检查 YAML：如果 `uploadSignature` 缺失，Harness 将上传视为禁用。
- 询问用户：用 `upload: true` 更新现有步骤，还是添加新步骤。

### 不支持 Deploy 阶段
- Harness 文档：Deploy 阶段中的制品签名在路线图上——改用 CI 阶段。

### YAML 校验错误
- 步骤 `type` 必须为 `SscaArtifactSigning`。
- Docker 来源需要 `connector` + `image`（不是 `repo`）。
- `uploadSignature.upload` 是布尔值——UI 复选框 "Attach signature to Artifact Registry"。

### 跳过了 Placement
- 从阶段 2 重新运行向导；明确询问阶段 + 位置。

### 流水线运行失败
- 使用 `/run-pipeline` 执行，使用 `/debug-pipeline` 诊断失败
- 对于 codebase 流水线，通过 `/run-pipeline` 将分支/标签映射到 `inputs`
- 如果阶段状态为 **`IgnoreFailed`**，签名很可能失败——检查 `artifactsigning` 步骤日志；
  在 CI 阶段添加或修复 `failureStrategies: MarkAsFailure`

### 签名步骤失败但流水线继续（`IgnoreFailed`）
- CI 阶段缺少 `failureStrategies` 或使用 `Ignore` / 非阻塞失败策略。
- 修复：在 CI 阶段设置 `failureStrategies` → `MarkAsFailure`，然后重新运行。

### 更新后出现意外的 Harness Code Scan / STO 步骤
- 原因：代理发送了**重建的**完整 `yamlPipeline`，而非获取的 YAML + 签名插入。
- 修复：`harness_get` 流水线，从 YAML 中**删除**不需要的 `HarnessSAST` / STO 步骤，通过
  `harness_update` 保存，或在 Pipeline Studio 中移除该步骤。
- 预防：遵循规则 **20（仅外科手术式 YAML）**——此技能中绝不添加扫描步骤。

### MCP 错误
- `CONNECTOR_NOT_FOUND`——核实连接器标识符。
- `ACCESS_DENIED`——PAT 需要流水线编辑权限。
- **`harness_update` 超时**——重试一次；如果 MCP 气泡超时，提供 YAML 摘要供在
  Pipeline Studio 中手动粘贴。
