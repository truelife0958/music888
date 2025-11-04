// js/artist-radio.ts - 歌手电台功能

import { searchMusicAPI, type Song } from './api';
import { playSong } from './player';
import { showNotification } from './ui';

let isRadioVisible = false;
let currentArtistSongs: Song[] = [];

// 初始化歌手电台
export function initArtistRadio() {
    createRadioPanel();
    
    // 监听歌曲项的右键菜单
    document.addEventListener('contextmenu', handleContextMenu);
}

// 创建电台面板
function createRadioPanel() {
    const panel = document.createElement('div');
    panel.id = 'artistRadioPanel';
    panel.className = 'artist-radio-panel';
    panel.innerHTML = `
        <div class="artist-radio-header">
            <h3>🎤 歌手电台</h3>
            <button class="artist-radio-close" onclick="window.closeArtistRadio()">×</button>
        </div>
        <div class="artist-radio-search">
            <input type="text" id="artistSearchInput" class="artist-search-input" placeholder="输入歌手名搜索...">
            <button class="artist-search-btn" onclick="window.searchArtistSongs()">
                <i class="fas fa-search"></i>
            </button>
        </div>
        <div class="artist-radio-info" id="artistRadioInfo"></div>
        <div class="artist-radio-songs" id="artistRadioSongs">
            <div class="artist-radio-empty">请输入歌手名开始搜索</div>
        </div>
    `;
    document.body.appendChild(panel);
    
    // 绑定回车键搜索
    const input = document.getElementById('artistSearchInput') as HTMLInputElement;
    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchArtistSongs();
            }
        });
    }
    
    // 全局函数
    (window as any).closeArtistRadio = closeRadioPanel;
    (window as any).searchArtistSongs = searchArtistSongs;
}

// 处理右键菜单
function handleContextMenu(e: MouseEvent) {
    const target = e.target as HTMLElement;
    const songItem = target.closest('.song-item, .rank-song-item, .recommend-song-item') as HTMLElement;
    
    if (songItem) {
        e.preventDefault();
        
        // 获取歌曲信息
        const artistElement = songItem.querySelector('.song-artist, .rank-song-artist, .recommend-song-artist');
        if (artistElement) {
            const artistText = artistElement.textContent || '';
            // 取第一个艺术家
            const artist = artistText.split(',')[0].trim();
            
            if (artist) {
                showContextMenu(e.clientX, e.clientY, artist);
            }
        }
    }
}

// 显示右键菜单
function showContextMenu(x: number, y: number, artist: string) {
    // 移除旧菜单
    const oldMenu = document.getElementById('artistContextMenu');
    if (oldMenu) {
        oldMenu.remove();
    }
    
    const menu = document.createElement('div');
    menu.id = 'artistContextMenu';
    menu.className = 'artist-context-menu';
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.innerHTML = `
        <div class="context-menu-item" onclick="window.openArtistRadioWith('${escapeHtml(artist)}')">
            <i class="fas fa-broadcast-tower"></i>
            <span>${artist} 的电台</span>
        </div>
    `;
    document.body.appendChild(menu);
    
    // 点击其他地方关闭菜单
    setTimeout(() => {
        document.addEventListener('click', () => {
            menu.remove();
        }, { once: true });
    }, 100);
    
    // 全局函数
    (window as any).openArtistRadioWith = (artistName: string) => {
        menu.remove();
        openRadioWithArtist(artistName);
    };
}

// 打开电台并搜索指定歌手
async function openRadioWithArtist(artist: string) {
    openRadioPanel();
    const input = document.getElementById('artistSearchInput') as HTMLInputElement;
    if (input) {
        input.value = artist;
    }
    await searchArtistSongs();
}

// 搜索歌手歌曲
async function searchArtistSongs() {
    const input = document.getElementById('artistSearchInput') as HTMLInputElement;
    const artist = input?.value.trim();
    
    if (!artist) {
        showNotification('请输入歌手名', 'warning');
        return;
    }
    
    const songsContainer = document.getElementById('artistRadioSongs');
    const infoContainer = document.getElementById('artistRadioInfo');
    
    if (!songsContainer) return;
    
    songsContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> 正在搜索...</div>';
    
    try {
        // 搜索歌手的歌曲
        const songs = await searchMusicAPI(artist, 'netease');
        
        // 过滤出该歌手的歌曲
        const artistSongs = songs.filter(song => {
            const songArtist = Array.isArray(song.artist) ? song.artist.join(',') : song.artist;
            return songArtist.toLowerCase().includes(artist.toLowerCase());
        });
        
        if (artistSongs.length === 0) {
            songsContainer.innerHTML = `<div class="artist-radio-empty">未找到"${artist}"的歌曲</div>`;
            if (infoContainer) infoContainer.innerHTML = '';
            showNotification(`未找到"${artist}"的歌曲`, 'warning');
            return;
        }
        
        currentArtistSongs = artistSongs;
        
        // 更新信息
        if (infoContainer) {
            infoContainer.innerHTML = `
                <div class="artist-info-card">
                    <div class="artist-info-text">
                        <div class="artist-name">${artist}</div>
                        <div class="artist-count">找到 ${artistSongs.length} 首歌曲</div>
                    </div>
                    <button class="artist-play-all-btn" onclick="window.playAllArtistSongs()">
                        <i class="fas fa-play"></i> 播放全部
                    </button>
                </div>
            `;
        }
        
        // 显示歌曲列表
        displayArtistSongs(artistSongs);
        
        showNotification(`找到 ${artistSongs.length} 首"${artist}"的歌曲`, 'success');
        
    } catch (error) {
        console.error('搜索歌手歌曲失败:', error);
        songsContainer.innerHTML = '<div class="error">搜索失败，请重试</div>';
        showNotification('搜索失败', 'error');
    }
    
    // 全局函数
    (window as any).playAllArtistSongs = playAllArtistSongs;
}

// 显示歌手歌曲列表
function displayArtistSongs(songs: Song[]) {
    const container = document.getElementById('artistRadioSongs');
    if (!container) return;
    
    container.innerHTML = `
        <div class="artist-songs-list">
            ${songs.map((song, index) => `
                <div class="artist-song-item" data-index="${index}">
                    <span class="artist-song-number">${index + 1}</span>
                    <div class="artist-song-info">
                        <div class="artist-song-name">${song.name}</div>
                        <div class="artist-song-artist">${Array.isArray(song.artist) ? song.artist.join(', ') : song.artist}</div>
                    </div>
                    <button class="artist-song-play-btn" title="播放">▶</button>
                </div>
            `).join('')}
        </div>
    `;
    
    // 绑定播放按钮
    const playBtns = container.querySelectorAll('.artist-song-play-btn');
    playBtns.forEach((btn, index) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            playSong(index, currentArtistSongs, 'artistRadioSongs');
        });
    });
    
    // 绑定歌曲项点击
    const songItems = container.querySelectorAll('.artist-song-item');
    songItems.forEach((item, index) => {
        item.addEventListener('click', () => {
            playSong(index, currentArtistSongs, 'artistRadioSongs');
        });
    });
}

// 播放全部歌手歌曲
function playAllArtistSongs() {
    if (currentArtistSongs.length > 0) {
        playSong(0, currentArtistSongs, 'artistRadioSongs');
        showNotification('开始播放歌手电台', 'success');
    }
}

// 打开电台面板
function openRadioPanel() {
    const panel = document.getElementById('artistRadioPanel');
    if (panel) {
        panel.classList.add('active');
        isRadioVisible = true;
        
        // 聚焦搜索框
        const input = document.getElementById('artistSearchInput') as HTMLInputElement;
        if (input) {
            setTimeout(() => input.focus(), 300);
        }
    }
}

// 关闭电台面板
function closeRadioPanel() {
    const panel = document.getElementById('artistRadioPanel');
    if (panel) {
        panel.classList.remove('active');
        isRadioVisible = false;
    }
}

// HTML转义
function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/'/g, '&#39;');
}

// 打开歌手电台（供外部调用）
export function openArtistRadio() {
    openRadioPanel();
}