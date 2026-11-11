---
name: neo4j-cli-tools-skill
description: 在使用 Neo4j 命令行工具时使用——neo4j-cli（现代统一
  CLI——通过 Bolt 执行 Cypher、schema 检查、Aura 管理、Docker 容器、凭据
  管理、agent 技能目录安装；用 curl -sSfL https://neo4j.sh/install.sh | bash 安装）、
  neo4j-admin（备份、恢复、导入、内存规划）、cypher-shell（临时查询、
  脚本、CI/CD）或 neo4j-mcp（快速安装 MCP 服务器）。
  不涵盖 Cypher 查询编写——请使用 neo4j-cypher-skill。
  不涵盖驱动升级——请使用 neo4j-migration-skill。
  不涵盖完整的 MCP 编辑器配置——请使用 neo4j-mcp-skill。
allowed-tools: WebFetch, Bash
version: 1.0.15
---

# Neo4j CLI 工具技能

## 何时使用

- Cypher 查询、schema 检查、Aura、Docker、凭据、agent 技能 → `neo4j-cli`（**首选**）
- 管理任务：备份、恢复、导入、内存规划 → `neo4j-admin`
- 临时查询、脚本、CI/CD（需要 Java）→ `cypher-shell`
- MCP 服务器安装 → `neo4j-mcp`

## 何时不使用

- **编写或优化 Cypher 查询** → `neo4j-cypher-skill`
- **升级 Neo4j 驱动或迁移 Cypher 语法** → `neo4j-migration-skill`
- **从零开始一个新 Neo4j 项目** → `neo4j-getting-started-skill`

## 可用的 CLI 工具

### 1. neo4j-cli

现代统一 CLI。Bolt 原生 Cypher、schema 检查、Aura 管理、本地 Docker、凭据存储、agent 技能目录安装。单一二进制——无需 Java。

**安装：**
```bash
curl -sSfL https://neo4j.sh/install.sh | bash   # recommended
brew install neo4j-labs/tap/neo4j-cli            # Homebrew
pip install neo4j-cli / pipx install neo4j-cli   # PyPI
npm i -g @neo4j-labs/cli                         # npm
```

**自更新：** `neo4j-cli update`（同时会自动刷新已安装的技能）

**关键子命令：**

| 子命令 | 用途 |
|---|---|
| `neo4j-cli query [cypher]` | 通过 Bolt 运行 Cypher——自动改写 HTTP URI |
| `neo4j-cli query :schema` | 检查标签、关系类型、索引、约束 |
| `neo4j-cli query :embed [text]` | 独立计算 embedding 向量 |
| `neo4j-cli aura instance ...` | 预配和管理 Aura 实例 |
| `neo4j-cli aura agent ...` | 管理 Aura Agents（list/get/create/invoke） |
| `neo4j-cli docker create/start/stop/delete` | 管理本地 Neo4j Docker 容器 |
| `neo4j-cli credential aura-client ...` | 存储 Aura API 凭据 |
| `neo4j-cli credential dbms ...` | 存储 Neo4j 连接配置档（URI + 认证） |
| `neo4j-cli credential embed ...` | 存储 embedding provider 凭据 |
| `neo4j-cli skill install [skill-name]` | 安装自身技能或任意目录技能 |
| `neo4j-cli skill list / check / remove` | 管理已安装的 agent 技能 |
| `neo4j-cli update` | 自更新二进制 + 刷新已安装技能 |

**关键模式：**
```bash
# Schema-first workflow: always inspect schema before writing Cypher
neo4j-cli query :schema --format toon

# Run Cypher (bolt URIs auto-rewritten; HTTP URIs rewritten to Bolt)
neo4j-cli query "MATCH (n:Person) RETURN n.name LIMIT 5" \
  --uri neo4j+s://xxx.databases.neo4j.io --username neo4j --password $PASS

# Inline embedding parameter (text → vector; $q bound to []float32)
neo4j-cli query "MATCH (c) SEARCH c IN (VECTOR INDEX chunk_embedding FOR \$q LIMIT 5) SCORE AS score RETURN c.text, score" \
  --param q:embed="graph database performance"

# Store a connection profile, then query without flags
neo4j-cli credential dbms add --name prod \
  --uri neo4j+s://xxx.databases.neo4j.io --username neo4j --password $PASS
neo4j-cli query --credential prod "MATCH (n) RETURN count(n)"

# Local Docker: persistent or ephemeral
neo4j-cli docker create --name dev --wait --rw
neo4j-cli query --credential dev 'RETURN 1 AS n'
neo4j-cli docker create --name tmp --ephemeral --env-out-file /tmp/n.env --wait --rw
neo4j-cli query --env /tmp/n.env 'RETURN 1 AS n'

# Install skills from catalog (neo4j-contrib/neo4j-skills)
neo4j-cli skill install                          # self-skill into all detected agents
neo4j-cli skill install neo4j-cypher-skill       # one catalog skill, all agents
neo4j-cli skill install --all                    # self-skill + every catalog skill
neo4j-cli skill install --agent claude-code      # scope to one agent
neo4j-cli skill check                            # detect drift after upgrades
```

**Agent 输出：** 始终使用 `--format toon`——比 JSON 少约 40% 的 token。设置为默认：`neo4j-cli config set format toon`。

**写入闸门：** 在 agent harness 下，写操作需要 `--rw`。不要预先添加它——如果命令报错“this command writes; pass --rw to allow it”，请把错误呈现出来并向用户询问一次。

**异步操作：** `instance create/resize/destroy` 和 `docker create` 接受 `--wait`，以阻塞直到终态。

**凭据优先级：** flag > OS 环境变量（`NEO4J_URI`、`NEO4J_USERNAME`、`NEO4J_PASSWORD`、`NEO4J_DATABASE`）> `.env` 向上查找 > 已存储的凭据。

**支持的 agent：** Claude Code、Cursor、Windsurf、Copilot、Gemini CLI、Antigravity CLI、Cline、Codex、OpenCode、Junie 等。Antigravity：技能会落到 `~/.gemini/antigravity/skills`。

完整参考：`neo4j-cli skill install` 会在你的 agent 中保持一个始终同步的技能。

---

### 2. neo4j-admin

随 Neo4j 附带。备份、恢复、dump/load、CSV 导入、内存规划、密码重置。以 Neo4j 系统用户运行。

参考：[neo4j-admin-reference.md](references/neo4j-admin-reference.md)

### 3. cypher-shell

交互式 Cypher REPL。需要 Java 21。随 Neo4j 附带。用于临时查询、基于文件的批处理脚本、CI/CD 流水线。

参考：[cypher-shell-reference.md](references/cypher-shell-reference.md)

### 4. aura-cli

旧版 Aura 云 CLI。**新工作请优先使用 `neo4j-cli aura`**——它覆盖所有 aura-cli 操作，外加凭据存储、Docker 和 agent 技能。

参考：[aura-cli-reference.md](references/aura-cli-reference.md)

### 5. neo4j-mcp

用于 AI agent 集成的 MCP 服务器。完整安装 + 编辑器配置 → 使用 `neo4j-mcp-skill`（涵盖 Claude Code、Desktop、Cursor、Windsurf、VS Code、Kiro、stdio 与 HTTP 传输、故障排查）。

```bash
pip install neo4j-mcp-server && neo4j-mcp --version
```

参考：[neo4j-mcp-reference.md](references/neo4j-mcp-reference.md)

## 备份与恢复

### 版本闸门

在线备份需要 **Enterprise Edition**。Community Edition 用户只能使用 dump/load（数据库必须离线）。

### 备份（Enterprise——数据库保持在线）

```bash
# Full online backup — database stays online during backup
neo4j-admin database backup \
  --to-path=/backups/ \
  --database=neo4j \
  --compress

# Differential backup — only changes since last full backup (faster)
neo4j-admin database backup \
  --to-path=/backups/ \
  --database=neo4j \
  --type=DIFF \
  --compress

# Backup to cloud storage (S3, GCS, or HTTPS)
neo4j-admin database backup \
  --to-path=s3://my-bucket/neo4j-backups/ \
  --database=neo4j
```

### 恢复（Enterprise）

**AGENT GATE——破坏性操作**：在运行恢复前，向用户展示确切的命令和目标数据库名称，并等待明确确认。恢复会覆盖现有数据库。

```bash
# Restore from a full or differential backup
# Requires DB to be stopped, or use --force-offline for a running instance
neo4j-admin database restore \
  --from-path=/backups/neo4j-2026-01-15T10-00-00/ \
  --database=neo4j \
  --overwrite-destination=true

# Restore to a new database name (non-destructive path)
neo4j-admin database restore \
  --from-path=/backups/neo4j-2026-01-15T10-00-00/ \
  --database=neo4j-restored
```

### Dump / Load（所有版本——数据库必须离线）

用于迁移、开发/测试数据传输以及 Community Edition 备份。

```bash
# Dump — stop the database first, or pass --force-offline
neo4j-admin database dump --to-path=/exports/ neo4j

# Load — overwrites if target DB exists
neo4j-admin database load \
  --from-path=/exports/neo4j.dump \
  --database=neo4j \
  --overwrite-destination=true
```

**AGENT GATE——破坏性操作**：在以 `--overwrite-destination=true` 运行 load 前，与用户确认目标数据库名称和路径。

### 关键 flag

| Flag | 说明 |
|---|---|
| `--compress` | 对备份归档使用 Zstd 压缩 |
| `--type=DIFF` | 差异备份：仅自上次完整备份以来的变更 |
| `--to-path` | 本地路径或 `s3://`、`gs://`、`https://` |
| `--overwrite-destination=true` | 目标数据库已存在时必需 |
| `--force-offline` | 在某些场景下允许对运行中的数据库进行备份/恢复 |

### 时间点恢复策略

- **完整备份**：每周（例如每周日）
- **差异备份**：每天（仅捕获自上次完整备份以来的变更）
- **命名约定**：在路径中包含时间戳——例如 `/backups/neo4j-2026-01-19T02-00-00/`
- **恢复顺序**：先应用完整备份，然后按时间顺序依次应用每个差异备份

```bash
# Example: restore Sunday full + Monday + Tuesday differentials
neo4j-admin database restore \
  --from-path=/backups/neo4j-2026-01-19T02-00-00/ \
  --database=neo4j --overwrite-destination=true

neo4j-admin database restore \
  --from-path=/backups/neo4j-2026-01-20T02-00-00/ \
  --database=neo4j --overwrite-destination=true

neo4j-admin database restore \
  --from-path=/backups/neo4j-2026-01-21T02-00-00/ \
  --database=neo4j --overwrite-destination=true
```

---

## 环境变量（neo4j-admin / cypher-shell）

- `NEO4J_URI` / `NEO4J_ADDRESS`——连接 URI
- `NEO4J_USERNAME` / `NEO4J_PASSWORD` / `NEO4J_DATABASE`
- `NEO4J_CONF`——neo4j.conf 目录的路径
- `NEO4J_HOME`——Neo4j 安装目录

优先级：flag > 环境变量 > 配置文件。neo4j-cli 使用自己的凭据存储——见 `neo4j-cli credential dbms`。

## 资源

- [Neo4j 运维手册](https://neo4j.com/docs/operations-manual/current/)
- [Cypher Shell 文档](https://neo4j.com/docs/operations-manual/current/cypher-shell/)
- [Aura CLI GitHub](https://github.com/neo4j/aura-cli)
- [Neo4j MCP 文档](https://neo4j.com/docs/mcp/current/)
- [Neo4j 开发者门户](https://neo4j.com/developer/)

---

## 核对清单

- [ ] 选择了正确的工具：neo4j-cli（首选）/ neo4j-admin / cypher-shell / neo4j-mcp
- [ ] 如果使用 neo4j-cli：在安装或升级后运行 `neo4j-cli skill install`（保持技能同步）
- [ ] 凭据通过环境变量或 `credential dbms` 提供；未硬编码
- [ ] 面向 agent 的 neo4j-cli 输出使用 `--format toon`
- [ ] 破坏性操作在执行前已确认
- [ ] 操作后验证：连接 + `SHOW INDEXES` + 计数
- [ ] 在恢复或 schema 变更前已先备份
