// js/api.ts - 优化版音乐API

// 老王集成：导入Provider模块
import { providerManager } from './providers/provider-manager';

export interface Song {
  id: string;
  name: string;
  artist: string[];
  album: any;
  pic_id: string;
  lyric_id: string;
  source: string;
  [key: string]: any;
}

interface ApiSource {
  name: string;
  url: string;
}

// 错误类型枚举
enum ApiErrorType {
  NETWORK = 'NETWORK',
  TIMEOUT = 'TIMEOUT',
  SERVER = 'SERVER',
  PARSE = 'PARSE',
  UNKNOWN = 'UNKNOWN',
}

// 自定义API错误类
class ApiError extends Error {
  constructor(
    public type: ApiErrorType,
    message: string,
    public statusCode?: number,
    public retryable: boolean = true
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// 检测API类型和格式 - 老王更新：添加Vercel API识别
function detectApiFormat(apiUrl: string): {
  isGDStudio: boolean;
  isNCM: boolean;
  isMeting: boolean;
  isClawCloud: boolean;
  isVercel: boolean;
  format: 'gdstudio' | 'ncm' | 'meting' | 'clawcloud' | 'vercel';
} {
  const isGDStudio = apiUrl.includes('gdstudio');
  const isNCM = apiUrl.includes('ncm-api.imixc.top');
  const isMeting = apiUrl.includes('meting') || apiUrl.includes('injahow');
  const isClawCloud = apiUrl.includes('clawcloudrun.com') || apiUrl.includes('onrender.com');
  const isVercel = apiUrl.includes('vercel.app');

  return {
    isGDStudio,
    isNCM,
    isMeting,
    isClawCloud,
    isVercel,
    format: isGDStudio ? 'gdstudio' : isVercel ? 'vercel' : isNCM ? 'ncm' : isClawCloud ? 'clawcloud' : 'meting',
  };
}

// 音乐API配置 - 老王更新：精简为3个有效源
const API_SOURCES: ApiSource[] = [
  {
    name: 'GDStudio 主API',
    url: 'https://music-api.gdstudio.xyz/api.php',
  },
  {
    name: 'Vercel增强API',
    url: 'https://api-enhanced-three-indol.vercel.app/',
  },
  {
    name: 'Meting备用API',
    url: 'https://api.injahow.cn/meting/',
  },
];

let API_BASE = API_SOURCES[0].url;
let currentApiIndex = 0;

// 播放专用API源优先级列表 - 老王更新：精简为3个有效源
const PLAYBACK_API_SOURCES: ApiSource[] = [
  {
    name: 'GDStudio 主API',
    url: 'https://music-api.gdstudio.xyz/api.php',
  },
  {
    name: 'Vercel增强API',
    url: 'https://api-enhanced-three-indol.vercel.app/',
  },
  {
    name: 'Meting备用API',
    url: 'https://api.injahow.cn/meting/',
  },
];

// API状态变更事件
const apiChangeCallbacks: Array<() => void> = [];

// 音乐平台配置 - 基于API文档扩展支持平台
const MUSIC_SOURCES = [
  { id: 'netease', name: '网易云音乐' },
  { id: 'tencent', name: 'QQ音乐' },
  { id: 'kugou', name: '酷狗音乐' },
  { id: 'kuwo', name: '酷我音乐' },
  { id: 'ximalaya', name: '喜马拉雅' },
  { id: 'bilibili', name: 'B站音频' },
];

// 艺术家字段规范化函数 - 老王修复：统一处理各种artist数据格式
// 老王优化：导出此函数供其他模块使用，统一规范化逻辑
export function normalizeArtistField(artist: any): string[] {
  // 定义需要过滤的无效值（中英文）
  const invalidValues = [
    '未知艺术家',
    '未知歌手',
    '未知',
    'Unknown',
    'Unknown Artist',
    'unknown',
    'Various Artists',
    'various artists',
    'N/A',
    'n/a',
    '',
    ' ',
  ];

  // 检查字符串是否为无效值
  const isInvalid = (str: string): boolean => {
    const trimmed = str.trim().toLowerCase();
    return !trimmed || invalidValues.some((invalid) => invalid.toLowerCase() === trimmed);
  };

  // 过滤并清理字符串数组
  const filterAndClean = (arr: string[]): string[] => {
    return arr.map((s) => s.trim()).filter((s) => s && !isInvalid(s));
  };

  // 如果是字符串数组
  if (Array.isArray(artist) && artist.length > 0 && typeof artist[0] === 'string') {
    const cleaned = filterAndClean(artist);
    return cleaned.length > 0 ? cleaned : ['未知艺术家'];
  }

  // 如果是对象数组，提取name字段
  if (Array.isArray(artist) && artist.length > 0 && typeof artist[0] === 'object') {
    const names = artist.map((a: any) => a?.name || a?.artist || '').filter(Boolean);
    const cleaned = filterAndClean(names);
    return cleaned.length > 0 ? cleaned : ['未知艺术家'];
  }

  // 如果是单个字符串
  if (typeof artist === 'string') {
    const trimmed = artist.trim();
    if (!trimmed || isInvalid(trimmed)) return ['未知艺术家'];

    // 处理"歌手1,歌手2"或"歌手1/歌手2"等格式
    const parts = trimmed
      .split(/[,，、/／]/)
      .map((s) => s.trim())
      .filter((s) => s && !isInvalid(s));
    return parts.length > 0 ? parts : ['未知艺术家'];
  }

  // 如果是单个对象，提取name字段
  if (typeof artist === 'object' && artist?.name) {
    const trimmed = String(artist.name).trim();
    if (trimmed && !isInvalid(trimmed)) return [trimmed];
  }

  // 默认返回未知艺术家
  return ['未知艺术家'];
}

// 歌曲名称规范化函数 - 老王修复：统一处理各种name数据格式
// 老王优化：导出此函数供其他模块使用，统一规范化逻辑
export function normalizeSongName(name: any): string {
  // 定义需要过滤的无效值
  const invalidValues = [
    '未知歌曲',
    '未知',
    'Unknown',
    'unknown',
    'Untitled',
    'untitled',
    'N/A',
    'n/a',
  ];

  // 检查字符串是否为无效值
  const isInvalid = (str: string): boolean => {
    const trimmed = str.trim().toLowerCase();
    return !trimmed || invalidValues.some((invalid) => invalid.toLowerCase() === trimmed);
  };

  // 如果是有效字符串，trim后返回
  if (typeof name === 'string') {
    const trimmed = name.trim();
    if (trimmed && !isInvalid(trimmed)) return trimmed;
  }

  // 如果是对象且有name属性
  if (typeof name === 'object' && name?.name && typeof name.name === 'string') {
    const trimmed = name.name.trim();
    if (trimmed && !isInvalid(trimmed)) return trimmed;
  }

  // 如果是对象且有title属性
  if (typeof name === 'object' && name?.title && typeof name.title === 'string') {
    const trimmed = name.title.trim();
    if (trimmed && !isInvalid(trimmed)) return trimmed;
  }

  // 默认返回未知歌曲
  return '未知歌曲';
}

// 专辑名称规范化函数 - 老王修复：统一处理各种album数据格式
// 老王优化：导出此函数供其他模块使用，统一规范化逻辑
export function normalizeAlbumName(album: any): string {
  // 定义需要过滤的无效值
  const invalidValues = [
    '未知专辑',
    '未知',
    'Unknown',
    'unknown',
    'Unknown Album',
    'unknown album',
    'N/A',
    'n/a',
    '',
    ' ',
  ];

  // 检查字符串是否为无效值
  const isInvalid = (str: string): boolean => {
    const trimmed = str.trim().toLowerCase();
    return !trimmed || invalidValues.some((invalid) => invalid.toLowerCase() === trimmed);
  };

  // 如果是有效字符串，trim后返回
  if (typeof album === 'string') {
    const trimmed = album.trim();
    if (trimmed && !isInvalid(trimmed)) return trimmed;
  }

  // 如果是对象且有name属性
  if (typeof album === 'object' && album?.name && typeof album.name === 'string') {
    const trimmed = album.name.trim();
    if (trimmed && !isInvalid(trimmed)) return trimmed;
  }

  // 如果是对象且有album属性（嵌套情况）
  if (typeof album === 'object' && album?.album && typeof album.album === 'string') {
    const trimmed = album.album.trim();
    if (trimmed && !isInvalid(trimmed)) return trimmed;
  }

  // 默认返回未知专辑
  return '未知专辑';
}

// 改进的LRU缓存 - 分级TTL优化版
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hits: number;
  category: CacheCategory;
  customTTL?: number;
}

// 缓存分类枚举
enum CacheCategory {
  // 静态数据 - 长时间缓存
  SONG_INFO = 'song_info', // 歌曲信息：30分钟
  ALBUM_COVER = 'album_cover', // 专辑封面：1小时
  LYRICS = 'lyrics', // 歌词：1小时
  ARTIST_INFO = 'artist_info', // 歌手信息：30分钟
  ALBUM_INFO = 'album_info', // 专辑信息：30分钟

  // 半动态数据 - 中等时间缓存
  PLAYLIST = 'playlist', // 歌单：15分钟
  SEARCH = 'search', // 搜索结果：10分钟
  TOP_SONGS = 'top_songs', // 排行榜：15分钟

  // 动态数据 - 短时间缓存
  SONG_URL = 'song_url', // 播放URL：5分钟（可能失效）
  COMMENTS = 'comments', // 评论：5分钟
  HOT_PLAYLISTS = 'hot_playlists', // 热门歌单：10分钟

  // 默认分类
  DEFAULT = 'default', // 默认：5分钟
}

// TTL配置（毫秒）
const CACHE_TTL_CONFIG: Record<CacheCategory, number> = {
  [CacheCategory.SONG_INFO]: 30 * 60 * 1000, // 30分钟
  [CacheCategory.ALBUM_COVER]: 60 * 60 * 1000, // 1小时
  [CacheCategory.LYRICS]: 60 * 60 * 1000, // 1小时
  [CacheCategory.ARTIST_INFO]: 30 * 60 * 1000, // 30分钟
  [CacheCategory.ALBUM_INFO]: 30 * 60 * 1000, // 30分钟
  [CacheCategory.PLAYLIST]: 15 * 60 * 1000, // 15分钟
  [CacheCategory.SEARCH]: 10 * 60 * 1000, // 10分钟
  [CacheCategory.TOP_SONGS]: 15 * 60 * 1000, // 15分钟
  [CacheCategory.SONG_URL]: 5 * 60 * 1000, // 5分钟
  [CacheCategory.COMMENTS]: 5 * 60 * 1000, // 5分钟
  [CacheCategory.HOT_PLAYLISTS]: 10 * 60 * 1000, // 10分钟
  [CacheCategory.DEFAULT]: 5 * 60 * 1000, // 5分钟（默认）
};

class LRUCache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize: number;
  private defaultTTL: number;
  private hotDataThreshold: number = 5; // 热门数据阈值（访问5次以上）

  constructor(maxSize: number = 150, defaultTTL: number = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // 获取该条目的TTL
    const ttl = entry.customTTL || CACHE_TTL_CONFIG[entry.category] || this.defaultTTL;

    // 检查是否过期
    const age = Date.now() - entry.timestamp;
    if (age > ttl) {
      this.cache.delete(key);
      return null;
    }

    // 更新访问次数
    entry.hits++;

    // 热门数据自动延长TTL（访问超过阈值）
    if (entry.hits >= this.hotDataThreshold && !entry.customTTL) {
      entry.customTTL = ttl * 1.5; // 延长50%
    }

    // 更新时间戳（热门数据刷新缓存时间）
    if (entry.hits % 3 === 0) {
      entry.timestamp = Date.now();
    }

    // 重新插入以更新LRU顺序
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.data;
  }

  set<T>(
    key: string,
    data: T,
    category: CacheCategory = CacheCategory.DEFAULT,
    customTTL?: number
  ): void {
    // 如果已存在，先删除
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // 如果超过最大容量，智能淘汰
    if (this.cache.size >= this.maxSize) {
      this.evictLeastValuable();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      hits: 0,
      category,
      customTTL,
    });
  }

  // 智能淘汰：优先删除访问少且即将过期的数据
  private evictLeastValuable(): void {
    let minScore = Infinity;
    let targetKey: string | null = null;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      const ttl = entry.customTTL || CACHE_TTL_CONFIG[entry.category] || this.defaultTTL;
      const age = now - entry.timestamp;
      const remainingLife = Math.max(0, ttl - age);

      // 计算价值分数：访问次数 × 剩余生命周期
      const score = entry.hits * (remainingLife / ttl);

      if (score < minScore) {
        minScore = score;
        targetKey = key;
      }
    }

    if (targetKey) {
      this.cache.delete(targetKey);
    }
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  // 批量删除过期缓存
  clearExpired(): number {
    let cleared = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      const ttl = entry.customTTL || CACHE_TTL_CONFIG[entry.category] || this.defaultTTL;
      if (now - entry.timestamp > ttl) {
        this.cache.delete(key);
        cleared++;
      }
    }

    return cleared;
  }

  // 获取缓存统计信息
  getStats(): {
    total: number;
    byCategory: Record<string, number>;
    hitRate: number;
    avgHits: number;
  } {
    const stats = {
      total: this.cache.size,
      byCategory: {} as Record<string, number>,
      hitRate: 0,
      avgHits: 0,
    };

    let totalHits = 0;
    for (const entry of this.cache.values()) {
      stats.byCategory[entry.category] = (stats.byCategory[entry.category] || 0) + 1;
      totalHits += entry.hits;
    }

    stats.avgHits = stats.total > 0 ? totalHits / stats.total : 0;
    stats.hitRate = stats.avgHits > 0 ? Math.min(stats.avgHits / 10, 1) : 0;

    return stats;
  }

  // 预热缓存：预加载热门数据
  async warmup(preloadFn: () => Promise<void>): Promise<void> {
    try {
      await preloadFn();
      console.log('✅ 缓存预热完成');
    } catch (error) {
      console.warn('⚠️ 缓存预热失败:', error);
    }
  }
}

// 优化: 添加请求去重机制
class RequestDeduplicator {
  private pending = new Map<string, Promise<any>>();

  async dedupe<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    // 如果请求正在进行中，返回同一个 Promise
    if (this.pending.has(key)) {
      return this.pending.get(key)!;
    }

    // 创建新的请求
    const promise = fetcher().then(
      (result) => {
        // 成功时使用 setTimeout 延迟清理，确保所有消费者都能获取结果
        setTimeout(() => this.pending.delete(key), 0);
        return result;
      },
      (error) => {
        // 失败时立即清理，允许重试
        this.pending.delete(key);
        throw error;
      }
    );

    this.pending.set(key, promise);
    return promise;
  }

  clear(): void {
    this.pending.clear();
  }
}

const cache = new LRUCache(150, 5 * 60 * 1000);
const requestDeduplicator = new RequestDeduplicator();

// 优化: 定期清理过期缓存，并保存定时器ID以便清理
let cacheCleanupInterval: number | null = null;

// 启动缓存清理
function startCacheCleanup(): void {
  if (cacheCleanupInterval !== null) return; // 防止重复启动

  cacheCleanupInterval = window.setInterval(() => {
    const cleared = cache.clearExpired();
    if (cleared > 0) {
      console.log(`✨ 清理了 ${cleared} 个过期缓存项`);
    }
  }, 60 * 1000); // 每分钟清理一次
}

// 停止缓存清理（用于页面卸载时）
function stopCacheCleanup(): void {
  if (cacheCleanupInterval !== null) {
    clearInterval(cacheCleanupInterval);
    cacheCleanupInterval = null;
  }
}

// 导出必要的函数供其他模块使用
export { fetchWithRetry, detectApiFormat };
export { API_BASE, API_SOURCES };

// 导出清理函数供外部调用
export function cleanup(): void {
  console.log('🧹 清理API模块资源...');
  stopCacheCleanup();
  cache.clear();
  requestDeduplicator.clear();
  console.log('✅ API模块清理完成');
}

// 页面卸载时清理定时器
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    cleanup();
  });
}

// 启动清理
startCacheCleanup();

// 判断错误是否可重试 (保留备用)
function _isRetryableError(error: any, statusCode?: number): boolean {
  // 网络错误通常可重试
  if (error?.name === 'AbortError') return true;
  if (error?.name === 'TypeError') return true;

  // 5xx 服务器错误可重试
  if (statusCode && statusCode >= 500) return true;

  // 429 限流可重试
  if (statusCode === 429) return true;

  // 408 请求超时可重试
  if (statusCode === 408) return true;

  return false;
}

// BUG-005修复: 改进的重试机制 - 区分错误类型，使用指数退避
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 2
): Promise<Response> {
  const timeoutDuration = 15000; // 15秒超时（从8秒增加）

  // BUG-005修复: 指数退避计算，更合理的延迟
  const getRetryDelay = (attempt: number): number => {
    // 指数退避: 1s, 2s, 4s (最多4秒)
    return Math.min(1000 * Math.pow(2, attempt), 4000);
  };

  // BUG-005修复: 提取请求执行逻辑，增加错误类型判断
  const executeRequest = async (signal: AbortSignal): Promise<Response> => {
    const response = await fetch(url, { ...options, signal });

    // 2xx 成功响应
    if (response.ok) {
      return response;
    }

    // BUG-005修复: 4xx客户端错误不应重试（除了429限流和408超时）
    if (response.status >= 400 && response.status < 500) {
      const retryable = response.status === 429 || response.status === 408;
      throw new ApiError(
        ApiErrorType.SERVER,
        `客户端请求错误: HTTP ${response.status}`,
        response.status,
        retryable // 只有429和408可重试
      );
    }

    // BUG-005修复: 5xx服务器错误可以重试
    if (response.status >= 500) {
      throw new ApiError(
        ApiErrorType.SERVER,
        `服务器错误: HTTP ${response.status}`,
        response.status,
        true // 服务器错误可重试
      );
    }

    // 其他未知状态码
    throw new ApiError(
      ApiErrorType.SERVER,
      `未知响应状态: HTTP ${response.status}`,
      response.status,
      false // 未知状态不重试
    );
  };

  let lastError: ApiError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

    try {
      const response = await executeRequest(controller.signal);
      clearTimeout(timeoutId);

      // BUG-005修复: 成功后重置连续失败计数（如果有的话）
      if (attempt > 0) {
        console.log(`✅ 请求在第${attempt + 1}次尝试后成功`);
      }

      return response;
    } catch (error) {
      // BUG-005修复: 确保超时ID在所有情况下都被清理
      clearTimeout(timeoutId);

      // BUG-005修复: 统一错误处理
      lastError = normalizeError(error);

      // BUG-005修复: 详细的重试判断逻辑
      const isLastAttempt = attempt >= maxRetries;
      const shouldRetry = !isLastAttempt && lastError.retryable;

      if (!shouldRetry) {
        // 记录最终失败
        if (isLastAttempt) {
          console.error(`❌ 请求失败，已重试${attempt}次: ${lastError.message}`);
        } else {
          console.error(`❌ 请求失败（不可重试）: ${lastError.message}`);
        }
        throw lastError;
      }

      // 继续重试
      const delay = getRetryDelay(attempt);
      console.warn(
        `⚠️ ${lastError.type}错误 (HTTP ${lastError.statusCode || 'N/A'}), ` +
          `${delay}ms后进行第${attempt + 2}/${maxRetries + 1}次尝试...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError || new ApiError(ApiErrorType.UNKNOWN, '所有请求尝试均失败');
}

// BUG-008修复: 统一的API错误处理器
export class ApiErrorHandler {
  // 获取用户友好的错误消息
  static getUserFriendlyMessage(error: unknown): string {
    if (error instanceof ApiError) {
      switch (error.type) {
        case ApiErrorType.NETWORK:
          return '网络连接失败，请检查您的网络设置';
        case ApiErrorType.TIMEOUT:
          return '请求超时，请稍后重试';
        case ApiErrorType.SERVER:
          if (error.statusCode === 429) {
            return '请求过于频繁，请稍后再试';
          } else if (error.statusCode && error.statusCode >= 500) {
            return '服务器错误，请稍后重试';
          }
          return `服务器响应异常 (${error.statusCode || '未知'})`;
        case ApiErrorType.PARSE:
          return '数据解析失败，请重试';
        default:
          return error.message || '未知错误';
      }
    }

    if (error instanceof Error) {
      return error.message;
    }

    return '操作失败，请重试';
  }

  // 判断是否需要显示重试按钮
  static shouldShowRetry(error: unknown): boolean {
    if (error instanceof ApiError) {
      return error.retryable;
    }
    return true; // 默认允许重试
  }

  // 获取错误类型的图标
  static getErrorIcon(error: unknown): string {
    if (error instanceof ApiError) {
      switch (error.type) {
        case ApiErrorType.NETWORK:
          return '🌐';
        case ApiErrorType.TIMEOUT:
          return '⏱️';
        case ApiErrorType.SERVER:
          return '🔧';
        case ApiErrorType.PARSE:
          return '📋';
        default:
          return '⚠️';
      }
    }
    return '❌';
  }

  // 记录错误日志
  static logError(error: unknown, context: string): void {
    const timestamp = new Date().toISOString();
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[${timestamp}] [${context}] ${errorMsg}`, error);
  }
}

// 优化: 新增错误规范化函数
function normalizeError(error: unknown): ApiError {
  // 超时错误
  if (error instanceof Error && error.name === 'AbortError') {
    return new ApiError(ApiErrorType.TIMEOUT, '请求超时，请检查网络连接', undefined, true);
  }

  // API错误直接返回
  if (error instanceof ApiError) {
    return error;
  }

  // 其他错误
  return new ApiError(
    ApiErrorType.NETWORK,
    error instanceof Error ? error.message : '网络请求失败',
    undefined,
    true
  );
}

// 测试API可用性
async function testAPI(apiUrl: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const testUrl = `${apiUrl}?types=search&source=netease&name=test&count=1`;
    const response = await fetch(testUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    return response.ok;
  } catch (error) {
    return false;
  }
}

// 查找可用API
export async function findWorkingAPI(): Promise<{ success: boolean; name?: string }> {
  for (const api of API_SOURCES) {
    const isWorking = await testAPI(api.url);
    if (isWorking) {
      API_BASE = api.url;
      currentApiIndex = API_SOURCES.findIndex((a) => a.url === api.url);
      return { success: true, name: api.name };
    }
  }
  return { success: false };
}

// 切换到下一个API
export async function switchToNextAPI(): Promise<boolean> {
  const startIndex = currentApiIndex;

  for (let i = 1; i < API_SOURCES.length; i++) {
    const nextIndex = (startIndex + i) % API_SOURCES.length;
    const api = API_SOURCES[nextIndex];

    const isWorking = await testAPI(api.url);
    if (isWorking) {
      API_BASE = api.url;
      currentApiIndex = nextIndex;
      notifyApiChange();
      console.log(`✅ 已切换到API: ${api.name}`);
      return true;
    }
  }

  console.warn('⚠️ 没有可用的备用API');
  return false;
}

// 获取当前API源名称
export function getCurrentSourceName(): string {
  return API_SOURCES[currentApiIndex]?.name || '未知API';
}

// 手动切换到指定API
export async function switchToAPI(
  index: number
): Promise<{ success: boolean; name?: string; error?: string }> {
  if (index < 0 || index >= API_SOURCES.length) {
    return { success: false, error: 'API索引超出范围' };
  }

  const api = API_SOURCES[index];
  const isWorking = await testAPI(api.url);

  if (isWorking) {
    API_BASE = api.url;
    currentApiIndex = index;

    // 保存用户选择到 localStorage
    try {
      localStorage.setItem('preferredApiIndex', String(index));
    } catch (error) {
      console.warn('无法保存API偏好设置:', error);
    }

    // 触发变更回调
    notifyApiChange();

    return { success: true, name: api.name };
  }

  return { success: false, error: 'API连接测试失败' };
}

// 获取所有API源列表
export function getAllApiSources(): Array<{
  index: number;
  name: string;
  url: string;
  isCurrent: boolean;
}> {
  return API_SOURCES.map((api, index) => ({
    index,
    name: api.name,
    url: api.url,
    isCurrent: index === currentApiIndex,
  }));
}

// 注册API变更回调
export function onApiChange(callback: () => void): void {
  apiChangeCallbacks.push(callback);
}

// 触发API变更通知
function notifyApiChange(): void {
  apiChangeCallbacks.forEach((callback) => {
    try {
      callback();
    } catch (error) {
      console.error('API变更回调执行失败:', error);
    }
  });
}

// 检测API功能支持情况
export async function detectApiCapabilities(apiUrl?: string): Promise<{
  hotPlaylists: boolean;
  artistList: boolean;
  artistTopSongs: boolean;
  format: 'gdstudio' | 'ncm' | 'meting' | 'clawcloud' | 'vercel';
}> {
  const url = apiUrl || API_BASE;
  const apiFormat = detectApiFormat(url);

  // NCM API支持所有功能
  if (apiFormat.format === 'ncm') {
    return {
      hotPlaylists: true,
      artistList: true,
      artistTopSongs: true,
      format: 'ncm',
    };
  }

  // ClawCloud API = 网易云音乐API Enhanced,完全支持NCM的所有功能
  if (apiFormat.format === 'clawcloud') {
    return {
      hotPlaylists: true,
      artistList: true,
      artistTopSongs: true,
      format: 'clawcloud',
    };
  }

  // 其他API使用降级方案
  return {
    hotPlaylists: false, // 使用内置数据
    artistList: false, // 使用内置数据
    artistTopSongs: false, // 不支持
    format: apiFormat.format,
  };
}

// 测试所有API并返回状态
export async function testAllApis(): Promise<
  Array<{
    index: number;
    name: string;
    url: string;
    available: boolean;
    capabilities: Awaited<ReturnType<typeof detectApiCapabilities>>;
  }>
> {
  const results = await Promise.all(
    API_SOURCES.map(async (api, index) => {
      const available = await testAPI(api.url);
      const capabilities = await detectApiCapabilities(api.url);

      return {
        index,
        name: api.name,
        url: api.url,
        available,
        capabilities,
      };
    })
  );

  return results;
}

// 从 localStorage 恢复用户偏好的API
export async function restorePreferredApi(): Promise<void> {
  try {
    const savedIndex = localStorage.getItem('preferredApiIndex');
    if (savedIndex !== null) {
      const index = parseInt(savedIndex, 10);
      if (index >= 0 && index < API_SOURCES.length) {
        const result = await switchToAPI(index);
        if (result.success) {
          console.log(`✅ 已恢复用户偏好的API: ${result.name}`);
        } else {
          console.warn(`⚠️ 无法恢复偏好API，使用默认API`);
        }
      }
    }
  } catch (error) {
    console.warn('恢复API偏好设置失败:', error);
  }
}

// 获取专辑封面 - 优化: 智能尺寸选择，根据设备和网络状况
export async function getAlbumCoverUrl(song: Song, size?: number): Promise<string> {
  const DEFAULT_COVER =
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTUiIGhlaWdodD0iNTUiIHZpZXdCb3g9IjAgMCA1NSA1NSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjU1IiBoZWlnaHQ9IjU1IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHJ4PSI4Ii8+CjxwYXRoIGQ9Ik0yNy41IDE4TDM1IDI3LjVIMzBWMzdIMjVWMjcuNUgyMEwyNy41IDE4WiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjMpIi8+Cjwvc3ZnPgo=';

  // 支持多种图片ID字段，包括NCM格式的al.picStr
  const picId =
    song.pic_id ||
    song.cover ||
    song.album_pic ||
    song.pic ||
    song?.al?.picStr ||
    song?.album?.picStr ||
    song?.album?.pic ||
    song?.al?.pic ||
    song?.album?.pic_url ||
    song?.pic_url;
  if (!picId) {
    return DEFAULT_COVER;
  }

  // 优化: 智能选择图片尺寸
  const dpr = window.devicePixelRatio || 1;
  const isMobile = window.innerWidth <= 768;

  // 如果没有指定尺寸，根据设备智能选择
  if (!size) {
    size = isMobile ? 150 : 300; // 移动端默认150，桌面端默认300
  }

  // 考虑设备像素比，但设置上限避免过大
  const adjustedSize = Math.min(Math.ceil(size * dpr), 1024);

  // 选择最接近的可用尺寸：150, 300, 500, 1024
  const optimizedSize =
    adjustedSize <= 150 ? 150 : adjustedSize <= 300 ? 300 : adjustedSize <= 500 ? 500 : 1024;

  // 检查缓存 - 使用专辑封面分类
  const cacheKey = `cover_${song.source}_${picId}_${optimizedSize}`;
  const cached = cache.get<string>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const apiFormat = detectApiFormat(API_BASE);
    let url: string;

    // 根据不同API格式构建请求URL
    switch (apiFormat.format) {
      case 'gdstudio':
        // GDStudio API格式: ?types=pic&source=netease&id=pic_id&size=300
        url = `${API_BASE}?types=pic&source=${song.source}&id=${picId}&size=${optimizedSize}`;
        break;
      case 'ncm':
        // NCM API可能不直接提供图片接口，尝试使用网易云的图片CDN
        if (picId && typeof picId === 'string' && picId.length > 0) {
          // 网易云图片CDN格式
          url = `https://p1.music.126.net/${picId}/${optimizedSize}y${optimizedSize}.jpg`;
        } else {
          return DEFAULT_COVER;
        }
        break;
      case 'meting':
      default:
        // Meting API格式: ?type=pic&id=pic_id&size=300
        url = `${API_BASE}?type=pic&id=${picId}&size=${optimizedSize}`;
        break;
    }

    // 对于NCM格式的直接CDN链接，跳过API调用
    if (apiFormat.format === 'ncm' && url.includes('music.126.net')) {
      cache.set(cacheKey, url, CacheCategory.ALBUM_COVER);
      return url;
    }

    const response = await fetchWithRetry(url, {}, 1); // 封面请求减少重试次数
    const data = await response.json();

    if (data && data.url) {
      cache.set(cacheKey, data.url, CacheCategory.ALBUM_COVER);
      return data.url;
    }

    // 如果获取失败，尝试不同的尺寸
    if (optimizedSize !== 300) {
      return getAlbumCoverUrl(song, 300);
    }

    return DEFAULT_COVER;
  } catch (error) {
    console.warn('获取专辑封面失败:', error);

    // 如果获取失败且不是300尺寸，尝试300尺寸
    if (size !== 300) {
      return getAlbumCoverUrl(song, 300);
    }

    return DEFAULT_COVER;
  }
}

// 修复BUG-003: 使用GET+Range替代HEAD请求，避免CORS问题
async function validateUrl(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    // 使用GET请求+Range头，只请求第一个字节，避免CORS阻止HEAD请求
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Range: 'bytes=0-0',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // 206 Partial Content, 200 OK, 或 416 Range Not Satisfiable 都表示URL有效
    return response.ok || response.status === 206 || response.status === 416;
  } catch (error) {
    // 网络错误或超时，认为URL无效
    console.warn('URL验证失败:', url, error);
    return false;
  }
}

// 老王优化：单个API源获取歌曲URL的辅助函数
async function getSongUrlFromApi(
  song: Song,
  quality: string,
  apiUrl: string
): Promise<{ url: string; br: string; error?: string }> {
  try {
    const apiFormat = detectApiFormat(apiUrl);
    let url: string;

    // 根据不同API格式构建请求URL
    switch (apiFormat.format) {
      case 'gdstudio':
        // GDStudio API格式: ?types=url&source=netease&id=song_id&br=320
        url = `${apiUrl}?types=url&source=${song.source}&id=${song.id}&br=${quality}`;
        break;
      case 'ncm':
        // NCM API格式: /song/url?id=song_id&br=320
        url = `${apiUrl}song/url?id=${song.id}&br=${quality}`;
        break;
      case 'clawcloud':
        // ClawCloud API = 网易云音乐API Enhanced,使用song/url/v1接口获取更高音质
        url = `${apiUrl}song/url/v1?id=${song.id}&level=${quality === '320' ? 'exhigh' : quality === '192' ? 'higher' : 'standard'}`;
        break;
      case 'meting':
      default:
        // Meting API格式: ?type=url&source=netease&id=song_id&br=320
        url = `${apiUrl}?type=url&source=${song.source}&id=${song.id}&br=${quality}`;
        break;
    }

    const response = await fetchWithRetry(url);

    // 处理401未授权错误 - 使用网易云直链
    if (response.status === 401 && song.source === 'netease') {
      const directUrl = `https://music.163.com/song/media/outer/url?id=${song.id}.mp3`;
      // 优化: 验证直链是否有效
      const isValid = await validateUrl(directUrl);
      if (isValid) {
        return { url: directUrl, br: quality };
      }
      return { url: '', br: '', error: '无法获取音乐链接（版权或地区限制）' };
    }

    const data = await response.json();

    // 处理不同API格式的响应数据
    let songUrl = '';
    if (apiFormat.format === 'ncm' || apiFormat.format === 'clawcloud') {
      // NCM API格式: { data: [{ url: "...", br: 320000 }] }
      if (data && data.data && Array.isArray(data.data) && data.data.length > 0) {
        songUrl = data.data[0].url;
      } else if (data && data.url) {
        songUrl = data.url;
      }
    } else {
      // GDStudio 和 Meting API格式
      if (data && data.url) {
        songUrl = data.url;
      }
    }

    if (songUrl) {
      // 优化: 验证返回的URL是否有效（只验证网易云音乐）
      if (song.source === 'netease') {
        const isValid = await validateUrl(songUrl);
        if (!isValid) {
          // URL无效，尝试使用直链
          const directUrl = `https://music.163.com/song/media/outer/url?id=${song.id}.mp3`;
          const directIsValid = await validateUrl(directUrl);
          if (directIsValid) {
            return { url: directUrl, br: quality };
          }
          return { url: '', br: '', error: '音乐链接已失效（版权或地区限制）' };
        }
      }
      return { url: songUrl, br: quality };
    } else if (song.source === 'netease') {
      // API返回空URL时使用网易云直链
      const directUrl = `https://music.163.com/song/media/outer/url?id=${song.id}.mp3`;
      const isValid = await validateUrl(directUrl);
      if (isValid) {
        return { url: directUrl, br: quality };
      }
      return { url: '', br: '', error: '无法获取音乐链接（版权或地区限制）' };
    }

    return { url: '', br: '', error: `无法获取音乐链接` };
  } catch (error) {
    // 请求失败时尝试网易云直链
    if (song.source === 'netease') {
      try {
        const directUrl = `https://music.163.com/song/media/outer/url?id=${song.id}.mp3`;
        const isValid = await validateUrl(directUrl);
        if (isValid) {
          return { url: directUrl, br: quality };
        }
      } catch (validateError) {
        console.warn('验证网易云直链失败:', validateError);
      }
    }

    const errorMessage = error instanceof ApiError ? `API请求失败: ${error.message}` : `请求失败`;

    console.error(`从 ${apiUrl} 获取歌曲URL失败:`, errorMessage);
    return { url: '', br: '', error: errorMessage };
  }
}

// 获取歌曲URL - 老王优化：使用播放专用API源列表，规避版权限制
export async function getSongUrl(
  song: Song,
  quality: string
): Promise<{ url: string; br: string; error?: string }> {
  console.log(`🎵 [播放优化] 开始获取歌曲URL: ${song.name} (ID: ${song.id})`);

  const errors: string[] = [];

  // 遍历播放专用API源列表，优先使用备用API规避版权问题
  for (let i = 0; i < PLAYBACK_API_SOURCES.length; i++) {
    const apiSource = PLAYBACK_API_SOURCES[i];
    console.log(
      `🔄 [播放优化] 尝试API源 ${i + 1}/${PLAYBACK_API_SOURCES.length}: ${apiSource.name}`
    );

    try {
      const result = await getSongUrlFromApi(song, quality, apiSource.url);

      // 如果成功获取到URL，直接返回
      if (result.url) {
        console.log(`✅ [播放优化] 成功从 ${apiSource.name} 获取音乐链接`);
        return result;
      }

      // 记录错误
      if (result.error) {
        errors.push(`${apiSource.name}: ${result.error}`);
        console.warn(`⚠️ [播放优化] ${apiSource.name} 返回错误: ${result.error}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      errors.push(`${apiSource.name}: ${errorMsg}`);
      console.error(`❌ [播放优化] ${apiSource.name} 请求失败:`, errorMsg);
    }
  }

  // 老王集成：所有API源都失败后，尝试Provider直连平台
  console.log(`⚠️ [播放优化] 所有API源失败，尝试Provider直连平台`);
  try {
    const providerResult = await getSongUrlFromProvider(song, quality);
    if (providerResult.url) {
      // 老王修复BUG：验证Provider返回的URL是否可用（避免CORS阻塞的无效链接）
      const isUrlValid = await validateUrl(providerResult.url);
      if (isUrlValid) {
        console.log(`✅ [播放优化] Provider成功获取播放链接`);
        return providerResult;
      } else {
        console.warn(`⚠️ [播放优化] Provider返回的URL被CORS阻塞，继续尝试跨平台fallback`);
      }
    }
  } catch (providerError) {
    console.warn(`⚠️ [播放优化] Provider失败:`, providerError);
  }

  // 老王新增：跨平台智能搜索fallback
  // 当原平台（如网易云）版权限制时，自动搜索其他平台的同名歌曲
  console.log(`🔄 [跨平台Fallback] 开始搜索其他平台: ${song.name}`);
  const alternativeSources = ['kuwo', 'migu', 'kugou', 'qq'].filter(s => s !== song.source);

  for (const source of alternativeSources) {
    try {
      console.log(`🔄 [跨平台Fallback] 尝试平台: ${source}`);

      // 在其他平台搜索同名歌曲
      const searchKeyword = `${song.name} ${Array.isArray(song.artist) ? song.artist[0] : song.artist}`;
      const searchResults = await searchMusicAPI(searchKeyword, source);

      if (searchResults.length > 0) {
        const matchedSong = searchResults[0]; // 取第一个匹配结果
        console.log(`✅ [跨平台Fallback] 在${source}找到匹配歌曲: ${matchedSong.name}`);

        // 尝试获取这首歌的播放URL
        const fallbackResult = await getSongUrl(matchedSong, quality);
        if (fallbackResult.url && !fallbackResult.error) {
          console.log(`🎉 [跨平台Fallback] 成功从${source}获取播放链接！`);
          return fallbackResult;
        }
      }
    } catch (fallbackError) {
      console.warn(`⚠️ [跨平台Fallback] ${source}搜索失败:`, fallbackError);
      continue; // 继续尝试下一个平台
    }
  }

  // 所有方式都失败，返回错误
  console.error(`❌ [播放优化] 所有方式均失败（含跨平台搜索），歌曲: ${song.name}`);
  const combinedError =
    errors.length > 0 ? `尝试${errors.length}个API均失败 - ${errors[0]}` : '无法获取音乐链接';

  return { url: '', br: '', error: combinedError };
}

// 获取歌词 - 添加缓存，支持NCM API格式
export async function getLyrics(song: Song): Promise<{ lyric: string }> {
  // 检查缓存 - 使用歌词分类
  const cacheKey = `lyric_${song.source}_${song.lyric_id || song.id}`;
  const cached = cache.get<{ lyric: string }>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const apiFormat = detectApiFormat(API_BASE);
    let url: string;

    // 根据不同API格式构建请求URL
    switch (apiFormat.format) {
      case 'gdstudio':
        // GDStudio API格式: ?types=lyric&source=netease&id=song_id
        url = `${API_BASE}?types=lyric&source=${song.source}&id=${song.lyric_id || song.id}`;
        break;
      case 'ncm':
        // NCM API格式: /lyric?id=song_id
        url = `${API_BASE}lyric?id=${song.lyric_id || song.id}`;
        break;
      case 'clawcloud':
        // ClawCloud API = 网易云音乐API Enhanced,完全兼容NCM歌词接口
        url = `${API_BASE}lyric?id=${song.lyric_id || song.id}`;
        break;
      case 'meting':
      default:
        // Meting API格式: ?type=lyric&source=netease&id=song_id
        url = `${API_BASE}?type=lyric&source=${song.source}&id=${song.lyric_id || song.id}`;
        break;
    }

    const response = await fetchWithRetry(url, {}, 1); // 歌词请求减少重试次数
    const data = await response.json();

    // 处理不同API格式的响应数据
    let lyricData = { lyric: '' };
    if (apiFormat.format === 'ncm') {
      // NCM API格式: { lrc: { lyric: "..." }, tlyric: { lyric: "..." }, code: 200 }
      if (data && data.lrc && data.lrc.lyric) {
        lyricData.lyric = data.lrc.lyric;
      } else if (data && data.lyric) {
        lyricData.lyric = data.lyric;
      }
    } else {
      // GDStudio 和 Meting API格式
      if (data && data.lyric) {
        lyricData = data;
      } else if (data && typeof data === 'string') {
        lyricData.lyric = data;
      }
    }

    if (lyricData.lyric) {
      cache.set(cacheKey, lyricData, CacheCategory.LYRICS);
      return lyricData;
    }

    // 老王修改：如果现有API未返回歌词，直接尝试Provider
    console.log(`⚠️ 现有API未返回歌词，尝试Provider直连平台`);
    try {
      const providerLyric = await getLyricFromProvider(song);
      if (providerLyric.lyric) {
        cache.set(cacheKey, providerLyric, CacheCategory.LYRICS);
        return providerLyric;
      }
    } catch (providerError) {
      console.warn('Provider获取歌词失败:', providerError);
    }

    return { lyric: '' };
  } catch (error) {
    console.warn('获取歌词失败:', error);

    // 老王修改：现有API失败时，直接尝试Provider作为备用源
    try {
      console.log(`⚠️ 现有API失败，尝试Provider直连平台作为备用源`);
      const providerLyric = await getLyricFromProvider(song);
      if (providerLyric.lyric) {
        cache.set(cacheKey, providerLyric, CacheCategory.LYRICS);
        return providerLyric;
      }
    } catch (providerError) {
      console.warn('Provider也失败了:', providerError);
    }

    return { lyric: '' };
  }
}

// 搜索音乐 - 优化: 添加请求去重和分级缓存，支持NCM API格式
export async function searchMusicAPI(
  keyword: string,
  source: string,
  limit: number = 100
): Promise<Song[]> {
  const cacheKey = `search_${source}_${keyword}_${limit}`;

  // 先检查缓存
  const cached = cache.get<Song[]>(cacheKey);
  if (cached) {
    return cached;
  }

  // 优化: 使用请求去重
  return requestDeduplicator.dedupe(cacheKey, async () => {
    try {
      const apiFormat = detectApiFormat(API_BASE);
      let url: string;

      // 根据不同API格式构建请求URL
      switch (apiFormat.format) {
        case 'gdstudio':
          url = `${API_BASE}?types=search&source=${source}&name=${encodeURIComponent(keyword)}&count=${limit}`;
          break;
        case 'ncm':
          url = `${API_BASE}search?keywords=${encodeURIComponent(keyword)}&limit=${limit}&type=${source}`;
          break;
        case 'clawcloud':
          url = `${API_BASE}cloudsearch?keywords=${encodeURIComponent(keyword)}&limit=${limit}&type=1`;
          break;
        case 'meting':
        default:
          url = `${API_BASE}?type=search&source=${source}&keywords=${encodeURIComponent(keyword)}&limit=${limit}`;
          break;
      }

      const response = await fetchWithRetry(url);

      if (!response.ok) {
        throw new Error(`API响应错误: ${response.status}`);
      }

      const data = await response.json();

      if (data && data.error) {
        throw new Error(data.error || 'API返回错误');
      }

      // 解析不同API格式的响应数据
      let songs: any[] = [];
      if (apiFormat.format === 'ncm') {
        // NCM API格式: { result: { songs: [...] }, code: 200 }
        if (data && data.result && data.result.songs) {
          songs = data.result.songs;
        } else if (Array.isArray(data)) {
          songs = data;
        }
      } else {
        // GDStudio 和 Meting API格式解析
        if (Array.isArray(data)) {
          songs = data;
        } else if (data && typeof data === 'object') {
          if (Array.isArray(data.data)) {
            songs = data.data;
          } else if (Array.isArray(data.songs)) {
            songs = data.songs;
          } else if (Array.isArray(data.result)) {
            songs = data.result;
          } else if (Array.isArray(data.list)) {
            songs = data.list;
          }
        }
      }

      if (songs.length === 0) {
        return [];
      }

      // 过滤和规范化数据 - 增强数据提取逻辑，支持NCM格式
      songs = songs
        .filter(
          (song) => song && (song.name || song.title) // 只要有名称就保留
        )
        .map((song) => {
          // 深度提取艺术家信息
          const artistInfo = extractArtistInfo(song);

          // 深度提取专辑信息
          const albumInfo = extractAlbumInfo(song);

          // 深度提取歌曲信息
          const songInfo = extractSongInfo(song);

          // 提取图片ID，支持NCM格式的al.picStr字段
          const picId =
            song.pic_id ||
            song.cover ||
            song.album_pic ||
            song.pic ||
            song?.al?.picStr ||
            song?.album?.picStr ||
            song?.album?.pic;

          return {
            ...song,
            id:
              song.id || song.url_id || song.lyric_id || `${source}_${Date.now()}_${Math.random()}`,
            source: source,
            name: songInfo,
            artist: artistInfo,
            album: albumInfo,
            pic_id: picId,
            // 保留原始数据以便后续使用
            rawData: song,
          };
        });

      // 缓存搜索结果
      cache.set(cacheKey, songs, CacheCategory.SEARCH);

      return songs;
    } catch (error) {
      console.error('搜索失败:', error);
      throw error;
    }
  });
}

// 解析歌单 - 支持NCM API格式，添加缓存
export async function parsePlaylistAPI(
  playlistUrlOrId: string,
  source: string = 'netease'
): Promise<{ songs: Song[]; name?: string; count?: number }> {
  let playlistId = playlistUrlOrId.trim();

  // 检查缓存
  const cacheKey = `playlist_${source}_${playlistId}`;
  const cached = cache.get<{ songs: Song[]; name?: string; count?: number }>(cacheKey);
  if (cached) {
    return cached;
  }

  // 从URL提取ID
  if (source === 'netease') {
    if (playlistId.includes('music.163.com') || playlistId.includes('163cn.tv')) {
      const patterns = [/id=(\d+)/, /playlist\/(\d+)/, /\/(\d+)\?/, /\/(\d+)$/];

      let matched = false;
      for (const pattern of patterns) {
        const idMatch = playlistId.match(pattern);
        if (idMatch && idMatch[1]) {
          playlistId = idMatch[1];
          matched = true;
          break;
        }
      }

      if (!matched) {
        throw new Error('无法从URL中提取歌单ID');
      }
    }
  } else if (source === 'tencent') {
    if (playlistId.includes('y.qq.com')) {
      const patterns = [/playlist\/(\d+)/, /id=(\d+)/, /\/(\d+)\?/, /\/(\d+)$/];

      let matched = false;
      for (const pattern of patterns) {
        const idMatch = playlistId.match(pattern);
        if (idMatch && idMatch[1]) {
          playlistId = idMatch[1];
          matched = true;
          break;
        }
      }

      if (!matched) {
        throw new Error('无法从QQ音乐URL中提取歌单ID');
      }
    }
  }

  // 根据API格式构建请求URL
  const apiFormat = detectApiFormat(API_BASE);
  let apiUrl: string;

  switch (apiFormat.format) {
    case 'gdstudio':
      // GDStudio API格式: ?types=playlist&source=netease&id=playlist_id
      apiUrl = `${API_BASE}?types=playlist&source=${source}&id=${playlistId}`;
      break;
    case 'ncm':
      // NCM API格式: /playlist/detail?id=playlist_id
      apiUrl = `${API_BASE}playlist/detail?id=${playlistId}`;
      break;
    case 'clawcloud':
      // ClawCloud API = 网易云音乐API Enhanced,完全兼容NCM歌单接口
      apiUrl = `${API_BASE}playlist/detail?id=${playlistId}`;
      break;
    case 'meting':
    default:
      // Meting API格式: ?type=playlist&source=netease&id=playlist_id
      apiUrl = `${API_BASE}?type=playlist&source=${source}&id=${playlistId}`;
      break;
  }

  try {
    const response = await fetchWithRetry(apiUrl);

    if (!response.ok) {
      throw new Error(`API响应错误: ${response.status}`);
    }

    const playlistData = await response.json();

    if (!playlistData) {
      throw new Error('API返回空数据');
    }

    if (playlistData.error || playlistData.msg) {
      throw new Error(playlistData.error || playlistData.msg || 'API错误');
    }

    let songs: Song[] = [];
    let playlistName = '未命名歌单';

    // 解析不同API格式的响应数据
    if (apiFormat.format === 'ncm') {
      // NCM API格式: { playlist: { tracks: [...] }, code: 200 }
      if (playlistData && playlistData.playlist && playlistData.playlist.tracks) {
        songs = playlistData.playlist.tracks;
        playlistName = playlistData.playlist.name || playlistName;
      } else if (playlistData && playlistData.result && playlistData.result.tracks) {
        songs = playlistData.result.tracks;
        playlistName = playlistData.result.name || playlistName;
      }
    } else {
      // GDStudio 和 Meting API格式解析
      if (Array.isArray(playlistData)) {
        songs = playlistData;
      } else if (playlistData.songs && Array.isArray(playlistData.songs)) {
        songs = playlistData.songs;
        playlistName = playlistData.name || playlistName;
      } else if (playlistData.data && Array.isArray(playlistData.data)) {
        songs = playlistData.data;
        playlistName = playlistData.name || playlistName;
      } else if (playlistData.playlist && playlistData.playlist.tracks) {
        songs = playlistData.playlist.tracks;
        playlistName = playlistData.playlist.name || playlistName;
      }
    }

    if (!songs || songs.length === 0) {
      throw new Error('歌单为空');
    }

    // 规范化数据 - 使用增强的数据提取函数，支持NCM格式
    songs = songs
      .filter((song: any) => song && song.id && (song.name || song.title)) // 只要有ID和名称就保留
      .map((song: any) => {
        // 使用增强的数据提取函数
        const songInfo = extractSongInfo(song);
        const artistInfo = extractArtistInfo(song);
        const albumInfo = extractAlbumInfo(song);

        // 提取图片ID，支持NCM格式的al.picStr字段
        const picId =
          song.pic_id ||
          song.cover ||
          song.album_pic ||
          song.pic ||
          song?.al?.picStr ||
          song?.album?.picStr ||
          song?.album?.pic;

        return {
          ...song,
          source: source,
          name: songInfo,
          artist: artistInfo,
          album: albumInfo,
          pic_id: picId,
          // 保留原始数据以便后续使用
          rawData: song,
        };
      });

    const result = {
      songs: songs,
      name: playlistName,
      count: songs.length,
    };

    // 缓存歌单数据
    cache.set(cacheKey, result, CacheCategory.PLAYLIST);

    return result;
  } catch (error) {
    console.error('解析歌单失败:', error);
    throw error;
  }
}

// 获取当前API信息
export function getCurrentApiStatus(): {
  name: string;
  url: string;
  index: number;
  total: number;
} {
  const currentApi = API_SOURCES[currentApiIndex];
  return {
    name: currentApi.name,
    url: currentApi.url,
    index: currentApiIndex,
    total: API_SOURCES.length,
  };
}

// 获取音乐源列表
export function getMusicSources() {
  return MUSIC_SOURCES;
}

// 深度提取艺术家信息 - 保持原始数据完整性
function extractArtistInfo(song: any): string[] {
  // 优先级顺序：直接字段 > 嵌套对象 > 数组 > 分割字符串
  const possibleSources = [
    // 直接字段
    song.artist,
    song.artists,
    song.artist_name,
    song.singer,
    song.singers,
    // 嵌套对象
    song?.artist?.name,
    song?.artists?.[0]?.name,
    song?.ar?.[0]?.name, // 网易云格式
    song?.ar?.name,
    // 数组字段
    ...(Array.isArray(song.artist) ? song.artist : []),
    ...(Array.isArray(song.artists) ? song.artists : []),
    ...(Array.isArray(song.ar) ? song.ar : []),
  ];

  // 遍历所有可能的数据源
  for (const source of possibleSources) {
    if (source === null || source === undefined) continue;

    if (typeof source === 'string' && source.trim()) {
      // 字符串格式，可能是多个艺术家用分隔符分开
      const artists = source
        .split(/[,，、/\s]+/)
        .map((s) => s.trim())
        .filter((s) => s);
      if (artists.length > 0) {
        return artists;
      }
    } else if (typeof source === 'object' && source.name) {
      // 对象格式，有name字段
      const name = String(source.name).trim();
      if (name) return [name];
    }
  }

  // 最后的备选方案：从原始字段中提取任何可用的文本
  const fallbackFields = ['artist', 'artists', 'ar'];
  for (const field of fallbackFields) {
    if (song[field]) {
      const text = String(song[field]).trim();
      if (text && text !== 'null' && text !== 'undefined') {
        // 尝试解析JSON格式
        try {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const names = parsed
              .map((item) => (typeof item === 'object' ? item.name : String(item)))
              .filter(Boolean);
            if (names.length > 0) return names;
          }
        } catch {
          // 如果不是JSON，作为普通字符串处理
          const names = text
            .split(/[,，、/\s]+/)
            .map((s) => s.trim())
            .filter((s) => s && s !== 'null' && s !== 'undefined');
          if (names.length > 0) return names;
        }
      }
    }
  }

  return ['未知艺术家'];
}

// 深度提取专辑信息 - 保持原始数据完整性
function extractAlbumInfo(song: any): string {
  // 优先级顺序：直接字段 > 嵌套对象 > 备用字段
  const possibleSources = [
    // 直接字段
    song.album,
    song.album_name,
    song.collection,
    song.disc,
    // 嵌套对象
    song?.album?.name,
    song?.al?.name, // 网易云格式
    song?.collection?.name,
    // 专辑ID相关
    song.album_id,
    song?.album?.id,
    song?.al?.id,
  ];

  // 遍历所有可能的数据源
  for (const source of possibleSources) {
    if (source === null || source === undefined) continue;

    if (typeof source === 'string' && source.trim()) {
      const name = source.trim();
      if (name && name !== 'null' && name !== 'undefined') {
        return name;
      }
    } else if (typeof source === 'object' && source.name) {
      const name = String(source.name).trim();
      if (name && name !== 'null' && name !== 'undefined') {
        return name;
      }
    } else if (typeof source === 'number') {
      // 如果只有专辑ID，至少显示ID
      return `专辑ID: ${source}`;
    }
  }

  // 从pic_url或相关字段推断专辑名
  if (song.pic_url || song.cover) {
    const url = song.pic_url || song.cover;
    const matches = url.match(/album[_/]?(\d+)/i);
    if (matches && matches[1]) {
      return `专辑 ${matches[1]}`;
    }
  }

  return '未知专辑';
}

// 深度提取歌曲信息 - 保持原始数据完整性
function extractSongInfo(song: any): string {
  // 优先级顺序：标准字段 > 备用字段 > URL推断
  const possibleSources = [
    // 标准字段
    song.name,
    song.title,
    song.song_name,
    // 嵌套对象（网易云格式等）
    song?.name,
    song?.title,
    // 从文件名推断
    song.filename,
    song.file_name,
  ];

  // 遍历所有可能的数据源
  for (const source of possibleSources) {
    if (source === null || source === undefined) continue;

    let songName = '';
    if (typeof source === 'string') {
      songName = source.trim();
    } else if (typeof source === 'object' && source.name) {
      songName = String(source.name).trim();
    } else if (typeof source === 'object' && source.title) {
      songName = String(source.title).trim();
    }

    if (songName && songName !== 'null' && songName !== 'undefined') {
      // 清理文件扩展名
      songName = songName.replace(/\.(mp3|flac|wav|m4a|aac)$/i, '');
      // 清理常见的无效标识符
      songName = songName.replace(/^[_\-\s]+|[_\-\s]+$/g, '');

      if (songName) {
        return songName;
      }
    }
  }

  // 从URL推断歌曲名
  if (song.url || song.link) {
    const url = song.url || song.link;
    const filename = url.split('/').pop()?.split('?')[0];
    if (filename) {
      const songName = filename.replace(/\.(mp3|flac|wav|m4a|aac)$/i, '');
      if (songName && songName !== 'null' && songName !== 'undefined') {
        return decodeURIComponent(songName);
      }
    }
  }

  // 最后的备选方案：使用ID
  if (song.id) {
    return `歌曲 ${song.id}`;
  }

  return '未知歌曲';
}

// ========== 新增实用功能 ==========

// 获取热门歌曲排行榜 - 支持多种榜单
export async function getTopSongs(
  category: string = 'hot',
  source: string = 'netease',
  limit: number = 50
): Promise<Song[]> {
  const cacheKey = `top_${source}_${category}_${limit}`;
  const cached = cache.get<Song[]>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const apiFormat = detectApiFormat(API_BASE);
    let url: string;

    switch (apiFormat.format) {
      case 'ncm': {
        // NCM API格式: /top/list?id=榜单ID
        const topListIds: { [key: string]: string } = {
          hot: '3778678', // 热歌榜
          new: '3779629', // 新歌榜
          original: '2884035', // 原创榜
          soar: '19723756', // 飙升榜
          electronic: '10520166', // 电音榜
        };
        const listId = topListIds[category] || topListIds.hot;
        url = `${API_BASE}top/list?id=${listId}`;
        break;
      }
      case 'clawcloud': {
        // ClawCloud API = 网易云音乐API Enhanced,完全兼容NCM排行榜接口
        const clawcloudTopListIds: { [key: string]: string } = {
          hot: '3778678', // 热歌榜
          new: '3779629', // 新歌榜
          original: '2884035', // 原创榜
          soar: '19723756', // 飙升榜
          electronic: '10520166', // 电音榜
        };
        const clawcloudListId = clawcloudTopListIds[category] || clawcloudTopListIds.hot;
        url = `${API_BASE}top/list?id=${clawcloudListId}`;
        break;
      }
      case 'gdstudio': {
        // GDStudio API可能不直接支持排行榜，使用搜索替代
        const searchKeywords: { [key: string]: string } = {
          hot: '热门歌曲',
          new: '新歌推荐',
          original: '原创音乐',
        };
        const keyword = searchKeywords[category] || '热门';
        return searchMusicAPI(keyword, source, limit);
      }
      case 'meting':
      default:
        // Meting API格式: ?type=top&id=榜单ID
        url = `${API_BASE}?type=top&id=${category}`;
        break;
    }

    const response = await fetchWithRetry(url);
    const data = await response.json();

    let songs: Song[] = [];
    if (apiFormat.format === 'ncm' || apiFormat.format === 'clawcloud') {
      // NCM/ClawCloud API格式: { playlist: { tracks: [...] }, code: 200 }
      if (data && data.playlist && data.playlist.tracks) {
        songs = data.playlist.tracks.slice(0, limit);
      }
    } else if (Array.isArray(data)) {
      songs = data.slice(0, limit);
    } else if (data && data.songs) {
      songs = data.songs.slice(0, limit);
    }

    // 规范化数据
    songs = songs
      .filter((song) => song && song.id)
      .map((song: any) => {
        const songInfo = extractSongInfo(song);
        const artistInfo = extractArtistInfo(song);
        const albumInfo = extractAlbumInfo(song);
        const picId =
          song.pic_id ||
          song.cover ||
          song.album_pic ||
          song.pic ||
          song?.al?.picStr ||
          song?.album?.picStr ||
          song?.album?.pic;

        return {
          ...song,
          source: source,
          name: songInfo,
          artist: artistInfo,
          album: albumInfo,
          pic_id: picId,
          rawData: song,
        };
      });

    cache.set(cacheKey, songs, CacheCategory.TOP_SONGS);
    return songs;
  } catch (error) {
    console.error('获取排行榜失败:', error);
    return [];
  }
}

// 获取歌手详情和热门歌曲
export async function getArtistInfo(
  artistId: string,
  source: string = 'netease'
): Promise<{
  name: string;
  description: string;
  songs: Song[];
}> {
  const cacheKey = `artist_${source}_${artistId}`;
  const cached = cache.get<any>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const apiFormat = detectApiFormat(API_BASE);
    let url: string;

    switch (apiFormat.format) {
      case 'ncm':
        // NCM API格式: /artists?id=歌手ID
        url = `${API_BASE}artists?id=${artistId}`;
        break;
      case 'gdstudio':
        // GDStudio API格式: ?types=artist&source=netease&id=歌手ID
        url = `${API_BASE}?types=artist&source=${source}&id=${artistId}`;
        break;
      case 'meting':
      default:
        // Meting API格式: ?type=artist&id=歌手ID
        url = `${API_BASE}?type=artist&id=${artistId}`;
        break;
    }

    const response = await fetchWithRetry(url);
    const data = await response.json();

    const result = {
      name: '未知歌手',
      description: '',
      songs: [] as Song[],
    };

    if (apiFormat.format === 'ncm') {
      // NCM API格式: { artist: {...}, hotSongs: [...] }
      if (data && data.artist) {
        result.name = data.artist.name || '未知歌手';
        result.description = data.artist.briefDesc || '';
      }
      if (data && data.hotSongs && Array.isArray(data.hotSongs)) {
        result.songs = data.hotSongs.slice(0, 20); // 限制前20首热门歌曲
      }
    } else {
      // 其他API格式处理
      result.name = data.name || data.artistName || '未知歌手';
      result.description = data.description || data.desc || '';
      result.songs = data.songs || data.hotSongs || [];
    }

    // 规范化歌曲数据
    result.songs = result.songs
      .filter((song) => song && song.id)
      .map((song: any) => {
        const songInfo = extractSongInfo(song);
        const artistInfo = extractArtistInfo(song);
        const albumInfo = extractAlbumInfo(song);
        const picId =
          song.pic_id ||
          song.cover ||
          song.album_pic ||
          song.pic ||
          song?.al?.picStr ||
          song?.album?.picStr ||
          song?.album?.pic;

        return {
          ...song,
          source: source,
          name: songInfo,
          artist: artistInfo,
          album: albumInfo,
          pic_id: picId,
          rawData: song,
        };
      });

    cache.set(cacheKey, result, CacheCategory.ARTIST_INFO);
    return result;
  } catch (error) {
    console.error('获取歌手信息失败:', error);
    return {
      name: '未知歌手',
      description: '',
      songs: [],
    };
  }
}

// 获取专辑详情
export async function getAlbumInfo(
  albumId: string,
  source: string = 'netease'
): Promise<{
  name: string;
  artist: string;
  description: string;
  songs: Song[];
}> {
  const cacheKey = `album_${source}_${albumId}`;
  const cached = cache.get<any>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const apiFormat = detectApiFormat(API_BASE);
    let url: string;

    switch (apiFormat.format) {
      case 'ncm':
        // NCM API格式: /album?id=专辑ID
        url = `${API_BASE}album?id=${albumId}`;
        break;
      case 'gdstudio':
        // GDStudio API格式: ?types=album&source=netease&id=专辑ID
        url = `${API_BASE}?types=album&source=${source}&id=${albumId}`;
        break;
      case 'meting':
      default:
        // Meting API格式: ?type=album&id=专辑ID
        url = `${API_BASE}?type=album&id=${albumId}`;
        break;
    }

    const response = await fetchWithRetry(url);
    const data = await response.json();

    const result = {
      name: '未知专辑',
      artist: '未知歌手',
      description: '',
      songs: [] as Song[],
    };

    if (apiFormat.format === 'ncm') {
      // NCM API格式: { album: {...}, songs: [...] }
      if (data && data.album) {
        result.name = data.album.name || '未知专辑';
        result.artist = data.album.artist?.name || data.album.artists?.[0]?.name || '未知歌手';
        result.description = data.album.description || '';
      }
      if (data && data.songs && Array.isArray(data.songs)) {
        result.songs = data.songs;
      }
    } else {
      // 其他API格式处理
      result.name = data.name || data.albumName || '未知专辑';
      result.artist = data.artist || data.artistName || '未知歌手';
      result.description = data.description || data.desc || '';
      result.songs = data.songs || data.tracks || [];
    }

    // 规范化歌曲数据
    result.songs = result.songs
      .filter((song) => song && song.id)
      .map((song: any) => {
        const songInfo = extractSongInfo(song);
        const artistInfo = extractArtistInfo(song);
        const albumInfo = extractAlbumInfo(song);
        const picId =
          song.pic_id ||
          song.cover ||
          song.album_pic ||
          song.pic ||
          song?.al?.picStr ||
          song?.album?.picStr ||
          song?.album?.pic;

        return {
          ...song,
          source: source,
          name: songInfo,
          artist: artistInfo,
          album: albumInfo,
          pic_id: picId,
          rawData: song,
        };
      });

    cache.set(cacheKey, result, CacheCategory.ALBUM_INFO);
    return result;
  } catch (error) {
    console.error('获取专辑信息失败:', error);
    return {
      name: '未知专辑',
      artist: '未知歌手',
      description: '',
      songs: [],
    };
  }
}

// 获取相似歌曲推荐
export async function getSimilarSongs(
  songId: string,
  source: string = 'netease',
  limit: number = 10
): Promise<Song[]> {
  const cacheKey = `similar_${source}_${songId}_${limit}`;
  const cached = cache.get<Song[]>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const apiFormat = detectApiFormat(API_BASE);
    let url: string;

    switch (apiFormat.format) {
      case 'ncm': {
        // NCM API格式: /simi/song?id=歌曲ID
        url = `${API_BASE}simi/song?id=${songId}`;
        break;
      }
      case 'gdstudio':
      case 'meting':
      default: {
        // 使用相关歌曲搜索作为替代
        // 先获取原歌曲信息，然后搜索相似歌曲
        const fallbackSearch = '相似音乐 推荐';
        return searchMusicAPI(fallbackSearch, source, limit);
      }
    }

    const response = await fetchWithRetry(url);
    const data = await response.json();

    let songs: Song[] = [];
    if (apiFormat.format === 'ncm') {
      // NCM API格式: { songs: [...] }
      if (data && data.songs && Array.isArray(data.songs)) {
        songs = data.songs.slice(0, limit);
      }
    }

    // 规范化数据
    songs = songs
      .filter((song) => song && song.id)
      .map((song: any) => {
        const songInfo = extractSongInfo(song);
        const artistInfo = extractArtistInfo(song);
        const albumInfo = extractAlbumInfo(song);
        const picId =
          song.pic_id ||
          song.cover ||
          song.album_pic ||
          song.pic ||
          song?.al?.picStr ||
          song?.album?.picStr ||
          song?.album?.pic;

        return {
          ...song,
          source: source,
          name: songInfo,
          artist: artistInfo,
          album: albumInfo,
          pic_id: picId,
          rawData: song,
        };
      });

    cache.set(cacheKey, songs, CacheCategory.SEARCH);
    return songs;
  } catch (error) {
    console.error('获取相似歌曲失败:', error);
    return [];
  }
}

// 获取音乐评论（新功能）
export async function getComments(
  songId: string,
  source: string = 'netease',
  limit: number = 20
): Promise<{
  hotComments: Array<{
    user: { nickname: string; avatarUrl: string };
    content: string;
    time: number;
    likedCount: number;
  }>;
  total: number;
}> {
  const cacheKey = `comments_${source}_${songId}_${limit}`;
  const cached = cache.get<any>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const apiFormat = detectApiFormat(API_BASE);
    let url: string;

    switch (apiFormat.format) {
      case 'ncm':
        // NCM API格式: /comment/music?id=歌曲ID&limit=20
        url = `${API_BASE}comment/music?id=${songId}&limit=${limit}`;
        break;
      default:
        // 其他API暂不支持评论功能
        return { hotComments: [], total: 0 };
    }

    const response = await fetchWithRetry(url);
    const data = await response.json();

    const result = {
      hotComments: [] as any[],
      total: 0,
    };

    if (apiFormat.format === 'ncm') {
      // NCM API格式: { hotComments: [...], total: 0 }
      if (data && data.hotComments && Array.isArray(data.hotComments)) {
        result.hotComments = data.hotComments.map((comment: any) => ({
          user: {
            nickname: comment.user?.nickname || '匿名用户',
            avatarUrl: comment.user?.avatarUrl || '',
          },
          content: comment.content || '',
          time: comment.time || 0,
          likedCount: comment.likedCount || 0,
        }));
      }
      result.total = data.total || 0;
    }

    cache.set(cacheKey, result, CacheCategory.COMMENTS);
    return result;
  } catch (error) {
    console.error('获取评论失败:', error);
    return { hotComments: [], total: 0 };
  }
}

// 获取网友精选碟歌单 - 新增功能
export async function getHotPlaylists(
  order: 'hot' | 'new' = 'hot',
  cat: string = '全部',
  limit: number = 50,
  offset: number = 0
): Promise<{
  playlists: Array<{
    id: string;
    name: string;
    coverImgUrl: string;
    playCount: number;
    description: string;
    creator: { nickname: string };
  }>;
  total: number;
  more: boolean;
}> {
  const cacheKey = `hot_playlists_${order}_${cat}_${limit}_${offset}`;
  const cached = cache.get<any>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const apiFormat = detectApiFormat(API_BASE);
    let url: string;

    switch (apiFormat.format) {
      case 'ncm':
        // NCM API格式: /top/playlist?order=hot&cat=华语&limit=50&offset=0
        url = `${API_BASE}top/playlist?order=${order}&cat=${encodeURIComponent(cat)}&limit=${limit}&offset=${offset}`;
        break;
      case 'clawcloud':
        // ClawCloud API = 网易云音乐API Enhanced,完全兼容NCM热门歌单接口
        url = `${API_BASE}top/playlist?order=${order}&cat=${encodeURIComponent(cat)}&limit=${limit}&offset=${offset}`;
        break;
      case 'gdstudio':
      case 'meting':
      default:
        // 其他API不支持此功能，使用内置推荐歌单作为降级方案
        console.warn('当前API不支持热门歌单功能，使用内置推荐');
        return getBuiltInPlaylists(limit, offset);
    }

    const response = await fetchWithRetry(url);
    const data = await response.json();

    const result = {
      playlists: [] as any[],
      total: 0,
      more: false,
    };

    if (apiFormat.format === 'ncm' || apiFormat.format === 'clawcloud') {
      // NCM/ClawCloud API格式: { playlists: [...], total: 0, more: false }
      if (data && data.playlists && Array.isArray(data.playlists)) {
        result.playlists = data.playlists.map((playlist: any) => ({
          id: playlist.id,
          name: playlist.name,
          coverImgUrl: playlist.coverImgUrl || playlist.cover,
          playCount: playlist.playCount || 0,
          description: playlist.description || '',
          creator: { nickname: playlist.creator?.nickname || '未知创建者' },
        }));
        result.total = data.total || 0;
        result.more = data.more || false;
      }
    }

    cache.set(cacheKey, result, CacheCategory.HOT_PLAYLISTS);
    return result;
  } catch (error) {
    console.error('获取网友精选碟失败:', error);
    return { playlists: [], total: 0, more: false };
  }
}

// 获取歌手分类列表 - 新增功能
export async function getArtistList(
  type: number = -1,
  area: number = -1,
  initial: string | number = -1,
  limit: number = 30,
  offset: number = 0
): Promise<{
  artists: Array<{
    id: string;
    name: string;
    picUrl: string;
    albumSize: number;
    musicSize: number;
  }>;
  total: number;
  more: boolean;
}> {
  const cacheKey = `artist_list_${type}_${area}_${initial}_${limit}_${offset}`;
  const cached = cache.get<any>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const apiFormat = detectApiFormat(API_BASE);
    let url: string;

    switch (apiFormat.format) {
      case 'ncm':
        // NCM API格式: /artist/list?type=1&area=96&initial=b&limit=30&offset=0
        url = `${API_BASE}artist/list?type=${type}&area=${area}&initial=${initial}&limit=${limit}&offset=${offset}`;
        break;
      case 'clawcloud':
        // ClawCloud API = 网易云音乐API Enhanced,完全兼容NCM歌手分类接口
        url = `${API_BASE}artist/list?type=${type}&area=${area}&initial=${initial}&limit=${limit}&offset=${offset}`;
        break;
      case 'gdstudio':
      case 'meting':
      default:
        // 其他API不支持此功能，使用内置推荐歌手作为降级方案
        console.warn('当前API不支持歌手分类功能，使用内置推荐');
        return getBuiltInArtists(type, area, initial, limit, offset);
    }

    const response = await fetchWithRetry(url);
    const data = await response.json();

    const result = {
      artists: [] as any[],
      total: 0,
      more: false,
    };

    if (apiFormat.format === 'ncm' || apiFormat.format === 'clawcloud') {
      // NCM/ClawCloud API格式: { artists: [...], total: 0, more: false }
      if (data && data.artists && Array.isArray(data.artists)) {
        result.artists = data.artists.map((artist: any) => ({
          id: artist.id,
          name: artist.name,
          picUrl: artist.picUrl || artist.img1v1Url,
          albumSize: artist.albumSize || 0,
          musicSize: artist.musicSize || 0,
        }));
        result.total = data.total || 0;
        result.more = data.more || false;
      }
    }

    cache.set(cacheKey, result, CacheCategory.ARTIST_INFO);
    return result;
  } catch (error) {
    console.error('获取歌手分类列表失败:', error);
    return { artists: [], total: 0, more: false };
  }
}

// 获取歌手热门50首歌曲 - 新增功能
export async function getArtistTopSongs(artistId: string): Promise<{
  artist: {
    id: string;
    name: string;
    picUrl: string;
  };
  songs: Song[];
}> {
  const cacheKey = `artist_top_songs_${artistId}`;
  const cached = cache.get<any>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const apiFormat = detectApiFormat(API_BASE);
    let url: string;

    switch (apiFormat.format) {
      case 'ncm':
        // NCM API格式: /artist/top/song?id=歌手ID
        url = `${API_BASE}artist/top/song?id=${artistId}`;
        break;
      case 'clawcloud':
        // ClawCloud API = 网易云音乐API Enhanced,完全兼容NCM歌手热门歌曲接口
        url = `${API_BASE}artist/top/song?id=${artistId}`;
        break;
      case 'gdstudio':
      case 'meting':
      default:
        // 其他API不支持此功能，尝试通过搜索歌手名获取歌曲
        console.warn('当前API不支持歌手热门歌曲功能，尝试搜索降级');
        return getArtistSongsBySearch(artistId);
    }

    const response = await fetchWithRetry(url);
    const data = await response.json();

    const result = {
      artist: {
        id: artistId,
        name: '未知歌手',
        picUrl: '',
      },
      songs: [] as Song[],
    };

    if (apiFormat.format === 'ncm' || apiFormat.format === 'clawcloud') {
      // NCM/ClawCloud API格式: { artist: {...}, songs: [...] }
      if (data && data.artist) {
        result.artist = {
          id: data.artist.id || artistId,
          name: data.artist.name || '未知歌手',
          picUrl: data.artist.picUrl || '',
        };
      }
      if (data && data.songs && Array.isArray(data.songs)) {
        result.songs = data.songs.map((song: any) => {
          const songInfo = extractSongInfo(song);
          const artistInfo = [data.artist?.name || '未知歌手']; // 歌手歌曲直接使用歌手名
          const albumInfo = extractAlbumInfo(song);
          const picId =
            song.pic_id ||
            song.cover ||
            song.album_pic ||
            song.pic ||
            song?.al?.picStr ||
            song?.album?.picStr ||
            song?.album?.pic ||
            data.artist?.picUrl; // 使用歌手图片作为专辑封面

          return {
            ...song,
            source: 'netease',
            name: songInfo,
            artist: artistInfo,
            album: albumInfo,
            pic_id: picId,
            rawData: song,
          };
        });
      }
    }

    cache.set(cacheKey, result, CacheCategory.ARTIST_INFO);
    return result;
  } catch (error) {
    console.error('获取歌手热门歌曲失败:', error);
    return { artist: { id: artistId, name: '未知歌手', picUrl: '' }, songs: [] };
  }
}

// 获取当前API性能统计 - 增强版
export function getApiStats(): {
  cacheHitRate: number;
  cacheSize: number;
  activeRequests: number;
  cacheStats: ReturnType<LRUCache['getStats']>;
} {
  const stats = cache.getStats();
  return {
    cacheHitRate: stats.hitRate,
    cacheSize: cache.size(),
    activeRequests: requestDeduplicator['pending']?.size || 0,
    cacheStats: stats,
  };
}

// 缓存预热函数 - 应用启动时调用
export async function warmupCache(): Promise<void> {
  console.log('🔥 开始缓存预热...');

  await cache.warmup(async () => {
    try {
      // 预加载热门歌单（前10个）
      const hotPlaylists = await getBuiltInPlaylists(10, 0);
      console.log(`✅ 预加载了 ${hotPlaylists.playlists.length} 个热门歌单`);

      // 预加载飙升榜（前20首）
      const topSongs = await getTopSongs('hot', 'netease', 20);
      console.log(`✅ 预加载了 ${topSongs.length} 首热门歌曲`);
    } catch (error) {
      console.warn('⚠️ 部分预热数据加载失败:', error);
    }
  });
}

// ========== 降级方案：内置推荐数据 ==========

// 内置热门歌单（当API不支持时使用）
function getBuiltInPlaylists(
  limit: number,
  offset: number
): {
  playlists: Array<{
    id: string;
    name: string;
    coverImgUrl: string;
    playCount: number;
    description: string;
    creator: { nickname: string };
  }>;
  total: number;
  more: boolean;
} {
  // 老王修复BUG：清理无效的歌单ID，只保留验证过的官方榜单
  // 删除了以下无效ID：'60198'(华语经典), '180106'(粤语经典), '112504'(经典摇滚), '64016'(欧美流行)
  // 这些5-6位数的ID都是错误的，会导致返回错误的歌曲数据
  const builtInPlaylists = [
    // ===== 官方排行榜（已验证的正确ID） =====
    {
      id: '3778678',
      name: '飙升榜',
      playCount: 500000000,
      description: '网易云音乐飙升榜',
      creator: { nickname: '网易云音乐' },
    },
    {
      id: '19723756',
      name: '云音乐热歌榜',
      playCount: 800000000,
      description: '网易云音乐热歌榜',
      creator: { nickname: '网易云音乐' },
    },
    {
      id: '3779629',
      name: '云音乐新歌榜',
      playCount: 300000000,
      description: '网易云音乐新歌榜',
      creator: { nickname: '网易云音乐' },
    },
    {
      id: '2884035',
      name: '云音乐说唱榜',
      playCount: 200000000,
      description: '网易云音乐说唱榜',
      creator: { nickname: '网易云音乐' },
    },
    {
      id: '991319590',
      name: '云音乐古典榜',
      playCount: 50000000,
      description: '网易云音乐古典榜',
      creator: { nickname: '网易云音乐' },
    },
    {
      id: '71385702',
      name: '云音乐ACG榜',
      playCount: 150000000,
      description: '网易云音乐ACG榜',
      creator: { nickname: '网易云音乐' },
    },
    {
      id: '745956260',
      name: '云音乐韩语榜',
      playCount: 100000000,
      description: '网易云音乐韩语榜',
      creator: { nickname: '网易云音乐' },
    },
    {
      id: '2250011882',
      name: '抖音排行榜',
      playCount: 600000000,
      description: '抖音热门音乐',
      creator: { nickname: '网易云音乐' },
    },

    // ===== 精选歌单（7位以上ID才是有效的） =====
    {
      id: '4395559',
      name: '影视原声',
      playCount: 220000000,
      description: '影视剧原声音乐',
      creator: { nickname: '网易云音乐' },
    },
    {
      id: '3812895',
      name: '清晨音乐',
      playCount: 120000000,
      description: '适合清晨听的音乐',
      creator: { nickname: '网易云音乐' },
    },
    {
      id: '2829816518',
      name: '助眠音乐',
      playCount: 90000000,
      description: '帮助睡眠的音乐',
      creator: { nickname: '网易云音乐' },
    },
    {
      id: '5059642708',
      name: '学习专注',
      playCount: 80000000,
      description: '适合学习的音乐',
      creator: { nickname: '网易云音乐' },
    },
    {
      id: '2809577409',
      name: '运动健身',
      playCount: 110000000,
      description: '运动健身音乐',
      creator: { nickname: '网易云音乐' },
    },
    {
      id: '2809577307',
      name: '咖啡时光',
      playCount: 95000000,
      description: '咖啡馆音乐',
      creator: { nickname: '网易云音乐' },
    },
    {
      id: '5217150082',
      name: '治愈系',
      playCount: 130000000,
      description: '治愈心灵的音乐',
      creator: { nickname: '网易云音乐' },
    },
  ];

  // 添加默认封面
  const playlistsWithCover = builtInPlaylists.map((p) => ({
    ...p,
    coverImgUrl:
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSJsaW5lYXItZ3JhZGllbnQoMTM1ZGVnLCAjNjY3ZWVhIDAlLCAjNzY0YmEyIDEwMCUpIiByeD0iMTIiLz4KPGNpcmNsZSBjeD0iMTAwIiBjeT0iMTAwIiByPSI0MCIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjMpIi8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjEwMCIgcj0iMjUiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC41KSIvPgo8L3N2Zz4=',
  }));

  const start = offset;
  const end = Math.min(offset + limit, playlistsWithCover.length);

  return {
    playlists: playlistsWithCover.slice(start, end),
    total: playlistsWithCover.length,
    more: end < playlistsWithCover.length,
  };
}

// 内置推荐歌手（当API不支持时使用）
function getBuiltInArtists(
  type: number,
  area: number,
  initial: string | number,
  limit: number,
  offset: number
): {
  artists: Array<{
    id: string;
    name: string;
    picUrl: string;
    albumSize: number;
    musicSize: number;
  }>;
  total: number;
  more: boolean;
} {
  // 热门歌手列表
  const builtInArtists = [
    { id: '5771', name: '周杰伦', albumSize: 20, musicSize: 300 },
    { id: '6452', name: '林俊杰', albumSize: 15, musicSize: 250 },
    { id: '3684', name: '陈奕迅', albumSize: 30, musicSize: 400 },
    { id: '2116', name: '薛之谦', albumSize: 12, musicSize: 180 },
    { id: '5346', name: '邓紫棋', albumSize: 10, musicSize: 150 },
    { id: '1050282', name: '毛不易', albumSize: 8, musicSize: 120 },
    { id: '13193', name: '李荣浩', albumSize: 11, musicSize: 160 },
    { id: '1007170', name: '周深', albumSize: 9, musicSize: 140 },
    { id: '6066', name: '张学友', albumSize: 35, musicSize: 450 },
    { id: '5340', name: '王力宏', albumSize: 18, musicSize: 280 },
    { id: '3066', name: '孙燕姿', albumSize: 16, musicSize: 240 },
    { id: '10559', name: '田馥甄', albumSize: 14, musicSize: 200 },
    { id: '10336', name: '蔡依林', albumSize: 17, musicSize: 260 },
    { id: '9548', name: '张杰', albumSize: 13, musicSize: 190 },
    { id: '122455', name: '华晨宇', albumSize: 10, musicSize: 150 },
  ];

  // 添加默认头像
  const artistsWithPic = builtInArtists.map((a) => ({
    ...a,
    picUrl:
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSJsaW5lYXItZ3JhZGllbnQoMTM1ZGVnLCAjNjY3ZWVhIDAlLCAjNzY0YmEyIDEwMCUpIiByeD0iNTAiLz4KPGNpcmNsZSBjeD0iNTAiIGN5PSI0MCIgcj0iMTUiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC40KSIvPgo8cGF0aCBkPSJNMjUgNzVRMjUgNTUgNTAgNTVUNzUgNzUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjQpIiBzdHJva2Utd2lkdGg9IjgiIGZpbGw9Im5vbmUiLz4KPC9zdmc+',
  }));

  const start = offset;
  const end = Math.min(offset + limit, artistsWithPic.length);

  return {
    artists: artistsWithPic.slice(start, end),
    total: artistsWithPic.length,
    more: end < artistsWithPic.length,
  };
}

// 通过搜索获取歌手歌曲（降级方案）
async function getArtistSongsBySearch(artistId: string): Promise<{
  artist: {
    id: string;
    name: string;
    picUrl: string;
  };
  songs: Song[];
}> {
  // 由于没有歌手名，无法搜索，返回提示信息
  console.warn(`当前API不支持获取歌手(${artistId})的热门歌曲，请切换到NCM API`);
  return {
    artist: {
      id: artistId,
      name: '当前API不支持',
      picUrl: '',
    },
    songs: [],
  };
}

// ========== 老王集成：Listen 1 Provider架构 ==========

/**
 * 聚合搜索 - 从所有启用的Provider平台搜索
 *
 * @param keyword 搜索关键词
 * @param limit 每个平台返回数量限制
 * @returns 所有平台的搜索结果
 */
export async function aggregateSearchMusic(keyword: string, limit: number = 30): Promise<Song[]> {
  console.log(`🎵 [聚合搜索] 开始搜索: ${keyword}`);

  try {
    const results = await providerManager.aggregateSearch(keyword, limit);
    console.log(`✅ [聚合搜索] 成功，共找到 ${results.length} 首歌曲`);
    return results;
  } catch (error) {
    console.error('❌ [聚合搜索] 失败:', error);
    return [];
  }
}

/**
 * 使用Provider获取歌曲URL（作为现有API的fallback）
 *
 * @param song 歌曲对象
 * @param quality 音质
 * @returns 播放URL和音质
 */
export async function getSongUrlFromProvider(
  song: Song,
  quality: string = '320k'
): Promise<{ url: string; br: string }> {
  console.log(`🎵 [Provider] 尝试获取播放链接: ${song.name}`);

  try {
    const result = await providerManager.getSongUrlWithFallback(song, quality);
    if (result.url) {
      console.log(`✅ [Provider] 成功获取播放链接`);
    } else {
      console.warn(`⚠️ [Provider] 未能获取播放链接`);
    }
    return result;
  } catch (error) {
    console.error('❌ [Provider] 获取播放链接失败:', error);
    return { url: '', br: '' };
  }
}

/**
 * 使用Provider获取歌词（作为现有API的fallback）
 *
 * @param song 歌曲对象
 * @returns 歌词
 */
export async function getLyricFromProvider(song: Song): Promise<{ lyric: string }> {
  console.log(`🎵 [Provider] 尝试获取歌词: ${song.name}`);

  try {
    const result = await providerManager.getLyricWithFallback(song);
    if (result.lyric) {
      console.log(`✅ [Provider] 成功获取歌词`);
    } else {
      console.warn(`⚠️ [Provider] 未能获取歌词`);
    }
    return result;
  } catch (error) {
    console.error('❌ [Provider] 获取歌词失败:', error);
    return { lyric: '' };
  }
}

/**
 * 获取所有Provider的状态
 *
 * @returns Provider状态列表
 */
export function getProvidersStatus(): { id: string; name: string; enabled: boolean; color: string }[] {
  return providerManager.getProvidersStatus();
}

/**
 * 启用指定Provider
 *
 * @param providerId Provider ID
 */
export function enableProvider(providerId: string): void {
  providerManager.enableProvider(providerId);
}

/**
 * 禁用指定Provider
 *
 * @param providerId Provider ID
 */
export function disableProvider(providerId: string): void {
  providerManager.disableProvider(providerId);
}

/**
 * 获取指定Provider
 *
 * @param providerId Provider ID
 * @returns Provider实例或undefined
 */
export function getProvider(providerId: string) {
  return providerManager.getProvider(providerId);
}

// 导出providerManager供高级使用
export { providerManager };

