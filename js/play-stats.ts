// js/play-stats.ts - 播放统计功能

import { showNotification } from './ui';
import type { Song } from './api';

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
    
    // 添加统计按钮
    const statsBtn = document.getElementById('statsBtn');
    if (statsBtn) {
        statsBtn.addEventListener('click', toggleStatsPanel);
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
    } catch (error) {
        console.error('保存统计数据失败:', error);
    }
}

// 记录播放
export function recordPlay(song: Song, duration: number = 0) {
    if (!song || !song.id) return;
    
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