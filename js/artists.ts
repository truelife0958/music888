/**
 * 歌手模块
 * 提供歌手列表、歌手详情、歌手推荐等功能
 */

// API基础地址
function getApiBase(): string {
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:3000';
  }
  return 'https://music888-4swa.vercel.app';
}

// 歌手接口
export interface Artist {
  id: number;
  name: string;
  picUrl: string;
  albumSize?: number;
  musicSize?: number;
  mvSize?: number;
  briefDesc?: string;
  alias?: string[];
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

// 专辑接口
export interface Album {
  id: number;
  name: string;
  picUrl: string;
  publishTime: number;
  size: number;
  artist: {
    id: number;
    name: string;
  };
}

/**
 * 获取热门歌手
 * @param limit 数量限制,默认30
 * @param offset 偏移量,默认0
 */
export async function getTopArtists(limit: number = 30, offset: number = 0): Promise<Artist[]> {
  try {
    const response = await fetch(`${getApiBase()}/top_artists?limit=${limit}&offset=${offset}`);
    const data = await response.json();

    if (data.code === 200 && data.artists) {
      return data.artists.map((item: any) => ({
        id: item.id,
        name: item.name,
        picUrl: item.picUrl || item.img1v1Url,
        albumSize: item.albumSize || 0,
        musicSize: item.musicSize || 0,
        mvSize: item.mvSize || 0,
        briefDesc: item.briefDesc,
        alias: item.alias || []
      }));
    }
    return [];
  } catch (error) {
    console.error('获取热门歌手失败:', error);
    return [];
  }
}

/**
 * 获取歌手分类列表
 * @param type 类型: 1-男歌手, 2-女歌手, 3-乐队
 * @param area 地区: -1-全部, 7-华语, 96-欧美, 8-日本, 16-韩国, 0-其他
 * @param initial 首字母: a-z, -1-热门, #-其他
 * @param limit 数量限制
 * @param offset 偏移量
 */
export async function getArtistList(
  type: number = -1,
  area: number = -1,
  initial: string = '-1',
  limit: number = 30,
  offset: number = 0
): Promise<Artist[]> {
  try {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString()
    });

    if (type !== -1) params.append('type', type.toString());
    if (area !== -1) params.append('area', area.toString());
    if (initial !== '-1') params.append('initial', initial);

    const response = await fetch(`${getApiBase()}/artist_list?${params.toString()}`);
    const data = await response.json();

    if (data.code === 200 && data.artists) {
      return data.artists.map((item: any) => ({
        id: item.id,
        name: item.name,
        picUrl: item.picUrl || item.img1v1Url,
        albumSize: item.albumSize || 0,
        musicSize: item.musicSize || 0,
        mvSize: item.mvSize || 0,
        briefDesc: item.briefDesc,
        alias: item.alias || []
      }));
    }
    return [];
  } catch (error) {
    console.error('获取歌手列表失败:', error);
    return [];
  }
}

/**
 * 获取歌手详情
 * @param id 歌手ID
 */
export async function getArtistDetail(id: number): Promise<Artist | null> {
  try {
    const response = await fetch(`${getApiBase()}/artist_detail?id=${id}`);
    const data = await response.json();

    if (data.code === 200 && data.data?.artist) {
      const artist = data.data.artist;
      return {
        id: artist.id,
        name: artist.name,
        picUrl: artist.picUrl || artist.cover,
        albumSize: artist.albumSize || 0,
        musicSize: artist.musicSize || 0,
        mvSize: artist.mvSize || 0,
        briefDesc: artist.briefDesc,
        alias: artist.alias || []
      };
    }
    return null;
  } catch (error) {
    console.error('获取歌手详情失败:', error);
    return null;
  }
}

/**
 * 获取歌手热门50首歌曲
 * @param id 歌手ID
 */
export async function getArtistTopSongs(id: number): Promise<Song[]> {
  try {
    const response = await fetch(`${getApiBase()}/artist_top_song?id=${id}`);
    const data = await response.json();

    if (data.code === 200 && data.songs) {
      return data.songs.map((item: any) => ({
        id: item.id,
        name: item.name,
        artists: item.ar || [],
        album: item.al || { id: 0, name: '', picUrl: '' },
        duration: item.dt || 0
      }));
    }
    return [];
  } catch (error) {
    console.error('获取歌手热门歌曲失败:', error);
    return [];
  }
}

/**
 * 获取歌手全部歌曲
 * @param id 歌手ID
 * @param limit 数量限制
 * @param offset 偏移量
 */
export async function getArtistSongs(id: number, limit: number = 50, offset: number = 0): Promise<Song[]> {
  try {
    const response = await fetch(`${getApiBase()}/artist_songs?id=${id}&limit=${limit}&offset=${offset}`);
    const data = await response.json();

    if (data.code === 200 && data.songs) {
      return data.songs.map((item: any) => ({
        id: item.id,
        name: item.name,
        artists: item.ar || [],
        album: item.al || { id: 0, name: '', picUrl: '' },
        duration: item.dt || 0
      }));
    }
    return [];
  } catch (error) {
    console.error('获取歌手全部歌曲失败:', error);
    return [];
  }
}

/**
 * 获取歌手专辑
 * @param id 歌手ID
 * @param limit 数量限制
 * @param offset 偏移量
 */
export async function getArtistAlbums(id: number, limit: number = 30, offset: number = 0): Promise<Album[]> {
  try {
    const response = await fetch(`${getApiBase()}/artist_album?id=${id}&limit=${limit}&offset=${offset}`);
    const data = await response.json();

    if (data.code === 200 && data.hotAlbums) {
      return data.hotAlbums.map((item: any) => ({
        id: item.id,
        name: item.name,
        picUrl: item.picUrl,
        publishTime: item.publishTime || 0,
        size: item.size || 0,
        artist: {
          id: item.artist?.id || 0,
          name: item.artist?.name || ''
        }
      }));
    }
    return [];
  } catch (error) {
    console.error('获取歌手专辑失败:', error);
    return [];
  }
}

/**
 * 获取相似歌手
 * @param id 歌手ID
 */
export async function getSimilarArtists(id: number): Promise<Artist[]> {
  try {
    const response = await fetch(`${getApiBase()}/simi_artist?id=${id}`);
    const data = await response.json();

    if (data.code === 200 && data.artists) {
      return data.artists.map((item: any) => ({
        id: item.id,
        name: item.name,
        picUrl: item.picUrl || item.img1v1Url,
        albumSize: item.albumSize || 0,
        musicSize: item.musicSize || 0,
        mvSize: item.mvSize || 0,
        briefDesc: item.briefDesc,
        alias: item.alias || []
      }));
    }
    return [];
  } catch (error) {
    console.error('获取相似歌手失败:', error);
    return [];
  }
}

/**
 * 格式化数字
 */
export function formatNumber(num: number): string {
  if (num >= 100000000) {
    return (num / 100000000).toFixed(1) + '亿';
  } else if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万';
  }
  return num.toString();
}

/**
 * 格式化时长
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * 渲染热门歌手
 */
export async function renderTopArtists(containerId: string, limit: number = 30): Promise<void> {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '<div class="loading">加载中...</div>';

  const artists = await getTopArtists(limit);

  if (artists.length === 0) {
    container.innerHTML = '<div class="empty">暂无歌手数据</div>';
    return;
  }

  const html = `
    <div class="artist-grid">
      ${artists.map(artist => `
        <div class="artist-card" data-id="${artist.id}">
          <div class="artist-cover">
            <img src="${artist.picUrl}" alt="${artist.name}" loading="lazy">
            <div class="artist-overlay">
              <button class="play-btn" data-id="${artist.id}">查看</button>
            </div>
          </div>
          <div class="artist-info">
            <h3 class="artist-name" title="${artist.name}">${artist.name}</h3>
            ${artist.musicSize ? `<p class="artist-count">歌曲: ${artist.musicSize}</p>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `;

  container.innerHTML = html;

  // 绑定事件
  container.querySelectorAll('.artist-card, .play-btn').forEach(el => {
    el.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = parseInt((e.currentTarget as HTMLElement).dataset.id || '0');
      document.dispatchEvent(new CustomEvent('openArtist', { detail: { id } }));
    });
  });
}

/**
 * 渲染歌手分类列表
 */
export async function renderArtistList(
  containerId: string,
  type: number = -1,
  area: number = -1,
  initial: string = '-1'
): Promise<void> {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '<div class="loading">加载中...</div>';

  const artists = await getArtistList(type, area, initial, 50);

  if (artists.length === 0) {
    container.innerHTML = '<div class="empty">暂无歌手数据</div>';
    return;
  }

  const html = `
    <div class="artist-grid">
      ${artists.map(artist => `
        <div class="artist-card" data-id="${artist.id}">
          <div class="artist-cover">
            <img src="${artist.picUrl}" alt="${artist.name}" loading="lazy">
            <div class="artist-overlay">
              <button class="play-btn" data-id="${artist.id}">查看</button>
            </div>
          </div>
          <div class="artist-info">
            <h3 class="artist-name" title="${artist.name}">${artist.name}</h3>
            ${artist.musicSize ? `<p class="artist-count">歌曲: ${artist.musicSize}</p>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `;

  container.innerHTML = html;

  // 绑定事件
  container.querySelectorAll('.artist-card, .play-btn').forEach(el => {
    el.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = parseInt((e.currentTarget as HTMLElement).dataset.id || '0');
      document.dispatchEvent(new CustomEvent('openArtist', { detail: { id } }));
    });
  });
}

/**
 * 创建歌手筛选器
 */
export function createArtistFilter(
  containerId: string,
  onChange: (type: number, area: number, initial: string) => void
): void {
  const container = document.getElementById(containerId);
  if (!container) return;

  const types = [
    { value: -1, label: '全部' },
    { value: 1, label: '男歌手' },
    { value: 2, label: '女歌手' },
    { value: 3, label: '乐队' }
  ];

  const areas = [
    { value: -1, label: '全部' },
    { value: 7, label: '华语' },
    { value: 96, label: '欧美' },
    { value: 8, label: '日本' },
    { value: 16, label: '韩国' },
    { value: 0, label: '其他' }
  ];

  const initials = [
    { value: '-1', label: '热门' },
    { value: 'A', label: 'A' },
    { value: 'B', label: 'B' },
    { value: 'C', label: 'C' },
    { value: 'D', label: 'D' },
    { value: 'E', label: 'E' },
    { value: 'F', label: 'F' },
    { value: 'G', label: 'G' },
    { value: 'H', label: 'H' },
    { value: 'I', label: 'I' },
    { value: 'J', label: 'J' },
    { value: 'K', label: 'K' },
    { value: 'L', label: 'L' },
    { value: 'M', label: 'M' },
    { value: 'N', label: 'N' },
    { value: 'O', label: 'O' },
    { value: 'P', label: 'P' },
    { value: 'Q', label: 'Q' },
    { value: 'R', label: 'R' },
    { value: 'S', label: 'S' },
    { value: 'T', label: 'T' },
    { value: 'U', label: 'U' },
    { value: 'V', label: 'V' },
    { value: 'W', label: 'W' },
    { value: 'X', label: 'X' },
    { value: 'Y', label: 'Y' },
    { value: 'Z', label: 'Z' },
    { value: '#', label: '#' }
  ];

  let selectedType = -1;
  let selectedArea = -1;
  let selectedInitial = '-1';

  const html = `
    <div class="artist-filter">
      <div class="filter-group">
        <label>分类:</label>
        <div class="filter-buttons" data-filter="type">
          ${types.map(type => `
            <button class="filter-btn ${type.value === -1 ? 'active' : ''}" data-value="${type.value}">
              ${type.label}
            </button>
          `).join('')}
        </div>
      </div>
      <div class="filter-group">
        <label>地区:</label>
        <div class="filter-buttons" data-filter="area">
          ${areas.map(area => `
            <button class="filter-btn ${area.value === -1 ? 'active' : ''}" data-value="${area.value}">
              ${area.label}
            </button>
          `).join('')}
        </div>
      </div>
      <div class="filter-group">
        <label>首字母:</label>
        <div class="filter-buttons" data-filter="initial">
          ${initials.map(initial => `
            <button class="filter-btn ${initial.value === '-1' ? 'active' : ''}" data-value="${initial.value}">
              ${initial.label}
            </button>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;

  // 绑定事件
  container.querySelectorAll('.filter-buttons').forEach(group => {
    const filterType = (group as HTMLElement).dataset.filter;

    group.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        // 移除同组其他按钮的active状态
        group.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        (e.target as HTMLElement).classList.add('active');

        const value = (e.target as HTMLElement).dataset.value || '';

        if (filterType === 'type') {
          selectedType = parseInt(value);
        } else if (filterType === 'area') {
          selectedArea = parseInt(value);
        } else if (filterType === 'initial') {
          selectedInitial = value;
        }

        onChange(selectedType, selectedArea, selectedInitial);
      });
    });
  });
}

/**
 * 渲染歌手详情
 */
export async function renderArtistDetail(containerId: string, id: number): Promise<void> {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '<div class="loading">加载中...</div>';

  const [artist, topSongs, albums, similarArtists] = await Promise.all([
    getArtistDetail(id),
    getArtistTopSongs(id),
    getArtistAlbums(id, 10),
    getSimilarArtists(id)
  ]);

  if (!artist) {
    container.innerHTML = '<div class="empty">获取歌手信息失败</div>';
    return;
  }

  const html = `
    <div class="artist-detail">
      <div class="artist-header">
        <img src="${artist.picUrl}" alt="${artist.name}" class="artist-avatar">
        <div class="artist-header-info">
          <h1>${artist.name}</h1>
          ${artist.alias && artist.alias.length > 0 ? `<p class="artist-alias">${artist.alias.join(' / ')}</p>` : ''}
          <div class="artist-stats">
            <span><i class="fas fa-music"></i> ${artist.musicSize || 0} 首歌曲</span>
            <span><i class="fas fa-compact-disc"></i> ${artist.albumSize || 0} 张专辑</span>
            <span><i class="fas fa-video"></i> ${artist.mvSize || 0} 个MV</span>
          </div>
          ${artist.briefDesc ? `<p class="artist-desc">${artist.briefDesc}</p>` : ''}
        </div>
      </div>

      <div class="artist-content">
        <div class="artist-section">
          <h2><i class="fas fa-fire"></i> 热门歌曲 (Top 50)</h2>
          <button class="play-all-btn" data-artist-id="${id}">播放全部</button>
          <div class="song-list">
            ${topSongs.slice(0, 50).map((song, index) => `
              <div class="song-item" data-id="${song.id}">
                <div class="song-index">${(index + 1).toString().padStart(2, '0')}</div>
                <img src="${song.album.picUrl}" alt="${song.name}" class="song-cover">
                <div class="song-info">
                  <div class="song-name">${song.name}</div>
                  <div class="song-album">${song.album.name}</div>
                </div>
                <div class="song-duration">${formatDuration(song.duration)}</div>
                <button class="song-play-btn" data-id="${song.id}">播放</button>
              </div>
            `).join('')}
          </div>
        </div>

        ${albums.length > 0 ? `
          <div class="artist-section">
            <h2><i class="fas fa-compact-disc"></i> 专辑</h2>
            <div class="album-grid">
              ${albums.map(album => `
                <div class="album-card" data-id="${album.id}">
                  <img src="${album.picUrl}" alt="${album.name}">
                  <h3>${album.name}</h3>
                  <p>${new Date(album.publishTime).getFullYear()}</p>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${similarArtists.length > 0 ? `
          <div class="artist-section">
            <h2><i class="fas fa-users"></i> 相似歌手</h2>
            <div class="artist-grid-small">
              ${similarArtists.slice(0, 6).map(similar => `
                <div class="artist-card-small" data-id="${similar.id}">
                  <img src="${similar.picUrl}" alt="${similar.name}">
                  <h4>${similar.name}</h4>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  container.innerHTML = html;

  // 绑定播放全部事件
  container.querySelector('.play-all-btn')?.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('playAll', { detail: { songs: topSongs } }));
  });

  // 绑定播放单曲事件
  container.querySelectorAll('.song-play-btn, .song-item').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = parseInt((e.currentTarget as HTMLElement).dataset.id || '0');
      const songIndex = topSongs.findIndex(s => s.id === id);
      if (songIndex !== -1) {
        document.dispatchEvent(new CustomEvent('playSong', {
          detail: { song: topSongs[songIndex], songs: topSongs }
        }));
      }
    });
  });

  // 绑定相似歌手点击事件
  container.querySelectorAll('.artist-card-small').forEach(el => {
    el.addEventListener('click', (e) => {
      const id = parseInt((e.currentTarget as HTMLElement).dataset.id || '0');
      document.dispatchEvent(new CustomEvent('openArtist', { detail: { id } }));
    });
  });
}
