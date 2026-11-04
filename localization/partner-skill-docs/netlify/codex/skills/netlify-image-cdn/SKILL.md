---
name: netlify-image-cdn
description: 通过 Netlify Image CDN 的 /.netlify/images endpoint 按需转换图片，使用查询参数进行缩放/裁剪/格式/质量处理。当添加图片优化或响应式图片、转换格式（WebP/AVIF/PNG）、生成缩略图或模糊占位符、通过 CDN 提供远程/第三方图片、在 netlify.toml 中将远程域加入允许列表、设置图片重定向或缓存响应头、构建用户上传图片管道，或排查 /.netlify/images 上的 404 时，使用本技能。还涵盖 Angular/Astro/Gatsby/Next.js/Nuxt 的框架图片处理。
---

# Netlify Image CDN

通过带 `url` 查询参数请求该 endpoint 来转换图片。这是当前唯一有文档记载的接口——没有旧版形式。

```
GET /.netlify/images?url=<source>[&w=][&h=][&fit=][&position=][&fm=][&q=]
```

```bash
# resize a deployed image to 50px wide
curl -vs 'https://mysitename.netlify.app/.netlify/images?url=/owl.jpeg&w=50'
```

`url` 是必需的；其他所有参数都是可选的。

## 查询参数

| 参数 | 用途 | 值 | 默认值 |
|-----------|---------|--------|---------|
| `url` | 源资源（必需） | 相对路径或远程 URL | — |
| `w` | 宽度（像素） | 整数 | — |
| `h` | 高度（像素） | 整数 | — |
| `fit` | 缩放行为 | `contain`, `cover`, `fill` | `contain` |
| `position` | 当 `fit=cover` 时的裁剪锚点 | `top`, `bottom`, `left`, `right`, `center` | `center` |
| `fm` | 输出格式 | `avif`, `jpg`, `png`, `webp`, `gif`, `blurhash` | 内容协商 |
| `q` | 有损输出的质量 | 整数 `1`–`100` | `75` |

## 常见转换

```bash
# resize + crop to a 50px square, retaining the left side
curl -vs 'https://mysitename.netlify.app/.netlify/images?url=/owl.jpeg&fit=cover&w=50&h=50&position=left'

# convert JPEG to PNG (response carries content-type: image/png)
curl -vs 'https://mysitename.netlify.app/.netlify/images?url=/owl.jpeg&fm=png'

# convert JPEG to AVIF at medium quality
curl -vs 'https://mysitename.netlify.app/.netlify/images?url=/owl.jpeg&fm=avif&q=50'
```

### fit 行为

- **`contain`（默认）：**保持宽高比；某一维度返回的可能比请求的小。提供一个维度，另一个会被计算出来。
- **`cover`：**精确填满，裁剪多余部分。**需要同时提供 `w` 和 `h`**——省略任一个都无效。用 `position` 选择保留哪部分。
- **`fill`：**精确填满，若宽高比不同则拉伸/挤压。

### 格式说明

- `q` 仅在输出为 `avif`、`jpg`、`gif` 或 `webp` 时适用。
- `webp` 和 `gif` 可以是静态或动图。
- 如果省略 `fm`，格式会根据 `Accept` 请求头进行内容协商：若接受 `webp` 则用 `webp`，否则若接受 `avif` 则用 `avif`，否则用原格式。仅源请求（无其他参数）仍会转换为 `webp`/`avif`，但保持尺寸和形状。

## 远程源图片

远程源必须在转换前于 `netlify.toml` 中加入允许列表，否则请求会失败。

```toml
[images]
  remote_images = ['https://my-images\.com/.*', 'https://animals.more-images.com/[bcr]at/.*']
```

在把远程源 URL 放入 `url` 参数之前，用 `encodeURIComponent` 对其进行百分号编码——否则包含 `?` 或 `&` 的 URL 会出问题。

```js
const src = `/.netlify/images?url=${encodeURIComponent('https://my-images.com/owl.jpeg?v=2')}&w=400`;
```

约束：
- 远程源必须**可公开访问**。
- 抓取远程源时，携带凭据的请求头（`Authorization`、`Cookie`）**不会**被转发。对于需要认证的源，使用自带授权的 URL（例如 S3 预签名 URL），并确保你的 `remote_images` 模式匹配那些完整 URL。

### remote_images 正则转义

唯一有意义的转义是字面点号（`\.`）。正斜杠**不是**元字符——绝不写 `https:\/\/`。在 `netlify.toml` 中，使用单引号字面字符串（`'https://example\.com/.*'`），或在双引号字符串中把反斜杠加倍（`"https://example\\.com/.*"`）。双引号内的裸 `\.` 是无效 TOML。

## 响应码

- 无效的转换参数值 → `404`。
- 有效的新转换 → `200`，带内容和匹配的 `content-type`。
- 之前已转换（缓存）的图片 → `304`。

## 跨图片复用参数

用重定向/重写把一条友好的路径映射到该 endpoint。

`_redirects`：
```
/transform-small/* /.netlify/images?url=/:splat&w=50&h=50 200
```

`netlify.toml`：
```toml
[[redirects]]
  from = "/transform-small/*"
  to = "/.netlify/images?url=/:splat&w=50&h=50"
  status = 200
```

然后 `GET /transform-small/owl.jpeg` 返回转换后的图片。**不推荐对转换使用跨站重定向**——它们会降低站点性能。

## 缓存响应头

对站点自有域上的源图片应用自定义响应头；它们会传递到转换后的输出。

`netlify.toml`：
```toml
[[headers]]
  for = "/source-images/*"
  [headers.values]
    Cache-Control = "public, max-age=604800, must-revalidate"
```

- 自定义响应头只能应用于站点域上的源图片——**不能**应用于远程源图片（Netlify 确实会尊重外部域发送的缓存响应头）。
- 源图片上的 `Cache-Control` 只作用于浏览器和 Netlify 前面的 CDN，**不**作用于 Netlify Cache 本身。

## 模糊占位符（fm=blurhash）

`fm=blurhash` 返回的是一个 BlurHash **文本字符串**，不是图片字节。把 `<img src>`（或 CSS 背景）指向它会什么也渲染不出来。提前获取该字符串，用 BlurHash 库（https://blurha.sh）在客户端解码，然后在不带 `fm=blurhash` 的单独请求中加载真实图片。

## 本地开发

`/.netlify/images` endpoint、`[images]` 允许列表和图片重定向只在 `netlify dev`（Netlify CLI）下存在。本地 **`/.netlify/images` 上的 404 几乎总是意味着运行的是框架开发服务器（`vite`、`next dev`、`astro dev`）而不是 `netlify dev`**——URL 本身通常是好的。用 `netlify dev` 启动本地环境。

## 用户上传图片管道

对于组合 Functions + Blobs + Image CDN 的管道（处理用户上传的图片），见 `references/user-uploads.md`。

## 框架图片处理

许多框架会将其内置的图片优化路由到 Netlify Image CDN——使用该框架标准的图片组件/语法，只在需要时配置远程允许列表。对于未列出的框架，直接调用 `/.netlify/images`。

| 框架 | 前提条件 | 远程允许列表位置 |
|-----------|---------------|---------------------------|
| Angular | 无；`NgOptimizedImage` 会自动使用它 | `netlify.toml` 中的 `[images] remote_images` |
| Astro | 无；`<Image />` 会自动使用它 | `astro.config.mjs` 中的 `image.domains` 或 `image.remotePatterns` |
| Gatsby（5.13+ 和 5.11 及更早均适用） | 设置环境变量 `NETLIFY_IMAGE_CDN=true`；使用 Contentful/Drupal/WordPress 源插件 | `netlify.toml` 中的 `[images] remote_images` |
| Next.js | Next.js 13.5+ 和 Next.js 适配器 v5 | `next.config.js` 中的 `remotePatterns` |
| Nuxt | 无；`nuxt/image` 模块会自动使用它 | `nuxt.config.ts` 中的 `image.domains` |

设置指南：[Angular](https://docs.netlify.com/build/frameworks/framework-setup-guides/angular#netlify-image-cdn)、[Astro](https://docs.netlify.com/build/frameworks/framework-setup-guides/astro#netlify-image-cdn)、[Gatsby](https://docs.netlify.com/build/frameworks/framework-setup-guides/gatsby/#netlify-image-cdn)、[Next.js](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview)、[Nuxt](https://docs.netlify.com/build/frameworks/framework-setup-guides/nuxt#netlify-image-cdn)。

## 附加约束

- 部署行为：转换会遵循[原子部署](https://docs.netlify.com/build/caching/caching-overview#automatic-invalidation-with-atomic-deploys)；在新部署中更改源图片会在后续请求时重新运行转换。
- **不**支持 [Split Testing](https://docs.netlify.com/manage/monitoring/split-testing/)——图片结果在拆分测试分支之间可能不一致。
- Netlify Image CDN 不属于 Netlify 符合 HIPAA 的托管服务范围。

交互式参数演练场：https://image-cdn-playground.netlify.app/

<!-- system: agent-context/image-cdn/system.md — human-owned, merged by ctx-gen; edit system.md, not this section -->
# Netlify 内部规则（image-cdn）

这些是组织约定，而非文档事实——由 ctx-gen 合并进渲染后的技能，且从不自动生成。由技能维护者负责。

1. 对于用户上传图片管道（由 Functions + Blobs + Image CDN 组合而成），见本技能中的 `references/user-uploads.md`——一份没有单一文档来源的自撰指南。
2. 在把远程源 URL 放入 `url` 参数之前对其进行百分号编码（`encodeURIComponent`）——否则包含 `?` 或 `&` 的 URL 会出问题。
3. `fm=blurhash` 返回的是一个 BlurHash 文本字符串，不是图片字节。把 `<img src>`（或 CSS 背景）指向它会什么也渲染不出来——提前获取该字符串，用 BlurHash 库在客户端解码，然后在不带 `fm=blurhash` 的单独请求中加载真实图片。
4. 本地 `/.netlify/images` 上的 404 几乎总是意味着运行的是框架开发服务器（`vite`、`next dev`、`astro dev`）而不是 `netlify dev`——endpoint、`[images]` 允许列表和图片重定向只在 `netlify dev` 下存在。URL 本身通常是好的。
5. 在 `remote_images` 模式中，有意义的正则转义是点号；正斜杠不是元字符——不要写 `https:\/\/`。在 `netlify.toml` 中，使用单引号字面字符串（`'https://example\.com/.*'`），或在双引号字符串中把反斜杠加倍（`"https://example\\.com/.*"`）——双引号内的裸 `\.` 是无效 TOML。
