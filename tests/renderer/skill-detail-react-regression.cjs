'use strict';
// Exercise native React 18 host Fibers, marketplace truncation and node reuse.
const fs=require('node:fs'),assert=require('node:assert/strict');
const fixture=require('./lib/chrome-fixture.cjs');
const cases=[...require('./fixtures/official-skill-bodies.json'),...require('./fixtures/official-plugin-extras.json').map(c=>({...c,html:c.normalizedHtml}))];
const catalogue=require('../../src/AntigravityZhManager/Assets/skill-details.json');
const allDocuments=[...catalogue.documents,...catalogue.additionalDocuments];
const runtime=fs.readFileSync('src/AntigravityZhManager/Assets/translate.js','utf8');
const dictionary=require('../../src/AntigravityZhManager/Assets/dictionaries.json');
const preview=raw=>{const bytes=Buffer.from(raw.trim());return bytes.length>24000?bytes.subarray(0,24000).toString('utf8')+'\n<truncated '+(bytes.length-24000)+' bytes>':raw.trim();};
let checks=0;
fixture('<!doctype html><div id="react-root"></div>',async(evaluate,pause)=>{
 for(const name of ['react','react-dom'])await evaluate(fs.readFileSync(__dirname+'/vendor/'+name+'.production.min.js','utf8'));
 await evaluate(`window.ReactRoot=ReactDOM.createRoot(document.getElementById('react-root'));window.renderSkill=(markdown,html,description='')=>{function Markdown(props){return React.createElement('div',{className:'leading-relaxed select-text',dangerouslySetInnerHTML:{__html:props.html}});}window.MarkdownFixture||=Markdown;ReactDOM.flushSync(()=>ReactRoot.render(React.createElement('div',{'data-testid':'doc-row-modal'},React.createElement('p',{className:'fixture-description'},description),React.createElement(window.MarkdownFixture,{markdown,html}))));};`);
 await evaluate('window.__antigravityZhPatchDictionary='+JSON.stringify(dictionary)+';window.__antigravityZhSkillDetails='+JSON.stringify(catalogue));
 await evaluate(runtime);
 for(let i=0;i<cases.length;i++){
  const c=cases[i];
  await evaluate(`renderSkill(${JSON.stringify(preview(c.markdown))},${JSON.stringify(c.html)},${JSON.stringify(c.description||'')})`);
  const key=c.plugin+'/'+c.skill;
  const current=allDocuments.find(x=>x.plugin===c.plugin&&x.skill===c.skill),expected=allDocuments.find(d=>d.markdownLength===current.markdownLength&&d.markdownFingerprint===current.markdownFingerprint);
  for(let wait=0;wait<100&&!await evaluate(`document.querySelector('[data-antigravity-zh-detail-view]')?.getAttribute('data-antigravity-zh-detail-view')===${JSON.stringify(expected.plugin+'/'+expected.skill)}`);wait++)await pause(10);
  assert.equal(await evaluate(`document.querySelector('[data-antigravity-zh-detail-view]')?.getAttribute('data-antigravity-zh-detail-view')`),expected.plugin+'/'+expected.skill,key+' 原生 React 详情预览');checks++;
  assert.ok(await evaluate(`getComputedStyle(document.querySelector('.leading-relaxed.select-text:not([data-antigravity-zh-detail-view])')).display==='none'`),key+' 隐藏英文原文');checks++;
  if(c.kind){
   if(c.description){assert.equal(await evaluate(`document.querySelector('.fixture-description').textContent`),c.descriptionTranslation,'规则／智能体的简介也应汉化');checks++;}
   const structure=await evaluate(`(()=>{const source=document.querySelector('.leading-relaxed.select-text:not([data-antigravity-zh-detail-view])'),view=document.querySelector('[data-antigravity-zh-detail-view]');return [source,view].map(root=>({code:[...root.querySelectorAll('code')].map(e=>e.textContent).sort(),links:[...root.querySelectorAll('a')].map(e=>e.getAttribute('href')).sort(),lists:root.querySelectorAll('li').length}));})()`);
   assert.deepEqual(structure[1],structure[0],key+' 保留代码、链接和列表');checks++;
  }
 }
 const rule=cases.find(c=>c.plugin==='flutter'&&c.skill==='rules/flutter-hot-reload.md');
 const frontmatter='---\ndescription: '+rule.description+'\ntrigger: glob\n---\n';
 await evaluate(`renderSkill(${JSON.stringify(frontmatter+rule.markdown)},${JSON.stringify(rule.html)},${JSON.stringify(rule.description)})`);await pause(100);
 assert.equal(await evaluate(`document.querySelector('[data-antigravity-zh-detail-view]')?.getAttribute('data-antigravity-zh-detail-view')`),'flutter/rules/flutter-hot-reload.md','规则包含原始 frontmatter 时仍正确匹配');checks++;
 await evaluate(`renderSkill(${JSON.stringify(frontmatter+rule.markdown+'\nCustom rule change')},${JSON.stringify(rule.html+'<!-- changed rule -->')},${JSON.stringify(rule.description)})`);await pause(100);
 assert.equal(await evaluate(`document.querySelectorAll('[data-antigravity-zh-detail-view]').length`),0,'用户修改后的规则不覆盖为旧译文');checks++;
 const modern=cases.find(c=>c.skill==='modern-web-guidance');
 await evaluate(`renderSkill(${JSON.stringify(preview(modern.markdown))},${JSON.stringify(modern.html)})`);await pause(100);
 assert.ok(await evaluate(`(()=>{const view=document.querySelector('[data-antigravity-zh-detail-view]');return [...view.querySelectorAll('code')].some(e=>e.textContent.includes('**浏览器支持：**')&&e.textContent.includes('不超过 20 行'));})()`),'策略示例虽然是代码样式，也必须显示中文');checks++;
 assert.ok(await evaluate(`document.querySelector('[data-antigravity-zh-detail-view]').textContent.includes('npx -y modern-web-guidance@latest search')`),'可执行命令仍保持原样');checks++;
 const video=cases.find(c=>c.skill==='gemini-omni-flash-api');
 await evaluate(`renderSkill(${JSON.stringify(preview(video.markdown))},${JSON.stringify(video.html)})`);await pause(100);
 assert.equal(await evaluate(`document.querySelector('[data-antigravity-zh-detail-view] h1').textContent`),'Gemini Omni Flash 技能','保留模型名称');checks++;
 assert.ok(await evaluate(`document.querySelector('[data-antigravity-zh-detail-view] blockquote').classList.contains('zh-alert')`),'警告按提示框展示');checks++;
 assert.ok(await evaluate(`!document.querySelector('[data-antigravity-zh-detail-view] blockquote').textContent.includes('[!')`),'提示框不残留 Markdown 标记');checks++;
 for(const markdown of [preview(video.markdown),preview(video.markdown).replace('Core capabilities','Custom capabilities'),preview(video.markdown),preview(video.markdown).replace(/truncated \d+ bytes/,'truncated 1 bytes')]){
  await evaluate(`renderSkill(${JSON.stringify(markdown)},${JSON.stringify(video.html)}+'<!--'+Math.random()+'-->')`);await pause(100);
  assert.equal(await evaluate(`Boolean(document.querySelector('[data-antigravity-zh-detail-view]'))`),markdown===preview(video.markdown),'复用节点只接受精确匹配的当前正文');checks++;
 }
 await evaluate('window.__antigravityZhPatchRestore()');
 assert.equal(await evaluate(`document.querySelectorAll('[data-antigravity-zh-detail-view]').length`),0);checks++;
 const result={checks,skills:cases.length,truncated:cases.filter(c=>preview(c.markdown)!==c.markdown.trim()).length,passed:true};
 fs.mkdirSync('work/detail-react-regression',{recursive:true});fs.writeFileSync('work/detail-react-regression/result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}).catch(e=>{console.error(e);process.exitCode=1;});
