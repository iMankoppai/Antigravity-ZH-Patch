---
name: neo4j-snowflake-graph-analytics-skill
description: 直接在 Snowflake 内部运行 Neo4j Graph Analytics 算法（PageRank、Louvain、WCC、Dijkstra、KNN、
  Node2Vec、FastRP、GraphSAGE），无需移动数据。当通过 Neo4j Snowflake Native App 对 Snowflake 表运行图算法时使用
  （“GDS Snowflake”“graph algorithms in Snowflake”“Neo4j Graph Analytics”）。
  涵盖 explore → 准备投影视图 → project-compute-write 流程、
  图引擎要求的严格视图/列类型规则、精确的 SQL CALL 语法，以及
  两种模式下的权限设置——应用身份授予，以及 execute-as-user / 每用户 PAT 认证
  （程序化访问令牌、set_enable_custom_credentials、register_user_role、caller grants）。
  不涵盖 Cypher 或 Neo4j DBMS 查询——请使用 neo4j-cypher-skill。
  不涵盖 Aura Graph Analytics——请使用 neo4j-aura-graph-analytics-skill。
  不涵盖自管理 GDS——请使用 neo4j-gds-skill。
version: 1.2.2
allowed-tools: Bash WebFetch
---

Snowflake Native App——将图算法能力带入 Snowflake 内部。数据留在 Snowflake 中；投影成图，通过 SQL `CALL` 运行算法，结果写回 Snowflake 表。

**文档：** https://neo4j.com/docs/snowflake-graph-analytics/current/

---

## 何时使用
- 在 Snowflake 中运行图算法 / GDS
- 数据本就存放在 Snowflake 表中
- 按需 / 流水线型工作负载——临时会话，按会话分钟计费
- 分析期间与在线数据库完全隔离

## 何时不使用
- **带内置 GDS 插件的 Aura Pro** → `neo4j-gds-skill`
- **Aura Graph Analytics** → `neo4j-aura-graph-analytics-skill`
- **带内置 GDS 插件的自管理 Neo4j** → `neo4j-gds-skill`
- **编写 Cypher 查询** → `neo4j-cypher-skill`

---

## 端到端流程

这是行之有效的流程。不要直接跳到 `CALL`——大多数失败都源于跳过了数据准备步骤。

1. **探索（Explore）** 源数据——检查表的 DDL，了解列和类型。
2. **准备投影视图**——创建节点/关系视图，暴露出所需的关键列，并把每个属性转换（cast）为受支持的类型（见下方严格规则）。这是最关键的步骤。
3. **Project → Compute → Write**——用单条 `CALL` 运行算法，组装 `project`、`compute` 和 `write` 配置。
4. **检查并查找名称**——将数值结果与源表连接回来，以获得人类可读的标签。

---

## 步骤 1 — 探索源数据

在设计图之前先查看表的定义：

```sql
SELECT GET_DDL('TABLE', 'MY_DATABASE.MY_SCHEMA.MY_TABLE');
-- or inspect columns/types:
SELECT COLUMN_NAME, DATA_TYPE
FROM MY_DATABASE.INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'MY_SCHEMA' AND TABLE_NAME = 'MY_TABLE';
```

确定哪些表是**节点**，哪些表示它们之间的**关系**（边）。

---

## 步骤 2 — 准备投影视图（关键部分）

图引擎对列名和类型要求严格。**Snowflake 视图默认继承源列类型**，因此必须显式添加 `CAST`——对于属性列，绝不要在未 cast 的情况下 `SELECT col`。

创建视图，把表重塑为节点/关系格式：

```sql
CREATE OR REPLACE VIEW MY_DATABASE.MY_SCHEMA.MY_NODES_VW AS
SELECT ... FROM MY_DATABASE.MY_SCHEMA.MY_TABLE;
```

### 节点视图

- **关键列：** 将主键暴露为 `NODEID`。它必须是 `BIGINT` 或 `STRING`。始终**同时**显式起别名**并**转换：
  `SOURCE_COL::BIGINT AS NODEID` 或 `SOURCE_COL::STRING AS NODEID`。
- **允许的节点属性类型（精确）：** `BIGINT`、`DOUBLE`、`ARRAY`、`VECTOR(FLOAT, n)`。其他任何类型都必须 cast 为其中之一或丢弃。
- **复合键：** 用 `'++'` 拼接各部分。
- **命名：** `<table>_NODES_VW`。

### 源类型 → 视图类型转换规则

在从表中投影列时应用这些规则（除非重命名，否则保留原列名）：

| 源类型 | 操作 |
|---|---|
| 整数型数值（`INT`、`INTEGER`、`BIGINT`、`SMALLINT`、`TINYINT`、`BYTEINT`、`NUMBER(p,0)`） | `CAST(col AS BIGINT) AS col` |
| 小数型数值（`FLOAT`、`DOUBLE`、`REAL`、`DECIMAL(p,s>0)`、`NUMBER(p,s>0)`） | `CAST(col AS DOUBLE) AS col` |
| 数值型 `ARRAY` | 保留为 `ARRAY`（GraphSAGE 除外——见下文）。关系视图上不允许。 |
| `VECTOR(FLOAT, n)` | 原样保留。关系视图上不允许。 |
| `BOOLEAN` | **默认丢弃**。仅可选择性启用：`IFF(col, 1, 0)::BIGINT AS col` |
| `DATE`、`TIME`、`TIMESTAMP*` | **默认丢弃**。仅可选择性启用：`DATE_PART('EPOCH_SECOND', col)::BIGINT AS col`（告知用户单位） |
| `VARCHAR`、`CHAR`、`TEXT`、`STRING` | **丢弃**——不能作为图属性。若需按名称读取结果，请按关键列把输出连接回源表（见步骤 4） |
| `VARIANT`、`OBJECT`、`GEOGRAPHY`、`GEOMETRY`、`BINARY` | **丢弃**——不支持作为图属性 |

**最低公约数策略：** 默认只包含安全的列（数值 → BIGINT/DOUBLE、ARRAY、VECTOR）。布尔和类时间列需要显式选择性启用。丢弃列时，简要告知用户丢弃了哪些列及原因，以便他们要求恢复。

### 关系视图

- **关键列：** 暴露 `SOURCENODEID` 和 `TARGETNODEID`，使用与 `NODEID` 相同的规则进行 cast
  （`SOURCE_COL::BIGINT AS SOURCENODEID` 等）。每个值都必须匹配某个节点视图中已存在的 `NODEID`。
- **允许的关系属性类型（更窄）：** 仅 `BIGINT`、`DOUBLE`、`INT`。**不允许 `ARRAY`，不允许 `VECTOR`。**（文档将关系属性描述为 `FLOAT`；引擎接受这些整数/小数数值 cast，并将其视为权重——请保持数值型。）
- **命名：** `<table>_RELATIONSHIPS_VW`。

节点 + 关系视图示例：

```sql
CREATE OR REPLACE VIEW MY_DATABASE.MY_SCHEMA.USER_NODES_VW AS
SELECT user_id::BIGINT AS NODEID,
       CAST(age AS BIGINT)        AS age,
       CAST(balance AS DOUBLE)    AS balance
FROM MY_DATABASE.MY_SCHEMA.USERS;

CREATE OR REPLACE VIEW MY_DATABASE.MY_SCHEMA.TRANSFERS_RELATIONSHIPS_VW AS
SELECT from_user::BIGINT AS SOURCENODEID,
       to_user::BIGINT   AS TARGETNODEID,
       CAST(amount AS DOUBLE) AS amount
FROM MY_DATABASE.MY_SCHEMA.TRANSFERS;
```

> 所需的逻辑列名是 `nodeId` / `sourceNodeId` / `targetNodeId`——Snowflake 会将未加引号的标识符折叠为大写，所以 `NODEID` 等名称可以匹配。真正重要的是显式进行 cast。

---

## 步骤 3 — Project → Compute → Write

每次运行都是单条 `CALL`，其第一个参数是计算池，第二个是包含三部分的 JSON 配置。注意 JSON 在 Snowflake SQL 中使用**单引号**。

> **应用名：** `Neo4j_Graph_Analytics` 只是*默认*安装名。如果应用以其他名称安装，请在所有位置替换它——包括过程调用（`<APP>.graph.<algo>`）、`preview.*` / `admin.*` 调用、`USE DATABASE <APP>` 语句，以及下方的权限授予。用 `SHOW APPLICATIONS;` 检查。

```sql
USE ROLE MY_CONSUMER_ROLE;

CALL Neo4j_Graph_Analytics.graph.wcc('CPU_X64_XS', {
    'defaultTablePrefix': 'MY_DATABASE.MY_SCHEMA',
    'project': {
        'nodeTables': ['USER_NODES_VW'],
        'relationshipTables': {
            'TRANSFERS_RELATIONSHIPS_VW': {
                'sourceTable': 'USER_NODES_VW',
                'targetTable': 'USER_NODES_VW',
                'orientation': 'NATURAL'
            }
        }
    },
    'compute': { 'consecutiveIds': true },
    'write': [{
        'nodeLabel': 'USER_NODES_VW',
        'outputTable': 'result_wcc_user_communities'
    }]
});

SELECT * FROM MY_DATABASE.MY_SCHEMA.result_wcc_user_communities;
```

### 配置各部分

- **`defaultTablePrefix`** — 设为视图和输出表所在的数据库 + schema（`DB.SCHEMA`）；这样便可用短名称引用它们。
- **`project`** — `nodeTables`（数组；每项映射为一个标签）和 `relationshipTables`（映射；每个键映射为一个类型，含 `sourceTable`/`targetTable`/`orientation`）。
- **`compute`** — 算法参数。省略任何值为 null 的参数。
- **`write`** — 写入目标的**列表**。`nodeLabel`（或 `sourceLabel`/`targetLabel`）是被写入节点的**表/视图名称**。关系结果使用 `relationshipType`。

### 方向（Orientation）

在 `relationshipTables` 中为每个关系表设置 `orientation`：

- `NATURAL`（默认）— 有向，源 → 目标（按表中存储的方向）。
- `UNDIRECTED` — 视为双向（每条关系在两个方向上都被包含）。
- `REVERSE` — 方向翻转，目标 → 源。

根据算法选择：
- **`UNDIRECTED`** — 将边对称处理的社区检测：WCC、Louvain、Leiden、Label Propagation。**Triangle Count 要求 `UNDIRECTED`。**
- **`NATURAL`** — 有向流和排名：PageRank、Article Rank、Dijkstra 及其他路径查找算法、Max Flow。**Node Similarity** 期望一个*二分*图（两个不相交的节点集），以 `NATURAL` 投影；改用 `REVERSE` 来比较另一个节点集。
- **KNN 完全忽略关系**——相似度来自节点属性，因此方向对它没有影响（K-Means 同样只使用节点属性）。

### 计算池（第一个 `CALL` 参数）

| 计算池 | 用途 |
|---|---|
| `CPU_X64_XS` | 默认 — 开发 / 小图 |
| `CPU_X64_S/M/L` | 逐级更大 |
| `HIGHMEM_X64_S/M/L` | 大图，对 CPU 需求较低 |
| `GPU_NV_XS`、`GPU_NV_S`、`GPU_GCP_NV_L4_1_24G` | GraphSAGE / GPU 工作负载（可用性因区域而异） |

除非用户另有要求，或 GraphSAGE 使 GPU 池更合适，否则优先使用 `CPU_X64_XS`。见 [Estimating Jobs](https://neo4j.com/docs/snowflake-graph-analytics/current/jobs/estimation/)。

### 结果表命名

输出表命名为 `result_<algotag>_<short_description>`，仅使用下划线，不含空格/特殊字符（例如 `result_louvain_customer_segments`）。写入多个节点标签时，每个标签使用一张独立的表。

---

## 步骤 4 — 检查并查找名称

算法产生的内容取决于其类型——查看算法的 **write** 配置：

- **节点属性结果**（中心性、社区检测、k-means、嵌入、FastPath）——以 `NODEID` 为键的表。
- **关系结果**（Node Similarity、KNN、Dijkstra 及其他路径查找、Max Flow）——以 `SOURCENODEID` / `TARGETNODEID` 为键的表。BFS 及其他异构写入还会增加 `SOURCELABEL` / `TARGETLABEL`，节点 ID 以字符串存储。
- **模型**（GraphSAGE 训练）——无输出表；它写入模型目录。之后用该模型进行预测，预测会产生节点属性表。

VARCHAR 标签在投影期间已被丢弃，因此要按关键列把结果连接回**源表**以获得可读名称。对于节点属性结果，按 `NODEID` 连接：

```sql
SELECT u.name, u.country, r.score
FROM MY_DATABASE.MY_SCHEMA.result_page_rank_influence r
JOIN MY_DATABASE.MY_SCHEMA.USERS u
  ON r.NODEID = u.user_id
ORDER BY r.score DESC
LIMIT 10;
```

对于关系结果，将源表连接两次——一次按 `SOURCENODEID`，一次按 `TARGETNODEID`。

---
 
## 可用算法

过程 = `Neo4j_Graph_Analytics.graph.<name>`。下列名称是精确名称。

完整的算法 compute/write 参数参考，见 [references/algorithms.md](references/algorithms.md)。

### 社区检测
| 算法 | 过程 | 使用场景 |
|---|---|---|
| Weakly Connected Components | `wcc` | 查找不连通的子图 |
| Louvain | `louvain` | 社区检测（模块度） |
| Leiden | `leiden` | 社区检测，比 Louvain 更稳定 |
| Label Propagation | `label_propagation` | 通过标签传播进行快速社区检测 |
| K-Means | `kmeans` | 按节点属性对节点聚类 |
| Triangle Count | `triangle_count` | 局部聚类 / 稠密子图 |
| K-1 Coloring | `k1coloring` | 为节点着色使相邻节点颜色不同（贪心，少量颜色） |

### 中心性
| 算法 | 过程 | 使用场景 |
|---|---|---|
| PageRank | `page_rank` | 按影响力对节点排名 |
| Article Rank | `article_rank` | PageRank 变体，降低高度数邻居的权重 |
| Betweenness | `betweenness` | 查找桥接节点 |
| Degree | `degree` | 统计直接连接数 |

### 路径查找
| 算法 | 过程 | 使用场景 |
|---|---|---|
| Dijkstra Source-Target | `dijkstra` | 从源到目标（或多个目标）或节点对的最短路径 |
| Dijkstra Single-Source | `dijkstra_single_source` | 从一个节点到所有其他节点的最短路径 |
| Delta-Stepping SSSP | `delta_stepping` | 并行单源最短路径 |
| Breadth First Search | `bfs` | 从源节点进行 BFS 遍历 |
| Yen's K-Shortest Paths | `yens` | 前 K 条最短无环路径 |
| Max Flow | `max_flow` | 带容量的最大流 |
| Min-Cost Max Flow | `max_flow_min_cost` | 最小化总成本的最大流 |
| FastPath | `fastpath` | 快速近似最短路径 |

### 相似度
| 算法 | 过程 | 使用场景 |
|---|---|---|
| Node Similarity | `node_similarity` | 按共享邻居找出相似节点 |
| Filtered Node Similarity | `node_similarity_filtered` | 带源/目标过滤的节点相似度 |
| KNN | `knn` | K 个最相似的节点 |
| Filtered KNN | `knn_filtered` | 带源/目标过滤的 KNN |

### 节点嵌入
| 算法 | 过程 | 使用场景 |
|---|---|---|
| FastRP | `fast_rp` | 快速节点嵌入 |
| Node2Vec | `node2vec` | 随机游走节点嵌入 |
| HashGNN | `hashgnn` | 受 GNN 启发、无需训练的嵌入 |

### GraphSAGE（图机器学习）
| 算法 | 过程 | 使用场景 |
|---|---|---|
| Node Classification — train | `gs_nc_train` | 训练监督式节点标签模型 |
| Node Classification — predict | `gs_nc_predict` | 用已训练的模型预测标签 |
| Unsupervised embeddings — train | `gs_unsup_train` | 训练无监督嵌入模型 |
| Unsupervised embeddings — predict | `gs_unsup_predict` | 用已训练的模型推断嵌入 |

### 模型目录（GraphSAGE）
`show_models`、`model_exists`、`drop_model`。

---

## 算法特定说明

### GraphSAGE
- GraphSAGE 使用的投影节点表**不得**包含 `ARRAY` 属性列——多值数值特征请使用 `VECTOR(FLOAT, n)`。（非 GraphSAGE 算法使用 `ARRAY` 是可以的。）
- 特征列必须**非 NULL 且有限**——在视图中过滤、填充或排除可为空的特征列。对于 `gs_nc_train`，`targetProperty` 是标签（不是特征），可以为 NULL。
- 运行前，列出 GraphSAGE 将为每个节点表使用的节点属性：所有非 `NODEID` 列；对于 `gs_nc_train` 排除 `targetProperty`。
- 训练（`gs_nc_train`、`gs_unsup_train`）可能很慢，并可能使用 GPU 池（`GPU_NV_S`）。在运行训练前，展示确切的 `CALL` 并获得明确确认。

### Dijkstra Source-Target（`dijkstra`）
提供以下之一：
- 单个节点对：`sourceNode` + `sourceNodeTable`、`targetNode` + `targetNodeTable`；
- 一个源、多个目标：`sourceNode` + `sourceNodeTable`、`targetNodes`（列表）+ `targetNodesTable`；
- 多个节点对：`sourceTargetNodePairsTable`（含 `SOURCENODEID`/`TARGETNODEID` 列的表）+ `sourceNodeTable` + `targetNodeTable`。

### 通用
- 切勿将 `NODEID` 本身用作算法属性。
- 省略任何值为 null 的配置参数。

---

## 安装

1. 从 [Snowflake Marketplace](https://app.snowflake.com/marketplace/listing/GZTDZH40CN/neo4j-neo4j-graph-analytics) 安装 **Neo4j Graph Analytics**（默认应用名 `Neo4j_Graph_Analytics`）。
2. 出现提示时**启用 Event sharing**。
3. **Data Products → Apps → Neo4j Graph Analytics → Privileges → Grant**：授予 `CREATE COMPUTE POOL` 和 `CREATE WAREHOUSE`，然后点击 **Activate**。

---

## 权限设置

分两部分。**Part A**（消费者角色）始终必需。**Part B** 是**恰好一种**数据访问模式的选择——不要混用。

| 模式 | 任务以谁运行 | 授予方式 | 何时使用 |
|---|---|---|---|
| **应用身份**（OAuth）— *默认* | 应用自身 | 直接授予 + 授予给应用的数据库角色 | 默认。最简单，一套授予即覆盖每个用户。 |
| **Execute-as-user** — *预览* | 调用用户，在已注册的角色下 | 向应用 `GRANT CALLER` / `GRANT INHERITED CALLER` | 你需要在 `QUERY_HISTORY` 中按用户归属，并对任务进行按用户授权。 |

Execute-as-user 是**粒度**升级，而非安全升级，且会引入实际的运维面（一个 PAT、一个 SECRET、每个用户的 caller grants，以及令牌轮换）。默认使用应用身份；仅当用户明确要求按用户身份或按用户授权时才设置 execute-as-user。

### Part A — 消费者角色（两种模式都需要）

```sql
USE ROLE ACCOUNTADMIN;

-- Consumer role for app users
CREATE ROLE IF NOT EXISTS MY_CONSUMER_ROLE;
GRANT APPLICATION ROLE Neo4j_Graph_Analytics.app_user TO ROLE MY_CONSUMER_ROLE;
SET MY_USER = (SELECT CURRENT_USER());
GRANT ROLE MY_CONSUMER_ROLE TO USER IDENTIFIER($MY_USER);

-- Optional: admin role, needed for the app_admin procedures (compute pools, execute-as-user flag)
CREATE ROLE IF NOT EXISTS MY_ADMIN_ROLE;
GRANT APPLICATION ROLE Neo4j_Graph_Analytics.app_admin TO ROLE MY_ADMIN_ROLE;
GRANT ROLE MY_ADMIN_ROLE TO USER IDENTIFIER($MY_USER);

-- Let the consumer role read output tables
GRANT USAGE ON DATABASE MY_DATABASE TO ROLE MY_CONSUMER_ROLE;
GRANT USAGE ON SCHEMA MY_DATABASE.MY_SCHEMA TO ROLE MY_CONSUMER_ROLE;
GRANT SELECT ON FUTURE TABLES IN SCHEMA MY_DATABASE.MY_SCHEMA TO ROLE MY_CONSUMER_ROLE;
```

> `ACCOUNTADMIN` **不会**隐式持有应用角色。`preview.*` 和 `admin.*` 过程需要已被授予 `Neo4j_Graph_Analytics.app_admin` 的角色；算法过程和 `preview.register_user_role` 需要 `app_user`。

### Part B，选项 1 — 应用身份授予（默认，每个数据库/schema 运行一次）

```sql
USE ROLE ACCOUNTADMIN;

-- Database role granting the app access to your data
USE DATABASE MY_DATABASE;
CREATE DATABASE ROLE IF NOT EXISTS MY_DB_ROLE;
GRANT USAGE ON DATABASE MY_DATABASE TO DATABASE ROLE MY_DB_ROLE;
GRANT USAGE ON SCHEMA MY_DATABASE.MY_SCHEMA TO DATABASE ROLE MY_DB_ROLE;
GRANT SELECT ON ALL TABLES  IN SCHEMA MY_DATABASE.MY_SCHEMA TO DATABASE ROLE MY_DB_ROLE;
GRANT SELECT ON ALL VIEWS   IN SCHEMA MY_DATABASE.MY_SCHEMA TO DATABASE ROLE MY_DB_ROLE;
-- FUTURE grants let the app read tables/views it creates (needed for chaining)
GRANT SELECT ON FUTURE TABLES IN SCHEMA MY_DATABASE.MY_SCHEMA TO DATABASE ROLE MY_DB_ROLE;
GRANT SELECT ON FUTURE VIEWS  IN SCHEMA MY_DATABASE.MY_SCHEMA TO DATABASE ROLE MY_DB_ROLE;
GRANT CREATE TABLE ON SCHEMA MY_DATABASE.MY_SCHEMA TO DATABASE ROLE MY_DB_ROLE;
GRANT DATABASE ROLE MY_DB_ROLE TO APPLICATION Neo4j_Graph_Analytics;

USE ROLE MY_CONSUMER_ROLE;   -- run algorithms as the consumer role
```

> 在各处将 `MY_DATABASE`、`MY_SCHEMA`、`MY_CONSUMER_ROLE`、`MY_DB_ROLE` 替换为你的名称。

### Part B，选项 2 — Execute-as-user（预览）

任务以调用用户的身份、使用程序化访问令牌（PAT）进行认证，处于该用户持有的某个角色之下，受 caller grants 约束。过程位于 `<APP>.preview.*`，在 GA 之前可能变化。

引导过程无法端到端脚本化：`ADD PROGRAMMATIC ACCESS TOKEN` 只会**显示一次**令牌密钥。运行 Part 1，向用户取得令牌，然后运行 Part 2。

```sql
-- PART 1 — enable execute-as-user and mint the token
USE ROLE ACCOUNTADMIN;

-- Prerequisite: PATs require a network policy by default, else jobs fail with
-- "Fail : Network policy is required". This waives it; a user who already has a
-- network policy keeps it enforced. Authentication policies are schema-level objects.
USE SCHEMA MY_DATABASE.MY_SCHEMA;
CREATE AUTHENTICATION POLICY IF NOT EXISTS pat_no_network_required
    PAT_POLICY = (NETWORK_POLICY_EVALUATION = ENFORCED_NOT_REQUIRED);
ALTER USER <user_name> SET AUTHENTICATION POLICY pat_no_network_required;

-- Step 1: enable on the install — once per account, not per user. Needs app_admin,
-- which ACCOUNTADMIN does not hold implicitly.
USE ROLE MY_ADMIN_ROLE;
CALL Neo4j_Graph_Analytics.preview.set_enable_custom_credentials(TRUE);

-- Step 2a: mint a PAT bound to the role. ROLE_RESTRICTION is load-bearing — it pins
-- the PAT to this role whatever the app's registry says, and must match Step 2d.
USE ROLE ACCOUNTADMIN;
ALTER USER <user_name> ADD PROGRAMMATIC ACCESS TOKEN app_pat
    DAYS_TO_EXPIRY = 365
    ROLE_RESTRICTION = 'MY_CONSUMER_ROLE';
```

> **停。** 现在从最后一个结果集中复制 `token_secret` 列——Snowflake 不会再次显示它——并粘贴到下方的 `SECRET_STRING` 中。

```sql
-- PART 2, steps 2b + 2c — store the token, let the app read it. These are direct
-- grants, not caller grants: the app reads the secret as itself at job-start time.
USE ROLE ACCOUNTADMIN;
CREATE OR REPLACE SECRET MY_DATABASE.MY_SCHEMA.pat_secret_<user_name>
    TYPE = GENERIC_STRING                    -- GENERIC_STRING only; PASSWORD won't work
    SECRET_STRING = '<paste_token_secret_here>';
GRANT USAGE ON DATABASE MY_DATABASE TO APPLICATION Neo4j_Graph_Analytics;
GRANT USAGE ON SCHEMA MY_DATABASE.MY_SCHEMA TO APPLICATION Neo4j_Graph_Analytics;
GRANT READ ON SECRET MY_DATABASE.MY_SCHEMA.pat_secret_<user_name>
    TO APPLICATION Neo4j_Graph_Analytics;
```

```sql
-- Step 2d: register the user. Run in a session opened AS <user_name> so
-- CURRENT_USER() resolves to them, under a role holding app_user.
USE ROLE MY_CONSUMER_ROLE;
CALL Neo4j_Graph_Analytics.preview.register_user_role(
    'MY_CONSUMER_ROLE',                              -- = ROLE_RESTRICTION on the PAT
    'MY_DATABASE.MY_SCHEMA.pat_secret_<user_name>'   -- FQN of the SECRET
);
```

```sql
-- Step 2e: caller grants for the data the jobs read and write. Repeat per schema —
-- this is the only widening mechanism, and there is no FUTURE equivalent, so re-run
-- it after creating views or tables a later job needs to read.
USE ROLE ACCOUNTADMIN;
GRANT CALLER USAGE ON DATABASE MY_DATABASE TO APPLICATION Neo4j_Graph_Analytics;
GRANT CALLER USAGE ON SCHEMA MY_DATABASE.MY_SCHEMA TO APPLICATION Neo4j_Graph_Analytics;
GRANT CALLER CREATE TABLE ON SCHEMA MY_DATABASE.MY_SCHEMA TO APPLICATION Neo4j_Graph_Analytics;
GRANT INHERITED CALLER INSERT ON ALL TABLES IN SCHEMA MY_DATABASE.MY_SCHEMA TO APPLICATION Neo4j_Graph_Analytics;
GRANT INHERITED CALLER SELECT ON ALL TABLES IN SCHEMA MY_DATABASE.MY_SCHEMA TO APPLICATION Neo4j_Graph_Analytics;
GRANT INHERITED CALLER SELECT ON ALL VIEWS  IN SCHEMA MY_DATABASE.MY_SCHEMA TO APPLICATION Neo4j_Graph_Analytics;
```

查看管理员为某个用户注册了什么：
```sql
CALL Neo4j_Graph_Analytics.preview.get_user_role_registration('<user_name>');
```

轮换与回滚：

```sql
-- Rotate: mint a new PAT, re-point the secret (its grants survive), drop the old PAT.
-- The registry needs no update — the SECRET name didn't change, only its value.
CREATE OR REPLACE SECRET MY_DATABASE.MY_SCHEMA.pat_secret_<user_name>
    TYPE = GENERIC_STRING SECRET_STRING = '<new_token_secret>';
ALTER USER <user_name> REMOVE PROGRAMMATIC ACCESS TOKEN <old_pat_name>;

-- Disable account-wide: app identity returns for everyone, registrations sit unused.
CALL Neo4j_Graph_Analytics.preview.set_enable_custom_credentials(FALSE);

-- Revoke a single user, leaving registry and SECRET intact:
REVOKE READ ON SECRET MY_DATABASE.MY_SCHEMA.pat_secret_<user_name>
    FROM APPLICATION Neo4j_Graph_Analytics;

-- ...or invalidate the credential outright:
ALTER USER <user_name> REMOVE PROGRAMMATIC ACCESS TOKEN app_pat;
```

---

## 常见模式

### 链式算法
由于结果写入表（且 `FUTURE TABLES` 授予让应用能读取它创建的内容），可将一个算法的输出喂给下一个：

```sql
-- 1. Embeddings
CALL Neo4j_Graph_Analytics.graph.fast_rp('CPU_X64_XS', { ... });
-- 2. KNN over the embedding output table (projected as a node view)
CALL Neo4j_Graph_Analytics.graph.knn('CPU_X64_XS', { ... });
```

在 execute-as-user 模式下没有 `FUTURE` caller grants——在基于中间结果表创建投影视图后，需重新运行步骤 2e 的 caller grants，以便下一个算法能够读取它们。

### 将分类数据转换为数值
图引擎不能将 VARCHAR 用作属性。在视图中将类别映射为数字（例如 `CASE` / 查找连接）。要按原始标签读取结果，请按关键列把输出表连接回源表。

---

## 故障排除

| 问题 | 解决方案 |
|---|---|
| `Insufficient privileges` | 应用需要对你表/视图的 `SELECT` 权限，以及在 schema 上的 `CREATE TABLE`（见权限设置） |
| `no role registered for <user>` | Execute-as-user 已启用，但该用户未引导——以该用户身份运行 `preview.register_user_role`（Part B 选项 2，步骤 2d） |
| `Network policy is required` | 该 PAT 用户没有允许在无网络策略下使用 PAT 的认证策略——用 `PAT_POLICY = (NETWORK_POLICY_EVALUATION = ENFORCED_NOT_REQUIRED)` 附加一个 |
| 在 execute-as-user 模式下出现 `does not exist or not authorized` | 缺少数据 schema 上的 caller grants，或对象是在 `ON ALL ...` 授予之后创建的——重新运行步骤 2e |
| 在 execute-as-user 模式下写入时出现 `Insufficient privileges to operate on table` | 写入 schema 缺少 `CALLER CREATE TABLE` / `INHERITED CALLER INSERT ON ALL TABLES`——重新运行步骤 2e |
| `USE ROLE not allowed` / `Current session is restricted` | 在角色受限的 PAT 下属预期——一切都必须从已注册的主角色可达 |
| 在 execute-as-user 模式下任务在认证阶段报错 | PAT 的 `ROLE_RESTRICTION` 与已注册角色不匹配，或 SECRET 不是 `TYPE = GENERIC_STRING` |
| `Column nodeId not found` | 视图缺少关键列或 cast 错误——用显式 cast 暴露 `NODEID`（以及 `SOURCENODEID`/`TARGETNODEID`） |
| 属性出现类型 / 投影错误 | 某属性列未 cast 为受支持类型——应用转换规则；关系属性必须是 `BIGINT`/`DOUBLE`/`INT` |
| GraphSAGE 因特征失败 | 移除 `ARRAY` 特征列（改用 `VECTOR`），并确保特征非 NULL/有限 |
| `Compute pool not available` | 计算池可能仍在启动；等一分钟再重试 |
| 算法没有返回结果 | 检查节点/关系视图非空，且每个 `SOURCENODEID`/`TARGETNODEID` 都匹配某个 `NODEID` |

完整指南：https://neo4j.com/docs/snowflake-graph-analytics/current/troubleshooting/

---

## 延伸阅读

- [Getting Started](https://neo4j.com/docs/snowflake-graph-analytics/current/getting-started/)
- [Running Jobs](https://neo4j.com/docs/snowflake-graph-analytics/current/jobs/) · [Scaling Out](https://neo4j.com/docs/snowflake-graph-analytics/current/jobs/scale-out/) · [Estimating Jobs](https://neo4j.com/docs/snowflake-graph-analytics/current/jobs/estimation/)
- [All Algorithms](https://neo4j.com/docs/snowflake-graph-analytics/current/algorithms/)
- [Administration](https://neo4j.com/docs/snowflake-graph-analytics/current/administration/) · [Execute-as-user authentication](https://neo4j.com/docs/snowflake-graph-analytics/current/administration/#administration-execute-as-user)
- [Integration with Cortex Agent](https://neo4j.com/docs/snowflake-graph-analytics/current/agents/)
- [Basket Analysis Example on TPC-H Data](https://github.com/neo4j-product-examples/snowflake-graph-analytics/tree/main/basket-analysis)

---

## 检查清单

- [ ] 应用已安装；消费者角色已创建；已设置**一种**数据访问模式（应用身份*或* execute-as-user）
- [ ] 若为 execute-as-user：安装开关已开启，PAT 以匹配的 `ROLE_RESTRICTION` 铸造，SECRET 可被应用读取，用户已注册，caller grants 已发放
- [ ] 视图暴露 `NODEID` / `SOURCENODEID` / `TARGETNODEID`，每个属性都显式 cast
- [ ] `orientation` 与算法匹配
- [ ] 单条 `CALL` 无错误运行；输出表已填充
- [ ] 结果已连接回源表以获得可读标签
