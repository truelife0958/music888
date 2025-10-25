/**
 * Vercel Serverless Function - 音乐API代理
 * 解决CORS问题和API数据质量问题
 */

export default async function handler(req, res) {
    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // 处理OPTIONS预检请求
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    const { types, source, name, count = 30 } = req.query;
    
    // 参数验证
    if (!types || !source || !name) {
        res.status(400).json({ 
            error: '缺少必要参数',
            required: ['types', 'source', 'name']
        });
        return;
    }
    
    try {
        console.log(`[Music Proxy] 请求参数: types=${types}, source=${source}, name=${name}, count=${count}`);
        
        // 多个API源配置
        const apiSources = [
            {
                name: 'gdstudio',
                url: 'https://music-api.gdstudio.xyz/api.php',
                format: (params) => `${params.url}?types=${params.types}&source=${params.source}&name=${encodeURIComponent(params.name)}&count=${params.count}`
            },
            {
                name: 'injahow',
                url: 'https://api.injahow.cn/meting/',
                format: (params) => `${params.url}?server=${params.source}&type=${params.types}&id=${encodeURIComponent(params.name)}&r=1`
            },
            {
                name: 'vkeys',
                url: 'https://api.vkeys.cn/meting/',
                format: (params) => `${params.url}?server=${params.source}&type=${params.types}&id=${encodeURIComponent(params.name)}`
            }
        ];
        
        // 尝试每个API源
        for (const api of apiSources) {
            try {
                const url = api.format({ url: api.url, types, source, name, count });
                console.log(`[Music Proxy] 尝试 ${api.name}: ${url}`);
                
                const response = await fetch(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'Accept': 'application/json, text/plain, */*',
                        'Referer': 'https://music.gdstudio.xyz/'
                    },
                    timeout: 8000
                });
                
                if (response.ok) {
                    const data = await response.json();
                    
                    // 检查数据有效性
                    if (Array.isArray(data) && data.length > 0) {
                        console.log(`[Music Proxy] ✅ ${api.name} 成功返回 ${data.length} 条数据`);
                        res.status(200).json(data);
                        return;
                    } else if (data && typeof data === 'object' && Object.keys(data).length > 0) {
                        console.log(`[Music Proxy] ✅ ${api.name} 成功返回数据`);
                        res.status(200).json(data);
                        return;
                    }
                    
                    console.log(`[Music Proxy] ⚠️ ${api.name} 返回空数据`);
                } else {
                    console.log(`[Music Proxy] ❌ ${api.name} HTTP错误: ${response.status}`);
                }
            } catch (apiError) {
                console.log(`[Music Proxy] ❌ ${api.name} 失败:`, apiError.message);
                continue;
            }
        }
        
        // 所有API都失败
        console.log('[Music Proxy] ❌ 所有API源均无可用数据');
        res.status(404).json({ 
            error: '所有音乐源均无可用数据',
            tried: apiSources.map(api => api.name)
        });
        
    } catch (error) {
        console.error('[Music Proxy] 代理错误:', error);
        res.status(500).json({ 
            error: '服务器内部错误',
            message: error.message
        });
    }
}