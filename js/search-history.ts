/**
 * 搜索历史模块
 * 记录和管理用户的搜索历史
 */

const MAX_HISTORY_SIZE = 10;
const STORAGE_KEY = 'searchHistory';

let searchHistory: string[] = [];

/**
 * 初始化搜索历史
 */
export function initSearchHistory(): void {
    loadHistory();
    setupSearchHistoryUI();
}

/**
 * 加载历史记录
 */
function loadHistory(): void {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            searchHistory = JSON.parse(saved);
        }
    } catch (error) {
        searchHistory = [];
    }
}

/**
 * 保存历史记录
 */
function saveHistory(): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(searchHistory));
    } catch (error) {
        console.error('保存搜索历史失败');
    }
}

/**
 * 添加搜索记录
 */
export function addSearchHistory(keyword: string): void {
    if (!keyword || !keyword.trim()) return;
    
    keyword = keyword.trim();
    
    // 移除重复项
    searchHistory = searchHistory.filter(item => item !== keyword);
    
    // 添加到开头
    searchHistory.unshift(keyword);
    
    // 限制数量
    if (searchHistory.length > MAX_HISTORY_SIZE) {
        searchHistory = searchHistory.slice(0, MAX_HISTORY_SIZE);
    }
    
    saveHistory();
    updateHistoryDropdown();
}

/**
 * 清空搜索历史
 */
export function clearSearchHistory(): void {
    searchHistory = [];
    localStorage.removeItem(STORAGE_KEY);
    updateHistoryDropdown();
}

/**
 * 获取搜索历史
 */
export function getSearchHistory(): string[] {
    return [...searchHistory];
}

/**
 * 设置搜索历史UI
 */
function setupSearchHistoryUI(): void {
    const searchInput = document.getElementById('searchInput') as HTMLInputElement;
    if (!searchInput) return;

    // 创建历史下拉容器
    const historyContainer = document.createElement('div');
    historyContainer.id = 'searchHistoryDropdown';
    historyContainer.className = 'search-history-dropdown';
    historyContainer.style.display = 'none';
    
    // 🔧 关键修复：插入到body末尾，避免任何DOM层级冲突
    document.body.appendChild(historyContainer);

    // 聚焦时显示历史
    searchInput.addEventListener('focus', () => {
        if (searchHistory.length > 0) {
            // 🔧 动态计算位置，确保在搜索框下方且不覆盖搜索按钮
            const inputRect = searchInput.getBoundingClientRect();
            historyContainer.style.top = `${inputRect.bottom + window.scrollY + 5}px`;
            historyContainer.style.left = `${inputRect.left + window.scrollX}px`;
            historyContainer.style.width = `${inputRect.width}px`;
            
            updateHistoryDropdown();
            historyContainer.style.display = 'block';
        }
    });

    // 点击外部隐藏
    document.addEventListener('click', (e) => {
        const target = e.target as Node;
        // 🔧 关键：检查点击目标，如果是搜索按钮则不隐藏下拉菜单
        const searchBtn = document.querySelector('.search-btn');
        if (searchBtn && searchBtn.contains(target)) {
            // 点击搜索按钮时不隐藏，让搜索执行
            return;
        }
        
        if (!searchInput.contains(target) && !historyContainer.contains(target)) {
            historyContainer.style.display = 'none';
        }
    });

    // 添加样式
    addHistoryStyles();
}

/**
 * 更新历史下拉列表
 */
function updateHistoryDropdown(): void {
    const dropdown = document.getElementById('searchHistoryDropdown');
    if (!dropdown) return;

    if (searchHistory.length === 0) {
        dropdown.style.display = 'none';
        return;
    }

    dropdown.innerHTML = `
        <div class="history-header">
            <span><i class="fas fa-history"></i> 搜索历史</span>
            <button class="clear-history-btn" id="clearHistoryBtn">
                <i class="fas fa-trash"></i> 清空
            </button>
        </div>
        <div class="history-list">
            ${searchHistory.map(keyword => `
                <div class="history-item" data-keyword="${keyword}">
                    <i class="fas fa-clock"></i>
                    <span class="history-text">${keyword}</span>
                    <button class="remove-history-btn" data-keyword="${keyword}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `).join('')}
        </div>
    `;

    // 绑定点击事件
    dropdown.querySelectorAll('.history-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            // 如果点击的是删除按钮，不触发搜索
            if (target.closest('.remove-history-btn')) return;
            
            const keyword = (item as HTMLElement).dataset.keyword;
            if (keyword) {
                const searchInput = document.getElementById('searchInput') as HTMLInputElement;
                searchInput.value = keyword;
                dropdown.style.display = 'none';
                // 触发搜索
                searchInput.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter' }));
            }
        });
    });

    // 删除单个历史
    dropdown.querySelectorAll('.remove-history-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const keyword = (btn as HTMLElement).dataset.keyword;
            if (keyword) {
                removeHistoryItem(keyword);
            }
        });
    });

    // 清空所有历史
    const clearBtn = dropdown.querySelector('#clearHistoryBtn');
    clearBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('确定要清空所有搜索历史吗？')) {
            clearSearchHistory();
        }
    });
}

/**
 * 删除单个历史记录
 */
function removeHistoryItem(keyword: string): void {
    searchHistory = searchHistory.filter(item => item !== keyword);
    saveHistory();
    updateHistoryDropdown();
}

/**
 * 添加样式
 */
function addHistoryStyles(): void {
    if (document.getElementById('search-history-styles')) return;

    const style = document.createElement('style');
    style.id = 'search-history-styles';
    style.textContent = `
        .search-history-dropdown {
            position: absolute;
            background: var(--bg-secondary, #1e1e2e);
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            z-index: 9999;
            max-height: 400px;
            overflow-y: auto;
            animation: slideDown 0.2s ease;
            pointer-events: auto;
        }
        
        .search-history-dropdown[style*="display: none"] {
            pointer-events: none !important;
            visibility: hidden;
        }
        
        /* 🔧 确保搜索按钮和搜索框始终在最上层，高于下拉菜单 */
        .search-btn {
            position: relative !important;
            z-index: 1001 !important;
            pointer-events: auto !important;
        }
        
        .search-input {
            position: relative !important;
            z-index: 1001 !important;
        }
        
        .source-select {
            position: relative !important;
            z-index: 1001 !important;
        }
        
        .search-wrapper {
            position: relative;
            z-index: 1002;
        }
        
        .search-container {
            position: relative;
            z-index: 1002;
        }

        @keyframes slideDown {
            from {
                opacity: 0;
                transform: translateY(-10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .history-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            font-size: 13px;
            color: rgba(255, 255, 255, 0.6);
        }

        .history-header i {
            margin-right: 6px;
        }

        .clear-history-btn {
            background: none;
            border: none;
            color: #ef4444;
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            transition: all 0.2s;
        }

        .clear-history-btn:hover {
            background: rgba(239, 68, 68, 0.1);
        }

        .history-list {
            padding: 4px 0;
        }

        .history-item {
            display: flex;
            align-items: center;
            padding: 10px 16px;
            cursor: pointer;
            transition: all 0.2s;
            position: relative;
        }

        .history-item:hover {
            background: rgba(255, 255, 255, 0.05);
        }

        .history-item i.fa-clock {
            color: rgba(255, 255, 255, 0.4);
            margin-right: 12px;
            font-size: 14px;
        }

        .history-text {
            flex: 1;
            color: rgba(255, 255, 255, 0.9);
            font-size: 14px;
        }

        .remove-history-btn {
            background: none;
            border: none;
            color: rgba(255, 255, 255, 0.3);
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 4px;
            opacity: 0;
            transition: all 0.2s;
        }

        .history-item:hover .remove-history-btn {
            opacity: 1;
        }

        .remove-history-btn:hover {
            background: rgba(239, 68, 68, 0.1);
            color: #ef4444;
        }

        /* 浅色主题适配 */
        body.theme-light .search-history-dropdown {
            background: #ffffff;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }

        body.theme-light .history-header {
            border-bottom-color: rgba(0, 0, 0, 0.1);
            color: #666;
        }

        body.theme-light .history-item:hover {
            background: rgba(0, 0, 0, 0.03);
        }

        body.theme-light .history-item i.fa-clock {
            color: rgba(0, 0, 0, 0.4);
        }

        body.theme-light .history-text {
            color: #333;
        }

        body.theme-light .remove-history-btn {
            color: rgba(0, 0, 0, 0.3);
        }

        /* 搜索容器保持相对定位 */
        .search-container {
            position: relative;
        }
        
        .search-wrapper {
            position: relative;
            z-index: 2;
        }
        
        /* 移动端适配 */
        @media (max-width: 768px) {
            .search-history-dropdown {
                top: 120px;
                width: calc(100% - 30px);
                max-height: 300px;
            }
        }
    `;
    document.head.appendChild(style);
}