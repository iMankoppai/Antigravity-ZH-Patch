---
name: api-mocking
description: 查找、构建、运行并发布某个 API 的替身——若有拥有团队发布的 mock 就用它，否则用其规范或集合构建一个行为像真实 API 的替身，当调用方先写后读时保持有状态。当某物需要一个尚未构建或无法访问的 API（前端、客户端或演示）、当其他团队应在你 API 上线前基于它构建，或被要求 mock 一个 API 或伪造后端时使用。要针对你所调用的服务运行和测试自己的代码，请使用 api-simulation。涵盖 `postman mock` 与 `postman dependency add mock`。
---

# API Mocking

一个 mock 是一个文件夹，包含 `config.yaml` 加上诸如 `default.js` 的处理器，它
像一个 API 那样应答。处理器是一个 Node HTTP 服务器，调用
`listen(process.env.PORT)`。即使在 ESM 项目中它也以 CommonJS 方式加载，因此
`import` 会失败：请使用 `require`。同一个 mock 存在于你的代码仓库
（`postman/mocks/<name>/`，用 `postman mock run` 运行，无需登录）、
执行 `postman mock push` 后的 Postman 工作区（其他团队从那里拉取），
以及执行 `postman mock deploy` 后的 mock 服务器上，供那些
无法自行运行的调用方使用。

一次涉及多个 API，用于某个服务、前端或测试套件？使用
`api-simulation`，它会在此处获取每个成员的 mock。

## 优先使用拥有者的 mock

当 API 属于另一个团队时，在编写自己的 mock 之前先查找他们发布的 mock：
他们的 mock 编码了他们的契约与其服务的状态；你的则是在编码一种猜测。它需要 `postman login`；
在登出状态下，请自行构建，并说明跳过了拥有者搜索。

1. 用 `postman search workspaces "<service>" -o json` 查找拥有者的工作区。
   用你代码中的方式直白地命名服务，而不是按它返回的内容命名：
   描述会匹配到看似相似的服务。优先选择以该服务命名、
   且已连接 Git 的工作区（`isGitConnected`）。
2. 用 `postman mock list -w <workspaceId> --json` 列出其 mock。
   `postman search mocks` 会漏掉一些，而且它的 `classicMock` 结果只会
   重放集合中已保存的示例：`postman mock` 无法拉取或运行
   它们，所以要用 `postman request` 访问 `https://<mockId>.mock.pstmn.io` 上的对应 mock，
   或从其集合生成代码 mock。另一个工作区中
   同名的 mock 并非拥有者的。
3. 用 `postman dependency add mock <mockId>` 拉取它，并按原样使用。
   切勿编辑 `postman/.dependencies/`：`dependency update` 会覆盖它，
   因此要改动 mock 请复制到 `postman/mocks/`。拉取的副本会丢失
   `interceptRequests`，因此若处理器读取 `req.body` 或依赖
   会话，请派生一个副本。mock 是以你的身份运行的代码；
   只从你信任的工作区拉取。

## 或者构建一个行为像真实 API 的 mock

调用方在其使用的路径上不应能分辨出差异。一个
返回虚构 JSON 的 mock 会通过你的测试，却在真实服务上失败。

- **从契约开始。** `postman mock generate <spec or collection>`
  写出每个已记录的响应。它是一种重放：一个 `POST` 与稍后的
  `GET` 互不共享，且它接受任意请求，因此破坏契约的调用
  仍会得到应答。`x-mock-response-code` 只挑选一个
  已记录的状态码；其他任何码都会得到默认的 200，因此要把调用方
  会处理的错误（未知 id 的 404、冲突的 409、坏输入的 400）放进
  契约里。从规范生成时
  它服务服务器 URL 的基础路径（`/v2/...`）；从集合生成时，
  路由从基础 URL 变量之后开始。`--update` 会重新生成
  处理器并覆盖你的编辑。没有契约时，按你的代码调用 API 的方式
  编写它，并说明你的假设。
- **在 `config.yaml` 中设置 `interceptRequests: true`。** 没有它，`req.body`
  与 `req.query` 会是 undefined，`x-mock-session` 会被忽略，而且异步处理器中的 throw
  会杀死 mock，而不是返回 `500`。
- **当调用方先写后读时，使其有状态。** 将记录保存在
  `pm.state` 中，首次使用时播种，添加一个重置路由以便测试可以从
  干净状态开始，并对未知 id 返回真实的 404。每次 `mock run` 都从
  空状态开始。
- **了解谁共享状态。** 在本地，所有调用方共享同一状态，除非
  每个调用方发送 `x-mock-session: <id>`。从 CLI 部署的 mock 服务器
  会隔离每个调用方：若某个调用方既未保持相同的 `x-mock-session`、也没有
  `pm_mock_session` cookie，则每次请求都从种子开始，因此它的
  `POST` 与稍后的 `GET` 永远不会相遇。
- **场景（Scenarios）** 是 `config.yaml` 的 `scenarios` 列表中的具名处理器，按请求
  用 `x-mock-scenario: <name>` 选取。未知名称在本地回退到
  默认值，但在 mock 服务器上是 `404`。

## 对照契约检查它

`postman mock run` 打印它绑定的 URL；被占用的已配置端口会移动，
除非你传入 `--port`，所以请从那一行取 URL。不会有任何重载：
编辑后请重启它。

用你刚写的处理器去检查 mock 证明不了什么，因此请用来自契约的请求
调用它：`postman request`，或用该 API 的
集合
`postman collection run <collection> --use-mock "{{baseUrl}} mock:postman/mocks/<name>"`
（仅 `--mock` 只会启动它）。那种形式会替换变量的整个
值，包含基础路径，因此从服务 `/v2/...` 的规范生成的 mock
会返回 `404`；请用 `--mock <path> --port <n>` 启动它，并
传入 `--env-var "baseUrl=http://localhost:<n>/v2"`。要对照契约检查你自己的调用，
请把每一个调用（来自代码或模拟日志）
与规范比较；mock 不会拒绝错误的调用。

## 为其他团队发布它

- **推送到服务自身的工作区，** 即本代码仓库所链接的
  那个、或用户指定的那个，绝不要用按名称匹配选出的那个：其他
  团队的模拟会在那里查找。在登出状态下，push 会失败，但本地
  mock 仍可工作；构建它，说明这一点，并请用户登录。保持
  诚实：在同一个 PR 中随 API 一起更改 mock，并针对它运行该 API 的
  集合。
- **仅在调用方需要 URL 时部署。** 服务器接受 3–32 个
  小写字母、数字和单个连字符组成的 slug，且以字母或数字开头和结尾；
  CLI 接受更多，其默认值可能过长。
  它是私有的：调用方以 `x-api-key` 发送 API key，或者，若他们能
  查看该工作区，则以 `x-access-token` 发送访问令牌。部署需要付费套餐；一个团队的第一个
  服务器可能需要数分钟才能应答，而会审查部署的团队会把它挂起
  以待批准。之后每次 `push` 都会改变该服务器的每个调用方
  所得，因此请把它当作一次发布，而不是一次备份。
- **为它运行的环境而写。** mock 服务器把每个场景作为一个
  文件，使用 Node 的内置模块，而非 `fs` 或 `child_process`：没有本地
  `require`，没有 `pm.mock` 示例，没有环境，没有控制台输出，也没有
  调用方的 `authorization`、`cookie` 或 `x-api-key` 请求头。依赖其中任何一项的 mock
  会在本地工作，却在部署后失效。
- **使用 `--public` 之前先询问。** 它会把 mock 及其数据提供给任何拥有
  该 URL 的人，而且脚本化的重新部署无法再使其变为私有。

## 在你说它完成之前

mock 不会因为它启动了就算完成。调用它：一个已记录的错误会返回，
一个有效的场景会改变响应，如果应该的话，一个 `POST` 之后的 `GET` 会显示状态。
说明它在哪里运行、谁能调用它、它位于何处，以及
你做了哪些假设。
