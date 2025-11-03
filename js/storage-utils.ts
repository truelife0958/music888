// js/storage-utils.ts - LocalStorage工具函数

const QUOTA_WARNING_THRESHOLD = 8 * 1024 * 1024; // 8MB警告阈值
const QUOTA_MAX_SIZE = 10 * 1024 * 1024; // 10MB最大容量（浏览器通常限制5-10MB）

/**
 * 获取localStorage使用情况
 */
export function getStorageUsage(): { used: number; estimated: number; percentage: number } {
    let used = 0;
    
    try {
        for (const key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                const value = localStorage.getItem(key);
                if (value) {
                    // 估算字节数：key + value 的字符串长度 * 2（UTF-16编码）
                    used += (key.length + value.length) * 2;
                }
            }
        }
    } catch (error) {
        console.error('获取存储使用情况失败:', error);
    }
    
    const percentage = (used / QUOTA_MAX_SIZE) * 100;
    
    return {
        used,
        estimated: QUOTA_MAX_SIZE,
        percentage: Math.min(percentage, 100)
    };
}

/**
 * 检查是否接近配额限制
 */
export function isNearQuotaLimit(): boolean {
    const usage = getStorageUsage();
    return usage.used >= QUOTA_WARNING_THRESHOLD;
}

/**
 * 格式化字节数为可读格式
 */
export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 安全地保存到localStorage（带容量检查）
 */
export function safeSetItem(key: string, value: string): boolean {
    try {
        // 检查当前使用情况
        const usage = getStorageUsage();
        const newDataSize = (key.length + value.length) * 2;
        const projectedSize = usage.used + newDataSize;
        
        // 如果预计会超过限制，先清理旧数据
        if (projectedSize > QUOTA_MAX_SIZE) {
            console.warn(`⚠️ localStorage接近容量限制: ${formatBytes(usage.used)}/${formatBytes(usage.estimated)}`);
            
            // 尝试清理最旧的数据
            const cleaned = cleanupOldData();
            if (!cleaned) {
                console.error('❌ localStorage容量已满且无法清理，保存失败');
                showStorageFullNotification();
                return false;
            }
        }
        
        // 尝试保存
        localStorage.setItem(key, value);
        
        // 检查是否接近警告阈值
        if (isNearQuotaLimit()) {
            console.warn(`⚠️ localStorage使用率: ${usage.percentage.toFixed(1)}%`);
            showStorageWarningNotification();
        }
        
        return true;
    } catch (error) {
        if (error instanceof Error && error.name === 'QuotaExceededError') {
            console.error('❌ localStorage配额已满:', error);
            showStorageFullNotification();
            
            // 尝试清理后再试一次
            if (cleanupOldData()) {
                try {
                    localStorage.setItem(key, value);
                    return true;
                } catch (retryError) {
                    console.error('❌ 清理后仍然无法保存:', retryError);
                }
            }
        } else {
            console.error('❌ localStorage保存失败:', error);
        }
        return false;
    }
}

/**
 * 安全地保存对象到localStorage
 */
export function safeSetObject(key: string, obj: any): boolean {
    try {
        const jsonString = JSON.stringify(obj);
        return safeSetItem(key, jsonString);
    } catch (error) {
        console.error('❌ 对象序列化失败:', error);
        return false;
    }
}

/**
 * 从localStorage获取对象
 */
export function safeGetObject<T>(key: string, defaultValue: T): T {
    try {
        const item = localStorage.getItem(key);
        if (!item) return defaultValue;
        
        return JSON.parse(item) as T;
    } catch (error) {
        console.error(`❌ 读取${key}失败:`, error);
        return defaultValue;
    }
}

/**
 * 清理旧数据以释放空间
 */
function cleanupOldData(): boolean {
    try {
        console.log('🧹 开始清理localStorage旧数据...');
        
        // 优先级：临时数据 > 历史记录 > 收藏数据
        const cleanupPriority = [
            { key: 'tempSearchResults', name: '临时搜索结果' },
            { key: 'recentPlays', name: '最近播放（保留最新20条）' },
            { key: 'musicPlayerHistory', name: '播放历史（保留最新30条）' },
            { key: 'musicSearchHistory', name: '搜索历史（保留最新5条）' }
        ];
        
        let cleaned = false;
        
        for (const item of cleanupPriority) {
            if (localStorage.getItem(item.key)) {
                if (item.key.includes('History') || item.key.includes('recent')) {
                    // 对于历史记录，保留最新的几条
                    try {
                        const data = JSON.parse(localStorage.getItem(item.key) || '[]');
                        if (Array.isArray(data) && data.length > 10) {
                            const trimmed = data.slice(-10); // 只保留最新10条
                            localStorage.setItem(item.key, JSON.stringify(trimmed));
                            console.log(`✂️ 已裁剪${item.name}: ${data.length} -> ${trimmed.length}`);
                            cleaned = true;
                            break;
                        }
                    } catch (e) {
                        // 如果解析失败，直接删除
                        localStorage.removeItem(item.key);
                        console.log(`🗑️ 已删除${item.name}`);
                        cleaned = true;
                        break;
                    }
                } else {
                    // 临时数据直接删除
                    localStorage.removeItem(item.key);
                    console.log(`🗑️ 已删除${item.name}`);
                    cleaned = true;
                    break;
                }
            }
        }
        
        if (cleaned) {
            const usage = getStorageUsage();
            console.log(`✅ 清理完成，当前使用: ${formatBytes(usage.used)} (${usage.percentage.toFixed(1)}%)`);
        } else {
            console.warn('⚠️ 没有可清理的数据');
        }
        
        return cleaned;
    } catch (error) {
        console.error('❌ 清理数据失败:', error);
        return false;
    }
}

/**
 * 显示存储空间警告通知
 */
function showStorageWarningNotification(): void {
    const usage = getStorageUsage();
    const message = `存储空间使用率较高: ${formatBytes(usage.used)}/${formatBytes(usage.estimated)} (${usage.percentage.toFixed(1)}%)`;
    
    // 尝试使用项目的通知系统
    if (typeof (window as any).showNotification === 'function') {
        (window as any).showNotification(message, 'warning');
    } else {
        console.warn(`⚠️ ${message}`);
    }
}

/**
 * 显示存储空间已满通知
 */
function showStorageFullNotification(): void {
    const message = '存储空间已满！部分功能可能无法正常使用。建议清理浏览器缓存或删除不需要的数据。';
    
    // 尝试使用项目的通知系统
    if (typeof (window as any).showNotification === 'function') {
        (window as any).showNotification(message, 'error');
    } else {
        console.error(`❌ ${message}`);
        alert(message); // 降级到alert
    }
}

/**
 * 获取存储空间报告
 */
export function getStorageReport(): string {
    const usage = getStorageUsage();
    const items: Array<{ key: string; size: number }> = [];
    
    for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
            const value = localStorage.getItem(key);
            if (value) {
                const size = (key.length + value.length) * 2;
                items.push({ key, size });
            }
        }
    }
    
    // 按大小排序
    items.sort((a, b) => b.size - a.size);
    
    let report = `📊 LocalStorage 使用报告\n`;
    report += `${'='.repeat(50)}\n`;
    report += `总使用量: ${formatBytes(usage.used)} / ${formatBytes(usage.estimated)} (${usage.percentage.toFixed(1)}%)\n`;
    report += `\n前10大项目:\n`;
    
    items.slice(0, 10).forEach((item, index) => {
        report += `${index + 1}. ${item.key}: ${formatBytes(item.size)}\n`;
    });
    
    return report;
}