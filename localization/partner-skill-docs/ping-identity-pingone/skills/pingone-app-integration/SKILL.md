---
name: pingone-app-integration
description: "在编写将应用与 PingOne（多租户）集成的代码时使用 —— 面向 Android、iOS 和 JavaScript/React 的 Ping SDK 设置，针对 auth.pingone.com 的 OIDC 授权码 + PKCE，DaVinci 客户端与收集器渲染，浏览器内令牌交换前的 CORS 配置，Worker 应用以及用于后端的 client_credentials 或令牌交换，推送 MFA 设备注册，以及应用侧故障排查（redirect_uri_mismatch、CORS 令牌失败、ForgeRock 到 Ping SDK 的迁移）。"
compatibility: "Implementation skill for PingOne multi-tenant environments. Produces app-side code and configuration as artifacts; verifying CORS, redirect URIs, and application settings in a live tenant requires PingOne admin console access, PingOne MCP tools, or Ping CLI."
metadata:
  publisher: Ping Identity
  version: "0.1.0"
  product_family: pingone-mt
---

# PingOne 应用集成

用于将 Web、移动和后端应用连接到 PingOne 环境的实现技能：SDK 接线、OIDC/PKCE 令牌流程和实现诊断。平台设置和 DaVinci 流程编写是前提条件，不在此处涵盖。

## 何时使用

- 使用 Ping SDK 与 PingOne（`auth.pingone.com`）集成的 Android、iOS 或 JavaScript/React 应用。
- 针对 PingOne 环境的 OIDC 授权码 + PKCE、令牌存储、重定向和静默续期。
- 在浏览器内令牌交换之前，在 PingOne 应用上配置 CORS。
- 后端集成：Worker 应用、client_credentials、令牌交换、CIBA、刷新、弹性。
- 应用侧故障：redirect_uri_mismatch、`/as/token` 上的 CORS、推送未送达、ForgeRock → Ping SDK 迁移。

## 何时不要使用

- 创建 PingOne 环境或应用记录、登录策略或用户群体 → PingOne 管理控制台和文档。
- 编写、接线或调试 DaVinci 流程 → DaVinci studio 和流程文档。
- 本地部署的 PingFederate 或 PingAccess 应用集成 → PingFederate / PingAccess 文档。
- 产品组合或产品选择问题 → Ping Identity foundations 文档。

## 检索与输出规范

在生成代码之前，先获取关于 SDK 版本、工件坐标、端点路径和控制台位置的实时文档。**实时文档优先于本地参考文件。**

## 重要：使用 Ping 编排 SDK

始终使用当前的 Ping 编排 SDK 生成代码，而不是旧版的 ForgeRock SDK。

## 浏览器流程前提：在令牌代码之前配置 CORS

在浏览器中执行令牌交换的 SPA 会在令牌请求处失败 —— 在应用内的 `/as/authorize` 调用处也会失败 —— 除非应用的 CORS 设置允许该应用来源。在新租户上，这默认会失败。在生成浏览器内令牌交换代码之前，请在 Applications → [app] → Configuration → CORS Settings 下确认 CORS；详情见 `references/web-integration.md`。如果跨域设置不在范围内，请改用 BFF。

## 路由

| 任务 | 参考文档 |
|---|---|
| PingOne 的集成生命周期、SDK 全景、前提条件 | `references/overview.md` |
| Android 或 iOS SDK 集成（DaVinci 收集器、推送、存储） | `references/mobile-integration.md` |
| React / JavaScript Web 集成、CORS 设置、浏览器流程 | `references/web-integration.md` |
| 后端 OIDC、Worker 应用、M2M、令牌交换、CIBA、重试/429 | `references/server-side-integration.md` |
| 故障模式与 ForgeRock → Ping SDK 迁移 | `references/troubleshooting.md` |
