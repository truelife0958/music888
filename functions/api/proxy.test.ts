import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MusicError, MusicErrorType } from '../../js/types';

function createContext(url: string, init?: RequestInit & { env?: Record<string, string>; ip?: string }) {
    const headers = new Headers(init?.headers);
    if (init?.ip) {
        headers.set('CF-Connecting-IP', init.ip);
    }
    if (!headers.has('Origin')) {
        headers.set('Origin', 'http://localhost:5173');
    }

    return {
        request: new Request(url, {
            method: init?.method ?? 'GET',
            headers,
        }),
        env: init?.env ?? {},
    };
}

function proxyUrl(targetUrl: string) {
    return 'https://example.com/api/proxy?url=' + encodeURIComponent(targetUrl);
}

describe('proxy governance', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.restoreAllMocks();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('returns a normalized 400 error for an invalid target URL', async () => {
        const { onRequest } = await import('./proxy.js');

        const response = await onRequest(createContext('https://example.com/api/proxy?url=not-a-valid-url'));

        expect(response.status).toBe(400);
        expect(response.headers.get('Content-Type')).toContain('application/json');
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
        await expect(response.json()).resolves.toMatchObject({
            success: false,
            error: {
                code: 'INVALID_URL',
                status: 400,
            },
        });
    });

    it('rejects hosts outside the allowlist', async () => {
        const { onRequest } = await import('./proxy.js');

        const response = await onRequest(createContext(proxyUrl('https://evil.example.com/song.mp3')));

        expect(response.status).toBe(403);
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
        await expect(response.json()).resolves.toMatchObject({
            success: false,
            error: {
                code: 'FORBIDDEN_HOST',
                status: 403,
            },
        });
    });

    it('returns a normalized 429 error when the in-memory rate limit is hit', async () => {
        const fetchMock = vi.fn(async () =>
            new Response(JSON.stringify({ ok: true }), {
                status: 200,
                headers: {
                    'content-type': 'application/json',
                },
            })
        );
        vi.stubGlobal('fetch', fetchMock);

        const { onRequest } = await import('./proxy.js');
        const contextUrl = proxyUrl('https://music.163.com/song?id=1');

        for (let i = 0; i < 60; i++) {
            const okResponse = await onRequest(createContext(contextUrl, { ip: '203.0.113.8' }));
            expect(okResponse.status).toBe(200);
        }

        const response = await onRequest(createContext(contextUrl, { ip: '203.0.113.8' }));

        expect(response.status).toBe(429);
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
        expect(response.headers.get('X-RateLimit-Reset')).toMatch(/^\d+$/);
        await expect(response.json()).resolves.toMatchObject({
            success: false,
            error: {
                code: 'RATE_LIMITED',
                status: 429,
            },
        });
    });

    it('keeps forwarding when Turnstile audit detects a reused token', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(JSON.stringify({ success: false, 'error-codes': ['timeout-or-duplicate'] }), {
                    status: 200,
                    headers: {
                        'content-type': 'application/json',
                    },
                })
            )
            .mockResolvedValueOnce(
                new Response(JSON.stringify({ ok: true }), {
                    status: 200,
                    headers: {
                        'content-type': 'application/json',
                    },
                })
            );
        vi.stubGlobal('fetch', fetchMock);

        const { onRequest } = await import('./proxy.js');
        const response = await onRequest(
            createContext(proxyUrl('https://music.163.com/song?id=1'), {
                env: { TURNSTILE_SECRET_KEY: 'secret' },
                headers: { 'X-Turnstile-Token': 'used-token' },
                ip: '203.0.113.12',
            })
        );

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({ ok: true });
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(fetchMock.mock.calls[1][0]).toBe('https://music.163.com/song?id=1');
        expect(warnSpy).toHaveBeenCalledWith(
            '[proxy] Turnstile token invalid (possibly reused):',
            JSON.stringify({ success: false, 'error-codes': ['timeout-or-duplicate'] })
        );
    });

    it('returns a normalized 504 error when the upstream request times out', async () => {
        vi.useFakeTimers();

        const fetchMock = vi.fn((_resource: string | URL | Request, init?: RequestInit) =>
            new Promise<Response>((_, reject) => {
                init?.signal?.addEventListener('abort', () => {
                    reject(new DOMException('The operation was aborted.', 'AbortError'));
                });
            })
        );
        vi.stubGlobal('fetch', fetchMock);

        const { onRequest } = await import('./proxy.js');
        const responsePromise = onRequest(
            createContext(proxyUrl('https://music.163.com/song?id=1'), {
                ip: '203.0.113.13',
            })
        );

        await vi.advanceTimersByTimeAsync(30000);
        const response = await responsePromise;

        expect(response.status).toBe(504);
        await expect(response.json()).resolves.toMatchObject({
            success: false,
            error: {
                code: 'UPSTREAM_TIMEOUT',
                status: 504,
            },
        });
    });

    it('normalizes proxy API errors into a displayable MusicError', async () => {
        const fetchMock = vi.fn(async () =>
            new Response(
                JSON.stringify({
                    success: false,
                    error: {
                        code: 'RATE_LIMITED',
                        message: 'Request too frequent',
                        status: 429,
                    },
                }),
                {
                    status: 429,
                    headers: {
                        'content-type': 'application/json',
                    },
                }
            )
        );
        vi.stubGlobal('fetch', fetchMock);

        const { fetchWithRetry } = await import('../../js/api/client');

        await expect(fetchWithRetry('https://music.163.com/song?id=1', {}, 0)).rejects.toMatchObject({
            name: 'MusicError',
            type: MusicErrorType.API,
            userMessage: '请求过于频繁，请稍后再试',
        });
    });

    it('renders MusicError objects as user-facing error text', async () => {
        document.body.innerHTML = '<div id="testContainer"></div>';

        const { showError } = await import('../../js/ui');

        showError(
            new MusicError(MusicErrorType.NETWORK, 'fetch failed', '网络连接异常，请检查网络后重试'),
            'testContainer'
        );

        const container = document.getElementById('testContainer');
        const feedbackState = container?.querySelector('[data-feedback-state="error"]');

        expect(feedbackState).not.toBeNull();
        expect(container?.textContent).toContain('网络连接异常，请检查网络后重试');
        expect(container?.textContent).not.toContain('[object Object]');
    });
});
