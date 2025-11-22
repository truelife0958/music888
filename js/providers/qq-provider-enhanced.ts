/**
 * 增强版QQ音乐 Provider
 * 整合Listen 1的QQ音乐功能，包含完整的cookie管理和URL处理
 */

import { BaseProvider, type SearchResult, type PlayUrlResult, type LyricResult } from './base-provider.js';
import type { Song } from '../api.js';
import { proxyFetch, getProxiedUrl } from '../proxy-handler.js';
import { normalizeArtistField, normalizeSongName, normalizeAlbumName } from '../api.js';

export class QQProviderEnhanced extends BaseProvider {
  private cookies: string = '';
  private uin: string = '';
  private gtk: string = '';

  constructor() {
    super({
      id: 'qq',
      name: 'QQ音乐',
      enabled: true,
      color: '#31C27C',
      supportedQualities: ['128k', '192k', '320k', 'flac'],
    });
  }

  /**
   * 初始化 - 获取必要的cookies和gtk
   */
  private async initialize(): Promise<void> {
    try {
      // 访问QQ音乐主页获取基础cookies
      const homeResponse = await proxyFetch('https://y.qq.com/', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      }, 'qq');

      if (homeResponse.headers.get('set-cookie')) {
        this.cookies = homeResponse.headers.get('set-cookie') || '';
      }

      // 获取gtk token
      this.gtk = this.calculateGtk(this.cookies);
    } catch (error) {
      console.warn('[QQ音乐Provider] 初始化失败，使用默认设置:', error);
    }
  }

  /**
   * 计算GTK token
   */
  private calculateGtk(cookies: string): string {
    // 简化的gtk计算，实际应该使用QQ音乐算法
    const p_skey = this.extractCookieValue(cookies, 'p_skey') || '';
    if (!p_skey) return '';

    let hash = 5381;
    for (let i = 0; i < p_skey.length; i++) {
      hash += (hash << 5) + p_skey.charCodeAt(i);
    }
    return (hash & 0x7fffffff).toString();
  }

  /**
   * 提取cookie值
   */
  private extractCookieValue(cookies: string, name: string): string {
    const match = cookies.match(new RegExp('(?:^|; )' + name + '=([^;]+)'));
    return match ? match[1] : '';
  }

  /**
   * HTML解码
   */
  private htmlDecode(value: string): string {
    const parser = new DOMParser();
    return parser.parseFromString(value, 'text/html').body.textContent || '';
  }

  /**
   * 获取请求头
   */
  private getHeaders(): Record<string, string> {
    return {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://y.qq.com/',
      'Cookie': this.cookies,
    };
  }

  /**
   * 判断歌曲是否可播放
   */
  private isPlayableSong(song: any): boolean {
    if (!song.switch) return true;

    const switchFlag = song.switch.toString(2).split('');
    switchFlag.pop();
    switchFlag.reverse();

    // ["play_lq", "play_hq", "play_sq", "down_lq", "down_hq", "down_sq", "soso", "fav", "share", "bgm", "ring", "sing", "radio", "try", "give"]
    const playFlag = switchFlag[0];
    const tryFlag = switchFlag[13];

    return playFlag === '1' || tryFlag === '1';
  }

  /**
   * 获取QQ音乐图片URL
   */
  private getQQImageUrl(qqimgid: string, imgType: string): string {
    if (!qqimgid) return '';

    let category = '';
    if (imgType === 'artist') {
      category = 'T001R300x300M000';
    }
    if (imgType === 'album') {
      category = 'T002R300x300M000';
    }

    return `https://y.gtimg.cn/music/photo_new/${category}${qqimgid}.jpg`;
  }

  /**
   * 搜索歌曲
   */
  async search(keyword: string, limit: number = 30): Promise<SearchResult> {
    try {
      if (!this.cookies) {
        await this.initialize();
      }

      const url = 'https://c.y.qq.com/soso/fcgi-bin/client_search_cp';
      const params = new URLSearchParams({
        w: keyword,
        format: 'json',
        p: '1',
        n: String(limit),
        cr: '1',
        g_tk: this.gtk || '5381',
        loginUin: '0',
        hostUin: '0',
        inCharset: 'utf8',
        outCharset: 'utf-8',
        notice: '0',
        platform: 'yqq.json',
        needNewCode: '0',
        remoteplace: 'txt.yqq.song',
      });

      const response = await proxyFetch(`${url}?${params}`, {
        headers: this.getHeaders(),
      }, 'qq');

      const json = await response.json();

      if (!json.data || !json.data.song) {
        return { songs: [], total: 0 };
      }

      const songs: Song[] = json.data.song.list.map((rawSong: any) => this.normalizeSong(rawSong));

      return {
        songs: songs.filter((song) => this.isPlayable(song)),
        total: json.data.song.totalnum || songs.length,
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
      const songMid = this.extractPlatformId(song.id);

      // 音质映射
      const qualityMap: Record<string, string> = {
        '128k': 'M500',
        '192k': 'M800',
        '320k': 'M800',
        'flac': 'F000',
      };

      const qualityCode = qualityMap[quality] || 'M800';

      const url = 'https://u.y.qq.com/cgi-bin/musicu.fcg';
      const data = {
        req_0: {
          module: 'vkey.GetVkeyServer',
          method: 'CgiGetVkey',
          param: {
            guid: (Math.random() * 10000000000).toString(16).substr(0, 16),
            songmid: [songMid],
            songtype: [0],
            uin: '0',
            loginflag: 1,
            platform: '20',
          },
        },
      };

      const response = await proxyFetch(url, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }, 'qq');

      const json = await response.json();

      if (json.req_0 && json.req_0.data.midurlinfo && json.req_0.data.midurlinfo[0]) {
        const vkey = json.req_0.data.vkey;
        const purl = json.req_0.data.midurlinfo[0].purl;

        if (purl && vkey) {
          const playUrl = `http://dl.stream.qqmusic.qq.com/${purl}?guid=${json.req_0.data.guid}&vkey=${vkey}&uin=0&fromtag=66`;

          return {
            url: playUrl,
            br: quality,
            quality: quality,
          };
        }
      }

      // 尝试备用方案
      const fallbackUrl = `http://dl.stream.qqmusic.qq.com/C400${songMid}.m4a?guid=${(Math.random() * 10000000000).toString(16).substr(0, 16)}&vkey=&uin=0&fromtag=66`;

      return {
        url: fallbackUrl,
        br: quality,
        quality: quality,
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
      const songMid = this.extractPlatformId(song.id);
      const url = 'https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg';

      const params = new URLSearchParams({
        songmid: songMid,
        format: 'json',
        g_tk: this.gtk || '5381',
        loginUin: '0',
        hostUin: '0',
        inCharset: 'utf8',
        outCharset: 'utf-8',
        notice: '0',
        platform: 'yqq.json',
        needNewCode: '0',
      });

      const response = await proxyFetch(`${url}?${params}`, {
        headers: this.getHeaders(),
      }, 'qq');

      const json = await response.json();

      if (json.lyric) {
        // QQ音乐的歌词是base64编码的
        const lyric = this.htmlDecode(atob(json.lyric));
        const tlyric = json.trans ? this.htmlDecode(atob(json.trans)) : '';

        return { lyric, tlyric };
      }

      return { lyric: '' };
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
      const url = 'https://c.y.qq.com/v8/fcg-bin/fcg_v8_singer_track_cp.fcg';
      const params = new URLSearchParams({
        format: 'json',
        inCharset: 'utf8',
        outCharset: 'utf-8',
        notice: '0',
        platform: 'yqq.json',
        needNewCode: '0',
        singermid: artistId,
        order: 'listen',
        begin: '0',
        num: String(limit),
      });

      const response = await proxyFetch(`${url}?${params}`, {
        headers: this.getHeaders(),
      }, 'qq');

      const json = await response.json();

      if (!json.data || !json.data.list) {
        return { songs: [], total: 0 };
      }

      const songs: Song[] = json.data.list.map((item: any) => this.normalizeSong(item.musicData));

      return {
        songs: songs.filter((song) => this.isPlayable(song)),
        total: json.data.total || songs.length,
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
      const url = 'https://c.y.qq.com/qzone/fcg-bin/fcg_ucc_getcdinfo_byids_cp.fcg';
      const params = new URLSearchParams({
        format: 'json',
        inCharset: 'utf8',
        outCharset: 'utf-8',
        notice: '0',
        platform: 'h5',
        needNewCode: '1',
        type: 's',
        disstid: playlistId,
        json: '1',
        utf8: '1',
        onlysong: '0',
        newmedis: '1',
      });

      const response = await proxyFetch(`${url}?${params}`, {
        headers: this.getHeaders(),
      }, 'qq');

      const json = await response.json();

      if (!json.cdlist || !json.cdlist[0] || !json.cdlist[0].songlist) {
        return { songs: [], total: 0 };
      }

      const songs: Song[] = json.cdlist[0].songlist.map((rawSong: any) => this.normalizeSong(rawSong));

      return {
        songs: songs.filter((song) => this.isPlayable(song)),
        total: json.cdlist[0].total_song_num || songs.length,
      };
    } catch (error) {
      this.handleError(error, '获取歌单详情');
      return { songs: [], total: 0 };
    }
  }

  /**
   * 规范化QQ音乐歌曲数据
   */
  protected normalizeSong(rawSong: any): Song {
    const songMid = rawSong.songmid || rawSong.mid;
    const albumMid = rawSong.albummid || rawSong.album?.mid;

    // 提取艺术家信息
    const singers = rawSong.singer || [];
    const artistNames = singers.map((s: any) => this.htmlDecode(s.name));

    // 提取专辑信息
    const albumName = this.htmlDecode(rawSong.albumname || rawSong.album?.name || '未知专辑');

    return {
      id: this.generateTrackId(songMid),
      name: this.htmlDecode(rawSong.songname || rawSong.name),
      artist: normalizeArtistField(artistNames),
      album: normalizeAlbumName(albumName),
      pic_id: albumMid || '',
      lyric_id: songMid,
      source: 'qq',
      duration: rawSong.interval || rawSong.interval || 0,
      url: this.isPlayableSong(rawSong) ? '' : '', // 不可播放歌曲标记空URL
      rawData: rawSong,
    } as Song;
  }
}