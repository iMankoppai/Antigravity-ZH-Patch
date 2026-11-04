---
name: dt-js-runtime
description: Dynatrace 服务端 JS 运行时 —— 函数契约、运行时限制、Web API、Node.js 模块、带凭据保管库的 fetch，以及 @dynatrace-sdk/* 目录。
license: Apache-2.0
---

# Dynatrace JavaScript 运行时

Dynatrace JS 运行时是一个服务端 AppEngine 沙箱，用于执行 JavaScript/TypeScript。

## 函数契约

每个入口点都必须导出一个默认的异步函数：

```js
export default async function () {
  // ...
  return result;
}
```

要求使用 ES 模块语法。接受 TypeScript（类型注解、接口、泛型）。不支持其他导出形态。

## 参考

从这里开始，然后只加载你需要的文件。

| 文件 | 何时加载 |
|------|-------------|
| [references/limits-and-restrictions.md](references/limits-and-restrictions.md) | 超时 / 内存 / I/O 配额；禁止的内容（`eval`、WebSocket、套接字、文件系统） |
| [references/apis-and-modules.md](references/apis-and-modules.md) | 可用的 Web API 和 Node.js 兼容模块（fetch、crypto、streams、buffer、……） |
| [references/fetch.md](references/fetch.md) | 调用内部 `/platform/...` API 或外部 URL、凭据保管库、出站允许列表 |
| [references/sdk.md](references/sdk.md) | 任何 `@dynatrace-sdk/*` 包 —— 索引会将你路由到对应的按 SDK 拆分的文件 |

## 使用 dtctl 运行函数

使用 `dtctl exec function` 无需部署应用即可运行 JS 运行时代码。

```dtctl
# Run inline code
dtctl exec function --code 'export default async function() { return "hello" }'

# Run from file
dtctl exec function -f script.js

# Pass JSON input — the parsed object is the function's argument
dtctl exec function -f script.js --payload '{"key":"value"}'
```

函数可以接受一个可选参数。`--payload` 会被解析并直接作为该参数传入 —— 它不会被包裹进 `event.payload` 字段：

```js
export default async function(payload) {
  // with --payload '{"key":"value"}', payload is {"key": "value"}
  return payload.key;
}
```

加载 **`dynatrace-control`** 技能以获取身份验证设置、上下文切换以及完整的 `exec function` 参考。
