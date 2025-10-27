# 🎵 自建网易云音乐API

基于 [NeteaseCloudMusicApi Enhanced](https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced) 的自托管音乐API服务。

## 📦 特性

- ✅ 完整的网易云音乐API接口
- ✅ 支持多音乐源（QQ音乐、酷狗、酷我、咪咕等）
- ✅ 自动解锁灰色歌曲
- ✅ 支持无损音质（FLAC）
- ✅ 一键部署到Vercel
- ✅ 无速率限制

## 🚀 部署到Vercel

### 方式1：通过Vercel Dashboard

1. Fork本项目到你的GitHub
2. 登录 [Vercel](https://vercel.com)
3. 点击 "New Project"
4. 导入本项目
5. 配置环境变量（可选）：
   - `CORS_ALLOW_ORIGIN`: CORS域名配置（默认 `*`）
   - `ENABLE_GENERAL_UNBLOCK`: 启用全局解灰（默认 `true`）
   - `ENABLE_FLAC`: 启用无损音质（默认 `true`）
6. 点击 Deploy

### 方式2：通过Vercel CLI

```bash
# 安装Vercel CLI
npm i -g vercel

# 进入ncm-api目录
cd ncm-api

# 部署
vercel --prod
```

## 📖 API使用说明

部署成功后，你会获得一个域名，例如：`https://your-api.vercel.app`

### 常用接口示例

#### 搜索歌曲
```
GET https://your-api.vercel.app/search?keywords=周杰伦&limit=10
```

#### 获取歌曲URL
```
GET https://your-api.vercel.app/song_url?id=186016&br=999000
```

#### 获取歌词
```
GET https://your-api.vercel.app/lyric?id=186016
```

#### 获取歌单详情
```
GET https://your-api.vercel.app/playlist_detail?id=123456
```

更多接口请查看 [完整文档](https://neteasecloudmusicapienhanced.js.org/)

## 🔧 本地开发

```bash
# 安装依赖
npm install

# 启动服务（默认端口3000）
npm start

# 访问
open http://localhost:3000
```

## 🎯 集成到主项目

将你的Vercel API地址添加到主项目的 `js/api.ts`：

```typescript
const API_SOURCES: ApiSource[] = [
    {
        name: '自建 API',
        url: 'https://your-api.vercel.app',
        type: 'ncm'
    },
    // ... 其他API源
];
```

## 📝 注意事项

1. **版权声明**：本API仅供个人学习使用，请勿用于商业用途
2. **Cookie配置**：部分接口需要登录，可通过环境变量配置Cookie
3. **速率限制**：Vercel免费版有请求限制，建议配合CDN使用
4. **解灰功能**：需要外网访问才能正常使用多音源功能

## 🔗 相关链接

- [NeteaseCloudMusicApi Enhanced](https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced)
- [在线文档](https://neteasecloudmusicapienhanced.js.org/)
- [Vercel部署文档](https://vercel.com/docs)

## 📄 License

MIT
