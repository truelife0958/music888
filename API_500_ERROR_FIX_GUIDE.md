# 🔧 API 500错误修复指南

## 问题描述

生产环境 (https://music.weny888.com) 的 `/api/meting` 接口返回500错误：

```
GET https://music.weny888.com/api/meting?server=netease&type=search&name=test&count=1 
500 (Internal Server Error)
```

## 原因分析

### 1. Vercel部署配置问题 🔴

**可能原因**：
- Vercel的Serverless函数配置不正确
- `vercel.json` 路由重写规则有问题
- `ncm-api` 没有正确部署到Vercel

**检查位置**：项目根目录的 `vercel.json`

### 2. 网易云音乐API限制 🟡

**可能原因**：
- Vercel的服务器IP被网易云音乐限流
- 需要cookies认证但没有配置
- API请求频率过高被封禁

### 3. 依赖包问题 🟡

**可能原因**：
- `@neteasecloudmusicapienhanced/api` 在Serverless环境不兼容
- 缺少必要的依赖包

---

## 解决方案

### 方案1: 修复Vercel配置 (推荐) ✅

#### 步骤1: 检查 `vercel.json`

确保配置正确：

```json
{
  "rewrites": [
    {
      "source": "/api/meting",
      "destination": "/api/meting.js"
    },
    {
      "source": "/api/:path*",
      "destination": "/api/:path*"
    }
  ],
  "functions": {
    "api/**/*.js": {
      "maxDuration": 30
    }
  }
}
```

#### 步骤2: 创建Vercel Serverless函数

创建文件 `api/meting.js`（如果不存在）：

```javascript
// api/meting.js - Vercel Serverless函数
const api = require('@neteasecloudmusicapienhanced/api');

// Meting API适配器（简化版）
async function search(params) {
  const { name, count = 30 } = params;
  
  try {
    const result = await api.cloudsearch({
      keywords: name,
      limit: count,
      type: 1
    });

    if (!result.body?.result?.songs) {
      return [];
    }

    return result.body.result.songs.map(song => ({
      id: String(song.id),
      name: song.name,
      artist: song.ar?.map(a => a.name) || ['未知艺术家'],
      album: song.al?.name || '未知专辑',
      pic_id: song.al?.pic_str || '',
      lyric_id: String(song.id),
      url_id: String(song.id),
      source: 'netease'
    }));
  } catch (error) {
    console.error('Search Error:', error);
    throw error;
  }
}

async function getUrl(params) {
  const { id, br = 320000 } = params;
  
  try {
    const result = await api.song_url_v1({
      id,
      level: br >= 320000 ? 'higher' : 'standard'
    });

    const song = result.body?.data?.[0];
    return {
      url: song?.url || '',
      br: song?.br ? String(Math.floor(song.br / 1000)) : ''
    };
  } catch (error) {
    console.error('URL Error:', error);
    throw error;
  }
}

// 主处理函数
module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { type, types, server = 'netease', id, name, count, br } = req.query;
  const actionType = types || type;

  if (!actionType) {
    return res.status(400).json({
      code: 400,
      message: '缺少 type 参数'
    });
  }

  try {
    let result;

    switch (actionType) {
      case 'search':
        result = await search({ name, count });
        break;

      case 'url':
        result = await getUrl({ id, br });
        break;

      default:
        return res.status(400).json({
          code: 400,
          message: `不支持的类型: ${actionType}`
        });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error(`Meting API Error [${actionType}]:`, error);
    res.status(500).json({
      code: 500,
      message: error.message || '服务器错误',
      error: error.toString()
    });
  }
};
```

#### 步骤3: 更新 `package.json` 依赖

确保在项目根目录有必要的依赖：

```json
{
  "dependencies": {
    "@neteasecloudmusicapienhanced/api": "^1.0.0"
  }
}
```

#### 步骤4: 重新部署到Vercel

```bash
# 推送到GitHub会自动触发Vercel部署
git add .
git commit -m "fix: 修复Vercel API 500错误"
git push origin main
```

---

### 方案2: 使用完全独立的API服务

如果Vercel Serverless不稳定，可以使用专用的Node.js服务器：

#### 选项A: Railway部署

1. 注册 https://railway.app
2. 连接GitHub仓库
3. 选择 `ncm-api` 目录部署
4. 设置环境变量：`PORT=3000`
5. 获得专用API地址：`https://your-app.railway.app`

#### 选项B: Render部署

1. 注册 https://render.com
2. 创建新的Web Service
3. 连接GitHub仓库的 `ncm-api` 目录
4. 自动检测Node.js环境
5. 获得API地址

---

### 方案3: 完全使用公共API (临时方案) ⚠️

修改前端配置，只使用稳定的公共API：

**文件**: `js/api.ts` (第24-28行)

```typescript
const availableApis = [
  // 暂时注释掉不稳定的本地API
  // { name: 'Vercel 部署API', url: '/api/meting' },
  { name: 'Meting API 公共服务2', url: 'https://api.i-meto.com/meting/api' },
  { name: 'Meting API 备用服务', url: 'https://api.wujianjun.top/api' },
];
```

**优点**：立即可用，无需配置  
**缺点**：依赖第三方服务，可能不稳定

---

## 快速诊断命令

### 1. 测试本地API

```bash
# 在本地测试
cd ncm-api
npm start

# 在另一个终端测试
curl "http://localhost:3000/api/meting?server=netease&type=search&name=test&count=1"
```

### 2. 测试生产API

```bash
# 测试生产环境
curl "https://music.weny888.com/api/meting?server=netease&type=search&name=test&count=1"
```

### 3. 查看Vercel日志

1. 访问 https://vercel.com/dashboard
2. 选择项目 `music888`
3. 点击 "Functions" 标签
4. 查看实时日志输出

---

## 推荐执行顺序

### 立即执行（5分钟）

1. ✅ 前端已自动切换到备用API（当前正常工作）
2. ⏳ 查看Vercel控制台日志，确认具体错误

### 短期解决（1小时内）

1. 创建 `api/meting.js` Serverless函数
2. 更新 `vercel.json` 配置
3. 推送到GitHub触发重新部署
4. 测试修复结果

### 长期方案（1-3天）

1. 考虑使用Railway/Render部署专用API服务器
2. 配置CDN加速
3. 添加API缓存层
4. 实施请求限流保护

---

## 当前状态

✅ **前端搜索功能正常** - 已自动切换到 `https://api.i-meto.com/meting/api`  
⚠️ **本地API需要修复** - 500错误但不影响用户体验  
🔄 **API切换机制完美工作** - 自动故障转移成功

---

## 结论

**当前不影响用户使用**！API切换机制已经成功将请求转移到可用的备用API。

**建议优先级**：
- 🟢 **低优先级** - 系统已自动恢复，用户体验正常
- 🟡 **可选优化** - 如果想使用自己的API服务器，按方案1或2操作
- 🔴 **不紧急** - 可以等有时间再处理

---

## 技术支持

如需帮助，请提供：
1. Vercel部署日志
2. 浏览器Network标签的完整错误信息
3. 本地测试 `npm start` 的控制台输出