---
name: vercel-react-best-practices
description: 来自 Vercel Engineering 的 React 和 Next.js 性能优化指南。在编写、审查或重构 React/Next.js 代码以确保最佳性能模式时应使用本技能。在涉及 React 组件、Next.js 页面、数据获取、包优化或性能改进的任务中触发。
license: MIT
metadata:
  author: vercel
  version: "1.0.0"
---

# Vercel React 最佳实践

由 Vercel 维护的、面向 React 和 Next.js 应用的全面性能优化指南。包含跨越 8 个类别、按影响排定优先级的 70 条规则，用于指导自动化重构和代码生成。

## 何时应用

在以下情况参考这些指南：
- 编写新的 React 组件或 Next.js 页面
- 实现数据获取（客户端或服务端）
- 审查代码的性能问题
- 重构现有 React/Next.js 代码
- 优化包体积或加载时间

## 按优先级排序的规则类别

| 优先级 | 类别 | 影响 | 前缀 |
|----------|----------|--------|--------|
| 1 | 消除瀑布（Waterfalls） | CRITICAL | `async-` |
| 2 | 包体积优化 | CRITICAL | `bundle-` |
| 3 | 服务端性能 | HIGH | `server-` |
| 4 | 客户端数据获取 | MEDIUM-HIGH | `client-` |
| 5 | 重渲染优化 | MEDIUM | `rerender-` |
| 6 | 渲染性能 | MEDIUM | `rendering-` |
| 7 | JavaScript 性能 | LOW-MEDIUM | `js-` |
| 8 | 高级模式 | LOW | `advanced-` |

## 快速参考

### 1. 消除瀑布（CRITICAL）

- `async-cheap-condition-before-await` - 在 await 标志或远程值之前先检查廉价的同步条件
- `async-defer-await` - 将 await 移入实际使用它的分支
- `async-parallel` - 对独立操作使用 Promise.all()
- `async-dependencies` - 对部分依赖使用 better-all
- `async-api-routes` - 在 API 路由中提早启动 promise、延迟 await
- `async-suspense-boundaries` - 使用 Suspense 流式传输内容

### 2. 包体积优化（CRITICAL）

- `bundle-barrel-imports` - 直接导入，避免桶文件（barrel files）
- `bundle-analyzable-paths` - 优先使用可静态分析的导入和文件系统路径，以避免宽泛的打包和追踪
- `bundle-dynamic-imports` - 对重型组件使用 next/dynamic
- `bundle-defer-third-party` - 在水合后加载分析/日志
- `bundle-conditional` - 仅在功能启用时加载模块
- `bundle-preload` - 在悬停/聚焦时预加载以提升感知速度

### 3. 服务端性能（HIGH）

- `server-auth-actions` - 像 API 路由一样对 server action 进行认证
- `server-cache-react` - 使用 React.cache() 进行按请求去重
- `server-cache-lru` - 使用 LRU 缓存进行跨请求缓存
- `server-dedup-props` - 避免 RSC props 中的重复序列化
- `server-hoist-static-io` - 将静态 I/O（字体、徽标）提升到模块级
- `server-no-shared-module-state` - 在 RSC/SSR 中避免模块级可变的请求状态
- `server-serialization` - 最小化传递给客户端组件的数据
- `server-parallel-fetching` - 重构组件以并行化抓取
- `server-parallel-nested-fetching` - 在 Promise.all 中按项串联嵌套抓取
- `server-after-nonblocking` - 对非阻塞操作使用 after()

### 4. 客户端数据获取（MEDIUM-HIGH）

- `client-swr-dedup` - 使用 SWR 进行自动请求去重
- `client-event-listeners` - 去重全局事件监听器
- `client-passive-event-listeners` - 对滚动使用被动监听器
- `client-localstorage-schema` - 对 localStorage 数据做版本化并最小化

### 5. 重渲染优化（MEDIUM）

- `rerender-defer-reads` - 不要订阅仅在回调中使用的状态
- `rerender-memo` - 将昂贵的工作提取到记忆化组件中
- `rerender-memo-with-default-value` - 提升默认非原始类型 props
- `rerender-dependencies` - 在 effect 中使用原始类型依赖
- `rerender-derived-state` - 订阅派生布尔值，而非原始值
- `rerender-derived-state-no-effect` - 在渲染期间派生状态，而非在 effect 中
- `rerender-functional-setstate` - 使用函数式 setState 以获得稳定回调
- `rerender-lazy-state-init` - 对昂贵值向 useState 传入函数
- `rerender-simple-expression-in-memo` - 对简单原始值避免使用 memo
- `rerender-split-combined-hooks` - 拆分具有独立依赖的 hook
- `rerender-move-effect-to-event` - 将交互逻辑放入事件处理器
- `rerender-transitions` - 对非紧急更新使用 startTransition
- `rerender-use-deferred-value` - 延迟昂贵的渲染以保持输入响应
- `rerender-use-ref-transient-values` - 对短暂的高频值使用 ref
- `rerender-no-inline-components` - 不要在组件内定义组件

### 6. 渲染性能（MEDIUM）

- `rendering-animate-svg-wrapper` - 对内层 div 包装器做动画，而非 SVG 元素
- `rendering-content-visibility` - 对长列表使用 content-visibility
- `rendering-hoist-jsx` - 将静态 JSX 提取到组件外
- `rendering-svg-precision` - 降低 SVG 坐标精度
- `rendering-hydration-no-flicker` - 对仅客户端数据使用内联脚本
- `rendering-hydration-suppress-warning` - 抑制预期的不匹配
- `rendering-activity` - 使用 Activity 组件进行显示/隐藏
- `rendering-conditional-render` - 条件渲染使用三元表达式而非 &&
- `rendering-usetransition-loading` - 加载状态优先使用 useTransition
- `rendering-resource-hints` - 使用 React DOM 资源提示进行预加载
- `rendering-script-defer-async` - 在 script 标签上使用 defer 或 async

### 7. JavaScript 性能（LOW-MEDIUM）

- `js-batch-dom-css` - 通过 class 或 cssText 分组 CSS 更改
- `js-index-maps` - 为重复查找构建 Map
- `js-cache-property-access` - 在循环中缓存对象属性
- `js-cache-function-results` - 在模块级 Map 中缓存函数结果
- `js-cache-storage` - 缓存 localStorage/sessionStorage 读取
- `js-combine-iterations` - 将多个 filter/map 合并为一个循环
- `js-length-check-first` - 在昂贵比较前先检查数组长度
- `js-early-exit` - 从函数中提前返回
- `js-hoist-regexp` - 将 RegExp 创建提升到循环外
- `js-min-max-loop` - 用循环求 min/max 而非排序
- `js-set-map-lookups` - 使用 Set/Map 进行 O(1) 查找
- `js-tosorted-immutable` - 使用 toSorted() 保持不可变性
- `js-flatmap-filter` - 使用 flatMap 一次完成映射和过滤
- `js-request-idle-callback` - 将非关键工作延迟到浏览器空闲时间

### 8. 高级模式（LOW）

- `advanced-effect-event-deps` - 不要把 `useEffectEvent` 的结果放入 effect 依赖
- `advanced-event-handler-refs` - 将事件处理器存储在 ref 中
- `advanced-init-once` - 每次应用加载仅初始化一次
- `advanced-use-latest` - 使用 useLatest 获得稳定回调 ref

## 如何使用

阅读各条规则文件以获取详细说明和代码示例：

```
rules/async-parallel.md
rules/bundle-barrel-imports.md
```

每个规则文件包含：
- 为什么重要的简要说明
- 带说明的错误代码示例
- 带说明的正确代码示例
- 额外上下文和参考

## 完整编译文档

包含所有规则展开的完整指南：`AGENTS.md`
