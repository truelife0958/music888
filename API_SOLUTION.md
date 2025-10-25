# 沄听音乐播放器 - API问题解决方案

## 🔍 问题诊断

### 当前状态（已部署到Vercel）
- ✅ 探索雷达成功获取30首歌曲（酷狗源）
- ❌ 播放功能失败 - API返回空URL
- ❌ 搜索功能失败 - API返回空数组
- ❌ 备用API CORS问题
- ❌ Bilibili API CORS问题

### 问题根源
**不是CORS问题，而是API数据质量问题！**

```
问题分析：
1. 主API (gdstudio.xyz) - 返回空数据 []
2. 备用API (gdstudio.org) - 连接失败
3. 备用API 2 (injahow.cn) - CORS + 数据问题
4. 备用API 3 (vkeys.cn) - CORS + 数据问题
5. Bilibili API - CORS 403 Forbidden
```

---

## 💡 解决方案

### 方案1：使用自建Vercel API代理（最推荐）⭐⭐⭐⭐⭐

#### 步骤1：创建API代理文件

创建 `api/music-proxy.js`:

```javascript
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
    
    try {
        // 尝试多个API源
        const apiSources = [
            'https://music-api.gdstudio.xyz/api.php',
            'https://api.injahow.cn/meting/',
            'https://api.vkeys.cn/meting/'
        ];
        
        for (const apiUrl of apiSources) {
            try {
                let url;
                if (apiUrl.includes('gdstudio')) {
                    url = `${apiUrl}?types=${types}&source=${source}&name=${encodeURIComponent(name)}&count=${count}`;
                } else {
                    // Meting API格式
                    url = `${apiUrl}?server=${source}&type=${types}&name=${encodeURIComponent(name)}&count=${count}`;
                }
                
                const response = await fetch(url, {
                    timeout: 5000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.length > 0) {
                        res.status(200).json(data);
                        return;
                    }
                }
            } catch (error) {
                console.log(`API ${apiUrl} failed:`, error.message);
                continue;
            }
        }
        
        // 所有API都失败
        res.status(404).json({ error: '所有音乐源均无可用数据' });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
```

#### 步骤2：修改API配置

修改 `js/api.ts`:

```typescript
const API_SOURCES: ApiSource[] = [
    {
        name: 'Vercel 代理 API',
        url: '/api/music-proxy'  // 使用本地代理
    }
];
```

---

### 方案2：使用开源网易云音乐API（推荐）⭐⭐⭐⭐

#### 部署网易云音乐API到Vercel

1. **Fork仓库**
```bash
# 访问并Fork
https://github.com/Binaryify/NeteaseCloudMusicApi
```

2. **部署到Vercel**
- 在Vercel导入GitHub项目
- 选择刚Fork的仓库
- 自动部署

3. **修改代码使用新API**

创建 `api/netease-proxy.js`:

```javascript
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    const { name, limit = 30 } = req.query;
    
    try {
        // 替换为你的网易云API地址
        const apiUrl = process.env.NETEASE_API_URL || 'https://your-netease-api.vercel.app';
        
        // 搜索音乐
        const searchResponse = await fetch(
            `${apiUrl}/cloudsearch?keywords=${encodeURIComponent(name)}&limit=${limit}`
        );
        
        if (!searchResponse.ok) {
            throw new Error('搜索失败');
        }
        
        const searchData = await searchResponse.json();
        
        if (!searchData.result || !searchData.result.songs) {
            res.status(404).json({ error: '没有找到相关音乐' });
            return;
        }
        
        // 转换为统一格式
        const songs = searchData.result.songs.map(song => ({
            id: song.id,
            name: song.name,
            artist: song.ar.map(a => a.name),
            album: song.al.name,
            pic_id: song.id,
            url_id: song.id,
            lyric_id: song.id,
            source: 'netease'
        }));
        
        res.status(200).json(songs);
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
```

---

### 方案3：使用免费音乐API聚合服务⭐⭐⭐

#### 推荐的免费音乐API

1. **Vercel Music API**
```
https://vercel-music-api.vercel.app
```

2. **Music API**
```
https://music-api.heheda.top
```

3. **自建音乐API**
基于以下开源项目：
- NeteaseCloudMusicApi (网易云)
- qq-music-api (QQ音乐)
- kugou-music-api (酷狗音乐)

---

### 方案4：本地代理开发（仅开发环境）⭐⭐

使用本地代理服务器：

```bash
# 安装http-proxy-middleware
npm install http-proxy-middleware --save-dev
```

创建 `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        proxy: {
            '/api/music': {
                target: 'https://music-api.gdstudio.xyz',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api\/music/, '/api.php')
            }
        }
    }
});
```

---

## 🚀 推荐实施步骤

### 最佳方案：方案1 + 方案2 组合

1. **创建Vercel代理** - 解决CORS问题
2. **部署网易云API** - 获取稳定数据源
3. **配置多API备份** - 提高可用性

### 实施步骤

```bash
# 1. 创建API代理文件
mkdir -p api
# 创建 api/music-proxy.js (见方案1)

# 2. 部署网易云音乐API
# Fork https://github.com/Binaryify/NeteaseCloudMusicApi
# 部署到Vercel

# 3. 配置环境变量
# 在Vercel项目设置中添加：
NETEASE_API_URL=https://your-netease-api.vercel.app

# 4. 重新部署
vercel --prod
```

---

## 📊 预期效果

使用新方案后：

| 功能 | 状态 | 说明 |
|------|------|------|
| 搜索音乐 | ✅ | 通过代理或网易云API |
| 播放音乐 | ✅ | 获取真实播放链接 |
| 探索雷达 | ✅ | 保持现有功能 |
| 批量操作 | ✅ | 正常工作 |
| API切换 | ✅ | 自动切换到可用源 |

---

## 🔧 临时解决方案

在修复API前，可以使用以下临时方案：

### 1. 仅使用酷狗源（当前可用）

```typescript
// 修改 js/config.ts
export const CONFIG = {
    MUSIC_SOURCES: ['kugou'],  // 仅使用酷狗
    // ...其他配置
};
```

### 2. 增加API超时重试

```typescript
// 修改 js/api.ts
const fetchWithRetry = async (url, retries = 5) => {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, { timeout: 10000 });
            if (response.ok) return response;
        } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
};
```

---

## 📝 总结

### 问题原因
1. ❌ 主API数据质量差（返回空数组）
2. ❌ 备用API连接失败或CORS限制
3. ❌ 缺少可靠的音乐数据源

### 解决方向
1. ✅ 创建Vercel API代理
2. ✅ 部署网易云音乐API
3. ✅ 配置多个备用数据源
4. ✅ 优化错误处理和重试机制

### 下一步行动
1. 创建 `api/music-proxy.js`
2. 部署网易云音乐API到Vercel
3. 修改 `js/api.ts` 使用新API
4. 测试并验证功能
5. 推送更新到GitHub

---

**🎵 修复后项目将完全正常工作！**