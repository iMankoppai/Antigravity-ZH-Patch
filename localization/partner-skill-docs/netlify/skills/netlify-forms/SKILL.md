---
name: netlify-forms
description: Netlify 托管站点上的无服务器表单处理——在部署时检测 HTML 表单、存储提交、过滤垃圾信息并发送通知。当为 Netlify 站点添加联系表单、潜客获取表单、文件上传表单或订阅通讯；接入 AJAX 表单提交；设置自定义感谢页；为表单添加蜜罐或 reCAPTCHA；让表单在 Next.js、Nuxt、SvelteKit、Astro 或 Gatsby 中工作；通过 Netlify API 读取表单提交；设置提交通知或基于表单提交事件的 ChatGPT 自动化；或排查丢失的提交和静默注册失败的表单时，使用本技能。
---

# Netlify Forms

在 `<form>` 标签上使用 `data-netlify="true"`（或裸 `netlify` 属性——等价）来标记表单以供检测。表单是通过**在部署时解析最终构建出的 HTML** 来检测的——没有运行时 API 调用，也没有后端代码。客户端/JS 渲染/SSR 表单不在构建出的 HTML 中，永远不会被单独检测到；它们需要一个静态骨架文件（见下文）。

前提：必须在 Netlify UI 中启用一次表单检测（Forms > **Enable form detection**）。在下次部署时生效。

## 静态 HTML 表单

```html
<form name="contact" method="POST" data-netlify="true">
  <p><label>Your Name: <input type="text" name="name" /></label></p>
  <p><label>Your Email: <input type="email" name="email" /></label></p>
  <p><label>Message: <textarea name="message"></textarea></label></p>
  <p><button type="submit">Send</button></p>
</form>
```

- `name` 在 UI 中设置表单名称，且**必须在每个站点内唯一**。
- 部署时，Netlify 会剥离 `data-netlify`/`netlify` 属性，并注入 `<input type="hidden" name="form-name" value="contact" />`。
- 添加一个 `<input name="email">`，使通知邮件的 `Reply-to` 设为提交者。

## JS 渲染 / SSR / 框架表单（Next.js、Nuxt、SvelteKit、Astro、Gatsby）

需要两个部分：

**1. 静态骨架文件 `public/__forms.html`**——每个表单的隐藏副本，带有 `data-netlify="true"`、一个隐藏的 `form-name` 输入，以及组件提交的每个字段，名称必须**完全**匹配（Netlify 会对照已注册的表单验证字段名）。没有这个文件，提交会静默失败。

```html
<!-- public/__forms.html -->
<form name="pizzaOrder" data-netlify="true" hidden>
  <input type="hidden" name="form-name" value="pizzaOrder" />
  <input name="order" type="text" />
</form>
```

**2. 渲染出的表单**携带匹配的隐藏 `form-name` 输入：

```jsx
<form name="pizzaOrder" method="post" data-netlify="true" onSubmit={handleSubmit}>
  <input type="hidden" name="form-name" value="pizzaOrder" />
  <input name="order" type="text" onChange={handleChange} />
  <input type="submit" />
</form>
```

**⚠️ SSR POST 目标：**在 SSR 应用中，`fetch("/")` 会被 SSR 的 catch-all function 拦截，永远到不了表单处理。要把 POST 发到静态骨架文件本身——`/__forms.html`——而不是 `/` 或任意路径。

**⚠️ Astro 按需路由：**带有 `export const prerender = false` 或 `output: "server"` 的路由在构建时从不会被扫描，因此其表单永远不会被注册。把表单放在预渲染页面上，或依赖静态骨架文件。

**Next.js Runtime v5（Next.js 13.5+）：**把表单定义提取到静态骨架文件，并通过 AJAX 提交，而不是整页导航。见 https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview#v5-breaking-changes

## AJAX 提交

```js
const handleSubmit = event => {
  event.preventDefault();
  const formData = new FormData(event.target);
  fetch("/__forms.html", {   // static sites may POST to "/"; SSR must target the skeleton file
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(formData).toString()
  })
    .then(() => alert("Thank you for your submission"))  // or navigate("/thank-you")
    .catch(error => alert(error));
};
document.querySelector("form").addEventListener("submit", handleSubmit);
```

- **Body 必须经过 URL 编码。不支持 JSON。**
- 如果渲染出的表单没有隐藏的 `form-name` 输入，你必须在 POST body 中包含一个 `form-name` 字段。
- 蜜罐字段名和 `g-recaptcha-response`（如果使用）必须在 body 中——用 `FormData()` 会自动带上。

## 文件上传

添加 `type="file"`；可选地在 `<form>` 上加 `enctype="multipart/form-data"`。对于 AJAX 文件上传，**不要设置 `Content-Type` 请求头**——让浏览器来设置（带上 multipart 边界）。

```js
document.forms.fileForm.addEventListener("submit", event => {
  event.preventDefault();
  fetch("/", { body: new FormData(event.target), method: "POST" })  // no headers
    .then(() => { /* success */ });
});
```

限制：每个字段一个文件（多个文件用多个字段）· 最大请求大小 8 MB · 上传超时 30 秒 · 表单删除后，已上传文件在其直接 URL 上保留 24 小时。PII 上传需要额外安全（Very Good Security 集成）。

## 自定义成功页

添加一个相对于站点根目录、以 `/` 开头的 `action` 路径。**使用无扩展名的路径**——Netlify 在 `/thank-you` 提供 `thank-you.html`；带 `.html` 的路径返回 404。

```html
<form name="contact" action="/thank-you" method="POST" data-netlify="true"></form>
```

自定义成功*弹窗*只能通过 AJAX 实现（用你自己的逻辑替代重定向）。

## 垃圾信息防护

所有提交都会由 Akismet 过滤。通过 → **Verified submissions**；被标记 → **Spam submissions**。蜜罐/reCAPTCHA 失败会被拒绝，且不出现在两个列表中的任何一个。

**蜜罐：**在 `<form>` 上添加 `netlify-honeypot="bot-field"`，并加入一个同名、用 CSS 隐藏的字段。输入了任何值 → 提交被静默拒绝。

```html
<form name="contact" method="POST" netlify-honeypot="bot-field" data-netlify="true">
  <p class="hidden"><label>Don’t fill this out: <input name="bot-field" /></label></p>
  <!-- real fields -->
</form>
```

**Netlify reCAPTCHA 2：**在 `<form>` 上添加 `data-netlify-recaptcha="true"`，**并且**在渲染位置添加一个空的 `<div data-netlify-recaptcha="true"></div>`。每页只能有一个 Netlify 提供的挑战——需要多个时，使用自定义 reCAPTCHA。对于 JS 渲染的表单，还要把该 `div` 加到静态骨架文件里。

**自定义 reCAPTCHA 2：**你自己的 reCAPTCHA 片段 + `<form>` 上的 `data-netlify-recaptcha="true"`，外加环境变量：
- `SITE_RECAPTCHA_KEY`——site key（作用域：Builds + Runtime）
- `SITE_RECAPTCHA_SECRET`——secret（作用域：Runtime）

## 邮件通知与主题行

默认发件人：`formresponses@netlify.com`。通过隐藏的 `subject` 输入**或** Netlify UI（Forms > Submission notifications）设置主题——**不能两者都用；HTML 值总是覆盖 UI。**

```html
<input type="hidden" name="subject" value="New lead from %{formName} (%{submissionId})" />
```

变量：`%{formName}`、`%{siteName}`、`%{submissionId}`。在 **2023 年 5 月 5 日**之前创建的表单带有 `[Netlify]` 主题前缀——通过在 `subject` 输入上添加 `data-remove-prefix` 属性来移除它。

在 UI 中设置通知（email/webhook/Slack）：Forms > Submission notifications > **Add notification**。

ChatGPT 自动化：从 ChatGPT 订阅表单提交事件，并在其上运行自动化（例如审查新提交并标记需要跟进的那些）。设置：https://docs.netlify.com/build/build-with-ai/agent-setup-guides/use-netlify-with-chatgpt/#subscribe-to-netlify-events

## 通过 API 读取提交

仅使用有文档记载的接口。不要发明 `api.netlify.com` endpoint，也不要从本地 CLI 配置文件读取令牌。参考：https://open-api.netlify.com/#tag/submission/operation/listFormSubmissions

- **使用 `Link` 响应头对结果分页**——只读取第一个响应的代码会静默丢弃其余部分。
- `listFormSubmissions` 会返回 UI 中已不再显示的旧/已移除字段的数据。
- 用 `?state=spam` 查询垃圾提交。

## 提交摘要（字段顺序很重要）

UI 摘要根据字段**类型**得出，而不是名称：
- **标题**：第一个非隐藏、且不像邮件的文本 `<input>`（`type="email"`，或名称匹配 `email`/`mail`/`from`/`twitter`/`sender`）；回退到名为 `title` 或 `subject` 的字段。
- **正文**：第一个 `<textarea>`。

HTML 中的字段顺序会影响摘要中显示的内容。

## 排查丢失的提交

- **首要怀疑：Akismet 误报。**丢失的合法提交通常是被标记为垃圾——检查 **Spam** 列表（或 API `?state=spam`）并将其标记为已验证。不要一上来就构建自定义恢复 function 或禁用垃圾过滤。
- 测试提交会被标记为垃圾：使用真实邮箱（不要用 `test@test.com`）、写完整句子、不要从同一个 IP 频繁轰炸。
- 完全没有提交：确认表单检测已启用（Forms > Form detection）并重新部署。
- SSR/JS 表单静默失败：核实静态骨架文件存在、字段名完全匹配，且 AJAX 指向骨架文件而不是 `/`。
- 缺少旧字段数据：UI 只显示上次部署的表单版本中的字段。把旧字段标记为 `hidden` 而不是移除它们，以保持可见；旧数据仍可通过 `listFormSubmissions` 获取。
- 仍然卡住：Netlify 支持指南《如何调试你的表单》——https://answers.netlify.com/t/common-issue-how-to-debug-your-form/92

## 约束

- 删除表单是永久的：未来的提交返回 `404`，过去的提交变得不可用。请先导出 CSV。
- 提交的代码会被净化（`<script>` → 转义实体）。
- 对于 PII，请定期导出并删除数据。
- 数据存储在 Netlify 的数据库中，除通过 UI/API/CSV 外无法访问。

<!-- Gap: ChatGPT automation event names, plan gating, and setup steps are not in this grouping; see the linked ChatGPT setup guide. -->

<!-- system: agent-context/forms/system.md — human-owned, merged by ctx-gen; edit system.md, not this section -->
# Netlify 内部规则（forms）

这些是组织约定和实战中总结的护栏，而非文档事实——由 ctx-gen 合并进渲染后的技能，且从不自动生成。提取自此前手写的 netlify-forms 技能；由技能维护者负责。

1. 在 SSR 应用（Next.js、Nuxt、SvelteKit 等）中，`fetch("/")` 会被 SSR 的 catch-all function 拦截，永远到不了 Netlify 的表单处理。要把 AJAX 提交 POST 到静态骨架文件本身（例如 `/__forms.html`），而不是任意路径。
2. 仅使用有文档记载的接口：不要用发明的 endpoint 形态 curl `https://api.netlify.com/...`，也不要从本地 CLI 配置文件（`~/Library/Preferences/netlify/config.json`）读取令牌。
3. 通过 API 读取提交时，要对结果分页（`Link` 响应头）；只读取第一个响应的代码会静默丢弃其余部分。
4. 对于 JS 渲染和 SSR 表单，始终创建静态骨架文件 `public/__forms.html`：每个表单的隐藏副本，带有 `data-netlify="true"`、一个隐藏的 `form-name` 输入，以及组件提交的每个字段——名称完全匹配（Netlify 会对照已注册的表单验证字段名）。没有这个文件，提交会静默失败。
5. 按需渲染的 Astro 路由（`export const prerender = false` 或 `output: "server"` 路由）在构建时从不会被扫描，因此其表单永远不会被注册。把表单放在预渲染页面上，或依赖静态骨架文件。
6. 一个"丢失"的合法提交通常是 Akismet 误报：检查 Spam 列表（或用 API `?state=spam`）并将其标记为已验证。不要一上来就构建自定义恢复 function 或禁用垃圾过滤。
7. 对于自定义成功页，使用无扩展名的 `action` 路径（`/thank-you`，而不是 `/thank-you.html`）——Netlify 在 `/thank-you` 提供 `thank-you.html`，而 `.html` 路径返回 404。
