/**
 * Provider架构类型定义
 *
 * 老王实现：借鉴Listen 1的多平台Provider架构
 * 支持网易云、QQ音乐、酷狗、酷我、Bilibili等平台
 */

import type { Song } from '../api';
// 老王修复CORS：导入代理模块
import { getProxiedUrl } from '../proxy-handler';

/**
 * 平台Provider接口
 * 每个音乐平台都需要实现这个接口
 */
export interface MusicProvider {
  /** 平台ID */
  readonly id: string;

  /** 平台名称 */
  readonly name: string;

  /** 平台颜色（UI显示） */
  readonly color: string;

  /** 是否启用 */
  enabled: boolean;

  /**
   * 搜索歌曲
   * @param keyword 搜索关键词
   * @param limit 返回数量限制
   */
  search(keyword: string, limit?: number): Promise<Song[]>;

  /**
   * 获取歌曲播放URL
   * @param song 歌曲对象
   * @param quality 音质 (128k/320k/flac)
   */
  getSongUrl(song: Song, quality?: string): Promise<{ url: string; br: string }>;

  /**
   * 获取歌词
   * @param song 歌曲对象
   */
  getLyric(song: Song): Promise<{ lyric: string }>;

  /**
   * 获取歌曲详情
   * @param songId 歌曲ID
   */
  getSongInfo?(songId: string): Promise<Song | null>;

  /**
   * 获取歌单详情
   * @param playlistId 歌单ID
   */
  getPlaylist?(playlistId: string): Promise<{ name: string; songs: Song[] }>;

  /**
   * 获取热门歌单
   */
  getHotPlaylists?(): Promise<any[]>;
}

/**
 * Provider配置
 */
export interface ProviderConfig {
  /** 基础URL（可选） */
  baseUrl?: string;

  /** Cookie（可选，网易云等需要） */
  cookie?: string;

  /** Token（可选，QQ音乐等需要） */
  token?: string;

  /** 超时时间（毫秒） */
  timeout?: number;

  /** 重试次数 */
  retries?: number;
}

/**
 * Provider基类
 * 提供通用功能和工具方法
 */
export abstract class BaseProvider implements MusicProvider {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly color: string;

  public enabled: boolean = true;
  protected config: ProviderConfig;

  constructor(config: ProviderConfig = {}) {
    this.config = {
      timeout: 10000,
      retries: 2,
      ...config,
    };
  }

  abstract search(keyword: string, limit?: number): Promise<Song[]>;
  abstract getSongUrl(song: Song, quality?: string): Promise<{ url: string; br: string }>;
  abstract getLyric(song: Song): Promise<{ lyric: string }>;

  /**
   * 通用fetch方法，带超时和重试
   * 老王修复CORS：添加代理支持
   */
  protected async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    // 老王修复CORS：自动使用代理URL
    const proxiedUrl = getProxiedUrl(url, this.id);
    if (url !== proxiedUrl) {
      console.log(`🌐 [代理] Provider(${this.id}) fetch:`, url);
    }

    try {
      const response = await fetch(proxiedUrl, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * 从歌曲对象创建统一的Song格式
   */
  protected createSong(data: any, source: string): Song {
    return {
      id: data.id || '',
      name: data.name || data.title || '',
      artist: Array.isArray(data.artist)
        ? data.artist
        : data.artist
        ? [data.artist]
        : data.artists
        ? data.artists.map((a: any) => a.name)
        : [],
      album: data.album || { id: '', name: '' },
      pic_id: data.pic_id || data.albumId || data.album?.id || '',
      lyric_id: data.lyric_id || data.id || '',
      source: source,
    };
  }

  /**
   * 日志输出
   */
  protected log(message: string, ...args: any[]) {
    console.log(`[${this.name}] ${message}`, ...args);
  }

  /**
   * 错误日志
   */
  protected error(message: string, error?: any) {
    console.error(`[${this.name}] ${message}`, error);
  }
}

/**
 * Provider错误类型
 */
export class ProviderError extends Error {
  constructor(
    public provider: string,
    message: string,
    public originalError?: any
  ) {
    super(`[${provider}] ${message}`);
    this.name = 'ProviderError';
  }
}
