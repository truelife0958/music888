// js/ai-recommend.ts - AI智能音乐推荐系统
// 老王开发：基于用户行为的智能推荐算法

import { searchMusicAPI, Song } from './api';
import { getPlayHistory, getFavoriteSongs } from './player';
import { showNotification } from './ui';

// 推荐配置
const AI_RECOMMEND_CONFIG = {
    MAX_RECOMMENDATIONS: 30,  // 最大推荐数量
    MIN_PLAY_COUNT: 3,        // 最少播放次数才纳入分析
    STORAGE_KEY: 'ai_recommend_cache',
    CACHE_DURATION: 2 * 60 * 60 * 1000, // 缓存2小时
};

// 艺术家统计接口
interface ArtistStats {
    name: string;
    playCount: number;
    songs: Song[];
}

// 推荐缓存接口
interface RecommendCache {
    songs: Song[];
    timestamp: number;
}

/**
 * 获取AI推荐歌曲
 * @returns 推荐歌曲列表
 */
export async function getAIRecommendations(): Promise<Song[]> {
    try {
        showNotification('AI正在分析您的音乐喜好...', 'info');

        // 检查缓存
        const cached = getCachedRecommendations();
        if (cached) {
            showNotification(`已为您推荐${cached.length}首歌曲`, 'success');
            return cached;
        }

        // 获取用户数据
        const playHistory = getPlayHistory();
        const favorites = getFavoriteSongs();

        if (playHistory.length === 0 && favorites.length === 0) {
            showNotification('播放一些歌曲后，AI才能为您推荐哦', 'warning');
            return [];
        }

        // 分析用户喜好
        const artistStats = analyzeArtistPreference(playHistory, favorites);
        const topArtists = artistStats.slice(0, 5); // 取前5个最喜欢的艺术家

        // 基于艺术家搜索推荐歌曲
        const recommendations: Song[] = [];
        for (const artist of topArtists) {
            try {
                // 从多个平台搜索该艺术家的歌曲
                const songs = await searchMusicAPI(artist.name, 'netease', 10);
                recommendations.push(...songs);
            } catch (error) {
                console.error(`搜索艺术家 ${artist.name} 失败:`, error);
            }
        }

        // 去重和过滤
        const uniqueRecommendations = removeDuplicatesAndFiltered(
            recommendations,
            playHistory,
            favorites
        );

        // 打乱顺序
        const shuffled = shuffleArray(uniqueRecommendations);
        const final = shuffled.slice(0, AI_RECOMMEND_CONFIG.MAX_RECOMMENDATIONS);

        // 缓存推荐结果
        cacheRecommendations(final);

        showNotification(`AI为您推荐了${final.length}首歌曲`, 'success');
        return final;
    } catch (error) {
        console.error('AI推荐失败:', error);
        showNotification('AI推荐失败，请稍后再试', 'error');
        return [];
    }
}

/**
 * 分析用户的艺术家偏好
 */
function analyzeArtistPreference(
    playHistory: Song[],
    favorites: Song[]
): ArtistStats[] {
    const artistMap = new Map<string, ArtistStats>();

    // 分析播放历史（权重：1）
    playHistory.forEach(song => {
        const artists = Array.isArray(song.artist) ? song.artist : [song.artist];
        artists.forEach(artist => {
            if (!artistMap.has(artist)) {
                artistMap.set(artist, {
                    name: artist,
                    playCount: 0,
                    songs: []
                });
            }
            const stats = artistMap.get(artist)!;
            stats.playCount += 1;
            stats.songs.push(song);
        });
    });

    // 分析收藏歌曲（权重：2，收藏说明更喜欢）
    favorites.forEach(song => {
        const artists = Array.isArray(song.artist) ? song.artist : [song.artist];
        artists.forEach(artist => {
            if (!artistMap.has(artist)) {
                artistMap.set(artist, {
                    name: artist,
                    playCount: 0,
                    songs: []
                });
            }
            const stats = artistMap.get(artist)!;
            stats.playCount += 2; // 收藏权重更高
            if (!stats.songs.some(s => s.id === song.id)) {
                stats.songs.push(song);
            }
        });
    });

    // 转换为数组并排序
    const artistStats = Array.from(artistMap.values());
    artistStats.sort((a, b) => b.playCount - a.playCount);

    // 过滤掉播放次数太少的艺术家
    return artistStats.filter(
        stats => stats.playCount >= AI_RECOMMEND_CONFIG.MIN_PLAY_COUNT
    );
}

/**
 * 去重和过滤已播放/收藏的歌曲
 */
function removeDuplicatesAndFiltered(
    recommendations: Song[],
    playHistory: Song[],
    favorites: Song[]
): Song[] {
    const seenIds = new Set<string>();
    const playedIds = new Set(playHistory.map(s => `${s.id}_${s.source}`));
    const favoriteIds = new Set(favorites.map(s => `${s.id}_${s.source}`));

    return recommendations.filter(song => {
        const songKey = `${song.id}_${song.source}`;

        // 去重
        if (seenIds.has(songKey)) {
            return false;
        }
        seenIds.add(songKey);

        // 过滤已播放和已收藏的歌曲
        if (playedIds.has(songKey) || favoriteIds.has(songKey)) {
            return false;
        }

        return true;
    });
}

/**
 * 打乱数组
 */
function shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

/**
 * 缓存推荐结果
 */
function cacheRecommendations(songs: Song[]): void {
    try {
        const cache: RecommendCache = {
            songs: songs,
            timestamp: Date.now()
        };
        localStorage.setItem(
            AI_RECOMMEND_CONFIG.STORAGE_KEY,
            JSON.stringify(cache)
        );
    } catch (error) {
        console.error('缓存AI推荐失败:', error);
    }
}

/**
 * 获取缓存的推荐结果
 */
function getCachedRecommendations(): Song[] | null {
    try {
        const cached = localStorage.getItem(AI_RECOMMEND_CONFIG.STORAGE_KEY);
        if (!cached) return null;

        const data: RecommendCache = JSON.parse(cached);

        // 检查是否过期
        if (Date.now() - data.timestamp > AI_RECOMMEND_CONFIG.CACHE_DURATION) {
            localStorage.removeItem(AI_RECOMMEND_CONFIG.STORAGE_KEY);
            return null;
        }

        return data.songs;
    } catch (error) {
        console.error('读取AI推荐缓存失败:', error);
        return null;
    }
}

/**
 * 清除推荐缓存
 */
export function clearAIRecommendCache(): void {
    localStorage.removeItem(AI_RECOMMEND_CONFIG.STORAGE_KEY);
    showNotification('AI推荐缓存已清除', 'success');
}
