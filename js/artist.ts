// js/artist.ts - 老王重写：简化为热门歌手列表

import { searchMusicAPI } from './api';
import { showNotification, displaySearchResults } from './ui';

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

// 老王精选：热门华语歌手列表
const HOT_ARTISTS = [
  { name: '周杰伦', icon: '🎤', genre: '流行' },
  { name: '林俊杰', icon: '🎹', genre: '流行' },
  { name: '邓紫棋', icon: '🎵', genre: '流行' },
  { name: '薛之谦', icon: '🎧', genre: '流行' },
  { name: '李荣浩', icon: '🎸', genre: '流行' },
  { name: '毛不易', icon: '🎼', genre: '民谣' },
  { name: '陈奕迅', icon: '🎤', genre: '流行' },
  { name: '张学友', icon: '👑', genre: '经典' },
  { name: '刘德华', icon: '⭐', genre: '经典' },
  { name: '王菲', icon: '💎', genre: '经典' },
  { name: '孙燕姿', icon: '🌟', genre: '流行' },
  { name: '蔡依林', icon: '💃', genre: '流行' },
  { name: '五月天', icon: '🎸', genre: '摇滚' },
  { name: '许嵩', icon: '✨', genre: '流行' },
  { name: '汪苏泷', icon: '🎵', genre: '流行' },
  { name: '张杰', icon: '🔥', genre: '流行' },
  { name: '胡彦斌', icon: '🎹', genre: '流行' },
  { name: '李宇春', icon: '👸', genre: '流行' },
  { name: '陈粒', icon: '🌙', genre: '民谣' },
  { name: '赵雷', icon: '🎻', genre: '民谣' },
  { name: '房东的猫', icon: '🐱', genre: '民谣' },
  { name: '花粥', icon: '🌸', genre: '民谣' },
  { name: '周深', icon: '🌊', genre: '流行' },
  { name: '张碧晨', icon: '🦋', genre: '流行' },
  { name: '华晨宇', icon: '🌟', genre: '流行' },
  { name: '吴青峰', icon: '🎵', genre: '流行' },
  { name: '田馥甄', icon: '🌺', genre: '流行' },
  { name: '梁静茹', icon: '💝', genre: '流行' },
  { name: 'TFBOYS', icon: '🎤', genre: '流行' },
  { name: '鹿晗', icon: '🦌', genre: '流行' },
  { name: '张艺兴', icon: '🎧', genre: '流行' },
  { name: '蔡徐坤', icon: '🏀', genre: '流行' },
  { name: '王源', icon: '🌟', genre: '流行' },
  { name: '易烊千玺', icon: '⭐', genre: '流行' },
  { name: '吴亦凡', icon: '🎵', genre: '说唱' },
  { name: 'GAI', icon: '🔥', genre: '说唱' },
  { name: '邓伦', icon: '🎤', genre: '流行' },
  { name: '肖战', icon: '🌟', genre: '流行' },
  { name: '王一博', icon: '🏍️', genre: '流行' },
];

// 初始化歌手模块
export function initArtist() {
  console.log('🎤 初始化热门歌手模块...');
  displayHotArtists();
  console.log('✅ 热门歌手模块初始化完成');
}

// 显示热门歌手列表
function displayHotArtists() {
  const container = document.getElementById('artistContainer');
  if (!container) return;

  // 清理旧监听器
  clearCurrentListeners();

  const artistButtons = HOT_ARTISTS.map(
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
                <h3><i class="fas fa-star"></i> 热门歌手</h3>
                <p class="result-count">精选 ${HOT_ARTISTS.length} 位人气歌手</p>
            </div>
            <div class="nav-buttons-container">
                ${artistButtons}
            </div>
        </div>
    `;

  // 绑定点击事件
  container.querySelectorAll('.artist-btn').forEach((btn) => {
    registerEventListener(btn, 'click', handleArtistClick);
  });
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
    const songs = await searchMusicAPI(artistName, 'netease');

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
        registerEventListener(backBtn, 'click', displayHotArtists);
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
      registerEventListener(backBtn, 'click', displayHotArtists);
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
      registerEventListener(backBtn, 'click', displayHotArtists);
    }
    showNotification('加载歌手歌曲失败', 'error');
  }
}
