---
name: performance-testing
description: 在通过并发虚拟用户与延迟或错误阈值对 API 进行负载测试或基准测试时使用。复用集合来探测选定的失败模式，并把目标限制与负载生成器限制区分开。用于诸如“对这个 API 做负载测试”之类的请求。
---

# 性能测试

集合提供贴近真实的请求序列；`postman performance run`
增加并发与负载配置。这让性能结论可重复，
但仅针对实际演练的工作负载、数据与网络路径。
集合可直接运行：无需用 `postman-to-k6` 进行转换。

1. 在配置负载配置之前先选择失败模式：`fixed` 测试持续
   并发，`ramp-up` 探索负载增长时的退化，`spike` 测试
   突然激增，`peak` 测试在接近最大负载时的表现。复用
   集合的鉴权与断言，并检查其操作与数据
   是否代表工作负载，而不是重复一个异常廉价的请求。
2. 在发送负载之前，先确立目标、VU 数量、持续时间与写请求的
   影响。该范围内已有的用户授权即可；
   在压测共享或生产服务之前，先解决缺失的限制。
   阈值在运行之后才评估，因此失败的门槛不会提前停止
   流量。一次小的初始运行可以在更大规模的授权测试之前暴露接线失败。
3. 根据可达性与容量选择 runner。`local` 使用本机
   或 CI runner；其 CPU 或网络可能成为瓶颈。`postman-cloud`
   把生成移到 Postman 的基础设施，而
   `postman-cloud-static-ip` 支持带 IP 白名单的目标。在把连接失败
   解读为服务容量之前，先核实可达性。
4. 设置代表用户目标的阈值，例如
   `--pass-if "less_than(p95, 500)"`。支持的指标包括 `avg`、`p90`、
   `p95`、`p99`、`error_rate` 与 `rps`；当请求很快失败时，
   仅看延迟可能显得良好。使用 `postman performance run -h` 了解当前语法、
   单位与 runner 专属选项。
5. 在并发写入会冲突的地方隔离测试数据。**datasets**
   支持跨 VU 的受控行分配；托管 runner 上的 setup/teardown 集合
   在测试前后各执行一次，而不是每次迭代一次。
   `--use-mock` 可以基准化集合/脚本开销，但其数字
   无法确立真实后端的容量。

## 从 JMeter 导入

手上是 JMeter `.jmx` 而不是集合？不要手工重建——运行
内置导入器（`references/jmeter-import/scripts/jmx_to_postman.py <plan>.jmx
-o <out>`；见 `references/jmeter-import/README.md`），然后将其输出当作上面的
集合处理。阅读生成的报告：它标明哪些被精确映射、哪些
被近似处理，以及哪些 JMeter 特性在此没有对应物——思考时间
定时器、并发线程组与非 HTTP（JDBC/FTP/LDAP/Java）采样器会被
报告，绝不伪造。

## 验证

报告工作负载、runner、实际达到的流量、延迟与错误指标，
以及阈值判定。指出阻止把结果归因于 API 容量的生成器限制或目标错误。
关于功能断言见 **api-testing**，当实测阈值变成门槛时见 **ci-integration**。
