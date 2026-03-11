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
assert(html.includes('新增分类'), 'index.html 必须使用“新增分类”按钮文案。');
assert(html.includes('新增链接'), 'index.html 必须使用“新增链接”按钮文案。');
assert(html.includes('导出数据 (JS)'), 'index.html 必须使用“导出数据 (JS)”按钮文案。');
assert(html.includes('清除本地存储'), 'index.html 必须使用“清除本地存储”按钮文案。');
assert(!html.includes('新增分類'), 'index.html 不应再保留繁体“新增分類”。');
assert(!html.includes('新增連結'), 'index.html 不应再保留繁体“新增連結”。');
assert(!html.includes('匯出資料 (JS)'), 'index.html 不应再保留繁体“匯出資料 (JS)”。');

const textUtils = loadScript('docs/textUtils.js');
assert(typeof textUtils.normalizeBookmarkData === 'function', 'docs/textUtils.js 必须提供 normalizeBookmarkData 函数。');
const normalized = textUtils.normalizeBookmarkData(
  [{ id: 1, name: ' 测试分类 ', seq: '2', page: 'fragment-1' }],
  { ' 测试分类 ': [{ id: 2, text: ' 示例链接 ', href: 'https://example.com', title: ' 说明 ', seq: 3 }] }
);
assert(normalized.categories[0].id === '1', 'normalizeBookmarkData 应将分类 id 归一化为字符串。');
assert(normalized.categories[0].name === '测试分类', 'normalizeBookmarkData 应清理分类名空白。');
assert(normalized.links['测试分类'][0].text === '示例链接', 'normalizeBookmarkData 应清理链接文本空白。');
assert(normalized.links['测试分类'][0].seq === '3', 'normalizeBookmarkData 应将链接 seq 归一化为字符串。');

const tabConfig = loadScript('docs/tabConfig.js');
const tabGroups = tabConfig.tabGroups || tabConfig.window?.tabGroups;
assert(Array.isArray(tabGroups), 'docs/tabConfig.js 必须提供 tabGroups。');

const indexJs = loadText('docs/index.js');
assert(indexJs.includes('renderTabsFromConfig'), 'index.js 必须通过 renderTabsFromConfig 渲染 tabs。');
assert(!indexJs.includes('var fragmentSelectors = ['), 'index.js 不应再硬编码 fragmentSelectors。');
assert(indexJs.includes('normalizeBookmarkData'), 'index.js 必须使用 normalizeBookmarkData。');

console.log('首页改造验证通过。');
