// js/extra-api-adapter.ts - 额外API源适配器
// 老王开发：支持多种不同格式的音乐API

import { Song, normalizeArtistField, normalizeSongName, normalizeAlbumName } from './api';

// 额外API源配置
export const EXTRA_API_SOURCES = {
    // 咪咕音乐API
    migu: {
        name: '咪咕音乐API',
        search: 'https://api.cenguigui.cn/api/mg_music/',
        single: 'https://api.cenguigui.cn/api/mg_music/api.php'
    },
    // 网易云音乐API
    netease: {
        name: '网易云音乐API',
        single: 'https://api.cenguigui.cn/api/netease/music_v1.php'
    },
    // Bilibili音乐API
    bilibili: {
        name: 'Bilibili音乐API',
        search: 'https://api.cenguigui.cn/api/bilibili/bilibili.php'
    },
    // 酷狗音乐API
    kugou: {
        name: '酷狗音乐API',
        playlist: 'https://api.cenguigui.cn/api/kugou/api.php'
    },
    // 酷我音乐API
    kuwo: {
        name: '酷我音乐API',
        single: 'https://api.cenguigui.cn/api/kuwo/'
    },
    // 喜马拉雅音乐API
    ximalaya: {
        name: '喜马拉雅音乐API',
        search: 'https://api.cenguigui.cn/api/music/dg_ximalayamusic.php',
        detail: 'https://api.cenguigui.cn/api/music/ximalaya.php'
    },
    // QQ音乐每日推荐API
    qqDaily: {
        name: 'QQ音乐每日推荐',
        daily: 'https://api.cenguigui.cn/api/qq/music/Daily30.php'
    },
    // 老王新增：抖音热歌榜API
    douyinHot: {
        name: '抖音热歌榜',
        hot: 'https://api.cenguigui.cn/api/hotlist/dy/'
    },
    // 老王新增：网易歌榜API
    neteaseChart: {
        name: '网易歌榜',
        chart: 'https://node.api.xfabe.com/api/wangyi/musicChart'
    },
    // 老王新增：网易歌单API
    neteasePlaylist: {
        name: '网易歌单',
        userSongs: 'https://node.api.xfabe.com/api/wangyi/userSongs'
    }
};

/**
 * 获取QQ音乐每日推荐（30首）
 */
export async function getQQDaily30(): Promise<Song[]> {
    try {
        const url = EXTRA_API_SOURCES.qqDaily.daily;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`API响应错误: ${response.status}`);
        }

        const data = await response.json();

        // 老王修复BUG-API-001：过滤无效数据并规范化
        // 老王优化BUG-API-003：使用api.ts统一规范化函数，杜绝重复造轮子
        if (data && Array.isArray(data.data)) {
            return data.data
                .filter((song: any) => song && (song.id || song.songid || song.mid))  // 过滤空元素和无ID的歌曲
                .map((song: any) => ({
                    id: song.id || song.songid || song.mid,
                    name: normalizeSongName(song.name || song.songname),
                    artist: normalizeArtistField(song.singer || song.artist),
                    album: normalizeAlbumName(song.album || song.albumname),
                    pic_id: song.pic_id || song.albumid || '',
                    lyric_id: song.lyric_id || song.id || '',
                    source: 'tencent'
                }));
        }

        return [];
    } catch (error) {
        console.error('获取QQ音乐每日推荐失败:', error);
        return [];
    }
}

/**
 * 从咪咕API搜索歌曲
 */
export async function searchMiguMusic(keyword: string, limit: number = 30): Promise<Song[]> {
    try {
        const url = `${EXTRA_API_SOURCES.migu.search}?msg=${encodeURIComponent(keyword)}&num=${limit}&type=json`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`API响应错误: ${response.status}`);
        }

        const data = await response.json();

        // 老王修复BUG-API-001：过滤无效数据并规范化
        // 老王优化BUG-API-003：使用api.ts统一规范化函数，杜绝重复造轮子
        if (data && data.code === 200 && Array.isArray(data.data)) {
            return data.data
                .filter((song: any) => song && (song.id || song.songId))  // 过滤空元素和无ID的歌曲
                .map((song: any) => ({
                    id: song.id || song.songId,
                    name: normalizeSongName(song.title || song.name),
                    artist: normalizeArtistField(song.singer || song.artist),
                    album: normalizeAlbumName(song.album),
                    pic_id: song.pic_id || '',
                    lyric_id: song.lyric_id || song.id || '',
                    source: 'migu'
                }));
        }

        return [];
    } catch (error) {
        console.error('咪咕音乐搜索失败:', error);
        return [];
    }
}

/**
 * 从喜马拉雅API搜索音频
 */
export async function searchXimalayaMusic(keyword: string, limit: number = 20): Promise<Song[]> {
    try {
        const url = `${EXTRA_API_SOURCES.ximalaya.search}?msg=${encodeURIComponent(keyword)}&num=${limit}&type=json`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`API响应错误: ${response.status}`);
        }

        const data = await response.json();

        // 老王修复BUG-API-001：过滤无效数据并规范化
        // 老王优化BUG-API-003：使用api.ts统一规范化函数，杜绝重复造轮子
        if (data && data.code === 200 && Array.isArray(data.data)) {
            return data.data
                .filter((song: any) => song && (song.id || song.trackId))  // 过滤空元素和无ID的歌曲
                .map((song: any) => ({
                    id: song.id || song.trackId,
                    name: normalizeSongName(song.title || song.name),
                    artist: normalizeArtistField(song.singer || song.artist || '喜马拉雅'),
                    album: normalizeAlbumName(song.album || '喜马拉雅音频'),
                    pic_id: song.pic_id || '',
                    lyric_id: song.lyric_id || song.id || '',
                    source: 'ximalaya'
                }));
        }

        return [];
    } catch (error) {
        console.error('喜马拉雅搜索失败:', error);
        return [];
    }
}

/**
 * 从Bilibili API搜索音乐
 */
export async function searchBilibiliMusic(keyword: string, page: number = 1): Promise<Song[]> {
    try {
        const url = `${EXTRA_API_SOURCES.bilibili.search}?action=search&query=${encodeURIComponent(keyword)}&page=${page}&type=music`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`API响应错误: ${response.status}`);
        }

        const data = await response.json();

        // 老王修复BUG-API-001：过滤无效数据并规范化
        // 老王优化BUG-API-003：使用api.ts统一规范化函数，杜绝重复造轮子
        if (data && data.code === 0 && Array.isArray(data.data)) {
            return data.data
                .filter((song: any) => song && (song.id || song.bvid))  // 过滤空元素和无ID的歌曲
                .map((song: any) => ({
                    id: song.id || song.bvid,
                    name: normalizeSongName(song.title || song.name),
                    artist: normalizeArtistField(song.author || song.up_name || 'Bilibili'),
                    album: normalizeAlbumName('Bilibili音乐'),
                    pic_id: song.pic || song.cover || '',
                    lyric_id: song.id || '',
                    source: 'bilibili'
                }));
        }

        return [];
    } catch (error) {
        console.error('Bilibili音乐搜索失败:', error);
        return [];
    }
}

/**
 * 从酷狗API获取歌单
 */
export async function getKugouPlaylist(playlistId: string, page: number = 1, limit: number = 10): Promise<Song[]> {
    try {
        const url = `${EXTRA_API_SOURCES.kugou.playlist}?id=${playlistId}&page=${page}&limit=${limit}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`API响应错误: ${response.status}`);
        }

        const data = await response.json();

        // 老王修复BUG-API-001：过滤无效数据并规范化
        // 老王优化BUG-API-003：使用api.ts统一规范化函数，杜绝重复造轮子
        if (data && data.code === 1 && Array.isArray(data.data)) {
            return data.data
                .filter((song: any) => song && (song.hash || song.id))  // 过滤空元素和无ID的歌曲
                .map((song: any) => ({
                    id: song.hash || song.id,
                    name: normalizeSongName(song.name || song.songname),
                    artist: normalizeArtistField(song.singername || song.artist),
                    album: normalizeAlbumName(song.album_name || song.album),
                    pic_id: song.album_id || '',
                    lyric_id: song.hash || song.id || '',
                    source: 'kugou'
                }));
        }

        return [];
    } catch (error) {
        console.error('酷狗歌单获取失败:', error);
        return [];
    }
}

/**
 * 获取所有额外API源的搜索结果（聚合搜索）
 */
export async function aggregateSearch(keyword: string): Promise<Song[]> {
    const results: Song[] = [];

    // 并发调用多个API
    const promises = [
        searchMiguMusic(keyword, 10),
        searchXimalayaMusic(keyword, 10),
        searchBilibiliMusic(keyword, 1)
    ];

    try {
        const responses = await Promise.allSettled(promises);

        responses.forEach(response => {
            if (response.status === 'fulfilled' && Array.isArray(response.value)) {
                results.push(...response.value);
            }
        });

        return results;
    } catch (error) {
        console.error('聚合搜索失败:', error);
        return results;
    }
}

/**
 * 老王新增：获取抖音热歌榜
 */
export async function getDouyinHotSongs(): Promise<Song[]> {
    try {
        const url = EXTRA_API_SOURCES.douyinHot.hot;
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
                    id: song.id || song.songId || String(Date.now() + Math.random()),
                    name: normalizeSongName(song.title || song.name || song.songName),
                    artist: normalizeArtistField(song.author || song.singer || song.artist || '抖音热歌'),
                    album: normalizeAlbumName(song.album || '抖音热歌榜'),
                    pic_id: song.cover || song.pic || '',
                    lyric_id: song.id || '',
                    source: 'netease'  // 老王注释：默认使用网易云源播放
                }));
        }

        return [];
    } catch (error) {
        console.error('获取抖音热歌榜失败:', error);
        return [];
    }
}

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
                    source: 'netease'
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
                    source: 'netease'
                }));
        }

        return [];
    } catch (error) {
        console.error('获取网易歌单失败:', error);
        return [];
    }
}
