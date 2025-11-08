/**
 * 双语歌词解析和显示模块
 * 支持原文+翻译同时显示
 */

import { LyricLine } from './types.js';

/**
 * 双语歌词行接口
 */
export interface BilingualLyricLine {
    time: number;
    original: string;  // 原文
    translation?: string;  // 翻译（可选）
}

/**
 * 解析双语歌词
 * @param originalLrc 原文歌词LRC格式
 * @param translationLrc 翻译歌词LRC格式（可选）
 * @returns 双语歌词数组
 */
export function parseBilingualLyrics(
    originalLrc: string,
    translationLrc?: string
): BilingualLyricLine[] {
    try {
        // 解析原文歌词
        const originalLines = parseSingleLyric(originalLrc);
        
        // 如果没有翻译，直接返回原文
        if (!translationLrc || !translationLrc.trim()) {
            return originalLines.map(line => ({
                time: line.time,
                original: line.text,
                translation: undefined
            }));
        }
        
        // 解析翻译歌词
        const translationLines = parseSingleLyric(translationLrc);
        
        // 合并原文和翻译
        return mergeLyrics(originalLines, translationLines);
    } catch (error) {
        console.error('❌ 双语歌词解析失败:', error);
        return [{
            time: 0,
            original: '歌词加载失败',
            translation: undefined
        }];
    }
}

/**
 * 解析单语言歌词
 */
function parseSingleLyric(lrc: string): LyricLine[] {
    if (!lrc || !lrc.trim()) {
        return [{ time: 0, text: '暂无歌词' }];
    }
    
    const lines = lrc.split('\n');
    const result: LyricLine[] = [];
    
    // 支持多种时间格式
    const timeRegex = /\[(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?:\.(\d{2,3}))?\]/g;
    
    for (const line of lines) {
        try {
            let match;
            const matches: { time: number; text: string }[] = [];
            
            // 一行可能有多个时间标签
            while ((match = timeRegex.exec(line)) !== null) {
                const hours = match[1] ? parseInt(match[1]) : 0;
                const minutes = parseInt(match[2]);
                const seconds = parseInt(match[3]);
                const milliseconds = match[4] ? parseInt(match[4].padEnd(3, '0')) : 0;
                
                const time = hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
                matches.push({ time, text: '' });
            }
            
            // 提取歌词文本
            const text = line.replace(timeRegex, '').trim();
            
            // 为每个时间标签添加相同的歌词文本
            if (text && matches.length > 0) {
                matches.forEach(m => {
                    result.push({ time: m.time, text });
                });
            }
        } catch (lineError) {
            console.warn('⚠️ 解析单行歌词失败:', line);
            continue;
        }
    }
    
    // 按时间排序
    result.sort((a, b) => a.time - b.time);
    
    return result.length > 0 ? result : [{ time: 0, text: '纯音乐，请欣赏' }];
}

/**
 * 合并原文和翻译歌词
 */
function mergeLyrics(
    original: LyricLine[],
    translation: LyricLine[]
): BilingualLyricLine[] {
    const result: BilingualLyricLine[] = [];
    
    // 为每个原文歌词找到对应的翻译
    for (const origLine of original) {
        // 查找时间最接近的翻译
        const closestTranslation = findClosestTranslation(origLine.time, translation);
        
        result.push({
            time: origLine.time,
            original: origLine.text,
            translation: closestTranslation
        });
    }
    
    return result;
}

/**
 * 查找时间最接近的翻译
 */
function findClosestTranslation(time: number, translations: LyricLine[]): string | undefined {
    if (translations.length === 0) return undefined;
    
    // 优化：提高歌词匹配精度，从0.5秒缩小到0.3秒
    const tolerance = 0.3;
    
    for (const trans of translations) {
        if (Math.abs(trans.time - time) <= tolerance) {
            return trans.text;
        }
    }
    
    return undefined;
}

/**
 * 格式化双语歌词为HTML
 */
export function formatBilingualLyricHTML(line: BilingualLyricLine): string {
    if (line.translation) {
        return `
            <div class="lyric-original">${escapeHtml(line.original)}</div>
            <div class="lyric-translation">${escapeHtml(line.translation)}</div>
        `;
    }
    return `<div class="lyric-original">${escapeHtml(line.original)}</div>`;
}

/**
 * HTML转义
 */
function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 检查歌词数据中是否包含翻译
 */
export function hasTranslation(lyricsData: any): boolean {
    return !!(lyricsData && lyricsData.tlyric && lyricsData.tlyric.trim());
}

/**
 * 将双语歌词转换为单语歌词格式（向后兼容）
 */
export function bilingualToStandard(bilingualLyrics: BilingualLyricLine[]): LyricLine[] {
    return bilingualLyrics.map(line => ({
        time: line.time,
        text: line.translation 
            ? `${line.original}\n${line.translation}`
            : line.original
    }));
}