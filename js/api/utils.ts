/**
 * 沄听播放器 - API 工具模块
 * 包含相似度计算、数据统计与持久化等辅助功能
 */

import { logger } from '../config';
import { MusicError, MusicErrorType } from '../types';

export interface StandardizedApiError {
    code: string;
    message: string;
    status?: number;
    type: MusicErrorType;
    userMessage: string;
    retryable: boolean;
}

const STATUS_USER_MESSAGES: Record<number, string> = {
    400: '请求地址格式无效',
    403: '当前资源不允许通过代理访问',
    429: '请求过于频繁，请稍后再试',
    500: '代理服务暂时不可用，请稍后重试',
    502: '上游服务暂时不可用，请稍后重试',
    503: '服务暂时不可用，请稍后重试',
    504: '请求超时，请稍后重试',
};

const ERROR_CODE_USER_MESSAGES: Record<string, string> = {
    MISSING_URL: '缺少请求地址',
    INVALID_URL: '请求地址格式无效',
    FORBIDDEN_HOST: '当前资源不允许通过代理访问',
    RATE_LIMITED: '请求过于频繁，请稍后再试',
    UPSTREAM_ERROR: '上游服务响应异常，请稍后重试',
    PROXY_REQUEST_FAILED: '代理服务暂时不可用，请稍后重试',
    NETWORK_ERROR: '网络连接异常，请检查网络后重试',
    REQUEST_TIMEOUT: '请求超时，请稍后重试',
};

function isStandardizedApiError(value: unknown): value is StandardizedApiError {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const error = value as Partial<StandardizedApiError>;
    return typeof error.code === 'string' && typeof error.userMessage === 'string';
}

function resolveUserMessage(code?: string, status?: number, fallback?: string): string {
    if (code && ERROR_CODE_USER_MESSAGES[code]) {
        return ERROR_CODE_USER_MESSAGES[code];
    }

    if (typeof status === 'number' && STATUS_USER_MESSAGES[status]) {
        return STATUS_USER_MESSAGES[status];
    }

    return fallback || '操作失败，请稍后重试';
}

export function createStandardizedApiError(
    code: string,
    message: string,
    status?: number,
    type: MusicErrorType = MusicErrorType.API
): StandardizedApiError {
    return {
        code,
        message,
        status,
        type,
        userMessage: resolveUserMessage(code, status, message),
        retryable: status === 429 || (typeof status === 'number' && status >= 500),
    };
}

export async function parseErrorResponse(response: Response): Promise<StandardizedApiError> {
    const contentType = response.headers.get('content-type') || '';
    let payload: unknown = null;

    try {
        if (contentType.includes('application/json')) {
            payload = await response.json();
        } else {
            const text = await response.text();
            payload = text ? { error: { message: text } } : null;
        }
    } catch {
        payload = null;
    }

    const errorRecord =
        payload && typeof payload === 'object' && 'error' in payload
            ? (payload as { error?: { code?: string; message?: string; status?: number } }).error
            : undefined;

    const status = errorRecord?.status ?? response.status;
    const code = errorRecord?.code ?? `HTTP_${status}`;
    const message = errorRecord?.message ?? `请求失败 (${status})`;

    return createStandardizedApiError(code, message, status);
}

export function normalizeUnknownError(
    error: unknown,
    fallbackMessage: string = '操作失败，请稍后重试'
): StandardizedApiError {
    if (error instanceof MusicError) {
        return {
            code: error.type,
            message: error.message,
            status: undefined,
            type: error.type,
            userMessage: error.userMessage,
            retryable: error.type === MusicErrorType.NETWORK,
        };
    }

    if (isStandardizedApiError(error)) {
        return error;
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
        return createStandardizedApiError(
            'REQUEST_TIMEOUT',
            'Request aborted',
            504,
            MusicErrorType.NETWORK
        );
    }

    if (error instanceof Error) {
        return createStandardizedApiError(
            'NETWORK_ERROR',
            error.message,
            undefined,
            MusicErrorType.NETWORK
        );
    }

    if (typeof error === 'string' && error.trim()) {
        return createStandardizedApiError('UNKNOWN_ERROR', error, undefined, MusicErrorType.UNKNOWN);
    }

    return createStandardizedApiError(
        'UNKNOWN_ERROR',
        fallbackMessage,
        undefined,
        MusicErrorType.UNKNOWN
    );
}

export function toMusicError(error: StandardizedApiError, cause?: Error): MusicError {
    return new MusicError(error.type, `[${error.code}] ${error.message}`, error.userMessage, cause);
}

export function getUserFacingErrorMessage(
    error: unknown,
    fallbackMessage: string = '操作失败，请稍后重试'
): string {
    return normalizeUnknownError(error, fallbackMessage).userMessage;
}

/**
 * 计算两个字符串的相似度 (综合算法)
 */
export function calculateSimilarity(str1: string, str2: string): number {
    const normalize = (s: string) => s.toLowerCase().replace(/[\s\-\_\(\)\[\]（）]/g, '');
    const s1 = normalize(str1);
    const s2 = normalize(str2);

    if (s1 === s2) return 1.0;
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;

    // 简单的 Jaccard 相似度实现
    const set1 = new Set(s1);
    const set2 = new Set(s2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return intersection.size / union.size;
}

/**
 * 计算歌曲匹配得分
 */
export function calculateSongMatchScore(
    targetName: string,
    targetArtist: string,
    candidateName: string,
    candidateArtist: string | string[]
): number {
    const nameScore = calculateSimilarity(targetName, candidateName);
    const candidateArtistStr = Array.isArray(candidateArtist) ? candidateArtist.join('/') : candidateArtist;
    const artistScore = calculateSimilarity(targetArtist, candidateArtistStr);

    // 歌名权重 0.6，歌手权重 0.4
    return nameScore * 0.6 + artistScore * 0.4;
}

/** 备选源数据统计 */
export const sourceSuccessCount = new Map<string, number>();
export const sourceFailCount = new Map<string, number>();

/**
 * 可参与 GDStudio 跨源搜索和补全的音乐源。
 *
 * 这里只保留同时支持搜索和播放地址解析的源。失效或仅能搜索的源会让
 * 每次播放额外等待一个完整超时周期，因此不能仅凭“曾经支持”写入列表。
 */
export const FALLBACK_SOURCES = ['joox', 'bilibili'] as const;
/** 最近一次健康检测判定可用的音乐源 */
const healthySourceHints = new Set<string>();

export function setHealthySourceHints(sources: string[]): void {
    healthySourceHints.clear();
    sources.forEach(source => healthySourceHints.add(source));
}

export function getSourceHealthScore(source: string): number {
    const success = sourceSuccessCount.get(source) || 0;
    const fail = sourceFailCount.get(source) || 0;
    const healthBonus = healthySourceHints.has(source) ? 1000 : 0;
    return healthBonus + success - fail * 0.5;
}

/**
 * 获取排序后的备选源
 */
export function getSortedFallbackSources(excludeSource: string): string[] {
    return FALLBACK_SOURCES
        .filter(s => s !== excludeSource)
        .sort((a, b) => getSourceHealthScore(b) - getSourceHealthScore(a));
}

/**
 * 保存源统计数据
 */
export function saveSourceStats(): void {
    try {
        const stats = {
            success: Object.fromEntries(sourceSuccessCount),
            fail: Object.fromEntries(sourceFailCount)
        };
        localStorage.setItem('api_source_stats', JSON.stringify(stats));
    } catch (e) {
        logger.error('保存源统计失败', e);
    }
}

/**
 * 加载源统计数据
 */
export function loadSourceStats(): void {
    try {
        const data = localStorage.getItem('api_source_stats');
        if (data) {
            const stats = JSON.parse(data);
            Object.entries(stats.success || {}).forEach(([k, v]) => sourceSuccessCount.set(k, v as number));
            Object.entries(stats.fail || {}).forEach(([k, v]) => sourceFailCount.set(k, v as number));
        }
    } catch (e) {
        logger.debug('加载源统计失败', e);
    }
}
