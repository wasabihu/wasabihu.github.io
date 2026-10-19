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
