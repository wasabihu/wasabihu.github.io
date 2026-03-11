import fs from 'node:fs';
import vm from 'node:vm';

function loadScript(filePath, extraContext = {}) {
  const code = fs.readFileSync(filePath, 'utf8');
  const context = { console, ...extraContext };
  vm.createContext(context);
  vm.runInContext(code, context, { filename: filePath });
  return context;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const tabConfigContext = loadScript('docs/tabConfig.js');
const tabGroups = tabConfigContext.tabGroups || tabConfigContext.window?.tabGroups;
assert(Array.isArray(tabGroups), 'docs/tabConfig.js 必须提供 tabGroups 数组。');
assert(tabGroups.length > 0, 'tabGroups 不能为空。');

const allowedTabIds = new Set();
for (const group of tabGroups) {
  assert(group.containerId, '每个 tab group 都必须有 containerId。');
  assert(Array.isArray(group.tabs) && group.tabs.length > 0, `tab group ${group.containerId} 必须至少有一个 tab。`);
  for (const tab of group.tabs) {
    assert(tab.id, 'tab 必须有 id。');
    assert(tab.label, `tab ${tab.id} 必须有 label。`);
    assert(!allowedTabIds.has(tab.id), `tab id 重复：${tab.id}`);
    allowedTabIds.add(tab.id);
  }
}

const dataContext = loadScript('docs/data.js');
const categories = dataContext.initialCategories;
const links = dataContext.initialLinks;
assert(Array.isArray(categories), 'docs/data.js 必须导出 initialCategories 数组。');
assert(links && typeof links === 'object', 'docs/data.js 必须导出 initialLinks 对象。');

const categoryIds = new Set();
const categoryNames = new Set();
for (const category of categories) {
  assert(category.id, '分类缺少 id。');
  assert(category.name, `分类 ${category.id} 缺少 name。`);
  assert(!categoryIds.has(category.id), `分类 id 重复：${category.id}`);
  assert(!categoryNames.has(category.name), `分类名重复：${category.name}`);
  assert(allowedTabIds.has(category.page), `分类 ${category.name} 使用了未定义的 tab: ${category.page}`);
  categoryIds.add(category.id);
  categoryNames.add(category.name);
}

for (const [groupName, groupLinks] of Object.entries(links)) {
  assert(categoryNames.has(groupName), `链接分组 ${groupName} 没有对应的分类。`);
  assert(Array.isArray(groupLinks), `链接分组 ${groupName} 必须是数组。`);
  for (const link of groupLinks) {
    assert(link.id, `链接分组 ${groupName} 存在缺少 id 的链接。`);
    assert(typeof link.text === 'string' && link.text.trim(), `链接 ${link.id} 缺少 text。`);
    assert(typeof link.href === 'string' && /^https?:\/\//.test(link.href), `链接 ${link.id} 的 href 非法：${link.href}`);
    assert(!Number.isNaN(Number.parseInt(String(link.seq), 10)), `链接 ${link.id} 的 seq 非法。`);
  }
}

console.log(`数据校验通过：${categories.length} 个分类，${Object.keys(links).length} 个链接分组，${allowedTabIds.size} 个 tab。`);
