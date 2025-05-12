// index.js

// --- 全局变量定义 ---
var categories = [];
var links = {};
const CATEGORIES_STORAGE_KEY = 'myBookmarks_categories_v3'; // Updated key for fresh start if needed
const LINKS_STORAGE_KEY = 'myBookmarks_links_v3';

// --- localStorage 数据处理 ---
function loadDataFromLocalStorage() {
    try {
        const storedCategories = localStorage.getItem(CATEGORIES_STORAGE_KEY);
        const storedLinks = localStorage.getItem(LINKS_STORAGE_KEY);
        if (storedCategories && storedLinks) {
            categories = JSON.parse(storedCategories);
            links = JSON.parse(storedLinks);
            console.log("Data loaded from localStorage.");
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
        console.log("Data saved to localStorage.");
    } catch (e) {
        console.error("Error saving data to localStorage:", e);
        alert("无法将更改保存到本地存储。");
    }
}

// --- 文档加载完成后的初始化 ---
$(document).ready(function() {
    console.log("Document ready. Initializing...");

    if (!loadDataFromLocalStorage()) {
        console.log("No data in localStorage or load failed. Using initial data from data.js.");
        // **IMPORTANT**: Ensure data.js defines initialCategories and initialLinks
        categories = (typeof initialCategories !== 'undefined' && Array.isArray(initialCategories)) ? JSON.parse(JSON.stringify(initialCategories)) : [];
        links = (typeof initialLinks !== 'undefined' && typeof initialLinks === 'object' && initialLinks !== null) ? JSON.parse(JSON.stringify(initialLinks)) : {};
        
        if ((categories.length > 0 || Object.keys(links).length > 0)) {
            console.log("Saving initial data from data.js to localStorage.");
            saveDataToLocalStorage();
        }
    }

    // 初始化 jQuery UI Tabs
    // jQuery UI 1.9+ initializes on the main tabs div
    if ($("#tabsEx1").length) $("#tabsEx1").tabs({ active: 0 }); else console.warn("#tabsEx1 not found.");
    if ($("#tabsEx2").length) $("#tabsEx2").tabs({ active: 0 }); else console.warn("#tabsEx2 not found.");
    console.log("jQuery UI Tabs initialization attempted.");

    populateCategorySelect();
    generateLinks();
    bindEventHandlers();

    $('#item_select').on('change', function() {
        if ($(this).val() === 'add') {
            $('#item_id').val(''); $('#it_title').val('');
            var newSort = categories.length > 0 ? Math.max(0, ...categories.map(c => parseInt(c.sort, 10) || 0)) + 1 : 1;
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
    console.log("Initialization complete.");
});

// --- UI 更新与交互函数 ---
function populateCategorySelect() {
    var select = $('#item_select');
    if (!select.length) { console.error("Element '#item_select' not found."); return; }
    select.empty().append($('<option>', { value: "0", text: "------------------" }));
    if (Array.isArray(categories)) {
        categories.forEach(cat => {
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

    categories.forEach(category => {
        if (!category || !category.name) return;
        var categoryName = category.name;
        if (links.hasOwnProperty(categoryName) && Array.isArray(links[categoryName]) && links[categoryName].length > 0) {
            var categoryContainer = $('<div>').addClass('category-container').attr('data-category', categoryName);
            var categoryTitle = $('<h3>').addClass('category-title').text(categoryName);
            var linksContainer = $('<div>').addClass('links-container');
            var sortedLinks = [...links[categoryName]].sort((a,b) => (parseInt(a.seq,10)||0) - (parseInt(b.seq,10)||0));
            sortedLinks.forEach(linkData => {
                if (linkData && typeof linkData.href !== 'undefined' && (typeof linkData.text !== 'undefined' && linkData.text !== null)) {
                    linksContainer.append(createLinkElement(linkData));
                }
            });
            categoryContainer.append(categoryTitle).append(linksContainer);
            var targetFragmentId = category.page || 'fragment-1';
            if (fragments[targetFragmentId]) fragments[targetFragmentId].append(categoryContainer);
            else if (fragments['fragment-1']) fragments['fragment-1'].append(categoryContainer);
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
        console.error("CRITICAL: '#content' element missing. Event delegation for dblclick will fail.");
        return;
    }
    // ** CRITICAL FIX FOR DOUBLE CLICK **
    $('#content').off('dblclick.editLink').on('dblclick.editLink', '.links-container a.link', function(event) {
        console.log('Link dblclick event FIRED on:', this.id, 'Text:', $(this).text());
        event.preventDefault();       // FIRST THING: Prevent default action (navigation)
        event.stopImmediatePropagation(); // Prevent other handlers on this element for this event
        console.log('Default action prevented. Calling editLinkForm.');
        editLinkForm.call(this);      // Call the edit form function
        return false;                 // Further ensure no other actions
    });

    $('#content').off('dblclick.editCategory').on('dblclick.editCategory', '.category-container .category-title', function(event) {
        event.preventDefault();
        editCategoryForm.call(this);
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
    var categoryObj = categories.find(cat => cat && cat.id === selectedCategoryId);
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
    var categorySort = $('#it_seq').val().trim();
    var categoryPage = $('#it_page').val().trim();
    if (!categoryTitle || !categoryPage) { alert('分类名称和Page不能为空！'); return; }
    var defaultSort = (Array.isArray(categories) && categories.length > 0 ? Math.max(0, ...categories.map(c => parseInt(c.sort, 10) || 0)) + 1 : 1).toString();
    categorySort = categorySort || defaultSort;

    if (categoryId === '') {
        if (Array.isArray(categories) && categories.some(cat => cat && cat.name === categoryTitle)) { alert('分类名称已存在！'); return; }
        var newCategory = { id: 'cat-' + generateUniqueId(), name: categoryTitle, sort: categorySort, page: categoryPage };
        if (!Array.isArray(categories)) categories = [];
        categories.push(newCategory);
        if (!links[newCategory.name]) links[newCategory.name] = [];
    } else {
        if (!Array.isArray(categories)) { alert('错误: 分类数据无效。'); return;}
        var catIdx = categories.findIndex(cat => cat && cat.id === categoryId);
        if (catIdx === -1) { alert('错误：未找到要更新的分类！'); return; }
        var oldCategoryName = categories[catIdx].name;
        if (oldCategoryName !== categoryTitle && categories.some(c => c && c.name === categoryTitle && c.id !== categoryId)) {
            alert('修改后的分类名称冲突！'); return;
        }
        categories[catIdx].name = categoryTitle; categories[catIdx].sort = categorySort; categories[catIdx].page = categoryPage;
        if (oldCategoryName !== categoryTitle && links.hasOwnProperty(oldCategoryName)) {
            links[categoryTitle] = links[oldCategoryName]; delete links[oldCategoryName];
        }
    }
    if (Array.isArray(categories)) {
       categories.sort((a, b) => (parseInt(a.sort, 10) || 0) - (parseInt(b.sort, 10) || 0));
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
    if (!linkData) {
        console.error("createLinkElement: linkData is undefined");
        return $('<a>').addClass('link link-error').text('错误链接');
    }
    var linkText = (typeof linkData.text === 'string' && linkData.text.trim() !== '') ? linkData.text.trim() : "未命名链接";
    // console.log(`Creating link: ID=${linkData.id}, Text='${linkText}', Href='${linkData.href}'`);
    return $('<a>')
        .attr({
            'href': linkData.href || '#',
            'title': linkData.title || linkText,
            'id': linkData.id || ('link-' + generateUniqueId()),
            'target': '_blank'
        })
        .addClass('link') // Essential for the dblclick selector
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
    console.log("editLinkForm called by:", linkElement.attr('id'));
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
            $('#it_seq').val(category.hasOwnProperty('sort') ? category.sort : '');
            $('#it_page').val(category.hasOwnProperty('page') ? category.page : 'fragment-1');
            showModal('editItemDiv');
        } else { alert('找不到分类 "' + categoryNameData + '" 的详细信息。'); }
    }
}

function exportDataAsJson() {
    if (typeof categories === 'undefined' || typeof links === 'undefined') { alert('错误: 数据未准备好导出。'); return; }
    const categoriesToExport = categories.map(cat => {
        let exportCat = { id: cat.id, name: cat.name };
        if (cat.hasOwnProperty('page')) exportCat.page = cat.page;
        if (cat.hasOwnProperty('sort')) exportCat.sort = cat.sort;
        return exportCat;
    });
    const categoriesString = `var initialCategories = ${JSON.stringify(categoriesToExport, null, 4)};`;
    const linksToExport = {};
    for (const catName in links) {
        if (links.hasOwnProperty(catName) && Array.isArray(links[catName])) {
            linksToExport[catName] = links[catName].map(l => ({
                id: l.id, href: l.href, title: l.title, text: l.text, seq: l.seq
            }));
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