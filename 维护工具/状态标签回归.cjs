'use strict';
// 兼容性转发入口。规范的测试与参数化逻辑位于
// tests/renderer/status-label-regression.cjs，请优先使用统一入口
//   pwsh -File scripts/check-current.ps1
// 本文件仅为旧路径保留，避免出现两份会互相漂移的实现。
console.warn('[deprecated] 维护工具/状态标签回归.cjs 已迁至 tests/renderer/status-label-regression.cjs，请改用 scripts/check-current.ps1。');
require('../tests/renderer/status-label-regression.cjs');
