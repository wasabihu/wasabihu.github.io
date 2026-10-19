import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
test('生产构建仅含动态站资源及受保护函数路由',async()=>{
 const output=await mkdtemp(join(tmpdir(),'nav-production-build-'));
 execFileSync(process.execPath,['scripts/build-cloudflare.mjs'],{env:{...process.env,BUILD_OUTPUT:output}});
 assert.deepEqual((await readdir(output)).sort(),['404.html','_headers','_routes.json','app.mjs','cloud.css','favicon.png','index.html','store.mjs'].sort());
 const routes=JSON.parse(await readFile(join(output,'_routes.json'),'utf8'));
 assert.deepEqual(routes.include,['/api/*','/admin','/admin/*']);
 assert.deepEqual(routes.exclude,[]);
 const html=await readFile(join(output,'index.html'),'utf8');
 assert.match(html,/src="\/app\.mjs\?v=[a-zA-Z0-9-]+"/);
 assert.match(html,/href="\/cloud\.css\?v=[a-zA-Z0-9-]+"/);assert.doesNotMatch(html,/data\.js|data_export/);
 assert.match(await readFile(join(output,'_headers'),'utf8'),/Content-Security-Policy/);
});
