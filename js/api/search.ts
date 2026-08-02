/**
 * 沄听播放器 - 搜索与歌单模块
 * 负责歌曲搜索、歌单解析和发现功能
 */

import {
    Song,
    NeteaseSearchResponse,
    NeteaseSongDetailResponse,
    NeteaseSongDetail,
    NeteaseArtist,
    NeteaseAlbum,
    GDStudioSong,
    PlaylistParseResult,
    NeteasePlaylistDetailResponse,
    MusicError,
    ArtistInfo,
    ArtistListResponse,
    ArtistTopSongResponse,
    ArtistSongsResponse,
    ArtistDescResponse,
    AlbumInfo,
    ArtistAlbumsResponse,
    AlbumDetailResponse,
    RadioStation,
    RadioHotResponse,
    RadioProgram,
    RadioProgramResponse,
    RadioCategory,
    RadioCateListResponse,
    RadioRecommendResponse,
    MetingSong,
    UserPlaylist,
    UserPlaylistResponse,
    RadioDetailResponse
} from '../types';

import { API_TIMEOUTS, logger } from '../config';
import { fetchWithRetry } from './client';
import {
    getGDStudioApiUrl,
    getNecApiUrl,
    getMetingApiUrl,
    getPreferredSearchSources,
    isGDStudioApiAvailable,
    markGDStudioApiAvailable,
    markGDStudioApiUnavailable
} from './sources';
import { saveSourceStats, sourceFailCount, sourceSuccessCount } from './utils';

/**
 * 将网易云详情映射为内部 Song
 */
export function convertNeteaseDetailToSong(song: NeteaseSongDetail): Song {
    const album: NeteaseAlbum = song.al || { id: 0, name: '' };
    const artists: NeteaseArtist[] = song.ar || [];
    return {
        id: String(song.id),
        name: song.name,
        artist: artists.map(a => a.name),
        album: album.name || '',
        pic_id: String(album.picId || album.id || ''),
        pic_url: album.picUrl || '',
        lyric_id: String(song.id),
        source: 'netease',
        duration: song.dt
    };
}

function convertGDStudioSongToSong(song: GDStudioSong, fallbackSource: string): Song {
    return {
        id: song.id,
        name: song.name,
        artist: Array.isArray(song.artist) ? song.artist : [song.artist],
        album: song.album || '',
        pic_id: song.pic_id || '',
        pic_url: '',
        lyric_id: song.lyric_id || song.id,
        source: song.source || fallbackSource
    };
}

function getMetingResourceId(resourceUrl?: string): string {
    if (!resourceUrl) return '';

    try {
        return new URL(resourceUrl).searchParams.get('id') || '';
    } catch {
        return '';
    }
}

function convertMetingSearchSongToSong(song: MetingSong, index: number): Song | null {
    const name = song.name || song.title || '';
    const rawArtist = song.artist || song.author || '';
    const artist = Array.isArray(rawArtist)
        ? rawArtist
        : rawArtist.split(/\s*\/\s*/).filter(Boolean);
    const id = song.id || song.url_id || getMetingResourceId(song.url) || `meting-${index}`;

    if (!name || !song.url) return null;

    return {
        id,
        name,
        artist: artist.length > 0 ? artist : ['未知歌手'],
        album: song.album || '',
        pic_id: song.pic_id || '',
        pic_url: song.pic || '',
        lyric_id: song.lyric_id || getMetingResourceId(song.lrc) || id,
        source: 'meting',
        play_url: song.url,
        lyric_url: song.lrc,
    };
}

function getSongDedupKey(song: Song): string {
    return [
        song.name.trim().toLowerCase(),
        song.artist.join('/').trim().toLowerCase(),
        song.album.trim().toLowerCase(),
    ].join('|');
}

function mergeUniqueSongs(...groups: Song[][]): Song[] {
    const seen = new Set<string>();
    const merged: Song[] = [];

    for (const songs of groups) {
        for (const song of songs) {
            const key = getSongDedupKey(song);
            if (!seen.has(key)) {
                seen.add(key);
                merged.push(song);
            }
        }
    }

    return merged;
}

async function searchGDStudioSource(keyword: string, source: string): Promise<Song[]> {
    try {
        const res = await fetchWithRetry(
            `${getGDStudioApiUrl()}?types=search&source=${source}&name=${encodeURIComponent(keyword)}&count=12`,
            {},
            0,
            true,
            Math.min(API_TIMEOUTS.SEARCH, 6500)
        );
        const data: unknown = await res.json();
        const songs: GDStudioSong[] = Array.isArray(data)
            ? data
            : data && typeof data === 'object'
                ? Object.values(data) as GDStudioSong[]
                : [];

        if (songs.length > 0) {
            markGDStudioApiAvailable();
            sourceSuccessCount.set(source, (sourceSuccessCount.get(source) || 0) + 1);
            return songs.map(song => convertGDStudioSongToSong(song, source));
        }

        sourceFailCount.set(source, (sourceFailCount.get(source) || 0) + 1);
        return [];
    } catch (e) {
        if (e instanceof MusicError && e.message.includes('403')) {
            markGDStudioApiUnavailable();
        }
        sourceFailCount.set(source, (sourceFailCount.get(source) || 0) + 1);
        return [];
    }
}

async function searchNeteaseFallback(keyword: string): Promise<Song[]> {
    try {
        const res = await fetchWithRetry(
            `${getNecApiUrl()}/search?keywords=${encodeURIComponent(keyword)}&limit=30`,
            {},
            1,
            true,
            API_TIMEOUTS.SEARCH
        );
        const data: NeteaseSearchResponse = await res.json();
        if (data.code === 200 && data.result?.songs) {
            // 获取详情以补全封面
            const ids = data.result.songs.map(s => s.id).join(',');
            const detailRes = await fetchWithRetry(
                `${getNecApiUrl()}/song/detail?ids=${ids}`,
                {},
                1,
                true,
                API_TIMEOUTS.SEARCH
            );
            const detailData: NeteaseSongDetailResponse = await detailRes.json();
            if (detailData.code === 200 && detailData.songs) {
                return detailData.songs.map(convertNeteaseDetailToSong);
            }
        }
    } catch {
        // 统一走空结果回退
    }

    return [];
}

async function searchMetingFallback(keyword: string): Promise<Song[]> {
    try {
        const res = await fetchWithRetry(
            `${getMetingApiUrl()}?server=netease&type=search&id=${encodeURIComponent(keyword)}`,
            {},
            0,
            true,
            Math.min(API_TIMEOUTS.SEARCH, 8000)
        );
        const data: unknown = await res.json();
        if (!Array.isArray(data)) return [];

        return (data as MetingSong[])
            .map(convertMetingSearchSongToSong)
            .filter((song): song is Song => song !== null)
            .slice(0, 20);
    } catch {
        return [];
    }
}

async function firstNonEmptyResult(providers: Array<Promise<Song[]>>): Promise<Song[]> {
    try {
        return await Promise.any(
            providers.map(provider => provider.then(songs => {
                if (songs.length === 0) throw new Error('empty result');
                return songs;
            }))
        );
    } catch {
        return [];
    }
}

/**
 * 搜索音乐
 */
export async function searchMusicAPI(keyword: string, source: string = 'netease'): Promise<Song[]> {
    let gdstudioSongs: Song[] = [];

    // 1. GDStudio 多源并发搜索，近期可用源优先
    if (isGDStudioApiAvailable()) {
        const preferredSources = getPreferredSearchSources(source, 3);
        const sourceResults = await Promise.all(
            preferredSources.map(preferredSource => searchGDStudioSource(keyword, preferredSource))
        );
        gdstudioSongs = mergeUniqueSongs(...sourceResults);
        if (gdstudioSongs.length > 0) {
            saveSourceStats();
        }
    }

    // 2. NEC 与 Meting 竞速回退。任一源先返回有效结果即可，避免被慢源拖满超时。
    if (source === 'netease' && gdstudioSongs.length < 12) {
        const fallbackSongs = await firstNonEmptyResult([
            searchNeteaseFallback(keyword),
            searchMetingFallback(keyword),
        ]);
        return mergeUniqueSongs(gdstudioSongs, fallbackSongs).slice(0, 30);
    }

    return gdstudioSongs.slice(0, 30);
}

/**
 * 发现雷达
 */
export async function exploreRadarAPI(): Promise<Song[]> {
    const keywords = ['周杰伦', '陈奕迅', '林俊杰', '邓紫棋'];
    const keyword = keywords[Math.floor(Math.random() * keywords.length)];
    return await searchMusicAPI(keyword);
}

/**
 * 解析歌单
 */
export async function parsePlaylistAPI(playlistUrlOrId: string): Promise<PlaylistParseResult> {
    let id = playlistUrlOrId.trim();
    const idMatch = id.match(/id=(\d+)/) || id.match(/playlist\/(\d+)/);
    if (idMatch) id = idMatch[1];

    // 验证歌单 ID 必须为纯数字，防止参数注入
    if (!/^\d+$/.test(id)) {
        throw new Error('无效的歌单ID，请输入纯数字ID或包含ID的链接');
    }

    try {
        const res = await fetchWithRetry(`${getNecApiUrl()}/playlist/detail?id=${id}`);
        const data: NeteasePlaylistDetailResponse = await res.json();
        if (data.code === 200 && data.playlist) {
            const trackIds = data.playlist.trackIds?.map(t => t.id).slice(0, 50).join(',') || '';
            const detailRes = await fetchWithRetry(`${getNecApiUrl()}/song/detail?ids=${trackIds}`);
            const detailData: NeteaseSongDetailResponse = await detailRes.json();
            if (detailData.code === 200 && detailData.songs) {
                return { songs: detailData.songs.map(convertNeteaseDetailToSong), name: data.playlist.name };
            }
        }
    } catch (error) {
        logger.warn('NEC 歌单解析失败，回退到 Meting:', error);
    }

    try {
        const res = await fetchWithRetry(
            `${getMetingApiUrl()}?server=netease&type=playlist&id=${id}`
        );
        const data: unknown = await res.json();
        if (Array.isArray(data)) {
            const songs = data as MetingSong[];
            return {
                songs: songs
                    .map(convertMetingSearchSongToSong)
                    .filter((song): song is Song => song !== null),
                name: '网易云歌单'
            };
        }
    } catch {
        // 统一走下方错误提示
    }

    throw new Error('歌单解析失败');
}

/**
 * 获取歌手列表
 */
export async function getArtistList(area = -1, type = -1, initial: string | number = -1, limit = 60, offset = 0): Promise<{ artists: ArtistInfo[], more: boolean }> {
    const res = await fetchWithRetry(`${getNecApiUrl()}/artist/list?type=${type}&area=${area}&initial=${initial}&limit=${limit}&offset=${offset}`);
    const data: ArtistListResponse = await res.json();
    return {
        artists: data.code === 200 && data.artists ? data.artists : [],
        more: data.more ?? false
    };
}

/**
 * 获取歌手热门歌曲
 */
export async function getArtistTopSongs(id: number): Promise<Song[]> {
    const res = await fetchWithRetry(`${getNecApiUrl()}/artist/top/song?id=${id}`);
    const data: ArtistTopSongResponse = await res.json();
    return data.code === 200 && data.songs ? data.songs.map(convertNeteaseDetailToSong) : [];
}

/**
 * 获取歌手全部歌曲（分页）
 */
export async function getArtistSongs(id: number, limit = 50, offset = 0, order = 'hot'): Promise<{ songs: Song[], more: boolean, total: number }> {
    const res = await fetchWithRetry(`${getNecApiUrl()}/artist/songs?id=${id}&order=${encodeURIComponent(order)}&limit=${limit}&offset=${offset}`);
    const data: ArtistSongsResponse = await res.json();
    return {
        songs: data.code === 200 && data.songs ? data.songs.map(convertNeteaseDetailToSong) : [],
        more: data.more ?? false,
        total: data.total ?? 0
    };
}

/**
 * 获取热门电台
 */
export async function getHotRadio(limit = 60, offset = 0): Promise<{ radios: RadioStation[], hasMore: boolean }> {
    const res = await fetchWithRetry(`${getNecApiUrl()}/dj/hot?limit=${limit}&offset=${offset}`);
    const data: RadioHotResponse = await res.json();
    const radios = data.code === 200 && data.djRadios ? data.djRadios : [];
    return { radios, hasMore: radios.length >= limit };
}

/**
 * 获取电台节目列表
 */
export async function getRadioPrograms(rid: number, limit = 50, offset = 0): Promise<{ programs: RadioProgram[], more: boolean }> {
    const res = await fetchWithRetry(`${getNecApiUrl()}/dj/program?rid=${rid}&limit=${limit}&offset=${offset}`);
    const data: RadioProgramResponse = await res.json();
    return {
        programs: data.code === 200 && data.programs ? data.programs : [],
        more: data.more ?? false
    };
}

/**
 * 获取电台分类列表
 */
export async function getRadioCateList(): Promise<RadioCategory[]> {
    const res = await fetchWithRetry(`${getNecApiUrl()}/dj/catelist`);
    const data: RadioCateListResponse = await res.json();
    return data.code === 200 && data.categories ? data.categories : [];
}

/**
 * 按分类获取电台
 */
export async function getRadioByCategory(cateId: number, limit = 60, offset = 0): Promise<{ radios: RadioStation[], hasMore: boolean }> {
    const res = await fetchWithRetry(`${getNecApiUrl()}/dj/recommend/type?type=${cateId}&limit=${limit}&offset=${offset}`);
    const data: RadioRecommendResponse = await res.json();
    const radios = data.code === 200 && data.djRadios ? data.djRadios : [];
    return { radios, hasMore: radios.length >= limit };
}

/**
 * 获取用户公开歌单
 */
export async function getUserPlaylists(uid: string): Promise<UserPlaylist[]> {
    const res = await fetchWithRetry(`${getNecApiUrl()}/user/playlist?uid=${encodeURIComponent(uid)}`);
    const data: UserPlaylistResponse = await res.json();
    return data.code === 200 && data.playlist ? data.playlist : [];
}

/**
 * 获取电台详情
 */
export async function getRadioDetail(rid: number): Promise<RadioStation | null> {
    const res = await fetchWithRetry(`${getNecApiUrl()}/dj/detail?rid=${rid}`);
    const data: RadioDetailResponse = await res.json();
    return data.code === 200 && data.data ? data.data : null;
}

/**
 * 获取歌手简介
 */
export async function getArtistDesc(id: number): Promise<{ briefDesc: string; introduction: Array<{ ti: string; txt: string }> }> {
    const res = await fetchWithRetry(`${getNecApiUrl()}/artist/desc?id=${id}`);
    const data: ArtistDescResponse = await res.json();
    return {
        briefDesc: data.code === 200 && data.briefDesc ? data.briefDesc : '',
        introduction: data.code === 200 && data.introduction ? data.introduction : []
    };
}

/**
 * 获取歌手专辑列表
 */
export async function getArtistAlbums(id: number, limit = 30, offset = 0): Promise<{ albums: AlbumInfo[], more: boolean }> {
    const res = await fetchWithRetry(`${getNecApiUrl()}/artist/album?id=${id}&limit=${limit}&offset=${offset}`);
    const data: ArtistAlbumsResponse = await res.json();
    return {
        albums: data.code === 200 && data.hotAlbums ? data.hotAlbums : [],
        more: data.more ?? false
    };
}

/**
 * 获取专辑详情（含歌曲列表）
 */
export async function getAlbumDetail(id: number): Promise<{ album: AlbumInfo | null, songs: Song[] }> {
    const res = await fetchWithRetry(`${getNecApiUrl()}/album?id=${id}`);
    const data: AlbumDetailResponse = await res.json();
    return {
        album: data.code === 200 && data.album ? data.album : null,
        songs: data.code === 200 && data.songs ? data.songs.map(convertNeteaseDetailToSong) : []
    };
}
