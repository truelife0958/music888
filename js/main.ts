// Generated file
// CSS导入 - Vite需要显式引入CSS文件
import '../css/style.css';
import '../css/additions.css';
import '../css/discover.css';
import '../css/features.css';

import * as api from './api.js';

// 防止重复初始化的标志 - 移除，改用更精细的控制
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
import { initPWAEnhanced } from './pwa-enhanced.js';
import * as discover from './discover.js';
import * as recommend from './recommend.js';
import * as podcast from './podcast.js';
import * as artists from './artists.js';

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
    // 老王修复：先初始化播放器，确保audio元素正确连接
    player.init();
    api.findWorkingAPI().then(result => {
        if (result.success) {
            ui.showNotification(`已连接到 ${result.name}`, 'success');
        } else {
            ui.showNotification('所有 API 均不可用，请稍后重试', 'error');
        }
    });
    player.loadSavedPlaylists();

    // --- Event Listeners ---
    // 注意：搜索按钮和输入框的事件绑定由 initializeEnhancements() 处理
    // 这样可以避免事件被覆盖的问题

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

    // 初始化保存的标签功能
    initSavedTabToggles();

    // 加载并显示播放历史和收藏（只在"我的"区域）
    updateMyHistoryDisplay();
    updateMyFavoritesDisplay();

    // 监听收藏变化
    window.addEventListener('favoritesUpdated', () => {
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

    // 初始化PWA增强
    initPWAEnhanced();

    // 初始化新增模块
    initNewFeatures();
    
    // 初始化优化功能模块
    initOptimizationFeatures();
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

    // 监听artists模块的事件
    document.addEventListener('openArtist', ((e: CustomEvent) => {
        const artistId = e.detail.id;
        ui.showNotification(`正在加载歌手详情...`, 'info');
        // 这里可以打开歌手详情弹窗或跳转到详情页
    }) as EventListener);

    // 初始化导航按钮的切换逻辑
    initDiscoverNavigation();
}

// 初始化优化功能模块（歌词、均衡器、可视化器）
async function initOptimizationFeatures(): Promise<void> {
    // 歌词按钮事件
    const lyricsBtn = document.getElementById('lyricsBtn');
    if (lyricsBtn) {
        lyricsBtn.addEventListener('click', () => {
            const lyricsPanel = document.getElementById('lyricsPanel');
            if (lyricsPanel) {
                lyricsPanel.classList.toggle('hidden');
            }
        });
    }
    
    // 歌词关闭按钮
    const lyricsCloseBtn = document.getElementById('lyricsCloseBtn');
    if (lyricsCloseBtn) {
        lyricsCloseBtn.addEventListener('click', () => {
            const lyricsPanel = document.getElementById('lyricsPanel');
            if (lyricsPanel) {
                lyricsPanel.classList.add('hidden');
            }
        });
    }
    
    // 均衡器按钮事件 (功能开发中)
    const equalizerBtn = document.getElementById('equalizerBtn');
    if (equalizerBtn) {
        equalizerBtn.addEventListener('click', async () => {
            ui.showNotification('均衡器功能开发中，敬请期待', 'info');
            /* 功能开发中 - 待实现
            const equalizerPanel = document.getElementById('equalizerPanel');
            if (equalizerPanel) {
                equalizerPanel.classList.toggle('hidden');
                
                // 首次打开时初始化均衡器
                if (!equalizerPanel.classList.contains('hidden') &&
                    !equalizerPanel.dataset.initialized) {
                    try {
                        const { Equalizer } = await import('./equalizer.js');
                        const audioElement = document.getElementById('audioPlayer') as HTMLAudioElement;
                        const equalizer = new Equalizer(audioElement);
                        equalizer.initialize();
                        
                        // 创建均衡器频段UI
                        createEqualizerBands(equalizer);
                        
                        // 绑定预设选择器
                        const presetSelect = document.getElementById('equalizerPresetSelect') as HTMLSelectElement;
                        if (presetSelect) {
                            presetSelect.addEventListener('change', () => {
                                equalizer.applyPreset(presetSelect.value);
                            });
                        }
                        
                        // 绑定主增益滑块
                        const masterGainSlider = document.getElementById('masterGainSlider') as HTMLInputElement;
                        const masterGainValue = document.getElementById('masterGainValue');
                        if (masterGainSlider) {
                            masterGainSlider.addEventListener('input', () => {
                                const gain = parseFloat(masterGainSlider.value);
                                equalizer.setMasterGain(gain);
                                if (masterGainValue) {
                                    masterGainValue.textContent = `${gain.toFixed(1)} dB`;
                                }
                            });
                        }
                        
                        // 绑定启用/禁用开关
                        const equalizerEnabled = document.getElementById('equalizerEnabled') as HTMLInputElement;
                        if (equalizerEnabled) {
                            equalizerEnabled.addEventListener('change', () => {
                                equalizer.setEnabled(equalizerEnabled.checked);
                            });
                        }
                        
                        equalizerPanel.dataset.initialized = 'true';
                        ui.showNotification('均衡器已启动', 'success');
                    } catch (error) {
                        console.error('初始化均衡器失败:', error);
                        ui.showNotification('均衡器启动失败', 'error');
                    }
                }
            }
            */
        });
    }
    
    // 均衡器关闭按钮
    const equalizerCloseBtn = document.getElementById('equalizerCloseBtn');
    if (equalizerCloseBtn) {
        equalizerCloseBtn.addEventListener('click', () => {
            const equalizerPanel = document.getElementById('equalizerPanel');
            if (equalizerPanel) {
                equalizerPanel.classList.add('hidden');
            }
        });
    }
    
    // 可视化器按钮事件 (功能开发中)
    const visualizerBtn = document.getElementById('visualizerBtn');
    if (visualizerBtn) {
        visualizerBtn.addEventListener('click', async () => {
            ui.showNotification('可视化器功能开发中，敬请期待', 'info');
            /* 功能开发中 - 待实现
            const visualizerCanvas = document.getElementById('visualizerCanvas') as HTMLCanvasElement;
            const visualizerControls = document.getElementById('visualizerControls');
            
            if (visualizerCanvas && visualizerControls) {
                const isHidden = visualizerCanvas.classList.contains('hidden');
                
                if (isHidden) {
                    visualizerCanvas.classList.remove('hidden');
                    visualizerControls.classList.remove('hidden');
                    
                    // 首次打开时初始化可视化器
                    if (!visualizerCanvas.dataset.initialized) {
                        try {
                            const { AudioVisualizer } = await import('./visualizer.js');
                            const audioElement = document.getElementById('audioPlayer') as HTMLAudioElement;
                            const visualizer = new AudioVisualizer(audioElement, 'visualizerCanvas');
                            visualizer.start();
                            
                            // 绑定类型选择器
                            const typeSelect = document.getElementById('visualizerTypeSelect') as HTMLSelectElement;
                            if (typeSelect) {
                                typeSelect.addEventListener('change', () => {
                                    visualizer.setType(typeSelect.value as any);
                                });
                            }
                            
                            // 保存实例以便后续使用
                            (window as any).audioVisualizer = visualizer;
                            
                            visualizerCanvas.dataset.initialized = 'true';
                            ui.showNotification('音频可视化已启动', 'success');
                        } catch (error) {
                            console.error('初始化可视化器失败:', error);
                            ui.showNotification('可视化器启动失败', 'error');
                        }
                    } else {
                        // 如果已初始化，恢复播放
                        const visualizer = (window as any).audioVisualizer;
                        if (visualizer) {
                            visualizer.start();
                        }
                    }
                } else {
                    visualizerCanvas.classList.add('hidden');
                    visualizerControls.classList.add('hidden');
                    
                    // 停止可视化
                    const visualizer = (window as any).audioVisualizer;
                    if (visualizer) {
                        visualizer.stop();
                    }
                }
            }
            */
        });
    }
    
    // 可视化器关闭按钮
    const visualizerCloseBtn = document.getElementById('visualizerCloseBtn');
    if (visualizerCloseBtn) {
        visualizerCloseBtn.addEventListener('click', () => {
            const visualizerCanvas = document.getElementById('visualizerCanvas');
            const visualizerControls = document.getElementById('visualizerControls');
            
            if (visualizerCanvas) visualizerCanvas.classList.add('hidden');
            if (visualizerControls) visualizerControls.classList.add('hidden');
            
            const visualizer = (window as any).audioVisualizer;
            if (visualizer) {
                visualizer.stop();
            }
        });
    }
}

// 创建均衡器频段UI
function createEqualizerBands(equalizer: any): void {
    const container = document.getElementById('equalizerBands');
    if (!container) return;
    
    const frequencies = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
    container.innerHTML = '';
    
    frequencies.forEach((freq, index) => {
        const band = document.createElement('div');
        band.className = 'equalizer-band';
        
        const label = document.createElement('label');
        label.textContent = freq >= 1000 ? `${freq/1000}k` : `${freq}`;
        
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = '-12';
        slider.max = '12';
        slider.step = '0.1';
        slider.value = '0';
        
        const value = document.createElement('span');
        value.className = 'band-value';
        value.textContent = '0';
        
        slider.addEventListener('input', () => {
            const gain = parseFloat(slider.value);
            equalizer.setBand(index, gain);
            value.textContent = gain.toFixed(1);
        });
        
        band.appendChild(label);
        band.appendChild(slider);
        band.appendChild(value);
        container.appendChild(band);
    });
}

// 初始化发现音乐 - 现在只有排行榜
function initDiscoverNavigation(): void {
    // 发现音乐标签页现在只显示排行榜，直接加载
    const discoverTab = document.getElementById('discoverTab');
    if (discoverTab) {
        // 监听标签切换，当切换到发现音乐时加载排行榜
        let toplistsLoaded = false;
        
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const tab = (btn as HTMLElement).dataset.tab;
                if (tab === 'discover' && !toplistsLoaded) {
                    toplistsLoaded = true;
                    try {
                        await discover.renderTopLists('toplistsGrid');
                    } catch (error) {
                        console.error('加载排行榜失败:', error);
                        ui.showNotification('加载失败，请稍后重试', 'error');
                    }
                }
            });
        });
    }
    
    // 在搜索结果标签页添加推荐音乐和探索雷达按钮
    const recommendMusicBtn = document.getElementById('recommendMusicBtn');
    if (recommendMusicBtn) {
        recommendMusicBtn.addEventListener('click', async () => {
            try {
                ui.showLoading('searchResults');
                const playlists = await discover.getRecommendPlaylists(50);
                
                // 将推荐歌单转换为歌曲格式（符合Song接口）
                const songs = playlists.map(playlist => ({
                    id: String(playlist.id),
                    name: playlist.name,
                    title: playlist.name,
                    artist: [playlist.creator.nickname],
                    album: playlist.description || '',
                    pic: playlist.coverImgUrl,
                    pic_id: '',
                    lyric_id: '',
                    duration: 0,
                    source: 'netease'
                })) as any[];
                
                // 使用带批量操作的渲染函数
                uiEnhancements.renderSongListWithBatchOps(songs, 'searchResults', {
                    showCover: true,
                    showAlbum: true,
                    playlistForPlayback: songs
                });
                ui.showNotification(`已加载推荐音乐，共 ${songs.length} 首`, 'success');
            } catch (error) {
                console.error('加载推荐音乐失败:', error);
                ui.showError('加载推荐音乐失败，请稍后重试', 'searchResults');
            }
        });
    }
    
    const exploreRadarBtn = document.getElementById('exploreRadarBtn');
    if (exploreRadarBtn) {
        exploreRadarBtn.addEventListener('click', async () => {
            try {
                ui.showLoading('searchResults');
                const songs = await discover.renderRadarSongs('searchResults', 100);
                if (songs.length > 0) {
                    ui.showNotification(`已加载探索雷达，共 ${songs.length} 首热门歌曲`, 'success');
                }
            } catch (error) {
                console.error('加载探索雷达失败:', error);
                ui.showError('加载探索雷达失败，请稍后重试', 'searchResults');
            }
        });
    }
}

// 初始化"我的"区域的折叠/展开功能
function initSavedTabToggles(): void {
    // "我的"区域的播放历史和我的喜欢已移除折叠功能，只保留标题和清空按钮

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

    // 清空播放历史（我的区域）
    const myClearHistoryBtn = document.getElementById('myClearHistoryBtn');
    if (myClearHistoryBtn) {
        myClearHistoryBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('确定要清空播放历史吗?')) {
                player.clearPlayHistory();
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
                updateMyFavoritesDisplay();
                ui.showNotification('收藏列表已清空', 'success');
            }
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
            // 使用带批量操作的渲染函数
            uiEnhancements.renderSongListWithBatchOps(history, 'myResults', {
                showCover: true,
                showAlbum: true,
                playlistForPlayback: history
            });
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
            // 使用带批量操作的渲染函数
            uiEnhancements.renderSongListWithBatchOps(favorites, 'myResults', {
                showCover: true,
                showAlbum: true,
                playlistForPlayback: favorites
            });
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

// 移动端页面切换功能 - 支持三屏左右滑动（内容区、播放器、我的）
(window as any).switchMobilePage = function(pageIndex: number): void {
    const sections = [
        document.querySelector('.content-section'),
        document.querySelector('.player-section'),
        document.querySelector('.my-section')
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

    // 添加触摸滑动支持 - 三屏左右滑动（内容区、播放器、我的）
    let touchStartX = 0;
    let touchStartY = 0; // 老王注释：记录Y轴起始位置
    let touchEndX = 0;
    let touchEndY = 0; // 老王注释：记录Y轴结束位置
    let currentPage = 0;
    let isSwipping = false; // 防抖标志
    const mainContainer = document.querySelector('.main-container');

    const handleTouchStart = (e: Event) => {
        if (!isSwipping) {
            touchStartX = (e as TouchEvent).changedTouches[0].screenX;
            touchStartY = (e as TouchEvent).changedTouches[0].screenY; // 老王注释：记录Y轴
        }
    };

    const handleTouchEnd = (e: Event) => {
        if (!isSwipping) {
            touchEndX = (e as TouchEvent).changedTouches[0].screenX;
            touchEndY = (e as TouchEvent).changedTouches[0].screenY; // 老王注释：记录Y轴
            handleSwipe();
        }
    };

    function handleSwipe() {
        if (isSwipping) return;

        const swipeThreshold = 50; // 最小滑动距离
        const diffX = touchStartX - touchEndX;
        const diffY = touchStartY - touchEndY; // 老王注释：计算Y轴滑动距离

        // 老王注释：只有当X轴滑动距离大于Y轴，且超过阈值时，才触发页面切换
        // 这样上下滚动时就不会误触发左右切换了
        if (Math.abs(diffX) > swipeThreshold && Math.abs(diffX) > Math.abs(diffY)) {
            isSwipping = true;

            if (diffX > 0 && currentPage < 2) {
                // 向左滑动 - 下一页（最多到第3页）
                currentPage++;
                (window as any).switchMobilePage(currentPage);
            } else if (diffX < 0 && currentPage > 0) {
                // 向右滑动 - 上一页（最少到第1页）
                currentPage--;
                (window as any).switchMobilePage(currentPage);
            }

            // 300ms后重置防抖标志
            setTimeout(() => {
                isSwipping = false;
            }, 300);
        }
    }

    if (mainContainer) {
        // 老王修复：使用passive选项优化滚动性能
        mainContainer.addEventListener('touchstart', handleTouchStart, { passive: true });
        mainContainer.addEventListener('touchend', handleTouchEnd, { passive: true });

        // 老王修复：页面可见性变化时重置状态，避免切换标签页后状态错乱
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                isSwipping = false;
            }
        });

        // 页面卸载时清理事件监听器，防止内存泄漏
        window.addEventListener('beforeunload', () => {
            mainContainer.removeEventListener('touchstart', handleTouchStart);
            mainContainer.removeEventListener('touchend', handleTouchEnd);
        });
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
