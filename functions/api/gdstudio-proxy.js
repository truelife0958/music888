/**
 * Cloudflare Workers - 音乐API代理
 * 支持: search, url, pic, lyric, playlist
 */

export async function onRequest(context) {
    const { request } = context;
    const url = new URL(request.url);
    
    // CORS预检
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        });
    }

    const types = url.searchParams.get('types');
    const source = url.searchParams.get('source');
    const id = url.searchParams.get('id');
    const name = url.searchParams.get('name');
    const br = url.searchParams.get('br') || '320';
    const size = url.searchParams.get('size') || '300';
    const count = url.searchParams.get('count') || '30';

    if (!types || !source) {
        return jsonResponse({ error: '缺少必要参数', required: ['types', 'source'] }, 400);
    }

    if (types === 'search' && !name) {
        return jsonResponse({ error: '搜索请求缺少 name 参数' }, 400);
    }

    if (['url', 'pic', 'lyric'].includes(types) && !id) {
        return jsonResponse({ error: `${types} 请求缺少 id 参数` }, 400);
    }

    try {
        const apiSources = [
            'https://music-api.gdstudio.xyz/api.php',
            'https://music-api.gdstudio.org/api.php'
        ];

        const errors = [];

        for (const apiUrl of apiSources) {
            try {
                const params = new URLSearchParams({ types, source });

                if (types === 'search') {
                    params.append('name', name);
                    params.append('count', count);
                } else if (types === 'url') {
                    params.append('id', id);
                    params.append('br', br);
                } else if (types === 'pic') {
                    params.append('id', id);
                    params.append('size', size);
                } else if (types === 'lyric' || types === 'playlist') {
                    params.append('id', id);
                }

                const targetUrl = `${apiUrl}?${params.toString()}`;

                const response = await fetch(targetUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0',
                        'Accept': 'application/json',
                        'Referer': 'https://music.weny888.com/'
                    },
                    cf: {
                        cacheTtl: 3600,
                        cacheEverything: true
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (validateResponse(data, types)) {
                        return jsonResponse(data);
                    } else {
                        errors.push(`${apiUrl}: 响应数据验证失败`);
                    }
                } else {
                    errors.push(`${apiUrl}: HTTP ${response.status}`);
                }
            } catch (apiError) {
                errors.push(`${apiUrl}: ${apiError.message}`);
                continue;
            }
        }

        return jsonResponse({
            error: '所有音乐源均不可用',
            details: errors
        }, 503);

    } catch (error) {
        return jsonResponse({
            error: '服务器内部错误',
            message: error.message
        }, 500);
    }
}

function validateResponse(data, types) {
    if (!data) return false;

    switch (types) {
        case 'search':
            return Array.isArray(data) && data.length > 0;
        case 'url':
            return data.url && typeof data.url === 'string';
        case 'pic':
            return data.url && typeof data.url === 'string';
        case 'lyric':
            return data.lyric !== undefined;
        case 'playlist':
            return Array.isArray(data) || (data.songs && Array.isArray(data.songs));
        default:
            return true;
    }
}

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    });
}