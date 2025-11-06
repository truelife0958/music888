// js/extra-api-adapter.ts - 额外API源适配器
// 老王开发：支持多种不同格式的音乐API

import { Song } from './api';

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
        if (data && Array.isArray(data.data)) {
            return data.data
                .filter((song: any) => song && (song.id || song.songid || song.mid))  // 过滤空元素和无ID的歌曲
                .map((song: any) => ({
                    id: song.id || song.songid || song.mid,
                    name: song.name || song.songname || '未知歌曲',
                    artist: parseMiguArtist(song.singer || song.artist),
                    album: song.album || song.albumname || '未知专辑',
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
        if (data && data.code === 200 && Array.isArray(data.data)) {
            return data.data
                .filter((song: any) => song && (song.id || song.songId))  // 过滤空元素和无ID的歌曲
                .map((song: any) => ({
                    id: song.id || song.songId,
                    name: song.title || song.name || '未知歌曲',
                    artist: parseMiguArtist(song.singer || song.artist),
                    album: song.album || '未知专辑',
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
        if (data && data.code === 200 && Array.isArray(data.data)) {
            return data.data
                .filter((song: any) => song && (song.id || song.trackId))  // 过滤空元素和无ID的歌曲
                .map((song: any) => ({
                    id: song.id || song.trackId,
                    name: song.title || song.name || '未知歌曲',
                    artist: [song.singer || song.artist || '喜马拉雅'],
                    album: song.album || '喜马拉雅音频',
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
        if (data && data.code === 0 && Array.isArray(data.data)) {
            return data.data
                .filter((song: any) => song && (song.id || song.bvid))  // 过滤空元素和无ID的歌曲
                .map((song: any) => ({
                    id: song.id || song.bvid,
                    name: song.title || song.name || '未知歌曲',
                    artist: [song.author || song.up_name || 'Bilibili'],
                    album: 'Bilibili音乐',
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
        if (data && data.code === 1 && Array.isArray(data.data)) {
            return data.data
                .filter((song: any) => song && (song.hash || song.id))  // 过滤空元素和无ID的歌曲
                .map((song: any) => ({
                    id: song.hash || song.id,
                    name: song.name || song.songname || '未知歌曲',
                    artist: parseMiguArtist(song.singername || song.artist),
                    album: song.album_name || song.album || '未知专辑',
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
 * 解析艺术家字段（兼容多种格式）
 */
function parseMiguArtist(artist: any): string[] {
    if (Array.isArray(artist)) {
        return artist.map(a => typeof a === 'string' ? a : (a?.name || '未知艺术家'));
    }

    if (typeof artist === 'string') {
        // 处理"歌手1,歌手2"格式
        return artist.split(/[,，、]/).map(a => a.trim()).filter(a => a);
    }

    if (typeof artist === 'object' && artist?.name) {
        return [artist.name];
    }

    return ['未知艺术家'];
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
