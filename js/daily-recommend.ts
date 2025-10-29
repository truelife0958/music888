/**
 * 每日推荐功能
 * 基于用户收藏歌曲智能推荐相似歌曲
 */

import { searchMusicAPI, Song } from './api.js';

interface RecommendSong {
    id: string;
    name: string;
    artist: string;
    album?: string;
    duration?: number;
    pic?: string;
    url?: string;
}

interface UserPreference {
    favoriteArtists: Map<string, number>; // 艺术家名称 -> 收藏次数
    favoriteGenres: string[];
    lastUpdateDate: string;
    recommendedSongs: RecommendSong[];
}

let userPreference: UserPreference = {
    favoriteArtists: new Map(),
    favoriteGenres: [],
    lastUpdateDate: '',
    recommendedSongs: []
};

let isInitialized = false;

/**
 * 初始化每日推荐功能
 */
export function initDailyRecommend(): void {
    if (isInitialized) return;
    
    loadUserPreference();
    addRecommendButton();
    checkAndUpdateRecommendations();
    
    // 监听收藏变化
    window.addEventListener('songFavorited', handleSongFavorited);
    
    isInitialized = true;
    console.log('每日推荐功能已初始化');
}

/**
 * 添加每日推荐按钮
 */
function addRecommendButton(): void {
    const settingsBtn = document.querySelector('.settings-btn');
    if (!settingsBtn || document.querySelector('.daily-recommend-btn')) return;
    
    const recommendBtn = document.createElement('button');
    recommendBtn.className = 'daily-recommend-btn';
    recommendBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="24" height="24">
            <path fill="currentColor" d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6M12,8A4,4 0 0,0 8,12A4,4 0 0,0 12,16A4,4 0 0,0 16,12A4,4 0 0,0 12,8M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10Z"/>
        </svg>
    `;
    recommendBtn.title = '每日推荐';
    recommendBtn.addEventListener('click', showRecommendModal);
    
    settingsBtn.parentElement?.insertBefore(recommendBtn, settingsBtn);
}

/**
 * 显示推荐弹窗
 */
function showRecommendModal(): void {
    const existingModal = document.querySelector('.daily-recommend-modal');
    if (existingModal) {
        existingModal.remove();
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'daily-recommend-modal';
    
    const needsUpdate = checkIfNeedsUpdate();
    const songsHtml = userPreference.recommendedSongs.length > 0 
        ? userPreference.recommendedSongs.map(song => `
            <div class="recommend-song-item" data-song='${JSON.stringify(song)}'>
                <div class="song-cover">
                    <img src="${song.pic || 'ytmusic.ico'}" alt="${song.name}">
                </div>
                <div class="song-info">
                    <div class="song-name">${song.name}</div>
                    <div class="song-artist">${song.artist}</div>
                </div>
                <button class="play-recommend-btn" title="播放">
                    <svg viewBox="0 0 24 24" width="20" height="20">
                        <path fill="currentColor" d="M8,5.14V19.14L19,12.14L8,5.14Z"/>
                    </svg>
                </button>
            </div>
        `).join('')
        : '<div class="no-recommendations">暂无推荐歌曲，请先收藏一些歌曲</div>';
    
    modal.innerHTML = `
        <div class="recommend-modal-content">
            <div class="recommend-modal-header">
                <h3>每日推荐</h3>
                <button class="close-recommend-btn">×</button>
            </div>
            <div class="recommend-info">
                ${needsUpdate ? 
                    '<p class="update-hint">检测到新的收藏，点击下方按钮获取新推荐</p>' : 
                    '<p class="last-update">最后更新：' + (userPreference.lastUpdateDate || '未更新') + '</p>'
                }
            </div>
            <div class="recommend-songs-list">
                ${songsHtml}
            </div>
            <div class="recommend-actions">
                <button class="refresh-recommend-btn">
                    <svg viewBox="0 0 24 24" width="20" height="20">
                        <path fill="currentColor" d="M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z"/>
                    </svg>
                    刷新推荐
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 绑定事件
    modal.querySelector('.close-recommend-btn')?.addEventListener('click', () => modal.remove());
    modal.querySelector('.refresh-recommend-btn')?.addEventListener('click', () => {
        refreshRecommendations();
        modal.remove();
        setTimeout(() => showRecommendModal(), 500);
    });
    
    modal.querySelectorAll('.play-recommend-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const songItem = (e.target as HTMLElement).closest('.recommend-song-item');
            if (songItem) {
                const songData = JSON.parse(songItem.getAttribute('data-song') || '{}');
                playSong(songData);
            }
        });
    });
    
    // 点击歌曲项播放
    modal.querySelectorAll('.recommend-song-item').forEach(item => {
        item.addEventListener('click', () => {
            const songData = JSON.parse(item.getAttribute('data-song') || '{}');
            playSong(songData);
        });
    });
    
    // 点击背景关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

/**
 * 播放推荐歌曲
 */
function playSong(song: RecommendSong): void {
    window.dispatchEvent(new CustomEvent('playRecommendedSong', { detail: song }));
}

/**
 * 处理歌曲收藏事件
 */
function handleSongFavorited(e: Event): void {
    const event = e as CustomEvent;
    const { name, artist } = event.detail;
    
    // 更新艺术家偏好
    const count = userPreference.favoriteArtists.get(artist) || 0;
    userPreference.favoriteArtists.set(artist, count + 1);
    
    saveUserPreference();
}

/**
 * 检查是否需要更新推荐
 */
function checkIfNeedsUpdate(): boolean {
    const today = new Date().toDateString();
    return userPreference.lastUpdateDate !== today;
}

/**
 * 检查并更新推荐
 */
function checkAndUpdateRecommendations(): void {
    if (checkIfNeedsUpdate() && userPreference.favoriteArtists.size > 0) {
        refreshRecommendations();
    }
}

/**
 * 刷新推荐列表
 */
async function refreshRecommendations(): Promise<void> {
    if (userPreference.favoriteArtists.size === 0) {
        console.log('没有收藏数据，无法生成推荐');
        return;
    }
    
    // 获取最喜欢的艺术家
    const sortedArtists = Array.from(userPreference.favoriteArtists.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([artist]) => artist);
    
    const recommendations: RecommendSong[] = [];
    
    // 为每个艺术家搜索歌曲
    for (const artist of sortedArtists) {
    try {
        const results = await searchMusicAPI(artist, 'netease');
            if (results && results.length > 0) {
                // 随机选择2-3首歌
                const count = Math.min(3, results.length);
                const shuffled = results.sort(() => Math.random() - 0.5);
                
                for (let i = 0; i < count; i++) {
                    const song = shuffled[i];
                    const artistName = Array.isArray(song.artist) ? song.artist.join(', ') : song.artist;
                    recommendations.push({
                        id: song.id || '',
                        name: song.name || '',
                        artist: artistName,
                        album: song.album || '',
                        pic: song.pic_id || ''
                    });
                }
            }
        } catch (error) {
            console.error(`搜索艺术家 ${artist} 失败:`, error);
        }
    }
    
    // 去重并限制数量
    const uniqueSongs = Array.from(new Map(
        recommendations.map(song => [song.id, song])
    ).values()).slice(0, 10);
    
    userPreference.recommendedSongs = uniqueSongs;
    userPreference.lastUpdateDate = new Date().toDateString();
    
    saveUserPreference();
    
    console.log(`已生成 ${uniqueSongs.length} 首推荐歌曲`);
}

/**
 * 加载用户偏好
 */
function loadUserPreference(): void {
    try {
        const saved = localStorage.getItem('dailyRecommendPreference');
        if (saved) {
            const data = JSON.parse(saved);
            userPreference.favoriteArtists = new Map(data.favoriteArtists || []);
            userPreference.favoriteGenres = data.favoriteGenres || [];
            userPreference.lastUpdateDate = data.lastUpdateDate || '';
            userPreference.recommendedSongs = data.recommendedSongs || [];
        }
    } catch (error) {
        console.error('加载用户偏好失败:', error);
    }
}

/**
 * 保存用户偏好
 */
function saveUserPreference(): void {
    try {
        const data = {
            favoriteArtists: Array.from(userPreference.favoriteArtists.entries()),
            favoriteGenres: userPreference.favoriteGenres,
            lastUpdateDate: userPreference.lastUpdateDate,
            recommendedSongs: userPreference.recommendedSongs
        };
        localStorage.setItem('dailyRecommendPreference', JSON.stringify(data));
    } catch (error) {
        console.error('保存用户偏好失败:', error);
    }
}

/**
 * 手动添加收藏（用于测试或外部调用）
 */
export function addFavoriteSong(name: string, artist: string): void {
    window.dispatchEvent(new CustomEvent('songFavorited', {
        detail: { name, artist }
    }));
}

/**
 * 获取当前推荐列表
 */
export function getRecommendations(): RecommendSong[] {
    return userPreference.recommendedSongs;
}