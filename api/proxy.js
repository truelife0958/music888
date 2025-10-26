const fetch = require('node-fetch');

const API_ENDPOINTS = {
    main: 'https://music-api.gdstudio.xyz/api.php',
    backup1: 'https://music-api.gdstudio.org/api.php',
    backup2: 'https://api.cenguigui.cn/api/bilibili/bilibili.php'
};

module.exports = async (req, res) => {
    const { url, types, source, name, count } = req.query;

    if (types && source && name) {
        // 处理音乐API代理请求
        let apiUrl;

        if (source === 'bilibili') {
            // Bilibili API 特殊处理
            apiUrl = `${API_ENDPOINTS.backup2}?action=search&query=${encodeURIComponent(name)}&page=1&limit=${count || 1000}`;
        } else {
            // 其他音乐API
            apiUrl = `${API_ENDPOINTS.main}?types=${types}&source=${source}&name=${encodeURIComponent(name)}&count=${count || 1000}`;
        }

        try {
            const response = await fetch(apiUrl, {
                headers: {
                    'Referer': 'https://y.qq.com/',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36'
                }
            });

            if (!response.ok) {
                return res.status(response.status).json({ error: `API responded with status: ${response.status}` });
            }

            const data = await response.json();

            // 特殊处理Bilibili API响应格式
            if (source === 'bilibili') {
                if (data.code === 200 && data.data && data.data.length > 0) {
                    const formattedData = data.data.map(item => ({
                        id: item.bvid,
                        name: item.title,
                        artist: [item.author],
                        album: 'B站音乐',
                        url_id: item.bvid,
                        pic_id: item.pic || '',
                        lyric_id: item.bvid,
                        source: 'bilibili'
                    }));
                    res.setHeader('Content-Type', 'application/json');
                    return res.json(formattedData);
                } else {
                    return res.json([]);
                }
            }

            res.setHeader('Content-Type', 'application/json');
            return res.json(data);

        } catch (error) {
            console.error('Music API proxy error:', error);

            // 如果主要API失败，尝试备用API
            if (source !== 'bilibili' && API_ENDPOINTS.main.includes('gdstudio.xyz')) {
                try {
                    const backupUrl = `${API_ENDPOINTS.backup1}?types=${types}&source=${source}&name=${encodeURIComponent(name)}&count=${count || 1000}`;
                    const backupResponse = await fetch(backupUrl, {
                        headers: {
                            'Referer': 'https://y.qq.com/',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36'
                        }
                    });

                    if (backupResponse.ok) {
                        const backupData = await backupResponse.json();
                        res.setHeader('Content-Type', 'application/json');
                        return res.json(backupData);
                    }
                } catch (backupError) {
                    console.error('Backup API also failed:', backupError);
                }
            }

            return res.status(500).json({ error: 'Failed to proxy music API request' });
        }
    } else if (url) {
        // 处理通用URL代理请求
        if (!url) {
            return res.status(400).json({ error: 'URL parameter is required' });
        }

        try {
            const decodedUrl = decodeURIComponent(url);

            const response = await fetch(decodedUrl, {
                headers: {
                    'Referer': 'https://y.qq.com/',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36'
                }
            });

            if (!response.ok) {
                return res.status(response.status).json({ error: `API responded with status: ${response.status}` });
            }

            res.setHeader('Content-Type', response.headers.get('content-type'));
            response.body.pipe(res);

        } catch (error) {
            console.error('Proxy error:', error);
            res.status(500).json({ error: 'Failed to proxy request' });
        }
    } else {
        return res.status(400).json({ error: 'Invalid request parameters' });
    }
};
