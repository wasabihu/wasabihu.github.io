import {readFile,writeFile,mkdir,readdir,copyFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
const output=resolve(process.env.BUILD_OUTPUT||'cloudflare-dist');
await mkdir(output,{recursive:true});
if((await readdir(output)).length)throw new Error('Choose an empty build output directory.');
// Only runtime assets belong in the public release, never old exports or backups.
const assets=['index.js','tabConfig.js','textUtils.js','style.css','notyf-custom.css','favicon.png'];
for(const file of assets)await copyFile(join('docs',file),join(output,file));
const source=(await readFile('docs/data.js','utf8')).replace(/^\uFEFF/,'');
const declarations=source.match(/^\s*(?:var|let|const)\s+initialCategories\s*=\s*(\[[\s\S]*\])\s*;\s*(?:var|let|const)\s+initialLinks\s*=\s*(\{[\s\S]*\})\s*;?\s*$/);
if(!declarations)throw new Error('Expected two JSON data declarations; refusing to execute data.js.');
const categories=JSON.parse(declarations[1]);
const links=JSON.parse(declarations[2]);
const privateNoteIds=new Set(['10','109158','108699','108984','109152']);
let redacted=0;
for(const group of Object.values(links))for(const link of group){
 const note=String(link.title||'');
 if(privateNoteIds.has(String(link.id))||/密码|密碼|口令|password|secret|token|账号|帳號/i.test(note)||(/\d{6,}/.test(note))||(note.includes('/')&&!note.includes('://'))){
  if(note)redacted++;
  link.title='';
 }
}
await writeFile(join(output,'data.js'),`var initialCategories = ${JSON.stringify(categories,null,2)};\n\nvar initialLinks = ${JSON.stringify(links,null,2)};\n`);
let html=await readFile('docs/index.html','utf8');
html=html.replace('href="https://wasabihu.github.io/"','href="/"').replace('</head>','<link rel="canonical" href="https://nav.tidyuse.com/">\n</head>');
await writeFile(join(output,'index.html'),html);
const manager=(await readFile('docs/dataManager.js','utf8')).replace("'https://wasabihu.github.io/data.js'","'./data.js'");
await writeFile(join(output,'dataManager.js'),manager);
await writeFile(join(output,'_headers'),'https://:project.pages.dev/*\n  X-Robots-Tag: noindex, nofollow\n\nhttps://:version.:project.pages.dev/*\n  X-Robots-Tag: noindex, nofollow\n');
await writeFile(join(output,'404.html'),'<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="robots" content="noindex"><title>页面不存在</title><h1>页面不存在</h1><a href="/">返回收藏夹</a></html>');
console.log(`Built ${categories.length} categories and ${Object.values(links).flat().length} links; removed ${redacted} private notes. Output: ${output}`);
