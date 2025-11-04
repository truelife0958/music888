// js/search-history.ts - 搜索历史功能

import { showNotification } from './ui';

// 搜索历史配置
const SEARCH_HISTORY_CONFIG = {
    STORAGE_KEY: 'search_history',
    MAX_HISTORY: 20, // 最多保存20条历史记录
};

let searchHistory: string[] = [];

// 初始化搜索历史
export function initSearchHistory() {
    loadSearchHistory();
    createHistoryContainer();
    updateHistoryDisplay();
    
    // 监听搜索框获得焦点时显示历史
    const searchInput = document.getElementById('searchInput') as HTMLInputElement;
    if (searchInput) {
        searchInput.addEventListener('focus', () => {
            if (searchHistory.length > 0) {
                showHistoryContainer();
            }
        });
        
        // 点击页面其他地方时隐藏历史
        document.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const historyContainer = document.getElementById('searchHistoryContainer');
            if (historyContainer && 
                !searchInput.contains(target) && 
                !historyContainer.contains(target)) {
                hideHistoryContainer();
            }
        });
    }
}

// 创建历史记录容器
function createHistoryContainer() {
    const searchContainer = document.querySelector('.search-container');
    if (!searchContainer) return;
    
    const container = document.createElement('div');
    container.id = 'searchHistoryContainer';
    container.className = 'search-history-container';
    container.innerHTML = `
        <div class="search-history-header">
            <span class="search-history-title">
                <i class="fas fa-history"></i> 搜索历史
            </span>
            <button class="search-history-clear" onclick="window.clearAllSearchHistory()">
                <i class="fas fa-trash-alt"></i> 清空
            </button>
        </div>
        <div class="search-history-tags" id="searchHistoryTags"></div>
    `;
    
    searchContainer.appendChild(container);
    
    // 全局函数
    (window as any).clearAllSearchHistory = clearAllHistory;
}

// 显示历史容器
function showHistoryContainer() {
    const container = document.getElementById('searchHistoryContainer');
    if (container && searchHistory.length > 0) {
        container.classList.add('active');
    }
}

// 隐藏历史容器
function hideHistoryContainer() {
    const container = document.getElementById('searchHistoryContainer');
    if (container) {
        container.classList.remove('active');
    }
}

// 加载搜索历史
function loadSearchHistory() {
    try {
        const saved = localStorage.getItem(SEARCH_HISTORY_CONFIG.STORAGE_KEY);
        if (saved) {
            searchHistory = JSON.parse(saved);
        }
    } catch (error) {
        console.error('加载搜索历史失败:', error);
        searchHistory = [];
    }
}

// 保存搜索历史
function saveSearchHistory() {
    try {
        localStorage.setItem(SEARCH_HISTORY_CONFIG.STORAGE_KEY, JSON.stringify(searchHistory));
    } catch (error) {
        console.error('保存搜索历史失败:', error);
    }
}

// 添加搜索记录
export function addSearchHistory(keyword: string) {
    if (!keyword || !keyword.trim()) return;
    
    const trimmedKeyword = keyword.trim();
    
    // 如果已存在，先移除
    const index = searchHistory.indexOf(trimmedKeyword);
    if (index > -1) {
        searchHistory.splice(index, 1);
    }
    
    // 添加到开头
    searchHistory.unshift(trimmedKeyword);
    
    // 限制数量
    if (searchHistory.length > SEARCH_HISTORY_CONFIG.MAX_HISTORY) {
        searchHistory = searchHistory.slice(0, SEARCH_HISTORY_CONFIG.MAX_HISTORY);
    }
    
    saveSearchHistory();
    updateHistoryDisplay();
}

// 删除单条历史
function removeSearchHistory(keyword: string) {
    const index = searchHistory.indexOf(keyword);
    if (index > -1) {
        searchHistory.splice(index, 1);
        saveSearchHistory();
        updateHistoryDisplay();
        
        if (searchHistory.length === 0) {
            hideHistoryContainer();
        }
    }
}

// 清空所有历史
function clearAllHistory() {
    if (searchHistory.length === 0) return;
    
    if (confirm('确定要清空所有搜索历史吗？')) {
        searchHistory = [];
        saveSearchHistory();
        updateHistoryDisplay();
        hideHistoryContainer();
        showNotification('已清空搜索历史', 'success');
    }
}

// 更新历史显示
function updateHistoryDisplay() {
    const tagsContainer = document.getElementById('searchHistoryTags');
    if (!tagsContainer) return;
    
    if (searchHistory.length === 0) {
        tagsContainer.innerHTML = `
            <div class="search-history-empty">暂无搜索历史</div>
        `;
        return;
    }
    
    tagsContainer.innerHTML = searchHistory.map(keyword => `
        <div class="search-history-tag">
            <span class="search-history-tag-text" onclick="window.searchFromHistory('${escapeHtml(keyword)}')">${escapeHtml(keyword)}</span>
            <button class="search-history-tag-remove" onclick="window.removeSearchHistoryItem('${escapeHtml(keyword)}')" title="删除">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
    
    // 全局函数
    (window as any).searchFromHistory = (keyword: string) => {
        const searchInput = document.getElementById('searchInput') as HTMLInputElement;
        if (searchInput) {
            searchInput.value = keyword;
            // 触发搜索
            const searchBtn = document.querySelector('.search-btn') as HTMLButtonElement;
            if (searchBtn) {
                searchBtn.click();
            }
        }
        hideHistoryContainer();
    };
    
    (window as any).removeSearchHistoryItem = (keyword: string) => {
        removeSearchHistory(keyword);
    };
}

// HTML转义
function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 获取搜索历史
export function getSearchHistory(): string[] {
    return [...searchHistory];
}

// 导出清空函数供外部调用
export function clearSearchHistory() {
    clearAllHistory();
}