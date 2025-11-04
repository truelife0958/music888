/**
 * 智能推荐模块
 * 基于播放历史和统计数据提供个性化音乐推荐
 */

import type { Song } from './api';
import { getStats } from './play-stats.js';

// 播放记录接口（匹配play-stats.ts）
interface PlayRecord {
    songId: string;
    songName: string;
    artist: string;
    playCount: number;
    totalDuration: number;
    lastPlayTime: number;
}

interface PlayStats {
    totalPlays: number;
    totalDuration: number;
    songs: { [key: string]: PlayRecord };
    firstPlayDate: number;
}

/**
 * 推荐算法配置
 */
const RECOMMEND_CONFIG = {
    MAX_RECOMMENDATIONS: 30,
    MIN_PLAY_COUNT: 2, // 最少播放次数才纳入分析
    ARTIST_WEIGHT: 0.4, // 艺术家权重
    GENRE_WEIGHT: 0.3, // 风格权重（暂未实现）
    RECENT_WEIGHT: 0.3, // 最近播放权重
};

/**
 * 推荐歌曲接口
 */
export interface RecommendedSong extends Song {
    score: number; // 推荐分数
    reason: string; // 推荐理由
}

/**
 * 用户偏好分析结果
 */
interface UserPreferences {
    favoriteArtists: Map<string, number>; // 艺术家 -> 播放次数
    recentArtists: Set<string>; // 最近播放的艺术家
    avgPlayCount: number; // 平均播放次数
}

/**
 * 获取智能推荐歌曲列表
 * @param allAvailableSongs 所有可用歌曲（搜索结果、排行榜等）
 * @param maxCount 最大推荐数量
 * @returns 推荐歌曲列表
 */
export function getSmartRecommendations(
    allAvailableSongs: Song[],
    maxCount: number = RECOMMEND_CONFIG.MAX_RECOMMENDATIONS
): RecommendedSong[] {
    try {
        // 获取播放统计数据
        const playStats = getStats();
        
        // 如果没有播放历史，返回空
        if (!playStats || playStats.totalPlays === 0) {
            console.log('📊 没有播放历史，无法生成推荐');
            return [];
        }
        
        // 获取用户的top歌曲（从统计数据中提取）
        const topSongs = Object.values(playStats.songs)
            .sort((a, b) => b.playCount - a.playCount)
            .slice(0, 20); // 取前20首作为分析基础
        
        if (topSongs.length === 0) {
            console.log('📊 没有足够的播放记录，无法生成推荐');
            return [];
        }
        
        // 分析用户偏好
        const userPreferences = analyzeUserPreferences(topSongs);
        
        // 创建已播放歌曲的映射（用于快速查找）
        const playedSongsMap = new Map<string, PlayRecord>();
        Object.values(playStats.songs).forEach(record => {
            playedSongsMap.set(record.songId, record);
        });
        
        // 对候选歌曲打分
        const scoredSongs = allAvailableSongs
            .map(song => ({
                ...song,
                score: calculateRecommendScore(song, userPreferences, playedSongsMap),
                reason: generateRecommendReason(song, userPreferences)
            }))
            .filter(song => song.score > 0); // 只保留有分数的歌曲
        
        // 按分数排序
        scoredSongs.sort((a, b) => b.score - a.score);
        
        // 返回前N首
        const result = scoredSongs.slice(0, maxCount);
        console.log(`✅ 生成了 ${result.length} 首推荐歌曲`);
        return result;
    } catch (error) {
        console.error('❌ 智能推荐生成失败:', error);
        return [];
    }
}

/**
 * 分析用户偏好
 */
function analyzeUserPreferences(topSongs: PlayRecord[]): UserPreferences {
    const favoriteArtists = new Map<string, number>();
    const recentArtists = new Set<string>();
    let totalPlayCount = 0;
    
    topSongs.forEach((record, index) => {
        const playCount = record.playCount;
        
        // 统计艺术家播放次数
        const artists = record.artist.split(',').map(a => a.trim());
        artists.forEach((artist: string) => {
            if (artist && artist !== '未知艺术家') {
                favoriteArtists.set(
                    artist,
                    (favoriteArtists.get(artist) || 0) + playCount
                );
                
                // 最近10首的艺术家
                if (index < 10) {
                    recentArtists.add(artist);
                }
            }
        });
        
        totalPlayCount += playCount;
    });
    
    return {
        favoriteArtists,
        recentArtists,
        avgPlayCount: topSongs.length > 0 ? totalPlayCount / topSongs.length : 0
    };
}

/**
 * 计算推荐分数
 */
function calculateRecommendScore(
    song: Song,
    preferences: UserPreferences,
    playedSongsMap: Map<string, PlayRecord>
): number {
    let score = 0;
    
    // 检查是否已经在播放历史中（避免推荐已听过的）
    const existingStat = playedSongsMap.get(song.id);
    
    // 如果播放次数过多，降低推荐分数
    if (existingStat && existingStat.playCount > 5) {
        return 0; // 不推荐已经听了很多次的歌
    }
    
    // 艺术家匹配分数
    const artists = Array.isArray(song.artist) ? song.artist : [song.artist];
    artists.forEach((artist: string | { name: string }) => {
        const artistName = typeof artist === 'string' ? artist : artist?.name;
        if (artistName && artistName !== '未知艺术家') {
            // 喜欢的艺术家
            if (preferences.favoriteArtists.has(artistName)) {
                const artistScore = preferences.favoriteArtists.get(artistName) || 0;
                score += artistScore * RECOMMEND_CONFIG.ARTIST_WEIGHT;
            }
            
            // 最近播放的艺术家
            if (preferences.recentArtists.has(artistName)) {
                score += preferences.avgPlayCount * RECOMMEND_CONFIG.RECENT_WEIGHT;
            }
        }
    });
    
    // 轻微随机化，增加多样性
    score *= (0.9 + Math.random() * 0.2);
    
    return Math.round(score * 100) / 100;
}

/**
 * 生成推荐理由
 */
function generateRecommendReason(
    song: Song,
    preferences: UserPreferences
): string {
    const artists = Array.isArray(song.artist) ? song.artist : [song.artist];
    const reasons: string[] = [];
    
    artists.forEach((artist: string | { name: string }) => {
        const artistName = typeof artist === 'string' ? artist : artist?.name;
        if (artistName && artistName !== '未知艺术家') {
            if (preferences.favoriteArtists.has(artistName)) {
                const playCount = preferences.favoriteArtists.get(artistName) || 0;
                if (playCount >= 5) {
                    reasons.push(`你经常听${artistName}的歌`);
                } else {
                    reasons.push(`你听过${artistName}`);
                }
            }
            
            if (preferences.recentArtists.has(artistName)) {
                reasons.push(`最近在听${artistName}`);
            }
        }
    });
    
    return reasons.length > 0 ? reasons[0] : '为你推荐';
}

/**
 * 从多个来源获取候选歌曲
 * @param api API实例
 * @returns 候选歌曲列表
 */
export async function fetchCandidateSongs(api: any): Promise<Song[]> {
    const candidates: Song[] = [];
    
    try {
        // 可以从多个来源获取候选：
        // 1. 热门歌曲
        // 2. 排行榜
        // 3. 相似艺术家
        
        // 这里需要根据实际API实现
        // 示例：从网易云获取热门歌曲
        const hotSongs = await api.searchMusicAPI('热门', 'netease');
        if (hotSongs && hotSongs.length > 0) {
            candidates.push(...hotSongs.slice(0, 50));
        }
    } catch (error) {
        console.error('❌ 获取候选歌曲失败:', error);
    }
    
    return candidates;
}

/**
 * 基于艺术家推荐相似歌曲
 * @param targetArtist 目标艺术家
 * @param allSongs 所有可用歌曲
 * @param limit 返回数量限制
 * @returns 相似歌曲列表
 */
export function recommendSimilarByArtist(
    targetArtist: string,
    allSongs: Song[],
    limit: number = 10
): Song[] {
    return allSongs
        .filter(song => {
            const artists = Array.isArray(song.artist) ? song.artist : [song.artist];
            return artists.some((artist: string | { name: string }) => {
                const artistName = typeof artist === 'string' ? artist : artist?.name;
                return artistName === targetArtist;
            });
        })
        .slice(0, limit);
}

/**
 * 获取推荐摘要统计
 * @param recommendations 推荐歌曲列表
 * @returns 统计信息
 */
export function getRecommendationSummary(recommendations: RecommendedSong[]): {
    totalSongs: number;
    topArtists: string[];
    avgScore: number;
} {
    const artistCount = new Map<string, number>();
    let totalScore = 0;
    
    recommendations.forEach(song => {
        totalScore += song.score;
        
        const artists = Array.isArray(song.artist) ? song.artist : [song.artist];
        artists.forEach((artist: string | { name: string }) => {
            const artistName = typeof artist === 'string' ? artist : artist?.name;
            if (artistName && artistName !== '未知艺术家') {
                artistCount.set(artistName, (artistCount.get(artistName) || 0) + 1);
            }
        });
    });
    
    // 获取出现最多的艺术家
    const topArtists = Array.from(artistCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([artist]) => artist);
    
    return {
        totalSongs: recommendations.length,
        topArtists,
        avgScore: recommendations.length > 0 ? totalScore / recommendations.length : 0
    };
}