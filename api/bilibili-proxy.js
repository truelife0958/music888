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
