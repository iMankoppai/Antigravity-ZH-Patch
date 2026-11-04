---
name: api-testing
description: 在测试端点、运行集合断言，或对照 API 契约检查真实应用流量时使用。复用已保存的请求，并报告实时、mock 或捕获流量结果实际确立了哪些结论。用于诸如“测试这个端点”之类的请求。
---

# API 测试

已保存的请求保留了使 API 检查可复现的鉴权、载荷、变量与断言。
有用的结果是关于某个预期保证的证据；仅一次成功的 HTTP 交换
并不能确立正确性。

1. 选择能回答问题的最小执行模式：

   | 所需证据 | 使用 |
   | --- | --- |
   | 单个端点且无已保存请求 | `postman request <url>` |
   | 现有已保存请求的行为 | `postman collection run <collection-path> -i <request-id-name-or-path>` |
   | 可复用的回归检查 | `postman collection run <path-or-id>` |
   | 真实应用的调用是否与契约一致 | `postman application test` |

2. 在重建 HTTP 字段之前，复用 `postman/collections/` 下的匹配请求。
   通过集合运行它会保留继承的鉴权、
   变量与脚本。`postman request` 接收 URL，而不是请求 YAML
   路径；对于已有载荷文件的未保存请求，`--body @path`
   将该文件保留为来源。编辑已保存请求时，见 **collection-schema-v3**。
3. 从契约与有风险的行为中推导断言。仅仅重复当前实现的测试
   可能会为它的 bug 背书。保留
   现有保证，并为变更后的行为添加检查；把可复用的
   `pm.test` 断言放进集合，以便后续运行与队友继承
   它们。内联 `--script-post-request` 断言适合一次性检查。
4. 根据结论选择真实或 mock 目标。`--use-mock` 让集合运行在无实时
   后端的情况下演练请求与断言逻辑；仅 `--mock` 只会启动一个。
   `--use-mock` 会替换
   变量的整个值，包含基础路径（见 **api-mocking**）。针对该 mock 通过
   并不验证 mock 所代替的服务。
5. 使用 `-e` 与 **variables** 复用环境解析。通过 `-d` 使用 CSV/JSON
   文件做简单迭代；当输入
   需要查询、连接或可复用视图时，使用 **datasets**。当 **ci-integration**
   需要终端输出之外的证据时，导出报告，例如 `-r junit,html`。
6. 当应用的实际流量是对象时，使用 `application test`。
   它会运行一个已有命令，例如 `--command "npx playwright test"`，
   捕获其流量，并对照集合进行匹配。`--capture-only`
   则改为导出一个按主机组织的 v3 集合；那只是捕获行为
   而不进行验证。结果默认记录到已连接的工作区；
   在需要时，`--report-events=false` 会让运行保持在本地。

使用命令专属的 `-h` 了解支持的选项，在使用工作区资源时
使用 **bootstrap** 解决尚未完成的 CLI 初始化或鉴权。一个裸 URL 或
本地集合不需要工作区绑定。

## 验证

报告目标、受测行为、断言数量与退出码。退出
码反映失败的断言，而不仅仅是 HTTP 状态：一个 200 也可能使测试失败。
对于应用测试，请区分匹配模式与仅捕获模式；对于
mock 运行，请说明哪些真实行为仍未核实。
