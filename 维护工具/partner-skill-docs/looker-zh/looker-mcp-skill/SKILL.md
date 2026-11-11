---
name: looker-mcp-skill
description: 连接并使用 Looker MCP Server 的指南。说明如何
  访问 Looker MCP server、设置 Looker 托管与本地/独立部署、配置
  OAuth 认证，并罗列可用的 MCP 工具。
license: Apache-2.0
metadata:
  publisher: google
  version: v1
---

# Looker MCP Server 技能

本技能记录如何访问、配置并使用 **Looker Model Context Protocol (MCP) Server**。它使 AI 助手、本地 IDE（VS Code、Cursor、Claude Desktop、Gemini CLI）以及自动化智能体能够直接与 Looker 实例交互，以查询数据、检查语义模型、管理 LookML 项目并执行系统诊断。

---

## 1. 访问 Looker MCP Server

Looker 为 MCP server 支持两种主要部署模式：

### A. Looker 托管的 MCP Server（推荐用于 Cloud / GCP Core）
Looker 托管的 MCP Server 直接内置于 Looker 实例（Looker Core 和 Looker Original）中。它由 Google Cloud 托管和管理，无需运行单独的服务器基础设施。

- **Endpoint**：`https://<YOUR_LOOKER_INSTANCE_URL>/mcp`
- **启用方式**：
  1. 导航到 **Admin Panel** > **Platform** > **MCP**。
  2. 将 **Enable MCP Server** 切换为 **On**。
  3. 确保用户和客户端应用具有适当的 API 和功能权限。

### B. 本地 / 独立 MCP Server（面向数据库的 MCP Toolbox）
对于客户自托管（本地部署）实例、自定义开发者环境或独立 CLI 集成，你可以使用 **MCP Toolbox for Databases**（`@google/mcp-toolbox`）在本地运行 MCP server。

- **安装 / 启动**：
  ```bash
  npx @google/mcp-toolbox --prebuilt=looker,looker-dev
  ```
  *或通过 Docker：*
  ```bash
  docker run -p 5000:5000 \
    -e LOOKER_BASE_URL="https://your-instance.looker.com" \
    -e LOOKER_CLIENT_ID="<CLIENT_ID>" \
    -e LOOKER_CLIENT_SECRET="<CLIENT_SECRET>" \
    us-central1-docker.pkg.dev/database-toolbox/toolbox/toolbox:latest --prebuilt=looker,looker-dev --address=0.0.0.0
  ```

- **环境变量**：
  - `LOOKER_BASE_URL`：Looker 实例的基础 URL（例如 `https://mycompany.looker.com`）。
  - `LOOKER_CLIENT_ID`：Looker API 4.0 Client ID。
  - `LOOKER_CLIENT_SECRET`：Looker API 4.0 Client Secret。
  - `LOOKER_VERIFY_SSL`：对于自签名的开发证书，设置为 `false`（默认：`true`）。

- **Cloud Run 部署**：
  若要在 Google Cloud Run 中运行 MCP Toolbox server，请参阅 [Looker Cloud Run Sample](https://mcp-toolbox.dev/integrations/looker/samples/looker_cloud_run/)。

---

## 2. 设置 OAuth 认证

为使 AI 应用和客户端能够代表用户安全地认证，请在 Looker 中将你的客户端应用注册为 OAuth 客户端。

### 第 1 步：注册 OAuth 客户端应用

你可以使用 **API Explorer 扩展**（推荐）或通过 `curl` 注册 OAuth 客户端应用。

#### 方案 A：使用 Looker API Explorer（推荐）
**API Explorer** 扩展默认包含在 Looker 安装中：
1. 打开 Looker 并导航到 **Applications** > **API Explorer**（或访问 `https://<YOUR_LOOKER_INSTANCE_URL>/extensions/marketplace_extension_api_explorer::api-explorer/`）。
2. 搜索 `register_oauth_client_app` 端点（`POST /oauth_client_apps/{client_guid}`）。
3. 输入你的 `<CLIENT_GUID>` 并填写请求体参数（`client_guid`、`display_name`、`redirect_uri`、`enabled: true`）。
4. 执行 **Run Request** 以注册该应用。

#### 方案 B：使用 `curl`
或者，向 Looker 的 `oauth_client_apps` 端点提交 HTTP POST 请求：

```bash
curl -X POST "https://<YOUR_LOOKER_INSTANCE_URL>/api/4.0/oauth_client_apps/<CLIENT_GUID>" \
  -H "Authorization: Bearer <ADMIN_BEARER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "client_guid": "<CLIENT_GUID>",
    "display_name": "My AI Assistant Client",
    "redirect_uri": "http://127.0.0.1:7777/oauth/callback",
    "enabled": true
  }'
```

- `<CLIENT_GUID>`：为你的集成生成的唯一客户端标识符。**注意**：在你的客户端应用设置中（例如 IDE 或 AI 客户端的 OAuth 配置），将 **OAuth Client ID**（`clientId`）设置为此 `<CLIENT_GUID>`。
- `redirect_uri`：授权码发送的目标回调 URL。**注意**：`redirect_uri` 因所注册的具体客户端或 IDE 应用而异：
  - **Antigravity**：`https://antigravity.google/oauth-callback`
  - **Claude Desktop / Claude AI**：`https://claude.ai/api/mcp/oauth/callback` 或 `http://localhost:<PORT>/oauth/callback`
  - **VS Code / Cloud Code Extension**：`https://vscode.dev/redirect` 或 `http://127.0.0.1:<PORT>/oauth/callback`
  - **Cursor Desktop**：`https://cursor.com/mcp/callback`
  - **通用 CLI / 本地工具**：`http://127.0.0.1:7777/oauth/callback` 或 `http://localhost:8080/callback`

> **示例配置**：关于配置客户端 OAuth 凭证和客户端 GUID 的分步示例，请参阅 [Configuring Claude Desktop with Looker OAuth](https://mcp-toolbox.dev/integrations/looker/samples/looker_claude_oauth/#configuring-claude-desktop)。

### 第 2 步：执行 OAuth PKCE 流程 / Bearer 认证
1. **将用户重定向到授权 URL**：
   生成 PKCE code verifier 和 SHA-256 challenge，然后将用户重定向到：
   ```
   https://<YOUR_LOOKER_INSTANCE_URL>/auth/oauth?client_id=<CLIENT_GUID>&response_type=code&code_challenge=<PKCE_CHALLENGE>&code_challenge_method=S256&redirect_uri=<REDIRECT_URI>
   ```

2. **用授权码换取访问令牌和刷新令牌**：
   向令牌端点发送包含 `code_verifier` 的 `POST` 请求，以完成 PKCE 握手：
   ```bash
   curl -X POST "https://<YOUR_LOOKER_INSTANCE_URL>/api/4.0/oauth/token" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "grant_type=authorization_code" \
     -d "client_id=<CLIENT_GUID>" \
     -d "redirect_uri=<REDIRECT_URI>" \
     -d "code=<AUTHORIZATION_CODE>" \
     -d "code_verifier=<CODE_VERIFIER>"
   ```

3. **认证 MCP 请求**：
   在发往 MCP server 的请求的 HTTP 头中附带所获取的 `access_token`：
   ```http
   Authorization: Bearer <ACCESS_TOKEN>
   ```

---

## 3. 连接 MCP 客户端（IDE / 智能体配置）

将 server 条目添加到你的客户端配置文件（例如 `.mcp.json`、Cursor `mcp.json` 或 Gemini CLI 配置）。

### 远程 / 托管 MCP 配置

#### 原生 OAuth 客户端（例如 Claude Desktop）
原生支持 OAuth 流程的客户端在配置了 server URL 后会自动处理授权：
```json
{
  "mcpServers": {
    "Looker": {
      "httpUrl": "https://<YOUR_LOOKER_INSTANCE_URL>/mcp"
    }
  }
}
```
> 注意：对于原生 OAuth 客户端，请使用你注册的 `<CLIENT_GUID>` 作为 Client ID 来配置客户端的 OAuth 设置。详情请参阅 [Configuring Claude Desktop](https://mcp-toolbox.dev/integrations/looker/samples/looker_claude_oauth/#configuring-claude-desktop)。

#### 标准 HTTP 客户端 / 自定义脚本（通过 Headers 使用 Bearer Token）
对于不原生触发 OAuth 登录流程的标准 HTTP MCP 客户端或自定义脚本，在 `headers` 字段中传入预先获取的认证令牌：
```json
{
  "mcpServers": {
    "Looker": {
      "httpUrl": "https://<YOUR_LOOKER_INSTANCE_URL>/mcp",
      "headers": {
        "Authorization": "Bearer <YOUR_OAUTH_ACCESS_TOKEN>"
      }
    }
  }
}
```

### 本地 / 独立 MCP 配置

#### Stdio 模式（通过 `npx`）
```json
{
  "mcpServers": {
    "Looker": {
      "command": "npx",
      "args": ["-y", "@google/mcp-toolbox", "--prebuilt=looker,looker-dev"],
      "env": {
        "LOOKER_BASE_URL": "https://<YOUR_LOOKER_INSTANCE_URL>",
        "LOOKER_CLIENT_ID": "<YOUR_CLIENT_ID>",
        "LOOKER_CLIENT_SECRET": "<YOUR_CLIENT_SECRET>"
      }
    }
  }
}
```

#### HTTP 模式（通过 Docker 容器）
如果你通过 Docker 运行独立 MCP server（如第 1.B 节所述），请使用 `http://localhost:5000/mcp` 作为 MCP URL 连接你的 MCP 客户端：

```json
{
  "mcpServers": {
    "Looker": {
      "httpUrl": "http://localhost:5000/mcp"
    }
  }
}
```

---

## 4. 通过 MCP 可用的工具

Looker MCP Server 提供 **45 个工具**，分为 6 个功能领域：

### 📊 数据与查询执行
| 工具 | 描述 |
| :--- | :--- |
| `query` | 使用 LookML 模型、探索、维度、度量、筛选器、排序和限制来执行结构化查询。 |
| `query_sql` | 生成 Looker 为给定查询定义所编译的底层 SQL 查询。 |
| `query_url` | 根据 Looker 可分享的查询 URL 或 slug 运行或解析查询。 |
| `run_look` | 按 ID 执行已保存的 Look 并返回数据集结果。 |
| `run_dashboard` | 为指定的 Dashboard ID 运行并执行元素查询。 |

### 🔍 探索与元数据目录
| 工具 | 描述 |
| :--- | :--- |
| `get_models` | 列出实例中所有可用的 LookML 模型。 |
| `get_explores` | 列出 LookML 模型中定义的探索。 |
| `get_dimensions` | 获取为某个探索定义的维度字段。 |
| `get_measures` | 获取为某个探索定义的度量字段。 |
| `get_filters` | 获取为某个探索定义的仅筛选字段。 |
| `get_parameters` | 获取为某个探索定义的参数。 |
| `get_connections` | 列出数据库连接配置。 |
| `get_connection_databases` | 列出通过某个连接可访问的数据库。 |
| `get_connection_schemas` | 列出某个数据库连接内的 schema。 |
| `get_connection_tables` | 列出某个连接 schema 内的数据库表。 |
| `get_connection_table_columns` | 列出某个数据库表的列和元数据。 |

### 🎨 仪表板与内容创建
| 工具 | 描述 |
| :--- | :--- |
| `get_looks` | 搜索并获取已保存的 Look。 |
| `get_dashboards` | 搜索并获取用户自定义仪表板和 LookML 仪表板。 |
| `make_look` | 根据查询定义创建一个新的已保存 Look。 |
| `make_dashboard` | 创建一个新的仪表板容器。 |
| `add_dashboard_element` | 向仪表板添加可视化/数据元素。 |
| `add_dashboard_filter` | 向仪表板添加动态交互式筛选器。 |
| `generate_embed_url` | 生成用于嵌入 Looker 内容的签名 SSO 嵌入 URL。 |

### 🛠️ LookML 项目开发
| 工具 | 描述 |
| :--- | :--- |
| `dev_mode` | 为 API 会话切换开发模式与生产模式。 |
| `get_projects` | 列出会话可访问的所有 LookML 项目。 |
| `get_project_directories` | 获取项目的目录结构树。 |
| `get_project_files` | 列出 LookML 项目中的文件。 |
| `get_project_file` | 查看特定 LookML 文件的行内容。 |
| `create_project_file` | 创建新的 LookML 文件（`.lkml`、`.md` 等）。 |
| `update_project_file` | 更新现有 LookML 文件的行内容。 |
| `delete_project_file` | 从项目工作区移除 LookML 文件。 |
| `create_project_directory` | 在 LookML 项目中创建子目录。 |
| `delete_project_directory` | 删除项目子目录。 |
| `create_view_from_table` | 从数据库表自动生成标准 LookML 视图定义。 |
| `validate_project` | 运行 LookML 校验器并返回编译错误/警告。 |
| `get_lookml_tests` | 获取用 LookML 编写的数据测试定义。 |
| `run_lookml_tests` | 执行 LookML 数据测试并返回通过/失败状态。 |

### 🌿 Git 版本控制
| 工具 | 描述 |
| :--- | :--- |
| `get_git_branch` | 获取 LookML 项目的当前 Git 分支状态。 |
| `list_git_branches` | 列出远程和本地 Git 分支。 |
| `create_git_branch` | 创建新的 Git 工作分支。 |
| `switch_git_branch` | 将项目会话上下文切换到指定的 Git 分支。 |
| `delete_git_branch` | 删除指定的 Git 分支。 |

### ⚙️ 开发者与诊断工具
| 工具 | 描述 |
| :--- | :--- |
| `health_pulse` | 对 Looker 实例执行轻量级存活和健康检查。 |
| `health_analyze` | 审计实例查询性能，并标记慢查询/PDT 瓶颈。 |
| `health_vacuum` | 识别未被使用的内容、未使用的探索以及可清理的候选对象。 |

---

## 5. 安全与授权准则

1. **用户范围强制与 OAuth 上下文**：使用 **Looker 托管的 MCP Server**（通过 OAuth 认证用户）时，或在独立 server 配置了用户专属 OAuth 令牌时，用户级范围强制和访问控制（例如 Access Grants、Model Sets 和 User Roles）将生效。
2. **静态 API 凭证警告**：如果独立/本地 MCP server 使用静态环境凭证（`LOOKER_CLIENT_ID` 和 `LOOKER_CLIENT_SECRET`，例如作为共享的 Cloud Run 服务）部署，则所有工具执行都在该单一 API 凭证对的安全上下文中运行。这可能会绕过单个用户级别的访问控制和行级安全规则。
3. **开发模式隔离**：在编辑项目文件时，始终将 `dev_mode` 切换为 `true`，以将编辑隔离到个人开发者工作区分支，然后再暂存和提交。

---

## 6. 替代工具：Looker CLI（`looker-cli`）

对于终端工作流、shell 脚本和 CI/CD 流水线，**Looker CLI（`looker-cli`）** 可作为与 Looker API 操作交互的命令行替代方案。

- **代码仓库**：[Looker CLI GitHub Repository](https://github.com/looker-open-source/looker-cli)
- **使用场景**：Shell 脚本、终端交互式命令、CI/CD 自动化，以及开发者入门工作流（参见 `installing-looker-cli` 和 `authenticating-looker-cli` 技能）。
