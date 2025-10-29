# 🎵 发现音乐功能模块文档

基于 NeteaseCloudMusicApi 的完整音乐发现功能实现。

## 📦 模块概览

本项目实现了三个核心功能模块：

1. **发现音乐 (discover.ts)** - 推荐歌单、新歌速递、排行榜
2. **为我推荐 (recommend.ts)** - 每日推荐、个性化推荐、推荐MV
3. **播客电台 (podcast.ts)** - 电台分类、节目列表、节目详情

## 🚀 快速开始

### 1. 引入模块

```typescript
import * as Discover from './js/discover.ts';
import * as Recommend from './js/recommend.ts';
import * as Podcast from './js/podcast.ts';
```

### 2. 引入样式

```html
<link rel="stylesheet" href="css/discover.css">
```

### 3. 使用示例

```typescript
// 渲染推荐歌单
await Discover.renderRecommendPlaylists('container-id', 30);

// 渲染每日推荐
await Recommend.renderDailyRecommend('container-id');

// 渲染推荐电台
await Podcast.renderRecommendRadios('container-id');
```

## 📚 API 文档

### 发现音乐模块 (discover.ts)

#### 数据获取函数

##### `getRecommendPlaylists(limit: number): Promise<Playlist[]>`
获取推荐歌单列表

**参数：**
- `limit` - 数量限制，默认30

**返回：** 歌单数组

**示例：**
```typescript
const playlists = await Discover.getRecommendPlaylists(20);
console.log(playlists);
```

##### `getHighQualityPlaylists(cat: string, limit: number): Promise<Playlist[]>`
获取精品歌单

**参数：**
- `cat` - 分类，默认'全部'
- `limit` - 数量限制，默认30

##### `getNewSongs(type: number): Promise<Song[]>`
获取新歌速递

**参数：**
- `type` - 类型：0-全部, 7-华语, 96-欧美, 8-日本, 16-韩国

##### `getAllTopLists(): Promise<TopList[]>`
获取所有排行榜

##### `getPlaylistDetail(id: number): Promise<{playlist, songs}>`
获取歌单详情

#### 渲染函数

##### `renderRecommendPlaylists(containerId: string, limit: number): Promise<void>`
渲染推荐歌单到指定容器

**参数：**
- `containerId` - 容器元素ID
- `limit` - 数量限制

**示例：**
```typescript
await Discover.renderRecommendPlaylists('playlists-container', 30);
```

##### `renderNewSongs(containerId: string, type: number): Promise<void>`
渲染新歌速递

##### `renderTopLists(containerId: string): Promise<void>`
渲染排行榜

##### `createNewSongFilter(containerId: string, onChange: Function): void`
创建新歌类型筛选器

**示例：**
```typescript
Discover.createNewSongFilter('filter-container', async (type) => {
  await Discover.renderNewSongs('songs-container', type);
});
```

#### 工具函数

##### `formatPlayCount(count: number): string`
格式化播放次数（如：12345 -> 1.2万）

### 为我推荐模块 (recommend.ts)

#### 数据获取函数

##### `getDailyRecommendSongs(): Promise<Song[]>`
获取每日推荐歌曲（需要登录）

##### `getRecommendResource(): Promise<RecommendResource[]>`
获取推荐歌单（需要登录）

##### `getPersonalizedNewSong(): Promise<Song[]>`
获取推荐新音乐（不需要登录）

##### `getPersonalizedMV(): Promise<MV[]>`
获取推荐MV

##### `getPersonalFM(): Promise<Song[]>`
获取私人FM（需要登录）

#### 渲染函数

##### `renderDailyRecommend(containerId: string): Promise<void>`
渲染每日推荐

**特性：**
- 显示推荐日期
- 播放全部按钮
- 推荐理由显示

##### `renderRecommendPlaylists(containerId: string): Promise<void>`
渲染推荐歌单

##### `renderNewMusic(containerId: string): Promise<void>`
渲染推荐新音乐

##### `renderRecommendMV(containerId: string): Promise<void>`
渲染推荐MV

#### 工具函数

##### `formatPlayCount(count: number): string`
格式化播放次数

##### `formatDuration(ms: number): string`
格式化时长（如：245000 -> 4:05）

### 播客电台模块 (podcast.ts)

#### 数据获取函数

##### `getRadioCategories(): Promise<RadioCategory[]>`
获取电台分类

##### `getRecommendRadios(): Promise<Radio[]>`
获取推荐电台

##### `getRadiosByType(type: number): Promise<Radio[]>`
获取分类推荐电台

##### `getHotRadios(cateId: number, limit: number, offset: number): Promise<Radio[]>`
获取类别热门电台

**参数：**
- `cateId` - 分类ID
- `limit` - 数量限制，默认30
- `offset` - 偏移量，默认0

##### `getRadioPrograms(rid: number, limit: number, offset: number): Promise<RadioProgram[]>`
获取电台节目列表

##### `getRadioDetail(rid: number): Promise<Radio | null>`
获取电台详情

##### `getProgramToplist(limit: number, offset: number): Promise<RadioProgram[]>`
获取电台节目排行榜

#### 渲染函数

##### `renderRadioCategories(containerId: string, onSelect: Function): Promise<void>`
渲染电台分类

**示例：**
```typescript
await Podcast.renderRadioCategories('categories', (id, name) => {
  console.log(`选择了分类: ${name} (ID: ${id})`);
  // 加载该分类的电台
});
```

##### `renderRecommendRadios(containerId: string): Promise<void>`
渲染推荐电台

##### `renderHotRadios(containerId: string, cateId: number): Promise<void>`
渲染热门电台

##### `renderRadioPrograms(containerId: string, rid: number): Promise<void>`
渲染电台节目列表

#### 工具函数

##### `formatNumber(num: number): string`
格式化数字

##### `formatDuration(ms: number): string`
格式化时长（支持小时显示）

##### `formatDate(timestamp: number): string`
格式化日期（如：今天、昨天、3天前）

## 🎨 样式定制

### 主色调

项目使用渐变色主题，主色调为紫色渐变：

```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

### 自定义样式

可以通过覆盖以下CSS类来定制样式：

```css
/* 歌单卡片 */
.playlist-card {
  /* 自定义样式 */
}

/* 播放按钮 */
.play-btn {
  /* 自定义样式 */
}

/* 筛选按钮 */
.filter-btn.active {
  /* 自定义激活状态 */
}
```

## 📡 事件系统

所有模块都使用 `CustomEvent` 进行事件通信，以下是可监听的事件：

### 发现音乐事件

```typescript
// 播放歌单
document.addEventListener('playPlaylist', (e) => {
  console.log(e.detail); // { playlist, songs }
});

// 查看歌单详情
document.addEventListener('showPlaylistDetail', (e) => {
  console.log(e.detail); // { playlist, songs }
});

// 播放歌曲
document.addEventListener('playSong', (e) => {
  console.log(e.detail); // { song }
});
```

### 为我推荐事件

```typescript
// 播放全部
document.addEventListener('playAll', (e) => {
  console.log(e.detail); // { songs }
});

// 打开歌单
document.addEventListener('openPlaylist', (e) => {
  console.log(e.detail); // { id }
});

// 播放MV
document.addEventListener('playMV', (e) => {
  console.log(e.detail); // { id }
});
```

### 播客电台事件

```typescript
// 打开电台
document.addEventListener('openRadio', (e) => {
  console.log(e.detail); // { id }
});

// 播放节目
document.addEventListener('playProgram', (e) => {
  console.log(e.detail); // { program }
});
```

## 🔧 高级用法

### 1. 混合使用多个模块

```typescript
// 创建综合发现页面
async function createDiscoverPage() {
  // 推荐歌单
  await Discover.renderRecommendPlaylists('section-1', 20);
  
  // 每日推荐
  await Recommend.renderDailyRecommend('section-2');
  
  // 推荐电台
  await Podcast.renderRecommendRadios('section-3');
}
```

### 2. 自定义事件处理

```typescript
document.addEventListener('playSong', async (e) => {
  const { song } = e.detail;
  
  // 获取歌曲URL
  const url = await getMusicUrl(song.id);
  
  // 播放音乐
  audioPlayer.play(url);
  
  // 更新UI
  updateNowPlaying(song);
});
```

### 3. 分页加载

```typescript
let offset = 0;
const limit = 30;

async function loadMore() {
  const radios = await Podcast.getHotRadios(categoryId, limit, offset);
  renderRadios(radios);
  offset += limit;
}
```

### 4. 搜索和筛选

```typescript
// 组合使用分类筛选和搜索
Podcast.renderRadioCategories('categories', async (cateId, cateName) => {
  const radios = await Podcast.getHotRadios(cateId);
  const filtered = radios.filter(r => r.name.includes(searchKeyword));
  renderCustomRadioList(filtered);
});
```

## 🌐 API 配置

### 修改 API 基础地址

在各模块的 `getApiBase()` 函数中修改：

```typescript
function getApiBase(): string {
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:3000';
  }
  return 'https://your-api-domain.vercel.app'; // 修改为你的API地址
}
```

### 支持的 API 端点

当前配置的API地址：`https://music888-4swa.vercel.app`

主要使用的端点：
- `/personalized` - 推荐歌单
- `/top/song` - 新歌速递
- `/toplist` - 排行榜
- `/recommend/songs` - 每日推荐歌曲
- `/personalized/newsong` - 推荐新音乐
- `/personalized/mv` - 推荐MV
- `/dj/catelist` - 电台分类
- `/dj/recommend` - 推荐电台
- `/dj/program` - 电台节目

完整API文档：[NeteaseCloudMusicApi](https://gitlab.com/shaoyouvip/neteasecloudmusicapi)

## 📱 响应式设计

所有模块都支持响应式设计，自动适配不同屏幕尺寸：

- **桌面端** (>768px)：多列网格布局
- **平板端** (480px-768px)：中等列数
- **移动端** (<480px)：单列或双列布局

## 🎯 最佳实践

### 1. 错误处理

```typescript
try {
  const playlists = await Discover.getRecommendPlaylists(30);
  if (playlists.length === 0) {
    showEmptyState();
  } else {
    renderPlaylists(playlists);
  }
} catch (error) {
  console.error('获取歌单失败:', error);
  showErrorState();
}
```

### 2. 加载状态

```typescript
container.innerHTML = '<div class="loading">加载中...</div>';
const data = await fetchData();
renderData(data);
```

### 3. 性能优化

```typescript
// 使用 loading="lazy" 延迟加载图片
const img = document.createElement('img');
img.loading = 'lazy';
img.src = coverUrl;
```

### 4. 用户体验

- 提供加载状态提示
- 显示空状态提示
- 优雅的错误处理
- 流畅的动画过渡

## 🔗 相关链接

- **NeteaseCloudMusicApi**: https://gitlab.com/shaoyouvip/neteasecloudmusicapi
- **API 部署地址**: https://music888-4swa.vercel.app
- **演示页面**: discover-demo.html
- **接口映射表**: ncm-api/FEATURES-MAP.md

## 📝 更新日志

### v1.0.0 (2025-01-29)

**新增功能：**
- ✅ 发现音乐模块（推荐歌单、新歌速递、排行榜）
- ✅ 为我推荐模块（每日推荐、个性化推荐、推荐MV）
- ✅ 播客电台模块（电台分类、节目列表）
- ✅ 完整的事件系统
- ✅ 响应式设计
- ✅ TypeScript 类型支持

**特性：**
- 🎨 现代化UI设计
- 📱 移动端适配
- ⚡ 高性能渲染
- 🔄 智能缓存
- 🎯 事件驱动架构

## 💡 常见问题

### Q: 如何处理需要登录的接口？

A: 某些接口（如每日推荐）需要登录态。需要在API请求中包含 `credentials: 'include'`：

```typescript
fetch(url, { credentials: 'include' })
```

### Q: 如何自定义样式？

A: 可以通过覆盖CSS类或使用CSS变量来自定义样式。建议创建新的CSS文件覆盖默认样式。

### Q: 如何集成到现有项目？

A: 
1. 复制 js/ 和 css/ 文件夹到项目
2. 引入对应的 TS/JS 模块和 CSS 文件
3. 调用渲染函数到指定容器
4. 监听事件实现自定义逻辑

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License