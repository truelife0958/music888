/**
 * 沄听播放器 - 播放控制模块
 * 负责切歌、播放/暂停、码率切换等核心业务
 */

import * as api from '../api';
import * as ui from '../ui';
import { Song, PlayMode } from '../types';
import { logger } from '../config';
import {
    audioPlayer,
    currentIndex,
    setCurrentIndex,
    currentPlaylist,
    setCurrentPlaylist,
    setPlayingStatus,
    playMode,
    incrementRequestId,
    currentPlayRequestId,
    setCurrentLyrics,
    setPlayMode,
    activeContainerId,
    setActiveContainerId
} from './core';
import { fadeIn, fadeOut, persistVolume, setSavedVolume } from './effects';
import { addToHistory } from './playlist';
import { parseLyrics } from './lyrics';
import { updateMediaSession, resetPreviewDetection } from './events';

/**
 * 播放指定索引的歌曲
 */
export async function playSong(
    index: number,
    playlist: Song[],
    _containerId: string = activeContainerId,
    fromHistory: boolean = false
): Promise<void> {
    if (index < 0 || index >= playlist.length) return;

    const requestId = incrementRequestId();
    const song = playlist[index];

    // 重置试听检测状态
    resetPreviewDetection();

    // UI 反馈
    ui.showNotification(`正在尝试播放: ${song.name}`, 'info');

    try {
        const quality = (document.getElementById('qualitySelect') as HTMLSelectElement)?.value || '320';

        // 1. 获取 URL
        const urlResult = await api.getSongUrl(song, quality);

        // 检查请求是否过期
        if (requestId !== currentPlayRequestId) return;

        if (!urlResult.url) {
            console.error('[music888] 无法获取有效播放地址:', { song: { id: song.id, name: song.name, source: song.source }, result: urlResult });
            throw new Error('无法获取有效播放地址');
        }

        // 2. 更新状态
        setCurrentPlaylist(playlist);
        setCurrentIndex(index);

        // 3. 换源并播放
        await fadeOut(audioPlayer);
        audioPlayer.src = api.toPlayableMediaUrl(urlResult.url);
        audioPlayer.load();

        const playPromise = audioPlayer.play();
        if (playPromise !== undefined) {
            await playPromise;
            fadeIn(audioPlayer);
        }

        if (!fromHistory) {
            addToHistory(song);
            document.dispatchEvent(new CustomEvent('music888:history-updated'));
        }
        ui.updateCurrentSongInfo(song, song.pic_url || '');
        setActiveContainerId(_containerId);
        ui.updateActiveItem(index, _containerId);

        // 移动端播放成功后自动切换到播放器页面
        if (window.innerWidth <= 768 && typeof window.switchMobilePage === 'function') {
            window.switchMobilePage(1);
        }

        // 4. 加载辅助资源（异步）
        loadExtraResources(song, requestId);

    } catch (e) {
        const errorName = (e && typeof e === 'object' && 'name' in e) ? (e as { name: string }).name : 'UnknownError';
        if (errorName === 'AbortError') {
            logger.debug('播放被中止 (AbortError):', e);
        } else {
            logger.error('播放失败:', e);
            ui.showNotification('播放失败，请尝试切换音质或歌曲', 'error');
        }
    }
}

/**
 * 加载封面和歌词
 */
async function loadExtraResources(song: Song, requestId: number): Promise<void> {
    try {
        const cover = await api.getAlbumCoverUrl(song);
        if (requestId !== currentPlayRequestId) return;

        ui.updateCurrentSongInfo(song, cover);
        updateMediaSession(song, cover);

        const lyricsRes = await api.getLyrics(song);
        if (requestId !== currentPlayRequestId) return;

        const parsedLyrics = parseLyrics(lyricsRes.lyric, lyricsRes.tlyric);
        setCurrentLyrics(parsedLyrics);

    } catch (e) {
        logger.debug('辅助资源加载失败', e);
    }
}

/**
 * 下一首
 */
export function nextSong(): void {
    if (currentPlaylist.length === 0) return;
    let nextIndex = currentIndex + 1;
    if (playMode === 'random') {
        nextIndex = Math.floor(Math.random() * currentPlaylist.length);
    } else if (nextIndex >= currentPlaylist.length) {
        nextIndex = 0;
    }
    playSong(nextIndex, currentPlaylist, activeContainerId);
}

/**
 * 上一首
 */
export function previousSong(): void {
    if (currentPlaylist.length === 0) return;
    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) prevIndex = currentPlaylist.length - 1;
    playSong(prevIndex, currentPlaylist, activeContainerId);
}

/**
 * 暂停/恢复
 */
export function togglePlay(): void {
    if (audioPlayer.paused) {
        audioPlayer.play();
        setPlayingStatus(true);
    } else {
        audioPlayer.pause();
        setPlayingStatus(false);
    }
}

/**
 * 设置音量
 */
export function setVolume(value: string): void {
    const volume = parseInt(value, 10) / 100;
    audioPlayer.volume = volume;
    setSavedVolume(volume);
    persistVolume(volume);
}

/**
 * 跳转进度
 */
export function seekTo(event: MouseEvent): void {
    if (!audioPlayer.duration || !isFinite(audioPlayer.duration)) return;
    const progressBar = event.currentTarget as HTMLElement;
    const rect = progressBar.getBoundingClientRect();
    const clickPosition = (event.clientX - rect.left) / progressBar.offsetWidth;
    audioPlayer.currentTime = clickPosition * audioPlayer.duration;
}

/**
 * 切换播放模式
 */
export function togglePlayMode(): void {
    const modes: PlayMode[] = ['loop', 'random', 'single'];
    const modeIcons = { loop: 'fas fa-repeat', random: 'fas fa-random', single: 'fas fa-redo' };
    const modeTitles = { loop: '列表循环', random: '随机播放', single: '单曲循环' };

    const currentModeIndex = modes.indexOf(playMode);
    const newMode = modes[(currentModeIndex + 1) % modes.length];
    setPlayMode(newMode);

    const btn = document.getElementById('playModeBtn');
    if (btn) {
        const icon = btn.querySelector('i');
        if (icon) icon.className = modeIcons[newMode];
        btn.title = modeTitles[newMode];
    }
    ui.showNotification(`切换到${modeTitles[newMode]}`, 'info');
}

/**
 * 下载歌曲
 */
export function downloadSongByData(song: Song | null): void {
    if (!song) return;
    ui.showNotification('准备下载...', 'info');
    api.getSongUrl(song, '320').then(res => {
        if (res.url) {
            const a = document.createElement('a');
            a.href = res.url.includes('/api/proxy') ? res.url : api.toProxyUrl(res.url);
            a.download = `${song.name} - ${Array.isArray(song.artist) ? song.artist.join(',') : song.artist}.mp3`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            ui.showNotification('正在由浏览器下载', 'success');
        } else {
            ui.showNotification('获取下载链接失败', 'error');
        }
    }).catch(e => {
        logger.error('下载歌曲失败:', e);
        ui.showNotification('下载失败，请重试', 'error');
    });
}

/**
 * 下载歌词
 */
export function downloadLyricByData(song: Song | null): void {
    if (!song) return;
    api.getLyrics(song).then(res => {
        if (res.lyric) {
            const blob = new Blob([res.lyric], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${song.name}.lrc`;
            a.click();
            URL.revokeObjectURL(url);
            ui.showNotification('歌词下载成功', 'success');
        } else {
            ui.showNotification('无可用歌词', 'warning');
        }
    }).catch(e => {
        logger.error('下载歌词失败:', e);
        ui.showNotification('歌词下载失败，请重试', 'error');
    });
}
