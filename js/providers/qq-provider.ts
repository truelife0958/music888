/**
 * QQ音乐Provider
 *
 * 老王实现：基于QQ音乐公开API
 * 支持搜索、播放链接、歌词获取
 */

import { BaseProvider, ProviderError, type ProviderConfig } from './base-provider';
import type { Song } from '../api';

/**
 * QQ音乐Provider
 */
export class QQMusicProvider extends BaseProvider {
  readonly id = 'qq';
  readonly name = 'QQ音乐';
  readonly color = '#31C27C';

  // QQ音乐API端点
  private readonly endpoints = {
    search: 'https://c.y.qq.com/soso/fcgi-bin/client_search_cp',
    songUrl: 'https://u.y.qq.com/cgi-bin/musicu.fcg',
    lyric: 'https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg',
    songDetail: 'https://u.y.qq.com/cgi-bin/musicu.fcg',
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
      const url = `${this.endpoints.search}?w=${encodeURIComponent(keyword)}&p=1&n=${limit}&format=json`;

      const response = await this.fetch(url);
      const data = await response.json();

      if (data.code !== 0 || !data.data?.song?.list) {
        throw new Error('搜索失败或无结果');
      }

      const songs = data.data.song.list.map((item: any) => this.parseSong(item));

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

      const songMid = song.id;

      // 使用QQ音乐的获取vkey接口
      const requestData = {
        req_0: {
          module: 'vkey.GetVkeyServer',
          method: 'CgiGetVkey',
          param: {
            guid: '0',
            songmid: [songMid],
            songtype: [0],
            uin: '0',
            loginflag: 1,
            platform: '20',
          },
        },
      };

      const url = `${this.endpoints.songUrl}?data=${encodeURIComponent(JSON.stringify(requestData))}`;

      const response = await this.fetch(url);
      const data = await response.json();

      if (data.req_0?.data?.midurlinfo?.[0]?.purl) {
        const purl = data.req_0.data.midurlinfo[0].purl;
        const sip = data.req_0.data.sip?.[0] || 'http://ws.stream.qqmusic.qq.com/';
        const playUrl = sip + purl;

        this.log(`获取播放链接成功`);
        return { url: playUrl, br: quality };
      }

      throw new Error('无法获取播放链接');
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
      const url = `${this.endpoints.lyric}?songmid=${songId}&format=json&nobase64=1`;

      const response = await this.fetch(url, {
        headers: {
          Referer: 'https://y.qq.com/',
        },
      });

      const data = await response.json();

      if (data.retcode !== 0) {
        throw new Error('获取歌词失败');
      }

      // QQ音乐歌词可能是base64编码的
      const lyric = data.lyric || '';

      this.log(`获取歌词成功，长度: ${lyric.length}`);
      return { lyric };
    } catch (error) {
      this.error('获取歌词失败', error);
      return { lyric: '' };
    }
  }

  /**
   * 解析QQ音乐歌曲数据为统一格式
   */
  private parseSong(data: any): Song {
    return {
      id: data.songmid || String(data.songid || ''),
      name: data.songname || data.name || '',
      artist: data.singer
        ? data.singer.map((s: any) => s.name)
        : data.artist
        ? [data.artist]
        : [],
      album: {
        id: String(data.albummid || data.albumid || ''),
        name: data.albumname || '',
        pic: data.albummid
          ? `https://y.gtimg.cn/music/photo_new/T002R300x300M000${data.albummid}.jpg`
          : '',
      },
      pic_id: String(data.albummid || ''),
      lyric_id: data.songmid || String(data.songid || ''),
      source: 'qq',
      // 额外信息
      duration: data.interval || 0,
      mvId: data.vid || '',
    };
  }
}
