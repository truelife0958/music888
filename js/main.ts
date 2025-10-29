// Generated file
// CSS导入 - Vite需要显式引入CSS文件
import '../css/style.css';
import '../css/additions.css';
import '../css/discover.css';

import * as api from './api.js';
import * as ui from './ui.js';
import * as player from './player.js';
import { debounce, renderPlaylistItem, renderEmptyState } from './utils.js';
import { initializeEnhancements } from './main-enhancements.js';
import * as uiEnhancements from './ui-enhancements.js';
import { initSettings } from './settings.js';
import { initKeyboardShortcuts } from './keyboard-shortcuts.js';
import { initSleepTimer } from './sleep-timer.js';
import { initSearchHistory, addSearchHistory } from './search-history.js';
import { initPlaybackRate } from './playback-rate.js';
import { initQualitySelector } from './quality-selector.js';
import { initAutoTheme } from './auto-theme.js';
import { initDailyRecommend } from './daily-recommend.js';
import { initPWAEnhanced } from './pwa-enhanced.js';
import * as discover from './discover.js';
import * as recommend from './recommend.js';
import * as podcast from './podcast.js';

// --- Tab Switching Logic ---
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

function initializeApp(): void {
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

    // 探索雷达按钮事件监听 - 增强错误处理
    const exploreRadarBtn = document.getElementById('exploreRadarBtn');
    if (exploreRadarBtn) {
        exploreRadarBtn.addEventListener('click', async () => {
                        try {
                await handleExplore();
            } catch (error) {
                                ui.showError('探索雷达功能暂时不可用，请稍后重试', 'searchResults');
            }
        });
    } else {
            }

    // 榜单平台选择器事件监听
    const chartSourceSelect = document.getElementById('chartSourceSelect');
    if (chartSourceSelect) {
        chartSourceSelect.addEventListener('change', async () => {
            const selectedSource = (chartSourceSelect as HTMLSelectElement).value;
                        // 重新加载当前展开的榜单
            const expandedHeader = document.querySelector('.chart-header[data-expanded="true"]');
            if (expandedHeader) {
                const chartType = (expandedHeader as HTMLElement).dataset.chart as 'soar' | 'new' | 'hot';
                const chartList = document.getElementById(`${chartType}Chart`);

                if (chartList) {
                    try {
                        ui.showLoading(`${chartType}Chart`);
                        const songs = await api.getChartList(chartType);
                        uiEnhancements.displayChartResults(songs, `${chartType}Chart`);
                        ui.showNotification(`已切换到${selectedSource === 'netease' ? '网易云音乐' : 'QQ音乐'}榜单`, 'success');
                    } catch (error) {
                                                uiEnhancements.showError('加载榜单失败，请稍后重试', `${chartType}Chart`);
                    }
                }
            }
        });
    }

    document.querySelector('.playlist-btn')!.addEventListener('click', handleParsePlaylist);
    
    // Player controls
    document.getElementById('playBtn')!.addEventListener('click', player.togglePlay);
    document.querySelector('.player-controls .control-btn.small:nth-child(3)')!.addEventListener('click', player.previousSong);
    document.querySelector('.player-controls .control-btn.small:nth-child(5)')!.addEventListener('click', player.nextSong);
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
    switchTab('search');

    // 初始化发现音乐功能
    initDiscoverToggles();
    
    // 初始化保存的标签功能
    initSavedTabToggles();

    // 加载并显示播放历史和收藏
    updatePlayHistoryDisplay();
    updateFavoritesDisplay();
    updateMyHistoryDisplay();
    updateMyFavoritesDisplay();

    // 监听收藏变化
    window.addEventListener('favoritesUpdated', () => {
        updateFavoritesDisplay();
        updateMyFavoritesDisplay();
    });

    // 初始化所有增强功能
    initializeEnhancements();

    // 初始化设置面板 - 老王的新功能
    initSettings();

    // 初始化键盘快捷键
    initKeyboardShortcuts();

    // 初始化定时关闭
    initSleepTimer();

    // 初始化搜索历史
    initSearchHistory();

    // 初始化倍速播放
    initPlaybackRate();

    // 初始化音质选择器
    initQualitySelector();

    // 初始化自动主题切换
    initAutoTheme();

    // 初始化每日推荐
    initDailyRecommend();

    // 初始化PWA增强
    initPWAEnhanced();

    // 初始化新增模块
    initNewFeatures();
}

// 初始化新增的三大功能模块
function initNewFeatures(): void {
    // 监听discover模块的事件
    document.addEventListener('playPlaylist', ((e: CustomEvent) => {
        const songs = e.detail.songs;
        ui.displaySearchResults(songs, 'searchResults', songs);
        ui.showNotification(`已加载歌单，共${songs.length}首歌曲`, 'success');
        switchTab('search');
    }) as EventListener);

    document.addEventListener('showPlaylistDetail', ((e: CustomEvent) => {
        const playlistId = e.detail.id;
        ui.showNotification(`正在加载歌单详情...`, 'info');
        // 这里可以调用API获取歌单详情
    }) as EventListener);

    document.addEventListener('playSong', ((e: CustomEvent) => {
        const { song, songs } = e.detail;
        const index = songs.findIndex((s: any) => s.id === song.id);
        if (index !== -1) {
            player.playSong(index, songs, 'searchResults');
        }
    }) as EventListener);

    // 监听recommend模块的事件
    document.addEventListener('playAll', ((e: CustomEvent) => {
        const songs = e.detail.songs;
        ui.displaySearchResults(songs, 'searchResults', songs);
        ui.showNotification(`已加载推荐歌曲，共${songs.length}首`, 'success');
        switchTab('search');
        if (songs.length > 0) {
            player.playSong(0, songs, 'searchResults');
        }
    }) as EventListener);

    document.addEventListener('openPlaylist', ((e: CustomEvent) => {
        const playlistId = e.detail.id;
        ui.showNotification(`正在加载歌单...`, 'info');
    }) as EventListener);

    document.addEventListener('playMV', ((e: CustomEvent) => {
        const mvId = e.detail.id;
        ui.showNotification(`MV功能开发中...`, 'info');
    }) as EventListener);

    // 监听podcast模块的事件
    document.addEventListener('openRadio', ((e: CustomEvent) => {
        const radioId = e.detail.id;
        ui.showNotification(`正在加载电台...`, 'info');
    }) as EventListener);

    document.addEventListener('playProgram', ((e: CustomEvent) => {
        const programId = e.detail.id;
        ui.showNotification(`正在加载节目...`, 'info');
    }) as EventListener);

    // 初始化导航按钮的切换逻辑
    initDiscoverNavigation();
}

// 初始化发现音乐的导航切换
function initDiscoverNavigation(): void {
    const navButtons = document.querySelectorAll('.discover-nav-btn');
    const featureAreas = document.querySelectorAll('.discover-feature-area');
    
    // 记录每个功能区域是否已初始化
    const initialized: { [key: string]: boolean } = {};

    navButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const feature = (button as HTMLElement).dataset.feature;
            if (!feature) return;

            // 切换导航按钮的激活状态
            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // 切换功能区域的显示状态
            featureAreas.forEach(area => {
                const areaFeature = (area as HTMLElement).dataset.feature;
                if (areaFeature === feature) {
                    (area as HTMLElement).style.display = 'block';
                } else {
                    (area as HTMLElement).style.display = 'none';
                }
            });

            // 首次加载时初始化内容
            if (!initialized[feature]) {
                initialized[feature] = true;
                
                try {
                    switch (feature) {
                        case 'playlists':
                            // 加载推荐歌单
                            await discover.renderRecommendPlaylists('recommendPlaylistsGrid', 12);
                            break;
                            
                        case 'newsongs':
                            // 创建新歌速递筛选器并加载默认内容
                            discover.createNewSongFilter('newSongsFilter', async (type: number) => {
                                await discover.renderNewSongs('newSongsGrid', type);
                            });
                            await discover.renderNewSongs('newSongsGrid', 0);
                            break;
                            
                        case 'toplists':
                            // 加载排行榜
                            await discover.renderTopLists('toplistsGrid');
                            break;
                            
                        case 'daily':
                            // 加载每日推荐
                            await recommend.renderDailyRecommend('dailyRecommendContent');
                            break;
                            
                        case 'podcast':
                            // 加载播客电台
                            await podcast.renderRadioCategories('podcastCategories', async (id: number, name: string) => {
                                if (id === 0) {
                                    // 推荐
                                    await podcast.renderRecommendRadios('podcastRecommend');
                                } else {
                                    // 按分类加载热门电台
                                    await podcast.renderHotRadios('podcastRecommend', id);
                                }
                            });
                            await podcast.renderRecommendRadios('podcastRecommend');
                            break;
                    }
                } catch (error) {
                    console.error(`加载${feature}失败:`, error);
                    ui.showNotification('加载失败，请稍后重试', 'error');
                }
            }
        });
    });

    // 默认激活第一个按钮（推荐歌单）
    if (navButtons.length > 0) {
        (navButtons[0] as HTMLElement).click();
    }
}

// 初始化发现音乐折叠/展开功能
function initDiscoverToggles(): void {
    // 发现音乐主区域折叠展开
    document.querySelectorAll('.discover-header').forEach(header => {
        header.addEventListener('click', async () => {
            const section = (header as HTMLElement).dataset.section;
            const contentId = section === 'albums' ? 'hotAlbums' : 'hotSongs';
            const content = document.getElementById(contentId);
            const toggleIcon = header.querySelector('.toggle-icon');
            const isExpanded = header.getAttribute('data-expanded') === 'true';

            if (!isExpanded) {
                // 展开
                if (content) content.style.display = 'block';
                header.setAttribute('data-expanded', 'true');
                toggleIcon?.classList.remove('fa-chevron-down');
                toggleIcon?.classList.add('fa-chevron-up');
            } else {
                // 折叠
                if (content) content.style.display = 'none';
                header.setAttribute('data-expanded', 'false');
                toggleIcon?.classList.remove('fa-chevron-up');
                toggleIcon?.classList.add('fa-chevron-down');
            }
        });
    });

    // 平台折叠展开
    document.querySelectorAll('.platform-header').forEach(header => {
        header.addEventListener('click', async () => {
            const platform = (header as HTMLElement).dataset.platform;
            const type = (header as HTMLElement).dataset.type;
            const contentId = `${platform}${type === 'albums' ? 'Albums' : 'Songs'}`;
            const content = document.getElementById(contentId);
            const toggleIcon = header.querySelector('.platform-toggle');
            const isExpanded = header.classList.contains('expanded');

            if (!isExpanded) {
                // 展开并加载数据
                try {
                    if (content) {
                        content.style.display = 'block';
                        content.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><div>加载中...</div></div>';
                    }
                    
                    header.classList.add('expanded');
                    toggleIcon?.classList.add('fa-rotate-90');

                    if (type === 'albums') {
                        await loadHotAlbums(platform!, contentId);
                    } else {
                        await loadHotSongs(platform!, contentId);
                    }
                } catch (error) {
                                        if (content) {
                        content.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><div>加载失败，请稍后重试</div></div>';
                    }
                }
            } else {
                // 折叠
                if (content) content.style.display = 'none';
                header.classList.remove('expanded');
                toggleIcon?.classList.remove('fa-rotate-90');
            }
        });
    });
}

// 加载热门专辑
async function loadHotAlbums(platform: string, containerId: string): Promise<void> {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
        // 使用热门榜单数据模拟专辑
        const songs = await api.getHotSongs(platform as 'netease' | 'tencent' | 'kugou' | 'bilibili', 20);
        
        // 按专辑分组
        const albumMap = new Map<string, any>();
        songs.forEach(song => {
            const albumKey = `${song.album}_${Array.isArray(song.artist) ? song.artist[0] : song.artist}`;
            if (!albumMap.has(albumKey)) {
                albumMap.set(albumKey, {
                    name: song.album,
                    artist: Array.isArray(song.artist) ? song.artist.join(' / ') : song.artist,
                    cover: song.pic_id || '',
                    songs: []
                });
            }
            albumMap.get(albumKey).songs.push(song);
        });

        const albums = Array.from(albumMap.values()).slice(0, 10);

        if (albums.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-compact-disc"></i><div>暂无专辑数据</div></div>';
            return;
        }

        container.innerHTML = albums.map((album, index) => `
            <div class="album-item" data-album-index="${index}">
                <img class="album-cover" src="${album.cover || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHJ4PSI4Ii8+CjxwYXRoIGQ9Ik0zMCAyMEwzNSAzMEgzMlYzOEgyOFYzMEgyNUwzMCAyMFoiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4zKSIvPgo8L3N2Zz4='}" alt="${album.name}">
                <div class="album-info">
                    <div class="album-name" title="${album.name}">${album.name}</div>
                    <div class="album-artist">${album.artist} · ${album.songs.length}首</div>
                </div>
            </div>
        `).join('');

        // 使用事件委托绑定点击事件 - 更可靠
        container.onclick = (e) => {
            const albumItem = (e.target as HTMLElement).closest('.album-item');
            if (albumItem) {
                e.preventDefault();
                e.stopPropagation();
                const index = parseInt(albumItem.getAttribute('data-album-index') || '0');
                const album = albums[index];
                ui.displaySearchResults(album.songs, 'searchResults', album.songs);
                ui.showNotification(`已加载专辑《${album.name}》，共${album.songs.length}首歌曲`, 'success');
                switchTab('search');
            }
        };

    } catch (error) {
                container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><div>加载失败，请稍后重试</div></div>';
    }
}

// 加载热门歌曲
async function loadHotSongs(platform: string, containerId: string): Promise<void> {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
        const songs = await api.getHotSongs(platform as 'netease' | 'tencent' | 'kugou' | 'bilibili', 30);

        if (songs.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-fire"></i><div>暂无歌曲数据</div></div>';
            return;
        }

        container.innerHTML = songs.map((song, index) => `
            <div class="discover-song-item" data-song-index="${index}">
                <div class="discover-song-index">${(index + 1).toString().padStart(2, '0')}</div>
                <div class="discover-song-info">
                    <div class="discover-song-name" title="${song.name}">${song.name}</div>
                    <div class="discover-song-artist">${Array.isArray(song.artist) ? song.artist.join(' / ') : song.artist}</div>
                </div>
            </div>
        `).join('');

        // 使用事件委托绑定点击事件 - 更可靠
        container.onclick = (e) => {
            const songItem = (e.target as HTMLElement).closest('.discover-song-item');
            if (songItem) {
                e.preventDefault();
                e.stopPropagation();
                const index = parseInt(songItem.getAttribute('data-song-index') || '0');
                player.playSong(index, songs, containerId);
            }
        };

    } catch (error) {
                container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><div>加载失败，请稍后重试</div></div>';
    }
}

// 初始化"我的歌单"标签的折叠/展开功能
function initSavedTabToggles(): void {
    // savedTab中的播放历史折叠/展开
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

    // savedTab中的我的喜欢折叠/展开
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

    // 我的区域中的播放历史折叠/展开
    const myHistoryHeader = document.getElementById('myHistoryHeader');
    const myHistoryList = document.getElementById('myPlayHistoryList');
    const myHistoryToggleIcon = document.getElementById('myHistoryToggleIcon');

    myHistoryHeader?.addEventListener('click', () => {
        const isHidden = myHistoryList?.style.display === 'none';
        if (myHistoryList) {
            myHistoryList.style.display = isHidden ? 'block' : 'none';
        }
        if (myHistoryToggleIcon) {
            myHistoryToggleIcon.className = isHidden ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
        }
    });

    // 我的区域中的我的喜欢折叠/展开
    const myFavoritesHeader = document.getElementById('myFavoritesHeader');
    const myFavoritesList = document.getElementById('myFavoritesList');
    const myFavoritesToggleIcon = document.getElementById('myFavoritesToggleIcon');

    myFavoritesHeader?.addEventListener('click', () => {
        const isHidden = myFavoritesList?.style.display === 'none';
        if (myFavoritesList) {
            myFavoritesList.style.display = isHidden ? 'block' : 'none';
        }
        if (myFavoritesToggleIcon) {
            myFavoritesToggleIcon.className = isHidden ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
        }
    });

    // 我保存的歌单折叠/展开（在"我的"标签页中）
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

    // 我保存的歌单折叠/展开（在"解析歌单"标签页中）
    const savedPlaylistsHeader = document.getElementById('savedPlaylistsHeader');
    const savedPlaylistsListInParse = document.getElementById('savedPlaylistsListInParse');
    const savedPlaylistsToggleIcon = document.getElementById('savedPlaylistsToggleIcon');

    savedPlaylistsHeader?.addEventListener('click', () => {
        const isHidden = savedPlaylistsListInParse?.style.display === 'none';
        if (savedPlaylistsListInParse) {
            savedPlaylistsListInParse.style.display = isHidden ? 'block' : 'none';
        }
        if (savedPlaylistsToggleIcon) {
            savedPlaylistsToggleIcon.className = isHidden ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
        }
    });

    // 清空播放历史（savedTab）
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // 防止触发父元素的折叠事件
            if (confirm('确定要清空播放历史吗?')) {
                player.clearPlayHistory();
                updatePlayHistoryDisplay();
                updateMyHistoryDisplay();
                ui.showNotification('播放历史已清空', 'success');
            }
        });
    }

    // 清空播放历史（我的区域）
    const myClearHistoryBtn = document.getElementById('myClearHistoryBtn');
    if (myClearHistoryBtn) {
        myClearHistoryBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('确定要清空播放历史吗?')) {
                player.clearPlayHistory();
                updatePlayHistoryDisplay();
                updateMyHistoryDisplay();
                ui.showNotification('播放历史已清空', 'success');
            }
        });
    }

    // 清空收藏（savedTab）
    const clearFavoritesBtn = document.getElementById('clearFavoritesBtn');
    if (clearFavoritesBtn) {
        clearFavoritesBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('确定要清空收藏列表吗?')) {
                player.clearFavorites();
                updateFavoritesDisplay();
                updateMyFavoritesDisplay();
                ui.showNotification('收藏列表已清空', 'success');
            }
        });
    }

    // 清空收藏（我的区域）
    const myClearFavoritesBtn = document.getElementById('myClearFavoritesBtn');
    if (myClearFavoritesBtn) {
        myClearFavoritesBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('确定要清空收藏列表吗?')) {
                player.clearFavorites();
                updateFavoritesDisplay();
                updateMyFavoritesDisplay();
                ui.showNotification('收藏列表已清空', 'success');
            }
        });
    }
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
    if (playlistItem) {
        playlistItem.addEventListener('click', (e) => {
            e.stopPropagation(); // 防止触发父元素事件
            ui.displaySearchResults(history, 'savedResults', history);
            ui.showNotification(`已加载播放历史 (${history.length}首)`, 'success');
        });
    }
}

// 更新收藏显示（savedTab）
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
    if (playlistItem) {
        playlistItem.addEventListener('click', (e) => {
            e.stopPropagation();
            ui.displaySearchResults(favorites, 'savedResults', favorites);
            ui.showNotification(`已加载我的喜欢 (${favorites.length}首)`, 'success');
        });
    }
}

// 更新我的区域的播放历史显示
function updateMyHistoryDisplay(): void {
    const myHistoryList = document.getElementById('myPlayHistoryList');
    if (!myHistoryList) return;

    const history = player.getPlayHistory();

    if (history.length === 0) {
        myHistoryList.innerHTML = renderEmptyState('fas fa-history', '暂无播放记录');
        return;
    }

    myHistoryList.innerHTML = renderPlaylistItem('播放历史', history.length, 'fas fa-history', '#1db954');

    const playlistItem = myHistoryList.querySelector('.mini-playlist-item');
    if (playlistItem) {
        playlistItem.addEventListener('click', (e) => {
            e.stopPropagation();
            ui.displaySearchResults(history, 'myResults', history);
            ui.showNotification(`已加载播放历史 (${history.length}首)`, 'success');
        });
    }
}

// 更新我的区域的收藏显示
function updateMyFavoritesDisplay(): void {
    const myFavoritesList = document.getElementById('myFavoritesList');
    if (!myFavoritesList) return;

    const favorites = player.getFavoriteSongs();

    if (favorites.length === 0) {
        myFavoritesList.innerHTML = renderEmptyState(
            'fas fa-heart',
            '暂无收藏歌曲',
            '点击播放器的爱心按钮收藏歌曲'
        );
        return;
    }

    myFavoritesList.innerHTML = renderPlaylistItem('我的喜欢', favorites.length, 'fas fa-heart', '#ff6b6b');

    const playlistItem = myFavoritesList.querySelector('.mini-playlist-item');
    if (playlistItem) {
        playlistItem.addEventListener('click', (e) => {
            e.stopPropagation();
            ui.displaySearchResults(favorites, 'myResults', favorites);
            ui.showNotification(`已加载我的喜欢 (${favorites.length}首)`, 'success');
        });
    }
}

async function handleSearch(): Promise<void> {
    const keyword = (document.getElementById('searchInput') as HTMLInputElement).value;
    const source = (document.getElementById('sourceSelect') as HTMLSelectElement).value;
    if (!keyword.trim()) {
        ui.showNotification('请输入搜索关键词', 'warning');
        return;
    }
    
    // 添加到搜索历史
    addSearchHistory(keyword);
    
    ui.showLoading('searchResults');

    // 老王的智能搜索逻辑 - 一个源没结果就试试其他源
    const sourcesToTry = [source, 'netease', 'tencent', 'kugou', 'kuwo'];
    const uniqueSources = [...new Set(sourcesToTry)]; // 去重

    for (const trySource of uniqueSources) {
        try {
                        const songs = await api.searchMusicAPI(keyword, trySource);

            if (songs.length > 0) {
                ui.displaySearchResults(songs, 'searchResults', songs);
                const sourceName = getSourceName(trySource);
                ui.showNotification(`找到 ${songs.length} 首歌曲 (来源: ${sourceName})`, 'success');
                return; // 找到结果就返回
            } else {
                            }
        } catch (error) {
                        // 继续尝试下一个音乐源
        }
    }

    // 所有音乐源都没结果
    ui.showError('所有音乐平台都未找到相关歌曲，请尝试其他关键词', 'searchResults');
    ui.showNotification('未找到相关歌曲', 'warning');
}

// 获取音乐源名称 - 老王的辅助函数
function getSourceName(source: string): string {
    const sourceNames: { [key: string]: string } = {
        'netease': '网易云音乐',
        'tencent': 'QQ音乐',
        'kugou': '酷狗音乐',
        'kuwo': '酷我音乐',
        'xiami': '虾米音乐',
        'baidu': '百度音乐',
        'bilibili': 'Bilibili音乐',
    };
    return sourceNames[source] || source;
}

async function handleExplore(): Promise<void> {
    ui.showLoading('searchResults');
    try {
        const songs = await api.exploreRadarAPI();
        ui.displaySearchResults(songs, 'searchResults', songs);
    } catch (error) {
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
                ui.showError('随机播放失败，请稍后重试', 'searchResults');
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
        
        // 使用增强UI显示歌单（带多选功能）
        const uiEnhancements = await import('./ui-enhancements.js');
        uiEnhancements.displaySearchResultsWithSelection(playlist.songs, 'parseResults', playlist.songs);

        // 显示成功解析的歌单信息
        if (playlist.name) {
            const sourceName = playlistSourceSelect === 'netease' ? '网易云音乐' : 'QQ音乐';
            ui.showNotification(`成功从${sourceName}解析歌单《${playlist.name}》，共 ${playlist.count || 0} 首歌曲`, 'success');
        }
    } catch (error) {
                // 显示详细的错误信息
        let errorMessage = '解析歌单失败';
        if (error instanceof Error) {
            errorMessage = error.message;
        }

        ui.showError(errorMessage, 'parseResults');
        ui.showNotification(errorMessage, 'error');
    }
}

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
}

// 启动应用
initializeApp();
