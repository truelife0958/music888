/**
 * 沄听播放器 - 主程序入口
 * 负责应用初始化、事件绑定和页面交互逻辑
 */
import * as api from './api';
import * as ui from './ui';
import * as player from './player';
import { getElement, ensureHttps } from './utils';
import {
    MusicError,
    ArtistInfo,
    AlbumInfo,
    RadioStation,
    RadioProgram,
    UserPlaylist,
    MainTabName,
    MyTabName,
    PlaylistActionMode,
    PlaylistActionUiConfig,
} from './types';
import { logger } from './config';
import { initPerformanceMonitoring } from './perf';

// --- 移动端页面切换功能（必须在模块顶层定义，供 HTML onclick 使用）---
let currentMobilePage = 0;

// NOTE: 歌手分页状态
let artistOffset = 0;
let artistHasMore = false;
let artistCurrentArea = -1;
let artistCurrentType = -1;
let artistCurrentInitial: string | number = -1;

// NOTE: 电台分页状态
let radioOffset = 0;
let radioHasMore = false;
let radioCurrentCateId = 0; // 0 = 热门
let radioCategoriesLoaded = false;

// NOTE: 歌手专辑分页状态
let artistAlbumsOffset = 0;
let artistAlbumsHasMore = false;
let artistDetailCurrentId = 0;

// NOTE: 副链路请求序号，避免视图切换后的旧请求回写
let artistListRequestId = 0;
let artistDetailRequestId = 0;
let albumDetailRequestId = 0;
let searchRequestId = 0;

// NOTE: “我的”动作区统一状态
let playlistActionSubmitting = false;
let playlistActionFeedbackMessage = '';
let playlistActionFeedbackType: PlaylistActionFeedbackType = 'neutral';

// NOTE: 触摸滑动状态
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

type PlaylistActionFeedbackType = 'neutral' | 'info' | 'success' | 'error';

const PLAYLIST_ACTION_UI: Record<
    PlaylistActionMode,
    PlaylistActionUiConfig & { submittingLabel: string; idleMessage: string }
> = {
    user: {
        placeholder: '输入网易云用户ID...',
        buttonLabel: '加载',
        iconClass: 'fas fa-user',
        submittingLabel: '加载中',
        idleMessage: '输入用户 ID 后加载公开歌单',
    },
    radio: {
        placeholder: '输入电台ID...',
        buttonLabel: '添加',
        iconClass: 'fas fa-podcast',
        submittingLabel: '添加中',
        idleMessage: '输入电台 ID 可添加到我的列表',
    },
    playlist: {
        placeholder: '输入歌单ID或链接...',
        buttonLabel: '解析',
        iconClass: 'fas fa-cloud-download-alt',
        submittingLabel: '解析中',
        idleMessage: '输入歌单链接或 ID 解析歌曲列表',
    },
};

function isPlaylistActionMode(value: string): value is PlaylistActionMode {
    return value === 'user' || value === 'radio' || value === 'playlist';
}

function getPlaylistActionMode(value: string): PlaylistActionMode {
    return isPlaylistActionMode(value) ? value : 'user';
}

/**
 * 切换移动端页面
 * @param pageIndex 页面索引 (0-2)
 */
function switchMobilePage(pageIndex: number): void {
    const mainContainer = document.querySelector('.main-container') as HTMLElement;
    const indicators = document.querySelectorAll('.page-indicator');

    if (mainContainer) {
        // 使用 transform 实现横向滑动
        const offset = -pageIndex * 100;
        mainContainer.style.transform = `translateX(${offset}vw)`;
    }

    // 更新页面指示器
    indicators.forEach((indicator, index) => {
        if (index === pageIndex) {
            indicator.classList.add('active');
        } else {
            indicator.classList.remove('active');
        }
    });

    currentMobilePage = pageIndex;
}

// NOTE: 导出给其他模块使用（如 ui.ts 的点击播放跳转）
// 使用类型安全的 Window 扩展
window.switchMobilePage = switchMobilePage;

// --- 全局错误处理 ---
window.addEventListener('error', event => {
    logger.error('Global error:', event.error);
    ui.showNotification('发生错误，请刷新页面重试', 'error');
});

window.addEventListener('unhandledrejection', event => {
    logger.error('Unhandled promise rejection:', event.reason);
    // NOTE: 使用通用错误消息，因为可能不是网络错误
    ui.showNotification('操作失败，请稍后重试', 'error');
});

// --- Tab Switching Logic ---
function applyViewVisibility(showIds: string[], hideIds: string[]): void {
    showIds.forEach(id => {
        const element = getElement(`#${id}`);
        if (element) {
            (element as HTMLElement).style.display = '';
        }
    });

    hideIds.forEach(id => {
        const element = getElement(`#${id}`);
        if (element) {
            (element as HTMLElement).style.display = 'none';
        }
    });
}

function syncPlaylistActionUi(action: PlaylistActionMode): void {
    playlistActionSubmitting = false;
    playlistActionFeedbackMessage = PLAYLIST_ACTION_UI[action].idleMessage;
    playlistActionFeedbackType = 'neutral';
    refreshPlaylistActionUi(action);
}

function triggerSearchOnEnter(key: string, onSearch: () => void): void {
    if (key === 'Enter') {
        onSearch();
    }
}

/**
 * 切换标签页
 * @param tabName 标签名称
 */
function switchTab(tabName: MainTabName): void {
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

function showPrimaryContentTab(tabName: MainTabName): void {
    switchTab(tabName);

    if (window.innerWidth <= 768) {
        switchMobilePage(0);
    }
}

function showArtistListView(): void {
    applyViewVisibility(['artistGrid', 'artistFilter'], ['artistDetailView', 'albumSongsView']);
}

function showArtistDetailView(): void {
    applyViewVisibility(['artistDetailView'], ['artistGrid', 'artistFilter', 'albumSongsView']);
}

function showAlbumSongsDetailView(): void {
    applyViewVisibility(['albumSongsView'], ['artistDetailView']);
}

function showRadioListView(): void {
    applyViewVisibility(['radioListView'], ['radioProgramsView']);
}

function showRadioProgramsView(): void {
    applyViewVisibility(['radioProgramsView'], ['radioListView']);
}

function getCurrentPlaylistActionMode(): PlaylistActionMode {
    const select = getElement<HTMLSelectElement>('#playlistActionSelect');
    return getPlaylistActionMode(select?.value || 'user');
}

function refreshPlaylistActionUi(action: PlaylistActionMode = getCurrentPlaylistActionMode()): void {
    const input = getElement<HTMLInputElement>('#playlistActionInput');
    const config = PLAYLIST_ACTION_UI[action];

    ui.syncPlaylistActionFormState({
        placeholder: config.placeholder,
        buttonLabel: playlistActionSubmitting ? config.submittingLabel : config.buttonLabel,
        iconClass: config.iconClass,
        isSubmitting: playlistActionSubmitting,
        isDisabled: playlistActionSubmitting || !input?.value.trim(),
        feedbackMessage: playlistActionFeedbackMessage || config.idleMessage,
        feedbackType: playlistActionFeedbackType,
    });
}

function setPlaylistActionState(
    action: PlaylistActionMode,
    options: { message: string; type?: PlaylistActionFeedbackType; submitting?: boolean }
): void {
    playlistActionSubmitting = options.submitting ?? false;
    playlistActionFeedbackMessage = options.message;
    playlistActionFeedbackType = options.type ?? 'neutral';
    refreshPlaylistActionUi(action);
}

function resetArtistAlbumSongsView(): void {
    const albumHeader = getElement('#albumSongsHeader');
    if (albumHeader) {
        albumHeader.innerHTML = '';
    }
    ui.showEmptyState(
        'albumSongsResults',
        '选择专辑后查看歌曲列表',
        'fas fa-compact-disc',
        '返回后重新进入专辑会刷新内容'
    );
}

function resetArtistDetailView(): void {
    const detailHeader = getElement('#artistDetailHeader');
    const detailDesc = getElement('#artistDesc');
    if (detailHeader) {
        detailHeader.innerHTML = '';
    }
    if (detailDesc) {
        detailDesc.innerHTML = '';
    }
    ui.showEmptyState('artistAlbumGrid', '选择歌手后查看专辑', 'fas fa-compact-disc', '歌手详情会在这里更新');
}

function resetRadioProgramsView(): void {
    const radioHeader = getElement('#radioProgramsHeader');
    if (radioHeader) {
        radioHeader.innerHTML = '';
    }
    ui.showEmptyState('radioProgramResults', '选择电台后查看节目', 'fas fa-podcast', '点击节目即可直接播放');
}

/**
 * 初始化应用程序
 */
async function initializeApp(): Promise<void> {
    logger.info('沄听 App 初始化...');

    // NOTE: 预填充 player 模块缓存，打破 ui.ts ↔ player.ts 循环依赖
    ui.setPlayerModule(player);

    // NOTE: Turnstile 安全验证（首次访问）
    try {
        const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
        if (siteKey && !localStorage.getItem('music888_turnstile_verified')) {
            await showTurnstileChallenge(siteKey);
        }
    } catch {
        // localStorage 不可用时跳过 Turnstile
    }

    // NOTE: 首次访问引导弹窗
    showOnboardingIfNeeded();

    // NOTE: 初始化性能监控（采集 Web Vitals）
    initPerformanceMonitoring();

    ui.init();
    ui.initLyricFontSize(); // 恢复上次设置的歌词字体大小
    player.initPlayer(); // NOTE: 初始化播放器，绑定 DOM 音频元素

    // NOTE: 注册 Service Worker 实现 PWA 功能
    registerServiceWorker();

    // NOTE: 后台检测可用 API 与音乐源，不阻塞首屏推荐
    api.findWorkingAPI()
        .then(result => {
            if (!result.success) {
                logger.warn('No working API source detected');
            }
        })
        .catch(error => {
            logger.error('API detection failed:', error);
        });
    void api.detectAvailableMusicSources();

    // --- Event Listeners ---
    bindEventListeners();

    // Initial tab state - 使用热门标签
    switchTab('hot');

    // NOTE: 首屏默认加载热门推荐，避免等待后台源检测导致空白
    void handleExplore({ silent: true });

    // 加载收藏和播放历史（右栏"我的"面板）
    loadMyTabData();

    // 自动恢复用户歌单和电台
    restoreUserPlaylists();
}

/**
 * 绑定所有事件监听器
 */
function bindEventListeners(): void {
    // 搜索相关
    const searchBtn = getElement('.search-btn');
    const searchInput = getElement<HTMLInputElement>('#searchInput');
    const exploreBtn = getElement('#exploreRadarBtn');
    const playlistActionSelect = getElement<HTMLSelectElement>('#playlistActionSelect');
    const playlistActionInput = getElement<HTMLInputElement>('#playlistActionInput');
    const playlistActionBtn = getElement('#playlistActionBtn');

    if (searchBtn) {
        searchBtn.addEventListener('click', handleSearch);
    }

    // NOTE: 搜索输入框回车立即搜索（使用 keydown 以补获所有输入法的 Enter 事件）
    if (searchInput) {
        searchInput.addEventListener('keydown', e => {
            triggerSearchOnEnter(e.key, () => {
                void handleSearch();
            });
        });
    }

    if (exploreBtn) {
        exploreBtn.addEventListener('click', () => {
            void handleExplore();
        });
    }

    // 下拉选择器切换事件
    if (playlistActionSelect) {
        playlistActionSelect.addEventListener('change', () => {
            if (playlistActionInput) {
                playlistActionInput.value = '';
            }
            syncPlaylistActionUi(getPlaylistActionMode(playlistActionSelect.value));
        });

        syncPlaylistActionUi(getPlaylistActionMode(playlistActionSelect.value));
    }

    if (playlistActionInput) {
        playlistActionInput.addEventListener('input', () => {
            if (!playlistActionSubmitting) {
                const action = getCurrentPlaylistActionMode();
                playlistActionFeedbackMessage = PLAYLIST_ACTION_UI[action].idleMessage;
                playlistActionFeedbackType = 'neutral';
            }
            refreshPlaylistActionUi();
        });
    }

    // 统一按钮分发
    if (playlistActionBtn) {
        playlistActionBtn.addEventListener('click', () => {
            const select = getElement<HTMLSelectElement>('#playlistActionSelect');
            if (!select) return;

            switch (getPlaylistActionMode(select.value)) {
                case 'user':
                    void handleLoadUserPlaylists();
                    break;
                case 'radio':
                    void handleAddRadio();
                    break;
                case 'playlist':
                    void handleParsePlaylist();
                    break;
            }
        });
    }

    // Player controls
    const playBtn = getElement('#playBtn');
    const prevBtn = getElement('#prevBtn');
    const nextBtn = getElement('#nextBtn');
    const playModeBtn = getElement('#playModeBtn');
    const volumeSlider = getElement<HTMLInputElement>('#volumeSlider');
    const progressBar = getElement('.progress-bar');

    if (playBtn) {
        playBtn.addEventListener('click', player.togglePlay);
    }
    if (prevBtn) {
        prevBtn.addEventListener('click', player.previousSong);
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', player.nextSong);
    }
    if (playModeBtn) {
        playModeBtn.addEventListener('click', player.togglePlayMode);
    }
    if (volumeSlider) {
        volumeSlider.addEventListener('input', e => {
            player.setVolume((e.target as HTMLInputElement).value);
        });
    }
    if (progressBar) {
        progressBar.addEventListener('click', e => player.seekTo(e as MouseEvent));
    }

    // Download buttons
    const downloadSongBtn = getElement('#downloadSongBtn');
    const downloadLyricBtn = getElement('#downloadLyricBtn');

    if (downloadSongBtn) {
        downloadSongBtn.addEventListener('click', () => {
            const currentSong = player.getCurrentSong();
            if (currentSong) player.downloadSongByData(currentSong);
        });
    }
    if (downloadLyricBtn) {
        downloadLyricBtn.addEventListener('click', () => {
            const currentSong = player.getCurrentSong();
            if (currentSong) player.downloadLyricByData(currentSong);
        });
    }

    // NOTE: 播放器区域的收藏按钮
    const playerFavoriteBtn = getElement('#playerFavoriteBtn');
    if (playerFavoriteBtn) {
        playerFavoriteBtn.addEventListener('click', () => {
            const currentSong = player.getCurrentSong();
            if (currentSong) {
                player.toggleFavoriteButton(currentSong);
                document.dispatchEvent(new CustomEvent('music888:favorites-updated'));
            } else {
                ui.showNotification('请先选择一首歌曲', 'warning');
            }
        });
    }

    // Tab buttons
    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', () => {
            const tabName = (button as HTMLElement).dataset.tab;
            if (tabName === 'hot' || tabName === 'ranking' || tabName === 'artist' || tabName === 'radio') {
                switchTab(tabName);

                // 切换到"排行榜"标签时，默认加载热歌榜（如果尚未加载）
                if (tabName === 'ranking') {
                    const rankingResults = document.getElementById('rankingResults');
                    // 如果当前是空状态，则加载热歌榜
                    if (rankingResults && rankingResults.querySelector('.empty-state')) {
                        handleRanking('hot');
                    }
                }

                // 切换到"歌手"标签时，首次加载歌手列表
                if (tabName === 'artist') {
                    const artistGrid = document.getElementById('artistGrid');
                    if (artistGrid && artistGrid.children.length === 0) {
                        handleLoadArtists(-1);
                    }
                }

                // 切换到"电台"标签时，首次加载热门电台并加载分类
                if (tabName === 'radio') {
                    if (!radioCategoriesLoaded) {
                        loadRadioCategories();
                    }
                    const radioList = document.getElementById('radioList');
                    if (radioList && radioList.children.length === 0) {
                        handleLoadRadio();
                    }
                }
            }
        });
    });

    // 排行榜标签切换
    document.querySelectorAll('.ranking-tab').forEach(button => {
        button.addEventListener('click', () => {
            // 更新激活状态
            document.querySelectorAll('.ranking-tab').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            const rankType = (button as HTMLElement).dataset.rank;
            if (rankType) handleRanking(rankType);
        });
    });

    // 清空播放历史按钮
    const clearHistoryBtn = getElement('#clearHistoryBtn');
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => {
            player.clearPlayHistory();
            ui.showEmptyState('historyResults', '暂无播放记录', 'fas fa-history');
            ui.showNotification('播放历史已清空', 'success');
        });
    }

    // 歌词字体大小调节按钮
    const lyricFontDecreaseBtn = getElement('#lyricFontDecreaseBtn');
    const lyricFontIncreaseBtn = getElement('#lyricFontIncreaseBtn');
    if (lyricFontDecreaseBtn) {
        lyricFontDecreaseBtn.addEventListener('click', () => ui.adjustLyricFontSize(-1));
    }
    if (lyricFontIncreaseBtn) {
        lyricFontIncreaseBtn.addEventListener('click', () => ui.adjustLyricFontSize(1));
    }

    // 歌手地区筛选按钮
    document.querySelectorAll('#artistAreaFilter .filter-btn').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('#artistAreaFilter .filter-btn').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            const area = parseInt((button as HTMLElement).dataset.area || '-1', 10);
            handleLoadArtists(area, artistCurrentType, artistCurrentInitial);
        });
    });

    // 歌手分类筛选按钮
    document.querySelectorAll('#artistTypeFilter .filter-btn').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('#artistTypeFilter .filter-btn').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            const type = parseInt((button as HTMLElement).dataset.type || '-1', 10);
            handleLoadArtists(artistCurrentArea, type, artistCurrentInitial);
        });
    });

    // 歌手首字母筛选按钮
    document.querySelectorAll('#artistInitialFilter .filter-btn').forEach(button => {
        button.addEventListener('click', () => {
            document
                .querySelectorAll('#artistInitialFilter .filter-btn')
                .forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            const initial = (button as HTMLElement).dataset.initial || '-1';
            handleLoadArtists(artistCurrentArea, artistCurrentType, initial === '-1' ? -1 : initial);
        });
    });

    // 返回歌手列表按钮
    const backToArtists = getElement('#backToArtists');
    if (backToArtists) {
        backToArtists.addEventListener('click', () => {
            artistDetailRequestId++;
            albumDetailRequestId++;
            resetArtistAlbumSongsView();
            showArtistListView();
        });
    }

    // 返回歌手详情按钮
    const backToArtistDetail = getElement('#backToArtistDetail');
    if (backToArtistDetail) {
        backToArtistDetail.addEventListener('click', () => {
            albumDetailRequestId++;
            resetArtistAlbumSongsView();
            showArtistDetailView();
        });
    }

    // 返回电台列表按钮
    const backToRadios = getElement('#backToRadios');
    if (backToRadios) {
        backToRadios.addEventListener('click', () => {
            resetRadioProgramsView();
            showRadioListView();
        });
    }

    // 右栏"我的"子标签切换
    document.querySelectorAll('.my-tab-btn').forEach(button => {
        button.addEventListener('click', () => {
            const tabName = (button as HTMLElement).dataset.mytab;
            if (tabName === 'playlist' || tabName === 'favorites' || tabName === 'history') {
                switchMyTab(tabName);
            }
        });
    });

    document.addEventListener('music888:favorites-updated', () => {
        loadFavorites();
    });

    document.addEventListener('music888:history-updated', () => {
        loadPlayHistory();
    });

    // NOTE: 全局键盘快捷键
    document.addEventListener('keydown', e => {
        // 如果正在输入框中，不触发快捷键
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
            return;
        }

        switch (e.code) {
            case 'Space':
                e.preventDefault();
                player.togglePlay();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                player.previousSong();
                break;
            case 'ArrowRight':
                e.preventDefault();
                player.nextSong();
                break;
            case 'ArrowUp':
                e.preventDefault();
                adjustVolume(10);
                break;
            case 'ArrowDown':
                e.preventDefault();
                adjustVolume(-10);
                break;
        }
    });
}

/**
 * 调节音量
 * @param delta 音量变化值（正数增大，负数减小）
 */
function adjustVolume(delta: number): void {
    const volumeSlider = getElement<HTMLInputElement>('#volumeSlider');
    if (volumeSlider) {
        const currentVolume = parseInt(volumeSlider.value, 10);
        const newVolume = Math.max(0, Math.min(100, currentVolume + delta));
        volumeSlider.value = newVolume.toString();
        player.setVolume(newVolume.toString());
    }
}

/**
 * 处理搜索请求
 */
async function handleSearch(): Promise<void> {
    const searchInput = getElement<HTMLInputElement>('#searchInput');

    if (!searchInput) return;

    const keyword = searchInput.value.trim();
    const source = 'netease';

    if (!keyword) {
        ui.showNotification('请输入搜索关键词', 'warning');
        return;
    }

    // NOTE: 输入长度限制，防止恶意超长输入
    if (keyword.length > 100) {
        ui.showNotification('搜索关键词过长（最多100字符）', 'warning');
        return;
    }

    const requestId = ++searchRequestId;

    // 搜索时自动切换到搜索标签
    showPrimaryContentTab('hot');

    // 搜索结果滚动到顶部
    const searchResults = document.getElementById('searchResults');
    if (searchResults) {
        searchResults.scrollTop = 0;
    }

    ui.showLoading('searchResults');

    try {
        const songs = await api.searchMusicAPI(keyword, source);
        if (requestId !== searchRequestId) return;
        ui.displaySearchResults(songs, 'searchResults', songs);

        if (songs.length === 0) {
            ui.showNotification('未找到相关歌曲', 'info');
        } else {
            ui.showNotification(`找到 ${songs.length} 首歌曲`, 'success');
        }
    } catch (error) {
        if (requestId !== searchRequestId) return;
        logger.error('Search failed:', error);
        ui.showError('搜索失败，请稍后重试', 'searchResults');
        ui.showNotification('搜索失败，请检查网络连接', 'error');
    }
}

/**
 * 处理探索雷达请求
 */
async function handleExplore(options: { silent?: boolean } = {}): Promise<void> {
    const requestId = ++searchRequestId;

    // 自动切换到搜索标签
    showPrimaryContentTab('hot');

    ui.showLoading('searchResults');

    try {
        const songs = await api.exploreRadarAPI();
        if (requestId !== searchRequestId) return;
        ui.displaySearchResults(songs, 'searchResults', songs);
    } catch (error) {
        if (requestId !== searchRequestId) return;
        logger.error('Explore failed:', error);
        if (options.silent) {
            ui.showEmptyState('searchResults', '热门推荐暂时不可用', 'fas fa-music', '可以直接搜索歌曲或稍后重试');
        } else {
            ui.showError('探索失败，请稍后重试', 'searchResults');
        }
    }
}

/**
 * 处理歌单解析请求
 */
async function handleParsePlaylist(): Promise<void> {
    const playlistIdInput = getElement<HTMLInputElement>('#playlistActionInput');
    const action = getCurrentPlaylistActionMode();

    if (!playlistIdInput) return;

    const playlistId = playlistIdInput.value;

    if (!playlistId.trim()) {
        setPlaylistActionState(action, {
            message: '请输入歌单 ID 或链接后再解析',
            type: 'error',
        });
        ui.showNotification('请输入歌单ID或链接', 'warning');
        return;
    }

    ui.showLoading('parseResults');
    setPlaylistActionState(action, {
        message: '正在解析歌单内容...',
        type: 'info',
        submitting: true,
    });

    try {
        const playlist = await api.parsePlaylistAPI(playlistId);
        ui.displaySearchResults(playlist.songs, 'parseResults', playlist.songs);

        // 显示成功解析的歌单信息
        if (playlist.name) {
            setPlaylistActionState(action, {
                message: `解析成功：${playlist.name}`,
                type: 'success',
            });
            ui.showNotification(`成功解析歌单《${playlist.name}》，共 ${playlist.count || 0} 首歌曲`, 'success');
        } else {
            setPlaylistActionState(action, {
                message: `歌单解析完成，共 ${playlist.songs.length} 首歌曲`,
                type: 'success',
            });
        }
    } catch (error) {
        logger.error('Parse playlist failed:', error);

        // 使用 MusicError 提供更友好的错误信息
        let errorMessage = '解析歌单失败';
        if (error instanceof MusicError) {
            errorMessage = error.userMessage;
            logger.error(`[${error.type}] ${error.message}`);
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }
        setPlaylistActionState(action, {
            message: errorMessage,
            type: 'error',
        });
        ui.showError(errorMessage, 'parseResults');
        ui.showNotification(errorMessage, 'error');
    }
}

/**
 * 加载"我的"标签页数据（收藏和播放历史）
 */
function loadMyTabData(): void {
    loadFavorites();
    loadPlayHistory();
}

/**
 * 切换右栏"我的"子标签
 */
function switchMyTab(tabName: MyTabName): void {
    document.querySelectorAll('.my-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.my-tab-content').forEach(content => {
        content.classList.remove('active');
    });

    const selectedBtn = document.querySelector(`.my-tab-btn[data-mytab="${tabName}"]`);
    if (selectedBtn) selectedBtn.classList.add('active');

    const panelMap: { [key: string]: string } = {
        playlist: 'myPlaylistPanel',
        favorites: 'myFavoritesPanel',
        history: 'myHistoryPanel',
        lyrics: 'myLyricsPanel',
    };

    const panelId = panelMap[tabName];
    if (panelId) {
        const panel = document.getElementById(panelId);
        if (panel) panel.classList.add('active');
    }

    // 切换到收藏或历史时刷新数据
    if (tabName === 'favorites') loadFavorites();
    if (tabName === 'history') loadPlayHistory();
    // 切换到歌词面板时立即滚动到当前播放行（若在播放）
    if (tabName === 'lyrics') requestAnimationFrame(() => ui.scrollToActiveLine());
}

/**
 * 加载歌手列表
 */
async function handleLoadArtists(
    area: number,
    type: number = -1,
    initial: string | number = -1,
    append: boolean = false
): Promise<void> {
    const artistGrid = getElement('#artistGrid');
    const requestId = ++artistListRequestId;

    if (!append) {
        artistOffset = 0;
        artistCurrentArea = area;
        artistCurrentType = type;
        artistCurrentInitial = initial;
        artistDetailRequestId++;
        albumDetailRequestId++;
        resetArtistDetailView();
        resetArtistAlbumSongsView();
        if (artistGrid) {
            ui.renderFeedbackState('artistGrid', {
                state: 'loading',
                message: '正在加载歌手...',
                iconClass: 'fas fa-spinner fa-spin',
                contentStyle: 'grid-column: 1/-1;',
            });
        }
    }

    // 确保歌手网格和筛选器可见，隐藏详情视图
    showArtistListView();

    try {
        const result = await api.getArtistList(area, type, initial, 60, artistOffset);
        if (requestId !== artistListRequestId) return;
        artistOffset += result.artists.length;
        artistHasMore = result.more;
        ui.displayArtistGrid(result.artists, 'artistGrid', handleArtistClick, {
            append,
            hasMore: artistHasMore,
            onLoadMore: () => handleLoadArtists(artistCurrentArea, artistCurrentType, artistCurrentInitial, true),
        });
    } catch (error) {
        logger.error('Load artists failed:', error);
        if (requestId !== artistListRequestId) return;
        if (artistGrid && !append) {
            ui.showError('加载歌手失败', 'artistGrid');
            const feedback = artistGrid.querySelector('[data-feedback-state="error"]');
            if (feedback) {
                (feedback as HTMLElement).style.gridColumn = '1/-1';
            }
        }
    }
}

/**
 * 点击歌手，显示歌手详情（简介 + 专辑网格）
 */
async function handleArtistClick(artist: ArtistInfo): Promise<void> {
    const artistDetailHeader = getElement('#artistDetailHeader');
    const artistDesc = getElement('#artistDesc');
    const requestId = ++artistDetailRequestId;

    // 切换视图：隐藏网格，显示歌手详情
    showArtistDetailView();
    resetArtistAlbumSongsView();
    ui.renderFeedbackState('artistAlbumGrid', {
        state: 'loading',
        message: '正在加载专辑...',
        iconClass: 'fas fa-spinner fa-spin',
        contentStyle: 'padding:20px',
    });

    // 渲染歌手头部信息
    if (artistDetailHeader) {
        const avatarUrl = artist.picUrl ? ensureHttps(`${artist.picUrl}?param=96y96`) : '';
        const metaParts: string[] = [];
        if (artist.musicSize) metaParts.push(`${artist.musicSize}首歌曲`);
        if (artist.albumSize) metaParts.push(`${artist.albumSize}张专辑`);
        artistDetailHeader.innerHTML = `
            ${avatarUrl ? `<img src="${avatarUrl}" alt="${artist.name}">` : ''}
            <div class="artist-header-info">
                <span class="artist-header-name">${artist.name}</span>
                ${metaParts.length ? `<span class="artist-header-meta">${metaParts.join(' · ')}</span>` : ''}
            </div>
        `;
    }

    // 简介区域显示加载中
    if (artistDesc) {
        artistDesc.innerHTML = '<span style="color:rgba(255,255,255,0.5)">加载简介中...</span>';
    }

    // 重置专辑分页状态
    artistAlbumsOffset = 0;
    artistAlbumsHasMore = false;
    artistDetailCurrentId = artist.id;

    // 顺序加载简介和专辑（Turnstile token 一次性，不能并行请求）
    const descResult = await api.getArtistDesc(artist.id).catch(() => ({ briefDesc: '', introduction: [] }));
    const albumsResult = await api.getArtistAlbums(artist.id, 30, 0).catch(() => ({ albums: [], more: false }));
    if (requestId !== artistDetailRequestId) return;

    // 渲染简介
    if (artistDesc) {
        const desc = descResult.briefDesc;
        if (desc) {
            const isLong = desc.length > 120;
            artistDesc.innerHTML = `
                <div class="artist-desc-text ${isLong ? 'collapsed' : ''}">${desc}</div>
                ${isLong ? '<button class="artist-desc-toggle">展开 <i class="fas fa-chevron-down"></i></button>' : ''}
            `;
            const toggleBtn = artistDesc.querySelector('.artist-desc-toggle');
            if (toggleBtn) {
                toggleBtn.addEventListener('click', () => {
                    const textEl = artistDesc.querySelector('.artist-desc-text');
                    if (textEl) {
                        const isCollapsed = textEl.classList.contains('collapsed');
                        textEl.classList.toggle('collapsed');
                        toggleBtn.innerHTML = isCollapsed
                            ? '收起 <i class="fas fa-chevron-up"></i>'
                            : '展开 <i class="fas fa-chevron-down"></i>';
                    }
                });
            }
        } else {
            artistDesc.innerHTML = '';
        }
    }

    // 渲染专辑网格
    artistAlbumsOffset = albumsResult.albums.length;
    artistAlbumsHasMore = albumsResult.more;
    ui.displayAlbumGrid(albumsResult.albums, 'artistAlbumGrid', handleAlbumClick, {
        append: false,
        hasMore: artistAlbumsHasMore,
        onLoadMore: () => loadMoreArtistAlbums(),
    });
}

/**
 * 加载更多歌手专辑
 */
async function loadMoreArtistAlbums(): Promise<void> {
    const requestId = ++artistDetailRequestId;
    try {
        const result = await api.getArtistAlbums(artistDetailCurrentId, 30, artistAlbumsOffset);
        if (requestId !== artistDetailRequestId) return;
        artistAlbumsOffset += result.albums.length;
        artistAlbumsHasMore = result.more;
        ui.displayAlbumGrid(result.albums, 'artistAlbumGrid', handleAlbumClick, {
            append: true,
            hasMore: artistAlbumsHasMore,
            onLoadMore: () => loadMoreArtistAlbums(),
        });
    } catch (error) {
        logger.error('Load more artist albums failed:', error);
        ui.showNotification('加载更多专辑失败', 'error');
    }
}

/**
 * 点击专辑，显示专辑歌曲列表
 */
async function handleAlbumClick(album: AlbumInfo): Promise<void> {
    const albumSongsHeader = getElement('#albumSongsHeader');
    const requestId = ++albumDetailRequestId;

    // 切换视图
    showAlbumSongsDetailView();

    // 渲染专辑头部
    if (albumSongsHeader) {
        const coverUrl = album.picUrl ? ensureHttps(`${album.picUrl}?param=96y96`) : '';
        const year = album.publishTime ? new Date(album.publishTime).getFullYear() : '';
        const sizePart = album.size ? `${album.size}首` : '';
        const metaParts = [year, sizePart].filter(Boolean).join(' · ');
        albumSongsHeader.innerHTML = `
            ${coverUrl ? `<img src="${coverUrl}" alt="${album.name}" style="border-radius:8px;">` : ''}
            <div class="artist-header-info">
                <span class="artist-header-name">${album.name}</span>
                ${metaParts ? `<span class="artist-header-meta">${metaParts}</span>` : ''}
            </div>
        `;
    }

    ui.renderFeedbackState('albumSongsResults', {
        state: 'loading',
        message: '正在加载专辑歌曲...',
        iconClass: 'fas fa-spinner fa-spin',
    });

    try {
        const result = await api.getAlbumDetail(album.id);
        if (requestId !== albumDetailRequestId) return;
        ui.displaySearchResults(result.songs, 'albumSongsResults', result.songs);

        if (result.songs.length === 0) {
            ui.showNotification('该专辑暂无歌曲', 'info');
        }
    } catch (error) {
        logger.error('Load album detail failed:', error);
        if (requestId !== albumDetailRequestId) return;
        ui.showError('加载专辑歌曲失败', 'albumSongsResults');
    }
}

/**
 * 加载电台分类列表
 */
async function loadRadioCategories(): Promise<void> {
    try {
        const categories = await api.getRadioCateList();
        radioCategoriesLoaded = true;
        const radioFilter = getElement('#radioFilter');
        if (radioFilter && categories.length > 0) {
            // 保留"热门"按钮，追加分类按钮
            const fragment = document.createDocumentFragment();
            categories.forEach(cat => {
                const btn = document.createElement('button');
                btn.className = 'filter-btn';
                btn.dataset.cateid = String(cat.id);
                btn.textContent = cat.name;
                fragment.appendChild(btn);
            });
            radioFilter.appendChild(fragment);

            // 绑定电台分类筛选事件（包括已有的"热门"按钮）
            radioFilter.querySelectorAll('.filter-btn').forEach(button => {
                button.addEventListener('click', () => {
                    radioFilter.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
                    button.classList.add('active');
                    const cateId = parseInt((button as HTMLElement).dataset.cateid || '0', 10);
                    radioCurrentCateId = cateId;
                    handleLoadRadio();
                });
            });
        }
    } catch (error) {
        logger.error('Load radio categories failed:', error);
    }
}

/**
 * 加载电台列表（热门或按分类）
 */
async function handleLoadRadio(append: boolean = false): Promise<void> {
    const radioList = getElement('#radioList');

    if (!append) {
        radioOffset = 0;
        if (radioList) {
            ui.showLoading('radioList');
        }
    }

    // 确保电台列表视图可见
    showRadioListView();

    try {
        let result: { radios: RadioStation[]; hasMore: boolean };
        if (radioCurrentCateId === 0) {
            result = await api.getHotRadio(60, radioOffset);
        } else {
            result = await api.getRadioByCategory(radioCurrentCateId, 60, radioOffset);
        }
        radioOffset += result.radios.length;
        radioHasMore = result.hasMore;
        ui.displayRadioList(result.radios, 'radioList', handleRadioClick, {
            append,
            hasMore: radioHasMore,
            onLoadMore: () => handleLoadRadio(true),
        });
    } catch (error) {
        logger.error('Load radio failed:', error);
        if (radioList && !append) {
            ui.showError('加载电台失败', 'radioList');
        }
    }
}

/**
 * 点击电台，加载节目列表
 */
async function handleRadioClick(radio: RadioStation): Promise<void> {
    const radioProgramsHeader = getElement('#radioProgramsHeader');

    // 切换视图
    showRadioProgramsView();

    // 渲染电台头部
    if (radioProgramsHeader) {
        const coverUrl = radio.picUrl ? ensureHttps(`${radio.picUrl}?param=96y96`) : '';
        radioProgramsHeader.innerHTML = `
            ${coverUrl ? `<img src="${coverUrl}" alt="${radio.name}">` : ''}
            <span class="radio-header-name">${radio.name}</span>
        `;
    }

    ui.showLoading('radioProgramResults');

    try {
        const result = await api.getRadioPrograms(radio.id);
        ui.displayRadioPrograms(result.programs, 'radioProgramResults', handleRadioProgramPlay);
    } catch (error) {
        logger.error('Load radio programs failed:', error);
        ui.showError('加载电台节目失败', 'radioProgramResults');
    }
}

/**
 * 播放电台节目
 */
async function handleRadioProgramPlay(program: RadioProgram): Promise<void> {
    // 将电台节目转为 Song 格式，使用 mainTrackId 作为歌曲 ID
    const song = {
        id: String(program.mainTrackId),
        name: program.name,
        artist: program.dj?.nickname ? [program.dj.nickname] : ['未知主播'],
        album: '电台节目',
        pic_id: '',
        pic_url: program.coverUrl || '',
        lyric_id: String(program.mainTrackId),
        source: 'netease',
        duration: program.duration,
    };

    player.playSong(0, [song], 'radioProgramResults');
}

/**
 * 加载收藏列表
 */
function loadFavorites(): void {
    const favorites = player.getFavorites();
    const container = getElement('#favoritesResults');
    const countBadge = getElement('#favoritesCount');

    if (countBadge) {
        countBadge.textContent = favorites.length.toString();
    }

    // NOTE: 无论收藏数量如何都更新容器，确保空列表时显示空状态
    if (container) {
        if (favorites.length > 0) {
            ui.displaySearchResults(favorites, 'favoritesResults', favorites);
        } else {
            ui.showEmptyState(
                'favoritesResults',
                '暂无收藏的歌曲',
                'far fa-heart',
                '点击歌曲旁的爱心添加收藏',
                undefined,
                'margin-top: 8px; font-size: 12px; opacity: 0.7;'
            );
        }
    }
}

/**
 * 加载播放历史
 */
function loadPlayHistory(): void {
    const history = player.getPlayHistory();
    const container = getElement('#historyResults');

    // NOTE: 无论历史记录数量如何都更新容器
    if (container) {
        if (history.length > 0) {
            ui.displaySearchResults(history, 'historyResults', history);
        } else {
            ui.showEmptyState('historyResults', '暂无播放记录', 'fas fa-history');
        }
    }
}

/**
 * 加载用户公开歌单
 */
async function handleLoadUserPlaylists(): Promise<void> {
    const userIdInput = getElement<HTMLInputElement>('#playlistActionInput');
    const action = getCurrentPlaylistActionMode();
    if (!userIdInput) return;

    const uid = userIdInput.value.trim();
    if (!uid || !/^\d+$/.test(uid)) {
        setPlaylistActionState(action, {
            message: '请输入有效的用户 ID（纯数字）',
            type: 'error',
        });
        ui.showNotification('请输入有效的用户ID（纯数字）', 'warning');
        return;
    }

    // 持久化用户ID
    try {
        localStorage.setItem('music888_userId', uid);
    } catch {
        /* localStorage 不可用（隐私模式等） */
    }

    const container = getElement('#userPlaylistsContainer');
    const listEl = getElement('#userPlaylistsList');
    if (container) (container as HTMLElement).style.display = '';
    if (listEl) {
        ui.renderFeedbackState('userPlaylistsList', {
            state: 'loading',
            message: '正在加载...',
            iconClass: 'fas fa-spinner fa-spin',
            contentStyle: 'padding:20px',
        });
    }
    setPlaylistActionState(action, {
        message: '正在加载用户公开歌单...',
        type: 'info',
        submitting: true,
    });

    try {
        const playlists = await api.getUserPlaylists(uid);
        const savedRadios = loadSavedRadios();
        renderUserPlaylistList(playlists, savedRadios);
        setPlaylistActionState(action, {
            message: `已加载 ${playlists.length} 个歌单`,
            type: 'success',
        });
        ui.showNotification(`已加载 ${playlists.length} 个歌单`, 'success');
    } catch (error) {
        logger.error('Load user playlists failed:', error);
        if (listEl) {
            ui.showError('加载歌单失败', 'userPlaylistsList');
        }
        setPlaylistActionState(action, {
            message: '加载用户歌单失败，请稍后重试',
            type: 'error',
        });
        ui.showNotification('加载用户歌单失败', 'error');
    }
}

/**
 * 添加电台
 */
async function handleAddRadio(): Promise<void> {
    const radioIdInput = getElement<HTMLInputElement>('#playlistActionInput');
    const action = getCurrentPlaylistActionMode();
    if (!radioIdInput) return;

    const rid = radioIdInput.value.trim();
    if (!rid || !/^\d+$/.test(rid)) {
        setPlaylistActionState(action, {
            message: '请输入有效的电台 ID（纯数字）',
            type: 'error',
        });
        ui.showNotification('请输入有效的电台ID（纯数字）', 'warning');
        return;
    }

    setPlaylistActionState(action, {
        message: '正在获取电台信息...',
        type: 'info',
        submitting: true,
    });
    ui.showNotification('正在获取电台信息...', 'info');

    try {
        const radio = await api.getRadioDetail(parseInt(rid, 10));
        if (!radio) {
            setPlaylistActionState(action, {
                message: '未找到该电台',
                type: 'error',
            });
            ui.showNotification('未找到该电台', 'warning');
            return;
        }

        saveRadioToStorage(radio);
        radioIdInput.value = '';

        // 刷新列表
        const savedUserId = localStorage.getItem('music888_userId');
        if (savedUserId) {
            const playlists = await api.getUserPlaylists(savedUserId);
            renderUserPlaylistList(playlists, loadSavedRadios());
        } else {
            renderUserPlaylistList([], loadSavedRadios());
        }

        const container = getElement('#userPlaylistsContainer');
        if (container) (container as HTMLElement).style.display = '';

        setPlaylistActionState(action, {
            message: `已添加电台「${radio.name}」`,
            type: 'success',
        });
        ui.showNotification(`已添加电台「${radio.name}」`, 'success');
    } catch (error) {
        logger.error('Add radio failed:', error);
        setPlaylistActionState(action, {
            message: '添加电台失败，请稍后重试',
            type: 'error',
        });
        ui.showNotification('添加电台失败', 'error');
    }
}

/**
 * 点击歌单项，加载歌曲
 */
async function handlePlaylistItemClick(playlist: UserPlaylist): Promise<void> {
    ui.showLoading('parseResults');

    try {
        const result = await api.parsePlaylistAPI(String(playlist.id));
        ui.displaySearchResults(result.songs, 'parseResults', result.songs);
        if (result.name) {
            ui.showNotification(`已加载歌单「${result.name}」，共 ${result.songs.length} 首`, 'success');
        }
    } catch (error) {
        logger.error('Load playlist songs failed:', error);
        ui.showError('加载歌单歌曲失败', 'parseResults');
    }
}

/**
 * 点击电台项，加载节目
 */
async function handleRadioItemClick(radio: RadioStation): Promise<void> {
    ui.showLoading('parseResults');

    try {
        const result = await api.getRadioPrograms(radio.id);
        ui.displayRadioPrograms(result.programs, 'parseResults', handleRadioProgramPlay);
        ui.showNotification(`已加载电台「${radio.name}」，共 ${result.programs.length} 个节目`, 'success');
    } catch (error) {
        logger.error('Load radio programs failed:', error);
        ui.showError('加载电台节目失败', 'parseResults');
    }
}

/**
 * 读取已保存的电台列表
 */
function loadSavedRadios(): RadioStation[] {
    try {
        const saved = localStorage.getItem('music888_savedRadios');
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
}

/**
 * 保存电台到 localStorage
 */
function saveRadioToStorage(radio: RadioStation): void {
    const radios = loadSavedRadios();
    if (!radios.some(r => r.id === radio.id)) {
        radios.push(radio);
        try {
            localStorage.setItem('music888_savedRadios', JSON.stringify(radios));
        } catch {
            /* localStorage 不可用 */
        }
    }
}

/**
 * 渲染用户歌单 + 电台合并列表
 */
function renderUserPlaylistList(playlists: UserPlaylist[], radios: RadioStation[]): void {
    const listEl = getElement('#userPlaylistsList');
    if (!listEl) return;

    listEl.innerHTML = '';

    if (playlists.length === 0 && radios.length === 0) {
        ui.showEmptyState('userPlaylistsList', '暂无歌单或电台', 'fas fa-music', undefined, 'padding:20px');
        return;
    }

    const fragment = document.createDocumentFragment();

    // 渲染歌单
    for (const pl of playlists) {
        const item = document.createElement('div');
        item.className = 'playlist-item';
        const coverUrl = pl.coverImgUrl ? `${pl.coverImgUrl}?param=80y80` : '';
        item.innerHTML = `
            ${coverUrl ? `<img class="playlist-item-cover" src="${coverUrl}" alt="${pl.name}" loading="lazy">` : ''}
            <div class="playlist-item-info">
                <div class="playlist-item-name">${pl.name}</div>
                <div class="playlist-item-details"><span>${pl.trackCount} 首</span></div>
            </div>
        `;
        item.addEventListener('click', () => handlePlaylistItemClick(pl));
        fragment.appendChild(item);
    }

    // 渲染电台
    for (const radio of radios) {
        const item = document.createElement('div');
        item.className = 'playlist-item';
        const coverUrl = radio.picUrl ? ensureHttps(`${radio.picUrl}?param=80y80`) : '';
        item.innerHTML = `
            ${coverUrl ? `<img class="playlist-item-cover" src="${coverUrl}" alt="${radio.name}" loading="lazy">` : ''}
            <div class="playlist-item-info">
                <div class="playlist-item-name"><i class="fas fa-podcast" style="color: var(--color-primary); margin-right: 4px; font-size: 12px;"></i>${radio.name}</div>
                <div class="playlist-item-details"><span>${radio.programCount || 0} 期</span></div>
            </div>
            <button class="playlist-action-btn delete" title="移除电台" style="flex-shrink:0">
                <i class="fas fa-times"></i>
            </button>
        `;
        item.querySelector('.playlist-item-info')?.addEventListener('click', () => handleRadioItemClick(radio));
        item.querySelector('.playlist-action-btn.delete')?.addEventListener('click', e => {
            e.stopPropagation();
            removeRadioFromStorage(radio.id);
            item.remove();
            ui.showNotification(`已移除电台「${radio.name}」`, 'success');
        });
        fragment.appendChild(item);
    }

    listEl.appendChild(fragment);
}

/**
 * 从 localStorage 移除电台
 */
function removeRadioFromStorage(radioId: number): void {
    const radios = loadSavedRadios().filter(r => r.id !== radioId);
    try {
        localStorage.setItem('music888_savedRadios', JSON.stringify(radios));
    } catch {
        /* localStorage 不可用 */
    }
}

/**
 * 初始化时自动恢复用户歌单
 */
async function restoreUserPlaylists(): Promise<void> {
    const savedUserId = localStorage.getItem('music888_userId');
    const savedRadios = loadSavedRadios();

    if (!savedUserId && savedRadios.length === 0) return;

    // 填入已保存的用户ID，并确保 select 选中"用户歌单"
    const actionInput = getElement<HTMLInputElement>('#playlistActionInput');
    const actionSelect = getElement<HTMLSelectElement>('#playlistActionSelect');
    if (actionInput && savedUserId) {
        actionInput.value = savedUserId;
    }
    if (actionSelect) {
        actionSelect.value = 'user';
        syncPlaylistActionUi('user');
    }

    const container = getElement('#userPlaylistsContainer');
    if (container) (container as HTMLElement).style.display = '';

    if (savedUserId) {
        try {
            const playlists = await api.getUserPlaylists(savedUserId);
            renderUserPlaylistList(playlists, savedRadios);
        } catch {
            renderUserPlaylistList([], savedRadios);
        }
    } else {
        renderUserPlaylistList([], savedRadios);
    }
}

/**
 * 处理排行榜加载
 */
async function handleRanking(rankType: string): Promise<void> {
    ui.showLoading('rankingResults');

    // NOTE: 根据排行榜类型使用不同的关键词
    const keywords: { [key: string]: string } = {
        hot: '热歌榜',
        new: '新歌',
        soar: '飙升',
    };

    const keyword = keywords[rankType] || '热门';

    try {
        const songs = await api.searchMusicAPI(keyword, 'netease');
        ui.displaySearchResults(songs, 'rankingResults', songs);
    } catch (error) {
        logger.error('Ranking load failed:', error);
        ui.showError('加载排行榜失败', 'rankingResults');
    }
}

// --- 应用启动 ---
document.addEventListener('DOMContentLoaded', () => {
    // 初始化主应用
    initializeApp();

    // NOTE: 快速歌单ID事件委托（替代 inline onclick）
    document.querySelectorAll('.quick-id[data-playlist-id]').forEach(el => {
        el.addEventListener('click', () => {
            const playlistInput = getElement<HTMLInputElement>('#playlistActionInput');
            const playlistSelect = getElement<HTMLSelectElement>('#playlistActionSelect');
            if (playlistInput) {
                playlistInput.value = (el as HTMLElement).dataset.playlistId || '';
            }
            // 自动切换到歌单解析模式
            if (playlistSelect) {
                playlistSelect.value = 'playlist';
                playlistSelect.dispatchEvent(new Event('change'));
            }
        });
    });

    // NOTE: 移动端触摸滑动支持
    const mainContainer = document.querySelector('.main-container');
    if (mainContainer) {
        mainContainer.addEventListener(
            'touchstart',
            e => {
                touchStartX = (e as TouchEvent).changedTouches[0].screenX;
                touchStartY = (e as TouchEvent).changedTouches[0].screenY;
            },
            { passive: true }
        );

        mainContainer.addEventListener(
            'touchend',
            e => {
                touchEndX = (e as TouchEvent).changedTouches[0].screenX;
                touchEndY = (e as TouchEvent).changedTouches[0].screenY;
                handleSwipe();
            },
            { passive: true }
        );
    }

    // NOTE: 阻止可横向滚动的 filter-bar 触发页面滑动
    document.querySelectorAll('.filter-bar').forEach(bar => {
        bar.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
        bar.addEventListener('touchend', e => e.stopPropagation(), { passive: true });
    });

    // NOTE: 页面指示器点击事件委托
    const indicatorContainer = document.querySelector('.mobile-page-indicators');
    if (indicatorContainer) {
        indicatorContainer.addEventListener('click', e => {
            const target = e.target as HTMLElement;
            if (target.classList.contains('page-indicator')) {
                const pageIndex = parseInt(target.dataset.page || '0', 10);
                switchMobilePage(pageIndex);
            }
        });
    }

    // NOTE: 初始化移动端页面指示器
    if (window.innerWidth <= 768) {
        // NOTE: 等待 DOM 渲染完成后再执行跳转
        setTimeout(() => switchMobilePage(0), 100);
    }

    // NOTE: 监听窗口大小变化，自动切换移动端/桌面端布局
    window.addEventListener('resize', () => {
        const mainContainer = document.querySelector('.main-container') as HTMLElement;
        if (window.innerWidth <= 768) {
            switchMobilePage(currentMobilePage);
        } else if (mainContainer) {
            // 桌面端清除移动端 transform
            mainContainer.style.transform = '';
        }
    });
});

function handleSwipe(): void {
    const swipeThreshold = 50; // 最小滑动距离
    const diffX = touchStartX - touchEndX;
    const diffY = touchStartY - touchEndY;

    // NOTE: 只有当横向滑动距离大于纵向滑动距离时，才视为页面切换手势
    // 这样可以保证内容区的垂直滚动不受影响
    if (Math.abs(diffX) > swipeThreshold && Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX > 0 && currentMobilePage < 2) {
            // 向左滑动 - 下一页
            switchMobilePage(currentMobilePage + 1);
        } else if (diffX < 0 && currentMobilePage > 0) {
            // 向右滑动 - 上一页
            switchMobilePage(currentMobilePage - 1);
        }
    }
}

/**
 * 显示 Turnstile 验证挑战
 */
function showTurnstileChallenge(siteKey: string): Promise<void> {
    return new Promise(resolve => {
        const modal = getElement('#turnstileModal');
        const widgetContainer = getElement('#turnstileWidget');
        if (!modal || !widgetContainer) {
            resolve();
            return;
        }

        (modal as HTMLElement).style.display = '';

        // 等待 Turnstile 脚本加载
        const tryRender = () => {
            if (window.turnstile) {
                window.turnstile.render(widgetContainer, {
                    sitekey: siteKey,
                    theme: 'dark',
                    callback: (token: string) => {
                        sessionStorage.setItem('music888_turnstile_token', token);
                        localStorage.setItem('music888_turnstile_verified', '1');
                        (modal as HTMLElement).style.display = 'none';
                        resolve();
                    },
                    'error-callback': () => {
                        // Fail-open: 验证出错时放行
                        logger.error('Turnstile verification failed, proceeding anyway');
                        (modal as HTMLElement).style.display = 'none';
                        resolve();
                    },
                });
            } else {
                setTimeout(tryRender, 200);
            }
        };
        tryRender();
    });
}

/**
 * 显示首次访问引导弹窗
 */
function showOnboardingIfNeeded(): void {
    if (localStorage.getItem('music888_onboarded')) return;

    const modal = getElement('#onboardingModal');
    if (!modal) return;

    (modal as HTMLElement).style.display = '';

    const dismissBtn = getElement('#onboardingDismissBtn');

    const dismiss = () => {
        try {
            localStorage.setItem('music888_onboarded', '1');
        } catch {
            /* ignore */
        }
        (modal as HTMLElement).style.display = 'none';
    };

    if (dismissBtn) {
        dismissBtn.addEventListener('click', dismiss);
    }

    // 点击遮罩也可关闭
    modal.addEventListener('click', e => {
        if (e.target === modal) dismiss();
    });
}

/**
 * 注册 Service Worker
 */
function registerServiceWorker(): void {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker
                .register('/sw.js')
                .then(registration => {
                    logger.debug('SW registered:', registration);
                })
                .catch(error => {
                    logger.debug('SW registration failed:', error);
                });
        });
    }
}
