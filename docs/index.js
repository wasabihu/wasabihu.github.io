// index.js

// --- 全局变量定义 ---
var categories = [];
var links = {};
let notyf; // Notyf 实例

// --- 文档加载完成后的初始化 ---
$(document).ready(function() {
    console.log("Document ready. Initializing application...");

    notyf = new Notyf({
        duration: 3000,
        position: { x: 'right', y: 'top' },
        types: [
            { type: 'success', backgroundColor: 'var(--primary-color)', icon: false, className: 'notyf-success-custom' },
            { type: 'error', backgroundColor: '#d32f2f', duration: 5000, icon: false, className: 'notyf-error-custom' },
            { type: 'warning', backgroundColor: 'var(--accent-color)', icon: false, className: 'notyf-warning-custom' },
            { type: 'info', backgroundColor: '#2979ff', icon: false, className: 'notyf-info-custom' }
        ],
        dismissible: true
    });
    console.log("Notyf initialized.");

    // 1. 加載數據
    const loadedDataResult = loadDataFromLocalStorage_DM();
    if (loadedDataResult.success && loadedDataResult.categories && loadedDataResult.links) {
        categories = loadedDataResult.categories;
        links = loadedDataResult.links;
    } else {
        console.log("localStorage empty or load failed by dataManager. Using initial data from data.js.");
        let tempCategories = (typeof initialCategories !== 'undefined' && Array.isArray(initialCategories)) ? JSON.parse(JSON.stringify(initialCategories)) : [];
        let tempLinks = (typeof initialLinks !== 'undefined' && typeof initialLinks === 'object' && initialLinks !== null) ? JSON.parse(JSON.stringify(initialLinks)) : {};
        categories = tempCategories.map((cat, index) => ({
            ...cat,
            id: String(cat.id),
            seq: cat.hasOwnProperty('seq') ? (parseInt(cat.seq, 10) || (index + 1)) : (index + 1),
            page: cat.hasOwnProperty('page') ? cat.page : 'fragment-1'
        }));
        links = tempLinks;
        if ((categories.length > 0 || Object.keys(links).length > 0)) {
            saveDataToLocalStorage_DM(categories, links, notyf);
        }
    }

    if (Array.isArray(categories)) {
        categories.sort((a, b) => (parseInt(a.seq, 10) || 0) - (parseInt(b.seq, 10) || 0));
    }

    try {
        if ($("#tabsEx1").length) $("#tabsEx1").tabs({ active: 0 });
        if ($("#tabsEx2").length) $("#tabsEx2").tabs({ active: 0 });
        console.log("jQuery UI Tabs initialized.");
    } catch(e) {
        console.error("Error initializing jQuery UI Tabs:", e);
        notyf.error("Tabs 初始化失败！");
    }

    populateCategorySelect();
    generateLinks();
    bindEventHandlers();

    // “新增分类”(从链接表单的“所属分类”下拉菜单触发)的事件
    $('#item_select').on('change', function() {
        // 只有当这个下拉框可见且可选时（即不在编辑特定分类链接的流程中），"新增分类"选项才有效
        if (!$(this).prop('disabled') && $(this).val() === 'add') {
            $('#item_id').val(''); $('#it_title').val('');
            var activeTabPanel = $(".tabs .ui-tabs-panel:not([style*='display: none'], .ui-tabs-hide)");
            var activeTabFragmentId = activeTabPanel.length ? activeTabPanel.attr('id') : 'fragment-1';
            $('#it_page').val(activeTabFragmentId);
            var newSort = 1;
            if (Array.isArray(categories) && categories.length > 0) {
                const validSeqs = categories.map(c => parseInt(c.seq, 10)).filter(s => !isNaN(s));
                if (validSeqs.length > 0) newSort = Math.max(0, ...validSeqs) + 1;
            }
            $('#it_seq').val(newSort);
            showModal('editItemDiv'); $(this).val("0");
        }
    });

    // “新增链接”按钮的点击事件
    $('#showAddLinkFormButton').on('click', function() {
        console.log("Show Add Link Form Button clicked.");
        clean_hyplink_form(); // 这个函数现在会正确处理新增链接的表单状态

        // 确保“所属分类”可选，“选择编辑链接”部分隐藏
        $('#item_select').prop('disabled', false);
        $('#select_link_to_edit').val("").parent().hide(); // 重置并隐藏
        $('#deleteCurrentLinkButtonInForm').hide();

        if (!Array.isArray(categories) || categories.length === 0) {
            notyf.error("请先至少创建一个分类，才能新增链接！");
            return;
        }

        var activeTabPanel = $(".tabs .ui-tabs-panel:not([style*='display: none'], .ui-tabs-hide)");
        var activeTabFragmentId = activeTabPanel.length ? activeTabPanel.attr('id') : null;
        var preSelectedCategoryId = "0";

        if (activeTabFragmentId && Array.isArray(categories)) {
            var firstCategoryInActiveTab = categories.find(cat => cat && cat.page === activeTabFragmentId);
            if (firstCategoryInActiveTab && firstCategoryInActiveTab.id) { // 确保 firstCategoryInActiveTab 和其 id 存在
                preSelectedCategoryId = firstCategoryInActiveTab.id;
            }
        }
        
        if (preSelectedCategoryId === "0" && Array.isArray(categories) && categories.length > 0 && categories[0] && categories[0].id) {
            preSelectedCategoryId = categories[0].id;
        }
        
        // 如果仍然没有合适的预选，并且下拉列表中除了默认和“新增分类”外没有其他选项
        if (preSelectedCategoryId === "0") {
            let hasActualCategoryOptions = false;
            $('#item_select option').each(function() {
                if ($(this).val() !== "0" && $(this).val() !== "add") {
                    hasActualCategoryOptions = true;
                    return false; 
                }
            });
            if (!hasActualCategoryOptions && categories.length > 0) { // 如果有分类数据但下拉没生成，可能populateCategorySelect有问题
                 notyf.error("分类列表未正确加载，请刷新页面或先创建分类。");
                 return;
            } else if (!hasActualCategoryOptions && categories.length === 0) {
                 notyf.error("请先至少创建一个分类，才能新增链接！");
                 return;
            }
            // 如果有其他选项，但没匹配到预选，就让用户自己选 (保持 "0")
        }
        
        $('#item_select').val(preSelectedCategoryId);
        console.log("Setting item_select for new link to (val):", $('#item_select').val());
        settingLastSeq(preSelectedCategoryId);
        showModal('linkContent');
    });

    // 独立“新增分类”按钮的点击事件
    if ($('#showAddCategoryFormButton').length) { 
        $('#showAddCategoryFormButton').on('click', function() {
            // ... (此部分逻辑与之前版本相同，用于打开新增分类的弹窗) ...
            $('#item_id').val(''); $('#it_title').val('');
            var activeTabPanel = $(".tabs .ui-tabs-panel:not([style*='display: none'], .ui-tabs-hide)");
            var activeTabFragmentId = activeTabPanel.length ? activeTabPanel.attr('id') : 'fragment-1';
            $('#it_page').val(activeTabFragmentId);
            var newSort = 1;
            if (Array.isArray(categories) && categories.length > 0) {
                const validSeqs = categories.map(c => parseInt(c.seq, 10)).filter(s => !isNaN(s));
                if (validSeqs.length > 0) newSort = Math.max(0, ...validSeqs) + 1;
            }
            $('#it_seq').val(newSort); showModal('editItemDiv');
        });
    }
    console.log("Application initialization complete.");
});

// --- UI 更新与交互函数 ---
function populateCategorySelect() {
    var select = $('#item_select');
    if (!select.length) { console.error("Element '#item_select' not found."); return; }
    var currentVal = select.val(); // 保存当前值
    var isDisabled = select.prop('disabled'); // 保存禁用状态

    select.empty().append($('<option>', { value: "0", text: "------------------" }));
    if (Array.isArray(categories)) {
        const sortedCategoriesForSelect = [...categories].sort((a, b) => (parseInt(a.seq, 10) || 0) - (parseInt(b.seq, 10) || 0));
        sortedCategoriesForSelect.forEach(cat => {
            if (cat && cat.id && cat.name) select.append($('<option>', { value: cat.id, text: cat.name }));
        });
    }
    select.append($('<option>', { value: "add", text: "新增分类" }).addClass("thickbox"));
    
    // 尝试恢复之前的值和状态，除非是 "add"
    if (currentVal && currentVal !== "add") {
        select.val(currentVal);
    }
    select.prop('disabled', isDisabled);
}

function generateLinks() {
    var fragmentSelectors = ['#fragment-1', '#fragment-2', '#fragment-3', '#fragment-4', '#fragment-6'];
    var fragments = {};
    fragmentSelectors.forEach(selector => { $(selector).empty(); if ($(selector).length) fragments[selector.substring(1)] = $(selector);});
    if (!Array.isArray(categories) || typeof links !== 'object' || links === null) return;
    const sortedCategories = [...categories].sort((a, b) => (parseInt(a.seq, 10) || 0) - (parseInt(b.seq, 10) || 0));
    sortedCategories.forEach(category => {
        if (!category || !category.name || !category.id) return;
        var categoryName = category.name;
        var categoryContainer = $('<div>').addClass('category-container').attr('data-category', categoryName);
        var categoryTitle = $('<h3>').addClass('category-title').text(categoryName);
        var linksContainer = $('<div>').addClass('links-container');
        categoryContainer.append(categoryTitle);
        if (links.hasOwnProperty(categoryName) && Array.isArray(links[categoryName]) && links[categoryName].length > 0) {
            var sortedLinks = [...links[categoryName]].sort((a,b) => (parseInt(a.seq,10)||0) - (parseInt(b.seq,10)||0));
            sortedLinks.forEach(linkData => {
                if (linkData && typeof linkData.href !== 'undefined' && linkData.text !== null) {
                    linksContainer.append(createLinkElement(linkData));
                }
            });
        }
        categoryContainer.append(linksContainer);
        var targetFragmentId = category.page || 'fragment-1';
        if (fragments[targetFragmentId]) {
            fragments[targetFragmentId].append(categoryContainer);
        } else if (fragments['fragment-1']) {
            fragments['fragment-1'].append(categoryContainer);
        }
    });
}

function handleEditLinksInContainerDblClick() {
    var linksContainerElement = $(this);
    var categoryContainer = linksContainerElement.closest('.category-container');
    if (!categoryContainer.length) { notyf.error("无法找到此链接列表所属的分类。"); return; }
    var categoryName = categoryContainer.data('category');
    var category = categories.find(cat => cat && cat.name === categoryName);
    if (!category) { notyf.error(`找不到名为 "${categoryName}" 的分类数据。`); return; }

    clean_hyplink_form_for_container_edit();
    $('#item_select').val(category.id).prop('disabled', true);
    $('#select_link_to_edit').val("").parent().show(); // 重置并显示

    var selectLinkToEdit = $('#select_link_to_edit');
    selectLinkToEdit.empty().append($('<option>', { value: "", text: "-- 请选择一个链接 --" }));
    if (links[categoryName] && Array.isArray(links[categoryName]) && links[categoryName].length > 0) {
        const sortedLinksInContainer = [...links[categoryName]].sort((a, b) => (parseInt(a.seq, 10) || 0) - (parseInt(b.seq, 10) || 0));
        sortedLinksInContainer.forEach(link => {
            if (link && link.id && link.text) {
                selectLinkToEdit.append($('<option>', { value: link.id, text: link.text }));
            }
        });
        selectLinkToEdit.prop('disabled', false);
    } else {
        selectLinkToEdit.append($('<option>', { value: "", text: "此分类下暂无链接可编辑" })).prop('disabled', true);
    }
    showModal('linkContent');
}

function clean_hyplink_form_for_container_edit() {
    $('#link_id').val(''); $('#name').val(''); $('#href').val('');
    $('#description').val(''); $('#seq').val('');
    //  不直接设置 #item_select 的值，因为它会在 handleEditLinksInContainerDblClick 中被设置并禁用
    $('#item_select').prop('disabled', true); 
    $('#select_link_to_edit').empty().append($('<option>', { value: "", text: "-- 请选择一个链接 --" })).prop('disabled', false);
    $('#deleteCurrentLinkButtonInForm').hide();
}

function bindEventHandlers() {
    console.log("Binding event handlers...");
    $('#edit_link_but').off('click').on('click', editLink);
    $('#edit_item_but').off('click').on('click', editCategory);
    $('#exportDataButton').off('click').on('click', function() { exportDataAsJson_DM(categories, links, notyf); });
    $('#cancelLinkModalButton').off('click').on('click', () => {
        hideModal('linkContent');
        $('#item_select').prop('disabled', false); 
        $('#select_link_to_edit').parent().hide(); // 确保取消时也隐藏编辑用下拉
    });
    $('#cancelCategoryModalButton').off('click').on('click', () => hideModal('editItemDiv'));
    $('#deleteCurrentLinkButtonInForm').off('click').on('click', function(e) {
        e.preventDefault();
        if ($('#link_id').val()) {
            if (confirm('您确定要删除这个链接吗？')) { deleteLink(); }
        } else { notyf.error("请先选择一个要删除的链接。"); }
    }).hide();

    if ($('#content').length === 0) { console.error("CRITICAL: '#content' element for event delegation not found!"); return; }
    $('#content').off('dblclick.editLinksInContainer').on('dblclick.editLinksInContainer', '.links-container', handleEditLinksInContainerDblClick);
    $('#content').off('dblclick.editCategory').on('dblclick.editCategory', '.category-container .category-title', function(event) {
        event.preventDefault(); editCategoryForm.call(this);
    });
    $('#select_link_to_edit').on('change', function() {
        var selectedLinkId = $(this).val();
        var categoryId = $('#item_select').val();
        var category = categories.find(cat => cat && cat.id === categoryId);
        if (!category) { notyf.error("所属分类信息丢失！(on select_link_to_edit change)"); return; } // 增加来源提示
        var categoryName = category.name;
        if (selectedLinkId && links[categoryName]) {
            var linkData = links[categoryName].find(l => l.id === selectedLinkId);
            if (linkData) {
                $('#link_id').val(linkData.id); $('#name').val(linkData.text || '');
                $('#href').val(linkData.href || ''); $('#description').val(linkData.title || '');
                $('#seq').val(linkData.seq || '1'); $('#deleteCurrentLinkButtonInForm').show();
            } else {
                $('#link_id').val(''); $('#name').val(''); $('#href').val('');
                $('#description').val(''); $('#seq').val(''); $('#deleteCurrentLinkButtonInForm').hide();
            }
        } else {
            $('#link_id').val(''); $('#name').val(''); $('#href').val('');
            $('#description').val(''); $('#seq').val(''); $('#deleteCurrentLinkButtonInForm').hide();
        }
    });
    console.log("Event handlers bound.");
}

function editLink(event) {
    if (event) event.preventDefault();
    var linkId = $('#link_id').val();
    var linkName = $('#name').val().trim();
    var linkHref = $('#href').val().trim();
    var linkDescription = $('#description').val().trim();
    var linkSeqInput = $('#seq').val().trim();
    var selectedCategoryId = $('#item_select').val();

    console.log("editLink called. linkId:", linkId, "selectedCategoryId:", selectedCategoryId, "is #select_link_to_edit visible:", $('#select_link_to_edit').parent().is(':visible'));

    if (!linkName || !linkHref) {
        notyf.error('链接名称和网址不能为空！'); return;
    }
    if (selectedCategoryId === "0" || selectedCategoryId === 'add') {
        notyf.error('请选择一个有效的所属分类！'); return;
    }

    var categoryObj = Array.isArray(categories) ? categories.find(cat => cat && cat.id === selectedCategoryId) : null;
    if (!categoryObj) { notyf.error('选择的分类数据无效！'); return; }
    var selectedCategoryName = categoryObj.name;

    var finalLinkSeq = 1;
    let linksForSeqCalc = [];
    if (links[selectedCategoryName] && Array.isArray(links[selectedCategoryName])) {
        linksForSeqCalc = linkId ? links[selectedCategoryName].filter(l => l.id !== linkId) : [...links[selectedCategoryName]];
    }
    if (linkSeqInput && !isNaN(parseInt(linkSeqInput, 10))) {
        finalLinkSeq = parseInt(linkSeqInput, 10);
    } else {
        if (linksForSeqCalc.length > 0) {
            const sequences = linksForSeqCalc.map(l => parseInt(l.seq, 10)).filter(s => !isNaN(s));
            if (sequences.length > 0) finalLinkSeq = Math.max(0, ...sequences) + 1;
        }
    }

    const isEditingFlow = $('#select_link_to_edit').parent().is(':visible');

    if (!linkId && !isEditingFlow) { // 明确这是新增流程
        var newLink = { id: 'link-' + generateUniqueId(), href: linkHref, title: linkDescription, text: linkName, seq: String(finalLinkSeq) };
        if (!links[selectedCategoryName] || !Array.isArray(links[selectedCategoryName])) links[selectedCategoryName] = [];
        links[selectedCategoryName].push(newLink);
        notyf.success('链接 "' + linkName + '" 新增成功！');
        hideModal('linkContent');
        $('#item_select').prop('disabled', false);
    } else if (linkId && isEditingFlow) { // 明确这是编辑流程
        let linkToUpdate = null;
        if (links[selectedCategoryName] && Array.isArray(links[selectedCategoryName])) {
            linkToUpdate = links[selectedCategoryName].find(l => l && l.id === linkId);
        }
        if (!linkToUpdate) {
            notyf.error('错误：未找到要更新的链接！请重新选择。');
            $('#select_link_to_edit').val("").trigger('change');
            return;
        }
        linkToUpdate.href = linkHref; linkToUpdate.title = linkDescription;
        linkToUpdate.text = linkName; linkToUpdate.seq = String(finalLinkSeq);
        notyf.success('链接 "' + linkName + '" 更新成功！');
        $('#select_link_to_edit option[value="' + linkId + '"]').text(linkName);
    } else {
        // 这种情况理论上不应该发生，如果发生了，说明流程判断有误
        console.error("editLink: Ambiguous state - linkId:", linkId, "isEditingFlow:", isEditingFlow);
        notyf.error("操作状态不明确，请重试。");
        return;
    }

    saveDataToLocalStorage_DM(categories, links, notyf);
    generateLinks();
}
// ... (deleteLink, editCategory, 和其他辅助函数与之前版本类似，确保 saveDataToLocalStorage_DM 的调用正确) ...

function deleteLink() {
    var linkIdToDelete = $('#link_id').val(); 
    var categoryId = $('#item_select').val(); 
    
    if (!linkIdToDelete) { notyf.error('请先通过下拉框选择一个要删除的链接。'); return; }
    if (!categoryId || categoryId === "0") { notyf.error('无法确定链接所属的分类。'); return; }

    var category = categories.find(cat => cat && cat.id === categoryId);
    if (!category) { notyf.error('找不到链接所属的分类数据。'); return; }
    var categoryName = category.name;
    let deleted = false;

    if (links[categoryName] && Array.isArray(links[categoryName])) {
        let linkIdx = links[categoryName].findIndex(l => l && l.id === linkIdToDelete);
        if (linkIdx !== -1) { links[categoryName].splice(linkIdx, 1); deleted = true; }
    }

    if (deleted) {
        saveDataToLocalStorage_DM(categories, links, notyf); 
        generateLinks(); 
        hideModal('linkContent');
        $('#item_select').prop('disabled', false); 
        // 如果是从编辑流程删除的，clean_hyplink_form_for_container_edit 更合适
        // 如果是从新增流程（理论上不会到这里，因为删除按钮是隐藏的）
        clean_hyplink_form_for_container_edit(); 
        notyf.success('链接已成功删除！'); 
    } else {
        notyf.error('在数据中未找到要删除的链接。'); 
    }
}

function editCategory(event) {
    if (event) event.preventDefault();
    var categoryIdFromInput = $('#item_id').val();
    var categoryTitle = $('#it_title').val().trim();
    var categorySortInput = $('#it_seq').val().trim();
    var categoryPage = $('#it_page').val().trim();
    if (!categoryTitle || !categoryPage) { notyf.error('分类名称和Page不能为空！'); return; }
    if (Array.isArray(categories)) {
        const nameExists = categories.some(cat => cat && cat.name === categoryTitle && cat.id !== categoryIdFromInput);
        if (nameExists) { notyf.error('分类名称 "' + categoryTitle + '" 已存在！'); return; }
    }
    var finalSeq;
    if (categorySortInput && !isNaN(parseInt(categorySortInput, 10))) {
        finalSeq = parseInt(categorySortInput, 10);
    } else {
        var maxSeq = 0;
        if (Array.isArray(categories) && categories.length > 0) {
            const validSeqs = categories.map(c => parseInt(c.seq, 10)).filter(s => !isNaN(s));
            if (validSeqs.length > 0) maxSeq = Math.max(0, ...validSeqs);
        }
        finalSeq = maxSeq + 1;
    }
    if (categoryIdFromInput === '') {
        var newCategoryId = generateNewCategoryId();
        var newCategory = { id: newCategoryId, name: categoryTitle, seq: finalSeq, page: categoryPage };
        if (!Array.isArray(categories)) categories = [];
        categories.push(newCategory);
        if (!links[newCategory.name]) links[newCategory.name] = [];
    } else {
        if (!Array.isArray(categories)) { notyf.error('错误: 分类数据无效。'); return; }
        var catIdx = categories.findIndex(cat => cat && cat.id === categoryIdFromInput);
        if (catIdx === -1) { notyf.error('错误：未找到要更新的分类！'); return; }
        var oldCategoryName = categories[catIdx].name;
        categories[catIdx].name = categoryTitle; categories[catIdx].seq = finalSeq; categories[catIdx].page = categoryPage;
        if (oldCategoryName !== categoryTitle) {
            if (links.hasOwnProperty(oldCategoryName)) {
                links[categoryTitle] = links[oldCategoryName]; delete links[oldCategoryName];
            } else { links[categoryTitle] = []; }
        }
    }
    if (Array.isArray(categories)) {
       categories.sort((a, b) => (parseInt(a.seq, 10) || 0) - (parseInt(b.seq, 10) || 0));
    }
    saveDataToLocalStorage_DM(categories, links, notyf);
    populateCategorySelect(); generateLinks(); hideModal('editItemDiv'); notyf.success('分类操作成功！');
}

// --- 辅助函数 ---
function generateUniqueId() { return Date.now().toString(36) + Math.random().toString(36).substring(2, 9); }
function generateNewCategoryId() {
    let maxId = 0;
    if (Array.isArray(categories) && categories.length > 0) {
        categories.forEach(cat => {
            if (cat && cat.id) {
                let idPart = String(cat.id).startsWith('cat-') ? String(cat.id).substring(4) : String(cat.id);
                const idNum = parseInt(idPart, 10);
                if (!isNaN(idNum) && idNum > maxId) maxId = idNum;
            }
        });
    }
    return String(maxId + 1);
}
function createLinkElement(linkData) {
    if (!linkData) return $('<a>').addClass('link link-error').text('错误链接');
    var linkText = (typeof linkData.text === 'string' && linkData.text.trim() !== '') ? linkData.text.trim() : "未命名链接";
    var elementId = linkData.id || ('link-' + generateUniqueId());
    return $('<a>').attr({ href: linkData.href || '#', title: linkData.title || linkText, id: elementId, target: '_blank' }).addClass('link').text(linkText);
}

function clean_hyplink_form() { // 用于“新增链接”按钮
    $('#link_id').val(''); $('#name').val(''); $('#href').val('');
    $('#description').val(''); $('#seq').val('');
    $('#item_select').val("0").prop('disabled', false); 
    $('#select_link_to_edit').val("").parent().hide(); // 确保编辑用下拉框被隐藏并重置
    $('#deleteCurrentLinkButtonInForm').hide();
}

function settingLastSeq(selectedCategoryId) {
    var seq = 1;
    if (selectedCategoryId && selectedCategoryId !== "0" && selectedCategoryId !== "add" && Array.isArray(categories) && typeof links === 'object' && links !== null) {
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

function editCategoryForm() {
    var categoryTitleElement = $(this);
    var categoryContainer = categoryTitleElement.closest('.category-container');
    if(!categoryContainer.length) { console.error("Cannot find .category-container for category title."); return; }
    var categoryNameData = categoryContainer.data('category');
    if (Array.isArray(categories)) {
        var category = categories.find(cat => cat && cat.name === categoryNameData);
        if (category) {
            $('#item_id').val(category.id); $('#it_title').val(category.name);
            $('#it_seq').val(category.hasOwnProperty('seq') ? category.seq : '');
            $('#it_page').val(category.hasOwnProperty('page') ? category.page : 'fragment-1');
            showModal('editItemDiv');
        } else { notyf.error('找不到分类 "' + categoryNameData + '" 的详细信息。'); }
    }
}