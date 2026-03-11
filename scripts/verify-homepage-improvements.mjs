import fs from 'node:fs';
import vm from 'node:vm';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function loadText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function loadScript(filePath, extraContext = {}) {
  const code = loadText(filePath);
  const context = { console, ...extraContext };
  vm.createContext(context);
  vm.runInContext(code, context, { filename: filePath });
  return context;
}

const html = loadText('docs/index.html');
const css = loadText('docs/style.css');
const indexJs = loadText('docs/index.js');
const dataManagerJs = loadText('docs/dataManager.js');
assert(html.includes('id="searchInput"'), 'index.html 必须提供搜索输入框 searchInput。');
assert(html.includes('id="clearSearchButton"'), 'index.html 必须提供清空搜索按钮 clearSearchButton。');
assert(html.includes('id="select_link_to_edit"'), 'index.html 必须提供链接选择下拉框。');
assert(!indexJs.includes('edit-link-button'), '首页不应再渲染 edit-link-button 编辑按钮。');
assert(!indexJs.includes('edit-category-button'), '首页不应再渲染 edit-category-button 编辑按钮。');
assert(css.includes('.form-group select'), 'style.css 必须定义表单 select 样式。');
assert(css.includes('appearance: none;'), 'style.css 必须移除 select 的默认外观。');
assert(css.includes('.form-group select option'), 'style.css 必须定义下拉选项样式。');
assert(css.includes('background: var(--medium-bg);'), 'style.css 必须为下拉框或选项提供深色背景。');
assert(css.includes('color: var(--text-color);'), 'style.css 必须为下拉框或选项提供浅色文字。');

const textUtils = loadScript('docs/textUtils.js');
assert(typeof textUtils.normalizeBookmarkData === 'function', 'docs/textUtils.js 必须提供 normalizeBookmarkData 函数。');
const migrated = textUtils.normalizeBookmarkData(
  [{ id: 1, name: ' 测试分类 ', seq: '2', page: 'fragment-1' }],
  { ' 测试分类 ': [{ id: 2, text: ' 示例链接 ', href: 'https://example.com', title: ' 说明 ', seq: 3 }] }
);
assert(migrated.categories[0].id === '1', 'normalizeBookmarkData 应将分类 id 归一化为字符串。');
assert(migrated.categories[0].name === '测试分类', 'normalizeBookmarkData 应清理分类名空白。');
assert(Array.isArray(migrated.links['1']), 'normalizeBookmarkData 应按分类 id 生成 links。');
assert(!migrated.links['测试分类'], 'normalizeBookmarkData 不应继续按分类名存储 links。');
assert(migrated.links['1'][0].text === '示例链接', 'normalizeBookmarkData 应清理链接文本空白。');
assert(migrated.links['1'][0].seq === '3', 'normalizeBookmarkData 应将链接 seq 归一化为字符串。');

const alreadyIdBased = textUtils.normalizeBookmarkData(
  [{ id: '10', name: '分类 A', seq: 1, page: 'fragment-1' }, { id: '11', name: '分类 B', seq: 2, page: 'fragment-2' }],
  { '10': [{ id: 'x', text: '链接 X', href: 'https://example.com/x', title: '', seq: '1' }] }
);
assert(Array.isArray(alreadyIdBased.links['10']) && alreadyIdBased.links['10'].length === 1, 'normalizeBookmarkData 应保留已按 id 存储的 links。');
assert(Array.isArray(alreadyIdBased.links['11']) && alreadyIdBased.links['11'].length === 0, 'normalizeBookmarkData 应为没有链接的分类补空数组。');

const tabConfig = loadScript('docs/tabConfig.js');
const tabGroups = tabConfig.tabGroups || tabConfig.window?.tabGroups;
assert(Array.isArray(tabGroups), 'docs/tabConfig.js 必须提供 tabGroups。');

assert(indexJs.includes('renderTabsFromConfig'), 'index.js 必须通过 renderTabsFromConfig 渲染 tabs。');
assert(indexJs.includes('filterLinksForSearch'), 'index.js 必须提供搜索过滤逻辑。');
assert(indexJs.includes('openEditLinkModal'), 'index.js 必须保留链接编辑能力。');
assert(indexJs.includes('openEditCategoryModal'), 'index.js 必须保留分类编辑能力。');
assert(indexJs.includes('dblclick.editLinksInContainer'), 'index.js 必须保留双击链接区域编辑入口。');
assert(indexJs.includes('dblclick.editCategory'), 'index.js 必须保留双击分类标题编辑入口。');
assert(indexJs.includes('getLinksForCategory'), 'index.js 必须通过分类 id 获取链接。');
assert(indexJs.includes('getFirstCategoryIdInTab'), 'index.js 必须提供 tab 到默认分类的回退逻辑。');
assert(!indexJs.includes('links[category.name]'), 'index.js 不应继续直接按分类名读取 links。');
assert(dataManagerJs.includes('linksFormatted[String(categoryId)]'), 'dataManager.js 导出 links 时必须使用分类 id 作为键。');

console.log('首页增强验证通过。');
