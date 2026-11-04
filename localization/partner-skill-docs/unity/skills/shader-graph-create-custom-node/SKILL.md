---
name: shader-graph-create-custom-node
description: 从 HLSL 代码生成自定义 Shader Graph 节点。用于用户想要新的 Shader Graph 节点，或希望让现有 HLSL 作为反射函数节点工作时。
required_packages:
  com.unity.shadergraph: ">=17.5.0"
---
# 生成自定义 Shader Graph 节点

## 第 1 步：生成 HLSL 函数定义
- 函数前必须带有预处理器定义 `UNITY_EXPORT_REFLECTION`

## 第 2 步：用 Shader Graph hint 标签进行装饰
- 有关所有有效的 hint 标签及用法模式，请参阅 `resources/all_hints.hlsl`
- 在 `funchints` 或 `paramhints` 块之外支持 C# 风格的文档标签
- 必需的函数 hint：
  - `sg:ProviderKey`
  - `sg:SearchCategory`
  - `sg:SearchTerms`
  - `sg:DisplayName`

## 第 3 步：将代码写入资产
- 在项目中搜索已包含自定义 Shader Graph 节点的 `ShaderInclude` 资产（`.hlsl`）
- 如果存在匹配的资产，向用户展示其当前内容，并在追加新代码前请求确认
- 如果不存在匹配的资产，创建一个新的 `.hlsl` 资产
- 确保文件以 `#include "ShaderApiReflectionSupport.hlsl"` 开头
