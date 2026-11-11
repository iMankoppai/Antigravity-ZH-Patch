---
name: neo4j-security-skill
description: 在 Neo4j 中进行编程式安全管理——RBAC/ABAC、用户生命周期（CREATE/ALTER/DROP USER）、
  角色生命周期（CREATE/GRANT ROLE/DROP ROLE）、权限的授予与拒绝（在 graph、database、DBMS 上的 GRANT/DENY/REVOKE）、
  属性级访问控制、子图访问控制、SHOW PRIVILEGES 检查，以及认证提供方配置参考（LDAP、OIDC/SSO）。当 Agent 需要通过 Cypher
  在 system 数据库上以编程方式管理用户、角色或权限时使用。不处理 Cypher 查询编写
  ——请使用 neo4j-cypher-skill。不处理集群运维或备份——请使用 neo4j-cli-tools-skill。
  属性级安全和 ABAC 需要 Enterprise 版。
allowed-tools: Bash WebFetch
version: 1.0.13
---

## 何时使用
- 创建、修改、暂停或删除用户
- 创建角色，授予/撤销角色成员资格
- 授予/拒绝/撤销 graph、database 或 DBMS 权限
- 查看当前权限（`SHOW PRIVILEGES`）
- 实施属性级访问控制（按属性读写）
- 基于 OIDC claims 或原生用户标签设置 ABAC 规则
- 参考 LDAP/SSO 认证提供方配置

## 何时不使用
- **针对应用数据编写 Cypher 查询** → `neo4j-cypher-skill`
- **集群运维、备份、服务器配置** → `neo4j-cli-tools-skill`
- **驱动连接设置** → `neo4j-driver-*-skill`

---

## MCP 写入闸门 — 强制要求

在执行下列任意操作之前，先展示计划执行的命令并等待明确确认：
- `CREATE USER` / `ALTER USER` / `DROP USER`
- `CREATE ROLE` / `DROP ROLE`
- `GRANT` / `DENY` / `REVOKE`（任意权限）
- `CREATE AUTH RULE` / `DROP AUTH RULE`

切勿自动执行权限变更。展示确切的 Cypher，标注影响，获得“yes”确认。

---

## 执行上下文

所有安全相关的 Cypher 都针对 **system** 数据库执行：
```cypher
// Neo4j auto-routes CREATE/ALTER/SHOW USER|ROLE|PRIVILEGE to system
// If using cypher-shell: cypher-shell -d system
// If using driver: use database="system"
```

---

## 1. 用户管理

### 创建用户
```cypher
CREATE USER alice SET PASSWORD 'secret' CHANGE NOT REQUIRED;
// CHANGE REQUIRED (default): forces password change on first login
// CHANGE NOT REQUIRED: password valid immediately
// SET STATUS ACTIVE (default) | SUSPENDED
```

### 参数化密码（脚本中首选）
```cypher
CREATE USER $username SET PASSWORD $password CHANGE NOT REQUIRED;
```

密码最小长度从 8 位提升到 16 位 — Aura 随 2027.01 升级（2027 年 1 月）生效；自管理版在 2026 LTS 之后默认生效，除非显式设置 `dbms.security.auth_minimum_password_length`。该要求仅对新用户和密码更改/重置时强制执行；已有密码继续有效。请现在就在预配脚本中生成 ≥16 位密码。

### 修改用户
```cypher
ALTER USER alice SET PASSWORD $newPw CHANGE NOT REQUIRED;
ALTER USER alice SET STATUS SUSPENDED;          // lock account
ALTER USER alice SET STATUS ACTIVE;             // unlock
ALTER USER alice SET HOME DATABASE mydb;        // default db on connect
ALTER USER alice IF EXISTS SET PASSWORD $pw;    // safe if missing
```

### 用户标签 [2026.06+, Enterprise]
标签是原生用户对象上的任意字符串，可在 ABAC 规则中通过 `abac.native.user_tags()` 读取。
```cypher
CREATE USER jake SET PASSWORD $pw SET TAGS 'finance', 'auditor';
ALTER USER jake REMOVE TAG 'auditor' ADD TAG 'on-call';   // REMOVE before ADD before SET
ALTER USER jake SET TAGS 'finance', 'auditor';            // replaces all existing tags
ALTER USER jake REMOVE ALL TAGS;
ALTER USERS jake, alice ADD TAGS 'pii-access';            // bulk tag edit
```
`SET/ADD/REMOVE TAG[S]` 需要 `SET USER METADATA`；读取标签值需要 `SHOW USER METADATA`：
```cypher
GRANT SET USER METADATA ON DBMS TO userAdmin;
GRANT SHOW USER METADATA ON DBMS TO auditor;
GRANT USER METADATA MANAGEMENT ON DBMS TO userManager;   // both of the above
```

### 查看用户
```cypher
SHOW USERS YIELD user, roles, passwordChangeRequired, suspended, home
WHERE suspended = false
RETURN user, roles ORDER BY user;

// tags column returns null without SHOW USER METADATA [2026.06+]
SHOW USERS YIELD user, roles, tags;

// runnable CREATE USER commands for the whole DBMS [2026.09]
// requires SHOW USER + SHOW USER CREDENTIALS; tags omitted without SHOW USER METADATA
SHOW USERS AS COMMANDS;
SHOW USERS WITH AUTH AS COMMANDS;   // includes auth provider config + credentials

// caller identity combined with other system-db SHOW commands [2026.10, Cypher 25]
USE system
SHOW CURRENT USER YIELD user, home
SHOW DATABASES YIELD name, aliases
WHERE name = home
RETURN user, name AS database, aliases;
```

组合式 `SHOW CURRENT USER` 查询：每个子句都必须在 `system` 上被允许（不能有 `MATCH`、`SHOW INDEXES`）——图读取请作为单独查询运行。

`SHOW USERS WITH AUTH AS COMMANDS` 会暴露凭证。仅用于受安全保护的备份/恢复处理。当不需要认证材料时，优先使用 `SHOW USERS AS COMMANDS`。切勿将认证导出输出粘贴到明文文档、日志、工单或源码控制中。

### 删除用户
```cypher
DROP USER alice IF EXISTS;
```

---

## 2. 角色管理

### 创建 / 删除角色
```cypher
CREATE ROLE analyst;
CREATE ROLE analyst IF NOT EXISTS;
DROP ROLE analyst IF EXISTS;
```

### 分配 / 移除角色
```cypher
GRANT ROLE analyst TO alice;
GRANT ROLE analyst, writer TO alice, bob;   // bulk
REVOKE ROLE analyst FROM alice;
```

### 查看角色
```cypher
SHOW ROLES YIELD role, member ORDER BY role;
SHOW ROLE analyst PRIVILEGES AS COMMANDS;   // returns runnable GRANT commands
SHOW POPULATED ROLES YIELD role;            // only roles with members

// runnable CREATE ROLE commands for the whole DBMS [2026.09]
SHOW ROLES AS COMMANDS;
SHOW ROLES WITH USERS AS COMMANDS;          // adds GRANT ROLE ... TO user
SHOW ROLES WITH AUTH RULES AS COMMANDS;     // adds GRANT ROLE ... TO AUTH RULE
```

---

## 3. 权限决策表

| 目标 | 命令 |
|---|---|
| 允许连接数据库 | `GRANT ACCESS ON DATABASE mydb TO analyst` |
| 读取所有图数据 | `GRANT MATCH {*} ON GRAPH mydb ELEMENTS * TO analyst` |
| 读取指定标签 | `GRANT MATCH {*} ON GRAPH mydb NODES Person TO analyst` |
| 读取指定关系类型 | `GRANT MATCH {*} ON GRAPH mydb RELATIONSHIPS KNOWS TO analyst` |
| 读取单个属性 | `GRANT READ {email} ON GRAPH mydb NODES Person TO analyst` |
| 可遍历但隐藏属性 | `GRANT TRAVERSE ON GRAPH mydb NODES Person TO analyst` |
| 写入（创建/设置） | `GRANT WRITE ON GRAPH mydb TO writer` |
| 仅创建节点 | `GRANT CREATE ON GRAPH mydb NODES Person TO writer` |
| 仅删除节点 | `GRANT DELETE ON GRAPH mydb NODES Person TO writer` |
| 执行过程 | `GRANT EXECUTE PROCEDURE apoc.* TO analyst` |
| 执行函数 | `GRANT EXECUTE USER DEFINED FUNCTION apoc.* TO analyst` |
| 单个数据库上的全部权限 | `GRANT ALL ON DATABASE mydb TO dba` |
| 完整的 DBMS 管理权限 | `GRANT ALL ON DBMS TO dba` |
| 管理用户 | `GRANT USER MANAGEMENT ON DBMS TO secadmin` |
| 管理用户标签 [2026.06] | `GRANT USER METADATA MANAGEMENT ON DBMS TO secadmin` |
| 管理角色 | `GRANT ROLE MANAGEMENT ON DBMS TO secadmin` |
| Schema 变更 | `GRANT CREATE ELEMENT TYPES ON DATABASE mydb TO schemaadmin` |

### DENY 会覆盖 GRANT
```cypher
// Analyst can read Person but NOT the ssn property
GRANT MATCH {*} ON GRAPH mydb NODES Person TO analyst;
DENY  READ {ssn} ON GRAPH mydb NODES Person TO analyst;
```

### REVOKE 移除特定的授予或拒绝
```cypher
REVOKE GRANT READ {email} ON GRAPH mydb NODES Person FROM analyst;
REVOKE DENY  READ {ssn}   ON GRAPH mydb NODES Person FROM analyst;
REVOKE MATCH {*} ON GRAPH mydb NODES Person FROM analyst;  // removes both grant+deny
```

---

## 4. 常见角色模式

### 只读分析师
```cypher
CREATE ROLE analyst IF NOT EXISTS;
GRANT ACCESS            ON DATABASE mydb TO analyst;
GRANT MATCH {*}         ON GRAPH mydb ELEMENTS * TO analyst;
GRANT EXECUTE PROCEDURE apoc.* TO analyst;
```

### 写入角色（无管理权限）
```cypher
CREATE ROLE writer IF NOT EXISTS;
GRANT ACCESS  ON DATABASE mydb TO writer;
GRANT MATCH {*} ON GRAPH mydb ELEMENTS * TO writer;
GRANT WRITE   ON GRAPH mydb TO writer;
```

### 仅对特定标签只读
```cypher
CREATE ROLE limited_reader IF NOT EXISTS;
GRANT ACCESS    ON DATABASE mydb TO limited_reader;
GRANT TRAVERSE  ON GRAPH mydb ELEMENTS * TO limited_reader;      // can traverse
GRANT MATCH {*} ON GRAPH mydb NODES Person TO limited_reader;    // Person props visible
GRANT MATCH {*} ON GRAPH mydb NODES Company TO limited_reader;   // Company props visible
// Other labels: traversable but properties invisible
```

### DBA 角色（完整管理权限）
```cypher
CREATE ROLE dba IF NOT EXISTS;
GRANT ALL ON DBMS     TO dba;
GRANT ALL ON DATABASE * TO dba;
```

---

## 5. 属性级访问控制（Enterprise）

限制对单个属性的读取访问：
```cypher
// Grant read on all Person props, then deny sensitive ones
GRANT MATCH {*}   ON GRAPH mydb NODES Person TO analyst;
DENY  READ {ssn, dateOfBirth} ON GRAPH mydb NODES Person TO analyst;
```

基于属性的模式匹配（子图访问）：
```cypher
// Only see Person nodes where classification = 'public'
GRANT MATCH {*} ON GRAPH mydb
  FOR (n:Person) WHERE n.classification = 'public'
  TO analyst;

// Block access to classified nodes
DENY MATCH {*} ON GRAPH mydb
  FOR (n) WHERE n.classification <> 'UNCLASSIFIED'
  TO regularUsers;

// List-valued property contains a value [2026.08, Cypher 25]
GRANT MATCH {*} ON GRAPH mydb
  FOR (n) WHERE 'gold' IN n.clearanceLevels
  TO goldTier;
GRANT READ {*} ON GRAPH mydb FOR (n) WHERE 'EU' IN n.regions TO regularUsers;
GRANT MATCH {*} ON GRAPH mydb FOR (n) WHERE NOT 'EU' IN n.regions TO regularUsers;

// Property on the right-hand side of a comparison [2026.08, Cypher 25]
GRANT MATCH {*} ON GRAPH mydb
  FOR (n) WHERE 1 > n.level
  TO analyst;
GRANT READ {*} ON GRAPH mydb FOR (n) WHERE 3 < n.securityLevel TO regularUsers;

// Dynamic row-level security: property matches caller's native user tags [2026.10, Enterprise]
GRANT TRAVERSE ON GRAPH * FOR (n:Project) WHERE n.department IN abac.native.user_tags() TO projectTeam;
```

- `n.prop IN abac.native.user_tags()` [2026.10] — 单个角色即可服务所有标签值；需要在 `dbms.security.abac.authorization_providers` 中包含 `native`（见 §6）。不能用 `NOT` 取反 → 改为对正向标签匹配进行授予
- `value IN n.listProp` — 列表属性包含该值
- 属性缺失或为标量 — 不匹配
- 左侧值 — 非 null，且不是 NaN
- `n.prop IN [v1, v2]` — 标量对列表
- Cypher 25 之前 — 将属性保留在比较的左侧

PBAC 边界情况与导出模式 → [references/privilege-reference.md](references/privilege-reference.md)

**约束：**
- `FOR` 模式仅适用于读权限 — 不适用于写
- 每个基于属性的权限只能由单个属性限定
- 2026.08 之前：列表成员判断和属性位于右侧的谓词会被拒绝 — 改为 `n.prop <op> <literal>` 或维护一个标量标志属性
- 性能开销随规则数量增长；`TRAVERSE` 规则的开销高于 `READ`
- 确保用于规则的属性无法被受限制的角色修改

---

## 6. ABAC — 基于属性的访问控制（Enterprise）

ABAC 根据 OIDC/JWT claims 或原生用户标签动态授予角色，而非通过显式的 `GRANT ROLE ... TO user`。

### 前置条件
```
# neo4j.conf — providers must also appear in dbms.security.authorization_providers
dbms.security.abac.authorization_providers=<oidc-provider-alias>,native   # native [2026.06+]
```
未列出的提供方 → 其访问器函数（`abac.oidc.user_attribute()`、`abac.native.user_tags()`）不可用，引用它的规则会失败（不会静默使用默认值）。

### 创建授权规则
```cypher
CREATE AUTH RULE salesRule
  SET CONDITION abac.oidc.user_attribute('department') = 'sales';

GRANT ROLE analyst TO AUTH RULE salesRule;
```

### 复合条件
```cypher
CREATE OR REPLACE AUTH RULE seniorRule
  SET CONDITION abac.oidc.user_attribute('department') = 'engineering'
    AND abac.oidc.user_attribute('level') >= 5;

GRANT ROLE senior_engineer TO AUTH RULE seniorRule;
```

### 管理授权规则
```cypher
SHOW AUTH RULES YIELD ruleName, condition, roles;
ALTER AUTH RULE salesRule SET ENABLED false;     // disable without dropping
RENAME AUTH RULE salesRule TO salesDeptRule;
DROP AUTH RULE salesDeptRule;
REVOKE ROLE analyst FROM AUTH RULE salesRule;
```

原生用户 [2026.06+]：给原生数据库用户打标签（见[用户标签](#user-tags-202606-enterprise)），并在规则中通过 `abac.native.user_tags()` 匹配标签——无需 OIDC：
```cypher
CREATE AUTH RULE nativeSalesRule
  SET CONDITION 'sales' IN abac.native.user_tags();
GRANT ROLE analyst TO AUTH RULE nativeSalesRule;

// require several tags at once
CREATE AUTH RULE financeAuditRule
  SET CONDITION all(tag IN ['finance', 'auditor'] WHERE tag IN abac.native.user_tags());

// combine tags with OIDC claims and temporal conditions
CREATE AUTH RULE onCallRule
  SET CONDITION 'on-call' IN abac.native.user_tags()
    AND abac.oidc.user_attribute('department') = 'engineering'
    AND time.transaction('UTC').hour >= 9;
```

❌ 切勿以标签缺失作为条件：`NOT ('restricted' IN abac.native.user_tags())` — 任何未打标签的用户都会满足该条件，从而提权。
✅ 要求标签存在：`'unrestricted' IN abac.native.user_tags()`。

**说明：**
- 缺失的 claims 会求值为 NULL → 规则条件为 false → 不授予角色
- 当 claims 已加载时，规则会立即对现有会话生效
- OIDC claims 通过 `abac.oidc.user_attribute()`；原生用户标签通过 `abac.native.user_tags()` [2026.06+]。LDAP 没有访问器函数——改为给该 LDAP 用户的原生用户对象打标签
- PBAC 属性规则谓词中拒绝用户自定义函数 [2026.06+]
- Infinigraph（分片属性数据库）仅支持 PBAC 的 `READ`，在虚拟数据库上授予 [2026.07+，Aura 上不支持] — 见 [references/privilege-reference.md](references/privilege-reference.md)

---

## 7. SHOW PRIVILEGES 模式

```cypher
// All privileges in the system
SHOW PRIVILEGES YIELD *;

// Privileges for a specific user (as runnable commands)
SHOW USER alice PRIVILEGES AS COMMANDS;

// Privileges for a specific role
SHOW ROLE analyst PRIVILEGES YIELD privilege, action, resource, graph, segment;

// Privileges of roles granted to an auth rule [2026.09]
SHOW AUTH RULES salesRule PRIVILEGES AS COMMANDS;

// Find who has access to a database
SHOW PRIVILEGES YIELD *
WHERE graph = 'mydb'
RETURN role, action, resource, segment ORDER BY role;

// Find all DENY rules
SHOW PRIVILEGES YIELD *
WHERE access = 'DENIED'
RETURN role, action, resource, segment;
```

---

## 8. 内置角色（不要删除）

| 角色 | 范围 |
|---|---|
| `admin` | 完整 DBMS + 所有数据库 |
| `architect` | Schema 变更 + 所有数据库上的写入 |
| `publisher` | 所有数据库上的写入 |
| `editor` | 写入（不含 Schema 变更） |
| `reader` | 所有数据库上的只读 |
| `public` | 所有用户隐含拥有；默认的 home 数据库访问 |

分配内置角色：`GRANT ROLE reader TO alice;`

---

## 9. 认证提供方配置参考（运维层面 — 非 Cypher）

### 原生（默认）
```
dbms.security.auth_enabled=true
dbms.security.auth_max_failed_attempts=3    # lockout threshold
```

### LDAP
```
dbms.security.auth_provider=ldap
dbms.security.ldap.host=ldap://ldap.example.com
dbms.security.ldap.authentication.mechanism=simple
dbms.security.ldap.authentication.user_dn_template=uid={0},ou=users,dc=example,dc=com
dbms.security.ldap.authorization.group_membership_attributes=memberOf
dbms.security.ldap.authorization.group_to_role_mapping=\
  "cn=analysts,ou=groups,dc=example,dc=com" = analyst;\
  "cn=admins,ou=groups,dc=example,dc=com"   = admin
```

### OIDC / SSO（Okta、Auth0、Entra ID）
```
dbms.security.oidc.<alias>.display_name=Okta
dbms.security.oidc.<alias>.auth_flow=pkce      # `implicit` deprecated 2026.06, removal planned — keep pkce
dbms.security.oidc.<alias>.well_known_discovery_uri=https://example.okta.com/.well-known/openid-configuration
dbms.security.oidc.<alias>.audience=neo4j
dbms.security.oidc.<alias>.claims.username=email
dbms.security.oidc.<alias>.claims.groups=groups
dbms.security.oidc.<alias>.authorization.group_to_role_mapping=\
  "neo4j-analysts" = analyst;\
  "neo4j-admins"   = admin
```

配置变更需要**重启服务器**。映射中引用的角色必须在 Neo4j 中存在（原生角色或通过 Cypher 创建的角色）。

---

## 检查清单 — 新角色设置

- [ ] 确定所需操作：读 / 写 / 管理
- [ ] 确定目标数据库和图范围（全部标签还是特定标签）
- [ ] 确定必须隐藏的属性（→ DENY READ）
- [ ] 创建角色：`CREATE ROLE ... IF NOT EXISTS`
- [ ] 授予数据库上的 ACCESS
- [ ] 按需授予 MATCH / TRAVERSE / WRITE
- [ ] 对受限属性应用 DENY
- [ ] 运行 `SHOW ROLE ... PRIVILEGES AS COMMANDS` 进行验证
- [ ] 分配给用户：`GRANT ROLE ... TO ...`
- [ ] 用 `SHOW USER ... PRIVILEGES AS COMMANDS` 进行测试

完整权限语法 → [references/privilege-reference.md](references/privilege-reference.md)
