/**
 * Listen1 风格的 Provider - 兼容 Listen1 API 设计
 *
 * 这个模块将 Listen1 的成熟多平台架构集成到 Music888 中
 * 提供统一的接口来支持多个音乐平台
 */

import { NeteaseCrypto } from '../utils/crypto-utils.js';

export interface Listen1Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  source: string;
  source_url?: string;
  img_url?: string;
  url?: string;
  disabled?: boolean;
  lyric_url?: string;
  tlyric_url?: string;
  duration?: number;
  bitrate?: number;
  platform?: string;
}

export interface Listen1SearchResult {
  result: Listen1Track[];
  total: number;
  type: string;
}

export interface Listen1Playlist {
  id: string;
  title: string;
  cover_img_url: string;
  source_url: string;
  tracks?: Listen1Track[];
}

export interface Listen1LoginUser {
  id: string;
  name: string;
  avatar_url: string;
  url: string;
}

/**
 * Listen1 风格的基础 Provider 类
 * 每个平台都需要实现这个接口
 */
export abstract class Listen1BaseProvider {
  protected name: string;
  protected id: string;

  constructor(name: string, id: string) {
    this.name = name;
    this.id = id;
  }

  /**
   * 搜索音乐
   */
  abstract search(url: string): { success: (fn: (data: Listen1SearchResult) => void) => void };

  /**
   * 获取播放链接
   */
  abstract bootstrap_track(
    track: Listen1Track,
    successCallback: (response: { url: string; bitrate: number; platform: string }) => void,
    failCallback: () => void
  ): void;

  /**
   * 获取歌词
   */
  abstract lyric(url: string): { success: (fn: (data: { lyric: string; tlyric?: string }) => void) => void };

  /**
   * 获取歌单列表
   */
  abstract show_playlist(url: string): { success: (fn: (data: { result: Listen1Playlist[] }) => void) => void };

  /**
   * 获取歌单详情
   */
  abstract get_playlist(url: string): { success: (fn: (data: Listen1Playlist) => void) => void };

  /**
   * 解析URL
   */
  abstract parse_url(url: string): { success: (fn: (data: Listen1Track) => void) => void };

  /**
   * 获取歌单分类过滤器
   */
  abstract get_playlist_filters(): any[];

  /**
   * 登录相关
   */
  abstract login(url: string): any;
  abstract get_user(): any;
  abstract get_login_url(): any;
  abstract logout(): any;

  // Getter methods
  getName(): string { return this.name; }
  getId(): string { return this.id; }
}

/**
 * 网易云音乐 Provider - 基于 Listen1 实现
 */
export class Listen1NeteaseProvider extends Listen1BaseProvider {
  constructor() {
    super('netease', 'ne');
  }

  search(url: string) {
    return {
      success: async (fn: (data: Listen1SearchResult) => void) => {
        try {
          const params = new URLSearchParams(url.split('?')[1]);
          const keywords = params.get('keywords') || '';
          const curpage = parseInt(params.get('curpage') || '1');
          const type = parseInt(params.get('type') || '0');

          // 实现网易云搜索逻辑
          const searchResult = await this.searchNetease(keywords, curpage, type);
          fn(searchResult);
        } catch (error) {
          console.error('[Listen1NeteaseProvider] 搜索失败:', error);
          fn({ result: [], total: 0, type: 'search' });
        }
      }
    };
  }

  private async searchNetease(keywords: string, curpage: number, type: number): Promise<Listen1SearchResult> {
    const offset = (curpage - 1) * 20;
    const data = NeteaseCrypto.weapi({
      csrf_token: '',
      hlpretag: '',
      hlposttag: '',
      s: keywords,
      type: type,
      offset: offset,
      total: 'true',
      limit: 20,
    });

    const response = await fetch('https://music.163.com/weapi/search/get', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://music.163.com',
      },
      body: new URLSearchParams(data)
    });

    const result = await response.json();

    const tracks: Listen1Track[] = [];
    let songData = [];

    if (type === 1) { // 歌手
      songData = result.result.artists || [];
      songData.forEach((artist: any) => {
        tracks.push({
          id: `neartist_${artist.id}`,
          title: artist.name,
          artist: artist.name,
          album: '',
          source: 'netease',
          source_url: `https://music.163.com/#/artist?id=${artist.id}`,
          img_url: artist.picUrl || '',
          url: '',
          disabled: false,
        });
      });
    } else if (type === 1000) { // 歌单
      songData = result.result.playlists || [];
      songData.forEach((playlist: any) => {
        tracks.push({
          id: `neplaylist_${playlist.id}`,
          title: playlist.name,
          artist: playlist.creator?.nickname || '未知艺术家',
          album: `播放列表 · ${playlist.trackCount}首`,
          source: 'netease',
          source_url: `https://music.163.com/#/playlist?id=${playlist.id}`,
          img_url: playlist.coverImgUrl || '',
          url: '',
          disabled: false,
        });
      });
    } else { // 歌曲
      songData = result.result.songs || [];
      songData.forEach((song: any) => {
        tracks.push({
          id: `netrack_${song.id}`,
          title: song.name,
          artist: song.artists?.map((a: any) => a.name).join(', ') || '',
          album: song.album?.name || '',
          source: 'netease',
          source_url: `https://music.163.com/#/song?id=${song.id}`,
          img_url: song.album?.picUrl || '',
          url: '',
          disabled: false,
          duration: song.duration || 0,
        });
      });
    }

    return {
      result: tracks,
      total: result.result?.songCount || tracks.length,
      type: 'search',
    };
  }

  bootstrap_track(
    track: Listen1Track,
    successCallback: (response: { url: string; bitrate: number; platform: string }) => void,
    failCallback: () => void
  ) {
    const trackId = track.id.replace('netrack_', '');

    // 获取网易云播放URL
    this.getNeteaseUrl(trackId, successCallback, failCallback);
  }

  private async getNeteaseUrl(
    trackId: string,
    successCallback: (response: { url: string; bitrate: number; platform: string }) => void,
    failCallback: () => void
  ) {
    try {
      const data = NeteaseCrypto.weapi({
        ids: `[${trackId}]`,
        br: 320000,
        csrf_token: '',
      });

      const response = await fetch('https://music.163.com/weapi/song/enhance/player/url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': 'https://music.163.com',
        },
        body: new URLSearchParams(data)
      });

      const result = await response.json();

      if (result.data && result.data[0] && result.data[0].url) {
        successCallback({
          url: result.data[0].url,
          bitrate: result.data[0].br / 1000,
          platform: 'netease',
        });
      } else {
        failCallback();
      }
    } catch (error) {
      console.error('[Listen1NeteaseProvider] 获取播放URL失败:', error);
      failCallback();
    }
  }

  lyric(url: string) {
    return {
      success: async (fn: (data: { lyric: string; tlyric?: string }) => void) => {
        try {
          const params = new URLSearchParams(url.split('?')[1]);
          const trackId = params.get('track_id')?.replace('netrack_', '');

          if (!trackId) {
            fn({ lyric: '' });
            return;
          }

          const lyricData = await this.getNeteaseLyric(trackId);
          fn(lyricData);
        } catch (error) {
          console.error('[Listen1NeteaseProvider] 获取歌词失败:', error);
          fn({ lyric: '' });
        }
      }
    };
  }

  private async getNeteaseLyric(trackId: string): Promise<{ lyric: string; tlyric?: string }> {
    const data = NeteaseCrypto.weapi({
      id: trackId,
      lv: -1,
      csrf_token: '',
    });

    const response = await fetch('https://music.163.com/weapi/song/lyric', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://music.163.com',
      },
      body: new URLSearchParams(data)
    });

    const result = await response.json();

    return {
      lyric: result.lrc?.lyric || '',
      tlyric: result.tlyric?.lyric,
    };
  }

  show_playlist(url: string) {
    return {
      success: (fn: (data: { result: Listen1Playlist[] }) => void) => {
        // 实现网易云歌单列表获取
        fn({ result: [] });
      }
    };
  }

  get_playlist(url: string) {
    return {
      success: (fn: (data: Listen1Playlist) => void) => {
        // 实现网易云歌单详情获取
        fn({
          id: '',
          title: '',
          cover_img_url: '',
          source_url: '',
          tracks: []
        });
      }
    };
  }

  parse_url(url: string) {
    return {
      success: (fn: (data: Listen1Track) => void) => {
        // 实现网易云URL解析
        fn({
          id: '',
          title: '',
          artist: '',
          album: '',
          source: 'netease',
          url: '',
        });
      }
    };
  }

  get_playlist_filters(): any[] {
    return [
      {
        id: '10000000',
        name: '全部歌单',
      },
      {
        id: '1001',
        name: '华语',
      },
      {
        id: '1002',
        name: '欧美',
      },
      // 更多分类...
    ];
  }

  login(url: string) {
    return {
      success: (fn: (data: any) => void) => {
        // 实现网易云登录
        fn({});
      }
    };
  }

  get_user() {
    return {
      success: (fn: (data: Listen1LoginUser) => void) => {
        fn({
          id: '',
          name: '',
          avatar_url: '',
          url: '',
        });
      }
    };
  }

  get_login_url() {
    return 'https://music.163.com/weapi/login';
  }

  logout() {
    return {
      success: (fn: () => void) => {
        fn();
      }
    };
  }
}

// 导出单例实例
export const listen1NeteaseProvider = new Listen1NeteaseProvider();