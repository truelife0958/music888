/**
 * 沄听播放器 - 核心状态管理模块
 * 存放播放器的核心状态和基础控制函数
 */

import { Song, PlayMode, LyricLine } from '../types';

/** 音频播放器实例 */
export const audioPlayer = new Audio();
/** 当前播放列表 */
export let currentPlaylist: Song[] = [];
/** 当前歌曲索引 */
export let currentIndex = -1;
/** 当前播放模式 */
export let playMode: PlayMode = 'loop';
/** 是否正在播放 */
export let isPlaying = false;
/** 当前歌词数组 */
export let currentLyrics: LyricLine[] = [];
/** 当前播放请求 ID，用于取消过期请求 */
export let currentPlayRequestId = 0;
/** 当前活跃列表容器 ID（焦点高亮所在容器） */
export let activeContainerId = 'searchResults';

/**
 * 设置播放状态
 */
export function setPlayingStatus(status: boolean): void {
    isPlaying = status;
}

/**
 * 设置当前列表
 */
export function setCurrentPlaylist(songs: Song[]): void {
    currentPlaylist = songs;
}

/**
 * 设置当前索引
 */
export function setCurrentIndex(index: number): void {
    currentIndex = index;
}

/**
 * 设置当前模式
 */
export function setPlayMode(mode: PlayMode): void {
    playMode = mode;
}

/**
 * 设置当前活跃容器 ID
 */
export function setActiveContainerId(id: string): void {
    activeContainerId = id;
}

/**
 * 设置当前歌词
 */
export function setCurrentLyrics(lyrics: LyricLine[]): void {
    currentLyrics = lyrics;
}

/**
 * 获取请求 ID 并自增
 */
export function incrementRequestId(): number {
    currentPlayRequestId++;
    return currentPlayRequestId;
}

/**
 * 获取当前歌曲
 */
export function getCurrentSong(): Song | null {
    if (currentIndex >= 0 && currentIndex < currentPlaylist.length) {
        return currentPlaylist[currentIndex];
    }
    return null;
}
