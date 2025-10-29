// js/new-albums.ts - 新碟上架功能模块

import { Song } from './api';

interface Album {
    id: string;
    name: string;
    artist: string[];
    picUrl: string;
    publishTime: number;
    size: number;
    description?: string;
}

/**
 * 获取最新专辑列表
 * @param area 地区: ALL/ZH/EA/WE/KR/JP
 * @param limit 数量
 * @param offset 偏移量
 */
export async function getNewAlbums(
    area: 'ALL' | 'ZH' | 'EA' | 'WE' | 'KR' | 'JP' = 'ALL',
    limit: number = 30,
    offset: number = 0
): Promise<Album[]> {
    try {
        // 使用NeteaseCloudMusicApi的新碟上架接口
        const response = await fetch(
            `${getApiBase()}/album/new?area=${area}&limit=${limit}&offset=${offset}`
        );
        
        if (!response.ok) {
            throw new Error(`API返回错误: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.code !== 200 || !data.albums) {
            console.error('获取新碟失败:', data);
            return [];
        }
        
        return data.albums.map((album: any) => ({
            id: String(album.id),
            name: album.name,
            artist: album.artists?.map((a: any) => a.name) || ['未知艺术家'],
            picUrl: album.picUrl || album.blurPicUrl,
            publishTime: album.publishTime,
            size: album.size,
            description: album.description
        }));
    } catch (error) {
        console.error('获取新碟上架失败:', error);
        return [];
    }
}

/**
 * 获取全部新碟（数字专辑）
 * @param limit 数量
 * @param offset 偏移量
 */
export async function getAllNewAlbums(limit: number = 30, offset: number = 0): Promise<Album[]> {
    try {
        const response = await fetch(
            `${getApiBase()}/album/list?limit=${limit}&offset=${offset}`
        );
        
        if (!response.ok) {
            throw new Error(`API返回错误: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.code !== 200 || !data.albums) {
            return [];
        }
        
        return data.albums.map((album: any) => ({
            id: String(album.id),
            name: album.name,
            artist: album.artists?.map((a: any) => a.name) || ['未知艺术家'],
            picUrl: album.picUrl || album.blurPicUrl,
            publishTime: album.publishTime,
            size: album.size,
            description: album.description
        }));
    } catch (error) {
        console.error('获取全部新碟失败:', error);
        return [];
    }
}

/**
 * 获取专辑详情和歌曲列表
 * @param albumId 专辑ID
 */
export async function getAlbumDetail(albumId: string): Promise<{ album: Album; songs: Song[] } | null> {
    try {
        const response = await fetch(`${getApiBase()}/album?id=${albumId}`);
        
        if (!response.ok) {
            throw new Error(`API返回错误: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.code !== 200 || !data.album) {
            return null;
        }
        
        const album: Album = {
            id: String(data.album.id),
            name: data.album.name,
            artist: data.album.artists?.map((a: any) => a.name) || ['未知艺术家'],
            picUrl: data.album.picUrl || data.album.blurPicUrl,
            publishTime: data.album.publishTime,
            size: data.album.size,
            description: data.album.description
        };
        
        const songs: Song[] = data.songs?.map((song: any) => ({
            id: String(song.id),
            name: song.name,
            artist: song.ar?.map((a: any) => a.name) || ['未知艺术家'],
            album: song.al?.name || '未知专辑',
            pic_id: String(song.al?.pic || song.al?.picUrl || ''),
            lyric_id: String(song.id),
            source: 'netease'
        })) || [];
        
        return { album, songs };
    } catch (error) {
        console.error('获取专辑详情失败:', error);
        return null;
    }
}

/**
 * 获取API基础地址
 */
function getApiBase(): string {
    // 优先使用环境变量或配置
    if (typeof window !== 'undefined' && (window as any).API_BASE) {
        return (window as any).API_BASE;
    }
    
    // 生产环境使用Vercel函数
    if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        return '/api/ncm-proxy';
    }
    
    // 本地开发环境
    return 'http://localhost:3000';
}

/**
 * 渲染新碟上架列表到页面
 * @param containerId 容器ID
 * @param area 地区筛选
 */
export async function renderNewAlbums(
    containerId: string,
    area: 'ALL' | 'ZH' | 'EA' | 'WE' | 'KR' | 'JP' = 'ALL'
): Promise<void> {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`容器 #${containerId} 不存在`);
        return;
    }
    
    // 显示加载状态
    container.innerHTML = '<div class="loading">加载中...</div>';
    
    try {
        const albums = await getNewAlbums(area, 30, 0);
        
        if (albums.length === 0) {
            container.innerHTML = '<div class="empty">暂无新碟</div>';
            return;
        }
        
        // 创建专辑网格
        const albumGrid = document.createElement('div');
        albumGrid.className = 'album-grid';
        
        albums.forEach(album => {
            const albumCard = createAlbumCard(album);
            albumGrid.appendChild(albumCard);
        });
        
        container.innerHTML = '';
        container.appendChild(albumGrid);
        
    } catch (error) {
        console.error('渲染新碟列表失败:', error);
        container.innerHTML = '<div class="error">加载失败，请重试</div>';
    }
}

/**
 * 创建专辑卡片元素
 */
function createAlbumCard(album: Album): HTMLElement {
    const card = document.createElement('div');
    card.className = 'album-card';
    card.dataset.albumId = album.id;
    
    // 格式化发布时间
    const publishDate = new Date(album.publishTime);
    const dateStr = publishDate.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    
    card.innerHTML = `
        <div class="album-cover">
            <img src="${album.picUrl}?param=200y200" alt="${album.name}" loading="lazy">
            <div class="album-overlay">
                <button class="play-btn" title="播放专辑">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                </button>
            </div>
        </div>
        <div class="album-info">
            <div class="album-name" title="${album.name}">${album.name}</div>
            <div class="album-artist" title="${album.artist.join(', ')}">${album.artist.join(', ')}</div>
            <div class="album-meta">
                <span class="publish-time">${dateStr}</span>
                <span class="song-count">${album.size}首</span>
            </div>
        </div>
    `;
    
    // 点击专辑卡片播放
    const playBtn = card.querySelector('.play-btn');
    playBtn?.addEventListener('click', async (e) => {
        e.stopPropagation();
        await playAlbum(album.id);
    });
    
    // 点击卡片查看详情
    card.addEventListener('click', () => {
        showAlbumDetail(album.id);
    });
    
    return card;
}

/**
 * 播放专辑
 */
async function playAlbum(albumId: string): Promise<void> {
    try {
        const result = await getAlbumDetail(albumId);
        if (!result || result.songs.length === 0) {
            console.error('专辑无歌曲');
            return;
        }
        
        // 触发自定义事件，让播放器接管
        const event = new CustomEvent('playAlbum', {
            detail: {
                album: result.album,
                songs: result.songs
            }
        });
        document.dispatchEvent(event);
        
        console.log(`开始播放专辑: ${result.album.name}`);
    } catch (error) {
        console.error('播放专辑失败:', error);
    }
}

/**
 * 显示专辑详情
 */
function showAlbumDetail(albumId: string): void {
    // 触发自定义事件
    const event = new CustomEvent('showAlbumDetail', {
        detail: { albumId }
    });
    document.dispatchEvent(event);
}

/**
 * 添加地区筛选器
 */
export function createAreaFilter(containerId: string, onChange: (area: string) => void): void {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const areas = [
        { value: 'ALL', label: '全部' },
        { value: 'ZH', label: '华语' },
        { value: 'EA', label: '欧美' },
        { value: 'KR', label: '韩国' },
        { value: 'JP', label: '日本' }
    ];
    
    const filter = document.createElement('div');
    filter.className = 'area-filter';
    
    areas.forEach((area, index) => {
        const btn = document.createElement('button');
        btn.className = index === 0 ? 'active' : '';
        btn.textContent = area.label;
        btn.dataset.area = area.value;
        
        btn.addEventListener('click', () => {
            // 移除其他按钮的active类
            filter.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            onChange(area.value);
        });
        
        filter.appendChild(btn);
    });
    
    container.appendChild(filter);
}

// 导出类型
export type { Album };