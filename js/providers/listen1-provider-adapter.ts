/**
 * Listen1 Provider 适配器
 * 老王实现：将BaseProvider适配为Listen1BaseProvider接口
 *
 * 这个适配器遵循DRY原则，不重复造轮子！
 * 把现有的Promise风格Provider转换为Listen1的回调风格
 */

import { BaseProvider } from './base-provider.js';
import { Listen1BaseProvider, Listen1Track, Listen1SearchResult, Listen1Playlist } from './listen1-base-provider.js';
import type { Song } from '../api.js';

/**
 * Listen1 Provider 适配器类
 * 将BaseProvider适配为Listen1BaseProvider接口
 */
export class Listen1ProviderAdapter extends Listen1BaseProvider {
  private provider: BaseProvider;

  constructor(provider: BaseProvider) {
    super(provider.getName(), provider.getId());
    this.provider = provider;
  }

  /**
   * 搜索音乐 - 将Promise转换为回调
   */
  search(url: string): { success: (fn: (data: Listen1SearchResult) => void) => void } {
    return {
      success: async (fn: (data: Listen1SearchResult) => void) => {
        try {
          // 从URL解析参数
          const params = new URLSearchParams(url.split('?')[1] || '');
          const keywords = params.get('keywords') || '';
          const type = parseInt(params.get('type') || '0');
          const limit = 30;

          // 调用BaseProvider的search方法
          const result = await this.provider.search(keywords, limit);

          // 转换为Listen1格式
          const listen1Result: Listen1SearchResult = {
            result: result.songs.map((song) => this.songToListen1Track(song)),
            total: result.total,
            type: type === 0 ? 'song' : type === 1 ? 'artist' : 'playlist',
          };

          fn(listen1Result);
        } catch (error) {
          console.error(`[Listen1Adapter] ${this.name} 搜索失败:`, error);
          fn({ result: [], total: 0, type: 'song' });
        }
      }
    };
  }

  /**
   * 获取播放链接 - 将Promise转换为回调
   */
  bootstrap_track(
    track: Listen1Track,
    successCallback: (response: { url: string; bitrate: number; platform: string }) => void,
    failCallback: () => void
  ): void {
    (async () => {
      try {
        // 将Listen1Track转换为Song
        const song = this.listen1TrackToSong(track);

        // 调用BaseProvider的getSongUrl方法
        const result = await this.provider.getSongUrl(song, '320k');

        if (result.url) {
          // 提取数字bitrate
          const bitrateMatch = result.br.match(/(\d+)/);
          const bitrate = bitrateMatch ? parseInt(bitrateMatch[1]) : 128;

          successCallback({
            url: result.url,
            bitrate: bitrate,
            platform: this.provider.getId(),
          });
        } else {
          failCallback();
        }
      } catch (error) {
        console.error(`[Listen1Adapter] ${this.name} 获取播放URL失败:`, error);
        failCallback();
      }
    })();
  }

  /**
   * 获取歌词 - 将Promise转换为回调
   */
  lyric(url: string): { success: (fn: (data: { lyric: string; tlyric?: string }) => void) => void } {
    return {
      success: async (fn: (data: { lyric: string; tlyric?: string }) => void) => {
        try {
          // 从URL解析track_id
          const params = new URLSearchParams(url.split('?')[1] || '');
          const trackId = params.get('track_id') || '';

          // 创建临时Song对象
          const song: Song = {
            id: trackId,
            name: '',
            artist: [],
            album: '',
            pic_id: '',
            lyric_id: trackId,
            url: '',
            source: this.provider.getId(),
          };

          // 调用BaseProvider的getLyric方法
          const result = await this.provider.getLyric(song);

          fn({
            lyric: result.lyric,
            tlyric: result.tlyric,
          });
        } catch (error) {
          console.error(`[Listen1Adapter] ${this.name} 获取歌词失败:`, error);
          fn({ lyric: '' });
        }
      }
    };
  }

  /**
   * 获取歌单列表 - 暂不实现
   */
  show_playlist(url: string): { success: (fn: (data: { result: Listen1Playlist[] }) => void) => void } {
    return {
      success: (fn) => {
        console.warn(`[Listen1Adapter] ${this.name} show_playlist 未实现`);
        fn({ result: [] });
      }
    };
  }

  /**
   * 获取歌单详情 - 暂不实现
   */
  get_playlist(url: string): { success: (fn: (data: Listen1Playlist) => void) => void } {
    return {
      success: (fn) => {
        console.warn(`[Listen1Adapter] ${this.name} get_playlist 未实现`);
        fn({
          id: '',
          title: '',
          cover_img_url: '',
          source_url: '',
          tracks: [],
        });
      }
    };
  }

  /**
   * 解析URL - 暂不实现
   */
  parse_url(url: string): { success: (fn: (data: Listen1Track) => void) => void } {
    return {
      success: (fn) => {
        console.warn(`[Listen1Adapter] ${this.name} parse_url 未实现`);
        fn({
          id: '',
          title: '',
          artist: '',
          album: '',
          source: this.provider.getId(),
        });
      }
    };
  }

  /**
   * 获取歌单分类过滤器 - 暂不实现
   */
  get_playlist_filters(): any[] {
    return [];
  }

  /**
   * 登录相关 - 暂不实现
   */
  login(url: string): any {
    return {
      success: (fn: any) => fn({ status: 'fail', data: {} })
    };
  }

  get_user(): any {
    return {
      success: (fn: any) => fn({ status: 'fail', data: {} })
    };
  }

  get_login_url(): any {
    return '';
  }

  logout(): any {
    // 空实现
  }

  /**
   * 工具方法：将Song转换为Listen1Track
   */
  private songToListen1Track(song: Song): Listen1Track {
    return {
      id: song.id,
      title: song.name,
      artist: Array.isArray(song.artist) ? song.artist.join(', ') : song.artist,
      album: song.album || '',
      source: song.source,
      source_url: song.source_url || '',
      img_url: song.pic_url || '',
      url: song.url || '',
      disabled: song.disabled || false,
      duration: this.parseTime(song.time),
    };
  }

  /**
   * 工具方法：将Listen1Track转换为Song
   */
  private listen1TrackToSong(track: Listen1Track): Song {
    return {
      id: track.id,
      name: track.title,
      artist: track.artist.split(',').map(a => a.trim()),
      album: track.album,
      pic_id: track.id,
      lyric_id: track.id,
      url: track.url || '',
      source: track.source,
      source_url: track.source_url,
      pic_url: track.img_url,
      time: this.formatDuration(track.duration || 0),
      disabled: track.disabled || false,
    };
  }

  /**
   * 工具方法：解析时间字符串 "3:45" -> 225
   */
  private parseTime(timeStr?: string): number {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    if (parts.length === 2) {
      const minutes = parseInt(parts[0]);
      const seconds = parseInt(parts[1]);
      return minutes * 60 + seconds;
    }
    return 0;
  }

  /**
   * 工具方法：格式化时长 225 -> "3:45"
   */
  private formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}
