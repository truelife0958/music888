
# 🔧 GDStudio API CORS问题完整解决方案

## 📋 问题说明

**当前状况**：
- **GDStudio API** (`https://music-api.gdstudio.xyz/api.php`) 本身运行正常（返回200状态码）
- **CORS错误**：未配置 `Access-Control-Allow-Origin` 响应头
- **影响**：浏览器阻止前端JavaScript直接调用该API
- **临时方案**：目前自动降级到Vercel备用API

**为什么会出现CORS错误**：
浏览器的**同源策略**限制网页只能访问同一域名的资源。当前端（`music888.vercel.app`）尝试访问第三方API（`music-api.gdstudio.xyz`）时，如果API服务器未设置CORS头，浏览器会阻止请求。

---

## ✅ 解决方案1：使用Vercel Serverless代理（推荐）⭐⭐⭐⭐⭐

### 原理
在Vercel服务器端创建代理函数，由服务器转发请求到GDStudio API。因为服务器端没有CORS限制，可以成功调用。

### 优势
- ✅ 100%解决CORS问题
- ✅ 无需修改前端大量代码
- ✅ 可以添加缓存、限流等功能
- ✅ 完全控制API行为

### 实施步骤

#### 步骤1：创建Vercel代理函数

在项目中创建 `api/gdstudio-proxy.js`：

```javascript
// api/gdstudio-proxy.js
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
        // 获取查询参数
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

        console.log('🔄 [Proxy] 转发请求到:', apiUrl.toString());

        // 请求GDStudio API（服务器端无CORS限制）
        const response = await fetch(apiUrl.toString(), {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        // 检查响应状态
        if (!response.ok) {
            throw new Error(`GDStudio API 返回错误: ${response.status}`);
        }

        // 获取响应数据
        const data = await response.json();

        console.log('✅ [Proxy] 请求成功');

        // 返回数据给前端
        res.status(200).json(data);

    } catch (error) {
        console.error('❌ [Proxy] 请求失败:', error.message);
        res.status(500).json({
            error: 'API代理请求失败',
            message: error.message
        });
    }
}
```

#### 步骤2：修改 `js/api.ts` 配置

```typescript
// js/api.ts (第54-65行)
const API_SOURCES: ApiSource[] = [
    {
        name: 'GDStudio 音乐API（通过代理）',
        url: '/api/gdstudio-proxy',  // 🔧 改为使用代理
        type: 'standard'
    },
    {
        name: '自建Vercel API（备用）',
        url: 'https://music888-4swa.vercel.app/api.php',
        type: 'standard'
    }
];
```

#### 步骤3：测试代理

```bash
# 本地测试
npm run dev

# 浏览器访问
http://localhost:5173/api/gdstudio-proxy?types=search&source=netease&name=周杰伦&count=10
```

#### 步骤4：部署到Vercel

```bash
git add api/gdstudio-proxy.js
git add js/api.ts
git commit -m "feat: 添加GDStudio API代理解决CORS问题"
git push origin main
```

---

## ✅ 解决方案2：使用公共CORS代理服务（快速方案）⭐⭐⭐

### 原理
使用第三方CORS代理服务（如 `cors-anywhere`, `allorigins` 等）作为中间层。

### 优势
- ✅ 无需编写代码
- ✅ 快速实施
- ⚠️ 依赖第三方服务稳定性

### 实施步骤

#### 方案2A：使用AllOrigins

修改 `js/api.ts`：

```typescript
// js/api.ts (第54-65行)
const API_SOURCES: ApiSource[] = [
    {
        name: 'GDStudio 音乐API（通过AllOrigins代理）',
        url: 'https://api.allorigins.win/raw?url=https://music-api.gdstudio.xyz/api.php',
        type: 'standard'
    },
    {
        name: '自建Vercel API（备用）',
        url: 'https://music888-4swa.vercel.app/api.php',
        type: 'standard'
    }
];
```

#### 方案2B：使用CORS Anywhere

```typescript
// js/api.ts (第54-65行)
const API_SOURCES: ApiSource[] = [
    {
        name: 'GDStudio 音乐API（通过CORS Anywhere）',
        url: 'https://cors-anywhere.herokuapp.com/https://music-api.gdstudio.xyz/api.php',
        type: 'standard'
    },
    {
        name: '自建Vercel API（备用）',
        url: 'https://music888-4swa.vercel.app/api.php',
        type: 'standard'
    }
];
```

### ⚠️ 注意事项
- 公共代理服务可能有请求限流
- 服务稳定性无法保证
- 不推荐用于生产环境

---

## ✅ 解决方案3：自建CORS代理服务器（专业方案）⭐⭐⭐⭐

### 原理
部署独立的CORS代理服务器（Node.js + Express），完全自主控制。

### 优势
- ✅ 完全自主控制
- ✅ 可添加缓存、限流、日志
- ✅ 高度可定制
- ⚠️ 需要服务器资源

### 实施步骤

#### 步骤1：创建独立代理项目

创建 `cors-proxy` 目录：

```bash
mkdir cors-proxy
cd cors-proxy
npm init -y
npm install express cors node-fetch
```

#### 步骤2：创建代理服务器

`cors-proxy/server.js`：

```javascript
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3001;

// 启用CORS
app.use(cors());

// 代理路由
app.get('/api', async (req, res) => {
    try {
        // 构建目标API URL
        const targetUrl = new URL('https://music-api.gdstudio.xyz/api.php');
        
        // 复制所有查询参数
        Object.keys(req.query).forEach(key => {
            targetUrl.searchParams.set(key, req.query[key]);
        });

        console.log('🔄 转发请求:', targetUrl.toString());

        // 请求目标API
        const response = await fetch(targetUrl.toString());
        const data = await response.json();

        // 返回数据
        res.json(data);

    } catch (error) {
        console.error('❌ 代理错误:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 CORS代理服务器运行在 http://localhost:${PORT}`);
});
```

#### 步骤3：部署到云平台

**选项A：部署到Vercel**

`cors-proxy/vercel.json`：

```json
{
    "version": 2,
    "builds": [
        {
            "src": "server.js",
            "use": "@vercel/node"
        }
    ],
    "routes": [
        {
            "src": "/api",
            "dest": "server.js"
        }
    ]
}
```

```bash
cd cors-proxy
vercel deploy --prod
```

**选项B：部署到Railway/Render**

```bash
# 推送到GitHub后在Railway/Render控制台导入即可
```

#### 步骤4：更新前端配置

```typescript
// js/api.ts
const API_SOURCES: ApiSource[] = [
    {
        name: 'GDStudio 音乐API（自建代理）',
        url: 'https://your-cors-proxy.vercel.app/api',  // 🔧 改为你的代理地址
        type: 'standard'
    },
    {
        name: '自建Vercel API（备用）',
        url: 'https://music888-4swa.vercel.app/api.php',
        type: 'standard'
    }
];
```

---

## 📊 方案对比

| 方案 | 难度 | 成本 | 可靠性 | 性能 | 推荐指数 |
|------|------|------|--------|------|----------|
| **方案1：Vercel代理** | ⭐⭐ | 免费 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **方案2：公共代理** | ⭐ | 免费 | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| **方案3：自建服务器** | ⭐⭐⭐⭐ | 免费/付费 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

---

## 🎯 推荐实施步骤（方案1）

### 1️⃣ 立即实施（5分钟）

```bash
# 1. 创建代理文件
touch api/gdstudio-proxy.js

# 2. 复制上面的代理代码到文件中

# 3. 修改 js/api.ts 配置（第56行）
# 将 url 改为 '/api/gdstudio-proxy'

# 4. 测试
npm run dev
```

### 2️⃣ 部署到生产环境（2分钟）

```bash
git add api/gdstudio-proxy.js js/api.ts
git commit -m "feat: 添加GDStudio API CORS代理"
git push origin main

# Vercel自动部署完成
```

### 3️⃣ 验证结果（1分钟）

1. 打开生产网站：`https://music888.vercel.app`
2. 打开浏览器控制台（F12）
3. 搜索音乐，查看日志：
   ```
   ✅ 应该看到：使用代理API成功
   ❌ 不应该看到：CORS错误
   ```

---

## 🔍 技术原理详解

### 为什么代理可以解决CORS？

```
❌ 直接请求（有CORS限制）：
浏览器 → GDStudio API (被浏览器阻止)

✅ 通过代理（无CORS限制）：
浏览器 → Vercel代理 → GDStudio API
         ↑ 设置CORS头   ↑ 服务器端请求
         ← 返回数据 ←
```

**关键点**：
1. **浏览器端请求**：受同源策略限制，需要CORS头
2. **服务器端请求**：没有同源策略限制，可以自由请求任何API
3. **代理的作用**：在服务器端请求API，添加CORS头后返回给浏览器

---

## 💡 优化建议

### 1. 添加缓存（提升性能）

```javascript
// api/gdstudio-proxy.js
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // 生成缓存键
    const cacheKey = JSON.stringify(req.query);
    const cached = cache.get(cacheKey);
    
    // 检查缓存
    if (cached && Date.now() - cached.time < CACHE_TTL) {
        console.log('✅ 使用缓存');
        return res.status(200).json(cached.data);
    }
    
    // 请求API
    const response = await fetch(/* ... */);
    const data = await response.json();
    
    // 保存缓存
    cache.set(cacheKey, { data, time: Date.now() });
    
    res.status(200).json(data);
}
```

### 2. 添加限流（防止滥用）

```javascript
// api/gdstudio-proxy.js
const requestCounts = new Map();
const MAX_REQUESTS = 100; // 每分钟最多100次请求

export default async function handler(req, res) {
    const ip = req.headers['x-forwarded-for'] || 