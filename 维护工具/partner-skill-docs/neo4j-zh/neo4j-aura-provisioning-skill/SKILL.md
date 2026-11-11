---
name: neo4j-aura-provisioning-skill
description: 通过 CLI（aura-cli v1.7+）或 REST API 预配和管理 Neo4j Aura 实例。
  在创建、暂停、恢复、调整大小或删除 AuraDB Free/Professional/Business Critical/VDC
  实例；下载凭据；编写 CI/CD 流水线脚本；轮询异步状态；或使用
  Terraform neo4j-labs/neo4jaura provider 时使用。涵盖认证设置（客户端凭据 OAuth2）、凭据
  生命周期（仅可下载一次——永远无法恢复）、实例类型选择、区域代码以及 Python
  预配脚本。不处理 Cypher 查询——请使用 neo4j-cypher-skill。
  不涵盖 Graph Data Science 算法——请使用 neo4j-gds-skill 或 neo4j-aura-graph-analytics-skill。
  不涵盖 neo4j-admin/cypher-shell——请使用 neo4j-cli-tools-skill。
version: 1.0.5
allowed-tools: Bash WebFetch
---

## 何时使用
- 创建 Aura 实例（CLI、REST API、Python、Terraform）
- 暂停、恢复、调整大小或删除实例
- 从创建响应中下载初始凭据
- 轮询实例状态：`creating` → `running`
- 设置 CI/CD 预配或拆除流水线
- 选择实例档位（Free vs Professional vs Business Critical vs VDC）

## 何时不使用
- **对运行中的 DB 执行 Cypher 查询** → `neo4j-cypher-skill`
- **Aura 上的 GDS 算法** → `neo4j-gds-skill`（带插件的 Pro）或 `neo4j-aura-graph-analytics-skill`（无服务器）
- **neo4j-admin / cypher-shell** → `neo4j-cli-tools-skill`
- **应用驱动设置** → 使用某种语言的驱动技能（python、javascript、java、go、dotnet）

---

## 实例档位决策表

| 档位 | API 类型代码 | 内存 | GDS | 副本 | 何时使用 |
|---|---|---|---|---|---|
| AuraDB Free | `free-db` | 1 GB | ❌ | ❌ | 开发/演示；≤200k 节点/400k 关系 |
| AuraDB Professional | `professional-db` | 2–64 GB | 提供插件 | ❌ | 生产工作负载 |
| AuraDB Business Critical | `business-critical` | 4–384 GB | 提供插件 | ✅ | HA、多 AZ、SLA |
| AuraDB VDC | `enterprise-db` | 自定义 | ✅ | ✅ | 专用基础设施、合规 |
| AuraDS Professional | `professional-ds` | 2–64 GB | ✅ 内置 | ❌ | 数据科学 / GDS |
| AuraDS Enterprise | `enterprise-ds` | 自定义 | ✅ | ✅ | 企业级 GDS |

**AuraDB Free 限制**：200k 节点、400k 关系；空闲 72 小时后自动暂停；暂停超过 30 天则删除；不可调整大小。

---

## 认证设置

### CLI（aura-cli v1.7+）

安装（二进制，不是 pip）：
```bash
# macOS
curl -L https://github.com/neo4j/aura-cli/releases/latest/download/aura-cli-darwin-amd64.tar.gz | tar xz
sudo mv aura-cli /usr/local/bin/
aura-cli -v          # verify
```

添加凭据（来自 console.neo4j.io → Account Settings → API Credentials）：
```bash
aura-cli credential add \
  --name "my-creds" \
  --client-id "$AURA_CLIENT_ID" \
  --client-secret "$AURA_CLIENT_SECRET"
aura-cli credential use --name "my-creds"
```

验证：
```bash
aura-cli instance list --output table
```

### REST API——获取 Bearer Token

Token 端点：`POST https://api.neo4j.io/oauth/token`
Token 过期：**3600 秒（1 小时）**。遇到 403 → 刷新 token。

```bash
TOKEN=$(curl -s --request POST 'https://api.neo4j.io/oauth/token' \
  --user "${AURA_CLIENT_ID}:${AURA_CLIENT_SECRET}" \
  --header 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode 'grant_type=client_credentials' \
  | jq -r '.access_token')
echo "Token: ${TOKEN:0:20}..."
```

在所有后续调用中使用：`--header "Authorization: Bearer $TOKEN"`

---

## 步骤 1——列出 Tenant（项目）

CLI：
```bash
aura-cli tenants list --output table
# Copy TENANT_ID for create operations
```

REST：
```bash
curl -s https://api.neo4j.io/v1/tenants \
  -H "Authorization: Bearer $TOKEN" | jq '.data[] | {id, name}'
```

---

## 步骤 2——创建实例

关键：**立即捕获输出。** 初始密码只显示一次——永远无法再次获取。
如果丢失：删除并重建。在做任何其他事之前先保存 `aura-creds.json`。

### CLI

```bash
aura-cli instance create \
  --name "my-instance" \
  --cloud-provider gcp \
  --region europe-west1 \
  --type professional-db \
  --tenant-id "$TENANT_ID" \
  --output json | tee aura-creds.json

# Extract for .env
INSTANCE_ID=$(jq -r '.id' aura-creds.json)
PASSWORD=$(jq -r '.password' aura-creds.json)
```

### REST API（完整创建）

```bash
RESPONSE=$(curl -s -X POST https://api.neo4j.io/v1/instances \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name":           "my-instance",
    "cloud_provider": "gcp",
    "region":         "europe-west1",
    "type":           "professional-db",
    "tenant_id":      "'"$TENANT_ID"'",
    "memory":         "4GB",
    "version":        "5"
  }')
echo "$RESPONSE" | tee aura-creds.json
INSTANCE_ID=$(echo "$RESPONSE" | jq -r '.data.id')
PASSWORD=$(echo "$RESPONSE"   | jq -r '.data.password')
```

实例创建请求体字段：

| 字段 | 必需 | 值 |
|---|---|---|
| `name` | ✅ | 任意字符串 |
| `cloud_provider` | ✅ | `gcp` `aws` `azure` |
| `region` | ✅ | 见区域表 |
| `type` | ✅ | 见档位表 |
| `tenant_id` | ✅ | 来自 tenant 列表 |
| `memory` | ✗ | `1GB` `2GB` `4GB` `8GB` … `384GB` |
| `version` | ✗ | `5`（默认） |

---

## 步骤 3——轮询直到 RUNNING（关键——所有操作都是异步的）

所有生命周期操作（创建、暂停、恢复、调整大小）都是异步的。在状态变为 `running` 之前（暂停操作则为 `paused`），不要尝试连接或执行下一步操作。

```bash
poll_status() {
  local INSTANCE_ID=$1 TARGET=$2 MAX_WAIT=${3:-600}
  local ELAPSED=0 STATUS
  echo "Polling for status=$TARGET (max ${MAX_WAIT}s)..."
  while [ $ELAPSED -lt $MAX_WAIT ]; do
    STATUS=$(aura-cli instance get --instance-id "$INSTANCE_ID" --output json \
             | jq -r '.status' 2>/dev/null)
    echo "  [${ELAPSED}s] status=$STATUS"
    [ "$STATUS" = "$TARGET" ] && echo "Ready." && return 0
    [ "$STATUS" = "destroying" ] && echo "ERROR: instance is being destroyed" && return 1
    sleep 10; ELAPSED=$((ELAPSED + 10))
  done
  echo "TIMEOUT after ${MAX_WAIT}s — last status: $STATUS" && return 1
}

poll_status "$INSTANCE_ID" "running" 600
```

REST 等效写法：
```bash
while true; do
  STATUS=$(curl -s "https://api.neo4j.io/v1/instances/$INSTANCE_ID" \
    -H "Authorization: Bearer $TOKEN" | jq -r '.data.status')
  [ "$STATUS" = "running" ] && break
  sleep 10
done
```

状态生命周期：
```
creating → running → pausing → paused → resuming → running
                  ↘ destroying → (gone)
```

---

## 步骤 4——写入 .env 并验证

```bash
CONNECTION_URI="neo4j+s://${INSTANCE_ID}.databases.neo4j.io"

cat > .env <<EOF
NEO4J_URI=${CONNECTION_URI}
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=${PASSWORD}
NEO4J_DATABASE=neo4j
AURA_INSTANCE_ID=${INSTANCE_ID}
EOF

# Ensure .env never committed
grep -q '^\.env$' .gitignore 2>/dev/null || echo '.env' >> .gitignore

# Verify connectivity
cypher-shell -a "$CONNECTION_URI" -u neo4j -p "$PASSWORD" "RETURN 'connected' AS status"
```

---

## 步骤 5——生命周期操作

所有操作都要求实例处于正确状态。状态错误时操作会返回 4xx 错误。

### 暂停
所需状态：`running`
```bash
aura-cli instance pause --instance-id "$INSTANCE_ID"
poll_status "$INSTANCE_ID" "paused" 600
```

### 恢复
所需状态：`paused`
```bash
aura-cli instance resume --instance-id "$INSTANCE_ID"
poll_status "$INSTANCE_ID" "running" 900   # resume can take longer
```

### 调整大小（仅 Professional+——不适用于 Free）
所需状态：`running`；调整大小期间实例仍可用。
```bash
# REST only — CLI resize not available in v1.7
curl -s -X PATCH "https://api.neo4j.io/v1/instances/$INSTANCE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"memory": "8GB"}'
poll_status "$INSTANCE_ID" "running" 600
# Cannot reduce below current usage level
```

### 删除
不可逆。如需数据请先导出快照。
```bash
aura-cli instance delete --instance-id "$INSTANCE_ID"
# No poll needed — immediate
```

REST：
```bash
curl -s -X DELETE "https://api.neo4j.io/v1/instances/$INSTANCE_ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Python CI/CD 预配脚本

```python
import os, time, requests

CLIENT_ID     = os.environ["AURA_CLIENT_ID"]
CLIENT_SECRET = os.environ["AURA_CLIENT_SECRET"]
BASE          = "https://api.neo4j.io/v1"

def get_token() -> str:
    r = requests.post(
        "https://api.neo4j.io/oauth/token",
        auth=(CLIENT_ID, CLIENT_SECRET),
        data={"grant_type": "client_credentials"},
    )
    r.raise_for_status()
    return r.json()["access_token"]

def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

def create_instance(token: str, tenant_id: str, **kwargs) -> dict:
    payload = {"tenant_id": tenant_id, "version": "5", **kwargs}
    r = requests.post(f"{BASE}/instances", headers=auth_headers(token), json=payload)
    r.raise_for_status()
    return r.json()["data"]   # contains id, password, connection_url

def poll_status(token: str, instance_id: str, target: str, timeout: int = 600) -> None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        r = requests.get(f"{BASE}/instances/{instance_id}", headers=auth_headers(token))
        r.raise_for_status()
        status = r.json()["data"]["status"]
        print(f"  status={status}")
        if status == target:
            return
        if status == "destroying":
            raise RuntimeError("Instance destroyed unexpectedly")
        time.sleep(10)
    raise TimeoutError(f"Instance {instance_id} did not reach '{target}' in {timeout}s")

# --- usage ---
token    = get_token()
instance = create_instance(
    token,
    tenant_id = os.environ["AURA_TENANT_ID"],
    name           = "ci-test-instance",
    cloud_provider = "aws",
    region         = "us-east-1",
    type           = "professional-db",
    memory         = "2GB",
)
# SAVE CREDENTIALS IMMEDIATELY — password never retrievable again
print(f"ID:       {instance['id']}")
print(f"URI:      neo4j+s://{instance['id']}.databases.neo4j.io")
print(f"Password: {instance['password']}")   # log to secure vault NOW

poll_status(token, instance["id"], "running", timeout=600)
print("Instance ready.")
```

---

## 区域代码

### AWS
| 区域代码 | 位置 |
|---|---|
| `us-east-1` | 北弗吉尼亚 |
| `us-east-2` | 俄亥俄 |
| `us-west-2` | 俄勒冈 |
| `eu-west-1` | 爱尔兰 |
| `eu-west-3` | 巴黎 |
| `eu-central-1` | 法兰克福 |
| `ap-southeast-1` | 新加坡 |
| `ap-southeast-2` | 悉尼 |
| `ap-south-1` | 孟买 |
| `sa-east-1` | 圣保罗 |

### GCP
| 区域代码 | 位置 |
|---|---|
| `europe-west1` | 比利时 |
| `europe-west3` | 法兰克福 |
| `europe-west4` | 荷兰 |
| `us-central1` | 爱荷华 |
| `us-east1` | 南卡罗来纳 |
| `us-east4` | 北弗吉尼亚 |
| `asia-east1` | 台湾 |
| `asia-northeast1` | 东京 |
| `asia-southeast1` | 新加坡 |
| `australia-southeast1` | 悉尼 |

### Azure
| 区域代码 | 位置 |
|---|---|
| `eastus` | 美国东部 |
| `eastus2` | 美国东部 2 |
| `westeurope` | 荷兰 |
| `northeurope` | 爱尔兰 |
| `uksouth` | 伦敦 |
| `southeastasia` | 新加坡 |
| `brazilsouth` | 巴西 |
| `koreacentral` | 韩国 |

企业档位（Business Critical、VDC）每个云提供商额外提供 20+ 个区域。完整列表请查看控制台。
Free 档位：仅 GCP；区域为有限子集。

---

## Terraform Provider

```hcl
terraform {
  required_providers {
    neo4jaura = {
      source  = "neo4j-labs/neo4jaura"
    }
  }
}

provider "neo4jaura" {
  client_id     = var.aura_client_id       # or AURA_CLIENT_ID env var
  client_secret = var.aura_client_secret   # or AURA_CLIENT_SECRET env var
}

resource "neo4jaura_instance" "db" {
  name           = "prod-db"
  type           = "professional-db"
  cloud_provider = "gcp"
  region         = "europe-west1"
  memory         = "4GB"
  project_id     = var.aura_project_id   # Terraform uses project_id (REST API: tenant_id)
}

output "neo4j_uri" {
  value     = neo4jaura_instance.db.connection_url
  sensitive = false
}
output "neo4j_password" {
  value     = neo4jaura_instance.db.password
  sensitive = true
}
```

执行 `terraform apply` 后：在标记基础设施就绪前先轮询状态——Terraform 资源创建在 API 调用完成时返回，而不是 DB 变为 `running` 时。

---

## 常见错误

| 错误 | 原因 | 修复 |
|---|---|---|
| 一直正常后出现 `403 Forbidden` | token 过期（1 小时 TTL） | 重新运行 `get_token()` |
| 创建时 `409 Conflict` | 名称在 tenant 中已存在 | 更改名称或删除现有实例 |
| 暂停时 `422` | 实例未处于 `running` | 检查状态；等待正在进行的操作完成 |
| 恢复时 `422` | 实例未处于 `paused` | 检查状态 |
| 调整大小时 `422` | 低于当前用量 | 先减少数据；不能缩小到用量以下 |
| 找不到区域 | 该档位不支持该区域 | Free 档位仅 GCP；Pro/BC 支持全部 3 个云 |
| 创建后凭据丢失 | 密码只在创建时返回 | 删除 + 重建——不存在重置方式 |
| `429 Too Many Requests` | 触发速率限制（Free 25 次/分，Pro+ 125 次/分） | 在轮询调用之间添加 `time.sleep(2)` |
| `instance list` 返回空 | 激活的凭据错误 | `aura-cli credential use --name <name>` |

---

## API 速率限制

| 档位 | 请求数/分钟 |
|---|---|
| Free / Pro Trial（不计费） | 25 |
| 计费的 Pro、BC、VDC | 125 |

轮询间隔：Free 下 ≥10 秒以保持在限制内；Pro+ 下 5 秒是安全的。
若 5xx 响应中带有 `Retry-After` 头：等待该秒数后再重试。

---

## 安全规则

- 将初始凭据写入 `.env`；在继续前确认 `.env` 已在 `.gitignore` 中
- 绝不要在 CI 日志中打印 `PASSWORD`——写入密钥保管库（AWS Secrets Manager、GitHub secret、Vault）
- 使用 `from_env()` / `os.environ`——绝不要硬编码凭据
- 如果 `.env` 不存在：`python-dotenv` 的 `load_dotenv()` 会自动加载；除非加载失败，否则不要提示用户

---

## WebFetch——当前文档

| 需求 | URL |
|---|---|
| REST API 规范（OpenAPI） | `https://neo4j.com/docs/aura/platform/api/specification/` |
| CLI 参考 | `https://neo4j.com/docs/aura/aura-cli/` |
| 区域列表 | `https://neo4j.com/docs/aura/managing-instances/regions/` |
| 认证细节 | `https://neo4j.com/docs/aura/api/authentication/` |
| 实例操作 | `https://neo4j.com/docs/aura/managing-instances/instance-actions/` |

---

## 核对清单
- [ ] `.env` 已创建并包含 URI/用户名/密码；`.env` 已在 `.gitignore` 中
- [ ] 创建后立即将初始凭据保存到安全存储
- [ ] 创建后调用了 `poll_status`——在状态 = `running` 前不要连接
- [ ] 暂停/恢复后调用了 `poll_status`
- [ ] 选择了正确的档位（开发用 Free，生产用 Pro+，HA 用 BC）
- [ ] 已确认区域对所选的档位和云提供商可用
- [ ] 所有 create/list 操作需要 Tenant ID（多租户组织中必需）
- [ ] token 年龄超过 1 小时（或收到 403）时已刷新
- [ ] 删除已由用户确认——数据丢失是永久性的，无法恢复
