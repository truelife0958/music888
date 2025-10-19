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
