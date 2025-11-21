// js/play-stats.ts - 播放统计与侧边栏
import { showNotification } from './ui';
import type { Song } from './api';
import { getFavoriteSongsSync, getPlayHistory, playSong } from './player';
import { getAlbumCoverUrl } from './api';

// 简单事件监听器管理，避免重复绑定
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

// 数据结构
interface PlayRecord {
  songId: string;
  songName: string;
  artist: string;
  playCount: number;
  totalDuration: number; // 秒
  lastPlayTime: number;
}

interface ArtistStats {
  name: string;
  playCount: number;
  songCount: number;
}

export interface PlayStats {
  totalPlays: number;
  totalDuration: number;
  songs: { [key: string]: PlayRecord };
  firstPlayDate: number;
}

const STATS_KEY = 'play_stats';
const TOP_COUNT = 10;

let currentStats: PlayStats = {
  totalPlays: 0,
  totalDuration: 0,
  songs: {},
  firstPlayDate: Date.now(),
};

let isStatsVisible = false;

// 初始化
export function initPlayStats(): void {
  loadStats();
  createStatsPanel();
  initSidebarTabs();

  const statsBtn = document.getElementById('statsBtn');
  if (statsBtn) {
    statsBtn.addEventListener('click', toggleStatsPanel);
  }

  // 默认填充侧边栏
  updateSidebarHistory();
}

function loadStats(): void {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PlayStats;
      currentStats = {
        totalPlays: parsed.totalPlays || 0,
        totalDuration: parsed.totalDuration || 0,
        songs: parsed.songs || {},
        firstPlayDate: parsed.firstPlayDate || Date.now(),
      };
    }
  } catch (error) {
    console.warn('加载播放统计失败，使用默认值', error);
  }
}

function saveStats(): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(currentStats));
  } catch (error) {
    console.warn('保存播放统计失败', error);
  }
}

// 记录一次播放
export function recordPlay(song: Song, duration: number = 0): void {
  if (!song || !song.id) return;
  const id = String(song.id);
  const artist: string = Array.isArray(song.artist)
    ? song.artist.length > 0
      ? song.artist.join(', ')
      : '未知'
    : song.artist || '未知';

  if (!currentStats.songs[id]) {
    currentStats.songs[id] = {
      songId: id,
      songName: song.name || '未知歌曲',
      artist,
      playCount: 0,
      totalDuration: 0,
      lastPlayTime: Date.now(),
    };
  }

  const record = currentStats.songs[id];
  record.playCount += 1;
  record.totalDuration += Math.max(0, duration);
  record.lastPlayTime = Date.now();

  currentStats.totalPlays += 1;
  currentStats.totalDuration += Math.max(0, duration);
  if (!currentStats.firstPlayDate) currentStats.firstPlayDate = Date.now();

  saveStats();

  // 若面板已开，更新展示
  if (isStatsVisible) {
    updateStatsDisplay();
  }
}

export function getStats(): PlayStats {
  return currentStats;
}

export function exportStats(): string {
  return JSON.stringify(currentStats, null, 2);
}

// 侧边栏标签（播放历史 / 收藏）
function initSidebarTabs(): void {
  const tabs = document.querySelectorAll('.stats-tabs-inline .stats-tab');
  const contents = document.querySelectorAll('.stats-content-inline .stats-tab-content');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const tabName = (tab as HTMLElement).dataset.statsTab;

      tabs.forEach((t) => t.classList.remove('active'));
      contents.forEach((c) => c.classList.remove('active'));
      tab.classList.add('active');

      if (tabName === 'history') {
        document.getElementById('historyContent')?.classList.add('active');
        updateSidebarHistory();
      } else if (tabName === 'favorites') {
        document.getElementById('favoritesContent')?.classList.add('active');
        updateSidebarFavorites();
      }
    });
  });
}

// 侧边收藏列表
function updateSidebarFavorites(): void {
  const container = document.getElementById('favoritesList');
  if (!container) return;

  clearCurrentListeners();

  const favorites = getFavoriteSongsSync();
  if (favorites.length === 0) {
    container.innerHTML = '<div class="stats-empty">暂无收藏</div>';
    return;
  }

  const recentFavorites = favorites.slice(0, 10);
  container.innerHTML = recentFavorites
    .map(
      (song, index) => `
        <div class="stats-song-item clickable" data-song-index="${index}">
            <div class="stats-song-rank">${index + 1}</div>
            <div class="stats-song-cover">
                <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHJ4PSI4Ii8+CjxwYXRoIGQ9Ik0yMCAxMkwyOCAyMEgyNFYzMkgxNlYyMEgxMkwyMCAxMloiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4zKSIvPgo8L3N2Zz4K" alt="封面" class="stats-cover-img" loading="lazy">
            </div>
            <div class="stats-song-info">
                <div class="stats-song-name">${song.name}</div>
                <div class="stats-song-meta">${
                  Array.isArray(song.artist) ? song.artist.join(', ') : song.artist
                }</div>
            </div>
            <button class="stats-play-btn" title="播放">
                <i class="fas fa-play"></i>
            </button>
        </div>`
    )
    .join('');

  recentFavorites.forEach(async (song, index) => {
    try {
      const coverUrl = await getAlbumCoverUrl(song, 40);
      if (coverUrl) {
        const coverElement = container.querySelector(
          `.stats-song-item:nth-child(${index + 1}) .stats-cover-img`
        ) as HTMLImageElement;
        if (coverElement) coverElement.src = coverUrl;
      }
    } catch (error) {
      console.warn(`加载收藏歌曲封面失败: ${song.name}`, error);
    }
  });

  container.querySelectorAll('.stats-song-item').forEach((item, index) => {
    registerEventListener(item, 'click', (e: Event) => {
      if (!(e.target as HTMLElement).closest('.stats-play-btn')) {
        playSong(index, favorites, 'favoritesList');
      }
    });
  });
  container.querySelectorAll('.stats-play-btn').forEach((btn, index) => {
    registerEventListener(btn, 'click', (e: Event) => {
      e.stopPropagation();
      playSong(index, favorites, 'favoritesList');
    });
  });
}

// 侧边播放历史
function updateSidebarHistory(): void {
  const container = document.getElementById('historyList');
  if (!container) return;

  clearCurrentListeners();

  const history = getPlayHistory();
  if (!history || history.length === 0) {
    container.innerHTML = '<div class="stats-empty">暂无播放历史</div>';
    return;
  }

  const recentHistory = history.slice(-10).reverse();
  container.innerHTML = recentHistory
    .map(
      (song, index) => `
        <div class="stats-song-item clickable" data-song-index="${index}">
            <div class="stats-song-rank">${index + 1}</div>
            <div class="stats-song-cover">
                <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHJ4PSI4Ii8+CjxwYXRoIGQ9Ik0yMCAxMkwyOCAyMEgyNFYzMkgxNlYyMEgxMkwyMCAxMloiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4zKSIvPgo8L3N2Zz4K" alt="封面" class="stats-cover-img" loading="lazy">
            </div>
            <div class="stats-song-info">
                <div class="stats-song-name">${song.name}</div>
                <div class="stats-song-meta">${
                  Array.isArray(song.artist) ? song.artist.join(', ') : song.artist
                }</div>
            </div>
            <button class="stats-play-btn" title="播放">
                <i class="fas fa-play"></i>
            </button>
        </div>`
    )
    .join('');

  recentHistory.forEach(async (song, index) => {
    try {
      const coverUrl = await getAlbumCoverUrl(song, 40);
      if (coverUrl) {
        const coverElement = container.querySelector(
          `.stats-song-item:nth-child(${index + 1}) .stats-cover-img`
        ) as HTMLImageElement;
        if (coverElement) coverElement.src = coverUrl;
      }
    } catch (error) {
      console.warn(`加载历史歌曲封面失败: ${song.name}`, error);
    }
  });

  container.querySelectorAll('.stats-song-item').forEach((item, index) => {
    registerEventListener(item, 'click', (e: Event) => {
      if (!(e.target as HTMLElement).closest('.stats-play-btn')) {
        playSong(index, recentHistory, 'historyList');
      }
    });
  });
  container.querySelectorAll('.stats-play-btn').forEach((btn, index) => {
    registerEventListener(btn, 'click', (e: Event) => {
      e.stopPropagation();
      playSong(index, recentHistory, 'historyList');
    });
  });
}

// 统计面板 UI
function createStatsPanel(): void {
  const panel = document.createElement('div');
  panel.id = 'statsPanel';
  panel.className = 'stats-panel';
  panel.innerHTML = `
    <div class="stats-header">
      <h3>📊 播放统计</h3>
      <button class="stats-close" id="statsCloseBtn">×</button>
    </div>
    <div class="stats-overview" id="statsOverview"></div>
    <div class="stats-tabs">
      <button class="stats-tab active" data-tab="songs">热门歌曲</button>
      <button class="stats-tab" data-tab="artists">热门艺术家</button>
    </div>
    <div class="stats-content">
      <div class="stats-tab-content active" id="statsSongsTab"></div>
      <div class="stats-tab-content" id="statsArtistsTab"></div>
    </div>
    <div class="stats-footer">
      <button class="stats-clear-btn" id="statsClearBtn">
        <i class="fas fa-trash-alt"></i> 清除统计数据
      </button>
    </div>
  `;
  document.body.appendChild(panel);

  const closeBtn = document.getElementById('statsCloseBtn');
  if (closeBtn) closeBtn.addEventListener('click', closeStatsPanel);

  const clearBtn = document.getElementById('statsClearBtn');
  if (clearBtn) clearBtn.addEventListener('click', clearStats);

  panel.querySelectorAll('.stats-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      panel.querySelectorAll('.stats-tab').forEach((t) => t.classList.remove('active'));
      panel.querySelectorAll('.stats-tab-content').forEach((c) => c.classList.remove('active'));
      tab.classList.add('active');
      const tabName = (tab as HTMLElement).dataset.tab;
      panel.querySelector(`#stats${capitalize(tabName || '')}Tab`)?.classList.add('active');
    });
  });
}

function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function toggleStatsPanel(): void {
  if (isStatsVisible) closeStatsPanel();
  else openStatsPanel();
}

function openStatsPanel(): void {
  const panel = document.getElementById('statsPanel');
  if (panel) {
    updateStatsDisplay();
    panel.classList.add('active');
    isStatsVisible = true;
  }
}

function closeStatsPanel(): void {
  const panel = document.getElementById('statsPanel');
  if (panel) {
    panel.classList.remove('active');
  }
  isStatsVisible = false;
}

function clearStats(): void {
  if (!confirm('确认要清除所有播放统计数据吗？此操作不可恢复')) return;
  currentStats = {
    totalPlays: 0,
    totalDuration: 0,
    songs: {},
    firstPlayDate: Date.now(),
  };
  saveStats();
  updateStatsDisplay();
  showNotification('播放统计已清除', 'success');
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours} 小时 ${minutes} 分钟`;
  return `${minutes} 分钟`;
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

// 面板渲染
function updateStatsDisplay(): void {
  const overview = document.getElementById('statsOverview');
  if (overview) {
    overview.innerHTML = `
      <div class="stats-card">
        <div class="stats-card-title">总播放次数</div>
        <div class="stats-card-value">${currentStats.totalPlays}</div>
      </div>
      <div class="stats-card">
        <div class="stats-card-title">总播放时长</div>
        <div class="stats-card-value">${formatDuration(Math.floor(currentStats.totalDuration))}</div>
      </div>
      <div class="stats-card">
        <div class="stats-card-title">首次播放日期</div>
        <div class="stats-card-value">${formatDate(currentStats.firstPlayDate)}</div>
      </div>
    `;
  }

  updateTopSongs();
  updateTopArtists();
}

function updateTopSongs(): void {
  const container = document.getElementById('statsSongsTab');
  if (!container) return;

  const songsArray = Object.values(currentStats.songs).sort((a, b) => b.playCount - a.playCount);
  const topSongs = songsArray.slice(0, TOP_COUNT);

  if (topSongs.length === 0) {
    container.innerHTML = '<div class="stats-empty">暂无数据</div>';
    return;
  }

  container.innerHTML = topSongs
    .map(
      (record, index) => `
        <div class="stats-item">
          <div class="stats-rank">${index + 1}</div>
          <div class="stats-info">
            <div class="stats-title">${record.songName}</div>
            <div class="stats-meta">${record.artist} · 播放 ${record.playCount} 次</div>
          </div>
        </div>`
    )
    .join('');
}

function updateTopArtists(): void {
  const container = document.getElementById('statsArtistsTab');
  if (!container) return;

  const map = new Map<string, ArtistStats>();
  Object.values(currentStats.songs).forEach((record) => {
    const name = record.artist || '未知';
    const entry = map.get(name) || { name, playCount: 0, songCount: 0 };
    entry.playCount += record.playCount;
    entry.songCount += 1;
    map.set(name, entry);
  });

  const artists = Array.from(map.values()).sort((a, b) => b.playCount - a.playCount);
  const topArtists = artists.slice(0, TOP_COUNT);

  if (topArtists.length === 0) {
    container.innerHTML = '<div class="stats-empty">暂无数据</div>';
    return;
  }

  container.innerHTML = topArtists
    .map(
      (artist, index) => `
        <div class="stats-item">
          <div class="stats-rank">${index + 1}</div>
          <div class="stats-info">
            <div class="stats-title">${artist.name}</div>
            <div class="stats-meta">播放 ${artist.playCount} 次 · ${artist.songCount} 首歌曲</div>
          </div>
        </div>`
    )
    .join('');
}
