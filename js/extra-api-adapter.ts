// js/extra-api-adapter.ts - 额外API源适配器
// 老王开发：支持多种不同格式的音乐API

import { Song, normalizeArtistField, normalizeSongName, normalizeAlbumName } from './api';

// 额外API源配置 - 老王更新：移除失效的cenguigui源，只保留有效的
export const EXTRA_API_SOURCES = {
  // 老王新增：网易歌榜API
  neteaseChart: {
    name: '网易歌榜',
    chart: 'https://node.api.xfabe.com/api/wangyi/musicChart',
  },
  // 老王新增：网易歌单API
  neteasePlaylist: {
    name: '网易歌单',
    userSongs: 'https://node.api.xfabe.com/api/wangyi/userSongs',
  },
};

// 老王清理：以下函数已删除（依赖失效的cenguigui API）
// - getQQDaily30, searchMiguMusic, searchXimalayaMusic
// - searchBilibiliMusic, getKugouPlaylist, aggregateSearch

/**
 * 老王新增：获取网易歌榜音乐
 * @param chartType 榜单类型：热歌榜、新歌榜、飙升榜、原创榜
 */
export async function getNetEaseChart(chartType: string): Promise<Song[]> {
  try {
    const url = `${EXTRA_API_SOURCES.neteaseChart.chart}?list=${encodeURIComponent(chartType)}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`API响应错误: ${response.status}`);
    }

    const data = await response.json();

    // 老王注释：根据API返回格式适配数据结构
    if (data && Array.isArray(data.data)) {
      return data.data
        .filter((song: any) => song && (song.id || song.songId))
        .map((song: any) => ({
          id: song.id || song.songId,
          name: normalizeSongName(song.name || song.songName || song.title),
          artist: normalizeArtistField(song.artist || song.singer || song.ar),
          album: normalizeAlbumName(song.album || song.al),
          pic_id: song.pic_id || song.albumId || '',
          lyric_id: song.lyric_id || song.id || '',
          source: 'netease',
        }));
    }

    return [];
  } catch (error) {
    console.error(`获取网易${chartType}失败:`, error);
    return [];
  }
}

/**
 * 老王新增：获取网易歌单音乐
 * @param uid 用户ID
 * @param limit 歌曲数量限制
 */
export async function getNetEaseUserPlaylist(uid: string, limit: number = 15): Promise<Song[]> {
  try {
    const url = `${EXTRA_API_SOURCES.neteasePlaylist.userSongs}?uid=${uid}&limit=${limit}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`API响应错误: ${response.status}`);
    }

    const data = await response.json();

    // 老王注释：根据API返回格式适配数据结构
    if (data && Array.isArray(data.data)) {
      return data.data
        .filter((song: any) => song && (song.id || song.songId))
        .map((song: any) => ({
          id: song.id || song.songId,
          name: normalizeSongName(song.name || song.songName || song.title),
          artist: normalizeArtistField(song.artist || song.singer || song.ar),
          album: normalizeAlbumName(song.album || song.al),
          pic_id: song.pic_id || song.albumId || '',
          lyric_id: song.lyric_id || song.id || '',
          source: 'netease',
        }));
    }

    return [];
  } catch (error) {
    console.error('获取网易歌单失败:', error);
    return [];
  }
}
