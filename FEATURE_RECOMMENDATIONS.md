# 🎵 音乐播放器 - 实用功能推荐

## 📊 热门功能推荐

### 1. 🏆 音乐排行榜

#### 功能描述
展示各大平台的热门音乐排行榜，让用户快速发现流行音乐。

#### 实现方案
```typescript
// 排行榜类型
interface RankList {
    id: string;
    name: string;
    source: string;
    updateTime: string;
}

// 支持的排行榜
const RANK_LISTS = [
    // 网易云音乐
    { id: '3778678', name: '飙升榜', source: 'netease' },
    { id: '3779629', name: '新歌榜', source: 'netease' },
    { id: '19723756', name: '云音乐热歌榜', source: 'netease' },
    { id: '2884035', name: '云音乐说唱榜', source: 'netease' },
    
    // QQ音乐
    { id: '26', name: 'QQ音乐巅峰榜-流行指数', source: 'tencent' },
    { id: '4', name: 'QQ音乐巅峰榜-热歌', source: 'tencent' },
    
    // 酷狗音乐
    { id: '8888', name: '酷狗TOP500', source: 'kugou' },
    { id: '6666', name: '酷狗飙升榜', source: 'kugou' }
];

// 获取排行榜
async function getRankList(rankId: string, source: string) {
    const response = await fetch(
        `/api?types=playlist&source=${source}&id=${rankId}`
    );
    return response.json();
}
```

#### UI设计
```html
<div class="rank-section">
    <h3>🏆 音乐排行榜</h3>
    <div class="rank-tabs">
        <button class="rank-tab active">网易云</button>
        <button class="rank-tab">QQ音乐</button>
        <button class="rank-tab">酷狗</button>
    </div>
    <div class="rank-list">
        <!-- 排行榜列表 -->
    </div>
</div>
```

---

### 2. 🎲 每日推荐

#### 功能描述
每天自动推荐30首高质量音乐，基于热门榜单混合。

#### 实现方案
```typescript
async function getDailyRecommend() {
    // 从多个榜单随机抽取
    const sources = ['netease', 'tencent', 'kugou'];
    const songs = [];
    
    for (const source of sources) {
        const rank = await getRankList('hot', source);
        const randomSongs = rank.songs
            .sort(() => Math.random() - 0.5)
            .slice(0, 10);
        songs.push(...randomSongs);
    }
    
    return songs;
}

// 使用localStorage缓存，每天更新一次
function getCachedDailyRecommend() {
    const today = new Date().toDateString();
    const cached = localStorage.getItem('daily_recommend');
    
    if (cached) {
        const data = JSON.parse(cached);
        if (data.date === today) {
            return data.songs;
        }
    }
    
    return null;
}
```

---

### 3. 🔍 搜索历史

#### 功能描述
记录用户的搜索历史，快速重复搜索。

#### 实现方案
```typescript
class SearchHistory {
    private maxHistory = 20;
    
    add(keyword: string) {
        const history = this.getAll();
        // 去重并添加到开头
        const filtered = history.filter(k => k !== keyword);
        filtered.unshift(keyword);
        // 限制数量
        const limited = filtered.slice(0, this.maxHistory);
        localStorage.setItem('search_history', JSON.stringify(limited));
    }
    
    getAll(): string[] {
        const data = localStorage.getItem('search_history');
        return data ? JSON.parse(data) : [];
    }
    
    clear() {
        localStorage.removeItem('search_history');
    }
}
```

#### UI展示
```html
<div class="search-history">
    <div class="history-header">
        <span>🕐 搜索历史</span>
        <button onclick="clearHistory()">清空</button>
    </div>
    <div class="history-tags">
        <span class="tag">周杰伦</span>
        <span class="tag">晴天</span>
        <span class="tag">稻香</span>
    </div>
</div>
```

---

### 4. 🎨 歌手电台

#### 功能描述
根据歌手名称，自动获取该歌手的热门歌曲。

#### 实现方案
```typescript
async function getArtistRadio(artistName: string, source: string = 'netease') {
    // 搜索歌手
    const songs = await searchMusicAPI(artistName, source, 50);
    
    // 过滤该歌手的歌曲
    const artistSongs = songs.filter(song => 
        song.artist.some(a => 
            a.toLowerCase().includes(artistName.toLowerCase())
        )
    );
    
    return artistSongs;
}
```

---

### 5. 📻 相似歌曲推荐

#### 功能描述
根据当前播放的歌曲，推荐相似风格的音乐。

#### 实现方案
```typescript
async function getSimilarSongs(currentSong: Song) {
    // 方案1: 搜索相同艺术家的其他歌曲
    const artistSongs = await searchMusicAPI(
        currentSong.artist[0], 
        currentSong.source, 
        30
    );
    
    // 方案2: 搜索相同专辑的歌曲
    const albumSongs = await searchMusicAPI(
        currentSong.album,
        currentSong.source,
        20
    );
    
    // 合并去重
    return [...new Set([...artistSongs, ...albumSongs])];
}
```

---

### 6. ⏱️ 播放统计

#### 功能描述
统计用户的播放习惯，展示最常听的歌曲、艺术家。

#### 实现方案
```typescript
interface PlayStats {
    totalPlays: number;
    totalTime: number; // 秒
    topSongs: { song: Song; count: number }[];
    topArtists: { artist: string; count: number }[];
}

class PlayStatistics {
    recordPlay(song: Song, duration: number) {
        const stats = this.getStats();
        stats.totalPlays++;
        stats.totalTime += duration;
        
        // 更新歌曲统计
        const songIndex = stats.topSongs.findIndex(
            s => s.song.id === song.id
        );
        if (songIndex >= 0) {
            stats.topSongs[songIndex].count++;
        } else {
            stats.topSongs.push({ song, count: 1 });
        }
        
        // 排序
        stats.topSongs.sort((a, b) => b.count - a.count);
        
        this.saveStats(stats);
    }
}
```

#### UI展示
```html
<div class="play-stats">
    <h3>📊 我的音乐统计</h3>
    <div class="stat-card">
        <div class="stat-item">
            <span class="stat-label">总播放</span>
            <span class="stat-value">1,234次</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">总时长</span>
            <span class="stat-value">52小时</span>
        </div>
    </div>
    <div class="top-songs">
        <h4>🎵 最常播放</h4>
        <!-- 歌曲列表 -->
    </div>
</div>
```

---

### 7. 🌙 夜间模式

#### 功能描述
提供深色/浅色主题切换，保护眼睛。

#### 实现方案
```typescript
class ThemeManager {
    private themes = {
        light: {
            '--bg-primary': '#ffffff',
            '--bg-secondary': '#f5f5f5',
            '--text-primary': '#333333',
            '--text-secondary': '#666666'
        },
        dark: {
            '--bg-primary': '#1a1a1a',
            '--bg-secondary': '#2d2d2d',
            '--text-primary': '#ffffff',
            '--text-secondary': '#aaaaaa'
        }
    };
    
    setTheme(theme: 'light' | 'dark') {
        const colors = this.themes[theme];
        Object.entries(colors).forEach(([key, value]) => {
            document.documentElement.style.setProperty(key, value);
        });
        localStorage.setItem('theme', theme);
    }
    
    toggleTheme() {
        const current = localStorage.getItem('theme') || 'light';
        this.setTheme(current === 'light' ? 'dark' : 'light');
    }
}
```

---

### 8. 💾 本地缓存播放

#### 功能描述
缓存已播放的音乐，减少重复加载，支持离线播放。

#### 实现方案
```typescript
class AudioCache {
    private cacheDB: Cache;
    
    async init() {
        this.cacheDB = await caches.open('music-audio-v1');
    }
    
    async cacheAudio(url: string, audioBlob: Blob) {
        const response = new Response(audioBlob);
        await this.cacheDB.put(url, response);
    }
    
    async getAudio(url: string): Promise<Blob | null> {
        const response = await this.cacheDB.match(url);
        return response ? await response.blob() : null;
    }
    
    async clearCache() {
        await caches.delete('music-audio-v1');
    }
}
```

---

### 9. 🎵 歌词卡拉OK模式

#### 功能描述
高亮显示当前播放的歌词，支持点击歌词跳转。

#### 实现方案
```typescript
class KaraokeMode {
    private currentLine = 0;
    
    updateLyric(currentTime: number, lyrics: LyricLine[]) {
        for (let i = 0; i < lyrics.length; i++) {
            if (currentTime >= lyrics[i].time) {
                this.currentLine = i;
            }
        }
        
        // 高亮当前行
        document.querySelectorAll('.lyric-line').forEach((el, i) => {
            el.classList.toggle('active', i === this.currentLine);
        });
        
        // 滚动到当前行
        const activeLine = document.querySelector('.lyric-line.active');
        activeLine?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });
    }
    
    seekTo(lineIndex: number) {
        const time = lyrics[lineIndex].time;
        audio.currentTime = time;
    }
}
```

---

### 10. 🎧 均衡器

#### 功能描述
音频均衡器调节，支持预设和自定义。

#### 实现方案
```typescript
class AudioEqualizer {
    private audioContext: AudioContext;
    private filters: BiquadFilterNode[] = [];
    
    init(audioElement: HTMLAudioElement) {
        this.audioContext = new AudioContext();
        const source = this.audioContext.createMediaElementSource(audioElement);
        
        // 创建10段均衡器
        const frequencies = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
        frequencies.forEach(freq => {
            const filter = this.audioContext.createBiquadFilter();
            filter.type = 'peaking';
            filter.frequency.value = freq;
            filter.Q.value = 1;
            filter.gain.value = 0;
            this.filters.push(filter);
        });
        
        // 连接滤波器
        let currentNode = source;
        this.filters.forEach(filter => {
            currentNode.connect(filter);
            currentNode = filter;
        });
        currentNode.connect(this.audioContext.destination);
    }
    
    setGain(index: number, value: number) {
        this.filters[index].gain.value = value;
    }
    
    // 预设
    applyPreset(preset: 'pop' | 'rock' | 'jazz' | 'classical') {
        const presets = {
            pop: [3, 2, 0, -1, -2, -1, 0, 1, 2, 3],
            rock: [4, 3, 2, 1, 0, -1, 0, 2, 3, 4],
            jazz: [3, 2, 1, 0, 0, 0, 1, 2, 3, 4],
            classical: [-1, -1, -1, 0, 0, 0, -1, -2, -2, -3]
        };
        
        presets[preset].forEach((gain, i) => {
            this.setGain(i, gain);
        });
    }
}
```

---

## 🎯 优先级推荐

### 高优先级（容易实现，用户需求大）
1. ✅ **音乐排行榜** - 使用现有歌单API即可实现
2. ✅ **搜索历史** - 纯前端LocalStorage实现
3. ✅ **夜间模式** - CSS变量切换

### 中优先级（需要一些开发，提升用户体验）
4. ✅ **每日推荐** - 基于榜单随机组合
5. ✅ **播放统计** - LocalStorage记录
6. ✅ **歌手电台** - 使用搜索API

### 低优先级（复杂度较高，可选）
7. ⚠️ **相似推荐** - 需要更复杂的算法
8. ⚠️ **本地缓存** - 需要Cache API和空间管理
9. ⚠️ **歌词卡拉OK** - 需要精确时间控制
10. ⚠️ **均衡器** - 需要Web Audio API

---

## 💡 实现建议

### 快速添加排行榜功能

1. **在index.html添加排行榜区域**
```html
<div class="rank-section" style="display: none;">
    <div class="rank-header">
        <h3>🏆 音乐排行榜</h3>
        <button onclick="closeRank()">×</button>
    </div>
    <div class="rank-grid" id="rankGrid"></div>
</div>
```

2. **创建 js/rank.ts**
```typescript
export async function loadRankLists() {
    const ranks = [
        { id: '3778678', name: '飙升榜', source: 'netease' },
        { id: '19723756', name: '热歌榜', source: 'netease' }
    ];
    
    for (const rank of ranks) {
        const data = await parsePlaylistAPI(rank.id, rank.source);
        displayRank(rank.name, data.songs);
    }
}
```

3. **在main.ts导入并调用**
```typescript
import { loadRankLists } from './rank';

// 添加排行榜按钮点击事件
