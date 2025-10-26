#!/bin/bash

# 音乐播放器 API 错误修复脚本
# 自动修复 API 代理配置和 CORS 问题

set -e

echo "🔧 开始修复音乐播放器 API 错误..."
echo ""

# 1. 备份原文件
echo "📦 备份原文件..."
cp api/music-proxy.js api/music-proxy.js.backup
echo "✅ 已备份 api/music-proxy.js"

# 2. 创建优化的 music-proxy.js
echo ""
echo "🔨 创建优化的 API 代理..."
cat > api/music-proxy-fixed.js << 'ENDFILE'
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

        for (const api of apiSources) {
            try {
                let url = `${api.url}?types=${types}&source=${source}`;

                if (types === 'search') {
                    url += `&name=${encodeURIComponent(name)}&count=${count}`;
                } else if (types === 'url') {
                    url += `&id=${id}&br=${br || 320}`;
                } else if (types === 'pic') {
                    url += `&id=${id}&size=${size || 300}`;
                } else if (types === 'lyric') {
                    url += `&id=${id}`;
                } else if (types === 'playlist') {
                    url += `&id=${id}`;
                }

                console.log(`[Music Proxy] 尝试 ${api.name}: ${url}`);

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
                        console.log(`[Music Proxy] ✅ ${api.name} 成功`);
                        res.status(200).json(data);
                        return;
                    }
                }
            } catch (apiError) {
                console.log(`[Music Proxy] ❌ ${api.name} 失败`);
                continue;
            }
        }

        res.status(503).json({
            error: '所有音乐源均不可用'
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
ENDFILE

echo "✅ 已创建 api/music-proxy-fixed.js"

# 3. 创建 Bilibili 代理
echo ""
echo "🔨 创建 Bilibili API 代理..."
cat > api/bilibili-proxy-fixed.js << 'ENDFILE'
/**
 * Vercel Serverless Function - Bilibili API 代理
 * 解决 CORS 跨域问题
 */

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { action, query, bvid, quality, page = 1, limit = 100 } = req.query;

    if (!action) {
        res.status(400).json({ error: '缺少 action 参数' });
        return;
    }

    try {
        let url = 'https://api.cenguigui.cn/api/bilibili/bilibili.php';

        if (action === 'search') {
            if (!query) {
                res.status(400).json({ error: '搜索请求缺少 query 参数' });
                return;
            }
            url += `?action=search&query=${encodeURIComponent(query)}&page=${page}&limit=${limit}`;
        } else if (action === 'media') {
            if (!bvid) {
                res.status(400).json({ error: '媒体请求缺少 bvid 参数' });
                return;
            }
            url += `?action=media&bvid=${bvid}`;
            if (quality) {
                url += `&quality=${quality}`;
            }
        } else {
            res.status(400).json({ error: '不支持的 action 类型' });
            return;
        }

        console.log(`[Bilibili Proxy] 请求: ${url}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Referer': 'https://music.weny888.com/'
            },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            console.log(`[Bilibili Proxy] ✅ 成功`);
            res.status(200).json(data);
        } else {
            console.log(`[Bilibili Proxy] ❌ HTTP错误: ${response.status}`);
            res.status(response.status).json({
                error: `Bilibili API 返回错误: ${response.status}`
            });
        }

    } catch (error) {
        console.error('[Bilibili Proxy] 错误:', error);
        res.status(500).json({
            error: '服务器内部错误',
            message: error.message
        });
    }
}
ENDFILE

echo "✅ 已创建 api/bilibili-proxy-fixed.js"

# 4. 显示修复说明
echo ""
echo "📋 修复完成! 请执行以下步骤:"
echo ""
echo "1. 替换 API 代理文件:"
echo "   mv api/music-proxy-fixed.js api/music-proxy.js"
echo ""
echo "2. 替换 Bilibili 代理文件:"
echo "   mv api/bilibili-proxy-fixed.js api/bilibili-proxy.js"
echo ""
echo "3. 更新前端代码中的 Bilibili API 调用:"
echo "   将 'https://api.cenguigui.cn/api/bilibili/bilibili.php'"
echo "   替换为 '/api/bilibili-proxy'"
echo ""
echo "4. 重新部署到 Vercel"
echo ""
echo "5. 如果需要回滚,使用备份文件:"
echo "   mv api/music-proxy.js.backup api/music-proxy.js"
echo ""
echo "✅ 所有修复文件已准备就绪!"

