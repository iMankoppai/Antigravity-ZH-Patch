'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');
const zipPath = path.join(distDir, 'Antigravity-ZH-1.0.0-Windows-x64.zip');

const tempDir = path.join(root, 'dist/temp_pack');
if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
fs.mkdirSync(tempDir, { recursive: true });

fs.copyFileSync(path.join(root, 'Antigravity汉化管理器.exe'), path.join(tempDir, 'Antigravity汉化管理器.exe'));
fs.copyFileSync(path.join(root, 'README.md'), path.join(tempDir, 'README.md'));

if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
execSync(`tar -a -c -f "${zipPath}" -C "${tempDir}" .`);
fs.rmSync(tempDir, { recursive: true, force: true });

const zipBuf = fs.readFileSync(zipPath);
const sha256 = crypto.createHash('sha256').update(zipBuf).digest('hex');
fs.writeFileSync(path.join(distDir, 'SHA256SUMS.txt'), `${sha256}  Antigravity-ZH-1.0.0-Windows-x64.zip\n`, 'utf8');

console.log('🎉 发布包创建成功！');
console.log('📦 文件体积:', (zipBuf.length / (1024 * 1024)).toFixed(2), 'MB');
console.log('🔑 SHA256:', sha256);
