// js/playlist.ts - 歌单发现模块（仅排行榜功能，热门歌单功能已移除）
import { parsePlaylistAPI, type Song } from './api';
import { showNotification, displaySearchResults } from './ui';

// 事件监听管理，避免重复绑定
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

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ========== 排行榜配置 ==========
const RANK_LISTS = [
  { id: '3778678', name: '飙升榜', icon: '📈', desc: '热度飙升的歌曲' },
  { id: '3779629', name: '新歌榜', icon: '🆕', desc: '最新发布的歌曲' },
  { id: '2884035', name: '原创榜', icon: '✨', desc: '原创音乐作品' },
  { id: '19723756', name: '热歌榜', icon: '🔥', desc: '当下最热门的歌曲' },
];

// ========== 模块状态 ==========
interface PlaylistState {
  stage: 'nav' | 'rank' | 'detail';
  playlistId?: string;
  playlistName?: string;
}

const currentState: PlaylistState = {
  stage: 'nav',
};

// ========== 初始化函数 ==========
export function initPlaylist(): void {
  renderRankNav();
}

// ========== 渲染排行榜导航 ==========
function renderRankNav(): void {
  const container = document.getElementById('playlistContainer');
  if (!container) return;

  clearCurrentListeners();
  currentState.stage = 'rank';

  const navHtml = `
    <div class="nav-stage">
      <div class="nav-stage-header">
        <h3><i class="fas fa-trophy"></i> 排行榜</h3>
        <p class="result-count">选择一个排行榜查看详情</p>
      </div>
      <div class="nav-buttons-container">
        ${RANK_LISTS.map(
          (rank) => `
          <button class="nav-btn-item" data-rank-id="${rank.id}">
            <span class="btn-icon">${rank.icon}</span>
            <span class="btn-content">
              <span class="btn-title">${escapeHtml(rank.name)}</span>
              <span class="btn-subtitle">${escapeHtml(rank.desc)}</span>
            </span>
            <i class="fas fa-chevron-right btn-arrow"></i>
          </button>
        `
        ).join('')}
      </div>
    </div>
  `;

  container.innerHTML = navHtml;

  const rankBtns = container.querySelectorAll('.nav-btn-item');
  rankBtns.forEach((btn) => {
    registerEventListener(btn, 'click', () => {
      const rankId = (btn as HTMLElement).dataset.rankId;
      const rankName = (btn as HTMLElement).querySelector('.btn-title')?.textContent || '';
      if (rankId) {
        loadPlaylistDetail(rankId, rankName);
      }
    });
  });
}

// ========== 加载歌单详情 ==========
async function loadPlaylistDetail(playlistId: string, playlistName?: string): Promise<void> {
  const container = document.getElementById('playlistContainer');
  if (!container) return;

  clearCurrentListeners();
  currentState.stage = 'detail';
  currentState.playlistId = playlistId;
  currentState.playlistName = playlistName;

  container.innerHTML =
    '<div class="loading"><i class="fas fa-spinner fa-spin"></i><div>正在加载歌单...</div></div>';

  try {
    const result = await parsePlaylistAPI(playlistId, 'netease');
    const songs: Song[] = result?.songs || [];

    if (!songs || songs.length === 0) {
      container.innerHTML = `
        <div class="nav-stage-header">
          <button class="back-btn" id="backToRankNav">
            <i class="fas fa-arrow-left"></i> 返回
          </button>
        </div>
        <div class="error">
          <i class="fas fa-exclamation-triangle"></i>
          <div>歌单为空或加载失败</div>
        </div>
      `;
      const backBtn = document.getElementById('backToRankNav');
      if (backBtn) {
        registerEventListener(backBtn, 'click', renderRankNav);
      }
      return;
    }

    const headerHtml = `
      <div class="nav-stage-header">
        <button class="back-btn" id="backToRankNav">
          <i class="fas fa-arrow-left"></i> 返回
        </button>
        <h3><i class="fas fa-list-music"></i> ${escapeHtml(playlistName || result.name || '歌单')}</h3>
        <p class="result-count">共 ${songs.length} 首歌曲</p>
      </div>
      <div id="playlistSongs"></div>
    `;

    container.innerHTML = headerHtml;

    const backBtn = document.getElementById('backToRankNav');
    if (backBtn) {
      registerEventListener(backBtn, 'click', renderRankNav);
    }

    displaySearchResults(songs, 'playlistSongs', songs);
    showNotification(`成功加载《${playlistName || result.name}》，共 ${songs.length} 首歌曲`, 'success');
  } catch (error) {
    console.error('加载歌单详情失败:', error);
    container.innerHTML = `
      <div class="nav-stage-header">
        <button class="back-btn" id="backToRankNav">
          <i class="fas fa-arrow-left"></i> 返回
        </button>
      </div>
      <div class="error">
        <i class="fas fa-exclamation-triangle"></i>
        <div>加载歌单失败，请稍后重试</div>
      </div>
    `;
    const backBtn = document.getElementById('backToRankNav');
    if (backBtn) {
      registerEventListener(backBtn, 'click', renderRankNav);
    }
    showNotification('加载歌单详情失败', 'error');
  }
}
