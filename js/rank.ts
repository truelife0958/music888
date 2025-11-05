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
    // 初始化排行榜标签页内的内容
    initRankTab();
}

// 初始化排行榜标签页
function initRankTab() {
    const sourceSelect = document.getElementById('rankSourceSelect') as HTMLSelectElement;
    const listSelect = document.getElementById('rankListSelect') as HTMLSelectElement;
    const loadBtn = document.getElementById('rankLoadBtn') as HTMLButtonElement;

    if (!sourceSelect || !listSelect || !loadBtn) {
        console.error('排行榜选择器元素未找到');
        return;
    }

    // 平台切换时更新榜单列表
    sourceSelect.addEventListener('change', () => {
        updateRankLists(sourceSelect.value);
    });

    // 榜单选择变化时启用/禁用加载按钮
    listSelect.addEventListener('change', () => {
        if (listSelect.value) {
            loadBtn.disabled = false;
        } else {
            loadBtn.disabled = true;
        }
    });

    // 加载按钮点击事件
    loadBtn.addEventListener('click', async () => {
        const rankId = listSelect.value;
        const source = sourceSelect.value;
        if (rankId) {
            await loadRankSongs(rankId, source);
        }
    });

    // 初始化榜单列表（默认网易云）
    updateRankLists('netease');
    loadBtn.disabled = true;
}

// 更新榜单下拉框选项
function updateRankLists(source: string) {
    const listSelect = document.getElementById('rankListSelect') as HTMLSelectElement;
    if (!listSelect) return;

    const ranks = RANK_LISTS.filter(r => r.source === source);

    listSelect.innerHTML = '<option value="">请选择榜单</option>' +
        ranks.map(rank => `
            <option value="${rank.id}" data-source="${rank.source}">
                ${rank.icon} ${rank.name}
            </option>
        `).join('');

    // 禁用加载按钮
    const loadBtn = document.getElementById('rankLoadBtn') as HTMLButtonElement;
    if (loadBtn) {
        loadBtn.disabled = true;
    }

    // 清空歌曲列表
    const songsContainer = document.getElementById('rankSongs');
    if (songsContainer) {
        songsContainer.innerHTML = '';
    }
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