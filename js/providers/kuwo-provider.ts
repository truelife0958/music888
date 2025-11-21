/**
 * 酷我音乐Provider
 *
 * 老王实现：基于酷我音乐公开API
 * 支持搜索、播放链接、歌词获取
 */

import { BaseProvider, ProviderError, type ProviderConfig } from './base-provider';
import type { Song } from '../api';

/**
 * 酷我音乐Provider
 */
export class KuwoProvider extends BaseProvider {
  readonly id = 'kuwo';
  readonly name = '酷我音乐';
  readonly color = '#FF5722';

  // 酷我API端点
  private readonly endpoints = {
    search: 'https://www.kuwo.cn/api/www/search/searchMusicBykeyWord',
    songUrl: 'https://www.kuwo.cn/api/v1/www/music/playUrl',
    lyric: 'https://m.kuwo.cn/newh5/singles/songinfoandlrc',
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
      const url = `${this.endpoints.search}?key=${encodeURIComponent(keyword)}&pn=1&rn=${limit}`;

      const response = await this.fetch(url, {
        headers: {
          Referer: 'https://www.kuwo.cn/',
          'User-Agent': 'Mozilla/5.0',
        },
      });

      const data = await response.json();

      if (data.code !== 200 || !data.data?.list) {
        throw new Error('搜索失败或无结果');
      }

      const songs = data.data.list.map((item: any) => this.parseSong(item));

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

      const musicId = song.id;

      // 酷我音乐需要mid参数
      const url = `${this.endpoints.songUrl}?mid=${musicId}&type=convert_url3`;

      const response = await this.fetch(url, {
        headers: {
          Referer: 'https://www.kuwo.cn/',
          'User-Agent': 'Mozilla/5.0',
        },
      });

      const data = await response.json();

      if (data.code !== 200 || !data.data?.url) {
        throw new Error('无法获取播放链接');
      }

      const playUrl = data.data.url;

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

      const musicId = song.lyric_id || song.id;
      const url = `${this.endpoints.lyric}?musicId=${musicId}`;

      const response = await this.fetch(url, {
        headers: {
          Referer: 'https://m.kuwo.cn/',
          'User-Agent': 'Mozilla/5.0',
        },
      });

      const data = await response.json();

      if (data.status !== 200 || !data.data?.lrclist) {
        throw new Error('获取歌词失败');
      }

      // 酷我歌词格式：数组，需要转换为LRC格式
      const lrcList = data.data.lrclist;
      const lyric = lrcList
        .map((item: any) => `[${item.lineLyric}]${item.lineLyricContent || ''}`)
        .join('\n');

      this.log(`获取歌词成功，长度: ${lyric.length}`);
      return { lyric };
    } catch (error) {
      this.error('获取歌词失败', error);
      return { lyric: '' };
    }
  }

  /**
   * 解析酷我歌曲数据为统一格式
   */
  private parseSong(data: any): Song {
    return {
      id: String(data.rid || data.musicrid || ''),
      name: data.name || data.songName || '',
      artist: data.artist ? [data.artist] : data.artistName ? [data.artistName] : [],
      album: {
        id: String(data.albumid || ''),
        name: data.album || '',
        pic: data.albumpic || data.pic || '',
      },
      pic_id: String(data.albumid || ''),
      lyric_id: String(data.rid || data.musicrid || ''),
      source: 'kuwo',
      // 额外信息
      duration: data.duration || 0,
      rid: data.rid || '',
    };
  }
}
