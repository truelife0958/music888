/**
 * IndexedDB 存储封装模块
 * 提供与 localStorage 兼容的 API，支持更大的存储容量和更好的性能
 */

const DB_NAME = 'Music888DB';
const DB_VERSION = 1;
const STORE_NAME = 'keyValueStore';

interface DBStore {
    key: string;
    value: any;
    timestamp: number;
}

class IndexedDBStorage {
    private db: IDBDatabase | null = null;
    private initPromise: Promise<void> | null = null;
    private fallbackToLocalStorage = false;

    /**
     * 初始化数据库
     */
    private async init(): Promise<void> {
        if (this.db) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = new Promise((resolve, reject) => {
            // 检查浏览器是否支持 IndexedDB
            if (!window.indexedDB) {
                console.warn('IndexedDB 不可用，回退到 localStorage');
                this.fallbackToLocalStorage = true;
                resolve();
                return;
            }

            const request = window.indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('IndexedDB 打开失败，回退到 localStorage', request.error);
                this.fallbackToLocalStorage = true;
                resolve();
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('IndexedDB 初始化成功');
                resolve();
            };

            request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
                const db = (event.target as IDBOpenDBRequest).result;
                
                // 创建对象存储
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
                    objectStore.createIndex('timestamp', 'timestamp', { unique: false });
                    console.log('IndexedDB 对象存储创建成功');
                }
            };
        });

        return this.initPromise;
    }

    /**
     * 获取存储值
     */
    async getItem<T = any>(key: string): Promise<T | null> {
        await this.init();

        // 回退到 localStorage
        if (this.fallbackToLocalStorage) {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        }

        return new Promise((resolve, reject) => {
            if (!this.db) {
                resolve(null);
                return;
            }

            const transaction = this.db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(key);

            request.onsuccess = () => {
                const result = request.result as DBStore | undefined;
                resolve(result ? result.value : null);
            };

            request.onerror = () => {
                console.error('IndexedDB 读取失败:', request.error);
                resolve(null);
            };
        });
    }

    /**
     * 设置存储值
     */
    async setItem(key: string, value: any): Promise<boolean> {
        await this.init();

        // 回退到 localStorage
        if (this.fallbackToLocalStorage) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (error) {
                console.error('localStorage 写入失败:', error);
                return false;
            }
        }

        return new Promise((resolve) => {
            if (!this.db) {
                resolve(false);
                return;
            }

            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            
            const data: DBStore = {
                key,
                value,
                timestamp: Date.now()
            };

            const request = store.put(data);

            request.onsuccess = () => {
                resolve(true);
            };

            request.onerror = () => {
                console.error('IndexedDB 写入失败:', request.error);
                resolve(false);
            };
        });
    }

    /**
     * 删除存储值
     */
    async removeItem(key: string): Promise<boolean> {
        await this.init();

        // 回退到 localStorage
        if (this.fallbackToLocalStorage) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (error) {
                console.error('localStorage 删除失败:', error);
                return false;
            }
        }

        return new Promise((resolve) => {
            if (!this.db) {
                resolve(false);
                return;
            }

            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(key);

            request.onsuccess = () => {
                resolve(true);
            };

            request.onerror = () => {
                console.error('IndexedDB 删除失败:', request.error);
                resolve(false);
            };
        });
    }

    /**
     * 清空所有存储
     */
    async clear(): Promise<boolean> {
        await this.init();

        // 回退到 localStorage
        if (this.fallbackToLocalStorage) {
            try {
                localStorage.clear();
                return true;
            } catch (error) {
                console.error('localStorage 清空失败:', error);
                return false;
            }
        }

        return new Promise((resolve) => {
            if (!this.db) {
                resolve(false);
                return;
            }

            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.clear();

            request.onsuccess = () => {
                resolve(true);
            };

            request.onerror = () => {
                console.error('IndexedDB 清空失败:', request.error);
                resolve(false);
            };
        });
    }

    /**
     * 获取所有键
     */
    async keys(): Promise<string[]> {
        await this.init();

        // 回退到 localStorage
        if (this.fallbackToLocalStorage) {
            return Object.keys(localStorage);
        }

        return new Promise((resolve) => {
            if (!this.db) {
                resolve([]);
                return;
            }

            const transaction = this.db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAllKeys();

            request.onsuccess = () => {
                resolve(request.result as string[]);
            };

            request.onerror = () => {
                console.error('IndexedDB 获取键失败:', request.error);
                resolve([]);
            };
        });
    }

    /**
     * 获取存储大小（估算）
     */
    async getStorageSize(): Promise<number> {
        await this.init();

        // 回退到 localStorage
        if (this.fallbackToLocalStorage) {
            let total = 0;
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key) {
                    const value = localStorage.getItem(key);
                    total += key.length + (value?.length || 0);
                }
            }
            return total * 2; // 字符串占用2字节
        }

        return new Promise((resolve) => {
            if (!this.db) {
                resolve(0);
                return;
            }

            const transaction = this.db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => {
                const results = request.result as DBStore[];
                const size = results.reduce((acc, item) => {
                    const jsonSize = JSON.stringify(item.value).length;
                    return acc + item.key.length + jsonSize;
                }, 0);
                resolve(size * 2);
            };

            request.onerror = () => {
                console.error('IndexedDB 获取大小失败:', request.error);
                resolve(0);
            };
        });
    }

    /**
     * 批量获取
     */
    async getItems(keys: string[]): Promise<Map<string, any>> {
        await this.init();

        const result = new Map<string, any>();

        // 回退到 localStorage
        if (this.fallbackToLocalStorage) {
            keys.forEach(key => {
                const item = localStorage.getItem(key);
                if (item) {
                    try {
                        result.set(key, JSON.parse(item));
                    } catch {
                        result.set(key, null);
                    }
                }
            });
            return result;
        }

        if (!this.db) return result;

        return new Promise((resolve) => {
            const transaction = this.db!.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            let completed = 0;

            keys.forEach(key => {
                const request = store.get(key);
                
                request.onsuccess = () => {
                    const data = request.result as DBStore | undefined;
                    if (data) {
                        result.set(key, data.value);
                    }
                    completed++;
                    if (completed === keys.length) {
                        resolve(result);
                    }
                };

                request.onerror = () => {
                    completed++;
                    if (completed === keys.length) {
                        resolve(result);
                    }
                };
            });
        });
    }

    /**
     * 批量设置
     */
    async setItems(items: Map<string, any>): Promise<boolean> {
        await this.init();

        // 回退到 localStorage
        if (this.fallbackToLocalStorage) {
            try {
                items.forEach((value, key) => {
                    localStorage.setItem(key, JSON.stringify(value));
                });
                return true;
            } catch (error) {
                console.error('localStorage 批量写入失败:', error);
                return false;
            }
        }

        if (!this.db) return false;

        return new Promise((resolve) => {
            const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);

            items.forEach((value, key) => {
                const data: DBStore = {
                    key,
                    value,
                    timestamp: Date.now()
                };
                store.put(data);
            });

            transaction.oncomplete = () => {
                resolve(true);
            };

            transaction.onerror = () => {
                console.error('IndexedDB 批量写入失败:', transaction.error);
                resolve(false);
            };
        });
    }

    /**
     * 从 localStorage 迁移数据到 IndexedDB
     */
    async migrateFromLocalStorage(): Promise<{ success: number; failed: number }> {
        await this.init();

        if (this.fallbackToLocalStorage) {
            console.log('使用 localStorage 模式，无需迁移');
            return { success: 0, failed: 0 };
        }

        const stats = { success: 0, failed: 0 };
        const items = new Map<string, any>();

        // 读取所有 localStorage 数据
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
                try {
                    const value = localStorage.getItem(key);
                    if (value) {
                        items.set(key, JSON.parse(value));
                    }
                } catch (error) {
                    console.warn(`迁移键 ${key} 失败:`, error);
                    stats.failed++;
                }
            }
        }

        // 批量写入 IndexedDB
        if (items.size > 0) {
            const success = await this.setItems(items);
            if (success) {
                stats.success = items.size;
                console.log(`成功迁移 ${stats.success} 条数据到 IndexedDB`);
            } else {
                stats.failed += items.size;
            }
        }

        return stats;
    }
}

// 创建单例实例
const indexedDB = new IndexedDBStorage();

// 导出实例和类型
export default indexedDB;
export { IndexedDBStorage };
export type { DBStore };