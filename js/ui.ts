import { Song } from './api.js';
import * as player from './player.js';
import { formatTime, formatArtist } from './utils.js';
import { LyricLine } from './types.js';

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
        }
    });
}

// 页面卸载时自动清理
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', cleanup);
}

export function init(): void {
    // 修复：添加安全检查，防止元素不存在导致崩溃
    const lyricsContainer = document.getElementById('lyricsContainerInline');
    
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
        lyricsContainer: lyricsContainer || document.createElement('div'),
        downloadSongBtn: document.getElementById('downloadSongBtn') as HTMLButtonElement,
        downloadLyricBtn: document.getElementById('downloadLyricBtn') as HTMLButtonElement,
    };
    
    // 如果歌词容器不存在，添加警告
    if (!lyricsContainer) {
        console.warn('⚠️ 歌词容器 #lyricsContainerInline 不存在，歌词功能可能无法正常工作');
    }
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

    songItem.innerHTML = `
        <div class="song-index">${(index + 1).toString().padStart(2, '0')}</div>
        <div class="song-info">
            <div class="song-name">${escapeHtml(song.name)}</div>
            <div class="song-artist">${escapeHtml(formatArtist(song.artist))} · ${escapeHtml(song.album || '未知专辑')}</div>
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

// 优化: 使用事件委托和 DocumentFragment，防止内存泄漏
export function displaySearchResults(songs: Song[], containerId: string, playlistForPlayback: Song[]): void {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (songs.length === 0) {
        container.innerHTML = `<div class="empty-state"><div>未找到相关歌曲</div></div>`;
        return;
    }

    // 优化: 移除旧的事件监听器，防止内存泄漏
    const oldListener = containerEventListeners.get(container);
    if (oldListener) {
        container.removeEventListener('click', oldListener);
    }

    // 优化: 使用 DocumentFragment 批量插入 DOM
    const fragment = document.createDocumentFragment();
    
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
            // 点击歌曲项播放
            player.playSong(index, playlistForPlayback, containerId);
        }
    };
    
    // 添加新的事件监听器并保存引用
    container.addEventListener('click', clickHandler);
    containerEventListeners.set(container, clickHandler);
}

export function updatePlayButton(isPlaying: boolean): void {
    const icon = DOM.playBtn.querySelector('i')!;
    icon.className = isPlaying ? 'fas fa-pause' : 'fas fa-play';
}

export function updateCurrentSongInfo(song: Song, coverUrl: string): void {
    DOM.currentTitle.textContent = song.name;
    DOM.currentArtist.textContent = `${formatArtist(song.artist)} · ${song.album || '未知专辑'}`;
    (DOM.currentCover as HTMLImageElement).src = coverUrl;
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
    const lyricsHTML = lyrics.map((line, index) =>
        `<div class="lyric-line" data-time="${escapeHtml(String(line.time))}" data-index="${escapeHtml(String(index))}">${escapeHtml(line.text)}</div>`
    ).join('');

    // 修复：检查元素是否存在且已挂载到DOM
    if (DOM.lyricsContainer && DOM.lyricsContainer.parentNode) {
        DOM.lyricsContainer.innerHTML = lyricsHTML;
    }

    const inlineContainer = document.getElementById('lyricsContainerInline');
    if (inlineContainer && inlineContainer.parentNode) {
        inlineContainer.innerHTML = lyricsHTML;
    }
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
    if (!container) return;
    
    const lines = container.querySelectorAll('.lyric-line');
    if (lines.length === 0) return;
    
    // 检查是否是内联三行歌词容器
    const isInlineContainer = container.id === 'lyricsContainerInline';
    
    if (isInlineContainer && lines.length >= 3) {
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
        } else {
            prevLine.textContent = '';
            currentLine.textContent = '暂无歌词';
            nextLine.textContent = '';
        }
    } else {
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
    const container = document.getElementById(containerId)!;
    container.innerHTML = `<div class="loading"><i class="fas fa-spinner"></i><div>正在加载...</div></div>`;
}

export function showError(message: string, containerId: string = 'searchResults'): void {
    const container = document.getElementById(containerId)!;
    container.innerHTML = `<div class="error"><i class="fas fa-exclamation-triangle"></i><div>${message}</div></div>`;
}
