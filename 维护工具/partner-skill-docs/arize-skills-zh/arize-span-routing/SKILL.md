---
name: arize-span-routing
description: 当一个 Python 服务必须依据应用元数据将每个 agent、租户、团队或请求的 span 发送到正确的 Arize 空间和项目时使用。涵盖面向自定义 agent 构建器和多租户应用的动态 OpenTelemetry 路由，包括 register_with_routing、set_routing_context、多空间追踪和自定义 span 路由。
metadata:
  author: arize
  version: "1.0"
compatibility: Requires Python, arize-otel 0.11.0 or newer, and one Arize API key authorized for every destination space.
---

# Arize Span 路由技能

使用本技能可将一个 Python 服务中的每个被追踪操作发送到其正确的 Arize 空间和项目。每个操作在它的首个 span 开始之前，必须解析出恰好一个 `space_id` 和 `project_name`。

不要对普通的单项目追踪使用本技能；请使用 `arize-instrumentation`。本技能不会在导出后重路由 span、回填历史 span、创建 Arize 空间/项目，或凭空构造客户特定的元数据映射。

## 安全规则

- 绝不猜测目标，也绝不静默使用其他租户的目标。
- 绝不在代码中嵌入 API key，或要求用户将 key 粘贴到聊天中。从环境中读取 `ARIZE_API_KEY`。
- 保留现有的非 Arize exporter 和 processor。移除或替换固定目标的 Arize 导出路径，以免被路由的 span 同时被复制到该目标。
- 缺失、无效或不可用的路由元数据必须让业务操作继续运行，但其 span 不导出到 Arize。在一个全新的 OpenTelemetry 上下文中运行该操作，以免过期的路由值跨租户泄漏。记录一条警告，但不包含机密或敏感的元数据值。
- 使用一个对每个目标空间都已授权的 API key。若并非如此，停下并报告凭据阻塞点。

## 阶段 1：检查并定义契约

在路由契约清晰之前只读。

1. 确定要修改的确切 Python 服务和入口点。
2. 找到当前的追踪初始化、provider/exporter、埋点和客户端创建顺序。
3. 找到拥有目标元数据的请求或 agent 执行边界。
4. 确定能解析为以下内容的稳定元数据字段以及现有的事实来源：
   - Arize `space_id`
   - Arize `project_name`
5. 检查可能比请求上下文存活更久的异步任务、线程池、队列或后台 worker。
6. 找到应用的测试命令和现有测试风格。

只检查目标应用的配置。不要为寻找凭据而搜索不相关的代码仓库、同级服务、shell 启动文件或任意 `.env` 文件。

如果服务范围、元数据字段、映射来源或目标行为有任何歧义，停下并询问所需的最少问题。不要先安装包或编辑代码。如果用户要求实现且这四项都很清晰，简要总结契约后继续。

## 阶段 2：实现

### 1. 确保存在路由支持

使用项目的包管理器要求 `arize-otel>=0.11.0`。不要更改不相关的依赖。

### 2. 只初始化一次路由

对于没有现有 OpenTelemetry provider 的应用，在埋点和 LLM 客户端之前初始化路由：

```python
import os

from arize.otel import register_with_routing

tracer_provider = register_with_routing(
    api_key=os.environ["ARIZE_API_KEY"],
)
```

如果应用已拥有一个带非 Arize 遥测的 provider，保留它并添加路由 processor：

```python
import os

from arize.otel import ArizeRoutingSpanProcessor, Endpoint, Transport

tracer_provider.add_span_processor(
    ArizeRoutingSpanProcessor(
        api_key=os.environ["ARIZE_API_KEY"],
        endpoint=Endpoint.ARIZE,
        transport=Transport.GRPC,
    )
)
```

存在时复用应用已配置的端点和传输方式。绝不要在另一个全局 provider 已安装之后再调用 `register_with_routing`。如果该 provider 还带有固定的 Arize processor/exporter，在添加路由之前于其初始化中移除该固定路径；OpenTelemetry processor 在启动后无法安全移除。

### 3. 解析单一路由目标

适配应用现有的元数据模型；不要为一次查找引入框架。解析器必须返回两个非空值，或返回无目标。将映射数据保留在其现有的事实来源中，而不是在追踪代码中重复。

```python
from dataclasses import dataclass


@dataclass(frozen=True)
class RoutingTarget:
    space_id: str
    project_name: str
```

仅当代码库缺少等价类型时才使用此类型。在任何被追踪的工作开始之前验证结果。

### 4. 围绕完整操作设置上下文

在拥有元数据且包含每个子 span 的最高边界处进入路由上下文：

将下面的 `RoutingLookupError` 替换为解析器特定的现有查找/配置异常。

```python
from opentelemetry import context as context_api
from arize.otel import set_routing_context


def run_without_arize_routing(request):
    token = context_api.attach(context_api.Context())
    try:
        return run_agent(request)
    finally:
        context_api.detach(token)


def handle_agent_request(request):
    try:
        target = resolve_routing_target(request.agent_metadata)
    except RoutingLookupError:
        logger.warning("Arize routing lookup failed; spans will not be exported")
        return run_without_arize_routing(request)

    if target is None or not target.space_id or not target.project_name:
        logger.warning("No Arize routing target; spans will not be exported")
        return run_without_arize_routing(request)

    with set_routing_context(
        space_id=target.space_id,
        project_name=target.project_name,
    ):
        return run_agent(request)
```

只捕获解析器预期的查找/配置异常；不要隐藏不相关的应用失败。无目标路径上的全新上下文有意防止继承的路由值到达 Arize。它可能为其他 exporter 启动一个新 trace；租户隔离优先。如果必须保留分布式父级，请将缺失的公共路由清除 API 作为 SDK 后续事项报告，而不是使用私有上下文键。

在路由上下文内创建的所有自动埋点和手动子 span 都会继承 `arize.space_id` 和 `arize.project.name`。不要在 span 已开始后再设置路由。

对于后台工作，显式传播 OpenTelemetry 上下文，或在 worker 中解析并进入新的路由上下文。绝不要在队列或线程边界之后依赖请求本地上下文。

关于 agent 实验端点、现有 provider 细节、并发规则、测试、验证和故障排查，参见 `references/REFERENCE.md`。

## 验证

1. 为解析器和执行边界运行聚焦的单元测试。
2. 证明两个不同的元数据值会产生两个不同的空间/项目对。
3. 证明子 span 继承所选的对。
4. 证明并发操作不会泄漏路由上下文。
5. 证明未知元数据和解析器失败会清除继承的路由、不向任何回退目标导出 span，并让业务逻辑继续运行。
6. 证明预先存在的非 Arize exporter/processor 保持挂载，且不残留固定的 Arize 路径。
7. 在非生产空间中为每个目标触发一个唯一命名的 trace。
8. 使用相同凭据上下文的 `arize-trace` 确认每个 trace 只存在于其预期目标中。

对于短生命周期脚本，在退出前调用 `force_flush()` 和 `shutdown()`。以**已确认**、**已确认但带警告**或精确的阻塞点收尾；当要求实时验证时，绝不要仅凭单元测试就报告完成。

## 护栏与限制

- 两个路由值都必需。缺少任一值的 span 会被跳过。
- `ArizeRoutingSpanProcessor` 为每个唯一空间创建并缓存一个 processor。在实现之前标记无界或高基数的空间 ID。
- 路由仅选择空间和项目；其他客户元数据仍应放在常规 OpenInference 属性中。
- 如果 dogfooding 暴露出 `arize-otel` 缺失的能力，停下并提出单独的 SDK 变更，而不是添加兼容性 hack。

## 相关技能

- `arize-instrumentation`：首次或单目标追踪
- `arize-trace`：导出后验证与调试
- `arize-admin`：检查或管理已授权的空间和 API key
