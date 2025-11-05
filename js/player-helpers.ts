/**
 * 播放器辅助函数模块
 * 将复杂的播放逻辑拆分为更小的、可复用的函数
 */

import { Song } from './api.js';
import { QUALITY_FALLBACK, QUALITY_NAMES, SOURCE_NAMES } from './config.js';
import * as api from './api.js';

/**
 * 品质尝试结果
 */
export interface QualityAttemptResult {
    urlData: { url: string; br: string; error?: string; usedSource?: string } | null;
    successQuality: string;
    lastError: string;
    usedFallback: boolean;
}

/**
 * 标准化歌曲数据 - 统一处理艺术家信息
 */
export function normalizeSongData(song: Song): Song {
    return {
        ...song,
        artist: Array.isArray(song.artist)
            ? song.artist.map((a: any) => typeof a === 'string' ? a : (a?.name || '未知歌手'))
            : (typeof song.artist === 'string' ? [song.artist] : ['未知歌手'])
    };
}

/**
 * 获取品质队列 - 按优先级排列
 */
export function getQualityQueue(preferredQuality: string): readonly string[] {
    return [preferredQuality, ...QUALITY_FALLBACK.filter(q => q !== preferredQuality)];
}

/**
 * 尝试获取音乐URL - 支持品质降级
 */
export async function tryGetSongUrl(
    song: Song,
    preferredQuality: string
): Promise<QualityAttemptResult> {
    const qualityQueue = getQualityQueue(preferredQuality);
    
    let urlData: { url: string; br: string; error?: string; usedSource?: string } | null = null;
    let successQuality = '';
    let lastError = '';
    const usedFallback = false;

    // 依次尝试各个品质
    for (const quality of qualityQueue) {
        try {
            const result = await api.getSongUrl(song, quality);

            if (result && result.url) {
                urlData = result;
                successQuality = quality;
                break;
            } else if (result && result.error) {
                lastError = result.error;
            }
        } catch (err) {
            lastError = err instanceof Error ? err.message : String(err);
            continue;
        }
    }

    return {
        urlData,
        successQuality,
        lastError,
        usedFallback
    };
}

/**
 * 显示品质切换通知
 */
export function showQualityNotification(
    successQuality: string,
    preferredQuality: string,
    usedFallback: boolean,
    usedSource?: string,
    showNotification?: (msg: string, type: 'info' | 'success' | 'warning' | 'error') => void
): void {
    if (!showNotification) return;

    // 提示音乐源切换信息
    if (usedFallback && usedSource) {
        showNotification(
            `已从备用音乐源 ${SOURCE_NAMES[usedSource] || usedSource} 获取`,
            'success'
        );
    }

    // 提示品质降级信息
    if (successQuality !== preferredQuality) {
        showNotification(
            `原品质不可用，已自动切换到 ${QUALITY_NAMES[successQuality] || successQuality}`,
            'warning'
        );
    }
}

/**
 * 构建详细的错误消息
 */
export function buildErrorMessage(song: Song, lastError: string): string {
    let errorMsg = `无法获取音乐链接 (${song.name})`;
    
    if (lastError.includes('版权') || lastError.includes('copyright')) {
        errorMsg += ' - 版权保护';
    } else if (lastError.includes('空URL')) {
        errorMsg += ' - 音乐源无此资源';
    } else if (lastError.includes('timeout') || lastError.includes('超时')) {
        errorMsg += ' - 网络超时';
    }
    
    return errorMsg;
}

/**
 * 更新下载按钮状态
 */
export function updateDownloadButtons(enabled: boolean): void {
    const downloadSongBtn = document.getElementById('downloadSongBtn') as HTMLButtonElement;
    const downloadLyricBtn = document.getElementById('downloadLyricBtn') as HTMLButtonElement;
    
    if (downloadSongBtn) downloadSongBtn.disabled = !enabled;
    if (downloadLyricBtn) downloadLyricBtn.disabled = !enabled;
}

/**
 * 处理音频源 - 特殊处理Bilibili等平台
 */
export function processAudioSource(song: Song, urlData: { url: string }): string {
    // Bilibili 音乐源使用代理服务
    if (song.source === 'bilibili') {
        return `/api/bilibili-proxy?url=${encodeURIComponent(urlData.url)}`;
    }
    
    // 其他源统一使用HTTPS
    return urlData.url.replace(/^http:/, 'https:');
}

/**
 * 检查是否需要切换音乐源
 */
export function shouldSwitchSource(consecutiveFailures: number, threshold: number): boolean {
    return consecutiveFailures >= threshold;
}

/**
 * 检查是否应该停止自动播放
 */
export function shouldStopAutoplay(consecutiveFailures: number, maxFailures: number): boolean {
    return consecutiveFailures >= maxFailures;
}