'use strict';
const fs=require('fs'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/24844/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const cases=require('./fixtures/v227-ui-cases.json');
const dictionary=require('../../src/AntigravityZhManager/Assets/dictionaries.json');
const catalogue=require('../../src/AntigravityZhManager/Assets/skill-details.json');
const runtime=fs.readFileSync('src/AntigravityZhManager/Assets/translate.js','utf8');
let checks=0;const check=(a,b,label)=>{assert.deepEqual(a,b,label);checks++;};
(async()=>{const browser=await chromium.launch({executablePath:process.env.ZH_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});try{
 const page=await browser.newPage();await page.route('**/*',r=>r.abort());
 await page.setContent(`<!doctype html><body><main id="ui"></main>
  <div data-testid="planner-response-text" id="authored"></div>
  <pre id="code">Worker execution error</pre>
  <button data-testid="model-selector-trigger" id="model">Gemini 3.8 Flash High</button>
  <span id="tone-prose">Firm Bright Upbeat Breezy Excitable Youthful Informative Typing Hovering Pressing key Opening page</span>
  <div data-testid="voice-dock" id="dock" role="region" aria-label="Live chat in progress">
    <button id="dock-back" aria-label="Back to chat">Back to chat</button>
    <button id="dock-back-named" aria-label="Back to my-chat">Back to my-chat</button>
    <button id="dock-mute" aria-label="Mute mic">Mute mic</button>
    <textarea id="dock-input" placeholder="Message this chat" aria-label="Message this chat"></textarea>
    <span id="dock-timer" role="timer" aria-label="Live chat, 0:37">0:37</span>
  </div>
  <nav id="row"><a data-testid="conversation-row-sidebar" href="/c/a"><span class="text-xs text-foreground opacity-60 min-w-4" id="row-time">17h</span></a></nav>
  <p id="acct-a"></p>
  <p id="acct-b"></p>
  <p id="acct-c"></p>
  <div id="voice-picker"></div>
  <p id="debug-p"></p>
  <p id="used-for"></p>
  <a id="named-time-echo" href="/c/x">17h</a>`);
 // 用 DOM API 复刻 React 渲染的节点切分（链接/选择器把整句切成多个文本节点 + 独立空白节点）
 await page.evaluate(()=>{
  const $=id=>document.getElementById(id);
  const T=(s)=>document.createTextNode(s), E=(tag,id,text)=>{const e=document.createElement(tag);e.id=id;e.textContent=text;return e;};
  $('acct-a').append(T('Signed in as '),E('span','acct-a-label','alice@example.com'),T('. To use another account, add it in the'),T(' '),E('button','acct-a-tab','Accounts tab'),T(' and make it the default.'));
  const sel=E('button','acct-b-select','');const selSpan=E('span','acct-b-label','bob@example.com');sel.append(selSpan);
  $('acct-b').append(T('Signed in as'),T(' '),sel,T('. To add another account, go to the '),E('button','acct-b-tab','Accounts tab'),T('.'));
  $('acct-c').append(T('To switch accounts, sign out in the '),E('a','acct-c-link','Settings'),T(' and sign in again.'));
  $('voice-picker').append(T('You can change this in'),T(' '),E('button','voice-picker-settings-link','Settings'),T(' '),T('later.'));
  $('debug-p').append(T('Not shared automatically—share with'),T(' '),E('a','debug-mail','jetski-debug-bundles@google.com'),T(' for debugging.'));
  $('used-for').append(T('Used for: '),E('span','used-for-value','Project scope'));
 });
 await page.evaluate(cases=>{
  const ui=document.getElementById('ui');
  for(const [i,c]of cases.entries()){const e=document.createElement('button');e.id='case-'+i;e.textContent=c.original;e.setAttribute('aria-label',c.original);ui.append(e);}
  document.getElementById('authored').textContent=cases.map(x=>x.original).join('\n');
 },cases);
 const before=await page.locator('body').innerHTML();
 await page.evaluate(({d,c})=>{window.__antigravityZhPatchDictionary=d;window.__antigravityZhSkillDetails=c;},{d:dictionary,c:catalogue});await page.addScriptTag({content:runtime});await page.waitForFunction(()=>window.__antigravityZhPatchInstalled);await page.waitForTimeout(120);
 for(const [i,c]of cases.entries()){check(await page.locator('#case-'+i).textContent(),c.expected,'文本 '+c.original);check(await page.locator('#case-'+i).getAttribute('aria-label'),c.expected,'无障碍名称 '+c.original);}
 check(await page.locator('#authored').textContent(),cases.map(x=>x.original).join('\n'),'全部新增文案在作者正文中受保护');
 check(await page.locator('#code').textContent(),'Worker execution error','代码受保护');
 check(await page.locator('#model').textContent(),'Gemini 3.8 Flash High','模型原名受保护');
 check(await page.locator('#tone-prose').textContent(),'Firm Bright Upbeat Breezy Excitable Youthful Informative Typing Hovering Pressing key Opening page','普通正文中的单词与状态词不改');
 check(await page.locator('#dock-back').getAttribute('aria-label'),'返回对话','坞内 Back to chat 兜底词');
 check(await page.locator('#dock-back-named').getAttribute('aria-label'),'返回 my-chat','坞内 Back to 目标保留');
 check(await page.locator('#dock-mute').getAttribute('aria-label'),'将麦克风静音','坞内静音按钮');
 check(await page.locator('#dock-input').getAttribute('placeholder'),'在此对话中输入消息','坞内输入框占位');
 check(await page.locator('#dock-timer').getAttribute('aria-label'),'实时通话，0:37','坞内计时 aria');
 check(await page.locator('#dock').getAttribute('aria-label'),'实时通话进行中','坞容器 aria');
 check(await page.locator('#row-time').textContent(),'17 小时前','既有会话行相对时间不回归');
 check(await page.locator('#acct-a-label').textContent(),'alice@example.com','账号邮箱不改');
 check(await page.locator('#acct-a').textContent(),'当前登录账号：alice@example.com。要使用其他账号，请在账号标签页中添加并设为默认。','单账号提示整句重组');
 check(await page.locator('#acct-b-label').textContent(),'bob@example.com','选择器内账号不改');
 check(await page.locator('#acct-b').textContent(),'当前登录账号：bob@example.com。要添加其他账号，请前往账号标签页。','多账号提示整句重组');
 check(await page.locator('#acct-c').textContent(),'要切换账号，请在设置中退出登录后重新登录。','MCP 行切换账号提示重组');
 check(await page.locator('#voice-picker').textContent(),'稍后可在设置中更改。','语音选择器设置链接重组');
 check(await page.locator('#debug-mail').textContent(),'jetski-debug-bundles@google.com','调试邮箱不改');
 check(await page.locator('#debug-p').textContent(),'不会自动共享——可发送给jetski-debug-bundles@google.com以便调试。','调试包说明重组');
 check(await page.locator('#used-for').textContent(),'用于： Project scope','Used for 前缀翻译且值保留');
 check(await page.locator('#named-time-echo').textContent(),'17h','普通链接里的时间形状不改');
 // 恢复
 await page.evaluate(()=>window.__antigravityZhPatchRestore());
 await page.evaluate(()=>{document.querySelectorAll('script').forEach(e=>e.remove());});
 check(await page.locator('body').innerHTML(),before,'所有节点属性与文本精确还原');
 console.log('v227 2.27.0 网页回归: '+checks+' PASS');
}catch(final){throw final}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
