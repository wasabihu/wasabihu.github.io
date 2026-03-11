(function(global) {
  global.tabGroups = [
    {
      containerId: 'tabsEx1',
      tabs: [
        { id: 'fragment-1', label: '常用' },
        { id: 'fragment-2', label: '工具' },
        { id: 'fragment-3', label: '其他' }
      ]
    },
    {
      containerId: 'tabsEx2',
      tabs: [
        { id: 'fragment-4', label: '收藏' },
        { id: 'fragment-6', label: '其他 2' }
      ]
    }
  ];
})(typeof window !== 'undefined' ? window : globalThis);
