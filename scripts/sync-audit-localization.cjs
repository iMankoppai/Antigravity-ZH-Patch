'use strict';
const fs=require('fs');
const additions=require('../localization/ui-audit-additions.json');
const catalogue=require('../src/AntigravityZhManager/Assets/skill-details.json');
const dictionaryPath='src/AntigravityZhManager/Assets/dictionaries.json';
const dictionary=JSON.parse(fs.readFileSync(dictionaryPath,'utf8'));
Object.assign(dictionary,additions.fixed);
const readmes=require('../localization/plugin-readme-review.json');
const map={};
for(const entry of readmes.filter(e=>e.guide)){
 const plan=catalogue.readmeBlocks.find(p=>p.source.startsWith(entry.guide+':'));
 if(!plan)throw Error('Missing reviewed guide '+entry.guide);
 const zh=plan.translated.join('').slice(entry.guide.length+1);
 map[entry.guide]=zh;
 dictionary[plan.source]=entry.guide+'：'+zh;
 dictionary[plan.source.slice(entry.guide.length+1).trim()]=zh;
}
const runtimePath='src/AntigravityZhManager/Assets/translate.js';
let runtime=fs.readFileSync(runtimePath,'utf8');
runtime=runtime.replace(/^  const mwgMap = .*;$/m,'  const mwgMap = '+JSON.stringify(map)+';');
// Remove contradictory legacy values where the same official description was
// duplicated in the skill-card map. Names and unknown/custom bodies stay intact.
runtime=runtime.replace(/^  const allOfficialSkillsMap = (.*);$/m,(all,json)=>{
 const values=JSON.parse(json);for(const key of Object.keys(values))if(dictionary[key])values[key]=dictionary[key];
 return '  const allOfficialSkillsMap = '+JSON.stringify(values)+';';
});
fs.writeFileSync(runtimePath,runtime);
fs.writeFileSync(dictionaryPath,JSON.stringify(dictionary,null,2)+'\n');
console.log(JSON.stringify({fixedUi:Object.keys(additions.fixed).length,templates:Object.keys(additions.templates).length,guides:Object.keys(map).length,dictionary:Object.keys(dictionary).length}));
