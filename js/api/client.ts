/**
 * 沄听播放器 - API 客户端基础模块
 * 负责底层网络请求、重试逻辑和代理转发
 */

import { MusicError, MusicErrorType } from '../types';
import { logger } from '../config';
import { normalizeUnknownError, parseErrorResponse, toMusicError } from './utils';

/** 代理端点路径 */
export const PROXY_ENDPOINT = '/api/proxy';

/**
 * 将外部 URL 转换为代理 URL
 * @param url 原始外部 API URL
 * @returns 代理后的 URL
 */
export function toProxyUrl(url: string): string {
    return `${PROXY_ENDPOINT}?url=${encodeURIComponent(url)}`;
}

/**
 * 将媒体资源 URL 统一转换为可播放/可下载的代理地址
 * - data/blob URL 原样返回
 * - 已经是代理地址时直接返回，避免重复编码
 * - 协议相对地址和 http 地址统一提升为 https，避免混合内容导致播放失败
 * - 其他外部 http(s) 资源统一通过代理访问
 */
export function toPlayableMediaUrl(url: string): string {
    if (!url) return '';

    if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith(`${PROXY_ENDPOINT}?`)) {
        return url;
    }

    if (url.startsWith('//')) {
        return toProxyUrl(`https:${url}`);
    }

    try {
        const parsed = new URL(url);

        if (parsed.protocol === 'data:' || parsed.protocol === 'blob:') {
            return url;
        }

        if (parsed.pathname === PROXY_ENDPOINT) {
            return url;
        }

        if (parsed.protocol === 'http:') {
            parsed.protocol = 'https:';
        }

        if (parsed.protocol === 'https:') {
            return toProxyUrl(parsed.toString());
        }

        return url;
    } catch {
        return url;
    }
}

/**
 * 带重试的 fetch 请求（自动通过代理）
 * @param url 原始外部 API URL
 * @param options fetch 选项
 * @param retries 重试次数
 * @param useProxy 是否使用代理（默认 true）
 * @param timeoutMs 单次请求超时时间
 */
export async function fetchWithRetry(
    url: string,
    options: RequestInit = {},
    retries: number = 2,
    useProxy: boolean = true,
    timeoutMs: number = 20000
): Promise<Response> {
    const requestUrl = useProxy ? toProxyUrl(url) : url;

    for (let i = 0; i <= retries; i++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            // 附加 Turnstile token（仅代理请求，一次性使用后清除）
            const requestOptions: RequestInit = { ...options, signal: controller.signal };
            if (useProxy) {
                try {
                    const turnstileToken = sessionStorage.getItem('music888_turnstile_token');
                    if (turnstileToken) {
                        const headers = new Headers(options.headers);
                        headers.set('X-Turnstile-Token', turnstileToken);
                        requestOptions.headers = headers;
                        // Turnstile token 是一次性的，发送后立即清除避免重复使用
                        sessionStorage.removeItem('music888_turnstile_token');
                    }
                } catch {
                    // sessionStorage 不可用（隐私模式等），跳过 token 附加
                }
            }

            const response = await fetch(requestUrl, requestOptions);
            clearTimeout(timeoutId);

            if (response.ok) {
                return response;
            } else {
                const parsedError = await parseErrorResponse(response);
                throw toMusicError(parsedError);
            }
        } catch (error) {
            logger.error(`Request failed (attempt ${i + 1}/${retries + 1}):`, error);
            if (i === retries) {
                if (error instanceof MusicError) {
                    throw error;
                }
                const normalizedError = normalizeUnknownError(
                    error,
                    '网络请求失败，请检查网络连接'
                );
                throw toMusicError(
                    normalizedError,
                    error instanceof Error ? error : undefined
                );
            }
        } finally {
            clearTimeout(timeoutId);
        }
    }
    throw new MusicError(MusicErrorType.NETWORK, 'All fetch attempts failed.', '网络请求失败，请稍后重试');
}
