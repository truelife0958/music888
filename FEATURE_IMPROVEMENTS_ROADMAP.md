
# 功能改进路线图

**生成时间**: 2025-01-04  
**项目**: 沄听音乐播放器  
**版本**: v2.0 → v3.0 规划

---

## 🎯 核心功能完善

### 1. **离线播放支持** ⭐⭐⭐
**优先级**: 高

**功能描述**:
- 支持缓存已播放的歌曲
- 离线状态下可播放已缓存歌曲
- 智能管理缓存空间

**技术方案**:
```typescript
// 使用 IndexedDB 存储音频文件
class AudioCacheManager {
    private db: IDBDatabase;
    private maxCacheSize = 500 * 1024 * 1024; // 500MB
    
    async cacheSong(song: Song, audioBlob: Blob): Promise<void> {
        // 检查缓存空间
        const usage = await this.getCacheUsage();
        if (usage + audioBlob.size > this.maxCacheSize) {
            await this.evictLeastUsed();
        }
        
        // 存储到 IndexedDB
        await this.db.put('songs', {
            id: song.id,
            blob: audioBlob,
            metadata: song,
            cachedAt: Date.now()
        });
    }
    
    async getCachedSong(songId: string): Promise<Blob | null> {
        const record = await this.db.get('songs', songId);
        return record?.blob || null;
    }
}
```

**预期效果**:
- 弱网环境下流畅播放
- 节省流量
- 提升用户体验

---

### 2. **歌单管理增强** ⭐⭐⭐
**优先级**: 高

**新增功能**:
- ✅ 创建/编辑/删除自定义歌单
- ✅ 拖拽排序歌曲
- ✅ 歌单导入/导出（JSON 格式）
- ✅ 歌单分享（生成链接）
- ✅ 歌单封面自定义

**UI 设计**:
```
┌─────────────────────────────┐
│  我的歌单                    │
│  ├─ 🎵 我的喜欢 (45)         │
│  ├─ 🎸 摇滚精选 (23)         │
│  ├─ 🎹 古典音乐 (18)         │
│  └─ ➕ 创建新歌单            │
└─────────────────────────────┘
```

**技术实现**:
```typescript
interface Playlist {
    id: string;
    name: string;
    description: string;
    cover: string;
    songs: Song[];
    createdAt: number;
    updatedAt: number;
}

class PlaylistManager {
    async createPlaylist(name: string): Promise<Playlist> {
        const playlist: Playlist = {
            id: generateId(),
            name,
            description: '',
            cover: '',
            songs: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        await this.save(playlist);
        return playlist;
    }
    
    async exportPlaylist(id: string): Promise<string> {
        const playlist = await this.get(id);
        return JSON.stringify(playlist, null, 2);
    }
    
    async importPlaylist(json: string): Promise<Playlist> {
        const playlist = JSON.parse(json);
        await this.save(playlist);
        return playlist;
    }
}
```

---

### 3. **智能推荐系统** ⭐⭐⭐
**优先级**: 中

**功能描述**:
- 基于播放历史的歌曲推荐
- 相似歌曲推荐
- 用户喜好分析

**算法设计**:
```typescript
class RecommendationEngine {
    // 基于协同过滤的推荐
    async getRecommendations(user: User): Promise<Song[]> {
        const playHistory = await this.getPlayHistory(user);
        const preferences = this.analyzePreferences(playHistory);
        
        // 计算相似度
        const similarSongs = await this.findSimilarSongs(preferences);
        
        // 排序和过滤
        return this.rankAndFilter(similarSongs, playHistory);
    }
    
    private analyzePreferences(history: Song[]): Preferences {
        return {
            genres: this.extractGenres(history),
            artists: this.extractArtists(history),
            tempo: this.analyzeTempo(history),
            mood: this.analyzeMood(history)
        };
    }
}
```

---

### 4. **音效均衡器** ⭐⭐
**优先级**: 中

**功能描述**:
- 10段均衡器
- 预设音效（流行、摇滚、古典等）
- 自定义音效保存

**技术实现**:
```typescript
class AudioEqualizer {
    private audioContext: AudioContext;
    private filters: BiquadFilterNode[] = [];
    
    init(audioElement: HTMLAudioElement): void {
        this.audioContext = new AudioContext();
        const source = this.audioContext.createMediaElementSource(audioElement);
        
        // 创建 10 段均衡器
        const frequencies = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
        
        frequencies.forEach((freq, index) => {
            const filter = this.audioContext.createBiquadFilter();
            filter.type = 'peaking';
            filter.frequency.value = freq;
            filter.Q.value = 1;
            filter.gain.value = 0;
            
            if (index === 0) {
                source.connect(filter);
            } else {
                this.filters[index - 1].connect(filter);
            }
            
            this.filters.push(filter);
        });
        
        this.filters[this.filters.length - 1].connect(this.audioContext.destination);
    }
    
    setGain(index: number, gain: number): void {
        if (this.filters[index]) {
            this.filters[index].gain.value = gain;
        }
    }
    
    applyPreset(preset: 'pop' | 'rock' | 'classical'): void {
        const presets = {
            pop: [3, 2, 0, -1, -2, -1, 2, 3, 3, 2],
            rock: [5, 3, -1, -2, -1, 1, 3, 4, 4, 4],
            classical: [0, 0, 0, 0, 0, 0, -2, -2, -2, -3]
        };
        
        presets[preset].forEach((gain, index) => {
            this.setGain(index, gain);
        });
    }
}
```

---

### 5. **歌词卡拉OK模式** ⭐⭐
**优先级**: 低

**功能描述**:
- 逐字高亮歌词
- 支持翻译歌词
- 全屏歌词展示

**UI 效果**:
```
┌─────────────────────────────┐
│                              │
│   🎤 卡拉OK 模式             │
│                              │
│   [告白气球]                 │
│   塞纳河畔 左岸的咖啡         │
│   ████████░░░░░░░░           │
│   (Seine River left bank...) │
│                              │
└─────────────────────────────┘
```

---

## 🎨 UI/UX 改进

### 6. **主题切换** ⭐⭐⭐
**优先级**: 高

**新增主题**:
- 🌙 深色模式（默认）
- ☀️ 浅色模式
- 🎨 自动跟随系统
- 🌈 自定义主题

**实现方案**:
```css
/* 浅色主题 */
[data-theme="light"] {
    --primary-color: #ff6b6b;
    --bg-color: #ffffff;
    --text-color: #333333;
    --bg-glass-light: rgba(0, 0, 0, 0.05);
}

/* 深色主题 */
[data-theme="dark"] {
    --primary-color: #ff6b6b;
    --bg-color: #0c0c0c;
    --text-color: #ffffff;
    --bg-glass-light: rgba(255, 255, 255, 0.05);
}
```

```typescript
class ThemeManager {
    setTheme(theme: 'light' | 'dark' | 'auto'): void {
        if (theme === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            theme = prefersDark ? 'dark' : 'light';
        }
        
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }
}
```

---

### 7. **可视化频谱** ⭐⭐
**优先级**: 中

**功能描述**:
- 实时音频频谱显示
- 多种可视化样式（柱状、波形、圆形）
- 颜色自定义

**技术实现**:
```typescript
class AudioVisualizer {
    private analyser: AnalyserNode;
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    
    init(audioElement: HTMLAudioElement, canvas: HTMLCanvasElement): void {
        const audioContext = new AudioContext();
        const source = audioContext.createMediaElementSource(audioElement);
        this.analyser = audioContext.createAnalyser();
        
        this.analyser.fftSize = 256;
        source.connect(this.analyser);
        this.analyser.connect(audioContext.destination);
        
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        
        this.draw();
    }
    
    private draw(): void {
        requestAnimationFrame(() => this.draw());
        
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.analyser.getByteFrequencyData(dataArray);
        
        // 绘制频谱
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        const barWidth = this.canvas.width / bufferLength;
        
        dataArray.forEach((value, index) => {
            const barHeight = (value / 255) * this.canvas.height;
            const x = index * barWidth;
            const y = this.canvas.height - barHeight;
            
            this.ctx.fillStyle = `hsl(${(value / 255) * 360}, 100%, 50%)`;
            this.ctx.fillRect(x, y, barWidth - 1, barHeight);
        });
    }
}
```

---

### 8. **手势控制优化** ⭐⭐⭐
**优先级**: 高（移动端）

**新增手势**:
- 👆 上滑: 显示歌词
- 👇 下滑: 隐藏歌词
- 👈 左滑: 下一首
- 👉 右滑: 上一首
- 🔄 双击: 收藏/取消收藏
- ✋ 长按: 显示菜单

**实现**:
```typescript
class GestureController {
    private startX = 0;
    private startY = 0;
    private startTime = 0;
    
    init(element: HTMLElement): void {
        element.addEventListener('touchstart', this.handleTouchStart.bind(this));
        element.addEventListener('touchend', this.handleTouchEnd.bind(this));
        element.addEventListener('touchmove', this.handleTouchMove.bind(this));
    }
    
    private handleTouchStart(e: TouchEvent): void {
        this.startX = e.touches[0].clientX;
        this.startY = e.touches[0].clientY;
        this.startTime = Date.now();
    }
    
    private handleTouchEnd(e: TouchEvent): void {
        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const duration = Date.now() - this.startTime;
        
        const diffX = endX - this.startX;
        const diffY = endY - this.startY;
        
        // 判断手势类型
        if (duration < 300) {
            if (Math.abs(diffX) > Math.abs(diffY)) {
                // 水平滑动
                if (Math.abs(diffX) > 50) {
                    diffX > 0 ? this.onSwipeRight() : this.onSwipeLeft();
                }
            } else {
                // 垂直滑动
                if (Math.abs(diffY) > 50) {
                    diffY > 0 ? this.onSwipeDown() : this.onSwipeUp();
                }
            }
        }
    }
}
```

---

## 🔧 技术改进

### 9. **PWA 完整支持** ⭐⭐⭐
**优先级**: 高

**功能**:
- ✅ 离线可用
- ✅ 添加到主屏幕
- ✅ 后台播放
- ✅ 媒体通知
- ✅ 自动更新

**Service Worker 优化**:
```typescript
// service-worker.ts
const CACHE_NAME = 'music-player-v3.0';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/main.js',
    // ...
];

self.addEventListener('install', (event: ExtendableEvent) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
});

self.addEventListener('fetch', (event: FetchEvent) => {
    event.respondWith(
        caches.match(event.request).then(response => {
            // 缓存优先，网络降级
            return response || fetch(event.request).then(networkResponse => {
                return caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                });
            });
        })
    );
});
```

---

### 10. **性能监控** ⭐⭐
**优先级**: 中

**监控指标**:
- FCP (First Contentful Paint)
- LCP (Largest Contentful Paint)
- CLS (Cumulative Layout Shift)
- API 响应时间
- 播放器加载时间

**实现**:
```typescript
class PerformanceMonitor {
    private metrics: Map<string, number> = new Map();
    
    recordMetric(name: string, value: number): void {
        this.metrics.set(name, value);
        
        // 发送到分析服务
        this.sendToAnalytics(name, value);
    }
    
    measureLoadTime(): void {
        const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        this.recordMetric('dns', perfData.domainLookupEnd - perfData.domainLookupStart);
        this.recordMetric('tcp', perfData.connectEnd - perfData.connectStart);
        this.recordMetric('ttfb', perfData.responseStart - perfData.requestStart);
        this.recordMetric('domLoaded', perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart);
    }
    
    measureAPICall(endpoint: string, startTime: number): void {
        const duration = Date.now() - startTime;
        this.recordMetric(`api_${endpoint}`, duration);
    }
}
```

---

### 11. **测试覆盖** ⭐⭐⭐
**优先级**: 高

**测试方案**:
```typescript
// 单元测试示例
describe('formatArtist', () => {
    it('should handle string input', () => {
        expect(formatArtist('周杰伦')).toBe('周杰伦');
    });
    
    it('should handle array input', () => {
        expect(formatArtist(['周杰伦', '方文山'])).toBe('周杰伦 / 方文山');
    });
    
    it('should handle null input', () => {
        expect(formatArtist(null)).toBe('未知歌手');
    });
