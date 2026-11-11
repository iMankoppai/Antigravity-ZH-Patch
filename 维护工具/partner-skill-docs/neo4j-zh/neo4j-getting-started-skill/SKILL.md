---
name: neo4j-getting-started-skill
description: 分 8 个阶段编排从零到可运行应用的过程——前置条件 → 上下文 →
  供应 → 建模 → 加载 → 探索 → 查询 → 构建。每个阶段读取自己的参考
  文件。支持 HITL 和全自动运行。适用于从零开始新建 Neo4j 项目、
  供应 Aura、生成合成数据、构建 notebook 或应用，
  或运行完整的入门流水线。时间预算：自主模式 ≤15 分钟，HITL ≤90 分钟。
  不涵盖 Cypher 查询编写——请使用 neo4j-cypher-skill。
  不涵盖驱动升级或 Cypher 迁移——请使用 neo4j-migration-skill。
  不涵盖现有数据库上的 CLI/管理任务——请使用 neo4j-cli-tools-skill。
version: 1.0.7
allowed-tools: Bash, WebFetch, Read, Write, Edit,
  mcp__neo4j__read-cypher, mcp__neo4j__write-cypher, mcp__neo4j__get-schema,
  mcp__neo4j__list-gds-procedures,
  mcp__neo4j_data_modeling__validate_data_model,
  mcp__neo4j_data_modeling__visualize_data_model
compatibility: claude-code, cursor, windsurf, any-agent-with-bash
---

# Neo4j 入门技能

按顺序执行下面 8 个阶段，引导**用户或代理**从零走到可运行的 Neo4j 应用。

**每个阶段开始时**：读取对应的 `${CLAUDE_SKILL_DIR}/references/<stage-name>.md` 文件并遵循其指示。只加载你当前正在执行的阶段——不要一次性全部加载。

**“用户”既指人类开发者，也指自主编码代理。**

---

## 何时使用

- 从零开始新建 Neo4j 项目（本地/Docker/Aura）
- 完整入门：零 → 数据库 → 模型 → 加载 → 应用
- 为演示或开发生成合成数据

## 何时不使用

- **在现有项目上编写 Cypher** → `neo4j-cypher-skill`
- **驱动升级 / Cypher 迁移** → `neo4j-migration-skill`
- **现有数据库管理**（备份、恢复、导入）→ `neo4j-cli-tools-skill`

---

## 项目结构

**所有生成的代码、数据、脚本、查询和 notebook 都必须写入工作目录**，以便用户在会话结束后检查、复用和重新运行。绝不要只把输出生成为对话中的文本——始终写入文件。

将文件组织为以下布局。写入文件前先创建子目录。

```
.env                    ← DB credentials (gitignored, loaded by python-dotenv)
aura.env                ← Aura API credentials (gitignored, never overwrite)
progress.md             ← stage-by-stage progress (this skill writes it)
requirements.txt        ← Python dependencies

schema/
  schema.json           ← graph model definition
  schema.cypher         ← DDL: constraints + indexes
  reset.cypher          ← wipe all data (keep schema)

data/
  generate.py           ← synthetic data generator  (DATA_SOURCE=synthetic)
  import.py             ← CSV/file importer          (DATA_SOURCE=csv or relational)
  *.csv                 ← any provided or generated data files

queries/
  queries.cypher        ← validated Cypher query library

scripts/
  provision_aura.py     ← Aura provisioning script (generated during provision stage)

notebook.ipynb          ← app artifact (root — standard jupyter convention)
app.py                  ← app artifact (root — streamlit run app.py)
main.py                 ← app artifact (root — uvicorn main:app)
graphrag_app.py         ← app artifact (root)
```

根级文件（`.env`、`requirements.txt`、应用代码）保留在根目录，因为工具期望它们在那里。其余文件都放入相应子文件夹。

---

## 进度跟踪

该技能在工作目录中维护 `progress.md` 以支持可恢复运行。

**启动时：**
1. 检查 `progress.md` 是否存在。
2. 如果存在，找到第一个待处理阶段：
   ```bash
   grep -B1 "^status: pending" progress.md | grep "^###" | head -1
   ```
3. 从该阶段恢复。读取其上下文块（标题下的 key=value 行）以恢复 `DOMAIN`、`USE_CASE`、`NEO4J_URI` 等——不要重新询问用户已记录的信息。
4. 对于每个已完成的阶段，在继续之前读取其 `files=` 行列出的每个文件。这些文件是事实依据——不要凭记忆重建其内容。
   - `schema/schema.json` → 在 model、load、query 或 build 阶段之前重新读取
   - `queries/queries.cypher` → 在 build 阶段之前重新读取
   - `data/generate.py` → 在 import 或 reset 之前重新读取
5. 如果 `progress.md` 不存在，从 `0-prerequisites` 开始。

**阶段完成时**——更新（或创建）`progress.md`：
- 如果该阶段的 `###` 小节已存在，将 `status: pending` 更新为 `status: done`，并追加任何新的 key=value 行。
- 如果该小节不存在，按以下格式追加。

**格式：**
```markdown
# Neo4j Getting-Started — Progress
<!-- Resume: grep for "status: pending" to find the next stage -->

### 0-prerequisites
status: done

### 1-context
status: done
DOMAIN=social
USE_CASE=friend recommendations
EXPERIENCE=beginner
DB_TARGET=aura-free
DATA_SOURCE=synthetic
APP_TYPE=notebook
EXEC_METHOD=query-api

### 2-provision
status: done
NEO4J_URI=neo4j+s://abc123.databases.neo4j.io

### 3-model
status: done
labels=Person,Post
relationships=FOLLOWS,POSTED
constraints=2

### 4-load
status: done
nodes=200 Person, 50 Post
relationships=1400 FOLLOWS, 300 POSTED

### 5-explore
status: pending

### 6-query
status: pending

### 7-build
status: pending
```

---

## 执行协议

对每个阶段：
1. 宣告阶段：`"## Stage: <name> — <purpose>"`
2. 读取 `${CLAUDE_SKILL_DIR}/references/<name>.md`
3. 执行该文件中的指示
4. 验证该阶段的完成条件
5. 更新 `progress.md`，写入 `status: done` 及该阶段的特定上下文
6. 进入下一阶段（HITL：先暂停等待批准）

如果某阶段失败，使用该阶段参考文件中的错误指引进行恢复。除非下面的跳过条件明确允许，否则不要跳过阶段。

---

## 阶段

阶段按所示编号顺序运行。每个阶段都依赖于前一阶段成功完成（除非适用跳过条件）。进入每个阶段时读取链接的参考文件。

```
0-prerequisites → 1-context → 2-provision → 3-model → 4-load → 5-explore → 6-query → 7-build
```

跨多个阶段共享的能力：
- Cypher 执行：`${CLAUDE_SKILL_DIR}/references/capabilities/execute-cypher.md`（3 个选项；`EXEC_METHOD` 在 `context` 中选择）
- Cypher 编写规则：`${CLAUDE_SKILL_DIR}/references/capabilities/cypher-authoring.md`（或交由 `neo4j-cypher-authoring-skill`）
- MCP 配置：`${CLAUDE_SKILL_DIR}/references/capabilities/mcp-config.md`（用于 `prerequisites` 和 `build`）
- 查询验证：`${CLAUDE_SKILL_DIR}/scripts/validate_queries.py`——一次调用批量验证所有查询（用于 `query`）

---

### 0 — `prerequisites`
**目的**：在做任何事之前先验证并安装所需的 CLI 工具。  
**参考**：`${CLAUDE_SKILL_DIR}/references/0-prerequisites.md`  
**完成条件**：`neo4j-mcp` 二进制可访问；`.gitignore` 含有 `.env` 条目。  
**绝不跳过。**

---

### 1 — `context`
**目的**：收集领域、用例、经验、基础设施目标、数据源和输出类型。检测 Cypher 执行的 `EXEC_METHOD`。  
**参考**：`${CLAUDE_SKILL_DIR}/references/1-context.md`  
**完成条件**：已知 `DOMAIN`、`USE_CASE`、`EXPERIENCE`、`DB_TARGET`、`DATA_SOURCE`、`APP_TYPE`、`EXEC_METHOD`。  
**跳过条件**：对话上下文中所有变量已明确。

---

### 2 — `provision`
**目的**：供应一个运行中的 Neo4j 数据库，并将凭据保存到 `.env`。  
**参考**：`${CLAUDE_SKILL_DIR}/references/2-provision.md`  
**完成条件**：`.env` 存在且含 `NEO4J_URI/USERNAME/PASSWORD/DATABASE`；连接性已验证。  
**跳过条件**：`DB_TARGET=existing` → 使用用户凭据写入 `.env`，进入 `3-model`。

---

### 3 — `model`
**目的**：为用例设计或发现合适的图数据模型。  
**参考**：`${CLAUDE_SKILL_DIR}/references/3-model.md`  
**完成条件**：已写入 `schema.json` 和 `schema.cypher`。  
**跳过条件**：`DATA_SOURCE=demo` → 使用演示 schema，进入 `4-load`。  
**HITL 检查点**（仅 HITL 模式——**自主模式下完全跳过**）：展示模型草稿，等待批准。

---

### 4 — `load`
**目的**：应用 schema 约束，然后导入数据（演示、合成、CSV 或文档）。  
**参考**：`${CLAUDE_SKILL_DIR}/references/4-load.md`  
**依赖**：`3-model`（导入前约束必须已存在）。  
**完成条件**：节点数 ≥ 50；已写入 `import/` 脚本；已写入 `reset.cypher`。

---

### 5 — `explore`
**目的**：提供对图的视觉入口——“恍然大悟”的时刻。  
**参考**：`${CLAUDE_SKILL_DIR}/references/5-explore.md`  
**完成条件**：向用户打印浏览器 URL，或添加 notebook 可视化单元。  
**硬性关口——绝不跳过。**

---

### 6 — `query`
**目的**：为该用例生成并验证 Cypher 查询库。  
**参考**：`${CLAUDE_SKILL_DIR}/references/6-query.md`  
**完成条件**：`queries.cypher` 有 ≥5 个查询；≥2 个遍历；≥3 个返回结果。

---

### 7 — `build`
**目的**：生成可运行的应用、仪表板、notebook 或代理集成。  
**参考**：`${CLAUDE_SKILL_DIR}/references/7-build.md`  
**完成条件**：产物存在，通过语法检查，返回非空的用例结果。

---

## 成功关口（全部 7 个必需）

| 关口 | 阶段 | 条件 |
|------|-------|-----------|
| `db_running` | provision | `driver.verify_connectivity()` 成功 |
| `model_valid` | model | 数据库中 ≥2 个节点标签、≥1 个关系类型、≥1 个约束 |
| `data_present` | load | `MATCH (n) RETURN count(n)` ≥ 50 |
| `queries_work` | query | ≥5 个查询；≥2 个遍历；≥3 个返回 ≥1 个结果 |
| `graph_visible` | explore | 向用户交付浏览器 URL 或 notebook 可视化 |
| `app_generated` | build | 产物存在，通过语法检查，返回非空结果 |
| `integration_ready` | build | 存在 MCP 配置或代理框架代码（若要求） |

---

## 快捷路径

| 情形 | 操作 |
|-----------|--------|
| `DB_TARGET=existing` | 跳过 `provision`；从用户凭据写入 `.env`；进入 `model` |
| `DATA_SOURCE=demo` | 跳过自定义建模；使用演示 schema；跳到 `load` |
| `DB_TARGET=existing` + 数据已存在 | 跳过 `provision`、`model`、`load`；内省 schema；进入 `explore` |

---

## HITL 与自主模式

**HITL**（对话式）：在 `model` 之后暂停进行模型审查；在 `load` 之后暂停进行数据审查。

**自主**（类 CI，所有上下文提前明确）：任何阶段都不暂停等待批准；自动批准所有决定；立即走完所有 8 个阶段；将浏览器 URL 打印到 stdout；目标从数据库运行起 ≤15 分钟。

**如何检测自主模式——在阶段 1 开始时检查：**

满足以下任一条件即为自主模式：
- 初始提示包含以下全部：`DOMAIN`、`USE_CASE`、`EXPERIENCE`、`DB_TARGET`、`DATA_SOURCE`、`APP_TYPE`（或等效措辞，如 "Domain: X, use-case: Y, ..."）
- 会话以 `--auto-approve` 或类似非交互标志启动
- 所有上下文变量已记录在 `progress.md` 中（恢复自主运行）

若用户打开了全新对话且未提前提供完整上下文，则为 HITL。

**在自主模式下：每个阶段参考文件中的每个 HITL 检查点都会自动跳过。** 不要请求批准。不要说“这样看起来对吗？”。不要暂停。立即继续下一步。

---

## 最终总结（所有关口通过后交付）

**步骤 1——写入 `README.md`** 到工作目录，使用下方模板。
从 `progress.md` 和实际生成的文件中填写每一个 `<placeholder>`。
这是必需的输出——不要跳过。

**重要——可移植命令**：README.md 中所有重新运行的命令都必须使用 `python3`（绝不要用 `/opt/homebrew/bin/python3.14` 或 `/usr/local/bin/python3` 这类绝对路径）。README 会与他人共享，而他们的 Python 安装不同。

```markdown
# <DOMAIN> Graph — <USE_CASE>

A synthetic <DOMAIN> graph built with Neo4j, covering <USE_CASE>.
Generated by the neo4j-getting-started-skill on <date>.

## What's in the graph

| Label | Count | Description |
|-------|-------|-------------|
| <Label> | <N> | <one line> |

**Relationships:** <TYPE1>, <TYPE2>, ...  
**Constraints:** <N> uniqueness constraints applied

## Explore visually

Open in Neo4j Browser:
<browser_url>

Use `NEO4J_PASSWORD` from `.env` to connect, then run:
```cypher
// Starter query — shows the full graph sample
MATCH (n)-[r]->(m) RETURN n, r, m LIMIT 50
```

## Files

| File | Purpose | Re-run |
|------|---------|--------|
| `schema/schema.json` | Graph model | — |
| `schema/schema.cypher` | Constraints + indexes | `source .env && cypher-shell -a $NEO4J_URI -u $NEO4J_USERNAME -p $NEO4J_PASSWORD --file schema/schema.cypher` |
| `schema/reset.cypher` | Wipe data, keep schema | `source .env && cypher-shell -a $NEO4J_URI -u $NEO4J_USERNAME -p $NEO4J_PASSWORD --file schema/reset.cypher` |
| `data/generate.py` | Regenerate synthetic data | `source .venv/bin/activate && python3 data/generate.py` |
| `data/import.py` | Re-import CSVs into Neo4j | `source .venv/bin/activate && python3 data/import.py` |
| `queries/queries.cypher` | Query library | Paste into Neo4j Browser |
| `<artifact>` | <app type> | `<run command>` |
| `requirements.txt` | Python dependencies | `source .venv/bin/activate && pip install -r requirements.txt` |

(Omit `data/generate.py` row when `DATA_SOURCE=csv`; omit `data/import.py` row when `DATA_SOURCE=synthetic`.)

## Run the app

```bash
python3 -m venv .venv     # skip if .venv already exists
source .venv/bin/activate
pip install -r requirements.txt
<run command>
```

<For FastAPI only — include this section:>
Open http://localhost:8000/docs for the interactive API docs.

<For MCP integration — include this section when APP_TYPE includes mcp:>
## MCP integration

To query your graph directly from Claude:

**Claude Code** — copy `mcp-claude-code.json` into `.claude/settings.json`:
```bash
cp mcp-claude-code.json .claude/settings.json
```
Then reload Claude Code (`/reload` or restart). Ask: "What node labels are in my Neo4j database?"

**Claude Desktop** — merge `mcp-claude-desktop.json` into
`~/Library/Application Support/Claude/claude_desktop_config.json`, then restart Claude Desktop.

Available MCP tools: `get-schema`, `read-cypher`, `write-cypher`.

## Reset and reload

```bash
source .env
cypher-shell -a $NEO4J_URI -u $NEO4J_USERNAME -p $NEO4J_PASSWORD --file schema/reset.cypher
source .venv/bin/activate
python3 data/generate.py   # or skip if using your own CSVs
python3 data/import.py
```

## Sample queries

```cypher
// <use-case-specific query 1 — fill in from queries/queries.cypher>
<query>

// <use-case-specific query 2>
<query>
```

(Cypher comments use `//`, not `--`.)

## Next steps

- Explore [GraphAcademy](https://graphacademy.neo4j.com) to deepen your Neo4j knowledge
- Edit `data/*.csv` to change the dataset, then re-run `data/import.py`
- Extend the model: add new node labels or relationship types in `schema/schema.json`
```

**步骤 2——将以下内容打印到对话中：**

```
✓ Neo4j Getting-Started — Complete

Database:  <NEO4J_URI>
Browser:   https://browser.neo4j.io/?connectURL=<encoded>

── What was generated (keep these files) ───────────────────────
schema/schema.json       Graph model definition
schema/schema.cypher     Re-apply constraints/indexes:  cypher-shell ... --file schema/schema.cypher
schema/reset.cypher      Wipe data, keep schema:        cypher-shell ... --file schema/reset.cypher
data/generate.py         Regenerate synthetic data:     source .venv/bin/activate && python3 data/generate.py
data/*.csv               Source data files — edit to change the dataset
data/import.py           Re-import from CSVs:           source .venv/bin/activate && python3 data/import.py
queries/queries.cypher   Query library — paste into Neo4j Browser or run with cypher-shell
<app-file>               <run-command>
requirements.txt         Install deps:                  source .venv/bin/activate && pip install -r requirements.txt

── Gates ───────────────────────────────────────────────────────
db_running ✓  model_valid ✓  data_present ✓  queries_work ✓
graph_visible ✓  app_generated ✓  integration_ready ✓/–

── Next steps ──────────────────────────────────────────────────
- Explore:   open the Browser URL → run MATCH (n)-[r]->(m) RETURN n,r,m LIMIT 50
- Iterate:   edit data/*.csv → source .venv/bin/activate && python3 data/import.py (reset first)
- Learn:     https://graphacademy.neo4j.com
```

省略不适用的行（例如 `DATA_SOURCE=synthetic` 时省略 `data/import.py`，`DATA_SOURCE=csv` 时省略 `data/generate.py`）。

---

## 检查清单

- [ ] 前置条件已满足（Docker/Python/Java；云端则需 Aura API key）
- [ ] 数据库可达——在 cypher-shell 中 `RETURN 1`
- [ ] 数据加载前约束 + 索引处于 ONLINE
- [ ] 数据已加载——`MATCH (n) RETURN count(n)` > 0
- [ ] queries.cypher：所有查询返回预期结果
- [ ] 应用/notebook 端到端运行
- [ ] `.env` 已加入 gitignore；凭据未硬编码
