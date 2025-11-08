/**
 * IndexedDB 存储封装模块
 * 提供与 localStorage 兼容的 API，支持更大的存储容量和更好的性能
 */

const DB_NAME = 'Music888DB';
const DB_VERSION = 2; // 升级版本以支持新的对象存储
const STORE_NAME = 'keyValueStore';
const HISTORY_STORE = 'playHistory'; // 播放历史专用存储
const FAVORITES_STORE = 'favorites'; // 收藏列表专用存储

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
                const oldVersion = event.oldVersion;
                
                // 创建通用key-value存储
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
                    objectStore.createIndex('timestamp', 'timestamp', { unique: false });
                    console.log('✅ IndexedDB 通用存储创建成功');
                }
                
                // V2: 创建播放历史专用存储
                if (oldVersion < 2 && !db.objectStoreNames.contains(HISTORY_STORE)) {
                    const historyStore = db.createObjectStore(HISTORY_STORE, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    historyStore.createIndex('timestamp', 'timestamp', { unique: false });
                    historyStore.createIndex('songId', 'songId', { unique: false });
                    console.log('✅ IndexedDB 播放历史存储创建成功');
                }
                
                // V2: 创建收藏列表专用存储
                if (oldVersion < 2 && !db.objectStoreNames.contains(FAVORITES_STORE)) {
                    const favoritesStore = db.createObjectStore(FAVORITES_STORE, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    favoritesStore.createIndex('timestamp', 'timestamp', { unique: false });
                    favoritesStore.createIndex('songId', 'songId', { unique: false });
                    favoritesStore.createIndex('source', 'source', { unique: false });
                    console.log('✅ IndexedDB 收藏列表存储创建成功');
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

    /**
     * 添加歌曲到播放历史
     */
    async addToHistory(song: any): Promise<boolean> {
        await this.init();

        if (this.fallbackToLocalStorage) {
            // 使用通用的key-value存储
            const history = await this.getItem<any[]>('playHistory') || [];
            // 移除重复项
            const filtered = history.filter(
                (s: any) => !(s.id === song.id && s.source === song.source)
            );
            filtered.unshift(song);
            // 限制数量
            if (filtered.length > 500) {
                filtered.splice(500);
            }
            return this.setItem('playHistory', filtered);
        }

        return new Promise((resolve) => {
            if (!this.db) {
                resolve(false);
                return;
            }

            const transaction = this.db.transaction([HISTORY_STORE], 'readwrite');
            const store = transaction.objectStore(HISTORY_STORE);

            const data = {
                ...song,
                timestamp: Date.now(),
                songId: `${song.source}_${song.id}`
            };

            const request = store.add(data);

            request.onsuccess = () => {
                resolve(true);
            };

            request.onerror = () => {
                console.error('添加播放历史失败:', request.error);
                resolve(false);
            };
        });
    }

    /**
     * 获取播放历史列表
     */
    async getHistory(limit: number = 500): Promise<any[]> {
        await this.init();

        if (this.fallbackToLocalStorage) {
            const history = await this.getItem<any[]>('playHistory') || [];
            return history.slice(0, limit);
        }

        return new Promise((resolve) => {
            if (!this.db) {
                resolve([]);
                return;
            }

            const transaction = this.db.transaction([HISTORY_STORE], 'readonly');
            const store = transaction.objectStore(HISTORY_STORE);
            const index = store.index('timestamp');
            
            // 按时间倒序获取
            const request = index.openCursor(null, 'prev');
            const results: any[] = [];

            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest).result;
                if (cursor && results.length < limit) {
                    results.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(results);
                }
            };

            request.onerror = () => {
                console.error('获取播放历史失败:', request.error);
                resolve([]);
            };
        });
    }

    /**
     * 清空播放历史
     */
    async clearHistory(): Promise<boolean> {
        await this.init();

        if (this.fallbackToLocalStorage) {
            return this.removeItem('playHistory');
        }

        return new Promise((resolve) => {
            if (!this.db) {
                resolve(false);
                return;
            }

            const transaction = this.db.transaction([HISTORY_STORE], 'readwrite');
            const store = transaction.objectStore(HISTORY_STORE);
            const request = store.clear();

            request.onsuccess = () => {
                console.log('✅ 播放历史已清空');
                resolve(true);
            };

            request.onerror = () => {
                console.error('清空播放历史失败:', request.error);
                resolve(false);
            };
        });
    }

    /**
     * 从播放历史中删除指定歌曲
     */
    async removeFromHistory(songId: string, source: string): Promise<boolean> {
        await this.init();

        if (this.fallbackToLocalStorage) {
            const history = await this.getItem<any[]>('playHistory') || [];
            const filtered = history.filter(
                (s: any) => !(s.id === songId && s.source === source)
            );
            return this.setItem('playHistory', filtered);
        }

        return new Promise((resolve) => {
            if (!this.db) {
                resolve(false);
                return;
            }

            const transaction = this.db.transaction([HISTORY_STORE], 'readwrite');
            const store = transaction.objectStore(HISTORY_STORE);
            const index = store.index('songId');
            const request = index.openCursor(IDBKeyRange.only(`${source}_${songId}`));

            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest).result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                } else {
                    resolve(true);
                }
            };

            request.onerror = () => {
                console.error('从播放历史删除失败:', request.error);
                resolve(false);
            };
        });
    }

    /**
     * 添加歌曲到收藏
     */
    async addToFavorites(song: any): Promise<boolean> {
        await this.init();

        if (this.fallbackToLocalStorage) {
            const favorites = await this.getItem<any[]>('favorites') || [];
            // 检查是否已存在
            const exists = favorites.some(
                (s: any) => s.id === song.id && s.source === song.source
            );
            if (exists) {
                return true; // 已存在，返回成功
            }
            favorites.unshift(song);
            return this.setItem('favorites', favorites);
        }

        return new Promise((resolve) => {
            if (!this.db) {
                resolve(false);
                return;
            }

            const transaction = this.db.transaction([FAVORITES_STORE], 'readwrite');
            const store = transaction.objectStore(FAVORITES_STORE);

            const data = {
                ...song,
                timestamp: Date.now(),
                songId: `${song.source}_${song.id}`
            };

            const request = store.add(data);

            request.onsuccess = () => {
                resolve(true);
            };

            request.onerror = () => {
                // 可能是重复键错误，检查一下
                if (request.error?.name === 'ConstraintError') {
                    console.log('歌曲已在收藏中');
                    resolve(true);
                } else {
                    console.error('添加收藏失败:', request.error);
                    resolve(false);
                }
            };
        });
    }

    /**
     * 获取收藏列表
     */
    async getFavorites(): Promise<any[]> {
        await this.init();

        if (this.fallbackToLocalStorage) {
            return await this.getItem<any[]>('favorites') || [];
        }

        return new Promise((resolve) => {
            if (!this.db) {
                resolve([]);
                return;
            }

            const transaction = this.db.transaction([FAVORITES_STORE], 'readonly');
            const store = transaction.objectStore(FAVORITES_STORE);
            const index = store.index('timestamp');
            
            // 按时间倒序获取
            const request = index.openCursor(null, 'prev');
            const results: any[] = [];

            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest).result;
                if (cursor) {
                    results.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(results);
                }
            };

            request.onerror = () => {
                console.error('获取收藏列表失败:', request.error);
                resolve([]);
            };
        });
    }

    /**
     * 从收藏中移除歌曲
     */
    async removeFromFavorites(songId: string, source: string): Promise<boolean> {
        await this.init();

        if (this.fallbackToLocalStorage) {
            const favorites = await this.getItem<any[]>('favorites') || [];
            const filtered = favorites.filter(
                (s: any) => !(s.id === songId && s.source === source)
            );
            return this.setItem('favorites', filtered);
        }

        return new Promise((resolve) => {
            if (!this.db) {
                resolve(false);
                return;
            }

            const transaction = this.db.transaction([FAVORITES_STORE], 'readwrite');
            const store = transaction.objectStore(FAVORITES_STORE);
            const index = store.index('songId');
            const request = index.openCursor(IDBKeyRange.only(`${source}_${songId}`));

            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest).result;
                if (cursor) {
                    cursor.delete();
                    resolve(true);
                } else {
                    resolve(false);
                }
            };

            request.onerror = () => {
                console.error('从收藏删除失败:', request.error);
                resolve(false);
            };
        });
    }

    /**
     * 检查歌曲是否在收藏中
     */
    async isInFavorites(songId: string, source: string): Promise<boolean> {
        await this.init();

        if (this.fallbackToLocalStorage) {
            const favorites = await this.getItem<any[]>('favorites') || [];
            return favorites.some(
                (s: any) => s.id === songId && s.source === source
            );
        }

        return new Promise((resolve) => {
            if (!this.db) {
                resolve(false);
                return;
            }

            const transaction = this.db.transaction([FAVORITES_STORE], 'readonly');
            const store = transaction.objectStore(FAVORITES_STORE);
            const index = store.index('songId');
            const request = index.get(`${source}_${songId}`);

            request.onsuccess = () => {
                resolve(!!request.result);
            };

            request.onerror = () => {
                console.error('检查收藏状态失败:', request.error);
                resolve(false);
            };
        });
    }

    /**
     * 清空收藏列表
     */
    async clearFavorites(): Promise<boolean> {
        await this.init();

        if (this.fallbackToLocalStorage) {
            return this.removeItem('favorites');
        }

        return new Promise((resolve) => {
            if (!this.db) {
                resolve(false);
                return;
            }

            const transaction = this.db.transaction([FAVORITES_STORE], 'readwrite');
            const store = transaction.objectStore(FAVORITES_STORE);
            const request = store.clear();

            request.onsuccess = () => {
                console.log('✅ 收藏列表已清空');
                resolve(true);
            };

            request.onerror = () => {
                console.error('清空收藏列表失败:', request.error);
                resolve(false);
            };
        });
    }

    /**
     * 从localStorage迁移播放历史和收藏到IndexedDB
     */
    async migratePlayDataFromLocalStorage(): Promise<{
        historyMigrated: number;
        favoritesMigrated: number;
        historyFailed: number;
        favoritesFailed: number;
    }> {
        await this.init();

        const result = {
            historyMigrated: 0,
            favoritesMigrated: 0,
            historyFailed: 0,
            favoritesFailed: 0
        };

        if (this.fallbackToLocalStorage) {
            console.log('使用 localStorage 模式，无需迁移播放数据');
            return result;
        }

        try {
            // 迁移播放历史
            const historyKey = 'music888_playHistory';
            const historyData = localStorage.getItem(historyKey);
            if (historyData) {
                try {
                    const history = JSON.parse(historyData);
                    if (Array.isArray(history) && history.length > 0) {
                        console.log(`🔄 开始迁移 ${history.length} 条播放历史...`);
                        for (const song of history) {
                            const success = await this.addToHistory(song);
                            if (success) {
                                result.historyMigrated++;
                            } else {
                                result.historyFailed++;
                            }
                        }
                        console.log(`✅ 播放历史迁移完成: ${result.historyMigrated} 成功, ${result.historyFailed} 失败`);
                        
                        // 迁移成功后删除localStorage数据
                        if (result.historyMigrated > 0) {
                            localStorage.removeItem(historyKey);
                        }
                    }
                } catch (error) {
                    console.error('解析播放历史数据失败:', error);
                    result.historyFailed = 1;
                }
            }

            // 迁移收藏列表（从歌单数据中提取）
            const playlistsKey = 'music888_playlists';
            const playlistsData = localStorage.getItem(playlistsKey);
            if (playlistsData) {
                try {
                    const data = JSON.parse(playlistsData);
                    if (data.playlists && Array.isArray(data.playlists)) {
                        // 查找收藏歌单
                        for (const [key, playlist] of data.playlists) {
                            if ((playlist as any).isFavorites && (playlist as any).songs) {
                                const songs = (playlist as any).songs;
                                console.log(`🔄 开始迁移 ${songs.length} 首收藏歌曲...`);
                                for (const song of songs) {
                                    const success = await this.addToFavorites(song);
                                    if (success) {
                                        result.favoritesMigrated++;
                                    } else {
                                        result.favoritesFailed++;
                                    }
                                }
                                console.log(`✅ 收藏列表迁移完成: ${result.favoritesMigrated} 成功, ${result.favoritesFailed} 失败`);
                                break; // 只处理第一个收藏歌单
                            }
                        }
                    }
                } catch (error) {
                    console.error('解析收藏列表数据失败:', error);
                    result.favoritesFailed = 1;
                }
            }
        } catch (error) {
            console.error('迁移播放数据失败:', error);
        }

        return result;
    }
}

// 创建单例实例
const indexedDB = new IndexedDBStorage();

// 导出实例和类型
export default indexedDB;
export { IndexedDBStorage };
export type { DBStore };