# Flutter 主动热重载规则

每当编辑或修改本项目 `lib/` 下的任何 `.dart` 文件时：

1. **跳过条件**：
   - **`lib/` 以外的文件**：仅对 `lib/` 下的修改触发热重载或热重启。修改其他目录中的文件时不要触发，例如 `test/**`、`integration_test/**`、`benchmark/**`、`test_driver/**` 或 `example/**`。
   - **注释与文档**：如果修改仅涉及注释、文档字符串或空白字符，不要触发热重载或热重启。

2. **发现并连接**：
   - 使用 Dart MCP 服务器的 `dtd` MCP 工具（或 `list_running_apps` / `vm_service`）发现正在运行的应用实例。

3. **触发热重载或热重启**：
   - 修改界面组件（包括有状态组件的 `build` 方法）或简单方法后，立即执行 `hot_reload` MCP 工具。
   - 如果修改涉及基础逻辑、状态初始化（如 `initState`）、全局或静态状态，或 `main()`，则执行 `hot_restart` MCP 工具。
