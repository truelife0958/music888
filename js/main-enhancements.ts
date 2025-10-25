// main.ts 增强功能 - 新增代码片段
// 将这些代码添加到 main.ts 中

import * as api from './api.js';
import * as ui from './ui.js';
import * as uiEnhancements from './ui-enhancements.js';
import * as player from './player.js';
import { switchTab } from './main.js';

// ========== 发现音乐功能 ==========

// 初始化发现音乐折叠/展开功能
function initDiscoverToggles(): void {
    document.querySelectorAll('.discover-header').forEach(header => {
        header.addEventListener('click', async () => {
            const section = (header as HTMLElement).dataset.section;
            const isExpanded = header.getAttribute('data-expanded') === 'true';
            const toggleIcon = header.querySelector('.toggle-icon');
            
            if (section === 'albums') {
                const albumsContent = document.getElementById('hotAlbums');
                if (!isExpanded) {
                    try {
                        uiEnhancements.showLoading('hotAlbums');
                        albumsContent!.style.display = 'block';
                        
                        // 加载热门专辑（使用热门榜的前20首作为示例）
                        const songs = await api.getChartList('hot');
                        const albums = getUniqueAlbums(songs.slice(0, 20));
                        displayAlbums(albums, 'hotAlbums');
                        
                        header.setAttribute('data-expanded', 'true');
                        toggleIcon?.classList.remove('fa-chevron-down');
                        toggleIcon?.classList.add('fa-chevron-up');
                    } catch (error) {
                        console.error('加载热门专辑失败:', error);
                        uiEnhancements.showError('加载热门专辑失败，请稍后重试', 'hotAlbums');
                    }
                } else {
                    albumsContent!.style.display = 'none';
                    header.setAttribute('data-expanded', 'false');
                    toggleIcon?.classList.remove('fa-chevron-up');
                    toggleIcon?.classList.add('fa-chevron-down');
                }
            } else if (section === 'songs') {
                const songsContent = document.getElementById('hotSongs');
                if (!isExpanded) {
                    try {
                        uiEnhancements.showLoading('hotSongs');
                        songsContent!.style.display = 'block';
                        
                        // 加载热门歌曲（使用热门榜数据）
                        const songs = await api.getChartList('hot');
                        uiEnhancements.displaySearchResultsWithSelection(songs.slice(0, 30), 'hotSongs', songs);
                        
                        header.setAttribute('data-expanded', 'true');
                        toggleIcon?.classList.remove('fa-chevron-down');
                        toggleIcon?.classList.add('fa-chevron-up');
                    } catch (error) {
                        console.error('加载热门歌曲失败:', error);
                        uiEnhancements.showError('加载热门歌曲失败，请稍后重试', 'hotSongs');
                    }
                } else {
                    songsContent!.style.display = 'none';
                    header.setAttribute('data-expanded', 'false');
                    toggleIcon?.classList.remove('fa-chevron-up');
                    toggleIcon?.classList.add('fa-chevron-down');
                }
            }
        });
    });
}

// 提取唯一专辑
function getUniqueAlbums(songs: any[]): any[] {
    const albumMap = new Map();
    songs.forEach(song => {
        if (song.album && !albumMap.has(song.album)) {
            albumMap.set(song.album, {
                name: song.album,
                artist: Array.isArray(song.artist) ? song.artist.join(' / ') : song.artist,
                pic_id: song.pic_id,
                source: song.source,
                songs: [song]
            });
        } else if (song.album && albumMap.has(song.album)) {
            albumMap.get(song.album).songs.push(song);
        }
    });
    return Array.from(albumMap.values());
}

// 显示专辑列表
function displayAlbums(albums: any[], containerId: string): void {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (albums.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-compact-disc"></i><div>暂无专辑数据</div></div>';
        return;
    }
    
    container.innerHTML = `
        <div class="albums-grid">
            ${albums.map(album => `
                <div class="album-card" data-album="${album.name}">
                    <div class="album-cover">
                        <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHJ4PSI4Ii8+CjxwYXRoIGQ9Ik0xMDAgNjBMMTMwIDEwMEgxMTBWMTQwSDkwVjEwMEg3MEwxMDAgNjBaIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMykiLz4KPC9zdmc+" alt="${album.name}">
                        <div class="album-play-overlay">
                            <i class="fas fa-play-circle"></i>
                        </div>
                    </div>
                    <div class="album-info">
                        <div class="album-name" title="${album.name}">${album.name}</div>
                        <div class="album-artist" title="${album.artist}">${album.artist}</div>
                        <div class="album-count">${album.songs.length} 首歌曲</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    // 绑定专辑点击事件
    container.querySelectorAll('.album-card').forEach((card, index) => {
        card.addEventListener('click', () => {
            const album = albums[index];
            // 切换到搜索结果标签并显示专辑歌曲
            switchTab('search');
            uiEnhancements.displaySearchResultsWithSelection(album.songs, 'searchResults', album.songs);
            ui.showNotification(`已加载专辑《${album.name}》，共 ${album.songs.length} 首歌曲`, 'success');
        });
    });
    
    // 异步加载专辑封面
    albums.forEach((album, index) => {
        if (album.pic_id && album.songs[0]) {
            api.getAlbumCoverUrl(album.songs[0], 200).then(coverUrl => {
                const img = container.querySelector(`.album-card:nth-child(${index + 1}) img`);
                if (img) {
                    (img as HTMLImageElement).src = coverUrl;
                }
            });
        }
    });
}

// ========== 榜单功能 ==========

// 初始化榜单折叠/展开功能
function initChartToggles(): void {
    document.querySelectorAll('.chart-header').forEach(header => {
        header.addEventListener('click', async () => {
            const chartType = (header as HTMLElement).dataset.chart as 'soar' | 'new' | 'hot';
            const chartList = document.getElementById(`${chartType}Chart`);
            const toggleIcon = header.querySelector('.toggle-icon');
            const isExpanded = header.getAttribute('data-expanded') === 'true';

            if (!isExpanded) {
                // 展开并加载数据
                try {
                    uiEnhancements.showLoading(`${chartType}Chart`);
                    chartList!.style.display = 'block';

                    const songs = await api.getChartList(chartType);
                    uiEnhancements.displayChartResults(songs, `${chartType}Chart`);

                    header.setAttribute('data-expanded', 'true');
                    toggleIcon?.classList.remove('fa-chevron-down');
                    toggleIcon?.classList.add('fa-chevron-up');
                } catch (error) {
                    console.error(`加载${chartType}榜单失败:`, error);
                    uiEnhancements.showError('加载榜单失败，请稍后重试', `${chartType}Chart`);
                }
            } else {
                // 折叠
                chartList!.style.display = 'none';
                header.setAttribute('data-expanded', 'false');
                toggleIcon?.classList.remove('fa-chevron-up');
                toggleIcon?.classList.add('fa-chevron-down');
            }
        });
    });
}

// ========== 播放列表弹窗 ==========

// 显示播放列表弹窗
function showPlaylistModal(): void {
    const modal = document.getElementById('playlistModal');
    const modalBody = document.getElementById('playlistModalBody');
    const currentPlaylist = player.getCurrentPlaylist();
    const currentIndex = player.getCurrentIndex();

    if (!modal || !modalBody) return;

    if (currentPlaylist.length === 0) {
        modalBody.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-music"></i>
                <div>播放列表为空</div>
            </div>
        `;
    } else {
        modalBody.innerHTML = currentPlaylist.map((song, index) => `
            <div class="playlist-modal-item ${index === currentIndex ? 'playing' : ''}" data-index="${index}">
                <div class="playlist-modal-index">${index + 1}</div>
                <div class="playlist-modal-info">
                    <div class="playlist-modal-name">${song.name}</div>
                    <div class="playlist-modal-artist">${Array.isArray(song.artist) ? song.artist.join(' / ') : song.artist}</div>
                </div>
                ${index === currentIndex ? '<i class="fas fa-volume-up playing-icon"></i>' : ''}
                <button class="playlist-modal-remove" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');

        // 绑定点击播放事件
        modalBody.querySelectorAll('.playlist-modal-item').forEach((item, index) => {
            item.addEventListener('click', (e) => {
                if (!(e.target as HTMLElement).closest('.playlist-modal-remove')) {
                    player.playSongFromPlaylist(index);
                    modal.classList.remove('show');
                }
            });
        });

        // 绑定删除事件
        modalBody.querySelectorAll('.playlist-modal-remove').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt((btn as HTMLElement).dataset.index || '0');
                player.removeFromPlaylist(index);
                showPlaylistModal(); // 刷新显示
            });
        });
    }

    modal.classList.add('show');
}

// 初始化播放列表弹窗事件
function initPlaylistModal(): void {
    const playlistBtn = document.getElementById('playlistBtn');
    const closeModalBtn = document.getElementById('closePlaylistModal');
    const modal = document.getElementById('playlistModal');
    const clearPlaylistBtn = document.getElementById('clearPlaylistBtn');
    const savePlaylistBtn = document.getElementById('savePlaylistBtn');

    // 打开弹窗
    playlistBtn?.addEventListener('click', showPlaylistModal);

    // 关闭弹窗
    closeModalBtn?.addEventListener('click', () => {
        modal?.classList.remove('show');
    });

    // 点击背景关闭
    modal?.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
        }
    });

    // 清空播放列表
    clearPlaylistBtn?.addEventListener('click', () => {
        if (confirm('确定要清空播放列表吗？')) {
            player.clearPlaylist();
            showPlaylistModal();
        }
    });

    // 保存为歌单
    savePlaylistBtn?.addEventListener('click', () => {
        const playlistName = prompt('请输入歌单名称：');
        if (playlistName) {
            player.saveCurrentPlaylistAs(playlistName);
            ui.showNotification('歌单保存成功', 'success');
        }
    });
}

// ========== 搜索结果增强 ==========

// 修改搜索处理函数，使用增强版UI
async function handleSearchEnhanced(): Promise<void> {
    const searchInput = document.getElementById('searchInput') as HTMLInputElement;
    const sourceSelect = document.getElementById('sourceSelect') as HTMLSelectElement;
    const keyword = searchInput.value.trim();
    const source = sourceSelect.value;

    if (!keyword) {
        ui.showNotification('请输入搜索关键词', 'warning');
        return;
    }

    ui.showLoading('searchResults');
    switchTab('search');

    try {
        const songs = await api.searchMusicAPI(keyword, source);
        if (songs.length > 0) {
            // 使用增强版显示函数（带多选功能）
            uiEnhancements.displaySearchResultsWithSelection(songs, 'searchResults', songs);
            ui.showNotification(`找到 ${songs.length} 首歌曲`, 'success');
        } else {
            uiEnhancements.showError('未找到相关歌曲', 'searchResults');
        }
    } catch (error) {
        console.error('搜索失败:', error);
        uiEnhancements.showError('搜索失败，请稍后重试', 'searchResults');
        ui.showNotification('搜索失败', 'error');
    }
}

// 探索雷达增强处理函数（带多选功能）
async function handleExploreEnhanced(): Promise<void> {
    ui.showLoading('searchResults');
    switchTab('search');

    try {
        const songs = await api.exploreRadarAPI();
        if (songs.length > 0) {
            // 使用增强版显示函数（带多选功能）
            uiEnhancements.displaySearchResultsWithSelection(songs, 'searchResults', songs);
            ui.showNotification(`探索发现 ${songs.length} 首热门音乐`, 'success');
        } else {
            uiEnhancements.showError('暂无推荐音乐', 'searchResults');
        }
    } catch (error) {
        console.error('探索雷达失败:', error);
        uiEnhancements.showError('探索失败，请稍后重试', 'searchResults');
        ui.showNotification('探索失败', 'error');
    }
}

// ========== 移动端息屏播放 ==========

let wakeLock: any = null;

// 请求 Wake Lock
async function requestWakeLock(): Promise<void> {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await (navigator as any).wakeLock.request('screen');
            console.log('Wake Lock 已激活');

            wakeLock.addEventListener('release', () => {
                console.log('Wake Lock 已释放');
            });
        }
    } catch (err) {
        console.warn('Wake Lock 请求失败:', err);
    }
}

// 释放 Wake Lock
function releaseWakeLock(): void {
    if (wakeLock) {
        wakeLock.release();
        wakeLock = null;
    }
}

// 更新 Media Session
function updateMediaSession(song: any, coverUrl: string): void {
    if ('mediaSession' in navigator) {
        (navigator as any).mediaSession.metadata = new (window as any).MediaMetadata({
            title: song.name,
            artist: Array.isArray(song.artist) ? song.artist.join(' / ') : song.artist,
            album: song.album,
            artwork: [
                { src: coverUrl, sizes: '512x512', type: 'image/jpeg' }
            ]
        });

        (navigator as any).mediaSession.setActionHandler('play', () => {
            player.togglePlay();
        });

        (navigator as any).mediaSession.setActionHandler('pause', () => {
            player.togglePlay();
        });

        (navigator as any).mediaSession.setActionHandler('previoustrack', () => {
            player.previousSong();
        });

        (navigator as any).mediaSession.setActionHandler('nexttrack', () => {
            player.nextSong();
        });
    }
}

// ========== 初始化所有新功能 ==========

function initializeEnhancements(): void {
    // 初始化发现音乐折叠功能
    initDiscoverToggles();
    
    // 初始化榜单功能
    initChartToggles();

    // 初始化播放列表弹窗
    initPlaylistModal();

    // 替换搜索按钮事件（使用增强版）
    const searchBtn = document.querySelector('.search-btn');
    if (searchBtn) {
        // 移除旧事件监听器（通过克隆节点）
        const newSearchBtn = searchBtn.cloneNode(true);
        searchBtn.parentNode?.replaceChild(newSearchBtn, searchBtn);
        newSearchBtn.addEventListener('click', handleSearchEnhanced);
    }

    // 搜索输入框回车事件
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        const newSearchInput = searchInput.cloneNode(true) as HTMLInputElement;
        searchInput.parentNode?.replaceChild(newSearchInput, searchInput);
        newSearchInput.addEventListener('keyup', (e) => {
            if ((e as KeyboardEvent).key === 'Enter') {
                handleSearchEnhanced();
            }
        });
    }

    // 替换探索雷达按钮事件（使用增强版带多选功能）
    const exploreRadarBtn = document.getElementById('exploreRadarBtn');
    if (exploreRadarBtn) {
        const newExploreBtn = exploreRadarBtn.cloneNode(true);
        exploreRadarBtn.parentNode?.replaceChild(newExploreBtn, exploreRadarBtn);
        newExploreBtn.addEventListener('click', handleExploreEnhanced);
        console.log('✅ 探索雷达已绑定增强版事件（带多选功能）');
    }

    // 移除随机播放按钮（如果存在）
    const shufflePlayBtn = document.getElementById('shufflePlayBtn');
    if (shufflePlayBtn) {
        shufflePlayBtn.remove();
    }

    // 监听播放事件，启用 Wake Lock 和 Media Session
    window.addEventListener('songPlaying', (e: any) => {
        requestWakeLock();
        if (e.detail && e.detail.song && e.detail.coverUrl) {
            updateMediaSession(e.detail.song, e.detail.coverUrl);
        }
    });

    // 监听暂停事件，释放 Wake Lock
    window.addEventListener('songPaused', () => {
        releaseWakeLock();
    });

    console.log('✅ 所有增强功能已初始化');
}

// 导出初始化函数
export { initializeEnhancements };

// ========== 使用说明 ==========
// 在 main.ts 的 initializeApp() 函数末尾添加：
// initializeEnhancements();
