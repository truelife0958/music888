/**
 * 整合 Listen1 和现有 Provider 架构的统一管理器
 * 结合两家架构优势，提供最强的音乐平台支持
 */

import { BaseProvider } from './base-provider.js';
import { providerManager } from './provider-manager.js';
import { providerManagerEnhanced } from './provider-manager-enhanced.js';
import { loWeb, Listen1MediaService } from './listen1-media-service.js';
import { Listen1Track, Listen1SearchResult } from './listen1-base-provider.js';
import type { Song } from '../api.js';

export interface UnifiedSearchResult {
  songs: Song[];
  total: number;
  source?: string;
}

export interface UnifiedPlayUrlResult {
  url: string;
  br: string;
  fromSource?: string;
  platform?: string;
}

export interface UnifiedLyricResult {
  lyric: string;
  tlyric?: string;
  fromSource?: string;
}

/**
 * 统一的 Provider 管理器
 * 整合三种架构：
 * 1. 原有 Provider Manager (providerManager)
 * 2. 增强版 Provider Manager (providerManagerEnhanced)
 * 3. Listen1 Media Service (loWeb)
 */
export class UnifiedProviderManager {
  private static instance: UnifiedProviderManager;
  private listen1Service: Listen1MediaService;
  private enabledSystems: {
    original: boolean;
    enhanced: boolean;
    listen1: boolean;
  };

  private constructor() {
    this.listen1Service = loWeb;
    this.enabledSystems = {
      original: true,    // 原有架构
      enhanced: true,    // 增强版架构
      listen1: true,     // Listen1 架构
    };
  }

  static getInstance(): UnifiedProviderManager {
    if (!UnifiedProviderManager.instance) {
      UnifiedProviderManager.instance = new UnifiedProviderManager();
    }
    return UnifiedProviderManager.instance;
  }

  /**
   * 统一搜索接口 - 自动选择最佳系统
   */
  async search(
    keyword: string,
    source: string = 'allmusic',
    options: { curpage?: number; type?: number; limit?: number } = {}
  ): Promise<UnifiedSearchResult> {
    console.log('[UnifiedProviderManager] 搜索:', keyword, '源:', source);

    // 根据来源选择系统
    if (source === 'listen1' || source === 'allmusic') {
      return this.listen1Search(keyword, source, options);
    } else if (source === 'enhanced' || this.enabledSystems.enhanced) {
      return this.enhancedSearch(keyword, source, options);
    } else {
      return this.originalSearch(keyword, source, options);
    }
  }

  /**
   * Listen1 风格搜索
   */
  private async listen1Search(
    keyword: string,
    source: string,
    options: { curpage?: number; type?: number; limit?: number }
  ): Promise<UnifiedSearchResult> {
    try {
      const searchOptions = {
        keywords: keyword,
        curpage: options.curpage || 1,
        type: options.type || 0, // 0: 歌曲, 1: 歌手, 1000: 歌单
      };

      const result = await new Promise<Listen1SearchResult>((resolve) => {
        this.listen1Service.search(source, searchOptions).success(resolve);
      });

      // 转换 Listen1 格式到 Music888 格式
      const songs: Song[] = result.result.map((track) => ({
        id: track.id,
        name: track.title,
        artist: [track.artist],
        album: track.album || '',
        pic_id: track.id,
        lyric_id: track.id,
        url: track.url || '',
        source: track.source,
        source_url: track.source_url || '',
        pic_url: track.img_url || '',
        time: this.formatDuration(track.duration || 0),
        disabled: track.disabled || false,
      }));

      console.log('[UnifiedProviderManager] Listen1 搜索完成，找到', songs.length, '首歌曲');

      return {
        songs,
        total: result.total,
        source: 'listen1',
      };
    } catch (error) {
      console.error('[UnifiedProviderManager] Listen1 搜索失败:', error);
      return { songs: [], total: 0, source: 'listen1' };
    }
  }

  /**
   * 增强版搜索
   */
  private async enhancedSearch(
    keyword: string,
    source: string,
    options: { curpage?: number; type?: number; limit?: number }
  ): Promise<UnifiedSearchResult> {
    try {
      // 使用增强版的聚合搜索
      const songs = await providerManagerEnhanced.aggregateSearch(
        keyword,
        options.limit || 20
      );

      return {
        songs,
        total: songs.length,
        source: 'enhanced',
      };
    } catch (error) {
      console.error('[UnifiedProviderManager] 增强版搜索失败:', error);
      return { songs: [], total: 0, source: 'enhanced' };
    }
  }

  /**
   * 原有搜索
   */
  private async originalSearch(
    keyword: string,
    source: string,
    options: { curpage?: number; type?: number; limit?: number }
  ): Promise<UnifiedSearchResult> {
    try {
      const songs = await providerManager.aggregateSearch(keyword, options.limit || 20);

      return {
        songs,
        total: songs.length,
        source: 'original',
      };
    } catch (error) {
      console.error('[UnifiedProviderManager] 原有搜索失败:', error);
      return { songs: [], total: 0, source: 'original' };
    }
  }

  /**
   * 统一获取播放 URL - 智能降级
   */
  async getPlayUrl(song: Song, quality: string = '320k'): Promise<UnifiedPlayUrlResult> {
    console.log('[UnifiedProviderManager] 获取播放URL:', song.name, '来源:', song.source);

    // 1. 优先使用 Listen1 的智能 fallback 机制
    if (this.enabledSystems.listen1 && this.isListen1Track(song)) {
      try {
        const result = await this.getListen1PlayUrl(song, quality);
        if (result.url) {
          return { ...result, fromSource: 'listen1' };
        }
      } catch (error) {
        console.warn('[UnifiedProviderManager] Listen1 获取URL失败:', error);
      }
    }

    // 2. 尝试增强版
    if (this.enabledSystems.enhanced) {
      try {
        const result = await providerManagerEnhanced.getOptimalSongUrl(song, quality);
        if (result.url) {
          return { ...result, fromSource: 'enhanced' };
        }
      } catch (error) {
        console.warn('[UnifiedProviderManager] 增强版获取URL失败:', error);
      }
    }

    // 3. 尝试原有版本
    if (this.enabledSystems.original) {
      try {
        const result = await providerManager.getSongUrlWithFallback(song, quality);
        if (result.url) {
          return { ...result, fromSource: 'original' };
        }
      } catch (error) {
        console.warn('[UnifiedProviderManager] 原有版本获取URL失败:', error);
      }
    }

    console.error('[UnifiedProviderManager] 所有系统都无法获取播放URL');
    return { url: '', br: '' };
  }

  /**
   * 使用 Listen1 获取播放 URL
   */
  private async getListen1PlayUrl(song: Song, quality: string): Promise<UnifiedPlayUrlResult> {
    const listen1Track: Listen1Track = {
      id: song.id,
      title: song.name,
      artist: song.artist?.[0] || '',
      album: song.album || '',
      source: song.source,
      source_url: song.source_url || '',
      img_url: song.pic_url || '',
      disabled: song.disabled || false,
    };

    return new Promise((resolve, reject) => {
      this.listen1Service.bootstrapTrack(
        listen1Track,
        (response) => {
          resolve({
            url: response.url,
            br: response.bitrate.toString() + 'k',
            platform: response.platform,
          });
        },
        () => {
          reject(new Error('Listen1 获取播放URL失败'));
        }
      );
    });
  }

  /**
   * 统一获取歌词 - 智能降级
   */
  async getLyric(song: Song): Promise<UnifiedLyricResult> {
    console.log('[UnifiedProviderManager] 获取歌词:', song.name, '来源:', song.source);

    // 1. 优先使用 Listen1
    if (this.enabledSystems.listen1 && this.isListen1Track(song)) {
      try {
        const result = await this.getListen1Lyric(song);
        if (result.lyric) {
          return { ...result, fromSource: 'listen1' };
        }
      } catch (error) {
        console.warn('[UnifiedProviderManager] Listen1 获取歌词失败:', error);
      }
    }

    // 2. 尝试增强版 - 暂时跳过，待添加getLyric方法后再启用
    // if (this.enabledSystems.enhanced) {
    //   try {
    //     // TODO: providerManagerEnhanced需要添加getLyric方法
    //     // const result = await providerManagerEnhanced.getLyric(song);
    //   } catch (error) {
    //     console.warn('[UnifiedProviderManager] 增强版获取歌词失败:', error);
    //   }
    // }

    // 3. 尝试原有版本
    if (this.enabledSystems.original) {
      try {
        const result = await providerManager.getLyricWithFallback(song);
        if (result.lyric) {
          return { ...result, fromSource: 'original' };
        }
      } catch (error) {
        console.warn('[UnifiedProviderManager] 原有版本获取歌词失败:', error);
      }
    }

    console.error('[UnifiedProviderManager] 所有系统都无法获取歌词');
    return { lyric: '' };
  }

  /**
   * 使用 Listen1 获取歌词
   */
  private async getListen1Lyric(song: Song): Promise<UnifiedLyricResult> {
    return new Promise((resolve, reject) => {
      this.listen1Service.getLyric(song.id).success((result) => {
        resolve(result);
      });
    });
  }

  /**
   * 判断是否为 Listen1 格式的 track
   */
  private isListen1Track(song: Song): boolean {
    return song.id.startsWith('ne') || song.id.startsWith('qq') || song.id.startsWith('kg') || song.id.startsWith('kw') || song.id.startsWith('mg');
  }

  /**
   * 获取歌单详情
   */
  async getPlaylist(listId: string): Promise<any> {
    // 优先使用 Listen1
    if (this.enabledSystems.listen1 && this.isListen1Track({ id: listId } as Song)) {
      try {
        const result = await new Promise<any>((resolve) => {
          this.listen1Service.getPlaylist(listId).success(resolve);
        });
        return { ...result, fromSource: 'listen1' };
      } catch (error) {
        console.warn('[UnifiedProviderManager] Listen1 获取歌单失败:', error);
      }
    }

    // 回退到其他系统
    console.warn('[UnifiedProviderManager] 歌单获取暂未完全实现');
    return null;
  }

  /**
   * 解析音乐链接
   */
  async parseUrl(url: string): Promise<any> {
    if (this.enabledSystems.listen1) {
      try {
        const result = await new Promise<any>((resolve) => {
          this.listen1Service.parseURL(url).success(resolve);
        });
        return { ...result, fromSource: 'listen1' };
      } catch (error) {
        console.warn('[UnifiedProviderManager] Listen1 解析URL失败:', error);
      }
    }

    return null;
  }

  /**
   * 获取所有支持的平台
   */
  getAllPlatforms(): { name: string; id: string; source: string }[] {
    const platforms = [];

    // Listen1 平台
    if (this.enabledSystems.listen1) {
      const listen1Platforms = this.listen1Service.getProvidersStatus();
      platforms.push(...listen1Platforms.map(p => ({
        name: p.name,
        id: p.id,
        source: 'listen1'
      })));
    }

    // 增强版平台
    if (this.enabledSystems.enhanced) {
      const enhancedProviders = providerManagerEnhanced.getProvidersStatus();
      platforms.push(...enhancedProviders.map(p => ({
        name: p.name,
        id: p.id,
        source: 'enhanced'
      })));
    }

    // 原有平台
    if (this.enabledSystems.original) {
      const originalProviders = providerManager.getProvidersStatus();
      platforms.push(...originalProviders.map(p => ({
        name: p.name,
        id: p.id,
        source: 'original'
      })));
    }

    return platforms;
  }

  /**
   * 配置启用的系统
   */
  configureSystems(systems: { original?: boolean; enhanced?: boolean; listen1?: boolean }): void {
    if (systems.original !== undefined) this.enabledSystems.original = systems.original;
    if (systems.enhanced !== undefined) this.enabledSystems.enhanced = systems.enhanced;
    if (systems.listen1 !== undefined) this.enabledSystems.listen1 = systems.listen1;

    console.log('[UnifiedProviderManager] 系统配置更新:', this.enabledSystems);
  }

  /**
   * 获取系统状态
   */
  getSystemStatus(): typeof this.enabledSystems {
    return { ...this.enabledSystems };
  }

  /**
   * 格式化时长
   */
  private formatDuration(duration: number): string {
    if (!duration) return '0:00';
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}

// 导出单例实例
export const unifiedProviderManager = UnifiedProviderManager.getInstance();

// 默认导出
export default unifiedProviderManager;