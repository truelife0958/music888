/**
 * 增强版Provider Manager
 * 集成Listen 1架构的多平台音乐提供商，实现智能音源切换和版权规避
 */

import { BaseProvider } from './base-provider.js';
import { NeteaseProviderEnhanced } from './netease-provider-enhanced.js';
import { QQProviderEnhanced } from './qq-provider-enhanced.js';
import { BilibiliProvider } from './bilibili-provider.js';
import { KugouProvider } from './kugou-provider.js';
import { KuwoProvider } from './kuwo-provider.js';
import { MiguProvider } from './migu-provider.js';
import type { Song } from '../api.js';

/**
 * 音源切换策略
 */
export enum SwitchStrategy {
  AUTO = 'auto',           // 自动选择最优音源
  FALLBACK = 'fallback',   // 原平台失败后切换
  QUALITY = 'quality',     // 优先选择音质
  SPEED = 'speed',         // 优先选择速度
  BALANCE = 'balance',     // 平衡模式
}

/**
 * 音源状态
 */
export interface ProviderStatus {
  id: string;
  name: string;
  enabled: boolean;
  color: string;
  lastCheck: number;
  successRate: number;
  avgResponseTime: number;
  availableQualities: string[];
}

/**
 * 增强版Provider Manager
 */
class ProviderManagerEnhanced {
  private providers: Map<string, BaseProvider>;
  private static instance: ProviderManagerEnhanced;
  private currentStrategy: SwitchStrategy = SwitchStrategy.AUTO;
  private providerStats: Map<string, ProviderStatus> = new Map();
  private cacheExpiry = 5 * 60 * 1000; // 5分钟缓存过期

  private constructor() {
    this.providers = new Map();
    this.initializeProviders();
    this.initializeStats();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): ProviderManagerEnhanced {
    if (!ProviderManagerEnhanced.instance) {
      ProviderManagerEnhanced.instance = new ProviderManagerEnhanced();
    }
    return ProviderManagerEnhanced.instance;
  }

  /**
   * 初始化所有Provider
   */
  private initializeProviders(): void {
    const providerInstances = [
      new NeteaseProviderEnhanced(), // 增强版网易云
      new QQProviderEnhanced(),      // 增强版QQ音乐
      new MiguProvider(),            // 咪咕音乐
      new BilibiliProvider(),        // B站音乐
      new KugouProvider(),           // 酷狗音乐
      new KuwoProvider(),            // 酷我音乐
    ];

    providerInstances.forEach((provider) => {
      this.providers.set(provider.getId(), provider);
    });

    console.log('[ProviderManagerEnhanced] 初始化完成，共加载', this.providers.size, '个平台');
  }

  /**
   * 初始化统计数据
   */
  private initializeStats(): void {
    this.providers.forEach((provider) => {
      this.providerStats.set(provider.getId(), {
        id: provider.getId(),
        name: provider.getName(),
        enabled: provider.isEnabled(),
        color: provider.getColor(),
        lastCheck: Date.now(),
        successRate: 1.0,
        avgResponseTime: 0,
        availableQualities: [],
      });
    });
  }

  /**
   * 设置音源切换策略
   */
  setSwitchStrategy(strategy: SwitchStrategy): void {
    this.currentStrategy = strategy;
    console.log('[ProviderManagerEnhanced] 切换策略:', strategy);
  }

  /**
   * 获取当前策略
   */
  getSwitchStrategy(): SwitchStrategy {
    return this.currentStrategy;
  }

  /**
   * 获取指定Provider
   */
  getProvider(providerId: string): BaseProvider | undefined {
    return this.providers.get(providerId);
  }

  /**
   * 获取所有启用的Provider
   */
  getEnabledProviders(): BaseProvider[] {
    return Array.from(this.providers.values()).filter((p) => p.isEnabled());
  }

  /**
   * 根据策略获取Provider优先级
   */
  private getProviderPriority(): BaseProvider[] {
    const enabledProviders = this.getEnabledProviders();

    switch (this.currentStrategy) {
      case SwitchStrategy.QUALITY:
        // 音质优先：咪咕 > 网易云 > QQ > 其他
        const qualityOrder = ['migu', 'netease', 'qq', 'bilibili', 'kugou', 'kuwo'];
        return enabledProviders.sort((a, b) => {
          return qualityOrder.indexOf(a.getId()) - qualityOrder.indexOf(b.getId());
        });

      case SwitchStrategy.SPEED:
        // 速度优先：根据平均响应时间排序
        return enabledProviders.sort((a, b) => {
          const aStats = this.providerStats.get(a.getId());
          const bStats = this.providerStats.get(b.getId());
          return (aStats?.avgResponseTime || 999) - (bStats?.avgResponseTime || 999);
        });

      case SwitchStrategy.FALLBACK:
        // 优先使用原平台
        return enabledProviders;

      default:
        // 自动/平衡模式：综合成功率、速度和音质
        return enabledProviders.sort((a, b) => {
          const aStats = this.providerStats.get(a.getId());
          const bStats = this.providerStats.get(b.getId());

          const aScore = this.calculateProviderScore(a.getId());
          const bScore = this.calculateProviderScore(b.getId());

          return bScore - aScore;
        });
    }
  }

  /**
   * 计算Provider综合得分
   */
  private calculateProviderScore(providerId: string): number {
    const stats = this.providerStats.get(providerId);
    if (!stats) return 0;

    // 权重：成功率40%，速度30%，音质30%
    const qualityBonus = this.getQualityBonus(providerId);
    const speedScore = Math.max(0, 1000 - stats.avgResponseTime) / 1000;

    return stats.successRate * 0.4 + speedScore * 0.3 + qualityBonus * 0.3;
  }

  /**
   * 获取音质加分
   */
  private getQualityBonus(providerId: string): number {
    const qualityMap: Record<string, number> = {
      'migu': 0.9,    // 支持Hi-Res
      'netease': 0.8, // 支持FLAC
      'qq': 0.7,      // 支持FLAC
      'bilibili': 0.6,
      'kugou': 0.5,
      'kuwo': 0.4,
    };
    return qualityMap[providerId] || 0.3;
  }

  /**
   * 聚合搜索 - 智能合并多平台结果
   */
  async aggregateSearch(keyword: string, limit: number = 50): Promise<Song[]> {
    const providers = this.getProviderPriority().slice(0, 4); // 只用前4个平台搜索
    console.log('[ProviderManagerEnhanced] 聚合搜索:', keyword, '使用平台:', providers.map(p => p.getId()));

    // 并行搜索
    const searchPromises = providers.map(async (provider) => {
      const startTime = Date.now();
      try {
        const limitPerProvider = Math.ceil(limit / providers.length);
        const result = await provider.search(keyword, limitPerProvider);
        const responseTime = Date.now() - startTime;

        // 更新统计
        this.updateProviderStats(provider.getId(), true, responseTime);

        console.log(`[ProviderManagerEnhanced] ${provider.getName()} 搜索成功:`, result.songs.length, '首，耗时', responseTime + 'ms');
        return result.songs;
      } catch (error) {
        const responseTime = Date.now() - startTime;
        this.updateProviderStats(provider.getId(), false, responseTime);

        console.warn(`[ProviderManagerEnhanced] ${provider.getName()} 搜索失败:`, error);
        return [];
      }
    });

    const results = await Promise.all(searchPromises);
    const allSongs = results.flat();

    // 智能去重和排序
    const uniqueSongs = this.deduplicateSongs(allSongs);
    const rankedSongs = this.rankSongs(uniqueSongs, keyword);

    console.log('[ProviderManagerEnhanced] 聚合搜索完成，去重后共', rankedSongs.length, '首歌曲');
    return rankedSongs.slice(0, limit);
  }

  /**
   * 歌曲去重 - 基于歌曲名和艺术家
   */
  private deduplicateSongs(songs: Song[]): Song[] {
    const uniqueMap = new Map<string, Song>();

    songs.forEach((song) => {
      const key = `${song.name.toLowerCase()}-${Array.isArray(song.artist) ? song.artist.join(',') : song.artist}`.toLowerCase();

      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, song);
      } else {
        // 如果已存在，选择更高质量的版本
        const existing = uniqueMap.get(key)!;
        if (this.isHigherQuality(song, existing)) {
          uniqueMap.set(key, song);
        }
      }
    });

    return Array.from(uniqueMap.values());
  }

  /**
   * 判断音质是否更高
   */
  private isHigherQuality(song1: Song, song2: Song): boolean {
    const qualityOrder = ['hires', 'flac', '320k', '192k', '128k'];

    const getQualityLevel = (song: Song): number => {
      const quality = song.url?.includes('flac') ? 'flac' :
                     song.url?.includes('hires') ? 'hires' : '320k';
      return qualityOrder.indexOf(quality);
    };

    return getQualityLevel(song1) < getQualityLevel(song2);
  }

  /**
   * 歌曲排序 - 基于匹配度、热门度和音源质量
   */
  private rankSongs(songs: Song[], keyword: string): Song[] {
    const keywordLower = keyword.toLowerCase();

    return songs.sort((a, b) => {
      // 1. 完全匹配优先
      const aExactMatch = a.name.toLowerCase() === keywordLower ? 1 : 0;
      const bExactMatch = b.name.toLowerCase() === keywordLower ? 1 : 0;
      if (aExactMatch !== bExactMatch) return bExactMatch - aExactMatch;

      // 2. 平台质量排序
      const aProviderScore = this.calculateProviderScore(a.source);
      const bProviderScore = this.calculateProviderScore(b.source);
      if (aProviderScore !== bProviderScore) return bProviderScore - aProviderScore;

      // 3. 关键词匹配度
      const aKeywordScore = this.calculateKeywordScore(a, keywordLower);
      const bKeywordScore = this.calculateKeywordScore(b, keywordLower);
      return bKeywordScore - aKeywordScore;
    });
  }

  /**
   * 计算关键词匹配得分
   */
  private calculateKeywordScore(song: Song, keyword: string): number {
    const nameMatch = song.name.toLowerCase().includes(keyword) ? 10 : 0;
    // artist始终是数组类型，确保安全处理
    const artistArr = Array.isArray(song.artist) ? song.artist : [String(song.artist || '')];
    const artistMatch = artistArr.some(a => a.toLowerCase().includes(keyword)) ? 5 : 0;

    return nameMatch + artistMatch;
  }

  /**
   * 智能获取播放URL - 自动切换最优音源
   */
  async getOptimalSongUrl(
    song: Song,
    quality: string = '320k'
  ): Promise<{ url: string; br: string; fromSource?: string }> {
    console.log('[ProviderManagerEnhanced] 获取最优音源:', song.name, '音质:', quality);

    const providers = this.getProviderPriority();

    // 1. 优先使用原平台
    const originalProvider = this.providers.get(song.source);
    if (originalProvider && originalProvider.isEnabled()) {
      try {
        const startTime = Date.now();
        const result = await originalProvider.getSongUrl(song, quality);
        const responseTime = Date.now() - startTime;

        if (result.url && await this.validateUrl(result.url)) {
          this.updateProviderStats(originalProvider.getId(), true, responseTime);
          console.log('[ProviderManagerEnhanced] 原平台成功:', originalProvider.getName());
          return { ...result, fromSource: song.source };
        }
      } catch (error) {
        this.updateProviderStats(originalProvider.getId(), false, 0);
        console.warn('[ProviderManagerEnhanced] 原平台失败:', error);
      }
    }

    // 2. 跨平台搜索匹配
    console.log('[ProviderManagerEnhanced] 原平台失败，启动跨平台搜索');
    const searchKeyword = `${song.name} ${Array.isArray(song.artist) ? song.artist[0] : song.artist}`;

    for (const provider of providers.filter(p => p.getId() !== song.source)) {
      try {
        // 搜索匹配歌曲
        const searchResult = await provider.search(searchKeyword, 5);
        if (searchResult.songs.length === 0) continue;

        // 选择最匹配的歌曲
        const matchedSong = this.findBestMatch(song, searchResult.songs);
        if (!matchedSong) continue;

        // 获取播放URL
        const result = await provider.getSongUrl(matchedSong, quality);
        if (result.url && await this.validateUrl(result.url)) {
          console.log('[ProviderManagerEnhanced] 跨平台成功:', provider.getName());
          return { ...result, fromSource: provider.getId() };
        }
      } catch (error) {
        console.warn('[ProviderManagerEnhanced]', provider.getName(), '失败:', error);
      }
    }

    console.error('[ProviderManagerEnhanced] 所有平台均失败');
    return { url: '', br: '' };
  }

  /**
   * 查找最佳匹配歌曲
   */
  private findBestMatch(targetSong: Song, candidates: Song[]): Song | null {
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];

    // 计算匹配得分
    let bestMatch = candidates[0];
    let bestScore = 0;

    candidates.forEach((candidate) => {
      let score = 0;

      // 歌名完全匹配
      if (candidate.name.toLowerCase() === targetSong.name.toLowerCase()) {
        score += 100;
      } else if (candidate.name.toLowerCase().includes(targetSong.name.toLowerCase()) ||
                 targetSong.name.toLowerCase().includes(candidate.name.toLowerCase())) {
        score += 50;
      }

      // 艺术家匹配 - 确保数组类型安全
      const targetArtists = (Array.isArray(targetSong.artist) ? targetSong.artist : [String(targetSong.artist || '')])
        .map(a => a.toLowerCase());

      const candidateArtists = (Array.isArray(candidate.artist) ? candidate.artist : [String(candidate.artist || '')])
        .map(a => a.toLowerCase());

      const artistMatch = targetArtists.some(ta => candidateArtists.some(ca => ca.includes(ta) || ta.includes(ca)));
      if (artistMatch) {
        score += 50;
      }

      // 时长匹配（允许10秒误差）
      const durationDiff = Math.abs((candidate.duration || 0) - (targetSong.duration || 0));
      if (durationDiff < 10000) {
        score += 20;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = candidate;
      }
    });

    return bestScore > 50 ? bestMatch : null;
  }

  /**
   * 验证URL是否有效
   */
  private async validateUrl(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * 更新Provider统计信息
   */
  private updateProviderStats(providerId: string, success: boolean, responseTime: number): void {
    const stats = this.providerStats.get(providerId);
    if (!stats) return;

    stats.lastCheck = Date.now();

    // 更新成功率（使用指数移动平均）
    const alpha = 0.1;
    stats.successRate = alpha * (success ? 1 : 0) + (1 - alpha) * stats.successRate;

    // 更新平均响应时间
    if (responseTime > 0) {
      stats.avgResponseTime = alpha * responseTime + (1 - alpha) * stats.avgResponseTime;
    }
  }

  /**
   * 获取所有Provider状态
   */
  getProvidersStatus(): ProviderStatus[] {
    return Array.from(this.providerStats.values());
  }

  /**
   * 启用/禁用Provider
   */
  setProviderEnabled(providerId: string, enabled: boolean): void {
    const provider = this.providers.get(providerId);
    if (provider) {
      if (enabled) {
        provider.enable();
      } else {
        provider.disable();
      }

      const stats = this.providerStats.get(providerId);
      if (stats) {
        stats.enabled = enabled;
      }

      console.log('[ProviderManagerEnhanced]', provider.getName(), enabled ? '已启用' : '已禁用');
    }
  }
}

// 导出单例实例
export const providerManagerEnhanced = ProviderManagerEnhanced.getInstance();