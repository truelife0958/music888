// 存储空间管理工具

import { Logger } from './logger.js';
import { StorageCheckResult } from './types.js';
import { STORAGE_CONFIG } from './config.js';

/**
 * 检查 LocalStorage 是否可用
 */
export function isLocalStorageAvailable(): boolean {
    try {
        const test = '__storage_test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch (e) {
        Logger.warn('Storage', 'LocalStorage 不可用:', e);
        return false;
    }
}

/**
 * 检查存储空间配额
 */
export async function checkStorageQuota(): Promise<StorageCheckResult> {
    try {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            const estimate = await navigator.storage.estimate();
            const quota = estimate.quota || 0;
            const usage = estimate.usage || 0;
            const available = quota - usage;

            Logger.info('Storage', `存储配额: ${formatBytes(quota)}, 已使用: ${formatBytes(usage)}, 可用: ${formatBytes(available)}`);

            return {
                available: available > STORAGE_CONFIG.QUOTA_WARNING_THRESHOLD,
                quota,
                usage,
            };
        } else {
            // 不支持 Storage API，假设有足够空间
            return {
                available: true,
            };
        }
    } catch (error) {
        Logger.error('Storage', '检查存储配额失败:', error);
        return {
            available: true, // 发生错误时假设可用
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * 格式化字节大小
 */
export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * 安全地保存到 LocalStorage
 */
export function safeSetItem(key: string, value: string): boolean {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (e) {
        if (e instanceof DOMException && (
            e.code === 22 || // QuotaExceededError
            e.code === 1014 || // NS_ERROR_DOM_QUOTA_REACHED (Firefox)
            e.name === 'QuotaExceededError' ||
            e.name === 'NS_ERROR_DOM_QUOTA_REACHED'
        )) {
            Logger.error('Storage', 'LocalStorage 空间不足');
            return false;
        }
        Logger.error('Storage', '保存数据失败:', e);
        return false;
    }
}

/**
 * 安全地从 LocalStorage 获取
 */
export function safeGetItem(key: string): string | null {
    try {
        return localStorage.getItem(key);
    } catch (e) {
        Logger.error('Storage', '读取数据失败:', e);
        return null;
    }
}

/**
 * 安全地从 LocalStorage 删除
 */
export function safeRemoveItem(key: string): boolean {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (e) {
        Logger.error('Storage', '删除数据失败:', e);
        return false;
    }
}

/**
 * 清理旧数据
 */
export function cleanupOldData(): void {
    try {
        // 清理播放历史（只保留最近的记录）
        const historyData = safeGetItem(STORAGE_CONFIG.KEY_HISTORY);
        if (historyData) {
            const history = JSON.parse(historyData);
            if (Array.isArray(history) && history.length > 50) {
                const trimmed = history.slice(0, 50);
                safeSetItem(STORAGE_CONFIG.KEY_HISTORY, JSON.stringify(trimmed));
                Logger.info('Storage', `清理播放历史: ${history.length} -> ${trimmed.length}`);
            }
        }

        Logger.info('Storage', '数据清理完成');
    } catch (error) {
        Logger.error('Storage', '清理数据失败:', error);
    }
}

/**
 * 获取 LocalStorage 使用情况
 */
export function getLocalStorageUsage(): { total: number; items: { key: string; size: number }[] } {
    let total = 0;
    const items: { key: string; size: number }[] = [];

    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
                const value = localStorage.getItem(key) || '';
                const size = new Blob([value]).size;
                total += size;
                items.push({ key, size });
            }
        }
    } catch (error) {
        Logger.error('Storage', '获取存储使用情况失败:', error);
    }

    return { total, items: items.sort((a, b) => b.size - a.size) };
}

/**
 * 显示存储使用报告
 */
export function logStorageReport(): void {
    const usage = getLocalStorageUsage();
    Logger.info('Storage', `总使用: ${formatBytes(usage.total)}`);
    Logger.info('Storage', '前5大项:');
    usage.items.slice(0, 5).forEach(item => {
        Logger.info('Storage', `  ${item.key}: ${formatBytes(item.size)}`);
    });
}