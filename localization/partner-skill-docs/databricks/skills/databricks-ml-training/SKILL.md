---
name: databricks-ml-training
description: "在 Databricks 上训练 ML 模型。用于：分类/回归/深度学习（XGBoost、scikit-learn、LightGBM、PyTorch）配合 Optuna、@prod/@challenger 别名、批量打分（普通模型用 spark_udf，特征存储支撑的模型用 fe.score_batch）、自定义 PyFunc、自定义 ResponsesAgent（LangGraph + UC Function/Vector Search）；UC 特征表 + FeatureLookup + 时间点连接 + Lakebase 在线存储；声明式 Feature Views（create_feature、DeltaTableSource、RollingWindow/SlidingWindow/TumblingWindow、materialize_features、流式 Kafka 特征）。不适用于：端点运维（databricks-model-serving）、MLflow 评估（databricks-mlflow-evaluation）。"
compatibility: Requires databricks CLI (>= v0.294.0)
metadata:
  version: "0.1.0"
parent: databricks-core
---

# Databricks 上的 ML 训练

**首先**：使用父级 `databricks-core` 技能了解 CLI 基础、身份验证和 profile 选择。

用 MLflow 训练 → 注册到 Unity Catalog → 将**同一产物**作为 Delta 上的批量 Spark UDF 消费，或（当需要低延迟时）作为实时服务端点消费。

> **始终在 Databricks 上训练**（无服务器作业或 notebook），绝不要在智能体所在的本地 Python 进程中训练。本地训练无法访问 silver 表、没有 MLflow 跟踪服务器、没有 UC 注册路径，且如果聊天会话中断就会终止 —— 提交 `databricks jobs submit --no-wait`（见下文"以无服务器作业训练 + 部署"）。只有当用户明确要求时才回退到本地执行。

如果你需要在模型注册**之后**部署实时模型服务端点（创建端点、流量配置、版本切换、查询、Foundation Model API 端点），参见 [databricks-model-serving](../databricks-model-serving/SKILL.md)。

| 消费方式 | 何时 | 如何 |
|---|---|---|
| **批量 UDF** | 仪表板、每日/每小时评分、Genie/仪表板或应用读取的预测（通常同步到 Lakebase 表） | `mlflow.pyfunc.spark_udf(...)` → `INSERT INTO gold_predictions`。**如果模型是用 `fe.log_model(training_set=...)` 记录的，改用 `fe.score_batch()`** —— 见下方[特征工程](#feature-engineering-feature-store--feature-views)章节。 |
| **实时端点** | 在用户操作时打分（授权时反欺诈、页面加载时推荐）—— 亚 100ms | `mlflow.deployments.get_deploy_client()`（经典）/ `agents.deploy()`（智能体）。端点生命周期：参见 [databricks-model-serving](../databricks-model-serving/SKILL.md)。 |

## 默认规范流程

```
silver_<features>  +  silver_<labels>
        ▼
   notebook (as a serverless job):
   ├── train with mlflow.autolog (XGBoost / sklearn / etc.)
   ├── mlflow.register_model → UC: {catalog}.{schema}.{model}
   ├── set_registered_model_alias(name, "prod", version)
   └── spark_udf(@prod) over latest features → MERGE into gold_predictions
        ▼
gold_<entity>_predictions   ◄── dashboards, apps, Genie read this
```

> **特征存储支撑的模型在这里分岔。** 如果训练使用了 `fe.log_model(training_set=...)`，把 `spark_udf(@prod)` 换成 `fe.score_batch(model_uri, df=<keys_only>)` —— 它通过模型注册的特征血缘自动 join 特征。见下方[特征工程](#feature-engineering-feature-store--feature-views)章节。

一个 notebook，一个产物。重跑 = 重训练。Gold 是真相所在 —— 读取路径绝不直接调用模型。在开发期间将标签窗口逻辑（`failure occurred within 7 days`）保留在 notebook 中；一旦稳定，在 SDP 中提升为 silver 物化视图。

---

## 训练并注册（90% 的情况）

`mlflow.autolog()` 捕获每次运行的参数、指标、代码和模型产物；`registered_model_name=...` 会自动将最佳运行注册到 UC（自动递增版本）。用 **Optuna** 包装训练，使每个试验都是一个子运行，而被注册的是最佳的那个。

**始终 `mlflow.set_registry_uri("databricks-uc")`** —— 没有它，模型会落到已弃用的工作区注册表。**实验的父文件夹必须存在** —— `set_experiment` 不会自动创建它（会以 `NOT_FOUND: Parent directory does not exist` 失败）。在作业运行前用 `databricks workspace mkdirs` 预先创建一次。

```bash
# Once per project — create the parent folder for the MLflow experiment.
databricks workspace mkdirs /Users/me@example.com/turbine_project
```

使用 Databricks notebook 源格式（`# Databricks notebook source` 头、`# COMMAND ----------` 分隔符、`# MAGIC %md`/`%sql` magics 用于 markdown/SQL 单元）：

```python
# Databricks notebook source
# MAGIC %md
# MAGIC # Turbine failure prediction
# MAGIC
# MAGIC Train an XGBoost classifier on engineered turbine telemetry features.
# MAGIC ## Data exploration

# COMMAND ----------

# (basic data exploration — class balance, schema sanity, etc.)

# COMMAND ----------
# MAGIC %md
# MAGIC ## Training the model

# COMMAND ----------

import mlflow, mlflow.xgboost, optuna
from mlflow.tracking import MlflowClient
from xgboost import XGBClassifier
from sklearn.metrics import roc_auc_score

mlflow.set_registry_uri("databricks-uc")
mlflow.set_experiment("/Users/me@example.com/turbine_project/mlflow_experiment")

CATALOG, SCHEMA, NAME = "ai_demo_gen", "wind_farm", "turbine_failure"
FULL_NAME = f"{CATALOG}.{SCHEMA}.{NAME}"

# Autolog WITHOUT registered_model_name — otherwise every Optuna trial registers a new UC
# version, and a max-by-version pick lands on the last trial to finish, not the best one.
mlflow.xgboost.autolog(log_input_examples=True)

# For imbalanced labels: stratify the split, set scale_pos_weight = neg/pos.
def objective(trial):
    params = {
        "n_estimators":  trial.suggest_int("n_estimators", 100, 400),
        "max_depth":     trial.suggest_int("max_depth", 3, 10),
        "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.3, log=True),
    }
    with mlflow.start_run(nested=True):
        m = XGBClassifier(**params).fit(X_train, y_train)
        return roc_auc_score(y_test, m.predict_proba(X_test)[:, 1])

with mlflow.start_run(run_name="hpo") as parent:
    study = optuna.create_study(direction="maximize")
    study.optimize(objective, n_trials=20)

# COMMAND ----------
# MAGIC %md
# MAGIC ## Retrain best params and register

# COMMAND ----------
# Retrain on the winning trial's params explicitly, then register that single model.
with mlflow.start_run(run_name="best"):
    best = XGBClassifier(**study.best_params).fit(X_train, y_train)
    mlflow.log_metric("val_auc", study.best_value)
    info = mlflow.xgboost.log_model(best, name="model", registered_model_name=FULL_NAME)

# Stages are deprecated — UC uses movable aliases. Repoint @prod at the version we just registered.
client = MlflowClient(registry_uri="databricks-uc")
client.set_registered_model_alias(FULL_NAME, "prod", info.registered_model_version)
```

**框架 autolog**：`mlflow.{sklearn,xgboost,lightgbm,pytorch,tensorflow,spark}.autolog()`。

**别名，而非阶段**：UC 取消了 `Staging`/`Production`。使用可移动的 `@prod`/`@challenger`；用 `models:/{full_name}@prod` 加载。提升新版本只需一次 `set_registered_model_alias` 调用。

---

## 消费：对 Delta 的批量打分

这是**非特征表支撑的模型**的廉价、默认路径。将注册的模型加载为 Spark UDF 并对 Delta 表打分；将预测写入下游消费者读取的 gold 表。**对于特征存储支撑的模型**（用 `fe.log_model(training_set=...)` 记录），完全跳过 `spark_udf` 并使用 `fe.score_batch()` —— 见[特征工程](#feature-engineering-feature-store--feature-views)章节。

```python
# COMMAND ----------
# MAGIC %md
# MAGIC ## Score and save to a gold predictions table

# COMMAND ----------
import mlflow
from pyspark.sql import functions as F

# env_manager rules:
#   "local"     → same runtime as training (same notebook/job). Fastest, default in dev/demo.
#   "virtualenv"→ different runtime than training; rebuilds the model's env.
#   "uv"        → same as virtualenv but faster (MLflow ≥ 2.22).
predict = mlflow.pyfunc.spark_udf(
    spark,
    model_uri=f"models:/{FULL_NAME}@prod",
    env_manager="local",
)

features = spark.table(f"{CATALOG}.{SCHEMA}.silver_turbine_features_latest")
feature_cols = [c for c in features.columns if c != "turbine_id"]   # exclude the join key
scored = features.withColumn("risk_score", predict(*[features[c] for c in feature_cols]))

# Overwrite-per-run pattern for "latest score per entity":
scored.select("turbine_id", "risk_score", F.current_timestamp().alias("scored_at")) \
    .write.mode("overwrite").saveAsTable(f"{CATALOG}.{SCHEMA}.gold_turbine_predictions")
```

对于带历史的增量打分，用 MERGE 进预测表而非覆盖。

---

## 实时服务（需要时）

将模型注册到 UC 后，将其部署到 Model Serving 端点之后。开发侧调用对经典 ML 是 `mlflow.deployments.get_deploy_client("databricks").create_endpoint(...)`，对 `ResponsesAgent` 是 `agents.deploy(...)`。经典 ML 的首次部署约 5 分钟。

关于端点创建 / 更新 / 版本切换、流量配置、AI Gateway、查询、`state.ready` + `state.config_update` 双字段就绪检查，以及 Foundation Model API 端点，参见 **[databricks-model-serving](../databricks-model-serving/SKILL.md)**。

---

## 以无服务器作业训练 + 部署

训练 notebook 运行几分钟（Optuna + UC 注册；如果也部署，端点预热增加 5–15 分钟）。作为无服务器一次性运行提交，以免 CLI 阻塞。notebook 以 `dbutils.notebook.exit(json.dumps({...}))` 结束，使结构化结果（`model_version`、`val_auc`、`endpoint_name`）到达 `.notebook_output.result`。

```bash
# 1. Upload the training notebook
databricks workspace import /Workspace/Users/me@example.com/turbine_project/train \
  --file ./train_notebook.py --format SOURCE --language PYTHON --overwrite

# 2. Submit as serverless one-time run (returns {"run_id": N} immediately with --no-wait)
RUN_ID=$(databricks jobs submit --no-wait --json '{
  "run_name": "turbine-train-and-deploy",
  "tasks": [{
    "task_key": "train",
    "notebook_task": {"notebook_path": "/Workspace/Users/me@example.com/turbine_project/train"},
    "environment_key": "ml_env"
  }],
  "environments": [{
    "environment_key": "ml_env",
    "spec": {
      "client": "4",
      "dependencies": ["mlflow==3.1.0", "xgboost==2.1.3", "optuna==4.1.0", "scikit-learn==1.5.2"]
    }
  }]
}' | jq -r .run_id)

# 3. Poll until a terminal life_cycle_state.
for _ in $(seq 60); do
  STATE=$(databricks jobs get-run "$RUN_ID" | jq -r '.state.life_cycle_state // "UNKNOWN"')
  echo "$(date +%H:%M:%S) $STATE"
  [[ "$STATE" =~ ^(TERMINATED|SKIPPED|INTERNAL_ERROR)$ ]] && break
  sleep 30
done
[[ "$STATE" =~ ^(TERMINATED|SKIPPED|INTERNAL_ERROR)$ ]] || { databricks jobs cancel-run "$RUN_ID"; exit 1; }

# life_cycle_state TERMINATED only means "the run ended" — check result_state.
RESULT=$(databricks jobs get-run "$RUN_ID" | jq -r '.state.result_state // "UNKNOWN"')
echo "result_state=$RESULT"
[[ "$RESULT" == "SUCCESS" ]] || { echo "Run did not succeed"; exit 1; }

# 4. Pull structured output via the TASK run_id (NOT the submit run_id).
TASK_RUN_ID=$(databricks jobs get-run "$RUN_ID" | jq -r '.tasks[0].run_id')
databricks jobs get-run-output "$TASK_RUN_ID" | jq '.notebook_output.result'
# → '{"model_version":"3","val_auc":0.91,"rows_scored":124,"endpoint":"turbine-risk-endpoint"}'
```

需要留意的常见 `jobs submit` 陷阱：无服务器 notebook 任务需要 `environments[].spec.client: "4"`；对于 `get-run-output`，使用 TASK run_id（`tasks[0].run_id`）—— 而非 submit run_id；`print()` 在无服务器一次性运行上不可靠（使用 `dbutils.notebook.exit(json.dumps(...))`）；`jobs submit` 拒绝 `tags`。关于更广泛的 `databricks-jobs` 技能，参见 **[databricks-jobs](../databricks-jobs/SKILL.md)**。

---

## 自定义 pyfunc

当 sklearn/XGBoost autolog 不够时 —— 自定义预处理、多个子模型、外部 API 调用、集成逻辑。完整实例参见 **[references/custom-pyfunc.md](references/custom-pyfunc.md)**。两件不那么显而易见的事：

- **`python_model="path/to/file.py"`**（文件路径，而非类实例）+ 在该文件末尾 `mlflow.models.set_model(MyModel())`。这是"Models from Code"模式 —— 文件被原样记录，不对类进行 pickle。
- 在部署前 **`mlflow.models.predict(model_uri=..., input_data=..., env_manager="uv")`**。在端点之前捕获缺失的依赖。

---

## 自定义 GenAI 智能体

手工编写的 `ResponsesAgent`（LangGraph + UC Function 工具 + Vector Search 检索）—— 参见 **[references/genai-agents.md](references/genai-agents.md)**。

优先通过 [databricks-agent-bricks](../databricks-agent-bricks/SKILL.md)（Knowledge Assistants、Supervisor Agents）进行无代码编写，除非用户明确需要自定义 LangGraph 智能体。

---

## 特征工程：特征存储与 Feature Views

何时应使用特征工程（任一形式）而非普通 Delta 表：当同一特征在训练时和服务时必须完全相同地计算（无训练/服务偏差），特征依赖时间并需要针对标签的时间点连接（无未来泄露），特征需要通过在线存储以 <10ms 延迟提供，或特征跨模型共享且血缘在 UC 中跟踪。如果都不适用，普通 UC 表就够了 —— 下面的章节可以跳过。

**默认：除非上述原因之一明确适用或用户明确要求，否则不要使用特征工程。** 它增加构建时间和复杂度（`FeatureLookup` 需要额外一层 Delta 表；Feature Views 需要一个物化管道）。如果不确定，使用普通 UC 表，等具体需求出现时再添加特征工程。

两种形式，一条训练/打分路径（`create_training_set` → `fe.log_model` → `fe.score_batch`）：

- **`FeatureLookup` API** —— 你拥有特征表（计算、写入、刷新）；通过 `FeatureLookup` + `FeatureEngineeringClient` 将它们绑定到训练集。当特征已作为 Delta 表存在，或你想直接控制它们的计算方式时使用它。参见 **[references/feature-store.md](references/feature-store.md)**。
- **Feature Views**（声明式、GA、`databricks-feature-engineering>=0.16.0`）—— Databricks 拥有计算、物化（Delta 离线 + Lakebase 在线）和你声明的 spec 的刷新（`create_feature` 基于 `DeltaTableSource`；`RollingWindow`/`SlidingWindow`/`TumblingWindow`；Kafka 特征用 `create_stream`）。当特征是你希望 Databricks 保持最新的公式时使用它。参见 **[references/feature-views.md](references/feature-views.md)**。

---

## 陷阱（那些耗费时间的）

| 陷阱 | 修复 |
|---|---|
| 模型落到工作区注册表，而非 UC | 在记录*之前* `mlflow.set_registry_uri("databricks-uc")` |
| 端点首次查询返回 PERMISSION_DENIED | 将 `resources=[...]` 传给 `log_model`（涵盖 UC 函数、VS 索引、其他端点、Lakebase）—— 完整列表见 [references/genai-agents.md#resources-that-need-passthrough-auth](references/genai-agents.md#resources-that-need-passthrough-auth) |
| 使用了 `transition_model_version_stage` | 阶段在 UC 中已弃用。使用 `client.set_registered_model_alias(name, "prod", version)` |
| `spark_udf` 每次调用都重建 virtualenv | 当训练+打分共享同一运行时，传 `env_manager="local"` |
| `pip_requirements` 不匹配导致端点在加载时崩溃 | 固定确切版本；或用 `f"mlflow=={get_distribution('mlflow').version}"` 拉取实时版本 |
| `agents.deploy()` 产生了名字奇怪的端点 | 显式传 `endpoint_name=...`。自动推导的名是 `agents_<catalog>-<schema>-<model>` |

端点生命周期陷阱（就绪双状态、版本切换、Serving-UI SP 过滤器）在 [databricks-model-serving](../databricks-model-serving/SKILL.md) 中。

---

## 参考文件

| 文件 | 内容 |
|---|---|
| [references/custom-pyfunc.md](references/custom-pyfunc.md) | 单个端到端自定义 pyfunc 示例：产物、签名、code_paths、log → 注册 → 部署 → 查询。 |
| [references/genai-agents.md](references/genai-agents.md) | 使用 UC Function + Vector Search 工具的自定义 LangGraph `ResponsesAgent`。`create_text_output_item` 陷阱和 `resources=[...]` 直通认证列表。对于无代码智能体优先用 **databricks-agent-bricks**。 |
| [references/feature-store.md](references/feature-store.md) | Unity Catalog 中的特征工程（标准 `FeatureLookup` API）：`FeatureEngineeringClient`、带 `timeseries_column` 的 `create_table`、带时间点连接的 `FeatureLookup`、带血缘的 `fe.log_model`、`fe.score_batch`（替代 FE 模型的 `spark_udf`），以及通过 `publish_table` 的 Lakebase 在线存储。要求 `databricks-feature-engineering>=0.16.0`。 |
| [references/feature-views.md](references/feature-views.md) | Feature Views（声明式特征工程，GA）：基于 `DeltaTableSource` 的 `create_feature`、`RollingWindow`/`SlidingWindow`/`TumblingWindow` 聚合、`materialize_features`（离线 + 在线）、通过 `create_stream` 从 Kafka 获取流式特征、时间点训练集，以及 Feature Serving Endpoint。要求 `databricks-feature-engineering>=0.16.0`。 |

## 相关技能

- **[databricks-model-serving](../databricks-model-serving/SKILL.md)** —— 服务端点生命周期（创建、查询、update-config、版本切换、AI Gateway、Foundation Model API 端点）。
- **[databricks-agent-bricks](../databricks-agent-bricks/SKILL.md)** —— 无代码 Knowledge Assistants 和 Supervisor Agents。优先用它而非手工编写智能体。
- **[databricks-mlflow-evaluation](../databricks-mlflow-evaluation/SKILL.md)** —— 在提升 `@prod` 之前评估模型/智能体质量。
- **[databricks-vector-search](../databricks-vector-search/SKILL.md)** —— 智能体中用作检索工具的向量索引。
- **[databricks-jobs](../databricks-jobs/SKILL.md)** —— 异步部署模式（`--no-wait`、TASK run_id 陷阱）。
- **[databricks-unity-catalog](../databricks-unity-catalog/SKILL.md)** —— UC 治理已注册模型：权限、血缘、审计。
