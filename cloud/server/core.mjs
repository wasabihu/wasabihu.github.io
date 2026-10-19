import {createRemoteJWKSet, jwtVerify} from 'jose';

export class AppError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const pages = new Set(['fragment-1','fragment-2','fragment-3','fragment-4','fragment-6']);
const forbidden = new Set(['__proto__','prototype','constructor']);
const keysets = new Map();
function text(value, max, required = true) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new AppError(400,'请检查名称、网址和备注的长度。');
  return value.trim();
}
function id(value) {
  const result = text(value,100);
  if (!/^[\w-]+$/.test(result) || forbidden.has(result)) throw new AppError(400,'收藏编号无效。');
  return result;
}
function sequence(value) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0 || n > 1000000) throw new AppError(400,'排序应为 0 到 1000000 的整数。');
  return n;
}
/** 验证整个收藏快照，拒绝危险网址和引用错误。 */
export function validateDocument(input) {
  if (!input || !Array.isArray(input.categories) || !input.links || Array.isArray(input.links) || typeof input.links !== 'object' || input.categories.length > 200) throw new AppError(400,'收藏数据格式无效。');
  const categoryIds = new Set();
  const linkIds = new Set();
  const categories = input.categories.map(c => {
    if (!c || !pages.has(c.page)) throw new AppError(400,'请选择有效的标签页。');
    const categoryId = id(c.id);
    if (categoryIds.has(categoryId)) throw new AppError(400,'分类编号重复。');
    categoryIds.add(categoryId);
    return {id:categoryId,name:text(c.name,120),seq:sequence(c.seq),page:c.page};
  });
  const links = {};
  for (const key of Object.keys(input.links)) if (!categoryIds.has(key)) throw new AppError(400,'链接所属分类不存在。');
  for (const category of categories) {
    const group = input.links[category.id];
    if (!Array.isArray(group)) throw new AppError(400,'分类链接格式无效。');
    links[category.id] = group.map(link => {
      if (!link) throw new AppError(400,'链接格式无效。');
      const linkId = id(link.id);
      if (linkIds.has(linkId)) throw new AppError(400,'链接编号重复。');
      linkIds.add(linkId);
      const href = text(link.href,2048);
      let url;
      try { url = new URL(href); } catch { throw new AppError(400,'请输入完整的网址，例如 https://example.com。'); }
      if (!['http:','https:'].includes(url.protocol) || url.username || url.password) throw new AppError(400,'网址只能使用 HTTP 或 HTTPS，不能包含账号密码。');
      return {id:linkId,text:text(link.text,200),href,title:text(link.title,2000,false),seq:String(sequence(link.seq))};
    });
  }
  const output = {categories,links};
  if (linkIds.size > 5000 || new TextEncoder().encode(JSON.stringify(output)).length > 450000) throw new AppError(400,'收藏数据过大，请先导出并整理。');
  return output;
}
/** 信任已配置的 Access 团队及应用，不信任客户端身份声明。 */
export async function verifyAccessToken(token, env, resolver) {
  const issuer = env.ACCESS_TEAM_DOMAIN;
  if (!token || !/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(issuer || '') || !env.ACCESS_AUD || !env.ADMIN_EMAIL) throw new AppError(403,'请先使用管理员邮箱登录。');
  try {
    if (!resolver) {
      if (!keysets.has(issuer)) keysets.set(issuer,createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`)));
      resolver = keysets.get(issuer);
    }
    const {payload} = await jwtVerify(token,resolver,{issuer,audience:env.ACCESS_AUD,algorithms:['RS256'],requiredClaims:['exp','iat','email']});
    if (typeof payload.email !== 'string' || payload.email.toLowerCase() !== env.ADMIN_EMAIL.toLowerCase()) throw new Error('identity');
    return payload.email.toLowerCase();
  } catch { throw new AppError(403,'登录已失效或此账号没有管理权限，请重新登录。'); }
}
