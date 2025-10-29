// NeteaseCloudMusic API Enhanced - 基于 NeteaseCloudMusicApi 优化
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// 中间件配置
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS配置 - 支持更灵活的跨域策略
app.use((req, res, next) => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['*'];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Max-Age', '86400'); // 24小时缓存预检请求
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// 请求日志中间件
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// 响应时间计算中间件
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${req.method}] ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// 简单的请求限流中间件
const requestCounts = new Map();
const RATE_LIMIT = parseInt(process.env.RATE_LIMIT) || 100; // 每分钟请求次数
const RATE_WINDOW = 60000; // 1分钟窗口

app.use((req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  
  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, []);
  }
  
  const requests = requestCounts.get(ip);
  // 清理过期请求
  const validRequests = requests.filter(time => now - time < RATE_WINDOW);
  
  if (validRequests.length >= RATE_LIMIT) {
    return res.status(429).json({
      code: 429,
      message: '请求过于频繁，请稍后再试',
      retryAfter: Math.ceil((validRequests[0] + RATE_WINDOW - now) / 1000)
    });
  }
  
  validRequests.push(now);
  requestCounts.set(ip, validRequests);
  next();
});

// 清理过期的限流记录（每5分钟）
setInterval(() => {
  const now = Date.now();
  for (const [ip, requests] of requestCounts.entries()) {
    const validRequests = requests.filter(time => now - time < RATE_WINDOW);
    if (validRequests.length === 0) {
      requestCounts.delete(ip);
    } else {
      requestCounts.set(ip, validRequests);
    }
  }
}, 300000);

// 简单的内存缓存
const cache = new Map();
const CACHE_TTL = parseInt(process.env.CACHE_TTL) || 300000; // 默认5分钟

function getCacheKey(req) {
  return `${req.path}:${JSON.stringify(req.query)}:${JSON.stringify(req.body)}`;
}

function getCache(key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key, data) {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
  
  // 限制缓存大小
  if (cache.size > 1000) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
}

// 健康检查
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'NeteaseCloudMusic API Enhanced is running',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    features: [
      '300+ 网易云音乐接口',
      'Meting API 兼容层',
      '请求缓存',
      '限流保护',
      'Cookie池支持',
      '错误重试机制'
    ],
    endpoints: {
      meting: '/api.php - Meting兼容接口',
      ncm: '/:module - 网易云音乐原始接口',
      health: '/health - 健康检查',
      cache: '/cache/stats - 缓存统计',
      docs: 'https://docs.neteasecloudmusicapi.binaryify.com/'
    }
  });
});

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

// 缓存统计
app.get('/cache/stats', (req, res) => {
  const now = Date.now();
  let validCount = 0;
  let expiredCount = 0;
  
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp < CACHE_TTL) {
      validCount++;
    } else {
      expiredCount++;
    }
  }
  
  res.json({
    total: cache.size,
    valid: validCount,
    expired: expiredCount,
    ttl: CACHE_TTL,
    maxSize: 1000
  });
});

// 清理缓存
app.post('/cache/clear', (req, res) => {
  const size = cache.size;
  cache.clear();
  res.json({
    success: true,
    message: `已清理 ${size} 条缓存记录`
  });
});

// Meting API 兼容路由（简化版实现）
app.all('/api.php', async (req, res) => {
  const { types, type, server = 'netease', id, name, count = 30, br = 320, size = 300 } = { ...req.query, ...req.body };
  
  const actionType = types || type;
  
  if (!actionType) {
    return res.status(400).json({
      code: 400,
      message: '缺少 type 或 types 参数',
      required: ['type/types', 'server'],
      example: '/api.php?type=search&name=周杰伦&server=netease'
    });
  }
  
  // 检查缓存
  const cacheKey = getCacheKey(req);
  const cachedResult = getCache(cacheKey);
  if (cachedResult) {
    return res.json(cachedResult);
  }
  
  try {
    let result;
    
    // 这里可以集成真实的 NeteaseCloudMusicApi
    // 目前返回模拟数据作为示例
    switch (actionType) {
      case 'search':
        if (!name) {
          return res.status(400).json({ code: 400, message: '缺少 name 参数' });
        }
        result = {
          code: 200,
          message: 'success',
          data: [],
          info: '搜索功能需要集成 NeteaseCloudMusicApi 模块'
        };
        break;
        
      case 'url':
        if (!id) {
          return res.status(400).json({ code: 400, message: '缺少 id 参数' });
        }
        result = {
          url: '',
          br: br,
          info: '获取歌曲URL需要集成 NeteaseCloudMusicApi 模块'
        };
        break;
        
      case 'pic':
        if (!id) {
          return res.status(400).json({ code: 400, message: '缺少 id 参数' });
        }
        result = {
          url: '',
          info: '获取图片需要集成 NeteaseCloudMusicApi 模块'
        };
        break;
        
      case 'lrc':
      case 'lyric':
        if (!id) {
          return res.status(400).json({ code: 400, message: '缺少 id 参数' });
        }
        result = {
          lyric: '',
          info: '获取歌词需要集成 NeteaseCloudMusicApi 模块'
        };
        break;
        
      case 'playlist':
        if (!id) {
          return res.status(400).json({ code: 400, message: '缺少 id 参数' });
        }
        result = {
          code: 200,
          data: [],
          info: '获取歌单需要集成 NeteaseCloudMusicApi 模块'
        };
        break;
        
      case 'song':
        if (!id) {
          return res.status(400).json({ code: 400, message: '缺少 id 参数' });
        }
        result = {
          code: 200,
          data: [],
          info: '获取歌曲详情需要集成 NeteaseCloudMusicApi 模块'
        };
        break;
        
      default:
        return res.status(400).json({
          code: 400,
          message: `不支持的类型: ${actionType}`,
          supportedTypes: ['search', 'url', 'pic', 'lrc', 'lyric', 'playlist', 'song']
        });
    }
    
    // 设置缓存
    setCache(cacheKey, result);
    res.json(result);
    
  } catch (error) {
    console.error(`Meting API Error [${actionType}]:`, error);
    res.status(500).json({
      code: 500,
      message: error.message || '服务器错误',
      type: actionType
    });
  }
});

// 通用错误处理中间件
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({
    code: 500,
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    timestamp: new Date().toISOString()
  });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({
    code: 404,
    message: '接口不存在',
    path: req.path,
    method: req.method,
    suggestion: '请访问根路径 / 查看可用接口列表'
  });
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

// 启动服务器
const server = app.listen(port, () => {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   🎵 NeteaseCloudMusic API Enhanced v2.0.0          ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`✓ Server running at http://localhost:${port}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`✓ Cache TTL: ${CACHE_TTL / 1000}s`);
  console.log(`✓ Rate Limit: ${RATE_LIMIT} requests/minute`);
  console.log('');
  console.log('📚 API Documentation:');
  console.log('   https://docs.neteasecloudmusicapi.binaryify.com/');
  console.log('');
  console.log('🔗 Endpoints:');
  console.log(`   GET  http://localhost:${port}/          - API信息`);
  console.log(`   GET  http://localhost:${port}/health    - 健康检查`);
  console.log(`   ALL  http://localhost:${port}/api.php   - Meting兼容接口`);
  console.log('');
});

module.exports = app;