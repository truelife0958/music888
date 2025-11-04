// 简化版音乐播放器 - 只保留核心功能
import '../css/style.css';

import * as api from './api.js';
import * as ui from './ui.js';
import * as player from './player.js';
import { debounce } from './utils.js';
import { initRank } from './rank.js';
import { initDailyRecommend } from './daily-recommend.js';
import { initSearchHistory, addSearchHistory } from './search-history.js';
import { initPlayStats } from './play-stats.js';

// 防止重复初始化的全局标志
let appInitialized = false;

// Tab切换逻辑
export function switchTab(tabName: string): void {
    document.querySelectorAll('.tab-content').forEach(content => {
        (content as HTMLElement).style.display = 'none';
        content.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    const selectedTabContent = document.getElementById(tabName + 'Tab');
    if (selectedTabContent) {
        (selectedTabContent as HTMLElement).style.display = 'flex';
        selectedTabContent.classList.add('active');
    }
    
    const selectedTabButton = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    if (selectedTabButton) {
        selectedTabButton.classList.add('active');
    }
}

async function initializeApp(): Promise<void> {
    if (appInitialized) {
        console.warn('⚠️ 应用已初始化，跳过重复初始化');
        return;
    }
    appInitialized = true;
    console.log('🚀 开始初始化应用...');
    
    ui.init();
    player.init();
    initRank();
    initDailyRecommend();
    initSearchHistory();
    initPlayStats();
    
    // API初始化
    ui.showNotification('正在连接音乐服务...', 'info');
    try {
        const result = await api.findWorkingAPI();
        if (result.success) {
            console.log(`✅ API初始化成功: ${result.name}`);
            ui.showNotification(`已连接到 ${result.name}`, 'success');
        } else {
            console.error('❌ 所有API均不可用');
            ui.showNotification('所有 API 均不可用，搜索功能可能受影响', 'warning');
        }
    } catch (error) {
        console.error('❌ API初始化失败:', error);
        ui.showNotification('API连接失败，将使用默认配置', 'warning');
    }
    
    player.loadSavedPlaylists();

    // 搜索功能
    const searchBtn = document.querySelector('.search-btn');
    const searchInput = document.getElementById('searchInput') as HTMLInputElement;
    
    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', handleSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch();
            }
        });
    }

    // 播放器控制
    document.getElementById('playBtn')!.addEventListener('click', player.togglePlay);
    document.querySelector('.player-controls .control-btn.small:nth-child(3)')!.addEventListener('click', player.previousSong);
    document.querySelector('.player-controls .control-btn.small:nth-child(5)')!.addEventListener('click', player.nextSong);
    document.getElementById('playModeBtn')!.addEventListener('click', player.togglePlayMode);
    document.getElementById('volumeSlider')!.addEventListener('input', (e) => player.setVolume((e.target as HTMLInputElement).value));
    document.querySelector('.progress-bar')!.addEventListener('click', (e) => player.seekTo(e as MouseEvent));
    
    // 下载按钮
    document.getElementById('downloadSongBtn')!.addEventListener('click', () => {
        const currentSong = player.getCurrentSong();
        if (currentSong) player.downloadSongByData(currentSong);
    });
    document.getElementById('downloadLyricBtn')!.addEventListener('click', () => {
        const currentSong = player.getCurrentSong();
        if (currentSong) player.downloadLyricByData(currentSong);
    });

    // 收藏按钮
    document.getElementById('playerFavoriteBtn')!.addEventListener('click', () => {
        const currentSong = player.getCurrentSong();
        if (currentSong) {
            player.toggleFavoriteButton(currentSong);
        }
    });

    // Tab按钮
    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', () => {
            switchTab((button as HTMLElement).dataset.tab!);
        });
    });

    // 歌单解析
    document.querySelector('.playlist-btn')!.addEventListener('click', handleParsePlaylist);

    // 初始化播放列表弹窗
    initPlaylistModal();

    // 初始tab状态
    switchTab('search');
}

async function handleSearch(): Promise<void> {
    const keyword = (document.getElementById('searchInput') as HTMLInputElement).value;
    const source = (document.getElementById('sourceSelect') as HTMLSelectElement).value;
    
    if (!keyword.trim()) {
        ui.showNotification('请输入搜索关键词', 'warning');
        return;
    }
    
    // 添加到搜索历史
    addSearchHistory(keyword.trim());
    
    ui.showLoading('searchResults');

    try {
        const songs = await api.searchMusicAPI(keyword, source);
        if (songs.length > 0) {
            ui.displaySearchResults(songs, 'searchResults', songs);
            ui.showNotification(`找到 ${songs.length} 首歌曲`, 'success');
        } else {
            ui.showError('未找到相关歌曲，请尝试其他关键词', 'searchResults');
            ui.showNotification('未找到相关歌曲', 'warning');
        }
    } catch (error) {
        console.error('搜索失败:', error);
        ui.showError('搜索失败，请稍后重试', 'searchResults');
        ui.showNotification('搜索失败，请检查网络连接', 'error');
    }
}

async function handleParsePlaylist(): Promise<void> {
    const playlistIdInput = (document.getElementById('playlistIdInput') as HTMLInputElement).value;
    const playlistSourceSelect = (document.getElementById('playlistSourceSelect') as HTMLSelectElement).value;

    if (!playlistIdInput.trim()) {
        ui.showNotification('请输入歌单ID或链接', 'warning');
        return;
    }
    
    ui.showLoading('parseResults');
    
    try {
        const playlist = await api.parsePlaylistAPI(playlistIdInput, playlistSourceSelect);
        ui.displaySearchResults(playlist.songs, 'parseResults', playlist.songs);
        
        if (playlist.name) {
            const sourceName = playlistSourceSelect === 'netease' ? '网易云音乐' : 'QQ音乐';
            ui.showNotification(`成功解析歌单《${playlist.name}》，共 ${playlist.count || 0} 首歌曲`, 'success');
        }
    } catch (error) {
        let errorMessage = '解析歌单失败';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        ui.showError(errorMessage, 'parseResults');
        ui.showNotification(errorMessage, 'error');
    }
}

// 播放列表弹窗
function initPlaylistModal(): void {
    const playlistBtn = document.getElementById('playlistBtn');
    const playlistModal = document.getElementById('playlistModal');
    const closeBtn = document.getElementById('closePlaylistModal');
    const clearBtn = document.getElementById('clearPlaylistBtn');

    if (playlistBtn && playlistModal && closeBtn && clearBtn) {
        playlistBtn.addEventListener('click', () => {
            showPlaylistModal();
        });

        closeBtn.addEventListener('click', () => {
            playlistModal.style.display = 'none';
        });

        clearBtn.addEventListener('click', () => {
            if (confirm('确定要清空播放列表吗？')) {
                player.clearPlaylist();
                showPlaylistModal();
            }
        });

        // 点击模态框外部关闭
        playlistModal.addEventListener('click', (e) => {
            if (e.target === playlistModal) {
                playlistModal.style.display = 'none';
            }
        });
    }
}

function showPlaylistModal(): void {
    const modal = document.getElementById('playlistModal');
    const modalBody = document.getElementById('playlistModalBody');
    
    if (!modal || !modalBody) return;

    const playlist = player.getCurrentPlaylist();
    const currentIndex = player.getCurrentIndex();

    if (playlist.length === 0) {
        modalBody.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-music"></i>
                <div>播放列表为空</div>
            </div>
        `;
    } else {
        modalBody.innerHTML = playlist.map((song, index) => `
            <div class="playlist-item ${index === currentIndex ? 'active' : ''}" data-index="${index}">
                <div class="playlist-item-info">
                    <div class="playlist-item-name">${song.name}</div>
                    <div class="playlist-item-artist">${Array.isArray(song.artist) ? song.artist.join(', ') : song.artist}</div>
                </div>
                <button class="playlist-item-remove" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');

        // 绑定播放事件
        modalBody.querySelectorAll('.playlist-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!(e.target as HTMLElement).closest('.playlist-item-remove')) {
                    const index = parseInt((item as HTMLElement).dataset.index!);
                    player.playSongFromPlaylist(index);
                    modal.style.display = 'none';
                }
            });
        });

        // 绑定删除事件
        modalBody.querySelectorAll('.playlist-item-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt((btn as HTMLElement).dataset.index!);
                player.removeFromPlaylist(index);
                showPlaylistModal();
            });
        });
    }

    modal.style.display = 'flex';
}

// 移动端页面切换功能
(window as any).switchMobilePage = function(pageIndex: number): void {
    const sections = [
        document.querySelector('.content-section'),
        document.querySelector('.player-section'),
        document.querySelector('.my-section')
    ];

    const indicators = document.querySelectorAll('.page-indicator');

    sections.forEach(section => section?.classList.remove('mobile-active'));
    indicators.forEach(indicator => indicator.classList.remove('active'));

    if (sections[pageIndex]) {
        sections[pageIndex]!.classList.add('mobile-active');
    }
    if (indicators[pageIndex]) {
        indicators[pageIndex].classList.add('active');
    }
};

// 初始化移动端
if (window.innerWidth <= 768) {
    (window as any).switchMobilePage(0);
}

// 修复: 添加移动端滑动手势支持
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

const mainContainer = document.querySelector('.main-container');
if (mainContainer && window.innerWidth <= 768) {
    // 优化: 添加touchmove事件以改进滑动检测
    let isSwiping = false;
    
    mainContainer.addEventListener('touchstart', (e: Event) => {
        const touchEvent = e as TouchEvent;
        touchStartX = touchEvent.changedTouches[0].screenX;
        touchStartY = touchEvent.changedTouches[0].screenY;
        isSwiping = false;
    }, { passive: true });

    // 优化: 添加touchmove以检测用户意图
    mainContainer.addEventListener('touchmove', (e: Event) => {
        const touchEvent = e as TouchEvent;
        const currentX = touchEvent.changedTouches[0].screenX;
        const currentY = touchEvent.changedTouches[0].screenY;
        const deltaX = Math.abs(currentX - touchStartX);
        const deltaY = Math.abs(currentY - touchStartY);
        
        // 优化: 水平滑动优先，防止与垂直滚动冲突
        if (deltaX > 10 && deltaX > deltaY) {
            isSwiping = true;
            // 阻止默认的垂直滚动
            e.preventDefault();
        }
    }, { passive: false }); // 需要preventDefault，所以不能passive

    mainContainer.addEventListener('touchend', (e: Event) => {
        const touchEvent = e as TouchEvent;
        touchEndX = touchEvent.changedTouches[0].screenX;
        touchEndY = touchEvent.changedTouches[0].screenY;
        
        // 只有在确认是滑动手势时才处理
        if (isSwiping) {
            handleSwipe();
        }
        
        isSwiping = false;
    }, { passive: true });
}

function handleSwipe(): void {
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    const minSwipeDistance = 50;

    // 只处理水平滑动，忽略垂直滑动（用于滚动）
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
        const sections = document.querySelectorAll('.content-section, .player-section');
        const indicators = document.querySelectorAll('.page-indicator');
        let currentPage = 0;

        // 找到当前激活页面
        indicators.forEach((indicator, index) => {
            if (indicator.classList.contains('active')) {
                currentPage = index;
            }
        });

        // 左滑显示下一页
        if (deltaX < 0 && currentPage < sections.length - 1) {
            (window as any).switchMobilePage(currentPage + 1);
        }
        // 右滑显示上一页
        else if (deltaX > 0 && currentPage > 0) {
            (window as any).switchMobilePage(currentPage - 1);
        }
    }
}

// 确保DOM完全加载后再启动应用
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initializeApp();
    });
} else {
    initializeApp();
}
