// Service Worker for 沄听音乐播放器 - 优化版
const CACHE_VERSION = 'v2.3';
const STATIC_CACHE = `ytmusic-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `ytmusic-dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `ytmusic-images-${CACHE_VERSION}`;
const API_CACHE = `ytmusic-api-${CACHE_VERSION}`;

// 缓存策略配置
const CACHE_STRATEGIES = {
  images: 'cache-first',
  api: 'network-first',
  static: 'stale-while-revalidate'
};

// 缓存大小限制
const CACHE_LIMITS = {
  [DYNAMIC_CACHE]: 50,
  [IMAGE_CACHE]: 100,
  [API_CACHE]: 30
};

// 核心静态资源（必须缓存）
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/ytmusic.ico',
  '/manifest.json'
];

// 安装 Service Worker
self.addEventListener('install', event => {
  console.log('🔧 Service Worker 安装中...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('📦 缓存核心资源...');
        return cache.addAll(CORE_ASSETS);
      })
      .then(() => {
        console.log('✅ 核心资源缓存完成');
      })
      .catch(err => {
        console.error('❌ 缓存失败:', err);
      })
  );
  self.skipWaiting();
});

// 激活 Service Worker
self.addEventListener('activate', event => {
  console.log('🚀 Service Worker 激活中...');
  const currentCaches = [STATIC_CACHE, DYNAMIC_CACHE, IMAGE_CACHE, API_CACHE];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!currentCaches.includes(cacheName)) {
            console.log('🗑️ 删除旧缓存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker 激活完成');
    })
  );
  return self.clients.claim();
});

// 拦截请求 - 优化版
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // 跳过非 GET 请求
  if (request.method !== 'GET') {
    return;
  }

  // API 请求使用 network-first 策略
  if (url.pathname.includes('/api/')) {
    event.respondWith(networkFirstStrategy(request, API_CACHE));
    return;
  }

  // 图片使用 cache-first 策略
  if (isImageRequest(url.pathname)) {
    event.respondWith(cacheFirstStrategy(request, IMAGE_CACHE));
    return;
  }

  // 静态资源使用 stale-while-revalidate 策略
  if (isStaticResource(url.pathname)) {
    event.respondWith(staleWhileRevalidateStrategy(request, STATIC_CACHE));
    return;
  }

  // HTML 使用 network-first 策略
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE));
    return;
  }

  // 默认策略
  event.respondWith(fetch(request));
});

// Cache-First 策略（图片）
async function cacheFirstStrategy(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(cacheName);
      await limitCacheSize(cacheName, cache);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('Cache-first 策略失败:', error);
    return new Response('', { status: 503 });
  }
}

// Network-First 策略（API、HTML）
async function networkFirstStrategy(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(cacheName);
      await limitCacheSize(cacheName, cache);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    return new Response('', { status: 503 });
  }
}

// Stale-While-Revalidate 策略（静态资源）
async function staleWhileRevalidateStrategy(request, cacheName) {
  const cached = await caches.match(request);
  
  // 如果有缓存，立即返回，同时在后台更新
  if (cached) {
    // 后台更新缓存（不阻塞返回）
    fetch(request).then(response => {
      if (response && response.status === 200) {
        caches.open(cacheName).then(cache => {
          cache.put(request, response);
        });
      }
    }).catch(() => {});
    
    return cached;
  }
  
  // 没有缓存，fetch 并缓存
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const responseClone = response.clone();
      caches.open(cacheName).then(cache => {
        cache.put(request, responseClone);
      });
    }
    return response;
  } catch (error) {
    return new Response('', { status: 503 });
  }
}

// 限制缓存大小
async function limitCacheSize(cacheName, cache) {
  const limit = CACHE_LIMITS[cacheName];
  if (!limit) return;

  const keys = await cache.keys();
  if (keys.length >= limit) {
    await cache.delete(keys[0]);
  }
}

// 判断是否为图片请求
function isImageRequest(pathname) {
  return /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(pathname);
}

// 判断是否为静态资源
function isStaticResource(pathname) {
  return /\.(js|css|woff|woff2|ttf|eot)$/i.test(pathname);
}

// 消息处理
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
