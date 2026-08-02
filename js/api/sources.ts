/**
 * 沄听播放器 - API 源配置模块
 * 负责 API 来源定义、可用性检测和状态切换
 */

import { ApiSource, ApiDetectionResult } from '../types';
import { API_TIMEOUTS, NEC_MIRROR_URLS, getActiveNecBaseUrl, setActiveNecBase, logger } from '../config';
import { gdstudioCircuit, CircuitState } from '../circuit-breaker';
import { fetchWithRetry } from './client';
import {
    FALLBACK_SOURCES,
    getSourceHealthScore,
    saveSourceStats,
    setHealthySourceHints,
    sourceFailCount,
    sourceSuccessCount,
} from './utils';

/**
 * API 源配置列表
 * - GDStudio：多源聚合（netease/bilibili 等）
 * - NEC Enhanced 镜像群：按优先级排序，运行时首个可用镜像被设为激活
 *   （findWorkingAPI 顺序探测，setActiveNecBase 记录选中镜像）
 */
export const API_SOURCES: ApiSource[] = [
    {
        name: 'GDStudio API',
        url: 'https://music-api.gdstudio.xyz/api.php',
        type: 'gdstudio',
        supportsSearch: true,
    },
    ...NEC_MIRROR_URLS.map((url, i) => ({
        name: i === 0 ? 'NEC API (主镜像)' : `NEC API 镜像 ${i + 1}`,
        url,
        type: 'nec' as const,
        supportsSearch: true,
    })),
    {
        name: 'Meting API (i-meto)',
        url: 'https://api.i-meto.com/meting/api',
        type: 'meting',
        supportsSearch: true,
    },
];

/** 当前正在使用的 API 源 */
export let currentAPI = API_SOURCES[0];

/** 可搜索的音乐源候选列表 */
export const MUSIC_SOURCE_CANDIDATES = ['netease', ...FALLBACK_SOURCES] as const;

/** 最近一次健康检测通过的音乐源 */
export const availableMusicSources = new Set<string>(['netease']);

/** 最近一次音乐源健康检测时间 */
export let lastSourceHealthCheckAt = 0;

const SOURCE_HEALTH_CACHE_MS = 10 * 60 * 1000;
let sourceHealthCheckPromise: Promise<string[]> | null = null;

/**
 * 检查 GDStudio API 是否可用（通过断路器）
 */
export function isGDStudioApiAvailable(): boolean {
    return gdstudioCircuit.canExecute();
}

/**
 * 标记 GDStudio API 为不可用
 */
export function markGDStudioApiUnavailable(): void {
    gdstudioCircuit.recordFailure();
    const state = gdstudioCircuit.getState();
    if (state === CircuitState.OPEN) {
        logger.warn('GDStudio API 断路器已断开，将在恢复超时后重试');
    }
}

/**
 * 标记 GDStudio API 为可用
 */
export function markGDStudioApiAvailable(): void {
    gdstudioCircuit.recordSuccess();
}

/**
 * 获取首选的 Meting API URL
 */
export function getMetingApiUrl(): string {
    const meting = API_SOURCES.find(s => s.type === 'meting' && s.supportsSearch);
    return meting ? meting.url : 'https://api.i-meto.com/meting/api';
}
/**
 * 获取 NEC API URL（运行时动态选择首个健康镜像）
 */
export function getNecApiUrl(): string {
    return getActiveNecBaseUrl();
}

/**
 * 获取 GDStudio API URL
 */
export function getGDStudioApiUrl(): string {
    return 'https://music-api.gdstudio.xyz/api.php';
}

/**
 * 测试单个 API 的可用性
 */
export async function testAPI(api: ApiSource): Promise<boolean> {
    const testUrl = api.type === 'nec'
        ? `${api.url}/search?keywords=海阔天空&limit=1`
        : api.type === 'gdstudio'
            ? `${api.url}?types=search&source=netease&name=${encodeURIComponent('海阔天空')}&count=1`
            : `${api.url}?server=netease&type=search&id=海阔天空`;

    try {
        const response = await fetchWithRetry(testUrl, {}, 0, true, API_TIMEOUTS.API_DETECTION);
        const text = await response.text();
        const data: unknown = JSON.parse(text);

        if (api.type === 'nec') {
            const necData = data as { code?: number, result?: { code?: number } };
            return necData.code === 200 || necData.result?.code === 200;
        }
        if (api.type === 'gdstudio') {
            const objectData = typeof data === 'object' && data !== null ? data as Record<string, unknown> : null;
            return (Array.isArray(data) && data.length > 0) || (objectData !== null && (Object.keys(objectData).length > 0 || 'url' in objectData));
        }
        const objectData = typeof data === 'object' && data !== null ? data as Record<string, unknown> : null;
        return (Array.isArray(data) && data.length > 0) || (objectData !== null && !objectData.error);
    } catch {
        return false;
    }
}

async function testMusicSource(source: string): Promise<boolean> {
    if (!isGDStudioApiAvailable()) {
        return source === 'netease';
    }

    const url = `${getGDStudioApiUrl()}?types=search&source=${source}&name=${encodeURIComponent('周杰伦')}&count=1`;

    try {
        const response = await fetchWithRetry(url, {}, 0, true, API_TIMEOUTS.SOURCE_HEALTH);
        const data: unknown = await response.json();
        const songs = Array.isArray(data)
            ? data
            : data && typeof data === 'object'
                ? Object.values(data)
                : [];

        const available = songs.length > 0;
        if (available) {
            sourceSuccessCount.set(source, (sourceSuccessCount.get(source) || 0) + 1);
        } else {
            sourceFailCount.set(source, (sourceFailCount.get(source) || 0) + 1);
        }
        return available;
    } catch {
        sourceFailCount.set(source, (sourceFailCount.get(source) || 0) + 1);
        return source === 'netease';
    }
}

function applyAvailableMusicSources(sources: string[]): string[] {
    const normalized = Array.from(new Set(['netease', ...sources]));
    availableMusicSources.clear();
    normalized.forEach(source => availableMusicSources.add(source));
    setHealthySourceHints(normalized);
    saveSourceStats();
    return normalized;
}

/**
 * 后台检测各音乐源搜索可用性，缓存检测结果以减少首屏压力
 */
export async function detectAvailableMusicSources(options: { force?: boolean } = {}): Promise<string[]> {
    const now = Date.now();
    if (
        !options.force &&
        availableMusicSources.size > 1 &&
        now - lastSourceHealthCheckAt < SOURCE_HEALTH_CACHE_MS
    ) {
        return Array.from(availableMusicSources);
    }

    if (sourceHealthCheckPromise) {
        return sourceHealthCheckPromise;
    }

    sourceHealthCheckPromise = Promise.all(
        MUSIC_SOURCE_CANDIDATES.map(async source => ({
            source,
            available: await testMusicSource(source),
        }))
    )
        .then(results => {
            const healthy = results
                .filter(result => result.available)
                .map(result => result.source);
            lastSourceHealthCheckAt = Date.now();
            return applyAvailableMusicSources(healthy);
        })
        .finally(() => {
            sourceHealthCheckPromise = null;
        });

    return sourceHealthCheckPromise;
}

/**
 * 获取搜索源优先级：用户指定源优先，其次近期可用源，再按历史成功率补齐
 */
export function getPreferredSearchSources(primarySource: string = 'netease', maxSources: number = 4): string[] {
    const preferred = [
        primarySource,
        ...Array.from(availableMusicSources),
        ...MUSIC_SOURCE_CANDIDATES,
    ];

    return Array.from(new Set(preferred))
        .sort((a, b) => {
            if (a === primarySource) return -1;
            if (b === primarySource) return 1;
            return getSourceHealthScore(b) - getSourceHealthScore(a);
        })
        .slice(0, Math.max(1, maxSources));
}

/**
 * 自动查找并切换到可用的 API
 */
export async function findWorkingAPI(): Promise<ApiDetectionResult> {
    // 顺序探测，首个可用即返回，避免死镜像超时阻塞主流程
    for (const api of API_SOURCES) {
        try {
            const ok = await testAPI(api);
            if (ok) {
                currentAPI = api;
                if (api.type === 'nec') {
                    setActiveNecBase(api.url);
                    logger.info('NEC 激活镜像:', api.url);
                }
                return { success: true, name: api.name };
            }
        } catch {
            // 单个镜像探测失败，继续尝试下一个
        }
    }
    return { success: false };
}
