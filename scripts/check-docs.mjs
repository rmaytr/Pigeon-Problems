import {readdir,readFile,stat} from 'node:fs/promises';
import path from 'node:path';

const root=process.cwd(),skip=new Set(['.git','node_modules','dist','.wrangler','test-results']);
async function files(dir){const all=[];for(const entry of await readdir(dir,{withFileTypes:true})){if(skip.has(entry.name))continue;const p=path.join(dir,entry.name);if(entry.isDirectory())all.push(...await files(p));else if(p.endsWith('.md'))all.push(p);}return all;}
const docs=await files(root),errors=[];let links=0,images=0,diagrams=0;
function headings(text){const seen=new Map();return [...text.matchAll(/^#{1,6}\s+(.+)$/gm)].map(m=>{const slug=m[1].toLowerCase().replace(/<[^>]+>/g,'').replace(/[^\p{L}\p{N}_\s-]/gu,'').replace(/ /g,'-');const n=seen.get(slug)||0;seen.set(slug,n+1);return slug+(n?'-'+n:'');});}
for(const file of docs){
  const raw=(await readFile(file,'utf8')).replace(/\r\n/g,'\n'),rel=path.relative(root,file);
  if(/[A-Z]:[\\/](?:Users|Program Files)|file:\/\//i.test(raw))errors.push(`${rel}: machine-specific path`);
  const text=raw.replace(/```[\s\S]*?```/g,'');
  for(const match of text.matchAll(/(!?)\[[^\]]*\]\(([^)]+)\)/g)){
    let target=match[2].trim().replace(/^<|>$/g,'');
    if(/^(?:https?:|mailto:|data:)/.test(target))continue;
    const [name,anchor]=target.split('#'),resolved=path.resolve(path.dirname(file),decodeURIComponent(name||path.basename(file)));
    if(!resolved.startsWith(root+path.sep)&&resolved!==root){errors.push(`${rel}: link escapes repository`);continue;}
    try{
      const info=await stat(resolved);links++;
      if(anchor&&resolved.endsWith('.md')&&!headings(await readFile(resolved,'utf8')).includes(anchor))errors.push(`${rel}: missing anchor ${target}`);
      if(match[1]){images++;if(!info.isFile())errors.push(`${rel}: image is not a file ${target}`);const bytes=await readFile(resolved);if(resolved.endsWith('.png')&&bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')errors.push(`${rel}: invalid PNG ${target}`);}
    }catch{errors.push(`${rel}: missing file ${target}`);}
  }
  diagrams += [...raw.matchAll(/```mermaid\n/g)].length;
}
if(errors.length)throw Error(errors.join('\n'));
console.log(`PASS ${docs.length} Markdown documents, ${links} local links, ${images} images. ${diagrams} Mermaid diagram(s) present; render syntax separately during presentation review.`);
