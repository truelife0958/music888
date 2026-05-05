/**
 * 沄听播放器 Service Worker
 * 提供离线缓存和快速加载支持
 */

const CACHE_NAME = 'music888-v6';

// NOTE: 静态资源列表 - 只缓存确定存在的核心资源
// 构建后的 JS/CSS 文件名包含哈希值，无法预先知道，采用运行时缓存策略
const STATIC_ASSETS = [
    '/'
];

// 安装事件 - 预缓存静态资源
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('正在缓存静态资源...');
                return Promise.allSettled(
                    STATIC_ASSETS.map(url =>
                        cache.add(url).catch(err => {
                            console.warn(`缓存资源失败: ${url}`, err);
                            return null;
                        })
                    )
                );
            })
            .catch(err => {
                console.error('Service Worker 安装失败:', err);
            })
    );
});

// 激活事件 - 彻底清理旧缓存并接管页面
self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            self.clients.claim(),
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_NAME)
                        .map((name) => {
                            console.log('[SW] 清理旧缓存:', name);
                            return caches.delete(name);
                        })
                );
            })
        ])
    );
});

// 请求拦截 - 网络优先策略
self.addEventListener('fetch', (event) => {
    const { request } = event;

    // NOTE: 只处理 GET 请求
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // NOTE: 避免处理跨域资源（例如 cdnjs）
    // 否则可能触发 "opaque response" / CORS 相关的浏览器限制，导致资源加载失败
    if (url.origin !== self.location.origin) {
        return;
    }

    // API 请求不缓存
    if (url.pathname.startsWith('/api') || url.pathname.includes('/api/')) {
        return;
    }

    // 其他同源请求使用网络优先策略
    event.respondWith(
        fetch(request)
            .then((response) => {
                // 成功获取，更新缓存
                if (response.ok) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // 网络失败，尝试从缓存获取
                return caches.match(request);
            })
    );
});
