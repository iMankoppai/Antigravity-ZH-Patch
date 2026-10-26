'use strict';
// Apply the reviewed audit additions without rebuilding or installing the app.
const fs=require('fs');
const file='src/AntigravityZhManager/Assets/dictionaries.json';
const dictionary=JSON.parse(fs.readFileSync(file,'utf8'));
for(const key of Object.keys(dictionary))if(key.trim()!==key){
 if(!Object.hasOwn(dictionary,key.trim()))dictionary[key.trim()]=dictionary[key];
 delete dictionary[key];
}
Object.assign(dictionary,require('../localization/v68-ui-additions.json').dictionary);
const builtins=require('../tests/renderer/fixtures/builtin-skill-bodies.json');
const workflow=builtins.find(d=>d.skill==='run-workflow');
dictionary[workflow.description]='介绍如何使用 `run_workflow` 工具编写和运行动态工作流脚本：通过 Python 脚本及 `agent`、`parallel`、`pipeline`、`phase` 编排多个代理。当任务可以拆分为多个独立或分阶段的代理任务（例如按文件、模块、缺陷或审阅角度分发后汇总），或用户要求工作流时使用。单个委派任务应使用子代理；旧版工作流文件请参阅 migrate-workflows。';
const pdb='从蛋白质结构数据库（RCSB PDB）检索或下载生物大分子（蛋白质、核酸、复合物）经实验测定的三维结构。支持按 PDB ID 查询结构、按属性或文本检索、进行序列相似性搜索、按实验方法或分辨率筛选，并下载坐标文件（mmCIF、PDB）用于可视化、分析或建模。';
for(const key of Object.keys(dictionary))if(key.includes('biomolecules (proteins, nucleic acids, complexes) from the Protein Data Bank (RCSB PDB)'))dictionary[key]=pdb;
fs.writeFileSync(file,JSON.stringify(dictionary,null,2)+'\n');
const runtimeFile='src/AntigravityZhManager/Assets/translate.js';let runtime=fs.readFileSync(runtimeFile,'utf8');
runtime=runtime.replace(/^(  const allOfficialSkillsMap = )(\{.*\});$/m,(_,prefix,raw)=>{
 const map=JSON.parse(raw);for(const key of Object.keys(map))if(key.includes('biomolecules (proteins, nucleic acids, complexes) from the Protein Data Bank (RCSB PDB)'))map[key]=pdb;
 return prefix+JSON.stringify(map)+';';
});
fs.writeFileSync(runtimeFile,runtime);
const reviews={
 '5dfd62614c9c7ea976f53af53f523839395cc23f6aca9f9279ef60ce2a6505e9':'第三阶段：反方质疑与压力检验',
 '60bc726e31ca222cba0366adf7c5024d6773edb9b6eeafa386c412bdee392445':'第四轮：范围与结构'
};
for(const name of ['skill-detail-block-translations.json','skill-detail-review-overrides.json']){
 const p='localization/'+name,v=JSON.parse(fs.readFileSync(p,'utf8'));Object.assign(v,reviews);fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
}
console.log(JSON.stringify({terms:Object.keys(dictionary).length,builtinSkills:builtins.length}));
