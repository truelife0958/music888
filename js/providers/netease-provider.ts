/**
 * 老王集成：网易云音乐 Provider
 * 参考 Listen 1 实现，简化并适配代理架构
 */

import { BaseProvider, type SearchResult, type PlayUrlResult, type LyricResult } from './base-provider.js';
import type { Song } from '../api.js';
import { proxyFetch, getProxiedUrl } from '../proxy-handler.js';
import { normalizeArtistField, normalizeSongName, normalizeAlbumName } from '../api.js';

export class NeteaseProvider extends BaseProvider {
  constructor() {
    super({
      id: 'netease',
      name: '网易云音乐',
      enabled: true,
      color: '#EC4141',
      supportedQualities: ['128k', '192k', '320k', 'flac'],
    });
  }

  /**
   * 搜索歌曲
   */
  async search(keyword: string, limit: number = 30): Promise<SearchResult> {
    try {
      const url = 'https://music.163.com/api/search/pc';
      const data = new URLSearchParams({
        s: keyword,
        type: '1', // 1 = 单曲
        limit: String(limit),
        offset: '0',
      });

      const response = await proxyFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': 'https://music.163.com',
        },
        body: data,
      }, 'netease');

      const json = await response.json();
      
      if (!json.result || !json.result.songs) {
        return { songs: [], total: 0 };
      }

      const songs: Song[] = json.result.songs.map((rawSong: any) => this.normalizeSong(rawSong));
      
      return {
        songs: songs.filter((song) => this.isPlayable(song)),
        total: json.result.songCount || songs.length,
      };
    } catch (error) {
      this.handleError(error, '搜索歌曲');
      return { songs: [], total: 0 };
    }
  }

  /**
   * 获取播放 URL
   */
  async getSongUrl(song: Song, quality: string = '320k'): Promise<PlayUrlResult> {
    try {
      const songId = this.extractPlatformId(song.id);
      
      // 网易云音乐 URL 接口
      const url = 'https://music.163.com/weapi/song/enhance/player/url?csrf_token=';
      
      // 音质映射
      const qualityMap: Record<string, number> = {
        '128k': 128000,
        '192k': 192000,
        '320k': 320000,
        'flac': 999000,
      };
      
      const br = qualityMap[quality] || 320000;
      
      const data = new URLSearchParams({
        ids: '[' + songId + ']',
        br: String(br),
        csrf_token: '',
      });

      const response = await proxyFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': 'https://music.163.com',
        },
        body: data,
      }, 'netease');

      const json = await response.json();
      
      if (json.data && json.data[0] && json.data[0].url) {
        const resultUrl = json.data[0].url;
        const resultBr = json.data[0].br || br;
        
        return {
          url: resultUrl,
          br: Math.floor(resultBr / 1000) + 'kbps',
          quality: quality,
        };
      }

      // 失败时尝试网易云直链
      const directUrl = 'https://music.163.com/song/media/outer/url?id=' + songId + '.mp3';
      return {
        url: directUrl,
        br: '128kbps', // 直链通常是 128kbps
        quality: '128k',
      };
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
      const url = 'https://music.163.com/api/song/lyric?id=' + songId + '&lv=-1&tv=-1';

      const response = await proxyFetch(url, {
        headers: {
          'Referer': 'https://music.163.com',
        },
      }, 'netease');

      const json = await response.json();
      
      const lyric = json.lrc?.lyric || '';
      const tlyric = json.tlyric?.lyric || '';

      return { lyric, tlyric };
    } catch (error) {
      this.handleError(error, '获取歌词');
      return { lyric: '' };
    }
  }

  /**
   * 判断歌曲是否可播放
   * fee: 0=免费, 1=VIP, 4=付费专辑, 8=非会员可免费播放低音质
   */
  isPlayable(song: any): boolean {
    if (song.fee === undefined) return true;
    return song.fee === 0 || song.fee === 8;
  }

  /**
   * 规范化网易云歌曲数据
   */
  protected normalizeSong(rawSong: any): Song {
    const songId = String(rawSong.id);
    
    // 提取艺术家信息
    const artists = rawSong.artists || rawSong.ar || [];
    const artistNames = artists.map((a: any) => a.name || '未知艺术家');
    
    // 提取专辑信息
    const album = rawSong.album || rawSong.al || {};
    const albumName = album.name || '未知专辑';
    
    // 提取封面ID
    const picId = album.picStr || album.pic_str || String(album.picId || album.pic || '');
    
    return {
      id: this.generateTrackId(songId),
      name: normalizeSongName(rawSong.name),
      artist: normalizeArtistField(artistNames),
      album: normalizeAlbumName(albumName),
      pic_id: picId,
      lyric_id: songId,
      source: 'netease',
      duration: rawSong.duration || rawSong.dt || 0,
      fee: rawSong.fee,
      rawData: rawSong,
    } as Song;
  }
}
