---
name: install-messenger
license: MIT
description: >
  在网站或 Web 应用上安装 Intercom Messenger，并采用基于 JWT 的安全身份验证。为 React、Next.js、Vue.js、Angular、Ember 和纯 JavaScript 生成后端与前端代码。支持 Node.js、Python（Flask/Django）、PHP 和 Ruby 后端。当用户要求“安装 Intercom”“添加 Intercom Messenger”“设置 Intercom 聊天挂件”“在我的网站上添加客户聊天”或“集成 Intercom”时使用。
disable-model-invocation: true
argument-hint: "[framework]"
---

# 安装 Intercom Messenger

帮助用户在网站或应用上安装 Intercom Messenger，并采用基于 JWT 的身份验证。这是安全的默认方式 —— 它通过在服务器上对用户身份进行加密签名，防止用户被冒充。

只有当用户明确要求“不安全安装”时，才使用不安全（非 JWT）的安装方式。绝不要默认采用它。

## 要求

在继续之前，从用户处收集以下信息：

1. **工作区 ID**（也称为 App ID）—— 一个短的字母数字字符串，如 `abc12345`。
   - 可在 [Intercom Messenger 安装页面](https://app.intercom.com/a/apps/_/settings/channels/messenger/install)找到
   - 或在地址栏中：`https://app.intercom.com/a/apps/<workspace_id>/...`

2. **身份验证密钥**（也称为 Messenger API Secret）—— 可在 [Messenger 安全页面](https://app.intercom.com/a/apps/_/settings/channels/messenger/security)找到。这是用于签名 JWT 的 HMAC 密钥。它绝不能出现在前端代码中。

向用户询问这两个值。没有工作区 ID 就不要继续。如果他们还没有身份验证密钥，引导他们前往 [Messenger 安全页面](https://app.intercom.com/a/apps/_/settings/channels/messenger/security)启用它。

在所有生成的代码中，将 `YOUR_WORKSPACE_ID` 替换为用户实际的工作区 ID。不要留下占位符 —— 用他们提供的真实值进行替换。

## 安装概述

安全安装分为两部分：

1. **后端**：创建一个 API 端点，为当前已认证的用户生成已签名的 JWT
2. **前端**：使用来自后端的 JWT 启动 Messenger

始终实现这两部分。后端生成 JWT；前端将其传给 Messenger。

## 第 1 步：后端 —— JWT 生成端点

创建一个服务端端点，供前端调用以获取当前已认证用户的已签名 JWT。JWT 必须使用身份验证密钥，以 **HS256** 签名。

### 必需的 JWT 声明

| 声明 | 必需 | 描述 |
|-------|----------|-------------|
| `user_id` | 是 | 用户的稳定、唯一标识符。必须在各会话之间保持一致。 |
| `email` | 推荐 | 用户的邮箱地址 |
| `name` | 推荐 | 用户的显示名称 |
| `exp` | 推荐 | 过期时间戳（Unix 秒）。使用短时效令牌 —— 2 小时较为合理。 |

**重要**：`user_id` 是必需的。如果多个用户共用同一邮箱，而你只传 `email` 而不传 `user_id`，Intercom 将以冲突错误拒绝该请求。

### Node.js / Express 示例

```javascript
const jwt = require('jsonwebtoken');

const INTERCOM_SECRET = process.env.INTERCOM_IDENTITY_SECRET; // Never hardcode this

app.get('/api/intercom-jwt', requireAuth, (req, res) => {
  const token = jwt.sign(
    {
      user_id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      exp: Math.floor(Date.now() / 1000) + (2 * 60 * 60), // 2 hours
    },
    INTERCOM_SECRET,
    { algorithm: 'HS256' }
  );

  res.json({ token });
});
```

关于 Python（Flask/Django）、PHP 和 Ruby/Rails 的示例，见 `references/backend-examples.md`。各语言的模式完全相同。

请使示例适配用户的后端语言和框架。关键要求是：
- 端点必须经过认证（只有已登录的用户才能获取自己的 JWT）
- 密钥来自环境变量，绝不硬编码
- 令牌包含 `user_id` 且过期时间较短

## 第 2 步：前端 —— 使用 JWT 启动 Messenger

前端从后端获取 JWT，并通过 `intercom_user_jwt` 将其传给 Messenger。

### 基础 JavaScript（无框架）

在结束的 `</body>` 标签之前添加：

```html
<script>
  // Fetch JWT from your backend, then boot the Messenger
  fetch('/api/intercom-jwt', { credentials: 'include' })
    .then(res => res.json())
    .then(({ token }) => {
      window.Intercom('boot', {
        app_id: 'YOUR_WORKSPACE_ID',
        intercom_user_jwt: token,
      });
    });
</script>
<script>
  (function(){var w=window;var ic=w.Intercom;if(typeof ic==="function"){ic('reattach_activator');ic('update',w.intercomSettings);}else{var d=document;var i=function(){i.c(arguments);};i.q=[];i.c=function(args){i.q.push(args);};w.Intercom=i;var l=function(){var s=d.createElement('script');s.type='text/javascript';s.async=true;s.src='https://widget.intercom.io/widget/YOUR_WORKSPACE_ID';var x=d.getElementsByTagName('script')[0];x.parentNode.insertBefore(s,x);};if(document.readyState==='complete'){l();}else if(w.attachEvent){w.attachEvent('onload',l);}else{w.addEventListener('load',l,false);}}})();
</script>
```

### 匿名访客

对于未认证的页面，不携带 JWT 启动：`Intercom('boot', { app_id: 'YOUR_WORKSPACE_ID' })`。Intercom 会将匿名访客作为潜在客户跟踪。

## 特定框架的安装

如果用户使用 React、Next.js、Vue.js、Angular、Ember 或其他 SPA 框架，请参阅 `references/framework-guides.md` 了解集成 JWT 的安装代码。如果从代码库看不出用户使用什么框架，请询问。

阅读框架指南后，使代码适配用户的具体项目结构 —— 找到他们的主布局组件、应用入口点或等效位置，并在那里集成 Messenger。

## 区域数据中心

大多数 Intercom 工作区位于美国区域，这是默认值 —— 不需要 `api_base`。只有当用户的工作区托管在 EU 或 Australia 时才添加 `api_base`：

| 区域 | `api_base` | 必需？ |
|--------|------------|-----------|
| US（默认） | *（不需要）* | 否 |
| EU（爱尔兰） | `https://api-iam.eu.intercom.io` | 是 |
| Australia | `https://api-iam.au.intercom.io` | 是 |

如果用户提到 EU 或澳大利亚托管、GDPR 合规或数据驻留要求，则在每个 `Intercom('boot', ...)` 调用中添加相应的 `api_base`。否则，省略它。

## 安全最佳实践

### 登出与关闭

当用户登出时，关闭 Messenger 以清除会话 cookie 并防止数据泄露：

```javascript
// Call this in your logout handler, BEFORE clearing session data
Intercom('shutdown');
```

关闭后，为下一个用户或以匿名身份重新初始化：

```javascript
Intercom('boot', {
  app_id: 'YOUR_WORKSPACE_ID',
});
```

始终包含关闭调用。跳过它会在共享设备上的用户之间泄露对话数据。

### 令牌过期

设置较短的 JWT 过期时间 —— 两小时是一个不错的默认值。要刷新已过期的令牌，重新从后端获取 JWT，并用新令牌再次调用 `Intercom('boot', ...)`。

## 故障排查

### 未安装 JWT 库
错误：`Cannot find module 'jsonwebtoken'`（Node.js）、`ModuleNotFoundError: No module named 'jwt'`（Python）或 `LoadError: cannot load such file -- jwt`（Ruby）
解决方案：为用户的编程语言安装 JWT 库 —— `npm install jsonwebtoken`、`pip install PyJWT` 或 `gem install jwt`。

### 身份验证密钥错误
症状：Messenger 能加载但显示“Identity verification failed”，或用户属性不显示。
原因：用于签名 JWT 的密钥与工作区的身份验证密钥不匹配。
解决方案：在 [Messenger 安全页面](https://app.intercom.com/a/apps/_/settings/channels/messenger/security)验证密钥。确保环境变量持有此工作区的正确值。

### 套餐不支持身份验证
症状：Intercom 设置中不提供身份验证密钥。
原因：身份验证是付费功能，并非所有 Intercom 套餐都可用。
解决方案：在 [Messenger 安全页面](https://app.intercom.com/a/apps/_/settings/channels/messenger/security)查看工作区的 Intercom 套餐。如果身份验证不可用，用户可能需要升级，或使用不安全安装（并明确知晓安全方面的权衡）。

### JWT `exp` 已过期
症状：Messenger 在令牌创建后立即拒绝它。
原因：服务器时钟错误或 `exp` 计算不正确。
解决方案：检查服务器的系统时间（`date` 命令）。确保已配置 NTP。确认 `exp` 值是一个未来的 Unix 时间戳（以秒为单位，而非毫秒）。

### JWT 端点上的 CORS 错误
症状：浏览器控制台在获取 JWT 时显示 `Access-Control-Allow-Origin` 错误。
原因：后端 JWT 端点不允许来自前端源的请求。
解决方案：在 JWT 端点上配置 CORS 以允许前端源。对于 Express：`cors({ origin: 'https://your-app.com', credentials: true })`。对于其他框架，添加相应的 CORS 头。

## 单页应用（SPA）路由变化

在 SPA 中，每次客户端路由变化后调用 `Intercom('update')`。关于特定框架的放置位置（React Router、Next.js、Vue Router、Angular、Ember），见 `references/framework-guides.md`。

## 第三方集成

Intercom 还支持通过 WordPress、Shopify、Google Tag Manager 和 Segment 进行无代码安装。引导用户前往 [Messenger 安装页面](https://app.intercom.com/a/apps/_/settings/channels/messenger/install)获取设置说明。

## 验证安装

生成代码后，在认为任务完成之前先验证安装。

**使用浏览器自动化**（Playwright MCP、playwright-cli 等）：导航到应用，确认 `typeof window.Intercom === 'function'`，检查 script 标签是否为 `widget.intercom.io/widget/WORKSPACE_ID`，并确认 JWT 端点对已认证用户返回 HTTP 200 和 `{ "token": "..." }`。注意：在无头/沙箱环境中，挂件 iframe 可能因 CDN 限制而无法加载 —— 这不是代码问题。

**使用 Intercom MCP 工具**（`search_contacts`）：在用户登录并加载带 Messenger 的页面后，按姓名或 `external_id` 搜索该用户。确认联系人存在且 `role: "user"`、`external_id` 正确 —— 这证明了从 JWT 签名到 Intercom 身份创建的完整链路。

**手动验证**（指导用户）：在浏览器中打开应用，确认 Messenger 气泡出现，登录，点击气泡，发送一条测试消息，然后检查 [Intercom 收件箱](https://app.intercom.com/a/inbox/_/inbox/)确认该对话归属于正确的用户。

## 安装后：强制执行 JWT 认证

代码部署后，用户必须在 Intercom 中启用并强制执行身份验证。指导他们完成以下步骤：

1. 前往 [Messenger 安全页面](https://app.intercom.com/a/apps/_/settings/channels/messenger/security)
2. 如果尚未启用，**启用身份验证（Enable Identity Verification）** —— 这会为 Messenger 激活基于 JWT 的认证
3. **强制执行身份验证（Enforce Identity Verification）** —— 一旦启用并确认可用，切换到“Enforced”模式，使未经认证的 Messenger 会话被拒绝
4. **将身份标识属性标记为受保护** —— 在同一页面，将邮箱、电话和账户 ID 等属性标记为受保护，以便只有服务器签名的 JWT 才能设置它们

这是关键的一步。如果不强制执行，JWT 签名就是可选的，用户仍然可以通过浏览器控制台被冒充。强制执行确保只接受服务器签名的身份。

## 不安全安装（仅在明确要求时）

如果用户明确要求“不安全安装”（无 JWT、无身份验证），则提供在 `intercomSettings` 中直接传递用户属性、无需服务器端签名的基本代码片段：

```html
<script>
  window.intercomSettings = {
    app_id: "YOUR_WORKSPACE_ID",
    name: "Jane Doe",
    email: "jane@example.com",
    created_at: 1312182000
  };
</script>
<script>
  (function(){var w=window;var ic=w.Intercom;if(typeof ic==="function"){ic('reattach_activator');ic('update',w.intercomSettings);}else{var d=document;var i=function(){i.c(arguments);};i.q=[];i.c=function(args){i.q.push(args);};w.Intercom=i;var l=function(){var s=d.createElement('script');s.type='text/javascript';s.async=true;s.src='https://widget.intercom.io/widget/YOUR_WORKSPACE_ID';var x=d.getElementsByTagName('script')[0];x.parentNode.insertBefore(s,x);};if(document.readyState==='complete'){l();}else if(w.attachEvent){w.attachEvent('onload',l);}else{w.addEventListener('load',l,false);}}})();
</script>
```

警告用户这不安全：任何人都可以通过修改浏览器控制台中的 `email` 或 `name` 值来冒充任何用户。建议在生产环境中改用基于 JWT 的认证。
