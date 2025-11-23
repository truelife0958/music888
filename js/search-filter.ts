/**
 * 老王专业打造：搜索结果智能过滤和去重模块
 * 解决搜索结果不相关和重复的憨批问题
 */

import type { Song } from './api.js';

/**
 * 计算字符串相似度（使用编辑距离算法）
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0;

  // 简单的包含匹配
  if (s1.includes(s2) || s2.includes(s1)) {
    return 0.8;
  }

  // Levenshtein距离算法
  const matrix: number[][] = [];
  const len1 = s1.length;
  const len2 = s2.length;

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (s1.charAt(i - 1) === s2.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  const maxLen = Math.max(len1, len2);
  return 1 - matrix[len1][len2] / maxLen;
}

/**
 * 老王修复：将artist字段统一转换为字符串（支持数组和字符串）
 */
function normalizeArtist(artist: any): string {
  if (!artist) return '';
  if (Array.isArray(artist)) {
    return artist.join(' ').toLowerCase().trim();
  }
  if (typeof artist === 'string') {
    return artist.toLowerCase().trim();
  }
  return String(artist).toLowerCase().trim();
}

/**
 * 计算搜索相关性分数（0-100）
 */
export function calculateRelevanceScore(song: Song, keyword: string): number {
  const searchTerm = keyword.toLowerCase().trim();
  const songName = (song.name || '').toLowerCase().trim();
  const artistName = normalizeArtist(song.artist);
  const albumName = (song.album || '').toLowerCase().trim();

  let score = 0;

  // 1. 歌曲名完全匹配 - 最高分
  if (songName === searchTerm) {
    score += 50;
  } else if (songName.includes(searchTerm)) {
    score += 40;
  } else {
    // 使用相似度算法
    const nameSimilarity = calculateSimilarity(songName, searchTerm);
    score += nameSimilarity * 30;
  }

  // 2. 歌手名匹配
  if (artistName === searchTerm) {
    score += 40;
  } else if (artistName.includes(searchTerm)) {
    score += 35;
  } else {
    // 使用相似度算法
    const artistSimilarity = calculateSimilarity(artistName, searchTerm);
    score += artistSimilarity * 25;
  }

  // 3. 专辑名匹配（权重较低）
  if (albumName.includes(searchTerm)) {
    score += 10;
  }

  // 4. 拼音/英文缩写匹配（简单实现）
  const initials = extractInitials(artistName);
  if (initials === searchTerm) {
    score += 15;
  }

  return Math.min(100, Math.round(score));
}

/**
 * 提取首字母（简单实现，支持中文拼音首字母）
 */
function extractInitials(text: string): string {
  // 这里可以扩展为完整的拼音库，目前简化处理
  return text
    .split('')
    .filter(char => /[a-zA-Z]/.test(char))
    .join('')
    .toLowerCase();
}

/**
 * 歌曲去重（基于ID、歌名+歌手的组合）
 */
export function deduplicateSongs(songs: Song[]): Song[] {
  const seen = new Set<string>();
  const uniqueSongs: Song[] = [];

  for (const song of songs) {
    // 生成唯一标识
    const songId = song.id?.toString() || '';
    const songKey = `${song.name}_${normalizeArtist(song.artist)}`.toLowerCase().trim();

    // 使用ID或歌名+歌手组合作为唯一标识
    const uniqueKey = songId || songKey;

    if (!seen.has(uniqueKey)) {
      seen.add(uniqueKey);
      uniqueSongs.push(song);
    }
  }

  return uniqueSongs;
}

/**
 * 智能过滤搜索结果
 * @param songs - 原始搜索结果
 * @param keyword - 搜索关键词
 * @param minScore - 最低相关性分数（0-100），默认30
 * @param maxResults - 最大返回结果数，默认100
 */
export function filterSearchResults(
  songs: Song[],
  keyword: string,
  minScore: number = 30,
  maxResults: number = 100
): Song[] {
  if (!songs || songs.length === 0) {
    return [];
  }

  // 1. 先去重
  const uniqueSongs = deduplicateSongs(songs);

  // 2. 计算相关性分数并过滤
  const scoredSongs = uniqueSongs
    .map(song => ({
      song,
      score: calculateRelevanceScore(song, keyword)
    }))
    .filter(item => item.score >= minScore); // 过滤掉低分结果

  // 3. 按分数降序排序
  scoredSongs.sort((a, b) => b.score - a.score);

  // 4. 返回前N个结果
  return scoredSongs.slice(0, maxResults).map(item => item.song);
}

/**
 * 智能搜索建议（用于搜索框自动补全）
 */
export function getSearchSuggestions(songs: Song[], keyword: string, limit: number = 5): string[] {
  const suggestions = new Set<string>();

  for (const song of songs) {
    if (suggestions.size >= limit) break;

    const songName = song.name?.toLowerCase() || '';
    const artistName = normalizeArtist(song.artist);
    const searchTerm = keyword.toLowerCase();

    // 添加歌手名建议
    if (artistName.includes(searchTerm) && artistName !== searchTerm) {
      suggestions.add(normalizeArtist(song.artist));
    }

    // 添加歌曲名建议
    if (songName.includes(searchTerm) && songName !== searchTerm) {
      suggestions.add(song.name || '');
    }
  }

  return Array.from(suggestions).slice(0, limit);
}

/**
 * 高级过滤选项
 */
export interface AdvancedFilterOptions {
  /** 只显示特定歌手的歌曲 */
  artistFilter?: string;
  /** 排除特定歌手 */
  excludeArtist?: string[];
  /** 只显示特定年份的歌曲 */
  yearFilter?: number;
  /** 歌曲时长范围（秒） */
  durationRange?: { min?: number; max?: number };
}

/**
 * 高级过滤功能
 */
export function advancedFilter(songs: Song[], options: AdvancedFilterOptions): Song[] {
  let filtered = [...songs];

  // 歌手过滤
  if (options.artistFilter) {
    const targetArtist = options.artistFilter.toLowerCase();
    filtered = filtered.filter(song =>
      normalizeArtist(song.artist).includes(targetArtist)
    );
  }

  // 排除特定歌手
  if (options.excludeArtist && options.excludeArtist.length > 0) {
    const excludeList = options.excludeArtist.map(a => a.toLowerCase());
    filtered = filtered.filter(song => {
      const artist = normalizeArtist(song.artist);
      return !excludeList.some(excluded => artist.includes(excluded));
    });
  }

  // 时长过滤（如果有时长信息）
  if (options.durationRange) {
    filtered = filtered.filter(song => {
      const duration = (song as any).duration || 0;
      if (options.durationRange!.min && duration < options.durationRange!.min) {
        return false;
      }
      if (options.durationRange!.max && duration > options.durationRange!.max) {
        return false;
      }
      return true;
    });
  }

  return filtered;
}
