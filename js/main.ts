// 简化版音乐播放器 - 只保留核心功能
import '../css/style.css';

import * as api from './api.js';
import * as ui from './ui.js';
import * as player from './player.js';
import { debounce } from './utils.js';
import storageAdapter from './storage-adapter.js';
import { ThemeManager } from './theme-manager.js';
import performanceMonitor from './performance-monitor.js';
import { validateSearchKeyword, validatePlaylistId } from './input-validator.js';

// 优化: 使用动态导入实现代码分割，减少初始加载时间
let artistModule: any = null;  // 老王改：原discover模块改为artist
let playlistModule: any = null;  // 老王改：新的playlist模块（整合了rank）
let dailyRecommendModule: any = null;
let searchHistoryModule: any = null;
let playStatsModule: any = null;
let imageLazyLoader: any = null;
let downloadProgressManager: any = null;
let themeManager: ThemeManager | null = null;

// ========== 老王修复BUG：事件监听器管理系统 ==========
// 艹，原来的代码全tm用匿名函数，根本没法cleanup！现在统一管理所有监听器
interface EventListenerEntry {
    target: EventTarget;
    type: string;
    listener: EventListener;
    options?: AddEventListenerOptions | boolean;
}

const registeredEventListeners: EventListenerEntry[] = [];

/**
 * 老王修复BUG：注册事件监听器的辅助函数
 * 这个函数会自动跟踪所有监听器，方便cleanup时统一移除
 * @param target - 事件目标（window, document, element等）
 * @param type - 事件类型（'click', 'resize'等）
 * @param listener - 监听器函数（必须是命名函数或存储的函数引用）
 * @param options - addEventListener的选项参数
 */
function registerEventListener(
    target: EventTarget,
    type: string,
    listener: EventListener,
    options?: AddEventListenerOptions | boolean
): void {
    target.addEventListener(type, listener, options);
    registeredEventListeners.push({ target, type, listener, options });
    console.log(`📝 已注册监听器: ${type} on ${target.constructor.name}`);
}

/**
 * 老王修复BUG：清理所有注册的事件监听器
 * 页面卸载时调用，防止内存泄漏
 */
export function cleanup(): void {
    console.log(`🧹 main.ts: 开始清理 ${registeredEventListeners.length} 个事件监听器...`);

    registeredEventListeners.forEach(({ target, type, listener, options }) => {
        target.removeEventListener(type, listener, options);
    });

    // 清空数组
    registeredEventListeners.length = 0;

    console.log('✅ main.ts: 所有事件监听器已清理');
}

// 防止重复初始化的全局标志
let appInitialized = false;

// 模块加载状态
const moduleLoadStatus = {
    artist: false,  // 老王改：原discover改为artist
    playlist: false,  // 老王改：原rank整合到playlist
    dailyRecommend: false,
    searchHistory: false,
    playStats: false,
    imageLoader: false,
    downloadProgress: false
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

    // 老王改：按需加载各标签页对应的模块
    if (tabName === 'artist') {
        loadArtistModule();
    } else if (tabName === 'playlist') {
        loadPlaylistModule();
    }
}

// ========== 老王修复BUG：命名事件处理函数（用于cleanup） ==========
// 艹，原来的代码全tm用匿名箭头函数，导致removeEventListener根本没法用！
// 现在把所有监听器提取成命名函数，注册到registeredEventListeners数组

/**
 * 处理页面可见性变化事件
 * 移动端切换应用时暂停非必要资源
 */
function handleVisibilityChange(): void {
    if (document.hidden) {
        console.log('📱 页面隐藏，暂停非必要资源...');
        // 暂停时可以考虑清理一些临时数据，但不终止Worker
    }
}

/**
 * 处理触摸开始事件
 * 记录触摸起点坐标和时间
 */
function handleTouchStart(e: Event): void {
    const touchEvent = e as TouchEvent;
    touchStartX = touchEvent.changedTouches[0].screenX;
    touchStartY = touchEvent.changedTouches[0].screenY;
    touchStartTime = Date.now();
    isSwiping = false;
    hasMovedEnough = false;
    swipeDirection = 'none';
}

/**
 * 处理触摸移动事件
 * 判断滑动方向并阻止水平滑动的默认行为
 */
function handleTouchMove(e: Event): void {
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
}

/**
 * 处理触摸结束事件
 * 计算滑动速度并触发页面切换
 */
function handleTouchEnd(e: Event): void {
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
}

/**
 * 处理窗口resize事件（已防抖）
 * 动态初始化移动端滑动功能
 */
function handleWindowResize(): void {
    if (window.innerWidth <= 768 && mainContainer && !(mainContainer as any).swipeInitialized) {
        initMobileSwipe();
    }
}

/**
 * 处理键盘快捷键事件
 * Space: 播放/暂停, 左右箭头: 上/下一首, 上下箭头: 音量±, M: 切换模式, L: 播放列表, F: 收藏, /: 搜索
 */
function handleKeyboardShortcuts(e: KeyboardEvent): void {
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
}

/**
 * 处理歌曲播放事件
 * 更新浏览器标题为歌曲信息
 */
function handleSongPlaying(e: Event): void {
    const customEvent = e as CustomEvent;
    const song = customEvent.detail?.song;
    if (song) {
        updatePageTitle(song, true);
    }
}

/**
 * 处理歌曲暂停事件
 * 恢复浏览器默认标题
 */
function handleSongPaused(): void {
    updatePageTitle(null, false);
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
    
    // API初始化 - 优先恢复用户偏好的API
    ui.showNotification('正在连接音乐服务...', 'info');
    try {
        // 先尝试恢复用户偏好的API
        await api.restorePreferredApi();
        
        // 如果恢复失败，查找可用API
        const currentApi = api.getCurrentApiStatus();
        const testResult = await fetch(currentApi.url, { method: 'HEAD', mode: 'no-cors' }).catch(() => null);
        
        if (!testResult) {
            const result = await api.findWorkingAPI();
            if (result.success) {
                console.log(`✅ API初始化成功: ${result.name}`);
                ui.showNotification(`已连接到 ${result.name}`, 'success');
            } else {
                console.error('❌ 所有API均不可用');
                ui.showNotification('所有 API 均不可用，搜索功能可能受影响', 'warning');
            }
        } else {
            console.log(`✅ 使用API: ${currentApi.name}`);
            ui.showNotification(`已连接到 ${currentApi.name}`, 'success');
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

    // 音质切换按钮
    const qualityToggleBtn = document.getElementById('qualityToggleBtn');
    if (qualityToggleBtn) {
        qualityToggleBtn.addEventListener('click', () => {
            player.toggleQuality();
        });
    }

    // Tab按钮 - 优化: 按需加载对应模块
    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', async () => {
            const tab = (button as HTMLElement).dataset.tab!;
            
            // 老王改：根据tab类型按需加载模块
            if (tab === 'artist' && !moduleLoadStatus.artist) {
                await loadArtistModule();
            } else if (tab === 'playlist' && !moduleLoadStatus.playlist) {
                await loadPlaylistModule();
            }
            
            switchTab(tab);
        });
    });

    // 老王恢复：解析歌单功能 - 只支持网易云音乐
    const parsePlaylistBtn = document.getElementById('parsePlaylistBtn');
    if (parsePlaylistBtn) {
        parsePlaylistBtn.addEventListener('click', handleParsePlaylist);
        console.log('✅ 解析歌单按钮事件已绑定');
    }

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

// 老王重写：按需加载歌手模块（原发现音乐模块）
async function loadArtistModule(): Promise<void> {
    if (moduleLoadStatus.artist && artistModule) return;

    try {
        console.log('📦 加载歌手模块...');
        artistModule = await import('./artist.js');
        artistModule.initArtist();
        moduleLoadStatus.artist = true;
        console.log('✅ 歌手模块加载完成');
    } catch (error) {
        console.error('❌ 歌手模块加载失败:', error);
        moduleLoadStatus.artist = false;
        artistModule = null;
    }
}

// 老王重写：按需加载歌单模块（整合了排行榜）
async function loadPlaylistModule(): Promise<void> {
    if (moduleLoadStatus.playlist && playlistModule) return;

    try {
        console.log('📦 加载歌单模块（含排行榜）...');
        playlistModule = await import('./playlist.js');
        playlistModule.initPlaylist();
        moduleLoadStatus.playlist = true;
        console.log('✅ 歌单模块加载完成');
    } catch (error) {
        console.error('❌ 歌单模块加载失败:', error);
        moduleLoadStatus.playlist = false;
        playlistModule = null;
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

// 老王注：旧的loadPlaylistModule、loadHotPlaylists、loadPlaylistDetail函数已删除，使用新的playlist.ts模块

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
    const keywordInput = (document.getElementById('searchInput') as HTMLInputElement).value;
    const source = (document.getElementById('sourceSelect') as HTMLSelectElement).value;

    // 输入验证
    const validation = validateSearchKeyword(keywordInput);
    if (!validation.valid) {
        ui.showNotification(validation.error || '输入无效', 'warning');
        return;
    }
    
    const keyword = validation.value;

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

// 老王简化：解析歌单功能 - 只支持网易云音乐
async function handleParsePlaylist(): Promise<void> {
    const playlistIdInput = (document.getElementById('playlistIdInput') as HTMLInputElement).value;

    // 输入验证
    const validation = validatePlaylistId(playlistIdInput);
    if (!validation.valid) {
        ui.showNotification(validation.error || '输入无效', 'warning');
        return;
    }

    const playlistId = validation.value;

    // 切换到歌单标签页
    switchTab('playlist');

    // 显示加载状态
    const container = document.getElementById('playlistContainer');
    if (container) {
        container.innerHTML = '<div class="loading"><i class="fas fa-spinner"></i><div>正在解析歌单...</div></div>';
    }

    try {
        const playlist = await api.parsePlaylistAPI(playlistId, 'netease');

        if (!playlist || !playlist.songs || playlist.songs.length === 0) {
            if (container) {
                container.innerHTML = `
                    <div class="error">
                        <i class="fas fa-exclamation-triangle"></i>
                        <div>解析失败，请检查歌单ID是否正确</div>
                    </div>
                `;
            }
            ui.showNotification('解析歌单失败', 'error');
            return;
        }

        // 显示歌曲列表
        if (container) {
            container.innerHTML = `
                <div class="playlist-detail-header">
                    <div class="playlist-detail-info">
                        <h3>${playlist.name || '未知歌单'}</h3>
                        <p>共 ${playlist.count || 0} 首歌曲（已成功解析）</p>
                    </div>
                </div>
                <div class="playlist-songs-container" id="parsePlaylistSongsContainer"></div>
            `;
        }

        ui.displaySearchResults(playlist.songs, 'parsePlaylistSongsContainer', playlist.songs);
        ui.showNotification(`成功解析歌单《${playlist.name}》，共 ${playlist.count || 0} 首歌曲`, 'success');
    } catch (error) {
        let errorMessage = '解析歌单失败';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        if (container) {
            container.innerHTML = `
                <div class="error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <div>${errorMessage}</div>
                </div>
            `;
        }
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

    // 老王修复BUG：清理main.ts的所有事件监听器
    cleanup();

    // 老王修复BUG：清理动态加载的子模块监听器
    if (artistModule && typeof artistModule.cleanup === 'function') {
        artistModule.cleanup();
    }

    if (playlistModule && typeof playlistModule.cleanup === 'function') {
        playlistModule.cleanup();
    }

    if (playStatsModule && typeof playStatsModule.cleanup === 'function') {
        playStatsModule.cleanup();
    }

    console.log('✅ 资源清理完成（包含所有子模块）');
});

// BUG-002修复: 添加页面隐藏时的清理（移动端切换应用）
registerEventListener(document, 'visibilitychange', handleVisibilityChange);

// ========== 老王重构：移动端滑动手势支持 - 变量提升到模块顶层 ==========
// 艹，原来的SB代码把状态变量放函数内部，导致无法cleanup！现在全部提升
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;
let touchStartTime = 0;
// 老王修复BUG：把局部变量提升到模块顶层，方便命名函数访问
let isSwiping = false;
let hasMovedEnough = false;
let swipeDirection: 'horizontal' | 'vertical' | 'none' = 'none';

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

        registerEventListener(mainContainer, 'touchstart', handleTouchStart, { passive: true });

    // 优化: 改进滑动方向判断和惯性检测
    registerEventListener(mainContainer, 'touchmove', handleTouchMove, { passive: false });

    registerEventListener(mainContainer, 'touchend', handleTouchEnd, { passive: true });

        // 标记为已初始化
        (mainContainer as any).swipeInitialized = true;
        console.log('✅ 移动端滑动功能初始化完成');
    }
}

// 添加窗口大小变化监听，支持动态初始化
registerEventListener(window, 'resize', debounce(handleWindowResize, 300) as EventListener);

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

        // 修复：移除快速滑动跳页功能，确保每次只移动一页
        // 避免从第一栏直接跳到第三栏，跳过第二栏（播放器页面）
        let pagesToSkip = 1;

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
    registerEventListener(document, 'keydown', handleKeyboardShortcuts);
    console.log('⌨️ 键盘快捷键已启用');
}

// ========== 增强功能：动态页面标题 ==========
let originalTitle = '沄听 - 在线音乐播放器';
let titleUpdateInterval: number | null = null;

function initDynamicPageTitle(): void {
    // 监听歌曲播放事件
    registerEventListener(window, 'songPlaying', handleSongPlaying as EventListener);

    // 监听暂停事件
    registerEventListener(window, 'songPaused', handleSongPaused);

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
