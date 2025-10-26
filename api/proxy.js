const fetch = require('node-fetch');

const API_ENDPOINTS = {
    main: 'https://music-api.gdstudio.xyz/api.php',
    backup1: 'https://music-api.gdstudio.org/api.php',
    backup2: 'https://api.cenguigui.cn/api/bilibili/bilibili.php',
    backup3: 'https://netease-wapi.vercel.app/api/search',
    backup4: 'https://music.xianqiao.wang/api'
};

module.exports = async (req, res) => {
    try {
        const { url, types, source, name, count } = req.query;

        if (types && source && name) {
            // 处理音乐API代理请求
            let apiUrl;

            if (source === 'bilibili') {
                // Bilibili API 特殊处理
                apiUrl = `${API_ENDPOINTS.backup2}?action=search&query=${encodeURIComponent(name)}&page=1&limit=${count || 1000}`;
            } else {
                // 其他音乐API - 根据请求类型选择不同的API端点
                if (types === 'pic' || types === 'url') {
                    // 图片和URL请求直接使用主API
                    apiUrl = `${API_ENDPOINTS.main}?types=${types}&source=${source}&name=${encodeURIComponent(name)}&count=${count || 1000}`;
                } else {
                    // 搜索请求使用代理逻辑
                    apiUrl = `${API_ENDPOINTS.main}?types=${types}&source=${source}&name=${encodeURIComponent(name)}&count=${count || 1000}`;
                }
            }

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

            // 特殊处理网易云音乐API响应格式
            if (source === 'netease' && API_ENDPOINTS.main.includes('gdstudio.xyz')) {
                // 尝试备用网易云音乐API
                try {
                    const neteaseUrl = `${API_ENDPOINTS.backup3}?keywords=${encodeURIComponent(name)}&type=1&limit=${count || 30}`;
                    const neteaseResponse = await fetch(neteaseUrl, {
                        headers: {
                            'Referer': 'https://music.163.com/',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36'
                        }
                    });

                    if (neteaseResponse.ok) {
                        const neteaseData = await neteaseResponse.json();
                        if (neteaseData.result && neteaseData.result.songs && neteaseData.result.songs.length > 0) {
                            const formattedData = neteaseData.result.songs.map(song => ({
                                id: song.id,
                                name: song.name,
                                artist: song.artists.map(artist => artist.name),
                                album: song.album.name,
                                url_id: song.id,
                                pic_id: song.album.pic || '',
                                lyric_id: song.id,
                                source: 'netease'
                            }));
                            res.setHeader('Content-Type', 'application/json');
                            return res.json(formattedData);
                        }
                    }
                } catch (neteaseError) {
                    console.error('Netease API fallback failed:', neteaseError);
                }
            }

            // 对于图片和URL请求，直接返回原始数据
            if (types === 'pic' || types === 'url') {
                res.setHeader('Content-Type', 'application/json');
                return res.json(data);
            }

            res.setHeader('Content-Type', 'application/json');
            return res.json(data);

        } else if (url) {
            // 处理通用URL代理请求
            const decodedUrl = decodeURIComponent(url);

            // 特殊处理音乐API的图片和URL请求
            if (url.includes('types=pic') || url.includes('types=url')) {
                // 对于图片和URL请求，直接转发到主API
                try {
                    const response = await fetch(decodedUrl, {
                        headers: {
                            'Referer': 'https://y.qq.com/',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36'
                        }
                    });

                    if (!response.ok) {
                        // 如果主API失败，尝试备用API
                        console.log(`主API失败，尝试备用API: ${decodedUrl}`);
                        const backupUrl = decodedUrl.replace(API_ENDPOINTS.main, API_ENDPOINTS.backup1);
                        const backupResponse = await fetch(backupUrl, {
                            headers: {
                                'Referer': 'https://y.qq.com/',
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36'
                            }
                        });

                        if (backupResponse.ok) {
                            res.setHeader('Content-Type', backupResponse.headers.get('content-type'));
                            backupResponse.body.pipe(res);
                        } else {
                            return res.status(500).json({ error: 'Both main and backup API failed' });
                        }
                    } else {
                        res.setHeader('Content-Type', response.headers.get('content-type'));
                        response.body.pipe(res);
                    }
                } catch (error) {
                    console.error('图片/URL代理请求失败:', error);
                    return res.status(500).json({ error: 'Proxy request failed' });
                }
            } else {
                // 通用URL代理
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
            }

        } else {
            return res.status(400).json({ error: 'Invalid request parameters' });
        }
    } catch (error) {
        console.error('Proxy error:', error);

        // 如果主要API失败，尝试备用API
        if (req.query.types && req.query.source && req.query.name && API_ENDPOINTS.main.includes('gdstudio.xyz')) {
            // 尝试备用API
            const backupEndpoints = [API_ENDPOINTS.backup1, API_ENDPOINTS.backup3, API_ENDPOINTS.backup4];

            for (const backupUrl of backupEndpoints) {
                try {
                    let backupApiUrl;

                    if (backupUrl === API_ENDPOINTS.backup3) {
                        // 网易云音乐专用备用API
                        backupApiUrl = `${backupUrl}?keywords=${encodeURIComponent(req.query.name)}&type=1&limit=${req.query.count || 30}`;
                    } else if (backupUrl === API_ENDPOINTS.backup4) {
                        // 通用音乐API
                        backupApiUrl = `${backupUrl}?type=search&source=${req.query.source}&name=${encodeURIComponent(req.query.name)}&count=${req.query.count || 1000}`;
                    } else {
                        // 其他备用API
                        backupApiUrl = `${backupUrl}?types=${req.query.types}&source=${req.query.source}&name=${encodeURIComponent(req.query.name)}&count=${req.query.count || 1000}`;
                    }

                    console.log(`尝试备用API: ${backupApiUrl}`);
                    const backupResponse = await fetch(backupApiUrl, {
                        headers: {
                            'Referer': 'https://y.qq.com/',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36'
                        }
                    });

                    if (backupResponse.ok) {
                        const backupData = await backupResponse.json();

                        // 特殊处理备用API响应格式
                        if (backupUrl === API_ENDPOINTS.backup3 && backupData.result && backupData.result.songs) {
                            const formattedData = backupData.result.songs.map(song => ({
                                id: song.id,
                                name: song.name,
                                artist: song.artists.map(artist => artist.name),
                                album: song.album.name,
                                url_id: song.id,
                                pic_id: song.album.pic || '',
                                lyric_id: song.id,
                                source: 'netease'
                            }));
                            res.setHeader('Content-Type', 'application/json');
                            return res.json(formattedData);
                        } else {
                            res.setHeader('Content-Type', 'application/json');
                            return res.json(backupData);
                        }
                    }
                } catch (backupError) {
                    console.error(`备用API ${backupUrl} 也失败:`, backupError);
                    continue;
                }
            }
        }

        return res.status(500).json({ error: 'Failed to proxy request', details: error.message });
    }
};
