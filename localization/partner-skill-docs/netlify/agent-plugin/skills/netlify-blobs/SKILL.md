---
name: netlify-blobs
description: 使用 @netlify/blobs 模块在 Netlify 上存储和检索非结构化对象、文件和类缓存状态。当持久化用户文件上传（图片/文档）、缓存 functions 或 Background Functions 的计算输出、提供可下载资源、存储按 ID 键控的 JSON blob，或为特定部署播种数据时，使用本技能。需要从 Functions、Edge Functions 或 Build Plugins 进行键/值或对象存储时使用它——不用于按用户、事务性或关系型数据（那类数据请用 Netlify DB）。触发场景包括"保存上传的文件"、"缓存 API 结果"、"存储生成的站点地图"、"为 function 提供键/值存储"或"没有数据库的文件上传"。
---

# Netlify Blobs

现代语法：从 `@netlify/blobs` 导入，打开一个 store，然后在句柄上调用方法。

```ts
import { getStore, getDeployStore, listStores } from "@netlify/blobs";
import type { Context } from "@netlify/functions"; // or "@netlify/edge-functions"
```

在 Functions、Edge Functions 和 Build Plugins 中，`siteID`、`deployID`、`token`（以及 `getDeployStore` 的 `region`）会自动注入。用 `npm install @netlify/blobs` 安装。

**不是数据库。**对于动态、按用户、事务性或关系型数据，请使用 Netlify DB。Blobs 用于对象、文件和类缓存状态。它针对频繁读取和不频繁写入进行了优化。

**Store 的作用域是个陷阱。先读这一段。**`getStore` 打开的是一个**在所有部署上下文之间共享的站点级 store**。部署预览上的代码会读取、覆盖并删除生产数据。绝不要从预览针对站点级 store 运行破坏性测试或写入一次性数据。要用 `getDeployStore()` 或特定上下文的 store 名称来实现隔离。

## 选择 store 类型

- `getStore(name)`：站点级，跨所有部署共享。数据跨部署持久存在，预览会看到生产数据。
- `getDeployStore(name)`：特定于部署，作用于单次部署。回滚时保持同步，部署删除时被清理。用于隔离，以及任何失败部署都不得破坏的内容。
- **Build plugins 可以从站点的任意 store 读取，但只能写入特定于部署的 store**（`getDeployStore`）。基于文件的上传也只写入特定于部署的 store。

## 核心写入与读取

```ts
const uploads = getStore("file-uploads");

// set: value is ArrayBuffer | Blob | string
await uploads.set(key, file, { metadata: { country: "Spain" } });

// setJSON: any JSON-serializable value
await uploads.setJSON(key, { hello: "world" });

// get: returns value or null. type: text (default) | json | arrayBuffer | blob | stream
const entry = await uploads.get(key);            // string
const obj = await uploads.get(key, { type: "json" });
if (entry === null) { /* 404 */ }
```

`set`/`setJSON` 会覆盖已有 key。两者都返回 `{ modified, etag }`。当没有生成新条目时，`etag` 会被省略。

### 持久化用户上传（Function）

```ts
import { getStore } from "@netlify/blobs";
import type { Context } from "@netlify/functions";
import { v4 as uuid } from "uuid";

export default async (req: Request, context: Context) => {
  const form = await req.formData();
  const file = form.get("file") as File;
  const key = uuid();
  const uploads = getStore("file-uploads");
  await uploads.set(key, file, { metadata: { country: context.geo.country.name } });
  return new Response("Submission saved");
};
```

edge functions 完全相同，只是使用 `import type { Context } from "@netlify/edge-functions";`。

### 读取（Function）

```ts
export default async (req: Request, context: Context) => {
  const { key } = context.params;
  const uploads = getStore("file-uploads");
  const entry = await uploads.get(key);
  if (entry === null) return new Response(`Not found: ${key}`, { status: 404 });
  return new Response(entry);
};
```

## 元数据与条件读取

**解构前先做 null 检查。**当 key 不存在时，`getWithMetadata` 和 `getMetadata` 会解析为 `null`。直接解构返回值（`const { data } = await store.getWithMetadata(key)`）在 key 缺失时会抛出异常。先把结果赋给变量，检查是否为 `null`，再读取其字段。

```ts
// getWithMetadata: data + metadata + etag
const entry = await uploads.getWithMetadata(key);
if (entry === null) return new Response(`Not found: ${key}`, { status: 404 });
const { data, metadata } = entry;
return new Response(data, { headers: { "X-Country": metadata.country } });

// getMetadata: metadata + etag only, without downloading the blob
const meta = await uploads.getMetadata(key); // { etag, metadata } or null
if (meta === null) { /* missing */ }
```

两者都接受 `{ consistency, etag, type }`。

**条件读取：**传入一个已缓存的 `etag`。如果它在服务端仍然匹配，`data` 为 `null`，意味着你的副本是新鲜的。比较整个 ETag 值，包括其两侧的引号和任何 weakness 前缀。

```ts
const entry = await uploads.getWithMetadata("my-key", { etag: cachedETag });
if (entry !== null && entry.etag === cachedETag) {
  // entry.data is null: cached copy still fresh
}
```

## 并发：原子条件写入

**后写入者胜出。没有并发控制。**不要在 blob key 上构建计数器、余额或读-改-写逻辑，即使搭配 `onlyIfMatch` 重试也不行。那是事务性数据；请使用 Netlify DB。

`set`/`setJSON` 接受 `{ onlyIfNew, onlyIfMatch }`：

```ts
// Create only if key does not exist
const { modified } = await emails.set("jane@netlify.com", "Jane Doe", { onlyIfNew: true });
if (!modified) return new Response("Email already exists", { status: 400 });

// Update only if the ETag still matches
const { modified } = await emails.set("jane@netlify.com", "New Jane", { onlyIfMatch: etag });
if (!modified) return new Response("Cached data is stale", { status: 400 });
```

## 列出

```ts
const { blobs } = await uploads.list(); // blobs: [{ etag, key }]
```

`list({ directories, paginate, prefix })`。用 `/` 对 key 进行分层分组：

```ts
const { blobs, directories } = await animals.list({ directories: true });
// directories: ["cats", "dogs"]; blobs: top-level keys only

// Drill in. Trailing slash REQUIRED (without it "catsuit" also matches)
const res = await animals.list({ directories: true, prefix: "cats/" });
```

分页：`list` 默认返回所有页，每页最多 1,000 个条目。设置 `paginate: true` 可获得一个 `AsyncIterator`：

```ts
for await (const page of store.list({ paginate: true })) {
  console.log(page.blobs);
}
```

`listStores({ paginate })` 返回 `{ stores: string[] }`，每页最多 1,000 个。它**不包含特定于部署的 store**。

## 删除

```ts
await uploads.delete(key);                        // resolves undefined
const { deletedBlobs } = await uploads.deleteAll(); // deletes every object = deletes the store
```

## 过期（没有服务端 TTL）

Blob 自身永不过期。在 metadata 中存储过期时间戳，读取时检查它，一旦过期就 `delete` 该 blob：

```ts
await uploads.set(key, body, { metadata: { expiration: new Date("2025-01-01").getTime() } });
const entry = await uploads.getWithMetadata(key);
if (entry === null) return new Response("Blob does not exist");
const { expiration } = entry.metadata;
if (expiration && expiration < Date.now()) await uploads.delete(key);
```

## 一致性

默认是**最终**一致性。新写入会立即全局可用，但更新和删除最多需要 60 秒才能到达所有边缘位置。可按 store 或按读取选择**强**一致性：

```ts
const store = getStore({ name: "animals", consistency: "strong" }); // whole store
await store.get("dog", { consistency: "strong" });                  // single read
```

Netlify CLI 始终使用强一致性。

## 区域

`region` 接受的是 **AWS 区域代码**，而不是用于 functions 区域的机场代码。支持的值有 `ap-southeast-1`、`ap-southeast-2`、`eu-central-1`、`us-east-1` 和 `us-east-2`。任何其他值都会在发出请求之前抛出 `InvalidBlobsRegionError`。

- **特定于部署的 store**默认使用你的 functions 区域（自动注入）。
- **站点级 store**默认使用 `us-east-2`，并且不跟随你的 functions 区域。

**陷阱：站点级区域是按调用生效的。**要让某个站点级 store 固定在特定区域，必须在该 store 的**每一次** `getStore` 调用（读取、写入、删除）中都传入 `region`。省略它的调用会使用 `us-east-2` 并静默地看不到任何数据。不会有错误或警告。

**陷阱：更改区域不会移动数据。**store 在新区域中显示为空，而其数据仍留在旧区域。要迁移，请把每个条目复制到在新区域打开的 store，然后从旧 store 中删除它。

```ts
const uploads = getDeployStore({ name: "file-uploads", region: "ap-southeast-2" });
const profiles = getStore({ name: "user-profiles", region: "eu-central-1" });
```

## 基于文件的上传（无需 build plugin）

把文件放在基础目录下的 `.netlify/blobs/deploy` 中。Netlify 会把它们上传到**特定于部署的 store**，并保留目录结构。要附加 metadata，添加一个名为 `$<filename>.json` 的同级 JSON 文件。它必须是合法的 JSON，否则部署会失败。

```
.netlify/blobs/deploy/
├─ dogs/good-boy.jpg
├─ dogs/$good-boy.jpg.json   # metadata for good-boy.jpg
├─ cat.jpg
└─ mouse.jpg
```

**注意：**Netlify 在每次构建前清空 `.netlify/blobs/deploy`。提交到代码仓库的文件**不会**被上传。在构建期间用你的构建命令或 build plugin 创建 blob 文件。

## 访问控制（默认私有）

Blobs **没有内置访问控制**：提供服务的 function 就是关卡。Blob 只能通过你自己站点的代码访问，并且在静态存储和传输过程中都加密。拿不准时，默认设为私有，把读取操作置于经过认证的 function 之后，而不是公开暴露 blob。

对于敏感数据，不要提供任意的用户提供的 key。用调用方无法篡改的东西来限定 key。Blobs 不属于 Netlify 符合 HIPAA 的产品范围。

## 约束

- Store 名称：不能含 `/` 或 `:`，最长 64 字节。
- Key：非空，不能以 `/` 开头，最长 600 字节。允许任意 Unicode，但某些字符会占用超过 1 字节。
- 对象大小最大 5 GB；metadata 最大 2 KB。
- 用 **Go 编写的 Functions 无法访问 Netlify Blobs**。
- 需要 Fetch API（Node.js 18+）。否则传入自定义的 `fetch`：`getStore({ fetch, name: "file-uploads" })`。
- 本地开发（Netlify Dev）使用沙盒化的本地 store。它不支持基于文件的上传，也无法读取生产数据。
- 基于文件的上传需要持续部署或 CLI 部署。

## 当操作失败时

暴露该错误并读取 function 日志。不要为此发明 REST endpoint 或旁路 API 来重试。

## CLI 与 UI

`netlify blobs:list/get/set/delete` 可用于检查。见 [CLI 命令参考](https://cli.netlify.com/commands/blobs/)。要在 UI 中浏览和下载 blob，请前往 **Data & Storage > Blobs**。

## 模块版本迁移

用 `@netlify/blobs` 6.5.0 或更早版本写入的站点级 store，在升级后会因命名空间变更而无法访问。用最新的 CLI 迁移它们，然后使用模块 7.0.0+：

```sh
netlify recipes blobs-migrate YOUR_STORE_NAME
```

## 参考

完整 API 和背景：[Netlify Blobs 文档](https://docs.netlify.com/build/data-and-storage/netlify-blobs/) 以及[数据与存储概览](https://docs.netlify.com/build/data-and-storage/overview/)。

<!-- system: agent-context/blobs/system.md — human-owned, merged by ctx-gen; edit system.md, not this section -->
# Netlify 内部规则（blobs）

这些是组织约定，而非文档事实——由 ctx-gen 合并进渲染后的技能，且从不自动生成。由技能维护者负责。

1. Blobs 不是数据库。对于动态、按用户或事务性数据，请使用 Netlify DB——Blobs 用于对象、文件和类缓存状态。
2. 当 store 操作失败时，暴露错误并读取 function 日志——不要发明 REST endpoint 或旁路 API 来重试。
3. `netlify blobs:list/get/set/delete` 可用于检查；CLI 参考是它们的真相来源——给链接，不要重述。
4. Blobs 没有内置访问控制——提供服务的 function 就是关卡。拿不准时，默认设为私有：把读取置于经过认证的 function 之后，而不是公开暴露 blob。
5. 站点作用域的 store 在所有部署上下文之间共享——部署预览上的代码会读取、覆盖并删除生产数据。绝不要从预览运行破坏性测试或写入一次性数据；用 `getDeployStore()` 或特定上下文的 store 名称来实现隔离。
6. 不要在 blob key 上构建计数器、余额或读-改-写逻辑——即使搭配 `onlyIfMatch` 重试也不行。那是事务性数据；请使用 Netlify DB。
7. Build plugins：要把两方面都说明——它们可以从站点的任意 store 读取，但只能写入特定于部署的 store（`getDeployStore`）。
