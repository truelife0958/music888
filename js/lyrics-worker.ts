/**
 * 歌词解析 Web Worker
 * 在后台线程处理歌词解析，避免阻塞主线程
 */

interface LyricLine {
    time: number;
    text: string;
}

interface ParseLyricMessage {
    type: 'parse';
    lyric: string;
    id: string;
}

interface ParseLyricResponse {
    type: 'result';
    id: string;
    lines: LyricLine[];
    error?: string;
}

/**
 * 解析LRC格式歌词
 */
function parseLRC(lyric: string): LyricLine[] {
    if (!lyric || !lyric.trim()) {
        return [];
    }

    const lines: LyricLine[] = [];
    const lyricLines = lyric.split('\n');
    
    // 正则表达式匹配时间标签 [mm:ss.xx] 或 [mm:ss]
    const timeRegex = /\[(\d{2,}):(\d{2})(?:\.(\d{2,3}))?\]/g;
    
    for (const line of lyricLines) {
        const text = line.replace(timeRegex, '').trim();
        
        // 跳过空行和元数据（如：[ti:xxx]、[ar:xxx]等）
        if (!text || /^\[(?:ti|ar|al|by|offset):/i.test(line)) {
            continue;
        }
        
        // 提取所有时间标签
        let match;
        const times: number[] = [];
        
        while ((match = timeRegex.exec(line)) !== null) {
            const minutes = parseInt(match[1], 10);
            const seconds = parseInt(match[2], 10);
            const milliseconds = match[3] ? parseInt(match[3].padEnd(3, '0'), 10) : 0;
            
            const totalTime = minutes * 60 + seconds + milliseconds / 1000;
            times.push(totalTime);
        }
        
        // 为每个时间标签创建一条歌词
        times.forEach(time => {
            lines.push({ time, text });
        });
    }
    
    // 按时间排序
    lines.sort((a, b) => a.time - b.time);
    
    return lines;
}

/**
 * 解析增强型LRC格式（支持翻译）
 */
function parseEnhancedLRC(lyric: string, translation?: string): LyricLine[] {
    const originalLines = parseLRC(lyric);
    
    if (!translation) {
        return originalLines;
    }
    
    const translationLines = parseLRC(translation);
    
    // 合并原文和翻译
    const mergedLines: LyricLine[] = [];
    
    for (const original of originalLines) {
        // 查找对应时间的翻译
        const trans = translationLines.find(t => 
            Math.abs(t.time - original.time) < 0.1 // 允许0.1秒的误差
        );
        
        if (trans && trans.text) {
            // 合并原文和翻译
            mergedLines.push({
                time: original.time,
                text: `${original.text}\n${trans.text}`
            });
        } else {
            mergedLines.push(original);
        }
    }
    
    return mergedLines;
}

/**
 * 优化歌词显示（移除多余空行、处理特殊字符等）
 */
function optimizeLyrics(lines: LyricLine[]): LyricLine[] {
    return lines
        .filter(line => line.text.trim() !== '')
        .map(line => ({
            ...line,
            text: line.text
                .replace(/\r/g, '') // 移除回车符
                .replace(/\s+/g, ' ') // 合并多余空格
                .trim()
        }));
}

/**
 * 处理消息
 */
self.addEventListener('message', (event: MessageEvent<ParseLyricMessage>) => {
    const { type, lyric, id } = event.data;
    
    if (type === 'parse') {
        try {
            const lines = parseLRC(lyric);
            const optimizedLines = optimizeLyrics(lines);
            
            const response: ParseLyricResponse = {
                type: 'result',
                id,
                lines: optimizedLines
            };
            
            self.postMessage(response);
        } catch (error) {
            const response: ParseLyricResponse = {
                type: 'result',
                id,
                lines: [],
                error: error instanceof Error ? error.message : '歌词解析失败'
            };
            
            self.postMessage(response);
        }
    }
});

// 导出类型供主线程使用
export type { LyricLine, ParseLyricMessage, ParseLyricResponse };