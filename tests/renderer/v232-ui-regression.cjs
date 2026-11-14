'use strict';
const fs = require('fs');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/24844/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const cases = require('./fixtures/v232-ui-cases.json');
const dictionary = require('../../src/AntigravityZhManager/Assets/dictionaries.json');
const catalogue = require('../../src/AntigravityZhManager/Assets/skill-details.json');
const runtime = fs.readFileSync('src/AntigravityZhManager/Assets/translate.js', 'utf8');

let checks = 0;
const check = (a, b, label) => { assert.deepEqual(a, b, label); checks++; };

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.ZH_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  try {
    const page = await browser.newPage();
    await page.route('**/*', r => r.abort());
    await page.setContent(`<!doctype html><body><main id="ui"></main>
      <div data-testid="planner-response-text" id="authored"></div>
      <pre id="code">Connect to SSH Host</pre>
      <button data-testid="model-selector-trigger" id="model">Gemini 3.8 Pro Preview</button>
      <span id="prose">Stage Desktop Layout Resume Connected</span>
      <div data-testid="ssh-connect-dialog" id="ssh-dlg">
        <p id="ssh-empty-default"></p>
        <p id="ssh-empty-custom"></p>
      </div>
      <span id="pill-1">Agent A · typing · waiting for the pointer</span>
      <span id="pill-2">Agent B · scroll ↕</span>
      <span id="pill-3">Agent C · waiting for the pointer</span>
      <span id="paused-1">The agent is paused in Browser; its view keeps playing here. Resume to let it continue.</span>
      <span id="paused-2">Claude is paused in Terminal 1; its view keeps playing here. Resume to let it continue.</span>
      <span id="port-desc-1">Resume the conversation to start its workspace again, then start the server on port 8080 and retry.</span>
      <span id="port-desc-2">No server is listening on port 8080 inside the remote workspace. Start it, or ask the agent to, then retry.</span>
      <p id="cloud-1">Sign-ins to GitHub, Slack are kept in the cloud with your account. Other credentials stay on this machine. Credentials are only sent to the domains listed.</p>
      <p id="cloud-2">Sign-ins to Google are kept in the cloud with your account. Credentials are only sent to the domains listed.</p>
    </body>`);

    await page.evaluate(cases => {
      const ui = document.getElementById('ui');
      for (const [i, c] of cases.entries()) {
        const e = document.createElement('button');
        e.id = 'case-' + i;
        e.textContent = c.original;
        e.setAttribute('aria-label', c.original);
        ui.append(e);
      }
      document.getElementById('authored').textContent = cases.map(x => x.original).join('\n');
      const d1 = document.getElementById('ssh-empty-default');
      d1.append(document.createTextNode('No hosts in '), document.createTextNode('~/.ssh/config'), document.createTextNode(' yet. Type one above.'));
      const d2 = document.getElementById('ssh-empty-custom');
      d2.append(document.createTextNode('No hosts in '), document.createTextNode('corp_config'), document.createTextNode(' yet. Type one above.'));
    }, cases);

    const before = await page.locator('body').innerHTML();
    await page.evaluate(({ d, c }) => {
      window.__antigravityZhPatchDictionary = d;
      window.__antigravityZhSkillDetails = c;
    }, { d: dictionary, c: catalogue });
    await page.addScriptTag({ content: runtime });
    await page.waitForFunction(() => window.__antigravityZhPatchInstalled);
    await page.waitForTimeout(120);

    for (const [i, c] of cases.entries()) {
      check(await page.locator('#case-' + i).textContent(), c.expected, '文本 ' + c.original);
      check(await page.locator('#case-' + i).getAttribute('aria-label'), c.expected, '无障碍名称 ' + c.original);
    }

    check(await page.locator('#ssh-empty-default').textContent(), '在 ~/.ssh/config 中暂无主机。请在上方输入一个。', 'SSH 默认配置拆分句');
    check(await page.locator('#ssh-empty-custom').textContent(), '在 corp_config 中暂无主机。请在上方输入一个。', 'SSH 自定义配置拆分句');
    check(await page.locator('#pill-1').textContent(), 'Agent A · 输入中 · 正在等待接管指针', '预览光标胶囊（完整）');
    check(await page.locator('#pill-2').textContent(), 'Agent B · 滚动 ↕', '预览光标胶囊（仅意图）');
    check(await page.locator('#pill-3').textContent(), 'Agent C · 正在等待接管指针', '预览光标胶囊（仅等待）');
    check(await page.locator('#paused-1').textContent(), '智能体已在“Browser”中暂停；此处将继续显示其画面。点击恢复可让其继续。', '默认智能体暂停提示');
    check(await page.locator('#paused-2').textContent(), 'Claude已在“Terminal 1”中暂停；此处将继续显示其画面。点击恢复可让其继续。', '具名智能体暂停提示');
    check(await page.locator('#port-desc-1').textContent(), '恢复对话以重新启动其工作区，然后在端口 8080 上启动服务器并重试。', '远程端口未运行说明');
    check(await page.locator('#port-desc-2').textContent(), '远程工作区内端口 8080 上没有正在监听的服务。请启动服务或让智能体启动后再重试。', '远程端口未监听说明');
    check(await page.locator('#cloud-1').textContent(), 'GitHub, Slack 的登录状态会随你的账号保存在云端。其他凭据保留在本机。凭据仅会发送到所列域名。', '插件账号云端凭据拼接句（含本地其他）');
    check(await page.locator('#cloud-2').textContent(), 'Google 的登录状态会随你的账号保存在云端。凭据仅会发送到所列域名。', '插件账号云端凭据拼接句');

    // 保护区
    check(await page.locator('#authored').textContent(), cases.map(x => x.original).join('\n'), '全部新增文案在作者正文中受保护');
    check(await page.locator('#code').textContent(), 'Connect to SSH Host', '代码块受保护');
    check(await page.locator('#model').textContent(), 'Gemini 3.8 Pro Preview', '模型名称受保护');
    check(await page.locator('#prose').textContent(), 'Stage Desktop Layout Resume Connected', '普通正文中的单词不误翻');

    // 精确还原
    await page.evaluate(() => window.__antigravityZhPatchRestore());
    await page.evaluate(() => { document.querySelectorAll('script').forEach(e => e.remove()); });
    check(await page.locator('body').innerHTML(), before, '所有节点属性与拆分文本精确还原');
    console.log('v232 2.32.1 网页回归: ' + checks + ' PASS');
  } finally {
    await browser.close();
  }
})().catch(e => {
  console.error(e);
  process.exit(1);
});
