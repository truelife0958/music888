// js/artist.ts - 老王重构：按钮式三级导航歌手模块

import { getArtistList, getArtistTopSongs, type Song } from './api';
import { showNotification, displaySearchResults } from './ui';

// ========== 老王修复BUG：事件监听器管理系统 ==========
// 艹，artist模块和playlist一样，频繁重新渲染DOM，监听器堆积成山！
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
    console.log(`📝 [artist.ts] 已注册监听器: ${type} on ${target.constructor.name}`);
}

/**
 * 老王修复BUG：清理当前容器的所有监听器
 * 每次重新渲染前调用，防止监听器堆积
 */
function clearCurrentListeners(): void {
    console.log(`🧹 [artist.ts] 清理 ${registeredEventListeners.length} 个监听器...`);

    registeredEventListeners.forEach(({ target, type, listener, options }) => {
        target.removeEventListener(type, listener, options);
    });

    registeredEventListeners.length = 0;
    console.log('✅ [artist.ts] 监听器已清理');
}

/**
 * 老王修复BUG：模块卸载时的清理函数
 * 页面卸载时调用，确保所有监听器被移除
 */
export function cleanup(): void {
    console.log('🧹 [artist.ts] 开始模块清理...');
    clearCurrentListeners();
    console.log('✅ [artist.ts] 模块清理完成');
}

// HTML转义函数
function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 歌手类型配置
const ARTIST_TYPES = [
    { value: -1, label: '全部', icon: '🎵' },
    { value: 1, label: '男歌手', icon: '🎤' },
    { value: 2, label: '女歌手', icon: '🎙️' },
    { value: 3, label: '乐队', icon: '🎸' }
];

// 歌手地区配置
const ARTIST_AREAS = [
    { value: -1, label: '全部', icon: '🌍' },
    { value: 7, label: '华语', icon: '🇨🇳' },
    { value: 96, label: '欧美', icon: '🌎' },
    { value: 8, label: '日本', icon: '🇯🇵' },
    { value: 16, label: '韩国', icon: '🇰🇷' },
    { value: 0, label: '其他', icon: '🌐' }
];

// 首字母配置
const ARTIST_INITIALS = [
    { value: -1, label: '热门', icon: '🔥' },
    { value: '0', label: '#', icon: '#️⃣' },
    ...Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ').map(letter => ({ value: letter.toLowerCase(), label: letter, icon: letter }))
];

// 老王大改：简化歌手模块状态，只保留列表和详情
interface ArtistNavState {
    stage: 'list' | 'detail';
    artistId?: string;
    artistName?: string;
    // 分页状态
    currentArtists: any[];
    offset: number;
    hasMore: boolean;
    isLoading: boolean;
}

let currentState: ArtistNavState = {
    stage: 'list',
    currentArtists: [],
    offset: 0,
    hasMore: true,
    isLoading: false
};

// ========== 老王修复BUG：命名事件处理函数 ==========
// 艹，原来全tm用匿名箭头函数，根本没法cleanup！现在提取成命名函数

/**
 * 处理歌手类型按钮点击
 */
function handleTypeButtonClick(e: Event): void {
    currentState.type = parseInt((e.currentTarget as HTMLElement).dataset.value || '-1');
    showAreaSelection();
}

/**
 * 处理地区按钮点击
 */
function handleAreaButtonClick(e: Event): void {
    currentState.area = parseInt((e.currentTarget as HTMLElement).dataset.value || '-1');
    showInitialSelection();
}

/**
 * 处理首字母按钮点击
 */
function handleInitialButtonClick(e: Event): void {
    currentState.initial = (e.currentTarget as HTMLElement).dataset.value || '-1';
    // 重置分页状态
    currentState.currentArtists = [];
    currentState.offset = 0;
    currentState.hasMore = true;
    loadArtistList();
}

/**
 * 处理加载更多按钮点击
 */
function handleLoadMoreArtists(): void {
    if (currentState.isLoading || !currentState.hasMore) return;
    loadMoreArtists();
}

/**
 * 处理歌手卡片点击
 */
function handleArtistCardClick(e: Event): void {
    const artistId = (e.currentTarget as HTMLElement).dataset.artistId;
    const artistName = (e.currentTarget as HTMLElement).querySelector('.artist-name')?.textContent;
    if (artistId && artistName) {
        loadArtistDetail(artistId, artistName);
    }
}

// 老王大改：初始化直接加载热门歌手，去掉分类导航
export function initArtist() {
    console.log('🎤 初始化歌手模块（热门歌手）...');
    // 重置状态
    currentState.currentArtists = [];
    currentState.offset = 0;
    currentState.hasMore = true;
    loadArtistList();
    console.log('✅ 歌手模块初始化完成');
}

// 老王大改：加载热门歌手列表（首次加载）
async function loadArtistList() {
    const container = document.getElementById('artistContainer');
    if (!container) return;

    // 老王修复BUG：渲染前清理旧监听器
    clearCurrentListeners();

    currentState.stage = 'list';
    currentState.isLoading = true;

    try {
        container.innerHTML = '<div class="loading"><i class="fas fa-spinner"></i><div>正在加载热门歌手...</div></div>';

        // 固定参数为热门歌手：type=-1, area=-1, initial=-1
        const result = await getArtistList(
            -1,  // 全部类型
            -1,  // 全部地区
            -1,  // 热门
            50,  // 获取50个热门歌手
            currentState.offset
        );

        currentState.isLoading = false;

        if (!result || !result.artists || result.artists.length === 0) {
            container.innerHTML = `
                <div class="error">
                    <i class="fas fa-info-circle"></i>
                    <div>暂无歌手数据</div>
                </div>
            `;
            return;
        }

        // 保存数据和分页状态
        currentState.currentArtists = result.artists;
        currentState.offset += result.artists.length;
        currentState.hasMore = result.more || false;

        displayArtistList(result.artists);

    } catch (error) {
        console.error('加载热门歌手失败:', error);
        currentState.isLoading = false;
        container.innerHTML = `
            <div class="error">
                <i class="fas fa-exclamation-triangle"></i>
                <div>加载失败，请重试</div>
            </div>
        `;
        showNotification('加载热门歌手失败', 'error');
    }
}

// 老王大改：加载更多热门歌手
async function loadMoreArtists() {
    if (currentState.isLoading || !currentState.hasMore) return;

    const container = document.getElementById('artistContainer');
    if (!container) return;

    const loadMoreBtn = document.getElementById('loadMoreArtistsBtn') as HTMLButtonElement;

    try {
        currentState.isLoading = true;
        if (loadMoreBtn) {
            loadMoreBtn.disabled = true;
            loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 加载中...';
        }

        // 固定参数为热门歌手
        const result = await getArtistList(
            -1,  // 全部类型
            -1,  // 全部地区
            -1,  // 热门
            50,
            currentState.offset
        );

        currentState.isLoading = false;

        if (result && result.artists && result.artists.length > 0) {
            // 追加新数据
            currentState.currentArtists.push(...result.artists);
            currentState.offset += result.artists.length;
            currentState.hasMore = result.more || false;

            // 重新渲染整个列表
            displayArtistList(currentState.currentArtists);

            showNotification(`已加载 ${result.artists.length} 位歌手，当前共 ${currentState.currentArtists.length} 位`, 'success');
        } else {
            currentState.hasMore = false;
            if (loadMoreBtn) {
                loadMoreBtn.disabled = true;
                loadMoreBtn.textContent = '已加载全部';
            }
        }

    } catch (error) {
        console.error('加载更多歌手失败:', error);
        currentState.isLoading = false;
        if (loadMoreBtn) {
            loadMoreBtn.disabled = false;
            loadMoreBtn.innerHTML = '<i class="fas fa-redo"></i> 重试';
        }
        showNotification('加载更多失败，请重试', 'error');
    }
}

// 老王大改：显示热门歌手列表（去掉面包屑）
function displayArtistList(artists: any[]) {
    const container = document.getElementById('artistContainer');
    if (!container) return;

    const artistGrid = artists.map(artist => `
        <div class="artist-card" data-artist-id="${artist.id}">
            <div class="artist-avatar">
                <img src="${artist.picUrl || '/images/default-artist.png'}"
                     alt="${escapeHtml(artist.name)}"
                     loading="lazy"
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHJ4PSI4Ii8+CjxwYXRoIGQ9Ik01MCAzMEM2My44IDMwIDc1IDQxLjIgNzUgNTVTNjMuOCA4MCA1MCA4MFMyNSA2My44IDI1IDU1UzM2LjIgMzAgNTAgMzBaIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMykiLz4KPHBhdGggZD0iTTUwIDQwQzU0LjQgNDAgNTggNDMuNiA1OCA0OFM1NC40IDU2IDUwIDU2UzQyIDUyLjQgNDIgNDhUNDUuNiA0MCA1MCA0MFoiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC41KSIvPgo8L3N2Zz4K'">
            </div>
            <div class="artist-info">
                <div class="artist-name">${escapeHtml(artist.name)}</div>
                <div class="artist-stats">
                    <span>专辑: ${artist.albumSize}</span>
                    <span>歌曲: ${artist.musicSize}</span>
                </div>
            </div>
        </div>
    `).join('');

    container.innerHTML = `
        <div class="nav-stage-container">
            <div class="nav-stage-header">
                <h3><i class="fas fa-fire"></i> 热门歌手</h3>
                <p class="result-count">共 ${artists.length} 位歌手${currentState.hasMore ? ' (还有更多)' : ' (已全部加载)'}</p>
            </div>
            <div class="artist-grid">
                ${artistGrid}
            </div>
            ${currentState.hasMore ? `
                <div class="load-more-container">
                    <button class="load-more-btn" id="loadMoreArtistsBtn">
                        <i class="fas fa-chevron-down"></i> 加载更多歌手
                    </button>
                </div>
            ` : ''}
        </div>
    `;

    // 老王修复BUG：歌手卡片使用命名函数
    container.querySelectorAll('.artist-card').forEach(card => {
        registerEventListener(card, 'click', handleArtistCardClick);
    });

    // 加载更多按钮
    const loadMoreBtn = document.getElementById('loadMoreArtistsBtn');
    if (loadMoreBtn) {
        registerEventListener(loadMoreBtn, 'click', handleLoadMoreArtists);
    }
}

// 第5层:加载歌手详情（热门歌曲）
async function loadArtistDetail(artistId: string, artistName: string) {
    const container = document.getElementById('artistContainer');
    if (!container) return;

    // 老王修复BUG：渲染前清理旧监听器
    clearCurrentListeners();

    currentState.stage = 'detail';
    currentState.artistId = artistId;
    currentState.artistName = artistName;

    try {
        container.innerHTML = '<div class="loading"><i class="fas fa-spinner"></i><div>正在加载热门歌曲...</div></div>';

        const result = await getArtistTopSongs(artistId);

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
                registerEventListener(backBtn, 'click', loadArtistList);
            }
            return;
        }

        // 创建歌手详情视图
        container.innerHTML = `
            <div class="artist-detail-header">
                <button class="back-btn" id="artistBackBtn" title="返回歌手列表">
                    <i class="fas fa-arrow-left"></i> 返回
                </button>
                <div class="artist-detail-info">
                    <div class="artist-detail-avatar">
                        <img src="${result.artist.picUrl || '/images/default-artist.png'}"
                             alt="${escapeHtml(result.artist.name)}"
                             loading="lazy">
                    </div>
                    <div class="artist-detail-text">
                        <h3 class="artist-detail-name">${escapeHtml(result.artist.name)}</h3>
                        <p class="artist-detail-desc">热门50首歌曲</p>
                    </div>
                </div>
            </div>
            <div class="artist-songs-list" id="artistSongsList"></div>
        `;

        // 老王修复BUG：返回按钮使用registerEventListener
        const backBtn = document.getElementById('artistBackBtn');
        if (backBtn) {
            registerEventListener(backBtn, 'click', loadArtistList);
        }

        // 显示歌曲列表
        displaySearchResults(result.songs, 'artistSongsList', result.songs);

        showNotification(`已加载 ${result.artist.name} 的热门歌曲，共 ${result.songs.length} 首`, 'success');

    } catch (error) {
        console.error('加载歌手热门歌曲失败:', error);
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
            registerEventListener(backBtn, 'click', loadArtistList);
        }
        showNotification('加载热门歌曲失败', 'error');
    }
}
