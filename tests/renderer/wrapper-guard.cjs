'use strict';
// 验证包装器的 attach() 协议白名单：https://127.0.0.1 与 data: 放行，其他拒绝。
const fs = require('fs');
const vm = require('vm');
const bundle = fs.readFileSync('src/AntigravityZhManager/Assets/zh-bundle.js', 'utf8');

function run(attachUrl, currentUrl) {
  const submitted = [];
  const handlers = {};
  const contents = {
    isDestroyed: () => false,
    getURL: () => currentUrl,
    executeJavaScript: (s) => { submitted.push(s); return Promise.resolve(); },
    on: (ev) => { handlers[ev] = true; },
  };
  const win = { isDestroyed: () => false, webContents: contents };
  const sandbox = {
    module: { exports: {} }, exports: {}, console,
    URL, WeakSet, JSON, Object, String, Symbol, Number, Boolean, Array,
  };
  vm.createContext(sandbox);
  new vm.Script(bundle).runInContext(sandbox);
  sandbox.module.exports.attach(win, attachUrl);
  return { submitted: submitted.length, events: Object.keys(handlers) };
}

const cases = [
  ['https://127.0.0.1:53744/', 'https://127.0.0.1:53744/', true, 'local https allowed'],
  ['data:text/html;charset=utf-8,%3C!DOCTYPE%20html%3E', 'data:text/html;charset=utf-8,%3C!DOCTYPE%20html%3E', true, 'data url allowed (wizard)'],
  ['https://evil.example.com/', 'https://evil.example.com/', false, 'remote https rejected'],
  ['http://127.0.0.1:1234/', 'http://127.0.0.1:1234/', false, 'plain http rejected'],
  ['file:///C:/x.html', 'file:///C:/x.html', false, 'file url rejected'],
  ['data:text/html,<b>x</b>', 'https://127.0.0.1:53744/other', false, 'data attached but wrong origin rejected'],
];

let failures = 0;
for (const [attachUrl, currentUrl, shouldInject, label] of cases) {
  const r = run(attachUrl, currentUrl);
  const injected = r.submitted > 0;
  const ok = injected === shouldInject && (injected ? r.submitted >= 1 : true);
  // 放行时还必须监听 dom-ready / did-finish-load
  const eventsOk = !shouldInject || (r.events.includes('dom-ready') && r.events.includes('did-finish-load'));
  const pass = ok && eventsOk;
  if (!pass) failures++;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label.padEnd(42)} injected=${injected} events=[${r.events.join(',')}]`);
}
console.log(failures === 0 ? '\nwrapper guard: PASS' : `\nwrapper guard: ${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
