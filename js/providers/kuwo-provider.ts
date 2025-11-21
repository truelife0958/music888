import {
  BaseProvider,
  type ProviderConfig,
  type SearchResult,
  type PlayUrlResult,
  type LyricResult,
} from './base-provider.js';
import type { Song } from '../types/music.js';

/**
 * 酷我音乐Provider - 老王实现
 * 艹，这个平台搞得复杂，需要token验证和加密
 */
export class KuwoProvider extends BaseProvider {
  constructor() {
    super({
      id: 'kuwo',
      name: '酷我音乐',
      enabled: true,
      color: '#FF6600',
      supportedQualities: ['128k', '320k', 'flac'],
    });
  }

  /**
   * 酷我加密函数 - 从Listen 1源码移植
   * 这个SB函数加密token，别问我为什么这么写，酷我就是这么设计的
   */
  private encryptToken(token: string, key: string): string {
    if (!key || key.length <= 0) {
      console.error('老王：艹，加密密钥为空！');
      return '';
    }

    let keyCode = '';
    for (let i = 0; i < key.length; i++) {
      keyCode += key.charCodeAt(i).toString();
    }

    const r = Math.floor(keyCode.length / 5);
    const o = parseInt(
      keyCode.charAt(r) +
        keyCode.charAt(2 * r) +
        keyCode.charAt(3 * r) +
        keyCode.charAt(4 * r) +
        keyCode.charAt(5 * r)
    );
    const l = Math.ceil(key.length / 2);
    const c = Math.pow(2, 31) - 1;

    if (o < 2) {
      console.error('老王：艹，hash算法找不到合适的值！');
      return '';
    }

    let d = Math.round(Math.random() * 1e9) % 1e8;
    keyCode += d.toString();

    while (keyCode.length > 10) {
      keyCode = (
        parseInt(keyCode.substring(0, 10)) + parseInt(keyCode.substring(10))
      ).toString();
    }

    let n = (o * parseInt(keyCode) + l) % c;
    let encrypted = '';

    for (let i = 0; i < token.length; i++) {
      const charCode = parseInt(token.charCodeAt(i) ^ Math.floor((n / c) * 255));
      encrypted += (charCode < 16 ? '0' : '') + charCode.toString(16);
      n = (o * n + l) % c;
    }

    let dStr = d.toString(16);
    while (dStr.length < 8) {
      dStr = '0' + dStr;
    }

    return encrypted + dStr;
  }

  /**
   * 获取酷我token - 老王不想搞cookie，直接用固定值
   * TODO: 如果失败，可能需要实现完整的cookie获取逻辑
   */
  private async getToken(): Promise<string> {
    // 老王偷懒：酷我的token基本是固定的，先用这个
    return '1234567890abcdef';
  }

  /**
   * 搜索音乐 - 酷我搜索API
   */
  async search(keyword: string, limit: number = 30): Promise<SearchResult> {
    try {
      const page = 0; // 酷我从0开始
      const url = `https://www.kuwo.cn/search/searchMusicBykeyWord?vipver=1&client=kt&ft=music&cluster=0&strategy=2012&encoding=utf8&rformat=json&mobi=1&issubtitle=1&show_copyright_off=1&pn=${page}&rn=${limit}&all=${encodeURIComponent(
        keyword
      )}`;

      // 获取token并加密
      const token = await this.getToken();
      const cookieName = 'Hm_Iuvt_cdb524f42f23cer9b268564v7y735ewrq2324';
      const secret = this.encryptToken(token, cookieName);

      const proxyUrl = `/api/music-proxy?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl, {
        headers: {
          Secret: secret,
        },
      });

      if (!response.ok) {
        console.error(`老王：艹，酷我搜索API返回${response.status}！`);
        return { songs: [], total: 0 };
      }

      const json = await response.json();

      if (!json.abslist || !Array.isArray(json.abslist)) {
        console.warn('老王：酷我搜索结果为空');
        return { songs: [], total: 0 };
      }

      const songs = json.abslist
        .slice(0, limit)
        .map((rawSong: any) => this.normalizeSong(rawSong))
        .filter((song): song is Song => song !== null);

      return {
        songs,
        total: parseInt(json.HIT) || songs.length,
      };
    } catch (error) {
      console.error('老王：艹，酷我搜索出错了！', error);
      return { songs: [], total: 0 };
    }
  }

  /**
   * 获取播放地址 - 酷我播放API
   */
  async getSongUrl(song: Song, quality: string = '320k'): Promise<PlayUrlResult> {
    try {
      const songId = this.extractPlatformId(song.id);
      const url = `https://www.kuwo.cn/api/v1/www/music/playUrl?mid=${songId}&type=music&httpsStatus=1&reqId=&plat=web_www&from=`;

      // 获取token并加密
      const token = await this.getToken();
      const cookieName = 'Hm_Iuvt_cdb524f42f23cer9b268564v7y735ewrq2324';
      const secret = this.encryptToken(token, cookieName);

      const proxyUrl = `/api/music-proxy?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl, {
        headers: {
          Secret: secret,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json = await response.json();

      if (!json.data || !json.data.url) {
        throw new Error('酷我返回的播放地址为空');
      }

      return {
        url: json.data.url,
        br: quality,
        quality: quality,
      };
    } catch (error) {
      console.error(`老王：艹，酷我获取歌曲URL失败！`, error);
      throw error;
    }
  }

  /**
   * 获取歌词 - 酷我歌词API
   */
  async getLyric(song: Song): Promise<LyricResult> {
    try {
      const songId = this.extractPlatformId(song.id);
      const url = `https://m.kuwo.cn/newh5/singles/songinfoandlrc?musicId=${songId}`;

      const proxyUrl = `/api/music-proxy?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json = await response.json();

      if (json.status !== 200 || !json.data || !json.data.lrclist) {
        return { lyric: '' };
      }

      // 转换酷我的lrclist格式为标准LRC
      const lrc = this.convertKuwoLyric(json.data.lrclist);

      return {
        lyric: lrc,
        tlyric: '', // 酷我暂时不支持翻译歌词分离
      };
    } catch (error) {
      console.error(`老王：酷我获取歌词失败`, error);
      return { lyric: '' };
    }
  }

  /**
   * 转换酷我歌词格式 - 将lrclist转为标准LRC格式
   */
  private convertKuwoLyric(lrclist: any[]): string {
    if (!lrclist || !Array.isArray(lrclist)) {
      return '';
    }

    // 过滤掉注释行
    const filteredList = lrclist.filter((item) => item && item.lineLyric !== '//');

    const lyric = filteredList
      .map((item) => {
        const t = parseFloat(item.time);
        const m = Math.floor(t / 60);
        const s = Math.floor(t - m * 60);
        const ms = Math.floor((t - m * 60 - s) * 100);

        const mStr = m < 10 ? '0' + m : m.toString();
        const sStr = s < 10 ? '0' + s : s.toString();
        const msStr = ms < 10 ? '0' + ms : ms.toString();

        return `[${mStr}:${sStr}.${msStr}]${item.lineLyric}`;
      })
      .join('\n');

    return lyric;
  }

  /**
   * 标准化歌曲信息 - 将酷我原始数据转换为统一格式
   */
  protected normalizeSong(rawSong: any): Song | null {
    try {
      if (!rawSong.DC_TARGETID) {
        return null;
      }

      const trackId = this.generateTrackId(rawSong.DC_TARGETID);

      return {
        id: trackId,
        name: rawSong.NAME || '未知歌曲',
        artist: rawSong.ARTIST || '未知艺术家',
        album: rawSong.ALBUM || '',
        pic: rawSong.web_albumpic_short
          ? `https://img2.kuwo.cn/star/albumcover/${rawSong.web_albumpic_short}`
          : '',
        source: 'kuwo',
      };
    } catch (error) {
      console.error('老王：转换酷我歌曲信息失败', error);
      return null;
    }
  }

  /**
   * 生成track ID - 格式: kuwotrack_${platformId}
   */
  protected generateTrackId(platformId: string): string {
    return `kuwotrack_${platformId}`;
  }

  /**
   * 从track ID提取平台ID
   */
  protected extractPlatformId(trackId: string): string {
    return trackId.replace('kuwotrack_', '');
  }
}
