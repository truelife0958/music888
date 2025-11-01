/**
 * 为我推荐模块
 * 提供个性化推荐、每日推荐、私人FM等功能
 */

// API基础地址
function getApiBase(): string {
  // 开发环境使用 Vite 代理，避免硬编码端口
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return '/api/music-proxy';
  }
  return 'https://music888-4swa.vercel.app';
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
  reason?: string;
}

// 推荐歌单接口
export interface RecommendResource {
  id: number;
  name: string;
  picUrl: string;
  playcount: number;
  trackCount: number;
  copywriter?: string;
}

// MV接口
export interface MV {
  id: number;
  name: string;
  picUrl: string;
  playCount: number;
  artistName: string;
  duration: number;
  copywriter?: string;
}

/**
 * 获取每日推荐歌曲（需要登录）
 */
export async function getDailyRecommendSongs(): Promise<Song[]> {
  try {
    const response = await fetch(`${getApiBase()}/recommend/songs`, {
      credentials: 'include'
    });
    const data = await response.json();
    
    if (data.code === 200 && data.data?.dailySongs) {
      return data.data.dailySongs.map((item: any) => ({
        id: item.id,
        name: item.name,
        artists: item.ar || [],
        album: item.al || { id: 0, name: '', picUrl: '' },
        duration: item.dt || 0,
        reason: item.reason || ''
      }));
    }
    return [];
  } catch (error) {
    console.error('获取每日推荐歌曲失败:', error);
    return [];
  }
}

/**
 * 获取推荐歌单（需要登录）
 */
export async function getRecommendResource(): Promise<RecommendResource[]> {
  try {
    const response = await fetch(`${getApiBase()}/recommend/resource`, {
      credentials: 'include'
    });
    const data = await response.json();
    
    if (data.code === 200 && data.recommend) {
      return data.recommend.map((item: any) => ({
        id: item.id,
        name: item.name,
        picUrl: item.picUrl,
        playcount: item.playcount || 0,
        trackCount: item.trackCount || 0,
        copywriter: item.copywriter
      }));
    }
    return [];
  } catch (error) {
    console.error('获取推荐歌单失败:', error);
    return [];
  }
}

/**
 * 获取推荐新音乐（不需要登录）
 */
export async function getPersonalizedNewSong(): Promise<Song[]> {
  try {
    const response = await fetch(`${getApiBase()}/personalized/newsong`);
    const data = await response.json();
    
    if (data.code === 200 && data.result) {
      return data.result.map((item: any) => ({
        id: item.id,
        name: item.name,
        artists: item.song?.artists || [],
        album: item.song?.album || { id: 0, name: '', picUrl: '' },
        duration: item.song?.duration || 0,
        reason: item.picUrl
      }));
    }
    return [];
  } catch (error) {
    console.error('获取推荐新音乐失败:', error);
    return [];
  }
}

/**
 * 获取推荐MV
 */
export async function getPersonalizedMV(): Promise<MV[]> {
  try {
    const response = await fetch(`${getApiBase()}/personalized/mv`);
    const data = await response.json();
    
    if (data.code === 200 && data.result) {
      return data.result.map((item: any) => ({
        id: item.id,
        name: item.name,
        picUrl: item.picUrl,
        playCount: item.playCount || 0,
        artistName: item.artistName || '',
        duration: item.duration || 0,
        copywriter: item.copywriter
      }));
    }
    return [];
  } catch (error) {
    console.error('获取推荐MV失败:', error);
    return [];
  }
}

/**
 * 获取私人FM（需要登录）
 */
export async function getPersonalFM(): Promise<Song[]> {
  try {
    const response = await fetch(`${getApiBase()}/personal_fm`, {
      credentials: 'include'
    });
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
    console.error('获取私人FM失败:', error);
    return [];
  }
}

/**
 * 获取独家放送（不需要登录）
 */
export async function getPersonalizedPrivateContent(): Promise<any[]> {
  try {
    const response = await fetch(`${getApiBase()}/personalized/privatecontent`);
    const data = await response.json();
    
    if (data.code === 200 && data.result) {
      return data.result;
    }
    return [];
  } catch (error) {
    console.error('获取独家放送失败:', error);
    return [];
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
 * 格式化时长
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * 渲染每日推荐歌曲
 */
export async function renderDailyRecommend(containerId: string): Promise<void> {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = '<div class="loading">加载中...</div>';
  
  const songs = await getDailyRecommendSongs();
  
  if (songs.length === 0) {
    container.innerHTML = '<div class="empty">请先登录查看每日推荐</div>';
    return;
  }
  
  const html = `
    <div class="daily-recommend">
      <div class="daily-header">
        <h2>每日歌曲推荐</h2>
        <p class="daily-date">${new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}</p>
        <button class="play-all-btn">播放全部</button>
      </div>
      <div class="song-list">
        ${songs.map((song, index) => `
          <div class="song-item" data-id="${song.id}">
            <div class="song-index">${(index + 1).toString().padStart(2, '0')}</div>
            <img src="${song.album.picUrl}" alt="${song.name}" class="song-cover">
            <div class="song-info">
              <div class="song-name">${song.name}</div>
              <div class="song-artist">${song.artists.map(a => a.name).join(' / ')}</div>
              ${song.reason ? `<div class="song-reason">${song.reason}</div>` : ''}
            </div>
            <div class="song-album">${song.album.name}</div>
            <div class="song-duration">${formatDuration(song.duration)}</div>
            <button class="song-play-btn" data-id="${song.id}">▶</button>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  
  container.innerHTML = html;
  
  // 播放全部
  container.querySelector('.play-all-btn')?.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('playAll', { detail: { songs } }));
  });
  
  // 播放单曲
  container.querySelectorAll('.song-play-btn, .song-item').forEach(el => {
    el.addEventListener('click', (e) => {
      const id = parseInt((e.currentTarget as HTMLElement).dataset.id || '0');
      const song = songs.find(s => s.id === id);
      if (song) {
        document.dispatchEvent(new CustomEvent('playSong', { detail: { song } }));
      }
    });
  });
}

/**
 * 渲染推荐歌单
 */
export async function renderRecommendPlaylists(containerId: string): Promise<void> {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = '<div class="loading">加载中...</div>';
  
  const playlists = await getRecommendResource();
  
  if (playlists.length === 0) {
    container.innerHTML = '<div class="empty">请先登录查看推荐歌单</div>';
    return;
  }
  
  const html = `
    <div class="recommend-playlists">
      <h2>推荐歌单</h2>
      <div class="playlist-grid">
        ${playlists.map(playlist => `
          <div class="playlist-card" data-id="${playlist.id}">
            <div class="playlist-cover">
              <img src="${playlist.picUrl}" alt="${playlist.name}" loading="lazy">
              <div class="playlist-overlay">
                <div class="play-count">▶ ${formatPlayCount(playlist.playcount)}</div>
                <button class="play-btn" data-id="${playlist.id}">播放</button>
              </div>
            </div>
            <div class="playlist-info">
              <h3 class="playlist-name" title="${playlist.name}">${playlist.name}</h3>
              ${playlist.copywriter ? `<p class="playlist-copy">${playlist.copywriter}</p>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  
  container.innerHTML = html;
  
  // 绑定事件
  container.querySelectorAll('.play-btn, .playlist-card').forEach(el => {
    el.addEventListener('click', async (e) => {
      const id = parseInt((e.currentTarget as HTMLElement).dataset.id || '0');
      document.dispatchEvent(new CustomEvent('openPlaylist', { detail: { id } }));
    });
  });
}

/**
 * 渲染推荐新音乐
 */
export async function renderNewMusic(containerId: string): Promise<void> {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = '<div class="loading">加载中...</div>';
  
  const songs = await getPersonalizedNewSong();
  
  if (songs.length === 0) {
    container.innerHTML = '<div class="empty">暂无推荐</div>';
    return;
  }
  
  const html = `
    <div class="new-music">
      <h2>推荐新音乐</h2>
      <div class="music-grid">
        ${songs.slice(0, 12).map(song => `
          <div class="music-card" data-id="${song.id}">
            <div class="music-cover">
              <img src="${song.album.picUrl}" alt="${song.name}" loading="lazy">
              <div class="music-overlay">
                <button class="play-btn" data-id="${song.id}">▶</button>
              </div>
            </div>
            <div class="music-info">
              <h3 class="music-name" title="${song.name}">${song.name}</h3>
              <p class="music-artist">${song.artists.map(a => a.name).join('/')}</p>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  
  container.innerHTML = html;
  
  // 绑定事件
  container.querySelectorAll('.play-btn, .music-card').forEach(el => {
    el.addEventListener('click', (e) => {
      const id = parseInt((e.currentTarget as HTMLElement).dataset.id || '0');
      const song = songs.find(s => s.id === id);
      if (song) {
        document.dispatchEvent(new CustomEvent('playSong', { detail: { song } }));
      }
    });
  });
}

/**
 * 渲染推荐MV
 */
export async function renderRecommendMV(containerId: string): Promise<void> {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = '<div class="loading">加载中...</div>';
  
  const mvs = await getPersonalizedMV();
  
  if (mvs.length === 0) {
    container.innerHTML = '<div class="empty">暂无推荐MV</div>';
    return;
  }
  
  const html = `
    <div class="recommend-mv">
      <h2>推荐MV</h2>
      <div class="mv-grid">
        ${mvs.map(mv => `
          <div class="mv-card" data-id="${mv.id}">
            <div class="mv-cover">
              <img src="${mv.picUrl}" alt="${mv.name}" loading="lazy">
              <div class="mv-overlay">
                <div class="play-count">▶ ${formatPlayCount(mv.playCount)}</div>
                <button class="play-btn" data-id="${mv.id}">播放</button>
              </div>
            </div>
            <div class="mv-info">
              <h3 class="mv-name" title="${mv.name}">${mv.name}</h3>
              <p class="mv-artist">${mv.artistName}</p>
              ${mv.copywriter ? `<p class="mv-copy">${mv.copywriter}</p>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  
  container.innerHTML = html;
  
  // 绑定事件
  container.querySelectorAll('.play-btn, .mv-card').forEach(el => {
    el.addEventListener('click', (e) => {
      const id = parseInt((e.currentTarget as HTMLElement).dataset.id || '0');
      document.dispatchEvent(new CustomEvent('playMV', { detail: { id } }));
    });
  });
}