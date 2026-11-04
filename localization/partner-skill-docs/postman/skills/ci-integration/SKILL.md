---
name: ci-integration
description: 在向 CI 添加 API 测试、结构或治理 lint、或 AI 就绪门槛，或在合并后把已审查的 API 产物发布到 Postman 工作区时使用。让契约检查可重复，并把验证与共享工作区变更分离。用于诸如“在每个 PR 上运行这个集合”之类的请求。
---

# CI 集成

带版本的集合与规范让一个 PR 能把其 API 检查与代码
变更放在一起。CI 独立于作者的会话重跑这些检查，而
合并后发布则让已审查的契约可供队友与
未来工作使用。**api-discovery** 有助于识别该门槛应覆盖的消费者；
作者自己通过的测试并不能确立跨服务兼容性。

1. 根据要确立的保证选择检查：

   | 保证 | 门槛 |
   | --- | --- |
   | 已保存的行为断言通过 | `postman collection run <path-or-id>` |
   | 集合的结构/风格有效 | `postman collection lint <path> -f error` |
   | 规范符合工作区治理规则 | `postman spec lint <spec> --workspace-id <id> -f error` |
   | 工作区实体与绑定通过 lint/治理 | `postman workspace lint --workspace-id <id> -f error` |
   | 智能体可消费性达到约定阈值 | `postman collection ai-readiness <path> --min-score <n>` 或规范的对应形式 |

   集合 lint 不应用组织治理。工作区感知的
   lint 评估该工作区可用的规则；它并不编撰
   策略。在声称合规之前，请确认已配置预期的规则。阅读命令专属的 `-h`
   了解已安装的选项。
2. 让门槛结果可区分，使失败的构建能识别是行为、
   结构、治理还是就绪度的问题。保留非零退出；用
   `-x`/`--suppress-exit-code` 抑制它们会移除该门槛。对于集合运行，
   `-r junit,html` 生成可供审查的报告；`--bail` 用更早的信号换掉
   完整的失败清单。关于断言语义见 **api-testing**，
   关于分数局限见 **ai-readiness**。
3. 当测试使用已声明的依赖时，用 `postman dependency install` 恢复它们。
   请有意选择目标：mock 在模型下检查行为，
   而实时运行会发送真实请求且可能写入数据。PR 门槛
   应使用合适的隔离目标与凭据；作为测试并不
   使该命令变为只读。
4. 仅对需要工作区资源的作业进行鉴权。使用 CI 机密
   存储提供 `POSTMAN_API_KEY`，然后
   `postman login --with-api-key "$POSTMAN_API_KEY"`。仅本地的门槛无需
   登录。命令专属的 API-key 标志并不是跨 lint 与 push 操作
   对登录的通用替代。未解决的绑定使用 **bootstrap**，
   请求凭据使用 **variables**。
5. 只在其合并检查通过后发布已审查的分支。
   `postman workspace push -y` 会改变共享上下文；由 PR 触发的 push
   会发布一个尚未合并的契约。正常的准备阶段会为新实体分配 ID，
   因此 `--no-prepare` 可能使新增内容未发布。
   在配置此作业时检查预期的 diff 与绑定；`-y`
   提供的是非交互执行，而非对不同范围的授权。
6. 除非精确镜像本身就是明确要求，否则使用默认的创建/更新策略。
   `--push-strategy force-sync` 可能删除检出中缺失的工作区
   实体，包括在别处管理的资源。
   对该分支遵循 **bootstrap** 的 diff 与同意边界。

## 验证

验证工作流的事件条件与机密引用，然后报告
实际运行了哪些门槛、其目标与各自结果。区分
本地检查过的工作流与观察到的 CI 运行。对于发布，要确立
合并触发器、推送策略、创建/更新的实体与冲突；
仅一个绿色的作业并不证明预期的产物已变得可用。
