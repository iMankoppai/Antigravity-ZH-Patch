// 只读（仅展开"再查看"按钮，不改数据）：导出运行中客户端"自定义项"市场的分类与插件卡片文案。
'use strict';
const fs = require('fs');
const http = require('http');

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>{try{resolve(JSON.parse(d));}catch(e){reject(e);}}); }).on('error', reject);
  });
}

const expr = `(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  // 展开所有“再查看 N 项 / Show N more”
  for (let round = 0; round < 30; round++) {
    const btns = [...document.querySelectorAll('button, [role="button"]')].filter(b => {
      const t = (b.innerText || b.textContent || '').trim();
      return /^再查看\\s*\\d+\\s*项$/.test(t) || /^(Show|See)\\s+\\d+\\s+more$/i.test(t) || /^查看全部/.test(t);
    });
    const target = btns.find(b => !b.__agExpandedClicked);
    if (!target) break;
    target.__agExpandedClicked = true;
    target.click();
    await sleep(350);
  }
  await sleep(300);

  const clean = s => (s || '').replace(/\\s+/g, ' ').trim();
  const cards = [];
  const containers = [...document.querySelectorAll('[data-testid="customization-card"]')];
  for (const c of containers) {
    const nameEl = c.querySelector('h3, h4, a, [class*="font-medium"], [class*="font-semibold"]');
    const name = clean(nameEl ? nameEl.textContent : '');
    let desc = '';
    const d = [...c.querySelectorAll('div, p')].find(e => /truncate/.test(e.className || '') && clean(e.textContent) !== name);
    if (d) desc = clean(d.textContent);
    // 分类：找前面最近的 h2 customizations-marketplace
    let cat = '';
    let prev = c;
    while (prev && !cat) {
      prev = prev.previousElementSibling || prev.parentElement;
      if (!prev) break;
      const h = prev.matches && prev.matches('h2[data-testid="customizations-marketplace"]') ? prev : (prev.querySelector ? prev.querySelector('h2[data-testid="customizations-marketplace"]') : null);
      if (h) cat = clean(h.textContent);
      else if (prev.matches && prev.matches('h2')) { cat = clean(prev.textContent); }
    }
    if (name) cards.push({ name, desc, cat });
  }
  const heads = [...document.querySelectorAll('h2[data-testid="customizations-marketplace"]')].map(h => ({ title: clean(h.textContent), sub: clean((h.parentElement?.querySelector('p[data-testid="customizations-marketplace"]')||{}).textContent || '') }));
  const featured = [...document.querySelectorAll('[data-testid="featured-carousel-headline"]')].map(h => ({ title: clean(h.textContent), desc: clean((h.parentElement?.querySelector('[data-testid="featured-carousel-description"]')||{}).textContent || '') }));
  return JSON.stringify({ url: location.href, cardCount: cards.length, heads, featured, cards }, null, 1);
})()`;

(async () => {
  const port = fs.readFileSync(process.env.APPDATA + '\\Antigravity\\DevToolsActivePort', 'utf8').trim().split('\n')[0].trim();
  const targets = await getJson(`http://127.0.0.1:${port}/json/list`);
  const page = targets.find(t => t.type === 'page' && /\/customizations/.test(t.url));
  if (!page) { console.error('no customizations page target'); process.exit(1); }
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  const out = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), 45000);
    ws.onopen = () => ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true, awaitPromise: true } }));
    ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id === 1) { clearTimeout(timer); if (m.result?.exceptionDetails) reject(new Error(JSON.stringify(m.result.exceptionDetails))); else resolve(m.result?.result?.value); ws.close(); } };
    ws.onerror = () => reject(new Error('ws error'));
  }).catch(e => { console.error('PROBE_ERROR', e.message); process.exit(1); });
  fs.writeFileSync(__dirname + '/marketplace-dump.json', out);
  const data = JSON.parse(out);
  console.log('cardCount', data.cardCount, 'heads', data.heads.length, 'featured', data.featured.length);
  for (const h of data.heads) console.log('H2 |', h.title, '||', h.sub);
  for (const f of data.featured) console.log('FEAT |', f.title, '||', f.desc);
  for (const c of data.cards) console.log('CARD |', c.cat, '|', c.name, '||', c.desc);
})();
