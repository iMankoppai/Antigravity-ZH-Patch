---
name: neo4j-mcp-skill
description: 在安装、配置或排查官方 Neo4j MCP 服务器（neo4j/mcp）时使用 —— 通过 stdio 或 HTTP 传输把 Claude Code、Claude Desktop、Cursor、Windsurf、VS Code、Kiro 或其他兼容 MCP 的编辑器连接到 Neo4j 数据库。涵盖四个 MCP 工具（get-schema、read-cypher、write-cypher、list-gds-procedures）、只读模式以及多数据库配置。不涵盖通过这些工具编写 Cypher 查询 —— 请使用 neo4j-cypher-skill。不涵盖 agent memory —— 请使用 neo4j-agent-memory-skill。不涵盖 Aura 实例开通 —— 请使用 neo4j-aura-provisioning-skill。
allowed-tools: Bash, WebFetch
version: 1.0.2
---

# Neo4j MCP Skill

安装并配置[官方 Neo4j MCP 服务器](https://github.com/neo4j/mcp)，使 AI agent 能够通过任意兼容 MCP 的客户端连接到 Neo4j。

## 何时使用

- 通过 MCP 将 Claude Code、Claude Desktop、Cursor、Windsurf、VS Code、Kiro 或其他编辑器连接到 Neo4j
- 安装 `neo4j-mcp-server` 并为特定编辑器编写正确的配置
- 在 stdio 和 HTTP 传输之间切换
- 启用或禁用写访问（`NEO4J_READ_ONLY`）
- 排查 "MCP server not found" 或连接错误

## 何时不使用

- **编写或优化 Cypher 查询** → 使用 `neo4j-cypher-skill`
- **开通新的 Neo4j Aura 实例** → 使用 `neo4j-aura-provisioning-skill`
- **Agent 长期记忆** → 使用 `neo4j-agent-memory-skill`
- **neo4j-admin / cypher-shell / aura-cli** → 使用 `neo4j-cli-tools-skill`

---

## 可用的 MCP 工具

| 工具 | 类型 | 作用 |
|---|---|---|
| `get-schema` | 读 | 返回标签、关系类型、属性键和索引 |
| `read-cypher` | 读 | 执行只读 Cypher（`MATCH`、`RETURN`、`SHOW`） |
| `write-cypher` | 写 | 执行写 Cypher（`MERGE`、`CREATE`、`SET`、`DELETE`）—— 当 `NEO4J_READ_ONLY=true` 时禁用 |
| `list-gds-procedures` | 读 | 列出可用的 Graph Data Science 过程（需要 GDS 插件） |

---

## 安装

### 第 1 步 —— 安装并找到绝对路径

```bash
# Option A: pip (recommended)
pip install neo4j-mcp-server

# Option B: Download binary
# https://github.com/neo4j/mcp/releases -- macOS, Linux, Windows binaries

# Option C: Docker
docker pull neo4j/mcp
```

**获取绝对路径 —— 第 3 步会用到：**
```bash
which neo4j-mcp          # e.g. /usr/local/bin/neo4j-mcp
                         # or:  /Users/you/project/.venv/bin/neo4j-mcp  (if installed in venv)

neo4j-mcp --version      # confirm it runs
```

> **为什么绝对路径很重要**：编辑器（Claude Code、Cursor、Claude Desktop）会使用它们自己受限的 PATH 将 MCP 服务器作为子进程启动 —— 而不是你 shell 的 PATH。在 macOS 上，GUI 应用不会继承 `.zshrc` 或 `.zprofile`。使用 `neo4j-mcp` 作为命令会静默失败；使用 `/full/path/to/neo4j-mcp` 则始终有效。请始终在下面的 `command` 字段中使用 `which neo4j-mcp` 的输出。

### 第 2 步 —— 准备凭据

```bash
# .env (gitignored)
NEO4J_URI=neo4j+s://<instance>.databases.neo4j.io   # Aura
# or bolt://localhost:7687                           # local
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=<password>
NEO4J_DATABASE=neo4j
```

在配置编辑器之前验证连通性：
```bash
source .env
cypher-shell -a "$NEO4J_URI" -u "$NEO4J_USERNAME" -p "$NEO4J_PASSWORD" \
  "RETURN 'connected' AS status"
# If cypher-shell not available: python3 -c "
# from neo4j import GraphDatabase, __version__
# d = GraphDatabase.driver('$NEO4J_URI', auth=('$NEO4J_USERNAME','$NEO4J_PASSWORD'))
# d.verify_connectivity(); print('connected'); d.close()"
```

### 第 3 步 —— 配置你的编辑器

选择适用于你编辑器的配置块。它们都使用 STDIO 传输（MCP 服务器作为编辑器的子进程运行）。

**Claude Code** —— 添加到 `~/.claude/settings.json`。如果文件已存在，请将 `neo4j` 块合并进现有的 `mcpServers` 对象 —— 不要替换整个文件。

```json
{
  "mcpServers": {
    "neo4j": {
      "command": "/full/path/to/neo4j-mcp",
      "env": {
        "NEO4J_URI": "neo4j+s://<host>",
        "NEO4J_USERNAME": "neo4j",
        "NEO4J_PASSWORD": "<password>",
        "NEO4J_DATABASE": "neo4j",
        "NEO4J_READ_ONLY": "true"
      }
    }
  }
}
```

CLI 备选方案（仅设置命令 —— 你仍需将环境变量添加到文件中）：
```bash
claude mcp add neo4j /full/path/to/neo4j-mcp
```

**Claude Desktop**
- macOS：`~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows：`%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "neo4j": {
      "command": "/full/path/to/neo4j-mcp",
      "env": {
        "NEO4J_URI": "neo4j+s://<host>",
        "NEO4J_USERNAME": "neo4j",
        "NEO4J_PASSWORD": "<password>",
        "NEO4J_DATABASE": "neo4j",
        "NEO4J_READ_ONLY": "true"
      }
    }
  }
}
```

**VS Code** —— `.vscode/mcp.json`（注意：使用 `servers` 而非 `mcpServers` —— 与其他所有编辑器不同）：
```json
{
  "servers": {
    "neo4j": {
      "type": "stdio",
      "command": "/full/path/to/neo4j-mcp",
      "env": {
        "NEO4J_URI": "bolt://localhost:7687",
        "NEO4J_USERNAME": "neo4j",
        "NEO4J_PASSWORD": "password",
        "NEO4J_DATABASE": "neo4j",
        "NEO4J_READ_ONLY": "true"
      }
    }
  }
}
```

**Cursor** —— 全局：`~/.cursor/mcp.json` / 项目：`.cursor/mcp.json`（结构与 Claude Code 相同，使用 `mcpServers`）。

**Windsurf** —— 全局：`~/.codeium/windsurf/mcp_config.json` / 项目：`.windsurf/mcp_config.json`（结构与 Claude Code 相同，使用 `mcpServers`）。

**Kiro** —— 全局：`~/.kiro/settings/mcp.json` / 项目：`.kiro/settings/mcp.json`。支持 `${VARIABLE}`，从编辑器启动前导出的 shell 环境中取值：
```json
{
  "mcpServers": {
    "neo4j": {
      "command": "/full/path/to/neo4j-mcp",
      "env": {
        "NEO4J_URI": "${NEO4J_URI}",
        "NEO4J_USERNAME": "${NEO4J_USERNAME}",
        "NEO4J_PASSWORD": "${NEO4J_PASSWORD}",
        "NEO4J_DATABASE": "neo4j",
        "NEO4J_READ_ONLY": "true"
      }
    }
  }
}
```

**Cline** —— `~/.vscode/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`（结构与 Claude Code 相同，使用 `mcpServers`）。或通过 VS Code 设置 → Cline 扩展 → MCP Servers 面板添加。

**Antigravity** —— 项目根目录下的 `mcp_config.json`（结构与 Claude Code 相同，使用 `mcpServers`）。

### 第 4 步 —— 重启编辑器

编辑配置文件后，重启编辑器（若编辑器支持热重载，则重新加载 MCP 服务器）。确认服务器出现在编辑器的 MCP 面板或工具列表中。

### 第 5 步 —— 冒烟测试

通过 agent 或直接通过 MCP 运行 `get-schema`。**不要用"它是否返回标签？"作为测试** —— 空数据库不返回任何标签，看起来与连接损坏完全相同。

改用这个 —— 即使空数据库也能成功：
```
read-cypher: RETURN 'connected' AS status
```
预期：`{ "status": "connected" }`。任何结果都表明服务器存活且凭据有效。

如果数据库有数据，也运行：
```
get-schema
```
并确认它返回了你预期的节点标签和关系类型。

---

## HTTP 传输

HTTP 传输将 MCP 服务器作为持久网络服务运行 —— 适用于共享服务器、容器或多个客户端。

```bash
# With credentials baked in (simpler — server authenticates all clients as the same user)
neo4j-mcp \
  --neo4j-transport-mode http \
  --neo4j-http-host 127.0.0.1 \
  --neo4j-http-port 8080 \
  --neo4j-uri bolt://localhost:7687 \
  --neo4j-username neo4j \
  --neo4j-password <password> \
  --neo4j-database neo4j
```

HTTP 的编辑器配置（配置中不含凭据 —— 服务器持有它们）：
```json
{
  "mcpServers": {
    "neo4j-http": {
      "type": "http",
      "url": "http://127.0.0.1:8080/mcp"
    }
  }
}
```

**按请求认证**（从服务器命令中省略 `--neo4j-username`/`--neo4j-password`）：每个客户端请求都必须包含 `Authorization: Basic <base64(username:password)>` 头。用以下命令生成该值：
```bash
echo -n "neo4j:<password>" | base64
```
然后添加到编辑器配置：
```json
{
  "headers": { "Authorization": "Basic bmVvNGo6cGFzc3dvcmQ=" }
}
```

> **安全**：绑定到 `127.0.0.1`，而不是 `0.0.0.0`。只有在需要远程访问且前面已有 TLS + 认证时，才改为更宽泛的接口。

---

## 环境变量

| 变量 | 必需 | 默认值 | 说明 |
|---|---|---|---|
| `NEO4J_URI` | 是 | — | Aura 用 `neo4j+s://`；本地用 `bolt://` |
| `NEO4J_USERNAME` | 是 | — | |
| `NEO4J_PASSWORD` | 是 | — | |
| `NEO4J_DATABASE` | 否 | 服务器默认 | 显式指定以避免路由到错误的 DB |
| `NEO4J_READ_ONLY` | 否 | `false` | 设为 `true` 以隐藏 `write-cypher`（探索时的安全默认） |

**何时设置 `NEO4J_READ_ONLY=false`**（或删除该变量）：任何需要写入数据的用例 —— 导入、MERGE、schema 变更、GDS 写回。没有写访问时，agent 只会看到三个工具（`get-schema`、`read-cypher`、`list-gds-procedures`），且 `write-cypher` 调用会失败。

---

## APOC 要求

MCP 服务器使用 APOC 进行 schema 内省（`get-schema`）。在 **Aura** 上，APOC 自动包含。在**自托管 Neo4j** 上，请安装 APOC 插件并将其加入白名单：

```
# neo4j.conf
dbms.security.procedures.unrestricted=apoc.*
```

验证：`read-cypher: RETURN apoc.version() AS v` —— 如果失败，`get-schema` 将返回不完整的结果。

---

## 故障排查

| 症状 | 可能原因 | 修复 |
|---|---|---|
| 服务器未在编辑器中列出 | 配置文件路径错误、JSON 格式错误，或编辑器未重启 | 校验 JSON（`python3 -m json.tool settings.json`）；确认该文件适用于你的编辑器；重启编辑器 |
| `neo4j-mcp: command not found` | 编辑器 PATH 未包含二进制所在位置 | 在 `command` 中使用绝对路径：在终端运行 `which neo4j-mcp` 并粘贴结果 |
| 服务器启动后立即退出 | 找不到 Python（pip 安装）或二进制与操作系统不匹配（二进制安装） | 在终端手动运行命令查看错误：`/full/path/neo4j-mcp --version` |
| `AuthenticationException` | 凭据错误 | 编辑配置前，用 `cypher-shell` 或 driver 验证 URI + 凭据 |
| `write-cypher` 工具缺失 | `NEO4J_READ_ONLY=true` | 若需要写入，删除该项或设为 `false` |
| `ServiceUnavailable` | 编辑器进程无法访问 DB | 检查防火墙、VPN，或 Aura 实例是否已暂停 |
| `list-gds-procedures` 返回空 | 未安装 GDS 或 Aura Free | GDS 需要 Aura Professional/Enterprise，或自托管并安装插件 |

---

## 检查清单

- [ ] 已运行 `which neo4j-mcp` 并记下绝对路径 —— 它放在 `command` 中，而非 `neo4j-mcp`
- [ ] 编辑编辑器配置前已验证连通性（`RETURN 'connected'`）
- [ ] 凭据未提交到 git；`.env` 在 `.gitignore` 中
- [ ] 有意设置 `NEO4J_READ_ONLY` —— 探索用 `true`，写入用例用 `false`/缺省
- [ ] 已显式指定 `NEO4J_DATABASE`
- [ ] 为目标编辑器使用了正确的配置文件（VS Code 用 `servers`；其他所有编辑器用 `mcpServers`）
- [ ] 配置是有效 JSON（保存前用 `python3 -m json.tool <file>` 校验）
- [ ] 配置变更后已重启编辑器
- [ ] 冒烟测试通过：`read-cypher: RETURN 'connected' AS status` 返回结果
- [ ] 自托管环境下 APOC 可用：`read-cypher: RETURN apoc.version()`

---

## 参考资料

- [MCP Server 文档](https://neo4j.com/docs/mcp/)
- [MCP GitHub](https://github.com/neo4j/mcp)
- [所有 Neo4j MCP 服务器](https://neo4j.com/developer/genai-ecosystem/model-context-protocol-mcp/)
- [GraphAcademy：使用 Neo4j MCP 工具进行开发](https://graphacademy.neo4j.com/courses/genai-mcp-neo4j-tools/)
