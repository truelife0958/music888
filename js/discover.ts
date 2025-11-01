/**
 * 发现音乐模块
 * 提供推荐歌单、新歌速递、排行榜等功能
 */

import { renderSongListWithBatchOps } from './ui-enhancements.js';

// API基础地址配置
function getApiBase(): string {
  // 生产环境使用 Vercel 部署的网易云API
  return 'https://music888-4swa.vercel.app';
}

// 本地开发环境使用 Meting API 模拟推荐功能
function isLocalDev(): boolean {
  return typeof window !== 'undefined' && window.location.hostname === 'localhost';
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
export async function getRecommendPlaylists(limit: number = 50): Promise<Playlist[]> {
  try {
    // 本地开发环境：使用搜索API模拟推荐（降级方案）
    if (isLocalDev()) {
      const keywords = ['热门歌单', '精选歌单', '流行音乐', '网络热歌'];
      const keyword = keywords[Math.floor(Math.random() * keywords.length)];
      
      // 使用Meting API搜索
      const response = await fetch(`/api/meting?types=search&source=netease&name=${encodeURIComponent(keyword)}&count=${Math.min(limit, 30)}`);
      const songs = await response.json();
      
      if (Array.isArray(songs) && songs.length > 0) {
        // 将歌曲结果转换为"歌单"格式
        return songs.slice(0, 12).map((song: any, index: number) => ({
          id: parseInt(song.id) || index,
          name: song.name || '未知歌曲',
          coverImgUrl: song.pic || song.cover || (song.pic_id ? `https://music-api.gdstudio.xyz/api.php?types=pic&source=netease&id=${song.pic_id}` : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmaWxsPSIjNjY2IiBmb250LXNpemU9IjIwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+5peg5Zu+54mHPC90ZXh0Pjwvc3ZnPg=='),
          playCount: Math.floor(Math.random() * 1000000),
          trackCount: 1,
          creator: {
            nickname: Array.isArray(song.artist) ? song.artist[0] : '未知',
            avatarUrl: ''
          },
          description: `${Array.isArray(song.artist) ? song.artist.join('/') : ''}`
        }));
      }
      return [];
    }
    
    // 生产环境：使用网易云API
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
    const response = await fetch(`${getApiBase()}/top_song?type=${type}`);
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
    const response = await fetch(`${getApiBase()}/playlist_detail?id=${id}`);
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
 * 渲染推荐音乐（改为歌曲列表样式，带批量操作）
 */
export async function renderRecommendPlaylists(containerId: string, limit: number = 30): Promise<void> {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = '<div class="loading">加载中...</div>';
  
  const playlists = await getRecommendPlaylists(limit);
  
  if (playlists.length === 0) {
    container.innerHTML = '<div class="empty">暂无推荐音乐</div>';
    return;
  }
  
  // 将歌单数据转换为歌曲格式显示
  const songs = playlists.map(playlist => ({
    id: String(playlist.id),
    name: playlist.name,
    title: playlist.name,
    artist: [playlist.creator.nickname],
    album: playlist.description || '',
    pic: playlist.coverImgUrl,
    pic_id: '',
    lyric_id: '',
    duration: 0,
    source: 'netease'
  })) as any[];
  
  // 使用带批量操作的渲染函数
  renderSongListWithBatchOps(songs, containerId, {
    showCover: true,
    showAlbum: true,
    playlistForPlayback: songs
  });
}

/**
 * 渲染新歌速递（带批量操作）
 */
export async function renderNewSongs(containerId: string, type: number = 0): Promise<void> {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = '<div class="loading">加载中...</div>';
  
  const songsData = await getNewSongs(type);
  
  if (songsData.length === 0) {
    container.innerHTML = '<div class="empty">暂无新歌</div>';
    return;
  }
  
  // 转换为标准格式
  const songs = songsData.slice(0, 150).map(song => ({
    id: String(song.id),
    name: song.name,
    title: song.name,
    artist: song.artists.map((a: any) => a.name),
    album: song.album.name,
    pic: song.album.picUrl,
    pic_id: '',
    lyric_id: '',
    duration: song.duration,
    source: 'netease'
  })) as any[];
  
  // 使用带批量操作的渲染函数
  renderSongListWithBatchOps(songs, containerId, {
    showCover: true,
    showAlbum: true,
    playlistForPlayback: songs
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
    <div class="toplist-grid" id="toplistGrid">
      ${topLists.map(list => `
        <div class="toplist-card" data-id="${list.id}" data-name="${list.name}">
          <div class="toplist-cover">
            <img src="${list.coverImgUrl}" alt="${list.name}" loading="lazy">
            <div class="toplist-overlay">
              <button class="play-btn" data-id="${list.id}" data-name="${list.name}">全部</button>
            </div>
          </div>
          <div class="toplist-info">
            <h3 class="toplist-name">${list.name}</h3>
            <p class="toplist-update">${list.updateFrequency}</p>
            ${list.tracks.slice(0, 3).map((track, i) => `
              <div class="toplist-track">
                <span class="track-index">${i + 1}</span>
                <span class="track-name">${track.name}</span>
                <span class="track-artist">${Array.isArray(track.artists) ? track.artists.map((a: any) => a.name || '未知歌手').join('/') : '未知歌手'}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
  
  container.innerHTML = html;
  
  // 绑定播放全部事件 - 显示歌曲列表
  container.querySelectorAll('.play-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = parseInt((e.target as HTMLElement).dataset.id || '0');
      const name = (e.target as HTMLElement).dataset.name || '排行榜';
      await renderTopListDetail(containerId, id, name);
    });
  });
  
  // 绑定卡片点击事件 - 也显示歌曲列表
  container.querySelectorAll('.toplist-card').forEach(card => {
    card.addEventListener('click', async (e) => {
      // 如果点击的是播放按钮，不处理
      if ((e.target as HTMLElement).classList.contains('play-btn')) return;
      
      const id = parseInt((e.currentTarget as HTMLElement).dataset.id || '0');
      const name = (e.currentTarget as HTMLElement).dataset.name || '排行榜';
      await renderTopListDetail(containerId, id, name);
    });
  });
}

/**
 * 渲染排行榜详情（歌曲列表）
 */
export async function renderTopListDetail(containerId: string, id: number, name: string): Promise<void> {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = '<div class="loading">加载中...</div>';
  
  const detail = await getPlaylistDetail(id);
  
  if (!detail || !detail.songs || detail.songs.length === 0) {
    container.innerHTML = '<div class="empty">暂无歌曲</div>';
    return;
  }
  
  const songs = detail.songs;
  
  // 转换为标准格式
  const songList = songs.map(song => ({
    id: String(song.id),
    name: song.name,
    title: song.name,
    artist: song.artists.map((a: any) => a.name),
    album: song.album.name,
    pic: song.album.picUrl,
    pic_id: '',
    lyric_id: '',
    duration: song.duration,
    source: 'netease'
  })) as any[];
  
  // 创建返回按钮HTML
  const headerHTML = `
    <div style="margin-bottom: 15px; padding: 0 20px;">
      <button class="filter-btn" id="backToTopLists" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 10px 20px; cursor: pointer;">
        <i class="fas fa-arrow-left"></i> 返回排行榜
      </button>
      <span style="margin-left: 15px; font-size: 18px; font-weight: 600; color: #fff;">${name}</span>
    </div>
  `;
  
  container.innerHTML = headerHTML;
  
  // 创建歌曲列表容器
  const listContainer = document.createElement('div');
  listContainer.id = containerId + '_list';
  container.appendChild(listContainer);
  
  // 使用带批量操作的渲染函数
  renderSongListWithBatchOps(songList, containerId + '_list', {
    showCover: true,
    showAlbum: true,
    playlistForPlayback: songList
  });
  
  // 绑定返回按钮
  const backBtn = document.getElementById('backToTopLists');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      renderTopLists(containerId);
    });
  }
}

/**
 * 渲染雷达歌单
 */
export async function renderRadarSongs(containerId: string, limit: number = 100): Promise<Song[]> {
  const container = document.getElementById(containerId);
  if (!container) return [];

  container.innerHTML = '<div class="loading">正在探索音乐雷达...</div>';

  try {
    // 使用搜索API随机获取热门歌曲
    const keywords = ['热门', '流行', '新歌', '抖音', '网络热歌'];
    const randomKeyword = keywords[Math.floor(Math.random() * keywords.length)];

    const response = await fetch(`${getApiBase()}/search?keywords=${encodeURIComponent(randomKeyword)}&limit=${limit}`);
    const data = await response.json();

    let songs: Song[] = [];

    if (data.code === 200 && data.result?.songs) {
      songs = data.result.songs.map((item: any) => ({
        id: item.id,
        name: item.name,
        artists: item.artists || item.ar || [],
        album: item.album || item.al || { id: 0, name: '', picUrl: '' },
        duration: item.duration || item.dt || 0
      }));
    }

    if (songs.length === 0) {
      container.innerHTML = '<div class="empty">暂无歌曲</div>';
      return [];
    }

    // 随机打乱歌曲顺序
    songs = songs.sort(() => Math.random() - 0.5);

    // 转换为标准格式
    const songList = songs.slice(0, limit).map(song => ({
      id: String(song.id),
      name: song.name,
      title: song.name,
      artist: song.artists.map((a: any) => a.name),
      album: song.album.name,
      pic: song.album.picUrl,
      pic_id: '',
      lyric_id: '',
      duration: song.duration,
      source: 'netease'
    })) as any[];

    // 使用带批量操作的渲染函数
    renderSongListWithBatchOps(songList, containerId, {
      showCover: true,
      showAlbum: true,
      playlistForPlayback: songList
    });

    return songs;
  } catch (error) {
    console.error('获取雷达歌单失败:', error);
    container.innerHTML = '<div class="empty">获取失败，请稍后重试</div>';
    return [];
  }
}