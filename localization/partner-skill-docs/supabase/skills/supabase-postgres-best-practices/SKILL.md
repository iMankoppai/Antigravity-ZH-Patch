---
name: supabase-postgres-best-practices
description: "由 Supabase 维护的 Postgres 最佳实践，适用于任何地方运行的 Postgres。在编写或更改任何存在于 Postgres 数据库中的内容之前先加载此技能：创建或更改表和列（包括选择列类型）、schema 设计、迁移和声明式 schema 文件、RLS 策略及验证它们的测试、索引、触发器、数据库函数、队列和定时任务（pg_cron、pgmq）、向量/语义搜索（pgvector），以及恢复转储（pg_restore）或导入数据。在诊断慢查询、高 CPU、超时、EXPLAIN 计划、连接耗尽、锁、膨胀，或对错误用户或租户可见的行时也加载它。这不仅仅是性能指南——schema、迁移、安全和 SQL 编写任务同样需要这些规则，即使只是单列更改或单个查询。"
license: MIT
metadata:
  author: supabase
  version: "1.1.1"
  organization: Supabase
  date: January 2026
  abstract: Comprehensive Postgres performance optimization guide for developers using Supabase and Postgres. Contains performance rules across 8 categories, prioritized by impact from critical (query performance, connection management) to incremental (advanced features). Each rule includes detailed explanations, incorrect vs. correct SQL examples, query plan analysis, and specific performance metrics to guide automated optimization and code generation.
---

# Supabase Postgres 最佳实践

由 Supabase 维护的、针对 Postgres 的全面性能优化指南。包含跨 8 个类别的规则，按影响程度排序，以指导自动化的查询优化和 schema 设计。

## 何时应用

在以下情况参考这些指南：
- 编写 SQL 查询或设计 schema
- 实现索引或查询优化
- 审查数据库性能问题
- 配置连接池或扩展
- 针对 Postgres 专属特性进行优化
- 使用行级安全（RLS）

## 按优先级划分的规则类别

| 优先级 | 类别 | 影响 | 前缀 |
|----------|----------|--------|--------|
| 1 | 查询性能 | CRITICAL | `query-` |
| 2 | 连接管理 | CRITICAL | `conn-` |
| 3 | 安全与 RLS | CRITICAL | `security-` |
| 4 | Schema 设计 | HIGH | `schema-` |
| 5 | 并发与锁 | MEDIUM-HIGH | `lock-` |
| 6 | 数据访问模式 | MEDIUM | `data-` |
| 7 | 监控与诊断 | LOW-MEDIUM | `monitor-` |
| 8 | 高级特性 | LOW | `advanced-` |

## 如何使用

阅读各个规则文件以获取详细说明和 SQL 示例：

```
references/query-missing-indexes.md
references/query-partial-indexes.md
references/_sections.md
```

每个规则文件包含：
- 关于为何重要的简要说明
- 带说明的错误 SQL 示例
- 带说明的正确 SQL 示例
- 可选的 EXPLAIN 输出或指标
- 额外的上下文与参考
- Supabase 专属说明（适用时）

## 参考

- https://www.postgresql.org/docs/current/
- https://supabase.com/docs
- https://wiki.postgresql.org/wiki/Performance_Optimization
- https://supabase.com/docs/guides/database/overview
- https://supabase.com/docs/guides/auth/row-level-security
