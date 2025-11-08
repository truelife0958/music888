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
let currentRankId: string = '';
let currentRankName: string = '';

// 初始化排行榜
export function initRank() {
    // 初始化排行榜标签页内的内容
    initRankTab();
}

// 初始化排行榜标签页
function initRankTab() {
    // 初始化时显示排行榜选择列表，而不是绑定按钮事件
    showRankList();
}

// 加载排行榜歌曲
async function loadRankSongs(rankId: string, source: string) {
    const songsContainer = document.getElementById('rankSongs');
    if (!songsContainer) return;

    const rankInfo = RANK_LISTS.find(r => r.id === rankId);
    if (!rankInfo) return;

    try {
        // 保存当前排行榜信息
        currentRankId = rankId;
        currentRankName = rankInfo.name;

        // 显示加载状态
        songsContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner"></i><div>正在加载...</div></div>';

        // 直接使用标准API加载排行榜
        const result = await parsePlaylistAPI(rankId, source);
        const songs = result.songs;
        const rankName = result.name || rankInfo.name;

        currentRankSongs = songs;

        if (currentRankSongs.length === 0) {
            songsContainer.innerHTML = '<div class="error"><i class="fas fa-exclamation-triangle"></i><div>暂无数据</div></div>';
            return;
        }

        // 创建详细的排行榜视图，包含返回按钮
        songsContainer.innerHTML = `
            <div class="rank-detail-header">
                <button class="back-btn" id="rankBackBtn" title="返回排行榜列表">
                    <i class="fas fa-arrow-left"></i> 返回
                </button>
                <div class="rank-detail-info">
                    <h3 class="rank-detail-title">
                        <span class="rank-icon">${rankInfo.icon}</span>
                        ${rankName}
                    </h3>
                    <p class="rank-detail-desc">共 ${songs.length} 首歌曲</p>
                </div>
            </div>
            <div class="rank-songs-list" id="rankSongsList"></div>
        `;

        // 绑定返回按钮事件
        const backBtn = document.getElementById('rankBackBtn');
        if (backBtn) {
            backBtn.addEventListener('click', showRankList);
        }

        // 使用displaySearchResults显示歌曲列表（自动包含批量操作功能）
        displaySearchResults(currentRankSongs, 'rankSongsList', currentRankSongs);

        showNotification(`已加载 ${rankName}，共 ${songs.length} 首歌曲`, 'success');

    } catch (error) {
        console.error('加载排行榜失败:', error);
        songsContainer.innerHTML = '<div class="error"><i class="fas fa-exclamation-triangle"></i><div>加载失败，请重试</div></div>';
        showNotification('加载排行榜失败', 'error');
    }
}

// 显示排行榜列表（返回时使用）
function showRankList() {
    const songsContainer = document.getElementById('rankSongs');
    if (!songsContainer) return;

    // 清空当前状态
    currentRankId = '';
    currentRankName = '';
    currentRankSongs = [];

    // 重新显示排行榜选择界面
    songsContainer.innerHTML = `
        <div class="rank-list-header">
            <h3>选择排行榜</h3>
        </div>
        <div class="rank-selection-grid">
            ${RANK_LISTS.map(rank => `
                <div class="rank-selection-card" data-rank-id="${rank.id}">
                    <div class="rank-selection-icon">${rank.icon}</div>
                    <div class="rank-selection-name">${rank.name}</div>
                    <div class="rank-selection-arrow">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    // 重新绑定点击事件
    songsContainer.querySelectorAll('.rank-selection-card').forEach(card => {
        card.addEventListener('click', () => {
            const rankId = (card as HTMLElement).dataset.rankId;
            if (rankId) {
                const rank = RANK_LISTS.find(r => r.id === rankId);
                if (rank) {
                    loadRankSongs(rankId, rank.source);
                }
            }
        });
    });
}

// 获取当前排行榜歌曲
export function getCurrentRankSongs(): Song[] {
    return currentRankSongs;
}