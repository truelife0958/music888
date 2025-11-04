/**
 * 存储适配器 - 统一的存储接口
 * 优先使用 IndexedDB，降级到 localStorage
 */

import indexedDBStorage from './indexed-db.js';

interface StorageAdapter {
    getItem<T = any>(key: string): Promise<T | null>;
    setItem(key: string, value: any): Promise<boolean>;
    removeItem(key: string): Promise<boolean>;
    clear(): Promise<boolean>;
    keys(): Promise<string[]>;
    getStorageSize(): Promise<number>;
}

class UnifiedStorageAdapter implements StorageAdapter {
    private useIndexedDB = true;
    private migrated = false;

    /**
     * 初始化并迁移数据
     */
    async initialize(): Promise<void> {
        if (this.migrated) return;

        try {
            // 尝试执行数据迁移
            console.log('开始数据迁移...');
            const stats = await indexedDBStorage.migrateFromLocalStorage();
            console.log(`数据迁移完成: 成功 ${stats.success} 条, 失败 ${stats.failed} 条`);
            this.migrated = true;
        } catch (error) {
            console.error('数据迁移失败:', error);
        }
    }

    /**
     * 获取存储值
     */
    async getItem<T = any>(key: string): Promise<T | null> {
        try {
            return await indexedDBStorage.getItem<T>(key);
        } catch (error) {
            console.error('存储读取失败:', error);
            return null;
        }
    }

    /**
     * 设置存储值
     */
    async setItem(key: string, value: any): Promise<boolean> {
        try {
            return await indexedDBStorage.setItem(key, value);
        } catch (error) {
            console.error('存储写入失败:', error);
            return false;
        }
    }

    /**
     * 删除存储值
     */
    async removeItem(key: string): Promise<boolean> {
        try {
            return await indexedDBStorage.removeItem(key);
        } catch (error) {
            console.error('存储删除失败:', error);
            return false;
        }
    }

    /**
     * 清空存储
     */
    async clear(): Promise<boolean> {
        try {
            return await indexedDBStorage.clear();
        } catch (error) {
            console.error('存储清空失败:', error);
            return false;
        }
    }

    /**
     * 获取所有键
     */
    async keys(): Promise<string[]> {
        try {
            return await indexedDBStorage.keys();
        } catch (error) {
            console.error('获取键列表失败:', error);
            return [];
        }
    }

    /**
     * 获取存储大小
     */
    async getStorageSize(): Promise<number> {
        try {
            return await indexedDBStorage.getStorageSize();
        } catch (error) {
            console.error('获取存储大小失败:', error);
            return 0;
        }
    }

    /**
     * 批量获取
     */
    async getItems(keys: string[]): Promise<Map<string, any>> {
        try {
            return await indexedDBStorage.getItems(keys);
        } catch (error) {
            console.error('批量读取失败:', error);
            return new Map();
        }
    }

    /**
     * 批量设置
     */
    async setItems(items: Map<string, any>): Promise<boolean> {
        try {
            return await indexedDBStorage.setItems(items);
        } catch (error) {
            console.error('批量写入失败:', error);
            return false;
        }
    }
}

// 创建单例实例
const storageAdapter = new UnifiedStorageAdapter();

// 导出实例
export default storageAdapter;
export { UnifiedStorageAdapter };
export type { StorageAdapter };

/**
 * 兼容性辅助函数 - 提供同步接口（用于向后兼容）
 * 注意：这些函数会阻塞，不建议在新代码中使用
 */

// 内存缓存，用于同步访问
const syncCache = new Map<string, any>();

/**
 * 同步获取（从缓存）
 */
export function getItemSync<T = any>(key: string): T | null {
    return syncCache.get(key) || null;
}

/**
 * 同步设置（先更新缓存，然后异步持久化）
 */
export function setItemSync(key: string, value: any): void {
    syncCache.set(key, value);
    // 异步持久化
    storageAdapter.setItem(key, value).catch(error => {
        console.error('异步持久化失败:', error);
    });
}

/**
 * 预加载关键数据到缓存
 */
export async function preloadToCache(keys: string[]): Promise<void> {
    try {
        const items = await storageAdapter.getItems(keys);
        items.forEach((value, key) => {
            syncCache.set(key, value);
        });
        console.log(`已预加载 ${items.size} 个键到缓存`);
    } catch (error) {
        console.error('预加载失败:', error);
    }
}

/**
 * 清空缓存
 */
export function clearCache(): void {
    syncCache.clear();
}