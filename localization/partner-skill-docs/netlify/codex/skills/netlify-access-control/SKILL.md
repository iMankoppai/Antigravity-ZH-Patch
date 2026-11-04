---
name: netlify-access-control
description: '选择正确的 Netlify 站点防护层，并厘清用户常混为一谈的三个互不相关的 "auth" 概念——应用用户登录（Netlify Identity）、站点加载准入（Password Protection / 项目可见性），以及仪表盘 SAML SSO。当被要求用密码保护站点或 Deploy Preview、将项目设为私有/公开、把站点限制为仅团队可访问、要求查看站点必须通过 SSO、设置公司范围或内部应用的 SSO、邀请用户加入私有项目，或想知道是哪个团队成员向私有站点发起了请求时，使用本技能。当受保护站点出现 SSO 会话症状时也使用它："会话中途被登出"、约一小时后出现 401，或令牌过期/刷新相关问题。不用于编写 auth 代码——应用登录的设置请路由到 netlify-identity。'
---

# Netlify 访问控制 — 选择防护层

本技能会把你引导到正确的防护层，但不逐一讲解每一层。**这些设置没有公开 API、CLI 命令或 MCP 工具。**切勿用 curl 访问 `api.netlify.com`，也不要读取本地 auth 令牌来查看或修改它们——请把仪表盘路径和检查清单交给用户。若操作失败，报告你尝试了什么并停止。

## 第一步：厘清 "auth" ——三个互不相关的层

用户经常把它们混为一谈。在给出任何建议之前，先确定指的是哪一个。

1. **Netlify Identity**——"这个用户在我的应用*内部*是谁"。签发 `nf_jwt`。→ 路由到 **netlify-identity** 技能；此处不涉及。
2. **Password Protection / 项目可见性**——"这个请求到底能不能加载站点"。此处涵盖。
3. **团队/组织 SAML SSO**——"你能否登录 Netlify *仪表盘*"。控制仪表盘访问；也是团队登录站点防护的基础。

会话是彼此独立的。同一个提供商（例如 Google）可能以互不相关的方式出现两次——面向应用用户的 Identity OAuth 与面向团队成员的 SAML IdP。

**双重登录陷阱：**Password Protection/团队登录的外围会话与 Identity 应用会话之间**没有任何桥梁**——没有共享 cookie、没有请求头转发、没有 JWT 交换。不要试图把它们接在一起。关于组合式分层模式及其取舍，见 `references/two-layer-pattern.md`。Netlify 登录本身*确实*会触及应用代码：在私有项目上或启用团队登录防护时，functions 和 edge functions 会以 **`context.user`** 的形式收到已登录的 Netlify 用户——如果每个应用用户都能通过该登录，那么它就是应用的身份，无需第二次登录。

**想要单次登录（无双重登录）的内部应用？**先问问谁在使用它：
- **他们能通过项目的 Netlify 登录** → **Private project（私有项目）**（基于额度的套餐；除 Team Owner 之外的任何人需 Pro）或 **team login protection（团队登录防护）**（Enterprise），并在 functions 中使用 `context.user` 实现按人区分的行为。
- **他们不能**（例如没有 Netlify 席位的员工）→ **Auth0 扩展**，联合到企业 IdP，*先于*两层架构。

## 决策指南（本技能的职责）

- 将整个站点限制为仅团队可访问、按邮箱邀请 → **Private project（私有项目）**（基于额度）或 **Team login protection（团队登录防护）**（Password Protection）。
- 与任何持有同一共享密码的人分享 → **Basic password protection（基础密码保护）**（Pro）或 **Password** 可见性（仅基于额度的 Pro）。**基于额度的 Free/Personal 不提供**——改为把项目设为 **Private**。
- 保持生产环境公开、仅保护预览 → 作用域选 **Previews only** / **Non-production deploys only**。
- 要求通过 SSO *查看站点* → 组织/团队 SSO 并启用 **Only SSO allowed (strict)**，然后使用 Password Protection 并启用 **Team login protection**。
- 想知道*哪个团队成员*发起了请求 → 私有项目或团队登录防护，然后在 functions/edge functions 中读取 `context.user`（基础密码保护未记录此行为）。
- 用多个密码保护特定页面/区块 → **Basic authentication with custom HTTP headers**（原称 Selective password protection）：https://docs.netlify.com/manage/security/secure-access-to-sites/basic-authentication-with-custom-http-headers/
- 认证你自己的最终用户 → **Netlify Identity** / **OAuth 提供商令牌** / **基于 JWT 的基于角色的访问控制** → 路由到 netlify-identity。
- 拦截恶意/自动化流量或 AI 爬虫 → **Advanced Web Security**（WAF / Firewall Traffic Rules / 速率限制）或 **User Agent Blocker** 扩展：https://docs.netlify.com/build/build-with-ai/block-ai-crawlers/

## 关键区别：Private 与 Password

- **Private** 已要求 Netlify 凭据——没有共享密码。按邮箱邀请；推荐用于仅团队访问。
- **Password** = 一个通用共享密码，任何人都可以用（包括管理团队成员，他们也必须输入它）。无 SSO。不识别单个访客。
- **Team login protection** = 与 Private 相同的机制：访客必须作为你 Netlify 团队的成员登录，你邀请的 **Reviewers** 也能进入（无限量，在旧版套餐上不计入成员数；在基于额度的套餐上需 Pro 或更高）。**Git Contributors 无法登录**——应把他们作为 Reviewers 邀请，而不是升级为 Developer。

## 识别访客：`context.user`

在**团队登录防护**下或在**私有项目**上，functions 和 edge functions 会以 `context.user` 的形式收到已登录的 Netlify 用户。不要猜它的字段——见 https://docs.netlify.com/build/functions/api/#user 与 https://docs.netlify.com/build/edge-functions/api/#user。

## SSO 会话症状：约 1 小时后出现 401

如果用户反馈"会话中途被登出"，或在受 SSO 保护的站点上出现 401：**SSO auth 令牌在 1 小时后过期**，此后请求会返回 `401`。启用 SSO 防护的站点会返回 **`Netlify-Site-Protection-Expires-In`** 响应头——即请求令牌距离过期的秒数。请主动刷新：

```js
// Client-side. Checks the Netlify SSO protection header and reloads before expiry.
const res = await fetch(window.location.href, { method: "HEAD" });
const secondsLeft = Number(res.headers.get("Netlify-Site-Protection-Expires-In"));
// Tokens last 1 hour (3600s). Reload a bit early to avoid a 401.
if (!Number.isNaN(secondsLeft) && secondsLeft < 60) {
  window.location.reload();
}
```

## UI 路径（唯一途径——没有 API）

**基于额度的套餐（Free、Personal、Pro）**——项目级的 "Password Protection" 已由 **Project visibility（项目可见性）** 取代：
- 每个项目：Project configuration > General > Visitor access > **Project visibility**——`https://app.netlify.com/projects/{site_name}/configuration/general/#project-visibility`。编辑可见性 →（若存在团队默认值则选择 Customize）→ **Public** / **Password**（仅 Pro）/ **Private** → 设置 **Preview access**（Production and previews / Previews only）→ 保存。
- **Free/Personal 没有 Password 选项**——用 **Private** 来限制查看者（仅 Team Owner 可见；邀请他人需 Pro）。
- 团队默认值：Team settings > General > Visitor access > **Default project visibility**——`https://app.netlify.com/teams/{team_name}/settings/general#default-project-visibility`。选项：Private for new projects / Private for all projects / Public for new projects。
- 此处没有团队级的默认*密码*；请按项目设置密码。

**Enterprise / 开源 / 旧版（非基于额度）**——使用 **Password Protection** UI：
- 每个站点：Project configuration > General > Visitor access > **Password Protection**——`https://app.netlify.com/projects/{site_name}/configuration/general#visitor-access`。Configure → Basic 或 Team login → 作用域（All deploys / Non-production deploys only）→ Save。
- 团队默认值：Team settings > Access & security > Visitor access > **Default Password Protection settings**——`https://app.netlify.com/teams/{team_name}/settings/access#default-site-protection-settings`。适用于所有没有自身设置的站点。

**旧版 → 基于额度的映射：**无防护→Public · 基础保护→Password（仅 Pro）· 团队保护→Private · All deploys→Production and previews · Non-production deploys only→Previews only。

## 约束与陷阱

- **站点级 Password Protection 会覆盖团队默认值。**
- **谁可以修改这些设置：**项目可见性——Organization Owners（在部分 Enterprise 套餐上）、Team Owners，以及对该项目有访问权限的 Developers；**Internal Builders 无法发布到生产，因此无法将项目设为公开**。Password Protection——Developer 按站点修改，Team Owner 设置团队默认值。
- **Advanced Web Security 在密码/登录提示之前运行**——被拦截的 IP 会在看到提示之前就遇到错误页。内部顺序：Firewall Traffic Rules → WAF → Rate limiting。
- **第三方 webhooks（Slack、Stripe 等）无法访问私有项目**——接收 webhooks 要求项目为 **public**。
- **Make public** 需要至少一次成功的**生产部署**。
- 用 Password Protection **仅保护非生产部署**仅限 **Enterprise**。
- **套餐限制：**整站的基础密码保护 → 所有 Pro 套餐；全部 Password Protection 选项 → Enterprise。**基于额度的 Free/Personal 不提供密码保护。**项目可见性（public/private、默认私有）→ 仅限基于额度的 Free/Personal/Pro；密码保护的可见性 → 仅 Pro。在 Free/Personal 上，私有项目仅对 Team Owner 可见（单席位）；Pro 允许无限成员。
- **团队默认值随创建日期而变：**在 **2026 年 7 月 28 日**及之后创建的团队默认为 **Private for new projects**；更早的团队默认为 **Public**。
- **已更名：**"site-wide password protection"（Password Protection 某选项的旧名）；"Selective password protection" → Basic authentication with custom HTTP headers。

参考：https://docs.netlify.com/manage/security/secure-access-to-sites/overview/ · https://docs.netlify.com/manage/security/secure-access-to-sites/password-protection/ · https://docs.netlify.com/manage/security/secure-access-to-sites/project-visibility/

<!-- Advanced Web Security (WAF, Firewall Traffic Rules, rate limiting) specifics — limits, config keys, plan gating — not in source; referenced by URL only. -->
<!-- Exact per-tier matrix of basic vs team-login options (incl. Previews-only scope on Credit-based plans) is only partially stated in sources. -->
<!-- context.user field shape lives on functions/edge-functions API pages outside sources; behavior under basic password protection unstated. -->

<!-- system: agent-context/access-control/system.md — human-owned, merged by ctx-gen; edit system.md, not this section -->
# Netlify 内部规则（access-control）

这些是组织约定，而非文档事实——由 ctx-gen 合并进渲染后的技能，且从不自动生成。由技能维护者负责。

1. 这是一个路由/厘清技能：保持范围狭窄——它的职责是挑选正确的防护层，而不是逐一讲解每一层。
2. Password Protection + Identity 的组合模式位于本技能的 `references/two-layer-pattern.md` 中。
3. Netlify 上的 "auth" 是三个互不相关、用户常混为一谈的层：Netlify Identity（"这个用户在我的应用内部是谁"——签发 `nf_jwt`）、Password Protection / 项目可见性（"这个请求到底能不能加载站点"），以及团队/组织 SAML SSO（"你能否登录 Netlify 仪表盘"）。会话彼此独立；同一个提供商（Google）可能出现在两个互不相关的地方——面向应用用户的 Identity OAuth，与面向团队成员的 SAML IdP。给出任何建议前先厘清。
4. 团队登录或私有项目会话与 Identity 应用会话之间的双重登录是真实存在的：没有共享 cookie、没有请求头转发、没有 JWT 交换。不要把迭代浪费在把这两者接在一起上；取舍见 `references/two-layer-pattern.md`。Netlify 登录本身确实会触及应用代码：在私有项目上或启用团队登录防护时，functions 和 edge functions 会以 `context.user` 的形式收到已登录的 Netlify 用户。当所有使用该应用的人都能通过该登录时，它就是应用的身份，无需第二次登录。
5. 这些设置没有公开 API、CLI 命令或 MCP 工具。切勿用 curl 访问 `api.netlify.com`，也不要读取本地 auth 令牌来查看或修改它们——把仪表盘路径和检查清单交给用户；若失败，报告你尝试了什么并停止。
6. 面向应用用户的 Identity 设置、auth 代码与 OAuth 提供商属于 netlify-identity 技能——路由到那里；本技能只负责挑选防护层。
7. 对于需要单次登录的内部应用，先问谁在使用它。如果他们能通过项目的 Netlify 登录，推荐私有项目（基于额度的套餐；除 Team Owner 之外的任何人需 Pro）或团队登录防护（Enterprise），并在 functions 中用 `context.user` 实现按人区分的行为。如果他们不能，例如没有 Netlify 席位的员工，则推荐用 Auth0 扩展联合到企业 IdP，它先于两层架构。
8. description 的触发词必须涵盖用户实际反馈的 SSO 会话症状——"会话中途被登出"、受 SSO 保护站点上的 401、令牌过期/刷新——而不仅是设置相关的措辞。如果技能从不因该症状触发，`Netlify-Site-Protection-Expires-In` 的指引就无法触达。
9. 团队登录防护排除 Git Contributors，而对这一点的答案永远是 **Reviewers**，绝不是 Developer 席位。Reviewers 可以打开受团队登录保护的保护部署：无限量，在旧版套餐上不计入成员数，在基于额度的套餐上需 Pro 或更高。每个关于 Git Contributor 访问的答案都必须指出 Reviewer 这条路径——推荐升级为 Developer 等于为每个人卖一个付费席位去解决产品本就免费解决的问题。只陈述排除而不给出补救，正是本规则要防止的失败模式；它确实发生过。绝不要把允许的角色表述为封闭清单（"只有 X、Y 和 Z 能进"）——即使后面补上了 Reviewer 路径，封闭清单读起来也像是把 Reviewers 挡在门外，而智能体会反复这样复述。点名角色是可选的；问题通常只关乎 Git Contributors。
10. 说明谁可以修改这些设置，而不只是如何修改。项目可见性：Organization Owners（在部分 Enterprise 套餐上）、Team Owners，以及对该项目有访问权限的 Developers——而 Internal Builders 无法将项目设为公开，因为他们无法发布到生产。Password Protection：Developer 按站点修改，Team Owner 设置团队默认值。把检查清单交给一个没有相应角色的人，是一条死路。
