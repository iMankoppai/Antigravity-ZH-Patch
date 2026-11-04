---
name: api-simulation
description: 让你的代码针对它所调用的 HTTP 服务的替身真实运行，这些替身作为同一环境一同提供在一个本地端口或一个已部署 URL 上，无论该代码是你正在改动的服务、前端、测试套件还是演示。当你添加或改动调用其他服务的代码、需要运行它、测试它、证明某个修复，或端到端复现上游失败（超时、5xx、409、429）时使用，可在本地或 CI 中进行，无需真实服务，因为它们无法访问、需要凭据、耗费金钱、有副作用或尚不存在。也通过实际运行每一种失败情形而非阅读代码，来回答当某个被调用的服务宕机、变慢或返回错误时，某个请求或它写入的数据会发生什么（“如果邮件服务宕机，预订会怎样？”）。即使没有人提到 mock 或 simulation 也适用。要给前端或其他团队提供某个 API 的替身，请使用 api-mocking。涵盖 `postman simulation`。
---

# API 模拟

一个模拟把多个 mock 作为同一环境提供，每个通过其
routeKey 访问：默认作为路径前缀，或当调用方的路径无法改变时
作为 `x-mock-slug` 请求头。

让你的代码针对它运行，而不是在测试中对其 HTTP 客户端打桩，或
调用真实服务。桩件会跳过生产中将运行的客户端、配置、超时与
错误处理；真实服务需要
凭据且留下副作用。模拟通过真实 HTTP 运行该代码，
在 CI 中也一样，其日志显示每个依赖被请求了什么。

只做任务需要的事。如果 `postman/simulations/` 中的 `.sim.yaml`
已经覆盖了它，就运行那一个。经由变更路径的一个请求即可证明
改动；仅在被问及代码如何失败、或它必须挺过失败时，才构建失败变体。

`postman simulation` 需要 CLI 1.70.0 或更高版本（`postman --version`；较旧的
CLI 对 `postman simulation -h` 会返回其通用帮助）。

## 构建它

- **成员是代码的 HTTP 依赖。** 数据库、队列与缓存
  不是；请本地运行它们。**api-discovery** 可以找到经由
  共享代码发起的调用；请用代码仓库的 `git remote` 名称来询问，因为相近的
  名称会匹配到另一个代码仓库。
- **每个成员都需要一个 mock：见 `api-mocking`，** 它会先查找拥有团队
  发布的 mock，然后才自行构建。对于一个问题，从契约构建的 mock 即可；
  一个凭空编造响应的 mock 可能把调用方引向真实服务绝不会走的
  路径。在你构建的 mock 中，对本路径
  不会发起的调用返回 `501`：`404` 在调用方看来像真实的“未找到”。
- **给每个 mock 的 `pm.state` 键加上其名称作为前缀。** 自 CLI 1.73.0 起，
  本地运行的成员会读取彼此的键，因此两个都存储
  `orders` 的 mock 会互相覆盖。

## 运行它

运行的是一个永不退出的服务器，因此前台命令永不返回。
用显式端口在后台启动它，把日志写入文件：

```bash
postman simulation run postman/simulations/checkout-dev.sim.yaml --port 4900 --output ndjson > sim.ndjson 2> sim.err &
```

没有 `--port` 时，被占用的 3000 会静默变成一个随机端口，从而每个基础
URL 都指向空。当 `sim.ndjson` 中出现 `listening` 事件时，它已启动；
启动错误在 `sim.err` 中。它仅监听 127.0.0.1，因此容器或 VM 中的调用方
无法访问它。用
`pkill -INT -f "simulation run <file>"` 停止它；`kill $!` 会让它继续运行，
因为 `postman` 启动器忽略该信号。不会有任何重载：编辑 mock 后请重启它。

在不改变代码部署后行为的前提下，把调用方指向它。
在路径路由下，只替换主机并保留路径：
`https://catalog.internal.example.com/v2` 变为
`http://127.0.0.1:4900/catalog/v2`；丢掉 `/v2` 是
`404` 的常见原因。硬编码的基础 URL 应读取一个以当前值作为默认值的
环境变量。如果代码完全不能改动，
则 `simulation run --proxy` 通过 `HTTPS_PROXY` 访问成员；
它不应用任何条件，并把任何其他主机透传给真实
服务。

## 读取日志

一个通过的测试命令并不表明依赖路径已运行：请读取
`sim.ndjson`。没有 `request` 事件的成员要么未接线，要么不在此
路径上。有些应答来自模拟本身，意味着接线问题，而非代码问题：

- `404 Unknown simulation member`：某个基础 URL 丢失了其 routeKey，或某个客户端
  发送了错误的 `x-mock-slug`。
- `501`，或生成的 mock 的 `404 Endpoint not defined`：mock 尚未建模的
  调用。
- `502 Proxy error`：该成员的进程死亡，通常是未设置 `interceptRequests: true` 的
  mock 中发生了异步 throw。它会保持宕机且不记录任何内容，
  直到你重启；用 `postman mock run` 单独运行该 mock 以查明原因。

## 当一个依赖宕机时

实际运行它，而不是凭代码推理：每种宕机方式都会经由调用方
走不同路径，而桩件会跳过选择路径的客户端代码。
对每种重要形态让那一个依赖失败，每次一个运行，
其余成员正常应答：

- **不可达：** 将其基础 URL 指向一个无人监听的端口。
- **挂起：** 给其成员设置一个长于
  客户端超时的 `latency` 条件。如果客户端未设超时，那本身就是发现：Node 的
  `fetch` 会等待约五分钟，所以请说明这一点，而不是干等。
- **带 JSON 体的错误：** `error` 条件。
- **带 HTML 体的错误，** 正如代理所发送的：其 mock 的一个副本，默认处理器
  以 HTML 应答 `500`。没有任何条件能实现这一点。

只有成员上的 `overrides.conditions` 会改变它。成员始终服务于
其默认处理器并忽略 `x-mock-scenario`，而一个仅有 `path` 的 `scenarios` 条目
（如 Postman 应用所写）不会有任何作用。字段与其他条件见
[reference/sim_yaml_schema.md](reference/sim_yaml_schema.md)。注入的
失败绝不会到达 mock，也不会被记录，因此请根据调用方做了什么来评判它，
并检查其他成员的日志以发现副作用，例如
库存被预留却从未释放。

## 保留它

提交你自己的 mock、`.sim.yaml` 以及 `postman dependency add`
所改动的内容，以便下一个会话或 CI 用一条命令重跑它。不要提交
`postman/.dependencies/`：当拥有者更新其副本时，副本会过时，
`postman dependency install` 会恢复它。不要提交 `sim.ndjson`：
CLI 会脱敏常见的鉴权头与字段，但其他头与请求体会
按发送时的样子被记录。在 CI 中，`postman dependency install` 需要 `POSTMAN_API_KEY`，
而 `postman collection run <collection> --simulation <file> --port <n>`
会在集合运行前后启动并停止该模拟。

`postman simulation push` 会把每个成员上传到工作区，因此请先询问。
它会在被拉取的成员上失败，因为后者保留了拥有者的 `id:`；把它复制到
`postman/mocks/` 并删除那一行。

## 规则

1. **你正在测试的东西绝不是成员。** 它必须真实运行，否则
   测试只证明了 mock。
2. **即使拥有者的 mock 已部署，也要拉取它。** 只有成员才会接受
   条件并出现在日志中，而私有 mock 服务器需要你的代码不会发送的
   一个 key。
3. **`simulation deploy` 默认为公开，** 不同于 `mock deploy`。在没有 `--private` 的情况下部署之前
   请先询问；本地运行无需部署。

## 在你说它可用之前

在受测之物实际运行之前不要声称任何结论：某个服务打印出它正在监听
并应答了你的请求，或前端/测试
套件已结束，且其调用出现在日志中。如果它的启动命令退出
或挂起，则运行未证明任何东西；请说明这一点及原因。说明一次通过证明了什么，
即你的代码针对这些替身而非真实服务，哪些仍需
在发布前用真实服务验证，以及每个 mock 来自哪里，
包括你何时跳过了拥有者的 mock。
