'use strict';
// 规范生成入口：维护这一份即可。实际模板与生成逻辑在 维护工具/内核生成器.js。
// 用法：node 维护工具/重建汉化内核.js [--check]
const { generate } = require('./内核生成器.js');
const checkOnly = process.argv.includes('--check');
try {
  const summary = generate({ checkOnly });
  console.log(JSON.stringify(summary, null, 2));
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
