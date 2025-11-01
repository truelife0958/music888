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
        const baseUrl = 'https://api.cenguigui.cn/api/bilibili/bilibili.php';
        const params = new URLSearchParams({ action });

        if (action === 'search') {
            if (!query) {
                res.status(400).json({ error: '搜索请求缺少 query 参数' });
                return;
            }
            params.append('query', query);
            params.append('page', page.toString());
            params.append('limit', limit.toString());
        } else if (action === 'media') {
            if (!bvid) {
                res.status(400).json({ error: '媒体请求缺少 bvid 参数' });
                return;
            }
            params.append('bvid', bvid);
            if (quality) {
                params.append('quality', quality);
            }
        } else {
            res.status(400).json({ error: '不支持的 action 类型' });
            return;
        }

        const url = `${baseUrl}?${params.toString()}`;

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
            console.log(`[Bilibili Proxy] 成功: action=${action}`);
            res.status(200).json(data);
        } else {
            const errorMsg = `Bilibili API 返回错误: ${response.status}`;
            console.error(`[Bilibili Proxy] ${errorMsg}`);
            res.status(response.status).json({
                error: errorMsg
            });
        }

    } catch (error) {
        const errorMsg = error.name === 'AbortError' ? '请求超时' : error.message;
        console.error('[Bilibili Proxy] 错误:', errorMsg, error);
        res.status(500).json({
            error: '服务器内部错误',
            message: errorMsg
        });
    }
}
