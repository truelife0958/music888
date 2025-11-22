/**
 * 咪咕音乐 Provider
 * 整合Listen 1的咪咕音乐功能，支持高质量音源
 */

import { BaseProvider, type SearchResult, type PlayUrlResult, type LyricResult } from './base-provider.js';
import type { Song } from '../api.js';
import { proxyFetch, getProxiedUrl } from '../proxy-handler.js';
import { normalizeArtistField, normalizeSongName, normalizeAlbumName } from '../api.js';
import { CryptoUtils } from '../utils/crypto-utils.js';

export class MiguProvider extends BaseProvider {
  private csrfToken: string = '';
  private deviceID: string = '';
  private channel: string = '0147351';

  constructor() {
    super({
      id: 'migu',
      name: '咪咕音乐',
      enabled: true,
      color: '#FF6D00',
      supportedQualities: ['128k', '192k', '320k', 'flac', 'hires'],
    });

    // 生成设备ID
    this.deviceID = this.generateDeviceID();
  }

  /**
   * 生成设备ID
   */
  private generateDeviceID(): string {
    // 生成类似手机设备ID的字符串
    const chars = 'abcdef0123456789';
    let result = '';
    for (let i = 0; i < 16; i++) {
      if (i === 4 || i === 6 || i === 8 || i === 10) {
        result += '-';
      }
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result.toUpperCase();
  }

  /**
   * 获取请求头
   */
  private getHeaders(): Record<string, string> {
    return {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      'Referer': 'https://music.migu.cn/',
      'Origin': 'https://music.migu.cn',
      'channel': this.channel,
      'deviceId': this.deviceID,
      'Content-Type': 'application/json;charset=utf-8',
    };
  }

  /**
   * 生成认证参数
   */
  private generateAuthParams(): Record<string, string> {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 8);

    return {
      timestamp,
      random,
      sign: this.generateSign(timestamp, random),
    };
  }

  /**
   * 生成签名
   */
  private generateSign(timestamp: string, random: string): string {
    // 咪咕签名算法（简化版）
    const key = '4b5f5f5f4f664c5349414e587f7b7474';
    const data = `timestamp=${timestamp}&random=${random}&key=${key}`;
    return CryptoUtils.md5(data).toUpperCase();
  }

  /**
   * 搜索歌曲
   */
  async search(keyword: string, limit: number = 30): Promise<SearchResult> {
    try {
      const url = 'https://app.c.nf.migu.cn/MIGUM3.0/v1.0/content/search_content.do';

      const params = new URLSearchParams({
        keyword,
        pageSize: String(limit),
        page: '1',
        searchSwitch: '{"song":1,"album":0,"singer":0,"tagSong":0,"mvSong":0,"songlist":0,"bestShow":1}',
        timestamp: Date.now().toString(),
      });

      const response = await proxyFetch(`${url}?${params}`, {
        headers: this.getHeaders(),
      }, 'migu');

      const json = await response.json();

      if (!json.songResultData || !json.songResultData.resultList) {
        return { songs: [], total: 0 };
      }

      const songs: Song[] = json.songResultData.resultList.map((rawSong: any) => this.normalizeSong(rawSong));

      return {
        songs: songs.filter((song) => this.isPlayable(song)),
        total: json.songResultData.totalCount || songs.length,
      };
    } catch (error) {
      this.handleError(error, '搜索歌曲');
      return { songs: [], total: 0 };
    }
  }

  /**
   * 获取播放URL
   */
  async getSongUrl(song: Song, quality: string = '320k'): Promise<PlayUrlResult> {
    try {
      const songData = song.rawData;
      const copyrightId = songData?.copyrightId || this.extractPlatformId(song.id);

      // 音质映射
      const qualityMap: Record<string, string> = {
        '128k': 'SQ',
        '192k': 'SQ',
        '320k': 'SQ',
        'flac': 'ZQ',
        'hires': 'ZQ24',
      };

      const toneFlag = qualityMap[quality] || 'SQ';

      // 咪咕音乐的播放URL接口
      const url = 'https://app.c.nf.migu.cn/MIGUM2.0/v1.0/content/resub.do';

      const params = new URLSearchParams({
        copyrightId: copyrightId.toString(),
        resType: '2', // 音频类型
        toneFlag: toneFlag,
      });

      const authParams = this.generateAuthParams();
      Object.keys(authParams).forEach(key => {
        params.append(key, authParams[key]);
      });

      const response = await proxyFetch(`${url}?${params}`, {
        headers: this.getHeaders(),
      }, 'migu');

      const json = await response.json();

      if (json.data && json.data.playUrl) {
        return {
          url: json.data.playUrl,
          br: this.mapMiguQuality(quality),
          quality: quality,
        };
      }

      // 备用方案：尝试其他音质
      const fallbackQualities = ['SQ', 'PQ', 'HQ'];
      for (const q of fallbackQualities) {
        try {
          const fallbackParams = new URLSearchParams({
            copyrightId: copyrightId.toString(),
            resType: '2',
            toneFlag: q,
          });

          const fallbackResponse = await proxyFetch(`${url}?${fallbackParams}`, {
            headers: this.getHeaders(),
          }, 'migu');

          const fallbackJson = await fallbackResponse.json();

          if (fallbackJson.data && fallbackJson.data.playUrl) {
            return {
              url: fallbackJson.data.playUrl,
              br: this.mapMiguQuality(q),
              quality: q,
            };
          }
        } catch (fallbackError) {
          console.warn(`[咪咕Provider] 音质${q}获取失败:`, fallbackError);
          continue;
        }
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
      const songData = song.rawData;
      const copyrightId = songData?.copyrightId || this.extractPlatformId(song.id);

      const url = 'https://app.c.nf.migu.cn/MIGUM2.0/v1.0/content/lyric.do';

      const params = new URLSearchParams({
        copyrightId: copyrightId.toString(),
      });

      const response = await proxyFetch(`${url}?${params}`, {
        headers: this.getHeaders(),
      }, 'migu');

      const json = await response.json();

      const lyric = json.lyric || '';
      const tlyric = json.transLyric || '';

      return { lyric, tlyric };
    } catch (error) {
      this.handleError(error, '获取歌词');
      return { lyric: '' };
    }
  }

  /**
   * 获取歌手信息
   */
  async getArtistSongs(artistId: string, limit: number = 50): Promise<SearchResult> {
    try {
      const url = 'https://app.c.nf.migu.cn/MIGUM2.0/v1.0/content/singer_content.do';

      const params = new URLSearchParams({
        singerId: artistId,
        pageSize: String(limit),
        page: '1',
      });

      const response = await proxyFetch(`${url}?${params}`, {
        headers: this.getHeaders(),
      }, 'migu');

      const json = await response.json();

      if (!json.singerSongList || !json.singerSongList.list) {
        return { songs: [], total: 0 };
      }

      const songs: Song[] = json.singerSongList.list.map((rawSong: any) => this.normalizeSong(rawSong));

      return {
        songs: songs.filter((song) => this.isPlayable(song)),
        total: json.singerSongList.totalCount || songs.length,
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
      const url = 'https://app.c.nf.migu.cn/MIGUM2.0/v1.0/user/queryMusicListSongs.do';

      const params = new URLSearchParams({
        musicListId: playlistId,
        pageSize: '1000',
        pageNo: '1',
      });

      const response = await proxyFetch(`${url}?${params}`, {
        headers: this.getHeaders(),
      }, 'migu');

      const json = await response.json();

      if (!json.list) {
        return { songs: [], total: 0 };
      }

      const songs: Song[] = json.list.map((rawSong: any) => this.normalizeSong(rawSong));

      return {
        songs: songs.filter((song) => this.isPlayable(song)),
        total: songs.length,
      };
    } catch (error) {
      this.handleError(error, '获取歌单详情');
      return { songs: [], total: 0 };
    }
  }

  /**
   * 映射咪咕音质
   */
  private mapMiguQuality(quality: string): string {
    const qualityMap: Record<string, string> = {
      'SQ': '320kbps',
      'ZQ': 'flac',
      'ZQ24': 'hires',
      'PQ': '192kbps',
      'HQ': '128kbps',
      'LQ': '96kbps',
    };

    return qualityMap[quality] || '320kbps';
  }

  /**
   * 判断歌曲是否可播放
   */
  isPlayable(song: any): boolean {
    if (song.copyright === 0) return false;
    if (!song.rawData || song.rawData.copyright === 0) return false;
    return true;
  }

  /**
   * 规范化咪咕歌曲数据
   */
  protected normalizeSong(rawSong: any): Song {
    const copyrightId = rawSong.copyrightId || rawSong.id;

    // 提取艺术家信息
    const artists = rawSong.artists || rawSong.singerList || [];
    const artistNames = artists.map((a: any) => a.name || '未知艺术家');

    // 提取专辑信息
    const albumName = rawSong.album || rawSong.albumName || '未知专辑';

    // 提取封面图片
    let picId = '';
    if (rawSong.albumImgs && rawSong.albumImgs[1]) {
      picId = rawSong.albumImgs[1].img;
    } else if (rawSong.img1) {
      picId = rawSong.img1;
    }

    return {
      id: this.generateTrackId(String(copyrightId)),
      name: normalizeSongName(rawSong.songName),
      artist: normalizeArtistField(artistNames),
      album: normalizeAlbumName(albumName),
      pic_id: picId,
      lyric_id: String(copyrightId),
      source: 'migu',
      duration: rawSong.duration || rawSong.timeLength || 0,
      url: rawSong.copyright === 0 ? '' : '',
      rawData: rawSong,
    } as Song;
  }
}