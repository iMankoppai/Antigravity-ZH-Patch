'use strict';
// 本机 Antigravity 安装路径解析。官方更新器会改变安装目录（例如从
// %LOCALAPPDATA%\Programs\antigravity 换到 D:\Antigravity），因此这里不写死单一路径：
// 先读环境变量，再按候选目录探测，最后回退到注册表里的卸载记录。
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const CANDIDATE_DIRS = [
  process.env.ZH_INSTALL_DIR,
  'D:/Antigravity',
  'C:/Users/24844/AppData/Local/Programs/antigravity',
  'C:/Program Files/Antigravity',
].filter(Boolean);

function normalize(p) { return p ? path.resolve(p.replace(/[\\/]+/g, path.sep)) : ''; }

function resolveInstallDir() {
  for (const dir of CANDIDATE_DIRS) {
    try { if (fs.existsSync(path.join(dir, 'Antigravity.exe'))) return dir; } catch { }
  }
  // 注册表兜底：卸载记录里的 DisplayIcon / InstallLocation
  for (const hive of ['HKCU', 'HKLM']) {
    try {
      const out = execFileSync('reg', ['query', hive + '\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall', '/s'],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 8 * 1024 * 1024 });
      const lines = out.split(/\r?\n/);
      for (const line of lines) {
        const m = line.match(/^\s*(DisplayIcon|InstallLocation)\s+REG_\w+\s+(.+?)\s*$/);
        if (!m) continue;
        const value = m[2].replace(/^"|"$/g, '').replace(/,\d+$/, '');
        const exe = value.toLowerCase().endsWith('.exe') ? value : path.join(value, 'Antigravity.exe');
        if (fs.existsSync(exe)) return path.dirname(exe);
      }
    } catch { }
  }
  return '';
}

function installDir() { return normalize(resolveInstallDir()); }

function asarPath() {
  const dir = installDir();
  return dir ? path.join(dir, 'resources', 'app.asar') : '';
}

function backupPath() {
  const dir = installDir();
  return dir ? path.join(dir, 'resources', 'app.asar.bak') : '';
}

// 判断归档是否已经打过汉化补丁（头部出现 dist/zh-bundle.js）。
function looksPatched(asarFile) {
  try {
    const buf = fs.readFileSync(asarFile);
    const jsonLen = buf.readUInt32LE(12);
    return buf.slice(16, 16 + jsonLen).toString('utf8').includes('zh-bundle.js');
  } catch { return false; }
}

// 门禁用的“官方原版”来源：优先备份，其次尚未打补丁的当前归档。
function pristinePath() {
  const bak = backupPath();
  if (bak && fs.existsSync(bak)) return bak;
  const asar = asarPath();
  if (asar && fs.existsSync(asar) && !looksPatched(asar)) return asar;
  return '';
}

module.exports = { installDir, asarPath, backupPath, pristinePath, looksPatched };
