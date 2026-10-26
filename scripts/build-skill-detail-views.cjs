'use strict';
// Offline catalogue assembly. Translation units contain complete paragraphs or
// table cells, including their inline code/links. No translation service runs
// during build or application use.
const fs=require('node:fs'),crypto=require('node:crypto');
const input=JSON.parse(fs.readFileSync('localization/skill-detail-blocks.json','utf8'));
const translated=JSON.parse(fs.readFileSync('localization/skill-detail-block-translations.json','utf8'));
const deps=process.env.ZH_NODE_MODULES||'C:/Users/24844/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/';
const {chromium}=require(deps+'playwright');
const {marked}=require(deps+'marked');
const {normalizeSkillMarkdown}=require('./skill-markdown.cjs');
const fixtures=require('../tests/renderer/fixtures/official-skill-bodies.json');
const extras=require('../tests/renderer/fixtures/official-plugin-extras.json');
const builtinFixtures=require('../tests/renderer/fixtures/builtin-skill-bodies.json');
const {fingerprint}=require('./builtin-skill-documents.cjs');
const proseCode=require('../localization/skill-detail-prose-code.json');
const proseBlocks=require('../localization/skill-detail-prose-code-blocks.json');
const proofreadFile='localization/skill-detail-sdk-proofread.json';
const proofread=fs.existsSync(proofreadFile)?JSON.parse(fs.readFileSync(proofreadFile,'utf8')):null;
(async()=>{const browser=await chromium.launch({executablePath:process.env.ZH_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});try{
 const page=await browser.newPage();await page.route('**/*',r=>r.abort());const documents=[];
 async function finalizeHtml(html) {
  await page.setContent('<!doctype html><body>'+html);
  return page.evaluate(({proseCode,proseBlocks})=>{
   for(const code of document.querySelectorAll('code:not(pre code)'))if(Object.hasOwn(proseCode,code.textContent))code.textContent=proseCode[code.textContent];
   for(const code of document.querySelectorAll('pre code')){const original=code.textContent,key=original.trim();if(Object.hasOwn(proseBlocks,key))code.textContent=original.replace(key,()=>proseBlocks[key]);}
   for(const table of document.querySelectorAll('table')){const scroll=document.createElement('div');scroll.className='zh-table-scroll';table.before(scroll);scroll.appendChild(table);}
   const alerts={NOTE:'说明',TIP:'提示',IMPORTANT:'重要',WARNING:'警告',CAUTION:'注意',CRITICAL:'关键警告','说明':'说明','提示':'提示','重要':'重要','警告':'警告','注意':'注意'};
   const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let text;
   while(text=walker.nextNode())if(!text.parentElement.closest('pre,code'))text.nodeValue=text.nodeValue.replace(/\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION|CRITICAL|说明|提示|重要|警告|注意)\]/gi,(all,type)=>{text.parentElement.closest('blockquote')?.classList.add('zh-alert');return alerts[type.toUpperCase()]+'：';});
   if(document.querySelector('script,style,iframe,object,embed'))throw Error('Unexpected active HTML');
   for(const e of document.querySelectorAll('*'))for(const a of e.attributes)if(/^on/i.test(a.name)||/^(?:javascript|data):/i.test(a.value))throw Error('Unexpected active attribute');
   return document.body.innerHTML;
  },{proseCode,proseBlocks});
 }
 for(const doc of input.documents){
  let html=doc.template;
  for(const unit of doc.units){const value=translated[unit.key];if(typeof value!=='string'||!value.trim())throw Error('Missing paragraph translation: '+unit.key);html=html.replace('<!--ZHUNIT'+unit.id+'-->',()=>value);}
  if(/<!--ZHUNIT\d+-->|ZXQ(?:KEEP|TERM|ITEM)/i.test(html))throw Error('Unresolved unit');
  const fixture=fixtures.find(f=>f.plugin===doc.plugin&&f.skill===doc.skill);
  if(doc.skill==='google-antigravity-sdk'&&proofread){
   await page.setContent('<!doctype html><body>'+fixture.normalizedHtml);
   await page.evaluate(({overrides,translations})=>{const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){if(n.parentElement.closest('code,pre,script,style'))continue;const core=n.nodeValue.trim(),key=core.replace(/\s+/g,' ');const v=overrides[key]??translations[key];if(v!==undefined)n.nodeValue=n.nodeValue.replace(core,v);}},proofread);
   html=await page.evaluate(()=>document.body.innerHTML);
  }
  html=await finalizeHtml(html);
  const {template,units,overrides,...identity}=doc;
  const markdown=fixture.markdown.replace(/\r\n/g,'\n').trim();let fingerprint=2166136261;
  for(let i=0;i<markdown.length;i++)fingerprint=Math.imul(fingerprint^markdown.charCodeAt(i),16777619)>>>0;
  // The marketplace preview API limits skill bodies to 24,000 UTF-8 bytes.
  // Match the exact preview, including its omitted-byte count, so a changed
  // official/custom body cannot accidentally receive an older translation.
  const bytes=Buffer.from(markdown), preview=bytes.length>24000
   ? bytes.subarray(0,24000).toString('utf8')+'\n<truncated '+(bytes.length-24000)+' bytes>' : null;
  let previewFingerprint=2166136261;
  if(preview)for(let i=0;i<preview.length;i++)previewFingerprint=Math.imul(previewFingerprint^preview.charCodeAt(i),16777619)>>>0;
  documents.push({...identity,markdownLength:markdown.length,markdownFingerprint:fingerprint.toString(16),
   ...(preview?{previewLength:preview.length,previewFingerprint:previewFingerprint.toString(16)}:{}),paragraphs:units.length,renderedHtml:html});
 }
 const additionalDocuments=[];
 for(const extra of extras){
  const markdown=extra.markdown.replace(/\r\n/g,'\n').trim();let fingerprint=2166136261;
  for(let i=0;i<markdown.length;i++)fingerprint=Math.imul(fingerprint^markdown.charCodeAt(i),16777619)>>>0;
  const zh=fs.readFileSync('localization/plugin-documents/'+extra.translationFile,'utf8');
  const renderedHtml=await finalizeHtml(marked.parse(normalizeSkillMarkdown(zh).markdown));
  await page.setContent('<!doctype html>'+extra.normalizedHtml);
  const signature=await page.evaluate(()=>document.body.textContent.replace(/\s+/g,' ').trim().slice(0,220));
  additionalDocuments.push({plugin:extra.plugin,skill:extra.skill,kind:extra.kind,source:extra.source,sourceSha256:extra.sourceSha256,heading:markdown.match(/^# (.+)$/m)?.[1]||'',signature,markdownLength:markdown.length,markdownFingerprint:fingerprint.toString(16),overrides:extra.description?{[extra.description]:extra.descriptionTranslation}:{},renderedHtml});
 }
 const builtinDocuments=[];
 for(const source of builtinFixtures){
  const translation=JSON.parse(fs.readFileSync('localization/builtin-documents/'+source.skill+'.json','utf8'));
  if(translation.sourceSha256!==source.sourceSha256)throw Error('Builtin source changed; review translation: '+source.skill);
  const values=translation.units;
  if(values.length!==source.units.length)throw Error('Builtin paragraph count: '+source.skill);
  let html=source.template;
  for(const unit of source.units){
   const value=values[unit.id];
   if(typeof value!=='string'||!value.trim())throw Error('Missing builtin paragraph: '+source.skill+'/'+unit.id);
   const tokens=[...value.matchAll(/\{\{CODE(\d+)\}\}/g)].map(m=>Number(m[1])).sort((a,b)=>a-b);
   if(JSON.stringify(tokens)!==JSON.stringify(unit.codes.map((_,i)=>i)))throw Error('Builtin code placeholders: '+source.skill+'/'+unit.id);
   const translated=value.replace(/\{\{CODE(\d+)\}\}/g,(_,i)=>unit.codes[Number(i)]);
   html=html.replace('<!--ZHBUILTIN'+unit.id+'-->',()=>translated);
  }
  if(/ZHBUILTIN\d+|\{\{CODE\d+\}\}/.test(html))throw Error('Unresolved builtin paragraph');
  const markdown=source.markdown.replace(/\r\n/g,'\n').trim();
  // Require the full source fingerprint. A custom or changed built-in document
  // must never receive a stale translation just because its heading matches.
  builtinDocuments.push({plugin:'builtin',skill:source.skill,source:source.source,sourceSha256:source.sourceSha256,
   requireExact:true,markdownLength:markdown.length,markdownFingerprint:fingerprint(markdown),
   paragraphs:source.units.length,renderedHtml:await finalizeHtml(html)});
 }
 const translations={},identities=[];
 const readmeBlocks=await require('./compile-readme-review.cjs').compileReadmeReview(page);
 const uiTemplates=require('../localization/ui-audit-additions.json').templates;
 const revision=crypto.createHash('sha256').update(JSON.stringify({documents,additionalDocuments,builtinDocuments,translations,readmeBlocks,uiTemplates})).digest('hex');
 const catalogue={schema:2,revision,scope:'official-plugin-and-builtin-detail-view',documents,additionalDocuments,builtinDocuments,translations,identities,readmeBlocks,uiTemplates};
 fs.writeFileSync('src/AntigravityZhManager/Assets/skill-details.json',JSON.stringify(catalogue,null,2)+'\n');
 console.log(JSON.stringify({documents:documents.length,additionalDocuments:additionalDocuments.length,builtinDocuments:builtinDocuments.length,builtinParagraphs:builtinDocuments.reduce((n,d)=>n+d.paragraphs,0),proseExamples:Object.keys(proseCode).length+Object.keys(proseBlocks).length,paragraphs:Object.keys(input.units).length,repairedRows:documents.reduce((n,d)=>n+d.repairedContinuations,0),revision},null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
