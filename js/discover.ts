// js/discover.ts - 发现音乐功能模块

import { parsePlaylistAPI, getHotPlaylists, getArtistList, getArtistTopSongs, type Song } from './api';
import { playSong } from './player';
import { showNotification, displaySearchResults, showLoading, showError } from './ui';

// HTML转义函数
function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 发现音乐状态管理
let currentArtistType = -1;
let currentArtistArea = -1;
let currentArtistInitial: string | number = -1;

// 初始化发现音乐模块
export function initDiscover() {
    console.log('📊 初始化发现音乐模块...');
    initArtistView();
    initHotPlaylists();
    console.log('✅ 发现音乐模块初始化完成');
}

// 初始化歌手视图
function initArtistView() {
    const typeSelect = document.getElementById('artistTypeSelect') as HTMLSelectElement;
    const areaSelect = document.getElementById('artistAreaSelect') as HTMLSelectElement;
    const initialSelect = document.getElementById('artistInitialSelect') as HTMLSelectElement;

    if (typeSelect) {
        typeSelect.addEventListener('change', loadArtistList);
    }
    if (areaSelect) {
        areaSelect.addEventListener('change', loadArtistList);
    }
    if (initialSelect) {
        initialSelect.addEventListener('change', loadArtistList);
    }
    
    // 初始加载热门歌手
    loadArtistList();
}

// 加载歌手列表
async function loadArtistList() {
    const artistListContainer = document.getElementById('artistList');
    if (!artistListContainer) return;

    const typeSelect = document.getElementById('artistTypeSelect') as HTMLSelectElement;
    const areaSelect = document.getElementById('artistAreaSelect') as HTMLSelectElement;
    const initialSelect = document.getElementById('artistInitialSelect') as HTMLSelectElement;

    currentArtistType = parseInt(typeSelect?.value || '-1');
    currentArtistArea = parseInt(areaSelect?.value || '-1');
    currentArtistInitial = initialSelect?.value || '-1';

    try {
        artistListContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner"></i><div>正在加载歌手...</div></div>';

        const result = await getArtistList(
            currentArtistType,
            currentArtistArea,
            currentArtistInitial,
            50, // 增加显示数量
            0
        );

        // 修复：检查返回结果是否有效
        if (!result || !result.artists || result.artists.length === 0) {
            artistListContainer.innerHTML = '<div class="error"><i class="fas fa-info-circle"></i><div>暂无歌手数据，当前API可能不支持此功能</div></div>';
            console.warn('歌手列表API返回空数据，可能需要切换到NCM API');
            return;
        }

        // 显示歌手列表
        displayArtistList(result.artists);

    } catch (error) {
        console.error('加载歌手列表失败:', error);
        artistListContainer.innerHTML = '<div class="error"><i class="fas fa-exclamation-triangle"></i><div>加载失败，请重试<br><small>提示：此功能需要NCM API支持</small></div></div>';
        showNotification('加载歌手列表失败，请检查API配置', 'error');
    }
}

// 显示歌手列表
function displayArtistList(artists: any[]) {
    const artistListContainer = document.getElementById('artistList');
    if (!artistListContainer) return;

    const artistGrid = artists.map(artist => `
        <div class="artist-card" data-artist-id="${artist.id}">
            <div class="artist-avatar">
                <img src="${artist.picUrl || '/images/default-artist.png'}"
                     alt="${artist.name}"
                     loading="lazy"
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHJ4PSI4Ii8+CjxwYXRoIGQ9Ik01MCAzMEM2My44IDMwIDc1IDQxLjIgNzUgNTVTNjMuOCA4MCA1MCA4MFMyNSA2My44IDI1IDU1UzM2LjIgMzAgNTAgMzBaIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMykiLz4KPHBhdGggZD0iTTUwIDQwQzU0LjQgNDAgNTggNDMuNiA1OCA0OFM1NC40IDU2IDUwIDU2UzQyIDUyLjQgNDIgNDhUNDUuNiA0MCA1MCA0MFoiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC41KSIvPgo8L3N2Zz4K'">
            </div>
            <div class="artist-info">
                <div class="artist-name">${artist.name}</div>
                <div class="artist-stats">
                    <span>专辑: ${artist.albumSize}</span>
                    <span>歌曲: ${artist.musicSize}</span>
                </div>
            </div>
            <div class="artist-action">
                <button class="view-songs-btn" title="查看热门歌曲">
                    <i class="fas fa-music"></i>
                </button>
            </div>
        </div>
    `).join('');

    artistListContainer.innerHTML = `
        <div class="artist-grid">
            ${artistGrid}
        </div>
    `;

    // 绑定点击事件
    artistListContainer.querySelectorAll('.artist-card').forEach(card => {
        card.addEventListener('click', (e) => {
            const artistId = (card as HTMLElement).dataset.artistId;
            const artistName = card.querySelector('.artist-name')?.textContent;

            // 检查是否点击了查看歌曲按钮
            if ((e.target as HTMLElement).closest('.view-songs-btn')) {
                if (artistId) {
                    loadArtistTopSongs(artistId, artistName || '未知歌手');
                }
            } else {
                // 点击歌手卡片也可以查看热门歌曲
                if (artistId) {
                    loadArtistTopSongs(artistId, artistName || '未知歌手');
                }
            }
        });
    });
}

// 加载歌手热门50首歌曲
async function loadArtistTopSongs(artistId: string, artistName: string) {
    const artistListContainer = document.getElementById('artistList');
    if (!artistListContainer) return;

    try {
        artistListContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner"></i><div>正在加载热门歌曲...</div></div>';

        const result = await getArtistTopSongs(artistId);

        if (result.songs.length === 0) {
            artistListContainer.innerHTML = '<div class="error"><i class="fas fa-exclamation-triangle"></i><div>暂无歌曲数据</div></div>';
            return;
        }

        // 创建歌手详情视图
        artistListContainer.innerHTML = `
            <div class="artist-detail-header">
                <button class="back-btn" id="artistBackBtn" title="返回歌手列表">
                    <i class="fas fa-arrow-left"></i> 返回
                </button>
                <div class="artist-detail-info">
                    <div class="artist-detail-avatar">
                        <img src="${result.artist.picUrl || '/images/default-artist.png'}"
                             alt="${result.artist.name}"
                             loading="lazy">
                    </div>
                    <div class="artist-detail-text">
                        <h3 class="artist-detail-name">${result.artist.name}</h3>
                        <p class="artist-detail-desc">热门50首歌曲</p>
                    </div>
                </div>
            </div>
            <div class="artist-songs-list" id="artistSongsList"></div>
        `;

        // 绑定返回按钮事件
        const backBtn = document.getElementById('artistBackBtn');
        if (backBtn) {
            backBtn.addEventListener('click', loadArtistList);
        }

        // 显示歌曲列表
        displaySearchResults(result.songs, 'artistSongsList', result.songs);

        showNotification(`已加载 ${result.artist.name} 的热门歌曲，共 ${result.songs.length} 首`, 'success');

    } catch (error) {
        console.error('加载歌手热门歌曲失败:', error);
        artistListContainer.innerHTML = '<div class="error"><i class="fas fa-exclamation-triangle"></i><div>加载失败，请重试</div></div>';
        showNotification('加载热门歌曲失败', 'error');
    }
}

// 初始化热门歌单
function initHotPlaylists() {
    console.log('📦 初始化热门歌单...');
    
    // 检查容器是否存在
    const hotPlaylistsGrid = document.getElementById('hotPlaylistsGrid');
    const userPlaylistsGrid = document.getElementById('userPlaylistsGrid');
    
    if (!hotPlaylistsGrid) {
        console.warn('⚠️ 热门歌单容器未找到: #hotPlaylistsGrid');
    } else {
        // 初始化网易热门歌单
        initNeteasePlaylists();
    }
    
    if (!userPlaylistsGrid) {
        console.warn('⚠️ 网友精选碟容器未找到: #userPlaylistsGrid');
    } else {
        // 初始化网友精选碟
        initUserPlaylists();
    }
}

// 初始化网易热门歌单
function initNeteasePlaylists() {
    const orderSelect = document.getElementById('playlistOrderSelect') as HTMLSelectElement;
    const categorySelect = document.getElementById('playlistCategorySelect') as HTMLSelectElement;
    const refreshBtn = document.getElementById('refreshPlaylistsBtn');

    if (orderSelect) {
        orderSelect.addEventListener('change', loadNeteasePlaylists);
    }
    if (categorySelect) {
        categorySelect.addEventListener('change', loadNeteasePlaylists);
    }
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadNeteasePlaylists);
    }

    // 初始加载
    loadNeteasePlaylists();
}

// 加载网易热门歌单
async function loadNeteasePlaylists() {
    const gridContainer = document.getElementById('hotPlaylistsGrid');
    if (!gridContainer) return;

    const orderSelect = document.getElementById('playlistOrderSelect') as HTMLSelectElement;
    const categorySelect = document.getElementById('playlistCategorySelect') as HTMLSelectElement;

    const order = (orderSelect?.value || 'hot') as 'hot' | 'new';
    const category = categorySelect?.value || '全部';

    try {
        gridContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner"></i><div>正在加载热门歌单...</div></div>';

        const result = await getHotPlaylists(order, category, 20, 0);

        // 修复：检查返回结果是否有效
        if (!result || !result.playlists || result.playlists.length === 0) {
            gridContainer.innerHTML = '<div class="error"><i class="fas fa-info-circle"></i><div>暂无歌单数据，当前API可能不支持此功能</div></div>';
            console.warn('热门歌单API返回空数据，可能需要切换到NCM API');
            return;
        }

        displayPlaylists(result.playlists, 'netease');

    } catch (error) {
        console.error('加载热门歌单失败:', error);
        gridContainer.innerHTML = '<div class="error"><i class="fas fa-exclamation-triangle"></i><div>加载失败，请重试<br><small>提示：此功能需要NCM API支持</small></div></div>';
        showNotification('加载热门歌单失败，请检查API配置', 'error');
    }
}

// 初始化网友精选碟
function initUserPlaylists() {
    const orderSelect = document.getElementById('userPlaylistsOrderSelect') as HTMLSelectElement;
    const categorySelect = document.getElementById('userPlaylistsCategorySelect') as HTMLSelectElement;
    const refreshBtn = document.getElementById('refreshUserPlaylistsBtn');

    if (orderSelect) {
        orderSelect.addEventListener('change', loadUserPlaylists);
    }
    if (categorySelect) {
        categorySelect.addEventListener('change', loadUserPlaylists);
    }
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadUserPlaylists);
    }

    // 初始加载
    loadUserPlaylists();
}

// 加载网友精选碟
async function loadUserPlaylists() {
    const gridContainer = document.getElementById('userPlaylistsGrid');
    if (!gridContainer) return;

    const orderSelect = document.getElementById('userPlaylistsOrderSelect') as HTMLSelectElement;
    const categorySelect = document.getElementById('userPlaylistsCategorySelect') as HTMLSelectElement;

    const order = (orderSelect?.value || 'hot') as 'hot' | 'new';
    const category = categorySelect?.value || '全部';

    try {
        gridContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner"></i><div>正在加载网友精选碟...</div></div>';

        const result = await getHotPlaylists(order, category, 20, 10); // 偏移10个，获取不同的数据

        // 修复：检查返回结果是否有效
        if (!result || !result.playlists || result.playlists.length === 0) {
            gridContainer.innerHTML = '<div class="error"><i class="fas fa-info-circle"></i><div>暂无歌单数据，当前API可能不支持此功能</div></div>';
            console.warn('网友精选碟API返回空数据，可能需要切换到NCM API');
            return;
        }

        displayPlaylists(result.playlists, 'user');

    } catch (error) {
        console.error('加载网友精选碟失败:', error);
        gridContainer.innerHTML = '<div class="error"><i class="fas fa-exclamation-triangle"></i><div>加载失败，请重试<br><small>提示：此功能需要NCM API支持</small></div></div>';
        showNotification('加载网友精选碟失败，请检查API配置', 'error');
    }
}

// 显示歌单
function displayPlaylists(playlists: any[], type: 'netease' | 'user') {
    // 修复：使用正确的ID选择器而不是class选择器
    const gridId = type === 'netease' ? 'hotPlaylistsGrid' : 'userPlaylistsGrid';
    const gridContainer = document.getElementById(gridId);

    if (!gridContainer) {
        console.error(`找不到容器: ${gridId}`);
        return;
    }

    const playlistCards = playlists.map(playlist => `
        <div class="playlist-card" data-playlist-id="${playlist.id}">
            <div class="playlist-cover">
                <img src="${playlist.coverImgUrl || '/images/default-playlist.png'}"
                     alt="${playlist.name}"
                     loading="lazy"
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU5LDAuMSkiIHJ4PSIxMiIvPgo8cGF0aCBkPSJNMTAwIDYwTDE0MCAxMDBIMTIwVjE0MEg4MFYxMDBINjBMMTAwIDYwWiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjMpIi8+Cjwvc3ZnPgo='">
                <div class="playlist-play-count">
                    <i class="fas fa-play"></i>
                    ${formatPlayCount(playlist.playCount)}
                </div>
            </div>
            <div class="playlist-info">
                <div class="playlist-name">${playlist.name}</div>
                <div class="playlist-creator">by ${playlist.creator.nickname}</div>
            </div>
        </div>
    `).join('');

    gridContainer.innerHTML = playlistCards;

    // 绑定点击事件
    gridContainer.querySelectorAll('.playlist-card').forEach(card => {
        card.addEventListener('click', () => {
            const playlistId = (card as HTMLElement).dataset.playlistId;
            if (playlistId) {
                loadPlaylistSongs(playlistId);
            }
        });
    });
}

// 格式化播放次数
function formatPlayCount(count: number): string {
    if (count >= 100000000) {
        return `${Math.floor(count / 100000000)}亿`;
    } else if (count >= 10000) {
        return `${Math.floor(count / 10000)}万`;
    }
    return count.toString();
}

// 加载歌单歌曲
async function loadPlaylistSongs(playlistId: string) {
    try {
        const result = await parsePlaylistAPI(playlistId, 'netease');

        // 切换到搜索结果标签页显示歌单歌曲
        const searchTab = document.getElementById('searchTab');
        const searchResults = document.getElementById('searchResults');

        if (searchTab && searchResults) {
            // 切换到搜索标签页
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelector('[data-tab="search"]')?.classList.add('active');

            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
                (content as HTMLElement).style.display = 'none';
            });
            searchTab.classList.add('active');
            searchTab.style.display = 'block';

            // 显示歌单信息
            const playlistName = result.name || '未知歌单';
            searchResults.innerHTML = `
                <div class="playlist-detail-header">
                    <button class="back-btn" id="playlistBackToDiscoverBtn">
                        <i class="fas fa-arrow-left"></i> 返回
                    </button>
                    <div class="playlist-detail-info">
                        <h3>${escapeHtml(playlistName)}</h3>
                        <p>共 ${result.count} 首歌曲</p>
                    </div>
                </div>
                <div class="playlist-songs-container"></div>
            `;

            // 绑定返回按钮事件
            const backBtn = document.getElementById('playlistBackToDiscoverBtn');
            if (backBtn) {
                backBtn.addEventListener('click', () => {
                    // 返回发现音乐标签页
                    const discoverTab = document.querySelector('[data-tab="discover"]');
                    if (discoverTab) {
                        (discoverTab as HTMLElement).click();
                    }
                });
            }

            // 显示歌曲列表
            const container = searchResults.querySelector('.playlist-songs-container');
            if (container) {
                displaySearchResults(result.songs, container.id = 'playlistSongs', result.songs);
            }

            showNotification(`已加载歌单：${escapeHtml(playlistName)}`, 'success');
        }

    } catch (error) {
        console.error('加载歌单歌曲失败:', error);
        showNotification('加载歌单失败', 'error');
    }
}