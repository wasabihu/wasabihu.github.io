// index.js

// --- 全局变量定义 ---
var categories = [];
var links = {};
const CATEGORIES_STORAGE_KEY = 'myBookmarks_categories_v5'; // 更新版本号以确保新结构
const LINKS_STORAGE_KEY = 'myBookmarks_links_v5';

// --- localStorage 数据处理 ---
function loadDataFromLocalStorage() {
    try {
        const storedCategories = localStorage.getItem(CATEGORIES_STORAGE_KEY);
        const storedLinks = localStorage.getItem(LINKS_STORAGE_KEY);
        if (storedCategories && storedLinks) {
            categories = JSON.parse(storedCategories);
            links = JSON.parse(storedLinks);
            console.log("Data loaded from localStorage (v5 keys).");
            return true;
        }
    } catch (e) {
        console.error("Error parsing data from localStorage:", e);
        localStorage.removeItem(CATEGORIES_STORAGE_KEY);
        localStorage.removeItem(LINKS_STORAGE_KEY);
    }
    return false;
}

function saveDataToLocalStorage() {
    try {
        if (!Array.isArray(categories)) categories = [];
        if (typeof links !== 'object' || links === null) links = {};
        localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
        localStorage.setItem(LINKS_STORAGE_KEY, JSON.stringify(links));
        console.log("Data saved to localStorage (v5 keys).");
    } catch (e) {
        console.error("Error saving data to localStorage:", e);
        alert("无法将更改保存到本地存储。");
    }
}

// --- 文档加载完成后的初始化 ---
$(document).ready(function() {
    console.log("Document ready. Initializing application...");

    if (!loadDataFromLocalStorage()) {
        console.log("localStorage empty or load failed. Using initial data from data.js.");
        // **确保 data.js 使用 initialCategories 和 initialLinks**
        let tempCategories = (typeof initialCategories !== 'undefined' && Array.isArray(initialCategories)) ? JSON.parse(JSON.stringify(initialCategories)) : [];
        let tempLinks = (typeof initialLinks !== 'undefined' && typeof initialLinks === 'object' && initialLinks !== null) ? JSON.parse(JSON.stringify(initialLinks)) : {};

        // 为 categories 添加 seq (如果不存在) 和 page (如果不存在)
        categories = tempCategories.map((cat, index) => {
            return {
                ...cat, // 保留原有属性
                id: String(cat.id), // 确保id是字符串
                seq: cat.hasOwnProperty('seq') ? (parseInt(cat.seq, 10) || (index + 1)) : (index + 1),
                page: cat.hasOwnProperty('page') ? cat.page : 'fragment-1' // 默认 page
            };
        });
        
        links = tempLinks; // links 结构通常不需要在这里大改

        if ((categories.length > 0 || Object.keys(links).length > 0)) {
            console.log("Saving initial data (with potential new seq/page for categories) to localStorage.");
            saveDataToLocalStorage();
        }
    }

    // 按 seq 排序 categories 数组
    if (Array.isArray(categories)) {
        categories.sort((a, b) => (parseInt(a.seq, 10) || 0) - (parseInt(b.seq, 10) || 0));
    }


    // 初始化 jQuery UI Tabs
    try {
        if ($("#tabsEx1").length) $("#tabsEx1").tabs({ active: 0 });
        if ($("#tabsEx2").length) $("#tabsEx2").tabs({ active: 0 });
        console.log("jQuery UI Tabs initialized.");
    } catch(e) {
        console.error("Error initializing jQuery UI Tabs:", e);
    }

    populateCategorySelect(); // 更新下拉框
    generateLinks();          // 根据排序后的 categories 生成链接
    bindEventHandlers();      // 绑定事件

    $('#item_select').on('change', function() {
        if ($(this).val() === 'add') {
            $('#item_id').val(''); $('#it_title').val('');
            var newSort = Array.isArray(categories) && categories.length > 0 ? Math.max(0, ...categories.map(c => parseInt(c.sort || c.seq, 10) || 0)) + 1 : 1;
            $('#it_seq').val(newSort); $('#it_page').val('fragment-1');
            showModal('editItemDiv'); $(this).val("0");
        }
    });

    $('#showAddLinkFormButton').on('click', function() {
        clean_hyplink_form();
        var activeTabPanel = $(".tabs .ui-tabs-panel:not([style*='display: none'], .ui-tabs-hide)");
        var activeTabFragmentId = activeTabPanel.length ? activeTabPanel.attr('id') : null;
        var preSelectedCategoryId = "0";
        if (activeTabFragmentId && Array.isArray(categories)) {
            var firstCategoryInActiveTab = categories.find(cat => cat && cat.page === activeTabFragmentId);
            if (firstCategoryInActiveTab) preSelectedCategoryId = firstCategoryInActiveTab.id;
        }
        if (preSelectedCategoryId === "0" && Array.isArray(categories) && categories.length > 0 && categories[0] && categories[0].id) {
            preSelectedCategoryId = categories[0].id;
        }
        $('#item_select').val(preSelectedCategoryId); settingLastSeq(preSelectedCategoryId);
        showModal('linkContent');
    });
    console.log("Application initialization complete.");
});

// --- UI 更新与交互函数 ---
function populateCategorySelect() {
    var select = $('#item_select');
    if (!select.length) { console.error("Element '#item_select' not found."); return; }
    select.empty().append($('<option>', { value: "0", text: "------------------" }));
    if (Array.isArray(categories)) {
        // 下拉框中的分类也应该按 seq 排序 (如果需要)
        const sortedCategoriesForSelect = [...categories].sort((a, b) => (parseInt(a.seq, 10) || 0) - (parseInt(b.seq, 10) || 0));
        sortedCategoriesForSelect.forEach(cat => {
            if (cat && cat.id && cat.name) select.append($('<option>', { value: cat.id, text: cat.name }));
        });
    }
    select.append($('<option>', { value: "add", text: "新增分类" }).addClass("thickbox"));
}

function generateLinks() {
    var fragmentSelectors = ['#fragment-1', '#fragment-2', '#fragment-3', '#fragment-4', '#fragment-6'];
    var fragments = {};
    fragmentSelectors.forEach(selector => {
        var element = $(selector);
        if (element.length) fragments[selector.substring(1)] = element.empty();
    });

    if (!Array.isArray(categories) || typeof links !== 'object' || links === null) return;

    // 确保 categories 是按 seq 排序的
    const sortedCategories = [...categories].sort((a, b) => (parseInt(a.seq, 10) || 0) - (parseInt(b.seq, 10) || 0));

    sortedCategories.forEach(category => {
        if (!category || !category.name) return;
        var categoryName = category.name;
        if (links.hasOwnProperty(categoryName) && Array.isArray(links[categoryName]) && links[categoryName].length > 0) {
            var categoryContainer = $('<div>').addClass('category-container').attr('data-category', categoryName);
            var categoryTitle = $('<h3>').addClass('category-title').text(categoryName);
            var linksContainer = $('<div>').addClass('links-container');
            // 对当前分类下的链接也按 seq 排序
            var sortedLinks = [...links[categoryName]].sort((a,b) => (parseInt(a.seq,10)||0) - (parseInt(b.seq,10)||0));
            
            sortedLinks.forEach(linkData => {
                if (linkData && typeof linkData.href !== 'undefined' && (typeof linkData.text !== 'undefined' && linkData.text !== null)) {
                    linksContainer.append(createLinkElement(linkData));
                }
            });
            categoryContainer.append(categoryTitle).append(linksContainer);
            // 分类现在有 page 属性，用它来决定放到哪个 fragment
            var targetFragmentId = category.page || 'fragment-1'; // 默认到 fragment-1
            if (fragments[targetFragmentId]) {
                fragments[targetFragmentId].append(categoryContainer);
            } else if (fragments['fragment-1']) { // Fallback
                console.warn(`Target fragment '${targetFragmentId}' not found for category '${categoryName}'. Appending to fragment-1.`);
                fragments['fragment-1'].append(categoryContainer);
            }
        }
    });
}

function bindEventHandlers() {
    console.log("Binding event handlers...");
    $('#edit_link_but').off('click').on('click', editLink);
    $('#edit_item_but').off('click').on('click', editCategory);
    $('#exportDataButton').off('click').on('click', exportDataAsJson);
    $('#cancelLinkModalButton').off('click').on('click', () => hideModal('linkContent'));
    $('#cancelCategoryModalButton').off('click').on('click', () => hideModal('editItemDiv'));
    $('#deleteCurrentLinkButtonInForm').off('click').on('click', function(e) {
        e.preventDefault(); if (confirm('您确定要删除这个链接吗？')) deleteLink();
    });

    if ($('#content').length === 0) {
        console.error("CRITICAL: '#content' element for event delegation not found!"); return;
    }
    // ** DOUBLE CLICK EVENT HANDLER **
    $('#content').off('dblclick.editLink').on('dblclick.editLink', '.links-container a.link', function(event) {
        console.log('Link dblclick event FIRED on (ID):', this.id, '| Text:', $(this).text());
        event.preventDefault();
        event.stopImmediatePropagation();
        console.log('Default dblclick action prevented. Calling editLinkForm.');
        editLinkForm.call(this);
        return false;
    });

    $('#content').off('dblclick.editCategory').on('dblclick.editCategory', '.category-container .category-title', function(event) {
        event.preventDefault(); editCategoryForm.call(this);
    });
    console.log("Event handlers bound.");
}

// --- 核心数据操作函数 ---
function editLink(event) {
    if (event) event.preventDefault();
    var linkId = $('#link_id').val();
    var linkName = $('#name').val().trim();
    var linkHref = $('#href').val().trim();
    var linkDescription = $('#description').val().trim();
    var linkSeq = $('#seq').val().trim() || '1';
    var selectedCategoryId = $('#item_select').val();

    if (!linkName || !linkHref || selectedCategoryId === "0") { alert('名称、网址和所属分类不能为空！'); return; }
    var categoryObj = Array.isArray(categories) ? categories.find(cat => cat && cat.id === selectedCategoryId) : null;
    if (!categoryObj) { alert('选择的分类无效！'); return; }
    var selectedCategoryName = categoryObj.name;

    if (linkId === '') {
        var newLink = { id: 'link-' + generateUniqueId(), href: linkHref, title: linkDescription, text: linkName, seq: linkSeq };
        if (!links[selectedCategoryName] || !Array.isArray(links[selectedCategoryName])) links[selectedCategoryName] = [];
        links[selectedCategoryName].push(newLink);
    } else {
        let found = false;
        for (var catNameKey in links) {
            if (links.hasOwnProperty(catNameKey) && Array.isArray(links[catNameKey])) {
                let linkIdx = links[catNameKey].findIndex(l => l && l.id === linkId);
                if (linkIdx !== -1) {
                    let linkToUpdate = links[catNameKey][linkIdx];
                    let originalCategoryName = catNameKey;
                    linkToUpdate.href = linkHref; linkToUpdate.title = linkDescription;
                    linkToUpdate.text = linkName; linkToUpdate.seq = linkSeq;
                    if (originalCategoryName !== selectedCategoryName) {
                        links[originalCategoryName].splice(linkIdx, 1);
                        if (!links[selectedCategoryName] || !Array.isArray(links[selectedCategoryName])) links[selectedCategoryName] = [];
                        links[selectedCategoryName].push(linkToUpdate);
                    }
                    found = true; break;
                }
            }
        }
        if (!found) { alert('错误：未找到要更新的链接！'); return; }
    }
    saveDataToLocalStorage(); generateLinks(); hideModal('linkContent'); alert('链接操作成功！');
}

function editCategory(event) {
    if (event) event.preventDefault();
    var categoryId = $('#item_id').val();
    var categoryTitle = $('#it_title').val().trim();
    var categorySortInput = $('#it_seq').val().trim(); // 这是用户输入的 seq
    var categoryPage = $('#it_page').val().trim();

    if (!categoryTitle || !categoryPage) { alert('分类名称和Page不能为空！'); return; }
    
    var currentSeqValue = (Array.isArray(categories) && categories.length > 0 ? Math.max(0, ...categories.map(c => parseInt(c.seq, 10) || 0)) + 1 : 1);
    var finalSeq = categorySortInput ? (parseInt(categorySortInput, 10) || currentSeqValue) : currentSeqValue;


    if (categoryId === '') { // 新增
        if (Array.isArray(categories) && categories.some(cat => cat && cat.name === categoryTitle)) { alert('分类名称已存在！'); return; }
        var newCategory = { 
            id: 'cat-' + generateUniqueId(), 
            name: categoryTitle, 
            seq: finalSeq, // 使用计算或输入的 seq
            page: categoryPage 
        };
        if (!Array.isArray(categories)) categories = [];
        categories.push(newCategory);
        if (!links[newCategory.name]) links[newCategory.name] = [];
    } else { // 修改
        if (!Array.isArray(categories)) { alert('错误: 分类数据无效。'); return;}
        var catIdx = categories.findIndex(cat => cat && cat.id === categoryId);
        if (catIdx === -1) { alert('错误：未找到要更新的分类！'); return; }
        var oldCategoryName = categories[catIdx].name;
        if (oldCategoryName !== categoryTitle && categories.some(c => c && c.name === categoryTitle && c.id !== categoryId)) {
            alert('修改后的分类名称冲突！'); return;
        }
        categories[catIdx].name = categoryTitle; 
        categories[catIdx].seq = finalSeq; // 更新 seq
        categories[catIdx].page = categoryPage;
        if (oldCategoryName !== categoryTitle && links.hasOwnProperty(oldCategoryName)) {
            links[categoryTitle] = links[oldCategoryName]; delete links[oldCategoryName];
        }
    }
    if (Array.isArray(categories)) { // 排序 categories 数组
       categories.sort((a, b) => (parseInt(a.seq, 10) || 0) - (parseInt(b.seq, 10) || 0));
    }
    saveDataToLocalStorage(); populateCategorySelect(); generateLinks(); hideModal('editItemDiv'); alert('分类操作成功！');
}

function deleteLink() {
    var linkIdToDelete = $('#link_id').val();
    if (!linkIdToDelete) { alert('无法确定要删除哪个链接。'); return; }
    let deleted = false;
    for (var catName in links) {
        if (links.hasOwnProperty(catName) && Array.isArray(links[catName])) {
            let linkIdx = links[catName].findIndex(l => l && l.id === linkIdToDelete);
            if (linkIdx !== -1) { links[catName].splice(linkIdx, 1); deleted = true; break; }
        }
    }
    if (deleted) { saveDataToLocalStorage(); generateLinks(); hideModal('linkContent'); alert('链接已成功删除！'); }
    else { alert('在数据中未找到要删除的链接。'); }
    clean_hyplink_form();
}

// --- 辅助函数 ---
function generateUniqueId() { return Date.now().toString(36) + Math.random().toString(36).substring(2, 9); }

function createLinkElement(linkData) {
    if (!linkData) { return $('<a>').addClass('link link-error').text('错误链接'); }
    var linkText = (typeof linkData.text === 'string' && linkData.text.trim() !== '') ? linkData.text.trim() : "未命名链接";
    return $('<a>')
        .attr({ href: linkData.href || '#', title: linkData.title || linkText, id: linkData.id || ('link-' + generateUniqueId()), target: '_blank' })
        .addClass('link')
        .text(linkText);
}

function clean_hyplink_form() { $('#link_id,#name,#href,#description,#seq').val(''); $('#item_select').val("0"); }

function settingLastSeq(selectedCategoryId) {
    var seq = 1;
    if (selectedCategoryId && selectedCategoryId !== "0" && Array.isArray(categories) && typeof links === 'object' && links !== null) {
        var category = categories.find(cat => cat && cat.id === selectedCategoryId);
        if (category && links[category.name] && Array.isArray(links[category.name]) && links[category.name].length > 0) {
            const sequences = links[category.name].map(l => parseInt(l.seq, 10)).filter(s => !isNaN(s));
            if (sequences.length > 0) seq = Math.max(0, ...sequences) + 1;
        }
    }
    $('#seq').val(seq);
}

function showModal(modalId) { $('#' + modalId).show(); }
function hideModal(modalId) { $('#' + modalId).hide(); }

function editLinkForm() {
    var linkElement = $(this);
    console.log("editLinkForm called by (ID):", linkElement.attr('id'), "| Text:", linkElement.text());
    clean_hyplink_form();
    $('#link_id').val(linkElement.attr('id'));
    $('#name').val(linkElement.text());
    $('#href').val(linkElement.attr('href'));
    $('#description').val(linkElement.attr('title'));
    var categoryContainer = linkElement.closest('.category-container');
    if (!categoryContainer.length) {
        console.error("Cannot find .category-container for link:", linkElement.attr('id'));
        $('#item_select').val("0"); $('#seq').val('1'); showModal('linkContent'); return;
    }
    var categoryNameData = categoryContainer.data('category');
    if (Array.isArray(categories) && typeof links === 'object' && links !== null) {
        var categoryObj = categories.find(cat => cat && cat.name === categoryNameData);
        if (categoryObj) {
            $('#item_select').val(categoryObj.id);
            if (links[categoryNameData] && Array.isArray(links[categoryNameData])) {
                var linkData = links[categoryNameData].find(l => l && l.id === linkElement.attr('id'));
                if (linkData) $('#seq').val(linkData.seq || '1'); else $('#seq').val('1');
            } else { $('#seq').val('1'); }
        } else { $('#item_select').val("0"); $('#seq').val('1'); }
    } else { $('#item_select').val("0"); $('#seq').val('1'); }
    showModal('linkContent');
}

function editCategoryForm() {
    var categoryTitleElement = $(this);
    var categoryContainer = categoryTitleElement.closest('.category-container');
    if(!categoryContainer.length) { console.error("Cannot find .category-container for category title."); return; }
    var categoryNameData = categoryContainer.data('category');
    if (Array.isArray(categories)) {
        var category = categories.find(cat => cat && cat.name === categoryNameData);
        if (category) {
            $('#item_id').val(category.id); $('#it_title').val(category.name);
            $('#it_seq').val(category.hasOwnProperty('seq') ? category.seq : ''); // 使用 category.seq
            $('#it_page').val(category.hasOwnProperty('page') ? category.page : 'fragment-1');
            showModal('editItemDiv');
        } else { alert('找不到分类 "' + categoryNameData + '" 的详细信息。'); }
    }
}

function exportDataAsJson() {
    if (typeof categories === 'undefined' || typeof links === 'undefined') { alert('错误: 数据未准备好导出。'); return; }
    const categoriesToExport = Array.isArray(categories) ? categories.map(cat => {
        let exportCat = { id: cat.id, name: cat.name };
        // 只导出实际存在的属性，并符合期望的 data.js 结构
        if (cat.hasOwnProperty('seq')) exportCat.seq = parseInt(cat.seq, 10) || 0; // 确保 seq 是数字
        if (cat.hasOwnProperty('page')) exportCat.page = cat.page;
        // 如果你的 data.js 中还有其他分类属性，在这里添加
        return exportCat;
    }) : [];

    const categoriesString = `var initialCategories = ${JSON.stringify(categoriesToExport, null, 4)};`;
    const linksToExport = {};
    if (typeof links === 'object' && links !== null) {
        for (const catName in links) {
            if (links.hasOwnProperty(catName) && Array.isArray(links[catName])) {
                linksToExport[catName] = links[catName].map(l => ({
                    id: l.id, href: l.href, title: l.title, text: l.text, 
                    seq: parseInt(l.seq, 10) || 0 // 确保 seq 是数字
                }));
            }
        }
    }
    const linksString = `var initialLinks = ${JSON.stringify(linksToExport, null, 4)};`;
    const dataJsContent = `${categoriesString}\n\n${linksString}\n`;
    const blob = new Blob([dataJsContent], { type: 'text/javascript;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const now = new Date();
    const ts = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}_${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}${now.getSeconds().toString().padStart(2,'0')}`;
    a.download = `data_export_readable_${ts}.js`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(a.href);
    alert('人类可读的 data.js 格式檔案已開始匯出！');
}