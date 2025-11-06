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
    // 老王优化：只保留网易云音乐的4个有效榜单
    { id: '3778678', name: '飙升榜', source: 'netease', icon: '🚀' },
    { id: '3779629', name: '新歌榜', source: 'netease', icon: '🆕' },
    { id: '19723756', name: '热歌榜', source: 'netease', icon: '🔥' },
    { id: '2884035', name: '说唱榜', source: 'netease', icon: '🎤' }
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
    // 老王优化：使用按钮模式代替下拉框
    // 为每个榜单创建按钮并绑定点击事件
    RANK_LISTS.forEach(rank => {
        const btn = document.getElementById(`rank-btn-${rank.id}`);
        if (btn) {
            btn.addEventListener('click', async () => {
                // 移除所有按钮的active状态
                document.querySelectorAll('.rank-btn').forEach(b => b.classList.remove('active'));
                // 添加当前按钮的active状态
                btn.classList.add('active');
                // 加载对应榜单
                await loadRankSongs(rank.id, rank.source);
            });
        }
    });
}

// 加载排行榜歌曲
async function loadRankSongs(rankId: string, source: string) {
    const songsContainer = document.getElementById('rankSongs');
    if (!songsContainer) return;

    try {
        songsContainer.innerHTML = '<div class="loading">加载中...</div>';

        // 老王优化：直接使用标准API加载排行榜
        const result = await parsePlaylistAPI(rankId, source);
        const songs = result.songs;
        const rankName = result.name || '排行榜';

        currentRankSongs = songs;

        if (currentRankSongs.length === 0) {
            songsContainer.innerHTML = '<div class="no-data">暂无数据</div>';
            return;
        }

        // 显示歌曲列表
        songsContainer.innerHTML = `
            <div class="rank-songs-header">
                <h4>${rankName}</h4>
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