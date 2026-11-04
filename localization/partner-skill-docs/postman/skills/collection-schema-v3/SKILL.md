---
name: collection-schema-v3
description: 在编写或调试本地 Postman v3 集合与环境 YAML（包括集合 lint 失败）时使用。保留使 API 变更可在 Git 中复用与审查的按实体拆分文件、继承上下文与 schema 形状。用于诸如“修复这个请求 YAML”之类的请求。
---

# 集合 Schema（v3，Git 原生）

一个 v3 集合是由可独立编辑的实体组成的目录。对一个
请求、示例或断言的改动，可以在 PR 中与其检查的代码
一同审查，而无需重新生成一个庞大的集合导出。

1. 编辑拥有该变更的实体。`postman/collections/` 下的
   顶层目录是集合；嵌套文件夹组织请求。
   请求位于 `*.request.yaml`，范围元数据位于
   `.resources/definition.yaml`，已保存响应位于
   `.resources/<request-name>.resources/examples/*.example.yaml`。
   `.resources/` 存放元数据与示例，而不是可运行的请求文件。
2. 在更改请求时，保留继承的鉴权、变量与脚本。
   集合/文件夹定义提供共享上下文；把每个继承
   字段复制到每个请求中会产生相互竞争的值与嘈杂的未来编辑。
   在决定某个值或机密引用的范围时，见 **variables**。
3. 在编写请求、示例或定义文件时，使用 [HTTP 字段形状与示例](reference/http.md)。
   对于其他协议，请阅读
   [它们的 schema](reference/other_protocols.md)；HTTP 的 URL/请求体/脚本形状
   不能假定适用于 gRPC、WebSocket、MCP 或 LLM 请求。
   [环境文件](reference/environment.md) 有自己的 schema，
   不使用集合实体的 `$kind` 判别器。
4. 在 YAML 边界上保留类型。给 `{{variables}}` 以及
   看似布尔或数字的字符串加引号；JSON 请求体是字符串内容，最好用
   块标量表达。一个语法上有效的 YAML 对象仍可能是错误的
   请求体形状。HTTP 参考给出了确切的字段。
5. 将编辑保持在预期实体内。`order` 是数值相对
   排序，因此留有间隔的值允许插入而不必重编号同级项。
   保持文件名可移植且不区分大小写地唯一；显示 `name`
   可以保留无法出现在文件名中的字符。重命名请求
   还需要检查其示例路径。
6. 为消费者需要理解或模拟的行为保存示例。
   它们的 schema 供给 **api-documentation**、**api-mocking** 与
   **ai-readiness**；仅结构有效性并不能使示例
   准确或有用。通过 **api-testing**，把从契约推导出的断言与
   请求放在一起。

## 验证

对集合变更运行 `postman collection lint <collection-path>`，
对环境变更运行 `postman environment lint <path>`。然后检查
diff 是否有非预期的范围变更；当适合执行时，通过其集合运行
变更后的请求，以检查继承的上下文。将结构验证与
针对目标验证的行为分开报告。
