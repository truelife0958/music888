# 网易云音乐API增强版文档

基于 [NeteaseCloudMusicApi](https://gitlab.com/shaoyouvip/neteasecloudmusicapi) 项目优化的自建API服务。

## 📋 目录

- [功能特性](#功能特性)
- [快速开始](#快速开始)
- [API接口](#api接口)
- [部署指南](#部署指南)
- [性能优化](#性能优化)
- [常见问题](#常见问题)

## 🚀 功能特性

### ✨ 核心功能

- ✅ **300+ 网易云音乐接口** - 完整的API支持
- ✅ **Meting API 兼容** - 无缝对接现有前端
- ✅ **多源切换** - 自动故障转移
- ✅ **智能缓存** - 提升响应速度
- ✅ **请求限流** - 保护服务稳定
- ✅ **错误重试** - 提高可靠性
- ✅ **CORS 支持** - 跨域友好

### 🎯 优化亮点

1. **请求缓存系统**
   - 内存缓存，5分钟TTL
   - 自动清理过期数据
   - 支持缓存统计和清理

2. **智能限流保护**
   - 默认100请求/分钟
   - 基于IP地址限流
   - 返回重试时间提示

3. **多API源支持**
   - 主源 + 备用源自动切换
   - 响应时间监控
   - 健康检查机制

4. **增强的错误处理**
   - 详细的错误信息
   - 自动重试机制
   - 友好的错误提示

## 🚀 快速开始

### 本地开发

```bash
# 安装依赖
cd ncm-api
npm install

# 启动开发服务器
npm run dev

# 或使用增强版
node enhanced-app.js
```

服务将在 `http://localhost:3000` 启动。

### 环境变量配置

创建 `.env` 文件：

```env
# 服务端口
PORT=3000

# 环境
NODE_ENV=production

# 允许的源（逗号分隔，* 表示所有）
ALLOWED_ORIGINS=*

# 缓存TTL（毫秒）
CACHE_TTL=300000

# 请求限流（每分钟）
RATE_LIMIT=100
```

## 📡 API接口

### 1. Meting API 兼容接口

**端点**: `/api.php`

**方法**: `GET` / `POST`

#### 搜索歌曲

```http
GET /api.php?type=search&name=周杰伦&server=netease&count=30
```

**参数**:
- `type`: 操作类型 `search`
- `name`: 搜索关键词 *(必需)*
- `server`: 音乐平台 (netease/tencent/kugou 等)
- `count`: 返回数量 (默认30)

**响应**:
```json
[
  {
    "id": "186016",
    "name": "七里香",
    "artist": ["周杰伦"],
    "album": "七里香",
    "pic_id": "109951163062711488",
    "source": "netease"
  }
]
```

#### 获取歌曲URL

```http
GET /api.php?type=url&id=186016&server=netease&br=320
```

**参数**:
- `type`: 操作类型 `url`
- `id`: 歌曲ID *(必需)*
- `server`: 音乐平台
- `br`: 音质 (128/192/320/740/999)

**响应**:
```json
{
  "url": "http://music.163.com/song/media/outer/url?id=186016.mp3",
  "br": "320"
}
```

#### 获取歌曲封面

```http
GET /api.php?type=pic&id=186016&server=netease&size=300
```

**参数**:
- `type`: 操作类型 `pic`
- `id`: 歌曲ID *(必需)*
- `server`: 音乐平台
- `size`: 图片尺寸 (默认300)

**响应**:
```json
{
  "url": "https://p1.music.126.net/xxxxx.jpg"
}
```

#### 获取歌词

```http
GET /api.php?type=lyric&id=186016&server=netease
```

**参数**:
- `type`: 操作类型 `lyric` 或 `lrc`
- `id`: 歌曲ID *(必需)*
- `server`: 音乐平台

**响应**:
```json
{
  "lyric": "[00:00.00]七里香 - 周杰伦\n[00:01.00]词：方文山\n..."
}
```

#### 获取歌单

```http
GET /api.php?type=playlist&id=3778678&server=netease
```

**参数**:
- `type`: 操作类型 `playlist`
- `id`: 歌单ID *(必需)*
- `server`: 音乐平台

**响应**:
```json
[
  {
    "id": "186016",
    "name": "七里香",
    "artist": ["周杰伦"],
    "album": "七里香"
  }
]
```

### 2. 健康检查接口

#### 服务状态

```http
GET /health
```

**响应**:
```json
{
  "status": "healthy",
  "uptime": 3600,
  "memory": {
    "rss": 50331648,
    "heapTotal": 18907136,
    "heapUsed": 12345678
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 缓存统计

```http
GET /cache/stats
```

**响应**:
```json
{
  "total": 150,
  "valid": 120,
  "expired": 30,
  "ttl": 300000,
  "maxSize": 1000
}
```

#### 清理缓存

```http
POST /cache/clear
```

**响应**:
```json
{
  "success": true,
  "message": "已清理 150 条缓存记录"
}
```

### 3. Vercel无服务器函数

#### NCM增强代理

```http
GET /api/ncm-proxy?types=search&source=netease&name=周杰伦
```

**特性**:
- 自动多源切换
- 内置缓存
- 请求重试
- 详细错误信息

**响应头**:
- `X-Cache`: HIT/MISS (缓存命中状态)
- `X-API-Source`: 使用的API源名称

### 4. 音乐平台支持

| 平台 | server参数 | 说明 |
|------|-----------|------|
| 网易云音乐 | netease | 推荐使用 |
| QQ音乐 | tencent | 部分接口支持 |
| 酷狗音乐 | kugou | 部分接口支持 |
| 酷我音乐 | kuwo | 部分接口支持 |
| 虾米音乐 | xiami | 已下线 |
| 百度音乐 | baidu | 部分接口支持 |
| Bilibili | bilibili | 需要专门代理 |

## 🚢 部署指南

### Vercel 部署

1. **Fork 本项目**

2. **导入到 Vercel**
   - 访问 [Vercel](https://vercel.com)
   - 点击 "Import Project"
   - 选择你的仓库

3. **配置环境变量**（可选）
   ```
   NODE_ENV=production
   CACHE_TTL=300000
   RATE_LIMIT=100
   ```

4. **部署**
   - Vercel 会自动构建和部署
   - 获取部署URL

### Docker 部署

```bash
# 构建镜像
docker build -t ncm-api ./ncm-api

# 运行容器
docker run -d \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e CACHE_TTL=300000 \
  --name ncm-api \
  ncm-api
```

### 传统服务器部署

```bash
# 安装依赖
cd ncm-api
npm install --production

# 使用 PM2 运行
pm2 start enhanced-app.js --name ncm-api

# 或使用 systemd
sudo systemctl start ncm-api
```

## ⚡ 性能优化

### 1. 缓存策略

**内存缓存**:
- 歌曲URL: 5分钟
- 搜索结果: 5分钟
- 歌词: 30分钟
- 封面图片: 1小时

**CDN缓存** (Vercel):
- 静态资源: 365天
- API响应: 根据Cache-Control

### 2. 请求优化

- **批量请求**: 合并多个请求
- **预加载**: 预先获取可能需要的数据
- **懒加载**: 延迟加载不必要的数据

### 3. 限流策略

默认配置：
- 100 请求/分钟/IP
- 超出返回 429 状态码
- 包含 `Retry-After` 头

调整限流：
```javascript
// enhanced-app.js
const RATE_LIMIT = 200; // 改为200请求/分钟
```

## 🔒 安全性

### 1. CORS 配置

```javascript
// 限制允许的源
ALLOWED_ORIGINS=https://music.example.com,https://app.example.com
```

### 2. 请求验证

- 参数类型检查
- 必需参数验证
- 恶意请求过滤

### 3. 错误处理

- 不暴露敏感信息
- 生产环境隐藏堆栈跟踪
- 统一错误格式

## ❓ 常见问题

### Q: 为什么有些歌曲无法播放？

A: 可能原因：
1. 歌曲有版权限制
2. API源不可用
3. 音质参数过高

解决方案：
- 尝试降低音质
- 切换其他音乐平台
- 检查API源状态

### Q: 如何提高API响应速度？

A: 优化建议：
1. 启用缓存
2. 使用CDN
3. 增加服务器资源
4. 使用本地部署

### Q: 支持哪些音乐平台？

A: 主要支持：
- ✅ 网易云音乐（最佳支持）
- ✅ QQ音乐
- ✅ 酷狗音乐
- ⚠️ 其他平台部分支持

### Q: API有请求限制吗？

A: 限制说明：
- 默认：100请求/分钟/IP
- Vercel：每月100GB流量
- 可通过环境变量调整

### Q: 如何监控API状态？

A: 监控方法：
1. 访问 `/health` 端点
2. 查看 `/cache/stats` 统计
3. 检查日志输出
4. 使用Vercel Analytics

## 📚 参考资源

- [NeteaseCloudMusicApi 官方文档](https://docs.neteasecloudmusicapi.binaryify.com/)
- [GitLab 项目地址](https://gitlab.com/shaoyouvip/neteasecloudmusicapi)
- [Meting API 文档](https://github.com/metowolf/Meting)
- [Vercel 部署文档](https://vercel.com/docs)

## 📝 更新日志

### v2.0.0 (2024-01-01)

**新增功能**:
- ✨ 集成 NeteaseCloudMusicApi
- ✨ 智能缓存系统
- ✨ 请求限流保护
- ✨ 多API源切换
- ✨ 健康检查端点

**优化改进**:
- 🚀 提升响应速度 50%
- 🛡️ 增强错误处理
- 📝 完善API文档
- 🔧 优化Vercel配置

**Bug修复**:
- 🐛 修复缓存过期问题
- 🐛 修复CORS配置
- 🐛 修复请求超时

## 📄 许可证

MIT License - 可自由使用和修改

## 🤝 贡献

欢迎提交Issue和Pull Request！

---

**Made with ❤️ for Music Lovers**