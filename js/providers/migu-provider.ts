/**
 * 咪咕音乐Provider
 *
 * 老王实现：基于咪咕音乐公开API
 * 支持搜索、播放链接、歌词获取
 */

import { BaseProvider, ProviderError, type ProviderConfig } from './base-provider';
import type { Song } from '../api';

/**
 * 咪咕音乐Provider
 */
export class MiguProvider extends BaseProvider {
  readonly id = 'migu';
  readonly name = '咪咕音乐';
  readonly color = '#FF6600';

  // 咪咕API端点
  private readonly endpoints = {
    search: 'https://m.music.migu.cn/migu/remoting/scr_search_tag',
    songDetail: 'https://m.music.migu.cn/migu/remoting/cms_detail_tag',
    lyric: 'https://music.migu.cn/v3/api/music/audioPlayer/getLyric',
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
      const url = `${this.endpoints.search}?keyword=${encodeURIComponent(keyword)}&pgc=${limit}&type=2`;

      const response = await this.fetch(url);
      const data = await response.json();

      if (!data.musics) {
        throw new Error('搜索失败或无结果');
      }

      const songs = data.musics.map((item: any) => this.parseSong(item));

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

      const copyrightId = song.id;

      // 获取歌曲详情
      const detailUrl = `${this.endpoints.songDetail}?cpid=${copyrightId}`;
      const detailResponse = await this.fetch(detailUrl);
      const detailData = await detailResponse.json();

      if (!detailData.data || !detailData.data.playUrl) {
        throw new Error('无法获取播放链接');
      }

      // 咪咕的播放链接可能需要替换为https
      let playUrl = detailData.data.playUrl;
      if (playUrl.startsWith('http://')) {
        playUrl = playUrl.replace('http://', 'https://');
      }

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

      const copyrightId = song.lyric_id || song.id;
      const url = `${this.endpoints.lyric}?copyrightId=${copyrightId}`;

      const response = await this.fetch(url);
      const data = await response.json();

      if (!data.lyric) {
        throw new Error('获取歌词失败');
      }

      const lyric = data.lyric || '';

      this.log(`获取歌词成功，长度: ${lyric.length}`);
      return { lyric };
    } catch (error) {
      this.error('获取歌词失败', error);
      return { lyric: '' };
    }
  }

  /**
   * 解析咪咕歌曲数据为统一格式
   */
  private parseSong(data: any): Song {
    return {
      id: data.copyrightId || data.id || '',
      name: data.songName || data.title || '',
      artist: data.singerName ? [data.singerName] : data.singers ? data.singers.map((s: any) => s.name) : [],
      album: {
        id: String(data.albumId || ''),
        name: data.albumName || '',
        pic: data.cover || data.albumPicUrl || '',
      },
      pic_id: String(data.albumId || ''),
      lyric_id: data.copyrightId || data.id || '',
      source: 'migu',
      // 额外信息
      duration: data.length || 0,
      copyrightId: data.copyrightId || '',
    };
  }
}
