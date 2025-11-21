/**
 * 老王集成：Bilibili Provider
 * B站音频区，版权互补资源
 */

import { BaseProvider, type SearchResult, type PlayUrlResult, type LyricResult } from './base-provider.js';
import type { Song } from '../api.js';
import { proxyFetch } from '../proxy-handler.js';
import { normalizeArtistField, normalizeSongName, normalizeAlbumName } from '../api.js';

export class BilibiliProvider extends BaseProvider {
  constructor() {
    super({
      id: 'bilibili',
      name: 'Bilibili音频',
      enabled: true,
      color: '#00A1D6',
      supportedQualities: ['128k', '192k'],
    });
  }

  /**
   * 搜索歌曲（B站音频区）
   */
  async search(keyword: string, limit: number = 30): Promise<SearchResult> {
    try {
      const url = 'https://api.bilibili.com/audio/music-service-c/s';
      
      const params = new URLSearchParams({
        search_type: 'music',
        page: '1',
        pagesize: String(limit),
        keyword: keyword,
      });

      const response = await proxyFetch(url + '?' + params.toString(), {
        headers: {
          'Referer': 'https://www.bilibili.com',
        },
      }, 'bilibili');

      const json = await response.json();
      
      if (!json.data || !json.data.result) {
        return { songs: [], total: 0 };
      }

      const songs: Song[] = json.data.result.map((rawSong: any) => this.normalizeSong(rawSong));
      
      return {
        songs,
        total: json.data.totalCount || songs.length,
      };
    } catch (error) {
      this.handleError(error, '搜索歌曲');
      return { songs: [], total: 0 };
    }
  }

  /**
   * 获取播放 URL
   */
  async getSongUrl(song: Song, quality: string = '192k'): Promise<PlayUrlResult> {
    try {
      const songId = this.extractPlatformId(song.id);
      const url = 'https://www.bilibili.com/audio/music-service-c/web/url?sid=' + songId;

      const response = await proxyFetch(url, {
        headers: {
          'Referer': 'https://www.bilibili.com',
        },
      }, 'bilibili');

      const json = await response.json();
      
      if (json.data && json.data.cdns && json.data.cdns.length > 0) {
        // B站返回多个CDN链接，选择第一个
        const playUrl = json.data.cdns[0];
        
        return {
          url: playUrl,
          br: '192kbps', // B站默认192k
          quality: '192k',
        };
      }

      return { url: '', br: '' };
    } catch (error) {
      this.handleError(error, '获取播放URL');
      return { url: '', br: '' };
    }
  }

  /**
   * 获取歌词
   */
  async getLyric(song: Song): Promise<LyricResult> {
    try {
      const songId = this.extractPlatformId(song.id);
      const url = 'https://www.bilibili.com/audio/music-service-c/web/song/info?sid=' + songId;

      const response = await proxyFetch(url, {
        headers: {
          'Referer': 'https://www.bilibili.com',
        },
      }, 'bilibili');

      const json = await response.json();
      
      const lyric = json.data?.lyric || '';

      return { lyric };
    } catch (error) {
      this.handleError(error, '获取歌词');
      return { lyric: '' };
    }
  }

  /**
   * 判断歌曲是否可播放
   */
  isPlayable(song: any): boolean {
    // B站音频区通常都可播放
    return true;
  }

  /**
   * 规范化 Bilibili 歌曲数据
   */
  protected normalizeSong(rawSong: any): Song {
    const songId = String(rawSong.id);
    
    // B站音频区艺术家信息
    const artistName = rawSong.author || '未知艺术家';
    
    // 提取封面
    const cover = rawSong.cover || '';
    
    return {
      id: this.generateTrackId(songId),
      name: normalizeSongName(rawSong.title),
      artist: normalizeArtistField([artistName]),
      album: normalizeAlbumName('Bilibili音频'),
      pic_id: cover,
      lyric_id: songId,
      source: 'bilibili',
      duration: rawSong.duration ? rawSong.duration * 1000 : 0,
      rawData: rawSong,
    } as Song;
  }
}
