// js/playlist.ts - 老王重构：按钮式导航歌单模块（整合排行榜）

import { parsePlaylistAPI, getHotPlaylists, type Song, fetchWithRetry, detectApiFormat, API_BASE } from './api';
import { showNotification, displaySearchResults } from './ui';

// ========== 老王修复BUG：事件监听器管理系统 ==========
// 艹，playlist模块会频繁重新渲染DOM，每次都添加新监听器但不清理旧的！
interface EventListenerEntry {
    target: EventTarget;
    type: string;
    listener: EventListener;
    options?: AddEventListenerOptions | boolean;
}

const registeredEventListeners: EventListenerEntry[] = [];

/**
 * 老王修复BUG：注册事件监听器
 * 自动跟踪所有监听器，方便cleanup时统一移除
 */
function registerEventListener(
    target: EventTarget,
    type: string,
    listener: EventListener,
    options?: AddEventListenerOptions | boolean
): void {
    target.addEventListener(type, listener, options);
    registeredEventListeners.push({ target, type, listener, options });
    console.log(`📝 [playlist.ts] 已注册监听器: ${type} on ${target.constructor.name}`);
}

/**
 * 老王修复BUG：清理当前容器的所有监听器
 * 每次重新渲染前调用，防止监听器堆积
 */
function clearCurrentListeners(): void {
    console.log(`🧹 [playlist.ts] 清理 ${registeredEventListeners.length} 个监听器...`);

    registeredEventListeners.forEach(({ target, type, listener, options }) => {
        target.removeEventListener(type, listener, options);
    });

    registeredEventListeners.length = 0;
    console.log('✅ [playlist.ts] 监听器已清理');
}

/**
 * 老王修复BUG：模块卸载时的清理函数
 * 页面卸载时调用，确保所有监听器被移除
 */
export function cleanup(): void {
    console.log('🧹 [playlist.ts] 开始模块清理...');
    clearCurrentListeners();
    console.log('✅ [playlist.ts] 模块清理完成');
}

// HTML转义函数
function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 大分类配置
const PLAYLIST_CATEGORIES = [
    { id: 'rank', label: '排行榜', icon: '🏆', color: '#ff6b6b' },
    { id: 'hot', label: '热门歌单', icon: '🔥', color: '#4ecdc4' },
    { id: 'user', label: '网友精选碟', icon: '⭐', color: '#95e1d3' }
];

// 排行榜配置
const RANK_LISTS = [
    { id: '3778678', name: '飙升榜', source: 'netease', icon: '🚀' },
    { id: '3779629', name: '新歌榜', source: 'netease', icon: '🆕' },
    { id: '19723756', name: '热歌榜', source: 'netease', icon: '🔥' },
    { id: '2884035', name: '说唱榜', source: 'netease', icon: '🎤' }
];

// 歌单分类配置
const PLAYLIST_GENRES = [
    { value: '全部', label: '全部', icon: '🎵' },
    { value: '华语', label: '华语', icon: '🇨🇳' },
    { value: '流行', label: '流行', icon: '🎤' },
    { value: '古风', label: '古风', icon: '🏮' },
    { value: '欧美', label: '欧美', icon: '🌎' },
    { value: '摇滚', label: '摇滚', icon: '🎸' },
    { value: '民谣', label: '民谣', icon: '🎻' },
    { value: '电子', label: '电子', icon: '🎹' },
    { value: '说唱', label: '说唱', icon: '🎙️' },
    { value: '轻音乐', label: '轻音乐', icon: '🎼' },
    { value: '影视原声', label: '影视原声', icon: '🎬' },
    { value: 'ACG', label: 'ACG', icon: '🎮' },
    { value: '怀旧', label: '怀旧', icon: '📻' }
];

// 老王大改：简化歌单模块状态，只保留列表和详情
interface PlaylistNavState {
    stage: 'list' | 'detail';
    playlistId?: string;
    playlistName?: string;
    // 分页状态
    currentPlaylists: any[];
    offset: number;
    hasMore: boolean;
    isLoading: boolean;
}

let currentState: PlaylistNavState = {
    stage: 'list',
    currentPlaylists: [],
    offset: 0,
    hasMore: true,
    isLoading: false
};

// ========== 老王修复BUG：命名事件处理函数 ==========
// 艹，原来全tm用匿名箭头函数，根本没法cleanup！现在提取成命名函数

/**
 * 处理大分类按钮点击
 */
function handleCategoryButtonClick(e: Event): void {
    const category = (e.currentTarget as HTMLElement).dataset.category || '';
    currentState.category = category;

    if (category === 'rank') {
        showRankList();
    } else {
        showGenreSelection();
    }
}

/**
 * 处理排行榜卡片点击
 */
function handleRankCardClick(e: Event): void {
    const rankId = (e.currentTarget as HTMLElement).dataset.rankId;
    if (rankId) {
        const rank = RANK_LISTS.find(r => r.id === rankId);
        if (rank) {
            loadRankSongs(rankId, rank.source, rank.name, rank.icon);
        }
    }
}

/**
 * 处理风格按钮点击
 */
function handleGenreButtonClick(e: Event): void {
    currentState.genre = (e.currentTarget as HTMLElement).dataset.genre || '全部';
    currentState.order = 'hot'; // 默认最热
    // 重置分页状态
    currentState.currentPlaylists = [];
    currentState.offset = 0;
    currentState.hasMore = true;
    loadPlaylistsByGenre();
}

/**
 * 处理加载更多歌单按钮点击
 */
function handleLoadMorePlaylists(): void {
    if (currentState.isLoading || !currentState.hasMore) return;
    loadMorePlaylists();
}

/**
 * 处理歌单卡片点击
 */
function handlePlaylistCardClick(e: Event): void {
    const playlistId = (e.currentTarget as HTMLElement).dataset.playlistId;
    const playlistName = (e.currentTarget as HTMLElement).querySelector('.btn-title')?.textContent || '';
    if (playlistId) {
        loadPlaylistDetail(playlistId, playlistName);
    }
}

/**
 * 处理歌手卡片点击
 */
function handleArtistCardClick(e: Event): void {
    const artistId = (e.currentTarget as HTMLElement).dataset.artistId;
    const artistName = (e.currentTarget as HTMLElement).querySelector('.artist-name')?.textContent;
    if (artistId && artistName) {
        // loadArtistDetail(artistId, artistName); // 如果需要
    }
}

// 老王大改：初始化直接加载热门歌单，去掉分类导航
export function initPlaylist() {
    console.log('📀 初始化歌单模块（热门歌单）...');
    // 重置状态
    currentState.currentPlaylists = [];
    currentState.offset = 0;
    currentState.hasMore = true;
    loadPlaylistsByGenre();
    console.log('✅ 歌单模块初始化完成');
}

// 老王大改：加载热门歌单列表（首次加载）
async function loadPlaylistsByGenre() {
    const container = document.getElementById('playlistContainer');
    if (!container) return;

    // 老王修复BUG：渲染前清理旧监听器
    clearCurrentListeners();

    currentState.stage = 'list';
    currentState.isLoading = true;

    try {
        container.innerHTML = '<div class="loading"><i class="fas fa-spinner"></i><div>正在加载热门歌单...</div></div>';

        // 固定参数为热门歌单：order='hot', cat='全部'
        const result = await getHotPlaylists(
            'hot',  // 最热排序
            '全部',  // 全部分类
            150,    // 获取150个歌单
            currentState.offset
        );

        currentState.isLoading = false;

        if (!result || !result.playlists || result.playlists.length === 0) {
            container.innerHTML = `
                <div class="error">
                    <i class="fas fa-info-circle"></i>
                    <div>暂无歌单数据</div>
                </div>
            `;
            return;
        }

        // 保存数据和分页状态
        currentState.currentPlaylists = result.playlists;
        currentState.offset += result.playlists.length;
        currentState.hasMore = result.more || false;

        displayPlaylistGrid(result.playlists);

    } catch (error) {
        console.error('加载热门歌单失败:', error);
        currentState.isLoading = false;
        container.innerHTML = `
            <div class="error">
                <i class="fas fa-exclamation-triangle"></i>
                <div>加载失败，请重试</div>
            </div>
        `;
        showNotification('加载热门歌单失败', 'error');
    }
}

// 老王大改：加载更多热门歌单
async function loadMorePlaylists() {
    if (currentState.isLoading || !currentState.hasMore) return;

    const container = document.getElementById('playlistContainer');
    if (!container) return;

    const loadMoreBtn = document.getElementById('loadMorePlaylistsBtn') as HTMLButtonElement;

    try {
        currentState.isLoading = true;
        if (loadMoreBtn) {
            loadMoreBtn.disabled = true;
            loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 加载中...';
        }

        // 固定参数为热门歌单：order='hot', cat='全部'
        const result = await getHotPlaylists(
            'hot',  // 最热排序
            '全部',  // 全部分类
            150,
            currentState.offset
        );

        currentState.isLoading = false;

        if (result && result.playlists && result.playlists.length > 0) {
            // 追加新数据
            currentState.currentPlaylists.push(...result.playlists);
            currentState.offset += result.playlists.length;
            currentState.hasMore = result.more || false;

            // 重新渲染整个列表
            displayPlaylistGrid(currentState.currentPlaylists);

            showNotification(`已加载 ${result.playlists.length} 个歌单，当前共 ${currentState.currentPlaylists.length} 个`, 'success');
        } else {
            currentState.hasMore = false;
            if (loadMoreBtn) {
                loadMoreBtn.disabled = true;
                loadMoreBtn.textContent = '已加载全部';
            }
        }

    } catch (error) {
        console.error('加载更多歌单失败:', error);
        currentState.isLoading = false;
        if (loadMoreBtn) {
            loadMoreBtn.disabled = false;
            loadMoreBtn.innerHTML = '<i class="fas fa-redo"></i> 重试';
        }
        showNotification('加载更多失败，请重试', 'error');
    }
}

// 老王大改：显示热门歌单按钮列表
function displayPlaylistGrid(playlists: any[]) {
    const container = document.getElementById('playlistContainer');
    if (!container) return;

    const playlistButtons = playlists.map(playlist => `
        <button class="nav-btn-item" data-playlist-id="${playlist.id}">
            <span class="btn-icon">🎵</span>
            <span class="btn-content">
                <span class="btn-title">${escapeHtml(playlist.name)}</span>
                <span class="btn-subtitle">
                    <i class="fas fa-play"></i> ${formatPlayCount(playlist.playCount)} ·
                    by ${escapeHtml(playlist.creator?.nickname || '未知')}
                </span>
            </span>
            <i class="fas fa-chevron-right btn-arrow"></i>
        </button>
    `).join('');

    container.innerHTML = `
        <div class="nav-stage-container">
            <div class="nav-stage-header">
                <h3><i class="fas fa-fire"></i> 热门歌单</h3>
                <p class="result-count">共 ${playlists.length} 个歌单${currentState.hasMore ? ' (还有更多)' : ' (已全部加载)'}</p>
            </div>
            <div class="nav-buttons-container">
                ${playlistButtons}
            </div>
            ${currentState.hasMore ? `
                <div class="load-more-container">
                    <button class="load-more-btn" id="loadMorePlaylistsBtn">
                        <i class="fas fa-chevron-down"></i> 加载更多歌单
                    </button>
                </div>
            ` : ''}
        </div>
    `;

    // 老王修复BUG：歌单按钮使用命名函数
    container.querySelectorAll('.nav-btn-item').forEach(btn => {
        registerEventListener(btn, 'click', handlePlaylistCardClick);
    });

    // 加载更多按钮
    const loadMoreBtn = document.getElementById('loadMorePlaylistsBtn');
    if (loadMoreBtn) {
        registerEventListener(loadMoreBtn, 'click', handleLoadMorePlaylists);
    }
}

// 老王新增：返回歌单列表（恢复已保存的列表，不重新加载）
function returnToPlaylistList() {
    const container = document.getElementById('playlistContainer');
    if (!container) return;

    // 老王修复BUG：渲染前清理旧监听器
    clearCurrentListeners();

    currentState.stage = 'list';

    // 如果有保存的列表数据，直接显示
    if (currentState.currentPlaylists && currentState.currentPlaylists.length > 0) {
        displayPlaylistGrid(currentState.currentPlaylists);
        console.log(`✅ 恢复歌单列表，共 ${currentState.currentPlaylists.length} 个`);
    } else {
        // 如果没有保存的数据，重新加载
        console.log('⚠️ 没有保存的歌单数据，重新加载...');
        loadPlaylistsByGenre();
    }
}

// 格式化播放次数
function formatPlayCount(count: number): string {
    if (count >= 100000000) {
        return `${Math.floor(count / 100000000)}亿`;
    } else if (count >= 10000) {
        return `${Math.floor(count / 10000)}万`;
    }
    return count.toString();
}

// 第4层：加载歌单详情（歌曲列表）
async function loadPlaylistDetail(playlistId: string, playlistName?: string) {
    const container = document.getElementById('playlistContainer');
    if (!container) return;

    // 老王修复BUG：渲染前清理旧监听器
    clearCurrentListeners();

    currentState.stage = 'detail';
    currentState.playlistId = playlistId;
    currentState.playlistName = playlistName; // 保存点击的歌单名称

    try {
        container.innerHTML = '<div class="loading"><i class="fas fa-spinner"></i><div>正在加载歌单...</div></div>';

        const result = await parsePlaylistAPI(playlistId, 'netease');

        if (!result || !result.songs || result.songs.length === 0) {
            container.innerHTML = `
                <div class="error">
                    <button class="back-btn" id="backToList">
                        <i class="fas fa-arrow-left"></i> 返回
                    </button>
                    <i class="fas fa-exclamation-triangle"></i>
                    <div>暂无歌曲数据</div>
                </div>
            `;
            // 老王修复BUG：使用registerEventListener + 返回到已保存的列表
            const backBtn = document.getElementById('backToList');
            if (backBtn) {
                registerEventListener(backBtn, 'click', returnToPlaylistList);
            }
            return;
        }

        // 老王修复BUG：优先使用保存的歌单名称，确保和按钮显示一致
        const displayName = currentState.playlistName || result.name || '未知歌单';

        container.innerHTML = `
            <div class="playlist-detail-header">
                <button class="back-btn" id="playlistBackBtn">
                    <i class="fas fa-arrow-left"></i> 返回
                </button>
                <div class="playlist-detail-info">
                    <h3>${escapeHtml(displayName)}</h3>
                    <p>共 ${result.count} 首歌曲</p>
                </div>
            </div>
            <div class="playlist-songs-container" id="playlistSongsContainer"></div>
        `;

        // 老王修复BUG：返回按钮使用registerEventListener + 返回到已保存的列表
        const backBtn = document.getElementById('playlistBackBtn');
        if (backBtn) {
            registerEventListener(backBtn, 'click', returnToPlaylistList);
        }

        // 显示歌曲列表
        displaySearchResults(result.songs, 'playlistSongsContainer', result.songs);

        showNotification(`已加载歌单，共 ${result.songs.length} 首歌曲`, 'success');

    } catch (error) {
        console.error('加载歌单失败:', error);
        container.innerHTML = `
            <div class="error">
                <button class="back-btn" id="backToList">
                    <i class="fas fa-arrow-left"></i> 返回
                </button>
                <i class="fas fa-exclamation-triangle"></i>
                <div>加载失败，请重试</div>
            </div>
        `;
        // 老王修复BUG：使用registerEventListener + 返回到已保存的列表
        const backBtn = document.getElementById('backToList');
        if (backBtn) {
            registerEventListener(backBtn, 'click', returnToPlaylistList);
        }
        showNotification('加载歌单失败', 'error');
    }
}

// 加载排行榜歌曲
async function loadRankSongs(rankId: string, source: string, rankName: string, rankIcon: string) {
    const container = document.getElementById('playlistContainer');
    if (!container) return;

    // 老王修复BUG：渲染前清理旧监听器
    clearCurrentListeners();

    currentState.stage = 'detail';

    try {
        container.innerHTML = '<div class="loading"><i class="fas fa-spinner"></i><div>正在加载排行榜...</div></div>';

        let songs: Song[] = [];
        const apiFormat = detectApiFormat(API_BASE);

        // 尝试使用NCM排行榜API
        if (apiFormat.format === 'ncm' || apiFormat.format === 'clawcloud') {
            try {
                const url = `${API_BASE}top/list?id=${rankId}`;
                const response = await fetchWithRetry(url);
                const data = await response.json();

                if (data && data.playlist && data.playlist.tracks) {
                    songs = data.playlist.tracks.slice(0, 50).map((song: any) => ({
                        id: song.id,
                        name: song.name,
                        artist: song.ar?.map((artist: any) => artist.name) || [song.artist?.name || '未知艺术家'],
                        album: song.al?.name || '未知专辑',
                        pic_id: song.al?.picStr || song.pic || '',
                        lyric_id: song.id,
                        source: source,
                        rawData: song
                    }));
                }
            } catch (error) {
                console.warn('NCM排行榜API调用失败，使用歌单API降级:', error);
            }
        }

        // 降级使用歌单API
        if (songs.length === 0) {
            const result = await parsePlaylistAPI(rankId, source);
            if (result && result.songs) {
                songs = result.songs;
            }
        }

        if (songs.length === 0) {
            container.innerHTML = `
                <div class="error">
                    <button class="back-btn" id="backToRankList">
                        <i class="fas fa-arrow-left"></i> 返回
                    </button>
                    <i class="fas fa-exclamation-triangle"></i>
                    <div>暂无数据</div>
                </div>
            `;
            // 老王修复BUG：使用registerEventListener
            const backBtn = document.getElementById('backToRankList');
            if (backBtn) {
                registerEventListener(backBtn, 'click', showRankList);
            }
            return;
        }

        container.innerHTML = `
            <div class="rank-detail-header">
                <button class="back-btn" id="rankBackBtn">
                    <i class="fas fa-arrow-left"></i> 返回
                </button>
                <div class="rank-detail-info">
                    <h3 class="rank-detail-title">
                        <span class="rank-icon">${rankIcon}</span>
                        ${rankName}
                    </h3>
                    <p class="rank-detail-desc">共 ${songs.length} 首歌曲</p>
                </div>
            </div>
            <div class="rank-songs-list" id="rankSongsList"></div>
        `;

        // 老王修复BUG：返回按钮使用registerEventListener
        const backBtn = document.getElementById('rankBackBtn');
        if (backBtn) {
            registerEventListener(backBtn, 'click', showRankList);
        }

        // 显示歌曲列表
        displaySearchResults(songs, 'rankSongsList', songs);

        showNotification(`已加载 ${rankName}，共 ${songs.length} 首歌曲`, 'success');

    } catch (error) {
        console.error('加载排行榜失败:', error);
        container.innerHTML = `
            <div class="error">
                <button class="back-btn" id="backToRankList">
                    <i class="fas fa-arrow-left"></i> 返回
                </button>
                <i class="fas fa-exclamation-triangle"></i>
                <div>加载失败，请重试</div>
            </div>
        `;
        // 老王修复BUG：使用registerEventListener
        const backBtn = document.getElementById('backToRankList');
        if (backBtn) {
            registerEventListener(backBtn, 'click', showRankList);
        }
        showNotification('加载排行榜失败', 'error');
    }
}
