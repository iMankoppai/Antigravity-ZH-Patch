'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.join(__dirname,'..','work','adapt-2-19-1','patch'),file=path.join(root,'manifest.json');
const manifest=JSON.parse(fs.readFileSync(file,'utf8')),dictionary=new Map();
for(const name of fs.readdirSync(path.join(root,'dictionaries')).filter(n=>n.endsWith('.json')).sort()){
 const object=JSON.parse(fs.readFileSync(path.join(root,'dictionaries',name),'utf8'));if(!object||typeof object!=='object'||Array.isArray(object))throw Error('词典不是对象：'+name);
 for(const[key,value]of Object.entries(object)){if(!key.trim()||typeof value!=='string'||!value.trim())throw Error('无效词条：'+name+' '+key);if(dictionary.has(key)&&dictionary.get(key)!==value)throw Error('冲突词条：'+key);dictionary.set(key,value);}
}
for(const item of manifest.files){const full=path.resolve(root,item.path);if(!full.toLowerCase().startsWith(path.resolve(root).toLowerCase()+path.sep))throw Error('目录外路径');if(/(^|[\\/])(config\.json|backups|.*\.log)$/i.test(item.path))throw Error('本机文件不能列为发布载荷');const data=fs.readFileSync(full);item.bytes=data.length;item.sha256=crypto.createHash('sha256').update(data).digest('hex');}
manifest.terms=dictionary.size;fs.writeFileSync(file,JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify({snapshotOnly:true,terms:manifest.terms,files:manifest.files.length,manifest:file},null,2));
