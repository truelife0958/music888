import { Song } from './api.js';
import * as player from './player.js';
import { formatTime, formatArtist } from './utils.js';
import { LyricLine } from './types.js';
import { VirtualScroll, createSongListVirtualScroll } from './virtual-scroll.js';

// --- DOM Element Cache ---
interface DOMElements {
    searchResults: HTMLElement;
    parseResults: HTMLElement;
    savedResults: HTMLElement;
    currentCover: HTMLImageElement;
    currentTitle: HTMLElement;
    currentArtist: HTMLElement;
    playBtn: HTMLElement;
    progressFill: HTMLElement;
    currentTime: HTMLElement;
    totalTime: HTMLElement;
    lyricsContainer: HTMLElement;
    downloadSongBtn: HTMLButtonElement;
    downloadLyricBtn: HTMLButtonElement;
}

let DOM: DOMElements;

// --- 多选状态管理 ---
let selectedSongs = new Set<number>();
let currentSongList: Song[] = [];

// 优化: 存储事件监听器引用，防止内存泄漏
const containerEventListeners = new WeakMap<HTMLElement, (e: Event) => void>();

// 虚拟滚动实例管理
const virtualScrollInstances = new WeakMap<HTMLElement, VirtualScroll>();

// 优化: 添加全局清理函数
export function cleanup(): void {
    // 清理所有事件监听器
    const containers = [
        document.getElementById('searchResults'),
        document.getElementById('parseResults'),
        document.getElementById('savedResults')
    ];
    
    containers.forEach(container => {
        if (container) {
            const listener = containerEventListeners.get(container);
            if (listener) {
                container.removeEventListener('click', listener);
            }
            
            // 清理虚拟滚动实例
            const virtualScroll = virtualScrollInstances.get(container);
            if (virtualScroll) {
                virtualScroll.destroy();
                virtualScrollInstances.delete(container);
            }
        }
    });
}

// 页面卸载时自动清理
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', cleanup);
}

export function init(): void {
    // 修复BUG-001：添加严格的元素检查
    const lyricsContainer = document.getElementById('lyricsContainerInline');

    if (!lyricsContainer) {
        console.error('❌ [UI.init] 致命错误：找不到歌词容器 #lyricsContainerInline');
        console.error('❌ [UI.init] 请检查 index.html 中是否存在该元素');
        // 创建警告提示
        document.body.insertAdjacentHTML('afterbegin', `
            <div style="position:fixed;top:0;left:0;right:0;background:#f44336;color:#fff;padding:10px;text-align:center;z-index:9999;">
                ⚠️ 歌词功能初始化失败：缺少必需的DOM元素
            </div>
        `);
    } else {
        console.log('✅ [UI.init] 歌词容器初始化成功');
    }

    DOM = {
        searchResults: document.getElementById('searchResults')!,
        parseResults: document.getElementById('parseResults')!,
        savedResults: document.getElementById('savedResults') || document.createElement('div'),
        currentCover: document.getElementById('currentCover') as HTMLImageElement,
        currentTitle: document.getElementById('currentTitle')!,
        currentArtist: document.getElementById('currentArtist')!,
        playBtn: document.getElementById('playBtn')!,
        progressFill: document.getElementById('progressFill')!,
        currentTime: document.getElementById('currentTime')!,
        totalTime: document.getElementById('totalTime')!,
        // 修复：确保歌词容器存在，不存在则抛出错误
        lyricsContainer: lyricsContainer!,
        downloadSongBtn: document.getElementById('downloadSongBtn') as HTMLButtonElement,
        downloadLyricBtn: document.getElementById('downloadLyricBtn') as HTMLButtonElement,
    };

    // 修复：验证所有关键元素
    const criticalElements: Array<keyof DOMElements> = ['searchResults', 'playBtn', 'currentCover', 'lyricsContainer'];
    criticalElements.forEach(key => {
        if (!DOM[key]) {
            console.error(`❌ 关键元素缺失: ${key}`);
        }
    });
}

// --- UI Functions ---

export function showNotification(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    const notification = document.createElement('div');
    // A basic notification style, can be improved in CSS
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 10px 20px;
        border-radius: 5px;
        color: white;
        background-color: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
        z-index: 1001;
        transition: opacity 0.5s;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

// 优化: 创建单个歌曲元素
function createSongElement(song: Song, index: number, playlistForPlayback: Song[], containerId: string): HTMLElement {
    const songItem = document.createElement('div');
    songItem.className = 'song-item';
    songItem.dataset.index = String(index);

    const isFavorite = player.isSongInFavorites(song);
    const favoriteIconClass = isFavorite ? 'fas fa-heart' : 'far fa-heart';
    const favoriteIconColor = isFavorite ? 'color: #ff6b6b;' : '';

    // 老王新增：添加复选框，用于批量选择
    const albumText = song.album && song.album.trim() ? ` · ${escapeHtml(song.album)}` : '';
    songItem.innerHTML = `
        <input type="checkbox" class="song-checkbox" data-song-index="${index}" />
        <div class="song-index">${(index + 1).toString().padStart(2, '0')}</div>
        <div class="song-info">
            <div class="song-name">${escapeHtml(song.name)}</div>
            <div class="song-artist">${escapeHtml(formatArtist(song.artist))}${albumText}</div>
        </div>
        <div class="song-actions">
            <button class="action-btn favorite-btn" title="添加到我的喜欢" data-action="favorite">
                <i class="${favoriteIconClass}" style="${favoriteIconColor}"></i>
            </button>
            <button class="action-btn download-btn" title="下载音乐" data-action="download">
                <i class="fas fa-download"></i>
            </button>
        </div>
    `;

    return songItem;
}

// 优化: HTML 转义防止 XSS
function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 优化: 使用虚拟滚动和事件委托，大幅提升大列表性能
export function displaySearchResults(songs: Song[], containerId: string, playlistForPlayback: Song[]): void {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (songs.length === 0) {
        container.innerHTML = `<div class="empty-state"><div>未找到相关歌曲</div></div>`;
        return;
    }

    // 清理旧的虚拟滚动实例
    const oldVirtualScroll = virtualScrollInstances.get(container);
    if (oldVirtualScroll) {
        oldVirtualScroll.destroy();
        virtualScrollInstances.delete(container);
    }

    // 优化: 移除旧的事件监听器，防止内存泄漏
    const oldListener = containerEventListeners.get(container);
    if (oldListener) {
        container.removeEventListener('click', oldListener);
    }

    // 判断是否需要使用虚拟滚动（超过1000首歌曲时启用）
    // 老王修改：提高阈值以确保排行榜等功能也能使用批量操作
    const USE_VIRTUAL_SCROLL_THRESHOLD = 1000;

    if (songs.length > USE_VIRTUAL_SCROLL_THRESHOLD) {
        // 使用虚拟滚动优化性能
        console.log(`🚀 启用虚拟滚动优化 (${songs.length} 首歌曲)`);
        const virtualScroll = createSongListVirtualScroll(
            container,
            songs,
            playlistForPlayback,
            containerId
        );
        virtualScrollInstances.set(container, virtualScroll);
    } else {
        // 歌曲数量较少，使用传统渲染方式
        // 老王新增：创建批量操作栏
        const batchActionsBar = document.createElement('div');
        batchActionsBar.className = 'batch-actions-bar';
        batchActionsBar.innerHTML = `
            <div class="batch-actions-left">
                <span class="batch-count">已选择 0 首</span>
                <button class="batch-action-btn" data-batch-action="select-all">
                    <i class="fas fa-check-square"></i> 全选
                </button>
                <button class="batch-action-btn" data-batch-action="deselect-all">
                    <i class="far fa-square"></i> 取消全选
                </button>
                <button class="batch-action-btn" data-batch-action="invert">
                    <i class="fas fa-retweet"></i> 反选
                </button>
            </div>
            <div class="batch-actions-right">
                <button class="batch-action-btn" data-batch-action="favorite" disabled>
                    <i class="fas fa-heart"></i> 批量收藏
                </button>
                <button class="batch-action-btn" data-batch-action="download" disabled>
                    <i class="fas fa-download"></i> 批量下载
                </button>
                <button class="batch-action-btn" data-batch-action="play" disabled>
                    <i class="fas fa-play"></i> 播放选中
                </button>
            </div>
        `;

        // 优化: 使用 DocumentFragment 批量插入 DOM
        const fragment = document.createDocumentFragment();

        // 先添加批量操作栏
        fragment.appendChild(batchActionsBar);

        songs.forEach((song, index) => {
            const songElement = createSongElement(song, index, playlistForPlayback, containerId);
            fragment.appendChild(songElement);
        });

        // 优化: 一次性清空并插入，减少重排
        container.innerHTML = '';
        container.appendChild(fragment);

        // 优化: 创建新的事件监听器并保存引用
        const clickHandler = (e: Event) => {
            const target = e.target as HTMLElement;

            // 老王新增：处理批量操作按钮点击
            const batchAction = target.closest('[data-batch-action]')?.getAttribute('data-batch-action');
            if (batchAction) {
                handleBatchAction(batchAction, containerId);
                return;
            }

            // 老王新增：处理复选框点击事件
            if (target.classList.contains('song-checkbox')) {
                const checkbox = target as HTMLInputElement;
                const index = parseInt(checkbox.dataset.songIndex || '0');

                if (checkbox.checked) {
                    selectedSongs.add(index);
                } else {
                    selectedSongs.delete(index);
                }

                // 更新批量操作按钮状态
                updateBatchActionsState(containerId);
                return;
            }

            const songItem = target.closest('.song-item') as HTMLElement;

            if (!songItem) return;

            const index = parseInt(songItem.dataset.index || '0');
            const action = target.closest('[data-action]')?.getAttribute('data-action');

            if (action === 'favorite') {
                e.stopPropagation();
                const song = playlistForPlayback[index];
                player.toggleFavoriteButton(song);

                // 优化: 乐观更新 UI
                const icon = target.closest('.favorite-btn')?.querySelector('i');
                if (icon && player.isSongInFavorites(song)) {
                    icon.className = 'fas fa-heart';
                    icon.style.color = '#ff6b6b';
                } else if (icon) {
                    icon.className = 'far fa-heart';
                    icon.style.color = '';
                }
            } else if (action === 'download') {
                e.stopPropagation();
                player.downloadSongByData(playlistForPlayback[index]);
            } else {
                // 点击歌曲项播放（但排除复选框和操作按钮区域）
                if (!target.closest('.song-actions') && !target.classList.contains('song-checkbox')) {
                    player.playSong(index, playlistForPlayback, containerId);
                }
            }
        };

        // 添加新的事件监听器并保存引用
        container.addEventListener('click', clickHandler);
        containerEventListeners.set(container, clickHandler);

        // 老王新增：保存当前歌曲列表，供批量操作使用
        currentSongList = playlistForPlayback;
        selectedSongs.clear(); // 切换列表时清空选中状态
    }
}

export function updatePlayButton(isPlaying: boolean): void {
    const icon = DOM.playBtn.querySelector('i')!;
    icon.className = isPlaying ? 'fas fa-pause' : 'fas fa-play';
}

export function updateCurrentSongInfo(song: Song, coverUrl: string): void {
    DOM.currentTitle.textContent = song.name;
    const albumText = song.album && song.album.trim() ? ` · ${song.album}` : '';
    DOM.currentArtist.textContent = `${formatArtist(song.artist)}${albumText}`;
    
    // 优化: 使用图片懒加载
    const coverImg = DOM.currentCover as HTMLImageElement;
    if (coverUrl) {
        // 添加加载状态
        coverImg.classList.add('loading');
        coverImg.classList.remove('loaded', 'error');
        
        // 预加载图片
        const tempImg = new Image();
        tempImg.onload = () => {
            coverImg.src = coverUrl;
            coverImg.classList.remove('loading');
            coverImg.classList.add('loaded');
        };
        tempImg.onerror = () => {
            // 使用默认封面
            coverImg.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjIwIiBoZWlnaHQ9IjIyMCIgdmlld0JveD0iMCAwIDIyMCAyMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMjAiIGhlaWdodD0iMjIwIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU5LDAuMSkiIHJ4PSIyMCIvPgo8cGF0aCBkPSJNMTEwIDcwTDE0MCAxMTBIMTIwVjE1MEg5MFYxMTBINzBMMTEwIDcwWiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjMpIi8+Cjwvc3ZnPgo=';
            coverImg.classList.remove('loading');
            coverImg.classList.add('error');
        };
        tempImg.src = coverUrl;
    }
    
    (DOM.downloadSongBtn as HTMLButtonElement).disabled = false;
    (DOM.downloadLyricBtn as HTMLButtonElement).disabled = false;
}

export function updateProgress(currentTime: number, duration: number): void {
    const progressPercent = (currentTime / duration) * 100;
    DOM.progressFill.style.width = `${progressPercent}%`;
    DOM.currentTime.textContent = formatTime(currentTime);
    DOM.totalTime.textContent = formatTime(duration);
}

// 优化: 缓存上次激活的歌词索引和渲染的歌词
let lastActiveLyricIndex = -1;
let lastRenderedLyrics: LyricLine[] = [];

export function updateLyrics(lyrics: LyricLine[], currentTime: number): void {
    console.log('🔧 [UI.updateLyrics] 开始更新歌词', { lyricsCount: lyrics.length, currentTime, hasDOM: !!DOM.lyricsContainer, hasParent: !!DOM.lyricsContainer?.parentNode });

    // 修复：增强安全检查
    if (!DOM.lyricsContainer || !DOM.lyricsContainer.parentNode) {
        console.warn('⚠️ 歌词容器不可用，跳过更新');
        return;
    }
    
    if (!lyrics.length) {
        if (DOM.lyricsContainer) {
            DOM.lyricsContainer.innerHTML = '<div class="lyric-line">暂无歌词</div>';
        }
        const inlineContainer = document.getElementById('lyricsContainerInline');
        if (inlineContainer) {
            inlineContainer.innerHTML = '<div class="lyric-line">暂无歌词</div>';
        }
        lastActiveLyricIndex = -1;
        lastRenderedLyrics = [];
        return;
    }

    // 优化: 检查是否需要重新渲染歌词列表
    const needsRerender = lyrics !== lastRenderedLyrics;
    
    if (needsRerender) {
        renderLyricsList(lyrics);
        lastRenderedLyrics = lyrics;
        lastActiveLyricIndex = -1; // 重置索引
        
        // 修复: 首次渲染后立即更新激活状态
        const activeIndex = findActiveLyricIndex(lyrics, currentTime);
        if (activeIndex >= 0) {
            lastActiveLyricIndex = activeIndex;
            updateLyricActiveState(DOM.lyricsContainer, activeIndex);
            
            const inlineContainer = document.getElementById('lyricsContainerInline');
            if (inlineContainer) {
                updateLyricActiveState(inlineContainer, activeIndex);
            }
        }
        return;
    }

    // 优化: 二分查找活动歌词索引
    const activeIndex = findActiveLyricIndex(lyrics, currentTime);

    // 优化: 只在索引变化时更新 DOM
    if (activeIndex === lastActiveLyricIndex) {
        return;
    }
    
    lastActiveLyricIndex = activeIndex;

    // 优化: 只更新激活状态，而不是重新渲染整个列表
    updateLyricActiveState(DOM.lyricsContainer, activeIndex);
    
    const inlineContainer = document.getElementById('lyricsContainerInline');
    if (inlineContainer) {
        updateLyricActiveState(inlineContainer, activeIndex);
    }
}

// 优化: 渲染歌词列表 - 增强安全检查
function renderLyricsList(lyrics: LyricLine[]): void {
    // 老王修复BUG-LYRICS-002：不要破坏三行歌词容器的固定结构！
    // 三行歌词容器只有3个固定div，不应该被替换成所有歌词的列表
    console.log('📋 [renderLyricsList] 渲染歌词列表，共', lyrics.length, '行');

    // 对于标准歌词容器（如果有的话），渲染完整列表
    if (DOM.lyricsContainer && DOM.lyricsContainer.parentNode) {
        const containerId = DOM.lyricsContainer.id;
        // 只有非三行歌词容器才渲染完整列表
        if (containerId !== 'lyricsContainerInline') {
            const lyricsHTML = lyrics.map((line, index) =>
                `<div class="lyric-line" data-time="${escapeHtml(String(line.time))}" data-index="${escapeHtml(String(index))}">${escapeHtml(line.text)}</div>`
            ).join('');
            DOM.lyricsContainer.innerHTML = lyricsHTML;
            console.log('✅ [renderLyricsList] 已渲染标准歌词容器');
        }
    }

    // 三行歌词容器不需要重新渲染HTML，只需要在updateLyricActiveState中更新内容
    console.log('⏩ [renderLyricsList] 跳过三行歌词容器的HTML渲染，保持固定结构');
}

// 优化: 二分查找活动歌词
function findActiveLyricIndex(lyrics: LyricLine[], currentTime: number): number {
    let left = 0;
    let right = lyrics.length - 1;
    let result = -1;
    
    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        
        if (lyrics[mid].time <= currentTime) {
            result = mid;
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    
    return result;
}

// 优化: 只更新激活状态，不重新渲染 - 支持三行歌词显示
function updateLyricActiveState(container: HTMLElement | null, activeIndex: number): void {
    if (!container) {
        console.warn('⚠️ [updateLyricActiveState] 容器为空');
        return;
    }

    const lines = container.querySelectorAll('.lyric-line');
    console.log('🎯 [updateLyricActiveState]', {
        containerId: container.id,
        linesCount: lines.length,
        activeIndex,
        allLyricsCount: lastRenderedLyrics.length
    });

    if (lines.length === 0) {
        console.warn('⚠️ [updateLyricActiveState] 没有找到歌词行元素');
        return;
    }

    // 检查是否是内联三行歌词容器
    const isInlineContainer = container.id === 'lyricsContainerInline';

    if (isInlineContainer && lines.length >= 3) {
        console.log('✨ [updateLyricActiveState] 三行歌词模式');

        // 三行歌词模式：上一句、当前句、下一句
        const prevLine = lines[0] as HTMLElement;
        const currentLine = lines[1] as HTMLElement;
        const nextLine = lines[2] as HTMLElement;

        // 清除所有类名
        prevLine.className = 'lyric-line lyric-prev';
        currentLine.className = 'lyric-line lyric-current active';
        nextLine.className = 'lyric-line lyric-next';

        // 获取歌词数组
        const allLyrics = lastRenderedLyrics;
        if (allLyrics.length === 0) {
            prevLine.textContent = '';
            currentLine.textContent = '暂无歌词';
            nextLine.textContent = '';
            console.log('⚠️ [updateLyricActiveState] 歌词数组为空');
            return;
        }

        // 更新三行歌词内容
        if (activeIndex >= 0 && activeIndex < allLyrics.length) {
            // 上一句
            if (activeIndex > 0) {
                prevLine.textContent = allLyrics[activeIndex - 1].text;
            } else {
                prevLine.textContent = '';
            }

            // 当前句
            currentLine.textContent = allLyrics[activeIndex].text;

            // 下一句
            if (activeIndex < allLyrics.length - 1) {
                nextLine.textContent = allLyrics[activeIndex + 1].text;
            } else {
                nextLine.textContent = '';
            }

            console.log('✅ [updateLyricActiveState] 三行歌词已更新', {
                prev: prevLine.textContent,
                current: currentLine.textContent,
                next: nextLine.textContent
            });
        } else {
            prevLine.textContent = '';
            currentLine.textContent = '暂无歌词';
            nextLine.textContent = '';
            console.warn('⚠️ [updateLyricActiveState] activeIndex超出范围');
        }
    } else {
        console.log('📜 [updateLyricActiveState] 标准歌词模式');

        // 标准歌词容器：滚动模式
        // 移除之前的激活状态
        const previousActive = container.querySelector('.lyric-line.active');
        if (previousActive) {
            previousActive.classList.remove('active');
        }

        // 添加新的激活状态
        if (activeIndex >= 0 && activeIndex < lines.length) {
            const activeLine = lines[activeIndex];

            if (activeLine) {
                activeLine.classList.add('active');

                // 优化: 使用 requestAnimationFrame 优化滚动
                requestAnimationFrame(() => {
                    activeLine.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                        inline: 'nearest'
                    });
                });
            }
        }
    }
}

export function updateActiveItem(currentIndex: number, containerId: string): void {
    document.querySelectorAll('.song-item').forEach(item => item.classList.remove('active'));
    
    const container = document.getElementById(containerId);
    if (container) {
        const activeItem = container.querySelector(`.song-item:nth-child(${currentIndex + 1})`);
        if (activeItem) {
            activeItem.classList.add('active');
            activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
}

export function showLoading(containerId: string = 'searchResults'): void {
    // 老王修复BUG-UI-001：添加容器存在性检查
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`❌ 找不到容器元素: ${containerId}`);
        return;
    }
    container.innerHTML = `<div class="loading"><i class="fas fa-spinner"></i><div>正在加载...</div></div>`;
}

export function showError(message: string, containerId: string = 'searchResults'): void {
    // 老王修复BUG-UI-001：添加容器存在性检查
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`❌ 找不到容器元素: ${containerId}`);
        return;
    }
    container.innerHTML = `<div class="error"><i class="fas fa-exclamation-triangle"></i><div>${escapeHtml(message)}</div></div>`;
}

// ========== 老王新增：批量选择功能 ==========

/**
 * 处理批量操作
 */
function handleBatchAction(action: string, containerId: string): void {
    switch (action) {
        case 'select-all':
            selectAllSongs(containerId);
            break;

        case 'deselect-all':
            deselectAllSongs(containerId);
            break;

        case 'invert':
            invertSelection(containerId);
            break;

        case 'favorite':
            batchFavoriteSongs();
            break;

        case 'download':
            batchDownloadSongs();
            break;

        case 'play':
            playSelectedSongs();
            break;

        default:
            console.warn(`未知的批量操作: ${action}`);
    }
}

/**
 * 批量收藏选中的歌曲
 */
function batchFavoriteSongs(): void {
    const selectedSongsList = getSelectedSongs();
    if (selectedSongsList.length === 0) {
        showNotification('请先选择要收藏的歌曲', 'warning');
        return;
    }

    let successCount = 0;
    selectedSongsList.forEach(song => {
        if (!player.isSongInFavorites(song)) {
            player.toggleFavoriteButton(song);
            successCount++;
        }
    });

    showNotification(`已收藏 ${successCount} 首歌曲`, 'success');
}

/**
 * 批量下载选中的歌曲
 */
function batchDownloadSongs(): void {
    const selectedSongsList = getSelectedSongs();
    if (selectedSongsList.length === 0) {
        showNotification('请先选择要下载的歌曲', 'warning');
        return;
    }

    if (selectedSongsList.length > 10) {
        const confirmed = confirm(`您选择了 ${selectedSongsList.length} 首歌曲，批量下载可能需要较长时间。是否继续？`);
        if (!confirmed) return;
    }

    showNotification(`开始批量下载 ${selectedSongsList.length} 首歌曲`, 'info');

    selectedSongsList.forEach((song, index) => {
        // 延迟下载，避免同时发起过多请求
        setTimeout(() => {
            player.downloadSongByData(song);
        }, index * 500); // 每首歌间隔500ms
    });
}

/**
 * 播放选中的歌曲
 */
function playSelectedSongs(): void {
    const selectedSongsList = getSelectedSongs();
    if (selectedSongsList.length === 0) {
        showNotification('请先选择要播放的歌曲', 'warning');
        return;
    }

    // 播放第一首选中的歌曲，并将选中的歌曲列表设置为播放列表
    player.playSong(0, selectedSongsList, 'batchPlay');
    showNotification(`开始播放 ${selectedSongsList.length} 首选中的歌曲`, 'success');
}

/**
 * 更新批量操作按钮的状态
 */
function updateBatchActionsState(containerId: string): void {
    const container = document.getElementById(containerId);
    if (!container) return;

    const batchActionsBar = container.querySelector('.batch-actions-bar') as HTMLElement;
    if (!batchActionsBar) return;

    const selectedCount = selectedSongs.size;
    const countDisplay = batchActionsBar.querySelector('.batch-count') as HTMLElement;

    if (countDisplay) {
        countDisplay.textContent = `已选择 ${selectedCount} 首`;
    }

    // 根据选中数量启用/禁用批量操作按钮
    const batchButtons = batchActionsBar.querySelectorAll('.batch-action-btn');
    batchButtons.forEach(btn => {
        const action = (btn as HTMLElement).dataset.batchAction;
        // 全选、取消全选、反选按钮始终可用，其他按钮需要有选中项
        if (action === 'select-all' || action === 'deselect-all' || action === 'invert') {
            (btn as HTMLButtonElement).disabled = false;
        } else {
            (btn as HTMLButtonElement).disabled = selectedCount === 0;
        }
    });

    // 显示/隐藏批量操作栏（有歌曲时始终显示，方便全选操作）
    batchActionsBar.style.display = 'flex';
}

/**
 * 全选当前列表的所有歌曲
 */
export function selectAllSongs(containerId: string): void {
    const container = document.getElementById(containerId);
    if (!container) return;

    const checkboxes = container.querySelectorAll('.song-checkbox') as NodeListOf<HTMLInputElement>;
    checkboxes.forEach((checkbox, index) => {
        checkbox.checked = true;
        selectedSongs.add(index);
    });

    updateBatchActionsState(containerId);
    showNotification(`已全选 ${selectedSongs.size} 首歌曲`, 'info');
}

/**
 * 取消选择所有歌曲
 */
export function deselectAllSongs(containerId: string): void {
    const container = document.getElementById(containerId);
    if (!container) return;

    const checkboxes = container.querySelectorAll('.song-checkbox') as NodeListOf<HTMLInputElement>;
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });

    selectedSongs.clear();
    updateBatchActionsState(containerId);
    showNotification('已取消全选', 'info');
}

/**
 * 反选当前列表的歌曲
 */
export function invertSelection(containerId: string): void {
    const container = document.getElementById(containerId);
    if (!container) return;

    const checkboxes = container.querySelectorAll('.song-checkbox') as NodeListOf<HTMLInputElement>;
    const newSelection = new Set<number>();

    checkboxes.forEach((checkbox, index) => {
        if (checkbox.checked) {
            checkbox.checked = false;
        } else {
            checkbox.checked = true;
            newSelection.add(index);
        }
    });

    selectedSongs.clear();
    newSelection.forEach(index => selectedSongs.add(index));
    updateBatchActionsState(containerId);
    showNotification(`已反选，当前选中 ${selectedSongs.size} 首`, 'info');
}

/**
 * 获取已选中的歌曲列表
 */
export function getSelectedSongs(): Song[] {
    const selectedSongsList: Song[] = [];
    selectedSongs.forEach(index => {
        if (currentSongList[index]) {
            selectedSongsList.push(currentSongList[index]);
        }
    });
    return selectedSongsList;
}

/**
 * 获取已选中的歌曲索引数组
 */
export function getSelectedIndices(): number[] {
    return Array.from(selectedSongs);
}

/**
 * 清空选中状态
 */
export function clearSelection(containerId?: string): void {
    if (containerId) {
        deselectAllSongs(containerId);
    } else {
        selectedSongs.clear();
    }
}
