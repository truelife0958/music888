// api/meting.js - Meting API 格式兼容层
// 修复：转换为ES Module语法以兼容Vercel部署

import fetch from 'node-fetch';

/**
 * Meting API 兼容端点
 * 将Meting格式参数转换为标准API格式
 *
 * Meting格式: ?server=netease&type=search&name=xxx&count=30
 * 标准格式: ?types=search&source=netease&name=xxx&count=30
 */
export default async (req, res) => {
    try {
        // 老王注释：从查询参数中提取Meting API格式的参数
        const { server, type, id, name, count, br, size } = req.query;

        // 老王修复：参数验证
        if (!server || !type) {
            return res.status(400).json({
                error: '缺少必要参数',
                required: 'server, type',
                received: { server, type }
            });
        }

        // 老王修复：参数映射 - Meting格式转标准格式
        // server -> source (音乐源)
        // type -> types (操作类型)
        const source = server;  // netease, tencent, kugou等
        const types = type;     // search, url, lyric, pic, playlist

        // 老王注释：音乐API配置
        const MUSIC_APIS = {
            netease: {
                search: (name, count) => `https://music-api.gdstudio.xyz/api.php?types=search&source=netease&name=${encodeURIComponent(name)}&count=${count || 30}`,
                pic: (id, size) => `https://music-api.gdstudio.xyz/api.php?types=pic&source=netease&id=${id}&size=${size || 300}`,
                url: (id, br) => `https://music-api.gdstudio.xyz/api.php?types=url&source=netease&id=${id}&br=${br || 320}`,
                playlist: (id) => `https://music-api.gdstudio.xyz/api.php?types=playlist&source=netease&id=${id}`,
                lyric: (id) => `https://music-api.gdstudio.xyz/api.php?types=lyric&source=netease&id=${id}`
            },
            tencent: {
                search: (name, count) => `https://music-api.gdstudio.xyz/api.php?types=search&source=tencent&name=${encodeURIComponent(name)}&count=${count || 30}`,
                pic: (id, size) => `https://music-api.gdstudio.xyz/api.php?types=pic&source=tencent&id=${id}&size=${size || 300}`,
                url: (id, br) => `https://music-api.gdstudio.xyz/api.php?types=url&source=tencent&id=${id}&br=${br || 320}`,
                playlist: (id) => `https://music-api.gdstudio.xyz/api.php?types=playlist&source=tencent&id=${id}`,
                lyric: (id) => `https://music-api.gdstudio.xyz/api.php?types=lyric&source=tencent&id=${id}`
            },
            kugou: {
                search: (name, count) => `https://music-api.gdstudio.xyz/api.php?types=search&source=kugou&name=${encodeURIComponent(name)}&count=${count || 30}`,
                pic: (id, size) => `https://music-api.gdstudio.xyz/api.php?types=pic&source=kugou&id=${id}&size=${size || 300}`,
                url: (id, br) => `https://music-api.gdstudio.xyz/api.php?types=url&source=kugou&id=${id}&br=${br || 320}`,
                playlist: (id) => `https://music-api.gdstudio.xyz/api.php?types=playlist&source=kugou&id=${id}`,
                lyric: (id) => `https://music-api.gdstudio.xyz/api.php?types=lyric&source=kugou&id=${id}`
            },
            kuwo: {
                search: (name, count) => `https://music-api.gdstudio.xyz/api.php?types=search&source=kuwo&name=${encodeURIComponent(name)}&count=${count || 30}`,
                pic: (id, size) => `https://music-api.gdstudio.xyz/api.php?types=pic&source=kuwo&id=${id}&size=${size || 300}`,
                url: (id, br) => `https://music-api.gdstudio.xyz/api.php?types=url&source=kuwo&id=${id}&br=${br || 320}`,
                playlist: (id) => `https://music-api.gdstudio.xyz/api.php?types=playlist&source=kuwo&id=${id}`,
                lyric: (id) => `https://music-api.gdstudio.xyz/api.php?types=lyric&source=kuwo&id=${id}`
            },
            xiami: {
                search: (name, count) => `https://music-api.gdstudio.xyz/api.php?types=search&source=xiami&name=${encodeURIComponent(name)}&count=${count || 30}`,
                pic: (id, size) => `https://music-api.gdstudio.xyz/api.php?types=pic&source=xiami&id=${id}&size=${size || 300}`,
                url: (id, br) => `https://music-api.gdstudio.xyz/api.php?types=url&source=xiami&id=${id}&br=${br || 320}`,
                playlist: (id) => `https://music-api.gdstudio.xyz/api.php?types=playlist&source=xiami&id=${id}`,
                lyric: (id) => `https://music-api.gdstudio.xyz/api.php?types=lyric&source=xiami&id=${id}`
            },
            baidu: {
                search: (name, count) => `https://music-api.gdstudio.xyz/api.php?types=search&source=baidu&name=${encodeURIComponent(name)}&count=${count || 30}`,
                pic: (id, size) => `https://music-api.gdstudio.xyz/api.php?types=pic&source=baidu&id=${id}&size=${size || 300}`,
                url: (id, br) => `https://music-api.gdstudio.xyz/api.php?types=url&source=baidu&id=${id}&br=${br || 320}`,
                playlist: (id) => `https://music-api.gdstudio.xyz/api.php?types=playlist&source=baidu&id=${id}`,
                lyric: (id) => `https://music-api.gdstudio.xyz/api.php?types=lyric&source=baidu&id=${id}`
            },
            bilibili: {
                search: (name, count) => `https://music-api.gdstudio.xyz/api.php?types=search&source=bilibili&name=${encodeURIComponent(name)}&count=${count || 30}`,
                pic: (id, size) => `https://music-api.gdstudio.xyz/api.php?types=pic&source=bilibili&id=${id}&size=${size || 300}`,
                url: (id, br) => `https://music-api.gdstudio.xyz/api.php?types=url&source=bilibili&id=${id}&br=${br || 320}`,
                playlist: (id) => `https://music-api.gdstudio.xyz/api.php?types=playlist&source=bilibili&id=${id}`,
                lyric: (id) => `https://music-api.gdstudio.xyz/api.php?types=lyric&source=bilibili&id=${id}`
            }
        };

        // 老王修复：检查音乐源是否支持
        const api = MUSIC_APIS[source];
        if (!api) {
            return res.status(400).json({
                error: '不支持的音乐源',
                source,
                supported: Object.keys(MUSIC_APIS)
            });
        }

        // 老王修复：根据类型构建API URL
        let apiUrl;
        switch (types) {
            case 'search':
                if (!name) {
                    return res.status(400).json({ error: 'search类型需要name参数' });
                }
                apiUrl = api.search(name, count);
                break;
            case 'pic':
                if (!id) {
                    return res.status(400).json({ error: 'pic类型需要id参数' });
                }
                apiUrl = api.pic(id, size);
                break;
            case 'url':
                if (!id) {
                    return res.status(400).json({ error: 'url类型需要id参数' });
                }
                apiUrl = api.url(id, br);
                break;
            case 'playlist':
                if (!id) {
                    return res.status(400).json({ error: 'playlist类型需要id参数' });
                }
                apiUrl = api.playlist(id);
                break;
            case 'lyric':
                if (!id) {
                    return res.status(400).json({ error: 'lyric类型需要id参数' });
                }
                apiUrl = api.lyric(id);
                break;
            default:
                return res.status(400).json({
                    error: '不支持的请求类型',
                    type: types,
                    supported: ['search', 'url', 'pic', 'playlist', 'lyric']
                });
        }

        console.log(`[Meting API] ${types} request for ${source}: ${apiUrl}`);

        // 老王修复：调用音乐API
        const response = await fetch(apiUrl, {
            headers: {
                'Referer': 'https://music.163.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 10000
        });

        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // 老王修复：设置CORS头，允许跨域访问
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Cache-Control', 'public, max-age=3600'); // 缓存1小时

        return res.json(data);

    } catch (error) {
        console.error('[Meting API] Error:', error);

        // 老王修复：返回详细的错误信息
        return res.status(500).json({
            error: 'API请求失败',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};
