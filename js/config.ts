// 应用配置常量

/**
 * 播放器配置
 */
export const PLAYER_CONFIG = {
  /** 最大播放历史记录数 */
  MAX_HISTORY_SIZE: 50,
  /** 最大连续失败次数 */
  MAX_CONSECUTIVE_FAILURES: 5,
  /** 播放失败后重试延迟（毫秒） */
  RETRY_DELAY: 1500,
  /** 连续失败触发切换源的阈值 */
  SOURCE_SWITCH_THRESHOLD: 2,
} as const;

/**
 * API 配置
 */
export const API_CONFIG = {
  /** 请求超时时间（毫秒） */
  TIMEOUT: 15000,
  /** 最大重试次数 */
  MAX_RETRIES: 3,
  /** 重试延迟基数（毫秒） */
  RETRY_BASE_DELAY: 1000,
  /** API 失败阈值 */
  API_FAILURE_THRESHOLD: 3,
  /** 启用代理 - 老王修复CORS问题：所有第三方API请求都走Cloudflare Functions代理 */
  USE_PROXY: true,
  /** 需要代理的源列表 - 第三方音乐API和CDN */
  PROXY_SOURCES: [
    // 网易云音乐
    'music.163.com',
    'music.126.net',  // 网易云CDN（m701.music.126.net等）
    // 第三方API
    'music-api.gdstudio.xyz',
    'api-enhanced-three-indol.vercel.app',
    'api.injahow.cn',
    // QQ音乐CDN
    'stream.qqmusic.qq.com',
    'dl.stream.qqmusic.qq.com',
    // 酷狗CDN
    'kugou.com',
    // 酷我CDN
    'kuwo.cn',
    // 咪咕CDN
    'migu.cn',
  ] as const,
} as const;

/**
 * 跨域代理配置 - 老王修复：使用Cloudflare Pages Functions代理
 */
export const PROXY_CONFIG = {
  /** Bilibili代理路径 */
  BILIBILI_PROXY: '/api/bilibili-proxy',
  /** 通用音频代理路径 - 用于音频流 */
  AUDIO_PROXY: '/api/audio-proxy',
  /** 音乐API代理路径 - 用于API请求 */
  MUSIC_API_PROXY: '/api/music-proxy',
  /** 是否自动将HTTP升级为HTTPS */
  AUTO_HTTPS: true,
  /** 允许的源域名（用于验证） - 老王修复：添加所有CDN域名 */
  ALLOWED_DOMAINS: [
    // 网易云音乐
    'music.163.com',
    'music.126.net',      // 网易云CDN
    // 第三方API
    'music-api.gdstudio.xyz',
    'api-enhanced-three-indol.vercel.app',
    'api.injahow.cn',
    // QQ音乐
    'y.qq.com',
    'qq.com',
    'stream.qqmusic.qq.com',
    // Bilibili
    'bilibili.com',
    'bilivideo.com',
    // 酷狗
    'kugou.com',
    // 酷我
    'kuwo.cn',
    // 咪咕
    'migu.cn',
  ] as const,
} as const;

/**
 * 下载配置
 */
export const DOWNLOAD_CONFIG = {
  /** 批量下载每批数量 */
  BATCH_SIZE: 3,
  /** 批次间延迟（毫秒） */
  BATCH_DELAY: 1000,
} as const;

/**
 * 存储配置
 */
export const STORAGE_CONFIG = {
  /** LocalStorage 键名 - 播放列表 */
  KEY_PLAYLISTS: 'musicPlayerPlaylists',
  /** LocalStorage 键名 - 播放历史 */
  KEY_HISTORY: 'musicPlayerHistory',
  /** LocalStorage 键名 - 保存的歌单 */
  KEY_SAVED_PLAYLISTS: 'savedPlaylists',
  /** LocalStorage 键名 - 收藏歌曲 */
  KEY_FAVORITES: 'favoriteSongs',
  /** 存储空间警告阈值（字节） */
  QUOTA_WARNING_THRESHOLD: 8 * 1024 * 1024, // 8MB
} as const;

/**
 * UI 配置
 */
export const UI_CONFIG = {
  /** 通知显示时长（毫秒） */
  NOTIFICATION_DURATION: 3000,
  /** 通知淡出时长（毫秒） */
  NOTIFICATION_FADE_DURATION: 500,
  /** 搜索防抖延迟（毫秒） */
  SEARCH_DEBOUNCE_DELAY: 300,
  /** 移动端触摸滑动阈值（像素） */
  SWIPE_THRESHOLD: 50,
  /** 移动端断点（像素） */
  MOBILE_BREAKPOINT: 768,
} as const;

/**
 * 音乐源名称映射
 */
export const SOURCE_NAMES: Record<string, string> = {
  netease: '网易云音乐',
  tencent: 'QQ音乐',
  kugou: '酷狗音乐',
  kuwo: '酷我音乐',
  xiami: '虾米音乐',
  baidu: '百度音乐',
  bilibili: 'Bilibili音乐',
} as const;

/**
 * 音质名称映射
 */
export const QUALITY_NAMES: Record<string, string> = {
  '128': '标准 128K',
  '192': '较高 192K',
  '320': '高品质 320K',
  '740': '无损 FLAC',
  '999': 'Hi-Res',
} as const;

/**
 * 音质降级队列（按优先级）
 */
export const QUALITY_FALLBACK = ['999', '740', '320', '192', '128'] as const;

/**
 * 可用音乐源列表（全部7个平台）
 */
export const AVAILABLE_SOURCES = [
  'netease',
  'tencent',
  'kugou',
  'kuwo',
  'xiami',
  'baidu',
  'bilibili',
] as const;

/**
 * 播放模式配置
 */
export const PLAY_MODES = {
  LOOP: 'loop',
  RANDOM: 'random',
  SINGLE: 'single',
} as const;

/**
 * 播放模式图标
 */
export const PLAY_MODE_ICONS: Record<string, string> = {
  loop: 'fas fa-repeat',
  random: 'fas fa-random',
  single: 'fas fa-redo',
} as const;

/**
 * 播放模式标题
 */
export const PLAY_MODE_TITLES: Record<string, string> = {
  loop: '列表循环',
  random: '随机播放',
  single: '单曲循环',
} as const;
