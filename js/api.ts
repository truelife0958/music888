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
}

// 1. Re-added backup API sources for improved reliability
const API_SOURCES: ApiSource[] = [
    {
        name: '主 API',
        url: 'https://music-api.gdstudio.xyz/api.php'
    },
    {
        name: '备用 API',
        url: 'https://api.injahow.cn/meting/'
    }
];

let API_BASE = API_SOURCES[0].url;
let currentApiIndex = 0;
let apiFailureCount = 0;
const API_FAILURE_THRESHOLD = 3; // 连续失败3次后切换API

async function testAPI(apiUrl: string): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        // Adapt test URL based on API provider
        const testUrl = apiUrl.includes('meting')
            ? `${apiUrl}?server=netease&type=search&id=test&count=1`
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
    console.log('正在检测可用的 API...');
    for (const api of API_SOURCES) {
        console.log(`测试 ${api.name}...`);
        const isWorking = await testAPI(api.url);
        if (isWorking) {
            API_BASE = api.url;
            currentApiIndex = API_SOURCES.findIndex(a => a.url === api.url);
            apiFailureCount = 0; // 重置失败计数
            console.log(`✅ ${api.name} 可用`);
            return { success: true, name: api.name };
        } else {
            console.log(`❌ ${api.name} 不可用`);
        }
    }
    console.error('所有 API 均不可用');
    return { success: false };
}

// 新增: 自动切换到下一个可用API
export async function switchToNextAPI(): Promise<{ success: boolean; name?: string }> {
    console.log('尝试切换到备用 API...');
    const startIndex = currentApiIndex;

    for (let i = 1; i < API_SOURCES.length; i++) {
        const nextIndex = (startIndex + i) % API_SOURCES.length;
        const api = API_SOURCES[nextIndex];

        console.log(`测试 ${api.name}...`);
        const isWorking = await testAPI(api.url);

        if (isWorking) {
            API_BASE = api.url;
            currentApiIndex = nextIndex;
            apiFailureCount = 0;
            console.log(`✅ 已切换到 ${api.name}`);
            return { success: true, name: api.name };
        }
    }

    console.error('所有备用 API 均不可用');
    return { success: false };
}

// 新增: 记录API失败并在必要时切换
export async function handleApiFailure(): Promise<void> {
    apiFailureCount++;
    console.warn(`API 失败计数: ${apiFailureCount}/${API_FAILURE_THRESHOLD}`);

    if (apiFailureCount >= API_FAILURE_THRESHOLD) {
        console.log('达到失败阈值,尝试切换 API...');
        await switchToNextAPI();
    }
}

// 新增: 重置失败计数(成功时调用)
export function resetApiFailureCount(): void {
    if (apiFailureCount > 0) {
        apiFailureCount = 0;
        console.log('API 失败计数已重置');
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
                console.warn(`服务器错误 ${response.status}, ${delay}ms 后重试 (${i + 1}/${retries + 1})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            } else {
                throw new Error(`API returned error: ${response.status}`);
            }
        } catch (error) {
            const isTimeout = error instanceof Error && error.name === 'AbortError';
            const errorType = isTimeout ? '请求超时' : '请求失败';

            console.error(`${errorType} (尝试 ${i + 1}/${retries + 1}):`, error);

            if (i < retries) {
                const delay = retryDelays[i] || 3000;
                console.log(`${delay}ms 后重试...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                throw error;
            }
        }
    }
    throw new Error('All fetch attempts failed.');
}

export async function getAlbumCoverUrl(song: Song, size: number = 300): Promise<string> {
    if (!song.pic_id) {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTUiIGhlaWdodD0iNTUiIHZpZXdCb3g9IjAgMCA1NSA1NSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjU1IiBoZWlnaHQ9IjU1IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHJ4PSI4Ii8+CjxwYXRoIGQ9Ik0yNy41IDE4TDM1IDI3LjVIMzBWMzdIMjVWMjcuNUgyMEwyNy41IDE4WiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjMpIi8+Cjwvc3ZnPgo=';
    }
    try {
        const url = API_BASE.includes('meting')
            ? `${API_BASE}?server=${song.source}&type=pic&id=${song.pic_id}` // Meting API might not support size
            : `${API_BASE}?types=pic&source=${song.source}&id=${song.pic_id}&size=${size}`;
        const response = await fetchWithRetry(url);
        const data = await response.json();
        return data?.url || '';
    } catch (error) {
        console.error('获取专辑图失败:', error);
        return '';
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
        console.warn('URL验证失败:', error);
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

    console.log(`智能搜索替代版本: "${songName}" → "${cleanName}"`);

    try {
        const results = await searchMusicAPI(cleanName, source);
        if (results.length > 0) {
            console.log(`找到 ${results.length} 个替代版本`);
            return results;
        }
    } catch (error) {
        console.warn('搜索替代版本失败:', error);
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
    console.log('\n📊 ========== 音乐源统计报告 ==========');
    const stats = getSourceStatistics();

    stats.forEach(stat => {
        if (stat.total > 0) {
            console.log(`${stat.name.padEnd(12)} | 成功率: ${stat.rate}% | 成功/总计: ${stat.success}/${stat.total}`);
        } else {
            console.log(`${stat.name.padEnd(12)} | 暂无数据`);
        }
    });

    console.log('=======================================\n');
}

// 音乐源配置 - 按优先级排序
const MUSIC_SOURCES = [
    { id: 'netease', name: '网易云音乐', priority: 1 },
    { id: 'tencent', name: 'QQ音乐', priority: 2 },
    { id: 'kugou', name: '酷狗音乐', priority: 3 },
    { id: 'kuwo', name: '酷我音乐', priority: 4 },
    { id: 'xiami', name: '虾米音乐', priority: 5 },
    { id: 'baidu', name: '百度音乐', priority: 6 }
];

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

        // 定期输出统计信息
        if (stats.total % 10 === 0) {
            const rate = (stats.success / stats.total * 100).toFixed(1);
            console.log(`📊 ${sourceId} 成功率: ${rate}% (${stats.success}/${stats.total})`);
        }
    }
}

// 获取排序后的音乐源列表(根据成功率动态调整)
function getSortedSources(currentSource: string): string[] {
    const sources = MUSIC_SOURCES.map(s => s.id);

    // 当前音乐源优先
    const otherSources = sources.filter(s => s !== currentSource && s !== 'kuwo');

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

    for (const source of sourcesToTry) {
        try {
            console.log(`尝试从 ${source} 获取: ${song.name}`);

            // 如果不是原始音乐源,需要先搜索获取该源的歌曲ID
            let songIdForSource = song.id;
            if (source !== song.source) {
                // 先尝试精确匹配
                let searchResults = await searchMusicAPI(song.name, source);

                // 如果精确搜索失败,尝试智能搜索替代版本
                if (searchResults.length === 0) {
                    console.log(`精确搜索失败,尝试智能搜索替代版本...`);
                    searchResults = await searchAlternativeVersions(song.name, source);
                }

                if (searchResults.length === 0) {
                    console.warn(`${source} 未找到歌曲: ${song.name}`);
                    recordSourceResult(source, false); // 记录失败
                    continue;
                }

                // 匹配最相似的歌曲
                const matchedSong = searchResults.find(s =>
                    s.name === song.name || s.name.includes(song.name) || song.name.includes(s.name)
                ) || searchResults[0];
                songIdForSource = matchedSong.id;

                if (matchedSong.name !== song.name) {
                    console.log(`使用替代版本: "${matchedSong.name}"`);
                }
            }

            const url = API_BASE.includes('meting')
                ? `${API_BASE}?server=${source}&type=url&id=${songIdForSource}&br=${quality}`
                : `${API_BASE}?types=url&source=${source}&id=${songIdForSource}&br=${quality}`;

            const response = await fetchWithRetry(url, {}, 1); // 减少重试次数以加快切换
            const data = await response.json();

            if (data && data.url) {
                // 验证URL有效性
                const isValid = await validateSongUrl(data.url);
                if (!isValid) {
                    console.warn(`${source} 返回的URL无效`);
                    recordSourceResult(source, false); // 记录失败
                    continue;
                }

                // 记录成功
                recordSourceResult(source, true);

                if (source !== song.source) {
                    const sourceName = MUSIC_SOURCES.find(s => s.id === source)?.name || source;
                    console.log(`✅ 成功从备用音乐源 ${sourceName} 获取`);
                }
                return { ...data, usedSource: source };
            } else {
                recordSourceResult(source, false); // 记录失败
            }
        } catch (error) {
            console.warn(`${source} 获取失败:`, error);
            recordSourceResult(source, false); // 记录失败
            continue;
        }
    }

    const errorMsg = `所有音乐源均无法获取 - 歌曲: ${song.name}, 品质: ${quality}`;
    console.error(errorMsg);
    return { url: '', br: '', error: errorMsg };
}

export async function getSongUrl(song: Song, quality: string): Promise<{ url: string; br: string; error?: string; usedSource?: string }> {
    try {
        const url = API_BASE.includes('meting')
            ? `${API_BASE}?server=${song.source}&type=url&id=${song.id}&br=${quality}`
            : `${API_BASE}?types=url&source=${song.source}&id=${song.id}&br=${quality}`;
        const response = await fetchWithRetry(url);
        const data = await response.json();

        // 增强错误日志
        if (!data || !data.url) {
            const errorMsg = `音乐源返回空URL - 歌曲: ${song.name}, 品质: ${quality}, 音乐源: ${song.source}`;
            console.error(errorMsg, data);
            return { url: '', br: '', error: errorMsg };
        }

        return data;
    } catch (error) {
        const errorMsg = `API请求失败 - ${error instanceof Error ? error.message : String(error)}`;
        console.error(errorMsg, { song: song.name, quality, source: song.source });
        return { url: '', br: '', error: errorMsg };
    }
}

export async function getLyrics(song: Song): Promise<{ lyric: string }> {
    const url = API_BASE.includes('meting')
        ? `${API_BASE}?server=${song.source}&type=lyric&id=${song.lyric_id || song.id}`
        : `${API_BASE}?types=lyric&source=${song.source}&id=${song.lyric_id || song.id}`;
    const response = await fetchWithRetry(url);
    return await response.json();
}

export async function searchMusicAPI(keyword: string, source: string): Promise<Song[]> {
    const url = API_BASE.includes('meting')
        ? `${API_BASE}?server=${source}&type=search&id=${encodeURIComponent(keyword)}&count=30`
        : `${API_BASE}?types=search&source=${source}&name=${encodeURIComponent(keyword)}&count=30`;

    console.log('🔍 搜索 API 请求:', url);
    const response = await fetchWithRetry(url);
    const data = await response.json();
    console.log('📥 搜索 API 响应类型:', typeof data, '是否为数组:', Array.isArray(data));
    console.log('📥 搜索 API 响应内容:', JSON.stringify(data).substring(0, 500));

    // 处理不同的响应格式
    let songs: any[] = [];

    if (Array.isArray(data)) {
        console.log('✅ 响应格式: 直接数组');
        songs = data;
    } else if (data && typeof data === 'object') {
        // 尝试多种可能的字段名
        if (Array.isArray(data.data)) {
            console.log('✅ 响应格式: data 字段');
            songs = data.data;
        } else if (Array.isArray(data.songs)) {
            console.log('✅ 响应格式: songs 字段');
            songs = data.songs;
        } else if (Array.isArray(data.result)) {
            console.log('✅ 响应格式: result 字段');
            songs = data.result;
        } else if (Array.isArray(data.list)) {
            console.log('✅ 响应格式: list 字段');
            songs = data.list;
        } else {
            // 打印所有可用的键
            console.error('❌ 未找到歌曲数组，可用的键:', Object.keys(data));
            console.error('❌ 完整响应:', data);
            throw new Error(`API 返回数据格式不正确，可用字段: ${Object.keys(data).join(', ')}`);
        }
    } else {
        console.error('❌ 搜索 API 返回格式错误，既不是数组也不是对象:', data);
        throw new Error('API 返回数据格式不正确');
    }

    if (songs.length === 0) {
        console.warn('⚠️ API 返回空数组');
        return [];
    }

    console.log(`✅ 成功解析 ${songs.length} 首歌曲`);
    return songs.map((song: any) => ({ ...song, source: source }));
}

export async function exploreRadarAPI(): Promise<Song[]> {
    const keywords = ['热门', '流行', '新歌榜', '热门榜'];
    const randomKeyword = keywords[Math.floor(Math.random() * keywords.length)];
    const sources = ['netease', 'tencent'];
    const randomSource = sources[Math.floor(Math.random() * sources.length)];
    const url = API_BASE.includes('meting')
        ? `${API_BASE}?server=${randomSource}&type=search&id=${encodeURIComponent(randomKeyword)}&count=50`
        : `${API_BASE}?types=search&source=${randomSource}&name=${encodeURIComponent(randomKeyword)}&count=50`;

    console.log('🔍 探索雷达 API 请求:', url);
    const response = await fetchWithRetry(url);
    const data = await response.json();
    console.log('📥 探索雷达 API 响应类型:', typeof data, '是否为数组:', Array.isArray(data));
    console.log('📥 探索雷达 API 响应内容:', JSON.stringify(data).substring(0, 500));

    // 处理不同的响应格式
    let songs: any[] = [];

    if (Array.isArray(data)) {
        console.log('✅ 响应格式: 直接数组');
        songs = data;
    } else if (data && typeof data === 'object') {
        // 尝试多种可能的字段名
        if (Array.isArray(data.data)) {
            console.log('✅ 响应格式: data 字段');
            songs = data.data;
        } else if (Array.isArray(data.songs)) {
            console.log('✅ 响应格式: songs 字段');
            songs = data.songs;
        } else if (Array.isArray(data.result)) {
            console.log('✅ 响应格式: result 字段');
            songs = data.result;
        } else if (Array.isArray(data.list)) {
            console.log('✅ 响应格式: list 字段');
            songs = data.list;
        } else {
            // 打印所有可用的键
            console.error('❌ 未找到歌曲数组，可用的键:', Object.keys(data));
            console.error('❌ 完整响应:', data);
            throw new Error(`API 返回数据格式不正确，可用字段: ${Object.keys(data).join(', ')}`);
        }
    } else {
        console.error('❌ 探索雷达 API 返回格式错误，既不是数组也不是对象:', data);
        throw new Error('API 返回数据格式不正确');
    }

    if (songs.length === 0) {
        console.warn('⚠️ API 返回空数组');
        return [];
    }

    console.log(`✅ 成功解析 ${songs.length} 首歌曲`);
    return songs.map((song: any) => ({ ...song, source: randomSource }));
}

export async function parsePlaylistAPI(playlistUrlOrId: string): Promise<{ songs: Song[]; name?: string; count?: number }> {
    let playlistId = playlistUrlOrId.trim();

    console.log('开始解析歌单:', playlistUrlOrId);

    // 支持多种URL格式
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
                console.log('从URL提取歌单ID:', playlistId);
                break;
            }
        }

        if (!matched) {
            throw new Error('无法从URL中提取歌单ID，请检查链接格式');
        }
    } else if (!/^\d+$/.test(playlistId)) {
        throw new Error('歌单ID格式无效，请输入纯数字ID或完整链接');
    }

    console.log('请求歌单ID:', playlistId);
    const apiUrl = API_BASE.includes('meting')
        ? `${API_BASE}?server=netease&type=playlist&id=${playlistId}`
        : `${API_BASE}?types=playlist&source=netease&id=${playlistId}`;
    console.log('API请求地址:', apiUrl);

    try {
        const response = await fetchWithRetry(apiUrl);
        const playlistData = await response.json();

        console.log('API响应数据:', playlistData);
        console.log('数据类型:', typeof playlistData);
        console.log('是否为数组:', Array.isArray(playlistData));

        // 检查返回数据的有效性
        if (!playlistData) {
            throw new Error('API返回空数据');
        }

        // 处理API返回错误对象的情况
        if (playlistData.error || playlistData.msg) {
            throw new Error(playlistData.error || playlistData.msg || '未知API错误');
        }

        let songs: Song[] = [];
        let playlistName = '未命名歌单';

        // 兼容多种返回格式
        if (Array.isArray(playlistData)) {
            // 格式1: 直接返回歌曲数组
            songs = playlistData;
            console.log('检测到格式: 歌曲数组');
        } else if (playlistData.songs && Array.isArray(playlistData.songs)) {
            // 格式2: { songs: [...], name: '...', ... }
            songs = playlistData.songs;
            playlistName = playlistData.name || playlistName;
            console.log('检测到格式: 带有songs字段的对象');
        } else if (playlistData.data && Array.isArray(playlistData.data)) {
            // 格式3: { data: [...] }
            songs = playlistData.data;
            console.log('检测到格式: 带有data字段的对象');
        } else if (playlistData.playlist && playlistData.playlist.tracks) {
            // 格式4: 网易云API原始格式
            songs = playlistData.playlist.tracks;
            playlistName = playlistData.playlist.name || playlistName;
            console.log('检测到格式: 网易云原始API格式');
        } else {
            // 无法识别的格式，输出完整数据结构供调试
            console.error('无法识别的数据格式，完整数据:', JSON.stringify(playlistData, null, 2));
            throw new Error(`歌单数据格式不支持。请在控制台查看完整数据结构`);
        }

        if (!songs || songs.length === 0) {
            console.warn('⚠️ API返回空歌单，可能的原因:');
            console.warn('1. 歌单ID不存在或已被删除');
            console.warn('2. 歌单设置了隐私权限');
            console.warn('3. API服务限制或版权保护');
            console.warn('4. 网络问题导致数据获取不完整');
            console.warn('建议: 尝试使用其他公开歌单ID，如: 60198, 3778678, 2884035');
            throw new Error('歌单为空。建议尝试其他歌单ID，如: 60198');
        }

        // Ensure each song has the source property
        songs = songs.map((song: any) => ({
            ...song,
            source: 'netease'
        }));

        console.log(`✅ 成功解析歌单，共 ${songs.length} 首歌曲`);

        return {
            songs: songs,
            name: playlistName,
            count: songs.length
        };
    } catch (error) {
        console.error('歌单解析失败:', error);
        throw error;
    }
}
