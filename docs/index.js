// index.js

// --- 全局变量定义 ---
var categories = [];
var links = {};
const CATEGORIES_STORAGE_KEY = 'myBookmarks_categories_v5';
const LINKS_STORAGE_KEY = 'myBookmarks_links_v5';

// Notyf 实例变量声明在外部，以便全局访问
let notyf;

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
        // Notyf 可能尚未初始化，所以这里用 console.error
        console.error("读取本地数据时出错，部分数据可能丢失。");
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
        if (notyf) {
            notyf.error("无法将更改保存到本地存储。");
        } else {
            // Fallback if Notyf is not ready (e.g., during initial load errors)
            alert("无法将更改保存到本地存储。 (Notyf not ready)");
        }
    }
}

// --- 文档加载完成后的初始化 ---
$(document).ready(function() {
    console.log("Document ready. Initializing application...");

    // 在 DOM ready 后初始化 Notyf
     notyf = new Notyf({
        duration: 3000,
        position: { x: 'right', y: 'top' }, // 位置可以在這裡精確控制
        types: [
            { type: 'success', backgroundColor: 'var(--primary-color)', icon: false, className: 'notyf-success-custom' },
            { type: 'error', backgroundColor: '#d32f2f', duration: 5000, icon: false, className: 'notyf-error-custom' }, // 使用了新的紅色
            { type: 'warning', backgroundColor: 'var(--accent-color)', icon: false, className: 'notyf-warning-custom' },
            { type: 'info', backgroundColor: '#2979ff', icon: false, className: 'notyf-info-custom' } // 使用了新的藍色
        ],
        dismissible: true
    });
    console.log("Notyf initialized.");

    // 1. 加載數據
    if (!loadDataFromLocalStorage()) {
        console.log("localStorage empty or load failed. Using initial data from data.js.");
        let tempCategories = (typeof initialCategories !== 'undefined' && Array.isArray(initialCategories)) ? JSON.parse(JSON.stringify(initialCategories)) : [];
        let tempLinks = (typeof initialLinks !== 'undefined' && typeof initialLinks === 'object' && initialLinks !== null) ? JSON.parse(JSON.stringify(initialLinks)) : {};

        categories = tempCategories.map((cat, index) => ({
            ...cat,
            id: String(cat.id), // 确保id是字符串
            seq: cat.hasOwnProperty('seq') ? (parseInt(cat.seq, 10) || (index + 1)) : (index + 1),
            page: cat.hasOwnProperty('page') ? cat.page : 'fragment-1' // 默认 page
        }));
        links = tempLinks;

        if ((categories.length > 0 || Object.keys(links).length > 0)) {
            console.log("Saving initial data (with potential new seq/page for categories) to localStorage.");
            saveDataToLocalStorage();
        }
    }

    // 2. 排序初始分類 (在所有操作前确保 categories 已排序)
    if (Array.isArray(categories)) {
        categories.sort((a, b) => (parseInt(a.seq, 10) || 0) - (parseInt(b.seq, 10) || 0));
    }

    // 3. 初始化 UI 組件 (例如 Tabs)
    try {
        if ($("#tabsEx1").length) $("#tabsEx1").tabs({ active: 0 });
        if ($("#tabsEx2").length) $("#tabsEx2").tabs({ active: 0 });
        console.log("jQuery UI Tabs initialized.");
    } catch(e) {
        console.error("Error initializing jQuery UI Tabs:", e);
        notyf.error("Tabs 初始化失败！");
    }

    // 4. 初始化下拉選單和連結顯示
    populateCategorySelect();
    generateLinks();

    // 5. 綁定核心事件處理器
    bindEventHandlers();

    // 6. 專門處理「新增分類」的下拉選單事件
    $('#item_select').on('change', function() {
        console.log("Item select changed. Value:", $(this).val());
        if ($(this).val() === 'add') {
            console.log("Processing 'add' category selection via dropdown...");
            $('#item_id').val(''); 
            $('#it_title').val('');
            
            var activeTabPanel = $(".tabs .ui-tabs-panel:not([style*='display: none'], .ui-tabs-hide)");
            var activeTabFragmentId = activeTabPanel.length ? activeTabPanel.attr('id') : 'fragment-1';
            $('#it_page').val(activeTabFragmentId);

            var newSort = 1;
            if (Array.isArray(categories) && categories.length > 0) {
                const validSeqs = categories.map(c => parseInt(c.seq, 10)).filter(s => !isNaN(s));
                if (validSeqs.length > 0) newSort = Math.max(0, ...validSeqs) + 1;
            }
            $('#it_seq').val(newSort);
            
            showModal('editItemDiv');
            $(this).val("0"); // 重置下拉選單
        }
    });

    // 7. 處理「新增連結」按鈕的點擊
    $('#showAddLinkFormButton').on('click', function() {
        console.log("Show Add Link Form Button clicked.");
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
        $('#item_select').val(preSelectedCategoryId);
        settingLastSeq(preSelectedCategoryId);
        showModal('linkContent');
    });

    // 8. (可選) 如果 HTML 中有獨立的「新增分類」按鈕，為它綁定事件
    // 注意: 我从你提供的最新的 HTML 片段中移除了这个按钮的直接声明，
    // 如果你确实有这个按钮，请确保它在 HTML 中，并且这里的选择器能找到它。
    if ($('#showAddCategoryFormButton').length) { 
        $('#showAddCategoryFormButton').on('click', function() {
            console.log("Show Add Category Form Button (direct) clicked!");
            $('#item_id').val(''); 
            $('#it_title').val('');
            
            var activeTabPanel = $(".tabs .ui-tabs-panel:not([style*='display: none'], .ui-tabs-hide)");
            var activeTabFragmentId = activeTabPanel.length ? activeTabPanel.attr('id') : 'fragment-1';
            $('#it_page').val(activeTabFragmentId);

            var newSort = 1;
            if (Array.isArray(categories) && categories.length > 0) {
                const validSeqs = categories.map(c => parseInt(c.seq, 10)).filter(s => !isNaN(s));
                if (validSeqs.length > 0) newSort = Math.max(0, ...validSeqs) + 1;
            }
            $('#it_seq').val(newSort);
            showModal('editItemDiv');
        });
    }
    console.log("Application initialization complete.");
});

// --- UI 更新与交互函数 ---
function populateCategorySelect() {
    var select = $('#item_select');
    if (!select.length) { console.error("Element '#item_select' not found."); return; }
    select.empty().append($('<option>', { value: "0", text: "------------------" }));
    if (Array.isArray(categories)) {
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
        if (element.length) fragments[selector.substring(1)] = element.empty(); // 清空 tab 内容
    });

    if (!Array.isArray(categories) || typeof links !== 'object' || links === null) {
        console.warn("Categories or links data is not in the expected format. Skipping link generation.");
        return;
    }
    // 确保 categories 是按 seq 排序的 (生成链接时再次确认)
    const sortedCategories = [...categories].sort((a, b) => (parseInt(a.seq, 10) || 0) - (parseInt(b.seq, 10) || 0));

    sortedCategories.forEach(category => {
        if (!category || !category.name || !category.id) {
            console.warn("Skipping category due to missing name or id:", category);
            return;
        }
        var categoryName = category.name; // 用於 links 物件的鍵
        var categoryContainer = $('<div>').addClass('category-container').attr('data-category', categoryName); // 使用 name 作為 data-category
        var categoryTitle = $('<h3>').addClass('category-title').text(categoryName);
        var linksContainer = $('<div>').addClass('links-container');
        categoryContainer.append(categoryTitle);

        if (links.hasOwnProperty(categoryName) && Array.isArray(links[categoryName]) && links[categoryName].length > 0) {
            var sortedLinks = [...links[categoryName]].sort((a,b) => (parseInt(a.seq,10)||0) - (parseInt(b.seq,10)||0));
            sortedLinks.forEach(linkData => {
                if (linkData && typeof linkData.href !== 'undefined' && (typeof linkData.text !== 'undefined' && linkData.text !== null)) {
                    linksContainer.append(createLinkElement(linkData));
                }
            });
        }
        // 總是要加上 linksContainer，即使它是空的
        categoryContainer.append(linksContainer);

        var targetFragmentId = category.page || 'fragment-1';
        if (fragments[targetFragmentId]) {
            fragments[targetFragmentId].append(categoryContainer);
        } else if (fragments['fragment-1']) { // Fallback 到第一個 tab
            console.warn(`Target fragment '${targetFragmentId}' not found for category '${categoryName}'. Appending to fragment-1.`);
            fragments['fragment-1'].append(categoryContainer);
        } else {
            console.error(`Cannot find any fragment to append category '${categoryName}'. Default fragment-1 also not found.`);
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
        e.preventDefault(); 
        // 如果要用 SweetAlert2 替换 confirm (需要先引入 SweetAlert2 的 JS 和 CSS):
        // Swal.fire({ title: '确定删除吗？', text: "此操作无法撤销！", icon: 'warning', showCancelButton: true, confirmButtonColor: 'var(--primary-color)', cancelButtonColor: 'var(--accent-color)', confirmButtonText: '是的，删除它！', cancelButtonText: '取消', background: 'var(--medium-bg)', color: 'var(--text-color)'})
        // .then((result) => { if (result.isConfirmed) { deleteLink(); } });
        if (confirm('您确定要删除这个链接吗？')) { // 目前使用原生 confirm
            deleteLink();
        }
    });

    if ($('#content').length === 0) { console.error("CRITICAL: '#content' element for event delegation not found!"); return; }
    
    // 雙擊編輯連結
    $('#content').off('dblclick.editLink').on('dblclick.editLink', '.links-container a.link', function(event) {
        console.log('Link dblclick event FIRED on (ID):', this.id, '| Text:', $(this).text());
        event.preventDefault();
        event.stopImmediatePropagation();
        editLinkForm.call(this); // 使用 .call(this) 保持上下文
        return false;
    });
    
    // 雙擊編輯分類
    $('#content').off('dblclick.editCategory').on('dblclick.editCategory', '.category-container .category-title', function(event) {
        event.preventDefault(); 
        editCategoryForm.call(this); // 使用 .call(this) 保持上下文
    });
    console.log("Event handlers bound.");
}

// --- 核心数据操作函数 ---
function editLink(event) {
    if (event) event.preventDefault();
    var linkId = $('#link_id').val(); // '' for new, existing id for edit
    var linkName = $('#name').val().trim();
    var linkHref = $('#href').val().trim();
    var linkDescription = $('#description').val().trim();
    var linkSeqInput = $('#seq').val().trim();
    var selectedCategoryId = $('#item_select').val();

    if (!linkName || !linkHref || selectedCategoryId === "0" || selectedCategoryId === 'add') { 
        notyf.error('名称、网址和所属分类不能为空，且不能为"新增分类"！'); return; 
    }
    var categoryObj = Array.isArray(categories) ? categories.find(cat => cat && cat.id === selectedCategoryId) : null;
    if (!categoryObj) { notyf.error('选择的分类无效！'); return; }
    var selectedCategoryName = categoryObj.name; // 用 name 作为 links 的 key
    var finalLinkSeq = 1;
    if (linkSeqInput && !isNaN(parseInt(linkSeqInput, 10))) {
        finalLinkSeq = parseInt(linkSeqInput, 10);
    } else {
        // 自动计算 seq
        if (links[selectedCategoryName] && Array.isArray(links[selectedCategoryName]) && links[selectedCategoryName].length > 0) {
            const sequences = links[selectedCategoryName].map(l => parseInt(l.seq, 10)).filter(s => !isNaN(s));
            if (sequences.length > 0) finalLinkSeq = Math.max(0, ...sequences) + 1;
        }
    }

    if (linkId === '') { // 新增链接
        var newLink = { 
            id: 'link-' + generateUniqueId(), 
            href: linkHref, 
            title: linkDescription, 
            text: linkName, 
            seq: String(finalLinkSeq) // 确保 seq 是字符串
        };
        if (!links[selectedCategoryName] || !Array.isArray(links[selectedCategoryName])) {
            links[selectedCategoryName] = [];
        }
        links[selectedCategoryName].push(newLink);
    } else { // 修改链接
        let found = false, originalCategoryName = null, linkIndexInOriginalCategory = -1, linkToUpdate = null;
        // 先找到链接及其原始分类
        for (var catNameKey in links) {
            if (links.hasOwnProperty(catNameKey) && Array.isArray(links[catNameKey])) {
                let linkIdx = links[catNameKey].findIndex(l => l && l.id === linkId);
                if (linkIdx !== -1) {
                    originalCategoryName = catNameKey; linkIndexInOriginalCategory = linkIdx; linkToUpdate = links[catNameKey][linkIdx]; found = true; break;
                }
            }
        }
        if (!found || !linkToUpdate) { notyf.error('错误：未找到要更新的链接！'); return; }
        // 更新链接信息
        linkToUpdate.href = linkHref; linkToUpdate.title = linkDescription; linkToUpdate.text = linkName; linkToUpdate.seq = String(finalLinkSeq);
        // 如果分类改变了，处理移动
        if (originalCategoryName !== selectedCategoryName) {
            links[originalCategoryName].splice(linkIndexInOriginalCategory, 1); // 从旧分类删除
            if (!links[selectedCategoryName] || !Array.isArray(links[selectedCategoryName])) {
                links[selectedCategoryName] = []; // 确保目标分类的链接数组存在
            }
            links[selectedCategoryName].push(linkToUpdate); // 添加到新分类
        }
    }
    saveDataToLocalStorage(); 
    generateLinks(); 
    hideModal('linkContent'); 
    notyf.success('链接操作成功！');
}

function editCategory(event) {
    if (event) event.preventDefault();
    var categoryIdFromInput = $('#item_id').val(); // 可能為空 (新增) 或有值 (修改)
    var categoryTitle = $('#it_title').val().trim();
    var categorySortInput = $('#it_seq').val().trim();
    var categoryPage = $('#it_page').val().trim();

    if (!categoryTitle || !categoryPage) { notyf.error('分类名称和Page不能为空！'); return; }
    // 驗證分類名稱是否已存在 (對新增和修改都適用，但修改時要排除自身)
    if (Array.isArray(categories)) {
        const nameExists = categories.some(cat => cat && cat.name === categoryTitle && cat.id !== categoryIdFromInput);
        if (nameExists) { notyf.error('分类名称 "' + categoryTitle + '" 已存在！请使用其他名称。'); return; }
    }
    var finalSeq;
    if (categorySortInput && !isNaN(parseInt(categorySortInput, 10))) {
        finalSeq = parseInt(categorySortInput, 10);
    } else {
        // 如果輸入的 seq 無效或為空，則自動產生新的 seq
        var maxSeq = 0;
        if (Array.isArray(categories) && categories.length > 0) {
            const validSeqs = categories.map(c => parseInt(c.seq, 10)).filter(s => !isNaN(s));
            if (validSeqs.length > 0) maxSeq = Math.max(0, ...validSeqs);
        }
        finalSeq = maxSeq + 1;
    }

    if (categoryIdFromInput === '') { // 新增分類邏輯
        var newCategoryId = generateNewCategoryId(); // 產生新的數字 ID
        var newCategory = { id: newCategoryId, name: categoryTitle, seq: finalSeq, page: categoryPage };
        if (!Array.isArray(categories)) categories = [];
        categories.push(newCategory);
        // 為新分類在 links 物件中建立一個空陣列
        if (!links[newCategory.name]) {
            links[newCategory.name] = [];
        }
        console.log("新增分類:", newCategory);
    } else { // 修改分類邏輯
        if (!Array.isArray(categories)) { notyf.error('错误: 分类数据无效。'); return; }
        var catIdx = categories.findIndex(cat => cat && cat.id === categoryIdFromInput);
        if (catIdx === -1) { notyf.error('错误：未找到要更新的分类！'); return; }
        var oldCategoryName = categories[catIdx].name;
        categories[catIdx].name = categoryTitle; categories[catIdx].seq = finalSeq; categories[catIdx].page = categoryPage;
        // 如果分類名稱改變了，需要更新 links 物件中的鍵
        if (oldCategoryName !== categoryTitle) {
            if (links.hasOwnProperty(oldCategoryName)) {
                links[categoryTitle] = links[oldCategoryName]; 
                delete links[oldCategoryName];
            } else {
                 // 如果旧名称在 links 中没有对应项，为新名称创建一个
                 links[categoryTitle] = [];
            }
        }
        console.log("修改分類 (ID: " + categoryIdFromInput + "):", categories[catIdx]);
    }
    if (Array.isArray(categories)) { // 重新排序 categories 数组
       categories.sort((a, b) => (parseInt(a.seq, 10) || 0) - (parseInt(b.seq, 10) || 0));
    }
    saveDataToLocalStorage(); 
    populateCategorySelect(); // 更新下拉選單
    generateLinks();          // 重新產生頁面上的連結和分類
    hideModal('editItemDiv'); 
    notyf.success('分类操作成功！');
}

function deleteLink() {
    var linkIdToDelete = $('#link_id').val();
    if (!linkIdToDelete) { notyf.error('无法确定要删除哪个链接。'); return; }
    let deleted = false;
    for (var catName in links) {
        if (links.hasOwnProperty(catName) && Array.isArray(links[catName])) {
            let linkIdx = links[catName].findIndex(l => l && l.id === linkIdToDelete);
            if (linkIdx !== -1) { links[catName].splice(linkIdx, 1); deleted = true; break; }
        }
    }
    if (deleted) {
        saveDataToLocalStorage(); generateLinks(); hideModal('linkContent'); notyf.success('链接已成功删除！');
    } else {
        notyf.error('在数据中未找到要删除的链接。');
    }
    clean_hyplink_form();
}

// --- 辅助函数 ---
function generateUniqueId() { 
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9); 
}

function generateNewCategoryId() {
    let maxId = 0;
    if (Array.isArray(categories) && categories.length > 0) {
        categories.forEach(cat => {
            if (cat && cat.id) {
                // 尝试从 'cat-xxxx' 或纯数字的 id 中提取数字部分
                let idPart = String(cat.id).startsWith('cat-') ? String(cat.id).substring(4) : String(cat.id);
                const idNum = parseInt(idPart, 10);
                if (!isNaN(idNum) && idNum > maxId) {
                    maxId = idNum;
                }
            }
        });
    }
    return String(maxId + 1); // 返回纯数字字符串
}

function createLinkElement(linkData) {
    if (!linkData) return $('<a>').addClass('link link-error').text('错误链接');
    var linkText = (typeof linkData.text === 'string' && linkData.text.trim() !== '') ? linkData.text.trim() : "未命名链接";
    // 确保 linkData.id 存在，如果不存在则生成一个
    var elementId = linkData.id || ('link-' + generateUniqueId());
    return $('<a>')
        .attr({ 
            href: linkData.href || '#', 
            title: linkData.title || linkText, 
            id: elementId, // 使用确保存在的 ID
            target: '_blank' 
        })
        .addClass('link')
        .text(linkText);
}

function clean_hyplink_form() { 
    $('#link_id').val(''); $('#name').val(''); $('#href').val(''); 
    $('#description').val(''); $('#seq').val(''); 
    $('#item_select').val("0"); // 重置下拉菜单到默认
}

function settingLastSeq(selectedCategoryId) {
    var seq = 1; // 默认 seq
    if (selectedCategoryId && selectedCategoryId !== "0" && selectedCategoryId !== "add" && Array.isArray(categories) && typeof links === 'object' && links !== null) {
        var category = categories.find(cat => cat && cat.id === selectedCategoryId);
        if (category && links[category.name] && Array.isArray(links[category.name]) && links[category.name].length > 0) {
            const sequences = links[category.name]
                .map(l => parseInt(l.seq, 10))
                .filter(s => !isNaN(s)); // 过滤掉非数字的 seq
            if (sequences.length > 0) {
                seq = Math.max(0, ...sequences) + 1;
            }
        }
    }
    $('#seq').val(seq);
}

function showModal(modalId) { 
    console.log("Showing modal:", modalId);
    $('#' + modalId).show(); 
}
function hideModal(modalId) { 
    console.log("Hiding modal:", modalId);
    $('#' + modalId).hide(); 
}

// 填充编辑链接表单
function editLinkForm() {
    var linkElement = $(this); // this 是被双击的 a.link 元素
    console.log("editLinkForm called for link (ID):", linkElement.attr('id'), "| Text:", linkElement.text());
    clean_hyplink_form(); // 清空表单

    $('#link_id').val(linkElement.attr('id'));
    $('#name').val(linkElement.text());
    $('#href').val(linkElement.attr('href'));
    $('#description').val(linkElement.attr('title'));

    var categoryContainer = linkElement.closest('.category-container');
    if (!categoryContainer.length) {
        console.error("Cannot find .category-container for link:", linkElement.attr('id'));
        $('#item_select').val("0"); // 默认选择
        $('#seq').val('1');        // 默认排序
        showModal('linkContent');
        return;
    }
    var categoryNameData = categoryContainer.data('category'); // 获取分类名称

    if (Array.isArray(categories) && typeof links === 'object' && links !== null) {
        var categoryObj = categories.find(cat => cat && cat.name === categoryNameData); // 通过名称找到分类对象以获取 ID
        if (categoryObj) {
            $('#item_select').val(categoryObj.id); // 设置下拉框选中该分类的 ID
            // 从 links 对象中找到该链接的具体数据以获取 seq
            if (links[categoryNameData] && Array.isArray(links[categoryNameData])) {
                var linkData = links[categoryNameData].find(l => l && l.id === linkElement.attr('id'));
                if (linkData && linkData.hasOwnProperty('seq')) {
                    $('#seq').val(linkData.seq);
                } else {
                    $('#seq').val('1'); // 如果链接数据中没有 seq，默认为1
                }
            } else {
                $('#seq').val('1'); // 如果分类下没有链接数组，默认为1
            }
        } else {
            console.warn("Category object not found for name:", categoryNameData);
            $('#item_select').val("0");
            $('#seq').val('1');
        }
    } else {
        $('#item_select').val("0");
        $('#seq').val('1');
    }
    showModal('linkContent');
}

// 填充编辑分类表单
function editCategoryForm() {
    var categoryTitleElement = $(this); // this 是被双击的 h3.category-title 元素
    var categoryContainer = categoryTitleElement.closest('.category-container');
    if(!categoryContainer.length) { console.error("Cannot find .category-container for category title."); return; }
    var categoryNameData = categoryContainer.data('category'); // 获取分类名称

    if (Array.isArray(categories)) {
        var category = categories.find(cat => cat && cat.name === categoryNameData); // 通过名称找到分类对象
        if (category) {
            $('#item_id').val(category.id); 
            $('#it_title').val(category.name);
            $('#it_seq').val(category.hasOwnProperty('seq') ? category.seq : '');
            $('#it_page').val(category.hasOwnProperty('page') ? category.page : 'fragment-1');
            showModal('editItemDiv');
        } else { 
            notyf.error('找不到分类 "' + categoryNameData + '" 的详细信息。'); 
        }
    }
}

function exportDataAsJson() {
    if (typeof categories === 'undefined' || typeof links === 'undefined') { 
        notyf.error('错误: 数据未准备好导出。'); return; 
    }
    // 确保导出的 categories 包含 id, name, seq, page (如果存在)
    const categoriesToExport = Array.isArray(categories) ? categories.map(cat => {
        let exportCat = { id: String(cat.id), name: cat.name }; // id 确保是字符串
        if (cat.hasOwnProperty('seq')) exportCat.seq = parseInt(cat.seq, 10) || 0;
        if (cat.hasOwnProperty('page')) exportCat.page = cat.page;
        return exportCat;
    }) : [];
    const categoriesString = `var initialCategories = ${JSON.stringify(categoriesToExport, null, 4)};`;
    
    // 确保导出的 links 中的链接包含 id, href, title, text, seq (确保 seq 是字符串数字)
    const linksToExport = {};
    if (typeof links === 'object' && links !== null) {
        for (const catName in links) {
            if (links.hasOwnProperty(catName) && Array.isArray(links[catName])) {
                linksToExport[catName] = links[catName].map(l => ({
                    id: String(l.id), // id 确保是字符串
                    href: l.href, 
                    title: l.title, 
                    text: l.text, 
                    seq: String(parseInt(l.seq, 10) || 0) // seq 确保是数字字符串
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
    document.body.appendChild(a); 
    a.click();
    document.body.removeChild(a); 
    URL.revokeObjectURL(a.href);
    notyf.success('人类可读的 data.js 格式檔案已開始匯出！');
}