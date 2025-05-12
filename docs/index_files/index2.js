// index.js

// 全局变量，将由 localStorage 或 data.js 初始化

const CATEGORIES_STORAGE_KEY = 'myBookmarks_categories';
const LINKS_STORAGE_KEY = 'myBookmarks_links';

// 从 localStorage 加载数据
function loadDataFromLocalStorage() {
    try {
        const storedCategories = localStorage.getItem(CATEGORIES_STORAGE_KEY);
        const storedLinks = localStorage.getItem(LINKS_STORAGE_KEY);

        if (storedCategories && storedLinks) {
            categories = JSON.parse(storedCategories);
            links = JSON.parse(storedLinks);
            console.log("Data loaded from localStorage.");
            return true; // 表示成功从 localStorage 加载
        }
    } catch (e) {
        console.error("Error parsing data from localStorage:", e);
        // 如果解析失败，可以考虑清除损坏的数据
        localStorage.removeItem(CATEGORIES_STORAGE_KEY);
        localStorage.removeItem(LINKS_STORAGE_KEY);
    }
    return false; // 表示未从 localStorage 加载 (或加载失败)
}

// 保存数据到 localStorage
function saveDataToLocalStorage() {
    try {
        localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
        localStorage.setItem(LINKS_STORAGE_KEY, JSON.stringify(links));
        console.log("Data saved to localStorage.");
    } catch (e) {
        console.error("Error saving data to localStorage:", e);
        alert("无法将更改保存到本地存储。可能是存储已满或浏览器限制。");
    }
}


$(document).ready(function() {
   if (!loadDataFromLocalStorage()) {
        // 确保 initialCategories 和 initialLinks 是从 data.js 来的
        categories = typeof initialCategories !== 'undefined' ? JSON.parse(JSON.stringify(initialCategories)) : [];
        links = typeof initialLinks !== 'undefined' ? JSON.parse(JSON.stringify(initialLinks)) : {};
        console.log("Using default data from initial variables provided by data.js.");
        // 首次加载时，如果localStorage为空，则将默认数据存入localStorage
        if (typeof initialCategories !== 'undefined' && typeof initialLinks !== 'undefined') {
            saveDataToLocalStorage();
        }
    }

    // 初始化 tabs
    if ($("#tabsEx1 > ul").length) {
        $("#tabsEx1 > ul").tabs({ active: 0 });
    }
    if ($("#tabsEx2 > ul").length) {
        $("#tabsEx2 > ul").tabs({ active: 0 });
    }

    populateCategorySelect();
    generateLinks();
    bindEventHandlers();

    $('#item_select').on('change', function() {
        if ($(this).val() === 'add') {
            $('#item_id').val('');
            $('#it_title').val('');
            var newSort = categories.length > 0 ? Math.max(...categories.map(c => parseInt(c.sort, 10) || 0)) + 1 : 1;
            $('#it_seq').val(newSort);
            $('#it_page').val('fragment-1');
            showModal('editItemDiv');
            $(this).val("0");
        }
    });

    $('#showAddLinkFormButton').on('click', function() {
        clean_hyplink_form();
        var activeTabLi = $("#tabsEx1 > ul .ui-tabs-active").length ? $("#tabsEx1 > ul .ui-tabs-active") : $("#tabsEx2 > ul .ui-tabs-active");
        var activeTabFragmentId = activeTabLi.length ? activeTabLi.attr('aria-controls') : null;
        var preSelectedCategoryId = "0";
        if (activeTabFragmentId) {
            var firstCategoryInActiveTab = categories.find(cat => cat.page === activeTabFragmentId);
            if (firstCategoryInActiveTab) preSelectedCategoryId = firstCategoryInActiveTab.id;
        }
        if (preSelectedCategoryId === "0" && categories.length > 0 && categories[0] && categories[0].id) {
            preSelectedCategoryId = categories[0].id;
        }
        $('#item_select').val(preSelectedCategoryId);
        settingLastSeq(preSelectedCategoryId);
        showModal('linkContent');
    });
});

function populateCategorySelect() {
    var select = document.getElementById('item_select');
    if (!select) { console.error("Element 'item_select' not found."); return; }
    select.innerHTML = '';
    var defaultOption = document.createElement('option');
    defaultOption.value = "0"; defaultOption.text = "------------------";
    select.appendChild(defaultOption);
    categories.forEach(function(category) {
        var option = document.createElement('option');
        option.value = category.id; option.text = category.name;
        select.appendChild(option);
    });
    var addOption = document.createElement('option');
    addOption.value = "add"; addOption.text = "新增分类";
    addOption.classList.add("thickbox"); select.appendChild(addOption);
}

function generateLinks() {
    var fragmentSelectors = ['#fragment-1', '#fragment-2', '#fragment-3', '#fragment-4', '#fragment-6'];
    var fragments = {};
    fragmentSelectors.forEach(selector => {
        var element = $(selector);
        if (element.length) { fragments[selector.substring(1)] = element; element.html(''); }
    });

    if (!categories || !links) { console.error("Data not ready for generateLinks."); return; }

    categories.forEach(function(category) {
        var categoryName = category.name;
        if (links.hasOwnProperty(categoryName) && Array.isArray(links[categoryName]) && links[categoryName].length > 0) {
            var categoryContainer = $('<div>').addClass('category-container').attr('data-category', categoryName);
            var categoryTitle = $('<h3>').addClass('category-title').text(categoryName);
            var linksContainer = $('<div>').addClass('links-container');
            var sortedLinks = [...links[categoryName]].sort((a, b) => (parseInt(a.seq, 10) || 0) - (parseInt(b.seq, 10) || 0));
            sortedLinks.forEach(link => linksContainer.append(createLinkElement(link)));
            categoryContainer.append(categoryTitle).append(linksContainer);
            var targetFragmentId = category.page || 'fragment-1';
            if (fragments[targetFragmentId]) fragments[targetFragmentId].append(categoryContainer);
            else if (fragments['fragment-1']) fragments['fragment-1'].append(categoryContainer);
            else console.error('Default fragment "#fragment-1" also not found.');
        }
    });
}

function bindEventHandlers() {
    $('#edit_link_but').off('click').on('click', editLink);
    $('#edit_item_but').off('click').on('click', editCategory);
    $('#content').off('dblclick', '.links-container a.link').on('dblclick', '.links-container a.link', function(e) { e.preventDefault(); editLinkForm.call(this); });
    $('#content').off('dblclick', '.category-container .category-title').on('dblclick', '.category-container .category-title', function(e) { e.preventDefault(); editCategoryForm.call(this); });
    $('#exportDataButton').off('click').on('click', exportDataAsJson);
    $('#linkContent .modal-form input[type="button"][value="取消"]').off('click').on('click', () => hideModal('linkContent'));
    $('#editItemDiv .modal-form input[type="button"][value="取消"]').off('click').on('click', () => hideModal('editItemDiv'));
    $('#deleteCurrentLinkButtonInForm').off('click').on('click', function(e) { // 确保 HTML 中有此 ID
        e.preventDefault();
        if (confirm('确定要删除这个链接吗？')) deleteLink();
    });
}

function editLink(event) {
    if (event) event.preventDefault();
    var linkId = $('#link_id').val();
    var linkName = $('#name').val().trim();
    var linkHref = $('#href').val().trim();
    var linkDescription = $('#description').val().trim();
    var linkSeq = $('#seq').val().trim();
    var selectedCategoryId = $('#item_select').val();

    if (!linkName || !linkHref || selectedCategoryId === "0") { alert('名称、网址和所属分类不能为空！'); return; }
    var categoryObj = categories.find(cat => cat.id === selectedCategoryId);
    if (!categoryObj) { alert('选择的分类无效！'); return; }
    var selectedCategoryName = categoryObj.name;

    if (linkId === '') {
        var newLink = { id: 'link-' + generateUniqueId(), href: linkHref, title: linkDescription, text: linkName, seq: linkSeq || '1' };
        if (!links[selectedCategoryName]) links[selectedCategoryName] = [];
        links[selectedCategoryName].push(newLink);
    } else {
        let found = false;
        for (var catNameKey in links) {
            if (links.hasOwnProperty(catNameKey)) {
                let linkIdx = links[catNameKey].findIndex(l => l.id === linkId);
                if (linkIdx !== -1) {
                    let linkToUpdate = links[catNameKey][linkIdx];
                    linkToUpdate.href = linkHref; linkToUpdate.title = linkDescription;
                    linkToUpdate.text = linkName; linkToUpdate.seq = linkSeq || '1';
                    if (catNameKey !== selectedCategoryName) {
                        links[catNameKey].splice(linkIdx, 1);
                        if (!links[selectedCategoryName]) links[selectedCategoryName] = [];
                        links[selectedCategoryName].push(linkToUpdate);
                    }
                    found = true; break;
                }
            }
        }
        if (!found) { alert('未找到要更新的链接！'); return; }
    }
    saveDataToLocalStorage(); // 保存更改
    generateLinks();
    hideModal('linkContent');
    alert('操作成功');
}

function editCategory(event) {
    if (event) event.preventDefault();
    var categoryId = $('#item_id').val();
    var categoryTitle = $('#it_title').val().trim();
    var categorySort = $('#it_seq').val().trim();
    var categoryPage = $('#it_page').val().trim();

    if (!categoryTitle || !categoryPage) { alert('分类名称和Page不能为空！'); return; }

    if (categoryId === '') {
        if (categories.some(cat => cat.name === categoryTitle)) { alert('分类名称已存在！'); return; }
        var newSortVal = categorySort || (categories.length > 0 ? Math.max(...categories.map(c => parseInt(c.sort, 10) || 0)) + 1 : 1).toString();
        var newCategory = { id: 'cat-' + generateUniqueId(), name: categoryTitle, sort: newSortVal, page: categoryPage };
        categories.push(newCategory);
        if (!links[newCategory.name]) links[newCategory.name] = [];
    } else {
        var catIdx = categories.findIndex(cat => cat.id === categoryId);
        if (catIdx === -1) { alert('未找到要更新的分类！'); return; }
        var oldCategoryName = categories[catIdx].name;
        if (oldCategoryName !== categoryTitle && categories.some(c => c.name === categoryTitle && c.id !== categoryId)) {
            alert('修改后的分类名称冲突！'); return;
        }
        categories[catIdx].name = categoryTitle;
        categories[catIdx].sort = categorySort || (categories.length > 0 ? Math.max(...categories.map(c => parseInt(c.sort, 10) || 0)) + 1 : 1).toString();
        categories[catIdx].page = categoryPage;
        if (oldCategoryName !== categoryTitle && links.hasOwnProperty(oldCategoryName)) {
            links[categoryTitle] = links[oldCategoryName];
            delete links[oldCategoryName];
        }
    }
    categories.sort((a, b) => (parseInt(a.sort, 10) || 0) - (parseInt(b.sort, 10) || 0));
    saveDataToLocalStorage(); // 保存更改
    populateCategorySelect();
    generateLinks();
    hideModal('editItemDiv');
    alert('操作成功');
}

function deleteLink() {
    var linkId = $('#link_id').val();
    if (!linkId) { alert('没有指定要删除的链接ID！'); return; }
    let deleted = false;
    for (var catName in links) {
        if (links.hasOwnProperty(catName)) {
            let linkIdx = links[catName].findIndex(l => l.id === linkId);
            if (linkIdx !== -1) {
                links[catName].splice(linkIdx, 1);
                deleted = true; break;
            }
        }
    }
    if (deleted) {
        saveDataToLocalStorage(); // 保存更改
        generateLinks();
        hideModal('linkContent');
        alert('链接删除成功');
    } else {
        alert('未在数据中找到要删除的链接！');
    }
}

function generateUniqueId() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 5); }
function createLinkElement(link) { return $('<a>').attr({href:link.href, title:link.title||link.text, id:link.id, target:'_blank'}).addClass('link').text(link.text); }
function clean_hyplink_form() { $('#link_id,#name,#href,#description,#seq').val(''); $('#item_select').val("0"); }

function settingLastSeq(selectedCategoryId) {
    var seq = 1;
    if (selectedCategoryId && selectedCategoryId !== "0") {
        var category = categories.find(cat => cat.id === selectedCategoryId);
        if (category && links[category.name] && Array.isArray(links[category.name]) && links[category.name].length > 0) {
            const sequences = links[category.name].map(l => parseInt(l.seq, 10)).filter(s => !isNaN(s));
            if (sequences.length > 0) seq = Math.max(...sequences) + 1;
        }
    }
    $('#seq').val(seq);
}

function showModal(modalId) { $('#' + modalId).show(); }
function hideModal(modalId) { $('#' + modalId).hide(); }

function editLinkForm() {
    var linkElement = $(this); clean_hyplink_form();
    $('#link_id').val(linkElement.attr('id')); $('#name').val(linkElement.text());
    $('#href').val(linkElement.attr('href')); $('#description').val(linkElement.attr('title'));
    var categoryContainer = linkElement.closest('.category-container');
    var categoryNameData = categoryContainer.data('category');
    var categoryObj = categories.find(cat => cat.name === categoryNameData);
    if (categoryObj) {
        $('#item_select').val(categoryObj.id);
        if (links[categoryNameData]) {
            var linkData = links[categoryNameData].find(l => l.id === linkElement.attr('id'));
            if (linkData) $('#seq').val(linkData.seq);
        }
    } else { $('#item_select').val("0"); }
    showModal('linkContent');
}

function editCategoryForm() {
    var categoryTitleElement = $(this);
    var categoryContainer = categoryTitleElement.closest('.category-container');
    var categoryNameData = categoryContainer.data('category');
    var category = categories.find(cat => cat.name === categoryNameData);
    if (category) {
        $('#item_id').val(category.id); $('#it_title').val(category.name);
        $('#it_seq').val(category.sort || ''); $('#it_page').val(category.page || 'fragment-1');
        showModal('editItemDiv');
    } else { alert('找不到分类详情。'); }
}

function exportDataAsJson() {
    if (!categories || !links) { alert('数据未准备好导出。'); return; }
    const categoriesToExport = categories.map(cat => {
        let exportCat = { id: cat.id, name: cat.name };
        // 根据你的 data.js 的【期望】结构，决定是否包含 page 和 sort
        // 如果 data.js 从不包含它们，就不要加下面的 if 判断
        if (cat.hasOwnProperty('page')) exportCat.page = cat.page;
        if (cat.hasOwnProperty('sort')) exportCat.sort = cat.sort;
        return exportCat;
    });
    const categoriesString = `var categories=${JSON.stringify(categoriesToExport)};`;
    const linksToExport = {};
    for (const catName in links) {
        if (links.hasOwnProperty(catName) && Array.isArray(links[catName])) {
            linksToExport[catName] = links[catName].map(l => ({id:l.id,href:l.href,title:l.title,text:l.text,seq:l.seq}));
        }
    }
    const linksString = `var links=${JSON.stringify(linksToExport)};`;
    const dataJsContent = `${categoriesString}\n${linksString}\n`;
    const blob = new Blob([dataJsContent], { type: 'text/javascript;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const ts = new Date().toISOString().replace(/[-:.]/g, "").replace("T", "_").slice(0,15);
    a.download = `data_minified_${ts}.js`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(a.href);
    alert('最小化 data.js 格式的檔案已開始匯出！');
}

// index.js

// ... (顶部的 localStorage 相关函数, 全局变量定义, $(document).ready() 等...)

// bindEventHandlers 函数应包含以下内容：
function bindEventHandlers() {
    // 链接编辑/新增表单的“提交”按钮
    $('#edit_link_but').off('click').on('click', editLink);

    // 双击列表中的链接，弹出编辑表单
    $('#content').off('dblclick', '.links-container a.link').on('dblclick', '.links-container a.link', function(event) {
        event.preventDefault(); // 阻止链接的默认跳转行为
        editLinkForm.call(this); // 使用 .call(this) 确保函数内部的 this 指向被双击的 <a> 元素
    });

    // 链接编辑表单中的“删除”按钮 (使用我们建议的 ID)
    $('#deleteCurrentLinkButtonInForm').off('click').on('click', function(event) {
        event.preventDefault();
        if (confirm('您确定要删除这个链接吗？')) {
            deleteLink(); // deleteLink 会从表单的隐藏字段 link_id 读取要删除的链接 ID
        }
    });

    // ... (其他事件绑定，如分类编辑、导出、模态框取消等) ...
}


// editLinkForm 函数：当双击一个链接时，此函数被调用以填充并显示编辑表单
function editLinkForm() {
    var linkElement = $(this); // 'this' 是被双击的 <a> 元素 (jQuery 对象)
    
    clean_hyplink_form(); // 清空表单，并将 link_id 设为空，所以下面要重新赋值

    $('#link_id').val(linkElement.attr('id')); // 设置隐藏的 link_id 字段
    $('#name').val(linkElement.text());
    $('#href').val(linkElement.attr('href'));
    $('#description').val(linkElement.attr('title')); // 假设 title 属性用作备注

    // 获取并设置分类
    var categoryContainer = linkElement.closest('.category-container');
    var categoryNameData = categoryContainer.data('category'); // 获取分类名称

    if (typeof categories !== 'undefined' && typeof links !== 'undefined') {
        var categoryObj = categories.find(cat => cat.name === categoryNameData);
        if (categoryObj) {
            $('#item_select').val(categoryObj.id); // 根据分类名称找到 ID 并选中

            // 获取并设置排序号
            if (links[categoryNameData]) { // 确保该分类的链接数据存在
                var linkData = links[categoryNameData].find(l => l.id === linkElement.attr('id'));
                if (linkData) {
                    $('#seq').val(linkData.seq);
                } else {
                    $('#seq').val('1'); // 如果在数据中找不到，默认为1
                }
            }
        } else {
            $('#item_select').val("0"); // 如果找不到对应分类，则不选
            $('#seq').val('1'); // 默认排序
        }
    } else {
        console.error("Categories or links data not available for editLinkForm");
    }

    showModal('linkContent'); // 显示模态框
}

// editLink 函数：处理链接表单的提交（包括新增和更新）
function editLink(event) {
    if (event) event.preventDefault();

    var linkId = $('#link_id').val(); // 获取隐藏的 link_id
    var linkName = $('#name').val().trim();
    var linkHref = $('#href').val().trim();
    var linkDescription = $('#description').val().trim(); // "备注"
    var linkSeq = $('#seq').val().trim();
    var selectedCategoryId = $('#item_select').val();

    if (!linkName || !linkHref || selectedCategoryId === "0") {
        alert('名称、网址和所属分类不能为空！');
        return;
    }

    var categoryObj = categories.find(cat => cat.id === selectedCategoryId);
    if (!categoryObj) {
        alert('选择的分类无效！');
        return;
    }
    var selectedCategoryName = categoryObj.name;

    if (linkId === '') { // 新增链接 (这部分逻辑之前已经有了)
        var newLink = {
            id: 'link-' + generateUniqueId(),
            href: linkHref,
            title: linkDescription,
            text: linkName,
            seq: linkSeq || '1' // 默认排序值
        };
        if (!links[selectedCategoryName]) {
            links[selectedCategoryName] = [];
        }
        links[selectedCategoryName].push(newLink);
    } else { // 修改链接
        let foundAndUpdated = false;
        for (var categoryNameKey in links) {
            if (links.hasOwnProperty(categoryNameKey)) {
                var linkIndex = links[categoryNameKey].findIndex(link => link.id === linkId);

                if (linkIndex !== -1) {
                    var originalCategoryName = categoryNameKey;
                    var linkToUpdate = links[originalCategoryName][linkIndex];

                    // 更新链接信息
                    linkToUpdate.href = linkHref;
                    linkToUpdate.title = linkDescription; // 备注
                    linkToUpdate.text = linkName;
                    linkToUpdate.seq = linkSeq || '1';

                    // 检查分类是否更改
                    if (originalCategoryName !== selectedCategoryName) {
                        // 从旧分类中移除
                        links[originalCategoryName].splice(linkIndex, 1);
                        // 添加到新分类
                        if (!links[selectedCategoryName]) {
                            links[selectedCategoryName] = [];
                        }
                        links[selectedCategoryName].push(linkToUpdate);
                    }
                    // 如果只是在原分类内修改，不需要移出再移入，只需确保排序在 generateLinks 中处理
                    foundAndUpdated = true;
                    break; 
                }
            }
        }
        if (!foundAndUpdated) {
            alert('错误：未找到要更新的链接！');
            return; // 如果未找到，则不继续执行
        }
    }

    saveDataToLocalStorage(); // 保存到 localStorage
    generateLinks();          // 重新生成链接列表以反映更改（包括排序）
    hideModal('linkContent');   // 关闭模态框
    alert('链接操作成功！');
}


// deleteLink 函数：处理删除链接的逻辑
function deleteLink() {
    var linkIdToDelete = $('#link_id').val(); // 从（通常是隐藏的）表单字段获取要删除的链接ID

    if (!linkIdToDelete) {
        alert('没有指定要删除的链接ID。请先打开要编辑的链接。');
        return;
    }

    let foundAndDeleted = false;
    for (var categoryName in links) {
        if (links.hasOwnProperty(categoryName) && Array.isArray(links[categoryName])) {
            const linkIndex = links[categoryName].findIndex(link => link.id === linkIdToDelete);
            if (linkIndex !== -1) {
                links[categoryName].splice(linkIndex, 1); // 从数据中移除
                foundAndDeleted = true;
                break; // 找到并删除后即可跳出循环
            }
        }
    }

    if (foundAndDeleted) {
        saveDataToLocalStorage(); // 保存更改到 localStorage
        generateLinks();          // 重新生成链接列表
        hideModal('linkContent');   // 关闭可能打开的编辑链接模态框
        alert('链接已成功删除！');
    } else {
        alert('在数据中未找到要删除的链接。');
    }
    // 清理表单，以防用户再次意外提交删除同一个（已删除的）ID
    clean_hyplink_form();
}