/**
 * 沄听播放器 - 歌单与收藏管理模块
 * 负责歌单持久化、收藏夹逻辑及播放历史
 */

import { Song, PlaylistData } from '../types';
import { APP_CONFIG, logger } from '../config';

/** 歌单存储容器 */
const playlistStorage = new Map<string, PlaylistData>();
/** 歌单 ID 计数器 */
let playlistCounter: number = 0;
/** 播放历史列表 */
let playHistory: Song[] = [];

export function loadSavedPlaylists(): void {
    try {
        const saved = localStorage.getItem('music888_playlists');
        if (saved) {
            const data = JSON.parse(saved);
            Object.entries(data).forEach(([key, value]) => {
                playlistStorage.set(key, value as PlaylistData);
                // 更新计数器，确保新歌单 ID 不冲突
                if (key.startsWith('custom_')) {
                    const id = parseInt(key.replace('custom_', ''), 10);
                    if (id >= playlistCounter) playlistCounter = id + 1;
                }
            });
        }
    } catch (e) {
        logger.error('加载歌单失败', e);
    }
}

/**
 * 保存歌单到本地存储
 */
export function savePlaylistsToStorage(): void {
    try {
        const data = Object.fromEntries(playlistStorage);
        localStorage.setItem('music888_playlists', JSON.stringify(data));
    } catch (e) {
        logger.error('保存歌单失败', e);
    }
}

/**
 * 初始化收藏夹歌单
 */
export function initializeFavoritesPlaylist(): void {
    const key = 'favorites';
    if (!playlistStorage.has(key)) {
        playlistStorage.set(key, {
            name: '我的喜欢',
            songs: [],
            id: key,
            createTime: new Date().toISOString(),
            isFavorites: true
        });
        savePlaylistsToStorage();
    }
}

/**
 * 检查歌曲是否在收藏夹中
 */
export function isSongInFavorites(song: Song): boolean {
    const favorites = playlistStorage.get('favorites');
    return !!favorites?.songs.some(s => s.id === song.id && (s.source || 'netease') === (song.source || 'netease'));
}

/**
 * 切换收藏状态
 */
export function toggleFavorite(song: Song): boolean {
    const favs = playlistStorage.get('favorites');
    if (!favs) return false;

    const index = favs.songs.findIndex(s => s.id === song.id && (s.source || 'netease') === (song.source || 'netease'));
    if (index > -1) {
        favs.songs.splice(index, 1);
        savePlaylistsToStorage();
        return false;
    } else {
        favs.songs.unshift({ ...song });
        savePlaylistsToStorage();
        return true;
    }
}

/**
 * 获取收藏歌曲列表
 */
export function getFavorites(): Song[] {
    return playlistStorage.get('favorites')?.songs || [];
}

/**
 * 获取播放历史
 */
export function getPlayHistory(): Song[] {
    return playHistory;
}

/**
 * 添加歌曲到播放历史
 */
export function addToHistory(song: Song): void {
    // 移除已存在的相同歌曲
    playHistory = playHistory.filter(s => !(s.id === song.id && (s.source || 'netease') === (song.source || 'netease')));
    // 添加到开头
    playHistory.unshift({ ...song });
    // 限制数量
    if (playHistory.length > APP_CONFIG.MAX_HISTORY_SIZE) {
        playHistory = playHistory.slice(0, APP_CONFIG.MAX_HISTORY_SIZE);
    }
    savePlayHistoryToStorage();
}

/**
 * 清空播放历史
 */
export function clearPlayHistory(): void {
    playHistory = [];
    savePlayHistoryToStorage();
}

/**
 * 保存历史到本地存储
 */
export function savePlayHistoryToStorage(): void {
    try {
        localStorage.setItem('music888_history', JSON.stringify(playHistory));
    } catch (e) {
        logger.debug('保存历史失败', e);
    }
}

/**
 * 从本地存储加载历史
 */
export function loadPlayHistoryFromStorage(): void {
    try {
        const saved = localStorage.getItem('music888_history');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
                playHistory = parsed;
            }
        }
    } catch (e) {
        logger.debug('加载历史失败', e);
    }
}

