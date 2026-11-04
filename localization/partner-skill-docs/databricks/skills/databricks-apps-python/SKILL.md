---
name: databricks-apps-python
description: "Databricks Apps 的 Python 后端 —— FastAPI（默认）、Flask、Dash、Streamlit、Gradio、Reflex。**新的 Databricks App 默认应使用 `databricks-apps`（AppKit —— Node/TypeScript/React）—— 优先使用它。** 仅当用户要求 Python 后端、扩展现有 Python 应用，或团队仅使用 Python 时才使用本技能。涵盖 OAuth 认证、应用资源、SQL 数仓和 Lakebase 连接、基础模型 / Vector Search / 模型服务 API（通过 `databricks-python-sdk`），以及通过 CLI 或 DABs 部署。"
compatibility: Requires databricks CLI (>= v1.0.0)
metadata:
  version: "0.1.0"
parent: databricks-core
---

# Databricks 应用 —— Python 后端

> **首先，确认本技能是正确的选择。** 新 Databricks Apps 的默认是 **[databricks-apps](../databricks-apps/SKILL.md)**（AppKit —— Node.js + TypeScript + React SDK）。除非用户明确要求 Python 后端、正在扩展现有 Python 应用，或团队仅使用 Python，否则先加载那个技能。下面的一切都是 Python 后端的替代方案。

## Python 应用的关键规则（始终遵循）

- **必须**确认框架选择，或使用下方的 [Python 框架选择](#python-framework-selection)
- **必须**使用 SDK 的 `Config()` 进行身份验证（绝不硬编码 token）
- **必须**使用 `app.yaml` 的 `valueFrom` 引用资源（绝不硬编码资源 ID）
- **必须**使用 `dash-bootstrap-components` 进行 Dash 应用布局和样式
- **必须**为 Streamlit 数据库连接使用 `@st.cache_resource`
- **必须**用 Gunicorn 部署 Flask，用 uvicorn 部署 FastAPI（而非开发服务器）

## Python 应用的必需步骤

复制此检查清单并逐项核实：
```
- [ ] Framework selected
- [ ] Auth strategy decided: app auth, user auth, or both
- [ ] App resources identified (SQL warehouse, Lakebase, serving endpoint, etc.)
- [ ] Backend data strategy decided (SQL warehouse, Lakebase, or SDK)
- [ ] Deployment method: CLI or DABs
```

---

## Python 框架选择

| 框架 | 最适用于 | app.yaml 命令 |
|-----------|----------|------------------|
| **FastAPI**（默认） | 默认的任何 Python 后端 —— 异步 API、自动生成的 OpenAPI 文档、提供 JSON 的应用 | `["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]` |
| **Flask** | 自定义 REST API、轻量应用、webhook | `["gunicorn", "app:app", "-w", "4", "-b", "0.0.0.0:8000"]` |
| **Dash** | 生产仪表板、BI 工具、复杂交互 | `["python", "app.py"]` |
| **Streamlit** | 快速原型、数据科学应用、UI 是一系列 Python 组件的内部工具 | `["streamlit", "run", "app.py"]` |
| **Gradio** | ML 演示、模型界面、聊天 UI | `["python", "app.py"]` |
| **Reflex** | 无需 JavaScript 的全栈 Python 应用 | `["reflex", "run", "--env", "prod"]` |

**默认：FastAPI。** 除非用户明确要求 Streamlit 式的组件原型（Streamlit）、重型仪表板网格（Dash），或 Gradio 式的 ML 演示，否则使用 FastAPI。FastAPI 与 JS/HTML 前端或消费 JSON 的调用方天然搭配 —— 这与 `databricks-apps` 在 Node 侧采用的姿态相同。

---

## 快速参考

| 概念 | 细节 |
|---------|---------|
| **运行时** | Python 3.11、Ubuntu 22.04、2 vCPU、6 GB RAM |
| **预装** | Dash 2.18.1、Streamlit 1.38.0、Gradio 4.44.0、Flask 3.0.3、FastAPI 0.115.0 |
| **认证（应用）** | 通过 `Config()` 使用服务主体 —— 自动注入 `DATABRICKS_CLIENT_ID`/`DATABRICKS_CLIENT_SECRET` |
| **认证（用户）** | `x-forwarded-access-token` 标头 —— 参见 [references/1-authorization.md](references/1-authorization.md) |
| **资源** | app.yaml 中的 `valueFrom` —— 参见 [references/2-app-resources.md](references/2-app-resources.md) |
| **SDK / Foundation Models / Vector Search / Model Serving** | 使用 `databricks-python-sdk` 技能 —— 相同的 `WorkspaceClient` 和 OpenAI 兼容的基础模型模式在 Databricks App 内同样适用。对于 UC 模型服务（`system.ai.*`），参见 [references/2-app-resources.md](references/2-app-resources.md) 中的模型服务说明和 `databricks-unity-gateway` 技能 |
| **文档** | https://docs.databricks.com/dev-tools/databricks-apps/ |

---

## 详细指南

**授权**：在配置应用或用户授权时使用 [references/1-authorization.md](references/1-authorization.md) —— 涵盖服务主体认证、代表用户（on-behalf-of）token、OAuth scope 和逐框架代码示例。（关键词：OAuth、服务主体、用户认证、on-behalf-of、访问 token、scope）

**应用资源**：在将应用连接到 Databricks 资源时使用 [references/2-app-resources.md](references/2-app-resources.md) —— 涵盖 SQL 数仓、Lakebase、模型服务、密钥、卷和 `valueFrom` 模式。（关键词：资源、valueFrom、SQL 数仓、模型服务、密钥、卷、连接）

**框架**：参见 [references/3-frameworks.md](references/3-frameworks.md) 了解各框架的 Databricks 特有模式 —— FastAPI（默认）、Flask、Dash、Streamlit、Gradio、Reflex —— 包含认证集成和部署命令。（关键词：FastAPI、Flask、Dash、Streamlit、Gradio、Reflex、框架选择）

**部署**：在部署应用时使用 [references/4-deployment.md](references/4-deployment.md) —— 涵盖 Databricks CLI、声明式自动化捆绑包（DABs）、app.yaml 配置和部署后验证。（关键词：部署、CLI、DABs、资产捆绑包、app.yaml、日志）

**Lakebase**：在使用 Lakebase（PostgreSQL）作为应用数据层时使用 [references/5-lakebase.md](references/5-lakebase.md) —— 涵盖自动注入的环境变量、psycopg2/asyncpg 模式，以及何时选择 Lakebase 而非 SQL 数仓。（关键词：Lakebase、PostgreSQL、psycopg2、asyncpg、事务性、PGHOST）

**CLI 命令**：使用 [references/6-cli-approach.md](references/6-cli-approach.md) 通过 CLI 管理应用生命周期 —— 涵盖创建、部署、监控和删除应用。（关键词：CLI、创建应用、部署应用、应用日志）

**Foundation Models / SDK / Vector Search / Model Serving**：使用 **[databricks-python-sdk](../databricks-python-sdk/SKILL.md)** 技能了解 OpenAI 兼容的基础模型客户端、`WorkspaceClient` 调用、Vector Search 和模型服务调用 —— 相同的模式在 Databricks App 内适用。本技能的 `examples/` 文件夹中的示例（`fm-minimal-chat.py`、`fm-parallel-calls.py`、`fm-structured-outputs.py`、`llm_config.py`）只展示应用侧的接线。对于 **UC 模型服务**（`system.ai.*`，在 `/ai-gateway/mlflow/v1` 上调用），参见 [references/2-app-resources.md](references/2-app-resources.md) 中的模型服务说明和 **`databricks-unity-gateway`** 技能。

---

## 工作流

1. 确定任务类型：

   **从零开始的新应用？** → 先加载 **[databricks-apps](../databricks-apps/SKILL.md)**（AppKit / Node）。只有当用户明确要求 Python 后端时才留在本技能中。
   **已确认 Python 后端？** → [Python 框架选择](#python-framework-selection) —— 默认为 FastAPI。
   **设置授权？** → 阅读 [references/1-authorization.md](references/1-authorization.md)
   **连接数据/资源？** → 阅读 [references/2-app-resources.md](references/2-app-resources.md)
   **使用 Lakebase（PostgreSQL）？** → 阅读 [references/5-lakebase.md](references/5-lakebase.md)
   **部署到 Databricks？** → 阅读 [references/4-deployment.md](references/4-deployment.md)
   **使用 CLI 管理应用生命周期？** → 阅读 [references/6-cli-approach.md](references/6-cli-approach.md)
   **调用基础模型 / LLM API、Vector Search 或模型服务端点？** → 加载 **[databricks-python-sdk](../databricks-python-sdk/SKILL.md)** 技能。本技能的 `examples/` 文件夹只展示基于那些 SDK 模式之上的应用侧接线。

2. 遵循相关指南中的说明。

---

## 核心架构

所有 Python Databricks 应用都遵循此模式：

```
app-directory/
├── app.py                 # Main application (or framework-specific name)
├── models.py              # Pydantic data models
├── backend.py             # Data access layer
├── requirements.txt       # Additional Python dependencies
├── app.yaml               # Databricks Apps configuration
└── README.md
```

### 后端切换模式

```python
import os
from databricks.sdk.core import Config

USE_MOCK = os.getenv("USE_MOCK_BACKEND", "true").lower() == "true"

if USE_MOCK:
    from backend_mock import MockBackend as Backend
else:
    from backend_real import RealBackend as Backend

backend = Backend()
```

### SQL 数仓连接（所有框架共享）

```python
from databricks.sdk.core import Config
from databricks import sql

cfg = Config()  # Auto-detects credentials from environment
conn = sql.connect(
    server_hostname=cfg.host,
    http_path=f"/sql/1.0/warehouses/{os.getenv('DATABRICKS_WAREHOUSE_ID')}",
    credentials_provider=lambda: cfg.authenticate,
)
```

### Pydantic 模型

```python
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum

class Status(str, Enum):
    ACTIVE = "active"
    PENDING = "pending"

class EntityOut(BaseModel):
    id: str
    name: str
    status: Status
    created_at: datetime

class EntityIn(BaseModel):
    name: str = Field(..., min_length=1)
    status: Status = Status.PENDING
```

---

## 常见问题

| 问题 | 解决方案 |
|-------|----------|
| **连接耗尽** | 使用 `@st.cache_resource`（Streamlit）或连接池 |
| **未找到认证 token** | 检查 `x-forwarded-access-token` 标头 —— 仅在部署后可用，本地不可用 |
| **应用无法启动** | 检查 `app.yaml` 命令与框架匹配；检查 `databricks apps logs <name>` |
| **资源无法访问** | 通过 UI 添加资源，核实 SP 有权限，在 app.yaml 中使用 `valueFrom` |
| **部署时导入错误** | 将缺失的包添加到 `requirements.txt`（预装的包无需列出） |
| **Lakebase 应用启动时崩溃** | `psycopg2`/`asyncpg` **未**预装 —— 必须添加到 `requirements.txt` |
| **端口冲突** | 应用必须绑定到 `DATABRICKS_APP_PORT` 环境变量（默认 8000）。绝不要用 8080。Streamlit 已自动配置；其他框架在代码中读取该环境变量，或在 app.yaml 命令中使用 8000 |
| **Streamlit：set_page_config 错误** | `st.set_page_config()` 必须是第一个 Streamlit 命令 |
| **Dash：布局无样式** | 添加 `dash-bootstrap-components`；使用 `dbc.themes.BOOTSTRAP` |
| **查询缓慢** | 事务性/低延迟用 Lakebase；分析查询用 SQL 数仓 |

---

## 平台约束

| 约束 | 细节 |
|------------|---------|
| **运行时** | Python 3.11、Ubuntu 22.04 LTS |
| **计算** | 2 vCPU、6 GB 内存（默认） |
| **预装框架** | Dash、Streamlit、Gradio、Flask、FastAPI、Shiny |
| **自定义包** | 添加到应用根目录的 `requirements.txt` |
| **网络** | 应用可访问 Databricks API；外部访问取决于工作区配置 |
| **用户认证** | GA，默认开启 —— 无需管理员启用；声明 `user_api_scopes` 以添加 scope |

---

## 官方文档

- **[Databricks Apps 概览](https://docs.databricks.com/dev-tools/databricks-apps/)** —— 主要文档中心
- **[授权](https://docs.databricks.com/dev-tools/databricks-apps/auth)** —— 应用认证和用户认证
- **[资源](https://docs.databricks.com/dev-tools/databricks-apps/resources)** —— SQL 数仓、Lakebase、服务、密钥
- **[app.yaml 参考](https://docs.databricks.com/dev-tools/databricks-apps/app-runtime)** —— command 和环境配置
- **[系统环境](https://docs.databricks.com/dev-tools/databricks-apps/system-env)** —— 预装包、运行时细节

## 相关技能

- **[databricks-apps](../databricks-apps/SKILL.md)** —— 新 Databricks Apps 的默认（AppKit / Node / TypeScript + React）；除非明确要求 Python 后端，否则先加载它
- **[databricks-python-sdk](../databricks-python-sdk/SKILL.md)** —— `WorkspaceClient`、OpenAI 兼容的基础模型客户端、Vector Search、模型服务调用；相同的模式在 Databricks App 内可用
- **[databricks-lakebase](../databricks-lakebase/SKILL.md)** —— 持久化的 PostgreSQL 状态（带分支的自动扩缩托管 PG）
- **[databricks-model-serving](../databricks-model-serving/SKILL.md)** —— 应用所调用 ML 模型的端点生命周期
- **databricks-dabs** —— 通过 DABs 部署应用
