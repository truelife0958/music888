/**
 * Vercel Serverless Function - 网易云音乐API代理（增强版）
 * 基于 NeteaseCloudMusicApi 项目优化
 * 支持缓存、重试、多源切换
 */

// 简单的内存缓存（Vercel环境下每次冷启动会重置）
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟

// API源配置
const API_SOURCES = [
  {
    name: '主源 - gdstudio.xyz',
    url: 'https://music-api.gdstudio.xyz/api.php',
    priority: 1
  },
  {
    name: '备用源 - gdstudio.org',
    url: 'https://music-api.gdstudio.org/api.php',
    priority: 2
  },
  {
    name: '官方API',
    url: 'https://netease-cloud-music-api-sigma-five.vercel.app',
    priority: 3,
    type: 'ncm' // 网易云音乐官方API格式
  }
];

// 获取缓存
function getCache(key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

// 设置缓存
function setCache(key, data) {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
  
  // 限制缓存大小
  if (cache.size > 500) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
}

// 生成缓存键
function getCacheKey(params) {
  return JSON.stringify(params);
}

// 验证响应数据
function validateResponse(data, types) {
  if (!data) return false;
  
  switch (types) {
    case 'search':
      return Array.isArray(data) && data.length > 0;
    case 'url':
      return data.url && typeof data.url === 'string' && data.url.length > 0;
    case 'pic':
      return data.url && typeof data.url === 'string';
    case 'lyric':
    case 'lrc':
      return data.lyric !== undefined;
    case 'playlist':
      return Array.isArray(data) || (data.songs && Array.isArray(data.songs));
    case 'song':
      return Array.isArray(data) || (data.songs && Array.isArray(data.songs));
    default:
      return true;
  }
}

// 带重试的fetch
async function fetchWithRetry(url, options = {}, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Referer': 'https://music.163.com/',
          ...options.headers
        }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        return response;
      }
      
      if (i < retries && response.status >= 500) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }
      
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      if (i === retries) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

// 转换Meting格式到NCM格式
function convertMetingToNcm(types, params) {
  const typeMap = {
    'search': 'cloudsearch',
    'url': 'song/url',
    'pic': 'song/detail',
    'lyric': 'lyric',
    'lrc': 'lyric',
    'playlist': 'playlist/detail',
    'song': 'song/detail'
  };
  
  return {
    endpoint: typeMap[types] || types,
    params: params
  };
}

// 主处理函数
export default async function handler(req, res) {
  // CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // 解析参数
  const params = { ...req.query, ...req.body };
  const { types, type, source = 'netease', id, name, br, size, count = 30 } = params;
  const actionType = types || type;
  
  // 参数验证
  if (!actionType) {
    return res.status(400).json({
      code: 400,
      error: '缺少必要参数',
      required: ['types 或 type'],
      example: '/api/ncm-proxy?types=search&source=netease&name=周杰伦'
    });
  }
  
  // 特定类型的参数验证
  if (actionType === 'search' && !name) {
    return res.status(400).json({
      code: 400,
      error: '搜索请求缺少 name 参数'
    });
  }
  
  if (['url', 'pic', 'lyric', 'lrc', 'song'].includes(actionType) && !id) {
    return res.status(400).json({
      code: 400,
      error: `${actionType} 请求缺少 id 参数`
    });
  }
  
  // 检查缓存
  const cacheKey = getCacheKey(params);
  const cachedResult = getCache(cacheKey);
  if (cachedResult) {
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json(cachedResult);
  }
  
  res.setHeader('X-Cache', 'MISS');
  
  // 尝试所有API源
  const errors = [];
  
  for (const api of API_SOURCES) {
    try {
      let url;
      
      // 根据API类型构建URL
      if (api.type === 'ncm') {
        // 网易云音乐官方API格式
        const { endpoint, params: ncmParams } = convertMetingToNcm(actionType, params);
        url = `${api.url}/${endpoint}?${new URLSearchParams(ncmParams)}`;
      } else {
        // Meting API格式
        url = `${api.url}?types=${actionType}&source=${source}`;
        
        if (actionType === 'search') {
          url += `&name=${encodeURIComponent(name)}&count=${count}`;
        } else if (actionType === 'url') {
          url += `&id=${id}&br=${br || 320}`;
        } else if (actionType === 'pic') {
          url += `&id=${id}&size=${size || 300}`;
        } else if (['lyric', 'lrc'].includes(actionType)) {
          url += `&id=${id}`;
        } else if (['playlist', 'song'].includes(actionType)) {
          url += `&id=${id}`;
        }
      }
      
      const response = await fetchWithRetry(url);
      const data = await response.json();
      
      // 验证响应
      if (validateResponse(data, actionType)) {
        // 设置缓存
        setCache(cacheKey, data);
        
        res.setHeader('X-API-Source', api.name);
        return res.status(200).json(data);
      } else {
        errors.push({
          source: api.name,
          error: '数据验证失败',
          data: data
        });
      }
    } catch (error) {
      errors.push({
        source: api.name,
        error: error.message
      });
      continue;
    }
  }
  
  // 所有源都失败
  return res.status(503).json({
    code: 503,
    error: '所有音乐源均不可用',
    details: errors,
    timestamp: new Date().toISOString(),
    suggestion: '请稍后重试或检查参数是否正确'
  });
}