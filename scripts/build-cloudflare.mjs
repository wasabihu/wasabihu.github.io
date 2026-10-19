import {mkdir,readdir,copyFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
const output=resolve(process.env.BUILD_OUTPUT || 'cloudflare-dist');
await mkdir(output,{recursive:true});
if((await readdir(output)).length)throw new Error('构建目录非空，请使用新的输出目录。');
for(const file of ['index.html','cloud.css','app.mjs','store.mjs'])await copyFile(join('cloud/client',file),join(output,file));
await copyFile('docs/favicon.png',join(output,'favicon.png'));
await writeFile(join(output,'_routes.json'),JSON.stringify({version:1,include:['/api/*','/admin','/admin/*'],exclude:[]}));
await writeFile(join(output,'_headers'),`/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: same-origin
  X-Frame-Options: DENY
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'

https://:project.pages.dev/*
  X-Robots-Tag: noindex, nofollow

https://:version.:project.pages.dev/*
  X-Robots-Tag: noindex, nofollow
`);
await writeFile(join(output,'404.html'),'<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="robots" content="noindex"><title>页面不存在</title><h1>页面不存在</h1><a href="/">返回收藏夹</a></html>');
console.log('动态站已构建；初始数据不写入公开静态文件。');
