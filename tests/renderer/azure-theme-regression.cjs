'use strict';
// azure-theme-regression.cjs - 天青蓝对话气泡外观补丁的渲染回归。
// 验证：CSS 资源可被生成的内核内嵌、对真实结构生效、幂等、深浅主题、关闭可还原；
// 以及 2.29 真实层级下“短消息单行、长消息安全折行、无横向溢出”的宽度回归。
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

// ---- 第一段：基础外观（沿用 2.28 夹具，验证颜色/对齐/幂等/关闭还原） ----
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

async function runBasic() {
  await withFixture(html, async (evaluate, pause) => {
    await evaluate(apply);
    await pause(60);
    check(await evaluate(`getComputedStyle(document.querySelector('[role="article"]')).position`), 'static', 'article 解除吸顶');
    check(await evaluate(`getComputedStyle(document.querySelector('[data-testid="user-input-step"]')).alignItems`), 'flex-end', '输入步骤右对齐');
    check(await evaluate(`getComputedStyle(document.querySelector('[data-testid="user-message-bubble"]')).backgroundColor`), 'rgba(0, 0, 0, 0)', '气泡外层透明');
    check(await evaluate(`getComputedStyle(document.querySelector('[data-quotable="true"]')).backgroundColor`), 'rgb(231, 243, 254)', '浅色天青蓝底色');
    check(await evaluate(`getComputedStyle(document.querySelector('.user-input-buttons-container')).position`), 'static', '操作按钮下移不悬浮');
    check(await evaluate(`document.querySelectorAll('#ag-azure-bubble-style').length`), 1, '样式节点唯一');

    await evaluate(apply);
    await pause(20);
    check(await evaluate(`document.querySelectorAll('#ag-azure-bubble-style').length`), 1, '重复应用幂等');

    await evaluate(`document.body.classList.remove('theme-light');document.body.classList.add('theme-dark')`);
    await pause(20);
    check(await evaluate(`getComputedStyle(document.querySelector('[data-quotable="true"]')).backgroundColor`), 'rgb(26, 46, 68)', '深色天青蓝底色');

    await evaluate(`(() => { const el=document.getElementById('ag-azure-bubble-style'); if(el) el.remove(); window.__antigravityZhThemeEnabled=false; })()`);
    await pause(20);
    check(await evaluate(`document.getElementById('ag-azure-bubble-style')===null`), true, '关闭后移除样式');
    check(await evaluate(`window.__antigravityZhThemeEnabled`), false, '关闭后标志复位');
  });
}

// ---- 第二段：2.29 真实层级下的宽度回归（短句单行 / 长句折行 / 无溢出） ----
// 复刻 2.29 renderer 的真实祖先链（user-input-step > w-full row > max-w-[80%] > max-w-full > agy-user-bubble-frame > bubble > content）。
const shim = `
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;font-size:16px}
.flex{display:flex}.flex-col{flex-direction:column}.flex-row{flex-direction:row}
.items-center{align-items:center}.items-end{align-items:flex-end}.justify-end{justify-content:flex-end}
.w-full{width:100%}.min-w-0{min-width:0}.grow{flex-grow:1}.max-w-full{max-width:100%}
.max-w-\\[80\\%\\]{max-width:80%}.max-h-\\[9em\\]{max-height:9em}.overflow-hidden{overflow:hidden}
.gap-1{gap:0.25rem}.gap-1\\.5{gap:0.375rem}.gap-2{gap:0.5rem}
.p-1\\.5{padding:0.375rem}.p-0\\.5{padding:0.125rem}.p-px{padding:1px}
.rounded-xl{border-radius:0.75rem}.text-sm{font-size:14px}.whitespace-pre-wrap{white-space:pre-wrap}
.relative{position:relative}.mb-1{margin-bottom:0.25rem}
#col{width:768px}`;

function article(text) {
  return `<div role="article" aria-label="用户消息" class="mb-1"><div><div class="flex w-full flex-row"><div class="flex min-w-0 grow flex-col">` +
    `<div data-testid="user-input-step" class="flex flex-col w-full items-end gap-1 pt-6">` +
    `<div class="flex items-center justify-end gap-1.5 w-full">` +
    `<div class="flex flex-col items-end gap-1 min-w-0 max-w-[80%]">` +
    `<div class="flex items-center justify-end gap-1.5 max-w-full">` +
    `<div class="agy-user-bubble-frame relative p-px rounded-xl bg-card-border min-w-0 max-w-full">` +
    `<div data-testid="user-message-bubble" class="agy-user-bubble relative flex flex-col gap-2 p-1.5 bg-card overflow-hidden">` +
    `<div data-testid="user-message-content" class="relative p-0.5 max-h-[9em] overflow-hidden">` +
    `<div data-quotable="true" class="whitespace-pre-wrap text-sm">${text}</div>` +
    `</div></div></div></div></div></div></div></div></div></div></div>`;
}

const widthHtml = `<!doctype html><html><head><meta charset="utf-8"><style>${shim}</style></head>
<body class="theme-standalone theme-light"><div class="flex min-w-0 grow flex-col" id="col"><div class="flex w-full flex-row"><div class="mb-1">` +
  article('好') + article('但是我积分不够啊') + article('那这样吧，你去找但是你不需要告诉我具体资源，你就告诉能不能找到，然后我自己去找可以吧') +
  `</div></div></div></body></html>`;

const measureWidth = `[...document.querySelectorAll('[data-testid="user-message-bubble"]')].map((b,i)=>{` +
  `const q=b.querySelector('[data-quotable="true"]');const br=b.getBoundingClientRect();const qr=q.getBoundingClientRect();const cs=getComputedStyle(q);` +
  `return {i,len:q.innerText.length,w:Math.round(br.width),lines:Math.round((qr.height-18)/parseFloat(cs.lineHeight)*10)/10,over:q.scrollWidth-q.clientWidth};})`;

async function runWidth() {
  await withFixture(widthHtml, async (evaluate, pause) => {
    await evaluate(`(()=>{let el=document.getElementById('ag-azure-bubble-style');if(!el){el=document.createElement('style');el.id='ag-azure-bubble-style';document.head.appendChild(el);}el.textContent=${JSON.stringify(css)};})()`);
    await pause(80);
    const data = await evaluate(measureWidth);
    const [tiny, short, long] = data;
    check(tiny.lines < 1.6, true, '1 字极短消息单行显示');
    check(tiny.w >= 95, true, '极短消息保留 96px 最小宽度');
    check(short.lines < 1.6, true, '8 字短消息单行显示（回归：曾被压成两行）');
    check(short.over, 0, '短消息无横向溢出');
    check(long.lines >= 1.9, true, '长消息仍按宽度安全折行');
    check(long.over, 0, '长消息无横向溢出');
  });
}

(async () => {
  await runBasic();
  await runWidth();
  fs.mkdirSync('work/azure-theme-regression', { recursive: true });
  fs.writeFileSync('work/azure-theme-regression/result.json', JSON.stringify({ checks, passed: true }, null, 2));
  console.log('azure theme regression: ' + checks.length + ' PASS');
})().catch(error => { console.error(error); process.exitCode = 1; });
