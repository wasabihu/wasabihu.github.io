// dataManager.js

const CATEGORIES_STORAGE_KEY_DM = 'myBookmarks_categories_v5';
const LINKS_STORAGE_KEY_DM = 'myBookmarks_links_v5';

/**
 * 从 localStorage 加载 categories 和 links 数据。
 * @returns {object} 包含 { categories, links, success: boolean } 的对象。
 */
function loadDataFromLocalStorage_DM() {
    try {
        const storedCategories = localStorage.getItem(CATEGORIES_STORAGE_KEY_DM);
        const storedLinks = localStorage.getItem(LINKS_STORAGE_KEY_DM);
        if (storedCategories && storedLinks) {
            const loadedCategories = JSON.parse(storedCategories);
            const loadedLinks = JSON.parse(storedLinks);
            console.log("dataManager: Data loaded from localStorage.");
            return { categories: loadedCategories, links: loadedLinks, success: true };
        }
    } catch (e) {
        console.error("dataManager: Error parsing data from localStorage:", e);
        localStorage.removeItem(CATEGORIES_STORAGE_KEY_DM);
        localStorage.removeItem(LINKS_STORAGE_KEY_DM);
    }
    console.log("dataManager: No data found in localStorage or error during load.");
    return { success: false, categories: [], links: {} }; // 确保总是有返回值
}

/**
 * 将 categories 和 links 数据保存到 localStorage。
 * @param {Array} categoriesToSave 要保存的 categories 数组。
 * @param {object} linksToSave 要保存的 links 对象。
 * @param {object} [notyfInstance] (可选) Notyf 实例用于显示通知。
 */
function saveDataToLocalStorage_DM(categoriesToSave, linksToSave, notyfInstance) {
    try {
        const cats = Array.isArray(categoriesToSave) ? categoriesToSave : [];
        const lks = (typeof linksToSave === 'object' && linksToSave !== null) ? linksToSave : {};
        
        localStorage.setItem(CATEGORIES_STORAGE_KEY_DM, JSON.stringify(cats));
        localStorage.setItem(LINKS_STORAGE_KEY_DM, JSON.stringify(lks));
        console.log("dataManager: Data saved to localStorage.");
    } catch (e) {
        console.error("dataManager: Error saving data to localStorage:", e);
        if (notyfInstance && typeof notyfInstance.error === 'function') {
            notyfInstance.error("无法将更改保存到本地存储。");
        } else {
            alert("无法将更改保存到本地存储 (DM)。");
        }
    }
}

/**
 * 将当前的 categories 和 links 数据导出为 JS 文件。
 * @param {Array} categoriesToExport 要导出的 categories 数组。
 * @param {object} linksToExport 要导出的 links 对象。
 * @param {object} [notyfInstance] (可选) Notyf 实例用于显示通知。
 */
function exportDataAsJson_DM(categoriesToExport, linksToExport, notyfInstance) {
    if (typeof categoriesToExport === 'undefined' || typeof linksToExport === 'undefined') { 
        const msg = '错误: 数据未准备好导出 (from dataManager)。';
        console.error(msg);
        if (notyfInstance && typeof notyfInstance.error === 'function') {
            notyfInstance.error(msg);
        } else {
            alert(msg);
        }
        return; 
    }
    
    const categoriesFormatted = Array.isArray(categoriesToExport) ? categoriesToExport.map(cat => {
        let exportCat = { id: String(cat.id), name: cat.name };
        if (cat.hasOwnProperty('seq')) exportCat.seq = parseInt(cat.seq, 10) || 0;
        if (cat.hasOwnProperty('page')) exportCat.page = cat.page;
        return exportCat;
    }) : [];
    const categoriesString = `var initialCategories = ${JSON.stringify(categoriesFormatted, null, 4)};`;
    
    const linksFormatted = {};
    if (typeof linksToExport === 'object' && linksToExport !== null) {
        for (const catName in linksToExport) {
            if (linksToExport.hasOwnProperty(catName) && Array.isArray(linksToExport[catName])) {
                linksFormatted[catName] = linksToExport[catName].map(l => ({
                    id: String(l.id), 
                    href: l.href, 
                    title: l.title, 
                    text: l.text, 
                    seq: String(parseInt(l.seq, 10) || 0)
                }));
            }
        }
    }
    const linksString = `var initialLinks = ${JSON.stringify(linksFormatted, null, 4)};`;
    const dataJsContent = `${categoriesString}\n\n${linksString}\n`;
    const blob = new Blob([dataJsContent], { type: 'text/javascript;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const now = new Date();
    const ts = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}_${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}${now.getSeconds().toString().padStart(2,'0')}`;
    a.download = `data_export_readable_${ts}.js`;
    document.body.appendChild(a); 
    a.click();
    document.body.removeChild(a); 
    URL.revokeObjectURL(a.href);
    
    const successMsg = '人类可读的 data.js 格式檔案已開始匯出！';
    if (notyfInstance && typeof notyfInstance.success === 'function') {
        notyfInstance.success(successMsg);
    } else {
        alert(successMsg);
    }
}