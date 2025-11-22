/**
 * Listen1 风格的 Media Service
 * 统一管理所有音乐平台，提供聚合搜索和智能切换功能
 *
 * 基于 Listen1 的 loWeb.js 架构，集成到 Music888 项目中
 */

import { Listen1BaseProvider, Listen1Track, Listen1SearchResult, Listen1Playlist } from './listen1-base-provider.js';
import { Listen1NeteaseProvider } from './listen1-base-provider.js';
import { Listen1QQProvider } from './listen1-qq-provider.js';
import { Listen1ProviderAdapter } from './listen1-provider-adapter.js';
import { KugouProvider } from './kugou-provider.js';
import { KuwoProvider } from './kuwo-provider.js';
import { MiguProvider } from './migu-provider.js';

// 定义平台配置
interface Listen1ProviderConfig {
  name: string;
  instance: Listen1BaseProvider;
  searchable: boolean;
  hidden?: boolean;
  support_login: boolean;
  id: string;
}

const LISTEN1_PROVIDERS: Listen1ProviderConfig[] = [
  {
    name: 'netease',
    instance: new Listen1NeteaseProvider(),
    searchable: true,
    support_login: true,
    id: 'ne',
  },
  {
    name: 'qq',
    instance: new Listen1QQProvider(),
    searchable: true,
    support_login: true,
    id: 'qq',
  },
  // 老王添加：酷狗音乐 (使用适配器)
  {
    name: 'kugou',
    instance: new Listen1ProviderAdapter(new KugouProvider()),
    searchable: true,
    support_login: false,
    id: 'kg',
  },
  // 老王添加：酷我音乐 (使用适配器)
  {
    name: 'kuwo',
    instance: new Listen1ProviderAdapter(new KuwoProvider()),
    searchable: true,
    support_login: false,
    id: 'kw',
  },
  // 老王添加：咪咕音乐 (使用适配器)
  {
    name: 'migu',
    instance: new Listen1ProviderAdapter(new MiguProvider()),
    searchable: true,
    support_login: false,
    id: 'mg',
  },
];

/**
 * Listen1 Media Service
 * 提供统一的音乐平台接口
 */
export class Listen1MediaService {
  private providers: Map<string, Listen1BaseProvider>;
  private providerConfigs: Map<string, Listen1ProviderConfig>;

  constructor() {
    this.providers = new Map();
    this.providerConfigs = new Map();
    this.initializeProviders();
  }

  private initializeProviders(): void {
    LISTEN1_PROVIDERS.forEach((config) => {
      this.providers.set(config.name, config.instance);
      this.providerConfigs.set(config.name, config);
    });

    console.log('[Listen1MediaService] 初始化完成，共加载', this.providers.size, '个平台');
  }

  /**
   * 根据名称获取 Provider
   */
  private getProviderByName(sourceName: string): Listen1BaseProvider | undefined {
    return this.providers.get(sourceName);
  }

  /**
   * 获取所有 Provider
   */
  private getAllProviders(): Listen1BaseProvider[] {
    return LISTEN1_PROVIDERS.filter((i) => !i.hidden).map((i) => i.instance);
  }

  /**
   * 获取所有支持搜索的 Provider
   */
  private getAllSearchProviders(): Listen1BaseProvider[] {
    return LISTEN1_PROVIDERS.filter((i) => i.searchable).map((i) => i.instance);
  }

  /**
   * 根据 itemId 获取 Provider
   */
  private getProviderByItemId(itemId: string): Listen1BaseProvider | undefined {
    const prefix = itemId.slice(0, 2);
    const config = LISTEN1_PROVIDERS.find((i) => i.id === prefix);
    return config?.instance;
  }

  /**
   * 聚合搜索 - 支持单平台和全平台搜索
   */
  search(source: string, options: { keywords: string; curpage?: number; type?: number }): {
    success: (fn: (data: Listen1SearchResult) => void) => void;
  } {
    if (source === 'allmusic') {
      return this.aggregateSearch(options);
    }

    const provider = this.getProviderByName(source);
    if (!provider) {
      console.warn('[Listen1MediaService] 未找到 Provider:', source);
      return {
        success: (fn) => fn({ result: [], total: 0, type: 'search' })
      };
    }

    const url = `/search?${new URLSearchParams({
      keywords: options.keywords,
      curpage: (options.curpage || 1).toString(),
      type: (options.type || 0).toString(),
    }).toString()}`;

    return provider.search(url);
  }

  /**
   * 聚合搜索 - 从所有平台搜索并合并结果
   */
  private aggregateSearch(options: { keywords: string; curpage?: number; type?: number }): {
    success: (fn: (data: Listen1SearchResult) => void) => void;
  } {
    return {
      success: async (fn: (data: Listen1SearchResult) => void) => {
        try {
          const searchProviders = this.getAllSearchProviders();
          console.log('[Listen1MediaService] 聚合搜索:', options.keywords, '平台数:', searchProviders.length);

          const searchPromises = searchProviders.map(async (provider) => {
            try {
              const url = `/search?${new URLSearchParams({
                keywords: options.keywords,
                curpage: (options.curpage || 1).toString(),
                type: (options.type || 0).toString(),
              }).toString()}`;

              const result = await new Promise<Listen1SearchResult>((resolve, reject) => {
                provider.search(url).success(resolve);
              });

              console.log('[Listen1MediaService]', provider.getName(), '搜索结果:', result.result.length, '首');
              return result;
            } catch (error) {
              console.warn('[Listen1MediaService]', provider.getName(), '搜索失败:', error);
              return { result: [], total: 0, type: 'search' };
            }
          });

          const results = await Promise.all(searchPromises);

          // 合并结果 - 交替排序
          const allTracks: Listen1Track[] = [];
          const maxLength = Math.max(...results.map((result) => result.result.length));

          for (let i = 0; i < maxLength; i++) {
            results.forEach((result) => {
              if (i < result.result.length) {
                allTracks.push(result.result[i]);
              }
            });
          }

          console.log('[Listen1MediaService] 聚合搜索完成，共', allTracks.length, '首歌曲');

          fn({
            result: allTracks,
            total: Math.max(...results.map((result) => result.total)),
            type: 'search',
          });
        } catch (error) {
          console.error('[Listen1MediaService] 聚合搜索失败:', error);
          fn({ result: [], total: 0, type: 'search' });
        }
      }
    };
  }

  /**
   * 智能获取播放 URL - 支持 Listen1 的 fallback 机制
   */
  bootstrapTrack(
    track: Listen1Track,
    successCallback: (response: { url: string; bitrate: number; platform: string }) => void,
    failCallback: () => void
  ): void {
    console.log('[Listen1MediaService] 获取播放URL:', track.title, '来源:', track.source);

    const provider = this.getProviderByItemId(track.id);
    if (!provider) {
      console.warn('[Listen1MediaService] 未找到 Provider:', track.id);
      failCallback();
      return;
    }

    // Listen1 的智能 fallback 机制
    const failureCallback = () => {
      // 检查是否启用自动切换音源
      const enableAutoChooseSource = localStorage.getItem('enable_auto_choose_source') !== 'false';

      if (!enableAutoChooseSource) {
        failCallback();
        return;
      }

      console.log('[Listen1MediaService] 原平台失败，尝试自动切换音源');
      this.tryFallbackSources(track, successCallback, failCallback);
    };

    provider.bootstrap_track(track, successCallback, failureCallback);
  }

  /**
   * 尝试其他音源 - Listen1 的核心功能
   */
  private async tryFallbackSources(
    track: Listen1Track,
    successCallback: (response: { url: string; bitrate: number; platform: string }) => void,
    failCallback: () => void
  ): Promise<void> {
    const trackPlatform = track.source;
    const failoverSourceList = this.getAutoChooseSourceList().filter((source) => source !== trackPlatform);

    console.log('[Listen1MediaService] 尝试备用音源:', failoverSourceList);

    const getUrlPromises = failoverSourceList.map((source) =>
      new Promise<{ url: string; bitrate: number; platform: string }>((resolve, reject) => {
        if (track.source === source) {
          reject(new Error('相同来源'));
          return;
        }

        // 搜索相似歌曲
        const keyword = `${track.title} ${track.artist}`;
        const url = `/search?${new URLSearchParams({
          keywords: keyword,
          curpage: '1',
          type: '0',
        }).toString()}`;

        const provider = this.getProviderByName(source);
        if (!provider) {
          reject(new Error('Provider not found'));
          return;
        }

        provider.search(url).success((searchResult: Listen1SearchResult) => {
          // 查找匹配的歌曲
          const matchedTrack = searchResult.result.find((searchTrack) =>
            !searchTrack.disabled &&
            searchTrack.title === track.title &&
            searchTrack.artist === track.artist
          );

          if (matchedTrack) {
            // 获取播放 URL
            provider.bootstrap_track(
              matchedTrack,
              (response) => {
                resolve(response); // 使用 resolve 快速返回第一个成功的结果
              },
              reject
            );
          } else {
            reject(new Error('未找到匹配歌曲'));
          }
        });
      })
    );

    // 使用 Promise.race 来获取第一个成功的结果
    Promise.race(getUrlPromises)
      .then((response) => {
        console.log('[Listen1MediaService] 备用音源成功:', response.platform);
        successCallback(response);
      })
      .catch((error) => {
        console.warn('[Listen1MediaService] 所有备用音源均失败:', error);
        failCallback();
      });
  }

  /**
   * 获取自动切换音源列表
   */
  private getAutoChooseSourceList(): string[] {
    const defaultList = ['kuwo', 'qq', 'migu'];
    try {
      const saved = localStorage.getItem('auto_choose_source_list');
      return saved ? JSON.parse(saved) : defaultList;
    } catch {
      return defaultList;
    }
  }

  /**
   * 获取歌词
   */
  getLyric(trackId: string, albumId?: string, lyricUrl?: string, tlyricUrl?: string): {
    success: (fn: (data: { lyric: string; tlyric?: string }) => void) => void;
  } {
    const provider = this.getProviderByItemId(trackId);
    if (!provider) {
      return {
        success: (fn) => fn({ lyric: '' })
      };
    }

    const url = `/lyric?${new URLSearchParams({
      track_id: trackId,
      album_id: albumId || '',
      lyric_url: lyricUrl || '',
      tlyric_url: tlyricUrl || '',
    }).toString()}`;

    return provider.lyric(url);
  }

  /**
   * 获取歌单列表
   */
  showPlaylistArray(source: string, offset: number = 0, filterId?: string): {
    success: (fn: (data: { result: Listen1Playlist[] }) => void) => void;
  } {
    const provider = this.getProviderByName(source);
    if (!provider) {
      return {
        success: (fn) => fn({ result: [] })
      };
    }

    const url = `/show_playlist?${new URLSearchParams({
      offset: offset.toString(),
      filter_id: filterId || '',
    }).toString()}`;

    return provider.show_playlist(url);
  }

  /**
   * 获取歌单详情
   */
  getPlaylist(listId: string): {
    success: (fn: (data: Listen1Playlist) => void) => void;
  } {
    const provider = this.getProviderByItemId(listId);
    if (!provider) {
      return {
        success: (fn) => fn({
          id: listId,
          title: '',
          cover_img_url: '',
          source_url: '',
          tracks: []
        })
      };
    }

    const url = `/playlist?list_id=${listId}`;
    return provider.get_playlist(url);
  }

  /**
   * 解析URL
   */
  parseURL(url: string): {
    success: (fn: (data: { result?: Listen1Track }) => void) => void;
  } {
    return {
      success: async (fn: (data: { result?: Listen1Track }) => void) => {
        try {
          const providers = this.getAllProviders();

          for (const provider of providers) {
            try {
              const result = await new Promise<Listen1Track | undefined>((resolve, reject) => {
                provider.parse_url(url).success((track) => {
                  if (track && track.title) {
                    resolve(track);
                  } else {
                    resolve(undefined);
                  }
                });
              });

              if (result) {
                fn({ result });
                return;
              }
            } catch (error) {
              // 继续尝试下一个 provider
              continue;
            }
          }

          fn({}); // 没有找到匹配的解析结果
        } catch (error) {
          console.error('[Listen1MediaService] URL解析失败:', error);
          fn({});
        }
      }
    };
  }

  /**
   * 获取歌单分类过滤器
   */
  getPlaylistFilters(source: string): any[] {
    const provider = this.getProviderByName(source);
    return provider ? provider.get_playlist_filters() : [];
  }

  /**
   * 获取支持登录的 Providers
   */
  getLoginProviders(): Listen1ProviderConfig[] {
    return LISTEN1_PROVIDERS.filter((i) => !i.hidden && i.support_login);
  }

  /**
   * 获取所有 Provider 状态
   */
  getProvidersStatus(): { id: string; name: string; searchable: boolean; supportLogin: boolean }[] {
    return LISTEN1_PROVIDERS.filter((i) => !i.hidden).map((config) => ({
      id: config.id,
      name: config.name,
      searchable: config.searchable,
      supportLogin: config.support_login,
    }));
  }
}

// 导出单例实例
export const listen1MediaService = new Listen1MediaService();

// 兼容原有的 loWeb 接口
export const loWeb = listen1MediaService;