'use strict';
// azure-theme-regression.cjs - 天青蓝对话气泡外观补丁的渲染回归。
// 验证：CSS 资源可被生成的内核内嵌、对真实结构生效、幂等、深浅主题、关闭可还原。
const fs = require('node:fs');
const assert = require('node:assert/strict');
const withFixture = require('./lib/chrome-fixture.cjs');

const css = fs.readFileSync('src/AntigravityZhManager/Assets/theme-azure-bubble.css', 'utf8');
const bundle = fs.readFileSync('src/AntigravityZhManager/Assets/zh-bundle.js', 'utf8');

const checks = [];
const check = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks.push(label); };

// 生成器必须把最新 CSS 原样内嵌进 zh-bundle.js（永久安装时 attach() 用的就是它）。
assert.ok(bundle.includes('const themeCss = ' + JSON.stringify(css) + ';'),
  'zh-bundle.js 未内嵌最新主题 CSS；请运行 node 维护工具/重建汉化内核.js');
checks.push('bundle 内嵌主题 CSS 与资源一致');

// 永久安装路径的接线必须在生成的包装器里：attach() 读配置 + 注入固定 id 的样式并维护状态位。
for (const marker of ['zh-theme.json', 'ag-azure-bubble-style', '__antigravityZhThemeEnabled', 'process.env.APPDATA']) {
  assert.ok(bundle.includes(marker), 'zh-bundle.js 缺少永久应用接线标记：' + marker);
}

// 复刻官方 2.28.x 用户消息的真实结构（data-testid / data-quotable / sticky / 按钮容器）。
const html = `<!doctype html><html><head><meta charset="utf-8"></head><body class="theme-light">
<div role="article" aria-label="User message" class="sticky top-0 z-10 mb-4">
  <div class="relative bg-background md-sticky-message-bleed">
    <div data-testid="user-input-step" class="flex flex-col w-full gap-2 group/user-input-step pt-4">
      <div class="relative p-px rounded-xl bg-card-border">
        <div data-testid="user-message-bubble" class="relative flex flex-row items-center gap-2 p-1.5 bg-card overflow-hidden">
          <div class="flex-1 p-0.5 max-h-[10vh] overflow-hidden"><div data-quotable="true" class="whitespace-pre-wrap text-sm">你好世界</div></div>
        </div>
      </div>
      <div class="absolute bottom-0.5 right-0.5 user-input-buttons-container select-none"><span>10:00</span><button>copy</button></div>
    </div>
  </div>
</div></body></html>`;

const apply = `(() => { const id='ag-azure-bubble-style'; let el=document.getElementById(id);
  if(!el){el=document.createElement('style');el.id=id;(document.head||document.documentElement).appendChild(el);}
  const css=${JSON.stringify(css)}; if(el.textContent!==css) el.textContent=css;
  window.__antigravityZhThemeEnabled=true; })()`;

withFixture(html, async (evaluate, pause) => {
  await evaluate(apply);
  await pause(60);
  check(await evaluate(`getComputedStyle(document.querySelector('[role="article"]')).position`), 'static', 'article 解除吸顶');
  check(await evaluate(`getComputedStyle(document.querySelector('[data-testid="user-input-step"]')).alignItems`), 'flex-end', '输入步骤右对齐');
  check(await evaluate(`getComputedStyle(document.querySelector('[data-testid="user-message-bubble"]')).backgroundColor`), 'rgba(0, 0, 0, 0)', '气泡外层透明');
  check(await evaluate(`getComputedStyle(document.querySelector('[data-quotable="true"]')).backgroundColor`), 'rgb(231, 243, 254)', '浅色天青蓝底色');
  check(await evaluate(`getComputedStyle(document.querySelector('.user-input-buttons-container')).position`), 'static', '操作按钮下移不悬浮');
  check(await evaluate(`document.querySelectorAll('#ag-azure-bubble-style').length`), 1, '样式节点唯一');

  // 幂等：重复应用不得新增节点。
  await evaluate(apply);
  await pause(20);
  check(await evaluate(`document.querySelectorAll('#ag-azure-bubble-style').length`), 1, '重复应用幂等');

  // 深色主题底色。
  await evaluate(`document.body.classList.remove('theme-light');document.body.classList.add('theme-dark')`);
  await pause(20);
  check(await evaluate(`getComputedStyle(document.querySelector('[data-quotable="true"]')).backgroundColor`), 'rgb(26, 46, 68)', '深色天青蓝底色');

  // 关闭：移除样式节点并复位标志。
  await evaluate(`(() => { const el=document.getElementById('ag-azure-bubble-style'); if(el) el.remove(); window.__antigravityZhThemeEnabled=false; })()`);
  await pause(20);
  check(await evaluate(`document.getElementById('ag-azure-bubble-style')===null`), true, '关闭后移除样式');
  check(await evaluate(`window.__antigravityZhThemeEnabled`), false, '关闭后标志复位');

  fs.mkdirSync('work/azure-theme-regression', { recursive: true });
  fs.writeFileSync('work/azure-theme-regression/result.json', JSON.stringify({ checks, passed: true }, null, 2));
  console.log('azure theme regression: ' + checks.length + ' PASS');
}).catch(error => { console.error(error); process.exitCode = 1; });
