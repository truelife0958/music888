// api/gdstudio-proxy.js
// GDStudio音乐API的CORS代理 - 解决浏览器跨域限制

export default async function handler(req, res) {
    // 设置CORS头，允许前端访问
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 处理OPTIONS预检请求
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        // 获取所有查询参数
        const { types, source, name, id, br, count, size } = req.query;

        // 构建GDStudio API URL
        const apiUrl = new URL('https://music-api.gdstudio.xyz/api.php');
        
        // 添加所有查询参数
        if (types) apiUrl.searchParams.set('types', types);
        if (source) apiUrl.searchParams.set('source', source);
        if (name) apiUrl.searchParams.set('name', name);
        if (id) apiUrl.searchParams.set('id', id);
        if (br) apiUrl.searchParams.set('br', br);
        if (count) apiUrl.searchParams.set('count', count);
        if (size) apiUrl.searchParams.set('size', size);

        console.log('🔄 [GDStudio代理] 转发请求到:', apiUrl.toString());

        // 请求GDStudio API（服务器端无CORS限制）
        const response = await fetch(apiUrl.toString(), {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Referer': 'https://music888.vercel.app/'
            },
            timeout: 10000 // 10秒超时
        });

        // 检查响应状态
        if (!response.ok) {
            console.error('❌ [GDStudio代理] API返回错误:', response.status, response.statusText);
            throw new Error(`GDStudio API 返回错误: ${response.status} ${response.statusText}`);
        }

        // 获取响应数据
        const data = await response.json();

        console.log('✅ [GDStudio代理] 请求成功，返回数据');

        // 设置缓存头（可选优化）
        res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

        // 返回数据给前端
        res.status(200).json(data);

    } catch (error) {
        console.error('❌ [GDStudio代理] 请求失败:', error.message);
        
        // 返回详细错误信息
        res.status(500).json({
            error: 'API代理请求失败',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
}