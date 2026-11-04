---
name: runtime-cache
description: Vercel Runtime Cache API 指南——具备基于标签失效的、按区域临时的键值缓存。在 Functions、Routing Middleware 和 Builds 之间共享。在实现框架级缓存之外的缓存策略时使用。
metadata:
  priority: 6
  docs:
    - "https://nextjs.org/docs/app/api-reference/directives/use-cache-remote"
  sitemap: "https://nextjs.org/sitemap.xml"
  pathPatterns: 
    - 'lib/cache/**'
    - 'src/lib/cache/**'
    - 'lib/cache.*'
    - 'src/lib/cache.*'
  bashPatterns:
    - '\bnpm\s+(install|i|add)\s+[^\n]*@vercel/functions\b'
    - '\bpnpm\s+(install|i|add)\s+[^\n]*@vercel/functions\b'
    - '\bbun\s+(install|i|add)\s+[^\n]*@vercel/functions\b'
    - '\byarn\s+add\s+[^\n]*@vercel/functions\b'
validate:
  -
    pattern: 'from\s+[''""](redis|ioredis)[''""]|require\s*\(\s*[''""](redis|ioredis)[''""]|new\s+Redis\('
    message: 'Direct Redis/ioredis client detected. Use Upstash Redis (@upstash/redis) for serverless-native Redis with HTTP-based connections.'
    severity: recommended
    upgradeToSkill: vercel-storage
    upgradeWhy: 'Replace direct Redis/ioredis with @upstash/redis for serverless-compatible HTTP-based Redis that works without persistent TCP connections.'
    skipIfFileContains: 'from\s+[''""]\@upstash/redis[''""]'
retrieval:
  aliases:
    - cache api
    - kv cache
    - region cache
    - tag invalidation
  intents:
    - add caching
    - cache api response
    - invalidate cache
    - set up runtime cache
  entities:
    - Runtime Cache
    - tag-based invalidation
    - key-value
    - cache
chainTo:
  -
    pattern: 'from\s+[''""]@vercel/kv[''""]'
    targetSkill: vercel-storage
    message: '@vercel/kv is sunset — loading Vercel Storage guidance for Upstash Redis migration.'
  -
    pattern: 'from\s+[''""]ioredis[''""]|new\s+Redis\('
    targetSkill: vercel-storage
    message: 'Direct Redis client detected — loading Vercel Storage guidance for Upstash Redis (serverless-native) integration.'

---

# Vercel Runtime Cache API

你是 Vercel Runtime Cache 专家——一个用于无服务器计算的临时缓存层。

## 它是什么

Runtime Cache 是一个可从 Vercel Functions、Routing Middleware 和 Builds 访问的**按区域键值存储**。它支持**基于标签的失效**，以实现细粒度的缓存控制。

- **按区域**：每个 Vercel 区域都有自己隔离的缓存
- **隔离**：按部署环境（`preview` 与 `production`）划分范围；在 Pro/Enterprise 上按项目划分，但在 Hobby 团队中跨所有项目共享
- **跨部署持久**：缓存数据在新增部署后仍然存在；通过 TTL 或 `expireTag` 失效
- **临时**：每个项目固定的存储上限；满了之后按 LRU 淘汰
- **与框架无关**：通过 `@vercel/functions` 适用于任何框架

## 关键 API

所有 API 均来自 `@vercel/functions`：

### 基本缓存操作

```ts
import { getCache } from '@vercel/functions';

const cache = getCache();

// Store data with TTL and tags
await cache.set('user:123', userData, {
  ttl: 3600,                      // seconds
  tags: ['users', 'user:123'],    // for bulk invalidation
  name: 'user-profile',           // human-readable label for observability
});

// Retrieve cached data (returns value or null)
const data = await cache.get('user:123');

// Delete a specific key
await cache.delete('user:123');

// Expire all entries with a tag (propagates globally within 300ms)
await cache.expireTag('users');
await cache.expireTag(['users', 'user:123']); // multiple tags
```

### 缓存选项

```ts
const cache = getCache({
  namespace: 'api',                    // prefix for keys
  namespaceSeparator: '$',             // separator (default)
  keyHashFunction: (key) => sha256(key), // custom key hashing
});
```

### 完整示例（与框架无关）

```ts
import { getCache } from '@vercel/functions';

export default {
  async fetch(request: Request) {
    const cache = getCache();
    const cached = await cache.get('blog-posts');

    if (cached) {
      return Response.json(cached);
    }

    const posts = await fetch('https://api.example.com/posts').then(r => r.json());

    await cache.set('blog-posts', posts, {
      ttl: 3600,
      tags: ['blog'],
    });

    return Response.json(posts);
  },
};
```

### 从 Server Action 使标签过期

```ts
'use server';
import { getCache } from '@vercel/functions';

export async function invalidateBlog() {
  await getCache().expireTag('blog');
}
```

## CDN 缓存清除函数

这些函数会清除**所有三个缓存层**（CDN + Runtime Cache + Data Cache）：

```ts
import { invalidateByTag, dangerouslyDeleteByTag } from '@vercel/functions';

// Stale-while-revalidate: serves stale, revalidates in background
await invalidateByTag('blog-posts');

// Hard delete: next request blocks while fetching from origin (cache stampede risk)
await dangerouslyDeleteByTag('blog-posts', {
  revalidationDeadlineSeconds: 3600,
});
```

**重要区别**：
- `cache.expireTag()` — 仅作用于 Runtime Cache
- `invalidateByTag()` / `dangerouslyDeleteByTag()` — 清除 CDN + Runtime + Data 缓存

## Next.js 集成

### Next.js 16+（`use cache: remote`）

```ts
// next.config.ts
const nextConfig: NextConfig = { cacheComponents: true };
```

```ts
import { cacheLife, cacheTag } from 'next/cache';

async function getData() {
  'use cache: remote'     // stores in Vercel Runtime Cache
  cacheTag('example-tag')
  cacheLife({ expire: 3600 })
  return fetch('https://api.example.com/data').then(r => r.json());
}
```

- `'use cache'`（不带 `: remote`）— 仅内存，按实例临时
- `'use cache: remote'` — 存储在 Vercel Runtime Cache 中

### Next.js 16 失效 API

| 函数 | 上下文 | 行为 |
|----------|---------|----------|
| `updateTag(tag)` | 仅 Server Actions | 立即过期，读己所写（read-your-own-writes） |
| `revalidateTag(tag, 'max')` | Server Actions + Route Handlers | 陈旧内容后台重验证（推荐） |
| `revalidateTag(tag, { expire: 0 })` | Route Handlers（webhooks） | 来自外部触发器的立即过期 |

**重要**：在 Next.js 16 中，单参数的 `revalidateTag(tag)` 已弃用。始终将 `cacheLife` 配置作为第二个参数传入。

### Runtime Cache 与 ISR 隔离

- Runtime Cache 标签**不**适用于 ISR 页面
- `cache.expireTag` **不**会使 ISR 缓存失效
- Next.js 的 `revalidatePath` / `revalidateTag` **不**会使 Runtime Cache 失效
- 要同时管理两者，使用相同的标签并通过 `invalidateByTag` 清除（命中所有缓存层）

## CLI 缓存命令

```bash
# Purge all cached data
vercel cache purge                    # CDN + Data cache
vercel cache purge --type cdn         # CDN only
vercel cache purge --type data        # Data cache only
vercel cache purge --yes              # skip confirmation

# Invalidate by tag (stale-while-revalidate)
vercel cache invalidate --tag blog-posts,user-profiles

# Hard delete by tag (blocks until revalidated)
vercel cache dangerously-delete --tag blog-posts
vercel cache dangerously-delete --tag blog-posts --revalidation-deadline-seconds 3600

# Image invalidation
vercel cache invalidate --srcimg /images/hero.jpg
```

注意：`--tag` 和 `--srcimg` 不能一起使用。

## CDN 缓存标签

为 CDN 缓存响应添加标签，以便稍后失效：

```ts
import { addCacheTag } from '@vercel/functions';

// Via helper
addCacheTag('product-123');

// Via response header
return Response.json(product, {
  headers: {
    'Vercel-CDN-Cache-Control': 'public, max-age=86400',
    'Vercel-Cache-Tag': 'product-123,products',
  },
});
```

## 限制

| 属性 | 限制 |
|----------|-------|
| 项目大小 | 2 MB |
| 每个 Runtime Cache 项的标签数 | 128 |
| 每个 CDN 项的标签数 | 128 |
| 最大标签长度 | 256 字节 |
| 每次批量 REST API 调用的标签数 | 16 |

标签**区分大小写**且**不能包含逗号**。

## 可观测性

在 Vercel Dashboard 的 **Observability → Runtime Cache** 下监控命中率、失效模式和存储用量。CDN 仪表板（2026 年 3 月 5 日）提供全球流量分布、缓存性能指标、重新设计的清除界面以及**项目级路由**的统一视图——无需触发新部署即可更新响应头或重写到外部 API。项目级路由适用于所有计划并即时生效。

## 何时使用

- 在一个区域内跨函数缓存 API 响应或计算数据
- 当内容变化时进行基于标签的失效（CMS webhook → 使标签过期）
- 减少对频繁访问数据的数据库负载
- 在一个区域内跨函数共享数据

## 何时不应使用

- 框架级页面缓存 → 使用 Next.js Cache Components（`'use cache'`）
- 持久化存储 → 使用数据库（Neon、Upstash）
- CDN 级完整响应缓存 → 使用 `Cache-Control` / `Vercel-CDN-Cache-Control` 响应头
- 跨区域共享状态 → 使用数据库
- 每次请求都不同的用户专属数据

## 参考资料

- 📖 文档：https://vercel.com/docs/caching/runtime-cache
- 📖 更新日志：https://vercel.com/changelog/introducing-the-runtime-cache-api
- 📖 CLI 缓存：https://vercel.com/docs/cli/cache
- 📖 CDN 缓存清除：https://vercel.com/docs/caching/cdn-cache/purge
