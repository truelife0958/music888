/**
 * Bilibili音频Provider
 *
 * 老王实现：基于Bilibili公开API
 * 支持搜索音频、播放链接、简介（代替歌词）
 */

import { BaseProvider, ProviderError, type ProviderConfig } from './base-provider';
import type { Song } from '../api';

/**
 * Bilibili音频Provider
 */
export class BilibiliProvider extends BaseProvider {
  readonly id = 'bilibili';
  readonly name = 'Bilibili音频';
  readonly color = '#00A1D6';

  // Bilibili API端点
  private readonly endpoints = {
    search: 'https://api.bilibili.com/audio/music-service-c/s',
    audioInfo: 'https://www.bilibili.com/audio/music-service-c/web/song/info',
    audioUrl: 'https://api.bilibili.com/audio/music-service-c/url',
  };

  constructor(config: ProviderConfig = {}) {
    super(config);
  }

  /**
   * 搜索音频
   */
  async search(keyword: string, limit: number = 30): Promise<Song[]> {
    try {
      this.log(`搜索音频: ${keyword}`);

      // 构造搜索URL
      const url = `${this.endpoints.search}?search_type=music&page=1&pagesize=${limit}&keyword=${encodeURIComponent(keyword)}`;

      const response = await this.fetch(url);
      const data = await response.json();

      if (data.code !== 0 || !data.data?.result) {
        throw new Error('搜索失败或无结果');
      }

      const songs = data.data.result.map((item: any) => this.parseSong(item));

      this.log(`搜索成功，找到 ${songs.length} 首音频`);
      return songs;
    } catch (error) {
      this.error('搜索失败', error);
      throw new ProviderError(this.name, '搜索失败', error);
    }
  }

  /**
   * 获取音频播放URL
   */
  async getSongUrl(song: Song, quality: string = '320k'): Promise<{ url: string; br: string }> {
    try {
      this.log(`获取播放链接: ${song.name}`);

      const songId = song.id;

      // 获取音频URL
      const url = `${this.endpoints.audioUrl}?sid=${songId}&privilege=2&quality=2`;

      const response = await this.fetch(url);
      const data = await response.json();

      if (data.code !== 0 || !data.data?.cdns || data.data.cdns.length === 0) {
        throw new Error('无法获取播放链接');
      }

      // 使用第一个CDN链接
      const playUrl = data.data.cdns[0];

      this.log(`获取播放链接成功`);
      return { url: playUrl, br: quality };
    } catch (error) {
      this.error('获取播放链接失败', error);
      throw new ProviderError(this.name, '获取播放链接失败', error);
    }
  }

  /**
   * 获取音频简介（Bilibili音频没有标准歌词）
   */
  async getLyric(song: Song): Promise<{ lyric: string }> {
    try {
      this.log(`获取音频简介: ${song.name}`);

      const songId = song.lyric_id || song.id;
      const url = `${this.endpoints.audioInfo}?sid=${songId}`;

      const response = await this.fetch(url);
      const data = await response.json();

      if (data.code !== 0 || !data.data) {
        throw new Error('获取音频信息失败');
      }

      // Bilibili音频没有歌词，返回简介
      const intro = data.data.intro || '';
      const lyric = intro ? `[00:00.00]${intro}` : '';

      this.log(`获取音频简介成功`);
      return { lyric };
    } catch (error) {
      this.error('获取音频简介失败', error);
      return { lyric: '' };
    }
  }

  /**
   * 解析Bilibili音频数据为统一格式
   */
  private parseSong(data: any): Song {
    return {
      id: String(data.id || ''),
      name: data.title || '',
      artist: data.author ? [data.author] : data.uname ? [data.uname] : [],
      album: {
        id: '',
        name: '',
        pic: data.cover || '',
      },
      pic_id: '',
      lyric_id: String(data.id || ''),
      source: 'bilibili',
      // 额外信息
      duration: data.duration || 0,
      bvid: data.bvid || '',
      intro: data.intro || '',
    };
  }
}
