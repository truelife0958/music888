import { Song } from './api.js';
import * as player from './player.js';
import { formatTime } from './utils.js';

// --- Type Definitions ---
interface LyricLine {
    time: number;
    text: string;
}

// --- DOM Element Cache ---
let DOM: { [key: string]: HTMLElement | HTMLImageElement | HTMLButtonElement };

// --- 多选状态管理 ---
let selectedSongs = new Set<number>();
let currentSongList: Song[] = [];

export function init(): void {
    DOM = {
        searchResults: document.getElementById('searchResults')!,
        parseResults: document.getElementById('parseResults')!,
        savedResults: document.getElementById('savedResults')!,
        currentCover: document.getElementById('currentCover') as HTMLImageElement,
        currentTitle: document.getElementById('currentTitle')!,
        currentArtist: document.getElementById('currentArtist')!,
        playBtn: document.getElementById('playBtn')!,
        progressFill: document.getElementById('progressFill')!,
        currentTime: document.getElementById('currentTime')!,
        totalTime: document.getElementById('totalTime')!,
        lyricsContainer: document.getElementById('lyricsContainer')!,
        downloadSongBtn: document.getElementById('downloadSongBtn') as HTMLButtonElement,
        downloadLyricBtn: document.getElementById('downloadLyricBtn') as HTMLButtonElement,
    };
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

export function displaySearchResults(songs: Song[], containerId: string, playlistForPlayback: Song[]): void {
    const container = document.getElementById(containerId)!;
    container.innerHTML = '';
    if (songs.length === 0) {
        container.innerHTML = `<div class="empty-state"><div>未找到相关歌曲</div></div>`;
        return;
    }

    songs.forEach((song, index) => {
        const songItem = document.createElement('div');
        songItem.className = 'song-item';
        
        const isFavorite = player.isSongInFavorites(song);
        const favoriteIconClass = isFavorite ? 'fas fa-heart' : 'far fa-heart';
        const favoriteIconColor = isFavorite ? 'style="color: #ff6b6b;"' : '';

        songItem.innerHTML = `
            <div class="song-index">${(index + 1).toString().padStart(2, '0')}</div>
            <div class="song-info">
                <div class="song-name">${song.name}</div>
                <div class="song-artist">${Array.isArray(song.artist) ? song.artist.join(' / ') : (song.artist || '未知歌手')} · ${song.album || '未知专辑'}</div>
            </div>
            <div class="song-actions">
                <button class="action-btn favorite-btn" title="添加到我的喜欢">
                    <i class="${favoriteIconClass}" ${favoriteIconColor}></i>
                </button>
                <button class="action-btn download-btn" title="下载音乐">
                    <i class="fas fa-download"></i>
                </button>
            </div>
        `;
        
        songItem.onclick = () => player.playSong(index, playlistForPlayback, containerId);

        const favoriteBtn = songItem.querySelector('.favorite-btn')!;
        favoriteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            player.toggleFavoriteButton(song);
            // Optimistically update UI
            const icon = favoriteBtn.querySelector('i')!;
            if (player.isSongInFavorites(song)) {
                icon.className = 'fas fa-heart';
                icon.style.color = '#ff6b6b';
            } else {
                icon.className = 'far fa-heart';
                icon.style.color = '';
            }
        });

        songItem.querySelector('.download-btn')!.addEventListener('click', (e) => {
            e.stopPropagation();
            player.downloadSongByData(song);
        });

        container.appendChild(songItem);
    });
}

export function updatePlayButton(isPlaying: boolean): void {
    const icon = DOM.playBtn.querySelector('i')!;
    icon.className = isPlaying ? 'fas fa-pause' : 'fas fa-play';
}

export function updateCurrentSongInfo(song: Song, coverUrl: string): void {
    DOM.currentTitle.textContent = song.name;
    DOM.currentArtist.textContent = `${Array.isArray(song.artist) ? song.artist.join(' / ') : (song.artist || '未知歌手')} · ${song.album || '未知专辑'}`;
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

export function updateLyrics(lyrics: LyricLine[], currentTime: number): void {
    // 更新原有的歌词容器（右侧）
    if (!lyrics.length) {
        if (DOM.lyricsContainer) {
            DOM.lyricsContainer.innerHTML = '<div class="lyric-line">暂无歌词</div>';
        }
        // 同时更新播放器内部的歌词容器
        const inlineContainer = document.getElementById('lyricsContainerInline');
        if (inlineContainer) {
            inlineContainer.innerHTML = '<div class="lyric-line">暂无歌词</div>';
        }
        return;
    }

    let activeIndex = lyrics.findIndex((line, i) => {
        const nextLine = lyrics[i + 1];
        return currentTime >= line.time && (!nextLine || currentTime < nextLine.time);
    });

    const lyricsHTML = lyrics.map((line, index) =>
        `<div class="lyric-line ${index === activeIndex ? 'active' : ''}" data-time="${line.time}">${line.text}</div>`
    ).join('');

    // 更新原有的歌词容器
    if (DOM.lyricsContainer) {
        DOM.lyricsContainer.innerHTML = lyricsHTML;

        const activeLine = DOM.lyricsContainer.querySelector('.active');
        if (activeLine) {
            activeLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    // 同时更新播放器内部的歌词容器
    const inlineContainer = document.getElementById('lyricsContainerInline');
    if (inlineContainer) {
        inlineContainer.innerHTML = lyricsHTML;
        const inlineActiveLine = inlineContainer.querySelector('.active');
        if (inlineActiveLine) {
            inlineActiveLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
