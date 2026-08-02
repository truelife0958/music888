/**
 * Cloudflare Pages Functions Proxy
 * 适配 Cloudflare Workers 运行时
 */

// NOTE: Cloudflare Pages Functions 是无状态的，内存速率限制无法跨实例共享。
// 生产环境应使用 Cloudflare Rate Limiting Rules（在 Dashboard 中配置）
// 或 Cloudflare KV / Durable Objects 实现分布式速率限制。
// 此内存版本仅作为单实例内的基本防护。
const rateLimitStore = new Map();
const RATE_LIMIT = {
    windowMs: 60 * 1000,
    maxRequests: 60,
};
const RATE_LIMIT_STORE_MAX_ENTRIES = 5000;
const UPSTREAM_TIMEOUT_MS = 30000;
const TURNSTILE_TIMEOUT_MS = 5000;

function getErrorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}

function isAbortError(error) {
    return Boolean(error && typeof error === 'object' && 'name' in error && error.name === 'AbortError');
}

function pruneRateLimitStore(now) {
    if (rateLimitStore.size <= RATE_LIMIT_STORE_MAX_ENTRIES) return;

    for (const [ip, data] of rateLimitStore) {
        if (now - data.windowStart > RATE_LIMIT.windowMs) {
            rateLimitStore.delete(ip);
        }
    }

    while (rateLimitStore.size > RATE_LIMIT_STORE_MAX_ENTRIES) {
        const oldestIp = rateLimitStore.keys().next().value;
        if (!oldestIp) break;
        rateLimitStore.delete(oldestIp);
    }
}

async function fetchWithTimeout(resource, init = {}, timeoutMs = UPSTREAM_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(resource, {
            ...init,
            signal: controller.signal,
        });
    } finally {
        clearTimeout(timeoutId);
    }
}

function checkRateLimit(ip) {
    const now = Date.now();
    pruneRateLimitStore(now);

    let data = rateLimitStore.get(ip);

    if (!data || now - data.windowStart > RATE_LIMIT.windowMs) {
        data = { windowStart: now, count: 1 };
        rateLimitStore.set(ip, data);
        return { allowed: true, remaining: RATE_LIMIT.maxRequests - 1, reset: now + RATE_LIMIT.windowMs };
    }

    data.count++;
    return {
        allowed: data.count <= RATE_LIMIT.maxRequests,
        remaining: Math.max(0, RATE_LIMIT.maxRequests - data.count),
        reset: data.windowStart + RATE_LIMIT.windowMs,
    };
}

/** 允许的前端来源（CORS）- 硬编码基础列表 */
const BASE_ALLOWED_ORIGINS = ['https://music.weny888.com', 'http://localhost:5173', 'http://localhost:4173'];

function getCorsOrigin(requestOrigin = '', env = {}) {
    const allowed = [...BASE_ALLOWED_ORIGINS];
    if (env.EXTRA_ALLOWED_ORIGINS) {
        for (const o of env.EXTRA_ALLOWED_ORIGINS.split(',')) {
            const trimmed = o.trim();
            if (trimmed) allowed.push(trimmed);
        }
    }
    if (requestOrigin && allowed.includes(requestOrigin)) return requestOrigin;
    if (requestOrigin) {
        try {
            const url = new URL(requestOrigin);
            if (url.hostname.endsWith('.pages.dev')) return requestOrigin;
        } catch {}
    }
    return allowed[0];
}

function createCorsHeaders(requestOrigin = '', env = {}) {
    return {
        'Access-Control-Allow-Origin': getCorsOrigin(requestOrigin, env),
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Turnstile-Token, Range',
        'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges',
        'Access-Control-Max-Age': '86400',
        Vary: 'Origin',
    };
}

function createJsonErrorResponse(requestOrigin, status, code, message, extraHeaders = {}, env = {}) {
    return new Response(
        JSON.stringify({
            success: false,
            error: {
                code,
                message,
                status,
            },
        }),
        {
            status,
            headers: {
                'Content-Type': 'application/json',
                ...createCorsHeaders(requestOrigin, env),
                ...extraHeaders,
            },
        }
    );
}

/** 精确匹配的主机名 */
const ALLOWED_HOSTS_EXACT = new Set([
    // 音乐 API 源
    'music-api.gdstudio.xyz',
    'api.injahow.cn',
    'api.i-meto.com',
    'w7z.indevs.in',
    // NEC Enhanced 镜像群（主源与回退）
    'neteaseapi.gksm.store',
    'www.megumi-ben.cn',
    'www.fish6.icu',
    'music888.zeabur.app',
    'netease-cloud-music-api-psi-three.vercel.app',
    'netease-cloud-music-api-five-roan.vercel.app',
    // QQ 音乐
    'y.qq.com',
    // 网易云音乐
    'music.163.com',
    'interface.music.163.com',
    // 网易云音乐 CDN (音频流)
    'music.126.net',
    'm7.music.126.net',
    'm8.music.126.net',
    'm701.music.126.net',
    'm801.music.126.net',
    'p1.music.126.net',
    'p2.music.126.net',
    // QQ 音乐 CDN
    'dl.stream.qqmusic.qq.com',
    'ws.stream.qqmusic.qq.com',
    'isure.stream.qqmusic.qq.com',
    // 酷狗音乐 CDN
    'trackercdn.kugou.com',
    'webfs.tx.kugou.com',
    // 咪咕音乐 CDN
    'freetyst.nf.migu.cn',
    // 酷我音乐 CDN
    'sycdn.kuwo.cn',
    'other.web.nf01.sycdn.kuwo.cn',
    'other.web.ra01.sycdn.kuwo.cn',
    // JOOX CDN
    'api.joox.com',
    'stream.music.joox.com',
    // Bilibili 音频 / 视频 CDN（跨源回退音源）
    'bilivideo.com',
    'bilivideo.cn',
    // 喜马拉雅 CDN
    'fdfs.xmcdn.com',
    'aod.cos.tx.xmcdn.com',
]);

/** 允许子域名匹配的后缀（仅限已知 CDN 模式） */
const ALLOWED_HOST_SUFFIXES = [
    '.music.126.net',
    '.stream.qqmusic.qq.com',
    '.kugou.com',
    '.sycdn.kuwo.cn',
    '.xmcdn.com',
    '.nf.migu.cn',
    '.joox.com',
    '.bilivideo.com',
    '.bilivideo.cn',
    '.migu.cn',
];

function isHostAllowed(hostname, env = {}) {
    if (ALLOWED_HOSTS_EXACT.has(hostname)) return true;
    if (ALLOWED_HOST_SUFFIXES.some(suffix => hostname.endsWith(suffix))) return true;
    if (env.EXTRA_ALLOWED_HOSTS) {
        for (const h of env.EXTRA_ALLOWED_HOSTS.split(',')) {
            const trimmed = h.trim();
            if (trimmed && (hostname === trimmed || hostname.endsWith('.' + trimmed))) return true;
        }
    }
    return false;
}

const NETEASE_COOKIE_HOSTS = [
    'music.163.com',
    'netease-cloud-music-api-psi-three.vercel.app',
    'netease-cloud-music-api-five-roan.vercel.app',
    'w7z.indevs.in',
];

export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const requestOrigin = request.headers.get('Origin') || '';

    // OPTIONS 预检处理
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: createCorsHeaders(requestOrigin, env),
        });
    }

    const targetUrlParam = url.searchParams.get('url');

    if (!targetUrlParam) {
        return createJsonErrorResponse(requestOrigin, 400, 'MISSING_URL', '缺少请求地址', {}, env);
    }

    let decodedUrl = '';
    try {
        decodedUrl = decodeURIComponent(targetUrlParam);
    } catch {
        return createJsonErrorResponse(requestOrigin, 400, 'INVALID_URL', '请求地址格式无效', {}, env);
    }

    const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';

    // 1. 速率限制
    const rate = checkRateLimit(clientIp);
    if (!rate.allowed) {
        return createJsonErrorResponse(
            requestOrigin,
            429,
            'RATE_LIMITED',
            '请求过于频繁，请稍后再试',
            {
                'X-RateLimit-Reset': Math.ceil(rate.reset / 1000).toString(),
            },
            env
        );
    }

    // 2. Turnstile 验证（仅日志记录，不阻断请求）
    // 注意：Turnstile token 是一次性的，客户端可能发送已用过的 token，
    // 因此服务端验证仅用于审计，不作为访问控制依据。前端挑战是主要防护。
    const turnstileSecret = env.TURNSTILE_SECRET_KEY;
    const turnstileToken = request.headers.get('X-Turnstile-Token');
    if (turnstileSecret && turnstileToken) {
        try {
            const verifyRes = await fetchWithTimeout(
                'https://challenges.cloudflare.com/turnstile/v0/siteverify',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        secret: turnstileSecret,
                        response: turnstileToken,
                        remoteip: clientIp,
                    }),
                },
                TURNSTILE_TIMEOUT_MS
            );
            const verifyData = await verifyRes.json();
            if (!verifyData.success) {
                console.warn('[proxy] Turnstile token invalid (possibly reused):', JSON.stringify(verifyData));
            }
        } catch (e) {
            console.error('[proxy] Turnstile verify error:', getErrorMessage(e));
        }
    }

    // 3. 安全检查
    let parsedTarget;
    try {
        parsedTarget = new URL(decodedUrl);
    } catch {
        return createJsonErrorResponse(requestOrigin, 400, 'INVALID_URL', '请求地址格式无效', {}, env);
    }

    try {
        // 协议验证：仅允许 http/https
        if (parsedTarget.protocol !== 'http:' && parsedTarget.protocol !== 'https:') {
            return createJsonErrorResponse(requestOrigin, 400, 'INVALID_URL', '请求地址格式无效', {}, env);
        }

        if (!isHostAllowed(parsedTarget.hostname, env)) {
            return createJsonErrorResponse(requestOrigin, 403, 'FORBIDDEN_HOST', '当前域名不允许通过代理访问', {}, env);
        }

        // 3. 构建请求头
        const refererMap = {
            'gdstudio.xyz': 'https://music-api.gdstudio.xyz/',
            'qq.com': 'https://y.qq.com/',
            'kugou.com': 'https://www.kugou.com/',
            'migu.cn': 'https://music.migu.cn/',
            'kuwo.cn': 'https://www.kuwo.cn/',
            'api.i-meto.com': 'https://api.i-meto.com/',
            'ximalaya.com': 'https://www.ximalaya.com/',
            'xmcdn.com': 'https://www.ximalaya.com/',
        };

        let referer = 'https://music.163.com/';
        for (const [key, val] of Object.entries(refererMap)) {
            if (parsedTarget.hostname.includes(key)) {
                referer = val;
                break;
            }
        }

        const headers = new Headers({
            Referer: referer,
            Origin: referer.replace(/\/$/, ''),
            'User-Agent':
                request.headers.get('User-Agent') ||
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: request.headers.get('Accept') || '*/*',
        });

        // 转发 Range 请求头，支持音频拖动/缓冲
        const rangeHeader = request.headers.get('Range');
        if (rangeHeader) {
            headers.set('Range', rangeHeader);
        }

        // 针对 GDStudio API 的特殊处理
        if (parsedTarget.hostname.includes('gdstudio.xyz')) {
            headers.set('Accept-Language', 'zh-CN,zh;q=0.9,en;q=0.8');
            headers.set('Cache-Control', 'no-cache');
            headers.set('Sec-Fetch-Dest', 'empty');
            headers.set('Sec-Fetch-Mode', 'cors');
            headers.set('Sec-Fetch-Site', 'same-site');
        }

        const vipCookie = env.NETEASE_VIP_COOKIE;
        const isNeteaseHost = NETEASE_COOKIE_HOSTS.some(
            host => parsedTarget.hostname === host || parsedTarget.hostname.endsWith('.' + host)
        );

        if (vipCookie && isNeteaseHost) {
            headers.set('Cookie', vipCookie);
        }

        // 4. 发起上游请求
        const response = await fetchWithTimeout(parsedTarget.toString(), {
            method: 'GET',
            headers,
            redirect: 'follow',
        });

        // 5xx 上游错误才返回错误，206 Partial Content 需要正常转发
        if (response.status >= 500) {
            return createJsonErrorResponse(
                requestOrigin,
                response.status,
                'UPSTREAM_ERROR',
                '上游服务响应异常，请稍后重试',
                {},
                env
            );
        }

        // 5. 转发响应
        const newHeaders = new Headers(response.headers);
        Object.entries(createCorsHeaders(requestOrigin, env)).forEach(([key, value]) => {
            newHeaders.set(key, value);
        });

        // 音频流处理适配：确保支持 Range 请求
        const contentType = response.headers.get('content-type') || '';
        const isAudio = contentType.includes('audio') || contentType.includes('octet-stream');
        if (isAudio) {
            newHeaders.set('Accept-Ranges', 'bytes');
        }

        // 转发 Content-Range 头（206 响应必需）
        const contentRange = response.headers.get('Content-Range');
        if (contentRange) {
            newHeaders.set('Content-Range', contentRange);
        }

        return new Response(response.body, {
            status: response.status,
            headers: newHeaders,
        });
    } catch (error) {
        console.error('[proxy] Request failed:', getErrorMessage(error));

        if (isAbortError(error)) {
            return createJsonErrorResponse(
                requestOrigin,
                504,
                'UPSTREAM_TIMEOUT',
                '上游服务响应超时，请稍后重试',
                {},
                env
            );
        }

        return createJsonErrorResponse(
            requestOrigin,
            500,
            'PROXY_REQUEST_FAILED',
            '代理服务暂时不可用，请稍后重试',
            {},
            env
        );
    }
}
