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
            // 直接音乐源API配置
            const MUSIC_APIS = {
                netease: {
                    search: (name, count) => `https://music-api.gdstudio.xyz/api.php?types=search&source=netease&name=${encodeURIComponent(name)}&count=${count || 30}`,
                    pic: (id) => `https://music-api.gdstudio.xyz/api.php?types=pic&source=netease&id=${id}&size=300`,
                    url: (id, br) => `https://music-api.gdstudio.xyz/api.php?types=url&source=netease&id=${id}&br=${br || 320}`
                },
                tencent: {
                    search: (name, count) => `https://music-api.gdstudio.xyz/api.php?types=search&source=tencent&name=${encodeURIComponent(name)}&count=${count || 30}`,
                    pic: (id) => `https://music-api.gdstudio.xyz/api.php?types=pic&source=tencent&id=${id}&size=300`,
                    url: (id, br) => `https://music-api.gdstudio.xyz/api.php?types=url&source=tencent&id=${id}&br=${br || 320}`
                },
                kugou: {
                    search: (name, count) => `https://music-api.gdstudio.xyz/api.php?types=search&source=kugou&name=${encodeURIComponent(name)}&count=${count || 30}`,
                    pic: (id) => `https://music-api.gdstudio.xyz/api.php?types=pic&source=kugou&id=${id}&size=300`,
                    url: (id, br) => `https://music-api.gdstudio.xyz/api.php?types=url&source=kugou&id=${id}&br=${br || 320}`
                },
                xiami: {
                    search: (name, count) => `https://music-api.gdstudio.xyz/api.php?types=search&source=xiami&name=${encodeURIComponent(name)}&count=${count || 30}`,
                    pic: (id) => `https://music-api.gdstudio.xyz/api.php?types=pic&source=xiami&id=${id}&size=300`,
                    url: (id, br) => `https://music-api.gdstudio.xyz/api.php?types=url&source=xiami&id=${id}&br=${br || 320}`
                },
                baidu: {
                    search: (name, count) => `https://music-api.gdstudio.xyz/api.php?types=search&source=baidu&name=${encodeURIComponent(name)}&count=${count || 30}`,
                    pic: (id) => `https://music-api.gdstudio.xyz/api.php?types=pic&source=baidu&id=${id}&size=300`,
                    url: (id, br) => `https://music-api.gdstudio.xyz/api.php?types=url&source=baidu&id=${id}&br=${br || 320}`
                }
            };

            const api = MUSIC_APIS[source];
            if (!api) {
                return res.status(400).json({ error: '不支持的音乐源' });
            }

            let apiUrl;
            switch (types) {
                case 'search':
                    apiUrl = api.search(name, count);
                    break;
                case 'pic':
                    apiUrl = api.pic(name);
                    break;
                case 'url':
                    apiUrl = api.url(name, count);
                    break;
                default:
                    return res.status(400).json({ error: '不支持的请求类型' });
            }

            const response = await fetch(apiUrl, {
                headers: {
                    'Referer': 'https://music.163.com/',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36'
                }
            });

            if (!response.ok) {
                // 如果主API失败，尝试备用API
                const backupApiUrl = apiUrl.replace('music-api.gdstudio.xyz', 'music-api.gdstudio.org');
                const backupResponse = await fetch(backupApiUrl, {
                    headers: {
                        'Referer': 'https://music.163.com/',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36'
                    }
                });

                if (backupResponse.ok) {
                    const data = await backupResponse.json();
                    res.setHeader('Content-Type', 'application/json');
                    return res.json(data);
                } else {
                    return res.status(500).json({ error: '音乐API服务暂时不可用' });
                }
            }

            const data = await response.json();
            res.setHeader('Content-Type', 'application/json');
            return res.json(data);

        } else if (url) {
            // 通用URL代理 - 仅用于特殊需求
            try {
                const response = await fetch(decodeURIComponent(url), {
                    headers: {
                        'Referer': 'https://music.163.com/',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36'
                    }
                });

                if (!response.ok) {
                    return res.status(response.status).json({ error: `API响应状态: ${response.status}` });
                }

                res.setHeader('Content-Type', response.headers.get('content-type'));
                response.body.pipe(res);
            } catch (error) {
                return res.status(500).json({ error: '代理请求失败' });
            }

        } else {
            return res.status(400).json({ error: '无效的请求参数' });
        }
    } catch (error) {
        console.error('Proxy error:', error);
        return res.status(500).json({ error: '服务器内部错误' });
    }
};
