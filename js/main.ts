import * as api from './api.js';
import * as ui from './ui.js';
import * as player from './player.js';
import { debounce, renderPlaylistItem, renderEmptyState } from './utils.js';

// --- Tab Switching Logic ---
function switchTab(tabName: string): void {
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

function initializeApp(): void {
    console.log('云音乐 App 初始化...');
    ui.init();
    api.findWorkingAPI().then(result => {
        if (result.success) {
            ui.showNotification(`已连接到 ${result.name}`, 'success');
        } else {
            ui.showNotification('所有 API 均不可用，请稍后重试', 'error');
        }
    });
    player.loadSavedPlaylists();

    // --- Event Listeners ---
    const debouncedSearch = debounce(handleSearch, 300);
    document.querySelector('.search-btn')!.addEventListener('click', handleSearch);
    document.getElementById('searchInput')!.addEventListener('keyup', (e) => {
        if ((e as KeyboardEvent).key === 'Enter') {
            handleSearch();
        } else {
            debouncedSearch();
        }
    });
    document.getElementById('exploreRadarBtn')!.addEventListener('click', handleExplore);
    document.getElementById('shufflePlayBtn')!.addEventListener('click', handleShufflePlay);
    document.querySelector('.playlist-btn')!.addEventListener('click', handleParsePlaylist);
    
    // Player controls
    document.getElementById('playBtn')!.addEventListener('click', player.togglePlay);
    document.querySelector('.player-controls .control-btn.small:nth-child(2)')!.addEventListener('click', player.previousSong);
    document.querySelector('.player-controls .control-btn.small:nth-child(4)')!.addEventListener('click', player.nextSong);
    document.getElementById('playModeBtn')!.addEventListener('click', player.togglePlayMode);
    document.getElementById('playerFavoriteBtn')!.addEventListener('click', () => {
        const currentSong = player.getCurrentSong();
        if (currentSong) {
            player.toggleFavoriteButton(currentSong);
        }
    });
    document.getElementById('volumeSlider')!.addEventListener('input', (e) => player.setVolume((e.target as HTMLInputElement).value));
    document.querySelector('.progress-bar')!.addEventListener('click', (e) => player.seekTo(e as MouseEvent));
    
    // Download buttons
    document.getElementById('downloadSongBtn')!.addEventListener('click', () => {
        const currentSong = player.getCurrentSong();
        if (currentSong) player.downloadSongByData(currentSong);
    });
    document.getElementById('downloadLyricBtn')!.addEventListener('click', () => {
        const currentSong = player.getCurrentSong();
        if (currentSong) player.downloadLyricByData(currentSong);
    });

    // Tab buttons
    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', () => {
            switchTab((button as HTMLElement).dataset.tab!);
        });
    });

    // Initial tab state
    switchTab('saved');

    // 初始化"我的歌单"标签的折叠/展开功能
    initSavedTabToggles();

    // 加载并显示播放历史和收藏
    updatePlayHistoryDisplay();
    updateFavoritesDisplay();

    // 监听收藏变化
    window.addEventListener('favoritesUpdated', () => {
        updateFavoritesDisplay();
    });
}

// 初始化"我的歌单"标签的折叠/展开功能
function initSavedTabToggles(): void {
    // 播放历史折叠/展开
    const historyHeader = document.getElementById('historyHeader');
    const historyList = document.getElementById('playHistoryList');
    const historyToggleIcon = document.getElementById('historyToggleIcon');

    historyHeader?.addEventListener('click', () => {
        const isHidden = historyList?.style.display === 'none';
        if (historyList) {
            historyList.style.display = isHidden ? 'block' : 'none';
        }
        if (historyToggleIcon) {
            historyToggleIcon.className = isHidden ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
        }
    });

    // 我的喜欢折叠/展开
    const favoritesHeader = document.getElementById('favoritesHeader');
    const favoritesList = document.getElementById('favoritesList');
    const favoritesToggleIcon = document.getElementById('favoritesToggleIcon');

    favoritesHeader?.addEventListener('click', () => {
        const isHidden = favoritesList?.style.display === 'none';
        if (favoritesList) {
            favoritesList.style.display = isHidden ? 'block' : 'none';
        }
        if (favoritesToggleIcon) {
            favoritesToggleIcon.className = isHidden ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
        }
    });

    // 我保存的歌单折叠/展开
    const playlistsHeader = document.getElementById('playlistsHeader');
    const savedPlaylistsList = document.getElementById('savedPlaylistsList');
    const playlistsToggleIcon = document.getElementById('playlistsToggleIcon');

    playlistsHeader?.addEventListener('click', () => {
        const isHidden = savedPlaylistsList?.style.display === 'none';
        if (savedPlaylistsList) {
            savedPlaylistsList.style.display = isHidden ? 'block' : 'none';
        }
        if (playlistsToggleIcon) {
            playlistsToggleIcon.className = isHidden ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
        }
    });

    // 清空播放历史
    document.getElementById('clearHistoryBtn')?.addEventListener('click', () => {
        if (confirm('确定要清空播放历史吗?')) {
            player.clearPlayHistory();
            updatePlayHistoryDisplay();
            ui.showNotification('播放历史已清空', 'success');
        }
    });

    // 清空收藏
    document.getElementById('clearFavoritesBtn')?.addEventListener('click', () => {
        if (confirm('确定要清空收藏列表吗?')) {
            player.clearFavorites();
            updateFavoritesDisplay();
            ui.showNotification('收藏列表已清空', 'success');
        }
    });
}

// 更新播放历史显示
function updatePlayHistoryDisplay(): void {
    const historyList = document.getElementById('playHistoryList');
    if (!historyList) return;

    const history = player.getPlayHistory();

    if (history.length === 0) {
        historyList.innerHTML = renderEmptyState('fas fa-history', '暂无播放记录');
        return;
    }

    historyList.innerHTML = renderPlaylistItem('播放历史', history.length, 'fas fa-history', '#1db954');

    const playlistItem = historyList.querySelector('.mini-playlist-item');
    playlistItem?.addEventListener('click', () => {
        ui.displaySearchResults(history, 'savedResults', history);
        ui.showNotification(`已加载播放历史 (${history.length}首)`, 'success');
    });
}

// 更新收藏显示
function updateFavoritesDisplay(): void {
    const favoritesList = document.getElementById('favoritesList');
    if (!favoritesList) return;

    const favorites = player.getFavoriteSongs();

    if (favorites.length === 0) {
        favoritesList.innerHTML = renderEmptyState(
            'fas fa-heart',
            '暂无收藏歌曲',
            '点击播放器的爱心按钮收藏歌曲'
        );
        return;
    }

    favoritesList.innerHTML = renderPlaylistItem('我的喜欢', favorites.length, 'fas fa-heart', '#ff6b6b');

    const playlistItem = favoritesList.querySelector('.mini-playlist-item');
    playlistItem?.addEventListener('click', () => {
        ui.displaySearchResults(favorites, 'savedResults', favorites);
        ui.showNotification(`已加载我的喜欢 (${favorites.length}首)`, 'success');
    });
}

async function handleSearch(): Promise<void> {
    const keyword = (document.getElementById('searchInput') as HTMLInputElement).value;
    const source = (document.getElementById('sourceSelect') as HTMLSelectElement).value;
    if (!keyword.trim()) {
        ui.showNotification('请输入搜索关键词', 'warning');
        return;
    }
    ui.showLoading('searchResults');
    try {
        const songs = await api.searchMusicAPI(keyword, source);
        if (songs.length === 0) {
            ui.showError('未找到相关歌曲，请尝试其他关键词或音乐平台', 'searchResults');
            return;
        }
        ui.displaySearchResults(songs, 'searchResults', songs);
        ui.showNotification(`找到 ${songs.length} 首歌曲`, 'success');
    } catch (error) {
        console.error('Search failed:', error);
        const errorMsg = error instanceof Error ? error.message : '搜索失败';
        ui.showError(`搜索失败: ${errorMsg}，请稍后重试`, 'searchResults');
        ui.showNotification('搜索失败，请检查网络连接', 'error');
    }
}

async function handleExplore(): Promise<void> {
    ui.showLoading('searchResults');
    try {
        const songs = await api.exploreRadarAPI();
        ui.displaySearchResults(songs, 'searchResults', songs);
    } catch (error) {
        console.error('Explore failed:', error);
        ui.showError('探索失败，请稍后重试', 'searchResults');
    }
}

async function handleShufflePlay(): Promise<void> {
    ui.showLoading('searchResults');
    try {
        const songs = await api.exploreRadarAPI();

        // 随机打乱歌曲顺序
        const shuffled = songs.sort(() => Math.random() - 0.5);

        ui.displaySearchResults(shuffled, 'searchResults', shuffled);
        ui.showNotification(`已加载${shuffled.length}首随机歌曲，开始播放`, 'success');

        // 自动播放第一首
        if (shuffled.length > 0) {
            player.playSong(0, shuffled, 'searchResults');
        }
    } catch (error) {
        console.error('Shuffle play failed:', error);
        ui.showError('随机播放失败，请稍后重试', 'searchResults');
    }
}

async function handleParsePlaylist(): Promise<void> {
    const playlistIdInput = (document.getElementById('playlistIdInput') as HTMLInputElement).value;
    if (!playlistIdInput.trim()) {
        ui.showNotification('请输入歌单ID或链接', 'warning');
        return;
    }
    ui.showLoading('parseResults');
    try {
        const playlist = await api.parsePlaylistAPI(playlistIdInput);
        ui.displaySearchResults(playlist.songs, 'parseResults', playlist.songs);

        // 显示成功解析的歌单信息
        if (playlist.name) {
            ui.showNotification(`成功解析歌单《${playlist.name}》，共 ${playlist.count || 0} 首歌曲`, 'success');
        }
    } catch (error) {
        console.error('Parse playlist failed:', error);

        // 显示详细的错误信息
        let errorMessage = '解析歌单失败';
        if (error instanceof Error) {
            errorMessage = error.message;
        }

        ui.showError(errorMessage, 'parseResults');
        ui.showNotification(errorMessage, 'error');
    }
}

document.addEventListener('DOMContentLoaded', initializeApp);

// 移动端页面切换功能
(window as any).switchMobilePage = function(pageIndex: number): void {
    const sections = [
        document.querySelector('.content-section'),
        document.querySelector('.player-section'),
        document.querySelector('.lyrics-section')
    ];

    const indicators = document.querySelectorAll('.page-indicator');

    // 移除所有 active 类
    sections.forEach(section => section?.classList.remove('mobile-active'));
    indicators.forEach(indicator => indicator.classList.remove('active'));

    // 添加当前页面的 active 类
    if (sections[pageIndex]) {
        sections[pageIndex]!.classList.add('mobile-active');
    }
    if (indicators[pageIndex]) {
        indicators[pageIndex].classList.add('active');
    }
};

// 初始化移动端第一个页面
if (window.innerWidth <= 768) {
    (window as any).switchMobilePage(0);

    // 添加触摸滑动支持
    let touchStartX = 0;
    let touchEndX = 0;
    let currentPage = 0;
    const mainContainer = document.querySelector('.main-container');

    mainContainer?.addEventListener('touchstart', (e) => {
        touchStartX = (e as TouchEvent).changedTouches[0].screenX;
    }, { passive: true });

    mainContainer?.addEventListener('touchend', (e) => {
        touchEndX = (e as TouchEvent).changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });

    function handleSwipe() {
        const swipeThreshold = 50; // 最小滑动距离
        const diff = touchStartX - touchEndX;

        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0 && currentPage < 2) {
                // 向左滑动 - 下一页
                currentPage++;
                (window as any).switchMobilePage(currentPage);
            } else if (diff < 0 && currentPage > 0) {
                // 向右滑动 - 上一页
                currentPage--;
                (window as any).switchMobilePage(currentPage);
            }
        }
    }

    // 同步页面指示器点击
    const originalSwitchPage = (window as any).switchMobilePage;
    (window as any).switchMobilePage = function(pageIndex: number) {
        currentPage = pageIndex;
        originalSwitchPage(pageIndex);
    };
}
