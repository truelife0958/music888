# 音乐播放器 API 错误修复方案

## 问题总结

### 1. API 代理配置不完整
**现象**: `/api/music-proxy` 返回 400 错误
**原因**: 
- 只支持 `search` 类型,缺少 `url`, `pic`, `lyric` 支持
- 参数验证只检查 `name`,不支持 `id`, `br`, `size` 等参数

### 2. CORS 跨域问题
**现象**: Bilibili API 请求被 CORS 策略阻止
**原因**: `api.cenguigui.cn` 没有设置 CORS 头

### 3. 混合内容警告
**现象**: HTTP 图片在 HTTPS 页面加载触发警告
**原因**: 部分音乐源返回 HTTP 图片链接

### 4. API 重试机制不完善
**现象**: 大量重复失败请求
**原因**: 
- 重试次数过多(3次)
- 没有智能降级策略
- API 切换不够快速

## 解决方案

### 方案 1: 修复 API 代理 (优先级: 高)

#### 1.1 扩展代理支持的请求类型

```javascript
// api/music-proxy.js
export default async function handler(req, res) {
    const { types, source, id, name, br, size, count = 30 } = req.query;
    
    // 根据类型验证参数
    if (types === 'search' && !name) {
        return res.status(400).json({ error: '缺少 name 参数' });
    }
    
    if (['url', 'pic', 'lyric'].includes(types) && !id) {
        return res.status(400).json({ error: `缺少 id 参数` });
    }
    
    // 构建不同类型的 API URL
    const buildUrl = (api, params) => {
        let url = `${api}?types=${types}&source=${source}`;
        
        switch(types) {
            case 'search':
                url += `&name=${encodeURIComponent(name)}&count=${count}`;
                break;
            case 'url':
                url += `&id=${id}&br=${br || 320}`;
                break;
            case 'pic':
                url += `&id=${id}&size=${size || 300}`;
                break;
            case 'lyric':
                url += `&id=${id}`;
                break;
        }
        
        return url;
    };
}
```

#### 1.2 添加响应数据验证

```javascript
function validateResponse(data, types) {
    switch(types) {
        case 'search':
            return Array.isArray(data) && data.length > 0;
        case 'url':
            return data.url && typeof data.url === 'string';
        case 'pic':
            return data.url && typeof data.url === 'string';
        case 'lyric':
            return data.lyric !== undefined;
        default:
            return true;
    }
}
```

### 方案 2: 添加 Bilibili 代理 (优先级: 高)

```javascript
// api/bilibili-proxy.js
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    const { action, query, bvid, page = 1, limit = 100 } = req.query;
    
    try {
        let url = 'https://api.cenguigui.cn/api/bilibili/bilibili.php';
        
        if (action === 'search') {
            url += `?action=search&query=${encodeURIComponent(query)}&page=${page}&limit=${limit}`;
        } else if (action === 'media') {
            url += `?action=media&bvid=${bvid}`;
        }
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Referer': 'https://music.weny888.com/'
            }
        });
        
        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
```

### 方案 3: 优化前端 API 调用逻辑 (优先级: 中)

#### 3.1 减少重试次数

```typescript
// js/api.ts
export const API_CONFIG = {
    TIMEOUT: 10000,  // 从 15s 减少到 10s
    MAX_RETRIES: 2,  // 从 3 减少到 2
    RETRY_BASE_DELAY: 1000,
};
```

#### 3.2 智能 API 切换

```typescript
// 失败后立即切换,不等待多次重试
export async function fetchWithRetry(url: string, retries: number = 1) {
    for (let i = 0; i <= retries; i++) {
        try {
            const response = await fetch(url, { timeout: 10000 });
            if (response.ok) return response;
            
            // 服务器错误立即切换 API
            if (response.status >= 500) {
                await switchToNextAPI();
                break;
            }
        } catch (error) {
            if (i === retries) {
                await switchToNextAPI();
                throw error;
            }
        }
    }
}
```

#### 3.3 修复混合内容

```typescript
export async function getAlbumCoverUrl(song: Song): Promise<string> {
    const url = await fetchCoverUrl(song);
    
    // 强制使用 HTTPS
    if (url.startsWith('http://')) {
        return url.replace('http://', 'https://');
    }
    
    return url;
}
```

### 方案 4: 添加错误降级策略 (优先级: 中)

#### 4.1 音质降级

```typescript
const QUALITY_FALLBACK = ['999', '740', '320', '192', '128'];

export async function getSongUrlWithQualityFallback(song: Song, quality: string) {
    const qualities = QUALITY_FALLBACK.slice(
        QUALITY_FALLBACK.indexOf(quality)
    );
    
    for (const q of qualities) {
        try {
            const result = await getSongUrl(song, q);
            if (result.url) {
                console.log(`✅ 使用品质: ${q}`);
                return result;
            }
        } catch (error) {
            continue;
        }
    }
    
    throw new Error('所有品质均无法获取');
}
```

#### 4.2 音乐源降级

```typescript
const SOURCE_PRIORITY = ['netease', 'kugou', 'tencent', 'baidu'];

export async function getSongUrlWithSourceFallback(song: Song, quality: string) {
    for (const source of SOURCE_PRIORITY) {
        try {
            // 搜索该源的歌曲
            const results = await searchMusicAPI(song.name, source);
            if (results.length === 0) continue;
            
            // 获取 URL
            const result = await getSongUrl(results[0], quality);
            if (result.url) {
                console.log(`✅ 使用音乐源: ${source}`);
                return result;
            }
        } catch (error) {
            continue;
        }
    }
    
    throw new Error('所有音乐源均无法获取');
}
```

## 实施步骤

### 第一阶段: 紧急修复 (1-2小时)
1. ✅ 修复 `api/music-proxy.js` 支持所有请求类型
2. ✅ 添加 `api/bilibili-proxy.js` 解决 CORS
3. ✅ 修复混合内容警告

### 第二阶段: 优化改进 (2-3小时)
1. 优化重试机制,减少无效请求
2. 实现智能 API 切换
3. 添加音质和音乐源降级

### 第三阶段: 测试验证 (1小时)
1. 测试各种音乐源
2. 测试不同品质
3. 测试错误场景

## 预期效果

- ✅ 消除 400 错误
- ✅ 解决 CORS 跨域问题
- ✅ 消除混合内容警告
- ✅ 减少 50% 的失败请求
- ✅ 提升 30% 的播放成功率
- ✅ 改善用户体验

## 风险评估

- **低风险**: API 代理修复(向后兼容)
- **低风险**: Bilibili 代理添加(新功能)
- **中风险**: 前端逻辑优化(需要充分测试)

## 回滚方案

如果出现问题,可以:
1. 恢复原 `api/music-proxy.js` 文件
2. 禁用 Bilibili 音乐源
3. 回退前端代码到上一版本
