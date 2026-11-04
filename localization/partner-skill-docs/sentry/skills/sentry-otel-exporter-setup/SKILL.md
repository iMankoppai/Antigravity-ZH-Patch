---
name: sentry-otel-exporter-setup
description: 为 OpenTelemetry Collector 配置 Sentry Exporter，以支持多项目路由与自动创建项目。在设置 OTel 与 Sentry、为 trace 与日志配置 collector 管道，或把来自多个服务的遥测路由到 Sentry 项目时使用。
license: Apache-2.0
---
# Sentry OTel Exporter 设置

**术语**：在指该 exporter 组件时，始终把“Sentry Exporter”首字母大写。

使用 Sentry Exporter 配置 OpenTelemetry Collector，把 trace 与日志发送到 Sentry。

## 设置概览

复制这份清单以跟踪你的进度：

```
OTel Exporter Setup:
- [ ] Step 1: Check for existing configuration
- [ ] Step 2: Check collector version and install if needed
- [ ] Step 3: Configure project creation settings
- [ ] Step 4: Write collector config
- [ ] Step 5: Add environment variable placeholders
- [ ] Step 6: Run the collector
- [ ] Step 7: Verify setup
- [ ] Step 8: Enable trace connectedness with OTLPIntegration (Python/Ruby/Node.js)
```

## 步骤 1：检查现有配置

通过查找包含 `receivers:` 的 YAML 文件，搜索现有的 OpenTelemetry Collector 配置。
还要检查名为 `otel-collector-config.*`、
`collector-config.*` 或 `otelcol.*` 的文件。

**如果找到现有配置**：询问用户想要哪种方式：
- **修改现有配置**：把 Sentry Exporter 加入现有文件（推荐，以避免
  重复）
- **创建单独配置**：保持现有配置不变，为测试创建一个新配置

**等待用户的回答并在进入步骤 2 之前记录其选择。** 工作流的其余部分
取决于此决定。

**如果不存在配置**：记下你将在步骤
4 中创建一个新的 `collector-config.yaml`，然后继续步骤 2。

## 步骤 2：检查 Collector 版本

Sentry Exporter 需要 **otelcol-contrib v0.145.0 或更高版本**。

### 检查现有 collector

1. 运行 `which otelcol-contrib` 检查它是否在 PATH 上，或检查项目中是否有
   `./otelcol-contrib`
2. 如果找到，运行相应的版本命令并解析版本号
3. **记录 collector 路径**（例如在 PATH 上则为 `otelcol-contrib`，或本地则为
   `./otelcol-contrib`）供后续步骤使用

| 现有版本 | 操作 |
| --- | --- |
| ≥ 0.145.0 | 跳到步骤 3 —— 现有 collector 兼容 |
| < 0.145.0 | 继续下面的安装 |
| 未安装 | 继续下面的安装 |

### 安装

询问用户想如何运行 collector：
- **二进制**：从 GitHub releases 下载。
  无需 Docker。
- **Docker**：作为容器运行。
  需要已安装 Docker。

### 二进制安装

从 GitHub 获取最新的发布版本：
```bash
curl -s https://api.github.com/repos/open-telemetry/opentelemetry-collector-releases/releases/latest | grep '"tag_name"' | cut -d'"' -f4
```

**重要**：GitHub API 返回的版本带 `v` 前缀（例如 `v0.145.0`）。
下载 URL 路径需要带 `v` 前缀的完整标签，但文件名与 Docker
标签使用不带前缀的数字版本（例如 `0.145.0`）。

检测用户的平台并下载二进制文件：

1. 运行 `uname -s` 与 `uname -m` 检测操作系统与架构
2. 映射到发布值：
   - Darwin + arm64 → `darwin_arm64`
   - Darwin + x86_64 → `darwin_amd64`
   - Linux + x86_64 → `linux_amd64`
   - Linux + aarch64 → `linux_arm64`
3. 下载并解压：
```bash
curl -LO https://github.com/open-telemetry/opentelemetry-collector-releases/releases/download/v<numeric_version>/otelcol-contrib_<numeric_version>_<os>_<arch>.tar.gz
tar -xzf otelcol-contrib_<numeric_version>_<os>_<arch>.tar.gz
chmod +x otelcol-contrib
```

示例：对于版本 `v0.145.0`，URL 在路径中使用 `v0.145.0`，但在
文件名中使用 `0.145.0`。

替用户执行这些步骤——不要只把命令展示给他们。

4. **询问用户**是否想删除已下载的 tarball 以节省磁盘空间
   （约 50MB）：
   - **是，删除它**：移除 tarball
   - **不，保留它**：把 tarball 留在原处

**等待用户的回应。** 仅在他们明确选择删除时才删除：
```bash
rm otelcol-contrib_<numeric_version>_<os>_<arch>.tar.gz
```

### Docker 安装

1. 运行 `docker --version` 确认 Docker 已安装
2. 从 GitHub 获取最新发布标签（同上）
3. 使用数字版本（不带 `v` 前缀）拉取镜像：
```bash
docker pull otel/opentelemetry-collector-contrib:<numeric_version>
```

示例：对于 GitHub 标签 `v0.145.0`，使用
`docker pull otel/opentelemetry-collector-contrib:0.145.0`。

`docker run` 命令稍后在创建配置之后的步骤 6 中出现。

## 步骤 3：配置 Sentry 项目创建

询问用户是否启用自动创建 Sentry 项目。
不要推荐任一选项：
- **是**：项目从 service.name 创建。
  需要你的 Sentry 组织中至少有一个团队。
  所有新项目都会分配给找到的第一个团队。
  创建期间初始数据可能被丢弃。
- **否**：遥测到达之前项目必须已存在于 Sentry 中。

**在进入步骤 4 之前等待用户的回答。**

**如果用户选择“是”**：警告他们该 exporter 会扫描所有项目并使用它找到的
第一个团队。
所有自动创建的项目都会分配给该团队。
如果他们还没有任何团队，应先在 Sentry 中创建一个。

## 步骤 4：编写 Collector 配置

**使用步骤 1 的决定** —— 如果用户选择修改现有配置，请编辑
该文件。如果他们选择创建单独配置，请创建一个新文件。
**记录配置文件路径** 供步骤 5 与 6 使用。

从 Sentry Exporter 文档获取最新配置：

- **示例配置**（用作模板）：
  `https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector-contrib/main/exporter/sentryexporter/docs/example-config.yaml`
- **完整规范**（所有可用选项）：
  `https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector-contrib/main/exporter/sentryexporter/docs/spec.md`

使用 WebFetch 获取示例配置作为起始模板。
如果用户需要示例中未展示的高级选项，请参考规范。

### 如果编辑现有配置（依据步骤 1 的决定）

把 `sentry` exporter 加入 `exporters:` 部分，并把它包含在相应的
管道（`traces`、`logs`）中。除非用户要求，不要移除或修改其他 exporter。

### 如果创建新配置（依据步骤 1 的决定）

基于获取的示例创建 `collector-config.yaml`。
确保凭据使用环境变量引用（`${env:SENTRY_ORG_SLUG}`、
`${env:SENTRY_AUTH_TOKEN}`）。

如果用户在步骤 3 选择了自动创建，向 sentry
exporter 添加 `auto_create_projects: true`。

### 添加 Debug Exporter（推荐）

为便于设置期间的故障排查，向管道添加一个带 `verbosity: detailed` 的 `debug`
exporter。这会把所有遥测记录到控制台。
设置验证完成后请移除它。

## 步骤 5：添加环境变量占位符

Sentry Exporter 需要两个环境变量。
你将添加占位值，由用户自己填写——绝不添加真实
凭据。

**措辞约束**：绝不要在未明确说明这些是**占位符**的情况下说“添加凭据”、“添加环境变量”或
“添加令牌”。始终说明用户稍后要自行填写。

不要说：
- “让我添加环境变量”
- “我会把凭据加入你的 .env”
- “正在添加 Sentry 鉴权令牌”

而要说：
- “我会添加占位环境变量，供你填写”
- “正在添加占位值——你会用实际凭据替换它们”
- “我会用占位值设置环境变量的键”

使用 glob `**/.env` 搜索项目中现有的 `.env` 文件。**始终询问
用户使用哪个文件**——不要从上下文推断或根据打开的文件猜测。

呈现已发现的选项：
- **[已发现 .env 文件的路径]**：添加到现有文件（列出每个已发现的路径）
- **在根目录新建**：在项目根目录创建 .env

**等待用户的明确选择。** 在他们选择之前不要继续。
记录 env 文件路径供步骤 5（验证）与 6（运行）使用。

把以下占位值添加到所选文件：

```bash
SENTRY_ORG_SLUG=your-org-slug
SENTRY_AUTH_TOKEN=your-token-here
```

添加占位符后，告诉用户如何从 Sentry 获取其真实值：

1. **Sentry 组织 slug**：在 Sentry 中，前往 **Settings → Organization Settings →
   Organization Slug**。这也是你的子域（例如
   `https://myorg.sentry.io` 中的 `myorg`）
2. **Sentry 鉴权令牌**：在 Sentry 中创建一个 Internal Integration：
   - 在 Sentry 中，前往 **Settings → Developer Settings → Custom Integrations**
   - 点击 **Create New Integration** → 选择 **Internal Integration**
   - 设置权限：
     - **Organization: Read** —— 必需
     - **Project: Read** —— 必需
     - **Project: Write** —— 仅在使用 `auto_create_projects` 时必需
   - 保存，然后点击 **Create New Token** 并复制它

确保所选的 `.env` 文件在 `.gitignore` 中。

### 等待用户设置凭据

在解释如何获取值之后，请用户在更新完
`.env` 文件后确认：
- **是，凭据已设置**：继续验证并运行 collector
- **还没有**：我会等你更新 .env 文件

如果用户选择“还没有”，请等待并再次询问。
在凭据得到确认之前不要进入步骤 6。

### 验证配置

一旦凭据设置好，根据步骤 2 的安装选择，使用合适的方法
验证配置。

**使用步骤 1 的配置文件路径**（要么是你修改的现有配置，要么是
新的 `collector-config.yaml`）。

#### 二进制验证

使用步骤 2 中记录的 collector 路径（在 PATH 上则为 `otelcol-contrib`，本地则为
`./otelcol-contrib`）。

**先加载环境变量**，然后运行验证：

```bash
set -a && source "<env_file>" && set +a && "<collector_path>" validate --config "<config_file>"
```

#### Docker 验证

**注意**：Docker 卷挂载需要绝对路径。
如果 `<config_file>` 或 `<env_file>` 是相对路径，请为它们加上 `$(pwd)/` 前缀。如果
它们已是绝对路径，则直接使用。

```bash
docker run --rm \
  -v "<config_file>":/etc/otelcol-contrib/config.yaml \
  --env-file "<env_file>" \
  otel/opentelemetry-collector-contrib:<numeric_version> \
  validate --config /etc/otelcol-contrib/config.yaml
```

使用步骤 5 中选择的 `.env` 文件路径。

**如果验证失败：**
1. 仔细查看错误消息
2. 修复配置文件中的问题
3. 再次运行验证
4. 重复直到验证通过

**一旦验证通过**，询问用户是否准备好运行 collector：
- **是，现在就运行**：进入步骤 6 并启动 collector
- **还没有**：等待。用户可能想先审查配置或准备其环境。

**在进入步骤 6 之前等待用户的确认。**

## 步骤 6：运行 Collector

**只有在用户确认准备好运行 collector 之后才进入此步骤。**

**把运行命令交给用户，但不要自动执行它。** 用户将自己运行
它。

根据步骤 2 中选择的安装方法提供相应命令。

**使用先前选择的实际路径：**
- **配置文件**：来自步骤 1（现有配置或新的 `collector-config.yaml`）
- **Env 文件**：来自步骤 5（用户选择的 `.env` 文件）
- **Collector 路径**：来自步骤 2（在 PATH 上则为 `otelcol-contrib`，本地则为
  `./otelcol-contrib`）

### 二进制

**先加载环境变量**，然后运行 collector：

```bash
set -a && source "<env_file>" && set +a && "<collector_path>" --config "<config_file>"
```

### Docker

**注意**：Docker 卷挂载需要绝对路径。
如果 `<config_file>` 或 `<env_file>` 是相对路径，请为它们加上 `$(pwd)/` 前缀。如果
它们已是绝对路径，则直接使用。

**如果重新运行**：先停止并移除任何现有容器：
```bash
docker stop otel-collector 2>/dev/null; docker rm otel-collector 2>/dev/null
```

```bash
docker run -d \
  --name otel-collector \
  -p 4317:4317 \
  -p 4318:4318 \
  -p 13133:13133 \
  -v "<config_file>":/etc/otelcol-contrib/config.yaml \
  --env-file "<env_file>" \
  otel/opentelemetry-collector-contrib:<numeric_version>
```

使用步骤 2 中拉取的同一数字版本（不带 `v` 前缀）。

提供命令后，告诉用户准备好时运行它，然后进入
步骤 7 进行验证。

## 步骤 7：验证设置

1. 检查 collector 日志以确认成功启动（没有关于无效配置或连接
   失败的错误）
2. 查找表明已连接到 Sentry 的日志消息
3. 从已埋点的服务发送测试遥测，并验证它出现在 Sentry 中

**成功标准：**
- Collector 无错误地启动
- 发送后 60 秒内，trace 和/或日志出现在 Sentry 中

如果使用 Docker，用 `docker logs otel-collector` 检查日志。

## 步骤 8：用 OTLPIntegration 启用 trace 连通性

如果用户的应用程序使用 Sentry SDK（Python、Ruby 或 Node.js），建议
启用 OTLPIntegration。
这确保 **trace 连通性**——把 OTel trace 关联到 Sentry 错误、日志、
crons 与指标——并自动设置分布式追踪传播。

没有这一步，通过 collector 发送的 trace 会出现在 Sentry 中，但不会
与来自同一服务的其他 Sentry 事件（错误、日志）相连。

询问用户：**你的应用程序使用 Sentry Python SDK、Sentry Ruby SDK，还是
Sentry Node.js SDK？**

- **Python**：遵循下面的 Python 设置
- **Ruby**：遵循下面的 Ruby 设置
- **Node.js**：遵循下面的 Node.js 设置
- **都不是 / 其他 SDK**：跳过此步骤。
  通过 OTLPIntegration 的 trace 连通性目前适用于 Python、Ruby 与
  Node.js。

### Python OTLPIntegration

文档：https://docs.sentry.io/platforms/python/integrations/otlp/

1. 安装该 extra：
```bash
pip install "sentry-sdk[opentelemetry-otlp]"
```

2. 把 `OTLPIntegration` 加入现有的 `sentry_sdk.init()` 调用，将
   `collector_url` 设为 collector 的 OTLP traces 端点：
```python
from sentry_sdk.integrations.otlp import OTLPIntegration

sentry_sdk.init(
    dsn="___PUBLIC_DSN___",
    integrations=[
        OTLPIntegration(collector_url="http://localhost:4318/v1/traces"),
    ],
)
```

使用 collector 实际的 OTLP HTTP 端点。
本地运行时默认是 `http://localhost:4318/v1/traces`。

### Ruby OTLPIntegration

文档：https://docs.sentry.io/platforms/ruby/integrations/otlp/

1. 把 gem 加入 Gemfile：
```ruby
gem "sentry-opentelemetry"
gem "opentelemetry-sdk"
gem "opentelemetry-exporter-otlp"
gem "opentelemetry-instrumentation-all"
```

2. 运行 `bundle install`

3. 配置 OpenTelemetry 埋点：
```ruby
OpenTelemetry::SDK.configure do |c|
  c.use_all
end
```

4. 在现有 `Sentry.init` 块中启用 OTLP，将 `collector_url` 设为
   collector 的 OTLP traces 端点：
```ruby
Sentry.init do |config|
  config.dsn = "___PUBLIC_DSN___"
  config.otlp.enabled = true
  config.otlp.collector_url = "http://localhost:4318/v1/traces"
end
```

使用 collector 实际的 OTLP HTTP 端点。
本地运行时默认是 `http://localhost:4318/v1/traces`。

### Node.js OTLPIntegration

文档：https://docs.sentry.io/platforms/javascript/guides/node/

1. 安装轻量 Sentry SDK 与 OpenTelemetry 依赖：
```bash
npm install @sentry/node-core @opentelemetry/api @opentelemetry/sdk-trace-node @opentelemetry/sdk-trace-base
```

2. 创建一个 instrument 文件（`instrument.mjs`），一同设置 OTel 与 Sentry：
```javascript
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import * as Sentry from '@sentry/node-core/light';
import { otlpIntegration } from '@sentry/node-core/light/otlp';

const provider = new NodeTracerProvider();
provider.register();

Sentry.init({
  dsn: '___PUBLIC_DSN___',
  integrations: [
    otlpIntegration({
      collectorUrl: 'http://localhost:4318/v1/traces',
    }),
  ],
});
```

3. 用 `--import` 标志启动你的应用：
```bash
node --import ./instrument.mjs app.mjs
```

使用 collector 实际的 OTLP HTTP 端点。
本地运行时默认是 `http://localhost:4318/v1/traces`。

> 使用 `otlpIntegration` 时**不要设置 `tracesSampleRate`** —— OTel 控制
> 采样。设置它会与 OTLP 路径冲突。

## 故障排查

| 错误 | 原因 | 修复 |
| --- | --- | --- |
| “failed to create project” | 缺少 Project:Write 权限 | 在 Sentry 中更新 Internal Integration 权限 |
| “no team found” | 组织中没有团队 | 在启用自动创建前先在 Sentry 中创建一个团队 |
| “invalid auth token” | 令牌类型错误或已过期 | 使用 Internal Integration 令牌，而非用户鉴权令牌 |
| 4317/4318 上“connection refused” | Collector 未运行或端口冲突 | 检查 collector 日志并确保端口可用 |
| 验证因环境变量错误失败 | .env 文件未加载或占位符未替换 | 确保 .env 中有真实凭据且文件已 source |
| “container name already in use” | 存在先前的容器 | 运行 `docker stop otel-collector && docker rm otel-collector` |
