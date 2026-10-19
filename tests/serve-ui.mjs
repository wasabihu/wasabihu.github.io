// 仅本地浏览器验收使用；运行真实 D1 和已签名测试身份，不进入发布目录。
import http from 'node:http';
import {readFile,mkdtemp} from 'node:fs/promises';
import {join,resolve,extname} from 'node:path';
import {tmpdir} from 'node:os';
import {getPlatformProxy} from 'wrangler';
import {generateKeyPair,exportJWK,SignJWT,createLocalJWKSet} from 'jose';
import {handleApi} from '../cloud/server/api.mjs';
const proxy=await getPlatformProxy({configPath:'tests/wrangler.jsonc',persist:{path:await mkdtemp(join(tmpdir(),'nav-ui-'))}});
const env={...proxy.env,ACCESS_TEAM_DOMAIN:'https://test.cloudflareaccess.com',ACCESS_AUD:'nav-ui',ADMIN_EMAIL:'wasabi.net@gmail.com'};
const {privateKey,publicKey}=await generateKeyPair('RS256');
const resolver=createLocalJWKSet({keys:[{...await exportJWK(publicKey),alg:'RS256',kid:'ui'}]});
const token=await new SignJWT({email:env.ADMIN_EMAIL}).setProtectedHeader({alg:'RS256',kid:'ui'}).setIssuedAt().setExpirationTime('2h').setIssuer(env.ACCESS_TEAM_DOMAIN).setAudience(env.ACCESS_AUD).sign(privateKey);
await env.DB.prepare(await readFile('migrations/0001.sql','utf8')).run();
await env.DB.prepare(await readFile('.wrangler/seed.sql','utf8')).run();
const root=resolve('cloudflare-dist');
const mime={'.html':'text/html;charset=utf-8','.mjs':'text/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.png':'image/png'};
http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://127.0.0.1:4186');
    if(url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin/api/')){
      const chunks=[];for await(const chunk of req)chunks.push(chunk);
      const headers=new Headers(req.headers);
      if(url.pathname.startsWith('/admin/'))headers.set('cf-access-jwt-assertion',token);
      const request=new Request(url,{method:req.method,headers,...(['GET','HEAD'].includes(req.method)?{}:{body:Buffer.concat(chunks)})});
      const result=await handleApi(request,env,resolver);res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()));return;
    }
    const path=['/','/admin/'].includes(url.pathname)?'/index.html':url.pathname;
    const file=resolve(root,'.'+path);
    if(!file.startsWith(root+'/')){res.writeHead(404);res.end();return;}
    res.setHeader('content-type',mime[extname(file)]||'text/plain');res.end(await readFile(file));
  }catch{res.writeHead(404);res.end('Not found');}
}).listen(4186,'127.0.0.1',()=>console.log('Local UI test: http://127.0.0.1:4186/admin/'));
