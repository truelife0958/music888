// 老王注释：Service Worker - PWA离线缓存和资源管理
// 遵循最佳实践，智能缓存策略

const CACHE_VERSION = 'music888-v3.0.2'; // 强制更新版本号，触发Service Worker更新
const CACHE_STATIC = `${CACHE_VERSION}-static`;
const CACHE_DYNAMIC = `${CACHE_VERSION}-dynamic`;
const CACHE_API = `${CACHE_VERSION}-api`;

// 静态资源列表 - 需要预缓存的核心文件
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/ytmusic.ico',
  '/manifest.json'
];

// 老王注释：安装阶段 - 预缓存核心静态资源
self.addEventListener('install', (event) => {
  console.log('[Service Worker] 正在安装...');
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then((cache) => {
        console.log('[Service Worker] 预缓存静态资源');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[Service Worker] 安装成功，跳过等待');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[Service Worker] 安装失败:', error);
      })
  );
});

// 老王注释：激活阶段 - 清理旧缓存
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] 正在激活...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // 删除所有旧版本缓存
              return cacheName.startsWith('music888-') && cacheName !== CACHE_STATIC && 
                     cacheName !== CACHE_DYNAMIC && cacheName !== CACHE_API;
            })
            .map((cacheName) => {
              console.log('[Service Worker] 删除旧缓存:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[Service Worker] 激活成功');
        return self.clients.claim();
      })
  );
});

// 老王注释：请求拦截 - 智能缓存策略
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 跨域音乐API白名单 - 完全不拦截这些域名的请求
  const CORS_WHITELIST = [
    'music.163.com',
    'music-api.gdstudio.org',
    'api.injahow.cn',
    'lx.sycdn.kuwo.cn',
    'api.gdstudio.xyz'
  ];

  // 如果是白名单域名，完全不拦截，让浏览器直接处理
  if (CORS_WHITELIST.some(domain => url.hostname.includes(domain))) {
    return; // 早返回，不添加任何处理
  }

  // 其他跨域请求也不拦截
  if (url.origin !== location.origin) {
    return;
  }

  // API请求：网络优先，失败则使用缓存
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request, CACHE_API));
    return;
  }

  // 静态资源：缓存优先，失败则网络
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirstStrategy(request, CACHE_STATIC));
    return;
  }

  // 其他资源：缓存优先，失败则网络
  event.respondWith(cacheFirstStrategy(request, CACHE_DYNAMIC));
});

// 老王注释：网络优先策略 - 适用于API请求
async function networkFirstStrategy(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    
    // 只缓存成功的响应
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.warn('[Service Worker] 网络请求失败，尝试缓存:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // 返回离线提示页面
    return new Response('离线模式 - 该资源暂时不可用', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/plain; charset=utf-8'
      })
    });
  }
}

// 老王注释：缓存优先策略 - 适用于静态资源
async function cacheFirstStrategy(request, cacheName) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[Service Worker] 缓存和网络都失败:', request.url, error);
    return new Response('资源不可用', {
      status: 404,
      statusText: 'Not Found'
    });
  }
}

// 老王注释：判断是否为静态资源
function isStaticAsset(pathname) {
  const staticExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf'];
  return staticExtensions.some(ext => pathname.endsWith(ext));
}

// 老王注释：消息处理 - 支持手动清理缓存
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName.startsWith('music888-')) {
              console.log('[Service Worker] 手动清理缓存:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    );
  }
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[Service Worker] 脚本加载完成');
