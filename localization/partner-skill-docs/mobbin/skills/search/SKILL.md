---
name: search
description: 让每次 Mobbin 搜索都获得更好的结果，使参考与你正在做的事相符。在每次调用 search_screens、search_flows 或 search_sections 之前使用。涵盖工具、撰写有效查询、模式、拉取更多结果，以及搜索不理想时该怎么办。
---

# 搜索 Mobbin

**先阅读 best practices。** 若本次对话中尚未阅读 Mobbin 的 `best-practices` 技能，请在搜索前调用它，因为它说明了何时应当运行搜索，以及何时应由另一个技能来运行它。

调用技能可以设定自己的搜索规则，例如每个问题多少个查询，或使用哪种模式。当它们与这些规则不同时，以调用技能的规则为准。

## 搜索如何工作

- **搜索匹配含义，而非关键词。** 一句平实的话（“paywall with a free trial”）比一串关键词（“paywall, trial, subscription, pricing”）效果更好。
- **仅在任务需要时才点名应用。** 在查询中加入应用名会把结果过滤到该应用。但并非每个结果都来自该应用，因此在引用前检查 `app_name` 和 `site_name`。
- **查询在点名某种语言时也会对屏幕和流程设置语言过滤**（“Japanese banking app”）。仅在任务需要时才点名语言。
- **当结果较弱时，更改查询。** 去掉或改写某个约束，或使用用户的原话。不要添加他们未要求的部分。提高 `limit` 或原样重发查询会带回相同的匹配。要为有效的查询获得更多结果，见[第二次拉取](#a-second-pull)。

## 选择工具

| 目标 | 工具 |
|---|---|
| 应用中的一个屏幕或组件 | `search_screens`，带 `platform` |
| 营销网站的某个区块（首屏、定价、功能网格、页脚） | `search_sections`，它不接受 `platform` |
| 一段旅程，或其在一段旅程中的位置很重要的单个屏幕（注册的验证邮箱步骤） | `search_flows`，带 `platform`。对于单个屏幕，从该流程的屏幕中挑选它。只有部分屏幕附带预览；在引用任何其他屏幕前打开其 `image_url` |

`platform` 是 `ios` 或 `web`，且它是你唯一设置的过滤器。这些工具没有 Android，因此 Android 目标搜索 `ios`。在引用参考时说明它们是 iOS。

## 撰写查询

**每个查询一个屏幕、流程或区块。** 从它的类型开始，类型就是目标。一个光秃秃的类型就是好查询。

每个查询都保持在这些限制之内：

- **至多三个约束。** 每个状态、步骤、可见部分或视觉特征（`dark mode`、`bottom sheet`）各算一个：“paywall with plan cards and a free trial button”有两个。类型（“paywall”、“signup screen”）、领域（“meditation app”、“banking app”）和应用名（“Calm”、“Revolut”）不算约束，因此“Calm paywall with plan cards”有一个。若请求超过三个，保留最重要的三个，并通过查看结果来检查其余部分。不要把其余部分移到关于同一目标的第二个查询：每个查询只会找到只含部分部件的屏幕。
- **每个约束都来自请求或问题。** 绝不添加你预期目标会有的部分，如个人资料上的头像或付费墙上的方案卡。它们会把结果缩小到与你的猜测相符的屏幕。

规则：

- **在目标的层级上搜索。** 屏幕目标搜索整个屏幕（“expense tracker home with no transactions”），绝不只是它的某张卡片。组件目标搜索它所在的屏幕。
- **当任务是在选项之间做选择时，点名部件，而非其中一个选项。** 结果需要展示不止一种解决问题的方式：“paywall with plan cards and a free trial button”，而非“paywall with a yearly toggle”。不要用“or”连接选项，也不要把修复写进查询（“with a prompt to add”、“placeholder bars”）。当任务就是找到那个确切的东西时，点名它（“banking app search tab with a text label”）。
- **每件事只说一次。** “Empty state”、“no transactions yet”和“before any are added”是同一个状态。保留最短的。

| 不要 | 要 |
|---|---|
| “social app user profile with avatar, follower counts and post grid”（当用户的问题只是“find me profile screens from social apps”时，这添加了无人要求的部分） | “social app user profile screen” |
| “paywall where the trial button is buried below a long table”（把问题写进查询） | “paywall with a free trial button” |
| “expense tracker home overview in empty state with no transactions yet and prompt to add first expense”（状态说了两遍，点名了一个修复） | “expense tracker home with no transactions” |
| “spending chart card with no data yet, placeholder bars or empty donut”（屏幕目标的某张卡片，两个选项用“or”连接） | “spending overview with no transactions” |
| “ios signup screen”（平台写进查询） | “signup screen”，配合 `platform` `ios` |
| “clean modern invoice list for Acme”（品味用词，用户的产品） | “invoice list” |
| “onboarding paywall settings”（一个查询里多个屏幕类型） | 每个屏幕类型一次调用 |
| “pricing page with hero, plans and FAQ”（一个查询里多个区块） | 每个区块一次调用 |
| “invite teammates screen”（当目标是旅程时的单个屏幕） | “inviting teammates during workspace setup”，在 `search_flows` 上 |

省略用户的文案、数据和品牌，以及诸如“examples of”或“best”之类的说明。当请求或问题点名时，Mobbin 标记的视觉特征会有帮助：`dark mode`、`bottom sheet`、`modal`、`full-screen`、`card-based`。

当一次拉取返回来自任务领域之外的产品时，用该领域的名词（“meditation app paywall”）重新搜索，而不是引用它们。若你确实引用了来自其他领域的产品，说明它在那里仅为借其结构。

## 选择模式

`mode` 仅在 `search_screens` 上存在。根据你所写的查询来选择：

| 查询 | `mode` |
|---|---|
| 无约束（“social app user profile screen”、“Calm paywall”） | `standard` |
| 一到三个约束（“paywall with lifetime option and a discount”） | `deep` |

`deep` 会丢弃它评为弱匹配的结果，因此可能返回少于 `limit` 的结果。拉取结果少意味着接近的匹配少，而不代表 Mobbin 没有。在你说缺少某物之前，发送第二次拉取或更改查询。

## 第二次拉取

当一次拉取未覆盖你所需时，用该工具获取更多结果的方式重发相同查询。这会带回新结果，而非将第一批重新排序。更改查询会使其成为新搜索，即使带排除项也是如此。

- `search_screens`：相同的查询和 `mode`，将所有已见过的 id 放入 `exclude_screen_ids`，至多 100 个。
- `search_sections` 和 `search_flows`：下一个 `page`，丢弃已见过的结果。当 `has_next_page` 为 false 时，没有下一页，因此改用更改查询。

## 当搜索不理想时

按如下处理每种情况。当某一项仍然失败时，用一行说明，在调用技能报告丢失搜索之处，或在没有调用技能时的回复中。

**点名的产品未出现**，即它不在任何结果的 `app_name` 或 `site_name` 中：

1. 若查询的拼写与产品不同，用产品自身的拼写重新搜索。
2. 对于区块（没有名称过滤），在 `has_next_page` 为 true 时请求下一个 `page`。该站点可能排在首页之后。
3. 对于屏幕和流程，当任务不绑定某个平台时，尝试另一个 `platform`，因为一个产品可能仅在 Mobbin 上有 iOS 或 web。将你找到的引用为该平台。当任务针对单一平台时跳过此步骤（iOS 重设计用不到 web 屏幕）。

若它仍然缺失，继续进行类别搜索。不要凭记忆描述该产品的任何内容，也不要让其他产品的屏幕顶替它。用户分享的它的截图仍作为他们的参考。

**图像打不开。** 预览以 `webp` 形式返回，并非每个宿主都能打开。将 `image_format` 设为 `jpg` 再次调用。若仍然打不开，不要从该次调用中引用任何内容，因为你无法看到的屏幕不是参考。

**工具拒绝调用。** 不要重试或更改查询，因为每次调用都会被拒绝。停止搜索并说明。关于输入的错误（如无效参数）则不同：修复输入并再次调用。
