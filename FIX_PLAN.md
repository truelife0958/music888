
# 🔧 Music888 项目BUG修复计划

**生成时间**: 2025-11-02  
**项目版本**: 3.0.1  
**预计修复时间**: 2-3天  

---

## 📋 修复优先级

### 🔴 P0 - 立即修复（影响核心功能）

#### 1. API请求超时/无响应问题 ⚠️ **已在测试中发现**
**问题**: 搜索功能一直显示"正在加载"，API请求无响应
**文件**: [`js/api.ts`](js/api.ts)
**根本原因**: 
- API_BASE默认指向`https://music-api.gdstudio.xyz/api.php`，该服务可能不可用
- API切换机制可能失效
- 本地代理未正确配置

**修复方案**:
```typescript
// js/api.ts
// 1. 调整API优先级，优先使用本地代理
const API_SOURCES: ApiSource[] = [
    {
        name: 'Vercel Meting 代理 API',
        url: '/api/meting',
        type: 'meting'
    },
    {
        name: '主 API',
        url: 'https://music-api.gdstudio.xyz/api.php'
    }
];

// 2. 改进API测试逻辑
async function testAPI(apiUrl: string): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 缩短超时时间
        
        const testUrl = apiUrl.includes('meting')
            ? `${apiUrl}?server=netease&type=search&name=test&count=1`
            : `${apiUrl}?types=search&source=netease&name=test&count=1`;
        
        const response = await fetch(testUrl, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) return false;
        
        // 验证返回数据格式
        const data = await response.json();
        return Array.isArray(data) || (data && (data.data || data.songs || data.result));
    } catch (error) {
        return false;
    }
}

// 3. 添加重试延迟指数退避
const retryDelays = [500, 1000, 2000, 4000]; // 指数退避
```

**测试验证**:
- [ ] 搜索"周杰伦"能在3秒内返回结果
- [ ] API切换能正常工作
- [ ] 错误提示清晰友好

---

#### 2. Bilibili音频代理缺陷
**文件**: [`api/bilibili-proxy.js`](api/bilibili-proxy.js:49)
**问题**: 代理只处理JSON，无法代理音频流

**修复方案**:
```javascript
// api/bilibili-proxy.js
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { url } = req.query;

    // 如果是音频流代理请求
    if (url) {
        try {
            const headers = {
                'User-Agent': 'Mozilla/5.0',
                'Referer': 'https://www.bilibili.com/'
            };

            // 支持Range请求（断点续传）
            if (req.headers.range) {
                headers['Range'] = req.headers.range;
            }

            const response = await fetch(url, { headers });

            // 设置响应头
            res.status(response.status);
            response.headers.forEach((value, key) => {
                if (!['transfer-encoding', 'connection'].includes(key.toLowerCase())) {
                    res.setHeader(key, value);
                }
            });

            // 流式传输音频数据
            response.body.pipe(res);
            return;
        } catch (error) {
            res.status(500).json({ error: '音频代理失败', message: error.message });
            return;
        }
    }

    // 原有的API请求逻辑...
}
```

---

#### 3. 播放器双重初始化问题
**文件**: [`js/player.ts`](js/player.ts:22-32), [`js/main.ts`](js/main.ts:52-54)
**问题**: 控制台显示"✅ 成功获取页面中的audio元素"两次

**修复方案**:
```typescript
// js/player.ts
let isInitialized = false;

function initAudioPlayer(): void {
    if (isInitialized) {
        console.warn('播放器已初始化，跳过重复初始化');
        return;
    }

    const audioElement = document.getElementById('audioPlayer') as HTMLAudioElement;
    if (!audioElement) {
        throw new Error('找不到audio元素，请检查HTML');
    }

    audioPlayer = audioElement;
    console.log('✅ 播放器初始化成功');

    // 绑定事件监听器...
    
    isInitialized = true;
}
```

---

#### 4. localStorage溢出风险
**文件**: [`js/player.ts`](js/player.ts:434-456)
**问题**: 数据突然减半会导致用户体验差

**修复方案**:
```typescript
// js/player.ts
function addToPlayHistory(song: Song): void {
    const normalizedSong = { /* ... */ };
    
    // 移除重复
    playHistorySongs = playHistorySongs.filter(
        s => !(s.id === normalizedSong.id && s.source === normalizedSong.source)
    );

    playHistorySongs.unshift(normalizedSong);

    // 温和的清理策略
    const MAX_SIZE = PLAYER_CONFIG.MAX_HISTORY_SIZE;
    if (playHistorySongs.length > MAX_SIZE) {
        playHistorySongs = playHistorySongs.slice(0, MAX_SIZE);
    }

    try {
        const data = JSON.stringify(playHistorySongs);
        const sizeInMB = data.length / (1024 * 1024);
        
        if (sizeInMB > 4) {
            // 显示警告并清理最旧的1/4数据
            console.warn(`播放历史过大(${sizeInMB.toFixed(2)}MB)，清理最旧记录`);
            playHistorySongs = playHistorySongs.slice(0, Math.floor(MAX_SIZE * 0.75));
            
            // 通知用户
            window.dispatchEvent(new CustomEvent('storageWarning', {
                detail: { type: 'history', action: 'cleaned' }
            }));
        }
        
        localStorage.setItem(STORAGE_CONFIG.KEY_HISTORY, JSON.stringify(playHistorySongs));
    } catch (error) {
        if (error instanceof Error && error.name === 'QuotaExceededError') {
            // 紧急清理：只保留最近50条
            playHistorySongs = playHistorySongs.slice(0, 50);
            try {
                localStorage.setItem(STORAGE_CONFIG.KEY_HISTORY, JSON.stringify(playHistorySongs));
                
                // 显示用户友好的提示
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('storageQuotaExceeded', {
                        detail: { 
                            type: 'history',
                            message: '存储空间不足，已自动清理旧记录'
                        }
                    }));
                }
            } catch (retryError) {
                console.error('存储失败，建议清空浏览器缓存');
            }
        }
    }
}
```

---

### 🟡 P1 - 高优先级（影响用户体验）

#### 5. 搜索功能缺少防抖
**文件**: [`js/main.ts`](js/main.ts:673-708)
**修复方案**:
```typescript
// js/main.ts
import { debounce } from './utils.js';

// 创建防抖版本的搜索函数
const debouncedSearch = debounce(handleSearch, 500);

// 在事件监听中使用
searchButton.addEventListener('click', debouncedSearch);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        debouncedSearch();
    }
});
```

---

#### 6. 音频URL验证改进
**文件**: [`js/api.ts`](js/api.ts:249-264)
**修复方案**:
```typescript
export async function validateSongUrl(url: string): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        // 先尝试HEAD请求
        try {
            const response = await fetch(url, {
                method: 'HEAD',
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const contentType = response.headers.get('content-type');
                return contentType?.includes('audio') || contentType?.includes('video') || false;
            }
        } catch (headError) {
            // HEAD失败，降级使用GET请求（只读取前1KB）
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Range': 'bytes=0-1023' },
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            return response.ok && (
                response.headers.get('content-type')?.includes('audio') ||
                response.headers.get('content-type')?.includes('video') ||
                false
            );
        }
    } catch (error) {
        return false;
    }
}
```

---

#### 7. 移动端滑动优化
**文件**: [`js/main.ts`](js/main.ts:839-866)
**修复方案**:
```typescript
function handleSwipe() {
    if (isSwipping) return;

    const swipeThreshold = 80; // 增加阈值
    const diffX = touchStartX - touchEndX;
    const diffY = touchStartY - touchEndY;
    
    // 计算滑动速度
    const swipeTime = Date.now() - touchStartTime;
    const swipeSpeed = Math.abs(diffX) / swipeTime;

    // 只有当X轴滑动距离大于Y轴 AND 滑动距离超过阈值 AND 速度够快时才触发
    if (Math.abs(diffX) > swipeThreshold && 
        Math.abs(diffX) > Math.abs(diffY) * 2 && // X轴滑动要明显大于Y轴
        swipeSpeed > 0.3) { // 速度阈值
        
        isSwipping = true;

        if (diffX > 0 && currentPage < 2) {
            currentPage++;
            (window as any).switchMobilePage(currentPage);
        } else if (diffX < 0 && currentPage > 0) {
            currentPage--;
            (window as any).switchMobilePage(currentPage);
        }

        setTimeout(() => {
            isSwipping = false;
        }, 300);
    }
}

const handleTouchStart = (e: Event) => {
    if (!isSwipping) {
        touchStartX = (e as TouchEvent).changedTouches[0].screenX;
        touchStartY = (e as TouchEvent).changedTouches[0].screenY;
        touchStartTime = Date.now(); // 记录开始时间
    }
};
```

---

#### 8. 歌词解析正则优化
**文件**: [`js/player.ts`](js/player.ts:624-664)
**修复方案**:
```typescript
function parseLyrics(lrc: string): LyricLine[] {
    if (!lrc || !lrc.trim()) return [];
    
    const lines = lrc.split('\n');
    const result: LyricLine[] = [];
    
    for (const line of lines) {
        // 为每行创建新的正则实例，避免全局标志问题
        const timeRegex = /\[(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?:\.(\d{2,3}))?\]/g;
        const matches: { time: number; text: string }[] = [];
        
        let match;
        while ((match = timeRegex.exec(line)) !== null) {
            const hours = match[1] ? parseInt(match[1]) : 0;
            const minutes = parseInt(match[2]);
            const seconds = parseInt(match[3]);
            const milliseconds = match[4] ? parseInt(match[4].padEnd(3, '0')) : 0;
            
            const time = hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
            matches.push({ time, text: '' });
        }
        
        const text = line.replace(/\[(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?:\.(\d{2,3}))?\]/g, '').trim();
        
        if (text && matches.length > 0) {
            matches.forEach(m => {
                result.push({ time: m.time, text });
            });
        }
    }
    
    result.sort((a, b) => a.time - b.time);
    return result;
}
```

---

### 🟢 P2 - 中优先级（优化改进）

#### 9. 添加错误边界和全局错误处理
**新文件**: `js/error-handler.ts`
```typescript
// js/error-handler.ts
export class ErrorHandler {
    private static instance: ErrorHandler;
    
    private constructor() {
        this.setupGlobalHandlers();
    }
    