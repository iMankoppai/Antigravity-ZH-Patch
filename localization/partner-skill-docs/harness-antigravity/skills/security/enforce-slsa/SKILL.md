---
name: enforce-slsa
description: >-
  向现有 Harness 流水线添加 SLSA 验证（SlsaVerification）步骤，以验证 SLSA
  来源证明，并可选地对来源数据执行 OPA 策略集。支持 CI 和
  CD（Deployment），包括仅 CI 流水线——在部署前验证时通过阶段 3b 追加 Deploy 阶段。
  支持 Docker、ECR、GCR、GAR、ACR、HAR 和 Local 制品。仅适用于
  现有流水线。在要求验证 SLSA、执行 SLSA 策略、添加 SLSA 验证
  步骤、校验 SLSA 证明，或以 SLSA 来源门控部署时使用。
  触发短语：执行 SLSA、SLSA 验证、验证 SLSA、SLSA 策略执行、
  SlsaVerification、验证 SLSA 证明、添加 SLSA 验证步骤。
metadata:
  author: Harness
  version: 1.0.0
  mcp-server: harness-mcp-v2
  summary: Add SLSA Verification (verify attestation + OPA policy sets on provenance) to pipelines
license: Apache-2.0
compatibility: Requires Harness MCP v2 server (harness-mcp-v2)
---

# 执行 SLSA

向现有 Harness 流水线添加一个 **SLSA Verification**（`SlsaVerification`）步骤。该步骤验证 SLSA 来源证明（启用时），并可选地针对来源数据评估 OPA 策略集。

此技能仅适用于**现有流水线**——不要创建独立的仅验证流水线。

**前置条件：** 制品必须已存在 SLSA 来源（通常来自 `/generate-slsa` 的 `provenance` 步骤——UI 标签 SLSA Generation）。可选的**策略集**用于来源执行（`/create-policy`、`harness_list` `policy_set`）。

**支持的阶段：** CI、CD（`Deployment`）和 Security。CD 需要**容器化步骤组**。与 SBOM 执行不同，CI 和 CD 都使用 **`SlsaVerification`**（没有单独的 CD 步骤类型）。

通过**逐步交互式向导**引导用户（与 `/generate-slsa` 相同 UX）：

- 向导：`references/interactive-wizard-flow.md`
- UI ↔ YAML：`references/slsa-verification-step.md`
- CD 容器化步骤组：`skills/security/generate-slsa/references/cd-containerized-step-group.md`

---

## 交互模型（强制）

1. **每轮一个问题**——可用时使用 `AskQuestion`；否则使用带 `(Recommended)` 的编号选项。
2. **开场消息**——添加 SLSA Verification；提及生成 + 可选策略前置条件。
3. **进度面包屑**——流水线获取后：
   `Pipeline · Placement · Source · Details · Verify · Policy · Submit`
4. **记录答案**——运行摘要；除非用户改变方向，否则不要重复询问。
5. **先获取再配置**——在放置/来源问题之前 `harness_get`。
6. **展示流水线结构**——突出 `provenance`（SLSA Generation）和连接器。
7. **从生成推断来源**——当存在一个 `provenance` 步骤（或 `identifier: slsageneration`）时，复用其来源（将 `repo` → `image_path`、小写 → PascalCase 类型）。
8. **绝不猜测镜像标签**——默认来自生成步骤；含糊时询问。
9. **写入前确认**——摘要 + 仅在用户确认后 `harness_update`。
10. **更新后停止**——成功 `harness_update` 后，提供配置摘要并
    指向 `/run-pipeline` 以执行。**不要**在此技能中调用 `harness_execute`、轮询
    执行或运行 `harness_diagnose`（与 `/configure-repo-scan` 相同模式）。
11. **仅在 CI 流水线上的 CD**——不要拒绝 CD 验证；运行阶段 3b 添加 Deploy 阶段 + 容器化组。
12. **验证方法必须与生成匹配**——keyless ↔ keyless、keybased ↔ 同一密钥对的公钥。

完整阶段提示词：`references/interactive-wizard-flow.md`。

---

## 说明

### 向导阶段

| 阶段 | 面包屑 | 操作 |
|-------|------------|--------|
| 0 | Pipeline | AskQuestion：流水线 URL 准备好了吗？ |
| 1 | Pipeline | 收集 URL → `harness_get` |
| 2 | Pipeline | 显示结构；注明缺少 `provenance`（SLSA Generation）步骤 |
| 3 | Placement | AskQuestion：生成之后、CD 部署前等 |
| 3b | Placement（CD） | 如果新建 Deploy 阶段，则服务、环境、基础设施、步骤组 |
| 4 | Source | 从生成推断或选择镜像仓库磁贴 |
| 5 | Source | 镜像仓库提供方（仅 Third-Party） |
| 6 | Details | 连接器（明显则跳过） |
| 7 | Details | 镜像 / image_path（默认来自生成） |
| 8 | Verify | AskQuestion：验证证明方法 |
| 9 | Policy | AskQuestion：策略集或跳过 |
| 10 | Submit | AskQuestion：确认流水线更新 |

阶段 10 `confirm` 后 → 插入步骤、`harness_update`，然后提供摘要（不要运行流水线）。

### 支持的阶段类型

| 阶段类型 | 步骤 `type` | 放置说明 |
|------------|-------------|-----------------|
| `CI` | `SlsaVerification` | 同一阶段中 `provenance` / `slsageneration` **之后** |
| `Deployment` | `SlsaVerification` | 容器化步骤组；部署**之前** |
| `Security` | `SlsaVerification` | 制品在镜像仓库中时在生成之后 |

### CD 边界情况

如果没有 `Deployment` 阶段且用户选择 CD 验证：

> No CD Deploy stage yet. We can add a **Deployment** stage with a **containerized step group** and
> place **SLSA Verification** before deploy.

运行阶段 3b（服务、环境、基础设施、`stepGroupInfra`）——镜像 `/generate-slsa` 阶段 3b。
使用 `skills/security/generate-slsa/references/cd-containerized-step-group.md` 配合 `SlsaVerification`。

### 向导之后——后端步骤

#### 检查前置条件

1. **SLSA 生成**——流水线包含 `type: provenance`（SLSA Generation）或用户确认来源存在。
2. **策略集**（可选）——`harness_list(resource_type="policy_set")`。如果用户想要策略
   执行且不存在，在继续之前引导到 `/create-policy`。

#### 从流水线 YAML 提取上下文

从 `provenance` 步骤（如果存在——也匹配 `identifier: slsageneration`）复制并转换：

| 生成 | 验证 |
|------------|--------------|
| `source.type: docker` | `source.type: Docker` |
| `source.spec.repo` | `source.spec.image_path` |
| `source.spec.connector` | `source.spec.connector` |
| `spec.attestation` | 匹配的 `verify_attestation`（keybased 时私钥 → 公钥） |

#### 生成 SLSA 验证步骤 YAML

**CI / Security——Docker 镜像仓库，keyless 验证：**

```yaml
- step:
    identifier: slsaverification
    name: SLSA Verification
    type: SlsaVerification
    spec:
      source:
        type: Docker
        spec:
          connector: lavakush07
          image_path: lavakush07/easy-buggy-app:blog
      verify_attestation:
        type: keyless
        spec:
          oidcProvider: harness
    timeout: 15m
```

**基于密钥的验证**（生成使用 `keybased` + 私钥）：

```yaml
      verify_attestation:
        type: keybased
        spec:
          publicKey: account.cosign_public_key
```

如果 API 校验拒绝扁平的 `keyless` / `keybased`，用嵌套的 `cosign` 包装重试——参见
`references/slsa-verification-step.md`。

**策略执行**（Advanced 标签——步骤级 `enforce`）：

```yaml
    enforce:
      policySets:
        - slsa_provenance_rules
```

**无证明验证**（仅策略）：省略 `verify_attestation`。

**CD Deploy**——容器化 `stepGroup` 内相同步骤类型；验证服务制品时对 `image_path` 使用 `<+artifact.image>`。

完整提供方映射：`references/slsa-verification-step.md`。

#### 将步骤插入流水线 YAML

- 在阶段 3 放置处插入——尽可能在 `slsageneration` **之后**。
- 不要修改无关步骤。
- 步骤标识符：`slsaverification`（当 CI 已有一个时在 CD 中使用 `slsaverification_cd`）。
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

遇到校验错误时，检查 PascalCase 的 `source.type`、`image_path` vs `repo`，以及 `verify_attestation`
形状（优先扁平 `keyless`；回退嵌套 `cosign`）。

#### 提供摘要

向用户报告结果（与 `/configure-repo-scan` 相同模式——**不要**执行流水线）：

```
## SLSA Verification Configured

**Pipeline:** <pipeline_name>
**Step:** SLSA Verification (SlsaVerification)
**Location:** Stage "<stage_name>", <position>
**Source:** Docker — <connector> — <image_path>
**Verify attestation:** Keyless (Harness OIDC) — or as configured
**Policy sets:** <list or none>

**Pipeline URL:** https://app.harness.io/ng/account/<account_id>/module/ci/orgs/<org_id>/projects/<project_id>/pipelines/<pipeline_id>/pipeline-studio/

**Note:** Review the SLSA Verification step in Pipeline Studio to adjust Advanced settings.

### Next Steps
1. Run the pipeline via `/run-pipeline` to verify SLSA verification executes successfully
2. If the run fails, diagnose with `/debug-pipeline`
3. View verification outcome on the execution **Supply Chain** tab
4. If **Failed** due to policy deny, tune policies via `/create-policy`
5. Add generation with `/generate-slsa` if provenance was missing
6. Automate with `/create-trigger`
```

**CD 流水线：** 在摘要中注明运行时是否需要输入（服务制品、环境、基础设施）——用户通过 `/run-pipeline` 或 Harness UI Run 提供这些。

---

## 示例

### 在 SLSA Generation 之后验证

```
/enforce-slsa
Add SLSA verification after slsa-generation — keyless verify, policy set slsa_prod_rules
```

### CD 在部署前

```
/enforce-slsa
Verify SLSA in deploy stage before K8s rolling deploy for easy-buggy-app:blog
```

### 基于密钥的验证（匹配 keybased 生成）

```
/enforce-slsa
Verify SLSA with public key account.cosign_public_key — same image as generation step
```

---

## 性能注意事项

- 仅**现有流水线**（可追加 Deploy 阶段）。
- **向导 UX 强制**——每轮一个问题。
- **复用生成来源**——扫描 `type: provenance` 或 `identifier: slsageneration`；映射 `repo` → `image_path`、小写 → PascalCase 类型。
- **验证的 `source.type` 是 PascalCase**（`Docker`）——生成使用小写（`docker`）。
- **`verify_attestation`** 是 snake_case（不是 `verifyAttestation`）。优先扁平 `type: keyless` + `oidcProvider`（与生成 `attestation` 相同形状）。
- 步骤上的策略集为 **`enforce.policySets`**——不像 SBOM 执行那样是 `spec.policy`。
- 通过 MCP 列出 `policy_set`——不要臆造标识符。
- **CD：** 仅容器化步骤组；参见 `skills/security/generate-slsa/references/cd-containerized-step-group.md`。
- **不要在此技能中执行流水线**——配置后使用 `/run-pipeline`（与 `/configure-repo-scan` 相同）。
- 与 `/generate-slsa`（生成）和 `/create-policy`（OPA 规则）配合使用。

---

## 故障排查

### 无 SLSA Generation 步骤
- 先添加 `/generate-slsa` 并启用证明（YAML 中 `type: provenance`）。
- 验证需要镜像仓库中的 `.att` 或 SCS Artifacts 中的来源。
- 扫描 `provenance` 步骤——不是 `SlsaGeneration`（API 使用 `provenance`）。

### 证明验证失败
- 验证方法必须与生成匹配（`keyless` vs `keybased`）。
- Keybased：使用**公钥**密钥（生成使用**私钥**）。
- Keyless non-harness：配置 Connector for Keyless Signing。

### 镜像错误 / 无来源
- 使用与生成 `repo` 字段相同的 `image_path`。
- 症状：验证通过但制品错误——镜像不匹配。

### 策略评估失败
- 查看策略集 Rego 规则；检查 Supply Chain 标签中的违规。
- 在 `enforce.policySets` 中确认策略集标识符（非显示名称）。

### YAML 校验错误
- 验证的 `source.type` 必须为 PascalCase（`Docker`，而非 `docker`）。
- Docker 来源使用 `image_path`，而非 `repo`。
- `verify_attestation`：使用扁平 `type: keyless` + `spec.oidcProvider: harness`——除非 API 拒绝扁平形状，否则不用嵌套 `cosign`。
- `DUPLICATE_IDENTIFIER`——重命名 `slsaverification`。

### CD 步骤错误
- 放在带 `stepGroupInfra` 的 `stepGroup` 内——而非顶层 `execution.steps`。
- 参见 `skills/security/generate-slsa/references/cd-containerized-step-group.md`。

### 用户在仅 CI 流水线上选择了 CD
- 预期——运行阶段 3b；除非用户改变方向，否则不要强制仅 CI。

### 流水线运行失败
- 使用 `/run-pipeline` 执行，使用 `/debug-pipeline` 诊断失败
- 确认验证方法与生成证明匹配；keybased 时检查公钥
- 缺少运行时输入：通过 `/run-pipeline` 或 Harness UI Run 提供分支/标签或部署输入

### MCP 错误
- `CONNECTOR_NOT_FOUND`——在 Project Settings 中核实连接器。
- `ACCESS_DENIED`——PAT 需要流水线编辑和策略读取权限。
