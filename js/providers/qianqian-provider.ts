/**
 * 千千音乐Provider（原百度音乐）
 *
 * 老王实现：基于千千音乐公开API
 * 支持搜索、播放链接、歌词获取
 */

import { BaseProvider, ProviderError, type ProviderConfig } from './base-provider';
import type { Song } from '../api';

/**
 * 千千音乐Provider
 */
export class QianqianProvider extends BaseProvider {
  readonly id = 'qianqian';
  readonly name = '千千音乐';
  readonly color = '#3F51B5';

  // 千千音乐API端点
  private readonly endpoints = {
    search: 'https://music.91q.com/v1/search',
    songUrl: 'https://music.91q.com/v1/song/tracklink',
    lyric: 'https://music.91q.com/v1/song/lyric',
  };

  constructor(config: ProviderConfig = {}) {
    super(config);
  }

  /**
   * 搜索歌曲
   */
  async search(keyword: string, limit: number = 30): Promise<Song[]> {
    try {
      this.log(`搜索歌曲: ${keyword}`);

      // 构造搜索URL
      const url = `${this.endpoints.search}?word=${encodeURIComponent(keyword)}&pn=1&rn=${limit}&type=1`;

      const response = await this.fetch(url, {
        headers: {
          Referer: 'https://music.91q.com/',
          'User-Agent': 'Mozilla/5.0',
        },
      });

      const data = await response.json();

      if (!data.data?.typeTrack) {
        throw new Error('搜索失败或无结果');
      }

      const songs = data.data.typeTrack.map((item: any) => this.parseSong(item));

      this.log(`搜索成功，找到 ${songs.length} 首歌曲`);
      return songs;
    } catch (error) {
      this.error('搜索失败', error);
      throw new ProviderError(this.name, '搜索失败', error);
    }
  }

  /**
   * 获取歌曲播放URL
   */
  async getSongUrl(song: Song, quality: string = '320k'): Promise<{ url: string; br: string }> {
    try {
      this.log(`获取播放链接: ${song.name}`);

      const songId = song.id;

      // 获取播放链接
      const url = `${this.endpoints.songUrl}?TSID=${songId}`;

      const response = await this.fetch(url, {
        headers: {
          Referer: 'https://music.91q.com/',
          'User-Agent': 'Mozilla/5.0',
        },
      });

      const data = await response.json();

      if (!data.data?.path) {
        throw new Error('无法获取播放链接');
      }

      const playUrl = data.data.path;

      this.log(`获取播放链接成功`);
      return { url: playUrl, br: quality };
    } catch (error) {
      this.error('获取播放链接失败', error);
      throw new ProviderError(this.name, '获取播放链接失败', error);
    }
  }

  /**
   * 获取歌词
   */
  async getLyric(song: Song): Promise<{ lyric: string }> {
    try {
      this.log(`获取歌词: ${song.name}`);

      const songId = song.lyric_id || song.id;
      const url = `${this.endpoints.lyric}?TSID=${songId}`;

      const response = await this.fetch(url, {
        headers: {
          Referer: 'https://music.91q.com/',
          'User-Agent': 'Mozilla/5.0',
        },
      });

      const data = await response.json();

      if (!data.data?.lrc) {
        throw new Error('获取歌词失败');
      }

      const lyric = data.data.lrc || '';

      this.log(`获取歌词成功，长度: ${lyric.length}`);
      return { lyric };
    } catch (error) {
      this.error('获取歌词失败', error);
      return { lyric: '' };
    }
  }

  /**
   * 解析千千音乐数据为统一格式
   */
  private parseSong(data: any): Song {
    return {
      id: String(data.TSID || data.id || ''),
      name: data.title || data.name || '',
      artist: data.artistName ? [data.artistName] : data.artist ? [data.artist] : [],
      album: {
        id: String(data.albumId || ''),
        name: data.albumTitle || data.album || '',
        pic: data.pic || data.albumPic || '',
      },
      pic_id: String(data.albumId || ''),
      lyric_id: String(data.TSID || data.id || ''),
      source: 'qianqian',
      // 额外信息
      duration: data.duration || 0,
      TSID: data.TSID || '',
    };
  }
}
