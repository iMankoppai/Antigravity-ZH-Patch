'use strict';
const reviewed=require('../localization/plugin-readme-review.json');
// Run in the builder's isolated browser. Produce text-node plans, preserving
// the native rich-text tree (including React-owned links and code elements).
async function compileReadmeReview(page) {
 return page.evaluate(entries=>{
  const norm=s=>s.replace(/\s+/g,' ').trim();
  const texts=el=>{const w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),out=[];let n;while(n=w.nextNode())out.push(n);return out;};
  function apply(el,template,labels={}) {
   const elements=[...el.children];
   const parts=template.split(/\{\{(\d+)\}\}/);
   const order=parts.filter((_,i)=>i%2).map(Number);
   if(order.length!==elements.length||order.some((n,i)=>n!==i))throw Error('Rich text marker order: '+el.textContent);
   const groups=[[]];
   for(const child of el.childNodes){if(child.nodeType===Node.ELEMENT_NODE)groups.push([]);else if(child.nodeType===Node.TEXT_NODE)groups.at(-1).push(child);}
   for(let i=0;i<groups.length;i++){
    const value=parts[i*2];
    if(!groups[i].length&&value)throw Error('Missing source text slot: '+value);
    groups[i].forEach((n,j)=>n.nodeValue=j===0?value:'');
   }
   for(const e of elements){const key=norm(e.textContent);if(Object.hasOwn(labels,key)&&labels[key]!==key)apply(e,labels[key]);}
  }
  return entries.map(entry=>{
   const el=document.createElement('div');el.innerHTML=entry.sourceHtml;
   const original=texts(el).map(n=>norm(n.nodeValue));
   const source=norm(el.textContent);
   const code=[...el.querySelectorAll('code')].map(c=>c.textContent);
   const hrefs=[...el.querySelectorAll('a')].map(a=>a.getAttribute('href'));
   const template=entry.description?'{{0}}：'+entry.description.replace(/\{\{(\d+)\}\}/g,(_,n)=>'{{'+(+n+1)+'}}'):entry.template;
   apply(el,template,entry.description?{only:'仅'}:entry.labels);
   if(JSON.stringify(code)!==JSON.stringify([...el.querySelectorAll('code')].map(c=>c.textContent)))throw Error('Code altered: '+source);
   if(JSON.stringify(hrefs)!==JSON.stringify([...el.querySelectorAll('a')].map(a=>a.getAttribute('href')))||[...el.querySelectorAll('a')].some(a=>!a.textContent.trim()))throw Error('Link altered: '+source);
   const translated=texts(el).map(n=>n.nodeValue);
   if(translated.length!==original.length)throw Error('Text node count changed: '+source);
   return {plugin:entry.plugin,source,original,translated};
  });
 },reviewed);
}
module.exports={compileReadmeReview};
