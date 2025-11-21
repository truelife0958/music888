/**
 * 老王集成：Provider Manager
 * 统一管理所有音乐平台 Provider，实现智能切换和版权规避
 */

import { BaseProvider } from './base-provider.js';
import { NeteaseProvider } from './netease-provider.js';
import { QQProvider } from './qq-provider.js';
import { BilibiliProvider } from './bilibili-provider.js';
import { KugouProvider } from './kugou-provider.js';
import { KuwoProvider } from './kuwo-provider.js';
import type { Song } from '../api.js';

/**
 * Provider Manager - 单例模式
 */
class ProviderManager {
  private providers: Map<string, BaseProvider>;
  private static instance: ProviderManager;

  private constructor() {
    this.providers = new Map();
    this.initializeProviders();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): ProviderManager {
    if (!ProviderManager.instance) {
      ProviderManager.instance = new ProviderManager();
    }
    return ProviderManager.instance;
  }

  /**
   * 初始化所有 Provider
   */
  private initializeProviders(): void {
    const providerInstances = [
      new NeteaseProvider(),
      new QQProvider(),
      new BilibiliProvider(),
      new KugouProvider(),  // 老王添加：酷狗音乐
      new KuwoProvider(),   // 老王添加：酷我音乐
    ];

    providerInstances.forEach((provider) => {
      this.providers.set(provider.getId(), provider);
    });

    console.log('[ProviderManager] 初始化完成，共加载', this.providers.size, '个平台');
  }

  /**
   * 获取指定 Provider
   */
  getProvider(providerId: string): BaseProvider | undefined {
    return this.providers.get(providerId);
  }

  /**
   * 获取所有启用的 Provider
   */
  getEnabledProviders(): BaseProvider[] {
    return Array.from(this.providers.values()).filter((p) => p.isEnabled());
  }

  /**
   * 获取所有 Provider 状态
   */
  getProvidersStatus(): { id: string; name: string; enabled: boolean; color: string }[] {
    return Array.from(this.providers.values()).map((p) => ({
      id: p.getId(),
      name: p.getName(),
      enabled: p.isEnabled(),
      color: p.getColor(),
    }));
  }

  /**
   * 启用指定 Provider
   */
  enableProvider(providerId: string): void {
    const provider = this.providers.get(providerId);
    if (provider) {
      provider.enable();
      console.log('[ProviderManager] 已启用:', provider.getName());
    }
  }

  /**
   * 禁用指定 Provider
   */
  disableProvider(providerId: string): void {
    const provider = this.providers.get(providerId);
    if (provider) {
      provider.disable();
      console.log('[ProviderManager] 已禁用:', provider.getName());
    }
  }

  /**
   * 聚合搜索 - 从所有启用的平台搜索
   */
  async aggregateSearch(keyword: string, limitPerProvider: number = 20): Promise<Song[]> {
    const enabledProviders = this.getEnabledProviders();
    console.log('[ProviderManager] 聚合搜索:', keyword, '平台数:', enabledProviders.length);

    const searchPromises = enabledProviders.map(async (provider) => {
      try {
        const result = await provider.search(keyword, limitPerProvider);
        console.log('[ProviderManager]', provider.getName(), '搜索结果:', result.songs.length, '首');
        return result.songs;
      } catch (error) {
        console.warn('[ProviderManager]', provider.getName(), '搜索失败:', error);
        return [];
      }
    });

    const results = await Promise.all(searchPromises);
    const allSongs = results.flat();

    console.log('[ProviderManager] 聚合搜索完成，共', allSongs.length, '首歌曲');
    return allSongs;
  }

  /**
   * 智能获取播放 URL - 自动切换平台
   * 1. 先尝试原平台
   * 2. 失败后尝试其他平台（基于歌曲名+艺术家匹配）
   */
  async getSongUrlWithFallback(
    song: Song,
    quality: string = '320k'
  ): Promise<{ url: string; br: string; fromSource?: string }> {
    console.log('[ProviderManager] 获取播放URL:', song.name, '来源:', song.source);

    // 1. 先尝试原平台
    const primaryProvider = this.providers.get(song.source);
    if (primaryProvider && primaryProvider.isEnabled()) {
      try {
        const result = await primaryProvider.getSongUrl(song, quality);
        if (result.url) {
          console.log('[ProviderManager] 原平台成功:', primaryProvider.getName());
          return { ...result, fromSource: song.source };
        }
      } catch (error) {
        console.warn('[ProviderManager] 原平台失败:', error);
      }
    }

    // 2. 尝试其他平台 - 通过搜索匹配
    console.log('[ProviderManager] 原平台失败，尝试跨平台搜索');
    const otherProviders = this.getEnabledProviders().filter((p) => p.getId() !== song.source);

    for (const provider of otherProviders) {
      try {
        console.log('[ProviderManager] 尝试', provider.getName());
        
        // 搜索相似歌曲
        const searchKeyword = song.name + ' ' + (song.artist[0] || '');
        const searchResult = await provider.search(searchKeyword, 10);

        if (searchResult.songs.length === 0) continue;

        // 简单匹配：取第一首（后续可以用 song-matcher.ts 精确匹配）
        const matchedSong = searchResult.songs[0];
        
        // 获取播放 URL
        const result = await provider.getSongUrl(matchedSong, quality);
        if (result.url) {
          console.log('[ProviderManager] 跨平台成功:', provider.getName());
          return { ...result, fromSource: provider.getId() };
        }
      } catch (error) {
        console.warn('[ProviderManager]', provider.getName(), '失败:', error);
      }
    }

    console.error('[ProviderManager] 所有平台均失败');
    return { url: '', br: '' };
  }

  /**
   * 智能获取歌词 - 自动切换平台
   */
  async getLyricWithFallback(song: Song): Promise<{ lyric: string; tlyric?: string }> {
    console.log('[ProviderManager] 获取歌词:', song.name, '来源:', song.source);

    // 1. 先尝试原平台
    const primaryProvider = this.providers.get(song.source);
    if (primaryProvider && primaryProvider.isEnabled()) {
      try {
        const result = await primaryProvider.getLyric(song);
        if (result.lyric) {
          console.log('[ProviderManager] 原平台歌词成功');
          return result;
        }
      } catch (error) {
        console.warn('[ProviderManager] 原平台歌词失败:', error);
      }
    }

    // 2. 尝试其他平台
    console.log('[ProviderManager] 原平台失败，尝试跨平台搜索歌词');
    const otherProviders = this.getEnabledProviders().filter((p) => p.getId() !== song.source);

    for (const provider of otherProviders) {
      try {
        const searchKeyword = song.name + ' ' + (song.artist[0] || '');
        const searchResult = await provider.search(searchKeyword, 5);

        if (searchResult.songs.length === 0) continue;

        const matchedSong = searchResult.songs[0];
        const result = await provider.getLyric(matchedSong);
        if (result.lyric) {
          console.log('[ProviderManager] 跨平台歌词成功:', provider.getName());
          return result;
        }
      } catch (error) {
        console.warn('[ProviderManager]', provider.getName(), '歌词失败:', error);
      }
    }

    console.error('[ProviderManager] 所有平台歌词均失败');
    return { lyric: '' };
  }
}

// 导出单例实例
export const providerManager = ProviderManager.getInstance();
