import fs from 'node:fs';
import vm from 'node:vm';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function createLocalStorage(initialStore = {}, options = {}) {
  const store = { ...initialStore };
  const removedKeys = [];
  return {
    store,
    removedKeys,
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key, value) {
      if (options.throwOnSetItem) {
        throw new Error('setItem failed');
      }
      store[key] = String(value);
    },
    removeItem(key) {
      removedKeys.push(key);
      delete store[key];
    },
    clear() {
      Object.keys(store).forEach(key => delete store[key]);
    }
  };
}

function createRuntime(extraContext = {}) {
  const code = fs.readFileSync('docs/dataManager.js', 'utf8');
  const logs = { alert: [], blobParts: [], appendCount: 0, removeCount: 0, clickCount: 0, revoked: [] };
  const anchors = [];
  const fakeBody = {
    appendChild(node) {
      logs.appendCount += 1;
      anchors.push(node);
    },
    removeChild(node) {
      logs.removeCount += 1;
      const index = anchors.indexOf(node);
      if (index >= 0) {
        anchors.splice(index, 1);
      }
    }
  };

  function Blob(parts, options) {
    this.parts = parts;
    this.options = options;
    logs.blobParts.push({ parts, options });
  }

  const context = {
    console,
    alert(message) {
      logs.alert.push(message);
    },
    Blob,
    document: {
      body: fakeBody,
      createElement(tagName) {
        assert(tagName === 'a', 'exportDataAsJson_DM 应创建 a 标签。');
        return {
          href: '',
          download: '',
          click() {
            logs.clickCount += 1;
          }
        };
      }
    },
    URL: {
      createObjectURL() {
        return 'blob:test-url';
      },
      revokeObjectURL(url) {
        logs.revoked.push(url);
      }
    },
    Date: class FakeDate extends Date {
      constructor(...args) {
        if (args.length > 0) {
          super(...args);
          return;
        }
        super('2026-03-11T14:22:33Z');
      }
    },
    fetch: async () => {
      throw new Error('fetch not stubbed');
    },
    ...extraContext
  };

  vm.createContext(context);
  vm.runInContext(code, context, { filename: 'docs/dataManager.js' });
  return { context, logs, anchors };
}

function testLoadSuccess() {
  const localStorage = createLocalStorage({
    myBookmarks_categories_v5: JSON.stringify([{ id: '1', name: '分类', seq: 1, page: 'fragment-1' }]),
    myBookmarks_links_v5: JSON.stringify({ '1': [{ id: 'l1', text: '链接', href: 'https://example.com', title: '', seq: '1' }] })
  });
  const { context } = createRuntime();
  context.localStorage = localStorage;

  const result = context.loadDataFromLocalStorage_DM();
  assert(result.success === true, 'loadDataFromLocalStorage_DM 应返回 success=true。');
  assert(Array.isArray(result.categories) && result.categories.length === 1, 'loadDataFromLocalStorage_DM 应读出分类数据。');
  assert(Array.isArray(result.links['1']) && result.links['1'].length === 1, 'loadDataFromLocalStorage_DM 应读出链接数据。');
}

function testLoadFailureClearsCorruptedData() {
  const localStorage = createLocalStorage({
    myBookmarks_categories_v5: '{bad json',
    myBookmarks_links_v5: '{bad json'
  });
  const { context } = createRuntime();
  context.localStorage = localStorage;

  const result = context.loadDataFromLocalStorage_DM();
  assert(result.success === false, '损坏数据时应返回 success=false。');
  assert(localStorage.removedKeys.includes('myBookmarks_categories_v5'), '损坏数据时应清理 categories 存储。');
  assert(localStorage.removedKeys.includes('myBookmarks_links_v5'), '损坏数据时应清理 links 存储。');
}

function testSaveSuccess() {
  const localStorage = createLocalStorage();
  const { context } = createRuntime();
  context.localStorage = localStorage;

  context.saveDataToLocalStorage_DM([{ id: '1' }], { '1': [{ id: 'l1' }] }, null);
  assert(localStorage.store.myBookmarks_categories_v5 === JSON.stringify([{ id: '1' }]), 'saveDataToLocalStorage_DM 应写入 categories。');
  assert(localStorage.store.myBookmarks_links_v5 === JSON.stringify({ '1': [{ id: 'l1' }] }), 'saveDataToLocalStorage_DM 应写入 links。');
}

function testSaveFailureUsesNotyf() {
  const localStorage = createLocalStorage({}, { throwOnSetItem: true });
  const { context } = createRuntime();
  context.localStorage = localStorage;
  const errors = [];
  const notyf = { error(message) { errors.push(message); } };

  context.saveDataToLocalStorage_DM([{ id: '1' }], { '1': [] }, notyf);
  assert(errors.includes('无法将更改保存到本地存储。'), 'saveDataToLocalStorage_DM 失败时应提示 notyf.error。');
}

function testExportFailureUsesNotyf() {
  const { context } = createRuntime();
  const errors = [];
  const notyf = { error(message) { errors.push(message); } };

  context.exportDataAsJson_DM(undefined, undefined, notyf);
  assert(errors.includes('错误：数据未准备好，无法导出。'), 'exportDataAsJson_DM 缺少数据时应提示导出失败。');
}

function testExportSuccess() {
  const { context, logs } = createRuntime();
  const successes = [];
  const notyf = { success(message) { successes.push(message); } };

  context.exportDataAsJson_DM(
    [{ id: 7, name: '开发', seq: '2', page: 'fragment-1' }],
    { '7': [{ id: 9, href: 'https://example.com', title: '说明', text: '示例', seq: 5 }] },
    notyf
  );

  assert(logs.blobParts.length === 1, 'exportDataAsJson_DM 应创建一个 Blob。');
  const exportContent = String(logs.blobParts[0].parts[0]);
  assert(exportContent.includes('var initialCategories = '), '导出内容必须包含 initialCategories。');
  assert(exportContent.includes('var initialLinks = '), '导出内容必须包含 initialLinks。');
  assert(exportContent.includes('"7": ['), '导出 links 时必须按分类 id 作为键。');
  assert(!exportContent.includes('开发": ['), '导出 links 时不应按分类名作为键。');
  assert(logs.blobParts[0].options.type === 'text/javascript;charset=utf-8;', '导出 Blob 类型必须正确。');
  assert(logs.appendCount === 1 && logs.removeCount === 1, '导出时应插入并移除下载链接。');
  assert(logs.clickCount === 1, '导出时应触发一次点击下载。');
  assert(logs.revoked.includes('blob:test-url'), '导出后应释放 Blob URL。');
  assert(successes.includes('可读格式的 data.js 数据已开始导出。'), '导出成功时应提示 notyf.success。');
}

function testParseRemoteDataJs() {
  const { context } = createRuntime();
  const parsed = context.parseDataJsContent_DM(
    `var initialCategories = [{"id":"1","name":"分类","seq":1,"page":"fragment-1"}];\nvar initialLinks = {"1":[{"id":"l1","href":"https://example.com","title":"","text":"链接","seq":"1"}]};`
  );
  assert(Array.isArray(parsed.initialCategories) && parsed.initialCategories.length === 1, 'parseDataJsContent_DM 应解析 categories。');
  assert(Array.isArray(parsed.initialLinks['1']) && parsed.initialLinks['1'].length === 1, 'parseDataJsContent_DM 应解析 links。');
}

async function testSyncRemoteDataSuccess() {
  const localStorage = createLocalStorage();
  const fetchCalls = [];
  const fetch = async (url, options) => {
    fetchCalls.push({ url, options });
    return {
      ok: true,
      text: async () => `var initialCategories = [{"id":"1","name":"远程分类","seq":1,"page":"fragment-1"}];\nvar initialLinks = {"1":[{"id":"l1","href":"https://example.com","title":"","text":"远程链接","seq":"1"}]};`
    };
  };
  const { context } = createRuntime({ fetch });
  context.localStorage = localStorage;
  const successes = [];
  const normalizedCalls = [];
  const normalizeBookmarkDataFn = (categories, links) => {
    normalizedCalls.push({ categories, links });
    return { categories, links };
  };

  const result = await context.syncRemoteDataToLocalStorage_DM({
    normalizeBookmarkDataFn,
    notyfInstance: { success(message) { successes.push(message); } }
  });

  assert(result.categories[0].name === '远程分类', 'syncRemoteDataToLocalStorage_DM 应返回远程分类数据。');
  assert(JSON.parse(localStorage.store.myBookmarks_categories_v5)[0].name === '远程分类', 'syncRemoteDataToLocalStorage_DM 应覆盖本地 categories。');
  assert(JSON.parse(localStorage.store.myBookmarks_links_v5)['1'][0].text === '远程链接', 'syncRemoteDataToLocalStorage_DM 应覆盖本地 links。');
  assert(normalizedCalls.length === 1, 'syncRemoteDataToLocalStorage_DM 应调用数据标准化函数。');
  assert(successes.includes('远程 data.js 已同步到本地。'), 'syncRemoteDataToLocalStorage_DM 成功时应提示成功。');
  assert(fetchCalls.length === 1 && fetchCalls[0].options.cache === 'no-store', 'syncRemoteDataToLocalStorage_DM 应以 no-store 拉取远程数据。');
}

async function testSyncRemoteDataFailureUsesNotyf() {
  const localStorage = createLocalStorage();
  const fetch = async () => ({ ok: false, status: 503, text: async () => '' });
  const { context } = createRuntime({ fetch });
  context.localStorage = localStorage;
  const errors = [];
  let threw = false;
  try {
    await context.syncRemoteDataToLocalStorage_DM({
      normalizeBookmarkDataFn: (categories, links) => ({ categories, links }),
      notyfInstance: { error(message) { errors.push(message); } }
    });
  } catch (error) {
    threw = true;
  }
  assert(threw, 'syncRemoteDataToLocalStorage_DM 远程失败时应抛出错误。');
  assert(errors.some(message => message.includes('同步远程 data.js 失败')), 'syncRemoteDataToLocalStorage_DM 失败时应提示 notyf.error。');
}

await testSyncRemoteDataSuccess();
await testSyncRemoteDataFailureUsesNotyf();
testLoadSuccess();
testLoadFailureClearsCorruptedData();
testSaveSuccess();
testSaveFailureUsesNotyf();
testExportFailureUsesNotyf();
testExportSuccess();
testParseRemoteDataJs();

console.log('dataManager 运行级测试通过。');
