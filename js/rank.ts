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

    // QQ音乐排行榜 - 老王优化：只保留可用的QQ每日推荐
    { id: 'qq_daily_30', name: 'QQ每日推荐', source: 'tencent', icon: '🎁' },
    // 老王注释：QQ音乐其他排行榜暂不可用（API不支持或ID不正确）
    // { id: '3812895', name: 'QQ流行榜', source: 'tencent', icon: '⭐' },
    // { id: '3885842924', name: 'QQ热歌榜', source: 'tencent', icon: '🎵' },

    // 老王注释：酷狗音乐排行榜暂不可用（API不支持或ID不正确）
    // 酷狗音乐排行榜 - 使用正确的歌单ID
    // { id: '8888', name: '酷狗TOP500', source: 'kugou', icon: '🏆' },
    // { id: '6666', name: '酷狗飙升榜', source: 'kugou', icon: '📈' }

    // 老王新增：抖音热歌榜
    { id: 'douyin_hot', name: '抖音热歌榜', source: 'douyin', icon: '🎵' },

    // 老王新增：网易歌榜（新API）
    { id: 'netease_chart_hot', name: '网易热歌榜(新)', source: 'netease_new', icon: '🔥' },
    { id: 'netease_chart_new', name: '网易新歌榜(新)', source: 'netease_new', icon: '🆕' },
    { id: 'netease_chart_rise', name: '网易飙升榜(新)', source: 'netease_new', icon: '🚀' },
    { id: 'netease_chart_original', name: '网易原创榜(新)', source: 'netease_new', icon: '🎨' },

    // 老王新增：网易精选歌单
    { id: 'netease_playlist_7320301584', name: '网易精选歌单', source: 'netease_playlist', icon: '⭐' }
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

        let songs: Song[] = [];
        let rankName = '排行榜';

        // 老王优化：特殊处理QQ音乐每日推荐
        if (rankId === 'qq_daily_30' && source === 'tencent') {
            console.log('📦 加载QQ音乐每日推荐...');
            try {
                const { getQQDaily30 } = await import('./extra-api-adapter.js');
                songs = await getQQDaily30();
                rankName = 'QQ音乐每日推荐';
                console.log(`✅ QQ音乐每日推荐加载成功，共${songs.length}首`);
            } catch (error) {
                console.error('❌ QQ音乐每日推荐加载失败:', error);
                throw new Error('QQ音乐每日推荐暂时不可用');
            }
        }
        // 老王新增：特殊处理抖音热歌榜
        else if (rankId === 'douyin_hot' && source === 'douyin') {
            console.log('📦 加载抖音热歌榜...');
            try {
                const { getDouyinHotSongs } = await import('./extra-api-adapter.js');
                songs = await getDouyinHotSongs();
                rankName = '抖音热歌榜';
                console.log(`✅ 抖音热歌榜加载成功，共${songs.length}首`);
            } catch (error) {
                console.error('❌ 抖音热歌榜加载失败:', error);
                throw new Error('抖音热歌榜暂时不可用');
            }
        }
        // 老王新增：特殊处理网易歌榜（新API）
        else if (rankId.startsWith('netease_chart_') && source === 'netease_new') {
            console.log('📦 加载网易歌榜（新API）...');
            try {
                const { getNetEaseChart } = await import('./extra-api-adapter.js');

                // 根据ID映射到榜单类型
                const chartTypeMap: { [key: string]: string } = {
                    'netease_chart_hot': '热歌榜',
                    'netease_chart_new': '新歌榜',
                    'netease_chart_rise': '飙升榜',
                    'netease_chart_original': '原创榜'
                };

                const chartType = chartTypeMap[rankId] || '热歌榜';
                songs = await getNetEaseChart(chartType);
                rankName = `网易${chartType}`;
                console.log(`✅ 网易${chartType}加载成功，共${songs.length}首`);
            } catch (error) {
                console.error('❌ 网易歌榜加载失败:', error);
                throw new Error('网易歌榜暂时不可用');
            }
        }
        // 老王新增：特殊处理网易歌单
        else if (rankId.startsWith('netease_playlist_') && source === 'netease_playlist') {
            console.log('📦 加载网易精选歌单...');
            try {
                const { getNetEaseUserPlaylist } = await import('./extra-api-adapter.js');

                // 从rankId中提取uid
                const uid = rankId.replace('netease_playlist_', '');
                songs = await getNetEaseUserPlaylist(uid, 30);  // 获取30首歌曲
                rankName = '网易精选歌单';
                console.log(`✅ 网易精选歌单加载成功，共${songs.length}首`);
            } catch (error) {
                console.error('❌ 网易歌单加载失败:', error);
                throw new Error('网易歌单暂时不可用');
            }
        }
        else {
            // 使用标准API加载排行榜
            const result = await parsePlaylistAPI(rankId, source);
            songs = result.songs;
            rankName = result.name || '排行榜';
        }

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