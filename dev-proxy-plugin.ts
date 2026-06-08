/**
 * Vite 开发代理插件
 * 在本地开发环境中模拟 Cloudflare Pages Functions 代理的行为
 * NOTE: 仅用于开发环境，生产环境使用 functions/api/proxy.js
 */

import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';
import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';

const ALLOWED_HOSTS = [
    'music-api.gdstudio.xyz',
    'api.injahow.cn',
    'api.i-meto.com',
    'meting.qjqq.cn',
    'w7z.indevs.in',
    'netease-cloud-music-api-psi-three.vercel.app',
    'netease-cloud-music-api-five-roan.vercel.app',
    'y.qq.com',
    'music.163.com',
    'interface.music.163.com',
    'music.126.net',
    'm7.music.126.net',
    'm8.music.126.net',
    'm701.music.126.net',
    'm801.music.126.net',
    'p1.music.126.net',
    'p2.music.126.net',
    'dl.stream.qqmusic.qq.com',
    'ws.stream.qqmusic.qq.com',
    'isure.stream.qqmusic.qq.com',
    'trackercdn.kugou.com',
    'webfs.tx.kugou.com',
    'freetyst.nf.migu.cn',
    'sycdn.kuwo.cn',
    'other.web.nf01.sycdn.kuwo.cn',
    'other.web.ra01.sycdn.kuwo.cn',
    'joox.com',
    'api.joox.com',
    'ximalaya.com',
    'fdfs.xmcdn.com',
    'aod.cos.tx.xmcdn.com',
];

// NOTE: 上游请求超时时间
const UPSTREAM_TIMEOUT = 30000;

/**
 * 验证 URL 是否在白名单中
 */
function isUrlAllowed(url: string): boolean {
    try {
        const parsed = new URL(url);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            return false;
        }
        return ALLOWED_HOSTS.some(
            (host) => parsed.hostname === host || parsed.hostname.endsWith('.' + host)
        );
    } catch {
        return false;
    }
}

/**
 * 根据目标域名获取合适的 Referer
 */
function getRefererForHost(hostname: string): string {
    if (hostname.includes('gdstudio.xyz')) {
        return 'https://music-api.gdstudio.xyz/';
    } else if (hostname.includes('qq.com')) {
        return 'https://y.qq.com/';
    } else if (hostname.includes('kugou.com')) {
        return 'https://www.kugou.com/';
    } else if (hostname.includes('migu.cn')) {
        return 'https://music.migu.cn/';
    } else if (hostname.includes('kuwo.cn')) {
        return 'https://www.kuwo.cn/';
    } else if (hostname.includes('joox.com')) {
        return 'https://www.joox.com/';
    } else if (hostname.includes('i-meto.com')) {
        return 'https://api.i-meto.com/';
    } else if (hostname.includes('ximalaya.com') || hostname.includes('xmcdn.com')) {
        return 'https://www.ximalaya.com/';
    }
    return 'https://music.163.com/';
}

function proxyFetch(targetUrl: string, headers: Record<string, string>, maxRedirects = 5): Promise<{ status: number; contentType: string; contentLength: string | null; body: Buffer }> {
    return new Promise((resolve, reject) => {
        if (maxRedirects <= 0) {
            reject(new Error('Too many redirects'));
            return;
        }

        const parsed = new URL(targetUrl);
        const isSecure = parsed.protocol === 'https:';

        const proxyUrl = isSecure
            ? (process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy)
            : (process.env.HTTP_PROXY || process.env.http_proxy);

        const requestHeaders = { ...headers };

        const handleResponse = (res: http.IncomingMessage) => {
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                try {
                    const redirectUrl = new URL(res.headers.location, targetUrl).toString();
                    res.resume();
                    proxyFetch(redirectUrl, headers, maxRedirects - 1).then(resolve, reject);
                    return;
                } catch {
                    res.resume();
                    reject(new Error('Invalid redirect URL'));
                    return;
                }
            }

            const chunks: Buffer[] = [];
            res.on('data', (chunk: Buffer) => chunks.push(chunk));
            res.on('end', () => {
                resolve({
                    status: res.statusCode || 502,
                    contentType: res.headers['content-type'] || 'application/octet-stream',
                    contentLength: res.headers['content-length'] || null,
                    body: Buffer.concat(chunks),
                });
            });
            res.on('error', reject);
        };

        const applyTimeout = (req: http.ClientRequest) => {
            req.setTimeout(UPSTREAM_TIMEOUT, () => {
                req.destroy(new Error('Request timeout'));
            });
            req.on('error', reject);
        };

        if (proxyUrl) {
            try {
                const parsedProxy = new URL(proxyUrl);
                const proxyIsSecure = parsedProxy.protocol === 'https:';
                const proxyModule = proxyIsSecure ? https : http;
                const proxyPort = parseInt(parsedProxy.port) || (proxyIsSecure ? 443 : 80);

                if (isSecure) {
                    const connectReq = proxyModule.request({
                        host: parsedProxy.hostname,
                        port: proxyPort,
                        method: 'CONNECT',
                        path: `${parsed.hostname}:${parsed.port || 443}`,
                    });

                    connectReq.setTimeout(UPSTREAM_TIMEOUT, () => {
                        connectReq.destroy(new Error('Proxy connect timeout'));
                    });

                    connectReq.on('error', reject);

                    connectReq.on('connect', (connectRes, socket) => {
                        if (connectRes.statusCode !== 200) {
                            socket.destroy();
                            reject(new Error(`Proxy CONNECT failed: ${connectRes.statusCode}`));
                            return;
                        }

                        const tlsReq = https.request({
                            hostname: parsed.hostname,
                            port: parsed.port || 443,
                            path: parsed.pathname + parsed.search,
                            method: 'GET',
                            headers: {
                                ...requestHeaders,
                                Host: parsed.host,
                            },
                            socket,
                            agent: false,
                        }, handleResponse);

                        tlsReq.setTimeout(UPSTREAM_TIMEOUT, () => {
                            tlsReq.destroy(new Error('Request timeout'));
                        });

                        tlsReq.on('error', reject);
                        tlsReq.end();
                    });

                    connectReq.end();
                } else {
                    const req = proxyModule.request({
                        host: parsedProxy.hostname,
                        port: proxyPort,
                        path: targetUrl,
                        method: 'GET',
                        headers: {
                            ...requestHeaders,
                            Host: parsed.host,
                        },
                    }, handleResponse);

                    applyTimeout(req);
                    req.end();
                }
            } catch {
                reject(new Error(`Invalid proxy URL: ${proxyUrl}`));
                return;
            }
        } else {
            const httpModule = isSecure ? https : http;
            const req = httpModule.request({
                hostname: parsed.hostname,
                port: parsed.port || (isSecure ? 443 : 80),
                path: parsed.pathname + parsed.search,
                method: 'GET',
                headers: requestHeaders,
            }, handleResponse);

            applyTimeout(req);
            req.end();
        }
    });
}

async function handleProxyRequest(
    _req: IncomingMessage,
    res: ServerResponse,
    urlParam: string
): Promise<void> {
    const decodedUrl = decodeURIComponent(urlParam);

    if (!isUrlAllowed(decodedUrl)) {
        console.warn(`[dev-proxy] Blocked request to unauthorized URL: ${decodedUrl}`);
        res.statusCode = 403;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end(JSON.stringify({ error: 'URL not allowed' }));
        return;
    }

    try {
        const parsedUrl = new URL(decodedUrl);
        const referer = getRefererForHost(parsedUrl.hostname);

        const response = await proxyFetch(parsedUrl.toString(), {
            Referer: referer,
            Origin: referer.replace(/\/$/, ''),
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'application/json, text/plain, */*',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        });

        if (response.status >= 400) {
            console.error(`[dev-proxy] Upstream error: ${response.status} for ${decodedUrl.substring(0, 100)}`);
            res.statusCode = response.status;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(JSON.stringify({ error: `Upstream API responded with status: ${response.status}` }));
            return;
        }

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Content-Type', response.contentType);

        if (response.contentLength) {
            res.setHeader('Content-Length', response.contentLength);
        }

        if (response.contentType.includes('audio') || response.contentType.includes('octet-stream')) {
            res.setHeader('Accept-Ranges', 'bytes');
        }

        res.end(response.body);
    } catch (error) {
        if (error instanceof Error && error.message === 'Request timeout') {
            console.error('[dev-proxy] Request timeout:', decodedUrl.substring(0, 100));
            res.statusCode = 504;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(JSON.stringify({ error: 'Request timeout' }));
        } else {
            console.error('[dev-proxy] Request failed:', error);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(JSON.stringify({ error: 'Failed to proxy request' }));
        }
    }
}

/**
 * 创建开发代理插件
 */
export function devProxyPlugin(): Plugin {
    return {
        name: 'dev-proxy',
        configureServer(server) {
            server.middlewares.use(async (req, res, next) => {
                // 只处理 /api/proxy 路径
                if (!req.url?.startsWith('/api/proxy')) {
                    return next();
                }

                // 处理 CORS 预检请求
                if (req.method === 'OPTIONS') {
                    res.setHeader('Access-Control-Allow-Origin', '*');
                    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
                    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
                    res.setHeader('Access-Control-Max-Age', '86400');
                    res.statusCode = 204;
                    res.end();
                    return;
                }

                // 解析 URL 参数
                const url = new URL(req.url, 'http://localhost');
                const targetUrl = url.searchParams.get('url');

                if (!targetUrl) {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'URL parameter is required' }));
                    return;
                }

                await handleProxyRequest(req, res, targetUrl);
            });
        },
    };
}
