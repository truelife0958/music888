
# Music888 API 文档

## 目录
- [核心模块](#核心模块)
- [工具函数](#工具函数)
- [配置说明](#配置说明)
- [存储管理](#存储管理)
- [事件系统](#事件系统)

---

## 核心模块

### Player 模块 (`js/player.ts`)

播放器核心功能模块，负责音频播放控制、播放列表管理和音质选择。

#### 初始化
```typescript
// 自动初始化
// 页面加载时会自动初始化播放器
```

#### 主要 API

##### `playSong(song: Song, playlist?: Song[]): Promise<void>`
播放指定歌曲

**参数:**
- `song`: 歌曲对象，包含 id、name、artist 等信息
- `playlist`: 可选，播放列表数组

**示例:**
```typescript
await playSong({
  id: '123',
  name: '晴天',
  artist: '周杰伦',
  source: 'netease'
});
```

##### `nextSong(): Promise<void>`
播放下一首歌曲

**示例:**
```typescript
await nextSong();
```

##### `previousSong(): Promise<void>`
播放上一首歌曲

**示例:**
```typescript
await previousSong();
```

##### `togglePlay(): void`
切换播放/暂停状态

**示例:**
```typescript
togglePlay();
```

##### `setVolume(volume: number): void`
设置音量

**参数:**
- `volume`: 音量值，范围 0-1

**示例:**
```typescript
setVolume(0.5); // 设置音量为50%
```

##### `seek(time: number): void`
跳转到指定时间

**参数:**
- `time`: 时间（秒）

**示例:**
```typescript
seek(30); // 跳转到30秒位置
```

##### `toggleFavorite(): boolean`
切换当前歌曲的收藏状态

**返回:** 新的收藏状态（true/false）

**示例:**
```typescript
const isFavorited = toggleFavorite();
console.log(`收藏状态: ${isFavorited}`);
```

##### `downloadSong(song: Song): Promise<void>`
下载歌曲

**参数:**
- `song`: 要下载的歌曲对象

**示例:**
```typescript
await downloadSong(currentSong);
```

---

### API 模块 (`js/api.ts`)

处理音乐平台 API 请求，支持多个音乐源。

#### 主要 API

##### `searchSongs(keyword: string, source?: string, page?: number): Promise<SearchResult>`
搜索歌曲

**参数:**
- `keyword`: 搜索关键词
- `source`: 可选，音乐源（netease/tencent/kugou等）
- `page`: 可选，页码（默认1）

**返回:** 搜索结果对象
```typescript
interface SearchResult {
  songs: Song[];
  total: number;
  page: number;
}
```

**示例:**
```typescript
const result = await searchSongs('周杰伦', 'netease', 1);
console.log(`找到 ${result.total} 首歌曲`);
```

##### `getSongUrl(id: string, source: string, quality?: string): Promise<string>`
获取歌曲播放地址

**参数:**
- `id`: 歌曲ID
- `source`: 音乐源
- `quality`: 可选，音质（128/192/320/740/999）

**返回:** 歌曲URL

**示例:**
```typescript
const url = await getSongUrl('123', 'netease', '320');
```

##### `getLyrics(id: string, source: string): Promise<Lyric[]>`
获取歌词

**参数:**
- `id`: 歌曲ID
- `source`: 音乐源

**返回:** 歌词数组
```typescript
interface Lyric {
  time: number;
  text: string;
}
```

**示例:**
```typescript
const lyrics = await getLyrics('123', 'netease');
```

---

### UI 模块 (`js/ui.ts`)

负责界面渲染和用户交互。

#### 主要 API

##### `displaySearchResults(songs: Song[], append?: boolean): void`
显示搜索结果

**参数:**
- `songs`: 歌曲数组
- `append`: 可选，是否追加到现有列表（默认false）

**示例:**
```typescript
displaySearchResults(songs, false); // 替换列表
displaySearchResults(moreSongs, true); // 追加到列表
```

##### `updateProgress(currentTime: number, duration: number): void`
更新播放进度

**参数:**
- `currentTime`: 当前时间（秒）
- `duration`: 总时长（秒）

**示例:**
```typescript
updateProgress(30, 240); // 30秒/240秒
```

##### `updateLyrics(lyrics: Lyric[], currentTime: number): void`
更新歌词显示

**参数:**
- `lyrics`: 歌词数组
- `currentTime`: 当前播放时间（秒）

**示例:**
```typescript
updateLyrics(lyrics, 30);
```

##### `showNotification(message: string, type?: 'success' | 'error' | 'info'): void`
显示通知消息

**参数:**
- `message`: 消息内容
- `type`: 可选，消息类型（默认'info'）

**示例:**
```typescript
showNotification('添加到收藏成功', 'success');
showNotification('播放失败', 'error');
```

---

## 工具函数

### `js/utils.ts`

#### 防抖和节流

##### `debounce<T>(func: T, wait: number): (...args) => void`
防抖函数，延迟执行

**参数:**
- `func`: 要防抖的函数
- `wait`: 延迟时间（毫秒）

**示例:**
```typescript
const debouncedSearch = debounce(searchSongs, 300);
input.addEventListener('input', (e) => {
  debouncedSearch(e.target.value);
});
```

##### `throttle<T>(func: T, limit: number): (...args) => void`
节流函数，限制执行频率

**参数:**
- `func`: 要节流的函数
- `limit`: 时间限制（毫秒）

**示例:**
```typescript
const throttledScroll = throttle(handleScroll, 100);
window.addEventListener('scroll', throttledScroll);
```

#### 格式化函数

##### `formatTime(seconds: number): string`
格式化时间为 mm:ss

**示例:**
```typescript
formatTime(125); // "2:05"
formatTime(3661); // "61:01"
```

##### `formatArtist(artist: ArtistInput): string`
格式化艺术家信息

**示例:**
```typescript
formatArtist('周杰伦'); // "周杰伦"
formatArtist(['周杰伦', '方文山']); // "周杰伦 / 方文山"
formatArtist({ name: '周杰伦' }); // "周杰伦"
```

##### `generateSongFileName(song: Song, extension?: string): string`
生成安全的文件名

**示例:**
```typescript
generateSongFileName({ name: '晴天', artist: '周杰伦' }); 
// "晴天 - 周杰伦.mp3"

generateSongFileName({ name: '晴天', artist: '周杰伦' }, '.lrc');
// "晴天 - 周杰伦.lrc"
```

#### 存储操作

##### `storage.get<T>(key: string, defaultValue: T): T`
从 localStorage 获取数据

**示例:**
```typescript
const favorites = storage.get('favoriteSongs', []);
```

##### `storage.set<T>(key: string, value: T): boolean`
保存数据到 localStorage

**示例:**
```typescript
storage.set('favoriteSongs', songs);
```

##### `storage.remove(key: string): boolean`
删除指定键的数据

**示例:**
```typescript
storage.remove('tempData');
```

##### `storage.clear(): boolean`
清空所有数据

**示例:**
```typescript
storage.clear();
```

#### 其他工具

##### `sleep(ms: number): Promise<void>`
异步延迟

**示例:**
```typescript
await sleep(1000); // 延迟1秒
```

##### `shuffleArray<T>(array: T[]): T[]`
随机打乱数组

**示例:**
```typescript
const shuffled = shuffleArray([1, 2, 3, 4, 5]);
```

##### `clamp(value: number, min: number, max: number): number`
限制数值范围

**示例:**
```typescript
clamp(15, 0, 10); // 10
clamp(-5, 0, 10); // 0
clamp(5, 0, 10);  // 5
```

##### `isMobile(): boolean`
检测是否为移动设备

**示例:**
```typescript
if (isMobile()) {
  // 移动端特殊处理
}
```

##### `copyToClipboard(text: string): Promise<boolean>`
复制文本到剪贴板

**示例:**
```typescript
const success = await copyToClipboard('https://example.com');
if (success) {
  showNotification('已复制到剪贴板');
}
```

---

## 配置说明

### `js/config.ts`

#### PLAYER_CONFIG
播放器配置常量

```typescript
{
  MAX_HISTORY_SIZE: 50,           // 最大播放历史数
  MAX_CONSECUTIVE_FAILURES: 5,    // 最大连续失败次数
  RETRY_DELAY: 1500,              // 重试延迟（毫秒）
  SOURCE_SWITCH_THRESHOLD: 2      // 切换源的失败阈值
}
```

#### API_CONFIG
API 请求配置

```typescript
{
  TIMEOUT: 15000,                 // 请求超时（毫秒）
  MAX_RETRIES: 3,                 // 最大重试次数
  RETRY_BASE_DELAY: 1000,         // 重试基础延迟（毫秒）
  API_FAILURE_THRESHOLD: 3,       // API 失败阈值
  USE_PROXY: true,                // 是否使用代理
  PROXY_SOURCES: ['bilibili', 'kuwo']  // 需要代理的源
}
```

#### STORAGE_CONFIG
存储键名配置

```typescript
{
  KEY_PLAYLISTS: 'musicPlayerPlaylists',
  KEY_HISTORY: 'musicPlayerHistory',
  KEY_SAVED_PLAYLISTS: 'savedPlaylists',
  KEY_FAVORITES: 'favoriteSongs',
  QUOTA_WARNING_THRESHOLD: 8 * 1024 * 1024  // 8MB
}
```

#### UI_CONFIG
UI 配置

```typescript
{
  NOTIFICATION_DURATION: 3000,      // 通知显示时长（毫秒）
  NOTIFICATION_FADE_DURATION: 500,  // 通知淡出时长（毫秒）
  SEARCH_DEBOUNCE_DELAY: 300,       // 搜索防抖延迟（毫秒）
  SWIPE_THRESHOLD: 50,              // 滑动阈值（像素）
  MOBILE_BREAKPOINT: 768            // 移动端断点（像素）
}
```

#### 音乐源配置

```typescript
// 可用音乐源
AVAILABLE_SOURCES = [
  'netease',   // 网易云音乐
  'tencent',   // QQ音乐
  'kugou',     // 酷狗音乐
  'kuwo',      // 酷我音乐
  'xiami',     // 虾米音乐
  'baidu',     // 百度音乐
  'bilibili'   // Bilibili音乐
]

// 音质级别
QUALITY_NAMES = {
  '128': '标准 128K',
  '192': '较高 192K',
  '320': '高品质 320K',
  '740': '无损 FLAC',
  '999': 'Hi-Res'
}

// 音质降级队列（按优先级）
QUALITY_FALLBACK = ['999', '740', '320', '192', '128']
```

---

## 存储管理

### IndexedDB (`js/indexed-db.ts`)

用于存储大量音乐数据和缓存。

#### 主要 API

##### `saveSong(song: Song): Promise<void>`
保存歌曲到数据库

##### `getSong(id: string): Promise<Song | undefined>`
从数据库获取歌曲

##### `getAllSongs(): Promise<Song[]>`
获取所有歌曲

##### `deleteSong(id: string): Promise<void>`
删除指定歌曲

##### `clearAll(): Promise<void>`
清空数据库

**示例:**
```typescript
// 保存歌曲
await saveSong(song);

// 获取歌曲
const song = await getSong('123');

// 获取所有歌曲
const allSongs = await getAllSongs();

// 删除歌曲
await deleteSong('123');
```

---

## 事件系统

### 自定义事件

播放器会触发以下自定义事件：

#### `songchange`
当前播放歌曲改变时触发

**事件数据:**
```typescript
{
  song: Song,
  index: number
}
```

**监听示例:**
```typescript
window.addEventListener('songchange', (e) => {
  console.log('正在播放:', e.detail.song.name);
});
```

#### `playlistchange`
播放列表改变时触发

**事件数据:**
```typescript
{
  playlist: Song[],
  action: 'add' | 'remove' | 'clear' | 'reorder'
}
```

#### `favoritechange`
收藏状态改变时触发

**事件数据:**
```typescript
{
  songId: string,
  isFavorited: boolean
}
```

---

## 错误处理

### ErrorType 枚举

```typescript
enum ErrorType {
  COPYRIGHT = 'COPYRIGHT',          // 版权保护
  EMPTY_RESOURCE = 'EMPTY_RESOURCE', // 资源为空
  TIMEOUT = 'TIMEOUT',              // 超时
  NETWORK = 'NETWORK',              // 网络错误
  PARSE = 'PARSE',                  // 解析错误
  UNKNOWN = 'UNKNOWN'               // 未知错误
}
```

### formatErrorMessage(error, context)

格式化错误消息，自动检测错误类型并添加友好提示。

**示例:**
```typescript
try {
  await playSong(song);
} catch (error) {
  const message = formatErrorMessage(error, '播放歌曲');
  showNotification(message, 'error');
}
```

---

## 最佳实践

### 1. 错误处理
```typescript
try {
  await someAsyncOperation();
} catch (error) {
  console.error('操作失败:', error);
  showNotification(formatErrorMessage(error, '操作'), 'error');
}
```

### 2. 防抖搜索
```typescript
const debouncedSearch = debounce(async (keyword) => {
  const results = await searchSongs(keyword);
  displaySearchResults(results.songs);
}, 300);
```

### 3. 存储数据
```typescript
// 保存时检查返回值
if (storage.set('key', data)) {
  console.log('保存成功');
} else {
  