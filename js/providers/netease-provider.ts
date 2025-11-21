/**
 * 网易云音乐Provider
 *
 * 老王实现：基于网易云公开API
 * 支持搜索、播放链接、歌词获取
 */

import { BaseProvider, ProviderError, type ProviderConfig } from './base-provider';
import type { Song } from '../api';

/**
 * 网易云音乐Provider
 */
export class NeteaseProvider extends BaseProvider {
  readonly id = 'netease';
  readonly name = '网易云音乐';
  readonly color = '#C20C0C';

  // 网易云API端点
  private readonly endpoints = {
    search: 'https://music.163.com/api/search/get/web',
    songDetail: 'https://music.163.com/api/song/detail',
    songUrl: 'https://music.163.com/song/media/outer/url',
    lyric: 'https://music.163.com/api/song/lyric',
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
      const url = `${this.endpoints.search}?s=${encodeURIComponent(keyword)}&type=1&limit=${limit}&offset=0`;

      const response = await this.fetch(url);
      const data = await response.json();

      if (data.code !== 200 || !data.result?.songs) {
        throw new Error('搜索失败或无结果');
      }

      const songs = data.result.songs.map((item: any) => this.parseSong(item));

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

      // 网易云外链URL（有限制，但简单可用）
      const songId = song.id;
      const url = `${this.endpoints.songUrl}?id=${songId}.mp3`;

      // 验证URL是否有效（尝试HEAD请求）
      try {
        const headResponse = await fetch(url, { method: 'HEAD' });
        if (headResponse.ok) {
          this.log(`获取播放链接成功`);
          return { url, br: quality };
        }
      } catch (e) {
        // HEAD请求失败，可能是跨域问题，直接返回URL试试
      }

      // 返回URL（即使验证失败也返回，让播放器尝试）
      return { url, br: quality };
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
      const url = `${this.endpoints.lyric}?id=${songId}&lv=-1&kv=-1&tv=-1`;

      const response = await this.fetch(url);
      const data = await response.json();

      if (data.code !== 200) {
        throw new Error('获取歌词失败');
      }

      const lyric = data.lrc?.lyric || '';

      this.log(`获取歌词成功，长度: ${lyric.length}`);
      return { lyric };
    } catch (error) {
      this.error('获取歌词失败', error);
      // 歌词获取失败不抛出异常，返回空字符串
      return { lyric: '' };
    }
  }

  /**
   * 获取歌曲详情
   */
  async getSongInfo(songId: string): Promise<Song | null> {
    try {
      this.log(`获取歌曲详情: ${songId}`);

      const url = `${this.endpoints.songDetail}?ids=[${songId}]`;

      const response = await this.fetch(url);
      const data = await response.json();

      if (data.code !== 200 || !data.songs || data.songs.length === 0) {
        throw new Error('获取歌曲详情失败');
      }

      const song = this.parseSong(data.songs[0]);

      this.log(`获取歌曲详情成功`);
      return song;
    } catch (error) {
      this.error('获取歌曲详情失败', error);
      return null;
    }
  }

  /**
   * 解析网易云歌曲数据为统一格式
   */
  private parseSong(data: any): Song {
    return {
      id: String(data.id || ''),
      name: data.name || '',
      artist: data.artists ? data.artists.map((a: any) => a.name) : [],
      album: {
        id: String(data.album?.id || ''),
        name: data.album?.name || '',
        pic: data.album?.picUrl || data.album?.blurPicUrl || '',
      },
      pic_id: String(data.album?.id || ''),
      lyric_id: String(data.id || ''),
      source: 'netease',
      // 额外信息
      duration: data.duration || 0,
      mvId: data.mvid || 0,
    };
  }
}
