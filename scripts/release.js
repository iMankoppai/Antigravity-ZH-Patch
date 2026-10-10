'use strict';
// 发布入口：先构建并验证临时包，全部通过后才替换正式产物。
//
// 设计要点（对应指导书 7.4）：
//   1. 版本从 csproj 读取，不再硬编码文件名。
//   2. 在本次独有的暂存目录里组装并生成临时 ZIP。
//   3. 校验 ZIP 可解压、CRC 正确、文件集合正确、中文文件名正常，
//      且 ZIP 内 EXE 与候选 EXE 字节/SHA256 一致。
//   4. 生成 SHA256 清单与发布元数据，在暂存目录内核对。
//   5. 全部通过后才替换正式产物；旧包在新包验证完成前保留。
//   6. 只清理本次创建的暂存目录，且校验绝对路径边界。
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');
const csprojPath = path.join(root, 'src/AntigravityZhManager/AntigravityZhManager.csproj');
const readmePath = path.join(root, 'README.md');

const failures = [];
const notes = [];
const fail = (m) => failures.push(m);
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

// ---- 1. 版本与输入 ----
const csproj = fs.readFileSync(csprojPath, 'utf8');
const version = (csproj.match(/<Version>([^<]+)<\/Version>/) || [])[1];
if (!version) fail('无法从 csproj 读取 <Version>');
const productName = (csproj.match(/<AssemblyTitle>([^<]+)<\/AssemblyTitle>/) || [])[1] || 'Antigravity汉化管理器';
const zipName = `Antigravity-ZH-${version}-Windows-x64.zip`;

// 候选 EXE：由调用方通过 --exe 指定（通常是 publish 到独立候选目录的产物），
// 未指定时回退到仓库根目录的正式 EXE。
const dryRun = process.argv.includes('--dry-run');
const exeArgIndex = process.argv.indexOf('--exe');
const candidateExe = exeArgIndex >= 0 ? path.resolve(process.argv[exeArgIndex + 1]) : path.join(root, `${productName}.exe`);
if (!fs.existsSync(candidateExe)) fail(`未找到候选 EXE：${candidateExe}`);
if (!fs.existsSync(readmePath)) fail('未找到 README.md');

if (failures.length) { console.error('[fail]\n' + failures.join('\n')); process.exit(1); }
notes.push(`version=${version}, zip=${zipName}`);

// ---- 2. 暂存目录（本次独有） ----
const stageRoot = path.join(distDir, 'stage', `${version}-${Date.now()}-${process.pid}`);
if (!stageRoot.startsWith(path.join(distDir, 'stage'))) fail('暂存目录越界，已停止');
const stageFiles = path.join(stageRoot, 'files');
const tempZip = path.join(stageRoot, zipName);
fs.mkdirSync(stageFiles, { recursive: true });

const exeName = path.basename(candidateExe);
fs.copyFileSync(candidateExe, path.join(stageFiles, exeName));
fs.copyFileSync(readmePath, path.join(stageFiles, 'README.md'));

const expected = ['README.md', exeName].sort();

// ---- 3. 生成临时 ZIP ----
execFileSync('tar', ['-a', '-c', '-f', tempZip, '-C', stageFiles, '.'], { stdio: 'pipe' });
if (!fs.existsSync(tempZip)) fail('临时 ZIP 未生成');

// ---- 4. 验证临时 ZIP ----
if (failures.length === 0) {
  const listOut = execFileSync('tar', ['-t', '-f', tempZip], { encoding: 'utf8' });
  fs.mkdirSync(path.join(stageRoot, 'extract'), { recursive: true });
  // 解压到暂存目录，同时让 tar 校验 CRC（损坏会以非零退出）
  try {
    execFileSync('tar', ['-x', '-f', tempZip, '-C', path.join(stageRoot, 'extract')], { stdio: 'pipe' });
  } catch (err) {
    fail('ZIP 解压失败（CRC 或结构损坏）：' + (err.message || err));
  }

  const extracted = fs.readdirSync(path.join(stageRoot, 'extract')).filter((n) => n !== '.').sort();
  if (JSON.stringify(extracted) !== JSON.stringify(expected)) {
    fail(`ZIP 内文件集合不符：期望 ${JSON.stringify(expected)}，实际 ${JSON.stringify(extracted)}`);
  }
  // 中文文件名必须正常
  if (!fs.existsSync(path.join(stageRoot, 'extract', exeName))) fail(`ZIP 内未找到 EXE 条目：${exeName}`);

  const exeInZip = path.join(stageRoot, 'extract', exeName);
  if (fs.existsSync(exeInZip)) {
    const a = fs.readFileSync(candidateExe);
    const b = fs.readFileSync(exeInZip);
    if (!a.equals(b)) fail('ZIP 内 EXE 与候选 EXE 字节不一致');
    notes.push(`exe sha256=${sha256(a)}`);
  }
  notes.push(`zip entries=${extracted.length}`);
}

// ---- 5. 生成清单与元数据（先在暂存目录核对） ----
if (failures.length === 0) {
  const zipBuf = fs.readFileSync(tempZip);
  const zipHash = sha256(zipBuf);
  const sums = `${zipHash}  ${zipName}\n`;
  const metadata = {
    productName,
    version,
    platform: 'win-x64',
    zip: zipName,
    zipSha256: zipHash,
    zipBytes: zipBuf.length,
    exe: exeName,
    exeSha256: sha256(fs.readFileSync(candidateExe)),
    releaseMetadataVersion: 1,
    generatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(stageRoot, 'SHA256SUMS.txt'), sums, 'utf8');
  fs.writeFileSync(path.join(stageRoot, 'release-metadata.json'), JSON.stringify(metadata, null, 2) + '\n', 'utf8');
  notes.push(`zip sha256=${zipHash}`);

  if (dryRun) {
    notes.push('dry-run：已完成全部校验，未替换正式产物');
  } else {
    // ---- 6. 全部通过后才替换正式产物；旧包先归档保留 ----
    const finalZip = path.join(distDir, zipName);
    const archiveDir = path.join(distDir, 'archive');
    if (fs.existsSync(finalZip)) {
      fs.mkdirSync(archiveDir, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const archived = path.join(archiveDir, `${zipName}.before-${stamp}`);
      fs.copyFileSync(finalZip, archived);
      notes.push(`旧包已归档：dist/archive/${path.basename(archived)}`);
    }
    fs.copyFileSync(tempZip, finalZip);
    fs.copyFileSync(path.join(stageRoot, 'SHA256SUMS.txt'), path.join(distDir, 'SHA256SUMS.txt'));
    fs.copyFileSync(path.join(stageRoot, 'release-metadata.json'), path.join(distDir, 'release-metadata.json'));
    notes.push(`replaced dist/${zipName}`);
  }

  // 旧版本包保留（不删除），只清理本次暂存目录。
  const resolvedStage = fs.realpathSync(stageRoot);
  const stageBase = fs.realpathSync(path.join(distDir, 'stage'));
  if (resolvedStage.startsWith(stageBase + path.sep)) {
    fs.rmSync(resolvedStage, { recursive: true, force: true });
  } else {
    fail('暂存目录边界校验失败，未执行清理');
  }
} else {
  notes.push(`验证失败，正式产物未改动；暂存目录保留供分析：${stageRoot}`);
}

const summary = { version, zipName, candidateExe, dryRun, failures: failures.length, notes };
console.log(JSON.stringify(summary, null, 2));
if (failures.length) { console.error('[fail]\n' + failures.join('\n')); process.exit(1); }
console.log('release gate: PASS');
