var categories = [];
var links = {};
var searchQuery = '';
let notyf;

function shouldHideSyncRemoteDataButton() {
    return window.location.hostname.includes('github.io');
}

function getTabGroups() {
    return Array.isArray(window.tabGroups) ? window.tabGroups : [];
}

function getAllTabIds() {
    return getTabGroups().flatMap(group => group.tabs.map(tab => tab.id));
}

function getDefaultTabId() {
    return getAllTabIds()[0] || 'fragment-1';
}

function getActiveTabId() {
    const activePanel = $('.tabs .ui-tabs-panel').filter(function() {
        return $(this).css('display') !== 'none';
    }).first();
    return activePanel.length ? activePanel.attr('id') : getDefaultTabId();
}

function getCategoryById(categoryId) {
    return categories.find(category => category && category.id === String(categoryId)) || null;
}

function getFirstCategoryIdInTab(tabId) {
    const match = categories.find(category => category && category.page === tabId);
    return match ? match.id : null;
}

function ensureCategoryLinkGroup(categoryId) {
    const key = String(categoryId);
    if (!Array.isArray(links[key])) {
        links[key] = [];
    }
    return links[key];
}

function getLinksForCategory(categoryId) {
    return ensureCategoryLinkGroup(categoryId);
}

function setLinksForCategory(categoryId, nextLinks) {
    links[String(categoryId)] = Array.isArray(nextLinks) ? nextLinks : [];
}

function findLinkRecordById(linkId) {
    const normalizedLinkId = String(linkId);
    for (const category of categories) {
        const categoryLinks = getLinksForCategory(category.id);
        const link = categoryLinks.find(item => item && item.id === normalizedLinkId);
        if (link) {
            return { categoryId: category.id, category, link };
        }
    }
    return null;
}

function getNextCategorySeq() {
    if (!categories.length) {
        return 1;
    }

    const validSeqs = categories.map(category => parseInt(category.seq, 10)).filter(seq => !Number.isNaN(seq));
    return validSeqs.length > 0 ? Math.max(...validSeqs) + 1 : 1;
}

function getNextLinkSeq(categoryId, currentLinkId) {
    const categoryLinks = getLinksForCategory(categoryId);
    const linksForSeq = currentLinkId
        ? categoryLinks.filter(link => link.id !== String(currentLinkId))
        : categoryLinks;
    const sequences = linksForSeq.map(link => parseInt(link.seq, 10)).filter(seq => !Number.isNaN(seq));
    return sequences.length > 0 ? Math.max(...sequences) + 1 : 1;
}

function saveCurrentData() {
    const normalizedData = normalizeBookmarkData(categories, links);
    categories = normalizedData.categories;
    links = normalizedData.links;
    saveDataToLocalStorage_DM(categories, links, notyf);
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

function populateCategorySelect() {
    const select = $('#item_select');
    if (!select.length) {
        return;
    }

    const currentValue = select.val();
    const isDisabled = select.prop('disabled');
    select.empty().append($('<option>', { value: '0', text: '------------------' }));

    [...categories]
        .sort((a, b) => (parseInt(a.seq, 10) || 0) - (parseInt(b.seq, 10) || 0))
        .forEach(category => {
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

function filterLinksForSearch(category, categoryLinks) {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
        return categoryLinks;
    }

    if ((category.name || '').toLowerCase().includes(query)) {
        return categoryLinks;
    }

    return categoryLinks.filter(link => {
        const fields = [link.text, link.title, link.href]
            .filter(value => typeof value === 'string')
            .map(value => value.toLowerCase());
        return fields.some(value => value.includes(query));
    });
}

function createLinkElement(category, linkData) {
    const linkText = typeof linkData.text === 'string' && linkData.text.trim() !== '' ? linkData.text.trim() : '?????';
    const elementId = linkData.id || ('link-' + generateUniqueId());
    const linkAnchor = $('<a>')
        .attr({
            href: linkData.href || '#',
            title: linkData.title || linkText,
            id: elementId,
            target: '_blank'
        })
        .addClass('link')
        .text(linkText);

    return $('<div>')
        .addClass('link-card')
        .append(linkAnchor);
}

function generateLinks() {

    const fragments = {};
    getAllTabIds().forEach(tabId => {
        const panel = $('#' + tabId);
        panel.empty();
        fragments[tabId] = panel;
    });

    [...categories]
        .sort((a, b) => (parseInt(a.seq, 10) || 0) - (parseInt(b.seq, 10) || 0))
        .forEach(category => {
            if (!category?.id || !category?.name) {
                return;
            }

            const categoryLinks = [...getLinksForCategory(category.id)]
                .sort((a, b) => (parseInt(a.seq, 10) || 0) - (parseInt(b.seq, 10) || 0));
            const filteredLinks = filterLinksForSearch(category, categoryLinks);
            if (searchQuery.trim() && filteredLinks.length === 0) {
                return;
            }

            const categoryContainer = $('<div>')
                .addClass('category-container')
                .attr('data-category-id', category.id)
                .attr('data-category', category.name);
            const categoryHeader = $('<div>').addClass('category-header');
            const categoryTitle = $('<h3>').addClass('category-title').text(category.name);
            const linksContainer = $('<div>').addClass('links-container');

            categoryHeader.append(categoryTitle);
            filteredLinks.forEach(linkData => {
                linksContainer.append(createLinkElement(category, linkData));
            });

            categoryContainer.append(categoryHeader).append(linksContainer);
            const targetTabId = fragments[category.page] ? category.page : getDefaultTabId();
            fragments[targetTabId].append(categoryContainer);
        });
}

function fillLinkPicker(categoryId) {
    const selectLinkToEdit = $('#select_link_to_edit');
    const category = getCategoryById(categoryId);
    if (!category) {
        return;
    }

    selectLinkToEdit.empty().append($('<option>', { value: '', text: '-- 请选择一个链接 --' }));
    const sortedLinks = [...getLinksForCategory(category.id)].sort((a, b) => (parseInt(a.seq, 10) || 0) - (parseInt(b.seq, 10) || 0));
    if (sortedLinks.length === 0) {
        selectLinkToEdit.append($('<option>', { value: '', text: '当前分类下暂无可编辑链接' }));
        selectLinkToEdit.prop('disabled', true);
        return;
    }

    sortedLinks.forEach(link => {
        selectLinkToEdit.append($('<option>', { value: link.id, text: link.text }));
    });
    selectLinkToEdit.prop('disabled', false);
}

function cleanLinkForm() {
    $('#link_id').val('');
    $('#name').val('');
    $('#href').val('');
    $('#description').val('');
    $('#seq').val('');
    $('#item_select').val('0').prop('disabled', false);
    $('#select_link_to_edit').val('').prop('disabled', false).parent().hide();
    $('#deleteCurrentLinkButtonInForm').hide();
}

function openEditCategoryModal(categoryId) {
    if (!categoryId) {
        $('#item_id').val('');
        $('#it_title').val('');
        $('#it_page').val(getActiveTabId());
        $('#it_seq').val(getNextCategorySeq());
        $('#delete_category_but').hide();
        showModal('editItemDiv');
        return;
    }

    const category = getCategoryById(categoryId);
    if (!category) {
        notyf.error('找不到要编辑的分类。');
        return;
    }

    $('#item_id').val(category.id);
    $('#it_title').val(category.name);
    $('#it_seq').val(category.seq || '');
    $('#it_page').val(category.page || getDefaultTabId());
    $('#delete_category_but').show();
    showModal('editItemDiv');
}

function openEditLinkModal(options = {}) {
    const { categoryId, linkId, showPicker = false } = options;
    cleanLinkForm();
    $('#item_select').prop('disabled', false);

    if (!categories.length) {
        notyf.error('请先至少创建一个分类，才能新增链接！');
        return;
    }

    const activeTabCategoryId = getFirstCategoryIdInTab(getActiveTabId());
    const fallbackCategoryId = categoryId || activeTabCategoryId || categories[0]?.id;
    if (fallbackCategoryId) {
        $('#item_select').val(String(fallbackCategoryId));
    }

    if (showPicker && fallbackCategoryId) {
        fillLinkPicker(fallbackCategoryId);
        $('#select_link_to_edit').val('').parent().show();
    }

    if (linkId) {
        const record = findLinkRecordById(linkId);
        if (!record) {
            notyf.error('未找到要编辑的链接。');
            return;
        }

        $('#item_select').val(record.categoryId);
        $('#link_id').val(record.link.id);
        $('#name').val(record.link.text || '');
        $('#href').val(record.link.href || '');
        $('#description').val(record.link.title || '');
        $('#seq').val(record.link.seq || '1');
        $('#deleteCurrentLinkButtonInForm').show();

        if (showPicker) {
            fillLinkPicker(record.categoryId);
            $('#select_link_to_edit').val(record.link.id).parent().show();
        }
    } else {
        settingLastSeq($('#item_select').val());
    }

    showModal('linkContent');
}

function handleEditLinksInContainerDblClick() {
    const categoryId = $(this).closest('.category-container').data('category-id');
    if (!categoryId) {
        notyf.error('????????????????');
        return;
    }
    openEditLinkModal({ categoryId: String(categoryId), showPicker: true });
}

async function syncRemoteData() {
    const confirmed = confirm('\u786e\u5b9a\u8981\u7528\u8fdc\u7a0b data.js \u8986\u76d6\u5f53\u524d\u672c\u5730\u6570\u636e\u5e76\u5237\u65b0\u9875\u9762\u5417\uff1f');
    if (!confirmed) {
        return;
    }

    const syncButton = $('#syncRemoteDataButton');
    syncButton.prop('disabled', true).text('\u540c\u6b65\u4e2d...');

    try {
        const syncedData = await syncRemoteDataToLocalStorage_DM({
            normalizeBookmarkDataFn: normalizeBookmarkData,
            notyfInstance: notyf
        });

        categories = syncedData.categories;
        links = syncedData.links;
        searchQuery = '';
        $('#searchInput').val('');
        setTimeout(function() {
            location.reload();
        }, 300);
    } finally {
        syncButton.prop('disabled', false).text('\u540c\u6b65\u8fdc\u7a0b\u6570\u636e');
    }
}

function bindEventHandlers() {
    $('#edit_link_but').off('click').on('click', editLink);
    $('#edit_item_but').off('click').on('click', editCategory);
    $('#delete_category_but').off('click').on('click', deleteCategory);
    $('#exportDataButton').off('click').on('click', function() {
        exportDataAsJson_DM(categories, links, notyf);
    });
    if (!shouldHideSyncRemoteDataButton()) {
        $('#syncRemoteDataButton').off('click').on('click', function() {
            syncRemoteData();
        });
    } else {
        $('#syncRemoteDataButton').off('click');
    }
    $('#cancelLinkModalButton').off('click').on('click', function() {
        hideModal('linkContent');
    });
    $('#cancelCategoryModalButton').off('click').on('click', function() {
        hideModal('editItemDiv');
    });
    $('#clearSearchButton').off('click').on('click', function() {
        searchQuery = '';
        $('#searchInput').val('');
        generateLinks();
    });
    $('#searchInput').off('input').on('input', function() {
        searchQuery = normalizeText($(this).val()) || '';
        generateLinks();
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
    $('#content').off('dblclick.editCategory').on('dblclick.editCategory', '.category-title', function() {
        openEditCategoryModal($(this).closest('.category-container').data('category-id'));
    });

    $('#item_select').off('change.linkEditor').on('change.linkEditor', function() {
        if (!$(this).prop('disabled') && $(this).val() === 'add') {
            openEditCategoryModal();
            $(this).val('0');
            return;
        }

        if ($('#select_link_to_edit').parent().is(':visible')) {
            fillLinkPicker($(this).val());
            $('#link_id').val('');
            $('#name').val('');
            $('#href').val('');
            $('#description').val('');
            $('#seq').val('');
            $('#deleteCurrentLinkButtonInForm').hide();
        } else {
            settingLastSeq($(this).val());
        }
    });

    $('#select_link_to_edit').off('change').on('change', function() {
        const selectedLinkId = $(this).val();
        if (!selectedLinkId) {
            $('#link_id').val('');
            $('#name').val('');
            $('#href').val('');
            $('#description').val('');
            $('#seq').val('');
            $('#deleteCurrentLinkButtonInForm').hide();
            return;
        }

        const record = findLinkRecordById(selectedLinkId);
        if (!record) {
            notyf.error('未找到要编辑的链接。');
            return;
        }

        $('#item_select').val(record.categoryId);
        $('#link_id').val(record.link.id);
        $('#name').val(record.link.text || '');
        $('#href').val(record.link.href || '');
        $('#description').val(record.link.title || '');
        $('#seq').val(record.link.seq || '1');
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

    const category = getCategoryById(selectedCategoryId);
    if (!category) {
        notyf.error('选择的分类数据无效！');
        return;
    }

    let finalLinkSeq = 1;
    if (linkSeqInput && !Number.isNaN(parseInt(linkSeqInput, 10))) {
        finalLinkSeq = parseInt(linkSeqInput, 10);
    } else {
        finalLinkSeq = getNextLinkSeq(category.id, linkId || null);
    }

    if (!linkId) {
        const nextLinks = [...getLinksForCategory(category.id), {
            id: 'link-' + generateUniqueId(),
            href: linkHref,
            title: linkDescription,
            text: linkName,
            seq: String(finalLinkSeq)
        }];
        setLinksForCategory(category.id, nextLinks);
        notyf.success(`链接“${linkName}”新增成功！`);
    } else {
        const record = findLinkRecordById(linkId);
        if (!record) {
            notyf.error('未找到要更新的链接，请重新选择。');
            return;
        }

        const updatedLink = {
            ...record.link,
            href: linkHref,
            title: linkDescription,
            text: linkName,
            seq: String(finalLinkSeq)
        };

        const sourceLinks = getLinksForCategory(record.categoryId).filter(link => link.id !== record.link.id);
        setLinksForCategory(record.categoryId, sourceLinks);
        const targetLinks = [...getLinksForCategory(category.id), updatedLink];
        setLinksForCategory(category.id, targetLinks);
        notyf.success(`链接“${linkName}”更新成功！`);
    }

    saveCurrentData();
    generateLinks();
    hideModal('linkContent');
}

function deleteLink() {
    const linkIdToDelete = $('#link_id').val();
    if (!linkIdToDelete) {
        notyf.error('请先选择一个要删除的链接。');
        return;
    }

    const record = findLinkRecordById(linkIdToDelete);
    if (!record) {
        notyf.error('在数据中未找到要删除的链接。');
        return;
    }

    setLinksForCategory(record.categoryId, getLinksForCategory(record.categoryId).filter(link => link.id !== linkIdToDelete));
    saveCurrentData();
    generateLinks();
    hideModal('linkContent');
    cleanLinkForm();
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

    if (!categoryId) {
        const newCategory = {
            id: generateNewCategoryId(),
            name: categoryTitle,
            seq: finalSeq,
            page: categoryPage
        };
        categories.push(newCategory);
        ensureCategoryLinkGroup(newCategory.id);
        $('#delete_category_but').hide();
    } else {
        const targetCategory = getCategoryById(categoryId);
        if (!targetCategory) {
            notyf.error('未找到要更新的分类。');
            return;
        }

        targetCategory.name = categoryTitle;
        targetCategory.seq = finalSeq;
        targetCategory.page = categoryPage;
        ensureCategoryLinkGroup(targetCategory.id);
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

    const category = getCategoryById(categoryIdToDelete);
    if (!category) {
        notyf.error('在数据中未找到要删除的分类。');
        return;
    }

    const confirmAction = () => {
        categories = categories.filter(item => item.id !== category.id);
        delete links[category.id];
        saveCurrentData();
        populateCategorySelect();
        generateLinks();
        hideModal('editItemDiv');
        notyf.success(`分类“${category.name}”已成功删除！`);
    };

    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: `确定删除分类“${category.name}”吗？`,
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

    if (confirm(`您确定要删除分类“${category.name}”吗？\n这将同时删除该分类下的所有链接！`)) {
        confirmAction();
    }
}

function settingLastSeq(categoryId) {
    if (!categoryId || categoryId === '0' || categoryId === 'add') {
        $('#seq').val(1);
        return;
    }
    $('#seq').val(getNextLinkSeq(String(categoryId), null));
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

function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

function generateNewCategoryId() {
    let maxId = 0;
    categories.forEach(category => {
        const numericId = parseInt(String(category.id).replace(/^cat-/, ''), 10);
        if (!Number.isNaN(numericId) && numericId > maxId) {
            maxId = numericId;
        }
    });
    return String(maxId + 1);
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

    if (shouldHideSyncRemoteDataButton()) {
        $('#syncRemoteDataButton').hide();
    }

    $('#clearStorageButton').on('click', function() {
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

    categories.sort((a, b) => (parseInt(a.seq, 10) || 0) - (parseInt(b.seq, 10) || 0));

    try {
        initializeTabs();
    } catch (error) {
        console.error('Error initializing tabs:', error);
        notyf.error('Tabs 初始化失败！');
    }

    populateCategorySelect();
    generateLinks();
    bindEventHandlers();

    $('#showAddLinkFormButton').on('click', function() {
        const activeTabId = getActiveTabId();
        const firstCategoryInActiveTab = getFirstCategoryIdInTab(activeTabId);
        openEditLinkModal({ categoryId: firstCategoryInActiveTab || categories[0]?.id });
    });

    $('#showAddCategoryFormButton').on('click', function() {
        openEditCategoryModal();
    });
});
