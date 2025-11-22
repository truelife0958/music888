/**
 * 老王集成：Listen 1 Provider 架构
 * 多平台音乐提供商的基类和接口定义
 */

import type { Song } from '../api.js';

/**
 * 搜索结果接口
 */
export interface SearchResult {
  songs: Song[];
  total: number;
}

/**
 * 播放URL结果接口
 */
export interface PlayUrlResult {
  url: string;
  br: string; // 码率，如 "320kbps"
  quality?: string; // 音质描述
}

/**
 * 歌词结果接口
 */
export interface LyricResult {
  lyric: string;
  tlyric?: string; // 翻译歌词
}

/**
 * Provider 配置接口
 */
export interface ProviderConfig {
  id: string; // Provider ID，如 'netease', 'qq', 'bilibili'
  name: string; // 显示名称，如 '网易云音乐'
  enabled: boolean; // 是否启用
  color: string; // 主题色，用于UI显示
  supportedQualities?: string[]; // 支持的音质列表
}

/**
 * Provider 抽象基类
 * 所有平台 Provider 必须继承此类并实现核心方法
 */
export abstract class BaseProvider {
  protected config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  /**
   * 获取 Provider ID
   */
  getId(): string {
    return this.config.id;
  }

  /**
   * 获取 Provider 名称
   */
  getName(): string {
    return this.config.name;
  }

  /**
   * 获取主题色
   */
  getColor(): string {
    return this.config.color;
  }

  /**
   * 是否启用
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * 启用 Provider
   */
  enable(): void {
    this.config.enabled = true;
  }

  /**
   * 禁用 Provider
   */
  disable(): void {
    this.config.enabled = false;
  }

  /**
   * 搜索歌曲
   * @param keyword 搜索关键词
   * @param limit 返回数量限制
   * @returns 搜索结果
   */
  abstract search(keyword: string, limit?: number): Promise<SearchResult>;

  /**
   * 获取歌曲播放 URL
   * @param song 歌曲对象
   * @param quality 音质要求
   * @returns 播放 URL 和码率
   */
  abstract getSongUrl(song: Song, quality?: string): Promise<PlayUrlResult>;

  /**
   * 获取歌词
   * @param song 歌曲对象
   * @returns 歌词（含翻译）
   */
  abstract getLyric(song: Song): Promise<LyricResult>;

  /**
   * 判断歌曲是否可播放（可选实现）
   * @param song 歌曲对象
   * @returns 是否可播放
   */
  isPlayable(song: Song): boolean {
    // 默认实现：检查是否有 URL 或者没有明确标记为不可播放
    if (song.url === '') return false;
    return true;
  }

  /**
   * 规范化歌曲数据格式（可选实现）
   * 将平台特定格式转换为统一的 Song 格式
   * @param rawSong 原始歌曲数据
   * @returns 规范化后的 Song 对象
   */
  protected normalizeSong(rawSong: any): Song | null {
    // 默认实现，子类可以覆盖
    return rawSong as Song;
  }

  /**
   * 生成唯一的歌曲 ID
   * @param platformId 平台内部 ID
   * @returns 格式化的唯一 ID，如 "netrack_12345"
   */
  protected generateTrackId(platformId: string): string {
    return `${this.config.id}track_${platformId}`;
  }

  /**
   * 从带前缀的 ID 中提取平台内部 ID
   * @param trackId 带前缀的 ID，如 "netrack_12345"
   * @returns 平台内部 ID，如 "12345"
   */
  protected extractPlatformId(trackId: string): string {
    // 老王修复BUG：添加类型检查，避免 startsWith 报错
    if (!trackId || typeof trackId !== 'string') {
      console.warn('[Provider] extractPlatformId 收到无效的 trackId:', trackId);
      return String(trackId || '');
    }

    const prefix = `${this.config.id}track_`;
    if (trackId.startsWith(prefix)) {
      return trackId.slice(prefix.length);
    }
    return trackId;
  }

  /**
   * 处理 API 错误（可选实现）
   * @param error 错误对象
   * @param context 错误上下文描述
   */
  protected handleError(error: unknown, context: string): void {
    console.error(`[${this.config.name}] ${context} 失败:`, error);
  }
}
