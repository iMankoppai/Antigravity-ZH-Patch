---
name: domains
description: 在 Vercel 上使用 CLI 或 Domains Registrar API 搜索、注册、连接、转移和续订域名。用于域名可用性和定价、自定义域名、DNS 记录、名称服务器、所有权验证和域名订单。
summary: Search domains without authentication; manage registration, project assignment, DNS, transfers, and renewals with Vercel CLI or API.
metadata:
  priority: 7
  docs:
    - "https://vercel.com/docs/domains/registrar-api"
    - "https://vercel.com/docs/cli/domains"
    - "https://vercel.com/docs/cli/dns"
    - "https://openapi.vercel.sh"
  sitemap: "https://vercel.com/sitemap.xml"
  pathPatterns: []
  bashPatterns:
    - '\b(?:vercel|vc)\s+(?:domains?|dns)\b'
    - 'https://api\.vercel\.com/v1/registrar/'
  importPatterns: []
  promptSignals:
    phrases:
      - "domain name"
      - "domain search"
      - "domain availability"
      - "domain pricing"
      - "buy a domain"
      - "register a domain"
      - "transfer a domain"
      - "renew a domain"
      - "renew my domain"
      - "custom domain"
      - "dns record"
      - "nameserver"
      - "registrar api"
      - "vercel domains"
      - "vercel dns"
    allOf:
      - [domain, vercel]
      - [domain, register]
      - [domain, renew]
      - [domain, transfer]
    anyOf:
      - "availability"
      - "pricing"
      - "dns"
      - "registrar"
    minScore: 6
---

# 域名

使用公开的 Registrar API 进行无需认证的发现。使用已安装的 Vercel CLI 进行账户和项目操作，或使用 REST API 进行结构化自动化。`vc` 和 `vercel` 等价。

注册、Vercel 团队所有权、项目分配和权威 DNS 是彼此独立的事项。连接一个已拥有的域名不需要购买它或转移其注册。

## 在索取凭据之前先搜索

以一次同时返回可用性和定价的请求开始精确名称调研：

```bash
curl --fail-with-body --silent --show-error \
  https://api.vercel.com/v1/registrar/domains/search \
  --header 'Content-Type: application/json' \
  --data '{"domains":["example.com","example.dev","example.app"]}'
```

每个请求发送 1–200 个精确域名。该端点检查所提供的名称；它不生成建议。根据用户的命名约束生成候选名称，然后批量提交。不需要 Vercel 账户、令牌或项目关联。

结果保持输入顺序。可用条目包含 `domain`、`available`、`years`、`price`、`renewalPrice` 和 `premium`；价格是所返回期限的美元价格。报告注册和续订费用时附带该期限，并标记溢价域名。`available: false` 意味着不可用**或无法确认可用性**；它不能证明有人拥有该名称。缺失的价格是未知，而不是零。可用性和报价在购买前可能变化。

对于关键字/TLD 发现，较新的 CLI 可以生成候选名称：

```bash
vercel domains search acme --tld com --tld dev --available --format=json
vercel domains check example.com example.dev --format=json
vercel domains price example.com --format=json
```

对照已安装版本检查 `vercel domains --help` 和所选子命令的 `--help`。如果发现功能不可用或 CLI 请求登录，直接使用公开端点。CLI `search` 接受关键字；API `search` 接受精确名称。不要用一种输入形态替代另一种。

## 连接并诊断现有域名

对于需要认证的工作，检查 `vercel whoami`，并在选择团队时使用 `--scope <team>`。在更改项目的域名之前先解析出预期的项目。

```bash
vercel domains ls --scope my-team
vercel domains inspect example.com --scope my-team
vercel domains add example.com my-project --scope my-team
vercel domains verify example.com --project my-project --format=json --scope my-team
```

使用为该域名和项目返回的实际预期 DNS 记录和所有权验证值。不要硬编码通用的 A 记录或 CNAME 目标。在权威 DNS 提供商处配置记录；`vercel dns` 仅更改 Vercel DNS。保留无关记录，尤其是 MX 和电子邮件验证 TXT 记录。名称服务器变更需要迁移该区域所需的记录。

| 任务 | CLI |
| --- | --- |
| 列出 DNS 记录 | `vercel dns ls example.com` |
| 检查一条记录 | `vercel dns inspect <record-id> --format=json` |
| 添加所需的 TXT 记录 | `vercel dns add example.com <record-name> TXT <record-value>` |
| 更新现有记录 | `vercel dns update <record-id> --value <record-value>` |
| 删除特定记录 | `vercel dns rm <record-id>` |
| 移动团队所有权 | `vercel domains move example.com <destination-team>` |
| 移除团队所有权 | `vercel domains rm example.com` |

更改后，重新运行 `domains verify` 并检查 DNS 传播和 HTTPS。验证可能以非零退出，同时返回描述不匹配的有用 JSON。一次被接受的 DNS 写入不能证明 DNS 已传播或证书已就绪。`domains add --force` 可以将域名从另一个项目分离；仅当该重新分配是有意的时候才使用它。移除团队所有权不是注册商转移，也不是取消注册。

## 购买、转移和续订

对确切的域名、期限、价格和续订偏好使用现有授权。如果这些选择尚未确定，在询问前先准备当前报价。不要把一次发现请求当作购买许可。使用真实的、由用户提供的注册人信息，并将令牌、联系数据和转移码排除在日志和已提交文件之外。

| 任务 | CLI |
| --- | --- |
| 注册域名 | `vercel domains buy example.com` |
| 从其他注册商转入 | `vercel domains transfer-in example.com` |
| 续订注册 | `vercel domains renew example.com` |
| 启用或禁用自动续订 | `vercel domains auto-renew example.com on` / `off` |

转移流程可能需要交互式输入。使用 Vercel CLI 63.1.0+ 时，`domains buy` 和 `domains renew` 无需提示即可运行：传入 `--scope <team> --json` 且不带 `--amount`，可在不扣费的情况下获取价格、期限和下一步命令；经人批准后，用 `--amount <approved-price-in-USD>` 运行返回的命令（购买还需要注册人标志，以及 `--auto-renew` / `--no-auto-renew` 中的恰好一个）。CLI 不会重试扣费；如果结果未知，在重试前运行 `domains inspect`。在较旧的 CLI 上，使用带所需负载的 Registrar API，而不是发明 CLI 标志。在 Vercel 团队之间移动使用 `domains move`，而不是 `transfer-in`。

## Registrar API

基础 URL：`https://api.vercel.com`。在构造变更之前，查阅[实时 OpenAPI schema](https://openapi.vercel.sh)以了解所选操作的请求和响应字段。

### 公开发现

使用 [Registrar API 参考](https://vercel.com/docs/domains/registrar-api)了解公开 TLD 元数据、特定期限的域名价格、可用性和联系人要求。这些操作不需要认证。批量可用性和价格调用接受 1–50 个域名；搜索接受 1–200 个。

TLD 基础价格不包含溢价域名的报价。对请求的期限使用域名专属价格；价格端点返回 `purchasePrice`，不同于搜索的 `price`。某些价格字段可能是字符串而非数值报价；不要把它们作为 `expectedPrice` 提交。

### 需要认证的操作

发送 `Authorization: Bearer <token>`，并针对预期的团队使用 `?teamId=<team-id>`。对 JSON 正文使用 `Content-Type: application/json`。复用安全可用的令牌；不要为公开发现索取令牌。

对于购买、转移、续订、自动续订、名称服务器和联系人验证，使用实时 schema 中选定的操作。使用 `GET /v1/registrar/orders/{orderId}` 检查异步结果。空的 nameservers 数组会选择 Vercel 默认值；购买后的前 30 分钟内联系人验证不可用。

对于购买，检索联系人 schema，并通过购买负载的 `contactInformation.additional` 字段提供所需的 TLD 专属值。对于转移，仅使用该操作实时 schema 接受的联系人字段；它不接受仅用于购买的 `additional` 字段。Punycode 购买需要受支持的 `languageCode`；检查 TLD 元数据。引用确切的操作和期限，然后使用该数值报价作为 `expectedPrice`。将价格不匹配对照用户的授权支出来重新评估，而不是默默接受涨价。

购买、续订和转移可以异步完成。保存返回的订单 ID，检查订单及每个域名的状态，并准确报告待处理或失败的结果。如果提交超时，在重新提交扣费前先核对订单状态。在完成或失败时停止轮询；如果在有界检查后仍处于待处理，返回订单 ID 和下一步状态检查操作。完成任何所需的注册人电子邮件验证。

对注册商操作使用 `/v1/registrar/*`，而不是已停用的旧版购买、价格、可用性或转移端点。现有的项目域名和 DNS API 有各自的用途；registrar API 并不取代它们。
