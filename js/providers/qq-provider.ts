/**
 * 老王集成：QQ音乐 Provider
 * 参考 Listen 1 实现
 */

import { BaseProvider, type SearchResult, type PlayUrlResult, type LyricResult } from './base-provider.js';
import type { Song } from '../api.js';
import { proxyFetch } from '../proxy-handler.js';
import { normalizeArtistField, normalizeSongName, normalizeAlbumName } from '../api.js';

export class QQProvider extends BaseProvider {
  constructor() {
    super({
      id: 'qq',
      name: 'QQ音乐',
      enabled: true,
      color: '#31C27C',
      supportedQualities: ['128k', '320k', 'flac'],
    });
  }

  /**
   * 搜索歌曲
   */
  async search(keyword: string, limit: number = 30): Promise<SearchResult> {
    try {
      const url = 'https://u.y.qq.com/cgi-bin/musicu.fcg';
      
      const reqData = {
        comm: {
          ct: 20,
          cv: 1577,
        },
        req_1: {
          method: 'DoSearchForQQMusicDesktop',
          module: 'music.search.SearchCgiService',
          param: {
            num_per_page: limit,
            page_num: 1,
            query: keyword,
            search_type: 0, // 0 = 单曲
          },
        },
      };

      const response = await proxyFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Referer': 'https://y.qq.com',
        },
        body: JSON.stringify(reqData),
      });

      const json = await response.json();
      
      if (!json.req_1 || !json.req_1.data || !json.req_1.data.body || !json.req_1.data.body.song || !json.req_1.data.body.song.list) {
        return { songs: [], total: 0 };
      }

      const songs: Song[] = json.req_1.data.body.song.list.map((rawSong: any) => this.normalizeSong(rawSong));
      
      return {
        songs: songs.filter((song) => this.isPlayable(song)),
        total: json.req_1.data.body.song.totalnum || songs.length,
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
      const url = 'https://u.y.qq.com/cgi-bin/musicu.fcg';
      
      // 音质配置
      const fileConfig: Record<string, { s: string; e: string; bitrate: string }> = {
        '128k': { s: 'M500', e: '.mp3', bitrate: '128kbps' },
        '320k': { s: 'M800', e: '.mp3', bitrate: '320kbps' },
        'flac': { s: 'F000', e: '.flac', bitrate: 'FLAC' },
      };
      
      const fileInfo = fileConfig[quality] || fileConfig['320k'];
      const file = fileInfo.s + songId + songId + fileInfo.e;
      
      const reqData = {
        req_1: {
          module: 'vkey.GetVkeyServer',
          method: 'CgiGetVkey',
          param: {
            filename: [file],
            guid: '10000',
            songmid: [songId],
            songtype: [0],
            uin: '0',
            loginflag: 1,
            platform: '20',
          },
        },
        loginUin: '0',
        comm: {
          uin: '0',
          format: 'json',
          ct: 24,
          cv: 0,
        },
      };

      const response = await proxyFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Referer': 'https://y.qq.com',
        },
        body: JSON.stringify(reqData),
      });

      const json = await response.json();
      
      if (json.req_1 && json.req_1.data && json.req_1.data.midurlinfo && json.req_1.data.midurlinfo[0]) {
        const purl = json.req_1.data.midurlinfo[0].purl;
        
        if (purl === '') {
          // VIP 歌曲或版权限制
          return { url: '', br: '' };
        }
        
        const sip = json.req_1.data.sip && json.req_1.data.sip[0] ? json.req_1.data.sip[0] : 'https://ws.stream.qqmusic.qq.com/';
        const playUrl = sip + purl;
        
        return {
          url: playUrl,
          br: fileInfo.bitrate,
          quality: quality,
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
      const url = 'https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?songmid=' + songId + '&g_tk=5381&format=json&inCharset=utf8&outCharset=utf-8&nobase64=1';

      const response = await proxyFetch(url, {
        headers: {
          'Referer': 'https://y.qq.com',
        },
      });

      const json = await response.json();
      
      const lyric = json.lyric || '';
      const tlyric = json.trans || '';

      return { lyric, tlyric };
    } catch (error) {
      this.handleError(error, '获取歌词');
      return { lyric: '' };
    }
  }

  /**
   * 判断歌曲是否可播放
   */
  isPlayable(song: any): boolean {
    if (!song.pay || !song.pay.pay_play) return true;
    // pay_play: 0=免费, 1=VIP
    return song.pay.pay_play === 0;
  }

  /**
   * 规范化 QQ 音乐歌曲数据
   */
  protected normalizeSong(rawSong: any): Song {
    const songId = rawSong.mid || rawSong.songmid;
    
    // 提取艺术家信息
    const singers = rawSong.singer || [];
    const artistNames = singers.map((s: any) => s.name || '未知艺术家');
    
    // 提取专辑信息
    const albumName = rawSong.album?.name || '未知专辑';
    const albumMid = rawSong.album?.mid || '';
    
    // QQ 音乐封面 URL 格式
    const picUrl = albumMid ? 'https://y.gtimg.cn/music/photo_new/T002R300x300M000' + albumMid + '.jpg' : '';
    
    return {
      id: this.generateTrackId(songId),
      name: normalizeSongName(rawSong.name || rawSong.songname),
      artist: normalizeArtistField(artistNames),
      album: normalizeAlbumName(albumName),
      pic_id: albumMid,
      lyric_id: songId,
      source: 'qq',
      duration: rawSong.interval ? rawSong.interval * 1000 : 0,
      pay: rawSong.pay,
      rawData: rawSong,
    } as Song;
  }
}
