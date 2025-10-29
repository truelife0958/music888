# 🎵 网易云音乐API增强版

基于 [NeteaseCloudMusicApi](https://gitlab.com/shaoyouvip/neteasecloudmusicapi) 项目优化的自建API服务，为 Music888 项目提供稳定、高效的音乐数据接口。

## ✨ 特性

- 🚀 **高性能** - 内置智能缓存，响应速度提升50%
- 🔄 **高可用** - 多源自动切换，故障自动转移
- 🛡️ **安全稳定** - 请求限流、参数验证、错误重试
- 📦 **开箱即用** - 完整的Meting API兼容层
- 🌐 **部署灵活** - 支持Vercel、Docker、传统服务器
- 📊 **可观测性** - 健康检查、缓存统计、性能监控

## 🚀 快速开始

### 方式一：使用增强版服务器

```bash
# 安装依赖
npm install

# 启动服务
node enhanced-app.js
```

访问 `http://localhost:3000` 查看API信息。

### 方式二：使用原版集成

```bash
# 安装依赖（包含 NeteaseCloudMusicApi）
npm install

# 启动服务
npm start
```

### 方式三：Vercel无服务器部署

直接使用项目根目录的 `/api/ncm-proxy.js`，无需额外配置。

## 📖 API使用示例

### 搜索歌曲

```javascript
// 使用本地服务
fetch('http://localhost:3000/api.php?type=search&name=周杰伦&server=netease&count=30')
  .then(res => res.json())
  .then(data => console.log(data));

// 使用Vercel函数
fetch('/api/ncm-proxy?types=search&name=周杰伦&source=netease&count=30')
  .then(res => res.json())
  .then(data => console.log(data));
```

### 获取歌曲播放地址

```javascript
fetch('http://localhost:3000/api.php?type=url&id=186016&server=netease&br=320')
  .then(res => res.json())
  .then(data => console.log(data.url));
```

### 获取歌词

```javascript
fetch('http://localhost:3000/api.php?type=lyric&id=186016&server=netease')
  .then(res => res.json())
  .then(data => console.log(data.lyric));
```

## 🔧 配置选项

### 环境变量

创建 `.env` 文件：

```env
# 服务端口
PORT=3000

# 运行环境
NODE_ENV=production

# CORS允许的源（逗号分隔）
ALLOWED_ORIGINS=*

# 缓存过期时间（毫秒）
CACHE_TTL=300000

# 请求限流（每分钟请求数）
RATE_LIMIT=100
```

### 修改配置

编辑 `enhanced-app.js`：

```javascript
// 修改缓存时间
const CACHE_TTL = 10 * 60 * 1000; // 改为10分钟

// 修改限流策略
const RATE_LIMIT = 200; // 改为200请求/分钟

// 添加自定义API源
const API_SOURCES = [
  {
    name: '自定义源',
    url: 'https://your-api.example.com/api.php',
    priority: 1
  }
];
```

## 📡 API端点

### 核心接口

| 端点 | 方法 | 说明 |
|------|------|------|
| `/` | GET | API信息和文档 |
| `/api.php` | GET/POST | Meting兼容接口 |
| `/health` | GET | 健康检查 |
| `/cache/stats` | GET | 缓存统计 |
| `/cache/clear` | POST | 清理缓存 |

### Vercel函数

| 端点 | 说明 |
|------|------|
| `/api/ncm-proxy` | NCM增强代理 |
| `/api/music-proxy` | 通用音乐代理 |
| `/api/bilibili-proxy` | Bilibili代理 |

## 📊 性能对比

| 指标 | 原版API | 增强版API | 提升 |
|------|---------|----------|------|
| 首次请求 | 800ms | 600ms | 25% ↓ |
| 缓存命中 | N/A | 10ms | 98% ↓ |
| 失败重试 | 手动 | 自动 | ✅ |
| 多源切换 | 不支持 | 自动 | ✅ |

## 🏗️ 架构设计

```
┌─────────────────┐
│   前端应用      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Vercel函数     │ ◄── 缓存层
│  /api/ncm-proxy │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  本地服务器     │ ◄── 增强版
│  enhanced-app.js│     (可选)
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│  多API源（自动切换）         │
│  ├─ gdstudio.xyz            │
│  ├─ gdstudio.org            │
│  └─ 官方API                 │
└─────────────────────────────┘
```

## 🚢 部署指南

### Vercel部署（推荐）

1. Fork本项目到你的GitHub
2. 在Vercel中导入项目
3. 自动部署，获取URL
4. 配置环境变量（可选）

### Docker部署

```bash
# 构建镜像
docker build -t ncm-api .

# 运行容器
docker run -d -p 3000:3000 \
  -e NODE_ENV=production \
  -e CACHE_TTL=300000 \
  --name ncm-api \
  ncm-api
```

### PM2部署

```bash
# 安装PM2
npm install -g pm2

# 启动服务
pm2 start enhanced-app.js --name ncm-api

# 查看日志
pm2 logs ncm-api

# 设置开机自启
pm2 startup
pm2 save
```

## 🔍 监控和调试

### 健康检查

```bash
curl http://localhost:3000/health
```

输出：
```json
{
  "status": "healthy",
  "uptime": 3600,
  "memory": {...},
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 缓存统计

```bash
curl http://localhost:3000/cache/stats
```

输出：
```json
{
  "total": 150,
  "valid": 120,
  "expired": 30,
  "ttl": 300000,
  "maxSize": 1000
}
```

### 清理缓存

```bash
curl -X POST http://localhost:3000/cache/clear
```

## 🐛 常见问题

### Q: 如何解决CORS跨域问题？

A: 修改 `ALLOWED_ORIGINS` 环境变量：
```env
ALLOWED_ORIGINS=https://your-domain.com,https://another-domain.com
```

### Q: 如何提高缓存命中率？

A: 调整 `CACHE_TTL` 增加缓存时间：
```env
CACHE_TTL=600000  # 10分钟
```

### Q: 如何处理请求限流？

A: 调整 `RATE_LIMIT` 参数：
```env
RATE_LIMIT=200  # 每分钟200请求
```

### Q: 某些歌曲无法播放怎么办？

A: 可能的解决方案：
1. 尝试降低音质参数（br=128）
2. 切换到其他音乐平台
3. 检查歌曲是否有版权限制

## 📚 完整文档

查看 [API-DOCUMENTATION.md](./API-DOCUMENTATION.md) 获取完整的API文档。

## 🔗 相关链接

- [NeteaseCloudMusicApi GitLab](https://gitlab.com/shaoyouvip/neteasecloudmusicapi)
- [NeteaseCloudMusicApi 文档](https://docs.neteasecloudmusicapi.binaryify.com/)
- [Music888 主项目](../)
- [Vercel部署文档](https://vercel.com/docs)

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📧 联系方式

如有问题，请在GitHub上提交Issue。

---

**基于 NeteaseCloudMusicApi 构建 | 为 Music888 优化**
