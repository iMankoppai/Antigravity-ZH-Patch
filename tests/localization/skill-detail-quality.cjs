'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const catalogue=JSON.parse(fs.readFileSync('src/AntigravityZhManager/Assets/skill-details.json','utf8'));
const fixtures=require('../renderer/fixtures/official-skill-bodies.json');
const {normalizeSkillMarkdown}=require('../../scripts/skill-markdown.cjs');
const blocks=require('../../localization/skill-detail-blocks.json');
const blockTranslations=require('../../localization/skill-detail-block-translations.json');
const reviewed=require('../../localization/skill-detail-review-overrides.json');
const preserved=new Set(require('../../localization/skill-detail-preserved-blocks.json').map(d=>d.key));
const identities=new Set(catalogue.identities);const names=new Set();let checked=0;
assert.equal(catalogue.documents.length,140);assert.equal(new Set(catalogue.documents.map(d=>d.plugin)).size,17);
assert.equal(catalogue.schema,2,'必须使用完整段落视图目录');
const fingerprints=new Map();
for(const d of catalogue.documents){const raw=fixtures.find(f=>f.plugin===d.plugin&&f.skill===d.skill).markdown.replace(/\r\n/g,'\n').trim(),key=d.markdownLength+':'+d.markdownFingerprint;if(fingerprints.has(key))assert.equal(raw,fingerprints.get(key),'相同标识只能对应同一份正文');fingerprints.set(key,raw);}
assert.equal(catalogue.documents.reduce((n,d)=>n+d.repairedContinuations,0),250,'全部非标准续行都已整理');
for(const d of catalogue.documents){assert.ok(d.paragraphs>0&&d.renderedHtml.includes('<'),'缺少完整正文');assert.ok(/[\u4e00-\u9fff]/.test(d.renderedHtml),'缺少中文译文');assert.ok(!/ZXQ(?:KEEP|ITEM|TERM)|<!--ZHUNIT/i.test(d.renderedHtml),'残留构建标记');}
for(const f of fixtures){const normalized=normalizeSkillMarkdown(f.markdown);assert.equal(normalized.repaired,f.repairedContinuations,'表格整理数量与正文样本一致');assert.equal(crypto.createHash('sha256').update(normalized.markdown).digest('hex'),f.normalizedMarkdownSha256,'完整 Markdown 整理结果与样本一致');}
for(const f of fixtures){const raw=f.markdown.replace(/\r\n/g,'\n').trim();let fingerprint=2166136261;for(let i=0;i<raw.length;i++)fingerprint=Math.imul(fingerprint^raw.charCodeAt(i),16777619)>>>0;const doc=catalogue.documents.find(d=>d.plugin===f.plugin&&d.skill===f.skill);assert.equal(doc.markdownLength,raw.length);assert.equal(doc.markdownFingerprint,fingerprint.toString(16));}
assert.equal(Object.keys(blocks.units).length,8966,'完整段落和单元格目录数量');
for(const [key,u]of Object.entries(blocks.units)){
 const value=blockTranslations[key];assert.ok(value?.trim(),'缺少整段译文');
 if(reviewed[key])assert.equal(value,reviewed[key],'人工校订不得被旧缓存覆盖');
 const prose=value.replace(/<(?:code|kbd)\b[^>]*>[\s\S]*?<\/(?:code|kbd)>/g,'').replace(/<a\b[^>]*>[\s\S]*?<\/a>/g,'').replace(/<[^>]*>/g,'');
 if(/[A-Za-z]{2}/.test(prose)&&!/[\u4e00-\u9fff]/.test(prose))assert.ok(preserved.has(key),'未登记的原文保留项：'+u.text);
 assert.ok(!/\b[A-Za-z][a-z]+(?:\s+[A-Za-z][a-z]+){4,}/.test(prose),'待复核的长英文正文：'+u.text);
 assert.ok(!/奥普|重点领域|口音分隔|静音文本|甲板|硬停止/.test(prose),'已知误译回归：'+u.text);
 if(u.domain!=='science')assert.ok(!/细胞/.test(prose),'技术单元格不得译成细胞：'+u.text);
}
for(const d of catalogue.documents){const name=d.plugin+'/'+d.skill;assert.ok(!names.has(name),'重复文档');names.add(name);assert.ok(d.heading&&d.signature,'缺少精确文档匹配字段');const f=fixtures.find(f=>f.skill===d.skill&&f.plugin===d.plugin);assert.equal(d.sourceSha256,f?.sha256,'原件哈希与测试样本不符');}
for(const [key,value]of Object.entries(catalogue.translations)){
 assert.equal(key,key.replace(/\s+/g,' ').trim(),'目录键必须规范化');assert.ok(typeof value==='string'&&value.trim(),'不得包含空译文');assert.ok(!/ZXQ(?:ITEM|TERM)/i.test(value),'不得残留翻译占位标记');
 if(!/[\u4e00-\u9fff]/.test(value))assert.ok(identities.has(key),'未登记的原文保留项：'+key);checked++;
}
assert.equal(catalogue.additionalDocuments.length,6,'规则和智能体详情全部纳入目录');
for(const doc of catalogue.additionalDocuments){assert.ok(/[\u4e00-\u9fff]/.test(doc.renderedHtml));for(const value of Object.values(doc.overrides))assert.ok(/[\u4e00-\u9fff]/.test(value),'详情简介应有中文');}
assert.equal(catalogue.builtinDocuments.length,9,'本机内置技能必须完整纳入');
const revision=crypto.createHash('sha256').update(JSON.stringify({documents:catalogue.documents,additionalDocuments:catalogue.additionalDocuments,builtinDocuments:catalogue.builtinDocuments,translations:catalogue.translations,readmeBlocks:catalogue.readmeBlocks,uiTemplates:catalogue.uiTemplates})).digest('hex');assert.equal(catalogue.revision,revision,'目录签名必须覆盖所有正文和匹配信息');
console.log(JSON.stringify({documents:140,plugins:17,paragraphBlocks:Object.keys(blocks.units).length,reviewedBlocks:Object.keys(reviewed).length,preservedBlocks:preserved.size,failures:0}));
