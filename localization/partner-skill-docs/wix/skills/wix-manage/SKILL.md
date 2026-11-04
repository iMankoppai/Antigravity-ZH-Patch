---
name: wix-manage
description: "用于配置和管理 Wix 站点业务解决方案的 REST 配方——商店、预订、捐赠、支付、CMS 等。在调用之前打开匹配的配方获取确切的端点、方法和载荷——绝不猜测 Wix API，绝不从记忆中编写 Wix 仪表盘 URL。路由到：automations、stores、bookings、donations、get-paid、CMS、contacts、forms、media、app-installation、custom-apps、pricing-plans、restaurants、ricos rich-content、sites、collaborators、blog、calendar、domains、events、site-properties、ecommerce、marketing、google-ads、google-business-profile、analytics、accessibility、seo、dashboard-navigation。"
compatibility: Requires Wix REST API access (API key or OAuth).
---

# 管理配方索引

> **这些配方中每个 curl 示例的标准调用形态。** 示例 curl 中的 `<AUTH>` 占位符仅是 `Authorization` 头的简写；带正文的调用还需要 `Content-Type: application/json`。

## 什么是管理配方？

**管理配方用于 REST API 操作**，这些操作在你的站点上配置、设置和管理 Wix 业务实体。这些配方使用 REST API 调用，面向：

- **站点设置和配置**——商店、预订、支付及其他业务应用的初始设置
- **实体管理**——创建、更新和删除产品、服务、员工、定价计划
- **管理操作**——批量更新、联系人打标签、数据迁移
- **后端集成**——服务器到服务器的自动化、webhook、数据同步

这些配方不涵盖前端开发或用于向用户展示数据的 SDK 用法。

---

## 应用安装

### [安装 Wix 应用](references/app-installation/install-wix-apps.md)
使用 Apps Installer API 在站点上安装 Wix 应用。涵盖启用 Velo（Wix Code）、应用安装以及常见的应用定义 ID。

### [列出已安装应用](references/app-installation/list-installed-apps.md)
使用 Apps Installer API 列出站点上安装的所有应用。有助于在进行 API 调用前验证应用安装并诊断授权错误。

### [应用管理仪表盘导航](references/app-installation/app-installation-dashboard-navigation.md)
“构建指向 manage.wix.com 上应用管理仪表盘页面的直接链接——App Market 和已安装应用管理页面。将已安装应用与 List Installed Apps 读取 API 配对。当用户询问某物在 Wix 仪表盘中的位置、想要某个仪表盘页面的直接链接，或你需要一个仪表盘 URL 随 API 操作结果一起返回时使用。”

---

## 自定义应用

### [使用应用工具](references/custom-apps/use-app-tools.md)
“发现并运行应用工具——Wix 站点上安装的应用暴露给 AI 智能体的操作和查询，例如用定价应用转换价格或用配送应用跟踪包裹。涵盖列出站点的应用工具、按其描述选择一个，并用从其输入架构构建的载荷运行它。当用户要求某个已安装应用提供而非 Wix 内置的功能、询问其应用能做什么，或命名某个应用或应用工具时使用。”

---

## SEO

### [管理 Wix 站点的 SEO 标签](references/seo/manage-seo-tags.md)
在正确的层级读取和更新 SEO 标题与标签。对于“更改我站点的 SEO 标题”，在发现或写入前澄清是首页、特定页面还是页面类型模式；站点级标签仅接受元标签，绝不接受标题。发现项 ID 和模式变量，在每次全量替换写入前先读取，并报告已解析的标签及其来源。

### [管理 Wix 站点上的 URL 重定向](references/seo/manage-url-redirects.md)
“使用公共 SEO Redirects API 在 Wix 站点上检索、创建和删除 URL 重定向。涵盖精确和组重定向、多语言站点的语言范围重定向、最多 100 个的批量创建和最多 500 个的批量删除，以及已存在重定向的变更流程。此 API 没有 query、search 或 update 方法：List Redirects 是唯一的批量读取。重定向不链式，因此创建一个指向另一重定向起始路径的重定向会永久删除那另一个重定向；每次写入前先列出并检查。”

### [生成并读取 Wix 站点的内容计划](references/seo/manage-content-plan.md)
为 Wix 站点生成 SEO 内容计划、读取建议的博客文章主题和关键词，或诊断并继续已停滞的既有生成流程，包括缺少流程标识符的请求。

### [为 Wix 站点管理 Google Search Console](references/seo/manage-google-search-console.md)
“将 Wix 站点连接到 Google Search Console，并通过公共 GSC Connection 和 Site Readiness API 驱动其设置：检查连接和就绪状态、启动 Google 授权、验证所有权、添加资产、提交站点地图、请求索引、读取搜索表现、运行 URL 检查、恢复过时连接或断开连接。站点所有者通过一次性连接 URL 在其自己的浏览器中授权。”

### [为 Wix 站点生成 AI SEO 建议](references/seo/manage-seo-suggestions.md)
“通过公共 Tag Suggestions 和 Page Optimization API 为 Wix 站点生成 AI 编写的 SEO 文本：页面的标题标签和元描述选项、页面、商店产品或博客文章图像的替代文本（一次一张图像或至多 20 张）、页面标题的修正标题级别，以及针对页面焦点关键词的整页标题、描述、标题和正文重写，以之前/之后配对返回。当用户想要改进、优化、审计或编写页面或首页的 SEO 文本时使用。建议返回以供审查；应用某一个是单独的 SEO 标签写入。”

---

## 无障碍

### [扫描 Wix 站点的无障碍问题](references/accessibility/scan-site-accessibility.md)
为整个站点、单个页面或任何受支持页面集合中的每个页面运行 Wix 无障碍扫描，包括产品、博客文章、预订服务、活动和餐厅页面。轮询异步扫描至完成，单独报告失败页面，检索按优先级排序的发现项，并使用返回的修复指南帮助用户解决和验证问题。

---

## 分析

### [查询站点分析](references/analytics/query-site-analytics.md)
通过 Semantic Model API 检索 Wix 站点的分析。涵盖列出语义模型、检查模型的架构（度量、维度、参数），以及用必需的时间区间、筛选条件、排序、分页和人类可读格式查询模型数据。

### [分析仪表盘导航](references/analytics/analytics-dashboard-navigation.md)
“构建指向 manage.wix.com 上 Wix 分析仪表盘页面的直接链接——亮点、报告、按域概览（流量、行为、销售、营销）以及性能洞察/基准。将分析数据与其读取 API 配对，以便你通过 API 回答问题并交回一个‘在你的仪表盘中查看’的链接。当用户询问某物在 Wix 仪表盘中的位置、想要某个仪表盘页面的直接链接，或你需要一个仪表盘 URL 随 API 操作结果一起返回时使用。”

---

## 博客

### [如何创建博客文章](references/blog/how-to-create-blog-posts.md)
使用 Blog Posts API 创建并发布博客文章。涵盖解析必需的作者 memberId（包括在站点没有作者时创建作者成员）、Ricos 富内容格式、通过 Media Manager 上传图像、类别/标签分配以及批量创建文章。

### [博客仪表盘导航](references/blog/blog-dashboard-navigation.md)
“构建指向 manage.wix.com 上 Wix 博客仪表盘页面的直接链接——文章列表（已发布和草稿选项卡）、类别、标签、作者、评论审核、博客分析、变现和设置。将每个主要博客实体与其读取 API 配对，以便你获取实体并交回一个‘在你的仪表盘中查看’的链接。当用户询问某物在 Wix 仪表盘中的位置、想要某个仪表盘页面的直接链接，或你需要一个仪表盘 URL 随 API 操作结果一起返回时使用。”

---

## 预订

### [预订服务策略设置](references/bookings/booking-service-policy-setup.md)
使用 Booking Policies API 设置预订策略、取消规则和候补名单配置——查询（默认）bookingPolicy 实体，然后连同其修订 PATCH 它。涵盖 cancellationPolicy、reschedulePolicy、预订通知限制、waitlistPolicy 和参加者限制——例如“客户最多可提前 24 小时取消”。

### [预订员工设置](references/bookings/bookings-staff-setup.md)
“使用 Staff API + Calendar Events API 创建员工并配置自定义工作时间。关键的两步流程：创建员工 → 分配日程 → 创建工作时间事件。”

### [创建和更新预订服务](references/bookings/create-and-update-booking-services.md)
“从诸如‘75 美元的 60 分钟咨询’、‘每周二的 12 人瑜伽课’或‘为期 6 周的摄影课程’之类的简单请求，创建和更新各种类型的 Wix Bookings 服务——预约、课程和培训课程。涵盖选择服务类型、请求省略内容的默认值、定价（免费、固定、免费到付费）、员工、容量、时长、类别、可见性、图像、在日历上安排课程和培训课程场次，以及更改现有服务。”

### [检查预订可用性（并诊断问题）](references/bookings/diagnose-availability-issues.md)
“回答基于预约的 Wix Bookings 服务当前是否有可预订的可用性——这是主要问题——并仅在无可用性或所有者询问原因时诊断原因。为诊断，首先排除可用性端点看不到的服务级阻碍（服务隐藏、在线预订关闭），然后运行 DiagnoseAvailability 获取有序、机器可读的员工/设置原因，并对预订策略和容量原因提供手动回退。当有人询问某服务是否有可用性，或为什么某服务没有时间/客户无法预订它时使用。”

### [端到端预订流程](references/bookings/end-to-end-booking-flow.md)
使用站点所有者的凭据预订并结算预约、课程和培训课程——一个管理预订的操作者，或作为所有者预订的服务端代码。涵盖服务发现、使用 Time Slots V2 的可用性、创建预订，以及通过直接确认或通过 eCommerce 结账收款来结算它。访客为自己预订需要访客令牌；本配方链接了该路径。

### [外部日历集成](references/bookings/external-calendar-integration.md)
基于 OAuth 与 Google Calendar、Microsoft Outlook 和 Apple Calendar 集成。涵盖认证流程、同步配置和双向事件管理。

### [多资源服务创建](references/bookings/multi-resource-service-creation.md)
使用 Resources API 创建资源类型和单个资源。支持需要多个资源（房间 + 设备 + 员工）并自动分配的服务。

### [预订仪表盘导航](references/bookings/bookings-dashboard-navigation.md)
“构建指向 manage.wix.com 上 Wix 预订仪表盘页面的直接链接——服务列表、编辑特定服务、日历、预订列表、员工、可用性、资源和设置页面。将每个主要预订实体与其读取 API 配对，以便你获取实体并交回一个‘在你的仪表盘中查看’的链接。当用户询问某物在 Wix 仪表盘中的位置、想要某个仪表盘页面的直接链接，或你需要一个仪表盘 URL 随 API 操作结果一起返回时使用。”

---

## 日历

### [配置默认营业时间](references/calendar/configure-default-business-hours.md)
使用 Calendar Events API 在营业日程上创建 WORKING_HOURS 事件。涵盖 Calendar Events API（正确）与 Site Properties API（错误）之间在设置基础可用性上的关键区别。

> 日历表面（可用性、默认营业时间）的仪表盘链接在 [预订仪表盘导航](references/bookings/bookings-dashboard-navigation.md)。

---

## CMS

### [CMS 数据项 CRUD](references/cms/cms-data-items-crud.md)
“在 CMS 集合中添加、查询、更新和删除项，一次一个或批量。还涵盖计数项、用批量保存进行 upsert、清空集合、用管道聚合数据、通过单引用和多引用字段链接项，以及展开其引用项来读取项。”

### [CMS eCommerce 目录集成](references/cms/cms-ecommerce-catalog-integration.md)
通过 Wix 结账销售现有 CMS 集合项（门票、预订、会员）的推荐方式。添加 CATALOG 插件，将任何 CMS 集合转换为带购物车和支付集成的可购买产品。

### [CMS 架构管理](references/cms/cms-schema-management.md)
创建和修改 CMS 集合结构。涵盖列出集合、创建带字段的集合、添加/移除字段（包括链接两个集合的单引用和多引用字段）以及更新集合设置。

### [CMS 草稿与发布工作流（Draft Items 插件）](references/cms/cms-publishing-flow.md)
“通过 Draft Items 插件与将项置于草稿/发布工作流之后的 CMS 集合交互。涵盖检测插件、定位配对草稿集合、读取已发布与草稿项、编写/编辑草稿，以及发布、取消发布、还原和删除项。关键端点：/wix-data/v2/items/publish-draft、/wix-data/v2/items/unpublish、/wix-data/v2/collections/add-draft-items-plugin，以及由 draftItemsPluginOptions.draftsCollectionId 引用的配对草稿集合。”

### [CMS 仪表盘导航](references/cms/cms-dashboard-navigation.md)
“构建指向 manage.wix.com 上 Wix CMS（内容管理器）仪表盘页面的直接链接——集合列表和特定集合的项视图。将集合和数据项与其读取 API 配对，以便你获取数据并交回一个‘在你的仪表盘中查看’的链接。当用户询问某物在 Wix 仪表盘中的位置、想要某个仪表盘页面的直接链接，或你需要一个仪表盘 URL 随 API 操作结果一起返回时使用。”

---

## 联系人

### [批量删除联系人](references/contacts/bulk-delete-contacts.md)
使用基于筛选的批量删除来删除多个联系人。涵盖安全删除模式、GDPR 合规、软删除替代方案和批处理策略。

### [批量标记和取消标记联系人](references/contacts/bulk-label-and-unlabel-contacts.md)
创建联系人标签定义，或为匹配的联系人添加/移除标签。仅创建标签时用 Find or Create Label；仅当用户请求联系人分配时才用批量标记。

### [创建联系人](references/contacts/create-a-contact.md)
使用 Contacts API 创建联系人。涵盖最少的标识字段、`email` 和 `phone` 的单对象形态，以及用州、地区和省代码所需的 ISO 3166-2 细分格式添加实际地址。

### [更新联系人](references/contacts/update-a-contact.md)
使用 Contacts API 更新现有联系人的电子邮件、电话、姓名或地址。涵盖当用户按名称标识联系人时定位该联系人、传入其当前修订，以及州、地区和省代码所需的 ISO 3166-2 细分格式。

### [联系人仪表盘导航](references/contacts/contacts-dashboard-navigation.md)
“构建指向 manage.wix.com 上 Wix 联系人（CRM）仪表盘页面的直接链接——联系人列表、特定联系人的查看页面、联系人导入和细分页面。将每个主要联系人实体与其读取 API 配对，以便你获取实体并交回一个‘在你的仪表盘中查看’的链接。当用户询问某物在 Wix 仪表盘中的位置、想要某个仪表盘页面的直接链接，或你需要一个仪表盘 URL 随 API 操作结果一起返回时使用。”

---

## 仪表盘导航

**仪表盘 URL 是配方数据，而非通用知识。** 一个 `manage.wix.com` 路由是应用注册的 slug，不出现在任何 API 参考中，也不能从实体名称或其 API 路径派生（Forms 页面位于 `wix-forms` 下，而非 `contacts/forms`；Stores 产品位于 `wix-stores/products` 下）。因此对于**每一个**仪表盘链接请求——即使是不需要 API 调用的，也即使某个路由感觉显而易见——打开下面该解决方案的仪表盘导航配方并复制其表格中的路由。从记忆作答正是这些配方要防止的失败模式。

### [仪表盘导航](references/dashboard-navigation/dashboard-navigation.md)
“构建进入站点 Wix 仪表盘（manage.wix.com）直接链接的入口点。记录所有仪表盘页面的共享 URL 结构（站点级和账户级、应用 ID 回退、实体深链接、机器可读的 routes.json），并为每个覆盖的解决方案路由到按业务解决方案的配方——预订、商店/ecommerce、活动、博客、定价计划、餐厅、CMS、联系人、表单、营销、收款、分析、google ads、应用管理、站点设置、站点和域名。当用户询问某物在 Wix 仪表盘中的位置、想要某个仪表盘页面的直接链接，或你需要一个仪表盘 URL 随 API 操作结果一起返回时使用。”

---

## 域名

### [检查域名可用性](references/domains/check-domain-availability.md)
回答某个域名或同时多个域名是否可通过 Wix 注册——一个独立的“example.com 可用吗？”问题，无购买或连接请求。

### [域名搜索、购买和连接](references/domains/domain-search-purchase-and-connect.md)
通过 Wix 购买域名或连接用户已拥有的域名——意图、建议、站点解析、注册、隐私、购物车和结账，以及包括所有权查询和将域名绑定到站点的连接路径。此处不进行可用性检查：它们都使用 Check Domain Availability。

### [域名仪表盘导航](references/domains/domains-dashboard-navigation.md)
“构建指向 manage.wix.com 上域名管理页面的直接链接——站点级域名设置页面和账户级 My Domains 页面。将域名搜索/购买与其读取 API 配对。当用户询问某物在 Wix 仪表盘中的位置、想要某个仪表盘页面的直接链接，或你需要一个仪表盘 URL 随 API 操作结果一起返回时使用。”

---

## eCommerce

**路由——选择正确的入口点：**
- **任何销售/业务改进请求**（提升销售、促销、帮助我的业务、节日优惠、提升收入、折扣、配送、优惠券、清仓、礼品卡）→ 使用 [Recommend: eCommerce Strategy](references/ecommerce/recommend-ecommerce-strategy.md)。这是**默认入口点**——它分析所有领域（折扣、配送、礼品卡）并生成跨领域建议。不要提出澄清问题。
- **流量获取不是 eCommerce 策略请求**（“增长我的流量”、SEO、广告、社交、内容）→ 不要使用 Recommend: eCommerce Strategy；它只转化商店已有的访客。将这些路由到营销。
- **定价与促销**（优惠券、折扣规则、缎带、促销）→ 使用 [Pricing & Promotions](references/ecommerce/ecom-pricing.md) 分派器。
- **配送设置**（费率、区域、自提、免费配送、修复覆盖）→ 使用 [Shipping](references/ecommerce/ecom-shipping.md) 分派器。
- **礼品卡**（“我应该卖礼品卡吗”、“添加一张礼品卡”、“我的礼品卡应该有哪些金额”）→ 这些是建议，因此它们走 [Recommend: eCommerce Strategy](references/ecommerce/recommend-ecommerce-strategy.md)，后者激活其 GIFT_CARDS 领域并自行加载礼品卡目标。发放/兑换单张礼品卡是 Gift Cards API，而非建议。

### [eCommerce：加载上下文](references/ecommerce/ecom-load-context.md)
**L1 加载器**——加载每个 eCommerce 类别所需的通用站点数据（siteId、国家、货币、行业、目录分析）。每个类别分派器在标签匹配前加载它；每会话运行一次。

### [Recommend: eCommerce Strategy](references/ecommerce/recommend-ecommerce-strategy.md)
**所有 eCommerce 建议请求的入口点。** 分析所有领域（折扣 + 配送 + 礼品卡）站点数据的统一技能，生成至多 5 条跨领域建议，并将它们持久化到跟踪数据库。涵盖折扣策略（季节性、追加销售、清库存、捆绑）、配送优化（覆盖缺口、免费配送、费率策略、承运商备份），以及销售礼品卡（从站点自身 AOV 和目录价格确定面额）。用于关于从现有访客赚更多的业务改进请求。**流量获取（SEO、广告、社交、内容）超出范围**——将“增长我的流量”路由到营销。

### [Pricing & Promotions](references/ecommerce/ecom-pricing.md)
将折扣、优惠券、促销和捆绑路由到促销配方，并将视觉产品缎带路由到 Catalog Ribbons API。为混合的定价/退款/支付/产品价格/配送请求加载此分派器以选择合适的 API。

### [Shipping](references/ecommerce/ecom-shipping.md)
**分派器**——将配送设置请求（费率、区域、自提、免费配送、修复覆盖、优化费率）路由到正确的叶子配方。Shipping Options + Delivery Profiles API 没有公开文档页面；`ecom-shipping-api.md` 是权威的内联参考。

<details>
<summary>内部技能（由上面的分派器 / 编排器自动加载——请勿直接使用）</summary>

#### 定价与促销叶子（由 Pricing 分派器或策略编排器加载）
- [Pricing: Create Coupon](references/ecommerce/pricing-promotions/ecom-pricing-create-coupon.md)
- [Pricing: Create Discount Rule](references/ecommerce/pricing-promotions/ecom-pricing-create-discount-rule.md)
- [Pricing: Discount Not Applying](references/ecommerce/pricing-promotions/ecom-pricing-troubleshoot-not-applying.md)
- 目标：[Increase AOV](references/ecommerce/pricing-promotions/ecom-pricing-goal-increase-aov.md)、[Clear Inventory](references/ecommerce/pricing-promotions/ecom-pricing-goal-clear-inventory.md)、[Seasonal Revenue](references/ecommerce/pricing-promotions/ecom-pricing-goal-seasonal-revenue.md)、[Drive Cross-Sells](references/ecommerce/pricing-promotions/ecom-pricing-goal-drive-cross-sells.md)
- 流程：[Upsell Boost](references/ecommerce/pricing-promotions/ecom-pricing-flow-upsell-boost.md)、[Bundle and Save](references/ecommerce/pricing-promotions/ecom-pricing-flow-bundle-and-save.md)、[Stock Mover](references/ecommerce/pricing-promotions/ecom-pricing-flow-stock-mover.md)、[Seasonal Promotion](references/ecommerce/pricing-promotions/ecom-pricing-flow-seasonal-promotion.md)

#### 礼品卡叶子（在策略编排器激活 GIFT_CARDS 领域时由它加载）
- [Goal: Sell Gift Cards](references/ecommerce/gift-cards/ecom-gift-cards-goal-sell-gift-cards.md)——现有产品门（每个站点一个）、资格、从 AOV / 目录价格确定面额、默认无到期政策，以及映射到 Create Gift Card Product

#### 配送叶子（由 Shipping 分派器加载）
- [Set Up Rates](references/ecommerce/shipping/ecom-shipping-setup-rates.md)
- [Set Up Regions](references/ecommerce/shipping/ecom-shipping-setup-regions.md)
- [Set Up Pickup / Local Delivery](references/ecommerce/shipping/ecom-shipping-setup-pickup.md)
- [Add Free Shipping](references/ecommerce/shipping/ecom-shipping-free-shipping.md)
- [Optimize Rates](references/ecommerce/shipping/ecom-shipping-optimize-rates.md)
- [Fix Coverage Gaps](references/ecommerce/shipping/ecom-shipping-fix-coverage.md)
- [API Reference](references/ecommerce/shipping/ecom-shipping-api.md)——Shipping Options + Delivery Profiles 的内联规范

#### 跨领域跟踪
- [API: Recommendation Tracking](references/ecommerce/api-recommendation-tracking.md)——在生成任何建议**之前**加载；持久化 PROPOSED 状态并跟踪 MarkExecuting → MarkDone/MarkFailed。

</details>

> eCommerce 表面（订单、废弃结账、礼品卡、配送、税费、结账设置）的仪表盘链接在 [Stores Dashboard Navigation](references/stores/stores-dashboard-navigation.md)。

---

## 捐赠

### [创建和更新捐赠活动](references/donations/create-and-update-donation-campaigns.md)
创建、检查、更新和归档 Wix Donations 活动，包括建议金额和影响文本、自定义限制、捐赠频率、目标、捐赠者备注、费用覆盖和图像。

---

## 活动

### [使用 Wix Events API 创建活动](references/events/create-wix-event.md)
“使用 Wix Events V3 API 创建活动——一次性或经常性、RSVP、售票、免注册或带外部注册——包括日期和时间、场地或在线位置、宾客限制、描述和门票层级。涵盖确切的字段形态以及 API 容易误导的验证消息。当用户想要创建或设置一个活动、一个仅信息活动或一个重复活动时使用——包括在场地或在线按固定日期举办的每周工作坊、课程或聚会系列；Bookings 课程或培训课程则按场次预订。”

### [管理 Wix 活动——发布、取消、克隆和计数](references/events/manage-wix-events.md)
“使用 Wix Events V3 API 对已存在的 Wix 活动进行操作——查找、更新（日期、场地、详情、页面设置）、控制注册（关闭、重新开放、免注册、外部、仅会员、限制）、在 RSVP 和售票之间切换（一个新活动——创建前询问）、发布、取消、删除、克隆和计数，包括经常性活动的单次场次。用于关闭注册、移动或取消活动，或更改宾客注册方式。”

### [管理活动门票](references/events/manage-event-tickets.md)
“使用 Ticket Definitions V3 API 管理售票 Wix 活动的门票类型——添加、编辑、重新定价、隐藏、重新排序和删除门票，安排或结束售票，以及更改门票货币。当用户想要为现有活动添加早鸟票、VIP 票、儿童票或捐赠票，更改门票价格或数量，或设置门票停止销售的时间时使用。”

### [管理活动宾客](references/events/manage-event-guests.md)
“管理为 Wix 活动注册的人——RSVP 活动上的 RSVP，以及售票活动上的订单、门票和持票人：列出并计数宾客、添加或移除宾客、更改 RSVP、为宾客签到，以及将订单标记为已支付。当用户询问谁要来或有多少人注册，或想要添加、移除或签到宾客时使用。注明了 API 无法做的事情，例如退款和重发邮件。”

### [活动仪表盘导航](references/events/events-dashboard-navigation.md)
“构建指向 manage.wix.com 上 Wix 活动仪表盘页面的直接链接——已发布和草稿活动列表、新建活动、类别、员工、经常性系列的场次，以及单个活动的页面：概览、编辑、门票、宾客（RSVP 或售票）、订单、日程、注册设置和表单以及策略。将每个活动实体与其读取 API 配对，以便你获取实体并交回一个‘在你的仪表盘中查看’的链接。当用户询问某物在 Wix 仪表盘中的位置、想要某个仪表盘页面的直接链接，或你需要一个仪表盘 URL 随 API 操作结果一起返回时使用。”

### [活动注册表单](references/events/event-registration-form.md)
“使用 Events Form API 自定义 Wix 活动的注册表单——添加、编辑、重新排序和移除问题、附加宾客字段，以及宾客在注册后或注册关闭时看到的消息。当用户想要在活动的 RSVP 或结账表单上添加或要求某个问题、允许宾客带一名同行者，或改写确认消息时使用。”

### [活动日程、策略和类别](references/events/event-schedule-policies-and-categories.md)
“配置 Wix 活动页面周围出现的内容——日程或议程、宾客接受的策略（条款、退款）和活动类别。当用户想要为活动添加议程或时间表、添加条款或退款政策，或将活动分组到工作坊或音乐会等类别时使用。”

---

## 表单

### [创建表单](references/forms/create-form.md)
“使用 Form Schemas v4 创建访客可填写的 Wix 表单——联系或问询表单、注册或候补名单、申请、调查、报价请求，以及提交会创建联系人的表单。随附完整的创建请求，以及 Wix 支持的每种类型的字段表——下拉、选择、文件上传、评分、地址、支付，以及产生空或不可见表单的静默破坏点。更改已存在的表单是 Update Form。”

### [更新表单](references/forms/update-form.md)
“使用 Form Schemas v4 `PATCH` 更改已存在的 Wix 表单——向我的表单添加字段、添加下拉、使字段必填或可选、重命名标签、重新排序或停用问题。涵盖为表单的 `revision` 回读表单（以及必需的 `namespace` 查询参数）、`PATCH` 所需的整表单正文、会静默软删除你省略的任何内容的整体 `formFields` 替换、就地更改字段的组件类型、停用已有提交的字段，以及证明存储内容的回读。当表单存在且请求更改其收集内容时使用；当还没有表单时使用 Create Form。”

### [读取表单和提交](references/forms/read-forms-and-submissions.md)
“读取站点的 Wix 表单以及访客向它们发送的提交——我有哪些表单、按名称查找表单、显示最新提交、谁填写了我的联系表单、我上周收到了多少提交、来自一个联系人的提交、未读提交。涵盖查找表单的命名空间而非猜测它、该命名空间在每次读取中的位置、Form Schemas 和 Form Submissions 端点（以及会 404 的形似 URL）、默认列表中隐藏的表单、可用于筛选和排序的提交字段的封闭列表、日期范围、游标分页、每个表单的合计，以及按字段读取答案。只读；更改表单是 Update Form，构建一个是 Create Form。”

### [表单仪表盘导航](references/forms/forms-dashboard-navigation.md)
“构建指向 manage.wix.com 上 Wix 表单仪表盘页面的直接链接。这些路径不可猜测且不出现在任何 API 参考中，因此从这里获取：在 `https://manage.wix.com/dashboard/{metaSiteId}/` 下，表单列表是 `wix-forms`，表单的构建器是 `wix-forms/form/{formId}`，该表单的提交是 `wix-forms/form/{formId}/submissions`——没有全站提交页面，也没有任何内容位于 `contacts/forms`、`forms`、`form-builder` 或 `wix-forms-and-payments`（旧版应用）下。还涵盖独立表单，以及每个表单实体的仪表盘链接；读取表单和提交是 Read Forms and Submissions。”

---

## 收款

### [创建支付链接](references/get-paid/create-payment-links.md)
创建用于无需结账流程收款的支付链接。涵盖商店产品（目录项）、自定义行项目、变体、到期日以及通过电子邮件发送链接。

### [如何设置 Wix Payments](references/get-paid/how-to-setup-wix-payments.md)
配置 Wix Payments 作为支付提供者。涵盖资格检查、业务验证、银行账户设置和支付方式配置（卡、PayPal、Apple Pay）。

### [用于预订的支付链接](references/get-paid/payment-links-for-bookings.md)
使用 Payment Links API 为未支付预订创建支付链接。将预订 ID 与支付请求链接，并正确处理重定向。

### [收款仪表盘导航](references/get-paid/get-paid-dashboard-navigation.md)
“构建指向 manage.wix.com 上 Wix 支付和开票仪表盘页面的直接链接——支付链接、发票（列表、创建、设置）、经常性发票以及接受支付设置页面。将每个主要收款实体与其读取 API 配对，以便你获取实体并交回一个‘在你的仪表盘中查看’的链接。当用户询问某物在 Wix 仪表盘中的位置、想要某个仪表盘页面的直接链接，或你需要一个仪表盘 URL 随 API 操作结果一起返回时使用。”

---

## Google Ads

**路由——站点的 Google 付费广告活动（Smart & Performance Max）。** 所有流程都需要一个 Google Ads 账户，通过设置配方一次性创建。预算以 micros 计（1,000,000 = 1 个货币单位）。REST 基址：`https://www.wixapis.com/_serverless/pa-google/v1`。
- **首次设置 / “连接 Google Ads” / `ACCOUNT_NOT_FOUND`** → [安装并创建账户](references/google-ads/install-and-create-account.md)（在任何其他事情之前执行此操作）。
- **建议关键词 / 地域 / 预算 / 广告文案 / 图像** → [获取 AI 活动建议](references/google-ads/get-campaign-suggestions.md)。
- **改进现有活动 / 查看接下来修复什么 / Campaign Success Guide / 标记或重新打开建议** → [管理 Campaign Success Guide](references/google-ads/manage-campaign-success-guide.md)。
- **创建多渠道 / 潜在客户开发 / Shopping 活动** → [创建 Performance Max 活动](references/google-ads/create-performance-max-campaign.md)。
- **暂停 / 恢复 / 启动 / 更新预算 / 删除 / 历史** → [管理活动生命周期](references/google-ads/manage-campaign-lifecycle.md)。
- **表现、转化、搜索词、按产品 / 按资产指标** → [查询活动表现分析](references/google-ads/query-campaign-analytics.md)。
- **广告支出、费用、即将产生的扣费、信用余额** → [检索账单和支付详情](references/google-ads/billing-and-payment.md)。

### [安装 Google Ads 并创建账户](references/google-ads/install-and-create-account.md)
“在 Wix 站点上投放 Google 付费广告的一次性设置：安装 Wix Google Ads 应用，然后创建每个活动、建议和分析调用都依赖的 Google Ads 账户。涵盖检查账户是否已存在、选择货币、可选附加促销激励（信用优惠）、链接 Google Merchant Center 账户以及删除账户。当用户想要‘设置 Google Ads’、‘连接 Google Ads’、‘开始在 Google 上做广告’、‘创建 Google Ads 账户’，或在创建活动前遇到 ACCOUNT_NOT_FOUND / 应用未安装错误时使用。Google Ads REST API，基址 https://www.wixapis.com/_serverless/pa-google/v1。”

### [获取 Google Ads 的 AI 活动建议](references/google-ads/get-campaign-suggestions.md)
“Wix 站点上 Google Ads Suggestions API 的参考：帮助构建有效活动的 AI/Google 生成输入——关键词主题（来自 URL 或自动完成）、地理目标选项、低/推荐/高每日预算层级（附估计点击）、PMAX 预算建议、文本资产（标题/描述）、AI 图像资产（自动上传到 Wix Media）、搜索主题、促销激励优惠，以及从活动简述生成完整的 AI 活动配置。当用户询问‘为我的广告建议关键词’、‘我应该用什么预算’、‘我应该定位哪里’、‘生成广告文案/标题’、‘生成广告图像’、‘建议一个完整活动’，或创建活动流程需要建议值时使用。REST 基址 https://www.wixapis.com/_serverless/pa-google/v1。”

### [创建并启动 Performance Max 活动](references/google-ads/create-performance-max-campaign.md)
“为 Wix 站点创建并启动 Google Ads Performance Max (PMAX) 活动——一个基于目标的、跨所有 Google 渠道（Search、Display、YouTube、Gmail、Discover、Maps）运行的活动，由一个标题、描述、图像以及（对于 PMAX Leads）搜索主题信号的资产组构成。涵盖生成 AI 文本和图像资产、生成搜索主题、获取 Google 预算建议、用必需的最少资产组装资产组、选择 PERFORMANCE_MAX 与 PERFORMANCE_MAX_LEADS（潜在客户：电话/表单目标、否定关键词、28 天学习）与零售/Shopping（Merchant Center 源），以 PAUSED 创建并启动。用于‘创建一个 Performance Max 活动’、‘PMAX’、‘在所有 Google 上投放广告’、‘潜在客户开发 Google 活动’或‘Google Shopping 广告’。需要现有的 Google Ads 账户。REST 基址 https://www.wixapis.com/_serverless/pa-google/v1。”

### [管理活动生命周期](references/google-ads/manage-campaign-lifecycle.md)
“管理 Wix 站点上现有的 Google Ads 活动：列出/获取、启动（首次激活）与恢复（暂停后重新激活）、暂停运行中的活动——可选带计划的自动恢复日期——更新名称/预算/定位、更改每日预算、永久删除，以及读取状态历史 / 变更日志。当用户想要‘暂停我的 Google 广告’、‘恢复我的活动’、‘停止活动’、‘更改我的每日预算’、‘重命名活动’、‘删除此活动’、‘列出我的 Google Ads 活动’或‘为什么我的活动状态变了’时使用。需要现有的 Google Ads 账户和活动。REST 基址 https://www.wixapis.com/_serverless/pa-google/v1。”

### [管理 Campaign Success Guide](references/google-ads/manage-campaign-success-guide.md)
“用于现有 Wix Google Ads Performance Max Leads 活动的 Campaign Success Guide。在创建受支持的活动后使用，即使它仍在学习或没有指标，也每当用户询问如何改进活动、接下来修复什么、查看指南或标记或重新打开建议时使用。涵盖活动和站点选择；按优先级排序的可操作建议；去重的、目的地特定的 Editor 和 Google Ads 导航；在批准后提出执行受支持的工作；Merchant Center 和 Business Profile 连接跟进；以及建议状态跟踪。”

### [查询活动表现分析](references/google-ads/query-campaign-analytics.md)
“读取 Wix 站点上 Google Ads 活动的表现分析：带可选上一周期比较和趋势的每日表现指标（展示、点击、CTR、成本、潜在客户、电话）；来自 Wix Analytics 的转化指标（订单、收入、潜在客户、CPL、ROAS）；触发活动广告的搜索词；零售活动的按产品购物表现；以及 PMAX Leads 的按资产表现（标题、描述、图像）。解释何时使用 campaignResourceName 与 Wix campaignId、dateRange 形态、字段枚举、排序和分页。当用户询问‘我的活动表现如何’、‘显示广告表现’、‘哪些搜索词触发了我的广告’、‘哪些产品/资产表现最好’、‘活动 ROI/ROAS’或‘我的 Google 广告带来的转化’时使用。REST 基址 https://www.wixapis.com/_serverless/pa-google/v1。”

### [检索 Google Ads 账单和支付详情](references/google-ads/billing-and-payment.md)
“检索 Wix 站点 Google Ads 账户的账单和支付详情：当前账单周期的广告支出（用量）、Wix 服务费、总扣费、任何促销优惠券调整、账单周期日期，以及账户的信用余额（正 = 可用信用，负 = 尚未扣费的未偿债务）。还解释从账户对象读取当前与剩余预算。当用户询问‘我在 Google Ads 上花了多少’、‘我的下一笔 Google Ads 扣费是什么’、‘显示我的广告账单’、‘我还有广告信用吗’、‘为什么我被扣费’或‘即将到来的 Google Ads 支付’时使用。需要现有的 Google Ads 账户。REST 基址 https://www.wixapis.com/_serverless/pa-google/v1。”

### [Google Ads 仪表盘导航](references/google-ads/google-ads-dashboard-navigation.md)
“构建指向 manage.wix.com 上 Wix Google Ads 仪表盘页面的直接链接，在那里管理通过 Google Ads API 配方创建的活动。当用户询问某物在 Wix 仪表盘中的位置、想要某个仪表盘页面的直接链接，或你需要一个仪表盘 URL 随 API 操作结果一起返回时使用。”

---

## Google Business Profile

**路由——业务在 Google 搜索和地图上的呈现方式。** Google 连接是所有 Google 支持的位置工作的前提：先检查它，并将“连接 / 重新连接 / 断开 Google”路由到连接配方。

### [将 Wix 站点连接到 Google Business Profile](references/google-business-profile/connect-google-business-profile.md)
将经过认证的 Wix 站点连接到 Google Business Profile 账户、检查现有连接是否仍可用、恢复存储凭据已丢失的连接、切换到另一个 Google 账户或断开连接。站点所有者通过一次性连接 URL 在其自己的浏览器中授权；智能体绝不自行完成 Google 授权。在任何会永久移除站点已导入位置的重新连接之前发出警告。

### [为 Wix 站点管理 Google Business Profile 位置](references/google-business-profile/manage-google-business-profile-locations.md)
将 Google Business Profile 位置导入经过认证的 Wix 站点，无论有无实时 Google 数据都列出并查询它们，通过各自正确的方法更新 Wix 侧和 Google 侧详情，创建新的 Google 商家信息，检查某个资料是否实际在 Google 上线，以及从 Wix 移除位置或删除其 Google 商家信息。先检查站点的 Google 连接，并将缺失的连接报告为设置步骤，在破坏性或 Google 可见的写入之前发出警告，并尊重 Google 的共享速率预算。

---

## 营销

### [创建并发布社交媒体帖子](references/marketing/create-and-publish-social-post.md)
“创建社交媒体帖子的端到端流程，其文本为你撰写或你自己提供，并使用 Wix Publisher API 发布或安排到站点已连接的渠道（Instagram、Facebook、LinkedIn、X/Twitter、TikTok、Pinterest、YouTube、Google Business Profile）。可以从自由文本想法或站点自身资产（产品、博客文章、活动、预订、优惠券、类别）编写完整的按渠道帖子，附带你自己的图像，并建议说明文字和标题。先与你确定帖子内容，然后确认渠道已连接、检查高级配额、创建草稿，并立即发布或安排它。用于‘创建帖子’、‘从我的产品/想法生成帖子’、‘写一条说明文字’、‘说明文字想法/建议’、‘发到 Instagram/Facebook/TikTok’、‘连接我的 Instagram/Pinterest/LinkedIn’或‘安排一个帖子’。”

### [生成营销计划并安排其帖子](references/marketing/generate-and-publish-marketing-plan.md)
“使用 Wix Marketing Plan API 生成站点社交媒体营销计划并安排其返回的帖子草稿的端到端流程。建议在首次生成前配置营销设置（目标、语气、节奏、内容支柱）、异步生成计划、轮询直到就绪，然后安排 DRAFT 帖子。包括为额外活动生成帖子。用于‘生成一个营销计划’、‘创建社交媒体计划/日历’或‘安排我计划的帖子’请求。”

### [营销仪表盘导航](references/marketing/marketing-dashboard-navigation.md)
“构建指向 manage.wix.com 上 Wix 营销仪表盘页面的直接链接——社交帖子中心（跨已连接渠道的草稿、已安排和已发布帖子）、帖子设计模板、已保存设计，以及电子邮件营销页面（活动列表、活动模板、活动分析）。将每个主要营销实体（社交帖子项、已连接社交账户、营销计划帖子、电子邮件活动）与其读取 API 配对，以便你获取实体并交回一个‘在你的仪表盘中查看’的链接。当用户询问某物在 Wix 仪表盘中的位置、想要某个仪表盘页面的直接链接，或你需要一个仪表盘 URL 随 API 操作结果一起返回时使用。”

---

## 媒体

### [将媒体上传到 Wix](references/media/upload-media-to-wix.md)
使用 Import File API 将图像和文件上传到 Wix Media Manager。涵盖从外部 URL 导入、检查文件状态，以及在其它 API 中使用返回的 wixstatic.com URL。

### [用 AI 生成图像](references/media/generate-image-with-ai.md)
使用 Wix AI API（Runware）从文本提示生成图像。返回一个短期 URL，必须导入才能保留——导入是 Upload Media to Wix 的职责，本配方将其移交。涵盖选择模型及其成本/延迟/内容过滤权衡、可接受的输出尺寸、按模型的批量限制、每次调用消耗的 AI 信用，以及为什么内容拒绝会以成功响应且无图像的形式到达。

---

## 定价计划

### [创建和更新定价计划](references/pricing-plans/create-and-update-pricing-plans.md)
使用 Plans API 创建订阅和一次性支付计划。涵盖定价模型（经常性、一次性、免费）、试用期、权益配置和计划可见性。

### [定价计划预订集成](references/pricing-plans/pricing-plans-bookings-integration.md)
使用 Benefit Programs API 将 Pricing Plans 链接到 Bookings 服务。支持授予预订访问权限的套餐交易和会员。

### [定价计划仪表盘导航](references/pricing-plans/pricing-plans-dashboard-navigation.md)
“构建指向 manage.wix.com 上 Wix 定价计划仪表盘页面的直接链接——计划列表、创建计划、编辑计划、记录手动订单和设置。将每个主要定价计划实体（计划、订单）与其读取 API 配对，以便你获取实体并交回一个‘在你的仪表盘中查看’的链接。当用户询问某物在 Wix 仪表盘中的位置、想要某个仪表盘页面的直接链接，或你需要一个仪表盘 URL 随 API 操作结果一起返回时使用。”

---

## 餐厅

### [Wix Restaurants 设置](references/restaurants/wix-restaurants-setup.md)
使用 Menus API 配置餐厅菜单、分区和项。涵盖菜单结构（Menu → Section → Item）、两步项修饰符 / 修饰符组流程、定价、可用性日程和点餐设置。

### [餐厅仪表盘导航](references/restaurants/restaurants-dashboard-navigation.md)
“构建指向 manage.wix.com 上 Wix 餐厅仪表盘页面的直接链接——菜单、菜单项、在线订单板、在线点餐履行设置（自提、配送、堂食）、预订列表、平面图和预订体验设置。将每个主要餐厅实体（菜单、分区、项、订单、预订）与其读取 API 配对，以便你获取实体并交回一个‘在你的仪表盘中查看’的链接。当用户询问某物在 Wix 仪表盘中的位置、想要某个仪表盘页面的直接链接，或你需要一个仪表盘 URL 随 API 操作结果一起返回时使用。”

---

## 富内容

> **路由规则（先读）。** 对于每个要求为 Blog、Stores、Events 或 CMS 手工编写、输出或返回 Ricos / `richContent` JSON（`nodes` 树）的请求，在使用 API 架构搜索、转换/验证 API 或记忆之前，使用可用的完整文档读取能力检索并阅读规范的 [Author Ricos Rich Content](references/rich-content/author-ricos-rich-content.md) 配方。当用户仅要求 JSON 时这也适用。

### [Ricos 转换器服务](references/rich-content/ricos-converter-service.md)
使用 Ricos Documents API 在 Ricos 文档与 HTML/Markdown/纯文本之间验证和转换内容。涵盖插件配置、双向格式转换和文档验证。

### [编写 Ricos 富内容](references/rich-content/author-ricos-rich-content.md)
用于手工编写有效 Ricos 富内容 JSON（richContent/nodes 树）的权威配方，该 JSON 用于 Wix 博客文章、Stores 产品描述、Events 和 CMS 富文本字段。每当用户要求创建、输出或返回 Ricos、richContent 或 nodes-tree JSON 时使用；在 API 架构搜索或构造 JSON 之前检索并阅读此完整配方。涵盖段落、标题、列表、块引用、分隔线、表格、代码块、图像、按钮、音频、视频、画廊、可折叠列表、HTML 嵌入、内联装饰和嵌套规则。

---

## 站点属性

### [配方：通过 Site Properties API 更改站点的区域属性（货币、时区、语言）](references/site-properties/change-payment-currency-site-properties.md)
“使用 Site Properties API 更新站点级支付货币（商店计费货币），包括必需的请求正文形态和字段掩码。涵盖站点时区和主要语言；字段掩码命名顶层属性。”

### [站点设置仪表盘导航](references/site-properties/site-properties-dashboard-navigation.md)
“构建指向 manage.wix.com 上站点设置仪表盘页面的直接链接——设置中心、网站设置以及语言和区域。将站点属性与 Site Properties 读取 API 配对。当用户询问某物在 Wix 仪表盘中的位置、想要某个仪表盘页面的直接链接，或你需要一个仪表盘 URL 随 API 操作结果一起返回时使用。”

---

## 协作者

### [管理站点协作者](references/collaborators/manage-site-collaborators.md)
管理谁以协作者（贡献者）身份拥有对 Wix 站点的访问权限——查找站点的当前协作者、邀请某人、移除协作者，以及重发或撤销待处理的协作者邀请。当用户想要授予某人站点访问权限、撤销它，或跟进一个尚未被接受的邀请时使用。

---

## 站点

### [从模板创建站点](references/sites/create-site-from-template.md)
使用账户级 API 从模板创建新的 Wix 站点。涵盖模板搜索、站点创建和发布。不适用于无头站点。

### [创建无头站点](references/sites/create-headless-site.md)
创建 Wix Headless 网站：用户 Wix 账户中的一个站点，其前端是上传到 Wix 托管文件，其后是通过 API 访问的 Wix 业务后端。站点由 Upload a Website or HTML Files 创建并将其页面置为上线；随后 Wix 业务解决方案（商店、博客、预订等）由 Wix Headless kit 从其冷启动集成到其中。

### [管理 OAuth 应用](references/sites/manage-oauth-apps.md)
为 Wix 无头站点创建、读取、更新和查询 OAuth 应用。每个 OAuth 应用的 id 是前端用于铸造匿名访客令牌和调用 Wix API 的 client_id。

### [查询站点](references/sites/query-sites.md)
列出、计数并查找 Wix 账户中的站点。涵盖无头站点的命名空间筛选、枚举前先计数、游标分页以及按名称解析站点。

### [读取账户或站点上下文](references/sites/read-site-context.md)
一次调用探测 Wix 站点或账户以获取完整上下文——按显示名称的已安装应用、区域设置、货币、时区和状态。账户令牌 + siteId 针对一个站点；仅账户令牌返回至多 10 个；仅站点范围令牌返回其所限定的站点。

### [向 Wix 发送反馈](references/sites/send-feedback-to-wix.md)
将用户关于使用 Wix 构建（API、文档、配方、Wix MCP 和工具）的反馈转达给 Wix，归属于经过认证的用户。涵盖何时提供它、如何编写 Wix 可据以行动的消息，以及发送它的调用。当用户要求向 Wix 报告某些内容、对某个 Wix API 或流程感到沮丧，或某配方的流程不达标时使用。不是支持渠道，也不用于用户自己的站点内容。

### [站点导入](references/sites/site-import.md)
驱动 Wix Site Import 智能体将现有商店或站点从另一平台（Shopify、WooCommerce、Magento 或任何 URL）迁移到 Wix——作为一个全新站点或迁移到用户的现有站点——或从没有源站点的 CSV/TSV 导出文件导入。每当用户想要将商店/站点导入、迁移或克隆到 Wix、提到离开 Shopify/WooCommerce/Magento，或给出源商店 URL 并要求将其带入 Wix 时使用本技能。涵盖启动导入、轮询进度、回答智能体导入中途的问题、处理部署/失败/认证过期状态，以及发送部署后的后续变更。

### [站点仪表盘导航](references/sites/sites-dashboard-navigation.md)
“构建指向 manage.wix.com 上账户级站点页面的直接链接——My Sites 列表（账户中的所有站点）和每个站点自己的仪表盘。将站点列表与 Query Sites 读取 API 配对。当用户询问某物在 Wix 仪表盘中的位置、想要某个仪表盘页面的直接链接，或你需要一个仪表盘 URL 随 API 操作结果一起返回时使用。”

### [上传网站或 HTML 文件](references/sites/upload-static-site.md)
将 HTML、CSS、JavaScript 或静态构建发布为 Wix Headless 网站；检查其已部署文件并在同一站点和 URL 上编辑它们。涵盖文件和 ZIP 上传、保留其他文件的选择性添加、替换和删除、整站替换、经过认证和匿名发布、验证以及连接 Wix 业务后端；Wix Astro 构建作为服务端渲染站点发布，而非 drop。用于用户提供的文件或你为他们创建的页面。不用于通过 URL 或 CSV 从另一平台迁移动态站点（使用 Site Import）、在编辑器构建的 Wix 站点中嵌入代码，或向 Media Manager 上传资产。

---

## 商店

### [更改商店货币](references/stores/change-store-currency.md)
通过 Site Properties 更改商店的支付货币，并解释目录响应中货币更新的延迟。

### [向站点添加商店页面](references/stores/add-store-pages-to-site.md)
当安装 Stores 应用时，向站点添加缺失的结账和购物车页面。用于迁移或设置问题后商店页面缺失的情况。

### [创建产品（Catalog V1）](references/stores/create-product-catalog-v1.md)
使用 Catalog V1 Products API 创建产品。当站点的目录版本是 CATALOG_V1 时使用此配方。涵盖简单产品创建、带选项的产品，以及 V1 与 V3 的关键请求结构差异。

### [创建产品（Catalog V3）](references/stores/create-product-catalog-v3.md)
每个 Wix Stores Catalog V3 创建产品请求的强制首个配方。在任何变更之前，要求每个产品有明确的名称和价格；缺失价格绝不是 0。如果未识别产品，提供图像上传和文本描述两条路径并停止。如果名称或价格缺失，询问或提供建议并停止。当两者都存在时，从提供的详情创建，无需可选充实。涵盖单个/批量创建、库存、实体/数字产品、图像、选项、变体、SKU 和验证。

### [查找产品（查询和搜索，Catalog V3）](references/stores/find-products-query-and-search-catalog-v3.md)
使用 Catalog V3 Search Products 和 Query Products 端点从 Wix Store 查找、搜索、查询和列出产品。解释何时使用每个端点、正确的字段枚举值、筛选（包括按价格）、排序和分页。

### [查询产品（Catalog V1）](references/stores/query-products-catalog-v1.md)
使用 Catalog V1 Query Products 端点从 Wix Store 查询和列出产品。当站点的目录版本是 CATALOG_V1 时使用此配方。涵盖基本查询、筛选、排序和分页。

### [更新产品预购（Catalog V3）](references/stores/update-product-pre-order.md)
使用 V3 Inventory API 管理产品变体的预购设置。涵盖启用/禁用预购、设置消息、配置限制以及处理 trackQuantity 要求。

### [带选项更新产品（Catalog V3）](references/stores/update-product-with-options.md)
现有 Catalog V3 产品更新的起点，包括在加入购物车时以 ITEM_NOT_FOUND_IN_CATALOG 失败的数字产品。包括在一个流程中的名称查找、Get Product 和 PATCH，以及导入提供的 PDF 并将其附加到现有变体。涵盖选项、变体价格和 SKU、以站点重量单位计的变体运输重量、产品可见性（通过 `visible` 隐藏/取消隐藏，绝不删除）、保留 Rich Content 的描述编辑，以及基于修订的更新。仅当本流程未覆盖某个字段或操作时才阅读另一个配方。

### [商店仪表盘导航](references/stores/stores-dashboard-navigation.md)
“构建指向 manage.wix.com 上 Wix Stores 和 eCommerce 仪表盘页面的直接链接——产品列表、编辑特定产品、类别、库存、订单列表、特定订单、废弃结账、礼品卡、配送和税费设置。将每个主要 Stores/eCommerce 实体与其读取 API 配对，以便你获取实体并交回一个‘在你的仪表盘中查看’的链接。当用户询问某物在 Wix 仪表盘中的位置、想要某个仪表盘页面的直接链接，或你需要一个仪表盘 URL 随 API 操作结果一起返回时使用。”

<!-- automations-builder-sync:begin -->
## 自动化

### [构建和管理 Wix 自动化](references/automations/build-and-manage-automations.md)
使用公共 Wix Automations API 创建、更新、激活或停用带应用操作、触发筛选、条件、延迟、变量、分支和日程的 Wix 自动化，并检查其当前状态。

<details>
<summary>内部技能（由 Build and Manage Wix Automations 按需加载——请勿直接使用）</summary>

- [Automations API Catalog](references/automations/api-catalog.md)
  发现站点特定的触发器和操作，认证公共自动化 API 调用，并选择用于验证、持久化或目录查询的 API。

- [Automations Graph and Data Model](references/automations/automation-model.md)
  组装带有效节点关系、命名空间和祖先数据访问的、构建器可编辑的自动化图。

- [Automations Trigger Configuration](references/automations/triggers.md)
  使用站点目录选择和配置自动化触发器、触发筛选和事件载荷架构。

- [Automations Action Configuration](references/automations/actions.md)
  从应用定义的自动化操作的输入架构配置它们，并保留受支持的现有操作映射。

- [Automations Mapping Expressions](references/automations/bracket-expressions.md)
  编写构建器兼容的自动化映射表达式、字面量和数据引用。

- [Automations Conditions](references/automations/conditions.md)
  配置可视和代码条件，同时保留布尔意图、比较边界和构建器可编辑性。

- [Automations Delays Variables and Branches](references/automations/special-actions.md)
  配置延迟、速率限制、变量和并行分支步骤，保留受支持的现有步骤元数据。

- [Automations Schemas and Scheduling](references/automations/schemas-and-scheduling.md)
  以正确的时区和日历行为配置动态架构和计划的自动化触发器。

- [Automations Validation and Persistence](references/automations/validation-and-verification.md)
  验证自动化配置、检查构建器兼容性、持久化更改并验证保存的结果。

- [Automations Activation Status](references/automations/activation-status.md)
  通过锁检查、修订处理和回读来检查或更改活动状态，无需在停用前进行无关的修复。

</details>

<!-- automations-builder-sync:end -->
