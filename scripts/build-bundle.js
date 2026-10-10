'use strict';
// 兼容性转发入口：实际模板与生成逻辑在 维护工具/内核生成器.js。
// 新代码请使用统一入口：pwsh -File scripts/check-current.ps1
// 仅当以脚本方式直接运行时才生成；被 require 时不产生副作用。
if (require.main === module) {
  console.warn('[deprecated] scripts/build-bundle.js 已收敛到 维护工具/内核生成器.js，请改用 node 维护工具/重建汉化内核.js。');
  const { generate } = require('../维护工具/内核生成器.js');
  const summary = generate({ checkOnly: process.argv.includes('--check') });
  console.log(JSON.stringify(summary, null, 2));
}
