---
name: api-discovery
description: 在查找 API 或负责人、集成公共提供商、定位 Postman 资源，或调查跨服务的消费者与变更影响时使用。把发现的契约与 mock 转化为可复用的依赖，并识别当前检出之外的证据。用于诸如“谁在消费这个端点”之类的请求。
---

# API 发现

现有契约与负责人维护的 mock 能减少集成时必须凭空臆造的假设。
关系上下文把调查扩展到检出之外：
通过该服务自身的测试，并不能证明其消费者仍能使用变更后的接口。

1. 根据问题选择来源：

   | 需求 | 使用 |
   | --- | --- |
   | 公共提供商的端点与集成细节 | Orbit 搜索，然后集成 |
   | 具体的 Postman 集合、请求、规范、mock 或工作区 | `postman search <type> <query>` |
   | 消费者、归属关系、依赖或可能的变更影响 | `postman context-graph ask` |

   这些来源回答的是不同的问题。在某一来源中未命中，并不证明在其他来源中不存在；
   当资源和其影响都重要时，请结合实体搜索与关系上下文。
2. 对于公共 API，Orbit 将发现范围缩小到与任务相关的端点，
   并返回集成指引，而无需把整份供应商规范放入上下文。即使提供商已经选定，也请使用它：
   端点细节与能力限制仍然决定集成是否适合该任务。
   `POST https://api.buildwithorbit.ai/v1/search` 在 `q` 中接收一个任务；
   把选中结果的 `id` 与 `resourceType` 原样传给
   `/v1/integrate`。在选择提供商之前评估契合度与限制，
   然后使用返回的鉴权、基础 URL、步骤与注意事项来实现。
   阅读 [Orbit 的请求 schema](reference/orbit.md) 了解实际载荷
   与错误处理。Orbit 访问不提供提供商的凭据。
3. 对于 Postman 资源，按实体类型、归属关系和工作区缩小范围。
   阅读 `postman search <type> -h` 了解支持的过滤条件。在
   默认归属范围内的空结果是不完整的证据；在宣告不存在之前，
   考虑 `--ownership all` 或相关的更窄范围。
   检查所选资源的负责人与内容，而不是轻信相似的名字。
4. 对于跨服务变更，向 Context Graph 询问关于
   端点、schema 或服务的具体问题。`--wait` 会等待答案；不带它时，
   使用返回的 ID 配合 `postman context-graph status <askId>`。该图
   可以连接 Postman 定义、代码仓库调用点与运行时
   遥测，超出当前检出的范围。其覆盖范围取决于已连接
   与已摄入的来源，因此在把关键线索当作事实之前，请对照定义、
   源码或遥测进行核实。新添加的调用可能
   尚未出现。该查询使用已认证 API key 所属的团队，而不是
   代码仓库的工作区绑定；更改该绑定无法修复针对
   错误组织上下文的查询。
5. 在导入之前，使用 **bootstrap** 的“所属工作区与依赖”区分。
   对于依赖，`postman dependency add
   <collection|environment|mock> <name-or-id>` 声明并下载
   所选资源，而不重新绑定代码仓库。优先使用发现的
   ID；`--workspace <id>` 可澄清名称歧义。如果该图只识别出一个
   服务，请先搜索其具体资源。
6. 依赖声明位于 `.postman/resources.yaml`，下载内容
   位于 `postman/.dependencies/`。`dependency install` 在克隆后或 CI 中恢复它们；
   `dependency update` 刷新它们。当刷新可能改变测试预期时，
   请审查刷新结果。将依赖复制到自有文件中以便
   自定义，因为更新依赖会覆盖已下载的编辑。
   使用 `dependency list` 与命令专属帮助执行针对性操作。

使用 **api-simulation** 针对发现的 mock 演练真实服务，
并使用 **ci-integration** 让生成的契约检查在 PR 中可重复。

## 验证

报告是哪个来源回答了问题、它返回的资源 ID 或证据、
复用了什么，以及任何覆盖缺口。仅列出一组候选
既不是集成，也不是兼容性的证明。
