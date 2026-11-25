/** 允许保存和展示的网址协议白名单（放行本地文件与常用桌面协议，拒绝脚本/数据协议）。 */
export const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'file:', 'chrome:', 'edge:', 'obsidian:', 'vscode:']);
/** 浏览器会拦截从 https:// 页面直接跳转的本机协议，点击时自动复制地址。 */
export const COPY_ONLY_PROTOCOLS = new Set(['file:', 'chrome:', 'edge:']);
export function isAllowedBookmarkProtocol(protocol) {
  return ALLOWED_PROTOCOLS.has(protocol);
}
export function isCopyOnlyProtocol(protocol) {
  return COPY_ONLY_PROTOCOLS.has(protocol);
}
/** 默认标签页顺序与名称（未自定义时回退到此表）。 */
export const DEFAULT_TABS = [
  ['fragment-1', '常用'],
  ['fragment-2', '工具'],
  ['fragment-3', '其他'],
  ['fragment-4', '收藏'],
  ['fragment-6', '其他 2']
];
/** 解析当前文档的标签页列表，自动回退默认名称。 */
export function resolveTabs(current) {
  const custom = current?.tabLabels && typeof current.tabLabels === 'object' ? current.tabLabels : {};
  return DEFAULT_TABS.map(([id, fallback]) => {
    const candidate = typeof custom[id] === 'string' ? custom[id].trim() : '';
    return [id, candidate ? candidate.slice(0, 24) : fallback];
  });
}
/** 生成更新标签页名称后的独立草稿；全部恢复默认时省略 tabLabels 字段。 */
export function editTabLabels(current, nextLabels) {
  const data = structuredClone(current);
  const tabLabels = {};
  for (const [id, fallback] of DEFAULT_TABS) {
    const raw = typeof nextLabels?.[id] === 'string' ? nextLabels[id].trim() : '';
    const value = (raw || fallback).slice(0, 24);
    if (value !== fallback) tabLabels[id] = value;
  }
  if (Object.keys(tabLabels).length) data.tabLabels = tabLabels;
  else delete data.tabLabels;
  return data;
}
/** 云端保存状态；仅成功回执可以替换已保存版本。 */
export class CloudStore {
  constructor(transport = (...args) => fetch(...args)) { this.transport=transport; this.document=null; this.saving=false; }
  async request(path, options={}) {
    let response;
    try { response=await this.transport(path,{cache:'no-store',credentials:'same-origin',redirect:'error',signal:AbortSignal.timeout(20000),...options}); }
    catch { throw new Error('连接未完成，输入已保留。请检查网络；若登录过期，请在新标签页重新登录后重试。'); }
    if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('登录可能已过期，请在新标签页重新登录后重试。');
    const data=await response.json();
    if (!response.ok) { const error=new Error(data.error || '操作失败，请重试。');error.status=response.status;throw error; }
    return data;
  }
  async load() { this.document=await this.request('/api/bookmarks');return this.document; }
  async save(data) {
    if (this.saving) throw new Error('正在保存，请稍候。');
    this.saving=true;
    try {
      const saved=await this.request('/admin/api/bookmarks',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,version:this.document.version})});
      if (!Number.isSafeInteger(saved.version) || !Array.isArray(saved.categories) || !saved.links) throw new Error('没有收到有效保存回执，请重新加载确认。');
      this.document=saved;
      return saved;
    } finally { this.saving=false; }
  }
}
/** 从已保存数据生成独立草稿，避免失败时污染当前视图。 */
export function editDocument(current,kind,action,input) {
  const data=structuredClone(current);
  if (kind === 'link') {
    if (action !== 'delete' && !data.categories.some(c=>c.id===input.categoryId)) throw new Error('所属分类已不存在，请重新选择。');
    for (const id of Object.keys(data.links)) data.links[id]=data.links[id].filter(link=>link.id!==input.id);
    if (action !== 'delete') {
      const {categoryId,...link}=input;
      data.links[categoryId].push(link);
    }
  } else {
    if (action === 'delete') { data.categories=data.categories.filter(c=>c.id!==input.id);delete data.links[input.id]; }
    else {
      const index=data.categories.findIndex(c=>c.id===input.id);
      if (index<0) { data.categories.push(input);data.links[input.id]=[]; } else data.categories[index]=input;
    }
  }
  return data;
}
/** 计算指定分类下新增链接的推荐末尾排序号。 */
export function nextLinkOrder(current, categoryId) {
  const list = current?.links?.[categoryId] || [];
  let max = 0;
  for (const item of list) {
    const value = Number(item?.seq);
    if (Number.isFinite(value) && value > max) max = value;
  }
  return String(max + 1);
}
/** 计算指定标签页下新增分类的推荐末尾排序号。 */
export function nextCategoryOrder(current, page) {
  const list = (current?.categories || []).filter(category => category.page === page);
  let max = 0;
  for (const item of list) {
    const value = Number(item?.seq);
    if (Number.isFinite(value) && value > max) max = value;
  }
  return max + 1;
}
/** 解析一键收藏传入的 URL 参数，仅允许安全白名单协议。 */
export function parseQuickAddParams(search) {
  const params = new URLSearchParams(search || '');
  const rawUrl = (params.get('add_url') || params.get('url') || '').trim();
  if (!rawUrl) return null;
  let parsed;
  try { parsed = new URL(rawUrl); } catch { return null; }
  if (!isAllowedBookmarkProtocol(parsed.protocol) || parsed.username || parsed.password) return null;
  const rawTitle = (params.get('add_title') || params.get('title') || '').trim();
  return {
    url: parsed.href.slice(0, 2048),
    title: rawTitle.slice(0, 200)
  };
}
/** 生成拖到浏览器书签栏即可使用的一键收藏 Bookmarklet 脚本链接。 */
export function buildBookmarkletHref(origin) {
  let normalizedOrigin = 'https://nav.tidyuse.com';
  try {
    const parsed = new URL(origin);
    if (['http:', 'https:'].includes(parsed.protocol)) normalizedOrigin = parsed.origin;
  } catch {}
  return `javascript:(()=>{window.open(${JSON.stringify(normalizedOrigin + '/admin/?add_url=')}+encodeURIComponent(location.href)+'&add_title='+encodeURIComponent(document.title),'_blank','noopener')})()`;
}
/** 检查当前收藏中是否已存在相同网址，便于新增时提醒去重。 */
export function findExistingLinkByUrl(current, rawUrl) {
  const target = (rawUrl || '').trim();
  if (!target || !current?.categories || !current?.links) return null;
  const categoryNames = new Map(current.categories.map(category => [category.id, category.name]));
  for (const [categoryId, list] of Object.entries(current.links)) {
    for (const link of list || []) {
      if (link?.href === target) {
        return { link, categoryId, categoryName: categoryNames.get(categoryId) || '' };
      }
    }
  }
  return null;
}
/** 记录本机单条链接点击频次与最近点击时间（自动限制条数防止膨胀）。 */
export function recordLinkClick(usageMap, linkId, now = Date.now(), maxEntries = 200) {
  const id = String(linkId || '').trim();
  if (!id) return usageMap && typeof usageMap === 'object' ? { ...usageMap } : {};
  const next = {};
  if (usageMap && typeof usageMap === 'object') {
    for (const [key, entry] of Object.entries(usageMap)) {
      if (entry && typeof entry === 'object' && Number.isFinite(Number(entry.count)) && Number(entry.count) > 0) {
        next[key] = { count: Number(entry.count), lastUsed: Number(entry.lastUsed) || 0 };
      }
    }
  }
  const previous = next[id] || { count: 0, lastUsed: 0 };
  next[id] = { count: previous.count + 1, lastUsed: now };
  const entries = Object.entries(next);
  if (entries.length > maxEntries) {
    entries.sort((a, b) => b[1].count - a[1].count || b[1].lastUsed - a[1].lastUsed);
    return Object.fromEntries(entries.slice(0, maxEntries));
  }
  return next;
}
/** 根据本机点击统计筛选出仍存在的「最近常点」有效链接。 */
export function selectFrequentLinks(current, usageMap, limit = 8) {
  if (!current?.categories || !current?.links || !usageMap || typeof usageMap !== 'object') return [];
  const lookup = new Map();
  const categoryNames = new Map(current.categories.map(category => [category.id, category.name]));
  for (const [categoryId, list] of Object.entries(current.links)) {
    for (const link of list || []) {
      if (!link?.id || !link?.href) continue;
      let parsed;
      try { parsed = new URL(link.href); } catch { continue; }
      if (!isAllowedBookmarkProtocol(parsed.protocol)) continue;
      lookup.set(link.id, { ...link, categoryId, categoryName: categoryNames.get(categoryId) || '' });
    }
  }
  const ranked = [];
  for (const [id, stat] of Object.entries(usageMap)) {
    const record = lookup.get(id);
    const count = Number(stat?.count);
    if (!record || !Number.isFinite(count) || count <= 0) continue;
    ranked.push({ ...record, count, lastUsed: Number(stat?.lastUsed) || 0 });
  }
  ranked.sort((a, b) => b.count - a.count || b.lastUsed - a.lastUsed);
  return ranked.slice(0, limit);
}
/** 规范化主机名，便于把同站或同类型本地网址归到同一分类。 */
function hostnameOf(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol === 'file:') return '__local_file__';
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    return parsed.hostname.toLowerCase().replace(/^www\./, '');
  } catch { return ''; }
}
/** 根据已有收藏中同域名的分布，为新网址推荐最可能的所属分类。 */
export function suggestCategoryIdForUrl(current, rawUrl) {
  const host = hostnameOf(rawUrl);
  if (!host || !current?.categories || !current?.links) return null;
  const parts = host.split('.');
  const rootDomain = parts.length >= 2 ? parts.slice(-2).join('.') : host;
  const scores = new Map();
  for (const category of current.categories) {
    let score = 0;
    for (const link of current.links[category.id] || []) {
      const linkHost = hostnameOf(link?.href);
      if (!linkHost) continue;
      if (linkHost === host) score += 3;
      else if (rootDomain.length > 3 && (linkHost === rootDomain || linkHost.endsWith('.' + rootDomain))) score += 1;
    }
    if (score > 0) scores.set(category.id, score);
  }
  if (!scores.size) return null;
  let bestId = null, bestScore = -1;
  for (const [categoryId, score] of scores.entries()) {
    if (score > bestScore) { bestId = categoryId; bestScore = score; }
  }
  const matched = current.categories.find(c => c.id === bestId);
  return matched ? { categoryId: matched.id, categoryName: matched.name, score: bestScore } : null;
}
/** 组装弹窗顶部的一键快捷分类胶囊（推荐 > 最近使用 > 当前页高频分类）。 */
export function buildQuickCategoryChoices(current, options = {}) {
  const { suggestedId = '', recentIds = [], activePage = 'fragment-1', limit = 5 } = options;
  if (!current?.categories?.length) return [];
  const byId = new Map(current.categories.map(c => [c.id, c]));
  const picked = [];
  const seen = new Set();
  const push = (id, tag = '') => {
    if (!id || seen.has(id) || !byId.has(id) || picked.length >= limit) return;
    seen.add(id);
    const cat = byId.get(id);
    picked.push({ id: cat.id, name: cat.name, tag });
  };
  if (suggestedId) push(suggestedId, '推荐');
  for (const id of recentIds) push(id, '最近');
  const activePageCats = current.categories
    .filter(c => c.page === activePage)
    .sort((a, b) => (current.links?.[b.id]?.length || 0) - (current.links?.[a.id]?.length || 0) || Number(a.seq) - Number(b.seq));
  for (const cat of activePageCats) push(cat.id, '');
  for (const cat of current.categories) push(cat.id, '');
  return picked;
}
/** 按关键词筛选分类列表。 */
export function filterCategoriesByQuery(categories, query) {
  const needle = (query || '').trim().toLowerCase();
  if (!needle) return [...(categories || [])];
  return (categories || []).filter(c => String(c?.name || '').toLowerCase().includes(needle));
}
