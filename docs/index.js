var categories = [];
var links = {};
let notyf;

function getTabGroups() {
    return Array.isArray(window.tabGroups) ? window.tabGroups : [];
}

function getAllTabIds() {
    return getTabGroups().flatMap(group => group.tabs.map(tab => tab.id));
}

function getDefaultTabId() {
    const firstTabId = getAllTabIds()[0];
    return firstTabId || 'fragment-1';
}

function getActiveTabId() {
    const activePanel = $('.tabs .ui-tabs-panel').filter(function() {
        return $(this).css('display') !== 'none';
    }).first();

    return activePanel.length ? activePanel.attr('id') : getDefaultTabId();
}

function renderTabsFromConfig() {
    getTabGroups().forEach(group => {
        const container = $('#' + group.containerId);
        if (!container.length) {
            return;
        }

        const nav = $('<ul>');
        group.tabs.forEach(tab => {
            nav.append(
                $('<li>').append(
                    $('<a>').attr('href', '#' + tab.id).text(tab.label)
                )
            );
            container.append($('<div>').attr('id', tab.id).addClass('tab-panel'));
        });

        container.prepend(nav);
    });
}

function initializeTabs() {
    getTabGroups().forEach(group => {
        const container = $('#' + group.containerId);
        if (container.length) {
            container.tabs({ active: 0 });
        }
    });
}

$(document).ready(function() {
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

    renderTabsFromConfig();

    $('#clearStorageButton').click(function() {
        if (confirm('确定要清除所有本地存储的数据吗？此操作不可撤销！')) {
            localStorage.clear();
            notyf.success('本地存储已清除');
            location.reload();
        }
    });

    const loadedDataResult = loadDataFromLocalStorage_DM();
    if (loadedDataResult.success && loadedDataResult.categories && loadedDataResult.links) {
        const normalizedStoredData = normalizeBookmarkData(loadedDataResult.categories, loadedDataResult.links);
        categories = normalizedStoredData.categories;
        links = normalizedStoredData.links;
    } else {
        const normalizedDefaultData = normalizeBookmarkData(initialCategories, initialLinks);
        categories = normalizedDefaultData.categories;
        links = normalizedDefaultData.links;
        if (categories.length > 0 || Object.keys(links).length > 0) {
            saveCurrentData();
        }
    }

    if (Array.isArray(categories)) {
        categories.sort((a, b) => (parseInt(a.seq, 10) || 0) - (parseInt(b.seq, 10) || 0));
    }

    try {
        initializeTabs();
    } catch (error) {
        console.error('Error initializing tabs:', error);
        notyf.error('Tabs 初始化失败！');
    }

    populateCategorySelect();
    generateLinks();
    bindEventHandlers();

    $('#item_select').on('change', function() {
        if (!$(this).prop('disabled') && $(this).val() === 'add') {
            $('#item_id').val('');
            $('#it_title').val('');
            $('#it_page').val(getActiveTabId());
            $('#it_seq').val(getNextCategorySeq());
            $('#delete_category_but').hide();
            showModal('editItemDiv');
            $(this).val('0');
        }
    });

    $('#showAddLinkFormButton').on('click', function() {
        cleanLinkForm();
        $('#item_select').prop('disabled', false);
        $('#select_link_to_edit').val('').parent().hide();
        $('#deleteCurrentLinkButtonInForm').hide();

        if (!Array.isArray(categories) || categories.length === 0) {
            notyf.error('请先至少创建一个分类，才能新增链接！');
            return;
        }

        const activeTabId = getActiveTabId();
        let preSelectedCategoryId = '0';
        const firstCategoryInActiveTab = categories.find(category => category && category.page === activeTabId);
        if (firstCategoryInActiveTab?.id) {
            preSelectedCategoryId = firstCategoryInActiveTab.id;
        } else if (categories[0]?.id) {
            preSelectedCategoryId = categories[0].id;
        }

        $('#item_select').val(preSelectedCategoryId);
        settingLastSeq(preSelectedCategoryId);
        showModal('linkContent');
    });

    $('#showAddCategoryFormButton').on('click', function() {
        $('#item_id').val('');
        $('#it_title').val('');
        $('#it_page').val(getActiveTabId());
        $('#it_seq').val(getNextCategorySeq());
        $('#delete_category_but').hide();
        showModal('editItemDiv');
    });
});

function getNextCategorySeq() {
    if (!Array.isArray(categories) || categories.length === 0) {
        return 1;
    }

    const validSeqs = categories.map(category => parseInt(category.seq, 10)).filter(seq => !Number.isNaN(seq));
    return validSeqs.length > 0 ? Math.max(...validSeqs) + 1 : 1;
}

function saveCurrentData() {
    const normalizedData = normalizeBookmarkData(categories, links);
    categories = normalizedData.categories;
    links = normalizedData.links;
    saveDataToLocalStorage_DM(categories, links, notyf);
}

function populateCategorySelect() {
    const select = $('#item_select');
    if (!select.length) {
        return;
    }

    const currentValue = select.val();
    const isDisabled = select.prop('disabled');

    select.empty().append($('<option>', { value: '0', text: '------------------' }));

    const sortedCategories = [...categories].sort((a, b) => (parseInt(a.seq, 10) || 0) - (parseInt(b.seq, 10) || 0));
    sortedCategories.forEach(category => {
        if (category?.id && category?.name) {
            select.append($('<option>', { value: category.id, text: category.name }));
        }
    });

    select.append($('<option>', { value: 'add', text: '新增分类' }).addClass('thickbox'));

    if (currentValue && currentValue !== 'add') {
        select.val(currentValue);
    }
    select.prop('disabled', isDisabled);
}

function generateLinks() {
    const fragments = {};
    getAllTabIds().forEach(tabId => {
        const panel = $('#' + tabId);
        panel.empty();
        fragments[tabId] = panel;
    });

    const sortedCategories = [...categories].sort((a, b) => (parseInt(a.seq, 10) || 0) - (parseInt(b.seq, 10) || 0));
    sortedCategories.forEach(category => {
        if (!category?.name || !category?.id) {
            return;
        }

        const categoryContainer = $('<div>').addClass('category-container').attr('data-category', category.name);
        const categoryTitle = $('<h3>').addClass('category-title').text(category.name);
        const linksContainer = $('<div>').addClass('links-container');
        categoryContainer.append(categoryTitle);

        if (Array.isArray(links[category.name])) {
            const sortedLinks = [...links[category.name]].sort((a, b) => (parseInt(a.seq, 10) || 0) - (parseInt(b.seq, 10) || 0));
            sortedLinks.forEach(linkData => {
                if (linkData && typeof linkData.href !== 'undefined' && linkData.text !== null) {
                    linksContainer.append(createLinkElement(linkData));
                }
            });
        }

        categoryContainer.append(linksContainer);
        const targetTabId = fragments[category.page] ? category.page : getDefaultTabId();
        fragments[targetTabId].append(categoryContainer);
    });
}

function handleEditLinksInContainerDblClick() {
    const categoryContainer = $(this).closest('.category-container');
    if (!categoryContainer.length) {
        notyf.error('无法找到当前链接列表所属的分类。');
        return;
    }

    const categoryName = categoryContainer.data('category');
    const category = categories.find(item => item && item.name === categoryName);
    if (!category) {
        notyf.error(`找不到分类“${categoryName}”的数据。`);
        return;
    }

    cleanLinkFormForContainerEdit();
    $('#item_select').val(category.id).prop('disabled', false);
    $('#select_link_to_edit').val('').parent().show();

    const selectLinkToEdit = $('#select_link_to_edit');
    selectLinkToEdit.empty().append($('<option>', { value: '', text: '-- 请选择一个链接 --' }));

    const categoryLinks = links[categoryName] || [];
    if (categoryLinks.length > 0) {
        const sortedLinks = [...categoryLinks].sort((a, b) => (parseInt(a.seq, 10) || 0) - (parseInt(b.seq, 10) || 0));
        sortedLinks.forEach(link => {
            if (link?.id && link?.text) {
                selectLinkToEdit.append($('<option>', { value: link.id, text: link.text }));
            }
        });
        selectLinkToEdit.prop('disabled', false);
    } else {
        selectLinkToEdit.append($('<option>', { value: '', text: '当前分类下暂无可编辑链接' })).prop('disabled', true);
    }

    showModal('linkContent');
}

function cleanLinkFormForContainerEdit() {
    $('#link_id').val('');
    $('#name').val('');
    $('#href').val('');
    $('#description').val('');
    $('#seq').val('');
    $('#item_select').prop('disabled', true);
    $('#select_link_to_edit').empty().append($('<option>', { value: '', text: '-- 请选择一个链接 --' })).prop('disabled', false);
    $('#deleteCurrentLinkButtonInForm').hide();
}

function bindEventHandlers() {
    $('#edit_link_but').off('click').on('click', editLink);
    $('#edit_item_but').off('click').on('click', editCategory);
    $('#delete_category_but').off('click').on('click', deleteCategory);
    $('#exportDataButton').off('click').on('click', function() {
        exportDataAsJson_DM(categories, links, notyf);
    });
    $('#cancelLinkModalButton').off('click').on('click', function() {
        hideModal('linkContent');
        $('#item_select').prop('disabled', false);
        $('#select_link_to_edit').parent().hide();
    });
    $('#cancelCategoryModalButton').off('click').on('click', function() {
        hideModal('editItemDiv');
    });
    $('#deleteCurrentLinkButtonInForm').off('click').on('click', function(event) {
        event.preventDefault();
        if (!$('#link_id').val()) {
            notyf.error('请先选择一个要删除的链接。');
            return;
        }

        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: '确定删除这个链接吗？',
                text: '此操作无法撤销！',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d32f2f',
                cancelButtonColor: 'var(--accent-color)',
                confirmButtonText: '是的，删除！',
                cancelButtonText: '取消',
                background: 'var(--medium-bg)',
                color: 'var(--text-color)'
            }).then(result => {
                if (result.isConfirmed) {
                    deleteLink();
                }
            });
            return;
        }

        if (confirm('您确定要删除这个链接吗？')) {
            deleteLink();
        }
    }).hide();

    $('#content').off('dblclick.editLinksInContainer').on('dblclick.editLinksInContainer', '.links-container', handleEditLinksInContainerDblClick);
    $('#content').off('dblclick.editCategory').on('dblclick.editCategory', '.category-container .category-title', editCategoryForm);

    $('#select_link_to_edit').off('change').on('change', function() {
        const selectedLinkId = $(this).val();
        const categoryId = $('#item_select').val();
        const category = categories.find(item => item && item.id === categoryId);
        if (!category) {
            notyf.error('所属分类信息丢失。');
            return;
        }

        const categoryLinks = links[category.name] || [];
        const linkData = categoryLinks.find(link => link.id === selectedLinkId);
        if (!linkData) {
            $('#link_id').val('');
            $('#name').val('');
            $('#href').val('');
            $('#description').val('');
            $('#seq').val('');
            $('#deleteCurrentLinkButtonInForm').hide();
            return;
        }

        $('#link_id').val(linkData.id);
        $('#name').val(linkData.text || '');
        $('#href').val(linkData.href || '');
        $('#description').val(linkData.title || '');
        $('#seq').val(linkData.seq || '1');
        $('#deleteCurrentLinkButtonInForm').show();
    });
}

function editLink(event) {
    if (event) {
        event.preventDefault();
    }

    const linkId = $('#link_id').val();
    const linkName = normalizeText($('#name').val());
    const linkHref = normalizeText($('#href').val());
    const linkDescription = normalizeText($('#description').val());
    const linkSeqInput = normalizeText($('#seq').val());
    const selectedCategoryId = $('#item_select').val();

    if (!linkName || !linkHref) {
        notyf.error('链接名称和网址不能为空！');
        return;
    }

    if (selectedCategoryId === '0' || selectedCategoryId === 'add') {
        notyf.error('请选择一个有效的所属分类！');
        return;
    }

    const categoryObj = categories.find(category => category && category.id === selectedCategoryId);
    if (!categoryObj) {
        notyf.error('选择的分类数据无效！');
        return;
    }

    const selectedCategoryName = categoryObj.name;
    const existingLinks = Array.isArray(links[selectedCategoryName]) ? links[selectedCategoryName] : [];
    const linksForSeqCalc = linkId ? existingLinks.filter(link => link.id !== linkId) : [...existingLinks];

    let finalLinkSeq = 1;
    if (linkSeqInput && !Number.isNaN(parseInt(linkSeqInput, 10))) {
        finalLinkSeq = parseInt(linkSeqInput, 10);
    } else if (linksForSeqCalc.length > 0) {
        const sequences = linksForSeqCalc.map(link => parseInt(link.seq, 10)).filter(seq => !Number.isNaN(seq));
        if (sequences.length > 0) {
            finalLinkSeq = Math.max(...sequences) + 1;
        }
    }

    const isEditingFlow = $('#select_link_to_edit').parent().is(':visible');

    if (!linkId && !isEditingFlow) {
        const newLink = {
            id: 'link-' + generateUniqueId(),
            href: linkHref,
            title: linkDescription,
            text: linkName,
            seq: String(finalLinkSeq)
        };
        if (!Array.isArray(links[selectedCategoryName])) {
            links[selectedCategoryName] = [];
        }
        links[selectedCategoryName].push(newLink);
        notyf.success(`链接“${linkName}”新增成功！`);
        hideModal('linkContent');
        $('#item_select').prop('disabled', false);
    } else if (linkId) {
        let oldCategoryName = null;
        let linkToUpdate = null;

        for (const [categoryName, categoryLinks] of Object.entries(links)) {
            if (!Array.isArray(categoryLinks)) {
                continue;
            }
            linkToUpdate = categoryLinks.find(link => link && link.id === linkId);
            if (linkToUpdate) {
                oldCategoryName = categoryName;
                break;
            }
        }

        if (!linkToUpdate) {
            notyf.error('未找到要更新的链接，请重新选择。');
            $('#select_link_to_edit').val('').trigger('change');
            return;
        }

        if (oldCategoryName && oldCategoryName !== selectedCategoryName) {
            links[oldCategoryName] = links[oldCategoryName].filter(link => link.id !== linkId);
            if (!Array.isArray(links[selectedCategoryName])) {
                links[selectedCategoryName] = [];
            }
            links[selectedCategoryName].push(linkToUpdate);
        }

        linkToUpdate.href = linkHref;
        linkToUpdate.title = linkDescription;
        linkToUpdate.text = linkName;
        linkToUpdate.seq = String(finalLinkSeq);

        notyf.success(`链接“${linkName}”更新成功！`);
        $('#select_link_to_edit option[value="' + linkId + '"]').text(linkName);
        hideModal('linkContent');
        $('#item_select').prop('disabled', false);
    } else {
        notyf.error('当前操作状态不明确，请重试。');
        return;
    }

    saveCurrentData();
    generateLinks();
}

function deleteLink() {
    const linkIdToDelete = $('#link_id').val();
    const categoryId = $('#item_select').val();
    if (!linkIdToDelete) {
        notyf.error('请先选择一个要删除的链接。');
        return;
    }

    const category = categories.find(item => item && item.id === categoryId);
    if (!category) {
        notyf.error('无法确定链接所属的分类。');
        return;
    }

    const categoryLinks = links[category.name];
    if (!Array.isArray(categoryLinks)) {
        notyf.error('在数据中未找到要删除的链接。');
        return;
    }

    const linkIndex = categoryLinks.findIndex(link => link && link.id === linkIdToDelete);
    if (linkIndex === -1) {
        notyf.error('在数据中未找到要删除的链接。');
        return;
    }

    categoryLinks.splice(linkIndex, 1);
    saveCurrentData();
    generateLinks();
    hideModal('linkContent');
    $('#item_select').prop('disabled', false);
    cleanLinkFormForContainerEdit();
    notyf.success('链接已成功删除！');
}

function editCategory(event) {
    if (event) {
        event.preventDefault();
    }

    const categoryId = $('#item_id').val();
    const categoryTitle = normalizeText($('#it_title').val());
    const categorySortInput = normalizeText($('#it_seq').val());
    const categoryPage = normalizeText($('#it_page').val()) || getDefaultTabId();

    if (!categoryTitle || !categoryPage) {
        notyf.error('分类名称和 Page 不能为空！');
        return;
    }

    if (!getAllTabIds().includes(categoryPage)) {
        notyf.error('请输入有效的 Tab ID。');
        return;
    }

    const nameExists = categories.some(category => category && category.name === categoryTitle && category.id !== categoryId);
    if (nameExists) {
        notyf.error(`分类名称“${categoryTitle}”已存在！`);
        return;
    }

    let finalSeq = parseInt(categorySortInput, 10);
    if (Number.isNaN(finalSeq)) {
        finalSeq = getNextCategorySeq();
    }

    if (categoryId === '') {
        const newCategory = {
            id: generateNewCategoryId(),
            name: categoryTitle,
            seq: finalSeq,
            page: categoryPage
        };
        categories.push(newCategory);
        if (!links[newCategory.name]) {
            links[newCategory.name] = [];
        }
        $('#delete_category_but').hide();
    } else {
        const categoryIndex = categories.findIndex(category => category && category.id === categoryId);
        if (categoryIndex === -1) {
            notyf.error('未找到要更新的分类。');
            return;
        }

        const oldCategoryName = categories[categoryIndex].name;
        categories[categoryIndex].name = categoryTitle;
        categories[categoryIndex].seq = finalSeq;
        categories[categoryIndex].page = categoryPage;

        if (oldCategoryName !== categoryTitle) {
            links[categoryTitle] = links[oldCategoryName] || [];
            delete links[oldCategoryName];
        }
        $('#delete_category_but').show();
    }

    categories.sort((a, b) => (parseInt(a.seq, 10) || 0) - (parseInt(b.seq, 10) || 0));
    saveCurrentData();
    populateCategorySelect();
    generateLinks();
    hideModal('editItemDiv');
    notyf.success('分类操作成功！');
    forceAlignNotyfDismissButton();
}

function deleteCategory() {
    const categoryIdToDelete = $('#item_id').val();
    if (!categoryIdToDelete) {
        notyf.error('无法确定要删除哪个分类，请重新打开编辑窗口。');
        return;
    }

    const categoryIndex = categories.findIndex(category => category && category.id === categoryIdToDelete);
    if (categoryIndex === -1) {
        notyf.error('在数据中未找到要删除的分类。');
        return;
    }

    const categoryToDelete = categories[categoryIndex];
    const categoryName = categoryToDelete.name;

    const confirmAction = () => {
        categories.splice(categoryIndex, 1);
        delete links[categoryName];
        saveCurrentData();
        populateCategorySelect();
        generateLinks();
        hideModal('editItemDiv');
        notyf.success(`分类“${categoryName}”已成功删除！`);
    };

    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: `确定删除分类“${categoryName}”吗？`,
            text: '注意：这将同时删除该分类下的所有链接，此操作无法撤销！',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d32f2f',
            cancelButtonColor: 'var(--accent-color, #fca311)',
            confirmButtonText: '是的，删除它！',
            cancelButtonText: '取消',
            background: 'var(--medium-bg, #222)',
            color: 'var(--text-color, #f8f8f2)'
        }).then(result => {
            if (result.isConfirmed) {
                confirmAction();
            }
        });
        return;
    }

    if (confirm(`您确定要删除分类“${categoryName}”吗？\n这将同时删除该分类下的所有链接！`)) {
        confirmAction();
    }
}

function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

function generateNewCategoryId() {
    let maxId = 0;
    categories.forEach(category => {
        const rawId = String(category.id || '');
        const numericPart = rawId.startsWith('cat-') ? rawId.substring(4) : rawId;
        const numericId = parseInt(numericPart, 10);
        if (!Number.isNaN(numericId) && numericId > maxId) {
            maxId = numericId;
        }
    });
    return String(maxId + 1);
}

function createLinkElement(linkData) {
    const linkText = typeof linkData.text === 'string' && linkData.text.trim() !== '' ? linkData.text.trim() : '未命名链接';
    const elementId = linkData.id || ('link-' + generateUniqueId());
    return $('<a>')
        .attr({
            href: linkData.href || '#',
            title: linkData.title || linkText,
            id: elementId,
            target: '_blank'
        })
        .addClass('link')
        .text(linkText);
}

function cleanLinkForm() {
    $('#link_id').val('');
    $('#name').val('');
    $('#href').val('');
    $('#description').val('');
    $('#seq').val('');
    $('#item_select').val('0').prop('disabled', false);
    $('#select_link_to_edit').val('').parent().hide();
    $('#deleteCurrentLinkButtonInForm').hide();
}

function settingLastSeq(selectedCategoryId) {
    let seq = 1;
    if (selectedCategoryId && selectedCategoryId !== '0' && selectedCategoryId !== 'add') {
        const category = categories.find(item => item && item.id === selectedCategoryId);
        if (category && Array.isArray(links[category.name]) && links[category.name].length > 0) {
            const sequences = links[category.name].map(link => parseInt(link.seq, 10)).filter(value => !Number.isNaN(value));
            if (sequences.length > 0) {
                seq = Math.max(...sequences) + 1;
            }
        }
    }
    $('#seq').val(seq);
}

function showModal(modalId) {
    const selector = typeof modalId === 'string' && !modalId.startsWith('#') ? '#' + modalId : modalId;
    $(selector).fadeIn(300).addClass('show');

    $(document).on('keydown.modal', function(event) {
        if (event.key === 'Escape') {
            if (selector === '#linkContent') {
                $('#cancelLinkModalButton').click();
            } else if (selector === '#editItemDiv') {
                $('#cancelCategoryModalButton').click();
            }
        }
    });
}

function hideModal(modalId) {
    const selector = typeof modalId === 'string' && !modalId.startsWith('#') ? '#' + modalId : modalId;
    $(selector).removeClass('show').fadeOut(200);
    $(document).off('keydown.modal');
}

function editCategoryForm() {
    const categoryName = $(this).closest('.category-container').data('category');
    const category = categories.find(item => item && item.name === categoryName);
    if (!category) {
        notyf.error(`找不到分类“${categoryName}”的详细信息。`);
        return;
    }

    $('#item_id').val(category.id);
    $('#it_title').val(category.name);
    $('#it_seq').val(category.seq || '');
    $('#it_page').val(category.page || getDefaultTabId());
    $('#delete_category_but').show();
    showModal('editItemDiv');
}

function forceAlignNotyfDismissButton() {
    setTimeout(function() {
        $('.notyf__toast').each(function() {
            const toast = $(this);
            const dismissButton = toast.find('.notyf__dismiss-icon');
            if (!dismissButton.length) {
                return;
            }

            toast.css('position', 'relative');
            dismissButton.css({
                position: 'absolute',
                top: '50%',
                right: '10px',
                transform: 'translateY(-50%)',
                'margin-left': ''
            });
        });
    }, 100);
}
