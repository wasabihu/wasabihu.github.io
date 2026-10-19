import {CloudStore,editDocument} from './store.mjs';
const $=id=>document.getElementById(id);
const tabs=[['fragment-1','常用'],['fragment-2','工具'],['fragment-3','其他'],['fragment-4','收藏'],['fragment-6','其他 2']];
const store=new CloudStore();
const admin=/^\/admin\/?$/.test(location.pathname);
let allowed=false,active='fragment-1',kind='link',editingExisting=false,dirty=false,loading=false;
const sorted=list=>[...list].sort((a,b)=>Number(a.seq)-Number(b.seq));
function element(tag,content,className){const node=document.createElement(tag);if(content!==undefined)node.textContent=content;if(className)node.className=className;return node;}
function button(text,action){const node=element('button',text);node.type='button';node.addEventListener('click',action);return node;}
function status(message,error=false){$('status').textContent=message;$('status').classList.toggle('error',error);}
function setBusy(busy){for(const control of $('editor-form').querySelectorAll('button,input,select,textarea'))control.disabled=busy;$('save').textContent=busy?'正在保存…':'保存到云端';$('reload').disabled=busy;}
function populateCategories(selected){const select=$('link-category');select.replaceChildren();for(const category of sorted(store.document.categories)){const option=element('option',category.name);option.value=category.id;select.append(option);}if(selected)select.value=selected;}
function render(){
  const data=store.document;if(!data)return;
  const count=Object.values(data.links).flat().length;
  $('summary').textContent=`${data.categories.length} 个分类 · ${count} 个网址`;
  $('tabs').replaceChildren();
  for(const [id,label] of tabs){const tab=button(label,()=>{active=id;render();$('tabs').querySelector('[aria-current=true]').focus()});tab.setAttribute('aria-current',String(active===id));$('tabs').append(tab);}
  const query=$('search').value.trim().toLowerCase();
  const container=$('collections');container.replaceChildren();
  for(const category of sorted(data.categories)){
    if(!query && category.page!==active)continue;
    const group=sorted(data.links[category.id]||[]).filter(link=>!query || [category.name,link.text,link.href,link.title].join(' ').toLowerCase().includes(query));
    if(query && !group.length && !category.name.toLowerCase().includes(query))continue;
    const section=element('section',undefined,'category');const heading=element('div',undefined,'category-head');heading.append(element('h2',category.name));const total=element('span',String(group.length).padStart(2,'0'),'category-count');total.setAttribute('aria-label',`${group.length} 个网址`);heading.append(total);
    if(allowed)heading.append(button(`编辑分类`,()=>openCategory(category)));
    const grid=element('div',undefined,'link-grid');
    for(const link of group){const item=element('div',undefined,'bookmark');const anchor=element('a',link.text);let url;try{url=new URL(link.href)}catch{continue}if(!['http:','https:'].includes(url.protocol))continue;anchor.href=link.href;anchor.target='_blank';anchor.rel='noopener noreferrer';anchor.title=link.title || link.href;anchor.dataset.bookmarkId=link.id;item.append(anchor);if(allowed){const edit=button('编辑',()=>openLink(link,category.id));edit.setAttribute('aria-label',`编辑 ${link.text}`);item.append(edit);}grid.append(item);}
    section.append(heading,grid);if(!group.length)section.append(element('p','暂无网址', 'muted'));container.append(section);
  }
  if(!container.children.length)container.append(element('p',query?'没有找到匹配的收藏。':'这个标签页还没有分类。','empty'));
}
function configureEditor(type,existing){
  if(!allowed || !store.document || store.saving || loading)return false;
  kind=type;editingExisting=existing;dirty=false;$('editor-form').reset();$('form-error').textContent='';$('form-recovery').hidden=true;
  $('link-fields').hidden=type!=='link';$('category-fields').hidden=type!=='category';
  $('link-name').required=type==='link';$('link-url').required=type==='link';$('link-category').required=type==='link';$('category-name').required=type==='category';
  $('delete-confirmation').hidden=true;$('delete').hidden=!existing;$('editor-title').textContent=`${existing?'编辑':'新增'}${type==='link'?'网址':'分类'}`;return true;
}
function openLink(link,categoryId){if(!configureEditor('link',!!link))return;if(!store.document.categories.length){status('请先新增一个分类。',true);return;}populateCategories(categoryId || store.document.categories.find(c=>c.page===active)?.id);$('record-id').value=link?.id || `link-${crypto.randomUUID()}`;$('link-name').value=link?.text || '';$('link-url').value=link?.href || '';$('link-note').value=link?.title || '';$('record-order').value=link?.seq ?? '1';$('editor').showModal();}
function openCategory(category){if(!configureEditor('category',!!category))return;$('record-id').value=category?.id || `category-${crypto.randomUUID()}`;$('category-name').value=category?.name || '';$('category-page').value=category?.page || active;$('record-order').value=category?.seq ?? '1';$('editor').showModal();}
function formInput(){const id=$('record-id').value;return kind==='link'?{id,categoryId:$('link-category').value,text:$('link-name').value.trim(),href:$('link-url').value.trim(),title:$('link-note').value.trim(),seq:String(Number($('record-order').value))}:{id,name:$('category-name').value.trim(),page:$('category-page').value,seq:Number($('record-order').value)};}
async function save(action){
  if(store.saving || loading)return;
  if(action!=='delete' && !$('editor-form').reportValidity())return;
  const input=formInput();
  if(editingExisting && action!=='delete'){
    const exists=kind==='category'?store.document.categories.some(c=>c.id===input.id):Object.values(store.document.links).flat().some(l=>l.id===input.id);
    if(!exists){$('form-error').textContent='此条目已被其他设备删除。输入已保留，请复制需要的内容后新增。';return;}
  }
  setBusy(true);$('form-error').textContent='';
  try{await store.save(editDocument(store.document,kind,action,input));dirty=false;$('editor').close();render();status('已保存到云端，其他设备重新加载即可看到。');}
  catch(error){$('form-error').textContent=error.message;$('form-recovery').hidden=false;$('reauth').hidden=false;status('尚未确认保存成功，输入已保留。',true);}
  finally{setBusy(false);}
}
async function reload(keepForm=false){
  if(loading || store.saving)return;loading=true;$('reload').disabled=true;$('reload-editor').disabled=true;
  try{await store.load();render();if(keepForm){populateCategories($('link-category').value);$('form-error').textContent='已读取最新收藏，表单输入已保留，请核对后保存。';}status('已读取云端最新收藏。');}
  catch(error){status(error.message,true);if(keepForm)$('form-error').textContent=error.message;}
  finally{loading=false;$('reload').disabled=false;$('reload-editor').disabled=false;}
}
function closeEditor(){if(store.saving)return;if(dirty && !confirm('放弃尚未保存的输入？'))return;dirty=false;$('editor').close();}
$('editor').addEventListener('cancel',event=>{event.preventDefault();closeEditor()});$('cancel').addEventListener('click',closeEditor);$('editor-form').addEventListener('input',()=>{dirty=true});
$('editor-form').addEventListener('submit',event=>{event.preventDefault();save('save')});$('delete').addEventListener('click',()=>{$('delete-message').textContent=kind==='category'?'删除这个分类及其中的全部网址？建议先导出备份。':'确定删除这个网址？';$('delete-confirmation').hidden=false;$('confirm-delete').focus();});
$('confirm-delete').addEventListener('click',()=>save('delete'));$('keep-record').addEventListener('click',()=>{$('delete-confirmation').hidden=true;$('delete').focus();});
$('search').addEventListener('input',render);$('clear-search').addEventListener('click',()=>{$('search').value='';render();$('search').focus()});$('reload').addEventListener('click',()=>reload());$('reload-editor').addEventListener('click',()=>reload(true));
$('add-link').addEventListener('click',()=>openLink());$('add-category').addEventListener('click',()=>openCategory());
$('export').addEventListener('click',()=>{const href=URL.createObjectURL(new Blob([JSON.stringify(store.document,null,2)],{type:'application/json'}));const anchor=element('a');anchor.href=href;anchor.download=`wasabi-bookmarks-${new Date().toISOString().slice(0,10)}.json`;document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(href),1000);});
for(const [id,label] of tabs){const option=element('option',label);option.value=id;$('category-page').append(option);}
window.addEventListener('beforeunload',event=>{if(dirty || store.saving){event.preventDefault();event.returnValue='';}});
document.addEventListener('keydown',event=>{if(event.key==='/' && !event.ctrlKey && !event.metaKey && !event.altKey && !$('editor').open && !event.target.closest('input,textarea,select,[contenteditable]')){event.preventDefault();$('search').focus();}});
async function start(){
  if(admin){$('heading').textContent='管理我的收藏';$('manage').textContent='浏览收藏';$('manage').href='/';try{await store.request('/admin/api/session');allowed=true;$('admin-actions').hidden=false;$('logout').hidden=false;}catch(error){status(error.message,true);$('reauth').hidden=false;return;}}
  await reload();
}
start();
