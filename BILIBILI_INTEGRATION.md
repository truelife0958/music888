# Bilibili 音乐集成指南

## 🎯 架构说明

本项目采用**服务端代理**方案集成Bilibili音乐，完美解决CORS和Referer验证问题。

```
用户浏览器 → Vercel代理 → Bilibili服务器
           ↓
      处理CORS和Referer
           ↓
      返回音频流
```

## 📁 文件结构

```
project/
├── api/
│   ├── proxy.js              # 通用代理 (已有)
│   └── bilibili-proxy.js     # Bilibili专用代理 (新增)
├── js/
│   ├── api.ts                # Bilibili API集成
│   └── player.ts             # 播放器 (使用代理)
└── vercel.json               # Vercel配置
```

## 🚀 部署说明

### 1. Vercel 部署（推荐）

项目已配置好 `vercel.json`，直接部署即可：

```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署
vercel
```

### 2. 本地开发

开发环境下，Vite会自动代理API请求：

```bash
npm run dev
```

访问 `http://localhost:5173`

## 🎵 功能特性

### ✅ 已实现功能

1. **Bilibili音乐搜索**
   - 搜索Bilibili音乐内容
   - 支持分页和数量限制

2. **Bilibili音乐榜单**
   - 热门榜 (hot)
   - 新歌榜 (new)
   - 排行榜 (rank)

3. **音频播放**
   - 通过代理服务播放
   - 支持范围请求 (拖动进度条)
   - 流式传输，省内存

4. **智能降级**
   - 多品质自动切换
   - 失败自动重试
   - 跨音乐源fallback

## 🔧 技术优势

### 代理方案 vs Blob方案

| 特性 | 代理方案 | Blob方案 |
|------|---------|---------|
| 内存占用 | ✅ 低 (流式) | ❌ 高 (完整加载) |
| 加载速度 | ✅ 快 (边播边传) | ❌ 慢 (完整下载) |
| 进度拖动 | ✅ 支持 | ❌ 不支持 |
| 稳定性 | ✅ 高 | ⚠️ 中 |
| 实现复杂度 | ⚠️ 中 | ✅ 低 |

## 📝 API 使用示例

### 搜索 Bilibili 音乐

```typescript
import { searchMusicAPI } from './api.js';

const songs = await searchMusicAPI('张学友', 'bilibili');
console.log(songs); // 返回歌曲列表
```

### 获取 Bilibili 榜单

```typescript
import { getBilibiliChartList } from './api.js';

// 热门榜
const hotSongs = await getBilibiliChartList('hot');

// 新歌榜
const newSongs = await getBilibiliChartList('new');

// 排行榜
const rankSongs = await getBilibiliChartList('rank');
```

### 播放 Bilibili 音乐

```typescript
import { playSong } from './player.js';

// 自动使用代理服务
playSong(0, bilibiliSongs, 'searchResults');
```

## 🔐 安全性

### 代理服务安全措施

1. **URL验证**
   - 只允许 `bilivideo.com` 和 `hdslb.com` 域名
   - 防止代理被滥用

2. **请求头设置**
   - 正确的 User-Agent
   - 合法的 Referer
   - 适当的 Origin

3. **CORS配置**
   - 允许跨域访问
   - 支持范围请求
   - 流式传输优化

## 🐛 常见问题

### Q: 为什么需要代理服务？

A: Bilibili的音频资源有以下限制：
- CORS策略限制跨域访问
- 需要正确的Referer头
- 直接访问会被拒绝 (403 Forbidden)

### Q: 代理服务是否影响性能？

A: 不会。代理服务使用流式传输，边下载边播放，不增加额外延迟。

### Q: 本地开发如何测试？

A: 本地开发时，请求会自动路由到 `/api/bilibili-proxy`，无需额外配置。

### Q: 部署后还需要配置吗？

A: 不需要。Vercel会自动识别 `api/` 目录下的文件并部署为Serverless函数。

## 📊 性能优化

### 1. 流式传输
- 边下载边播放
- 降低首次播放延迟
- 减少内存占用

### 2. 范围请求支持
- 支持进度条拖动
- 只下载需要的部分
- 提升用户体验

### 3. 智能缓存
- 浏览器自动缓存
- 减少重复请求
- 加快二次播放

## 🎨 最佳实践

### 1. 错误处理

```typescript
try {
    const songs = await searchMusicAPI(keyword, 'bilibili');
    if (songs.length === 0) {
        showNotification('未找到相关音乐', 'warning');
    }
} catch (error) {
    console.error('搜索失败:', error);
    showNotification('搜索失败，请稍后重试', 'error');
}
```

### 2. 加载提示

```typescript
showNotification('正在加载 Bilibili 音乐...', 'info');
const songs = await getBilibiliChartList('hot');
showNotification(`加载成功，共${songs.length}首`, 'success');
```

### 3. 降级策略

```typescript
// 自动降级到其他音乐源
const result = await getSongUrlWithFallback(song, quality);
if (!result.url) {
    // 尝试下一首
    nextSong();
}
```

## 🔄 更新日志

### v1.1.0 (2025-10-25)
- ✅ 新增 Bilibili 专用代理服务
- ✅ 优化播放策略 (从 Blob 改为代理)
- ✅ 支持范围请求和流式传输
- ✅ 完善错误处理和降级机制

### v1.0.0
- ✅ 基础 Bilibili 音乐搜索
- ✅ 榜单功能 (hot/new/rank)
- ✅ Blob URL 播放方案

## 📚 相关资源

- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [Bilibili API 文档](https://doc.vkeys.cn/api-doc/v2/)
- [HTML5 Audio API](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/audio)
- [HTTP Range Requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests)

## 💡 贡献指南

欢迎提交Issue和Pull Request来改进Bilibili音乐集成！

---

**维护**: 沄听音乐播放器团队  
**更新**: 2025-10-25  
**状态**: ✅ 生产就绪