(function(global) {
  function normalizeText(value) {
    if (typeof value !== 'string') {
      return value;
    }

    return value
      .replace(/^\uFEFF/, '')
      .replace(/\r\n/g, '\n')
      .trim();
  }

  function normalizeCategory(category) {
    return {
      id: String(category.id),
      name: normalizeText(category.name),
      seq: Number.parseInt(category.seq, 10) || 0,
      page: normalizeText(category.page) || 'fragment-1'
    };
  }

  function normalizeLink(link) {
    return {
      id: String(link.id),
      href: normalizeText(link.href),
      title: normalizeText(link.title || ''),
      text: normalizeText(link.text),
      seq: String(Number.parseInt(link.seq, 10) || 0)
    };
  }

  function normalizeBookmarkData(rawCategories, rawLinks) {
    const categories = Array.isArray(rawCategories)
      ? rawCategories.filter(Boolean).map(normalizeCategory)
      : [];

    const links = {};
    const categoryIdByName = new Map();
    const categoryIds = new Set();
    categories.forEach(category => {
      categoryIdByName.set(category.name, category.id);
      categoryIds.add(category.id);
      links[category.id] = [];
    });

    const rawLinkGroups = rawLinks && typeof rawLinks === 'object' ? rawLinks : {};
    for (const [groupKey, groupLinks] of Object.entries(rawLinkGroups)) {
      const normalizedGroupKey = normalizeText(groupKey);
      const targetCategoryId = categoryIds.has(normalizedGroupKey)
        ? normalizedGroupKey
        : categoryIdByName.get(normalizedGroupKey);

      if (!targetCategoryId) {
        continue;
      }

      links[targetCategoryId] = Array.isArray(groupLinks)
        ? groupLinks.filter(Boolean).map(normalizeLink)
        : [];
    }

    categories.forEach(category => {
      if (!Array.isArray(links[category.id])) {
        links[category.id] = [];
      }
    });

    return { categories, links };
  }

  global.normalizeText = normalizeText;
  global.normalizeBookmarkData = normalizeBookmarkData;
})(typeof window !== 'undefined' ? window : globalThis);
