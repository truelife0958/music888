// 简化版音乐播放器 - 只保留核心功能
import '../css/style.css';

import * as api from './api.js';
import * as ui from './ui.js';
import * as player from './player.js';
import { debounce } from './utils.js';
import storageAdapter from './storage-adapter.js';
import { ThemeManager } from './theme-manager.js';
import performanceMonitor from './performance-monitor.js';

// 优化: 使用动态导入实现代码分割，减少初始加载时间
let rankModule: any = null;
let dailyRecommendModule: any = null;
let searchHistoryModule: any = null;
let playStatsModule: any = null;
let imageLazyLoader: any = null;
let downloadProgressManager: any = null;
let discoverModule: any = null;
let themeManager: ThemeManager | null = null;

// 防止重复初始化的全局标志
let appInitialized = false;

// 模块加载状态
const moduleLoadStatus = {
    rank: false,
    dailyRecommend: false,
    searchHistory: false,
    playStats: false,
    imageLoader: false,
    downloadProgress: false,
    discover: false
};

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

    // 按需加载各标签页对应的模块
    if (tabName === 'rank') {
        loadRankModule();
    } else if (tabName === 'discover') {
        loadDiscoverModule();
    } else if (tabName === 'playlist') {
        loadPlaylistModule();
    }
}

async function initializeApp(): Promise<void> {
    if (appInitialized) {
        console.warn('⚠️ 应用已初始化，跳过重复初始化');
        return;
    }
    appInitialized = true;
    console.log('🚀 开始初始化应用...');
    
    // 启动性能监控
    performanceMonitor.init();
    performanceMonitor.mark('app-init-start');
    
    // 优化: 初始化主题管理器
    themeManager = new ThemeManager();
    console.log('✅ 主题系统初始化成功');
    
    // 优化: 初始化存储适配器（IndexedDB）
    try {
        await storageAdapter.initialize();
        console.log('✅ 存储系统初始化成功');
    } catch (error) {
        console.error('❌ 存储系统初始化失败:', error);
    }
    
    ui.init();
    player.init();
    
    // 优化：iOS Safari音频解锁机制
    initIOSAudioUnlock();
    
    // 优化: 延迟初始化非关键模块
    initPerformanceOptimizations();
    
    // 优化: 使用 requestIdleCallback 在浏览器空闲时初始化非关键功能
    if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
            initNonCriticalModules();
        }, { timeout: 2000 });
    } else {
        // 降级方案：使用 setTimeout
        setTimeout(() => {
            initNonCriticalModules();
        }, 100);
    }
    
    // 增强功能：键盘快捷键
    initKeyboardShortcuts();
    
    // 增强功能：动态页面标题
    initDynamicPageTitle();
    
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

    // 搜索功能 - 修复BUG-004: 添加防抖，提升性能
    const searchBtn = document.querySelector('.search-btn');
    const searchInput = document.getElementById('searchInput') as HTMLInputElement;
    const searchForm = document.querySelector('.search-wrapper') as HTMLFormElement;
    
    console.log('🔍 [搜索功能初始化] 元素检查:', {
        searchBtn: searchBtn,
        searchBtnExists: !!searchBtn,
        searchInput: searchInput,
        searchInputExists: !!searchInput,
        searchForm: searchForm,
        searchFormExists: !!searchForm
    });
    
    if (!searchBtn) {
        console.error('❌ 搜索按钮未找到！选择器: .search-btn');
    }
    
    if (!searchInput) {
        console.error('❌ 搜索输入框未找到！选择器: #searchInput');
    }
    
    if (searchBtn && searchInput) {
        console.log('✅ 开始绑定搜索事件监听器...');
        
        // 修复：阻止表单默认提交行为
        if (searchForm) {
            searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                console.log('📝 [表单提交] 触发搜索', e);
                handleSearch();
            });
            console.log('✅ 表单submit事件已绑定');
        }
        
        // 搜索按钮点击
        searchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('🔘 [搜索按钮] 点击触发', e);
            handleSearch();
        });
        console.log('✅ 搜索按钮click事件已绑定');
        
        // 回车键搜索
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                console.log('⌨️ [回车键] 触发搜索', e);
                handleSearch();
            }
        });
        console.log('✅ 回车键事件已绑定');
    } else {
        console.error('❌ 搜索功能初始化失败：缺少必要元素');
    }
    
    // 优化：启用实时搜索防抖，提升用户体验
    const debouncedSearch = debounce(() => {
        if (searchInput && searchInput.value.trim()) {
            console.log('🔍 [防抖搜索] 触发搜索:', searchInput.value);
            handleSearch();
        }
    }, 300); // 300ms防抖延迟
    
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            debouncedSearch();
        });
        console.log('✅ 实时搜索防抖已启用（300ms延迟）');
    }

    // 播放器控制 - 使用ID选择器更安全
    document.getElementById('playBtn')!.addEventListener('click', player.togglePlay);
    document.getElementById('prevBtn')!.addEventListener('click', player.previousSong);
    document.getElementById('nextBtn')!.addEventListener('click', player.nextSong);
    document.getElementById('playModeBtn')!.addEventListener('click', player.togglePlayMode);
    document.getElementById('volumeSlider')!.addEventListener('input', (e) => player.setVolume((e.target as HTMLInputElement).value));
    document.querySelector('.progress-bar')!.addEventListener('click', (e) => player.seekTo(e as MouseEvent));

    // 老王修复：主题切换按钮已删除，不再需要绑定事件

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

    // Tab按钮 - 优化: 按需加载对应模块
    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', async () => {
            const tab = (button as HTMLElement).dataset.tab!;
            
            // 根据tab类型按需加载模块
            if (tab === 'rank' && !moduleLoadStatus.rank) {
                await loadRankModule();
            } else if (tab === 'playlist') {
                await loadPlaylistModule();
            }
            
            switchTab(tab);
        });
    });

    // 歌单解析
    document.querySelector('.playlist-btn')!.addEventListener('click', handleParsePlaylist);

    // 每日推荐按钮
    const dailyRecommendBtn = document.getElementById('dailyRecommendBtn');
    const refreshRecommendBtn = document.getElementById('refreshRecommendBtn');
    
    if (dailyRecommendBtn) {
        dailyRecommendBtn.addEventListener('click', async () => {
            console.log('🔘 每日推荐按钮被点击');
            try {
                await loadDailyRecommendModule();
                if (dailyRecommendModule && dailyRecommendModule.loadDailyRecommendInSearch) {
                    console.log('✅ 开始加载每日推荐...');
                    await dailyRecommendModule.loadDailyRecommendInSearch();
                } else {
                    console.error('❌ 每日推荐模块或函数未找到', dailyRecommendModule);
                }
            } catch (error) {
                console.error('❌ 每日推荐加载失败:', error);
            }
        });
        console.log('✅ 每日推荐按钮事件已绑定');
    } else {
        console.error('❌ 每日推荐按钮未找到');
    }
    
    if (refreshRecommendBtn) {
        refreshRecommendBtn.addEventListener('click', async () => {
            console.log('🔘 刷新推荐按钮被点击');
            try {
                await loadDailyRecommendModule();
                if (dailyRecommendModule && dailyRecommendModule.loadDailyRecommendInSearch) {
                    console.log('✅ 开始刷新推荐...');
                    await dailyRecommendModule.loadDailyRecommendInSearch(true);
                } else {
                    console.error('❌ 每日推荐模块或函数未找到', dailyRecommendModule);
                }
            } catch (error) {
                console.error('❌ 刷新推荐失败:', error);
            }
        });
        console.log('✅ 刷新推荐按钮事件已绑定');
    } else {
        console.error('❌ 刷新推荐按钮未找到');
    }

    // 初始化播放列表弹窗
    initPlaylistModal();

    // 初始tab改为"搜索结果"
    switchTab('search');

    // 移动端页面指示器事件绑定
    initMobilePageIndicators();
    
    // 性能监控：标记应用初始化完成
    performanceMonitor.mark('app-init-end');
    performanceMonitor.measure('app-initialization', 'app-init-start', 'app-init-end');
    
    // 打印性能报告（延迟5秒，确保所有资源加载完成）
    setTimeout(() => {
        performanceMonitor.printReport();
    }, 5000);
}

// 优化: 按需加载非关键模块
async function initNonCriticalModules(): Promise<void> {
    try {
        // 并行加载所有非关键模块
        await Promise.all([
            loadSearchHistoryModule(),
            loadPlayStatsModule()
        ]);
        console.log('✅ 非关键模块加载完成');
    } catch (error) {
        console.error('❌ 非关键模块加载失败:', error);
    }
}

// 优化: 按需加载排行榜模块
async function loadRankModule(): Promise<void> {
    if (moduleLoadStatus.rank) return;

    try {
        console.log('📦 加载排行榜模块...');
        rankModule = await import('./rank.js');
        rankModule.initRank();
        moduleLoadStatus.rank = true;
        console.log('✅ 排行榜模块加载完成');
    } catch (error) {
        console.error('❌ 排行榜模块加载失败:', error);
    }
}

// 优化: 按需加载发现音乐模块
async function loadDiscoverModule(): Promise<void> {
    if (moduleLoadStatus.discover && discoverModule) return;

    try {
        console.log('📦 加载发现音乐模块...');
        discoverModule = await import('./discover.js');
        discoverModule.initDiscover();
        moduleLoadStatus.discover = true;
        console.log('✅ 发现音乐模块加载完成');
    } catch (error) {
        console.error('❌ 发现音乐模块加载失败:', error);
        moduleLoadStatus.discover = false;
        discoverModule = null;
    }
}

// 优化: 按需加载每日推荐模块
async function loadDailyRecommendModule(): Promise<void> {
    if (moduleLoadStatus.dailyRecommend && dailyRecommendModule) return;
    
    try {
        console.log('📦 加载每日推荐模块...');
        dailyRecommendModule = await import('./daily-recommend.js');
        dailyRecommendModule.initDailyRecommend();
        moduleLoadStatus.dailyRecommend = true;
        console.log('✅ 每日推荐模块加载完成');
    } catch (error) {
        console.error('❌ 每日推荐模块加载失败:', error);
        moduleLoadStatus.dailyRecommend = false;
        dailyRecommendModule = null;
    }
}

// 优化: 按需加载搜索历史模块
async function loadSearchHistoryModule(): Promise<void> {
    if (moduleLoadStatus.searchHistory) return;
    
    try {
        console.log('📦 加载搜索历史模块...');
        searchHistoryModule = await import('./search-history.js');
        searchHistoryModule.initSearchHistory();
        moduleLoadStatus.searchHistory = true;
        console.log('✅ 搜索历史模块加载完成');
    } catch (error) {
        console.error('❌ 搜索历史模块加载失败:', error);
    }
}

// 优化: 按需加载播放统计模块
async function loadPlayStatsModule(): Promise<void> {
    if (moduleLoadStatus.playStats) return;

    try {
        console.log('📦 加载播放统计模块...');
        playStatsModule = await import('./play-stats.js');
        playStatsModule.initPlayStats();
        moduleLoadStatus.playStats = true;
        console.log('✅ 播放统计模块加载完成');
    } catch (error) {
        console.error('❌ 播放统计模块加载失败:', error);
    }
}

// 加载歌单模块（热门歌单展示）
async function loadPlaylistModule(): Promise<void> {
    try {
        console.log('📦 加载歌单模块...');
        
        // 加载网易热门歌单
        const hotPlaylistsGrid = document.getElementById('hotPlaylistsGrid');
        if (hotPlaylistsGrid && hotPlaylistsGrid.querySelector('.loading')) {
            await loadHotPlaylists();
        }
        
        console.log('✅ 歌单模块加载完成');
    } catch (error) {
        console.error('❌ 歌单模块加载失败:', error);
    }
}

// 加载网易热门歌单
async function loadHotPlaylists(): Promise<void> {
    const hotPlaylistsGrid = document.getElementById('hotPlaylistsGrid');
    if (!hotPlaylistsGrid) return;

    try {
        // 精选热门歌单ID列表
        const hotPlaylists = [
            { id: '3778678', name: '飙升榜', icon: '🚀' },
            { id: '19723756', name: '热歌榜', icon: '🔥' },
            { id: '3779629', name: '新歌榜', icon: '🆕' },
            { id: '2884035', name: '说唱榜', icon: '🎤' },
            { id: '60198', name: '经典', icon: '🎵' },
            { id: '180106', name: '粤语', icon: '🎤' }
        ];

        hotPlaylistsGrid.innerHTML = hotPlaylists.map(playlist => `
            <div class="hot-playlist-card" data-playlist-id="${playlist.id}" data-playlist-name="${playlist.name}" data-playlist-icon="${playlist.icon}">
                <div class="hot-playlist-icon">${playlist.icon}</div>
                <div class="hot-playlist-name">${playlist.name}</div>
                <div class="hot-playlist-arrow">
                    <i class="fas fa-chevron-right"></i>
                </div>
            </div>
        `).join('');

        // 绑定点击事件
        hotPlaylistsGrid.querySelectorAll('.hot-playlist-card').forEach(card => {
            card.addEventListener('click', async () => {
                const playlistId = (card as HTMLElement).dataset.playlistId;
                const playlistName = (card as HTMLElement).dataset.playlistName || '';
                const playlistIcon = (card as HTMLElement).dataset.playlistIcon || '';

                if (playlistId) {
                    await loadPlaylistDetail(playlistId, playlistName, playlistIcon);
                }
            });
        });

        console.log('✅ 热门歌单加载完成');
    } catch (error) {
        console.error('❌ 加载热门歌单失败:', error);
        if (hotPlaylistsGrid) {
            hotPlaylistsGrid.innerHTML = '<div class="error">加载失败，请重试</div>';
        }
    }
}

// 加载歌单详情
async function loadPlaylistDetail(playlistId: string, playlistName: string, playlistIcon: string): Promise<void> {
    const parseResults = document.getElementById('parseResults');
    const hotPlaylistsSection = document.getElementById('hotPlaylistsSection');

    if (!parseResults || !hotPlaylistsSection) return;

    try {
        // 隐藏热门歌单区域，显示解析结果
        hotPlaylistsSection.style.display = 'none';
        parseResults.style.display = 'block';

        ui.showLoading('parseResults');

        const playlist = await api.parsePlaylistAPI(playlistId, 'netease');

        // 创建详细的歌单视图，包含返回按钮
        parseResults.innerHTML = `
            <div class="playlist-detail-header">
                <button class="back-btn" id="playlistBackBtn" title="返回歌单列表">
                    <i class="fas fa-arrow-left"></i> 返回
                </button>
                <div class="playlist-detail-info">
                    <h3 class="playlist-detail-title">
                        <span class="playlist-icon">${playlistIcon}</span>
                        ${playlist.name || playlistName}
                    </h3>
                    <p class="playlist-detail-desc">共 ${playlist.songs?.length || 0} 首歌曲</p>
                </div>
            </div>
            <div class="playlist-songs-list" id="playlistSongsList"></div>
        `;

        // 绑定返回按钮事件
        const backBtn = document.getElementById('playlistBackBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                // 清空解析结果，重新显示热门歌单
                parseResults.style.display = 'none';
                parseResults.innerHTML = '';
                hotPlaylistsSection.style.display = 'block';
            });
        }

        // 显示歌曲列表
        if (playlist.songs && playlist.songs.length > 0) {
            ui.displaySearchResults(playlist.songs, 'playlistSongsList', playlist.songs);
            ui.showNotification(`成功加载歌单《${playlist.name || playlistName}》，共 ${playlist.songs.length} 首歌曲`, 'success');
        } else {
            document.getElementById('playlistSongsList')!.innerHTML = '<div class="empty-state"><div>歌单为空</div></div>';
            ui.showNotification('歌单为空', 'warning');
        }

    } catch (error) {
        let errorMessage = '解析歌单失败';
        if (error instanceof Error) {
            errorMessage = error.message;
        }

        // 显示错误信息，包含返回按钮
        parseResults.innerHTML = `
            <div class="playlist-detail-header">
                <button class="back-btn" id="playlistBackBtn" title="返回歌单列表">
                    <i class="fas fa-arrow-left"></i> 返回
                </button>
            </div>
            <div class="error">
                <i class="fas fa-exclamation-triangle"></i>
                <div>${errorMessage}</div>
            </div>
        `;

        // 绑定返回按钮事件
        const backBtn = document.getElementById('playlistBackBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                parseResults.style.display = 'none';
                parseResults.innerHTML = '';
                hotPlaylistsSection.style.display = 'block';
            });
        }

        ui.showNotification(errorMessage, 'error');
    }
}

// 初始化移动端页面指示器
function initMobilePageIndicators(): void {
    const indicators = document.querySelectorAll('.page-indicator');
    indicators.forEach((indicator, index) => {
        indicator.addEventListener('click', () => {
            (window as any).switchMobilePage(index);
        });
    });
}

/**
 * 修复BUG-006: 统一的结果容器切换函数
 * 确保每次只显示一个容器，避免状态混乱
 */
function switchResultsContainer(activeContainer: 'search' | 'parse'): void {
    const searchResults = document.getElementById('searchResults');
    const parseResults = document.getElementById('parseResults');
    
    if (!searchResults || !parseResults) {
        console.error('❌ 结果容器元素缺失');
        return;
    }
    
    if (activeContainer === 'search') {
        // 确保在搜索结果标签页
        switchTab('search');
        searchResults.style.display = 'block';
        console.log('✅ 已切换到搜索结果容器');
    } else {
        // 确保在歌单标签页
        switchTab('playlist');
        parseResults.style.display = 'block';
        console.log('✅ 已切换到解析结果容器');
    }
}

async function handleSearch(): Promise<void> {
    const keyword = (document.getElementById('searchInput') as HTMLInputElement).value;
    const source = (document.getElementById('sourceSelect') as HTMLSelectElement).value;

    if (!keyword.trim()) {
        ui.showNotification('请输入搜索关键词', 'warning');
        return;
    }

    // 修复BUG-006: 使用统一的容器切换函数
    switchResultsContainer('search');

    // 确保搜索历史模块已加载
    if (!moduleLoadStatus.searchHistory) {
        await loadSearchHistoryModule();
    }

    // 添加到搜索历史
    if (searchHistoryModule && searchHistoryModule.addSearchHistory) {
        searchHistoryModule.addSearchHistory(keyword.trim());
    }

    ui.showLoading('searchResults');

    try {
        // 老王优化：先尝试主API搜索
        let songs = await api.searchMusicAPI(keyword, source);

        // 老王优化：如果主API结果少于10首，尝试聚合搜索补充
        if (songs.length < 10) {
            console.log(`⚠️ 主API仅返回${songs.length}首，尝试聚合搜索补充...`);
            try {
                const { aggregateSearch } = await import('./extra-api-adapter.js');
                const extraSongs = await aggregateSearch(keyword);

                if (extraSongs.length > 0) {
                    console.log(`✅ 聚合搜索找到${extraSongs.length}首歌曲`);

                    // 合并结果并去重（基于歌曲名+艺术家）
                    const existingSongKeys = new Set(
                        songs.map(s => `${s.name}_${Array.isArray(s.artist) ? s.artist.join(',') : s.artist}`)
                    );

                    const uniqueExtraSongs = extraSongs.filter(s => {
                        const key = `${s.name}_${Array.isArray(s.artist) ? s.artist.join(',') : s.artist}`;
                        return !existingSongKeys.has(key);
                    });

                    songs = [...songs, ...uniqueExtraSongs];
                    console.log(`✅ 合并后共${songs.length}首歌曲`);
                }
            } catch (aggregateError) {
                console.warn('⚠️ 聚合搜索失败:', aggregateError);
                // 继续使用主API结果
            }
        }

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

    // 修复BUG-006: 使用统一的容器切换函数
    switchResultsContainer('parse');

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

// 移动端页面切换功能 - 支持三栏布局
(window as any).switchMobilePage = function(pageIndex: number): void {
    const sections = [
        document.querySelector('.content-section'),
        document.querySelector('.player-section'),
        document.querySelector('.stats-section-sidebar')
    ];

    const indicators = document.querySelectorAll('.page-indicator');
    const mainContainer = document.querySelector('.main-container');

    // 更新指示器
    indicators.forEach(indicator => indicator.classList.remove('active'));
    if (indicators[pageIndex] && pageIndex < indicators.length) {
        indicators[pageIndex].classList.add('active');
    }

    // 滚动到对应的section
    if (sections[pageIndex] && mainContainer && window.innerWidth <= 768) {
        const sectionElement = sections[pageIndex] as HTMLElement;
        const containerElement = mainContainer as HTMLElement;
        const scrollLeft = sectionElement.offsetLeft - parseInt(getComputedStyle(containerElement).paddingLeft);
        containerElement.scrollTo({
            left: scrollLeft,
            behavior: 'smooth'
        });
    }
};

// 初始化移动端
if (window.innerWidth <= 768) {
    (window as any).switchMobilePage(0);
}

// BUG-002修复: 页面卸载时清理资源，防止内存泄漏
// 导入歌词Worker管理器以便同步清理
import lyricsWorkerManager from './lyrics-worker-manager.js';

window.addEventListener('beforeunload', () => {
    console.log('🧹 页面卸载，清理资源...');
    
    // 清理API
    if (typeof api.cleanup === 'function') {
        api.cleanup();
    }
    
    // 清理播放器
    if (typeof player.cleanup === 'function') {
        player.cleanup();
    }
    
    // 清理UI
    if (typeof ui.cleanup === 'function') {
        ui.cleanup();
    }
    
    // 清理性能优化模块
    if (imageLazyLoader && typeof imageLazyLoader.destroy === 'function') {
        imageLazyLoader.destroy();
        imageLazyLoader = null;
    }
    
    if (downloadProgressManager) {
        downloadProgressManager = null;
    }
    
    // 清理主题管理器
    if (themeManager && typeof themeManager.destroy === 'function') {
        themeManager.destroy();
        themeManager = null;
    }
    
    // BUG-002修复: 同步清理歌词Worker（不使用异步导入）
    lyricsWorkerManager.destroy();
    
    // 清理性能监控
    performanceMonitor.cleanup();
    
    console.log('✅ 资源清理完成');
});

// BUG-002修复: 添加页面隐藏时的清理（移动端切换应用）
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('📱 页面隐藏，暂停非必要资源...');
        // 暂停时可以考虑清理一些临时数据，但不终止Worker
    }
});

// 优化: 移动端滑动手势支持 - 增强版
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;
let touchStartTime = 0;

const mainContainer = document.querySelector('.main-container');

// 移动端滑动功能 - 支持动态窗口大小检测
function initMobileSwipe(): void {
    if (!mainContainer) return;

    // 检查是否已经初始化过滑动功能
    if ((mainContainer as any).swipeInitialized) {
        return;
    }

    // 只在移动端宽度初始化
    if (window.innerWidth <= 768) {
        console.log('🎯 初始化移动端滑动功能');

        // 优化: 添加更精确的滑动检测
        let isSwiping = false;
        let hasMovedEnough = false;
        let swipeDirection: 'horizontal' | 'vertical' | 'none' = 'none';

        mainContainer.addEventListener('touchstart', (e: Event) => {
            const touchEvent = e as TouchEvent;
            touchStartX = touchEvent.changedTouches[0].screenX;
            touchStartY = touchEvent.changedTouches[0].screenY;
            touchStartTime = Date.now();
            isSwiping = false;
            hasMovedEnough = false;
            swipeDirection = 'none';
        }, { passive: true });

    // 优化: 改进滑动方向判断和惯性检测
    mainContainer.addEventListener('touchmove', (e: Event) => {
        const touchEvent = e as TouchEvent;

        // 检查是否可以取消事件
        if (!touchEvent.cancelable) {
            // 如果事件不可取消，直接返回不处理
            return;
        }

        const currentX = touchEvent.changedTouches[0].screenX;
        const currentY = touchEvent.changedTouches[0].screenY;
        const deltaX = Math.abs(currentX - touchStartX);
        const deltaY = Math.abs(currentY - touchStartY);

        // 优化: 更早地判断滑动方向，阈值降低到20px
        if (swipeDirection === 'none' && (deltaX > 20 || deltaY > 20)) {
            // 优化: 使用更宽松的比例判断（1.3倍）提高响应性
            if (deltaX > deltaY * 1.3) {
                swipeDirection = 'horizontal';
                isSwiping = true;
            } else if (deltaY > deltaX * 1.3) {
                swipeDirection = 'vertical';
            }
        }

        // 优化: 只阻止水平滑动的默认行为，保留垂直滚动
        // 确保事件是可取消的再调用preventDefault
        if (swipeDirection === 'horizontal' && touchEvent.cancelable) {
            e.preventDefault();
            hasMovedEnough = true;
        }
    }, { passive: false });

    mainContainer.addEventListener('touchend', (e: Event) => {
        const touchEvent = e as TouchEvent;
        touchEndX = touchEvent.changedTouches[0].screenX;
        touchEndY = touchEvent.changedTouches[0].screenY;
        const touchEndTime = Date.now();
        
        // 优化: 计算滑动速度，支持快速滑动
        const swipeTime = touchEndTime - touchStartTime;
        const swipeDistance = Math.abs(touchEndX - touchStartX);
        const swipeVelocity = swipeDistance / swipeTime; // px/ms
        
        // 只有在确认是水平滑动时才处理
        if (swipeDirection === 'horizontal' && hasMovedEnough) {
            handleSwipe(swipeVelocity);
        }
        
        // 重置状态
        isSwiping = false;
        hasMovedEnough = false;
        swipeDirection = 'none';
    }, { passive: true });

        // 标记为已初始化
        (mainContainer as any).swipeInitialized = true;
        console.log('✅ 移动端滑动功能初始化完成');
    }
}

// 添加窗口大小变化监听，支持动态初始化
window.addEventListener('resize', debounce(() => {
    if (window.innerWidth <= 768 && mainContainer && !(mainContainer as any).swipeInitialized) {
        initMobileSwipe();
    }
}, 300));

// 初始化移动端滑动功能
initMobileSwipe();

// 优化: 支持快速滑动和惯性检测
function handleSwipe(velocity: number = 0): void {
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    
    // 优化: 提高手势阈值到60px，避免误触
    // 快速滑动（velocity > 0.5）只需40px，慢速滑动需要60px
    const minSwipeDistance = velocity > 0.5 ? 40 : 60;

    // 只处理水平滑动
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
        const sections = document.querySelectorAll('.content-section, .player-section, .stats-section-sidebar');
        const indicators = document.querySelectorAll('.page-indicator');
        let currentPage = 0;

        // 找到当前激活页面
        indicators.forEach((indicator, index) => {
            if (indicator.classList.contains('active')) {
                currentPage = index;
            }
        });

        // 优化: 支持快速滑动跳过多页（velocity > 1.0）
        let pagesToSkip = 1;
        if (velocity > 1.0 && Math.abs(deltaX) > 100) {
            pagesToSkip = 2;
        }

        // 左滑显示下一页
        if (deltaX < 0 && currentPage < sections.length - 1) {
            const targetPage = Math.min(currentPage + pagesToSkip, sections.length - 1);
            (window as any).switchMobilePage(targetPage);
        }
        // 右滑显示上一页
        else if (deltaX > 0 && currentPage > 0) {
            const targetPage = Math.max(currentPage - pagesToSkip, 0);
            (window as any).switchMobilePage(targetPage);
        }
    }
}

// ========== 性能优化模块初始化 ==========
async function initPerformanceOptimizations(): Promise<void> {
    console.log('🚀 初始化性能优化模块...');
    
    // 1. 初始化图片懒加载
    if (!moduleLoadStatus.imageLoader) {
        try {
            const { ImageLazyLoader } = await import('./image-lazy-load.js');
            imageLazyLoader = new ImageLazyLoader();
            moduleLoadStatus.imageLoader = true;
            console.log('✅ 图片懒加载已启用');
            
            // 为现有图片添加懒加载
            const images = document.querySelectorAll('img[loading="lazy"]');
            images.forEach(img => {
                if (img instanceof HTMLImageElement) {
                    imageLazyLoader.observe(img);
                }
            });
        } catch (error) {
            console.error('❌ 图片懒加载初始化失败:', error);
        }
    }
    
    // 2. 初始化下载进度管理器
    if (!moduleLoadStatus.downloadProgress) {
        try {
            const { DownloadProgressManager } = await import('./download-progress.js');
            downloadProgressManager = new DownloadProgressManager();
            moduleLoadStatus.downloadProgress = true;
            console.log('✅ 下载进度管理器已启用');
        } catch (error) {
            console.error('❌ 下载进度管理器初始化失败:', error);
        }
    }
    
    console.log('✅ 性能优化模块初始化完成');
}

// ========== 增强功能：键盘快捷键 ==========
function initKeyboardShortcuts(): void {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
        // 如果正在输入，不触发快捷键
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
            return;
        }
        
        // 空格键：播放/暂停
        if (e.code === 'Space') {
            e.preventDefault();
            player.togglePlay();
        }
        
        // 左箭头：上一首
        if (e.code === 'ArrowLeft') {
            e.preventDefault();
            player.previousSong();
        }
        
        // 右箭头：下一首
        if (e.code === 'ArrowRight') {
            e.preventDefault();
            player.nextSong();
        }
        
        // 上箭头：音量+
        if (e.code === 'ArrowUp') {
            e.preventDefault();
            const volumeSlider = document.getElementById('volumeSlider') as HTMLInputElement;
            if (volumeSlider) {
                const newVolume = Math.min(100, parseInt(volumeSlider.value) + 10);
                volumeSlider.value = String(newVolume);
                player.setVolume(String(newVolume));
                ui.showNotification(`音量: ${newVolume}%`, 'info');
            }
        }
        
        // 下箭头：音量-
        if (e.code === 'ArrowDown') {
            e.preventDefault();
            const volumeSlider = document.getElementById('volumeSlider') as HTMLInputElement;
            if (volumeSlider) {
                const newVolume = Math.max(0, parseInt(volumeSlider.value) - 10);
                volumeSlider.value = String(newVolume);
                player.setVolume(String(newVolume));
                ui.showNotification(`音量: ${newVolume}%`, 'info');
            }
        }
        
        // M键：切换播放模式
        if (e.code === 'KeyM' && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            player.togglePlayMode();
        }
        
        // L键：打开播放列表
        if (e.code === 'KeyL' && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            const playlistBtn = document.getElementById('playlistBtn');
            if (playlistBtn) {
                playlistBtn.click();
            }
        }
        
        // F键：收藏当前歌曲
        if (e.code === 'KeyF' && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            const currentSong = player.getCurrentSong();
            if (currentSong) {
                player.toggleFavoriteButton(currentSong);
            }
        }
        
        // / 键：聚焦搜索框
        if (e.code === 'Slash' && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            const searchInput = document.getElementById('searchInput') as HTMLInputElement;
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        }
    });
    
    console.log('⌨️ 键盘快捷键已启用');
}

// ========== 增强功能：动态页面标题 ==========
let originalTitle = '沄听 - 在线音乐播放器';
let titleUpdateInterval: number | null = null;

function initDynamicPageTitle(): void {
    // 监听歌曲播放事件
    window.addEventListener('songPlaying', ((e: CustomEvent) => {
        const song = e.detail?.song;
        if (song) {
            updatePageTitle(song, true);
        }
    }) as EventListener);
    
    // 监听暂停事件
    window.addEventListener('songPaused', () => {
        updatePageTitle(null, false);
    });
    
    console.log('📄 动态页面标题已启用');
}

function updatePageTitle(song: any | null, isPlaying: boolean): void {
    if (song && isPlaying) {
        const artist = Array.isArray(song.artist) ? song.artist.join(', ') : song.artist;
        const newTitle = `▶️ ${song.name} - ${artist}`;
        document.title = newTitle;
        
        // 清除之前的定时器
        if (titleUpdateInterval !== null) {
            clearInterval(titleUpdateInterval);
        }
        
        // 创建动画效果（可选）
        // titleUpdateInterval = window.setInterval(() => {
        //     const prefix = document.title.startsWith('▶️') ? '🎵' : '▶️';
        //     document.title = `${prefix} ${song.name} - ${artist}`;
        // }, 3000);
    } else {
        // 恢复原标题
        document.title = originalTitle;
        if (titleUpdateInterval !== null) {
            clearInterval(titleUpdateInterval);
            titleUpdateInterval = null;
        }
    }
}

// ========== iOS Safari音频解锁 ==========
function initIOSAudioUnlock(): void {
    // 检测是否为iOS设备
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    
    if (!isIOS) {
        console.log('ℹ️ 非iOS设备，跳过音频解锁');
        return;
    }
    
    console.log('📱 检测到iOS设备，初始化音频解锁机制');
    
    // 创建音频解锁函数
    const unlockAudio = () => {
        // 获取页面中的audio元素
        const audioElement = document.querySelector('audio');
        if (audioElement) {
            // 尝试播放并立即暂停以解锁音频
            const playPromise = audioElement.play();
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        audioElement.pause();
                        console.log('✅ iOS音频已解锁');
                    })
                    .catch((error: Error) => {
                        console.warn('⚠️ iOS音频解锁失败:', error.message);
                    });
            }
        }
        
        // 清理事件监听器
        document.removeEventListener('touchstart', unlockAudio);
        document.removeEventListener('touchend', unlockAudio);
        document.removeEventListener('click', unlockAudio);
    };
    
    // 监听用户首次交互
    document.addEventListener('touchstart', unlockAudio, { once: true });
    document.addEventListener('touchend', unlockAudio, { once: true });
    document.addEventListener('click', unlockAudio, { once: true });
}

// ========== 初始化函数调用 ==========

// 确保DOM完全加载后再启动应用
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initializeApp();
    });
} else {
    initializeApp();
}
