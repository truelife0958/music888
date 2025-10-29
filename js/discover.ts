/**
 * 发现音乐模块
 * 提供推荐歌单、新歌速递、排行榜等功能
 */

// API基础地址
function getApiBase(): string {
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:3000';
  }
  return 'https://music888-4swa.vercel.app';
}

// 歌单接口
export interface Playlist {
  id: number;
  name: string;
  coverImgUrl: string;
  playCount: number;
  trackCount: number;
  creator: {
    nickname: string;
    avatarUrl: string;
  };
  description?: string;
  tags?: string[];
}

// 歌曲接口
export interface Song {
  id: number;
  name: string;
  artists: Array<{ id: number; name: string }>;
  album: {
    id: number;
    name: string;
    picUrl: string;
  };
  duration: number;
}

// 排行榜接口
export interface TopList {
  id: number;
  name: string;
  coverImgUrl: string;
  updateFrequency: string;
  tracks: Song[];
  description?: string;
}

/**
 * 获取推荐歌单
 * @param limit 数量限制，默认30
 */
export async function getRecommendPlaylists(limit: number = 30): Promise<Playlist[]> {
  try {
    const response = await fetch(`${getApiBase()}/personalized?limit=${limit}`);
    const data = await response.json();
    
    if (data.code === 200 && data.result) {
      return data.result.map((item: any) => ({
        id: item.id,
        name: item.name,
        coverImgUrl: item.picUrl,
        playCount: item.playCount || 0,
        trackCount: item.trackCount || 0,
        creator: {
          nickname: item.copywriter || '网易云音乐',
          avatarUrl: item.picUrl
        },
        description: item.copywriter
      }));
    }
    return [];
  } catch (error) {
    console.error('获取推荐歌单失败:', error);
    return [];
  }
}

/**
 * 获取精品歌单
 * @param cat 分类，默认'全部'
 * @param limit 数量限制，默认30
 */
export async function getHighQualityPlaylists(cat: string = '全部', limit: number = 30): Promise<Playlist[]> {
  try {
    const response = await fetch(`${getApiBase()}/top/playlist/highquality?cat=${encodeURIComponent(cat)}&limit=${limit}`);
    const data = await response.json();
    
    if (data.code === 200 && data.playlists) {
      return data.playlists.map((item: any) => ({
        id: item.id,
        name: item.name,
        coverImgUrl: item.coverImgUrl,
        playCount: item.playCount || 0,
        trackCount: item.trackCount || 0,
        creator: {
          nickname: item.creator?.nickname || '未知',
          avatarUrl: item.creator?.avatarUrl || ''
        },
        description: item.description,
        tags: item.tags || []
      }));
    }
    return [];
  } catch (error) {
    console.error('获取精品歌单失败:', error);
    return [];
  }
}

/**
 * 获取新歌速递
 * @param type 类型: 0-全部, 7-华语, 96-欧美, 8-日本, 16-韩国
 */
export async function getNewSongs(type: number = 0): Promise<Song[]> {
  try {
    const response = await fetch(`${getApiBase()}/top/song?type=${type}`);
    const data = await response.json();
    
    if (data.code === 200 && data.data) {
      return data.data.map((item: any) => ({
        id: item.id,
        name: item.name,
        artists: item.artists || [],
        album: item.album || { id: 0, name: '', picUrl: '' },
        duration: item.duration || 0
      }));
    }
    return [];
  } catch (error) {
    console.error('获取新歌速递失败:', error);
    return [];
  }
}

/**
 * 获取所有排行榜
 */
export async function getAllTopLists(): Promise<TopList[]> {
  try {
    const response = await fetch(`${getApiBase()}/toplist`);
    const data = await response.json();
    
    if (data.code === 200 && data.list) {
      return data.list.map((item: any) => ({
        id: item.id,
        name: item.name,
        coverImgUrl: item.coverImgUrl,
        updateFrequency: item.updateFrequency || '每日更新',
        tracks: item.tracks || [],
        description: item.description
      }));
    }
    return [];
  } catch (error) {
    console.error('获取排行榜失败:', error);
    return [];
  }
}

/**
 * 获取歌单详情
 * @param id 歌单ID
 */
export async function getPlaylistDetail(id: number): Promise<{ playlist: Playlist; songs: Song[] } | null> {
  try {
    const response = await fetch(`${getApiBase()}/playlist/detail?id=${id}`);
    const data = await response.json();
    
    if (data.code === 200 && data.playlist) {
      const playlist: Playlist = {
        id: data.playlist.id,
        name: data.playlist.name,
        coverImgUrl: data.playlist.coverImgUrl,
        playCount: data.playlist.playCount || 0,
        trackCount: data.playlist.trackCount || 0,
        creator: {
          nickname: data.playlist.creator?.nickname || '未知',
          avatarUrl: data.playlist.creator?.avatarUrl || ''
        },
        description: data.playlist.description,
        tags: data.playlist.tags || []
      };
      
      const songs: Song[] = (data.playlist.tracks || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        artists: item.ar || [],
        album: item.al || { id: 0, name: '', picUrl: '' },
        duration: item.dt || 0
      }));
      
      return { playlist, songs };
    }
    return null;
  } catch (error) {
    console.error('获取歌单详情失败:', error);
    return null;
  }
}

/**
 * 格式化播放次数
 */
export function formatPlayCount(count: number): string {
  if (count >= 100000000) {
    return (count / 100000000).toFixed(1) + '亿';
  } else if (count >= 10000) {
    return (count / 10000).toFixed(1) + '万';
  }
  return count.toString();
}

/**
 * 渲染推荐歌单
 */
export async function renderRecommendPlaylists(containerId: string, limit: number = 30): Promise<void> {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = '<div class="loading">加载中...</div>';
  
  const playlists = await getRecommendPlaylists(limit);
  
  if (playlists.length === 0) {
    container.innerHTML = '<div class="empty">暂无推荐歌单</div>';
    return;
  }
  
  const html = `
    <div class="playlist-grid">
      ${playlists.map(playlist => `
        <div class="playlist-card" data-id="${playlist.id}">
          <div class="playlist-cover">
            <img src="${playlist.coverImgUrl}" alt="${playlist.name}" loading="lazy">
            <div class="playlist-overlay">
              <div class="play-count">▶ ${formatPlayCount(playlist.playCount)}</div>
              <button class="play-btn" data-id="${playlist.id}">播放</button>
            </div>
          </div>
          <div class="playlist-info">
            <h3 class="playlist-name" title="${playlist.name}">${playlist.name}</h3>
            <p class="playlist-desc" title="${playlist.description || ''}">${playlist.description || ''}</p>
          </div>
        </div>
      `).join('')}
    </div>
  `;
  
  container.innerHTML = html;
  
  // 绑定事件
  container.querySelectorAll('.play-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = parseInt((e.target as HTMLElement).dataset.id || '0');
      const detail = await getPlaylistDetail(id);
      if (detail) {
        document.dispatchEvent(new CustomEvent('playPlaylist', { detail }));
      }
    });
  });
  
  container.querySelectorAll('.playlist-card').forEach(card => {
    card.addEventListener('click', async (e) => {
      const id = parseInt((e.currentTarget as HTMLElement).dataset.id || '0');
      const detail = await getPlaylistDetail(id);
      if (detail) {
        document.dispatchEvent(new CustomEvent('showPlaylistDetail', { detail }));
      }
    });
  });
}

/**
 * 渲染新歌速递
 */
export async function renderNewSongs(containerId: string, type: number = 0): Promise<void> {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = '<div class="loading">加载中...</div>';
  
  const songs = await getNewSongs(type);
  
  if (songs.length === 0) {
    container.innerHTML = '<div class="empty">暂无新歌</div>';
    return;
  }
  
  const html = `
    <div class="song-list">
      ${songs.slice(0, 100).map((song, index) => `
        <div class="song-item" data-id="${song.id}">
          <div class="song-index">${(index + 1).toString().padStart(2, '0')}</div>
          <img src="${song.album.picUrl}" alt="${song.name}" class="song-cover">
          <div class="song-info">
            <div class="song-name">${song.name}</div>
            <div class="song-artist">${song.artists.map(a => a.name).join(' / ')}</div>
          </div>
          <div class="song-album">${song.album.name}</div>
          <button class="song-play-btn" data-id="${song.id}">播放</button>
        </div>
      `).join('')}
    </div>
  `;
  
  container.innerHTML = html;
  
  // 绑定播放事件
  container.querySelectorAll('.song-play-btn, .song-item').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = parseInt((e.currentTarget as HTMLElement).dataset.id || '0');
      const song = songs.find(s => s.id === id);
      if (song) {
        document.dispatchEvent(new CustomEvent('playSong', { detail: { song } }));
      }
    });
  });
}

/**
 * 创建新歌类型筛选器
 */
export function createNewSongFilter(containerId: string, onChange: (type: number) => void): void {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const types = [
    { value: 0, label: '全部' },
    { value: 7, label: '华语' },
    { value: 96, label: '欧美' },
    { value: 8, label: '日本' },
    { value: 16, label: '韩国' }
  ];
  
  const html = `
    <div class="song-type-filter">
      ${types.map(type => `
        <button class="filter-btn ${type.value === 0 ? 'active' : ''}" data-type="${type.value}">
          ${type.label}
        </button>
      `).join('')}
    </div>
  `;
  
  container.innerHTML = html;
  
  container.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      container.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      (e.target as HTMLElement).classList.add('active');
      const type = parseInt((e.target as HTMLElement).dataset.type || '0');
      onChange(type);
    });
  });
}

/**
 * 渲染排行榜
 */
export async function renderTopLists(containerId: string): Promise<void> {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = '<div class="loading">加载中...</div>';
  
  const topLists = await getAllTopLists();
  
  if (topLists.length === 0) {
    container.innerHTML = '<div class="empty">暂无排行榜</div>';
    return;
  }
  
  const html = `
    <div class="toplist-grid">
      ${topLists.map(list => `
        <div class="toplist-card" data-id="${list.id}">
          <div class="toplist-cover">
            <img src="${list.coverImgUrl}" alt="${list.name}" loading="lazy">
            <div class="toplist-overlay">
              <button class="play-btn" data-id="${list.id}">播放全部</button>
            </div>
          </div>
          <div class="toplist-info">
            <h3 class="toplist-name">${list.name}</h3>
            <p class="toplist-update">${list.updateFrequency}</p>
            ${list.tracks.slice(0, 3).map((track, i) => `
              <div class="toplist-track">
                <span class="track-index">${i + 1}</span>
                <span class="track-name">${track.name}</span>
                <span class="track-artist">${track.artists.map(a => a.name).join('/')}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
  
  container.innerHTML = html;
  
  // 绑定事件
  container.querySelectorAll('.play-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = parseInt((e.target as HTMLElement).dataset.id || '0');
      const detail = await getPlaylistDetail(id);
      if (detail) {
        document.dispatchEvent(new CustomEvent('playPlaylist', { detail }));
      }
    });
  });
  
  container.querySelectorAll('.toplist-card').forEach(card => {
    card.addEventListener('click', async (e) => {
      const id = parseInt((e.currentTarget as HTMLElement).dataset.id || '0');
      const detail = await getPlaylistDetail(id);
      if (detail) {
        document.dispatchEvent(new CustomEvent('showPlaylistDetail', { detail }));
      }
    });
  });
}