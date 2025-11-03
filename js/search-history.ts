// js/search-history.ts - 搜索历史功能模块

const MAX_HISTORY_SIZE = 10; // 最多保存10条搜索历史
const STORAGE_KEY = 'musicSearchHistory';

/**
 * 搜索历史项
 */
interface SearchHistoryItem {
    keyword: string;
    source: string;
    timestamp: number;
}

/**
 * 获取搜索历史
 */
export function getSearchHistory(): SearchHistoryItem[] {
    try {
        const historyJson = localStorage.getItem(STORAGE_KEY);
        if (!historyJson) return [];
        
        const history = JSON.parse(historyJson);
        return Array.isArray(history) ? history : [];
    } catch (error) {
        console.error('获取搜索历史失败:', error);
        return [];
    }
}

/**
 * 添加搜索历史
 */
export function addSearchHistory(keyword: string, source: string): void {
    if (!keyword || !keyword.trim()) return;
    
    try {
        const history = getSearchHistory();
        
        // 移除重复项（相同关键词+音乐源）
        const filteredHistory = history.filter(
            item => !(item.keyword === keyword && item.source === source)
        );
        
        // 添加新项到开头
        const newItem: SearchHistoryItem = {
            keyword: keyword.trim(),
            source,
            timestamp: Date.now()
        };
        
        filteredHistory.unshift(newItem);
        
        // 限制数量
        const limitedHistory = filteredHistory.slice(0, MAX_HISTORY_SIZE);
        
        // 保存
        localStorage.setItem(STORAGE_KEY, JSON.stringify(limitedHistory));
    } catch (error) {
        console.error('保存搜索历史失败:', error);
    }
}

/**
 * 清空搜索历史
 */
export function clearSearchHistory(): void {
    try {
        localStorage.removeItem(STORAGE_KEY);
        console.log('搜索历史已清空');
    } catch (error) {
        console.error('清空搜索历史失败:', error);
    }
}

/**
 * 删除指定搜索历史
 */
export function removeSearchHistoryItem(keyword: string, source: string): void {
    try {
        const history = getSearchHistory();
        const filteredHistory = history.filter(
            item => !(item.keyword === keyword && item.source === source)
        );
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredHistory));
    } catch (error) {
        console.error('删除搜索历史失败:', error);
    }
}

/**
 * 渲染搜索历史UI（可选功能）
 */
export function renderSearchHistory(containerId: string, onItemClick?: (keyword: string, source: string) => void): void {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const history = getSearchHistory();
    
    if (history.length === 0) {
        container.innerHTML = '<div class="empty-history">暂无搜索历史</div>';
        return;
    }
    
    const historyHTML = history.map(item => {
        const sourceName = getSourceName(item.source);
        const timeStr = formatTime(item.timestamp);
        
        return `
            <div class="history-item" data-keyword="${item.keyword}" data-source="${item.source}">
                <div class="history-content">
                    <i class="fas fa-history"></i>
                    <span class="history-keyword">${escapeHtml(item.keyword)}</span>
                    <span class="history-source">${sourceName}</span>
                    <span class="history-time">${timeStr}</span>
                </div>
                <button class="history-delete" title="删除">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }).join('');
    
    container.innerHTML = `
        <div class="history-header">
            <h4><i class="fas fa-history"></i> 搜索历史</h4>
            <button class="clear-history-btn" title="清空历史">
                <i class="fas fa-trash"></i>
            </button>
        </div>
        <div class="history-list">
            ${historyHTML}
        </div>
    `;
    
    // 绑定点击事件
    if (onItemClick) {
        container.querySelectorAll('.history-item').forEach(item => {
            const keyword = item.getAttribute('data-keyword');
            const source = item.getAttribute('data-source');
            
            item.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                // 如果点击的是删除按钮，不触发搜索
                if (target.closest('.history-delete')) return;
                
                if (keyword && source) {
                    onItemClick(keyword, source);
                }
            });
        });
    }
    
    // 绑定删除按钮
    container.querySelectorAll('.history-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const item = (e.currentTarget as HTMLElement).closest('.history-item');
            const keyword = item?.getAttribute('data-keyword');
            const source = item?.getAttribute('data-source');
            
            if (keyword && source) {
                removeSearchHistoryItem(keyword, source);
                renderSearchHistory(containerId, onItemClick);
            }
        });
    });
    
    // 绑定清空按钮
    const clearBtn = container.querySelector('.clear-history-btn');
    clearBtn?.addEventListener('click', () => {
        if (confirm('确定要清空所有搜索历史吗？')) {
            clearSearchHistory();
            renderSearchHistory(containerId, onItemClick);
        }
    });
}

/**
 * 获取音乐源名称
 */
function getSourceName(source: string): string {
    const names: Record<string, string> = {
        'netease': '网易云',
        'tencent': 'QQ音乐',
        'kugou': '酷狗',
        'kuwo': '酷我',
        'xiami': '虾米',
        'baidu': '百度',
        'bilibili': 'B站'
    };
    return names[source] || source;
}

/**
 * 格式化时间
 */
function formatTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    
    if (diff < minute) {
        return '刚刚';
    } else if (diff < hour) {
        return `${Math.floor(diff / minute)}分钟前`;
    } else if (diff < day) {
        return `${Math.floor(diff / hour)}小时前`;
    } else if (diff < 7 * day) {
        return `${Math.floor(diff / day)}天前`;
    } else {
        const date = new Date(timestamp);
        return `${date.getMonth() + 1}/${date.getDate()}`;
    }
}

/**
 * HTML转义
 */
function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 初始化搜索历史功能
 * 在应用启动时调用，绑定相关事件
 */
export function initSearchHistory(): void {
    console.log('搜索历史模块已初始化');
    // 这个函数主要用于未来扩展，目前搜索历史功能通过直接调用其他导出函数实现
    // 例如：在搜索框下方显示历史记录、绑定快捷键等
}