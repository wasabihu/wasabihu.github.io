import {AppError,verifyAccessToken} from './core.mjs';
import {readDocument,writeDocument} from './store.mjs';
export const responseHeaders = {'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'same-origin','x-frame-options':'DENY'};
function json(data,status=200) { return Response.json(data,{status,headers:responseHeaders}); }
async function readBody(request) {
  if (!/^application\/json(?:;|$)/i.test(request.headers.get('content-type') || '')) throw new AppError(415,'请提交 JSON 格式的收藏数据。');
  if (!request.body) throw new AppError(400,'没有收到收藏内容。');
  const reader = request.body.getReader();
  const chunks = [];
  let bytes = 0;
  while (true) {
    const {done,value} = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > 500000) { await reader.cancel(); throw new AppError(413,'提交内容过大。'); }
    chunks.push(value);
  }
  const joined = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) { joined.set(chunk,offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(joined)); } catch { throw new AppError(400,'收藏数据格式无效。'); }
}
/** 公开读取与管理接口；所有管理域名都验证同一身份。 */
export async function handleApi(request, env, resolver) {
  const url = new URL(request.url);
  try {
    if (url.pathname === '/api/bookmarks') {
      if (request.method !== 'GET') throw new AppError(405,'不支持此操作。');
      return json(await readDocument(env));
    }
    const email = await verifyAccessToken(request.headers.get('cf-access-jwt-assertion'),env,resolver);
    if (url.pathname === '/admin/api/session' && request.method === 'GET') return json({email});
    if (url.pathname === '/admin/api/bookmarks' && request.method === 'PUT') {
      if (request.headers.get('origin') !== url.origin || request.headers.get('sec-fetch-site') === 'cross-site') throw new AppError(403,'请从本站管理页面保存收藏。');
      const body = await readBody(request);
      if (!body || typeof body !== 'object') throw new AppError(400,'收藏数据格式无效。');
      return json(await writeDocument(env,body.version,body));
    }
    if (['/admin','/admin/'].includes(url.pathname) && request.method === 'GET') {
      const asset = await env.ASSETS.fetch(new Request(new URL('/',url)));
      const response = new Response(asset.body,asset);
      for (const [key,value] of Object.entries(responseHeaders)) response.headers.set(key,value);
      response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
      response.headers.set('X-Robots-Tag','noindex, nofollow');
      return response;
    }
    throw new AppError(404,'页面不存在。');
  } catch (error) { return json({error:error instanceof AppError ? error.message : '收藏服务暂时不可用，请稍后重试。'},error instanceof AppError ? error.status : 503); }
}
