'use strict';
// status-label-regression.cjs - renderer regression for the Antigravity status
// labels. Runs the real Assets/translate.js in isolated headless Chrome against
// a synthetic DOM fixture. The production client is never touched.
//
// Configuration via environment variables:
//   ZH_CHROME_PATH  absolute path to chrome.exe (default: standard Windows install)
//   ZH_TEST_OUT     output directory for results and the throwaway profile
//                   (default: <repo>/work/status-label-repair)
//
// The expected patch version is read from Assets/translate.js, never hard-coded,
// and the pass count is computed from the assertions that actually ran.
const fs = require('fs'), path = require('path'), http = require('http'), { spawn } = require('child_process'), assert = require('assert/strict');
const root = path.resolve(__dirname, '..', '..');
const out = process.env.ZH_TEST_OUT || path.join(root, 'work/status-label-repair');
const assets = path.join(root, 'src/AntigravityZhManager/Assets');
const CHROME = process.env.ZH_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
if (!fs.existsSync(CHROME)) {
  console.error('[env] Chrome 未找到: ' + CHROME + '\n请安装 Chrome，或设置 ZH_CHROME_PATH 指向 chrome.exe。');
  process.exit(2);
}
fs.mkdirSync(out, { recursive: true });
const dictionary = JSON.parse(fs.readFileSync(path.join(assets, 'dictionaries.json'), 'utf8'));
const source = fs.readFileSync(path.join(assets, 'translate.js'), 'utf8');
const expectedVersion = Number(source.match(/const patchVersion = (\d+)/)?.[1]);
if (!Number.isInteger(expectedVersion)) throw new Error('无法从 translate.js 读取 patchVersion');
const oldSource = fs.existsSync(path.join(out, 'baseline/translate.js')) ? fs.readFileSync(path.join(out, 'baseline/translate.js'), 'utf8') : null;
const pause = ms => new Promise(r => setTimeout(r, ms));
let server, chrome, ws, id = 0;
const pending = new Map(), checks = [];
const header = 'group flex w-full min-w-0 items-center min-h-8 py-1 px-2 select-none transition-[background-color]';
const title = 'flex flex-row items-center gap-1 overflow-hidden whitespace-nowrap text-muted-foreground';
const step = (id, prefix, target) => `<div class="${header}"><div class="flex min-w-0 items-center gap-x-1 text-sm"><div class="truncate"><div class="${title}"><span id="${id}" class="text-muted-foreground">${prefix}</span><span class="inline-flex text-muted-foreground"><span id="${id}-target" title="${target}">${target}</span></span></div></div></div><span>+27 -0</span></div>`;
const fixture = `<!doctype html><body>
<article role="article" aria-label="Agent response">
<button id="summary" data-testid="tool-group-collapsible" aria-label="Exploring file, running command, editing files"><span title="Exploring file, running command, editing files">Exploring file, running command, editing files</span><svg id="caret"></svg></button>
<button id="time" data-testid="thinking-collapsible-trigger" aria-label="Thought for 11s"><span id="time-label" class="animate-shimmer-text"></span><svg></svg></button>
<button id="whole-time" data-testid="thinking-collapsible-trigger">Thought for 12s ›</button>
<button id="mixed-time" data-testid="thinking-collapsible-trigger">Thought for 1 hr 2 mins 3 secs</button>
<button id="raw-command" data-testid="tool-group-collapsible">Running echo &quot;Edited files&quot;, printf &quot;Exploring file&quot;</button>
${step('analyzed', 'Analyzed', 'CdpHotPatcher.cs#L1-306')}
${step('edited', 'Edited', 'app.manifest')}
${step('identity', 'Analyzed', 'Settings')}
${step('running', 'Ran', 'npm run test, echo &quot;Edited files&quot;')}
 ${step('building', 'Building', 'a.csproj')}${step('built', 'Built', 'a.csproj')}
 ${step('testing', 'Testing', 'suite')}${step('tested', 'Tested', 'suite')}
 ${step('executing', 'Executing', 'npm test')}${step('runPrefix', 'Run', 'npm test')}
 ${step('failedBuild', 'Failed to build', 'a.csproj')}${step('testFailed', 'Test failed', 'suite')}
<div class="${header}"><div class="${title}"><span class="truncate text-muted-foreground" id="task">Checked task 执行dotnet publish重新编译</span></div></div>
<div class="${header}"><div class="${title}"><span class="truncate text-muted-foreground" id="named-summary">重新发布带有管理员清单的单文件管理器</span></div></div>
<p id="agent-prose">Analyzed</p>
<div data-testid="planner-response-text">${step('authored-header', 'Analyzed', 'Settings')}<button id="authored-time" data-testid="thinking-collapsible-trigger">Thought for 12s</button></div>
<div class="cursor-edit group relative text-secondary-foreground pl-2"><p id="thought-prose">Thought for 12s</p></div>
</article>
<article role="article" aria-label="User message"><div data-testid="user-input-step">${step('user-header', 'Analyzed', 'Settings')}<button id="user-summary" data-testid="tool-group-collapsible">Exploring file, running command, editing files</button><p id="user-prose">Thought for 12s</p></div></article>
<pre><code id="code">Analyzed</code></pre><button><pre><code id="button-code">Settings</code></pre></button>
<div class="xterm-screen" id="terminal">Thought for 12s</div><textarea id="draft">Exploring file, running command, editing files</textarea>
<div contenteditable="true" id="editor">Checked task do not change</div>
<button id="settings">Settings</button>
<div class="${header}"><div class="${title}"><span class="inline-flex text-muted-foreground"><span id="prefixless-file" title="Read">Analyzed</span></span></div></div>
<div class="banner" id="missing-banner"><span id="missing-title">Missing Folder</span><button id="missing-close" aria-label="Close"></button></div>
<div data-testid="planner-response-text"><p id="authored-missing">Missing Folder</p></div>
<div id="late-holder"></div><div id="many"></div>
<script>window.clicks=0;document.getElementById('summary').addEventListener('click',()=>window.clicks++);window.originalCaret=document.getElementById('caret');window.countNode=document.createTextNode('11');document.getElementById('time-label').append(document.createTextNode('Thought for '),window.countNode,document.createTextNode('s'));</script>
</body>`;
function cdp(method, params = {}) { return new Promise((resolve, reject) => { const i = ++id, t = setTimeout(() => { pending.delete(i); reject(Error('CDP ' + method + ' timeout')) }, 10000); pending.set(i, m => { clearTimeout(t); m.error ? reject(Error(m.error.message)) : resolve(m.result) }); ws.send(JSON.stringify({ id: i, method, params })); }); }
async function evaluate(expression) { const r = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result?.value; }
async function until(fn) { for (let i = 0; i < 120; i++) { if (await fn()) return; await pause(25) } throw Error('condition timeout'); }
async function eq(name, expression, expected) { const actual = await evaluate(expression); assert.deepEqual(actual, expected, name); checks.push(name); }
async function main() {
  server = http.createServer((req, res) => { res.setHeader('Content-Type', 'text/html;charset=utf-8'); res.end(fixture) });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const profile = path.join(out, 'chrome-profile-' + Date.now());
  chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-extensions', '--user-data-dir=' + profile, '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1', 'http://127.0.0.1:' + server.address().port], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  let err = '';
  chrome.stderr.on('data', d => err += d);
  const portFile = path.join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 150 && !fs.existsSync(portFile); i++) await pause(50);
  assert.ok(fs.existsSync(portFile), 'Chrome 未启动:\n' + err);
  const port = Number(fs.readFileSync(portFile, 'utf8').split('\n')[0]);
  const target = (await (await fetch('http://127.0.0.1:' + port + '/json/list')).json()).find(t => t.type === 'page');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.addEventListener('open', r, { once: true }); ws.addEventListener('error', j, { once: true }) });
  ws.addEventListener('message', ev => { const m = JSON.parse(ev.data), p = pending.get(m.id); if (p) { pending.delete(m.id); p(m) } });
  await until(() => evaluate("!!document.getElementById('summary')"));
  const snapshot = `Object.fromEntries(['summary','time','whole-time','mixed-time','analyzed','edited','task'].map(id=>[id,document.getElementById(id).textContent]))`;
  await evaluate('window.__antigravityZhPatchDictionary=' + JSON.stringify(dictionary));
  let before = null;
  if (oldSource) {
    await evaluate(oldSource);
    await until(() => evaluate('window.__antigravityZhPatchInstalled'));
    before = await evaluate(snapshot);
    assert.equal(before.analyzed, 'Analyzed', 'baseline article status leak reproduction');
    assert.equal(before.time, 'Thought for 11s', 'baseline split timer leak reproduction');
    await evaluate('window.__antigravityZhPatchRestore()');
  }
  await evaluate(source);
  await until(() => evaluate('window.__antigravityZhPatchInstalled && window.__antigravityZhPatchVersion===' + expectedVersion));
  const after = await evaluate(snapshot);
  await eq('compound status label', "document.getElementById('summary').textContent", '正在探索文件，正在运行命令，正在编辑文件');
  await eq('summary aria label', "document.getElementById('summary').getAttribute('aria-label')", '正在探索文件，正在运行命令，正在编辑文件');
  await eq('summary tooltip', "document.getElementById('summary').firstElementChild.title", '正在探索文件，正在运行命令，正在编辑文件');
  await eq('split completed timer', "document.getElementById('time').textContent", '已思考 11 秒');
  await eq('whole timer and caret', "document.getElementById('whole-time').textContent", '已思考 12 秒 ›');
  await eq('duration units longest first', "document.getElementById('mixed-time').textContent", '已思考 1 小时 2 分钟 3 秒');
  for (const [id, want] of [['analyzed', '已分析'], ['edited', '已编辑'], ['identity', '已分析'], ['running', '已运行'], ['task', '已检查任务 执行dotnet publish重新编译'], ['building', '正在构建'], ['built', '已构建'], ['testing', '正在测试'], ['tested', '已测试'], ['executing', '正在执行'], ['runPrefix', '运行'], ['failedBuild', '构建失败'], ['testFailed', '测试失败']]) await eq('application prefix ' + id, `document.getElementById('${id}').textContent`, want);
  for (const [id, want] of [['analyzed-target', 'CdpHotPatcher.cs#L1-306'], ['edited-target', 'app.manifest'], ['identity-target', 'Settings'], ['running-target', 'npm run test, echo "Edited files"']]) { await eq('payload text ' + id, `document.getElementById('${id}').textContent`, want); await eq('payload title ' + id, `document.getElementById('${id}').title`, want); }
  await eq('raw command summary preserves quoted actions', "document.getElementById('raw-command').textContent", '正在运行 echo "Edited files", printf "Exploring file"');
  await eq('generated Chinese title preserved', "document.getElementById('named-summary').textContent", '重新发布带有管理员清单的单文件管理器');
  for (const [id, want] of [['agent-prose', 'Analyzed'], ['authored-header', 'Analyzed'], ['authored-header-target', 'Settings'], ['authored-time', 'Thought for 12s'], ['thought-prose', 'Thought for 12s'], ['user-header', 'Analyzed'], ['user-header-target', 'Settings'], ['user-summary', 'Exploring file, running command, editing files'], ['user-prose', 'Thought for 12s'], ['code', 'Analyzed'], ['button-code', 'Settings'], ['terminal', 'Thought for 12s'], ['editor', 'Checked task do not change']]) await eq('content protected ' + id, `document.getElementById('${id}').textContent`, want);
  await eq('prefixless structured filename unchanged', "document.getElementById('prefixless-file').textContent", 'Analyzed');
  await eq('prefixless structured file tooltip unchanged', "document.getElementById('prefixless-file').title", 'Read');
  await eq('textarea draft unchanged', "document.getElementById('draft').value", 'Exploring file, running command, editing files');
  await eq('ordinary UI translation', "document.getElementById('settings').textContent", '设置');
  await eq('missing-folder banner translated', "document.getElementById('missing-title').textContent", '文件夹缺失');
  await eq('missing-folder banner close label translated', "document.getElementById('missing-close').getAttribute('aria-label')", '关闭');
  await eq('authored Missing Folder preserved', "document.getElementById('authored-missing').textContent", 'Missing Folder');
  await evaluate("window.countNode.nodeValue='12'");
  await until(() => evaluate("document.getElementById('time').textContent==='已思考 12 秒'")); checks.push('React count node update after split translation');
  await evaluate("document.getElementById('analyzed').firstChild.nodeValue='Analyzing'");
  await until(() => evaluate("document.getElementById('analyzed').textContent==='正在分析'")); checks.push('React status prefix update');
  await evaluate("document.getElementById('identity-target').textContent='Analyzed';document.getElementById('identity-target').title='Analyzed'");
  await pause(100);
  await eq('reused filename equal to UI key preserved', "[document.getElementById('identity-target').textContent,document.getElementById('identity-target').title]", ['Analyzed', 'Analyzed']);
  await evaluate("window.late=document.createElement('button');window.late.setAttribute('data-testid','thinking-collapsible-trigger');window.late.append(document.createTextNode('Thinking for '));document.getElementById('late-holder').append(window.late)");
  await pause(100);
  await evaluate("window.late.append(document.createTextNode('3'),document.createTextNode('s'))");
  await until(() => evaluate("window.late.textContent==='正在思考 3 秒'")); checks.push('late timer fragments');
  await evaluate(`const verbs=${JSON.stringify(['Exploring', 'Explored', 'Editing', 'Edited', 'Analyzing', 'Analyzed', 'Reading', 'Read', 'Checking', 'Checked', 'Creating', 'Created', 'Viewing', 'Viewed', 'Writing', 'Wrote', 'Listing', 'Listed', 'Killing', 'Killed', 'Invoking', 'Invoked'])};document.getElementById('many').innerHTML='<article role="article" aria-label="Agent response">'+verbs.map((v,i)=>'<div class="${header}"><div class="${title}"><span class="text-muted-foreground" id="verb-'+i+'">'+v+'</span><span class="inline-flex text-muted-foreground"><span>Settings</span></span></div></div>').join('')+'</article>'`);
  await until(() => evaluate("document.getElementById('verb-21')?.textContent==='已调用'"));
  await eq('all action prefixes translated and target names preserved', "[...document.getElementById('many').querySelectorAll('div.flex.flex-row')].map(e=>[e.firstElementChild.textContent,e.lastElementChild.textContent])", ['正在探索', '已探索', '正在编辑', '已编辑', '正在分析', '已分析', '正在读取', '已读取', '正在检查', '已检查', '正在创建', '已创建', '正在查看', '已查看', '正在写入', '已写入', '正在列出', '已列出', '正在终止', '已终止', '正在调用', '已调用'].map(v => [v, 'Settings']));
  const additional = [['Analyzed 2 files', '已分析 2 个文件'], ['Edited 3 artifacts', '已编辑 3 个成果'], ['Searched 4 searches', '已搜索 4 次搜索'], ['Analyzed Task Log', '已分析任务日志'], ['Analyzing content', '正在分析内容'], ['Created outline', '已创建大纲'], ['Checking command status', dictionary['Checking command status']], ['Fetched network requests', dictionary['Fetched network requests']], ['Extracting DOM elements', dictionary['Extracting DOM elements']]];
  await evaluate(`document.getElementById('many').innerHTML='<article role="article" aria-label="Agent response">'+${JSON.stringify(additional.map(c => c[0]))}.map((v,i)=>'<div class="${header}"><div class="${title}"><span class="truncate text-muted-foreground" id="extra-'+i+'">'+v+'</span></div></div>').join('')+'</article>'`);
  await until(() => evaluate("document.getElementById('extra-0')?.textContent==='已分析 2 个文件'"));
  for (let i = 0; i < additional.length; i++) await eq('count and static status ' + additional[i][0], `document.getElementById('extra-${i}').textContent`, additional[i][1]);
  await evaluate("document.getElementById('summary').click()");
  await eq('original callback and icon preserved', "[window.clicks,window.originalCaret===document.getElementById('caret')]", [1, true]);
  await evaluate(source);
  await eq('idempotent reinjection same controller', "window.__antigravityZhPatchVersion", expectedVersion);
  await evaluate('window.__antigravityZhPatchRestore()');
  await eq('restore latest count and prefix', "[document.getElementById('time').textContent,document.getElementById('analyzed').textContent,window.late.textContent]", ['Thought for 12s', 'Analyzing', 'Thinking for 3s']);
  await eq('restore original summary and metadata', "[document.getElementById('summary').textContent,document.getElementById('summary').getAttribute('aria-label'),document.getElementById('summary').firstElementChild.title]", ['Exploring file, running command, editing files', 'Exploring file, running command, editing files', 'Exploring file, running command, editing files']);
  const result = { passed: checks.length, expectedPatchVersion: expectedVersion, chrome: CHROME, checks, baseline: before, repaired: after, scope: 'isolated Chrome, actual current source, current dictionary; production client untouched' };
  fs.writeFileSync(path.join(out, 'regression.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ passed: checks.length, expectedPatchVersion: expectedVersion, baseline: before, repaired: after }, null, 2));
}
main().catch(e => { fs.writeFileSync(path.join(out, 'regression-failure.txt'), e.stack); console.error(e.stack); process.exitCode = 1 }).finally(async () => { if (ws?.readyState === 1) { try { await cdp('Browser.close') } catch { } ws.close() } if (chrome) chrome.kill(); if (server) server.close() });
