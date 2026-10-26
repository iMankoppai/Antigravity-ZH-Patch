'use strict';
// Capture complete prose runs, preserving nested lists and every code node.
// These functions run only at build/test time against checked-in snapshots.
function extractBuiltinUnits() {
 const units=[];
 const blockTags=new Set(['P','H1','H2','H3','H4','H5','H6','LI','TD','TH']);
 const nestedTags=new Set(['P','UL','OL','PRE','TABLE','BLOCKQUOTE','DIV','H1','H2','H3','H4','H5','H6']);
 function visit(element){
  if(element.matches('pre,code'))return;
  if(!blockTags.has(element.tagName)){for(const child of [...element.children])visit(child);return;}
  let run=[];
  function flush(){
   if(!run.length)return;
   const holder=document.createElement('div');for(const node of run)holder.append(node.cloneNode(true));
   const codes=[];for(const code of holder.querySelectorAll('code')){const token='{{CODE'+codes.length+'}}';codes.push(code.outerHTML);code.replaceWith(token);}
   const html=holder.innerHTML.trim();
   if(/[A-Za-z]{2}/.test(html.replace(/\{\{CODE\d+\}\}/g,'').replace(/<[^>]*>/g,''))){
    const id=units.length;units.push({id,tag:element.tagName,html,codes});
    run[0].before(document.createComment('ZHBUILTIN'+id));for(const node of run)node.remove();
   }
   run=[];
  }
  for(const node of [...element.childNodes]){
   if(node.nodeType===1&&nestedTags.has(node.tagName)){flush();visit(node);}else run.push(node);
  }
  flush();
 }
 visit(document.body);
 return{template:document.body.innerHTML,units};
}
const fingerprint=markdown=>{let n=2166136261;for(let i=0;i<markdown.length;i++)n=Math.imul(n^markdown.charCodeAt(i),16777619)>>>0;return n.toString(16);};
module.exports={extractBuiltinUnits,fingerprint};
