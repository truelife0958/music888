const fetch = require('node-fetch');

// 直接音乐源API配置 - 无代理
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

module.exports = async (req, res) => {
    try {
        const { types, source, name, count, id, br } = req.query;

        if (!types || !source || !name) {
            return res.status(400).json({ error: '缺少必要参数: types, source, name' });
        }

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
                if (!id) return res.status(400).json({ error: 'pic请求需要id参数' });
                apiUrl = api.pic(id);
                break;
            case 'url':
                if (!id) return res.status(400).json({ error: 'url请求需要id参数' });
                apiUrl = api.url(id, br);
                break;
            default:
                return res.status(400).json({ error: '不支持的请求类型' });
        }

        // 直接请求API，不经过代理
        const response = await fetch(apiUrl, {
            headers: {
                'Referer': 'https://music.163.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36',
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });

        if (!response.ok) {
            // 如果主API失败，尝试备用API
            const backupApiUrl = apiUrl.replace('music-api.gdstudio.xyz', 'music-api.gdstudio.org');
            const backupResponse = await fetch(backupApiUrl, {
                headers: {
                    'Referer': 'https://music.163.com/',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36',
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
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
        res.setHeader('Cache-Control', 'no-cache');
        return res.json(data);

    } catch (error) {
        console.error('Direct API error:', error);
        return res.status(500).json({ error: '服务器内部错误' });
    }
};