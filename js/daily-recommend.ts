// js/daily-recommend.ts - 每日推荐功能

import { parsePlaylistAPI, type Song } from './api';
import { playSong } from './player';
import { showNotification } from './ui';

// 每日推荐配置
const DAILY_RECOMMEND_CONFIG = {
    STORAGE_KEY: 'daily_recommend',
    SONGS_COUNT: 30, // 每日推荐歌曲数量
    CACHE_DURATION: 24 * 60 * 60 * 1000, // 缓存时长24小时
};

// 推荐源配置
const RECOMMEND_SOURCES = [
    { id: '3778678', source: 'netease', weight: 0.4 }, // 网易云飙升榜 40%
    { id: '19723756', source: 'netease', weight: 0.3 }, // 网易云热歌榜 30%
    { id: '3779629', source: 'netease', weight: 0.3 }, // 网易云新歌榜 30%
];

interface DailyRecommendCache {
    date: string;
    songs: Song[];
    timestamp: number;
}

let currentRecommendSongs: Song[] = [];
let isRecommendVisible = false;

// 初始化每日推荐
export function initDailyRecommend() {
    const recommendBtn = document.getElementById('dailyRecommendBtn');
    if (recommendBtn) {
        recommendBtn.addEventListener('click', toggleRecommendPanel);
    }
    
    // 创建推荐面板
    createRecommendPanel();
}

// 创建推荐面板
function createRecommendPanel() {
    const panel = document.createElement('div');
    panel.id = 'recommendPanel';
    panel.className = 'recommend-panel';
    panel.innerHTML = `
        <div class="recommend-header">
            <h3>🎲 每日推荐</h3>
            <button class="recommend-close" onclick="window.closeRecommendPanel()">×</button>
        </div>
        <div class="recommend-info">
            <p>每天为你推荐${DAILY_RECOMMEND_CONFIG.SONGS_COUNT}首精选音乐</p>
            <p class="recommend-date" id="recommendDate"></p>
        </div>
        <div class="recommend-actions">
            <button class="recommend-refresh-btn" onclick="window.refreshDailyRecommend()">
                <i class="fas fa-sync-alt"></i> 刷新推荐
            </button>
            <button class="recommend-play-all-btn" onclick="window.playAllRecommend()">
                <i class="fas fa-play"></i> 播放全部
            </button>
        </div>
        <div class="recommend-songs" id="recommendSongs">
            <div class="loading">加载中...</div>
        </div>
    `;
    document.body.appendChild(panel);
    
    // 全局函数
    (window as any).closeRecommendPanel = closeRecommendPanel;
    (window as any).refreshDailyRecommend = () => loadDailyRecommend(true);
    (window as any).playAllRecommend = playAllRecommend;
}

// 显示/隐藏推荐面板
function toggleRecommendPanel() {
    if (isRecommendVisible) {
        closeRecommendPanel();
    } else {
        openRecommendPanel();
    }
}

// 打开推荐面板
async function openRecommendPanel() {
    const panel = document.getElementById('recommendPanel');
    if (panel) {
        panel.classList.add('active');
        isRecommendVisible = true;
        await loadDailyRecommend();
    }
}

// 关闭推荐面板
function closeRecommendPanel() {
    const panel = document.getElementById('recommendPanel');
    if (panel) {
        panel.classList.remove('active');
        isRecommendVisible = false;
    }
}

// 加载每日推荐
async function loadDailyRecommend(forceRefresh: boolean = false) {
    const songsContainer = document.getElementById('recommendSongs');
    const dateElement = document.getElementById('recommendDate');
    
    if (!songsContainer) return;
    
    try {
        // 检查缓存
        if (!forceRefresh) {
            const cached = getCachedRecommend();
            if (cached) {
                currentRecommendSongs = cached.songs;
                displayRecommendSongs(cached.songs);
                if (dateElement) {
                    dateElement.textContent = `更新时间: ${cached.date}`;
                }
                return;
            }
        }
        
        songsContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> 正在生成推荐...</div>';
        
        // 从多个榜单获取歌曲
        const allSongs: Song[] = [];
        
        for (const source of RECOMMEND_SOURCES) {
            try {
                const result = await parsePlaylistAPI(source.id, source.source);
                const count = Math.floor(DAILY_RECOMMEND_CONFIG.SONGS_COUNT * source.weight);
                const randomSongs = shuffleArray(result.songs).slice(0, count);
                allSongs.push(...randomSongs);
            } catch (error) {
                console.error(`获取榜单 ${source.id} 失败:`, error);
            }
        }
        
        if (allSongs.length === 0) {
            songsContainer.innerHTML = '<div class="error">获取推荐失败，请稍后重试</div>';
            showNotification('获取推荐失败', 'error');
            return;
        }
        
        // 随机打乱并取指定数量
        const recommendSongs = shuffleArray(allSongs).slice(0, DAILY_RECOMMEND_CONFIG.SONGS_COUNT);
        currentRecommendSongs = recommendSongs;
        
        // 缓存推荐
        cacheRecommend(recommendSongs);
        
        // 显示推荐
        displayRecommendSongs(recommendSongs);
        
        // 更新日期
        if (dateElement) {
            const today = new Date().toLocaleDateString('zh-CN');
            dateElement.textContent = `更新时间: ${today}`;
        }
        
        showNotification(`已为你推荐${recommendSongs.length}首歌曲`, 'success');
        
    } catch (error) {
        console.error('加载每日推荐失败:', error);
        songsContainer.innerHTML = '<div class="error">加载失败，请重试</div>';
        showNotification('加载推荐失败', 'error');
    }
}

// 显示推荐歌曲
function displayRecommendSongs(songs: Song[]) {
    const songsContainer = document.getElementById('recommendSongs');
    if (!songsContainer) return;
    
    songsContainer.innerHTML = `
        <div class="recommend-songs-list">
            ${songs.map((song, index) => `
                <div class="recommend-song-item" data-index="${index}">
                    <span class="recommend-number">${index + 1}</span>
                    <div class="recommend-song-info">
                        <div class="recommend-song-name">${song.name}</div>
                        <div class="recommend-song-artist">${Array.isArray(song.artist) ? song.artist.join(', ') : song.artist}</div>
                    </div>
                    <button class="recommend-play-btn" title="播放">▶</button>
                </div>
            `).join('')}
        </div>
    `;
    
    // 绑定播放按钮事件
    const playBtns = songsContainer.querySelectorAll('.recommend-play-btn');
    playBtns.forEach((btn, index) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            playSong(index, currentRecommendSongs, 'recommendSongs');
        });
    });
    
    // 绑定歌曲项点击事件
    const songItems = songsContainer.querySelectorAll('.recommend-song-item');
    songItems.forEach((item, index) => {
        item.addEventListener('click', () => {
            playSong(index, currentRecommendSongs, 'recommendSongs');
        });
    });
}

// 播放全部推荐
function playAllRecommend() {
    if (currentRecommendSongs.length > 0) {
        playSong(0, currentRecommendSongs, 'recommendSongs');
        showNotification('开始播放每日推荐', 'success');
    }
}

// 缓存推荐
function cacheRecommend(songs: Song[]) {
    const cache: DailyRecommendCache = {
        date: new Date().toLocaleDateString('zh-CN'),
        songs: songs,
        timestamp: Date.now()
    };
    
    try {
        localStorage.setItem(DAILY_RECOMMEND_CONFIG.STORAGE_KEY, JSON.stringify(cache));
    } catch (error: any) {
        console.error('缓存推荐失败:', error);
        
        // 处理配额超限
        if (error.name === 'QuotaExceededError' || error.code === 22) {
            console.warn('localStorage配额已满，尝试清理旧数据');
            try {
                // 清理旧的推荐缓存
                localStorage.removeItem(DAILY_RECOMMEND_CONFIG.STORAGE_KEY);
                // 重试
                localStorage.setItem(DAILY_RECOMMEND_CONFIG.STORAGE_KEY, JSON.stringify(cache));
            } catch (retryError) {
                console.error('清理后仍然无法缓存:', retryError);
                showNotification('缓存空间不足，推荐数据未保存', 'warning');
            }
        }
    }
}

// 获取缓存的推荐
function getCachedRecommend(): DailyRecommendCache | null {
    try {
        const cached = localStorage.getItem(DAILY_RECOMMEND_CONFIG.STORAGE_KEY);
        if (!cached) return null;
        
        const data: DailyRecommendCache = JSON.parse(cached);
        
        // 检查是否过期
        const now = Date.now();
        if (now - data.timestamp > DAILY_RECOMMEND_CONFIG.CACHE_DURATION) {
            localStorage.removeItem(DAILY_RECOMMEND_CONFIG.STORAGE_KEY);
            return null;
        }
        
        // 检查是否是今天的推荐
        const today = new Date().toLocaleDateString('zh-CN');
        if (data.date !== today) {
            localStorage.removeItem(DAILY_RECOMMEND_CONFIG.STORAGE_KEY);
            return null;
        }
        
        return data;
    } catch (error) {
        console.error('读取缓存失败:', error);
        return null;
    }
}

// 数组随机打乱
function shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// 获取当前推荐歌曲
export function getCurrentRecommendSongs(): Song[] {
    return currentRecommendSongs;
}

// 清除推荐缓存
export function clearRecommendCache() {
    localStorage.removeItem(DAILY_RECOMMEND_CONFIG.STORAGE_KEY);
    showNotification('已清除推荐缓存', 'success');
}