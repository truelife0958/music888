// js/rank.ts - 音乐排行榜功能

import { parsePlaylistAPI, type Song } from './api';
import { playSong } from './player';
import { showNotification, displaySearchResults, showLoading, showError } from './ui';

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
        // 显示加载状态
        songsContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner"></i><div>正在加载...</div></div>';

        // 直接使用标准API加载排行榜
        const result = await parsePlaylistAPI(rankId, source);
        const songs = result.songs;
        const rankName = result.name || '排行榜';

        currentRankSongs = songs;

        if (currentRankSongs.length === 0) {
            songsContainer.innerHTML = '<div class="error"><i class="fas fa-exclamation-triangle"></i><div>暂无数据</div></div>';
            return;
        }

        // 清空容器并添加标题
        songsContainer.innerHTML = `
            <div class="rank-songs-header">
                <h4>${rankName}</h4>
            </div>
        `;

        // 创建列表容器并添加到主容器
        const listContainer = document.createElement('div');
        listContainer.id = 'rankSongsList';
        songsContainer.appendChild(listContainer);

        // 使用displaySearchResults显示歌曲列表（自动包含批量操作功能）
        displaySearchResults(currentRankSongs, 'rankSongsList', currentRankSongs);

        showNotification(`已加载 ${rankName}，共 ${songs.length} 首歌曲`, 'success');

    } catch (error) {
        console.error('加载排行榜失败:', error);
        songsContainer.innerHTML = '<div class="error"><i class="fas fa-exclamation-triangle"></i><div>加载失败，请重试</div></div>';
        showNotification('加载排行榜失败', 'error');
    }
}

// 获取当前排行榜歌曲
export function getCurrentRankSongs(): Song[] {
    return currentRankSongs;
}