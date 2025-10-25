// UI增强功能模块
import { Song } from './api.js';
import * as player from './player.js';

// 多选状态管理
let selectedSongs = new Set<number>();
let currentSongList: Song[] = [];

// 获取音乐源名称
function getSourceName(source: string): string {
    const sourceNames: { [key: string]: string } = {
        'netease': '网易云音乐',
        'tencent': 'QQ音乐',
        'kugou': '酷狗音乐',
        'kuwo': '酷我音乐',
        'xiami': '虾米音乐',
        'baidu': '百度音乐',
        'bilibili': 'Bilibili音乐'
    };
    return sourceNames[source] || source;
}

// 显示榜单结果
export function displayChartResults(songs: Song[], containerId: string): void {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (songs.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-music"></i><div>暂无数据</div></div>';
        return;
    }

    container.innerHTML = songs.map((song, index) => `
        <div class="chart-item" data-index="${index}">
            <div class="chart-rank">${index + 1}</div>
            <div class="chart-info">
                <div class="chart-name">${song.name}</div>
                <div class="chart-artist">${Array.isArray(song.artist) ? song.artist.join(' / ') : song.artist} · ${song.album || '未知专辑'}</div>
            </div>
            <button class="chart-play-btn">
                <i class="fas fa-play"></i>
            </button>
        </div>
    `).join('');

    // 绑定点击事件
    container.querySelectorAll('.chart-item').forEach((item, index) => {
        item.addEventListener('click', () => {
            player.playSong(index, songs, containerId);
        });
    });
}

// 显示带多选功能的搜索结果
export function displaySearchResultsWithSelection(songs: Song[], containerId: string, playlistForPlayback: Song[]): void {
    const container = document.getElementById(containerId);
    if (!container) return;

    currentSongList = songs;
    selectedSongs.clear();

    if (songs.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><div>未找到相关歌曲</div></div>';
        return;
    }

    // 创建工具栏
    const toolbar = document.createElement('div');
    toolbar.className = 'search-toolbar';
    toolbar.innerHTML = `
        <button class="toolbar-btn" id="selectAllBtn">
            <i class="fas fa-check-square"></i> 全选
        </button>
        <button class="toolbar-btn" id="addToFavoritesBtn" disabled>
            <i class="fas fa-heart"></i> 添加到收藏
        </button>
        <button class="toolbar-btn" id="addToPlaylistBtn" disabled>
            <i class="fas fa-list"></i> 添加到播放列表
        </button>
        <button class="toolbar-btn" id="downloadSelectedBtn" disabled>
            <i class="fas fa-download"></i> 下载选中
        </button>
    `;

    // 创建歌曲列表容器
    const resultsList = document.createElement('div');
    resultsList.className = 'search-results-list';

    songs.forEach((song, index) => {
        const isFavorite = player.isSongInFavorites(song);
        const favoriteIconClass = isFavorite ? 'fas fa-heart' : 'far fa-heart';
        const favoriteIconColor = isFavorite ? 'style="color: #ff6b6b;"' : '';

        const songItem = document.createElement('div');
        songItem.className = 'song-item';
        songItem.innerHTML = `
            <div class="song-checkbox">
                <input type="checkbox" data-index="${index}">
            </div>
            <div class="song-index">${(index + 1).toString().padStart(2, '0')}</div>
            <div class="song-info">
                <div class="song-name">${song.name}</div>
                <div class="song-artist">${Array.isArray(song.artist) ? song.artist.join(' / ') : song.artist} · ${song.album}</div>
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

        // 复选框事件
        const checkbox = songItem.querySelector('input[type="checkbox"]') as HTMLInputElement;
        checkbox.addEventListener('change', (e) => {
            e.stopPropagation();
            const checked = checkbox.checked;
            if (checked) {
                selectedSongs.add(index);
                songItem.classList.add('selected');
            } else {
                selectedSongs.delete(index);
                songItem.classList.remove('selected');
            }
            updateToolbarButtons();
        });

        // 点击歌曲项播放（但不包括复选框和按钮）
        songItem.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (!target.closest('.song-checkbox') && !target.closest('.song-actions')) {
                player.playSong(index, playlistForPlayback, containerId);
            }
        });

        // 收藏按钮
        const favoriteBtn = songItem.querySelector('.favorite-btn');
        favoriteBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            player.toggleFavoriteButton(song);
            const icon = favoriteBtn.querySelector('i');
            if (icon) {
                if (player.isSongInFavorites(song)) {
                    icon.className = 'fas fa-heart';
                    icon.style.color = '#ff6b6b';
                } else {
                    icon.className = 'far fa-heart';
                    icon.style.color = '';
                }
            }
        });

        // 下载按钮
        const downloadBtn = songItem.querySelector('.download-btn');
        downloadBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            player.downloadSongByData(song);
        });

        resultsList.appendChild(songItem);
    });

    container.innerHTML = '';
    container.appendChild(toolbar);
    container.appendChild(resultsList);

    bindToolbarEvents(songs, containerId);
}

// 更新工具栏按钮状态
function updateToolbarButtons(): void {
    const addToFavoritesBtn = document.getElementById('addToFavoritesBtn') as HTMLButtonElement;
    const addToPlaylistBtn = document.getElementById('addToPlaylistBtn') as HTMLButtonElement;
    const downloadSelectedBtn = document.getElementById('downloadSelectedBtn') as HTMLButtonElement;
    const selectAllBtn = document.getElementById('selectAllBtn');

    const hasSelection = selectedSongs.size > 0;
    const allSelected = selectedSongs.size === currentSongList.length;

    if (addToFavoritesBtn) addToFavoritesBtn.disabled = !hasSelection;
    if (addToPlaylistBtn) addToPlaylistBtn.disabled = !hasSelection;
    if (downloadSelectedBtn) downloadSelectedBtn.disabled = !hasSelection;

    if (selectAllBtn) {
        selectAllBtn.innerHTML = allSelected
            ? '<i class="fas fa-times-circle"></i> 取消全选'
            : '<i class="fas fa-check-square"></i> 全选';
    }
}

// 绑定工具栏事件
function bindToolbarEvents(songs: Song[], containerId: string): void {
    // 全选/取消全选
    const selectAllBtn = document.getElementById('selectAllBtn');
    selectAllBtn?.addEventListener('click', () => {
        const allSelected = selectedSongs.size === songs.length;
        const checkboxes = document.querySelectorAll('.song-checkbox input[type="checkbox"]') as NodeListOf<HTMLInputElement>;

        if (allSelected) {
            selectedSongs.clear();
            checkboxes.forEach(cb => cb.checked = false);
            document.querySelectorAll('.song-item').forEach(item => item.classList.remove('selected'));
        } else {
            songs.forEach((_, index) => selectedSongs.add(index));
            checkboxes.forEach(cb => cb.checked = true);
            document.querySelectorAll('.song-item').forEach(item => item.classList.add('selected'));
        }
        updateToolbarButtons();
    });

    // 添加到收藏
    const addToFavoritesBtn = document.getElementById('addToFavoritesBtn');
    addToFavoritesBtn?.addEventListener('click', () => {
        const selectedSongList = Array.from(selectedSongs).map(i => songs[i]);
        player.addMultipleToFavorites(selectedSongList);

        // 更新UI
        selectedSongList.forEach(song => {
            const songItems = document.querySelectorAll('.song-item');
            songItems.forEach(item => {
                const songName = item.querySelector('.song-name')?.textContent;
                if (songName === song.name) {
                    const icon = item.querySelector('.favorite-btn i');
                    if (icon) {
                        icon.className = 'fas fa-heart';
                        (icon as HTMLElement).style.color = '#ff6b6b';
                    }
                }
            });
        });

        showNotification(`已添加 ${selectedSongs.size} 首歌曲到收藏`, 'success');
    });

    // 添加到播放列表
    const addToPlaylistBtn = document.getElementById('addToPlaylistBtn');
    addToPlaylistBtn?.addEventListener('click', () => {
        const selectedSongList = Array.from(selectedSongs).map(i => songs[i]);
        player.addToCurrentPlaylist(selectedSongList);
        showNotification(`已添加 ${selectedSongs.size} 首歌曲到播放列表`, 'success');
    });

    // 下载选中
    const downloadSelectedBtn = document.getElementById('downloadSelectedBtn');
    downloadSelectedBtn?.addEventListener('click', async () => {
        const selectedSongList = Array.from(selectedSongs).map(i => songs[i]);
        await player.downloadMultipleSongs(selectedSongList);
    });
}

// 显示通知
function showNotification(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 10px 20px;
        border-radius: 5px;
        color: white;
        background-color: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#2196F3'};
        z-index: 1001;
        transition: opacity 0.5s;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

// 显示加载状态
export function showLoading(containerId: string): void {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-spinner fa-spin"></i>
            <div>加载中...</div>
        </div>
    `;
}

// 显示错误
export function showError(message: string, containerId: string): void {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-exclamation-circle"></i>
            <div>${message}</div>
        </div>
    `;
}
