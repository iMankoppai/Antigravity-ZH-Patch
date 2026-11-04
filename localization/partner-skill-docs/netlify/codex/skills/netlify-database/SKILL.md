---
name: netlify-database
description: 通过 @netlify/database 为 Netlify 应用提供零配置 Postgres——从 Functions/Edge Functions 查询数据、编写 schema 迁移、设置 Drizzle ORM、用 netlify dev 本地开发、为部署预览创建数据库分支，以及把现有 Postgres 项目迁移到 Netlify。当添加数据库、构建联系表单或 CRUD API、编写 SQL 迁移、接入 Drizzle、运行 netlify database 命令、用本地 Postgres 测试，或从 Neon/Supabase/RDS 切换到 Netlify Database 时，使用本技能。
---

# Netlify Database

零配置托管 Postgres。安装 `@netlify/database`，在 `netlify/database/migrations/` 下编写迁移，然后部署——Netlify 会自动预置数据库并应用迁移。可从 Functions、Edge Functions、Builds 和 Agent Runners 查询。

## 现代客户端（优先用这个）

```ts
import { getDatabase } from "@netlify/database";

const db = getDatabase();               // auto-selects connection for the runtime
const userId = 42;
const users = await db.sql`SELECT * FROM users WHERE id = ${userId}`;  // auto-parameterized
```

改用自有驱动 / ORM：
```ts
import { getConnectionString } from "@netlify/database";
const connectionString = getConnectionString();  // correct branch for this env
```

**旧版——不要在新代码中使用：**`import { neon } from "@netlify/neon"`。已被 `@netlify/database` 取代。把 `neon()` 调用替换为 Drizzle `netlify-db` 适配器，或通过 `getConnectionString()` 使用 Postgres 驱动。旧版环境变量 `NETLIFY_DATABASE_URL` 已被 `NETLIFY_DB_URL` 取代。

## 各部分放在哪里

| 内容 | 位置 |
|------|----------|
| 迁移 | `netlify/database/migrations/`（SQL 文件，或包含 `migration.sql` 的子目录） |
| 查询代码 | Functions（`netlify/functions/`）、Edge Functions |
| Drizzle schema | `db/schema.ts`（约定） |
| Drizzle 客户端 | `db/index.ts`（约定） |
| 连接字符串 | `NETLIFY_DB_URL` 环境变量，或 `getConnectionString()` |

## 查询

`getDatabase(options?)` 返回一个带有 `sql` 和 `pool` 的客户端。`options.connectionString` 覆盖自动预置的连接字符串；`options.debug` 启用日志。

```ts
const db = getDatabase();
const active = await db.sql`SELECT * FROM users WHERE active = ${true}`;
await db.sql`INSERT INTO users (name, email) VALUES (${"Ada"}, ${"ada@example.com"})`;
await db.sql`UPDATE users SET name = ${"Ada Lovelace"} WHERE id = ${1}`;
await db.sql`DELETE FROM users WHERE id = ${1}`;

// Type the rows
interface User { id: number; name: string; email: string; }
const typed = await db.sql<User>`SELECT * FROM users`;

// Stream
for await (const row of db.sql`SELECT * FROM users`.stream()) { /* ... */ }
for await (const chunk of db.sql`SELECT * FROM users`.chunked(100)) { /* ... */ }
```

`SQLTemplate` 方法：`execute()` → `Promise<T[]>`、`stream()` → `AsyncGenerator<T>`、`chunked(n)` → `AsyncGenerator<T[]>`、`toSQL()` → 返回原始 SQL + 参数而不执行。

`sql` 辅助函数：
- `sql.identifier(value)`——安全的表/列名。字符串、字符串数组，或 `{ schema, table, column, as }`。
- `sql.values(rows)`——从二维数组生成批量插入的值列表。
- `sql.default`——SQL 的 `DEFAULT` 关键字。
- `sql.raw(value)`——**注入未参数化的 SQL；绕过注入防护。仅用于可信常量（例如 `"DESC"`），绝不用于用户输入。**
- `sql.unsafe(query, params?, { rowMode })`——带 `$1` 参数的原始查询字符串；`rowMode` 为 `"array"` 或 `"object"`。

### 事务——使用 `pool`

`db.pool` 是一个 [`pg.Pool`](https://node-postgres.com/apis/pool)。`BEGIN`/查询/`COMMIT` 必须在同一个连接上运行：
```ts
const client = await db.pool.connect();
try {
  await client.query("BEGIN");
  await client.query("INSERT INTO users (name, email) VALUES ($1, $2)", ["Ada", "ada@example.com"]);
  await client.query("INSERT INTO posts (author_id, title) VALUES ($1, $2)", [1, "First post"]);
  await client.query("COMMIT");
} catch (e) {
  await client.query("ROLLBACK");
  throw e;
} finally {
  client.release();
}
```

自有驱动：
```ts
import { getConnectionString } from "@netlify/database";
import pg from "pg";
const pool = new pg.Pool({ connectionString: getConnectionString() });

// or the `postgres` driver via env var
import postgres from "postgres";
const sql = postgres(process.env.NETLIFY_DB_URL);
```

## Drizzle ORM

**两个包都必须从 `@beta` 安装——这是必需的。**`latest` 缺少 `drizzle-orm/netlify-db` 适配器并会失败。
```bash
npm install @netlify/database drizzle-orm@beta
npm install -D drizzle-kit@beta
```

`drizzle.config.ts`——你**必须**把 `out` 设为 Netlify 迁移目录，否则 Netlify 不会应用生成的迁移：
```ts title="drizzle.config.ts"
import { defineConfig } from "drizzle-kit";
export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "netlify/database/migrations",   // NOT the default "drizzle"
});
```

```ts title="db/schema.ts"
import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
export const users = pgTable("users", {
  id: serial().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  createdAt: timestamp().defaultNow(),
});
```

```ts title="db/index.ts"
import { drizzle } from "drizzle-orm/netlify-db";  // native adapter, auto-configured
import * as schema from "./schema";
export const db = drizzle({ schema });
```

```ts title="netlify/functions/api.ts"
import { desc } from "drizzle-orm";
import type { Config, Context } from "@netlify/functions";
import { db } from "../../db";
import { users } from "../../db/schema";

export default async (req: Request, context: Context) => {
  if (req.method === "GET") {
    const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
    return Response.json(allUsers);
  }
  if (req.method === "POST") {
    const { name, email } = await req.json();
    const [user] = await db.insert(users).values({ name, email }).returning();
    return Response.json(user, { status: 201 });
  }
  return new Response("Method not allowed", { status: 405 });
};

export const config: Config = { path: "/api/users" };
```

编辑 schema 后生成迁移：`npx drizzle-kit generate`。

**绝不要对 Netlify 托管的数据库运行 `drizzle-kit push`，也绝不要对 `NETLIFY_DB_URL` 运行 `drizzle-kit migrate`。**schema 只能以已提交的迁移文件形式、由部署应用到托管数据库。`generate` 写出文件；部署来应用它们。

## 迁移

文件位于 `netlify/database/migrations/`。两种格式：
```text
netlify/database/migrations/20260301143000_create_users.sql          # single SQL file
netlify/database/migrations/20260318091500_add_posts/migration.sql   # subdir form
```

命名：`<number>_<slug>`——`number` 是数字（时间戳或 `0001`…）定义顺序；`slug` 是小写字母/数字/连字符/下划线。按**字典序**排序，并按顺序应用。**使用时间戳前缀**（`netlify database migrations new` 会处理这一点）以避免乱序被拒。

```sql title="netlify/database/migrations/20260425103000_create_comments.sql"
CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id),
  author_id INTEGER NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**何时应用：**
- 生产部署：在发布前立即应用；失败会阻止发布。关闭自动发布时，Netlify 会等待手动发布后再应用。
- 部署预览：每次部署在上线前应用；失败会使部署失败。
- 本地：**不**自动——请自行运行 `netlify database migrations apply`。

**迁移陷阱（都会被检测为 drift / 被拒绝）：**
- **绝不要编辑已应用的迁移**——校验和 drift：`migration "<name>" has been modified after being applied`。写一个新的纠正迁移。
- **绝不要移除已应用的迁移**——`... has been removed after being applied`。把它恢复。
- **乱序：**前缀 ≤ 已应用的最高版本的会被拒绝。时间戳可避免此问题。
- 优先使用向后兼容的迁移。破坏性变更（重命名/删除列）→ 跨多次部署做 expand-and-contract。新表 / 可空列 → 单个迁移即可。

自带迁移系统：选择一个**不是** `netlify/database/migrations` 的目录以避免自动检测，然后由你自己负责应用到预览分支和生产。

见 `references/migrations.md`。

## 本地开发

本地是**一个**所有代码都指向的数据库——分支是部署时的概念，本地不存在。它是镜像生产的、真正兼容 Postgres 的引擎，但为单进程（不用于负载测试）；auto-scale/sleep 设置不适用。

启动它——两种方式，状态可互换：
```bash
netlify dev                                    # CLI starts + tears down the local DB
```
或使用 Vite 插件：
```ts title="vite.config.ts"
import { defineConfig } from "vite";
import netlify from "@netlify/vite-plugin";
export default defineConfig({ plugins: [netlify()] });
```

常用命令（本地数据库运行时）：
```bash
netlify database migrations apply                        # apply pending locally
netlify database migrations new -d "add users table"     # scaffold new migration
netlify database migrations pull                          # overwrite local migrations from remote
netlify database status                                   # enabled? installed? applied/pending migrations
netlify database connect                                  # interactive SQL REPL
netlify database connect --query "SELECT * FROM users LIMIT 10"
netlify database reset                                    # drop all schemas/tables — LOCAL ONLY
netlify database migrations reset                         # delete unapplied local migration files
```

外部工具（在 `netlify dev` 运行期间可用）：
```bash
psql "$(netlify database connect --json | jq -r .connection_string)"
```

见 `references/local-dev.md`。

## 设置

新项目：在 https://app.netlify.com/start 向 Agent Runners 描述你的应用，或在本地运行 `netlify create "<description>"`。

现有项目：
```bash
netlify database init      # installs @netlify/database, picks Drizzle or raw SQL, scaffolds a migration
netlify database init --yes # non-interactive (CI / agents)
netlify dev
```
手动：`npm install @netlify/database`，在 `netlify/database/migrations/` 下写一个迁移，写一个 function，`netlify dev`，部署。

**如果未安装 `@netlify/database`，Netlify 就**不会**自动预置数据库**——你必须从 UI 的 **Data & Storage** > **Database** 菜单手动创建。请安装该包。

## CLI 参考（`netlify database`）

前提：Node ≥ 20.12.2，Netlify CLI ≥ 26.0.0（`npm install -g netlify-cli`）。所有命令都支持 `--json`。

| 命令 | 用途 | 关键标志 |
|---------|---------|-----------|
| `init` | 在项目中设置数据库 | `-y, --yes` |
| `status` | 状态：已启用、已安装、连接字符串、已应用/待应用的迁移 | `-b, --branch`, `--show-credentials` |
| `connect` | SQL REPL，或 `--query` 一次性执行 | `-q, --query`, `--json` |
| `migrations apply` | 把待应用的迁移应用到本地数据库 | `--to <name>` |
| `migrations new` | 脚手架生成一个迁移 | `-d, --description`, `-s, --scheme sequential\|timestamp` |
| `migrations pull` | 从一个分支覆盖本地文件 | `-b, --branch`, `--force` |
| `migrations reset` | 删除未应用的本地迁移文件 | `-b, --branch` |
| `reset` | 删除所有数据/表——**仅本地** | — |

见 `references/cli-commands.md`。

## REST API

作用于单个站点，根位于 `https://api.netlify.com/api/v1`，OAuth 2。完整参考：https://open-api.netlify.com。

| 方法 + 路径 | 用途 |
|---------------|---------|
| `POST /sites/{site_id}/database` | 创建数据库（若已存在则返回现有连接字符串）；`region` 可选 |
| `GET /sites/{site_id}/database` | 获取连接字符串 |
| `POST /sites/{site_id}/database/branch` | 创建分支；body `deploy_id`（必填）、`parent_branch_id`（可选，默认生产） |
| `GET /sites/{site_id}/database/branch/{deploy_id}` | 获取分支连接字符串（没有则 404） |
| `DELETE /sites/{site_id}/database/branch/{deploy_id}` | 删除某次部署的分支 |
| `POST /sites/{site_id}/database/snapshot` | 对分支做快照（默认生产） |
| `GET /sites/{site_id}/database/snapshots` | 列出快照 |
| `DELETE /sites/{site_id}/database/snapshot/{snapshot_id}` | 删除快照 |
| `POST /sites/{site_id}/database/snapshot/{snapshot_id}/restore` | 把快照恢复到分支（默认生产） |

**分支删除和快照恢复是破坏性的，必须先获得用户明确确认。**快照恢复不是常规的生产回滚手段。

## 测试

用于单元/集成测试的裸 Postgres（无 functions）：
```ts title="db.test.ts"
import { NetlifyDB } from "@netlify/database-dev";  // npm i -D @netlify/database-dev
import { Client } from "pg";
import { afterAll, beforeAll, expect, test } from "vitest";

let db: NetlifyDB, connectionString: string;
beforeAll(async () => {
  db = new NetlifyDB();
  connectionString = await db.start();
  await db.applyMigrations("./netlify/database/migrations");
});
afterAll(async () => { await db.stop(); });

test("inserts and reads a user", async () => {
  const client = new Client({ connectionString });
  await client.connect();
  await client.query("INSERT INTO users (name) VALUES ($1)", ["Ada"]);
  const { rows } = await client.query("SELECT name FROM users");
  expect(rows).toEqual([{ name: "Ada" }]);
  await client.end();
});
```
`NetlifyDB(options?)`：`directory`（持久化到磁盘；省略 = 内存）、`port`（默认随机）、`logger`。

完整 Netlify 环境（functions/edge functions 像在生产环境一样读取 `NETLIFY_DB_URL`）：
```ts
import { NetlifyDev } from "@netlify/dev";  // npm i -D @netlify/dev
const netlifyDev = new NetlifyDev({ projectRoot: "./fixtures/my-project" });
await netlifyDev.start();  // sets NETLIFY_DB_URL in the runtime
// ...tests...
await netlifyDev.stop();
```

## 数据库分支（部署时）

生产部署是唯一会触及生产数据库的部署。每个部署预览都有自己独立的分支，在创建预览时用生产数据的副本播种；那里的 schema/数据变更永不影响生产。自动接好，无需改代码。

**预览分支可能包含生产数据，包括 PII——而且预览部署链接是公开的。在分享预览链接前提醒用户。**

## 运行时注意事项

- **`Environment not configured`**（`getDatabase()` 无法解析连接字符串）：在 Netlify 之外运行、在 **Lambda 兼容模式下的 Functions** 上运行，或 CLI 过旧。修复：显式传入 `connectionString`。
  ```ts
  const db = getDatabase({ connectionString: "postgres://..." });
  ```
  Lambda 兼容模式是唯一必须自行传入 `connectionString` 的原语。
- **`database feature not available for this account`**——需要基于额度的套餐。
- **`compute customization requires a Pro or higher plan`**——auto-scale / sleep 设置需要 Pro+；Free/Personal 使用默认值。
- **`branch limit reached: maximum <N> branches...`**——每个活跃的部署预览消耗一个分支；删除不需要的分支或升级。
- **`database not found`**——未预置数据库；运行 `netlify database init`。
- **`cannot reset the production branch`**——reset 仅限非生产。

## 约束

- **套餐：**Netlify Database 仅在基于额度的套餐上可用；活跃的数据库会消耗计算和带宽额度。存储在 2026 年 7 月 1 日前免费。
- **权限：**只有 Team Owner 可以删除数据库；只有 Team Owners 和 Developers 可以查看连接字符串（`Access Denied` = 角色权限不足）。
- **密钥：**连接字符串包含用户名 + 密码。绝不提交它们；存放在密钥管理器 / 环境变量提供程序中。

## 将现有 Postgres 项目切换到 Netlify Database

三个阶段：预置（在分支上建立基线 schema）、演练（替换代码，把数据复制到预览分支，验证）、切换（导入数据到生产，合并）。适用于任何 Postgres 来源（Neon、Supabase、RDS、自管理、旧版 `@netlify/neon`）。使用 `pg_dump`/`pg_restore`（版本与来源匹配）。存在短暂的数据丢失窗口——最终导出与生产部署期间对来源的写入不会同步过来。

阶段 2/3 代码替换（Drizzle）：
```ts title="db/index.ts"
import { drizzle } from "drizzle-orm/netlify-db";
import * as schema from "./schema";
export const db = drizzle({ schema });
```

完整分步指南（dump 标志、回滚、清理）：`references/migration-from-extension.md` 和 `references/legacy-extension.md`。

<!-- Gaps: plan-tier naming (Credit-based vs Free/Personal/Pro) not reconciled in source; exact plan limits, permission tables, and snapshot UI flows live on pages outside this grouping. -->

<!-- system: agent-context/database/system.md — human-owned, merged by ctx-gen; edit system.md, not this section -->
# Netlify 内部规则（database）

这些是组织约定，而非文档事实——由 ctx-gen 合并进渲染后的技能，且从不自动生成。由技能维护者负责。

1. 生产数据变更以 DML 迁移的形式表达——智能体绝不直接编辑行（UI 行编辑是给人用的；它不是智能体的操作界面）。
2. 预览分支可能包含生产数据，包括 PII——而且预览部署链接是公开的。分享前提醒。
3. 仅使用有文档记载的接口：不要对内部 endpoint 使用裸 psql，不要抓取 `netlify api`，不要从本地 CLI 配置文件读取令牌。
4. 深入指南位于本技能中：`references/operational-footguns.md`、`references/migrations.md`、`references/local-dev.md`、`references/cli-commands.md`、`references/migration-from-extension.md`、`references/legacy-extension.md`。
5. schema 变更只能以已提交的迁移文件形式、由部署应用到托管数据库。绝不要以任何形式对 Netlify 托管的数据库运行 `drizzle-kit push`，绝不要对 `NETLIFY_DB_URL` 运行 `drizzle-kit migrate`，也绝不通过 `netlify database connect` 或任何直接连接应用 DDL。
6. 当 `netlify` 命令或部署失败时，向用户呈现确切的错误、部署日志 URL 以及受影响的站点/分支，然后停止——不要发明恢复命令或升级到更低层的工具。
7. 首次部署时 `createSiteDatabase` 上的 `401 Access Denied`：如果发生在 `--prod` 优先的部署上，先重试预览优先（`netlify deploy`，不带 `--prod`）；如果预览也失败，报告并停止。绝不要 curl `api.netlify.com`、运行 `netlify api createSiteDatabase`，或从本地 CLI 配置拉取令牌来绕过它。
8. 更改现有数据的请求在生产与预览分支之间有歧义——如果提示词没有说明，就问。在代表他人行事时，默认不要触碰生产。
9. 破坏性数据库操作——REST 分支删除、快照恢复、任何 reset——必须先获得用户明确确认。正文不得把快照恢复呈现为常规的生产回滚手段。
10. 固定：`drizzle-orm` 和 `drizzle-kit` 必须从 `@beta` 安装——`latest` 缺少 `drizzle-orm/netlify-db` 适配器并会失败。正文不得把这一点弱化为建议。
