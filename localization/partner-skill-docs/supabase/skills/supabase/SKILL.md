---
name: supabase
description: "在做任何涉及 Supabase 的任务时使用。触发场景：Supabase 产品（Database、Auth、Edge Functions、Realtime、Storage、Vectors、Cron、Queues）；Next.js、React、SvelteKit、Astro、Remix 中的客户端库与 SSR 集成（supabase-js、@supabase/ssr）；认证问题（登录、登出、会话、JWT、cookie、getSession、getUser、getClaims、RLS）；Supabase CLI 或 MCP 服务器；架构变更、迁移、声明式 schema、安全审计、Postgres 扩展（pg_graphql、pg_cron、pg_vector）；调试与排查 Supabase 项目上的错误或意外行为（HTTP 错误、Postgres 错误、RLS 异常、权限被拒、schema 缓存问题、超时、Edge Function 崩溃、Realtime 断连、Storage 失败）以及读取或查询日志（Logs Explorer、ClickHouse）。"
metadata:
  author: supabase
  version: "0.1.2"
---

# Supabase

## 核心原则

**1. Supabase 变化频繁——在实现之前务必对照更新日志与当前文档进行核实。**
不要依赖训练数据来了解 Supabase 功能。函数签名、config.toml 设置和 API 约定会随版本变化。

首先，抓取 `https://supabase.com/changelog.md`（一个轻量的摘要索引——不是重量级拉取），扫描与你的任务相关的 `breaking-change` 标签，并针对任何适用的标签跟进链接页面。然后使用下面的文档访问方法查阅相关主题。

**2. 验证你的工作。**
实现任何修复后，运行一次测试查询以确认更改有效。未经核实的修复是不完整的。

**3. 从错误中恢复，不要陷入循环。**
若某种方法在尝试 2-3 次后仍失败，请停下来重新考虑。尝试不同的方法、查阅文档、更仔细地检查错误，并在可用时查看相关日志。Supabase 问题并非总能通过重试同一命令解决，答案也不总在日志中，但在继续之前查看日志往往值得。

**4. 将表暴露给 Data API：** 取决于用户的 [Data API 设置](https://supabase.com/dashboard/project/<ref>/integrations/data_api/settings)，新建的表可能不会自动通过 Data（REST）API 暴露。若如此，需要显式向 `anon` 和 `authenticated` 角色授予访问权限。

> 请注意，这与 RLS 不同；RLS 控制的是表可访问后哪些_行_可见，而不是表本身是否可访问。

当用户报告通过 SQL 创建的表意外无法访问时，检查其 Data API 设置，以及这些角色是否通过显式 `GRANT` SQL 被授予了访问权限。授予公共（`anon`/`authenticated`）访问时，务必同时启用 RLS。完整设置流程见[将表暴露给 Data API](https://supabase.com/docs/guides/api/securing-your-api.md)。

**5. 暴露 schema 中的 RLS。**
在任何一个暴露的 schema（默认包括 `public`）中的每张表上启用 RLS。这在 Supabase 中至关重要，因为当 `anon`/`authenticated` 角色具有访问权限时，暴露 schema 中的表可通过 Data API 访问（参见[将表暴露给 Data API](https://supabase.com/docs/guides/api/securing-your-api.md)）。对于私有 schema，优先使用 RLS 作为纵深防御。启用 RLS 后，创建匹配实际访问模型的策略，而不是将每张表都默认为相同的 `auth.uid()` 模式。

**6. 安全检查清单。**
在处理任何涉及认证、RLS、视图、存储或用户数据的 Supabase 任务时，请过一遍此清单。这些是 Supabase 特有的安全陷阱，会静默地产生漏洞：

- **认证与会话安全**
  - **切勿在基于 JWT 的授权决策中使用 `user_metadata` 声明。** 在 Supabase 中，`raw_user_meta_data` 是用户可编辑的，并可能出现在 `auth.jwt()` 中，因此对 RLS 策略或任何其他授权逻辑都不安全。请将授权数据存储在 `raw_app_meta_data` / `app_metadata` 中。
  - **删除用户并不会使现有访问令牌失效。** 应先登出或撤销会话，对敏感应用保持较短的 JWT 过期时间，对于严格保证，在敏感操作中针对 `auth.sessions` 验证 `session_id`。
  - **若你使用 `app_metadata` 或 `auth.jwt()` 进行授权，请记住直到用户的令牌刷新之前，JWT 声明并不总是最新的。**

- **API 密钥与客户端暴露**
  - **切勿在公共客户端中暴露 `service_role` 或 secret key。** 前端代码优先使用 publishable key。旧的 `anon` key 仅用于兼容。在 Next.js 中，任何 `NEXT_PUBLIC_` 环境变量都会被发送到浏览器。
  - **为 Management API、CLI 和 MCP 服务器使用限定范围的个人访问令牌。** 经典的个人访问令牌携带用户在每个组织、每个项目上的完整账户访问权限。对于脚本、CI 和智能体，让用户创建一个限定于任务所需组织、项目和权限的令牌。[个人访问令牌指南](https://supabase.com/docs/guides/platform/personal-access-tokens.md)列出了每个 Management API 端点和 MCP 工具所需的权限。请在那里查阅权限，而非猜测。

- **RLS、视图与特权数据库代码**
  - **视图默认绕过 RLS。** 在 Postgres 15 及以上版本中，使用 `CREATE VIEW ... WITH (security_invoker = true)`。在较旧版本的 Postgres 中，通过撤销 `anon` 和 `authenticated` 角色的访问权限，或将视图放入未暴露的 schema 来保护它们。
  - **UPDATE 需要 SELECT 策略。** 在 Postgres RLS 中，UPDATE 需要先 SELECT 该行。没有 SELECT 策略时，更新会静默返回 0 行——无错误，也无更改。
  - **`auth.role()` 已废弃——改用 `TO` 子句。** Supabase 已废弃 `auth.role()`，改为在策略上通过 `TO authenticated` 或 `TO anon` 直接指定目标角色。除了废弃之外，当启用匿名登录时，`auth.role() = 'authenticated'` 会静默失效，因为匿名用户携带 `authenticated` Postgres 角色，无论用户是否真正登录都会通过该检查。
    ```sql
    -- Deprecated (do not use)
    create policy "example" on table_name for select
    using ( auth.role() = 'authenticated' );
    ```
  - **仅 `TO authenticated` 是认证而非授权（BOLA / IDOR）。** 使用 `TO authenticated` 只检查角色——它不限制用户可访问哪些行。正确的模式将 `TO authenticated` 与 `USING` 中的所有权谓词结合：
    ```sql
    create policy "example" on table_name for select
    to authenticated
    using ( (select auth.uid()) = user_id );
    ```
  - **UPDATE 策略同时需要 `USING` 和 `WITH CHECK`。** 没有 `WITH CHECK`，用户可将某行的 `user_id` 重新分配给其他用户：
    ```sql
    create policy "example" on table_name for update
    to authenticated
    using ( (select auth.uid()) = user_id )
    with check ( (select auth.uid()) = user_id );
    ```
  - **`SECURITY DEFINER` 函数绕过 RLS。** `SECURITY DEFINER` 函数以其创建者的权限运行——通常是具有 `bypassrls` 的角色（如 `postgres`）。切勿为了消除权限错误而添加 `SECURITY DEFINER`；它会静默移除访问控制，而不修复根本原因。优先使用 `SECURITY INVOKER`。
  - **`public` 中的 `SECURITY DEFINER` 函数可被所有角色调用。** Postgres 默认会为每个新函数向 `PUBLIC` 授予 `EXECUTE`，因此 `public` 中任何 `SECURITY DEFINER` 函数都是公共 API 端点，可被 `anon` 和 `authenticated`（它们继承自 `PUBLIC`）在无任何额外授权的情况下调用。当确实需要 `SECURITY DEFINER` 时（例如在内部查找表上绕过 RLS），将函数放在未暴露的 schema 中，始终在函数体内包含 `auth.uid()` 检查，并在更改后运行 `supabase db advisors`。

- **存储访问控制**
  - **存储 upsert 需要 INSERT + SELECT + UPDATE。** 仅授予 INSERT 允许新上传，但文件替换（upsert）会静默失败。你需要全部三者。

- **依赖与供应链安全**
  - **安装 Supabase 包（`supabase-js`、`@supabase/ssr`、`supabase-py` 等）时，始终固定包版本并提交锁文件。** 完整清单见 [npm 安全指南](https://supabase.com/docs/guides/security/npm-security.md)。

对于上述未涵盖的任何安全问题，请抓取 Supabase 产品安全索引：`https://supabase.com/docs/guides/security/product-security.md`

## Supabase CLI

始终通过 `--help` 发现命令——切勿猜测。CLI 结构会随版本变化。

```bash
supabase --help                    # All top-level commands
supabase <group> --help            # Subcommands (e.g., supabase db --help)
supabase <group> <command> --help  # Flags for a specific command
```

**Supabase CLI 已知陷阱：**

- `supabase db query` 需要 **CLI v2.79.0+** → 可回退使用 MCP `execute_sql` 或 `psql`
- `supabase db advisors` 需要 **CLI v2.81.3+** → 可回退使用 MCP `get_advisors`
- `supabase login` 的浏览器流程会创建一个具有完整账户访问权限的经典令牌。在 CI 中，改为将 `SUPABASE_ACCESS_TOKEN` 设置为限定范围的个人访问令牌。它优先于任何已保存的登录。使用数据库密码连接的命令（`--password` 或 `SUPABASE_DB_PASSWORD`，例如 `supabase db push`）不受令牌权限的限制。
- 在命令式迁移项目中，首先使用 `supabase migration new <name>` 创建新的手工编写迁移文件。切勿臆造迁移文件名，或凭记忆确定预期格式。声明式 schema 项目从 `supabase/schemas/` 生成迁移；参见下文“进行并提交 Schema 变更”。

**版本检查与升级：** 运行 `supabase --version` 检查。CLI 更新日志和特定版本功能，请查阅 [CLI 文档](https://supabase.com/docs/reference/cli/introduction)或 [GitHub releases](https://github.com/supabase/cli/releases)。

## Supabase MCP 服务器

设置说明、服务器 URL 和配置，见 [MCP 设置指南](https://supabase.com/docs/guides/getting-started/mcp)。

**排查连接问题**——按顺序执行以下步骤：

1. **检查服务器是否可达：**
   `curl -so /dev/null -w "%{http_code}" https://mcp.supabase.com/mcp`
   预期返回 `401`（无令牌），表示服务器已启动。超时或“connection refused”表示它可能已宕机。

2. **检查 `.mcp.json` 配置：**
   确认项目根目录有有效的 `.mcp.json`，且服务器 URL 正确。若缺失，创建一个指向 `https://mcp.supabase.com/mcp` 的文件。

3. **对 MCP 服务器进行认证：**
   若服务器可达且 `.mcp.json` 正确，但工具不可见，则用户需要认证。Supabase MCP 服务器使用 OAuth 2.1——告知用户在其智能体中触发认证流程、在浏览器中完成，并重新加载会话。
   在无法运行浏览器流程的 CI 或其他环境中，改为在 `Authorization: Bearer` 头中传入限定范围的个人访问令牌。

4. **检查限定范围令牌的权限：**
   若在使用限定范围的个人访问令牌时，某工具失败并提示“You do not have permission to perform this action”，则令牌缺少该工具的权限，或项目超出令牌范围。在[个人访问令牌指南](https://supabase.com/docs/guides/platform/personal-access-tokens.md#mcp-tools)中查看该工具所需的权限。

## Supabase 文档

在实现任何 Supabase 功能之前，找到相关文档。按以下优先级使用这些方法：

1. **MCP `search_docs` 工具**（首选——直接返回相关片段）
2. **将文档页面抓取为 markdown**——任何文档页面都可通过在 URL 路径后追加 `.md` 来抓取。
3. **网页搜索** Supabase 专属主题，当你不知道应查看哪个页面时。

## 进行并提交 Schema 变更

首先确定项目使用哪种 schema 工作流。

### 选项 A：声明式 schema

当存在 `supabase/schemas/` 或 `config.toml` 设置了 `schema_paths` 时使用此方式。在这些文件中编辑所需的 schema 状态，然后生成并审查迁移。不要从手工编写迁移开始。参见[声明式数据库 schema 指南](https://supabase.com/docs/guides/local-development/declarative-database-schemas)。

### 选项 B：命令式迁移

当项目不使用声明式 schema 时使用此方式。

**要进行 schema 变更，使用 `execute_sql`（MCP）或 `supabase db query`（CLI）。** 它们直接在数据库上运行 SQL 而不创建迁移历史记录，因此你可以自由迭代，并在准备就绪时生成干净的迁移。

不要使用 `apply_migration` 更改本地数据库 schema——它每次调用都会写入一条迁移历史记录，这意味着你无法迭代，且 `supabase db diff` / `supabase db pull` 会产生空或冲突的 diff。若你使用它，你将受限于第一次尝试时传入的任何 SQL。

**当准备就绪，将更改提交到迁移文件时：**

1. **运行 advisors** → `supabase db advisors`（CLI v2.81.3+）或 MCP `get_advisors`。修复任何问题。
2. **若你的更改涉及视图、函数、触发器或存储，请复查上面的安全检查清单。**
3. **生成迁移** → `supabase db pull <descriptive-name> --local --yes`
4. **验证** → `supabase migration list --local`

## 调试

当你在 Supabase 相关请求上遇到错误（例如来自 Supabase REST API、Postgres 数据库或 PostgREST 的错误码）、空结果、意外被 RLS 阻止，或来自 Auth、Realtime、Edge Functions 或 Storage 等 Supabase 服务的错误时，你**必须**在诊断或提出修复方案之前抓取 Supabase 的[监控与调试](https://supabase.com/docs/guides/monitoring-and-debugging.md)文档，而不是凭记忆处理。同一文档也涵盖性能优化，例如慢查询和缺失索引。

## 参考指南

- **技能反馈** → [references/skill-feedback.md](references/skill-feedback.md)
  **当用户报告此技能给出了错误指导或缺少信息时，必须阅读。**
