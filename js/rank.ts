// js/rank.ts - 音乐排行榜功能

import { parsePlaylistAPI, type Song } from './api';
import { playSong } from './player';
import { showNotification } from './ui';

// 排行榜配置
interface RankList {
    id: string;
    name: string;
    source: string;
    icon: string;
}

const RANK_LISTS: RankList[] = [
    // 网易云音乐排行榜
    { id: '3778678', name: '飙升榜', source: 'netease', icon: '🚀' },
    { id: '3779629', name: '新歌榜', source: 'netease', icon: '🆕' },
    { id: '19723756', name: '热歌榜', source: 'netease', icon: '🔥' },
    { id: '2884035', name: '说唱榜', source: 'netease', icon: '🎤' },
    
    // QQ音乐排行榜 - 使用正确的歌单ID
    { id: '3812895', name: 'QQ流行榜', source: 'tencent', icon: '⭐' },
    { id: '3885842924', name: 'QQ热歌榜', source: 'tencent', icon: '🎵' },
    
    // 酷狗音乐排行榜 - 使用正确的歌单ID
    { id: '8888', name: '酷狗TOP500', source: 'kugou', icon: '🏆' },
    { id: '6666', name: '酷狗飙升榜', source: 'kugou', icon: '📈' }
];

let currentRankSongs: Song[] = [];
let isRankVisible = false;

// 初始化排行榜
export function initRank() {
    const rankBtn = document.getElementById('rankBtn');
    if (rankBtn) {
        rankBtn.addEventListener('click', toggleRankPanel);
    }
    
    // 创建排行榜面板
    createRankPanel();
}

// 创建排行榜面板
function createRankPanel() {
    const panel = document.createElement('div');
    panel.id = 'rankPanel';
    panel.className = 'rank-panel';
    panel.innerHTML = `
        <div class="rank-header">
            <h3>🏆 音乐排行榜</h3>
            <button class="rank-close" onclick="window.closeRankPanel()">×</button>
        </div>
        <div class="rank-tabs">
            <button class="rank-tab active" data-source="netease">网易云</button>
            <button class="rank-tab" data-source="tencent">QQ音乐</button>
            <button class="rank-tab" data-source="kugou">酷狗</button>
        </div>
        <div class="rank-lists" id="rankLists"></div>
        <div class="rank-songs" id="rankSongs"></div>
    `;
    document.body.appendChild(panel);
    
    // 绑定标签切换事件
    const tabs = panel.querySelectorAll('.rank-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const source = tab.getAttribute('data-source') || 'netease';
            showRankLists(source);
        });
    });
    
    // 全局关闭函数
    (window as any).closeRankPanel = closeRankPanel;
}

// 显示/隐藏排行榜面板
function toggleRankPanel() {
    if (isRankVisible) {
        closeRankPanel();
    } else {
        openRankPanel();
    }
}

// 打开排行榜面板
function openRankPanel() {
    const panel = document.getElementById('rankPanel');
    if (panel) {
        panel.classList.add('active');
        isRankVisible = true;
        showRankLists('netease'); // 默认显示网易云
    }
}

// 关闭排行榜面板
function closeRankPanel() {
    const panel = document.getElementById('rankPanel');
    if (panel) {
        panel.classList.remove('active');
        isRankVisible = false;
    }
}

// 显示指定平台的排行榜列表
function showRankLists(source: string) {
    const listsContainer = document.getElementById('rankLists');
    if (!listsContainer) return;
    
    const ranks = RANK_LISTS.filter(r => r.source === source);
    
    listsContainer.innerHTML = ranks.map(rank => `
        <div class="rank-item" data-id="${rank.id}" data-source="${rank.source}">
            <span class="rank-icon">${rank.icon}</span>
            <span class="rank-name">${rank.name}</span>
            <span class="rank-arrow">→</span>
        </div>
    `).join('');
    
    // 绑定点击事件
    const items = listsContainer.querySelectorAll('.rank-item');
    items.forEach(item => {
        item.addEventListener('click', async () => {
            const id = item.getAttribute('data-id') || '';
            const source = item.getAttribute('data-source') || '';
            await loadRankSongs(id, source);
        });
    });
}

// 加载排行榜歌曲
async function loadRankSongs(rankId: string, source: string) {
    const songsContainer = document.getElementById('rankSongs');
    if (!songsContainer) return;
    
    try {
        songsContainer.innerHTML = '<div class="loading">加载中...</div>';
        
        const result = await parsePlaylistAPI(rankId, source);
        currentRankSongs = result.songs;
        
        if (currentRankSongs.length === 0) {
            songsContainer.innerHTML = '<div class="no-data">暂无数据</div>';
            return;
        }
        
        // 显示歌曲列表
        songsContainer.innerHTML = `
            <div class="rank-songs-header">
                <h4>${result.name || '排行榜'}</h4>
                <button class="play-all-btn" onclick="window.playAllRankSongs()">
                    ▶ 播放全部
                </button>
            </div>
            <div class="rank-songs-list">
                ${currentRankSongs.map((song, index) => `
                    <div class="rank-song-item" data-index="${index}">
                        <span class="rank-number">${index + 1}</span>
                        <div class="rank-song-info">
                            <div class="rank-song-name">${song.name}</div>
                            <div class="rank-song-artist">${Array.isArray(song.artist) ? song.artist.join(', ') : song.artist}</div>
                        </div>
                        <button class="rank-play-btn" title="播放">▶</button>
                    </div>
                `).join('')}
            </div>
        `;
        
        // 绑定播放按钮事件
        const playBtns = songsContainer.querySelectorAll('.rank-play-btn');
        playBtns.forEach((btn, index) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                playSong(index, currentRankSongs, 'rankSongs');
            });
        });
        
        // 绑定歌曲项点击事件
        const songItems = songsContainer.querySelectorAll('.rank-song-item');
        songItems.forEach((item, index) => {
            item.addEventListener('click', () => {
                playSong(index, currentRankSongs, 'rankSongs');
            });
        });
        
        // 全局播放全部函数
        (window as any).playAllRankSongs = () => {
            if (currentRankSongs.length > 0) {
                playSong(0, currentRankSongs, 'rankSongs');
                showNotification('开始播放排行榜', 'success');
            }
        };
        
    } catch (error) {
        console.error('加载排行榜失败:', error);
        songsContainer.innerHTML = '<div class="error">加载失败，请重试</div>';
        showNotification('加载排行榜失败', 'error');
    }
}

// 获取当前排行榜歌曲
export function getCurrentRankSongs(): Song[] {
    return currentRankSongs;
}