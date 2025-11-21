/**
 * 老王集成：酷狗音乐 Provider
 * 参考 Listen 1 实现，简化并适配代理架构
 */

import { BaseProvider, type SearchResult, type PlayUrlResult, type LyricResult } from './base-provider.js';
import type { Song } from '../api.js';
import { proxyFetch } from '../proxy-handler.js';
import { normalizeArtistField, normalizeSongName, normalizeAlbumName } from '../api.js';

export class KugouProvider extends BaseProvider {
  constructor() {
    super({
      id: 'kugou',
      name: '酷狗音乐',
      enabled: true,
      color: '#2CA2F9',
      supportedQualities: ['128k', '320k', 'flac'],
    });
  }

  /**
   * 搜索歌曲
   */
  async search(keyword: string, limit: number = 30): Promise<SearchResult> {
    try {
      const url = 'https://songsearch.kugou.com/song_search_v2?keyword=' + encodeURIComponent(keyword) + '&page=1';

      const response = await proxyFetch(url, {
        headers: {
          'Referer': 'https://www.kugou.com',
        },
      });

      const json = await response.json();
      
      if (!json.data || !json.data.lists) {
        return { songs: [], total: 0 };
      }

      // 酷狗需要额外请求获取封面图
      const songs: Song[] = await Promise.all(
        json.data.lists.slice(0, limit).map((rawSong: any) => this.fetchSongDetail(rawSong))
      );
      
      return {
        songs: songs.filter((song) => song !== null),
        total: json.data.total || songs.length,
      };
    } catch (error) {
      this.handleError(error, '搜索歌曲');
      return { songs: [], total: 0 };
    }
  }

  /**
   * 获取歌曲详细信息（包括封面）
   */
  private async fetchSongDetail(rawSong: any): Promise<Song | null> {
    try {
      const hash = rawSong.FileHash;
      const detailUrl = 'https://www.kugou.com/yy/index.php?r=play/getdata&hash=' + hash;
      
      const response = await proxyFetch(detailUrl, {
        headers: {
          'Referer': 'https://www.kugou.com',
        },
      });

      const json = await response.json();
      
      if (json.data && json.data.img) {
        rawSong.img = json.data.img;
      }

      return this.normalizeSong(rawSong);
    } catch (error) {
      console.warn('[酷狗] 获取歌曲详情失败:', error);
      return this.normalizeSong(rawSong);
    }
  }

  /**
   * 获取播放 URL
   */
  async getSongUrl(song: Song, quality: string = '320k'): Promise<PlayUrlResult> {
    try {
      const songId = this.extractPlatformId(song.id);
      const url = 'https://m.kugou.com/app/i/getSongInfo.php?cmd=playInfo&hash=' + songId;

      const response = await proxyFetch(url, {
        headers: {
          'Referer': 'https://www.kugou.com',
        },
      });

      const json = await response.json();
      
      if (json.url && json.url !== '') {
        return {
          url: json.url,
          br: (json.bitRate || '128') + 'kbps',
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
      const albumId = (song as any).album_id || '';
      const url = 'https://wwwapi.kugou.com/yy/index.php?r=play/getdata&hash=' + songId + '&album_id=' + albumId;

      const response = await proxyFetch(url, {
        headers: {
          'Referer': 'https://www.kugou.com',
        },
      });

      const json = await response.json();
      
      const lyric = json.data?.lyrics || '';

      return { lyric };
    } catch (error) {
      this.handleError(error, '获取歌词');
      return { lyric: '' };
    }
  }

  /**
   * 规范化酷狗歌曲数据
   */
  protected normalizeSong(rawSong: any): Song {
    const hash = rawSong.FileHash;
    
    // 提取艺术家信息
    let artistName = rawSong.SingerName || '未知艺术家';
    if (rawSong.SingerName && rawSong.SingerName.includes('、')) {
      artistName = rawSong.SingerName.split('、')[0];
    }
    
    // 提取专辑信息
    const albumName = rawSong.AlbumName || '未知专辑';
    const albumId = rawSong.AlbumID || '';
    
    // 封面
    const cover = rawSong.img || '';
    
    return {
      id: this.generateTrackId(hash),
      name: normalizeSongName(rawSong.SongName),
      artist: normalizeArtistField([artistName]),
      album: normalizeAlbumName(albumName),
      pic_id: cover,
      lyric_id: hash,
      source: 'kugou',
      duration: (rawSong.Duration || 0) * 1000,
      album_id: albumId,
      rawData: rawSong,
    } as Song;
  }
}
