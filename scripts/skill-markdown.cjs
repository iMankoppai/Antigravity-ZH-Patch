'use strict';
// Correct the colon-delimited continuation syntax used by some upstream
// skill tables before GFM parsing. This only changes the display copy.
function splitPipe(line) {
 const out=[];let value='';
 for(let i=0;i<line.length;i++) {
  const c=line[i];
  if(c==='\\'&&i+1<line.length){value+=c+line[++i];continue;}
  if(c==='|'){out.push(value.trim());value='';}else value+=c;
 }
 out.push(value.trim());if(!out[0])out.shift();if(!out.at(-1))out.pop();return out;
}
function normalizeSkillMarkdown(markdown) {
 // CLI help headings followed immediately by indented Usage text are not
 // indented code in CommonMark. Fence the copied output to keep <arguments>,
 // switches and whitespace literal.
 markdown=markdown.replace(/^([a-z][a-z-]*)\n( {8,}Usage:[\s\S]*?)(?=\n[a-z][a-z-]*\n {8,}Usage:|\n#{1,6} |$(?![\s\S]))/gm,
  (_,heading,help)=>'### `'+heading+'`\n\n```text\n'+help.replace(/^ {10}/gm,'').trimEnd()+'\n```\n');
 const lines=markdown.replace(/\r\n/g,'\n').split('\n'),out=[];let fence=null,table=null,repaired=0;
 const row=cells=>'| '+cells.map(s=>s.replace(/(?<!\\)\|/g,'\\|')).join(' | ')+' |';
 for(let i=0;i<lines.length;i++) {
  const line=lines[i],fm=line.match(/^\s{0,3}(`{3,}|~{3,})/);
  if(fm){if(!fence)fence=fm[1][0];else if(fm[1][0]===fence)fence=null;table=null;out.push(line);continue;}
  if(fence){out.push(line);continue;}
  if(/^\s*\|/.test(line)&&i+1<lines.length&&/^\s*\|?[\s:|\-]+\|\s*$/.test(lines[i+1])&&/-{3}/.test(lines[i+1])) {
   table={columns:splitPipe(line).length,last:-1};out.push(line,lines[++i]);continue;
  }
  if(table&&/^\s*\|/.test(line)) {table.last=out.length;table.cells=splitPipe(line);out.push(line);continue;}
  if(table&&table.last>=0&&/^\s*:\s/.test(line)&&/:\s*$/.test(line)) {
   const cells=line.trim().slice(1,-1).split(/\s+:(?=\s)/).map(s=>s.trim());
   if(cells.length!==table.columns)throw Error('Ambiguous table continuation: '+line);
   const previous=table.cells;
   if(previous.length!==table.columns)throw Error('Malformed table row: '+out[table.last]);
   table.cells=previous.map((s,j)=>(s+' '+(/\|$/.test(s)&&/^\|/.test(cells[j])?cells[j].slice(1):cells[j])).trim());
   out[table.last]=row(table.cells);repaired++;continue;
  }
  table=null;out.push(line);
 }
 const htmlTags=new Set('a abbr b blockquote br code dd del details div dl dt em h1 h2 h3 h4 h5 h6 hr i img input kbd li ol p pre s section small span strong sub summary sup table tbody td th thead tr u ul wbr'.split(' '));
 let inCode=null;
 const escaped=out.map(line=>{
  const match=line.match(/^\s{0,3}(`{3,}|~{3,})/);if(match){if(!inCode)inCode=match[1][0];else if(match[1][0]===inCode)inCode=null;return line;}if(inCode)return line;
  if(/^\s*`.*`\s*$/.test(line)&&line.includes('\\`'))line=line.replace(/^(\s*)`([\s\S]*)`\s*$/,(_,space,content)=>space+'``'+content.replace(/\\`/g,'`')+'``');
  line=line.replace(/(`+)[\s\S]*?\1|https?:\/\/[^\s`]+/g,(whole,ticks)=>!ticks&&/<[A-Za-z_][\w-]*>/.test(whole)?'`'+whole+'`':whole);
  return line.replace(/(`+)[\s\S]*?\1|<\/?([A-Za-z][\w-]*)(?:\s+[^<>]*)?>/g,(whole,ticks,tag)=>ticks||htmlTags.has(tag.toLowerCase())?whole:whole.replace(/</g,'&lt;').replace(/>/g,'&gt;'));
 });
 return {markdown:escaped.join('\n'),repaired};
}
module.exports={normalizeSkillMarkdown,splitPipe};
