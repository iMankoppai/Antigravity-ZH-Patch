'use strict';
const fs = require('fs');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/24844/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const themeCss = fs.readFileSync('src/AntigravityZhManager/Assets/theme-azure-bubble.css', 'utf8');

let checks = 0;
const check = (a, b, label) => { assert.deepEqual(a, b, label); checks++; };

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.ZH_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
    await page.route('**/*', r => r.abort());
    await page.setContent(`<!doctype html>
      <html>
      <head>
        <style>
          body { margin: 0; font-family: sans-serif; }
          .bg-card { background-color: rgb(255, 255, 255); color: rgb(15, 23, 42); }
          .bg-card-border { background-color: rgb(226, 232, 240); }
          .p-px { padding: 1px; }
          .p-1_5 { padding: 6px; }
          .rounded-xl { border-radius: 12px; }
          .rounded-inner { border-radius: 11px; }
          .max-w-full { max-width: 100%; }
          .wrap { width: 520px; display: flex; flex-direction: column; gap: 12px; }
        </style>
      </head>
      <body class="theme-light">
        <div class="wrap">
          <div id="user-frame" class="agy-user-bubble-frame p-px rounded-xl bg-card-border max-w-full" style="width: fit-content;">
            <div id="user-bubble" data-testid="user-message-bubble" class="agy-user-bubble p-1_5 rounded-inner bg-card">
              <div data-testid="user-message-content"><p id="user-text">所以建议不勾选是吧</p></div>
            </div>
          </div>

          <div id="proceed-frame" class="agy-user-bubble-frame p-px rounded-xl bg-card-border" style="width: fit-content;">
            <div id="proceed-bubble" class="agy-user-bubble p-1_5 rounded-inner bg-card">Proceeded with app.asar</div>
          </div>

          <div id="menu-popup" class="agy-overlay bg-card rounded-xl p-1_5">右键菜单卡片</div>
        </div>
      </body>
      </html>`);

    const measure = () => page.evaluate(() => {
      const pick = (sel) => {
        const el = document.querySelector(sel);
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return {
          bg: cs.backgroundColor,
          color: cs.color,
          w: Math.round(r.width * 10) / 10,
          h: Math.round(r.height * 10) / 10,
          radius: cs.borderRadius
        };
      };
      return {
        frame: pick('#user-frame'),
        bubble: pick('#user-bubble'),
        text: pick('#user-text'),
        proceedFrame: pick('#proceed-frame'),
        proceedBubble: pick('#proceed-bubble'),
        menu: pick('#menu-popup')
      };
    });

    const before = await measure();
    check(before.bubble.bg, 'rgb(255, 255, 255)', '初始浅色官方气泡为纯白');

    // 注入轻量天青蓝纯配色 CSS
    await page.evaluate((css) => {
      const s = document.createElement('style');
      s.id = 'ag-azure-bubble-style';
      s.textContent = css;
      document.head.appendChild(s);
    }, themeCss);

    const lightAfter = await measure();
    check(lightAfter.frame.bg, 'rgb(213, 232, 253)', '浅色下用户气泡外框切换为天青蓝边框 #D5E8FD');
    check(lightAfter.bubble.bg, 'rgb(234, 243, 254)', '浅色下用户气泡背景切换为柔和天青蓝 #EAF3FE');
    check(lightAfter.text.color, 'rgb(19, 38, 62)', '浅色下用户气泡文字为深蓝 #13263E');

    // 不动任何尺寸与圆角
    check([lightAfter.frame.w, lightAfter.frame.h, lightAfter.frame.radius],
          [before.frame.w, before.frame.h, before.frame.radius], '外框尺寸与圆角保持官方原样');
    check([lightAfter.bubble.w, lightAfter.bubble.h, lightAfter.bubble.radius],
          [before.bubble.w, before.bubble.h, before.bubble.radius], '气泡尺寸与圆角保持官方原样');

    // 不误伤同类名系统卡片及右键菜单
    check(lightAfter.proceedFrame.bg, before.proceedFrame.bg, 'Proceeded with 外框不受影响');
    check(lightAfter.proceedBubble.bg, before.proceedBubble.bg, 'Proceeded with 卡片背景不受影响');
    check(lightAfter.menu.bg, before.menu.bg, '其他 .bg-card 右键菜单不受影响');

    // 切换至深色主题（body.theme-dark）
    await page.evaluate(() => {
      document.body.classList.remove('theme-light');
      document.body.classList.add('theme-dark');
    });
    const darkAfter = await measure();
    check(darkAfter.bubble.bg, 'rgb(26, 46, 68)', '深色下用户气泡自动切换为深海蓝 #1A2E44');
    check(darkAfter.text.color, 'rgb(232, 241, 252)', '深色下用户气泡文字切换为浅蓝白 #E8F1FC');

    // 移除样式恢复官方默认
    await page.evaluate(() => {
      document.body.classList.remove('theme-dark');
      document.body.classList.add('theme-light');
      document.getElementById('ag-azure-bubble-style')?.remove();
    });
    const restored = await measure();
    check(restored.bubble.bg, 'rgb(255, 255, 255)', '关闭开关移除样式后恢复官方白色气泡');
    check(restored.frame.bg, before.frame.bg, '关闭开关移除样式后恢复官方边框');

    console.log(JSON.stringify({ passed: checks, lightBg: lightAfter.bubble.bg, darkBg: darkAfter.bubble.bg }));
  } finally {
    await browser.close();
  }
})();
