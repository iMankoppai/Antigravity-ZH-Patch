'use strict';
// release-consistency.cjs - 发布元数据门禁。
// 校验 dist 下的 ZIP、SHA256SUMS.txt、release-metadata.json 三者自洽，
// 并把“根目录 EXE 是否等于本次发布的 EXE”作为提示项，避免交付件互相矛盾而不自知。
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..', '..');
const distDir = path.join(root, 'dist');
const failures = [];
const advisories = [];
const notes = [];
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

const metadataPath = path.join(distDir, 'release-metadata.json');
const sumsPath = path.join(distDir, 'SHA256SUMS.txt');

if (!fs.existsSync(metadataPath)) {
  console.log(JSON.stringify({ skipped: true, reason: 'dist/release-metadata.json 不存在（尚未用 release.js 发布）' }, null, 2));
  console.log('release consistency gate: SKIP');
  process.exit(0);
}

const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
const sums = fs.readFileSync(sumsPath, 'utf8');
const zipPath = path.join(distDir, metadata.zip);

// 发布包 *.zip 不入版本管理，干净克隆（或 CI）里必然不存在；
// 这只说明本机没有发布包可核对，不构成发布元数据矛盾，跳过即可。
if (!fs.existsSync(zipPath)) {
  console.log(JSON.stringify({
    skipped: true,
    version: metadata.version,
    zip: metadata.zip,
    reason: '本地没有该发布包（*.zip 不入版本管理），跳过包内容核对',
  }, null, 2));
  console.log('release consistency gate: SKIP');
  process.exit(0);
}

{
  const zipBuf = fs.readFileSync(zipPath);
  const actual = sha256(zipBuf);
  if (actual !== metadata.zipSha256) failures.push(`ZIP 实际哈希 ${actual} 与元数据 ${metadata.zipSha256} 不一致`);
  if (zipBuf.length !== metadata.zipBytes) failures.push(`ZIP 实际字节 ${zipBuf.length} 与元数据 ${metadata.zipBytes} 不一致`);
  if (!sums.includes(actual)) failures.push('SHA256SUMS.txt 未包含当前 ZIP 哈希');
  if (!sums.includes(metadata.zip)) failures.push('SHA256SUMS.txt 未包含当前 ZIP 文件名');
  notes.push(`zip=${metadata.zip} sha256=${actual.slice(0, 16)}…`);
}

if (!metadata.zip.includes(metadata.version)) failures.push(`ZIP 文件名未包含版本号 ${metadata.version}`);

// 根目录 EXE：与本次发布的 EXE 比对。不一致时提示（不阻断），
// 因为根目录 EXE 属于本地产物，*.exe 不进版本管理。
let rootExeMatch = false, rootExeFound = null;
for (const f of fs.readdirSync(root, { withFileTypes: true })) {
  if (!f.isFile() || !f.name.toLowerCase().endsWith('.exe')) continue;
  const full = path.join(root, f.name);
  const hash = sha256(fs.readFileSync(full));
  if (f.name === metadata.exe) {
    rootExeFound = { name: f.name, hash };
    if (hash === metadata.exeSha256) rootExeMatch = true;
  }
}
if (rootExeFound) {
  if (rootExeMatch) notes.push(`根目录 ${rootExeFound.name} 与本次发布 EXE 一致`);
  else advisories.push(`根目录 ${rootExeFound.name} (${rootExeFound.hash.slice(0, 16)}…) 与本次发布 EXE (${metadata.exeSha256.slice(0, 16)}…) 不一致；若要交付根目录 EXE，请用同一次候选构建替换`);
} else {
  advisories.push(`根目录未找到名为 ${metadata.exe} 的 EXE；若交付文件名不同，请确认交付件与本次发布一致`);
}

const summary = { version: metadata.version, zip: metadata.zip, failures: failures.length, advisories: advisories.length, notes };
console.log(JSON.stringify(summary, null, 2));
if (advisories.length) console.log('[advisory]\n' + advisories.join('\n'));
if (failures.length) { console.error('[fail]\n' + failures.join('\n')); process.exit(1); }
console.log('release consistency gate: PASS');
