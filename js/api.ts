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

// 1. Removed backup API sources
const API_SOURCES: ApiSource[] = [
    {
        name: '主 API',
        url: 'https://music-api.gdstudio.xyz/api.php'
    }
];

let API_BASE = API_SOURCES[0].url;

async function testAPI(apiUrl: string): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(`${apiUrl}?types=search&source=netease&name=test&count=1`, {
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
            console.log(`✅ ${api.name} 可用`);
            return { success: true, name: api.name };
        } else {
            console.log(`❌ ${api.name} 不可用`);
        }
    }
    console.error('所有 API 均不可用');
    return { success: false };
}

export async function fetchWithRetry(url: string, options: RequestInit = {}, retries: number = 2): Promise<Response> {
    for (let i = 0; i <= retries; i++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (response.ok) {
                return response;
            } else {
                throw new Error(`API returned error: ${response.status}`);
            }
        } catch (error) {
            console.error(`Request failed (attempt ${i + 1}/${retries + 1}):`, error);
            if (i === retries) throw error;
        }
    }
    throw new Error('All fetch attempts failed.');
}

export async function getAlbumCoverUrl(song: Song, size: number = 300): Promise<string> {
    if (!song.pic_id) {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTUiIGhlaWdodD0iNTUiIHZpZXdCb3g9IjAgMCA1NSA1NSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjU1IiBoZWlnaHQ9IjU1IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHJ4PSI4Ii8+CjxwYXRoIGQ9Ik0yNy41IDE4TDM1IDI3LjVIMzBWMzdIMjVWMjcuNUgyMEwyNy41IDE4WiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjMpIi8+Cjwvc3ZnPgo=';
    }
    try {
        const response = await fetchWithRetry(`${API_BASE}?types=pic&source=${song.source}&id=${song.pic_id}&size=${size}`);
        const data = await response.json();
        return data?.url || '';
    } catch (error) {
        console.error('获取专辑图失败:', error);
        return '';
    }
}

export async function getSongUrl(song: Song, quality: string): Promise<{ url: string; br: string }> {
    const response = await fetchWithRetry(`${API_BASE}?types=url&source=${song.source}&id=${song.id}&br=${quality}`);
    return await response.json();
}

export async function getLyrics(song: Song): Promise<{ lyric: string }> {
    const response = await fetchWithRetry(`${API_BASE}?types=lyric&source=${song.source}&id=${song.lyric_id || song.id}`);
    return await response.json();
}

export async function searchMusicAPI(keyword: string, source: string): Promise<Song[]> {
    const response = await fetchWithRetry(`${API_BASE}?types=search&source=${source}&name=${encodeURIComponent(keyword)}&count=30`);
    const data = await response.json();
    return data.map((song: any) => ({ ...song, source: source }));
}

export async function exploreRadarAPI(): Promise<Song[]> {
    const keywords = ['热门', '流行', '新歌榜', '热门榜'];
    const randomKeyword = keywords[Math.floor(Math.random() * keywords.length)];
    const sources = ['netease', 'tencent'];
    const randomSource = sources[Math.floor(Math.random() * sources.length)];
    const response = await fetchWithRetry(`${API_BASE}?types=search&source=${randomSource}&name=${encodeURIComponent(randomKeyword)}&count=50`);
    const data = await response.json();
    return data.map((song: any) => ({ ...song, source: randomSource }));
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
    const apiUrl = `${API_BASE}?types=playlist&source=netease&id=${playlistId}`;
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
