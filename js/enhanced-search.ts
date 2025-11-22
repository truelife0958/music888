/**
 * 增强的搜索模块 - 整合 Listen1 多平台支持
 * 提供智能搜索和音源切换功能
 */

import { unifiedProviderManager } from './providers/unified-provider-manager.js';
import { loWeb } from './providers/listen1-media-service.js';
import * as api from './api.js';
import type { Song } from './api.js';
import { debounce } from './utils.js';

export interface EnhancedSearchOptions {
  keyword: string;
  source?: string; // 'allmusic', 'netease', 'qq', 'listen1', 'enhanced', 'auto'
  type?: number;   // 0: 歌曲, 1: 歌手, 1000: 歌单
  limit?: number;
  curpage?: number;
}

export interface SearchResult {
  songs: Song[];
  total: number;
  fromSource?: string;
}

/**
 * 增强的搜索类
 * 整合三种搜索方式：
 * 1. Listen1 架构 (支持多平台聚合搜索)
 * 2. 增强 Provider 架构 (跨平台智能切换)
 * 3. 原有 API 架构 (向后兼容)
 */
export class EnhancedSearch {
  private static instance: EnhancedSearch;
  private searchCache = new Map<string, SearchResult>();
  private searchHistory: string[] = [];
  private maxCacheSize = 100;
  private maxHistorySize = 50;

  private constructor() {
    this.loadSearchHistory();
  }

  static getInstance(): EnhancedSearch {
    if (!EnhancedSearch.instance) {
      EnhancedSearch.instance = new EnhancedSearch();
    }
    return EnhancedSearch.instance;
  }

  /**
   * 主搜索方法 - 智能选择最佳搜索方式
   */
  async search(options: EnhancedSearchOptions): Promise<SearchResult> {
    const { keyword, source = 'auto', type = 0, limit = 20, curpage = 1 } = options;

    console.log('[EnhancedSearch] 搜索:', keyword, '源:', source);

    // 检查缓存
    const cacheKey = this.getCacheKey(keyword, source, type, curpage);
    const cached = this.searchCache.get(cacheKey);
    if (cached) {
      console.log('[EnhancedSearch] 使用缓存结果');
      return cached;
    }

    let result: SearchResult;

    // 智能选择搜索方式
    if (source === 'auto') {
      result = await this.autoSearch(keyword, type, limit, curpage);
    } else if (source === 'allmusic' || source === 'listen1') {
      result = await this.listen1Search(keyword, type, limit, curpage);
    } else if (source === 'enhanced') {
      result = await this.enhancedSearch(keyword, 'netease', limit);
    } else {
      // 传统搜索或指定平台搜索
      result = await this.traditionalSearch(keyword, source, limit);
    }

    // 缓存结果
    this.searchCache.set(cacheKey, result);
    this.cleanCache();

    // 保存搜索历史
    this.addToSearchHistory(keyword);

    console.log('[EnhancedSearch] 搜索完成，找到', result.songs.length, '首歌曲，来源:', result.fromSource);

    return result;
  }

  /**
   * 自动搜索 - 智能选择最佳源
   */
  private async autoSearch(keyword: string, type: number, limit: number, curpage: number): Promise<SearchResult> {
    // 搜索策略：1. Listen1全平台 -> 2. 统一管理器 -> 3. 原有API
    const searchStrategies = [
      () => this.listen1Search(keyword, type, limit, curpage),
      () => this.enhancedSearch(keyword, 'netease', limit),
      () => this.traditionalSearch(keyword, 'netease', limit),
    ];

    for (const strategy of searchStrategies) {
      try {
        const result = await strategy();
        if (result.songs.length > 0) {
          return result;
        }
      } catch (error) {
        console.warn('[EnhancedSearch] 搜索策略失败:', error);
        continue;
      }
    }

    return { songs: [], total: 0, fromSource: 'auto' };
  }

  /**
   * Listen1 风格搜索 - 支持全平台聚合搜索
   */
  private async listen1Search(keyword: string, type: number, limit: number, curpage: number): Promise<SearchResult> {
    try {
      const result = await unifiedProviderManager.search(keyword, 'allmusic', {
        type,
        limit,
        curpage,
      });

      return {
        songs: result.songs.slice(0, limit),
        total: result.total,
        fromSource: 'listen1',
      };
    } catch (error) {
      console.error('[EnhancedSearch] Listen1搜索失败:', error);
      return { songs: [], total: 0, fromSource: 'listen1' };
    }
  }

  /**
   * 增强版搜索 - 使用统一Provider管理器
   */
  private async enhancedSearch(keyword: string, source: string, limit: number): Promise<SearchResult> {
    try {
      const result = await unifiedProviderManager.search(keyword, 'enhanced', { limit });

      return {
        songs: result.songs.slice(0, limit),
        total: result.total,
        fromSource: 'enhanced',
      };
    } catch (error) {
      console.error('[EnhancedSearch] 增强版搜索失败:', error);
      return { songs: [], total: 0, fromSource: 'enhanced' };
    }
  }

  /**
   * 传统搜索 - 使用原有API
   */
  private async traditionalSearch(keyword: string, source: string, limit: number): Promise<SearchResult> {
    try {
      const songs = await api.searchMusicAPI(keyword, source);

      return {
        songs: songs.slice(0, limit),
        total: songs.length,
        fromSource: 'traditional',
      };
    } catch (error) {
      console.error('[EnhancedSearch] 传统搜索失败:', error);
      return { songs: [], total: 0, fromSource: 'traditional' };
    }
  }

  /**
   * 获取播放URL - 智能降级
   */
  async getPlayUrl(song: Song, quality: string = '320k'): Promise<{ url: string; fromSource: string }> {
    try {
      const result = await unifiedProviderManager.getPlayUrl(song, quality);
      return {
        url: result.url,
        fromSource: result.fromSource || 'unknown',
      };
    } catch (error) {
      console.error('[EnhancedSearch] 获取播放URL失败:', error);
      return { url: '', fromSource: 'error' };
    }
  }

  /**
   * 获取歌词 - 智能降级
   */
  async getLyric(song: Song): Promise<{ lyric: string; fromSource: string }> {
    try {
      const result = await unifiedProviderManager.getLyric(song);
      return {
        lyric: result.lyric,
        fromSource: result.fromSource || 'unknown',
      };
    } catch (error) {
      console.error('[EnhancedSearch] 获取歌词失败:', error);
      return { lyric: '', fromSource: 'error' };
    }
  }

  /**
   * 解析音乐链接
   */
  async parseUrl(url: string): Promise<any> {
    try {
      return await unifiedProviderManager.parseUrl(url);
    } catch (error) {
      console.error('[EnhancedSearch] 解析URL失败:', error);
      return null;
    }
  }

  /**
   * 获取支持的所有平台
   */
  getSupportedPlatforms(): { name: string; id: string; source: string }[] {
    return unifiedProviderManager.getAllPlatforms();
  }

  /**
   * 获取搜索建议
   */
  async getSearchSuggestions(keyword: string, limit: number = 5): Promise<string[]> {
    if (!keyword.trim()) {
      return [];
    }

    // 这里可以实现搜索建议功能
    // 目前返回热门搜索历史
    return this.searchHistory
      .filter(term => term.toLowerCase().includes(keyword.toLowerCase()))
      .slice(0, limit);
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.searchCache.clear();
    console.log('[EnhancedSearch] 缓存已清除');
  }

  /**
   * 获取搜索历史
   */
  getSearchHistory(): string[] {
    return [...this.searchHistory];
  }

  /**
   * 清除搜索历史
   */
  clearSearchHistory(): void {
    this.searchHistory = [];
    this.saveSearchHistory();
    console.log('[EnhancedSearch] 搜索历史已清除');
  }

  /**
   * 配置搜索选项
   */
  configure(options: { maxCacheSize?: number; maxHistorySize?: number }): void {
    if (options.maxCacheSize) {
      this.maxCacheSize = options.maxCacheSize;
      this.cleanCache();
    }
    if (options.maxHistorySize) {
      this.maxHistorySize = options.maxHistorySize;
      if (this.searchHistory.length > this.maxHistorySize) {
        this.searchHistory = this.searchHistory.slice(0, this.maxHistorySize);
        this.saveSearchHistory();
      }
    }
  }

  /**
   * 获取搜索统计信息
   */
  getSearchStats(): { cacheSize: number; historySize: number; supportedPlatforms: number } {
    return {
      cacheSize: this.searchCache.size,
      historySize: this.searchHistory.length,
      supportedPlatforms: this.getSupportedPlatforms().length,
    };
  }

  // 私有方法

  private getCacheKey(keyword: string, source: string, type: number, curpage: number): string {
    return `${keyword}_${source}_${type}_${curpage}`;
  }

  private cleanCache(): void {
    if (this.searchCache.size <= this.maxCacheSize) {
      return;
    }

    // 删除最旧的缓存项
    const entries = Array.from(this.searchCache.entries());
    const toDelete = entries.slice(0, entries.length - this.maxCacheSize);
    toDelete.forEach(([key]) => {
      this.searchCache.delete(key);
    });
  }

  private addToSearchHistory(keyword: string): void {
    // 移除重复项
    const index = this.searchHistory.indexOf(keyword);
    if (index > -1) {
      this.searchHistory.splice(index, 1);
    }

    // 添加到开头
    this.searchHistory.unshift(keyword);

    // 限制大小
    if (this.searchHistory.length > this.maxHistorySize) {
      this.searchHistory = this.searchHistory.slice(0, this.maxHistorySize);
    }

    this.saveSearchHistory();
  }

  private loadSearchHistory(): void {
    try {
      const saved = localStorage.getItem('enhanced_search_history');
      if (saved) {
        this.searchHistory = JSON.parse(saved);
      }
    } catch (error) {
      console.warn('[EnhancedSearch] 加载搜索历史失败:', error);
      this.searchHistory = [];
    }
  }

  private saveSearchHistory(): void {
    try {
      localStorage.setItem('enhanced_search_history', JSON.stringify(this.searchHistory));
    } catch (error) {
      console.warn('[EnhancedSearch] 保存搜索历史失败:', error);
    }
  }
}

// 导出单例实例
export const enhancedSearch = EnhancedSearch.getInstance();

// 导出便捷方法
export const searchMusic = (keyword: string, source: string = 'auto') => {
  return enhancedSearch.search({ keyword, source });
};

export const getMusicPlayUrl = (song: Song, quality: string = '320k') => {
  return enhancedSearch.getPlayUrl(song, quality);
};

export const getMusicLyric = (song: Song) => {
  return enhancedSearch.getLyric(song);
};

// 防抖搜索函数
export const debouncedSearch = debounce(searchMusic, 500);

export default enhancedSearch;