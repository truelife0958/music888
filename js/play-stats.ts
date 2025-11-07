// js/play-stats.ts - 播放统计功能

import { showNotification } from './ui';
import type { Song } from './api';
import { getFavoriteSongs, getPlayHistory, playSong } from './player';

// 统计配置
const STATS_CONFIG = {
    STORAGE_KEY: 'play_stats',
    TOP_COUNT: 10, // 显示前10名
};

interface PlayRecord {
    songId: string;
    songName: string;
    artist: string;
    playCount: number;
    totalDuration: number; // 总播放时长（秒）
    lastPlayTime: number;
}

interface ArtistStats {
    name: string;
    playCount: number;
    songCount: number;
}

interface PlayStats {
    totalPlays: number;
    totalDuration: number;
    songs: { [key: string]: PlayRecord };
    firstPlayDate: number;
}

let currentStats: PlayStats = {
    totalPlays: 0,
    totalDuration: 0,
    songs: {},
    firstPlayDate: Date.now()
};

let isStatsVisible = false;

// 初始化播放统计
export function initPlayStats() {
    loadStats();
    createStatsPanel();

    // 老王新增：初始化右侧边栏的标签
    initSidebarTabs();

    // 添加统计按钮
    const statsBtn = document.getElementById('statsBtn');
    if (statsBtn) {
        statsBtn.addEventListener('click', toggleStatsPanel);
    }
}

// 初始化右侧边栏标签
function initSidebarTabs() {
    const tabs = document.querySelectorAll('.stats-tabs-inline .stats-tab');
    const contents = document.querySelectorAll('.stats-content-inline .stats-tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = (tab as HTMLElement).dataset.statsTab;

            // 移除所有active状态
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));

            // 添加当前active状态
            tab.classList.add('active');

            // 显示对应内容
            if (tabName === 'most-played') {
                document.getElementById('mostPlayedContent')?.classList.add('active');
                updateSidebarMostPlayed();
            } else if (tabName === 'history') {
                document.getElementById('historyContent')?.classList.add('active');
                updateSidebarHistory();
            } else if (tabName === 'favorites') {
                document.getElementById('favoritesContent')?.classList.add('active');
                updateSidebarFavorites();
            }
        });
    });

    // 默认显示最多播放
    updateSidebarMostPlayed();
}

// 更新右侧边栏-最多播放
function updateSidebarMostPlayed() {
    const container = document.getElementById('mostPlayedList');
    if (!container) return;

    const topSongs = Object.values(currentStats.songs)
        .sort((a, b) => b.playCount - a.playCount)
        .slice(0, 10); // 显示前10名

    if (topSongs.length === 0) {
        container.innerHTML = '<div class="stats-empty">暂无统计数据</div>';
        return;
    }

    container.innerHTML = topSongs.map((song, index) => `
        <div class="stats-song-item" data-song-id="${song.songId}">
            <div class="stats-song-rank">${index + 1}</div>
            <div class="stats-song-info">
                <div class="stats-song-name">${song.songName}</div>
                <div class="stats-song-meta">${song.artist} • ${song.playCount}次</div>
            </div>
        </div>
    `).join('');
}

// 更新右侧边栏-收藏列表
function updateSidebarFavorites() {
    const container = document.getElementById('favoritesList');
    if (!container) return;

    const favorites = getFavoriteSongs();

    if (favorites.length === 0) {
        container.innerHTML = '<div class="stats-empty">暂无收藏</div>';
        return;
    }

    // 只显示最近收藏的10首
    const recentFavorites = favorites.slice(0, 10);

    container.innerHTML = recentFavorites.map((song, index) => `
        <div class="stats-song-item clickable" data-song-index="${index}">
            <div class="stats-song-rank">${index + 1}</div>
            <div class="stats-song-info">
                <div class="stats-song-name">${song.name}</div>
                <div class="stats-song-meta">${Array.isArray(song.artist) ? song.artist.join(', ') : song.artist}</div>
            </div>
            <button class="stats-play-btn" title="播放">
                <i class="fas fa-play"></i>
            </button>
        </div>
    `).join('');

    // 绑定播放事件
    container.querySelectorAll('.stats-song-item').forEach((item, index) => {
        item.addEventListener('click', (e) => {
            if (!(e.target as HTMLElement).closest('.stats-play-btn')) {
                playSong(index, favorites, 'favoritesList');
            }
        });
    });

    container.querySelectorAll('.stats-play-btn').forEach((btn, index) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            playSong(index, favorites, 'favoritesList');
        });
    });
}

// 更新右侧边栏-播放历史
function updateSidebarHistory() {
    const container = document.getElementById('historyList');
    if (!container) return;

    const history = getPlayHistory();

    if (history.length === 0) {
        container.innerHTML = '<div class="stats-empty">暂无播放历史</div>';
        return;
    }

    // 只显示最近播放的10首
    const recentHistory = history.slice(0, 10);

    container.innerHTML = recentHistory.map((song, index) => `
        <div class="stats-song-item clickable" data-song-index="${index}">
            <div class="stats-song-rank">${index + 1}</div>
            <div class="stats-song-info">
                <div class="stats-song-name">${song.name}</div>
                <div class="stats-song-meta">${Array.isArray(song.artist) ? song.artist.join(', ') : song.artist}</div>
            </div>
            <button class="stats-play-btn" title="播放">
                <i class="fas fa-play"></i>
            </button>
        </div>
    `).join('');

    // 绑定播放事件
    container.querySelectorAll('.stats-song-item').forEach((item, index) => {
        item.addEventListener('click', (e) => {
            if (!(e.target as HTMLElement).closest('.stats-play-btn')) {
                playSong(index, history, 'historyList');
            }
        });
    });

    container.querySelectorAll('.stats-play-btn').forEach((btn, index) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            playSong(index, history, 'historyList');
        });
    });
}

// 格式化相对时间
function formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) {
        return '刚刚';
    } else if (minutes < 60) {
        return `${minutes}分钟前`;
    } else if (hours < 24) {
        return `${hours}小时前`;
    } else if (days < 7) {
        return `${days}天前`;
    } else {
        return new Date(timestamp).toLocaleDateString('zh-CN');
    }
}


// 创建统计面板
function createStatsPanel() {
    const panel = document.createElement('div');
    panel.id = 'statsPanel';
    panel.className = 'stats-panel';
    panel.innerHTML = `
        <div class="stats-header">
            <h3>📊 播放统计</h3>
            <button class="stats-close" onclick="window.closeStatsPanel()">×</button>
        </div>
        <div class="stats-overview" id="statsOverview"></div>
        <div class="stats-tabs">
            <button class="stats-tab active" data-tab="songs">热门歌曲</button>
            <button class="stats-tab" data-tab="artists">热门艺术家</button>
        </div>
        <div class="stats-content">
            <div class="stats-tab-content active" id="statsSongsTab"></div>
            <div class="stats-tab-content" id="statsArtistsTab"></div>
        </div>
        <div class="stats-footer">
            <button class="stats-clear-btn" onclick="window.clearPlayStats()">
                <i class="fas fa-trash-alt"></i> 清除统计数据
            </button>
        </div>
    `;
    document.body.appendChild(panel);
    
    // 绑定标签切换
    panel.querySelectorAll('.stats-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            panel.querySelectorAll('.stats-tab').forEach(t => t.classList.remove('active'));
            panel.querySelectorAll('.stats-tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            const tabName = (tab as HTMLElement).dataset.tab;
            panel.querySelector(`#stats${tabName?.charAt(0).toUpperCase()}${tabName?.slice(1)}Tab`)?.classList.add('active');
        });
    });
    
    // 全局函数
    (window as any).closeStatsPanel = closeStatsPanel;
    (window as any).clearPlayStats = clearStats;
}

// 显示/隐藏统计面板
function toggleStatsPanel() {
    if (isStatsVisible) {
        closeStatsPanel();
    } else {
        openStatsPanel();
    }
}

// 打开统计面板
function openStatsPanel() {
    const panel = document.getElementById('statsPanel');
    if (panel) {
        updateStatsDisplay();
        panel.classList.add('active');
        isStatsVisible = true;
    }
}

// 关闭统计面板
function closeStatsPanel() {
    const panel = document.getElementById('statsPanel');
    if (panel) {
        panel.classList.remove('active');
        isStatsVisible = false;
    }
}

// 加载统计数据
function loadStats() {
    try {
        const saved = localStorage.getItem(STATS_CONFIG.STORAGE_KEY);
        if (saved) {
            currentStats = JSON.parse(saved);
        }
    } catch (error) {
        console.error('加载统计数据失败:', error);
    }
}

// 保存统计数据
function saveStats() {
    try {
        localStorage.setItem(STATS_CONFIG.STORAGE_KEY, JSON.stringify(currentStats));
    } catch (error: any) {
        console.error('保存统计数据失败:', error);
        
        // 处理配额超限
        if (error.name === 'QuotaExceededError' || error.code === 22) {
            console.warn('localStorage配额已满，尝试清理旧数据');
            try {
                // 只保留播放次数最多的前50首歌
                const topSongs = Object.values(currentStats.songs)
                    .sort((a, b) => b.playCount - a.playCount)
                    .slice(0, 50);
                
                const newSongsMap: { [key: string]: PlayRecord } = {};
                topSongs.forEach(song => {
                    newSongsMap[song.songId] = song;
                });
                
                currentStats.songs = newSongsMap;
                localStorage.setItem(STATS_CONFIG.STORAGE_KEY, JSON.stringify(currentStats));
                showNotification('已清理部分统计数据以释放空间', 'info');
            } catch (retryError) {
                console.error('清理后仍然无法保存:', retryError);
                showNotification('存储空间不足，统计数据未保存', 'warning');
            }
        }
    }
}

// 记录播放
export function recordPlay(song: Song, duration: number = 0) {
    if (!song || !song.id) return;

    // 播放时长少于5秒不记录（可能是误点击或快速切歌）
    if (duration < 5) return;

    const songId = song.id;
    const artist = Array.isArray(song.artist) ? song.artist.join(', ') : song.artist;

    // 更新总统计
    currentStats.totalPlays++;
    currentStats.totalDuration += duration;

    // 更新歌曲统计
    if (!currentStats.songs[songId]) {
        currentStats.songs[songId] = {
            songId,
            songName: song.name,
            artist,
            playCount: 0,
            totalDuration: 0,
            lastPlayTime: Date.now()
        };
    }

    currentStats.songs[songId].playCount++;
    currentStats.songs[songId].totalDuration += duration;
    currentStats.songs[songId].lastPlayTime = Date.now();

    saveStats();

    // 统计面板打开时实时更新显示
    if (isStatsVisible) {
        updateStatsDisplay();
    }
}

// 更新统计显示
function updateStatsDisplay() {
    updateOverview();
    updateTopSongs();
    updateTopArtists();
}

// 更新概览
function updateOverview() {
    const overview = document.getElementById('statsOverview');
    if (!overview) return;
    
    const days = Math.ceil((Date.now() - currentStats.firstPlayDate) / (1000 * 60 * 60 * 24));
    const avgPerDay = days > 0 ? (currentStats.totalPlays / days).toFixed(1) : '0';
    
    overview.innerHTML = `
        <div class="stats-card">
            <div class="stats-card-icon">🎵</div>
            <div class="stats-card-info">
                <div class="stats-card-value">${currentStats.totalPlays}</div>
                <div class="stats-card-label">总播放次数</div>
            </div>
        </div>
        <div class="stats-card">
            <div class="stats-card-icon">⏱️</div>
            <div class="stats-card-info">
                <div class="stats-card-value">${formatDuration(currentStats.totalDuration)}</div>
                <div class="stats-card-label">总播放时长</div>
            </div>
        </div>
        <div class="stats-card">
            <div class="stats-card-icon">📅</div>
            <div class="stats-card-info">
                <div class="stats-card-value">${days}</div>
                <div class="stats-card-label">使用天数</div>
            </div>
        </div>
        <div class="stats-card">
            <div class="stats-card-icon">📈</div>
            <div class="stats-card-info">
                <div class="stats-card-value">${avgPerDay}</div>
                <div class="stats-card-label">日均播放</div>
            </div>
        </div>
    `;
}

// 更新热门歌曲
function updateTopSongs() {
    const container = document.getElementById('statsSongsTab');
    if (!container) return;
    
    const topSongs = Object.values(currentStats.songs)
        .sort((a, b) => b.playCount - a.playCount)
        .slice(0, STATS_CONFIG.TOP_COUNT);
    
    if (topSongs.length === 0) {
        container.innerHTML = '<div class="stats-empty">暂无播放记录</div>';
        return;
    }
    
    container.innerHTML = `
        <div class="stats-list">
            ${topSongs.map((song, index) => `
                <div class="stats-item">
                    <div class="stats-rank ${index < 3 ? 'top-' + (index + 1) : ''}">${index + 1}</div>
                    <div class="stats-item-info">
                        <div class="stats-item-name">${song.songName}</div>
                        <div class="stats-item-artist">${song.artist}</div>
                    </div>
                    <div class="stats-item-data">
                        <div class="stats-item-count">${song.playCount} 次</div>
                        <div class="stats-item-duration">${formatDuration(song.totalDuration)}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// 更新热门艺术家
function updateTopArtists() {
    const container = document.getElementById('statsArtistsTab');
    if (!container) return;
    
    // 统计艺术家
    const artistsMap = new Map<string, ArtistStats>();
    
    Object.values(currentStats.songs).forEach(song => {
        const artists = song.artist.split(',').map(a => a.trim());
        artists.forEach(artist => {
            if (!artistsMap.has(artist)) {
                artistsMap.set(artist, {
                    name: artist,
                    playCount: 0,
                    songCount: 0
                });
            }
            const stats = artistsMap.get(artist)!;
            stats.playCount += song.playCount;
            stats.songCount++;
        });
    });
    
    const topArtists = Array.from(artistsMap.values())
        .sort((a, b) => b.playCount - a.playCount)
        .slice(0, STATS_CONFIG.TOP_COUNT);
    
    if (topArtists.length === 0) {
        container.innerHTML = '<div class="stats-empty">暂无播放记录</div>';
        return;
    }
    
    container.innerHTML = `
        <div class="stats-list">
            ${topArtists.map((artist, index) => `
                <div class="stats-item">
                    <div class="stats-rank ${index < 3 ? 'top-' + (index + 1) : ''}">${index + 1}</div>
                    <div class="stats-item-info">
                        <div class="stats-item-name">${artist.name}</div>
                        <div class="stats-item-artist">${artist.songCount} 首歌曲</div>
                    </div>
                    <div class="stats-item-data">
                        <div class="stats-item-count">${artist.playCount} 次播放</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// 清除统计数据
function clearStats() {
    if (currentStats.totalPlays === 0) {
        showNotification('暂无统计数据', 'info');
        return;
    }
    
    if (confirm('确定要清除所有播放统计数据吗？此操作不可恢复！')) {
        currentStats = {
            totalPlays: 0,
            totalDuration: 0,
            songs: {},
            firstPlayDate: Date.now()
        };
        saveStats();
        updateStatsDisplay();
        showNotification('已清除统计数据', 'success');
    }
}

// 格式化时长
function formatDuration(seconds: number): string {
    if (seconds < 60) {
        return `${Math.round(seconds)}秒`;
    } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        return `${minutes}分钟`;
    } else {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}小时${minutes}分钟`;
    }
}

// 获取统计数据
export function getStats(): PlayStats {
    return { ...currentStats };
}

// 导出统计数据
export function exportStats(): string {
    return JSON.stringify(currentStats, null, 2);
}