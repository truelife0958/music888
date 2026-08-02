/**
 * 沄听播放器 - 配置模块
 * 集中管理 API 配置、超时时间、代理域名白名单等
 */

// ============================================
// 日志级别配置
// ============================================

/**
 * 判断是否为生产环境
 * NOTE: Vite 会在构建时替换 import.meta.env.PROD
 */
export const IS_PRODUCTION = import.meta.env.PROD;

/**
 * NCM API 镜像列表（NEC Enhanced 部署，按优先级排序）
 * NOTE: 2026-08 实测可用镜像。w7z.indevs.in 已退务不可用，music888.zeabur.app 不稳定，
 * 改用多个 Enhanced 社区镜像做回退。getNecApiUrl() 运行时动态选择首个健康镜像。
 */
export const NCM_BASE_URL = 'https://neteaseapi.gksm.store';

/** NEC API 镜像候选列表（按优先级排序，2026-08 实测可用镜像）
 * 注：未使用 music-api.gdstudio.xyz（国际版被墙），国内版 music.gdstudio.org 可直连但非 NEC。
 * 已移除不稳定的 music888.zeabur.app 与已退务的 w7z.indevs.in。 */
export const NEC_MIRROR_URLS: readonly string[] = [
    'https://neteaseapi.gksm.store',
    'https://www.megumi-ben.cn',
    'https://www.fish6.icu',
];

/**
 * 运行时健康检测后选中的 NEC 镜像（默认取主源，检测失败后自动顺延）
 */
let activeNecBase = NCM_BASE_URL;

export function setActiveNecBase(url: string): void {
    if (NEC_MIRROR_URLS.includes(url)) {
        activeNecBase = url;
    }
}

/** 获取当前生效的 NEC API URL（运行时健康选择后） */
export function getActiveNecBaseUrl(): string {
    return activeNecBase;
}

// ============================================
// 错误缓冲区（用于未来远程上报）
// ============================================

interface ErrorEntry {
    timestamp: string;
    level: 'WARN' | 'ERROR';
    message: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    details?: any;
}

const ERROR_BUFFER_SIZE = 50;
const errorBuffer: ErrorEntry[] = [];

function shouldLogToConsole(): boolean {
    if (IS_PRODUCTION) {
        return false;
    }

    try {
        return localStorage.getItem('music888_debug_logs') === '1';
    } catch {
        return false;
    }
}

/**
 * 添加错误到缓冲区
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addToErrorBuffer(level: 'WARN' | 'ERROR', message: string, details?: any): void {
    const entry: ErrorEntry = {
        timestamp: new Date().toISOString(),
        level,
        message: String(message),
        details,
    };

    errorBuffer.push(entry);

    // 保持缓冲区大小
    if (errorBuffer.length > ERROR_BUFFER_SIZE) {
        errorBuffer.shift();
    }
}

/**
 * 日志工具 - 默认静默，仅在开发调试开关开启时输出到控制台
 * NOTE: 添加日志级别前缀 [DEBUG]/[INFO]/[WARN]/[ERROR]
 */
export const logger = {
    /**
     * 调试日志 - 仅开发环境输出
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    debug: (...args: any[]): void => {
        if (shouldLogToConsole()) {
            console.log('[DEBUG]', ...args);
        }
    },

    /**
     * 信息日志 - 仅开发环境输出
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    info: (...args: any[]): void => {
        if (shouldLogToConsole()) {
            console.log('[INFO]', ...args);
        }
    },

    /**
     * 警告日志 - 默认仅加入错误缓冲区
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    warn: (...args: any[]): void => {
        if (shouldLogToConsole()) {
            console.warn('[WARN]', ...args);
        }
        addToErrorBuffer('WARN', args[0], args.slice(1));
    },

    /**
     * 错误日志 - 默认仅加入错误缓冲区
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error: (...args: any[]): void => {
        if (shouldLogToConsole()) {
            console.error('[ERROR]', ...args);
        }
        addToErrorBuffer('ERROR', args[0], args.slice(1));
    },
};

// ============================================
// API 超时配置 (单位: 毫秒)
// ============================================

export const API_TIMEOUTS = {
    /** API 可用性检测超时 */
    API_DETECTION: 8000,

    /** 音乐源健康检测超时 */
    SOURCE_HEALTH: 4500,

    /** 搜索请求超时 */
    SEARCH: 20000,

    /** 获取歌曲 URL 超时 */
    SONG_URL: 15000,

    /** 获取歌词超时 */
    LYRICS: 10000,

    /** 解析歌单超时 */
    PLAYLIST: 30000,
};

// ============================================
// 代理域名白名单
// NOTE: 需要通过代理访问的音频 CDN 域名
// ============================================

export const PROXY_DOMAINS = [
    // 网易云音乐 CDN
    'music.126.net',
    'm7.music.126.net',
    'm8.music.126.net',
    'm701.music.126.net',
    'm801.music.126.net',
    // QQ 音乐 CDN
    'stream.qqmusic.qq.com',
    'dl.stream.qqmusic.qq.com',
    'ws.stream.qqmusic.qq.com',
    'isure.stream.qqmusic.qq.com',
    // 酷狗音乐 CDN
    'kugou.com',
    'trackercdn.kugou.com',
    'webfs.tx.kugou.com',
    // 咪咕音乐 CDN
    'migu.cn',
    'freetyst.nf.migu.cn',
    // 酷我音乐 CDN
    'kuwo.cn',
    'sycdn.kuwo.cn',
    // JOOX CDN
    'joox.com',
    // Bilibili 音频 / 视频 CDN（跨源回退音源）
    'bilivideo.com',
    'bilivideo.cn',
    // 喜马拉雅 CDN
    'xmcdn.com',
    'ximalaya.com',
];

/**
 * 检查 URL 是否需要通过代理访问
 * @param url 音频 URL
 * @returns 是否需要代理
 */
export function needsProxy(url: string): boolean {
    return PROXY_DOMAINS.some(domain => url.includes(domain));
}

// ============================================
// 其他常量配置
// ============================================

export const APP_CONFIG = {
    /** 播放历史最大存储数量 */
    MAX_HISTORY_SIZE: 50,

    /** 无限滚动每批加载数量 */
    INFINITE_SCROLL_BATCH_SIZE: 30,

    /** 默认音质 */
    DEFAULT_QUALITY: '320',

    /** GDStudio API 缓存时间 (毫秒) */
    GDSTUDIO_CACHE_TTL: 5 * 60 * 1000,

    /** 音频淡入淡出持续时间 (毫秒) */
    FADE_DURATION: 400,

    /** 音频淡入淡出步数 */
    FADE_STEPS: 10,
};

// ============================================
// 试听版本检测配置
// ============================================

export const PREVIEW_DETECTION = {
    /** 短版本最短时长（秒）*/
    MIN_DURATION: 25,

    /** 短版本最长时长（秒）*/
    MAX_DURATION: 65,

    /** 典型短版本时长（秒）*/
    TYPICAL_DURATIONS: [25, 30, 45, 60],

    /** 时长容差（秒）*/
    DURATION_TOLERANCE: 2,

    /** 最小文件大小（字节）*/
    MIN_FILE_SIZE: 600 * 1024,

    /** 跨源搜索超时时间（毫秒）*/
    CROSS_SOURCE_TIMEOUT: 15000,

    /** 跨源搜索最大尝试源数量 */
    MAX_CROSS_SOURCE_ATTEMPTS: 5,

    /** 歌曲名相似度阈值 */
    SIMILARITY_THRESHOLD: 0.4,

    /** 歌手名匹配权重 */
    ARTIST_MATCH_BONUS: 0.25,

    /** 启用并行搜索 */
    PARALLEL_SEARCH: true,

    /** 启用预检测（在获取URL阶段就开始跨源搜索）*/
    PROACTIVE_CHECK: true,
};
