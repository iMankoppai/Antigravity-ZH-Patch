---
name: variables
description: 在跨环境参数化请求、选择变量作用域、在脚本中串联值，或引用凭据而不提交或暴露它们时使用。在把目标配置与机密值分离的同时，保持一个可复用的集合。用于诸如“这个 API key 应该放在哪里”之类的请求。
---

# 变量

变量让一个已维护的集合针对不同目标运行，而无需
为其请求分叉。作用域决定哪个值胜出；机密引用
让同一批文件可被共享，而不共享凭据值。

1. 把 API 默认值放在集合变量中，把目标专属值（例如
   `base_url`）放在环境中。参数化实际会变化的值；
   一个稳定的字面值不必再变成另一个配置选择。在 URL、请求头、参数或请求体中
   以 `{{key}}` 引用值。
2. 通过优先级来解决意外：本地脚本值覆盖
   迭代数据，其后依次是环境、集合与全局值。一个正确的
   环境文件仍可能输给行或脚本覆盖。值可以
   引用其他变量并在发送时解析，因此请检查整条链，
   而不只是最终的请求字段。
3. 使用运行时值把响应串联到后续请求。当作用域是有意
   设定时，选择 `pm.environment` 或 `pm.collectionVariables`；
   `pm.variables.get` 跨作用域读取，`pm.variables.set` 保存一个当前运行
   的本地值。对于临时的敏感值，避免将其持久化
   到环境或记录到日志。
4. 把持久凭据存储在共享保险库中并提交引用。
   仅 `type: secret` 会遮蔽 UI，但仍留下可读的
   字面 YAML 值。**collection-schema-v3** 的环境参考描述了
   文件 schema；命令专属的 `-h` 提供受支持的保险库操作。

对于非敏感的目标配置：

```bash
postman environment new "Staging"
postman environment var set base_url https://staging.example.com \
  --environment "postman/environments/Staging.environment.yaml"
```

对于机密，让用户通过 CLI 的遮蔽提示提供值，
而不是通过智能体上下文或字面命令参数：

```bash
postman secret create STRIPE_API_KEY --workspace <workspace-id>
postman environment var set api_key --secret-id <secret-id> --vault-id <vault-id> \
  --environment "postman/environments/Staging.environment.yaml"
```

随后环境携带的是保险库/机密 ID，而不是值。
机密解析与查看机密的权限是两回事；一名队友
运行请求的能力不一定向他暴露该凭据。当保险库操作需要
解决尚未完成的鉴权时，使用 **bootstrap**。

## 验证

运行 `postman environment lint <path> --fail-severity warning`，以便在已保存环境中
对警告与错误一并失败。Lint 检查产物；
它并不证明该会话能解析某个保险库机密。用一次合适的
已鉴权请求与一个从契约推导的断言来验证解析，
并让凭据远离输出。未解析引用或授权
失败需要调查，而不是声称机密已生效。
报告所选的环境与作用域，
或提供该值的引用；仅一个遮蔽的显示并不证明
已提交文件不含字面机密。
