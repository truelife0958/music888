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

// 导航状态
interface ArtistNavState {
    type: number;
    area: number;
    initial: string | number;
    stage: 'type' | 'area' | 'initial' | 'list' | 'detail';
    artistId?: string;
    artistName?: string;
}

let currentState: ArtistNavState = {
    type: -1,
    area: -1,
    initial: -1,
    stage: 'type'
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
    loadArtistList();
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

// 初始化歌手模块
export function initArtist() {
    console.log('🎤 初始化歌手模块...');
    showTypeSelection();
    console.log('✅ 歌手模块初始化完成');
}

// 第1层：显示类型选择
function showTypeSelection() {
    const container = document.getElementById('artistContainer');
    if (!container) return;

    // 老王修复BUG：渲染前清理旧监听器
    clearCurrentListeners();

    currentState.stage = 'type';

    container.innerHTML = `
        <div class="nav-stage-container">
            <div class="nav-stage-header">
                <h3><i class="fas fa-user-music"></i> 选择歌手类型</h3>
            </div>
            <div class="nav-buttons-grid">
                ${ARTIST_TYPES.map(type => `
                    <button class="nav-button" data-value="${type.value}">
                        <span class="nav-button-icon">${type.icon}</span>
                        <span class="nav-button-label">${type.label}</span>
                    </button>
                `).join('')}
            </div>
        </div>
    `;

    // 老王修复BUG：使用registerEventListener替换addEventListener
    container.querySelectorAll('.nav-button').forEach(btn => {
        registerEventListener(btn, 'click', handleTypeButtonClick);
    });
}

// 第2层：显示地区选择
function showAreaSelection() {
    const container = document.getElementById('artistContainer');
    if (!container) return;

    // 老王修复BUG：渲染前清理旧监听器
    clearCurrentListeners();

    currentState.stage = 'area';
    const selectedType = ARTIST_TYPES.find(t => t.value === currentState.type);

    container.innerHTML = `
        <div class="nav-stage-container">
            <div class="nav-stage-header">
                <button class="back-btn" id="backToType">
                    <i class="fas fa-arrow-left"></i> 返回
                </button>
                <h3><i class="fas fa-globe-asia"></i> 选择地区 <span class="breadcrumb-hint">${selectedType?.label}</span></h3>
            </div>
            <div class="nav-buttons-grid">
                ${ARTIST_AREAS.map(area => `
                    <button class="nav-button" data-value="${area.value}">
                        <span class="nav-button-icon">${area.icon}</span>
                        <span class="nav-button-label">${area.label}</span>
                    </button>
                `).join('')}
            </div>
        </div>
    `;

    // 老王修复BUG：返回按钮使用registerEventListener
    const backBtn = document.getElementById('backToType');
    if (backBtn) {
        registerEventListener(backBtn, 'click', showTypeSelection);
    }

    // 老王修复BUG：地区按钮使用命名函数
    container.querySelectorAll('.nav-button').forEach(btn => {
        registerEventListener(btn, 'click', handleAreaButtonClick);
    });
}

// 第3层：显示首字母选择
function showInitialSelection() {
    const container = document.getElementById('artistContainer');
    if (!container) return;

    // 老王修复BUG：渲染前清理旧监听器
    clearCurrentListeners();

    currentState.stage = 'initial';
    const selectedType = ARTIST_TYPES.find(t => t.value === currentState.type);
    const selectedArea = ARTIST_AREAS.find(a => a.value === currentState.area);

    container.innerHTML = `
        <div class="nav-stage-container">
            <div class="nav-stage-header">
                <button class="back-btn" id="backToArea">
                    <i class="fas fa-arrow-left"></i> 返回
                </button>
                <h3><i class="fas fa-font"></i> 选择首字母 <span class="breadcrumb-hint">${selectedType?.label} / ${selectedArea?.label}</span></h3>
            </div>
            <div class="nav-buttons-grid alphabet-grid">
                ${ARTIST_INITIALS.map(initial => `
                    <button class="nav-button nav-button-small" data-value="${initial.value}">
                        <span class="nav-button-label">${initial.label}</span>
                    </button>
                `).join('')}
            </div>
        </div>
    `;

    // 老王修复BUG：返回按钮使用registerEventListener
    const backBtn = document.getElementById('backToArea');
    if (backBtn) {
        registerEventListener(backBtn, 'click', showAreaSelection);
    }

    // 老王修复BUG：首字母按钮使用命名函数
    container.querySelectorAll('.nav-button').forEach(btn => {
        registerEventListener(btn, 'click', handleInitialButtonClick);
    });
}

// 第4层：加载并显示歌手列表
async function loadArtistList() {
    const container = document.getElementById('artistContainer');
    if (!container) return;

    // 老王修复BUG：渲染前清理旧监听器
    clearCurrentListeners();

    currentState.stage = 'list';
    const selectedType = ARTIST_TYPES.find(t => t.value === currentState.type);
    const selectedArea = ARTIST_AREAS.find(a => a.value === currentState.area);
    const selectedInitial = ARTIST_INITIALS.find(i => String(i.value) === String(currentState.initial));

    try {
        container.innerHTML = '<div class="loading"><i class="fas fa-spinner"></i><div>正在加载歌手列表...</div></div>';

        const result = await getArtistList(
            currentState.type,
            currentState.area,
            currentState.initial,
            50,
            0
        );

        if (!result || !result.artists || result.artists.length === 0) {
            container.innerHTML = `
                <div class="error">
                    <button class="back-btn" id="backToInitial">
                        <i class="fas fa-arrow-left"></i> 返回
                    </button>
                    <i class="fas fa-info-circle"></i>
                    <div>暂无歌手数据</div>
                </div>
            `;
            // 老王修复BUG：使用registerEventListener
            const backBtn = document.getElementById('backToInitial');
            if (backBtn) {
                registerEventListener(backBtn, 'click', showInitialSelection);
            }
            return;
        }

        displayArtistList(result.artists, selectedType?.label, selectedArea?.label, selectedInitial?.label);

    } catch (error) {
        console.error('加载歌手列表失败:', error);
        container.innerHTML = `
            <div class="error">
                <button class="back-btn" id="backToInitial">
                    <i class="fas fa-arrow-left"></i> 返回
                </button>
                <i class="fas fa-exclamation-triangle"></i>
                <div>加载失败，请重试</div>
            </div>
        `;
        // 老王修复BUG：使用registerEventListener
        const backBtn = document.getElementById('backToInitial');
        if (backBtn) {
            registerEventListener(backBtn, 'click', showInitialSelection);
        }
        showNotification('加载歌手列表失败', 'error');
    }
}

// 显示歌手列表
function displayArtistList(artists: any[], typeName?: string, areaName?: string, initialName?: string) {
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
                <button class="back-btn" id="backToInitial">
                    <i class="fas fa-arrow-left"></i> 返回
                </button>
                <h3><i class="fas fa-users"></i> 歌手列表 <span class="breadcrumb-hint">${typeName} / ${areaName} / ${initialName}</span></h3>
                <p class="result-count">共 ${artists.length} 位歌手</p>
            </div>
            <div class="artist-grid">
                ${artistGrid}
            </div>
        </div>
    `;

    // 老王修复BUG：返回按钮使用registerEventListener
    const backBtn = document.getElementById('backToInitial');
    if (backBtn) {
        registerEventListener(backBtn, 'click', showInitialSelection);
    }

    // 老王修复BUG：歌手卡片使用命名函数
    container.querySelectorAll('.artist-card').forEach(card => {
        registerEventListener(card, 'click', handleArtistCardClick);
    });
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
