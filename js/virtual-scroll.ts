// js/virtual-scroll.ts - 虚拟滚动优化大列表性能

import { Song } from './api.js';
import * as player from './player.js';
import { isSongInFavoritesSync } from './player.js';
import { debounce } from './utils.js';

interface VirtualScrollConfig {
    container: HTMLElement;
    items: Song[];
    itemHeight: number;
    bufferSize: number;
    renderItem: (song: Song, index: number) => HTMLElement;
    onItemClick: (index: number, song: Song) => void;
}

export class VirtualScroll {
    private config: VirtualScrollConfig;
    private scrollTop: number = 0;
    private visibleStart: number = 0;
    private visibleEnd: number = 0;
    private contentHeight: number = 0;
    private viewport!: HTMLElement;
    private content!: HTMLElement;
    private scrollListener: (() => void) | null = null;
    private debouncedRender: (() => void) | null = null;

    constructor(config: VirtualScrollConfig) {
        this.config = config;
        this.contentHeight = config.items.length * config.itemHeight;
        
        // 创建虚拟滚动容器结构
        this.setupViewport();
        
        // 优化：创建防抖渲染函数（16ms ≈ 60fps）
        this.debouncedRender = debounce(() => {
            this.render();
        }, 16);
        
        // 绑定滚动事件
        this.scrollListener = this.onScroll.bind(this);
        this.viewport.addEventListener('scroll', this.scrollListener, { passive: true });
        
        // 初始渲染
        this.render();
    }

    private setupViewport(): void {
        const container = this.config.container;
        container.innerHTML = '';
        container.style.position = 'relative';
        container.style.overflow = 'auto';
        
        // 创建视口
        this.viewport = container;
        
        // 创建内容容器（撑开滚动高度）
        const spacer = document.createElement('div');
        spacer.style.height = `${this.contentHeight}px`;
        spacer.style.position = 'relative';
        this.viewport.appendChild(spacer);
        
        // 创建实际内容容器
        this.content = document.createElement('div');
        this.content.style.position = 'absolute';
        this.content.style.top = '0';
        this.content.style.left = '0';
        this.content.style.right = '0';
        spacer.appendChild(this.content);
    }

    private onScroll(): void {
        this.scrollTop = this.viewport.scrollTop;
        // 优化：使用防抖渲染，避免频繁重绘
        if (this.debouncedRender) {
            this.debouncedRender();
        }
    }

    private render(): void {
        const { items, itemHeight, bufferSize, renderItem, onItemClick } = this.config;
        const viewportHeight = this.viewport.clientHeight;
        
        // 计算可见范围
        const visibleStart = Math.floor(this.scrollTop / itemHeight);
        const visibleEnd = Math.ceil((this.scrollTop + viewportHeight) / itemHeight);
        
        // 添加缓冲区
        this.visibleStart = Math.max(0, visibleStart - bufferSize);
        this.visibleEnd = Math.min(items.length, visibleEnd + bufferSize);
        
        // 清空内容
        this.content.innerHTML = '';
        this.content.style.transform = `translateY(${this.visibleStart * itemHeight}px)`;
        
        // 渲染可见项
        const fragment = document.createDocumentFragment();
        for (let i = this.visibleStart; i < this.visibleEnd; i++) {
            const item = items[i];
            const element = renderItem(item, i);
            element.addEventListener('click', () => onItemClick(i, item));
            fragment.appendChild(element);
        }
        
        this.content.appendChild(fragment);
    }

    public update(items: Song[]): void {
        this.config.items = items;
        this.contentHeight = items.length * this.config.itemHeight;
        this.setupViewport();
        this.render();
    }

    public scrollToIndex(index: number): void {
        const targetScroll = index * this.config.itemHeight;
        this.viewport.scrollTo({
            top: targetScroll,
            behavior: 'smooth'
        });
    }

    public destroy(): void {
        if (this.scrollListener) {
            this.viewport.removeEventListener('scroll', this.scrollListener);
            this.scrollListener = null;
        }
        this.debouncedRender = null;
        this.content.innerHTML = '';
    }
}

// 工厂函数：创建歌曲列表虚拟滚动
export function createSongListVirtualScroll(
    container: HTMLElement,
    songs: Song[],
    playlistForPlayback: Song[],
    containerId: string
): VirtualScroll {
    return new VirtualScroll({
        container,
        items: songs,
        itemHeight: 64, // 歌曲项高度
        bufferSize: 5, // 缓冲5个项目
        renderItem: (song, index) => createSongElement(song, index, containerId),
        onItemClick: (index, song) => {
            player.playSong(index, playlistForPlayback, containerId);
        }
    });
}

// 创建歌曲元素
function createSongElement(song: Song, index: number, containerId: string): HTMLElement {
    const songItem = document.createElement('div');
    songItem.className = 'song-item';
    songItem.dataset.index = String(index);
    
    const isFavorite = isSongInFavoritesSync(song);
    const favoriteIconClass = isFavorite ? 'fas fa-heart' : 'far fa-heart';
    const favoriteIconColor = isFavorite ? 'color: #ff6b6b;' : '';
    
    const artist = Array.isArray(song.artist) ? song.artist.join(', ') : song.artist;
    const artistDisplay = artist && artist !== '未知艺术家' ? artist : '未知艺术家';

    songItem.innerHTML = `
        <div class="song-index">${(index + 1).toString().padStart(2, '0')}</div>
        <div class="song-info">
            <div class="song-name">${escapeHtml(song.name)}</div>
            <div class="song-artist">${escapeHtml(artistDisplay)} · ${escapeHtml(song.album || '未知专辑')}</div>
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
    
    // 绑定操作按钮事件
    const favoriteBtn = songItem.querySelector('.favorite-btn');
    const downloadBtn = songItem.querySelector('.download-btn');
    
    if (favoriteBtn) {
        favoriteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            player.toggleFavoriteButton(song);
            // 更新图标
            const icon = favoriteBtn.querySelector('i');
            if (icon && isSongInFavoritesSync(song)) {
                icon.className = 'fas fa-heart';
                (icon as HTMLElement).style.color = '#ff6b6b';
            } else if (icon) {
                icon.className = 'far fa-heart';
                (icon as HTMLElement).style.color = '';
            }
        });
    }
    
    if (downloadBtn) {
        downloadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            player.downloadSongByData(song);
        });
    }
    
    return songItem;
}

function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}