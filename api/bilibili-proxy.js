// Bilibili 音频代理服务
// 用于解决 CORS 和 Referer 问题

export default async function handler(req, res) {
    // 只允许 GET 请求
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({ error: 'Missing url parameter' });
        }

        // 验证URL是否来自Bilibili
        if (!url.includes('bilivideo.com') && !url.includes('hdslb.com')) {
            return res.status(403).json({ error: 'Invalid URL source' });
        }

        // 代理请求到Bilibili
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.bilibili.com/',
                'Origin': 'https://www.bilibili.com',
                'Accept': 'audio/webm,audio/ogg,audio/wav,audio/*;q=0.9,*/*;q=0.8'
            }
        });

        if (!response.ok) {
            return res.status(response.status).json({ 
                error: 'Failed to fetch audio' 
            });
        }

        // 获取内容类型
        const contentType = response.headers.get('content-type') || 'audio/mpeg';
        const contentLength = response.headers.get('content-length');

        // 设置响应头
        res.setHeader('Content-Type', contentType);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');
        res.setHeader('Accept-Ranges', 'bytes');
        
        if (contentLength) {
            res.setHeader('Content-Length', contentLength);
        }

        // 支持范围请求（用于拖动进度条）
        const range = req.headers.range;
        if (range) {
            res.setHeader('Content-Range', `bytes ${range}/`);
            res.status(206);
        }

        // 流式传输音频数据
        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));

    } catch (error) {
        console.error('Bilibili proxy error:', error);
        res.status(500).json({ 
            error: 'Proxy error',
            message: error.message 
        });
    }
}