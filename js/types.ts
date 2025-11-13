// 类型定义文件

/**
 * Bilibili 搜索结果项
 */
export interface BilibiliSearchItem {
  bvid: string;
  aid: string;
  title: string;
  artist?: string;
  album?: string;
  pic?: string;
  duration: number;
}

/**
 * Bilibili API 响应
 */
export interface BilibiliApiResponse {
  code: number;
  message?: string;
  data: BilibiliSearchItem[];
}

/**
 * 音乐平台源名称映射
 */
export interface SourceNameMap {
  [key: string]: string;
}

/**
 * 品质名称映射
 */
export interface QualityNameMap {
  [key: string]: string;
}

/**
 * 播放列表数据
 */
export interface PlaylistData {
  name: string;
  songs: any[];
  id: string;
  createTime: string;
  isFavorites?: boolean;
  createdAt?: number;
}

/**
 * 存储检查结果
 */
export interface StorageCheckResult {
  available: boolean;
  quota?: number;
  usage?: number;
  error?: string;
}

/**
 * 日志级别
 */
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

/**
 * 通知类型
 */
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

/**
 * 歌词行接口
 */
export interface LyricLine {
  time: number;
  text: string;
  translation?: string; // 翻译文本（可选）
}

/**
 * 歌曲接口
 */
export interface Song {
  id: string;
  title?: string;
  artist?: string;
  album?: string;
  duration?: number;
  url?: string;
  pic?: string;
  lrc?: string;
  source?: string;
  [key: string]: any; // 允许其他动态属性
}
