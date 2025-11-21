/**
 * 酷狗音乐Provider
 *
 * 老王实现：基于酷狗公开API
 * 支持搜索、播放链接、歌词获取
 */

import { BaseProvider, ProviderError, type ProviderConfig } from './base-provider';
import type { Song } from '../api';

/**
 * 酷狗音乐Provider
 */
export class KugouProvider extends BaseProvider {
  readonly id = 'kugou';
  readonly name = '酷狗音乐';
  readonly color = '#2CA2F9';

  // 酷狗API端点
  private readonly endpoints = {
    search: 'https://songsearch.kugou.com/song_search_v2',
    songUrl: 'https://wwwapi.kugou.com/yy/index.php',
    lyric: 'https://krcs.kugou.com/search',
    lyricDetail: 'https://lyrics.kugou.com/download',
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
      const url = `${this.endpoints.search}?keyword=${encodeURIComponent(keyword)}&page=1&pagesize=${limit}&filter=2`;

      const response = await this.fetch(url);
      const data = await response.json();

      if (!data.data?.lists) {
        throw new Error('搜索失败或无结果');
      }

      const songs = data.data.lists.map((item: any) => this.parseSong(item));

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

      // 酷狗使用hash获取播放链接
      const hash = song.id; // 酷狗的歌曲ID实际是hash

      const url = `${this.endpoints.songUrl}?r=play/getdata&hash=${hash}`;

      const response = await this.fetch(url);
      const data = await response.json();

      if (data.err_code !== 0 || !data.data?.play_url) {
        throw new Error('无法获取播放链接');
      }

      const playUrl = data.data.play_url.replace('http://', 'https://');

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

      const hash = song.lyric_id || song.id;

      // 第一步：搜索歌词
      const searchUrl = `${this.endpoints.lyric}?ver=1&man=yes&client=mobi&keyword=${encodeURIComponent(song.name)}&duration=${song.duration || ''}&hash=${hash}`;

      const searchResponse = await this.fetch(searchUrl);
      const searchData = await searchResponse.json();

      if (searchData.status !== 200 || !searchData.candidates || searchData.candidates.length === 0) {
        throw new Error('未找到歌词');
      }

      // 第二步：获取歌词详情
      const lyricId = searchData.candidates[0].id;
      const accesskey = searchData.candidates[0].accesskey;

      const lyricUrl = `${this.endpoints.lyricDetail}?ver=1&client=pc&id=${lyricId}&accesskey=${accesskey}&fmt=lrc&charset=utf8`;

      const lyricResponse = await this.fetch(lyricUrl);
      const lyricData = await lyricResponse.json();

      if (lyricData.status !== 200 || !lyricData.content) {
        throw new Error('获取歌词失败');
      }

      // 解码base64歌词
      const lyric = atob(lyricData.content);

      this.log(`获取歌词成功，长度: ${lyric.length}`);
      return { lyric };
    } catch (error) {
      this.error('获取歌词失败', error);
      return { lyric: '' };
    }
  }

  /**
   * 解析酷狗歌曲数据为统一格式
   */
  private parseSong(data: any): Song {
    return {
      id: data.FileHash || data.EMixSongID || '',
      name: data.SongName || data.FileName?.split(' - ')[1] || '',
      artist: data.SingerId
        ? [data.SingerName]
        : data.FileName
        ? [data.FileName.split(' - ')[0]]
        : [],
      album: {
        id: String(data.AlbumID || ''),
        name: data.AlbumName || '',
        pic: '',
      },
      pic_id: String(data.AlbumID || ''),
      lyric_id: data.FileHash || '',
      source: 'kugou',
      // 额外信息
      duration: data.Duration || 0,
      hash: data.FileHash || '',
    };
  }
}
