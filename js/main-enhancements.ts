// main.ts 增强功能 - 新增代码片段
// 将这些代码添加到 main.ts 中

import * as api from './api.js';
import * as ui from './ui.js';
import * as uiEnhancements from './ui-enhancements.js';
import * as player from './player.js';
import { switchTab } from './main.js';
import { formatArtist } from './utils.js';

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

                        const sourceSelect = document.getElementById('discoverSourceSelect') as HTMLSelectElement;
                        const source = sourceSelect ? sourceSelect.value as 'netease' | 'tencent' | 'kugou' | 'bilibili' : 'netease';

                        const songs = await api.getHotSongs(source, 50);
                        const albums = getUniqueAlbums(songs.slice(0, 30));
                        displayAlbums(albums, 'hotAlbums');

                        header.setAttribute('data-expanded', 'true');
                        toggleIcon?.classList.remove('fa-chevron-down');
                        toggleIcon?.classList.add('fa-chevron-up');
                    } catch (error) {
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

                        const sourceSelect = document.getElementById('discoverSourceSelect') as HTMLSelectElement;
                        const source = sourceSelect ? sourceSelect.value as 'netease' | 'tencent' | 'kugou' | 'bilibili' : 'netease';

                        const songs = await api.getHotSongs(source, 50);
                        uiEnhancements.displaySearchResultsWithSelection(songs.slice(0, 30), 'hotSongs', songs);

                        header.setAttribute('data-expanded', 'true');
                        toggleIcon?.classList.remove('fa-chevron-down');
                        toggleIcon?.classList.add('fa-chevron-up');
                    } catch (error) {
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

function getUniqueAlbums(songs: any[]): any[] {
    const albumMap = new Map();
    songs.forEach(song => {
        if (song.album && !albumMap.has(song.album)) {
            albumMap.set(song.album, {
                name: song.album,
                artist: formatArtist(song.artist),
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
    
    container.querySelectorAll('.album-card').forEach((card, index) => {
        card.addEventListener('click', () => {
            const album = albums[index];
            switchTab('search');
            uiEnhancements.displaySearchResultsWithSelection(album.songs, 'searchResults', album.songs);
            ui.showNotification(`已加载专辑《${album.name}》，共 ${album.songs.length} 首歌曲`, 'success');
        });
    });
    
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

function initChartToggles(): void {
    document.querySelectorAll('.chart-header').forEach(header => {
        header.addEventListener('click', async () => {
            const chartType = (header as HTMLElement).dataset.chart as 'soar' | 'new' | 'hot';
            const chartList = document.getElementById(`${chartType}Chart`);
            const toggleIcon = header.querySelector('.toggle-icon');
            const isExpanded = header.getAttribute('data-expanded') === 'true';

            if (!isExpanded) {
                try {
                    uiEnhancements.showLoading(`${chartType}Chart`);
                    chartList!.style.display = 'block';

                    const songs = await api.getChartList(chartType);
                    uiEnhancements.displayChartResults(songs, `${chartType}Chart`);

                    header.setAttribute('data-expanded', 'true');
                    toggleIcon?.classList.remove('fa-chevron-down');
                    toggleIcon?.classList.add('fa-chevron-up');
                } catch (error) {
                    uiEnhancements.showError('加载榜单失败，请稍后重试', `${chartType}Chart`);
                }
            } else {
                chartList!.style.display = 'none';
                header.setAttribute('data-expanded', 'false');
                toggleIcon?.classList.remove('fa-chevron-up');
                toggleIcon?.classList.add('fa-chevron-down');
            }
        });
    });
}

// ========== 播放列表弹窗 ==========

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
                    <div class="playlist-modal-artist">${formatArtist(song.artist)}</div>
                </div>
                ${index === currentIndex ? '<i class="fas fa-volume-up playing-icon"></i>' : ''}
                <button class="playlist-modal-remove" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');

        modalBody.querySelectorAll('.playlist-modal-item').forEach((item, index) => {
            item.addEventListener('click', (e) => {
                if (!(e.target as HTMLElement).closest('.playlist-modal-remove')) {
                    player.playSongFromPlaylist(index);
                    modal.classList.remove('show');
                }
            });
        });

        modalBody.querySelectorAll('.playlist-modal-remove').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt((btn as HTMLElement).dataset.index || '0');
                player.removeFromPlaylist(index);
                showPlaylistModal();
            });
        });
    }

    modal.classList.add('show');
}

function initPlaylistModal(): void {
    const playlistBtn = document.getElementById('playlistBtn');
    const closeModalBtn = document.getElementById('closePlaylistModal');
    const modal = document.getElementById('playlistModal');
    const clearPlaylistBtn = document.getElementById('clearPlaylistBtn');
    const savePlaylistBtn = document.getElementById('savePlaylistBtn');

    playlistBtn?.addEventListener('click', showPlaylistModal);

    closeModalBtn?.addEventListener('click', () => {
        modal?.classList.remove('show');
    });

    modal?.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
        }
    });

    clearPlaylistBtn?.addEventListener('click', () => {
        if (confirm('确定要清空播放列表吗？')) {
            player.clearPlaylist();
            showPlaylistModal();
        }
    });

    savePlaylistBtn?.addEventListener('click', () => {
        const playlistName = prompt('请输入歌单名称：');
        if (playlistName) {
            player.saveCurrentPlaylistAs(playlistName);
            ui.showNotification('歌单保存成功', 'success');
        }
    });
}

// ========== 搜索结果增强 ==========

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

    const sourcesToTry = [source, 'netease', 'tencent', 'kugou', 'kuwo'];
    const uniqueSources = [...new Set(sourcesToTry)];
    let lastError: any = null;
    
    for (const trySource of uniqueSources) {
        try {
            const songs = await api.searchMusicAPI(keyword, trySource);
            if (songs.length > 0) {
                uiEnhancements.displaySearchResultsWithSelection(songs, 'searchResults', songs);
                const sourceName = getSourceName(trySource);
                ui.showNotification(`找到 ${songs.length} 首歌曲 (来源: ${sourceName})`, 'success');
                return;
            }
        } catch (error) {
            lastError = error;
            // 检测限流错误，立即停止
            if (error instanceof Error && error.message === 'SEARCH_RATE_LIMIT_EXCEEDED') {
                const waitTime = (error as any).waitTime || 10;
                uiEnhancements.showError(`搜索过于频繁，请${waitTime}秒后再试`, 'searchResults');
                ui.showNotification('搜索过于频繁，请稍后再试', 'error');
                return;
            }
        }
    }

    // 所有音乐源都失败或无结果
    if (lastError) {
        uiEnhancements.showError('搜索失败，请稍后重试', 'searchResults');
        ui.showNotification('搜索失败，请检查网络连接', 'error');
    } else {
        uiEnhancements.showError('所有音乐平台都未找到相关歌曲，请尝试其他关键词', 'searchResults');
        ui.showNotification('未找到相关歌曲', 'warning');
    }
}

function getSourceName(source: string): string {
    const sourceNames: { [key: string]: string } = {
        'netease': '网易云音乐',
        'tencent': 'QQ音乐',
        'kugou': '酷狗音乐',
        'kuwo': '酷我音乐',
        'xiami': '虾米音乐',
        'baidu': '百度音乐',
        'bilibili': 'Bilibili音乐',
    };
    return sourceNames[source] || source;
}

async function handleExploreEnhanced(): Promise<void> {
    ui.showLoading('searchResults');
    switchTab('search');

    try {
        const songs = await api.exploreRadarAPI();
        if (songs.length > 0) {
            uiEnhancements.displaySearchResultsWithSelection(songs, 'searchResults', songs);
            ui.showNotification(`探索发现 ${songs.length} 首热门音乐`, 'success');
        } else {
            uiEnhancements.showError('暂无推荐音乐', 'searchResults');
        }
    } catch (error) {
        uiEnhancements.showError('探索失败，请稍后重试', 'searchResults');
        ui.showNotification('探索失败', 'error');
    }
}

// ========== 移动端息屏播放 ==========

let wakeLock: any = null;

async function requestWakeLock(): Promise<void> {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await (navigator as any).wakeLock.request('screen');
        }
    } catch (err) {
        // Wake Lock请求失败（静默处理）
    }
}

function releaseWakeLock(): void {
    if (wakeLock) {
        wakeLock.release();
        wakeLock = null;
    }
}

function updateMediaSession(song: any, coverUrl: string): void {
    if ('mediaSession' in navigator) {
        (navigator as any).mediaSession.metadata = new (window as any).MediaMetadata({
            title: song.name,
            artist: formatArtist(song.artist),
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

// 防止重复初始化的标志
let enhancementsInitialized = false;

function initializeEnhancements(): void {
    if (enhancementsInitialized) {
        console.warn('⚠️ [initializeEnhancements] 已经初始化过，跳过重复初始化');
        return;
    }
    
    console.log('🔧 [initializeEnhancements] 开始初始化增强功能...');
    enhancementsInitialized = true;
    
    // 🔧 监听紧急修复脚本发出的manualSearch事件
    document.addEventListener('manualSearch', ((e: CustomEvent) => {
        console.log('🚨 [manualSearch事件] 收到紧急修复脚本的搜索请求');
        console.log('📦 事件详情:', e.detail);
        const searchInput = document.getElementById('searchInput') as HTMLInputElement;
        const sourceSelect = document.getElementById('sourceSelect') as HTMLSelectElement;
        if (searchInput && e.detail?.keyword) {
            searchInput.value = e.detail.keyword;
        }
        if (sourceSelect && e.detail?.source) {
            sourceSelect.value = e.detail.source;
        }
        handleSearchEnhanced();
    }) as EventListener);
    console.log('✅ manualSearch事件监听器已注册');
    
    // 🔧 表单包装方案：暴露全局搜索触发函数
    (window as any).triggerSearch = () => {
        console.log('🎯 [triggerSearch] 表单提交触发搜索！');
        handleSearchEnhanced();
    };
    console.log('✅ 全局搜索函数已注册');
    
    // 🔥 终极诊断：全局点击事件监听器，找出拦截点击的元素
    document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const searchBtn = document.querySelector('.search-btn');
        
        // 检查点击是否在搜索按钮区域
        if (searchBtn) {
            const rect = searchBtn.getBoundingClientRect();
            const x = (e as MouseEvent).clientX;
            const y = (e as MouseEvent).clientY;
            
            if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                console.log('🔥 [全局诊断] 搜索按钮区域被点击！');
                console.log('🔥 实际接收点击的元素:', {
                    tagName: target.tagName,
                    className: target.className,
                    id: target.id,
                    outerHTML: target.outerHTML.substring(0, 200)
                });
                console.log('🔥 元素层级:', getElementPath(target));
            }
        }
    }, true);
    
    // 辅助函数：获取元素的完整路径
    function getElementPath(element: HTMLElement): string {
        const path: string[] = [];
        let current: HTMLElement | null = element;
        while (current && current !== document.body) {
            let selector = current.tagName.toLowerCase();
            if (current.id) selector += `#${current.id}`;
            if (current.className) selector += `.${current.className.split(' ').join('.')}`;
            path.unshift(selector);
            current = current.parentElement;
        }
        return path.join(' > ');
    }
    
    initDiscoverToggles();
    initChartToggles();
    initPlaylistModal();

    const discoverSourceSelect = document.getElementById('discoverSourceSelect');
    if (discoverSourceSelect) {
        discoverSourceSelect.addEventListener('change', () => {
            const albumsHeader = document.querySelector('.discover-header[data-section="albums"]');
            if (albumsHeader && albumsHeader.getAttribute('data-expanded') === 'true') {
                albumsHeader.setAttribute('data-expanded', 'false');
                (albumsHeader as HTMLElement).click();
            }

            const songsHeader = document.querySelector('.discover-header[data-section="songs"]');
            if (songsHeader && songsHeader.getAttribute('data-expanded') === 'true') {
                songsHeader.setAttribute('data-expanded', 'false');
                (songsHeader as HTMLElement).click();
            }
        });
    }

    console.log('🔍 [initializeEnhancements] 绑定搜索功能');
    
    // 🔧 终极修复方案：使用事件委托到父容器，100%可靠
    const searchWrapper = document.querySelector('.search-wrapper') as HTMLElement;
    const searchBtn = document.querySelector('.search-btn') as HTMLButtonElement;
    const searchInput = document.getElementById('searchInput') as HTMLInputElement;
    
    if (searchWrapper && searchBtn) {
        console.log('✅ 找到搜索容器和按钮，使用事件委托绑定');
        console.log('📍 搜索按钮位置信息:', searchBtn.getBoundingClientRect());
        
        // 🔧 方法1: 事件委托到父容器（最可靠的方法）
        searchWrapper.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            // 检查点击的是搜索按钮或其子元素
            if (target.closest('.search-btn')) {
                console.log('🎯 [事件委托] 搜索按钮被点击！target:', target.tagName);
                e.preventDefault();
                e.stopPropagation();
                handleSearchEnhanced();
            }
        }, true); // 使用捕获阶段确保优先处理
        
        // 🔧 方法2: 直接在按钮上绑定（作为后备）
        searchBtn.addEventListener('click', (e) => {
            console.log('🎯 [直接绑定] 搜索按钮被点击！');
            e.preventDefault();
            handleSearchEnhanced();
        });
        
        // 🔧 方法3: 使用mousedown作为额外后备
        searchBtn.addEventListener('mousedown', (e) => {
            console.log('🎯 [mousedown] 搜索按钮被按下！');
            e.preventDefault();
            handleSearchEnhanced();
        });
        
        // 🔧 方法4: 全局Window对象上暴露搜索函数（用于HTML onclick）
        (window as any).handleSearch = () => {
            console.log('🎯 [window.handleSearch] 全局搜索函数被调用！');
            handleSearchEnhanced();
        };
        
        console.log('✅ 搜索按钮事件委托绑定完成（4层防护）');
    } else {
        console.error('❌ 未找到搜索容器或按钮！');
    }

    if (searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            if ((e as KeyboardEvent).key === 'Enter') {
                console.log('⌨️ Enter键被按下！');
                handleSearchEnhanced();
            }
        });
        console.log('✅ Enter键搜索事件绑定完成');
    } else {
        console.error('❌ 未找到搜索输入框！');
    }

    const exploreRadarBtn = document.getElementById('exploreRadarBtn');
    if (exploreRadarBtn) {
        exploreRadarBtn.addEventListener('click', handleExploreEnhanced);
    }

    const shufflePlayBtn = document.getElementById('shufflePlayBtn');
    if (shufflePlayBtn) {
        shufflePlayBtn.remove();
    }

    window.addEventListener('songPlaying', (e: any) => {
        requestWakeLock();
        if (e.detail && e.detail.song && e.detail.coverUrl) {
            updateMediaSession(e.detail.song, e.detail.coverUrl);
        }
    });

    window.addEventListener('songPaused', () => {
        releaseWakeLock();
    });
}

export { initializeEnhancements };
