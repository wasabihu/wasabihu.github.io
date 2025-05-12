// index.js

$(document).ready(function() {
    // 初始化 tabs
    // 假设 HTML 中有 id="tabsEx1" 和 id="tabsEx2" 的元素，并且它们的直接子元素是 <ul>
    if ($("#tabsEx1 > ul").length) {
        $("#tabsEx1 > ul").tabs({
            active: 0 // jQuery UI 1.9+ 使用 active 而不是 selected
        });
    }
    if ($("#tabsEx2 > ul").length) {
        $("#tabsEx2 > ul").tabs({
            active: 0
        });
    }

    // 填充分类选择框
    populateCategorySelect();

    // 生成链接列表
    generateLinks();

    // 绑定事件处理函数
    bindEventHandlers();

    // 处理下拉框选择 "新增分类"
    $('#item_select').on('change', function() {
        if ($(this).val() === 'add') {
            // 清空分类表单用于新增
            $('#item_id').val('');
            $('#it_title').val('');
            $('#it_seq').val(categories.length + 1); // 假设新分类的排序是最后
            $('#it_page').val('fragment-1'); // 默认 page
            showModal('editItemDiv');
            // 重置下拉框选择，避免一直停留在 "新增分类"
            $(this).val("0");
        }
    });
});

// 填充分类选择框
function populateCategorySelect() {
    var select = document.getElementById('item_select');
    if (!select) return; // 如果找不到元素则退出

    select.innerHTML = ''; // 清空之前的选项

    var defaultOption = document.createElement('option');
    defaultOption.value = "0";
    defaultOption.text = "------------------";
    select.appendChild(defaultOption); // 使用 appendChild

    categories.forEach(function(category) {
        var option = document.createElement('option');
        option.value = category.id;
        option.text = category.name;
        select.appendChild(option);
    });

    var addOption = document.createElement('option');
    addOption.value = "add";
    addOption.text = "新增分类";
    addOption.classList.add("thickbox"); // thickbox 类名可能与 jQuery UI 或其他 lightbox 插件相关
    select.appendChild(addOption);
}

// 生成链接列表
function generateLinks() {
    var fragmentSelectors = ['#fragment-1', '#fragment-2', '#fragment-3', '#fragment-4', '#fragment-6'];
    var fragments = {};

    fragmentSelectors.forEach(function(selector) {
        var element = $(selector);
        if (element.length) {
            fragments[selector.substring(1)] = element; // Store by id (e.g., "fragment-1")
            element.html(''); // 清空内容
        }
    });

    // 确保 categories 和 links 已定义
    if (typeof categories === 'undefined' || typeof links === 'undefined') {
        console.error("Categories or links data is not defined.");
        return;
    }

    categories.forEach(function(category) {
        var categoryName = category.name;

        if (links.hasOwnProperty(categoryName) && Array.isArray(links[categoryName]) && links[categoryName].length > 0) {
            var categoryContainer = $('<div>').addClass('category-container').attr('data-category', categoryName);
            var categoryTitle = $('<h3>').addClass('category-title').text(categoryName);
            var linksContainer = $('<div>').addClass('links-container');

            links[categoryName].forEach(function(link) {
                var linkElement = createLinkElement(link);
                linksContainer.append(linkElement);
            });

            categoryContainer.append(categoryTitle).append(linksContainer);

            var targetFragmentId = category.page || 'fragment-1'; // 默认 page
            if (fragments[targetFragmentId]) {
                fragments[targetFragmentId].append(categoryContainer);
            } else {
                console.warn('Target fragment "' + targetFragmentId + '" for category "' + categoryName + '" not found. Appending to fragment-1 by default.');
                if (fragments['fragment-1']) {
                    fragments['fragment-1'].append(categoryContainer);
                }
            }
        }
    });
}


// 绑定事件处理函数
function bindEventHandlers() {
    // 使用 jQuery 的 on 方法进行事件委托，可以处理动态添加的元素
    // 为父元素绑定一次即可

    // 编辑和新增链接/分类的提交按钮
    $('#edit_link_but').off('click').on('click', editLink);
    $('#edit_item_but').off('click').on('click', editCategory);

    // 双击链接编辑
    // 确保至少有一个 fragment 容器存在，或者委托给 #content
    $('#content').off('dblclick', '.links-container a.link').on('dblclick', '.links-container a.link', function(event) {
        event.preventDefault();
        editLinkForm.call(this); // 使用 call 来设置 this 上下文
    });

    // 双击分类标题编辑
    $('#content').off('dblclick', '.category-container .category-title').on('dblclick', '.category-container .category-title', function(event) {
        event.preventDefault();
        editCategoryForm.call(this); // 使用 call 来设置 this 上下文
    });

    // 导出数据按钮
    $('#exportDataButton').off('click').on('click', exportDataAsJson);

    // 如果还有其他通过 onclick 绑定的，也建议移到这里
    // 例如 modal 中的取消按钮
    $('.modal-form input[type="button"][value="取消"]').each(function() {
        var modalId = $(this).closest('.modal').attr('id');
        if (modalId) {
            $(this).off('click').on('click', function() {
                hideModal(modalId);
            });
        }
    });

    // 表单中 "删除" 链接的事件绑定 (如果它是用于删除当前编辑的链接)
    // 注意: HTML 中的 onclick="deleteLink();return false;" 需要移除
    // 给这个删除链接一个特定的 ID 或 class，例如 #deleteCurrentLinkButton
    // <span class="form-link-delete"><a href="#" id="deleteCurrentLinkButton">删除</a></span>
    $('#deleteCurrentLinkButton').off('click').on('click', function(event) {
        event.preventDefault();
        deleteLink();
    });
}


// 处理新增/编辑链接逻辑
function editLink(event) {
    if (event) event.preventDefault();

    var linkId = $('#link_id').val();
    var linkName = $('#name').val().trim();
    var linkHref = $('#href').val().trim();
    var linkDescription = $('#description').val().trim();
    var linkSeq = $('#seq').val().trim();
    var selectedCategoryId = $('#item_select').val(); // 获取的是 category id

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

    if (linkId === '') { // 新增链接
        var newLink = {
            id: 'link-' + generateUniqueId(), // 加上前缀避免纯数字ID问题
            href: linkHref,
            title: linkDescription,
            text: linkName,
            seq: linkSeq || '999' // 默认排序值
        };

        if (!links[selectedCategoryName]) {
            links[selectedCategoryName] = [];
        }
        links[selectedCategoryName].push(newLink);
        // 按 seq 排序 (可选)
        links[selectedCategoryName].sort((a, b) => parseInt(a.seq) - parseInt(b.seq));

        // 动态添加到 UI (或者直接调用 generateLinks() 刷新整个列表)
        // 为了简单和一致性，可以考虑刷新，但如果数据量大，则局部更新更优
        generateLinks(); // 重新生成所有链接以反映新增和排序

    } else { // 修改链接
        let foundAndUpdated = false;
        for (var categoryNameKey in links) {
            if (links.hasOwnProperty(categoryNameKey)) {
                var linkIndex = links[categoryNameKey].findIndex(link => link.id === linkId);

                if (linkIndex !== -1) {
                    var originalCategoryName = categoryNameKey;
                    var linkToUpdate = links[originalCategoryName][linkIndex];

                    linkToUpdate.href = linkHref;
                    linkToUpdate.title = linkDescription;
                    linkToUpdate.text = linkName;
                    linkToUpdate.seq = linkSeq || '999';

                    // 如果分类改变了
                    if (originalCategoryName !== selectedCategoryName) {
                        links[originalCategoryName].splice(linkIndex, 1); // 从旧分类移除
                        if (!links[selectedCategoryName]) {
                            links[selectedCategoryName] = [];
                        }
                        links[selectedCategoryName].push(linkToUpdate); // 添加到新分类
                        links[selectedCategoryName].sort((a, b) => parseInt(a.seq) - parseInt(b.seq));
                    } else {
                        links[originalCategoryName].sort((a, b) => parseInt(a.seq) - parseInt(b.seq));
                    }
                    foundAndUpdated = true;
                    break;
                }
            }
        }
        if (foundAndUpdated) {
            generateLinks(); // 重新生成所有链接
        } else {
            alert('未找到要更新的链接！');
            return;
        }
    }

    hideModal('linkContent');
    alert('操作成功');
}

// 处理新增/编辑分类逻辑
function editCategory(event) {
    if (event) event.preventDefault();

    var categoryId = $('#item_id').val();
    var categoryTitle = $('#it_title').val().trim();
    var categorySort = $('#it_seq').val().trim(); // 分类的排序
    var categoryPage = $('#it_page').val().trim(); // 分类所属的 fragment id

    if (!categoryTitle) {
        alert('分类名称不能为空！');
        return;
    }
    if (!categoryPage) {
        alert('Page (所属Tab的Fragment ID) 不能为空！');
        return;
    }


    if (categoryId === '') { // 新增分类
        // 检查分类名是否已存在
        if (categories.some(cat => cat.name === categoryTitle)) {
            alert('分类名称 "' + categoryTitle + '" 已存在！');
            return;
        }
        var newCategory = {
            id: 'cat-' + generateUniqueId(), // 加上前缀
            name: categoryTitle,
            sort: categorySort || (categories.length + 1).toString(),
            page: categoryPage
        };
        categories.push(newCategory);
        // 按 sort 排序 (可选)
        categories.sort((a,b) => parseInt(a.sort) - parseInt(b.sort));

        if (!links[newCategory.name]) { // 如果 links 对象中尚无此分类，则创建一个空数组
            links[newCategory.name] = [];
        }

    } else { // 修改分类
        var categoryIndex = categories.findIndex(cat => cat.id === categoryId);
        if (categoryIndex !== -1) {
            var oldCategoryName = categories[categoryIndex].name;
            // 如果分类名改变了，检查新名称是否与现有其他分类冲突 (排除自身)
            if (oldCategoryName !== categoryTitle && categories.some(cat => cat.name === categoryTitle && cat.id !== categoryId)) {
                alert('修改后的分类名称 "' + categoryTitle + '" 与其他分类冲突！');
                return;
            }

            categories[categoryIndex].name = categoryTitle;
            categories[categoryIndex].sort = categorySort || (categories.length + 1).toString();
            categories[categoryIndex].page = categoryPage;
             categories.sort((a,b) => parseInt(a.sort) - parseInt(b.sort));


            // 如果分类名改变了，需要更新 links 对象中的键
            if (oldCategoryName !== categoryTitle && links.hasOwnProperty(oldCategoryName)) {
                links[categoryTitle] = links[oldCategoryName]; // 将旧分类名下的链接转移到新分类名下
                delete links[oldCategoryName]; // 删除旧的分类名键
            }
        } else {
            alert('未找到要更新的分类！');
            return;
        }
    }

    populateCategorySelect(); // 重新填充下拉框
    generateLinks(); // 重新生成链接列表
    hideModal('editItemDiv');
    alert('操作成功');
}

// 删除链接
function deleteLink() {
    var linkId = $('#link_id').val(); // 从表单获取要删除的链接ID

    if (!linkId) {
        alert('没有指定要删除的链接！');
        return false;
    }

    let foundAndDeleted = false;
    for (var categoryName in links) {
        if (links.hasOwnProperty(categoryName)) {
            var linkIndex = links[categoryName].findIndex(link => link.id === linkId);
            if (linkIndex !== -1) {
                links[categoryName].splice(linkIndex, 1); // 从数据中移除
                foundAndDeleted = true;
                break;
            }
        }
    }

    if (foundAndDeleted) {
        generateLinks(); // 重新渲染列表
        hideModal('linkContent'); // 关闭可能打开的编辑链接模态框
        alert('删除成功');
    } else {
        alert('未找到要删除的链接！');
    }
}

// 生成唯一ID (简单版)
function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// 创建链接元素 (返回 jQuery 对象)
function createLinkElement(link) {
    return $('<a>')
        .attr('href', link.href)
        .attr('title', link.title || link.text) // 如果title为空，使用text
        .text(link.text)
        .addClass('link')
        .attr('id', link.id)
        .attr('target', '_blank');
}

// 清空链接表单
function clean_hyplink_form() {
    $('#link_id').val('');
    $('#name').val('');
    $('#href').val('');
    $('#description').val('');
    $('#seq').val('');
    $('#item_select').val("0"); // 重置分类选择
}

// 设置新链接的预估排序号
function settingLastSeq(selectedCategoryId) {
    var seq = 1; // 默认为 1
    if (selectedCategoryId && selectedCategoryId !== "0") {
        var category = categories.find(cat => cat.id === selectedCategoryId);
        if (category && links[category.name] && links[category.name].length > 0) {
            const maxSeq = Math.max(...links[category.name].map(link => parseInt(link.seq, 10) || 0));
            seq = maxSeq + 1;
        }
    }
    $('#seq').val(seq);
}

// 显示模态框
function showModal(modalId) {
    $('#' + modalId).show(); // 使用 jQuery 的 show
}

// 隐藏模态框
function hideModal(modalId) {
    $('#' + modalId).hide(); // 使用 jQuery 的 hide
}

// 准备并显示编辑链接表单
function editLinkForm() {
    var linkElement = $(this); // this 已经是 jQuery 对象 (如果通过 jQuery 委托绑定) 或 DOM 元素

    clean_hyplink_form(); // 先清空表单

    $('#link_id').val(linkElement.attr('id'));
    $('#name').val(linkElement.text());
    $('#href').val(linkElement.attr('href'));
    $('#description').val(linkElement.attr('title'));

    // 获取链接所在分类的名称
    var categoryContainer = linkElement.closest('.category-container');
    var categoryNameData = categoryContainer.data('category'); // jQuery 的 data() 方法

    var categoryObj = categories.find(cat => cat.name === categoryNameData);
    if (categoryObj) {
        $('#item_select').val(categoryObj.id); // 设置分类选择框的值
        // 设置排序号，需要从数据中找到该链接
        var linkData = links[categoryNameData].find(l => l.id === linkElement.attr('id'));
        if (linkData) {
            $('#seq').val(linkData.seq);
        }
    } else {
         $('#item_select').val("0"); // 如果找不到分类，重置
    }
    showModal('linkContent');
}

// 准备并显示编辑分类表单
function editCategoryForm() {
    var categoryTitleElement = $(this); // this 是 .category-title元素
    var categoryContainer = categoryTitleElement.closest('.category-container');
    var categoryNameData = categoryContainer.data('category');

    var category = categories.find(cat => cat.name === categoryNameData);

    if (category) {
        $('#item_id').val(category.id);
        $('#it_title').val(category.name);
        $('#it_seq').val(category.sort || ''); // 如果 sort 不存在，则为空
        $('#it_page').val(category.page || 'fragment-1'); // 如果 page 不存在，默认为 fragment-1
        showModal('editItemDiv');
    } else {
        alert('找不到分类 "' + categoryNameData + '" 的详细信息。');
    }
}

// index.js

// ... (其他程式碼保持不變) ...

// 修改：匯出資料為可直接替換 data.js 的 .js 檔案內容 (最小空間)
function exportDataAsJson() {
    if (typeof categories === 'undefined' || typeof links === 'undefined') {
        alert('錯誤: 找不到 categories 或 links 資料。');
        return;
    }

    // 1. 准备 categories 数据
    // 确保只包含原始 data.js 中 categories 对象有的 'id' 和 'name' 属性
    const categoriesToExport = categories.map(cat => {
        // 根据你 data.js 中 categories 对象的实际结构来决定包含哪些字段
        // 假设原始 data.js 中的 categories 对象只有 id 和 name:
        return {
            id: cat.id,
            name: cat.name
            // 如果你的 data.js 中 cat 对象还有其他你想保留的字段（如 page, sort），
            // 且这些字段确实存在于原始 data.js 或你希望它们成为新 data.js 的一部分，
            // 那么在这里也应该包含它们。
            // page: cat.page,
            // sort: cat.sort
        };
    });
    // 不使用美化参数 (null, 4)，JSON.stringify 将生成最紧凑的字符串
    const categoriesString = `var categories=${JSON.stringify(categoriesToExport)};`;


    // 2. 准备 links 数据
    // 确保只包含原始 data.js 中 links 对象内链接对象有的属性
    const linksToExport = {};
    for (const categoryName in links) {
        if (links.hasOwnProperty(categoryName)) {
            if (Array.isArray(links[categoryName])) {
                linksToExport[categoryName] = links[categoryName].map(link => {
                    // 假设原始 data.js 中的链接对象有 id, href, title, text, seq:
                    return {
                        id: link.id,
                        href: link.href,
                        title: link.title,
                        text: link.text,
                        seq: link.seq
                    };
                });
            }
        }
    }
    // 不使用美化参数，生成最紧凑的字符串
    const linksString = `var links=${JSON.stringify(linksToExport)};`;

    // 3. 合并成完整的 data.js 内容字符串
    // 使用一个换行符分隔两个变量定义
    const dataJsContent = `${categoriesString}\n${linksString}\n`;

    // 4. 创建一个 Blob 对象
    const blob = new Blob([dataJsContent], { type: 'text/javascript;charset=utf-8;' });

    // 5. 创建一个下载链接
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);

    // 6. 設定下載檔案的名稱
    const now = new Date();
    const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
    a.download = `data_minified_${timestamp}.js`; // 文件名可以反映是最小化的

    // 7. 模擬點擊下載連結
    document.body.appendChild(a);
    a.click();

    // 8. 清理
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);

    alert('最小化 data.js 格式的檔案已開始匯出！');
}

// ... (其他程式碼保持不變) ...


// 用于添加新链接的按钮 (如果 HTML 中有这样一个独立按钮)
// 假设 HTML 中有一个 <button id="showAddLinkFormButton">新增链接</button>
$('#showAddLinkFormButton').on('click', function() {
    clean_hyplink_form();
    // 可以尝试根据当前激活的 tab 来预设分类
    var activeTabFragmentId = $("#tabsEx1 > ul .ui-tabs-active").attr('aria-controls') || $("#tabsEx2 > ul .ui-tabs-active").attr('aria-controls') || 'fragment-1';
    // 找到第一个在 activeTabFragmentId 中的分类
    var firstCategoryInActiveTab = categories.find(cat => cat.page === activeTabFragmentId);
    if (firstCategoryInActiveTab) {
        $('#item_select').val(firstCategoryInActiveTab.id);
        settingLastSeq(firstCategoryInActiveTab.id);
    } else {
        settingLastSeq(null); // 或者根据 "0" (未选择分类) 设置
    }
    showModal('linkContent');
});

// index.js

$(document).ready(function() {
    // ... (之前的 $(document).ready() 內容) ...

    // 新增：為“新增链接”按钮绑定事件
    // 这个按钮的 ID 是 showAddLinkFormButton
    $('#showAddLinkFormButton').on('click', function() {
        clean_hyplink_form(); // 清空表单，并将 link_id 设为空字符串

        // 尝试预设分类和排序
        // 优先选择当前激活的 tab 页的第一个分类
        var activeTabLi = $("#tabsEx1 > ul .ui-tabs-active").length ? $("#tabsEx1 > ul .ui-tabs-active") : $("#tabsEx2 > ul .ui-tabs-active");
        var activeTabFragmentId = activeTabLi.length ? activeTabLi.attr('aria-controls') : null;
        
        var preSelectedCategoryId = "0"; // 默认不选择

        if (activeTabFragmentId) {
            // 找到第一个 page 属性与 activeTabFragmentId 匹配的分类
            var firstCategoryInActiveTab = categories.find(cat => cat.page === activeTabFragmentId);
            if (firstCategoryInActiveTab) {
                preSelectedCategoryId = firstCategoryInActiveTab.id;
            }
        }
        
        // 如果没有找到活动 Tab 的分类，或者没有活动 Tab，可以尝试选择 categories 中的第一个分类
        if (preSelectedCategoryId === "0" && categories.length > 0) {
            // 检查 categories[0] 是否有效
            if(categories[0] && categories[0].id) {
                 preSelectedCategoryId = categories[0].id;
            }
        }

        $('#item_select').val(preSelectedCategoryId); // 设置下拉框的选中项
        settingLastSeq(preSelectedCategoryId); // 根据选中的分类（或未选中）设置排序

        showModal('linkContent'); // 显示链接编辑/新增模态框
    });
});

// ... (populateCategorySelect, generateLinks, bindEventHandlers 等函数保持不变或使用之前的版本) ...

// clean_hyplink_form 函数 (确保它将 link_id 设为空)
function clean_hyplink_form() {
    $('#link_id').val(''); // 确保 link_id 为空，表示是新增操作
    $('#name').val('');
    $('#href').val('');
    $('#description').val(''); // "备注" 对应 "description" 字段
    $('#seq').val('');
    $('#item_select').val("0"); // 重置分类选择到 "------------------"
}

// settingLastSeq 函数 (确保它能处理 categoryId 为 "0" 或 null 的情况)
function settingLastSeq(selectedCategoryId) {
    var seq = 1; // 默认排序为 1
    if (selectedCategoryId && selectedCategoryId !== "0") {
        var category = categories.find(cat => cat.id === selectedCategoryId);
        if (category && links[category.name] && Array.isArray(links[category.name]) && links[category.name].length > 0) {
            // 确保 link.seq 是数字或可以转为数字
            const sequences = links[category.name].map(link => parseInt(link.seq, 10)).filter(s => !isNaN(s));
            if (sequences.length > 0) {
                seq = Math.max(...sequences) + 1;
            } else {
                seq = 1; // 如果该分类下所有链接的seq都无效，则从1开始
            }
        } else {
            seq = 1; // 如果分类下尚无链接，新链接排序为1
        }
    }
    // 如果没有选择分类 (selectedCategoryId 为 "0" 或 null)，排序默认为 1
    // 或者，你可以决定在这种情况下不设置 seq，让用户必须选择分类
    $('#seq').val(seq);
}


// editLink 函数 (它已经处理了 linkId === '' 的新增情况)
// 请确保你使用的是包含此逻辑的 editLink 版本
function editLink(event) {
    if (event) event.preventDefault();

    var linkId = $('#link_id').val(); // 如果是新增，这里会是空字符串
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

    if (linkId === '') { // 新增链接逻辑
        var newLink = {
            id: 'link-' + generateUniqueId(),
            href: linkHref,
            title: linkDescription, // 对应 "备注"
            text: linkName,
            seq: linkSeq || '1' // 如果用户没填排序，默认为 '1' 或其他合理值
        };

        if (!links[selectedCategoryName]) {
            links[selectedCategoryName] = [];
        }
        links[selectedCategoryName].push(newLink);
        links[selectedCategoryName].sort((a, b) => (parseInt(a.seq, 10) || 0) - (parseInt(b.seq, 10) || 0));

        generateLinks(); // 刷新列表显示

    } else { // 修改链接逻辑 (保持不变)
        let foundAndUpdated = false;
        for (var categoryNameKey in links) {
            if (links.hasOwnProperty(categoryNameKey)) {
                var linkIndex = links[categoryNameKey].findIndex(link => link.id === linkId);

                if (linkIndex !== -1) {
                    var originalCategoryName = categoryNameKey;
                    var linkToUpdate = links[originalCategoryName][linkIndex];

                    linkToUpdate.href = linkHref;
                    linkToUpdate.title = linkDescription; // 对应 "备注"
                    linkToUpdate.text = linkName;
                    linkToUpdate.seq = linkSeq || '1';

                    if (originalCategoryName !== selectedCategoryName) {
                        links[originalCategoryName].splice(linkIndex, 1);
                        if (!links[selectedCategoryName]) {
                            links[selectedCategoryName] = [];
                        }
                        links[selectedCategoryName].push(linkToUpdate);
                        links[selectedCategoryName].sort((a, b) => (parseInt(a.seq, 10) || 0) - (parseInt(b.seq, 10) || 0));
                    } else {
                        links[originalCategoryName].sort((a, b) => (parseInt(a.seq, 10) || 0) - (parseInt(b.seq, 10) || 0));
                    }
                    foundAndUpdated = true;
                    break;
                }
            }
        }
        if (foundAndUpdated) {
            generateLinks();
        } else {
            alert('未找到要更新的链接！');
            return;
        }
    }

    hideModal('linkContent');
    alert('操作成功');
    // 如果你想在操作成功后，让汇出按钮闪烁或提示用户汇出以保存更改，可以在这里添加逻辑
}
