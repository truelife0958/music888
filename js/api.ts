// js/api.ts

// Define a type for the song objects for better type safety
export interface Song {
    id: string;
    name: string;
    artist: string[];
    album: string;
    pic_id: string;
    lyric_id: string;
    source: string;
}

// Define a type for the API source configuration
interface ApiSource {
    name: string;
    url: string;
    type?: string; // API类型标识，用于特殊处理
}

/**
 * 解析API响应，处理多种可能的响应格式
 * @param data API响应数据
 * @returns 歌曲数组
 * @throws {Error} 如果无法解析响应格式
 */
function parseApiResponse(data: any): any[] {
    let songs: any[] = [];

    if (Array.isArray(data)) {
                songs = data;
    } else if (data && typeof data === 'object') {
        // 尝试多种可能的字段名
        if (Array.isArray(data.data)) {
                        songs = data.data;
        } else if (Array.isArray(data.songs)) {
                        songs = data.songs;
        } else if (Array.isArray(data.result)) {
                        songs = data.result;
        } else if (Array.isArray(data.list)) {
                        songs = data.list;
        } else {
                        throw new Error(`API 返回数据格式不正确，可用字段: ${Object.keys(data).join(', ')}`);
        }
    } else {
                throw new Error('API 返回数据格式不正确');
    }

    return songs;
}

// 1. Multiple API sources for improved reliability
const API_SOURCES: ApiSource[] = [
    {
        name: 'Vite Meting 代理 API',
        url: '/api/meting',
        type: 'meting'
    },
    {
        name: '主 API',
        url: 'https://music-api.gdstudio.xyz/api.php'
    }
    // 注意：本地开发使用Vite代理避免CORS问题
    // /api/meting 用于搜索和播放功能 (Meting API格式)
    // /api/music-proxy 用于发现音乐功能 (网易云API格式)
];

let API_BASE = API_SOURCES[0].url;
let currentApiIndex = 0;
let apiFailureCount = 0;
const API_FAILURE_THRESHOLD = 3; // 连续失败3次后切换API
let totalApiSwitchCount = 0; // 总切换次数
const MAX_API_SWITCH_COUNT = 10; // 最大切换次数，防止无限循环

async function testAPI(apiUrl: string): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        // Adapt test URL based on API provider
        const testUrl = apiUrl.includes('meting')
            ? `${apiUrl}?server=netease&type=search&name=test&count=1`
            : `${apiUrl}?types=search&source=netease&name=test&count=1`;
        
        const response = await fetch(testUrl, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response.ok;
    } catch (error) {
        return false;
    }
}

export async function findWorkingAPI(): Promise<{ success: boolean; name?: string }> {
        for (const api of API_SOURCES) {
                const isWorking = await testAPI(api.url);
        if (isWorking) {
            API_BASE = api.url;
            currentApiIndex = API_SOURCES.findIndex(a => a.url === api.url);
            apiFailureCount = 0; // 重置失败计数
                        return { success: true, name: api.name };
        } else {
                    }
    }
        return { success: false };
}

// 新增: 自动切换到下一个可用API
export async function switchToNextAPI(): Promise<{ success: boolean; name?: string }> {
    // 检查是否超过最大切换次数
    if (totalApiSwitchCount >= MAX_API_SWITCH_COUNT) {
        console.error('已达到最大API切换次数，停止切换');
        return { success: false };
    }

    const startIndex = currentApiIndex;

    for (let i = 1; i < API_SOURCES.length; i++) {
        const nextIndex = (startIndex + i) % API_SOURCES.length;
        const api = API_SOURCES[nextIndex];

        const isWorking = await testAPI(api.url);

        if (isWorking) {
            API_BASE = api.url;
            currentApiIndex = nextIndex;
            apiFailureCount = 0;
            totalApiSwitchCount++;
            console.log(`切换到API: ${api.name} (切换次数: ${totalApiSwitchCount}/${MAX_API_SWITCH_COUNT})`);
            return { success: true, name: api.name };
        }
    }

    totalApiSwitchCount++;
    return { success: false };
}

// 新增: 记录API失败并在必要时切换
export async function handleApiFailure(): Promise<void> {
    apiFailureCount++;
        if (apiFailureCount >= API_FAILURE_THRESHOLD) {
                await switchToNextAPI();
    }
}

// 新增: 重置失败计数(成功时调用)
export function resetApiFailureCount(): void {
    if (apiFailureCount > 0) {
        apiFailureCount = 0;
    }
    // 成功时也重置总切换计数，允许后续重试
    if (totalApiSwitchCount > 0) {
        totalApiSwitchCount = Math.max(0, totalApiSwitchCount - 1);
    }
}

export async function fetchWithRetry(url: string, options: RequestInit = {}, retries: number = 2): Promise<Response> {
    const timeoutDuration = 15000; // 增加到15秒
    const retryDelays = [1000, 2000, 3000]; // 递增重试延迟

    for (let i = 0; i <= retries; i++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (response.ok) {
                return response;
            } else if (response.status >= 500 && i < retries) {
                // 服务器错误时重试
                const delay = retryDelays[i] || 3000;
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            } else {
                throw new Error(`API returned error: ${response.status}`);
            }
        } catch (error) {
            const isTimeout = error instanceof Error && error.name === 'AbortError';
            const errorType = isTimeout ? '请求超时' : '请求失败';

            if (i < retries) {
                const delay = retryDelays[i] || 3000;
                                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                throw error;
            }
        }
    }
    throw new Error('All fetch attempts failed.');
}

export async function getAlbumCoverUrl(song: Song, size: number = 300): Promise<string> {
    // Bilibili 音乐源直接使用 pic_id 作为图片URL
    if (song.source === 'bilibili' && song.pic_id) {
        return song.pic_id;
    }

    if (!song.pic_id) {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTUiIGhlaWdodD0iNTUiIHZpZXdCb3g9IjAgMCA1NSA1NSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjU1IiBoZWlnaHQ9IjU1IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHJ4PSI4Ii8+CjxwYXRoIGQ9Ik0yNy41IDE4TDM1IDI3LjVIMzBWMzdIMjVWMjcuNUgyMEwyNy41IDE4WiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjMpIi8+Cjwvc3ZnPgo=';
    }

    try {
        // 先尝试本地代理API
        if (API_BASE === '/api/music-proxy') {
            const localUrl = `${API_BASE}?types=pic&source=${song.source}&id=${song.pic_id}&size=${size}`;
                        try {
                const response = await fetchWithRetry(localUrl);
                const data = await response.json();
                if (data && data.url) {
                    return data.url;
                }
            } catch (localError) {
                                // 继续尝试外部API
            }
        }

        // 尝试外部API
        for (const api of API_SOURCES.slice(1)) { // 跳过本地代理，尝试外部API
            try {
                const url = api.url.includes('meting')
                    ? `${api.url}?server=${song.source}&type=pic&id=${song.pic_id}`
                    : `${api.url}?types=pic&source=${song.source}&id=${song.pic_id}&size=${size}`;

                                const response = await fetchWithRetry(url);
                const data = await response.json();
                if (data && data.url) {
                    return data.url;
                }
            } catch (error) {
                                continue;
            }
        }

        // 所有尝试都失败
                return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTUiIGhlaWdodD0iNTUiIHZpZXdCb3g9IjAgMCA1NSA1NSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjU1IiBoZWlnaHQ9IjU1IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHJ4PSI4Ii8+CjxwYXRoIGQ9Ik0yNy41IDE4TDM1IDI3LjVIMzBWMzdIMjVWMjcuNUgyMEwyNy41IDE4WiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjMpIi8+Cjwvc3ZnPgo=';
    } catch (error) {
                return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTUiIGhlaWdodD0iNTUiIHZpZXdCb3g9IjAgMCA1NSA1NSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjU1IiBoZWlnaHQ9IjU1IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHJ4PSI4Ii8+CjxwYXRoIGQ9Ik0yNy41IDE4TDM1IDI3LjVIMzBWMzdIMjVWMjcuNUgyMEwyNy41IDE4WiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjMpIi8+Cjwvc3ZnPgo=';
    }
}

// 新增: 检查歌曲URL是否有效
export async function validateSongUrl(url: string): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(url, {
            method: 'HEAD', // 只请求头部,不下载内容
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        return response.ok && (response.headers.get('content-type')?.includes('audio') || false);
    } catch (error) {
                return false;
    }
}

// 新增: 智能搜索替代版本
async function searchAlternativeVersions(songName: string, source: string): Promise<Song[]> {
    // 清理歌曲名称,移除括号内容和特殊标记
    const cleanName = songName
        .replace(/\(.*?\)/g, '')  // 移除括号内容如 (Cover XXX)
        .replace(/（.*?）/g, '')  // 移除中文括号
        .replace(/\[.*?\]/g, '')  // 移除方括号
        .replace(/【.*?】/g, '')  // 移除中文方括号
        .trim();

        try {
        const results = await searchMusicAPI(cleanName, source);
        if (results.length > 0) {
                        return results;
        }
    } catch (error) {
            }

    return [];
}

// 获取音乐源统计信息
export function getSourceStatistics(): { source: string; name: string; success: number; total: number; rate: string }[] {
    const stats: { source: string; name: string; success: number; total: number; rate: string }[] = [];

    MUSIC_SOURCES.forEach(musicSource => {
        const stat = sourceStats.get(musicSource.id);
        if (stat) {
            const rate = stat.total > 0 ? (stat.success / stat.total * 100).toFixed(1) : '0.0';
            stats.push({
                source: musicSource.id,
                name: musicSource.name,
                success: stat.success,
                total: stat.total,
                rate: rate
            });
        }
    });

    return stats;
}

// 打印音乐源统计报告
export function printSourceStatistics(): void {
        const stats = getSourceStatistics();

    }

// 音乐源配置 - 按优先级排序
const MUSIC_SOURCES = [
    { id: 'netease', name: '网易云音乐', priority: 1 },
    { id: 'tencent', name: 'QQ音乐', priority: 2 },
    { id: 'kugou', name: '酷狗音乐', priority: 3 },
    { id: 'kuwo', name: '酷我音乐', priority: 4 },
    { id: 'xiami', name: '虾米音乐', priority: 5 },
    { id: 'baidu', name: '百度音乐', priority: 6 },
    { id: 'bilibili', name: 'Bilibili音乐', priority: 7 }
];

// Bilibili API 配置（笒鬼鬼API）
const BILIBILI_API_BASE = 'https://api.cenguigui.cn/api/bilibili/bilibili.php';

// 音乐源成功率统计
const sourceStats = new Map<string, { success: number; total: number }>();

// 初始化统计数据
MUSIC_SOURCES.forEach(source => {
    sourceStats.set(source.id, { success: 0, total: 0 });
});

// 获取音乐源成功率
function getSourceSuccessRate(sourceId: string): number {
    const stats = sourceStats.get(sourceId);
    if (!stats || stats.total === 0) return 0.5; // 默认50%成功率
    return stats.success / stats.total;
}

// 记录音乐源使用结果
function recordSourceResult(sourceId: string, success: boolean): void {
    const stats = sourceStats.get(sourceId);
    if (stats) {
        stats.total++;
        if (success) stats.success++;

    }
}

// 获取排序后的音乐源列表(根据成功率动态调整)
function getSortedSources(currentSource: string): string[] {
    const sources = MUSIC_SOURCES.map(s => s.id);

    // 过滤掉当前音乐源
    const otherSources = sources.filter(s => s !== currentSource);

    // 根据成功率排序
    otherSources.sort((a, b) => {
        const rateA = getSourceSuccessRate(a);
        const rateB = getSourceSuccessRate(b);
        return rateB - rateA; // 降序排列
    });

    return [currentSource, ...otherSources];
}

// 新增: 多音乐源尝试获取歌曲URL
export async function getSongUrlWithFallback(song: Song, quality: string): Promise<{ url: string; br: string; error?: string; usedSource?: string }> {
    // 动态获取音乐源列表(根据成功率排序)
    const sourcesToTry = getSortedSources(song.source);

    // 先尝试本地代理API
    if (API_BASE === '/api/music-proxy') {
        for (const source of sourcesToTry) {
            try {
                // 如果不是原始音乐源,需要先搜索获取该源的歌曲ID
                let songIdForSource = song.id;
                if (source !== song.source) {
                    // 先尝试精确匹配
                    let searchResults = await searchMusicAPI(song.name, source);

                    // 如果精确搜索失败,尝试智能搜索替代版本
                    if (searchResults.length === 0) {
                                                searchResults = await searchAlternativeVersions(song.name, source);
                    }

                    if (searchResults.length === 0) {
                                                recordSourceResult(source, false); // 记录失败
                        continue;
                    }

                    // 匹配最相似的歌曲
                    const matchedSong = searchResults.find(s =>
                        s.name === song.name || s.name.includes(song.name) || song.name.includes(s.name)
                    ) || searchResults[0];
                    songIdForSource = matchedSong.id;

                    if (matchedSong.name !== song.name) {
                                            }
                }

                const url = `${API_BASE}?types=url&source=${source}&id=${songIdForSource}&br=${quality}`;
                                const response = await fetchWithRetry(url, {}, 1); // 减少重试次数以加快切换
                const data = await response.json();

                if (data && data.url) {
                    // 验证URL有效性
                    const isValid = await validateSongUrl(data.url);
                    if (!isValid) {
                                                recordSourceResult(source, false); // 记录失败
                        continue;
                    }

                    // 记录成功
                    recordSourceResult(source, true);

                    if (source !== song.source) {
                        const sourceName = MUSIC_SOURCES.find(s => s.id === source)?.name || source;
                                            }
                    return { ...data, usedSource: source };
                } else {
                    recordSourceResult(source, false); // 记录失败
                }
            } catch (error) {
                                recordSourceResult(source, false); // 记录失败
                continue;
            }
        }
    }

    // 如果本地代理失败，尝试外部API
    for (const source of sourcesToTry) {
        for (const api of API_SOURCES.slice(1)) { // 跳过本地代理
            try {
                // 如果不是原始音乐源,需要先搜索获取该源的歌曲ID
                let songIdForSource = song.id;
                if (source !== song.source) {
                    // 先尝试精确匹配
                    let searchResults = await searchMusicAPI(song.name, source);

                    // 如果精确搜索失败,尝试智能搜索替代版本
                    if (searchResults.length === 0) {
                                                searchResults = await searchAlternativeVersions(song.name, source);
                    }

                    if (searchResults.length === 0) {
                                                recordSourceResult(source, false); // 记录失败
                        continue;
                    }

                    // 匹配最相似的歌曲
                    const matchedSong = searchResults.find(s =>
                        s.name === song.name || s.name.includes(song.name) || song.name.includes(s.name)
                    ) || searchResults[0];
                    songIdForSource = matchedSong.id;

                    if (matchedSong.name !== song.name) {
                                            }
                }

                const url = api.url.includes('meting')
                    ? `${api.url}?server=${source}&type=url&id=${songIdForSource}&br=${quality}`
                    : `${api.url}?types=url&source=${source}&id=${songIdForSource}&br=${quality}`;

                const response = await fetchWithRetry(url, {}, 1); // 减少重试次数以加快切换
                const data = await response.json();

                if (data && data.url) {
                    // 验证URL有效性
                    const isValid = await validateSongUrl(data.url);
                    if (!isValid) {
                                                recordSourceResult(source, false); // 记录失败
                        continue;
                    }

                    // 记录成功
                    recordSourceResult(source, true);

                    if (source !== song.source) {
                        const sourceName = MUSIC_SOURCES.find(s => s.id === source)?.name || source;
                                            }
                    return { ...data, usedSource: `${api.name}:${source}` };
                } else {
                    recordSourceResult(source, false); // 记录失败
                }
            } catch (error) {
                                recordSourceResult(source, false); // 记录失败
                continue;
            }
        }
    }

    const errorMsg = `所有音乐源均无法获取 - 歌曲: ${song.name}, 品质: ${quality}`;
        return { url: '', br: '', error: errorMsg };
}

export async function getSongUrl(song: Song, quality: string): Promise<{ url: string; br: string; error?: string; usedSource?: string }> {
    // Bilibili 音乐源使用独立API
    if (song.source === 'bilibili') {
        return await getBilibiliMediaUrl(song, quality);
    }

    try {
        // 先尝试本地代理API
        if (API_BASE === '/api/music-proxy') {
            const localUrl = `${API_BASE}?types=url&source=${song.source}&id=${song.id}&br=${quality}`;
                        try {
                const response = await fetchWithRetry(localUrl);
                const data = await response.json();
                if (data && data.url) {
                    // 验证URL有效性
                    const isValid = await validateSongUrl(data.url);
                    if (isValid) {
                        return data;
                    } else {
                                            }
                }
            } catch (localError) {
                                // 继续尝试外部API
            }
        }

        // 尝试外部API
        for (const api of API_SOURCES.slice(1)) { // 跳过本地代理，尝试外部API
            try {
                const url = api.url.includes('meting')
                    ? `${api.url}?server=${song.source}&type=url&id=${song.id}&br=${quality}`
                    : `${api.url}?types=url&source=${song.source}&id=${song.id}&br=${quality}`;

                                const response = await fetchWithRetry(url);
                const data = await response.json();

                if (data && data.url) {
                    // 验证URL有效性
                    const isValid = await validateSongUrl(data.url);
                    if (isValid) {
                        return { ...data, usedSource: api.name };
                    } else {
                                                continue;
                    }
                }
            } catch (error) {
                                continue;
            }
        }

        const errorMsg = `所有音乐源均无法获取 - 歌曲: ${song.name}, 品质: ${quality}`;
                return { url: '', br: '', error: errorMsg };
    } catch (error) {
        const errorMsg = `API请求失败 - ${error instanceof Error ? error.message : String(error)}`;
                return { url: '', br: '', error: errorMsg };
    }
}

// 获取 Bilibili 媒体源URL（使用笒鬼鬼API）
async function getBilibiliMediaUrl(song: Song, quality: string = '320'): Promise<{ url: string; br: string; error?: string; usedSource?: string }> {
    try {
        const bvid = song.id;

        // 映射品质参数到cenguigui API的质量等级
        const qualityMap: { [key: string]: string } = {
            '128': 'low',
            '192': 'standard',
            '320': 'high',
            '740': 'super',
            '999': 'super'
        };
        const bilibiliQuality = qualityMap[quality] || 'standard';

        const url = `${BILIBILI_API_BASE}?action=media&bvid=${bvid}&quality=${bilibiliQuality}`;
                const response = await fetchWithRetry(url);
        const result = await response.json();

                if (result.code !== 200 || !result.data || !result.data.url) {
                        throw new Error(result.message || 'Bilibili 媒体源获取失败');
        }

        return {
            url: result.data.url,
            br: result.data.bitrate || quality,
            usedSource: 'bilibili'
        };
    } catch (error) {
        const errorMsg = `Bilibili 媒体源获取失败 - ${error instanceof Error ? error.message : String(error)}`;
                return { url: '', br: '', error: errorMsg };
    }
}

export async function getLyrics(song: Song): Promise<{ lyric: string }> {
    // Bilibili 音乐源暂不支持歌词
    if (song.source === 'bilibili') {
        return { lyric: '' };
    }

    const url = API_BASE.includes('meting')
        ? `${API_BASE}?server=${song.source}&type=lyric&id=${song.lyric_id || song.id}`
        : `${API_BASE}?types=lyric&source=${song.source}&id=${song.lyric_id || song.id}`;
    const response = await fetchWithRetry(url);
    return await response.json();
}

export async function searchMusicAPI(keyword: string, source: string, limit: number = 100): Promise<Song[]> {
    // Bilibili 音乐源使用独立API，失败时自动降级
    if (source === 'bilibili') {
        try {
            return await searchBilibiliMusic(keyword, 1, limit);
        } catch (error) {
                        source = 'netease'; // 降级到网易云音乐
        }
    }

    // Meting API 使用 'name' 参数而不是 'id'
    // 移除硬编码数量限制，支持自定义数量，默认1000条
    const url = API_BASE.includes('meting')
        ? `${API_BASE}?server=${source}&type=search&name=${encodeURIComponent(keyword)}&count=${limit}`
        : `${API_BASE}?types=search&source=${source}&name=${encodeURIComponent(keyword)}&count=${limit}`;

        try {
            const response = await fetchWithRetry(url);
            
            // 检查响应状态
            if (!response.ok) {
                await handleApiFailure();
                throw new Error(`API 响应错误: ${response.status}`);
            }
            
            const data = await response.json();
    
            // 检查API是否返回错误
            if (data && data.error) {
                await handleApiFailure();
                throw new Error(data.error || 'API 返回错误');
            }
    
            // 使用公共函数解析响应
            let songs: any[];
            try {
                songs = parseApiResponse(data);
            } catch (parseError) {
                await handleApiFailure();
                throw parseError;
            }

        if (songs.length === 0) {
                        await handleApiFailure(); // 触发API切换机制
            
            // 如果当前不是最后一个API，抛出错误以触发重试
            if (currentApiIndex < API_SOURCES.length - 1) {
                throw new Error('API返回空数据，尝试切换API源');
            }
            
                                                            return [];
        }

        // 过滤掉无效数据（酷狗的id可能为null，使用url_id作为备用）
        songs = songs.filter(song =>
            song &&
            song.name &&
            song.name.trim() !== ''
        ).map(song => ({
            ...song,
            id: song.id || song.url_id || song.lyric_id || `${source}_${Date.now()}_${Math.random()}`
        }));

                resetApiFailureCount(); // 成功时重置失败计数
        
        return songs.map((song: any) => ({ ...song, source: source }));
    } catch (error) {
                await handleApiFailure();
        throw error;
    }
}

// Bilibili 音乐搜索（使用笒鬼鬼API）
async function searchBilibiliMusic(keyword: string, page: number = 1, limit: number = 100): Promise<Song[]> {
    try {
        const url = `${BILIBILI_API_BASE}?action=search&query=${encodeURIComponent(keyword)}&page=${page}&limit=${limit}`;
                const response = await fetchWithRetry(url);
        const result = await response.json();

                if (result.code !== 200 || !result.data || !Array.isArray(result.data)) {
                        throw new Error(result.message || 'Bilibili API 返回数据格式不正确');
        }

        // 转换 Bilibili 数据格式为统一格式（兼容cenguigui API格式）
        const songs: Song[] = result.data.map((item: any) => ({
            id: item.bvid || item.id,
            name: item.title,
            artist: [item.artist || '未知艺术家'],
            album: item.album || item.bvid,
            pic_id: item.pic || '',
            lyric_id: '',
            source: 'bilibili',
            // 保存原始数据用于后续获取媒体源
            _raw: {
                bvid: item.bvid,
                aid: item.aid,
                duration: item.duration,
                pic: item.pic,
                play_count: item.play_count || 0
            }
        }));

                return songs;
    } catch (error) {
                throw error;
    }
}

export async function exploreRadarAPI(limit: number = 100): Promise<Song[]> {
    const keywords = ['热门', '流行', '新歌榜', '热门榜', '抖音热歌', '网络热歌'];
    const randomKeyword = keywords[Math.floor(Math.random() * keywords.length)];
    const sources = ['netease', 'tencent', 'kugou'];
    const randomSource = sources[Math.floor(Math.random() * sources.length)];
    
    // Meting API 使用不同的参数名
    // 移除硬编码数量限制，支持自定义数量，默认1000条
    const url = API_BASE.includes('meting')
        ? `${API_BASE}?server=${randomSource}&type=search&name=${encodeURIComponent(randomKeyword)}&count=${limit}`
        : `${API_BASE}?types=search&source=${randomSource}&name=${encodeURIComponent(randomKeyword)}&count=${limit}`;

            try {
        const response = await fetchWithRetry(url);
        
        // 检查响应状态
        if (!response.ok) {
                        await handleApiFailure();
            throw new Error(`API 响应错误: ${response.status}`);
        }
        
        const data = await response.json();

        // 检查API是否返回错误
        if (data && data.error) {
                        await handleApiFailure();
            throw new Error(data.error || 'API 返回错误');
        }

        // 使用公共函数解析响应
        let songs: any[];
        try {
            songs = parseApiResponse(data);
        } catch (parseError) {
                        await handleApiFailure();
            throw parseError;
        }

        if (songs.length === 0) {
                        await handleApiFailure(); // 触发API切换机制
            
            // 重试其他音乐源
                        return await exploreRadarAPI(limit);
        }

        // 过滤掉无效数据（酷狗的id可能为null，使用url_id作为备用）
        songs = songs.filter(song =>
            song &&
            song.name &&
            song.name.trim() !== ''
        ).map(song => ({
            ...song,
            id: song.id || song.url_id || song.lyric_id || `${randomSource}_${Date.now()}_${Math.random()}`
        }));

                resetApiFailureCount(); // 成功时重置失败计数
        
        return songs.map((song: any) => ({ ...song, source: randomSource }));
    } catch (error) {
                await handleApiFailure();
        throw error;
    }
}

// 多平台榜单ID配置
const CHART_IDS = {
    netease: {
        'soar': '19723756',   // 飙升榜
        'new': '3779629',     // 新歌榜
        'hot': '3778678',     // 热门榜
        'classic': '2884035', // 经典榜
        'recommend': '3778678' // 推荐榜（使用热歌榜）
    },
    tencent: {
        'soar': '108',        // 飙升榜
        'new': '27',          // 新歌榜
        'hot': '26',          // 热歌榜
        'classic': '3',       // 经典榜
        'recommend': '4'      // 推荐榜
    },
    kugou: {
        'new': '8888',        // 新歌榜
        'hot': '6666',        // 热歌榜
        'soar': '31229',      // 飙升榜
        'classic': '33',      // 经典500
        'recommend': '6666'   // 推荐（热歌榜）
    }
};

// 获取榜单数据 - 支持多平台
export async function getChartList(
    chartType: 'soar' | 'new' | 'hot' | 'classic' | 'recommend',
    source: 'netease' | 'tencent' | 'kugou' | 'bilibili' = 'netease'
): Promise<Song[]> {
    try {
                // Bilibili特殊处理
        if (source === 'bilibili') {
            const bilibiliTypeMap: { [key: string]: 'hot' | 'new' | 'rank' } = {
                'hot': 'hot',
                'new': 'new',
                'soar': 'rank',
                'classic': 'hot',
                'recommend': 'hot'
            };
            return await getBilibiliChartList(bilibiliTypeMap[chartType] || 'hot');
        }

        // 检查平台是否支持该榜单
        const chartIds = CHART_IDS[source as 'netease' | 'tencent' | 'kugou'];
        if (!chartIds || !chartIds[chartType]) {
                        const fallbackId = chartIds?.hot || CHART_IDS.netease.hot;
            const playlist = await parsePlaylistAPI(fallbackId, source);
            return playlist.songs.slice(0, 50);
        }

        const playlistId = chartIds[chartType];
        const playlist = await parsePlaylistAPI(playlistId, source);
        const songs = playlist.songs.slice(0, 100); // 限制100首

                return songs;
    } catch (error) {
                throw error;
    }
}

export async function parsePlaylistAPI(playlistUrlOrId: string, source: string = 'netease'): Promise<{ songs: Song[]; name?: string; count?: number }> {
    let playlistId = playlistUrlOrId.trim();

        // 支持多种URL格式
    if (source === 'netease') {
        if (playlistId.includes('music.163.com') || playlistId.includes('163cn.tv')) {
            // 尝试多种ID提取模式
            const patterns = [
                /id=(\d+)/,           // ?id=123456
                /playlist\/(\d+)/,    // /playlist/123456
                /\/(\d+)\?/,          // /123456?
                /\/(\d+)$/            // /123456
            ];

            let matched = false;
            for (const pattern of patterns) {
                const idMatch = playlistId.match(pattern);
                if (idMatch && idMatch[1]) {
                    playlistId = idMatch[1];
                    matched = true;
                                        break;
                }
            }

            if (!matched) {
                throw new Error('无法从URL中提取歌单ID，请检查链接格式');
            }
        } else if (!/^\d+$/.test(playlistId)) {
            throw new Error('歌单ID格式无效，请输入纯数字ID或完整链接');
        }
    } else if (source === 'tencent') {
        // QQ音乐歌单URL格式: https://y.qq.com/n/ryqq/playlist/123456
        if (playlistId.includes('y.qq.com')) {
            const patterns = [
                /playlist\/(\d+)/,    // /playlist/123456
                /id=(\d+)/,           // ?id=123456
                /\/(\d+)\?/,          // /123456?
                /\/(\d+)$/            // /123456
            ];

            let matched = false;
            for (const pattern of patterns) {
                const idMatch = playlistId.match(pattern);
                if (idMatch && idMatch[1]) {
                    playlistId = idMatch[1];
                    matched = true;
                                        break;
                }
            }

            if (!matched) {
                throw new Error('无法从QQ音乐URL中提取歌单ID，请检查链接格式');
            }
        } else if (!/^\d+$/.test(playlistId)) {
            throw new Error('歌单ID格式无效，请输入纯数字ID或完整链接');
        }
    }

        const apiUrl = API_BASE.includes('meting')
        ? `${API_BASE}?server=${source}&type=playlist&id=${playlistId}`
        : `${API_BASE}?types=playlist&source=${source}&id=${playlistId}`;
        try {
        const response = await fetchWithRetry(apiUrl);
        
        // 检查响应状态
        if (!response.ok) {
                        await handleApiFailure();
            throw new Error(`API 响应错误: ${response.status}`);
        }
        
        const playlistData = await response.json();

        // 检查返回数据的有效性
        if (!playlistData) {
                        await handleApiFailure();
            throw new Error('API返回空数据，请检查歌单ID是否正确');
        }

        // 处理API返回错误对象的情况
        if (playlistData.error || playlistData.msg) {
                        await handleApiFailure();
            throw new Error(playlistData.error || playlistData.msg || '未知API错误');
        }

        let songs: Song[] = [];
        let playlistName = '未命名歌单';

        // 兼容多种返回格式
        if (Array.isArray(playlistData)) {
            // 格式1: 直接返回歌曲数组
            songs = playlistData;
                    } else if (playlistData.songs && Array.isArray(playlistData.songs)) {
            // 格式2: { songs: [...], name: '...', ... }
            songs = playlistData.songs;
            playlistName = playlistData.name || playlistName;
                    } else if (playlistData.data && Array.isArray(playlistData.data)) {
            // 格式3: { data: [...] }
            songs = playlistData.data;
            playlistName = playlistData.name || '未命名歌单';
                    } else if (playlistData.playlist && playlistData.playlist.tracks) {
            // 格式4: 网易云音乐API原始格式
            songs = playlistData.playlist.tracks;
            playlistName = playlistData.playlist.name || playlistName;
                    } else {
            await handleApiFailure();
            throw new Error(`歌单数据格式不支持。请在控制台查看完整数据结构`);
        }

        if (!songs || songs.length === 0) {
                                                                                    throw new Error('歌单为空。建议尝试其他歌单ID');
        }

        // 过滤并确保每首歌曲都有必要的字段
        songs = songs
            .filter(song => song && song.id && song.name)
            .map((song: any) => ({
                ...song,
                source: source,
                name: song.name || '未知歌曲',
                artist: song.artist || ['未知艺术家'],
                album: song.album || '未知专辑'
            }));

                resetApiFailureCount(); // 成功时重置失败计数

        return {
            songs: songs,
            name: playlistName,
            count: songs.length
        };
    } catch (error) {
                await handleApiFailure();
        throw error;
    }
}

// 获取 Bilibili 音乐榜单
export async function getBilibiliChartList(chartType: 'hot' | 'new' | 'rank' = 'hot'): Promise<Song[]> {
    try {
        // Bilibili 榜单类型映射
        const chartTypeMap: { [key: string]: string } = {
            'hot': 'hot',      // 热门榜
            'new': 'new',      // 新歌榜
            'rank': 'rank'     // 排行榜
        };
        
        const type = chartTypeMap[chartType] || 'hot';
        const url = `${BILIBILI_API_BASE}?action=chart&type=${type}&limit=100`;
        
                const response = await fetchWithRetry(url);
        const result = await response.json();
        
                if (result.code !== 200 || !result.data || !Array.isArray(result.data)) {
                        throw new Error(result.message || 'Bilibili 榜单 API 返回数据格式不正确');
        }
        
        // 转换 Bilibili 数据格式为统一格式
        const songs: Song[] = result.data.map((item: any) => ({
            id: item.bvid || item.id,
            name: item.title || item.name,
            artist: [item.artist || item.author || '未知艺术家'],
            album: item.album || item.bvid || '未知专辑',
            pic_id: item.pic || item.cover || '',
            lyric_id: '',
            source: 'bilibili',
            // 保存原始数据用于后续获取媒体源
            _raw: {
                bvid: item.bvid,
                aid: item.aid,
                duration: item.duration,
                pic: item.pic || item.cover,
                play: item.play || 0,
                like: item.like || 0
            }
        }));
        
                return songs;
    } catch (error) {
                throw error;
    }
}

// 扩展原有的 getChartList 函数，支持 Bilibili 榜单
export async function getChartListExtended(chartType: 'soar' | 'new' | 'hot' | 'bilibili-hot' | 'bilibili-new' | 'bilibili-rank'): Promise<Song[]> {
    // Bilibili 榜单
    if (chartType.startsWith('bilibili-')) {
        const bilibiliType = chartType.replace('bilibili-', '') as 'hot' | 'new' | 'rank';
        return await getBilibiliChartList(bilibiliType);
    }
    
    // 网易云音乐榜单
    const chartIds = {
        'soar': '19723756',  // 飙升榜
        'new': '3779629',    // 新歌榜
        'hot': '3778678'     // 热门榜
    };

    try {
                const playlist = await parsePlaylistAPI(chartIds[chartType as 'soar' | 'new' | 'hot'], 'netease');
        const songs = playlist.songs.slice(0, 100); // 限制100首
                return songs;
    } catch (error) {
                throw error;
    }
}

// ========== 新增实用功能 ==========

// 智能推荐：根据歌曲推荐相似歌曲
export async function getRecommendations(song: Song, limit: number = 20): Promise<Song[]> {
    try {
                // 提取歌曲的关键信息用于搜索
        const artistName = Array.isArray(song.artist) ? song.artist[0] : song.artist;
        const searchKeywords = [
            artistName, // 同一歌手的其他歌曲
            `${song.name.substring(0, 3)}`, // 歌曲名前几个字
        ];
        
        const allRecommendations: Song[] = [];
        
        // 尝试多个关键词搜索
        for (const keyword of searchKeywords) {
            try {
                const results = await searchMusicAPI(keyword, song.source, Math.min(limit, 30));
                // 过滤掉原始歌曲
                const filtered = results.filter(s =>
                    !(s.id === song.id && s.source === song.source)
                );
                allRecommendations.push(...filtered);
                
                if (allRecommendations.length >= limit) break;
            } catch (error) {
                                continue;
            }
        }
        
        // 去重并限制数量
        const uniqueRecommendations = Array.from(
            new Map(allRecommendations.map(s => [`${s.id}_${s.source}`, s])).values()
        ).slice(0, limit);
        
                return uniqueRecommendations;
    } catch (error) {
                return [];
    }
}

// 批量获取歌曲详情
export async function getBatchSongDetails(songs: Song[]): Promise<Song[]> {
    const results: Song[] = [];
    const batchSize = 5;
    
    for (let i = 0; i < songs.length; i += batchSize) {
        const batch = songs.slice(i, i + batchSize);
        const batchResults = await Promise.all(
            batch.map(async (song) => {
                try {
                    // 获取专辑封面
                    const coverUrl = await getAlbumCoverUrl(song);
                    return { ...song, coverUrl };
                } catch (error) {
                                        return song;
                }
            })
        );
        results.push(...batchResults);
        
        // 显示进度
            }
    
    return results;
}

// 搜索建议（自动补全）
export async function getSearchSuggestions(keyword: string, source: string = 'netease'): Promise<string[]> {
    if (!keyword || keyword.trim().length < 2) return [];
    
    try {
        // 快速搜索获取建议
        const results = await searchMusicAPI(keyword, source, 10);
        
        // 提取唯一的歌曲名和艺术家名作为建议
        const suggestions = new Set<string>();
        results.forEach(song => {
            suggestions.add(song.name);
            if (Array.isArray(song.artist)) {
                song.artist.forEach(artist => suggestions.add(artist));
            }
        });
        
        return Array.from(suggestions).slice(0, 10);
    } catch (error) {
                return [];
    }
}

// 获取热门搜索关键词
export function getHotSearchKeywords(): string[] {
    return [
        '周杰伦', '林俊杰', '邓紫棋', '薛之谦', '毛不易',
        '热门', '抖音热歌', '新歌榜', '流行', '网络热歌',
        '伤感', '励志', '古风', '纯音乐', '轻音乐'
    ];
}

// 音乐源健康检查
export async function checkSourcesHealth(): Promise<{ source: string; name: string; available: boolean; responseTime: number }[]> {
        const results = await Promise.all(
        MUSIC_SOURCES.map(async (musicSource) => {
            const startTime = Date.now();
            try {
                const url = API_BASE.includes('meting')
                    ? `${API_BASE}?server=${musicSource.id}&type=search&name=test&count=1`
                    : `${API_BASE}?types=search&source=${musicSource.id}&name=test&count=1`;
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);
                
                const response = await fetch(url, { signal: controller.signal });
                clearTimeout(timeoutId);
                
                const responseTime = Date.now() - startTime;
                const available = response.ok;
                
                return {
                    source: musicSource.id,
                    name: musicSource.name,
                    available,
                    responseTime
                };
            } catch (error) {
                return {
                    source: musicSource.id,
                    name: musicSource.name,
                    available: false,
                    responseTime: Date.now() - startTime
                };
            }
        })
    );
    
    return results;
}

// 获取歌曲质量信息
export async function getSongQualityInfo(song: Song): Promise<{
    available: { quality: string; size?: string }[];
    recommended: string;
}> {
    const qualities = ['128', '192', '320', '740', '999'];
    const qualityNames: { [key: string]: string } = {
        '128': '标准',
        '192': '较高',
        '320': '高品质',
        '740': '无损',
        '999': 'Hi-Res'
    };
    
    const available: { quality: string; size?: string }[] = [];
    
    for (const quality of qualities) {
        try {
            const result = await getSongUrl(song, quality);
            if (result && result.url) {
                available.push({
                    quality: `${qualityNames[quality]} ${quality}K`,
                    size: result.br ? `${result.br}kbps` : undefined
                });
            }
        } catch (error) {
            // 忽略错误，继续检查下一个质量
        }
    }
    
    // 推荐最高可用质量
    const recommended = available.length > 0 ? available[available.length - 1].quality : '320K';
    
    return { available, recommended };
}

// 导出歌单为文本格式
export function exportPlaylistToText(songs: Song[], format: 'txt' | 'csv' | 'json' = 'txt'): string {
    if (format === 'json') {
        return JSON.stringify(songs, null, 2);
    } else if (format === 'csv') {
        const headers = '歌曲名,艺术家,专辑,音乐源\n';
        const rows = songs.map(song =>
            `"${song.name}","${Array.isArray(song.artist) ? song.artist.join(', ') : song.artist}","${song.album}","${song.source}"`
        ).join('\n');
        return headers + rows;
    } else {
        // txt format
        return songs.map((song, index) =>
            `${index + 1}. ${song.name} - ${Array.isArray(song.artist) ? song.artist.join(', ') : song.artist} [${song.album}]`
        ).join('\n');
    }
}

// 从文本导入歌单
export async function importPlaylistFromText(text: string, source: string = 'netease'): Promise<Song[]> {
    const lines = text.split('\n').filter(line => line.trim());
    const songs: Song[] = [];

    for (const line of lines) {
        try {
            // 尝试解析格式：歌曲名 - 艺术家 或 歌曲名
            const match = line.match(/(?:\d+\.\s*)?(.+?)(?:\s*-\s*(.+?))?(?:\s*\[.+?\])?$/);
            if (match) {
                const songName = match[1].trim();
                const searchResults = await searchMusicAPI(songName, source, 1);
                if (searchResults.length > 0) {
                    songs.push(searchResults[0]);
                }
            }
        } catch (error) {
                    }
    }

    return songs;
}

// ========== 新增功能：专辑和歌单搜索 ==========

/**
 * 搜索专辑
 * @param keyword 搜索关键词
 * @param source 音乐平台
 * @param limit 返回数量
 */
export async function searchAlbumAPI(keyword: string, source: string = 'netease', limit: number = 30): Promise<any[]> {
    // 注意：Meting API不直接支持专辑搜索，我们通过歌单搜索模拟
    // 实际项目中可以直接调用网易云API的专辑搜索接口
    try {
        // 使用search type=10 搜索专辑（网易云API参数）
        const url = API_BASE.includes('meting')
            ? `${API_BASE}?server=${source}&type=search&name=${encodeURIComponent(keyword)}&count=${limit}&search_type=10`
            : `${API_BASE}?types=search&source=${source}&name=${encodeURIComponent(keyword)}&count=${limit}&search_type=10`;

        const response = await fetchWithRetry(url);
        const data = await response.json();

        // 尝试解析响应
        let albums: any[] = [];
        if (Array.isArray(data)) {
            albums = data;
        } else if (data && data.albums) {
            albums = data.albums;
        } else if (data && data.result && data.result.albums) {
            albums = data.result.albums;
        }

                return albums;
    } catch (error) {
                return [];
    }
}

/**
 * 搜索歌单
 * @param keyword 搜索关键词
 * @param source 音乐平台
 * @param limit 返回数量
 */
export async function searchPlaylistAPI(keyword: string, source: string = 'netease', limit: number = 30): Promise<any[]> {
    try {
        // 使用search type=1000 搜索歌单（网易云API参数）
        const url = API_BASE.includes('meting')
            ? `${API_BASE}?server=${source}&type=search&name=${encodeURIComponent(keyword)}&count=${limit}&search_type=1000`
            : `${API_BASE}?types=search&source=${source}&name=${encodeURIComponent(keyword)}&count=${limit}&search_type=1000`;

        const response = await fetchWithRetry(url);
        const data = await response.json();

        // 尝试解析响应
        let playlists: any[] = [];
        if (Array.isArray(data)) {
            playlists = data;
        } else if (data && data.playlists) {
            playlists = data.playlists;
        } else if (data && data.result && data.result.playlists) {
            playlists = data.result.playlists;
        }

                return playlists;
    } catch (error) {
                return [];
    }
}

// ========== 新增功能：热门专辑和热门歌曲 ==========

/**
 * 获取热门专辑
 * @param source 音乐平台
 * @param limit 返回数量
 */
export async function getHotAlbums(source: string = 'netease', limit: number = 20): Promise<any[]> {
    try {
        // 通过热门关键词搜索专辑
        const hotKeywords = ['华语', '流行', '热门', '经典', '排行榜'];
        const randomKeyword = hotKeywords[Math.floor(Math.random() * hotKeywords.length)];

        return await searchAlbumAPI(randomKeyword, source, limit);
    } catch (error) {
                return [];
    }
}

/**
 * 获取热门歌曲（通过热门榜单）
 * @param source 音乐平台
 * @param limit 返回数量
 */
export async function getHotSongs(source: 'netease' | 'tencent' | 'kugou' | 'bilibili' = 'netease', limit: number = 50): Promise<Song[]> {
    try {
        // 直接使用热门榜单
        const songs = await getChartList('hot', source);
        return songs.slice(0, limit);
    } catch (error) {
                // 降级：通过关键词搜索
        try {
            const fallbackSongs = await searchMusicAPI('热门', source, limit);
            return fallbackSongs;
        } catch (fallbackError) {
                        return [];
        }
    }
}

/**
 * 获取推荐歌单
 * @param source 音乐平台
 * @param limit 返回数量
 */
export async function getRecommendPlaylists(source: string = 'netease', limit: number = 20): Promise<any[]> {
    try {
        // 通过热门关键词搜索歌单
        const hotKeywords = ['热门', '精选', '经典', '必听', '流行'];
        const randomKeyword = hotKeywords[Math.floor(Math.random() * hotKeywords.length)];

        return await searchPlaylistAPI(randomKeyword, source, limit);
    } catch (error) {
                return [];
    }
}

