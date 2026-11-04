---
name: enforce-sbom
description: >-
  向现有 Harness 流水线添加 SBOM 策略执行（SscaEnforcement / CdSscaEnforcement）步骤，
  以验证 SBOM 证明并应用 OPA SBOM 策略集。支持 CI、Security 和 CD
  （Deployment），包括仅 CI 流水线——如果不存在 Deploy 阶段，通过阶段 3b 添加一个
  （服务、环境、基础设施、容器化步骤组），然后在部署前放置 CdSscaEnforcement。
  支持来自 Artifact Registry、第三方镜像仓库（docker、
  ECR、GCR、GAR、ACR）和 Git 的容器镜像和代码仓库。匹配 Pipeline Studio SBOM Policy Enforcement UI。仅适用于
  现有流水线（可追加 Deploy 阶段）。在要求执行 SBOM 策略、添加 SBOM
  策略执行、在流水线中验证 SBOM 证明，或阻止不合规组件时使用。
  触发短语：执行 SBOM、SBOM 策略执行、SBOM 策略步骤、验证 SBOM 策略、
  SscaEnforcement、在 SBOM 后添加策略执行。
metadata:
  author: Harness
  version: 1.0.0
  mcp-server: harness-mcp-v2
  summary: Add SBOM Policy Enforcement (verify attestation + OPA policy sets)
license: Apache-2.0
compatibility: Requires Harness MCP v2 server (harness-mcp-v2)
---

# 执行 SBOM

向现有 Harness 流水线添加一个 **SBOM Policy Enforcement**（`SscaEnforcement` / `CdSscaEnforcement`）步骤。该步骤验证 SBOM 证明（启用时）并针对制品的物料清单评估 SBOM OPA 策略集。

此技能仅适用于**现有流水线**——不要创建独立的仅执行流水线。

**前置条件：** 制品必须已存在 SBOM（通常来自 `/create-sbom` 的 `SscaOrchestration` 或 SBOM 摄取）。SBOM **策略集**必须存在（`/create-policy`）。

**支持的阶段：** CI、CD（`Deployment`）和 Security——与 SBOM Orchestration 相同。CD 需要带基于容器执行的**容器化步骤组**。

通过**逐步交互式向导**引导用户（与 `/create-sbom` 相同 UX）：

- 向导：`references/interactive-wizard-flow.md`
- UI ↔ YAML：`references/sbom-enforcement-step.md`
- CD 容器化步骤组（新建或现有 Deploy 阶段）：`skills/platform/create-sbom/references/cd-containerized-step-group.md`

---

## 交互模型（强制）

1. **每轮一个问题**——可用时使用 `AskQuestion`；否则使用带 `(Recommended)` 的编号选项。
2. **开场消息**——向现有流水线添加 SBOM Policy Enforcement；提及 SBOM + 策略集前置条件。
3. **进度面包屑**——流水线获取后：
   `Pipeline · Placement · Source · Details · Verify · Policy · Submit`
4. **记录答案**——运行摘要；除非用户改变方向，否则不要重复询问。
5. **先获取再配置**——在放置/来源问题之前 `harness_get`。
6. **展示流水线结构**——列出阶段/步骤；突出 `SscaOrchestration` 和连接器。
7. **从 orchestration 推断来源**——当存在一个 SBOM 生成步骤时，复用它
   的 `source` 和镜像。
8. **绝不猜测镜像标签**——默认使用 orchestration 步骤镜像；含糊时询问。
9. **写入前确认**——摘要 + 仅在用户确认后 `harness_update`。
10. **更新后停止**——成功 `harness_update` 后，提供配置摘要并
    指向 `/run-pipeline` 以执行。**不要**在此技能中调用 `harness_execute`、轮询
    执行或运行 `harness_diagnose`（与 `/configure-repo-scan` 相同模式）。
11. **在没有现有 Deploy 阶段时进行 CD 放置**——如果用户在仅 CI 流水线上选择 CD 执行（`cd_before_deploy`、`add_cd_stage` 或类似），**不要**拒绝或强制仅 CI。运行 **阶段 3b** 添加带容器化步骤组的 `Deployment` 阶段，并在部署前放置 `CdSscaEnforcement`（与 `/create-sbom` 相同前置条件）。
12. **绝不因 "no Deployment stage" 而阻止 CD**——在阶段 2 警告，然后当用户想要 CD 时通过阶段 3b 继续。

完整阶段提示词：`references/interactive-wizard-flow.md`。

---

## 说明

### 向导阶段（面向用户）

| 阶段 | 面包屑 | 操作 |
|-------|------------|--------|
| 0 | Pipeline | AskQuestion：流水线 URL 准备好了吗？ |
| 1 | Pipeline | 收集 URL 或 org/project/id → `harness_get` |
| 2 | Pipeline | 显示结构；注明缺少 `SscaOrchestration` |
| 3 | Placement | AskQuestion：SBOM 步骤之后、CD 部署前、添加 CD 阶段等 |
| 3b | Placement（仅 CD） | 如无 `Deployment` 阶段：服务、环境、基础设施、`stepGroupInfra`——然后添加阶段 + `CdSscaEnforcement` |
| 4 | Source | AskQuestion：从流水线推断或选择磁贴 |
| 5 | Source | AskQuestion：镜像仓库提供方（仅 Third-Party） |
| 6 | Details | 连接器（明显则跳过） |
| 7 | Details | 镜像 / 代码仓库（自由文本；默认来自 orchestration） |
| 8 | Verify | AskQuestion：验证证明方法 |
| 9 | Policy | AskQuestion：策略集——`harness_list` `policy_set` |
| 10 | Submit | AskQuestion：确认流水线更新 |

阶段 10 `confirm` 后 → 插入步骤、`harness_update`，然后提供摘要（不要运行流水线）。

### 支持的阶段类型

| 阶段类型（YAML） | 步骤 `type` | 放置说明 |
|-------------------|-------------|-----------------|
| `CI` | `SscaEnforcement` | 同一阶段中 `SscaOrchestration` **之后** |
| `Deployment` | `CdSscaEnforcement` | 容器化步骤组；部署**之前** |
| `Security` | `SscaEnforcement` | 制品已知时在 SBOM 生成之后 |

### CD 边界情况（强制工作流）

当 Placement 面向 **CD**（`cd_before_deploy`、`add_cd_stage` 或现有 `Deployment` 阶段）时使用。

#### 阶段 2——仅 CI 流水线

如果**没有** `type: Deployment` 阶段，在结构表中注明并添加：

> This pipeline has no CD Deploy stage yet. You can still enforce SBOM in CD — we will add a **Deployment** stage with a **containerized step group** and place **SBOM Policy Enforcement** before the deploy step.

**不要**告诉用户 CD 对此流水线无效。如果他们在阶段 3 选择了 CD，继续阶段 3b。

#### 阶段 3b——CD 前置条件（尚无 Deploy 阶段）

镜像 `/create-sbom` 阶段 3b——**每轮一个主题**：

| 步骤 | 操作 |
|------|--------|
| 服务 | `harness_list`（`service`）→ `serviceRef` |
| 环境 | `harness_list`（`environment`）→ `environmentRef` |
| 基础设施 | `harness_list`（`infrastructure`，`params: { environment_id }`）；缺失时按 `/create-infrastructure` 创建 |
| 步骤组基础设施 | 用于 `stepGroupInfra` 的 K8s 连接器 + 命名空间 |
| 部署步骤 | 对于 Kubernetes 服务，默认 `K8sRollingDeploy` |
| CI 执行 | 可选：保留 CI `SscaEnforcement` **并**添加 CD `enforce_sbom_cd`，或仅 CD——在阶段 10 确认 |

追加带容器化组的 Deploy 阶段，在 `K8sRollingDeploy` **之前**包含 `CdSscaEnforcement`。完整 YAML 模式：`skills/platform/create-sbom/references/cd-containerized-step-group.md`（使用 `CdSscaEnforcement` 而非 `SscaOrchestration`）。

**CD 镜像 / 来源：** 优先使用服务主制品中的 `<+artifact.image>`；复用来自 CI `SscaOrchestration` 或服务制品来源的连接器。**验证证明**必须与 CI 生成步骤匹配（例如 keyless Harness OIDC）。

**步骤 id：** 当 CI 已有 `enforce_sbom` 时使用 `enforce_sbom_cd`。

### 向导之后——后端步骤

#### 检查前置条件

1. **SBOM 生成**——流水线 YAML 包含 `SscaOrchestration`（或用户确认 SBOM 已被摄取）。
2. **策略集**——`harness_list(resource_type="policy_set", org_id, project_id)`。如果为空，在继续之前引导用户使用 `/create-policy`（SBOM 实体、`onstep` 事件）。

#### 从流水线 YAML 提取上下文

从 `SscaOrchestration`（如果存在）复制：

- `spec.source`（type + spec）
- `spec.attestation`（当用户选择验证时使用匹配的 `verifyAttestation`）
- `connector` / `image` / `registry`

从构建/推送步骤：`BuildAndPushDockerRegistry`、`Run`、`Plugin` 中的 `connectorRef`。

#### 生成 SBOM 执行步骤 YAML

**仅使用向导答案**。默认：验证 SBOM + keyless Harness OIDC + 来自阶段 9 的策略集。

**CI / Security——`SscaEnforcement`（Third-Party Docker）：**

```yaml
- step:
    identifier: enforce_sbom
    name: SBOM Policy Enforcement
    type: SscaEnforcement
    spec:
      source:
        type: docker
        spec:
          connector: <docker_registry_connector>
          image: <org>/<repo>:<tag>
      verifyAttestation:
        type: cosign
        spec:
          type: keyless
          spec:
            oidcProvider: harness
      policy:
        policySets:
          - <sbom_policy_set_identifier>
    timeout: 15m
```

**仅策略集**（UI Policy Configuration）：

```yaml
      policy:
        policySets:
          - sbom_license_allowlist
          - sbom_deny_critical
```

**无验证**（当用户取消勾选 Verify SBOM 时）：

```yaml
      policy:
        policySets:
          - <sbom_policy_set_identifier>
```

省略 `verifyAttestation`。

**代码仓库来源**——在 `spec` 上添加 `overrideConnectorRef`（参见参考文档）。

**CD `Deployment`**——在容器化 `stepGroup`（`stepGroupInfra`）内使用 `CdSscaEnforcement`；
包含与该组匹配的 `spec.infrastructure`（参见 `references/sbom-enforcement-step.md` 和
`skills/platform/create-sbom/references/cd-containerized-step-group.md`）。添加新 Deploy 阶段时，将
执行放在 `stepGroup.steps` 内的部署步骤**之前**——而非顶层 `execution.steps`。

来源类型（`docker`、`ecr`、`gcr`、`gar`、`acr`、`har`、`repository`）与 `/create-sbom` 匹配——按提供方的 `source.spec` 字段见
`skills/platform/create-sbom/references/sbom-orchestration-step.md`。

完整 UI 映射：`references/sbom-enforcement-step.md`。

#### 将步骤插入流水线 YAML

- 在阶段 3 放置处插入——尽可能在 `generate_sbom` / `SscaOrchestration` **之后**。
- 不要修改无关步骤、变量或失败策略。
- 步骤标识符：`enforce_sbom`（若重复则重命名）。
- **CI：** 与 orchestration 相同的 `spec.execution.steps` 列表。
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

遇到校验错误时，读取 API 消息、修复字段（通常是 `verifyAttestation` 形状或 `policy.policySets`）、重试。

#### 提供摘要

向用户报告结果（与 `/configure-repo-scan` 相同模式——**不要**执行流水线）：

```
## SBOM Policy Enforcement Configured

**Pipeline:** <pipeline_name>
**Step:** SBOM Policy Enforcement (SscaEnforcement | CdSscaEnforcement)
**Location:** Stage "<stage_name>", <position>
**Source:** <type> — <connector/registry> — <image or repo>
**Verify attestation:** Keyless (Harness OIDC) — or as configured
**Policy sets:** <list>

**Pipeline URL:** https://app.harness.io/ng/account/<account_id>/module/ci/orgs/<org_id>/projects/<project_id>/pipelines/<pipeline_id>/pipeline-studio/

**Note:** Review the SBOM Policy Enforcement step in Pipeline Studio to adjust Advanced settings.

### Next Steps
1. Run the pipeline via `/run-pipeline` to verify enforcement executes successfully
2. If the run fails, diagnose with `/debug-pipeline`
3. View policy evaluation on the execution **Supply Chain** tab and Artifacts → **Policy Violations**
4. If **Failed** due to policy deny, tune policies via `/create-policy` (entity-sbom.md)
5. Add or adjust SBOM generation with `/create-sbom` if SBOM was missing
6. Automate with `/create-trigger`
```

**CD 流水线：** 在摘要中注明运行时是否需要输入（服务制品、环境、基础设施）——用户通过 `/run-pipeline` 或 Harness UI Run 提供这些。

---

## 示例

### 在现有 SBOM 步骤之后执行

```
/enforce-sbom
Add SBOM policy enforcement to backend-api pipeline after Generate SBOM — keyless verify, policy set sbom_prod_rules
```

### CD 流水线在部署前

```
/enforce-sbom
Enforce SBOM policies in deploy stage before K8s rolling deploy for myapp:v7
```

### 默认值

```
/enforce-sbom
Use defaults — same image as SBOM orchestration step, Harness OIDC verify
```

---

## 性能注意事项

- 仅**现有流水线**——不要提供创建新流水线（你可以向现有流水线**追加** Deploy 阶段）。
- **向导 UX 是强制的**——每轮一个问题；参见 `references/interactive-wizard-flow.md`。
- **仅 CI + CD 执行：** 允许——阶段 3b 添加 Deploy 阶段 + 容器化组；除非用户选择 CI 放置，否则不要重定向到 CI。
- 存在时复用 `SscaOrchestration` 的 `source` + 镜像——避免与生成步骤漂移。
- 在阶段 9 之前通过 MCP 列出 `policy_set`——不要臆造策略集标识符。
- 执行在 SBOM 存在**之后**；orchestration 和执行**顺序**运行。
- CD：`CdSscaEnforcement` 仅在**容器化**步骤组中。
- **不要在此技能中执行流水线**——配置后使用 `/run-pipeline`（与 `/configure-repo-scan` 相同）。
- 与 `/create-sbom`（生成）和 `/create-policy`（OPA 规则）配合使用。

---

## 故障排查

### 流水线中无 SBOM / Orchestration 步骤
- 先添加 `/create-sbom`，或按 Harness 文档摄取 SBOM。
- 执行会从制品的现有 SBOM 评估组件。

### 未找到策略集
- 在项目/组织/账户范围 `harness_list(resource_type="policy_set")`。
- 创建 SBOM 策略（`package sbom`）以及带 **onstep** 的策略集（通过 `/create-policy`）。

### 策略评估失败（Deny）
- 查看策略 Rego 中的拒绝/允许列表（`skills/observability-governance/create-policy/references/entity-sbom.md`）。
- 检查执行 **Supply Chain** → policy violations 以获取组件 UUID。

### 证明验证失败
- 验证方法必须与 **SBOM Orchestration** 证明匹配（keyless vs 基于密钥）。
- Keyless non-harness：为 keyless 签名配置 OIDC 连接器（SCS → Manage → Configuration）。
- 基于密钥：公钥文件密钥必须与 SBOM 被证明时使用的密钥对匹配。

### 镜像错误 / 制品无 SBOM
- 使用与 `SscaOrchestration` 相同的 `source.spec.image`。
- 症状：策略通过但制品错误——镜像不匹配。

### CD 步骤校验错误
- `CdSscaEnforcement` 需要 `spec.infrastructure` 和容器化执行。
- 放在带 `stepGroupInfra` 的 `stepGroup` 内——而非 Deployment 阶段的顶层 `execution.steps`。
- 参见 `skills/platform/create-sbom/references/cd-containerized-step-group.md`。

### 用户在仅 CI 流水线上选择了 CD
- 预期——运行阶段 3b；除非用户改变方向，否则不要只用 CI 选项重新询问 Placement。
- SBOM 必须仍然存在（来自 CI `SscaOrchestration` 或摄取）；CD 中的执行使用相同的制品镜像/表达式。

### 流水线更新校验错误
- `DUPLICATE_IDENTIFIER`——重命名 `enforce_sbom`。
- 无效的 `policy.policySets`——使用策略集**标识符**，而非显示名称。
- `verifyAttestation` 形状——与上游证明对齐；参见参考文档。

### MCP 错误
- `CONNECTOR_NOT_FOUND`——在 Project Settings 中核实连接器。
- `ACCESS_DENIED`——PAT 需要流水线编辑和策略读取权限。

### 流水线运行失败
- 使用 `/run-pipeline` 执行，使用 `/debug-pipeline` 诊断失败
- 缺少运行时输入：通过 `/run-pipeline` 或 Harness UI Run 提供分支/标签或部署输入
- 策略拒绝会使步骤失败——当组件违反规则时符合预期；清晰报告违规
