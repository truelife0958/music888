/**
 * 智能歌曲匹配模块
 *
 * 老王实现：跨平台歌曲匹配算法
 * - 标题相似度计算
 * - 歌手匹配
 * - 时长匹配
 * - 综合评分排序
 */

import type { Song } from './api';

/**
 * 计算字符串相似度 (Levenshtein距离优化版)
 */
function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;

  // 预处理：统一小写、去除特殊字符
  const s1 = normalizeString(str1);
  const s2 = normalizeString(str2);

  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  // 包含关系检查
  if (s1.includes(s2) || s2.includes(s1)) {
    return 0.9;
  }

  // Levenshtein距离计算
  const len1 = s1.length;
  const len2 = s2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // 删除
        matrix[i][j - 1] + 1,      // 插入
        matrix[i - 1][j - 1] + cost // 替换
      );
    }
  }

  const maxLen = Math.max(len1, len2);
  return 1 - matrix[len1][len2] / maxLen;
}

/**
 * 字符串预处理：统一格式
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[\s\-_\(\)（）【】\[\]「」『』\u0000-\u001F]/g, '') // 去除空格、括号等
    .replace(/[,，、/／&＆·・]/g, '') // 去除分隔符
    .replace(/[''""`]/g, '') // 去除引号
    .trim();
}

/**
 * 歌曲名称预处理：去除常见后缀
 */
function normalizeSongTitle(title: string): string {
  return title
    .replace(/\s*[\(（\[【].*?[\)）\]】]\s*/g, '') // 去除括号内容(如: 歌名(Live版))
    .replace(/\s*-\s*.*?(remix|live|cover|版|version|ver\.|instrumental|伴奏|纯音乐|dj版)/gi, '')
    .replace(/\s*(remix|live|cover|版|version|ver\.|instrumental|伴奏|纯音乐|dj版).*$/gi, '')
    .trim();
}

/**
 * 计算歌手匹配分数
 */
function calculateArtistScore(artist1: string[], artist2: string[]): number {
  if (!artist1?.length || !artist2?.length) return 0;

  const normalized1 = artist1.map(a => normalizeString(a));
  const normalized2 = artist2.map(a => normalizeString(a));

  let matchCount = 0;
  let totalScore = 0;

  for (const a1 of normalized1) {
    for (const a2 of normalized2) {
      const similarity = calculateSimilarity(a1, a2);
      if (similarity > 0.7) {
        matchCount++;
        totalScore += similarity;
      }
    }
  }

  if (matchCount === 0) return 0;
  return totalScore / Math.max(normalized1.length, normalized2.length);
}

/**
 * 计算时长匹配分数（可选）
 */
function calculateDurationScore(duration1?: number, duration2?: number): number {
  if (!duration1 || !duration2) return 0.5; // 无时长信息时给中等分

  const diff = Math.abs(duration1 - duration2);
  if (diff <= 3) return 1;       // 3秒以内完美匹配
  if (diff <= 10) return 0.9;    // 10秒以内高匹配
  if (diff <= 30) return 0.7;    // 30秒以内中等匹配
  if (diff <= 60) return 0.5;    // 1分钟以内低匹配
  return 0.3;                     // 差异过大
}

/**
 * 匹配结果接口
 */
export interface MatchResult {
  song: Song;
  score: number;
  titleScore: number;
  artistScore: number;
  durationScore: number;
}

/**
 * 在搜索结果中找到最佳匹配的歌曲
 */
export function findBestMatch(
  targetSong: Song,
  candidates: Song[],
  options: {
    minScore?: number;      // 最低匹配分数阈值
    titleWeight?: number;   // 标题权重
    artistWeight?: number;  // 歌手权重
    durationWeight?: number; // 时长权重
  } = {}
): MatchResult | null {
  const {
    minScore = 0.5,
    titleWeight = 0.5,
    artistWeight = 0.4,
    durationWeight = 0.1,
  } = options;

  if (!candidates || candidates.length === 0) return null;

  const targetTitle = normalizeSongTitle(targetSong.name);
  const targetArtist = Array.isArray(targetSong.artist) ? targetSong.artist : [targetSong.artist];
  const targetDuration = targetSong.duration || 0;

  const results: MatchResult[] = candidates.map(candidate => {
    const candidateTitle = normalizeSongTitle(candidate.name);
    const candidateArtist = Array.isArray(candidate.artist) ? candidate.artist : [candidate.artist];
    const candidateDuration = candidate.duration || 0;

    // 计算各项分数
    const titleScore = calculateSimilarity(targetTitle, candidateTitle);
    const artistScore = calculateArtistScore(targetArtist, candidateArtist);
    const durationScore = calculateDurationScore(targetDuration, candidateDuration);

    // 加权综合分数
    const score =
      titleScore * titleWeight +
      artistScore * artistWeight +
      durationScore * durationWeight;

    return {
      song: candidate,
      score,
      titleScore,
      artistScore,
      durationScore,
    };
  });

  // 按分数排序
  results.sort((a, b) => b.score - a.score);

  // 返回最佳匹配（如果达到阈值）
  const best = results[0];
  if (best && best.score >= minScore) {
    console.log(`🎯 [智能匹配] 找到匹配: ${best.song.name} (分数: ${best.score.toFixed(2)})`);
    console.log(`   - 标题: ${best.titleScore.toFixed(2)}, 歌手: ${best.artistScore.toFixed(2)}, 时长: ${best.durationScore.toFixed(2)}`);
    return best;
  }

  console.log(`⚠️ [智能匹配] 未找到满足阈值(${minScore})的匹配`);
  return null;
}

/**
 * 批量匹配：在多个平台的搜索结果中找到最佳匹配
 */
export function findBestMatchFromMultipleSources(
  targetSong: Song,
  sourceResults: Map<string, Song[]>,
  options?: Parameters<typeof findBestMatch>[2]
): { source: string; match: MatchResult } | null {
  let bestResult: { source: string; match: MatchResult } | null = null;

  for (const [source, candidates] of sourceResults) {
    const match = findBestMatch(targetSong, candidates, options);
    if (match && (!bestResult || match.score > bestResult.match.score)) {
      bestResult = { source, match };
    }
  }

  if (bestResult) {
    console.log(`🎉 [智能匹配] 最佳来源: ${bestResult.source}, 分数: ${bestResult.match.score.toFixed(2)}`);
  }

  return bestResult;
}

/**
 * Provider成功率追踪
 */
class ProviderSuccessTracker {
  private successCount: Map<string, number> = new Map();
  private failCount: Map<string, number> = new Map();
  private storageKey = 'providerSuccessStats';

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        const parsed = JSON.parse(data);
        this.successCount = new Map(Object.entries(parsed.success || {}));
        this.failCount = new Map(Object.entries(parsed.fail || {}));
      }
    } catch (e) {
      // 忽略存储读取错误
    }
  }

  private saveToStorage() {
    try {
      const data = {
        success: Object.fromEntries(this.successCount),
        fail: Object.fromEntries(this.failCount),
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (e) {
      // 忽略存储写入错误
    }
  }

  recordSuccess(providerId: string) {
    const count = this.successCount.get(providerId) || 0;
    this.successCount.set(providerId, count + 1);
    this.saveToStorage();
  }

  recordFail(providerId: string) {
    const count = this.failCount.get(providerId) || 0;
    this.failCount.set(providerId, count + 1);
    this.saveToStorage();
  }

  getSuccessRate(providerId: string): number {
    const success = this.successCount.get(providerId) || 0;
    const fail = this.failCount.get(providerId) || 0;
    const total = success + fail;
    if (total === 0) return 0.5; // 默认50%成功率
    return success / total;
  }

  /**
   * 根据成功率排序Provider列表
   */
  sortBySuccessRate(providerIds: string[]): string[] {
    return [...providerIds].sort((a, b) => {
      return this.getSuccessRate(b) - this.getSuccessRate(a);
    });
  }
}

export const providerSuccessTracker = new ProviderSuccessTracker();
