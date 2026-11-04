---
name: implement-in-app-purchases
description: 实现、配置并调试 Unity 应用内购买（In-App Purchases），包括订阅、收据验证以及通过 Stripe 或 Coda 的直接面向客户支付。用于询问真实货币购买或微交易，或从原生商店计费、RevenueCat、Adapty、Essential Kit 或 UniPay 迁移时。
---

# Unity 应用内购买

命名空间：`UnityEngine.Purchasing` | 安全：`UnityEngine.Purchasing.Security`
包：`com.unity.purchasing`

**Unity IAP 有自己的初始化路径**，通过 `UnityIAPServices.StoreController()` → `store.Connect()`。它不需要 `UnityServices.InitializeAsync()`，但如果你的项目使用其他 UGS 服务，它们可以共存。如果存在 Analytics 且调用了 `InitializeAsync()`，IAP 将自动发送交易事件。

## 开始之前

**始终先阅读 [references/pre-check.md](references/pre-check.md)。** 它会扫描项目中的第三方 IAP 包、原生 Google Billing 和现有 Unity IAP 版本，然后路由到正确的路径。在路由解决之前，不要阅读任何其他参考文件或做出任何更改。

## 详细参考

- **项目扫描和路径路由（先读）：** 参见 [references/pre-check.md](references/pre-check.md)
- **API 签名和代码示例：** 参见 [references/api-notes.md](references/api-notes.md)
- **平台扩展（Apple、Google）：** 参见 [references/platform-notes.md](references/platform-notes.md)
- **编辑 `IAPProductCatalog.json`（schema、小数序列化、刷新）：** 参见 [references/codeless-catalog.md](references/codeless-catalog.md)
- **v4 → v5 迁移：** 参见 [references/migration-v4-to-v5.md](references/migration-v4-to-v5.md)
- **将原生 Google BillingClient 转换为 Unity IAP 5：** 参见 [references/path-convert-native-google-billing.md](references/path-convert-native-google-billing.md)
- **将原生 iOS StoreKit 插件转换为 Unity IAP 5：** 参见 [references/path-convert-native-storekit.md](references/path-convert-native-storekit.md)
- **将 Essential Kit 计费转换为 Unity IAP 5：** 参见 [references/convert-essentialkit.md](references/convert-essentialkit.md)
- **UniPay（FLOBUK）—— 评估和指导：** 参见 [references/convert-unipay.md](references/convert-unipay.md)
- **RevenueCat —— 转换评估和指导：** 参见 [references/convert-revenuecat.md](references/convert-revenuecat.md)
- **Adapty —— 转换评估和指导：** 参见 [references/convert-adapty.md](references/convert-adapty.md)
- **向没有现有 IAP 的项目添加 Unity IAP 5：** 参见 [references/path-add-iap-to-new-project.md](references/path-add-iap-to-new-project.md)
- **实现 IAP D2C 能力（第三方支付提供商——Stripe/Coda，需要 v5.4+）：** 参见 [references/path-implement-iap-d2c.md](references/path-implement-iap-d2c.md)

按需阅读参考文件——仅当你需要特定的 API 签名、平台扩展细节或迁移映射时。

## 初始化流程

1. 通过 `UnityIAPServices.StoreController()` 获取 `StoreController`（或通过 `DefaultStore()`、`DefaultProduct()`、`DefaultPurchase()` 获取单个服务）
2. 在调用 `Connect()` **之前**订阅**所有**必需事件（参见下面的必需事件订阅）
3. `await store.Connect()` 以连接到平台商店
4. 在 `OnStoreConnected` 时，调用 `store.FetchProducts(List<ProductDefinition>)` 加载目录
5. 在 `OnProductsFetched` 时，产品已准备好显示和购买

使用 `Awake()` 进行初始化——确保 IAP 在其他 `Start()` 方法之前就绪。

产品类型：`ProductType.Consumable`、`ProductType.NonConsumable`、`ProductType.Subscription`。

## 获取产品

将产品定义为 `List<ProductDefinition>` 并传给 `store.FetchProducts()`。当产品 ID 在 Apple/Google 商店之间不同时使用 `StoreSpecificIds`。对于复杂目录，使用 `CatalogProvider` 管理产品集和商店特定 ID。

| 方法 | 行为 |
|---|---|
| `GetProducts()` | 返回**缓存**的产品列表（同步，如果未调用 `FetchProducts` 则为过期） |
| `FetchProducts()` | 查询**商店**以获取最新定价/可用性并更新缓存 |
| `GetProductById(id)` | 按 ID 返回单个缓存产品 |

这些**不可**互换。在依赖 `GetProducts()` 之前始终先调用 `FetchProducts()`。

## 两步购买流程

IAP v5 使用强制性的两步流程：**Pending → Confirm**。

1. `store.PurchaseProduct(product)` —— 启动平台购买对话框
2. `OnPurchasePending` 触发——你收到一个 `PendingOrder`
3. 验证收据，向玩家授予内容
4. `store.ConfirmPurchase(pendingOrder)` —— 完成交易
5. `OnPurchaseConfirmed` 触发——接收 `Order` 基类型；模式匹配 `ConfirmedOrder`（成功）vs `FailedOrder`（确认失败）

**授予内容后你必须调用 `ConfirmPurchase(pendingOrder)`。** 未确认的购买会在下次应用启动时重新交付，以防止丢失购买。

**去重：** `OnPurchasePending` 可能对同一次购买触发多次（例如确认前应用重启）。始终检查内容是否已授予。

**消耗品：** 已确认的消耗品购买**不会**由 `FetchPurchases` 返回。请自行跟踪消耗品的授予（例如在 Cloud Save 或 Economy 中）。

**延迟购买：** `OnPurchaseDeferred` 针对 Ask-to-Buy（iOS）和 Google Play 延迟购买触发。**不要**授予内容——等到批准时的 `OnPurchasePending`。

## 恢复交易

`store.RestoreTransactions(callback)` 重新交付非消耗品和订阅购买。每次恢复的购买都会触发 `OnPurchasePending`。

iOS 上为符合 Apple App Store 要求而必需——添加一个 “Restore Purchases” 按钮。

Apple 不可续订订阅**无法**通过 `RestoreTransactions` 恢复。请在服务器端跟踪这些。

## 收据验证

| 平台 | 方法 |
|---|---|
| **Google Play** | 使用 `GooglePlayTangle.Data()` 的 `CrossPlatformValidator`——支持本地验证 |
| **Apple (StoreKit 2)** | 本地验证是**无操作**。使用 `order.Info.Apple?.jwsRepresentation` 进行服务器端验证 |

通过 Unity 编辑器中的 **Services > In-App Purchasing > Receipt Validation Obfuscator** 生成 tangle 数据。

## 权益检查

当你没有 `Order` 且想知道特定产品的状态时使用（替代 v4 的 `product.hasReceipt`）。如果你已经有 `Order`，请改检查其类型：`PendingOrder` 映射到 `EntitledUntilConsumed`（消耗品）或 `EntitledButNotFinished`（非消耗品/订阅），`ConfirmedOrder` 映射到 `FullyEntitled`。

调用 `store.CheckEntitlement(product)` 并处理 `store.OnCheckEntitlement`。检查 `entitlement.Status == EntitlementStatus.FullyEntitled`。

`EntitlementStatus` 值：`FullyEntitled`、`EntitledUntilConsumed`、`EntitledButNotFinished`、`NotEntitled`、`Unknown`。

## 获取现有购买

`store.FetchPurchases()` 从商店检索所有当前购买。在应用启动时很有用。

| 方法 | 行为 |
|---|---|
| `GetPurchases()` | 返回**缓存**的购买列表 |
| `FetchPurchases()` | 查询**商店**以获取当前购买并**覆盖**缓存的列表 |

`FetchPurchases()` 在每次调用时替换整个缓存列表。仅重新获取非消耗品和订阅——已确认的消耗品不会被返回（参见上面的两步购买流程）。

## 订阅信息

订阅信息位于 `IPurchasedProductInfo` 上，通过 `order.Info.PurchasedProductInfo` 访问——**不是 `CartItem`**（`CartItem` 只有 `Product` 和 `Quantity`）。

`IsSubscribed()` 返回 `Result` 枚举（`True`/`False`/`Unsupported`），而非 `bool`。使用 `== Result.True` 进行空安全比较。

## 必需的事件订阅

**始终订阅成功和失败两种事件。** 不订阅失败事件会生成运行时警告。

| 调用 | 成功事件 | 失败事件（必需） |
|---|---|---|
| `FetchProducts()` | `OnProductsFetched` | `OnProductsFetchFailed` |
| `FetchPurchases()` | `OnPurchasesFetched` | `OnPurchasesFetchFailed` |
| `Connect()` | `OnStoreConnected` | `OnStoreDisconnected` |
| `PurchaseProduct()` | `OnPurchasePending` | `OnPurchaseFailed` |
| `CheckEntitlement()` | `OnCheckEntitlement` | — |

**始终订阅 `OnPurchaseDeferred`**——针对 Ask-to-Buy（iOS）和 Google Play 延迟购买触发。不订阅会静默丢弃延迟购买。

在调用 `Connect()` **之前**订阅事件——来自上一会话的待处理购买可能立即触发。

## 失败描述属性名称

这些属性名称**不可**互换——使用错误的一个会导致 CS1061：

| 类型 | 字段 | 属性 | 而非 |
|---|---|---|---|
| `StoreConnectionFailureDescription` | `.message` | `.Message` | ~~`.reason`~~ |
| `ProductFetchFailed` | — | `.FailureReason`、`.FailedFetchProducts` | ~~`.Message`~~ |
| `FailedOrder` | — | `.FailureReason`、`.Details` | — |
| `PurchasesFetchFailureDescription` | `.message`、`.failureReason` | `.Message`、`.FailureReason` | — |

## 验证

在编写使用此包的代码后：
1. 验证项目编译无错误。
2. 确认所有 API 调用匹配 [api-notes.md](references/api-notes.md) 中的 v5 签名——不要使用 v4 旧模式（`IStoreListener`、`UnityPurchasing.Initialize`、`ConfigurationBuilder`）。
3. 检查 api-notes.md 中的 "Anti-Hallucination: Common v5 Mistakes" 表——不要使用 `OnStoreConnectionFailed`（使用 `OnStoreDisconnected`），不要向 `FetchProducts`/`FetchPurchases` 传递回调（使用事件），不要使用 `product.receipt`（使用 `order.Info.Receipt`）。
4. 检查所有必需事件都在调用 `Connect()` **之前**订阅（参见上面的必需事件订阅表）。
5. 验证两步购买流程：`OnPurchasePending` → 授予内容 → `ConfirmPurchase(pendingOrder)`。
6. 确认每个异步操作都订阅了成功和失败事件（`OnProductsFetched`/`OnProductsFetchFailed`、`OnStoreConnected`/`OnStoreDisconnected` 等）。
7. 如果处理订阅，验证 `IsSubscribed()` 与 `== Result.True` 比较，而不是强制转换为 `bool`。
8. 如果更新的文件与旧版版本共存于同一项目中，使用唯一命名空间（例如添加 `.Updated` 后缀）以避免 CS0101/CS0111 编译错误。
9. 如果项目订阅 `OnAuthAccountChanged`（v5.4+）：验证处理程序从头重新获取产品和购买——Unity IAP 在引发此事件之前会清除两个缓存。不要在处理程序内读取 `GetProducts()` 或 `GetPurchases()`。
