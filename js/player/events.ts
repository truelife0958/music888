/**
 * 沄听播放器 - 事件与媒体会话模块
 * 负责音频事件监听和系统级媒体控制对接
 */

import * as ui from '../ui';
import * as api from '../api';
import { Song } from '../types';
import { logger, PREVIEW_DETECTION } from '../config';
import {
    audioPlayer,
    isPlaying,
    setPlayingStatus,
    playMode,
    currentLyrics,
    getCurrentSong,
    currentPlayRequestId
} from './core';
import { nextSong, previousSong } from './control';
import { fadeIn, fadeOut } from './effects';

/** 正在进行的跨源搜索状态 */
let isSeekingFullVersion = false;
let fullVersionSearchCount = 0;

/**
 * 重置试听检测计数（在新歌曲开始播放时调用）
 */
export function resetPreviewDetection(): void {
    fullVersionSearchCount = 0;
    isSeekingFullVersion = false;
}
/** 切换完整版时的最大回退播放位置（秒） */
const MAX_SEEK_ON_SWITCH = 10;

/**
 * 绑定音频事件
 */
export function bindAudioEvents(): void {
    audioPlayer.addEventListener('play', () => {
        setPlayingStatus(true);
        ui.updatePlayButton(true);
    });

    audioPlayer.addEventListener('pause', () => {
        setPlayingStatus(false);
        ui.updatePlayButton(false);
    });

    audioPlayer.addEventListener('ended', () => {
        if (playMode === 'single') {
            audioPlayer.currentTime = 0;
            audioPlayer.play();
        } else {
            nextSong();
        }
    });

    audioPlayer.addEventListener('timeupdate', () => {
        if (audioPlayer.duration) {
            ui.updateProgress(audioPlayer.currentTime, audioPlayer.duration);
            if (currentLyrics.length > 0) {
                ui.updateLyrics(currentLyrics, audioPlayer.currentTime);
                ui.updateInlineLyrics(currentLyrics, audioPlayer.currentTime);
            }
        }
    });

    audioPlayer.addEventListener('loadedmetadata', handleMetadataLoaded);

    // 新歌曲开始加载时重置试听检测计数
    audioPlayer.addEventListener('loadstart', () => {
        fullVersionSearchCount = 0;
    });

    audioPlayer.addEventListener('error', () => {
        const err = audioPlayer.error;
        const src = audioPlayer.src?.slice(0, 120);
        // 详细诊断：code 1=ABORTED, 2=NETWORK, 3=DECODE, 4=SRC_NOT_SUPPORTED
        const errMap: Record<number, string> = { 1: 'ABORTED', 2: 'NETWORK', 3: 'DECODE', 4: 'SRC_NOT_SUPPORTED' };
        const detail = err ? `code=${err.code}(${errMap[err.code] || 'UNKNOWN'}) msg=${err.message}` : 'no error object';
        logger.error('Audio Error:', detail, '\nsrc:', src);
        console.error('[music888] 播放失败诊断:', detail, '\n  src:', src);
        // 暴露到全局便于用户复制
        Object.assign(globalThis, {
            __music888LastError: { detail, src: audioPlayer.src, error: err },
        });
        ui.showNotification('音频资源加载错误，详情见控制台（F12）', 'error');
    });

    // 页面可见性变化：恢复被系统中断的播放
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && isPlaying && audioPlayer.paused) {
            logger.debug('页面恢复可见，尝试恢复播放');
            audioPlayer.play().catch(() => {});
        }
        // 更新 Media Session position state
        updatePositionState();
    });

    // 绑定 Media Session 控制按钮
    bindMediaSessionActions();
}

/**
 * 处理元数据加载（用于试听检测）
 */
async function handleMetadataLoaded(): Promise<void> {
    const duration = audioPlayer.duration;
    const song = getCurrentSong();

    if (!duration || !song) return;

    // 试听检测逻辑
    const isProbablePreview =
        duration >= PREVIEW_DETECTION.MIN_DURATION &&
        duration <= PREVIEW_DETECTION.MAX_DURATION &&
        PREVIEW_DETECTION.TYPICAL_DURATIONS.some(t => Math.abs(duration - t) <= PREVIEW_DETECTION.DURATION_TOLERANCE);

    if (isProbablePreview && !isSeekingFullVersion && fullVersionSearchCount < 2) {
        isSeekingFullVersion = true;
        fullVersionSearchCount++;

        try {
            const quality = (document.getElementById('qualitySelect') as HTMLSelectElement)?.value || '320';
            const requestId = currentPlayRequestId;

            // 再次尝试获取完整版
            const result = await api.tryGetFullVersionFromNeteaseUnblock(song, quality) ||
                await api.tryGetFullVersionFromOtherSources(song, quality);

            if (requestId === currentPlayRequestId && result?.url) {
                logger.info('发现完整版，执行无缝切换');
                const wasPlaying = isPlaying;
                const currentTime = audioPlayer.currentTime;

                await fadeOut(audioPlayer);
                audioPlayer.src = api.toPlayableMediaUrl(result.url);
                audioPlayer.load();

                const cleanupTimer = setTimeout(() => {
                    audioPlayer.removeEventListener('canplay', canplayHandler);
                }, 15000);

                const canplayHandler = () => {
                    clearTimeout(cleanupTimer);
                    audioPlayer.currentTime = Math.min(currentTime, MAX_SEEK_ON_SWITCH);
                    if (wasPlaying) {
                        audioPlayer.play().then(() => fadeIn(audioPlayer)).catch(() => {});
                    }
                };

                audioPlayer.addEventListener('canplay', canplayHandler, { once: true });
            }
        } catch (e) {
            logger.debug('切换完整版失败', e);
        } finally {
            isSeekingFullVersion = false;
        }
    }
}

/**
 * 更新 Media Session (系统媒体控制)
 */
export function updateMediaSession(song: Song, coverUrl: string): void {
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: song.name,
            artist: Array.isArray(song.artist) ? song.artist.join('/') : song.artist,
            album: song.album,
            artwork: coverUrl ? [{ src: coverUrl, sizes: '512x512', type: 'image/jpeg' }] : []
        });
        updatePositionState();
    }
}

/**
 * 绑定 Media Session 操作（锁屏/通知栏控制）
 */
function bindMediaSessionActions(): void {
    if (!('mediaSession' in navigator)) return;

    const actions: Array<[MediaSessionAction, () => void]> = [
        ['play', () => { audioPlayer.play().catch(() => {}); }],
        ['pause', () => { audioPlayer.pause(); }],
        ['previoustrack', () => { previousSong(); }],
        ['nexttrack', () => { nextSong(); }],
        ['seekto', (details?: MediaSessionActionDetails) => {
            if (details && details.seekTime != null && isFinite(audioPlayer.duration)) {
                audioPlayer.currentTime = details.seekTime;
                updatePositionState();
            }
        }],
        ['seekbackward', (details?: MediaSessionActionDetails) => {
            const offset = details?.seekOffset || 10;
            audioPlayer.currentTime = Math.max(0, audioPlayer.currentTime - offset);
            updatePositionState();
        }],
        ['seekforward', (details?: MediaSessionActionDetails) => {
            const offset = details?.seekOffset || 10;
            audioPlayer.currentTime = Math.min(audioPlayer.duration || 0, audioPlayer.currentTime + offset);
            updatePositionState();
        }],
    ];

    for (const [action, handler] of actions) {
        try {
            navigator.mediaSession.setActionHandler(action, handler as MediaSessionActionHandler);
        } catch {
            logger.debug(`Media Session action "${action}" 不受支持`);
        }
    }
}

/**
 * 更新 Media Session 播放位置状态
 */
function updatePositionState(): void {
    if (!('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) return;
    if (!audioPlayer.duration || !isFinite(audioPlayer.duration)) return;

    try {
        navigator.mediaSession.setPositionState({
            duration: audioPlayer.duration,
            playbackRate: audioPlayer.playbackRate,
            position: audioPlayer.currentTime
        });
    } catch {
        // 部分浏览器可能不支持
    }
}
