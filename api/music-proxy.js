/**
 * Vercel Serverless Function - 音乐API代理
 * 支持: search, url, pic, lyric, playlist
 */

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { types, source, id, name, br, size, count = 30 } = req.query;

    if (!types || !source) {
        res.status(400).json({
            error: '缺少必要参数',
            required: ['types', 'source']
        });
        return;
    }

    if (types === 'search' && !name) {
        res.status(400).json({ error: '搜索请求缺少 name 参数' });
        return;
    }

    if (['url', 'pic', 'lyric'].includes(types) && !id) {
        res.status(400).json({ error: `${types} 请求缺少 id 参数` });
        return;
    }

    try {
        const apiSources = [
            {
                name: 'gdstudio-xyz',
                url: 'https://music-api.gdstudio.xyz/api.php'
            },
            {
                name: 'gdstudio-org',
                url: 'https://music-api.gdstudio.org/api.php'
            }
        ];

        const errors = [];

        for (const api of apiSources) {
            try {
                // 构建查询参数
                const params = new URLSearchParams({
                    types,
                    source
                });

                if (types === 'search') {
                    params.append('name', name);
                    params.append('count', count);
                } else if (types === 'url') {
                    params.append('id', id);
                    params.append('br', br || '320');
                } else if (types === 'pic') {
                    params.append('id', id);
                    params.append('size', size || '300');
                } else if (types === 'lyric' || types === 'playlist') {
                    params.append('id', id);
                }

                const url = `${api.url}?${params.toString()}`;

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);

                const response = await fetch(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0',
                        'Accept': 'application/json',
                        'Referer': 'https://music.weny888.com/'
                    },
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (response.ok) {
                    const data = await response.json();

                    if (validateResponse(data, types)) {
                        console.log(`[Music Proxy] 成功: ${api.name}`);
                        res.status(200).json(data);
                        return;
                    } else {
                        errors.push(`${api.name}: 响应数据验证失败`);
                        console.warn(`[Music Proxy] ${api.name} 验证失败:`, data);
                    }
                } else {
                    errors.push(`${api.name}: HTTP ${response.status}`);
                    console.warn(`[Music Proxy] ${api.name} 失败: ${response.status}`);
                }
            } catch (apiError) {
                const errorMsg = apiError.name === 'AbortError' ? '请求超时' : apiError.message;
                errors.push(`${api.name}: ${errorMsg}`);
                console.error(`[Music Proxy] ${api.name} 错误:`, errorMsg);
                continue;
            }
        }

        console.error('[Music Proxy] 所有API失败:', errors);
        res.status(503).json({
            error: '所有音乐源均不可用',
            details: errors
        });

    } catch (error) {
        res.status(500).json({
            error: '服务器内部错误',
            message: error.message
        });
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
