---
name: arize-admin
description: "通过 ax CLI 管理 Arize 用户、组织、空间、项目、角色、角色绑定、资源限制和 API key。适用于企业管理工作流：邀请和注销用户、引导新团队入驻、为 SAML/SSO 映射创建自定义角色、为用户分配角色、限制项目级访问，以及为多租户架构管理服务密钥。覆盖 ax users、ax organizations、ax spaces、ax projects、ax roles、ax role-bindings 和 ax api-keys。"
metadata:
  author: arize
  version: "1.0"
compatibility: Requires the ax CLI (≥ 0.39.0) and a configured Arize profile with org-admin privileges.
---

# Arize 管理技能

以编程方式管理 Arize 用户、组织、空间、角色、权限和 API key——企业访问控制的基础构件。

> **权限要求：** 大多数操作需要 **org-admin** 或 **account-admin** 权限。如果命令返回 `403 Forbidden`，说明已认证的配置文件缺少足够的权限。

> **破坏性操作规则：** 会删除、撤销、移除或不可逆地修改资源的命令（`delete`、`revoke`、`remove-user`、`unrestrict`）在执行前需要**用户明确确认**。当用户要求你执行其中某一操作时：
> 1. 准确概述将会发生什么（例如："这将删除用户 jane@example.com，并级联撤销其 API key、移除其所有组织/空间成员资格和角色绑定。"）
> 2. 请用户确认（使用 `AskUserQuestion`）。
> 3. 仅在用户确认后，才使用 `--force` 运行命令，以跳过 CLI 的交互式提示。
>
> 未经用户确认，绝不要运行带 `--force` 的破坏性命令。

## 何时使用

- 邀请用户加入账户，将其分配到组织和空间
- 一条命令注销用户并撤销其所有访问权限
- 引导新团队入驻：创建空间、创建自定义角色、分配用户、生成服务密钥
- 为 SAML/SSO 属性映射创建自定义角色（需要稳定的角色 ID）
- 限制某个项目，使只有显式绑定的用户才能访问
- 为 CI/CD 流水线或多租户架构创建限定范围的服务密钥
- 轮换或撤销 API key
- 在空间内创建或删除项目

## 前置问题

对于多步工作流，**在运行任何 `ax` 命令之前收集全部所需信息**。使用 `AskUserQuestion` 以避免工作流中途来回询问。先获取实时数据（例如组织列表），以便呈现真实的选项，而不是让用户去回想 ID。

### 引导新团队入驻
1. 当组织名称已知时，运行 `ax organizations get NAME -o json`；使用 `ax organizations list -o json` 将组织名称作为选项呈现。
2. 使用 `AskUserQuestion`（单次调用，最多 4 个问题）收集：
   - **哪个组织？**——将列表中的组织名称作为选项呈现
   - **空间名称**——新团队空间应叫什么
   - **团队成员**——要邀请的姓名和邮箱（用户可通过"其他"输入；若暂无则询问）
   - **服务密钥？**——是否为 CI/CD 流水线生成服务密钥

### 注销用户
在运行任何命令之前询问：
- **哪个用户？**——邮箱地址（然后用 `ax users get EMAIL -o json` 查询）

### 限制项目
在运行任何命令之前询问：
- **哪个空间和项目？**——用于查询项目的全局 ID
- **哪些用户获得显式访问权限？**——要绑定到受限项目的用户邮箱

### 邀请用户（独立操作）
在运行任何命令之前询问：
- **姓名和邮箱**——每个要邀请的用户
- **角色**——`ADMIN`、`MEMBER` 或 `ANNOTATOR`（作为选项呈现；账户级用户创建没有 `READ_ONLY` 角色）
- **邀请模式**——`EMAIL_LINK`、`TEMPORARY_PASSWORD` 或 `NONE`（`--invite-mode` 为必填）

### 撤销或轮换 API key
在运行任何命令之前询问：
- **哪个密钥？**——运行 `ax api-keys list -o json`，按名称和状态呈现选项；或询问 `KEY_ID`
- **撤销还是轮换？**——`revoke` 会立即使其失效；`refresh` 会签发一个范围相同的新密钥，并立即使旧密钥失效，除非传入 `--grace-period-seconds`

如果用户说"删除"某个 API key，请使用 `ax api-keys revoke` 使其失效。

## 概念

- **组织（Organization）**——账户内的一个命名分组（例如每个业务单元一个）。空间位于组织之内。用户先被加入账户，然后加入组织，再加入空间。
- **空间（Space）**——一个隔离追踪、数据集和项目的工作区。用户必须先成为组织成员，才能被加入该组织内的某个空间。
- **角色（Role）**——一组命名的权限。预定义角色由系统管理。自定义角色由管理员创建。用于组织/空间成员资格的角色（`ADMIN`、`MEMBER`、`READ_ONLY`、`ANNOTATOR`）与配合 `ax role-bindings` 使用的自定义 RBAC 角色是分开的。
- **角色绑定（Role binding）**——将自定义角色细粒度地分配给某个用户在特定资源（空间或项目）上的操作。
- **资源限制（Resource restriction）**——将某个项目标记为仅允许在该项目上拥有显式角色绑定的用户访问。在任意更高层级（空间、组织、账户）绑定的角色均被排除。
- **API key**——要么是*用户*密钥（以创建者身份认证，拥有完整的用户权限），要么是*服务*密钥（限定到特定空间，用于自动化流水线）。

## 前置条件

直接执行——运行所需的 `ax` 命令。不要预先检查版本或配置文件。

如果 `ax` 命令失败：
- `command not found` 或版本错误 → 参见 [references/ax-setup.md](references/ax-setup.md)
- `401 Unauthorized` / 缺少 API key → 运行 `ax profiles show`；按照 [references/ax-profiles.md](references/ax-profiles.md) 操作
- `403 Forbidden` → 当前配置文件缺少管理员权限；参见 [references/ax-profiles.md](references/ax-profiles.md)（绝不要让用户把管理员密钥粘贴到聊天中）
- **安全：** 绝不读取 `.env` 文件，也不要为查找凭据而搜索文件系统。例外：非机密的 `ARIZE_SPACE_ID` 行（参见 [Space](references/ax-profiles.md#space)）。使用 `ax profiles` 获取 Arize 凭据。绝不要让用户把机密粘贴到聊天中。绝不回显、记录或显示原始 API key 值。对于缺失的凭据，参见 [references/ax-profiles.md](references/ax-profiles.md)。

> **OAuth 登录选项：** 用户可以通过运行 `ax auth login`（然后用 `ax auth logout` 撤销）使用基于浏览器的 OAuth PKCE 进行认证，而非使用 API key。当前配置文件必须是 OAuth 配置文件，通过 `ax profiles create --auth-method oauth` 创建。如果用户问及认证替代方案，告知他们此选项——**不要**自行运行 `ax auth login`，因为它会交互式地打开浏览器。

---

## 用户

用户必须先存在于账户中，然后才能被加入组织或空间。**账户级角色：** `ADMIN`、`MEMBER`、`ANNOTATOR`

```bash
ax users list                                  # all users
ax users list --email "jane"                   # substring filter
ax users list --status ACTIVE                  # ACTIVE or INVITED
ax users list -l 100 -o json                   # paginate, get global IDs

ax users get USER_ID_OR_EMAIL                   # direct lookup; list is for browsing

ax users create \
  --full-name "Jane Doe" \
  --email jane@example.com \
  --role MEMBER \
  --invite-mode EMAIL_LINK        # or: NONE | TEMPORARY_PASSWORD

ax users update USER_ID --full-name "Jane Smith"
ax users update USER_ID --is-developer          # grant developer flag

ax users delete --id USER_ID --force   # ⚠ confirm first — cascades: org/space memberships, API key revocation, role bindings
ax users delete --email jane@example.com --force   # or resolve by email instead of ID

ax users resend-invitation USER_ID
ax users reset-password USER_ID
```

---

## 组织

**组织角色：** `ADMIN`、`MEMBER`、`READ_ONLY`、`ANNOTATOR`

```bash
ax organizations list
ax organizations list --name "platform"
ax organizations list -l 100 -o json

ax organizations get "Platform Team"

ax organizations create --name "Platform Team" --description "Core ML platform"

ax organizations update "Platform Team" --name "ML Platform" --description "Updated"

# Add user (must exist in account first)
ax organizations add-user "Platform Team" --user-id USER_ID --role MEMBER

# Remove user (also removes from all child spaces) — ⚠ confirm first
ax organizations remove-user "Platform Team" --user-id USER_ID --force

# Delete organization: ⚠ irreversible; deletes org and all resources inside (spaces, projects, experiments, datasets)
ax organizations delete "Platform Team" --force
```

---

## 空间

**空间角色：** `ADMIN`、`MEMBER`、`READ_ONLY`、`ANNOTATOR`

```bash
ax spaces list
ax spaces list --organization-id ORG_ID

ax spaces get "my-workspace"

# --organization-id required; get ORG_ID from ax organizations list -o json
ax spaces create --name "team-alpha" --organization-id ORG_ID

ax spaces update "team-alpha" --name "team-alpha-v2"

ax spaces delete "team-alpha" --force   # ⚠ confirm first — irreversible; deletes all resources

# User must be an org member before being added to a space
ax spaces add-user "team-alpha" --user-id USER_ID --role MEMBER
ax spaces remove-user "team-alpha" --user-id USER_ID --force   # ⚠ confirm first
```

---

## 角色

配合 `ax role-bindings` 使用的自定义 RBAC 角色。与组织/空间成员资格中更简单的 `ADMIN`/`MEMBER`/`READ_ONLY`/`ANNOTATOR` 角色相分离。

```bash
ax roles list                          # all roles
ax roles list --is-custom -o json      # custom only — get stable IDs for SAML mappings
ax roles list --is-predefined

ax roles get "Data Scientist"          # inspect permissions

# --permissions is comma-separated; fully replaces on update
ax roles create \
  --name "Data Scientist" \
  --permissions "PROJECT_READ,DATASET_CREATE,EXPERIMENT_CREATE" \
  --description "Read traces, create datasets and experiments"

ax roles update "Data Scientist" --permissions "PROJECT_READ,DATASET_CREATE,EXPERIMENT_CREATE,EVALUATOR_CREATE"

ax roles delete "Data Scientist" --force   # ⚠ confirm first — predefined roles cannot be deleted
```

**查找可用权限：** 对某个系统角色（例如 `Member`、`Admin`）运行 `ax roles get <predefined-role> -o json`，以查看有效的权限名称。

---

## 角色绑定

将自定义角色细粒度地分配给某个用户在特定资源（空间或项目）上的操作。

```bash
# Assign at space level
ax role-bindings create \
  --user-id USER_GLOBAL_ID \
  --role-id ROLE_GLOBAL_ID \
  --resource-type SPACE \
  --resource-id SPACE_GLOBAL_ID

# Assign at project level
ax role-bindings create \
  --user-id USER_GLOBAL_ID \
  --role-id ROLE_GLOBAL_ID \
  --resource-type PROJECT \
  --resource-id PROJECT_GLOBAL_ID

ax role-bindings get BINDING_ID
ax role-bindings update BINDING_ID --role-id NEW_ROLE_ID
ax role-bindings delete BINDING_ID --force   # ⚠ confirm first

# List bindings for a resource type (--resource-type is required)
ax role-bindings list --resource-type SPACE
ax role-bindings list --resource-type PROJECT --user-id USER_GLOBAL_ID -o json
```

幂等——如果该用户在该资源上已存在绑定，则直接退出而不报错。

---

## 资源限制

限制**项目、仪表板或提示**，使只有在该资源上拥有显式角色绑定的用户才能访问。空间/组织级角色被排除。

```bash
ax resource-restrictions list                                          # all restrictions, paginated
ax resource-restrictions list --resource-type DASHBOARD                # filter to one resource type (PROJECT, DASHBOARD, or PROMPT)
ax resource-restrictions list --limit 50 --cursor PAGINATION_CURSOR    # fetch next page

ax resource-restrictions restrict --resource-id RESOURCE_GLOBAL_ID     # idempotent
ax resource-restrictions unrestrict --resource-id RESOURCE_GLOBAL_ID --force   # ⚠ confirm first

# Finding a project ID
ax projects get NAME --space "my-workspace" -o json
```

---

## API Keys

> **范围：** `ax api-keys list` 仅返回**已认证用户**拥有的密钥。对于组织范围的审计，请使用 Arize UI（Settings > API Keys）。

```bash
ax api-keys list
ax api-keys list --key-type SERVICE --status ACTIVE -o json

# User key — authenticates as creator, inherits their full permissions
ax api-keys create --name "CI pipeline" --expires-at "2027-01-01T00:00:00"

# Service key — bot user scoped to org(s)/space(s) via --assignments JSON
# (recommended for CI/CD pipelines; get ORG_ID from `ax organizations list -o json`)
ax api-keys create-service-key \
  --name "team-alpha-traces" \
  --assignments '[{"org_id": "ORG_ID", "spaces": [{"space": "team-alpha"}]}]' \
  --expires-at "2027-01-01T00:00:00"

ax api-keys revoke KEY_ID --force   # ⚠ confirm first — invalidates the key immediately

# Rotation — issues a new key with same scope; old key dies immediately
# unless --grace-period-seconds keeps it valid while clients switch over
ax api-keys refresh KEY_ID --grace-period-seconds 3600
ax api-keys refresh KEY_ID --expires-at "2028-01-01T00:00:00"
```

> **原始密钥只显示一次。** 立即将其保存到你的机密管理器中。它无法再次获取。

通过 `--assignments` 完整地设定 `create-service-key` 的范围；运行 `ax api-keys create-service-key --help` 查看分配 JSON 结构、角色默认值和 `--account-role`。传入 `--env-file PATH` 可将新密钥写入 dotenv 或 .envrc 文件中的 `ARIZE_API_KEY`，这样密钥会落到文件里而不是对话中。

---

## 项目

项目位于空间之内，包含追踪、数据集和实验。

```bash
ax projects list --space SPACE
ax projects list --space SPACE --name "playground"   # substring filter
ax projects list --space SPACE -l 100 -o json        # get base64 IDs

ax projects get NAME_OR_ID --space SPACE

ax projects create --name "my-project" --space SPACE

ax projects update NAME_OR_ID --name "new-project-name" --space SPACE

ax projects delete NAME_OR_ID --space SPACE --force   # ⚠ confirm first — deletes all traces and datasets
```

> **注意：** 项目 ID（base64 字符串）供 `ax spans export`、`ax traces export` 和 `ax resource-restrictions` 使用。如果命令拒绝某个项目名称，请从 `ax projects get NAME --space SPACE -o json` 中取出 `id` 字段；`ax projects list` 用于浏览。

---

## 企业工作流与故障排查

分步工作流（引导团队入驻、SAML/SSO 映射、项目限制、注销、多租户密钥）以及故障排查表参见 [references/REFERENCE.md](references/REFERENCE.md)。

---

## 相关技能

- **arize-instrumentation**：空间就绪后，在 LLM 应用中设置追踪。
- **arize-trace**：在受管空间内导出并检查追踪。
- **arize-dataset**：在空间内创建和管理数据集。
