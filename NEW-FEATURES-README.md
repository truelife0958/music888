# 🎵 新增功能说明 - 新碟上架

基于 [NeteaseCloudMusicApi](https://gitlab.com/shaoyouvip/neteasecloudmusicapi) 接口文档，为 Music888 项目新增"新碟上架"功能模块。

## 📦 新增文件

### 1. 核心功能模块
- **`js/new-albums.ts`** (341行)
  - 新碟上架核心功能
  - 专辑列表获取
  - 专辑详情查询
  - 地区筛选功能

### 2. 样式文件
- **`css/new-albums.css`** (486行)
  - 专辑网格布局
  - 专辑卡片样式
  - 专辑详情弹窗
  - 响应式设计

### 3. 演示页面
- **`new-albums-demo.html`** (240行)
  - 完整的使用示例
  - 可直接运行测试

## 🚀 功能特性

### ✨ 核心功能

1. **新碟列表展示**
   - ✅ 网格布局，响应式设计
   - ✅ 专辑封面、名称、艺术家
   - ✅ 发布时间、歌曲数量
   - ✅ 悬停效果，播放按钮

2. **地区筛选**
   - ✅ 全部 (ALL)
   - ✅ 华语 (ZH)
   - ✅ 欧美 (EA)
   - ✅ 韩国 (KR)
   - ✅ 日本 (JP)

3. **专辑详情弹窗**
   - ✅ 专辑完整信息
   - ✅ 歌曲列表展示
   - ✅ 播放全部功能
   - ✅ 添加到歌单

4. **智能交互**
   - ✅ 点击专辑卡片查看详情
   - ✅ 点击播放按钮直接播放
   - ✅ ESC键关闭弹窗
   - ✅ 点击遮罩层关闭

## 📡 使用的API接口

### 1. 新碟上架
```typescript
GET /album/new?area={area}&limit={limit}&offset={offset}
```

**参数**：
- `area`: 地区 (ALL/ZH/EA/WE/KR/JP)
- `limit`: 返回数量 (默认30)
- `offset`: 偏移量 (默认0)

**响应示例**：
```json
{
  "code": 200,
  "albums": [
    {
      "id": 123456,
      "name": "专辑名称",
      "artists": [{"name": "艺术家名称"}],
      "picUrl": "封面URL",
      "publishTime": 1640966400000,
      "size": 12
    }
  ]
}
```

### 2. 专辑详情
```typescript
GET /album?id={albumId}
```

**参数**：
- `id`: 专辑ID

**响应示例**：
```json
{
  "code": 200,
  "album": {
    "id": 123456,
    "name": "专辑名称",
    "artists": [{"name": "艺术家"}],
    "publishTime": 1640966400000,
    "size": 12
  },
  "songs": [
    {
      "id": 789,
      "name": "歌曲名称",
      "ar": [{"name": "艺术家"}],
      "al": {"name": "专辑", "picUrl": "封面"}
    }
  ]
}
```

## 💻 使用方法

### 方式一：独立使用

1. **启动本地API服务器**
```bash
cd ncm-api
node enhanced-app.js
```

2. **打开演示页面**
```bash
# 直接在浏览器中打开
open new-albums-demo.html
```

### 方式二：集成到现有项目

1. **引入模块**
```typescript
import { renderNewAlbums, createAreaFilter, getAlbumDetail } from './js/new-albums.js';
```

2. **渲染新碟列表**
```typescript
// 在HTML中添加容器
<div id="albums-container"></div>

// 渲染列表
await renderNewAlbums('albums-container', 'ALL');
```

3. **添加地区筛选**
```typescript
// 在HTML中添加容器
<div id="area-filter"></div>

// 创建筛选器
createAreaFilter('area-filter', async (area) => {
    await renderNewAlbums('albums-container', area);
});
```

4. **监听事件**
```typescript
// 监听专辑详情请求
document.addEventListener('showAlbumDetail', async (e) => {
    const albumId = e.detail.albumId;
    // 处理显示详情逻辑
});

// 监听播放专辑请求
document.addEventListener('playAlbum', (e) => {
    const { album, songs } = e.detail;
    // 处理播放逻辑
});
```

## 🎨 样式定制

### 修改主题颜色

```css
/* 在 css/new-albums.css 中修改 */

/* 主色调 */
.area-filter button.active {
    background: linear-gradient(135deg, #your-color1 0%, #your-color2 100%);
}

.btn-play-all {
    background: linear-gradient(135deg, #your-color1 0%, #your-color2 100%);
}
```

### 调整布局

```css
/* 修改网格列数 */
.album-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    /* 改为200px以显示更大的专辑卡片 */
}
```

## 📱 响应式设计

自动适配不同屏幕尺寸：

- **桌面端** (>768px): 每行5-6个专辑
- **平板端** (480-768px): 每行3-4个专辑
- **移动端** (<480px): 每行2个专辑

## 🔌 扩展功能

### 1. 添加无限滚动

```typescript
let offset = 0;
const limit = 30;

async function loadMore() {
    const albums = await getNewAlbums('ALL', limit, offset);
    // 渲染到页面
    offset += limit;
}

// 监听滚动事件
window.addEventListener('scroll', () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
        loadMore();
    }
});
```

### 2. 添加搜索功能

```typescript
async function searchAlbums(keyword: string) {
    const response = await fetch(`${getApiBase()}/search?keywords=${keyword}&type=10&limit=30`);
    const data = await response.json();
    return data.result.albums;
}
```

### 3. 收藏专辑

```typescript
async function subscribeAlbum(albumId: string, subscribe: boolean) {
    const response = await fetch(
        `${getApiBase()}/album/sub?id=${albumId}&t=${subscribe ? 1 : 0}`,
        { method: 'POST' }
    );
    return await response.json();
}
```

## 🐛 常见问题

### Q: 为什么专辑封面无法显示？

A: 可能原因：
1. API服务器未启动
2. 网络问题
3. 图片URL失效

解决方案：
```typescript
// 添加图片加载错误处理
<img src="${album.picUrl}" 
     onerror="this.src='data:image/svg+xml,...'" 
     alt="${album.name}">
```

### Q: 如何使用Vercel部署的API？

A: 修改 `getApiBase()` 函数：
```typescript
function getApiBase(): string {
    return 'https://your-project.vercel.app/api/ncm-proxy';
}
```

### Q: 如何集成到现有播放器？

A: 监听自定义事件并调用播放器API：
```typescript
document.addEventListener('playAlbum', async (e) => {
    const { songs } = e.detail;
    
    // 假设你的播放器有这些方法
    player.clearPlaylist();
    player.addToPlaylist(songs);
    player.play();
});
```

## 📊 性能优化建议

### 1. 图片懒加载
```html
<img src="${album.picUrl}" loading="lazy" alt="${album.name}">
```

### 2. 使用CDN
```typescript
const cdnUrl = 'https://cdn.example.com';
const optimizedUrl = album.picUrl.replace('music.163.com', cdnUrl);
```

### 3. 缓存专辑数据
```typescript
const albumCache = new Map();

async function getAlbumWithCache(albumId: string) {
    if (albumCache.has(albumId)) {
        return albumCache.get(albumId);
    }
    
    const data = await getAlbumDetail(albumId);
    albumCache.set(albumId, data);
    return data;
}
```

## 🎯 下一步计划

- [ ] 添加专辑评论功能
- [ ] 添加专辑分享功能
- [ ] 添加收藏专辑功能
- [ ] 添加专辑推荐算法
- [ ] 添加专辑排行榜
- [ ] 支持更多音乐平台

## 📚 参考文档

- [NeteaseCloudMusicApi 文档](https://docs.neteasecloudmusicapi.binaryify.com/)
- [API功能映射表](ncm-api/FEATURES-MAP.md)
- [完整API文档](ncm-api/API-DOCUMENTATION.md)
- [部署指南](ncm-api/DEPLOY.md)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**享受音乐，享受编程！** 🎵✨