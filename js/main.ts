import * as api from './api.js';
import * as ui from './ui.js';
import * as player from './player.js';

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
    document.querySelector('.search-btn')!.addEventListener('click', handleSearch);
    document.getElementById('exploreRadarBtn')!.addEventListener('click', handleExplore);
    document.querySelector('.playlist-btn')!.addEventListener('click', handleParsePlaylist);
    
    // Player controls
    document.getElementById('playBtn')!.addEventListener('click', player.togglePlay);
    document.querySelector('.player-controls .control-btn.small:nth-child(2)')!.addEventListener('click', player.previousSong);
    document.querySelector('.player-controls .control-btn.small:nth-child(4)')!.addEventListener('click', player.nextSong);
    document.getElementById('playModeBtn')!.addEventListener('click', player.togglePlayMode);
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
        ui.displaySearchResults(songs, 'searchResults', songs);
    } catch (error) {
        console.error('Search failed:', error);
        ui.showError('搜索失败，请稍后重试', 'searchResults');
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
