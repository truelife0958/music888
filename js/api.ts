// js/api.ts - 优化版音乐API

export interface Song {
    id: string;
    name: string;
    artist: string[];
    album: string;
    pic_id: string;
    lyric_id: string;
    source: string;
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
    UNKNOWN = 'UNKNOWN'
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

// 音乐API配置 - 基于API文档优化，优先使用稳定的GDStudio API
const API_SOURCES: ApiSource[] = [
    {
        name: 'GDStudio 主API',
        url: 'https://music-api.gdstudio.xyz/api.php'
    },
    {
        name: 'GDStudio 备用API',
        url: 'https://music-api.gdstudio.org/api.php'
    },
    {
        name: 'Meting备用API',
        url: 'https://api.injahow.cn/meting/'
    }
];

let API_BASE = API_SOURCES[0].url;
let currentApiIndex = 0;

// 音乐平台配置 - 基于API文档扩展支持平台
const MUSIC_SOURCES = [
    { id: 'netease', name: '网易云音乐' },
    { id: 'tencent', name: 'QQ音乐' },
    { id: 'kugou', name: '酷狗音乐' },
    { id: 'kuwo', name: '酷我音乐' },
    { id: 'ximalaya', name: '喜马拉雅' },
    { id: 'bilibili', name: 'B站音频' }
];

// 艺术家字段规范化函数 - 老王修复：统一处理各种artist数据格式
// 老王优化：导出此函数供其他模块使用，统一规范化逻辑
export function normalizeArtistField(artist: any): string[] {
    // 定义需要过滤的无效值（中英文）
    const invalidValues = [
        '未知艺术家', '未知歌手', '未知',
        'Unknown', 'Unknown Artist', 'unknown',
        'Various Artists', 'various artists',
        'N/A', 'n/a', '', ' '
    ];

    // 检查字符串是否为无效值
    const isInvalid = (str: string): boolean => {
        const trimmed = str.trim().toLowerCase();
        return !trimmed || invalidValues.some(invalid =>
            invalid.toLowerCase() === trimmed
        );
    };

    // 过滤并清理字符串数组
    const filterAndClean = (arr: string[]): string[] => {
        return arr
            .map(s => s.trim())
            .filter(s => s && !isInvalid(s));
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
        const parts = trimmed.split(/[,，、/／]/).map(s => s.trim()).filter(s => s && !isInvalid(s));
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
        '未知歌曲', '未知', 'Unknown', 'unknown',
        'Untitled', 'untitled', 'N/A', 'n/a'
    ];

    // 检查字符串是否为无效值
    const isInvalid = (str: string): boolean => {
        const trimmed = str.trim().toLowerCase();
        return !trimmed || invalidValues.some(invalid =>
            invalid.toLowerCase() === trimmed
        );
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
        '未知专辑', '未知', 'Unknown', 'unknown',
        'Unknown Album', 'unknown album',
        'N/A', 'n/a', '', ' '
    ];

    // 检查字符串是否为无效值
    const isInvalid = (str: string): boolean => {
        const trimmed = str.trim().toLowerCase();
        return !trimmed || invalidValues.some(invalid =>
            invalid.toLowerCase() === trimmed
        );
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

// 改进的LRU缓存 - 提升性能
interface CacheEntry<T> {
    data: T;
    timestamp: number;
    hits: number;
}

class LRUCache {
    private cache = new Map<string, CacheEntry<any>>();
    private maxSize: number;
    private ttl: number;

    constructor(maxSize: number = 100, ttl: number = 5 * 60 * 1000) {
        this.maxSize = maxSize;
        this.ttl = ttl;
    }

    get<T>(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry) return null;

        // 检查是否过期
        if (Date.now() - entry.timestamp > this.ttl) {
            this.cache.delete(key);
            return null;
        }

        // 更新访问次数和时间戳
        entry.hits++;
        entry.timestamp = Date.now();
        
        // 重新插入以更新LRU顺序
        this.cache.delete(key);
        this.cache.set(key, entry);

        return entry.data;
    }

    set<T>(key: string, data: T): void {
        // 如果已存在，先删除
        if (this.cache.has(key)) {
            this.cache.delete(key);
        }

        // 如果超过最大容量，删除最旧的项
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey) {
                this.cache.delete(firstKey);
            }
        }

        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            hits: 0
        });
    }

    clear(): void {
        this.cache.clear();
    }

    size(): number {
        return this.cache.size;
    }
    
    // 优化: 添加批量删除过期缓存
    clearExpired(): number {
        let cleared = 0;
        const now = Date.now();
        
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > this.ttl) {
                this.cache.delete(key);
                cleared++;
            }
        }
        
        return cleared;
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
        const promise = fetcher()
            .then(
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

const cache = new LRUCache(100, 5 * 60 * 1000);
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

// 判断错误是否可重试
function isRetryableError(error: any, statusCode?: number): boolean {
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

// 改进的重试机制 - 带超时和智能重试
async function fetchWithRetry(
    url: string,
    options: RequestInit = {},
    maxRetries: number = 2
): Promise<Response> {
    const timeoutDuration = 8000; // 8秒超时
    
    // 优化: 提取重试延迟计算
    const getRetryDelay = (attempt: number): number => {
        // 指数退避: 1s, 2s, 4s (最多3s)
        return Math.min(1000 * Math.pow(2, attempt), 3000);
    };
    
    // 优化: 提取请求执行逻辑
    const executeRequest = async (signal: AbortSignal): Promise<Response> => {
        const response = await fetch(url, { ...options, signal });
        
        if (response.ok) {
            return response;
        }
        
        throw new ApiError(
            ApiErrorType.SERVER,
            `API请求失败: HTTP ${response.status}`,
            response.status,
            isRetryableError(null, response.status)
        );
    };
    
    let lastError: ApiError | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

        try {
            const response = await executeRequest(controller.signal);
            clearTimeout(timeoutId);
            return response;
            
        } catch (error) {
            // 优化: 确保超时ID在所有情况下都被清理
            clearTimeout(timeoutId);
            
            // 优化: 统一错误处理
            lastError = normalizeError(error);
            
            // 最后一次尝试或不可重试
            if (attempt >= maxRetries || !lastError.retryable) {
                throw lastError;
            }
            
            // 继续重试
            const delay = getRetryDelay(attempt);
            console.warn(`${lastError.type}错误, ${delay}ms后进行第${attempt + 1}次重试...`);
            await new Promise(resolve => setTimeout(resolve, delay));
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
        return new ApiError(
            ApiErrorType.TIMEOUT,
            '请求超时，请检查网络连接',
            undefined,
            true
        );
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
            currentApiIndex = API_SOURCES.findIndex(a => a.url === api.url);
            return { success: true, name: api.name };
        }
    }
    return { success: false };
}

// 切换到下一个API
export async function switchToNextAPI(): Promise<{ success: boolean; name?: string }> {
    const startIndex = currentApiIndex;
    
    for (let i = 1; i < API_SOURCES.length; i++) {
        const nextIndex = (startIndex + i) % API_SOURCES.length;
        const api = API_SOURCES[nextIndex];
        
        const isWorking = await testAPI(api.url);
        if (isWorking) {
            API_BASE = api.url;
            currentApiIndex = nextIndex;
            return { success: true, name: api.name };
        }
    }
    
    return { success: false };
}

// 获取专辑封面 - 基于API文档优化，支持多种尺寸和缓存
export async function getAlbumCoverUrl(song: Song, size: number = 300): Promise<string> {
    const DEFAULT_COVER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTUiIGhlaWdodD0iNTUiIHZpZXdCb3g9IjAgMCA1NSA1NSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjU1IiBoZWlnaHQ9IjU1IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHJ4PSI4Ii8+CjxwYXRoIGQ9Ik0yNy41IDE4TDM1IDI3LjVIMzBWMzdIMjVWMjcuNUgyMEwyNy41IDE4WiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjMpIi8+Cjwvc3ZnPgo=';

    // 支持多种图片ID字段
    const picId = song.pic_id || song.cover || song.album_pic || song.pic;
    if (!picId) {
        return DEFAULT_COVER;
    }

    // 根据API文档优化尺寸参数：300, 500, 1024
    const optimizedSize = size <= 300 ? 300 : size <= 500 ? 500 : 1024;

    // 检查缓存
    const cacheKey = `cover_${song.source}_${picId}_${optimizedSize}`;
    const cached = cache.get<string>(cacheKey);
    if (cached) {
        return cached;
    }

    try {
        // 根据API文档构建请求URL
        const isGDStudio = API_BASE.includes('gdstudio');
        let url: string;

        if (isGDStudio) {
            // GDStudio API格式: ?types=pic&source=netease&id=pic_id&size=300
            url = `${API_BASE}?types=pic&source=${song.source}&id=${picId}&size=${optimizedSize}`;
        } else {
            // Meting API格式: ?type=pic&id=pic_id&size=300
            url = `${API_BASE}?type=pic&id=${picId}&size=${optimizedSize}`;
        }

        const response = await fetchWithRetry(url, {}, 1); // 封面请求减少重试次数
        const data = await response.json();

        if (data && data.url) {
            cache.set(cacheKey, data.url);
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
                'Range': 'bytes=0-0'
            },
            signal: controller.signal
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

// 获取歌曲URL
export async function getSongUrl(song: Song, quality: string): Promise<{ url: string; br: string; error?: string }> {
    try {
        // 根据API文档构建请求URL
        const isGDStudio = API_BASE.includes('gdstudio');
        let url: string;

        if (isGDStudio) {
            // GDStudio API格式: ?types=url&source=netease&id=song_id&br=320
            url = `${API_BASE}?types=url&source=${song.source}&id=${song.id}&br=${quality}`;
        } else {
            // Meting API格式: ?type=url&source=netease&id=song_id&br=320
            url = `${API_BASE}?type=url&source=${song.source}&id=${song.id}&br=${quality}`;
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
        
        if (data && data.url) {
            // 优化: 验证返回的URL是否有效
            if (song.source === 'netease') {
                const isValid = await validateUrl(data.url);
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
            return data;
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
        
        const errorMessage = error instanceof ApiError
            ? error.message
            : 'API请求失败';
        return { url: '', br: '', error: errorMessage };
    }
}

// 获取歌词 - 添加缓存
export async function getLyrics(song: Song): Promise<{ lyric: string }> {
    // 检查缓存
    const cacheKey = `lyric_${song.source}_${song.lyric_id || song.id}`;
    const cached = cache.get<{ lyric: string }>(cacheKey);
    if (cached) {
        return cached;
    }

    try {
        // 根据API文档构建请求URL
        const isGDStudio = API_BASE.includes('gdstudio');
        let url: string;

        if (isGDStudio) {
            // GDStudio API格式: ?types=lyric&source=netease&id=song_id
            url = `${API_BASE}?types=lyric&source=${song.source}&id=${song.lyric_id || song.id}`;
        } else {
            // Meting API格式: ?type=lyric&source=netease&id=song_id
            url = `${API_BASE}?type=lyric&source=${song.source}&id=${song.lyric_id || song.id}`;
        }

        const response = await fetchWithRetry(url, {}, 1); // 歌词请求减少重试次数
        const data = await response.json();
        
        if (data && data.lyric) {
            cache.set(cacheKey, data);
        }
        
        return data || { lyric: '' };
    } catch (error) {
        console.warn('获取歌词失败:', error);
        return { lyric: '' };
    }
}

// 搜索音乐 - 优化: 添加请求去重
export async function searchMusicAPI(keyword: string, source: string, limit: number = 100): Promise<Song[]> {
    const cacheKey = `search_${source}_${keyword}_${limit}`;
    
    // 优化: 使用请求去重
    return requestDeduplicator.dedupe(cacheKey, async () => {
        // 根据API文档构建请求URL
        const isGDStudio = API_BASE.includes('gdstudio');
        let url: string;

        if (isGDStudio) {
            // GDStudio API格式: ?types=search&source=netease&name=关键词&count=30
            url = `${API_BASE}?types=search&source=${source}&name=${encodeURIComponent(keyword)}&count=${limit}`;
        } else {
            // Meting API格式: ?type=search&source=netease&keywords=关键词&limit=30
            url = `${API_BASE}?type=search&source=${source}&keywords=${encodeURIComponent(keyword)}&limit=${limit}`;
        }
        
        try {
            const response = await fetchWithRetry(url);
        
        if (!response.ok) {
            throw new Error(`API响应错误: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data && data.error) {
            throw new Error(data.error || 'API返回错误');
        }
        
        // 解析响应数据
        let songs: any[] = [];
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
        
        if (songs.length === 0) {
            return [];
        }
        
        // 过滤和规范化数据 - 增强数据提取逻辑
        songs = songs.filter(song =>
            song && (song.name || song.title) // 只要有名称就保留
        ).map(song => {
            // 深度提取艺术家信息
            const artistInfo = extractArtistInfo(song);

            // 深度提取专辑信息
            const albumInfo = extractAlbumInfo(song);

            // 深度提取歌曲信息
            const songInfo = extractSongInfo(song);

            return {
                ...song,
                id: song.id || song.url_id || song.lyric_id || `${source}_${Date.now()}_${Math.random()}`,
                source: source,
                name: songInfo,
                artist: artistInfo,
                album: albumInfo,
                // 保留原始数据以便后续使用
                rawData: song
            };
        });

        return songs;
        } catch (error) {
            console.error('搜索失败:', error);
            throw error;
        }
    });
}

// 解析歌单
export async function parsePlaylistAPI(playlistUrlOrId: string, source: string = 'netease'): Promise<{ songs: Song[]; name?: string; count?: number }> {
    let playlistId = playlistUrlOrId.trim();
    
    // 从URL提取ID
    if (source === 'netease') {
        if (playlistId.includes('music.163.com') || playlistId.includes('163cn.tv')) {
            const patterns = [
                /id=(\d+)/,
                /playlist\/(\d+)/,
                /\/(\d+)\?/,
                /\/(\d+)$/
            ];
            
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
            const patterns = [
                /playlist\/(\d+)/,
                /id=(\d+)/,
                /\/(\d+)\?/,
                /\/(\d+)$/
            ];
            
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

    // 根据API文档构建请求URL
    const isGDStudio = API_BASE.includes('gdstudio');
    let apiUrl: string;

    if (isGDStudio) {
        // GDStudio API格式: ?types=playlist&source=netease&id=playlist_id
        apiUrl = `${API_BASE}?types=playlist&source=${source}&id=${playlistId}`;
    } else {
        // Meting API格式: ?type=playlist&source=netease&id=playlist_id
        apiUrl = `${API_BASE}?type=playlist&source=${source}&id=${playlistId}`;
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
        
        // 解析不同格式
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
        } else {
            throw new Error('歌单数据格式不支持');
        }
        
        if (!songs || songs.length === 0) {
            throw new Error('歌单为空');
        }
        
        // 规范化数据 - 使用增强的数据提取函数
        songs = songs
            .filter((song: any) => song && song.id && (song.name || song.title)) // 只要有ID和名称就保留
            .map((song: any) => {
                // 使用增强的数据提取函数
                const songInfo = extractSongInfo(song);
                const artistInfo = extractArtistInfo(song);
                const albumInfo = extractAlbumInfo(song);

                return {
                    ...song,
                    source: source,
                    name: songInfo,
                    artist: artistInfo,
                    album: albumInfo,
                    // 保留原始数据以便后续使用
                    rawData: song
                };
            });
        
        return {
            songs: songs,
            name: playlistName,
            count: songs.length
        };
    } catch (error) {
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
        total: API_SOURCES.length
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
            const artists = source.split(/[,，、/\/\s]+/).map(s => s.trim()).filter(s => s);
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
                        const names = parsed.map(item =>
                            typeof item === 'object' ? item.name : String(item)
                        ).filter(Boolean);
                        if (names.length > 0) return names;
                    }
                } catch {
                    // 如果不是JSON，作为普通字符串处理
                    const names = text.split(/[,，、/\/\s]+/).map(s => s.trim()).filter(s =>
                        s && s !== 'null' && s !== 'undefined'
                    );
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
        const matches = url.match(/album[_\/]?(\d+)/i);
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
