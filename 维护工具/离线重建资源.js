'use strict';
const fs=require('fs'),path=require('path'),os=require('os'),assert=require('assert/strict');
const targetAdapt = fs.existsSync(path.join(__dirname,'..','work','adapt-2-21-1')) ? 'adapt-2-21-1' : 'adapt-2-19-1';
const base=path.join(__dirname,'..','work',targetAdapt),native=require(path.join(base,'patch','native-patch.js'));
const original=fs.readFileSync(path.join(base,'app-original.asar'));assert.equal(native.hash(original),native.ORIGINAL);
const candidate=native.prepare(original);assert.equal(native.hash(candidate),native.AUTOLOAD);assert.ok(candidate.equals(fs.readFileSync(path.join(base,'app-fixed.asar'))));
const parse=b=>({header:JSON.parse(b.subarray(16,16+b.readUInt32LE(12))),base:8+b.readUInt32LE(4)});
function entries(header){const rows=[];function walk(files,prefix=''){for(const[name,e]of Object.entries(files)){if(e.files)walk(e.files,prefix+name+'/');else rows.push([prefix+name,e]);}}walk(header.files);return rows;}
const before=parse(original),after=parse(candidate),index=new Map(entries(after.header)),changed=[];let unchanged=0;
for(const[name,old]of entries(before.header)){if(old.unpacked||old.link)continue;const next=index.get(name);assert.ok(next);const previous=original.subarray(before.base+Number(old.offset),before.base+Number(old.offset)+old.size),current=candidate.subarray(after.base+Number(next.offset),after.base+Number(next.offset)+next.size);assert.equal(native.hash(current),next.integrity.hash);const blocks=[];for(let i=0;i<current.length;i+=next.integrity.blockSize)blocks.push(native.hash(current.subarray(i,i+next.integrity.blockSize)));assert.deepEqual(blocks,next.integrity.blocks);if(current.equals(previous))unchanged++;else changed.push(name);}
assert.equal(unchanged,751);assert.deepEqual(changed.sort(),['dist/ipcHandlers.js','dist/main.js','dist/tray.js','dist/utils.js']);
const out=fs.mkdtempSync(path.join(os.tmpdir(),'Antigravity-Handoff-Rebuild-'));fs.writeFileSync(path.join(out,'app-fixed.asar'),candidate);
const result={original:native.ORIGINAL,full:native.AUTOLOAD,unchangedPackedFiles:unchanged,changedModules:changed,productionUntouched:true,outputDirectory:out};fs.writeFileSync(path.join(out,'rebuild-result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
