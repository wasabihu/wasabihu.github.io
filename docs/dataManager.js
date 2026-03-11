// dataManager.js

const CATEGORIES_STORAGE_KEY_DM = 'myBookmarks_categories_v5';
const LINKS_STORAGE_KEY_DM = 'myBookmarks_links_v5';
const REMOTE_DATA_URL_DM = 'https://wasabihu.github.io/data.js';

function loadDataFromLocalStorage_DM() {
    try {
        const storedCategories = localStorage.getItem(CATEGORIES_STORAGE_KEY_DM);
        const storedLinks = localStorage.getItem(LINKS_STORAGE_KEY_DM);
        if (storedCategories && storedLinks) {
            const loadedCategories = JSON.parse(storedCategories);
            const loadedLinks = JSON.parse(storedLinks);
            console.log('dataManager: Data loaded from localStorage.');
            return { categories: loadedCategories, links: loadedLinks, success: true };
        }
    } catch (error) {
        console.error('dataManager: Error parsing data from localStorage:', error);
        localStorage.removeItem(CATEGORIES_STORAGE_KEY_DM);
        localStorage.removeItem(LINKS_STORAGE_KEY_DM);
    }

    console.log('dataManager: No data found in localStorage or error during load.');
    return { success: false, categories: [], links: {} };
}

function saveDataToLocalStorage_DM(categoriesToSave, linksToSave, notyfInstance) {
    try {
        const categories = Array.isArray(categoriesToSave) ? categoriesToSave : [];
        const links = typeof linksToSave === 'object' && linksToSave !== null ? linksToSave : {};

        localStorage.setItem(CATEGORIES_STORAGE_KEY_DM, JSON.stringify(categories));
        localStorage.setItem(LINKS_STORAGE_KEY_DM, JSON.stringify(links));
        console.log('dataManager: Data saved to localStorage.');
    } catch (error) {
        console.error('dataManager: Error saving data to localStorage:', error);
        if (notyfInstance && typeof notyfInstance.error === 'function') {
            notyfInstance.error('无法将更改保存到本地存储。');
        } else {
            alert('无法将更改保存到本地存储。');
        }
    }
}

function parseDataJsContent_DM(dataJsContent) {
    if (typeof dataJsContent !== 'string' || !dataJsContent.trim()) {
        throw new Error('远程 data.js 内容为空。');
    }

    const parsed = new Function(`"use strict";\n${dataJsContent}\nreturn { initialCategories, initialLinks };`)();
    if (!parsed || !Array.isArray(parsed.initialCategories) || typeof parsed.initialLinks !== 'object' || parsed.initialLinks === null) {
        throw new Error('远程 data.js 内容格式无效。');
    }

    return parsed;
}

async function syncRemoteDataToLocalStorage_DM(options = {}) {
    const {
        url = REMOTE_DATA_URL_DM,
        normalizeBookmarkDataFn,
        notyfInstance
    } = options;

    if (typeof normalizeBookmarkDataFn !== 'function') {
        throw new Error('缺少 normalizeBookmarkDataFn，无法同步远程数据。');
    }

    try {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const remoteDataJs = await response.text();
        const parsedData = parseDataJsContent_DM(remoteDataJs);
        const normalizedData = normalizeBookmarkDataFn(parsedData.initialCategories, parsedData.initialLinks);
        saveDataToLocalStorage_DM(normalizedData.categories, normalizedData.links, notyfInstance);

        const successMessage = '远程 data.js 已同步到本地。';
        if (notyfInstance && typeof notyfInstance.success === 'function') {
            notyfInstance.success(successMessage);
        }

        return normalizedData;
    } catch (error) {
        const message = `同步远程 data.js 失败：${error.message}`;
        console.error(message, error);
        if (notyfInstance && typeof notyfInstance.error === 'function') {
            notyfInstance.error(message);
        }
        throw error;
    }
}

function exportDataAsJson_DM(categoriesToExport, linksToExport, notyfInstance) {
    if (typeof categoriesToExport === 'undefined' || typeof linksToExport === 'undefined') {
        const message = '错误：数据未准备好，无法导出。';
        console.error(message);
        if (notyfInstance && typeof notyfInstance.error === 'function') {
            notyfInstance.error(message);
        } else {
            alert(message);
        }
        return;
    }

    const categoriesFormatted = Array.isArray(categoriesToExport)
        ? categoriesToExport.map(category => ({
            id: String(category.id),
            name: category.name,
            seq: parseInt(category.seq, 10) || 0,
            page: category.page
        }))
        : [];
    const categoriesString = `var initialCategories = ${JSON.stringify(categoriesFormatted, null, 4)};`;

    const linksFormatted = {};
    if (typeof linksToExport === 'object' && linksToExport !== null) {
        for (const categoryId in linksToExport) {
            if (!Object.prototype.hasOwnProperty.call(linksToExport, categoryId) || !Array.isArray(linksToExport[categoryId])) {
                continue;
            }

            linksFormatted[String(categoryId)] = linksToExport[categoryId].map(link => ({
                id: String(link.id),
                href: link.href,
                title: link.title,
                text: link.text,
                seq: String(parseInt(link.seq, 10) || 0)
            }));
        }
    }

    const linksString = `var initialLinks = ${JSON.stringify(linksFormatted, null, 4)};`;
    const dataJsContent = `${categoriesString}\n\n${linksString}\n`;
    const blob = new Blob([dataJsContent], { type: 'text/javascript;charset=utf-8;' });
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);

    const now = new Date();
    const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
    anchor.download = `data_export_readable_${timestamp}.js`;

    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(anchor.href);

    const successMessage = '可读格式的 data.js 数据已开始导出。';
    if (notyfInstance && typeof notyfInstance.success === 'function') {
        notyfInstance.success(successMessage);
    } else {
        alert(successMessage);
    }
}
