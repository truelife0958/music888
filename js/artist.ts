// js/artist.ts - 老王重写：简化为热门歌手列表

import { searchMusicAPI } from './api';
import { showNotification, displaySearchResults } from './ui';
import { filterSearchResults } from './search-filter.js';
import { MALE_ARTISTS, FEMALE_ARTISTS } from './artists-database.js';

// ========== 老王修复BUG：事件监听器管理系统 ==========
interface EventListenerEntry {
  target: EventTarget;
  type: string;
  listener: EventListener;
  options?: AddEventListenerOptions | boolean;
}

const registeredEventListeners: EventListenerEntry[] = [];

function registerEventListener(
  target: EventTarget,
  type: string,
  listener: EventListener,
  options?: AddEventListenerOptions | boolean
): void {
  target.addEventListener(type, listener, options);
  registeredEventListeners.push({ target, type, listener, options });
}

function clearCurrentListeners(): void {
  registeredEventListeners.forEach(({ target, type, listener, options }) => {
    target.removeEventListener(type, listener, options);
  });
  registeredEventListeners.length = 0;
}

export function cleanup(): void {
  clearCurrentListeners();
}

// HTML转义
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 老王新增：分页状态管理
const PAGE_SIZE = 10; // 每页显示10个歌手
interface PaginationState {
  male: { currentPage: number; totalPages: number };
  female: { currentPage: number; totalPages: number };
}
const paginationState: PaginationState = {
  male: {
    currentPage: 1,
    totalPages: Math.ceil(MALE_ARTISTS.length / PAGE_SIZE)
  },
  female: {
    currentPage: 1,
    totalPages: Math.ceil(FEMALE_ARTISTS.length / PAGE_SIZE)
  },
};

// 当前选择的分类
let currentCategory: 'male' | 'female' = 'male';

// 初始化歌手模块
export function initArtist() {
  console.log('🎤 初始化热门歌手模块...');
  // 重置状态
  currentCategory = 'male';
  paginationState.male.currentPage = 1;
  paginationState.female.currentPage = 1;
  displayCategoryNav();
  console.log('✅ 热门歌手模块初始化完成');
}

// 老王新增：显示分类导航（男歌手/女歌手）
function displayCategoryNav() {
  const container = document.getElementById('artistContainer');
  if (!container) return;

  clearCurrentListeners();

  const navHtml = `
    <div class="nav-stage-container">
      <div class="nav-stage-header">
        <h3><i class="fas fa-user-music"></i> 热门歌手</h3>
        <p class="result-count">请选择分类查看歌手</p>
      </div>
      <div class="nav-buttons-container">
        <button class="nav-btn-item" id="maleArtistsBtn">
          <span class="btn-icon">👨‍🎤</span>
          <span class="btn-content">
            <span class="btn-title">男歌手</span>
            <span class="btn-subtitle">
              <i class="fas fa-music"></i> ${MALE_ARTISTS.length}位歌手
            </span>
          </span>
          <i class="fas fa-chevron-right btn-arrow"></i>
        </button>
        <button class="nav-btn-item" id="femaleArtistsBtn">
          <span class="btn-icon">👩‍🎤</span>
          <span class="btn-content">
            <span class="btn-title">女歌手</span>
            <span class="btn-subtitle">
              <i class="fas fa-music"></i> ${FEMALE_ARTISTS.length}位歌手
            </span>
          </span>
          <i class="fas fa-chevron-right btn-arrow"></i>
        </button>
      </div>
    </div>
  `;

  container.innerHTML = navHtml;

  // 绑定事件
  const maleBtn = document.getElementById('maleArtistsBtn');
  const femaleBtn = document.getElementById('femaleArtistsBtn');

  if (maleBtn) {
    registerEventListener(maleBtn, 'click', () => {
      currentCategory = 'male';
      paginationState.male.currentPage = 1;
      displayArtistList();
    });
  }

  if (femaleBtn) {
    registerEventListener(femaleBtn, 'click', () => {
      currentCategory = 'female';
      paginationState.female.currentPage = 1;
      displayArtistList();
    });
  }
}

// 显示歌手列表（带分页）
function displayArtistList() {
  const container = document.getElementById('artistContainer');
  if (!container) return;

  // 清理旧监听器
  clearCurrentListeners();

  // 根据当前分类获取歌手列表
  const artists = currentCategory === 'male' ? MALE_ARTISTS : FEMALE_ARTISTS;
  const state = paginationState[currentCategory];
  const categoryName = currentCategory === 'male' ? '男歌手' : '女歌手';
  const categoryIcon = currentCategory === 'male' ? '👨‍🎤' : '👩‍🎤';

  // 计算当前页要显示的歌手
  const startIndex = (state.currentPage - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const displayedArtists = artists.slice(startIndex, endIndex);
  const hasPrev = state.currentPage > 1;
  const hasNext = state.currentPage < state.totalPages;

  const artistButtons = displayedArtists.map(
    (artist) => `
      <button class="nav-btn-item artist-btn" data-artist-name="${escapeHtml(artist.name)}">
        <span class="btn-icon">${artist.icon}</span>
        <span class="btn-content">
          <span class="btn-title">${escapeHtml(artist.name)}</span>
          <span class="btn-subtitle">
            <i class="fas fa-music"></i> ${artist.genre}
          </span>
        </span>
        <i class="fas fa-chevron-right btn-arrow"></i>
      </button>
    `
  ).join('');

  container.innerHTML = `
    <div class="nav-stage-container">
      <div class="nav-stage-header">
        <button class="back-btn" id="backToCategoryNav">
          <i class="fas fa-arrow-left"></i> 返回
        </button>
        <h3><i class="fas fa-star"></i> ${categoryName}</h3>
        <p class="result-count">第 ${state.currentPage} / ${state.totalPages} 页（共 ${artists.length} 位歌手）</p>
      </div>
      <div class="nav-buttons-container">
        ${artistButtons}
      </div>
      <div class="pagination-controls">
        <button class="pagination-btn" id="prevPageBtn" ${!hasPrev ? 'disabled' : ''}>
          <i class="fas fa-chevron-left"></i> 上一页
        </button>
        <span class="page-indicator">第 ${state.currentPage} / ${state.totalPages} 页</span>
        <button class="pagination-btn" id="nextPageBtn" ${!hasNext ? 'disabled' : ''}>
          下一页 <i class="fas fa-chevron-right"></i>
        </button>
      </div>
    </div>
  `;

  // 绑定返回按钮
  const backBtn = document.getElementById('backToCategoryNav');
  if (backBtn) {
    registerEventListener(backBtn, 'click', displayCategoryNav);
  }

  // 绑定歌手点击事件
  container.querySelectorAll('.artist-btn').forEach((btn) => {
    registerEventListener(btn, 'click', handleArtistClick);
  });

  // 绑定"上一页"按钮
  const prevBtn = document.getElementById('prevPageBtn');
  if (prevBtn && hasPrev) {
    registerEventListener(prevBtn, 'click', () => {
      state.currentPage--;
      displayArtistList();
    });
  }

  // 绑定"下一页"按钮
  const nextBtn = document.getElementById('nextPageBtn');
  if (nextBtn && hasNext) {
    registerEventListener(nextBtn, 'click', () => {
      state.currentPage++;
      displayArtistList();
    });
  }
}

// 处理歌手点击
async function handleArtistClick(e: Event) {
  const artistName = (e.currentTarget as HTMLElement).dataset.artistName;
  if (!artistName) return;

  const container = document.getElementById('artistContainer');
  if (!container) return;

  // 清理旧监听器
  clearCurrentListeners();

  try {
    container.innerHTML =
      '<div class="loading"><i class="fas fa-spinner"></i><div>正在加载歌手热门歌曲...</div></div>';

    // 搜索歌手的歌曲
    const rawSongs = await searchMusicAPI(artistName, 'netease');

    // 老王修复：智能过滤和去重，确保只显示该歌手的相关歌曲
    const songs = filterSearchResults(rawSongs, artistName, 30, 100);

    console.log(`[Artist] ${artistName} - 原始结果: ${rawSongs.length}首, 过滤后: ${songs.length}首`);

    if (!songs || songs.length === 0) {
      container.innerHTML = `
                <div class="error">
                    <button class="back-btn" id="backToArtistList">
                        <i class="fas fa-arrow-left"></i> 返回
                    </button>
                    <i class="fas fa-exclamation-triangle"></i>
                    <div>未找到歌手歌曲</div>
                </div>
            `;
      const backBtn = document.getElementById('backToArtistList');
      if (backBtn) {
        registerEventListener(backBtn, 'click', displayArtistList);
      }
      return;
    }

    container.innerHTML = `
            <div class="artist-detail-header">
                <button class="back-btn" id="artistBackBtn">
                    <i class="fas fa-arrow-left"></i> 返回
                </button>
                <div class="artist-detail-info">
                    <h3>${escapeHtml(artistName)} 的热门歌曲</h3>
                    <p>共找到 ${songs.length} 首歌曲</p>
                </div>
            </div>
            <div class="artist-songs-container" id="artistSongsContainer"></div>
        `;

    // 返回按钮
    const backBtn = document.getElementById('artistBackBtn');
    if (backBtn) {
      registerEventListener(backBtn, 'click', displayArtistList);
    }

    // 显示歌曲列表
    displaySearchResults(songs, 'artistSongsContainer', songs);
    showNotification(`已加载 ${artistName} 的 ${songs.length} 首歌曲`, 'success');
  } catch (error) {
    console.error('加载歌手歌曲失败:', error);
    container.innerHTML = `
            <div class="error">
                <button class="back-btn" id="backToArtistList">
                    <i class="fas fa-arrow-left"></i> 返回
                </button>
                <i class="fas fa-exclamation-triangle"></i>
                <div>加载失败，请重试</div>
            </div>
        `;
    const backBtn = document.getElementById('backToArtistList');
    if (backBtn) {
      registerEventListener(backBtn, 'click', displayArtistList);
    }
    showNotification('加载歌手歌曲失败', 'error');
  }
}
