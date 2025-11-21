/**
 * Provider管理器
 *
 * 老王实现：统一管理所有音乐平台Provider
 * 提供聚合搜索、智能fallback、多平台切换等功能
 * 老王增强：集成智能匹配算法，根据成功率动态排序Provider
 */

import type { MusicProvider } from './base-provider';
import type { Song } from '../api';
import { NeteaseProvider } from './netease-provider';
import { QQMusicProvider } from './qq-provider';
import { KugouProvider } from './kugou-provider';
import { MiguProvider } from './migu-provider';
import { KuwoProvider } from './kuwo-provider';
import { BilibiliProvider } from './bilibili-provider';
import { QianqianProvider } from './qianqian-provider';
import { findBestMatch, providerSuccessTracker } from '../song-matcher';
import { getProxiedUrl } from '../proxy-handler';

/**
 * Provider管理器配置
 */
export interface ProviderManagerConfig {
  /** 默认启用的平台 */
  enabledProviders?: string[];

  /** 搜索超时时间（毫秒） */
  searchTimeout?: number;

  /** 是否启用自动fallback */
  autoFallback?: boolean;
}

/**
 * Provider管理器
 */
export class ProviderManager {
  private providers: Map<string, MusicProvider>;
  private config: Required<ProviderManagerConfig>;

  constructor(config: ProviderManagerConfig = {}) {
    this.providers = new Map();
    this.config = {
      enabledProviders: ['netease', 'qq', 'kugou', 'migu', 'kuwo', 'bilibili', 'qianqian'],
      searchTimeout: 10000,
      autoFallback: true,
      ...config,
    };

    // 初始化所有Provider
    this.initProviders();
  }

  /**
   * 初始化所有Provider
   */
  private initProviders() {
    // 注册网易云Provider
    const neteaseProvider = new NeteaseProvider();
    this.providers.set('netease', neteaseProvider);

    // 注册QQ音乐Provider
    const qqProvider = new QQMusicProvider();
    this.providers.set('qq', qqProvider);

    // 注册酷狗Provider
    const kugouProvider = new KugouProvider();
    this.providers.set('kugou', kugouProvider);

    // 老王扩展：注册咪咕Provider
    const miguProvider = new MiguProvider();
    this.providers.set('migu', miguProvider);

    // 老王扩展：注册酷我Provider
    const kuwoProvider = new KuwoProvider();
    this.providers.set('kuwo', kuwoProvider);

    // 老王扩展：注册Bilibili Provider
    const bilibiliProvider = new BilibiliProvider();
    this.providers.set('bilibili', bilibiliProvider);

    // 老王扩展：注册千千Provider
    const qianqianProvider = new QianqianProvider();
    this.providers.set('qianqian', qianqianProvider);

    // 设置启用状态
    this.providers.forEach((provider, id) => {
      provider.enabled = this.config.enabledProviders.includes(id);
    });

    console.log(`[ProviderManager] 已注册 ${this.providers.size} 个Provider`);
  }

  /**
   * 获取指定Provider
   */
  getProvider(id: string): MusicProvider | undefined {
    return this.providers.get(id);
  }

  /**
   * 获取所有启用的Provider
   */
  getEnabledProviders(): MusicProvider[] {
    return Array.from(this.providers.values()).filter((p) => p.enabled);
  }

  /**
   * 启用Provider
   */
  enableProvider(id: string): void {
    const provider = this.providers.get(id);
    if (provider) {
      provider.enabled = true;
      console.log(`[ProviderManager] 已启用: ${provider.name}`);
    }
  }

  /**
   * 禁用Provider
   */
  disableProvider(id: string): void {
    const provider = this.providers.get(id);
    if (provider) {
      provider.enabled = false;
      console.log(`[ProviderManager] 已禁用: ${provider.name}`);
    }
  }

  /**
   * 聚合搜索 - 从所有启用的平台搜索
   */
  async aggregateSearch(keyword: string, limit: number = 30): Promise<Song[]> {
    console.log(`[ProviderManager] 聚合搜索: ${keyword}`);

    const enabledProviders = this.getEnabledProviders();

    if (enabledProviders.length === 0) {
      console.warn('[ProviderManager] 没有启用的Provider');
      return [];
    }

    // 并行搜索所有平台
    const searchPromises = enabledProviders.map(async (provider) => {
      try {
        const results = await Promise.race([
          provider.search(keyword, limit),
          new Promise<Song[]>((_, reject) =>
            setTimeout(() => reject(new Error('搜索超时')), this.config.searchTimeout)
          ),
        ]);
        return results;
      } catch (error) {
        console.warn(`[ProviderManager] ${provider.name} 搜索失败:`, error);
        return [];
      }
    });

    const resultsArray = await Promise.all(searchPromises);

    // 合并所有结果
    const allSongs: Song[] = [];
    resultsArray.forEach((results) => {
      allSongs.push(...results);
    });

    console.log(`[ProviderManager] 聚合搜索完成，共找到 ${allSongs.length} 首歌曲`);
    return allSongs;
  }

  /**
   * 智能获取播放链接 - 自动fallback到其他平台
   * 老王增强：使用智能匹配算法，根据成功率动态排序Provider
   */
  async getSongUrlWithFallback(song: Song, quality: string = '320k'): Promise<{ url: string; br: string; fromSource?: string }> {
    console.log(`[ProviderManager] 获取播放链接: ${song.name} (原平台: ${song.source})`);

    // 1. 优先从原平台获取
    const primaryProvider = this.providers.get(song.source);
    if (primaryProvider && primaryProvider.enabled) {
      try {
        const result = await primaryProvider.getSongUrl(song, quality);
        if (result.url) {
          // 老王增强：验证URL是否可用
          const isValid = await this.validateAudioUrl(result.url);
          if (isValid) {
            console.log(`[ProviderManager] ✅ 从原平台成功获取: ${primaryProvider.name}`);
            providerSuccessTracker.recordSuccess(song.source);
            return { ...result, fromSource: song.source };
          } else {
            console.warn(`[ProviderManager] ⚠️ 原平台URL无效，尝试其他平台`);
            providerSuccessTracker.recordFail(song.source);
          }
        }
      } catch (error) {
        console.warn(`[ProviderManager] 原平台获取失败: ${primaryProvider?.name}`, error);
        providerSuccessTracker.recordFail(song.source);
      }
    }

    // 2. 如果启用了自动fallback，尝试其他平台
    if (this.config.autoFallback) {
      console.log(`[ProviderManager] 🔄 开始跨平台搜索: ${song.name}`);

      // 老王增强：根据成功率排序Provider
      const otherProviderIds = this.getEnabledProviders()
        .filter((p) => p.id !== song.source)
        .map((p) => p.id);
      const sortedProviderIds = providerSuccessTracker.sortBySuccessRate(otherProviderIds);

      for (const providerId of sortedProviderIds) {
        const provider = this.providers.get(providerId);
        if (!provider) continue;

        try {
          console.log(`[ProviderManager] 尝试平台: ${provider.name}`);

          // 老王增强：构建更精确的搜索关键词
          const artistName = Array.isArray(song.artist) ? song.artist[0] : song.artist;
          const searchKeyword = `${song.name} ${artistName}`.trim();

          // 搜索歌曲
          const searchResults = await Promise.race([
            provider.search(searchKeyword, 10), // 搜索更多结果以便智能匹配
            new Promise<Song[]>((_, reject) =>
              setTimeout(() => reject(new Error('搜索超时')), 8000)
            ),
          ]);

          if (searchResults.length === 0) {
            console.log(`[ProviderManager] ${provider.name} 无搜索结果`);
            continue;
          }

          // 老王增强：使用智能匹配算法找到最佳匹配
          const matchResult = findBestMatch(song, searchResults, {
            minScore: 0.4, // 降低阈值，增加匹配成功率
            titleWeight: 0.5,
            artistWeight: 0.4,
            durationWeight: 0.1,
          });

          if (!matchResult) {
            console.log(`[ProviderManager] ${provider.name} 无满足条件的匹配`);
            continue;
          }

          const matchedSong = matchResult.song;
          console.log(`[ProviderManager] 找到匹配: ${matchedSong.name} (分数: ${matchResult.score.toFixed(2)})`);

          // 获取播放链接
          const result = await provider.getSongUrl(matchedSong, quality);

          if (result.url) {
            // 验证URL
            const isValid = await this.validateAudioUrl(result.url);
            if (isValid) {
              console.log(`[ProviderManager] 🎉 从 ${provider.name} 成功获取替代链接`);
              providerSuccessTracker.recordSuccess(providerId);
              return { ...result, fromSource: providerId };
            } else {
              console.warn(`[ProviderManager] ${provider.name} URL无效`);
              providerSuccessTracker.recordFail(providerId);
            }
          }
        } catch (error) {
          console.warn(`[ProviderManager] ${provider.name} fallback失败:`, error);
          providerSuccessTracker.recordFail(providerId);
        }
      }
    }

    // 3. 所有平台都失败
    console.error(`[ProviderManager] ❌ 所有平台均无法获取播放链接`);
    return { url: '', br: '' };
  }

  /**
   * 老王新增：验证音频URL是否可用
   */
  private async validateAudioUrl(url: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      // 使用代理URL
      const proxiedUrl = getProxiedUrl(url);

      const response = await fetch(proxiedUrl, {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // 检查响应状态和Content-Type
      if (response.ok || response.status === 206) {
        const contentType = response.headers.get('content-type') || '';
        // 音频类型或者没有Content-Type（某些CDN）都认为有效
        return contentType.includes('audio') || contentType.includes('octet-stream') || !contentType;
      }

      return false;
    } catch (error) {
      // 超时或网络错误，假设URL可用（让播放器去验证）
      return true;
    }
  }

  /**
   * 获取歌词（带fallback）
   */
  async getLyricWithFallback(song: Song): Promise<{ lyric: string }> {
    console.log(`[ProviderManager] 获取歌词: ${song.name}`);

    // 1. 优先从原平台获取
    const primaryProvider = this.providers.get(song.source);
    if (primaryProvider && primaryProvider.enabled) {
      try {
        const result = await primaryProvider.getLyric(song);
        if (result.lyric) {
          console.log(`[ProviderManager] 从原平台成功获取歌词: ${primaryProvider.name}`);
          return result;
        }
      } catch (error) {
        console.warn(`[ProviderManager] 原平台获取歌词失败: ${primaryProvider?.name}`, error);
      }
    }

    // 2. Fallback到其他平台
    if (this.config.autoFallback) {
      const enabledProviders = this.getEnabledProviders().filter((p) => p.id !== song.source);

      for (const provider of enabledProviders) {
        try {
          const searchResults = await provider.search(`${song.name} ${song.artist[0]}`, 1);

          if (searchResults.length > 0) {
            const matchedSong = searchResults[0];
            const result = await provider.getLyric(matchedSong);

            if (result.lyric) {
              console.log(`[ProviderManager] ✅ 从 ${provider.name} 成功获取歌词`);
              return result;
            }
          }
        } catch (error) {
          console.warn(`[ProviderManager] ${provider.name} 获取歌词失败:`, error);
        }
      }
    }

    return { lyric: '' };
  }

  /**
   * 获取所有Provider的状态
   */
  getProvidersStatus(): { id: string; name: string; enabled: boolean; color: string }[] {
    return Array.from(this.providers.values()).map((provider) => ({
      id: provider.id,
      name: provider.name,
      enabled: provider.enabled,
      color: provider.color,
    }));
  }
}

// 导出单例
export const providerManager = new ProviderManager();
