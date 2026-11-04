---
name: zoho-projects-users-groups
description: "Zoho Projects 项目成员关系与项目分组：用角色与资料把门户用户或客户用户添加到项目、查询用户在项目中的角色与资料、列出门户资料与角色、创建、重命名、更改前缀与删除项目分组、列出所有分组或我的分组、在私有项目分组上添加或移除用户与团队。适用于把 Priya 添加到此项目、给用户在项目中授予 Manager 资料、存在哪些资料或角色 ID、我在此项目中的角色是什么、创建项目分组、重命名分组、删除分组、这个私有分组里有谁、PRIVATE_PROJECT_GROUP_FEATURE_RESTRICTION、group_id 上的 RESOURCE_NOT_FOUND、role_id 或 profile_id 被拒绝时。需要 ZohoProjects_* MCP 工具。"
metadata:
  version: "1.0.0"
---

## 工作原理

1. 检查 ZohoProjects_* MCP 工具是否可用。若不可用，停下来并加载 `zoho-projects` 技能进行连接设置。
2. 按顺序解析 ID：portal_id，然后 project_id 或 project_group_id，然后用户、角色、资料或团队 ID。ID 是数字字符串，绝不是名称或邮箱（添加用户时 `email_id` 除外）。只使用本会话中某个工具返回的、或用户给出的 ID。要查找某人或区分 ZPUID 与 ZUID，遵循 `zoho-projects` 技能、`references/users.md`；要挑选项目，遵循 `references/portals-and-projects.md`。
3. 路由到与请求匹配的参考：
   - 把用户或客户用户添加到项目、用户在项目中的角色与资料、门户资料与角色：`references/users-project-members.md`
   - 项目分组、在分组之间移动项目、私有分组的用户与团队：`references/users-project-groups.md`
4. 在任何 add、create、update、associate、remove 或 delete 之前，向用户准确展示将发生什么更改（项目或分组名称与 ID、用户名称与邮箱、角色、资料），并等待明确确认。把某人添加到项目即授予其访问该项目数据的权限；请明确说出该人员与项目。除非用户明确要求邀请新邮箱，否则只添加已是门户用户的人。
5. 写入之后确认结果：成员用 `get_all_users_in_a_project` 或 `get_project_user_details`，分组用 `get_all_project_groups`。若干写入工具返回无正文的 204。

## 触发条件

在以下情况使用本技能：
- “把 Priya 添加到 Website 项目”、“把我们的客户联系人添加到此项目”、“在此项目中把 Arun 设为管理员”
- “此用户在此项目中有什么角色”、“我在这里的资料是什么”、“列出门户资料”、“存在哪些角色”
- “创建项目分组”、“重命名 Marketing 分组”、“更改分组前缀”、“删除此项目分组”、“我在哪些分组中”
- “把此项目移入一个分组”（移动本身是 `update_project`；见 `zoho-projects-projects` 技能）
- “这个私有分组里有谁”、“把 Design 团队添加到私有分组”、“从分组移除一个用户”
- `PRIVATE_PROJECT_GROUP_FEATURE_RESTRICTION`、`group_id` 上的 404 `RESOURCE_NOT_FOUND`、role 或 profile ID 被拒绝、用户已添加但在项目中不可见

## 参考

| 参考 | 在查询涉及……时加载 |
|-----------|---------------------------------|
| `references/users-project-members.md` | `add_users_to_a_project`、`add_client_user_to_a_project`、`get_project_user_details`、`get_user_details`、`list_portal_profiles`、`list_portal_roles` |
| `references/users-project-groups.md` | `create_project_group`、`update_project_group`、`delete_project_group`、`get_all_project_groups`、`get_user_s_project_groups`、私有分组用户与团队工具 |
