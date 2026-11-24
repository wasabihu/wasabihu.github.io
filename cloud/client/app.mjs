import {
  CloudStore,
  editDocument,
  nextLinkOrder,
  nextCategoryOrder,
  parseQuickAddParams,
  buildBookmarkletHref,
  findExistingLinkByUrl,
  recordLinkClick,
  selectFrequentLinks,
  suggestCategoryIdForUrl,
  buildQuickCategoryChoices,
  filterCategoriesByQuery
} from './store.mjs';
const $=id=>document.getElementById(id);
const tabs=[['fragment-1','常用'],['fragment-2','工具'],['fragment-3','其他'],['fragment-4','收藏'],['fragment-6','其他 2']];
const FREQUENT_KEY='wasabi_nav_frequent_v1';
const FREQUENT_COLLAPSED_KEY='wasabi_nav_frequent_collapsed_v1';
const RECENT_CATS_KEY='wasabi_nav_recent_cats_v1';
const store=new CloudStore();
const admin=/^\/admin\/?$/.test(location.pathname);
let allowed=false,active='fragment-1',kind='link',editingExisting=false,dirty=false,loading=false,orderTouched=false,categoryTouched=false,quickAddHandled=false,currentSuggestion=null;
let usageMap=loadUsageMap();
let frequentCollapsed=loadFrequentCollapsed();
let recentCategoryIds=loadRecentCategoryIds();
const sorted=list=>[...list].sort((a,b)=>Number(a.seq)-Number(b.seq));
function loadUsageMap(){
  try{const raw=localStorage.getItem(FREQUENT_KEY);const parsed=raw?JSON.parse(raw):{};return parsed&&typeof parsed==='object'?parsed:{};}
  catch{return {};}
}
function saveUsageMap(next){
  usageMap=next;
  try{localStorage.setItem(FREQUENT_KEY,JSON.stringify(next));}catch{}
}
function loadFrequentCollapsed(){
  try{return localStorage.getItem(FREQUENT_COLLAPSED_KEY)==='1';}catch{return false;}
}
function saveFrequentCollapsed(collapsed){
  frequentCollapsed=collapsed;
  try{localStorage.setItem(FREQUENT_COLLAPSED_KEY,collapsed?'1':'0');}catch{}
}
function loadRecentCategoryIds(){
  try{const raw=localStorage.getItem(RECENT_CATS_KEY);const parsed=raw?JSON.parse(raw):[];return Array.isArray(parsed)?parsed.map(String):[];}
  catch{return [];}
}
function rememberCategory(categoryId){
  if(!categoryId)return;
  recentCategoryIds=[String(categoryId),...recentCategoryIds.filter(id=>id!==String(categoryId))].slice(0,5);
  try{localStorage.setItem(RECENT_CATS_KEY,JSON.stringify(recentCategoryIds));}catch{}
}
function element(tag,content,className){const node=document.createElement(tag);if(content!==undefined)node.textContent=content;if(className)node.className=className;return node;}
function button(text,action,className){const node=element('button',text,className);node.type='button';node.addEventListener('click',action);return node;}
function status(message,error=false){$('status').textContent=message;$('status').classList.toggle('error',error);}
function setBusy(busy){for(const control of $('editor-form').querySelectorAll('button,input,select,textarea'))control.disabled=busy;$('save').textContent=busy?'正在保存…':'保存到云端';$('reload').disabled=busy;}
function updateOrderSummary(){
  const summary=$('order-summary');
  if(!summary)return;
  const val=$('record-order').value || '1';
  summary.textContent=orderTouched?`排序设置（当前 #${val}）`:`排序设置（自动排末尾 #${val}）`;
}
function syncAutoOrderForLink(){
  if(!editingExisting && kind==='link' && !orderTouched && $('link-category').value){
    $('record-order').value=nextLinkOrder(store.document,$('link-category').value);
    updateOrderSummary();
  }
}
function renderQuickCategoryPicks(){
  const box=$('category-quick-picks');
  if(!box || kind!=='link' || !store.document){if(box)box.hidden=true;return;}
  const choices=buildQuickCategoryChoices(store.document,{
    suggestedId:currentSuggestion?.categoryId || '',
    recentIds:recentCategoryIds,
    activePage:active,
    limit:5
  });
  box.replaceChildren();
  if(!choices.length){box.hidden=true;return;}
  box.hidden=false;
  const currentId=$('link-category').value;
  for(const choice of choices){
    const label=choice.tag==='推荐'?`★ ${choice.name}`:choice.name;
    const chip=button(label,()=>{
      categoryTouched=true;
      if($('category-filter').value){
        $('category-filter').value='';
        populateCategories(choice.id,'');
      }else{
        $('link-category').value=choice.id;
      }
      syncAutoOrderForLink();
      renderQuickCategoryPicks();
    },choice.tag==='推荐'?'quick-pick is-recommended':'quick-pick');
    chip.setAttribute('aria-pressed',String(choice.id===currentId));
    if(choice.tag==='推荐')chip.title='根据同域名收藏自动推荐';
    else if(choice.tag==='最近')chip.title='最近新增过的分类';
    box.append(chip);
  }
}
function populateCategories(selected,filterText=''){
  const select=$('link-category');
  select.replaceChildren();
  const matched=filterCategoriesByQuery(sorted(store.document.categories),filterText);
  if(!matched.length){
    const empty=element('option','没有匹配的分类，请修改筛选词');
    empty.value='';
    empty.disabled=true;
    select.append(empty);
    select.value='';
    return;
  }
  const tabLabels=new Map(tabs);
  const grouped=new Map();
  for(const category of matched){
    const page=category.page || 'fragment-1';
    if(!grouped.has(page))grouped.set(page,[]);
    grouped.get(page).push(category);
  }
  const orderedPages=[...tabs.map(([id])=>id),...[...grouped.keys()].filter(p=>!tabLabels.has(p))];
  for(const page of orderedPages){
    const list=grouped.get(page);
    if(!list?.length)continue;
    const optgroup=document.createElement('optgroup');
    optgroup.label=tabLabels.get(page) || page;
    for(const category of list){
      const option=element('option',category.name);
      option.value=category.id;
      optgroup.append(option);
    }
    select.append(optgroup);
  }
  if(selected && matched.some(c=>c.id===selected))select.value=selected;
  else select.value=matched[0].id;
}
function trackClick(linkId){
  if(!linkId)return;
  saveUsageMap(recordLinkClick(usageMap,linkId));
  renderFrequent();
}
function updateDuplicateAndSuggestion(){
  const hint=$('form-hint');
  if(!hint || kind!=='link' || !store.document){if(hint)hint.hidden=true;return;}
  const urlVal=$('link-url').value;
  const match=findExistingLinkByUrl(store.document,urlVal);
  currentSuggestion=editingExisting?null:suggestCategoryIdForUrl(store.document,urlVal);
  if(currentSuggestion && !categoryTouched){
    if($('category-filter').value){
      $('category-filter').value='';
      populateCategories(currentSuggestion.categoryId,'');
    }else{
      $('link-category').value=currentSuggestion.categoryId;
    }
    syncAutoOrderForLink();
  }
  renderQuickCategoryPicks();
  if(match && match.link.id!==$('record-id').value){
    hint.textContent=`提示：该网址已在「${match.categoryName}」中收藏过（${match.link.text}）。`;
    hint.hidden=false;
  }else if(currentSuggestion && !categoryTouched){
    hint.textContent=`已根据同站收藏自动选中「${currentSuggestion.categoryName}」，点上方胶囊可秒换分类。`;
    hint.hidden=false;
  }else{
    hint.textContent='';
    hint.hidden=true;
  }
}
function renderFrequent(){
  const section=$('frequent');
  if(!section)return;
  const query=$('search').value.trim();
  const items=selectFrequentLinks(store.document,usageMap,8);
  if(!items.length || query){section.hidden=true;return;}
  section.hidden=false;
  section.classList.toggle('is-collapsed',frequentCollapsed);
  $('frequent-count').textContent=String(items.length).padStart(2,'0');
  $('toggle-frequent').textContent=frequentCollapsed?'展开':'收起';
  $('toggle-frequent').setAttribute('aria-expanded',String(!frequentCollapsed));
  const list=$('frequent-list');
  list.hidden=frequentCollapsed;
  list.replaceChildren();
  for(const item of items){
    const anchor=element('a',item.text,'frequent-chip');
    anchor.href=item.href;
    anchor.target='_blank';
    anchor.rel='noopener noreferrer';
    anchor.title=item.title?`${item.categoryName} · ${item.title}`:`${item.categoryName} · ${item.href}`;
    anchor.dataset.bookmarkId=item.id;
    anchor.addEventListener('click',()=>trackClick(item.id));
    anchor.addEventListener('auxclick',event=>{if(event.button===1)trackClick(item.id);});
    list.append(anchor);
  }
}
function render(){
  const data=store.document;if(!data)return;
  const count=Object.values(data.links).flat().length;
  $('summary').textContent=`${data.categories.length} 个分类 · ${count} 个网址`;
  $('tabs').replaceChildren();
  for(const [id,label] of tabs){const tab=button(label,()=>{active=id;render();$('tabs').querySelector('[aria-current=true]').focus()});tab.setAttribute('aria-current',String(active===id));$('tabs').append(tab);}
  const query=$('search').value.trim().toLowerCase();
  renderFrequent();
  const container=$('collections');container.replaceChildren();
  let firstMarked=false;
  for(const category of sorted(data.categories)){
    if(!query && category.page!==active)continue;
    const group=sorted(data.links[category.id]||[]).filter(link=>!query || [category.name,link.text,link.href,link.title].join(' ').toLowerCase().includes(query));
    if(query && !group.length && !category.name.toLowerCase().includes(query))continue;
    const section=element('section',undefined,'category');const heading=element('div',undefined,'category-head');heading.append(element('h2',category.name));const total=element('span',String(group.length).padStart(2,'0'),'category-count');total.setAttribute('aria-label',`${group.length} 个网址`);heading.append(total);
    if(allowed){
      const catActions=element('div',undefined,'category-actions');
      const quickAddBtn=button('+ 新增',()=>openLink(null,category.id),'category-add');
      quickAddBtn.setAttribute('aria-label',`在 ${category.name} 下新增网址`);
      const editCatBtn=button('编辑分类',()=>openCategory(category));
      catActions.append(quickAddBtn,editCatBtn);
      heading.append(catActions);
    }
    const grid=element('div',undefined,'link-grid');
    for(const link of group){
      const item=element('div',undefined,'bookmark');
      if(query && !firstMarked){item.classList.add('top-match');firstMarked=true;}
      const anchor=element('a',link.text);
      let url;try{url=new URL(link.href)}catch{continue}
      if(!['http:','https:'].includes(url.protocol))continue;
      anchor.href=link.href;anchor.target='_blank';anchor.rel='noopener noreferrer';anchor.title=link.title || link.href;anchor.dataset.bookmarkId=link.id;
      anchor.addEventListener('click',()=>trackClick(link.id));
      anchor.addEventListener('auxclick',event=>{if(event.button===1)trackClick(link.id);});
      item.append(anchor);
      if(allowed){const edit=button('编辑',()=>openLink(link,category.id));edit.setAttribute('aria-label',`编辑 ${link.text}`);item.append(edit);}
      grid.append(item);
    }
    section.append(heading,grid);if(!group.length)section.append(element('p','暂无网址', 'muted'));container.append(section);
  }
  if(!container.children.length)container.append(element('p',query?'没有找到匹配的收藏。':'这个标签页还没有分类。','empty'));
}
function configureEditor(type,existing){
  if(!allowed || !store.document || store.saving || loading)return false;
  kind=type;editingExisting=existing;dirty=false;orderTouched=existing;categoryTouched=existing;currentSuggestion=null;$('editor-form').reset();$('form-error').textContent='';$('form-recovery').hidden=true;
  if($('form-hint')){$('form-hint').textContent='';$('form-hint').hidden=true;}
  if($('category-filter'))$('category-filter').value='';
  if($('order-details'))$('order-details').open=existing;
  $('link-fields').hidden=type!=='link';$('category-fields').hidden=type!=='category';
  $('link-name').required=type==='link';$('link-url').required=type==='link';$('link-category').required=type==='link';$('category-name').required=type==='category';
  $('delete-confirmation').hidden=true;$('delete').hidden=!existing;$('editor-title').textContent=`${existing?'编辑':'新增'}${type==='link'?'网址':'分类'}`;return true;
}
function openLink(link,categoryId,prefill=null){
  if(!configureEditor('link',!!link))return;
  if(!store.document.categories.length){status('请先新增一个分类。',true);return;}
  const lockedCategory=Boolean(link || categoryId);
  categoryTouched=lockedCategory;
  currentSuggestion=!link && prefill?.url ? suggestCategoryIdForUrl(store.document,prefill.url) : null;
  const recentValid=recentCategoryIds.find(id=>store.document.categories.some(c=>c.id===id));
  const defaultCategoryId=categoryId || currentSuggestion?.categoryId || recentValid || store.document.categories.find(c=>c.page===active)?.id || store.document.categories[0]?.id;
  populateCategories(defaultCategoryId,'');
  const chosenCategory=$('link-category').value || defaultCategoryId;
  $('record-id').value=link?.id || `link-${crypto.randomUUID()}`;
  $('link-name').value=link?.text ?? prefill?.title ?? '';
  $('link-url').value=link?.href ?? prefill?.url ?? '';
  $('link-note').value=link?.title || '';
  $('record-order').value=link?.seq ?? nextLinkOrder(store.document,chosenCategory);
  updateOrderSummary();
  updateDuplicateAndSuggestion();
  $('editor').showModal();
  if(prefill){$('save').focus();}
  else if(!link && categoryId){$('link-name').focus();}
}
function openCategory(category){
  if(!configureEditor('category',!!category))return;
  const chosenPage=category?.page || active;
  $('record-id').value=category?.id || `category-${crypto.randomUUID()}`;
  $('category-name').value=category?.name || '';
  $('category-page').value=chosenPage;
  $('record-order').value=category?.seq ?? String(nextCategoryOrder(store.document,chosenPage));
  updateOrderSummary();
  $('editor').showModal();
}
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
  try{await store.save(editDocument(store.document,kind,action,input));if(kind==='link' && action==='save')rememberCategory(input.categoryId);dirty=false;$('editor').close();render();status('已保存到云端，其他设备重新加载即可看到。');}
  catch(error){$('form-error').textContent=error.message;$('form-recovery').hidden=false;$('reauth').hidden=false;status('尚未确认保存成功，输入已保留。',true);}
  finally{setBusy(false);}
}
async function reload(keepForm=false){
  if(loading || store.saving)return;loading=true;$('reload').disabled=true;$('reload-editor').disabled=true;
  try{await store.load();render();if(keepForm){populateCategories($('link-category').value,$('category-filter')?.value || '');updateDuplicateAndSuggestion();$('form-error').textContent='已读取最新收藏，表单输入已保留，请核对后保存。';}status('已读取云端最新收藏。');}
  catch(error){status(error.message,true);if(keepForm)$('form-error').textContent=error.message;}
  finally{loading=false;$('reload').disabled=false;$('reload-editor').disabled=false;}
}
function closeEditor(){if(store.saving)return;if(dirty && !confirm('放弃尚未保存的输入？'))return;dirty=false;$('editor').close();}
function openBookmarkletDialog(){
  const href=buildBookmarkletHref(location.origin);
  $('bookmarklet-link').href=href;
  $('bookmarklet-tip').textContent='如果不方便拖拽，可点「复制脚本代码」，在浏览器新建书签并把代码粘贴到「网址」栏。';
  $('bookmarklet-dialog').showModal();
}
$('editor').addEventListener('cancel',event=>{event.preventDefault();closeEditor()});$('cancel').addEventListener('click',closeEditor);$('editor-form').addEventListener('input',event=>{if(event.target.id!=='category-filter')dirty=true;});
$('record-order').addEventListener('input',()=>{orderTouched=true;updateOrderSummary();});
$('link-category').addEventListener('change',()=>{categoryTouched=true;syncAutoOrderForLink();renderQuickCategoryPicks();});
$('category-filter').addEventListener('input',()=>{populateCategories($('link-category').value,$('category-filter').value);syncAutoOrderForLink();renderQuickCategoryPicks();});
$('category-page').addEventListener('change',()=>{if(!editingExisting && kind==='category' && !orderTouched){$('record-order').value=String(nextCategoryOrder(store.document,$('category-page').value));updateOrderSummary();}});
$('link-url').addEventListener('input',updateDuplicateAndSuggestion);
$('editor-form').addEventListener('submit',event=>{event.preventDefault();save('save')});$('delete').addEventListener('click',()=>{$('delete-message').textContent=kind==='category'?'删除这个分类及其中的全部网址？建议先导出备份。':'确定删除这个网址？';$('delete-confirmation').hidden=false;$('confirm-delete').focus();});
$('confirm-delete').addEventListener('click',()=>save('delete'));$('keep-record').addEventListener('click',()=>{$('delete-confirmation').hidden=true;$('delete').focus();});
$('search').addEventListener('input',render);
$('search').addEventListener('keydown',event=>{
  if(event.key==='Enter'){
    const query=$('search').value.trim();
    if(!query)return;
    const first=$('collections').querySelector('.bookmark > a');
    if(!first)return;
    event.preventDefault();
    window.open(first.href,'_blank','noopener,noreferrer');
    trackClick(first.dataset.bookmarkId);
    status(`已打开「${first.textContent}」。`);
  }else if(event.key==='Escape'){
    if($('search').value){event.preventDefault();$('search').value='';render();}
    else{$('search').blur();}
  }
});
$('clear-search').addEventListener('click',()=>{$('search').value='';render();$('search').focus()});$('reload').addEventListener('click',()=>reload());$('reload-editor').addEventListener('click',()=>reload(true));
$('add-link').addEventListener('click',()=>openLink());$('add-category').addEventListener('click',()=>openCategory());
$('quick-add-tool').addEventListener('click',openBookmarkletDialog);
$('close-bookmarklet').addEventListener('click',()=>$('bookmarklet-dialog').close());
$('bookmarklet-link').addEventListener('click',event=>{event.preventDefault();$('bookmarklet-tip').textContent='请直接按住绿色按钮拖到浏览器书签栏（不要直接点击）。';});
$('copy-bookmarklet').addEventListener('click',async()=>{
  const href=buildBookmarkletHref(location.origin);
  try{await navigator.clipboard.writeText(href);$('bookmarklet-tip').textContent='已复制脚本代码！在浏览器新建书签，把刚才复制的内容粘贴到「网址」栏即可。';}
  catch{$('bookmarklet-tip').textContent='当前环境无法自动复制，请直接拖动左侧绿色按钮到浏览器书签栏。';}
});
$('toggle-frequent').addEventListener('click',()=>{saveFrequentCollapsed(!frequentCollapsed);renderFrequent();});
$('clear-frequent').addEventListener('click',()=>{saveUsageMap({});renderFrequent();status('已清空本机最近常点记录。');});
$('export').addEventListener('click',()=>{const href=URL.createObjectURL(new Blob([JSON.stringify(store.document,null,2)],{type:'application/json'}));const anchor=element('a');anchor.href=href;anchor.download=`wasabi-bookmarks-${new Date().toISOString().slice(0,10)}.json`;document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(href),1000);});
for(const [id,label] of tabs){const option=element('option',label);option.value=id;$('category-page').append(option);}
window.addEventListener('beforeunload',event=>{if(dirty || store.saving){event.preventDefault();event.returnValue='';}});
document.addEventListener('keydown',event=>{if(event.key==='/' && !event.ctrlKey && !event.metaKey && !event.altKey && !$('editor').open && !$('bookmarklet-dialog').open && !event.target.closest('input,textarea,select,[contenteditable]')){event.preventDefault();$('search').focus();}});
async function start(){
  if(admin){$('heading').textContent='管理我的收藏';$('manage').textContent='浏览收藏';$('manage').href='/';try{await store.request('/admin/api/session');allowed=true;$('admin-actions').hidden=false;$('logout').hidden=false;}catch(error){status(error.message,true);$('reauth').hidden=false;return;}}
  await reload();
  if(admin && allowed && !quickAddHandled){
    const quickAdd=parseQuickAddParams(location.search);
    if(quickAdd){
      quickAddHandled=true;
      history.replaceState(null,'',location.pathname);
      openLink(null,null,quickAdd);
      status('已自动填入当前网页信息，选好分类后点「保存到云端」即可。');
    }
  }
}
start();
