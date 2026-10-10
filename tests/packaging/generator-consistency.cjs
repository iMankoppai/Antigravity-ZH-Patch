'use strict';
// generator-consistency.cjs - 内核生成入口回归。
// 验证：生成确定可复现、两个入口结果一致、--check 不修改文件、包装器保留 attach。
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..', '..');
const bundlePath = path.join(root, 'src', 'AntigravityZhManager', 'Assets', 'zh-bundle.js');
const { generate, buildBundle, loadSources } = require(path.join(root, '维护工具', '内核生成器.js'));

const failures = [];
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

// 1. 生成必须确定：同样输入两次得到同样字节
const { dict, translateSrc } = loadSources();
const first = buildBundle(dict, translateSrc);
const second = buildBundle(dict, translateSrc);
if (first !== second) failures.push('两次生成的字节不一致（生成不确定）');

// 2. 与磁盘上的 zh-bundle.js 一致（源码与产物同步）
const onDisk = fs.readFileSync(bundlePath, 'utf8');
if (onDisk !== first) failures.push('磁盘 zh-bundle.js 与规范生成结果不一致；请运行 node 维护工具/重建汉化内核.js');

// 3. --check 不得修改文件
const beforeHash = sha(fs.readFileSync(bundlePath));
const checkSummary = generate({ checkOnly: true });
const afterHash = sha(fs.readFileSync(bundlePath));
if (beforeHash !== afterHash) failures.push('--check 模式修改了文件（应当只读）');
if (checkSummary.changed !== false) failures.push('--check 报告文件不同步');

// 4. 包装器必须保留关键注入契约
for (const marker of ['module.exports = { attach }', "contents.on('dom-ready'", "contents.on('did-finish-load'", 'allowedOrigin']) {
  if (!onDisk.includes(marker)) failures.push(`包装器缺少关键契约：${marker}`);
}

// 5. 两个入口模块都能加载（build-bundle.js 为转发入口）
try { require(path.join(root, 'scripts', 'build-bundle.js')); } catch (err) { failures.push('scripts/build-bundle.js 无法加载：' + err.message); }

const summary = {
  bundleSha256: sha(Buffer.from(onDisk)),
  terms: Object.keys(dict).length,
  patchVersion: checkSummary.patchVersion,
  generatedBytes: Buffer.byteLength(onDisk),
  failures: failures.length,
};
console.log(JSON.stringify(summary, null, 2));
if (failures.length) { console.error('[fail]\n' + failures.join('\n')); process.exit(1); }
console.log('generator consistency gate: PASS');
