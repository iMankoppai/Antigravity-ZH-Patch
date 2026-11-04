---
name: netlify-caching
description: 从 Functions、Edge Functions 和代理在 Netlify 的 CDN 上缓存动态和静态响应。当你为 function 响应添加缓存或 cache-control 请求头、调整缓存 TTL 或 stale-while-revalidate、设置持久缓存、按 query/header/cookie/country/language 变化缓存键、按站点或缓存标签清除或失效缓存、使用编程式 Cache API（caches.open/match/put）或 @netlify/cache 辅助函数（fetchWithCache/cacheHeaders/getCacheStatus）、加速昂贵的 API 调用、添加 ISR 或按需重新验证，或通过 Cache-Status 响应头排查某个响应为何被缓存或未被缓存时，使用本技能。
---

# Netlify caching

## 该用哪个 cache-control 请求头

动态响应（Functions、Edge Functions、代理）**默认不缓存**。你必须主动选择。在响应上设置 `Netlify-CDN-Cache-Control`：

```ts
import type { Context } from "@netlify/functions";

export default async (req: Request, context: Context) => {
  return new Response("Hello world", {
    headers: {
      'Netlify-CDN-Cache-Control': 'public, durable, max-age=60, stale-while-revalidate=120'
    }
  });
};
```

请求头选择（越具体优先级越高；`CDN-Cache-Control`/`Cache-Control` 总是向下游透传）：
- `Netlify-CDN-Cache-Control` 仅作用于 Netlify CDN。**优先用它。**
- `CDN-Cache-Control` 作用于所有支持它的 CDN。
- `Cache-Control` 作用于任何 CDN 或浏览器。

**要避免的旧版路径：**On-demand Builders **不**支持这些请求头或 `Netlify-Vary`。它们使用 TTL 模式，并且只以 URL path 作为键。不要在新代码中使用 ODB。

## 陷阱（先读）

- **静态资源最长新鲜一年。**更短的 `max-age` 会被忽略。它们只在新的部署或手动清除时改变。
- **任意页面上的 basic-auth 会禁用整个站点的缓存。**
- **`durable` 仅限 serverless。**它对 Edge Function 响应没有作用。
- **Cache API 会静默丢弃超过 10 MB 的响应。**`cache.put()` 不会存储它们，之后的查询会落空。请压缩内容或将其拆分到多个条目。
- 绝不要让敏感内容退出自动失效。它在部署/防火墙变更后可能仍被公开缓存。

## 指令

- `public` 缓存响应。`private` 只在浏览器中缓存，而不是在 Netlify 的共享缓存中。`no-store` 阻止缓存。
- `s-maxage=N` 设置 Netlify 共享缓存中的秒数（在此处覆盖 `max-age`）。
- `max-age=N` 设置任何缓存中的秒数。
- `stale-while-revalidate=N` 在过期后 N 秒内提供陈旧内容，同时在后台重新验证。
- `durable`（仅 serverless）把响应存入 Netlify 的持久缓存，以便其他边缘节点复用它，而无需重新调用 function。

未设置请求头时的默认值：
- 静态：`Netlify-CDN-Cache-Control: public, s-maxage=31536000, must-revalidate`
- 动态：`Cache-Control: public, max-age=0, must-revalidate`

## 缓存键变化——`Netlify-Vary`

响应上以逗号分隔的指令；以竖线分隔的值列表：

```
Netlify-Vary: query=item_id|page, country=es+de|us, cookie=ab_test|is_logged_in
```

- `query=a|b` 仅按子集变化；裸 `query` 按所有参数变化。键区分大小写；参数顺序无关紧要。
- `header=Device-Type|App-Version` 支持自定义和大多数标准请求头。
- `language=en|es+pt` 用 `+` 表示分组。它会依据 `Accept-Language` 并按质量权重进行匹配。
- `country=us|es+pt` 使用 GeoIP 和 ISO 3166-1 两位字母代码；`+` 表示分组。
- `cookie=ab_test|is_logged_in` 针对特定的键，而不是整个 `Cookie` 请求头。

**不能按以下请求头变化：**`Accept*`、`Cache-Control`、`Connection`、`Content-Length`、`Cookie`、`Host`、`If-*`、`Range`、`Referer`、`Upgrade`、`User-Agent`。对于语言/cookie/格式，请使用 `Vary: Accept-Language`/`Vary: Cookie` 或特定的 `Netlify-Vary` 指令。

**一致性规则：**一个 URL 在每次响应中都必须返回相同的 `Netlify-Vary`。第一个被缓存响应的指令胜出，后续的会被忽略。

`Netlify-Vary` 和标准 `Vary` 都会被尊重。用 `Vary` 处理格式/编码，以及向 Cloudflare 之类的上游 CDN 传递指令。

## 缓存标签与退出

为响应打标签以便按标签清除：

```
Netlify-Cache-Tag: tag1,tag2,tag3
```

- `Netlify-Cache-Tag`（Netlify CDN）优先于 `Cache-Tag`（向下游透传）。某些提供商会剥离 `Cache-Tag`，因此经它们代理时两者都设置。
- 约束：不区分大小写、仅 UTF-8、每个标签 ≤1024 字符、每个响应 ≤500 个标签。

用 `Netlify-Cache-ID` 让响应退出自动的原子部署失效。值以逗号分隔，会自动注册为用于清除的缓存标签，并有单独的 500 个 ID 上限：

```
Netlify-Cache-ID: cms-proxy,product,image
```

退出后，在相关变更之后按需清除，例如 `Netlify-Cache-ID` 背后的重定向/代理或 function 变更。

## 按需失效（清除）

在**已部署的 function** 中用 `purgeCache` 清除。site ID 会自动传入：

```ts
import { purgeCache } from "@netlify/functions";

export default async () => {
  await purgeCache(); // no args = purge everything for the site
  return new Response("Purged!", { status: 202 });
};
```

按标签清除，可选地针对某个部署/子域：

```ts
import { purgeCache } from "@netlify/functions";

export default async (req: Request) => {
  const cacheTag = new URL(req.url).searchParams.get("tag");
  if (!cacheTag) return;
  await purgeCache({
    tags: [cacheTag],
    deployAlias: "deploy-preview-11",
    domain: "early-access.company.com",
  });
  return new Response("Purged!", { status: 202 });
};
```

**兼容 Lambda 的 functions** 使用旧式的 `module.exports.handler = async (event, context) => {…}` 签名。它们必须传入 `context.clientContext.custom.purge_api_token`：

```ts
import { purgeCache } from "@netlify/functions";

module.exports.handler = async (event, context) => {
  const token = context.clientContext.custom.purge_api_token;
  await purgeCache({ tags: ["tag1", "tag2"], token });
  return { body: "Purged!", statusCode: 202 };
};
```

直接调用 API（从 function 外部）：`POST https://api.netlify.com/api/v1/purge`，带上 `Authorization: Bearer <personal_access_token>` 和 `Content-Type: application/json`：

```sh
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <personal_access_token>" \
  --data '{"site_slug": "mysitename", "cache_tags": ["news"], "deploy_alias": "deploy-preview-11", "domain": "early-access.company.com"}' \
  'https://api.netlify.com/api/v1/purge'
```

- 按站点清除：传入 `site_id` 或 `site_slug`。
- 按标签清除：传入 `cache_tags` 以及站点。
- 省略 `cache_tags` 会清除整个站点。**空的** `cache_tags` 列表什么都不会清除。
- 标识符映射：在 UI 中（Project configuration > General > Project details > Project information），**Project ID** = `site_id`，**Project name** = `site_slug`。见 https://docs.netlify.com/api-and-cli-guides/api-guides/get-started-with-api#get-site。
- **速率限制：**每个标签或站点每 5 秒只能清除两次。超出会返回 `429`。

## Cache API（`caches` 全局对象）

在 Functions/Edge Functions 中编程式读写 HTTP 响应。用它缓存路由的各个组成部分或任意 fetch，与基于请求头的路由缓存并存。

**作用域规则：**可在任何地方调用 `caches.open()`，但只能在请求处理函数内部调用 `match`/`put`/`delete`。在模块/全局作用域中执行它们会抛出异常。

```ts
import type { Config, Context } from "@netlify/functions";

const cache = await caches.open("my-cache"); // ok in global scope

export default async (req: Request, context: Context) => {
  const request = new Request("https://example.com/expensive-api");
  const cached = await cache.match(request);
  if (cached) return cached;

  const fresh = await fetch(request);
  if (fresh.ok) {
    cache.put(request, fresh.clone()).catch((error) => {
      console.error("Failed to add to the cache:", error);
    });
  }
  return fresh;
};

export const config: Config = { path: "/cache-api-example" };
```

`CacheStorage` 子集：
- `caches.match(request)` 从任意缓存返回一个 `Response`，或 `undefined`。
- `caches.open(name)` 返回一个 `Cache`。不同的名称会碎片化缓存并降低命中率，因此请使用少量有意义的名称。

`Cache` 方法（都需要 `caches.open()`）：
- `cache.match(request)` 返回一个 `Response` 或 `undefined`。
- `cache.put(request, response)` 添加一个响应。
- `cache.add(request)` / `cache.addAll(requests)` 获取并存储。
- `cache.delete(request)` 返回 `true`。
- `keys()` **未实现**，因此无法列出内容。

一致性：读取/写入是强一致的。**删除是最终一致的**，因此已删除的条目可能短暂仍会返回。

**不能缓存：**
- 部分响应（206）、`Vary: *` 或非 `GET` 方法。
- 超过 **10 MB** 的响应。这些会被静默地不存储。

响应还需要满足以下所有条件，否则会存储报错：
- 带有 `max-age`/`s-maxage` ≥ 1s 的 cache-control 请求头
- `public`（不是 `private`/`no-cache`/`no-store`）
- 2xx 状态码

对于你无法控制的响应，用 `fetchWithCache` 重写请求头。

**每次调用的限制：**100 次查询、20 次插入/删除。超出后，后续查询返回空，写入/删除变为空操作。限制在一次请求中的各 edge functions 之间共享，但在 serverless 和 edge functions 之间是分开的。

缓存数据是按区域的（不复制）。它会在重新部署以及 `max-age`/`s-maxage` 到期时自动失效。

## `@netlify/cache` 模块

安装以获得辅助函数、时间常量（`MINUTE`/`HOUR`/`DAY`），以及供本地开发使用的 `caches` 导出：

```
npm install @netlify/cache
```

**本地开发变通方案：**`caches` 全局对象不是 Node.js 的一部分。Netlify 在其 Functions/Edge 运行时中提供它，无论线上还是 `netlify dev` 下都有。如果你运行框架自带的开发服务器，该全局对象未定义并会抛出异常。改为导入它：

```ts
import { caches } from "@netlify/cache";
const cache = await caches.open("my-cache");
```

这需要 Netlify CLI 20.0.3+。本地不持久化任何内容：查询返回空，写入/删除不会改变数据。与使用全局对象相比没有功能差异。

### `cacheHeaders(settings)` → 请求头对象

```ts
import { cacheHeaders, DAY } from "@netlify/cache";

const headers = {
  "x-custom-header": "some value",
  ...cacheHeaders({
    ttl: 2 * DAY,          // s-maxage
    swr: HOUR,             // stale-while-revalidate
    durable: true,
    tags: ["product", "sale"],
    overrideDeployRevalidation: ["tag"], // opt out of atomic-deploy invalidation
    vary: {
      cookie: ["ab_test_name", "ab_test_bucket"],
      query: ["item_id", "page"], // or true for all
      country: ["us", ["es", "pt"]], // nested = OR
      language: ["en"],
      header: ["Device-Type"],
    },
  }),
};
```

如果只需要通用（非 Netlify）请求头，请改用 `cdn-cache-control` npm 模块。

### `fetchWithCache(resource, options?, cacheSettings?)`

可直接替换 `fetch`，返回缓存响应，或获取、存储并返回。`cacheSettings` 会覆盖冲突的响应头。使用 `swr` 时，后台重新验证会自动处理。

```ts
import { fetchWithCache, DAY } from "@netlify/cache";

const response = await fetchWithCache("https://example.com/expensive-api", {
  ttl: 2 * DAY,
  tags: ["product", "sale"],
  vary: { cookie: ["ab_test_name"], query: ["item_id", "page"] },
});
```

### `getCacheStatus(response | headers | headerString)`

返回 `{ hit, caches: { durable: { hit, stale, stored, ttl }, edge: { hit, stale } } }`。

```ts
const { hit, edge, durable } = getCacheStatus(response);
```

### `needsRevalidation(response)` → boolean

仅在直接调用 `cache.match`/`cache.put` 时需要（不配合 `fetchWithCache` + `swr` 时）。当 Cache-API 响应在其 SWR 窗口内已陈旧时返回 true。返回陈旧响应，然后在 `context.waitUntil` 中重新验证，并 `cache.put` 新鲜副本：

```ts
if (cached) {
  if (needsRevalidation(cached)) {
    context.waitUntil(
      fetch(request).then((fresh) => {
        const response = new Response(fresh.body, {
          headers: { ...Object.fromEntries(fresh.headers), ...cacheHeaders({ ttl: MINUTE, swr: HOUR }) },
        });
        return cache.put(request, response);
      })
    );
  }
  return cached;
}
```

## 持久缓存

加上 `durable`（仅 serverless），让缺少本地副本的边缘节点在调用 function 之前先检查共享的持久缓存。这意味着更少的调用次数和更好的缓存未命中延迟。

- 它是最终一致的，因此多个区域每个版本仍可能调用 function 几次。
- 它与站点的 functions 区域同址部署。
- 它与 `Netlify-Vary`、SWR 和按需失效兼容。
- **Next.js：**Next Runtime 5.5.0+ 会自动使用持久缓存。

## 用 `Cache-Status` 调试

Netlify 会在所有响应上设置 `Cache-Status`（RFC 9211）。请在**已部署**的 URL 上检查它。查找以 `"Netlify Edge"` 或 `"Netlify Durable"` 开头的值：

- `"Netlify Edge"; fwd=miss` 表示没有缓存任何内容。
- `"Netlify Edge"; hit` 表示响应来自缓存。
- `"Netlify Edge"; hit; fwd=stale` 表示在重新验证（SWR）期间提供了陈旧响应。
- `"Netlify Durable"; fwd=uri-miss; stored=true; ttl=3600` 表示持久缓存未命中，随后被存储。
- `"Netlify Durable"; hit; ttl=1234` 表示持久缓存命中。

负的 `ttl` 是自过期以来的秒数。每个请求可能命中不同的缓存实例。在没有生产流量或 `durable` 的情况下，预期在命中之前会有几个空缓存；重复请求以预热其中一个。

<!-- Gaps: @netlify/cache local-dev docs show cache.set; resolved to the documented cache.put. 10 MB limit doesn't say compressed vs uncompressed size, or whether it covers add/addAll/fetchWithCache. -->

<!-- system: agent-context/caching/system.md — human-owned, merged by ctx-gen; edit system.md, not this section -->
# Netlify 内部规则（caching）

这些是组织约定，而非文档事实——由 ctx-gen 合并进渲染后的技能，且从不自动生成。由技能维护者负责。

1. CDN 只缓存 `GET` 响应。`POST`/`PUT` 等无论如何设置请求头都不会被缓存——请在 `GET` 路由上暴露可缓存的数据（把输入放在 URL 或查询字符串中）。
2. 没有 `Netlify-Vary: query=...` 时，完整的查询字符串就是缓存键——每个不同的查询字符串（`utm_*`、`fbclid` 等）都是一个独立的缓存条目。只枚举真正会改变响应的参数。
3. `netlify dev` 不模拟 CDN 缓存——本地每次缓存未命中是预期行为，不是 bug。请通过 `Cache-Status` 响应头在已部署的 URL（Deploy Preview 或生产）上验证缓存行为。
4. `purgeCache()` 仅在已部署的 function 内部才有环境凭据。从 CI、本地脚本或构建中调用时，请传入 `token`（从环境变量读取的个人访问令牌，绝不硬编码）和 `siteID`。
