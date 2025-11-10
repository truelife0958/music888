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

// 导航状态
interface PlaylistNavState {
    category: string; // 'rank' | 'hot' | 'user'
    genre?: string;
    order?: 'hot' | 'new';
    stage: 'category' | 'subcategory' | 'list' | 'detail';
    playlistId?: string;
    playlistName?: string;
}

let currentState: PlaylistNavState = {
    category: '',
    stage: 'category'
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
    loadPlaylistsByGenre();
}

/**
 * 处理歌单卡片点击
 */
function handlePlaylistCardClick(e: Event): void {
    const playlistId = (e.currentTarget as HTMLElement).dataset.playlistId;
    if (playlistId) {
        loadPlaylistDetail(playlistId);
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

// 初始化歌单模块
export function initPlaylist() {
    console.log('📀 初始化歌单模块...');
    showCategorySelection();
    console.log('✅ 歌单模块初始化完成');
}

// 第1层：显示大分类选择
function showCategorySelection() {
    const container = document.getElementById('playlistContainer');
    if (!container) return;

    // 老王修复BUG：渲染前清理旧监听器
    clearCurrentListeners();

    currentState.stage = 'category';

    container.innerHTML = `
        <div class="nav-stage-container">
            <div class="nav-stage-header">
                <h3><i class="fas fa-list-music"></i> 选择歌单类型</h3>
            </div>
            <div class="nav-buttons-grid category-grid">
                ${PLAYLIST_CATEGORIES.map(cat => `
                    <button class="nav-button nav-button-large" data-category="${cat.id}" style="border-color: ${cat.color};">
                        <span class="nav-button-icon" style="font-size: 3em;">${cat.icon}</span>
                        <span class="nav-button-label" style="font-size: 1.2em;">${cat.label}</span>
                    </button>
                `).join('')}
            </div>
        </div>
    `;

    // 老王修复BUG：使用registerEventListener替换addEventListener
    container.querySelectorAll('.nav-button').forEach(btn => {
        registerEventListener(btn, 'click', handleCategoryButtonClick);
    });
}

// 第2层-排行榜：显示排行榜列表
function showRankList() {
    const container = document.getElementById('playlistContainer');
    if (!container) return;

    // 老王修复BUG：渲染前清理旧监听器
    clearCurrentListeners();

    currentState.stage = 'list';

    container.innerHTML = `
        <div class="nav-stage-container">
            <div class="nav-stage-header">
                <button class="back-btn" id="backToCategory">
                    <i class="fas fa-arrow-left"></i> 返回
                </button>
                <h3><i class="fas fa-trophy"></i> 排行榜列表</h3>
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
        </div>
    `;

    // 老王修复BUG：返回按钮使用命名函数
    const backBtn = document.getElementById('backToCategory');
    if (backBtn) {
        registerEventListener(backBtn, 'click', showCategorySelection);
    }

    // 老王修复BUG：排行榜卡片使用命名函数
    container.querySelectorAll('.rank-selection-card').forEach(card => {
        registerEventListener(card, 'click', handleRankCardClick);
    });
}

// 第2层-歌单：显示风格选择
function showGenreSelection() {
    const container = document.getElementById('playlistContainer');
    if (!container) return;

    // 老王修复BUG：渲染前清理旧监听器
    clearCurrentListeners();

    currentState.stage = 'subcategory';
    const selectedCategory = PLAYLIST_CATEGORIES.find(c => c.id === currentState.category);

    container.innerHTML = `
        <div class="nav-stage-container">
            <div class="nav-stage-header">
                <button class="back-btn" id="backToCategory">
                    <i class="fas fa-arrow-left"></i> 返回
                </button>
                <h3><i class="fas fa-music"></i> 选择风格 <span class="breadcrumb-hint">${selectedCategory?.label}</span></h3>
            </div>
            <div class="nav-buttons-grid">
                ${PLAYLIST_GENRES.map(genre => `
                    <button class="nav-button" data-genre="${genre.value}">
                        <span class="nav-button-icon">${genre.icon}</span>
                        <span class="nav-button-label">${genre.label}</span>
                    </button>
                `).join('')}
            </div>
        </div>
    `;

    // 老王修复BUG：返回按钮使用命名函数
    const backBtn = document.getElementById('backToCategory');
    if (backBtn) {
        registerEventListener(backBtn, 'click', showCategorySelection);
    }

    // 老王修复BUG：风格按钮使用命名函数
    container.querySelectorAll('.nav-button').forEach(btn => {
        registerEventListener(btn, 'click', handleGenreButtonClick);
    });
}

// 第3层：加载歌单列表
async function loadPlaylistsByGenre() {
    const container = document.getElementById('playlistContainer');
    if (!container) return;

    // 老王修复BUG：渲染前清理旧监听器
    clearCurrentListeners();

    currentState.stage = 'list';
    const selectedCategory = PLAYLIST_CATEGORIES.find(c => c.id === currentState.category);
    const selectedGenre = PLAYLIST_GENRES.find(g => g.value === currentState.genre);

    try {
        container.innerHTML = '<div class="loading"><i class="fas fa-spinner"></i><div>正在加载歌单...</div></div>';

        // 根据分类使用不同的偏移量
        const offset = currentState.category === 'user' ? 10 : 0;

        const result = await getHotPlaylists(
            currentState.order || 'hot',
            currentState.genre || '全部',
            20,
            offset
        );

        if (!result || !result.playlists || result.playlists.length === 0) {
            container.innerHTML = `
                <div class="error">
                    <button class="back-btn" id="backToGenre">
                        <i class="fas fa-arrow-left"></i> 返回
                    </button>
                    <i class="fas fa-info-circle"></i>
                    <div>暂无歌单数据</div>
                </div>
            `;
            // 老王修复BUG：使用registerEventListener
            const backBtn = document.getElementById('backToGenre');
            if (backBtn) {
                registerEventListener(backBtn, 'click', showGenreSelection);
            }
            return;
        }

        displayPlaylistGrid(result.playlists, selectedCategory?.label, selectedGenre?.label);

    } catch (error) {
        console.error('加载歌单失败:', error);
        container.innerHTML = `
            <div class="error">
                <button class="back-btn" id="backToGenre">
                    <i class="fas fa-arrow-left"></i> 返回
                </button>
                <i class="fas fa-exclamation-triangle"></i>
                <div>加载失败，请重试</div>
            </div>
        `;
        // 老王修复BUG：使用registerEventListener
        const backBtn = document.getElementById('backToGenre');
        if (backBtn) {
            registerEventListener(backBtn, 'click', showGenreSelection);
        }
        showNotification('加载歌单失败', 'error');
    }
}

// 显示歌单网格
function displayPlaylistGrid(playlists: any[], categoryName?: string, genreName?: string) {
    const container = document.getElementById('playlistContainer');
    if (!container) return;

    const playlistCards = playlists.map(playlist => `
        <div class="playlist-card" data-playlist-id="${playlist.id}">
            <div class="playlist-cover">
                <img src="${playlist.coverImgUrl || '/images/default-playlist.png'}"
                     alt="${escapeHtml(playlist.name)}"
                     loading="lazy"
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU5LDAuMSkiIHJ4PSIxMiIvPgo8cGF0aCBkPSJNMTAwIDYwTDE0MCAxMDBIMTIwVjE0MEg4MFYxMDBINjBMMTAwIDYwWiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjMpIi8+Cjwvc3ZnPgo='">
                <div class="playlist-play-count">
                    <i class="fas fa-play"></i>
                    ${formatPlayCount(playlist.playCount)}
                </div>
            </div>
            <div class="playlist-info">
                <div class="playlist-name">${escapeHtml(playlist.name)}</div>
                <div class="playlist-creator">by ${escapeHtml(playlist.creator?.nickname || '未知')}</div>
            </div>
        </div>
    `).join('');

    container.innerHTML = `
        <div class="nav-stage-container">
            <div class="nav-stage-header">
                <button class="back-btn" id="backToGenre">
                    <i class="fas fa-arrow-left"></i> 返回
                </button>
                <h3><i class="fas fa-compact-disc"></i> 歌单列表 <span class="breadcrumb-hint">${categoryName} / ${genreName}</span></h3>
                <p class="result-count">共 ${playlists.length} 个歌单</p>
            </div>
            <div class="playlist-grid">
                ${playlistCards}
            </div>
        </div>
    `;

    // 老王修复BUG：返回按钮使用registerEventListener
    const backBtn = document.getElementById('backToGenre');
    if (backBtn) {
        registerEventListener(backBtn, 'click', showGenreSelection);
    }

    // 老王修复BUG：歌单卡片使用命名函数
    container.querySelectorAll('.playlist-card').forEach(card => {
        registerEventListener(card, 'click', handlePlaylistCardClick);
    });
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
async function loadPlaylistDetail(playlistId: string) {
    const container = document.getElementById('playlistContainer');
    if (!container) return;

    // 老王修复BUG：渲染前清理旧监听器
    clearCurrentListeners();

    currentState.stage = 'detail';
    currentState.playlistId = playlistId;

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
            // 老王修复BUG：使用registerEventListener
            const backBtn = document.getElementById('backToList');
            if (backBtn) {
                registerEventListener(backBtn, 'click', loadPlaylistsByGenre);
            }
            return;
        }

        container.innerHTML = `
            <div class="playlist-detail-header">
                <button class="back-btn" id="playlistBackBtn">
                    <i class="fas fa-arrow-left"></i> 返回
                </button>
                <div class="playlist-detail-info">
                    <h3>${escapeHtml(result.name || '未知歌单')}</h3>
                    <p>共 ${result.count} 首歌曲</p>
                </div>
            </div>
            <div class="playlist-songs-container" id="playlistSongsContainer"></div>
        `;

        // 老王修复BUG：返回按钮使用registerEventListener
        const backBtn = document.getElementById('playlistBackBtn');
        if (backBtn) {
            registerEventListener(backBtn, 'click', loadPlaylistsByGenre);
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
        // 老王修复BUG：使用registerEventListener
        const backBtn = document.getElementById('backToList');
        if (backBtn) {
            registerEventListener(backBtn, 'click', loadPlaylistsByGenre);
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
