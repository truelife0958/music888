/**
 * 增强版网易云音乐 Provider
 * 整合Listen 1的完整加密解密功能，支持更稳定的API调用
 */

import { BaseProvider, type SearchResult, type PlayUrlResult, type LyricResult } from './base-provider.js';
import type { Song } from '../api.js';
import { proxyFetch, getProxiedUrl } from '../proxy-handler.js';
import { normalizeArtistField, normalizeSongName, normalizeAlbumName } from '../api.js';
import { NeteaseCrypto, CryptoUtils } from '../utils/crypto-utils.js';

export class NeteaseProviderEnhanced extends BaseProvider {
  private csrfToken: string = '';
  private cookies: string = '';

  constructor() {
    super({
      id: 'netease',
      name: '网易云音乐',
      enabled: true,
      color: '#EC4141',
      supportedQualities: ['128k', '192k', '320k', 'flac', 'hires'],
    });
  }

  /**
   * 初始化 - 获取必要的cookies和csrf token
   */
  private async initialize(): Promise<void> {
    try {
      // 访问主页获取基础cookies
      const homeResponse = await proxyFetch('https://music.163.com/', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      }, 'netease');

      if (homeResponse.headers.get('set-cookie')) {
        this.cookies = homeResponse.headers.get('set-cookie') || '';

        // 提取CSRF token
        const csrfMatch = this.cookies.match(/_csrf=([a-zA-Z0-9_-]+)/);
        if (csrfMatch) {
          this.csrfToken = csrfMatch[1];
        }
      }
    } catch (error) {
      console.warn('[网易云Provider] 初始化失败，使用默认设置:', error);
    }
  }

  /**
   * 获取请求头
   */
  private getHeaders(): Record<string, string> {
    return {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://music.163.com/',
      'Cookie': this.cookies,
      'Content-Type': 'application/x-www-form-urlencoded',
    };
  }

  /**
   * 搜索歌曲 - 使用Listen 1的weapi加密
   */
  async search(keyword: string, limit: number = 30): Promise<SearchResult> {
    try {
      if (!this.cookies) {
        await this.initialize();
      }

      const url = 'https://music.163.com/weapi/search/get';
      const data = NeteaseCrypto.weapi({
        s: keyword,
        type: 1, // 1 = 单曲
        limit: limit,
        offset: 0,
      });

      const response = await proxyFetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: new URLSearchParams(data as any),
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
      // 降级到简化搜索
      return this.fallbackSearch(keyword, limit);
    }
  }

  /**
   * 降级搜索方法
   */
  private async fallbackSearch(keyword: string, limit: number = 30): Promise<SearchResult> {
    try {
      const url = 'https://music.163.com/api/search/pc';
      const data = new URLSearchParams({
        s: keyword,
        type: '1',
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
      this.handleError(error, '降级搜索失败');
      return { songs: [], total: 0 };
    }
  }

  /**
   * 获取播放URL - 使用Listen 1的weapi加密
   */
  async getSongUrl(song: Song, quality: string = '320k'): Promise<PlayUrlResult> {
    try {
      const songId = this.extractPlatformId(song.id);

      // 音质映射
      const qualityMap: Record<string, number> = {
        '128k': 128000,
        '192k': 192000,
        '320k': 320000,
        'flac': 999000,
        'hires': 1999000,
      };

      const br = qualityMap[quality] || 320000;

      const url = 'https://music.163.com/weapi/song/enhance/player/url/v1?csrf_token=' + (this.csrfToken || '');

      const data = NeteaseCrypto.weapi({
        ids: [songId],
        level: 'standard', // standard, higher, exhigh, lossless, hires
        encodeType: 'aac',
        csrf_token: this.csrfToken,
      });

      const response = await proxyFetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: new URLSearchParams(data as any),
      }, 'netease');

      const json = await response.json();

      if (json.data && json.data[0] && json.data[0].url) {
        const resultUrl = json.data[0].url;
        const resultBr = json.data[0].br || br;
        const resultLevel = json.data[0].level || 'standard';

        return {
          url: resultUrl,
          br: Math.floor(resultBr / 1000) + 'kbps',
          quality: resultLevel,
        };
      }

      // 失败时尝试网易云直链
      const directUrl = `https://music.163.com/song/media/outer/url?id=${songId}.mp3`;
      return {
        url: directUrl,
        br: '128kbps',
        quality: '128k',
      };
    } catch (error) {
      this.handleError(error, '获取播放URL');
      return { url: '', br: '' };
    }
  }

  /**
   * 获取歌词 - 使用Listen 1的eapi加密
   */
  async getLyric(song: Song): Promise<LyricResult> {
    try {
      const songId = this.extractPlatformId(song.id);
      const url = 'https://music.163.com/api/song/lyric?id=' + songId + '&lv=-1&kv=-1&tv=-1';

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
   * 获取歌手信息和歌曲列表
   */
  async getArtistSongs(artistId: string, limit: number = 50): Promise<SearchResult> {
    try {
      const url = 'https://music.163.com/weapi/v1/artist/' + artistId;
      const data = NeteaseCrypto.weapi({
        limit: limit,
        offset: 0,
        total: true,
      });

      const response = await proxyFetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: new URLSearchParams(data as any),
      }, 'netease');

      const json = await response.json();

      if (!json.hotSongs) {
        return { songs: [], total: 0 };
      }

      const songs: Song[] = json.hotSongs.map((rawSong: any) => this.normalizeSong(rawSong));

      return {
        songs: songs.filter((song) => this.isPlayable(song)),
        total: json.artist?.songCount || songs.length,
      };
    } catch (error) {
      this.handleError(error, '获取歌手歌曲');
      return { songs: [], total: 0 };
    }
  }

  /**
   * 获取歌单详情
   */
  async getPlaylistDetail(playlistId: string): Promise<SearchResult> {
    try {
      const url = 'https://music.163.com/weapi/v3/playlist/detail';
      const data = NeteaseCrypto.weapi({
        id: playlistId,
        offset: 0,
        total: true,
        limit: 1000,
        n: 1000,
      });

      const response = await proxyFetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: new URLSearchParams(data as any),
      }, 'netease');

      const json = await response.json();

      if (!json.playlist || !json.playlist.tracks) {
        return { songs: [], total: 0 };
      }

      const songs: Song[] = json.playlist.tracks.map((rawSong: any) => this.normalizeSong(rawSong));

      return {
        songs: songs.filter((song) => this.isPlayable(song)),
        total: json.playlist.trackCount || songs.length,
      };
    } catch (error) {
      this.handleError(error, '获取歌单详情');
      return { songs: [], total: 0 };
    }
  }

  /**
   * 判断歌曲是否可播放
   * fee: 0=免费, 1=VIP, 4=付费专辑, 8=非会员可免费播放低音质
   */
  isPlayable(song: any): boolean {
    if (song.fee === undefined) return true;

    // 免费歌曲或非会员可播放歌曲
    if (song.fee === 0 || song.fee === 8) return true;

    // 检查是否VIP歌曲但有免费试听
    if (song.fee === 1 && song.vip) return false;

    // 付费专辑歌曲
    if (song.fee === 4) return false;

    return false;
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
      url: rawSong.url || '',
      rawData: rawSong,
    } as Song;
  }
}