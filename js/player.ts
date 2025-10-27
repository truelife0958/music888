import * as api from './api.js';
import { Song } from './api.js';
import * as ui from './ui.js';
import { PLAYER_CONFIG, STORAGE_CONFIG, SOURCE_NAMES, QUALITY_NAMES, QUALITY_FALLBACK, DOWNLOAD_CONFIG, AVAILABLE_SOURCES } from './config.js';
import { generateSongFileName } from './utils.js';

// --- Player State ---
let currentPlaylist: Song[] = [];
let currentIndex: number = -1;
let isPlaying: boolean = false;
let audioPlayer: HTMLAudioElement = new Audio();
let playMode: 'loop' | 'random' | 'single' = 'loop';
let playHistory: number[] = [];
let historyPosition: number = -1;
let lastActiveContainer: string = 'searchResults';
let consecutiveFailures: number = 0; // 连续播放失败计数

// --- Playlist & Favorites State ---
let playlistStorage = new Map<string, any>();
let playlistCounter: number = 0;

// --- Play History State ---
let playHistorySongs: Song[] = []; // 播放历史歌曲列表

// --- Core Player Functions ---

export function getCurrentSong(): Song | null {
    return currentPlaylist[currentIndex] || null;
}

export async function playSong(index: number, playlist: Song[], containerId: string, fromHistory: boolean = false): Promise<void> {
    if (!playlist || index < 0 || index >= playlist.length) return;

    currentPlaylist = playlist;
    currentIndex = index;
    lastActiveContainer = containerId;
    const song = currentPlaylist[index];

    if (song.source === 'kuwo') {
        ui.showNotification('正在播放酷我音乐...', 'info');
    }

    if (!fromHistory) {
        if (historyPosition < playHistory.length - 1) {
            playHistory = playHistory.slice(0, historyPosition + 1);
        }
        playHistory.push(index);
        historyPosition = playHistory.length - 1;
    }

    const coverUrl = await api.getAlbumCoverUrl(song);
    ui.updateCurrentSongInfo(song, coverUrl);
    ui.updateActiveItem(currentIndex, containerId);
    updatePlayerFavoriteButton();

    try {
        ui.showNotification('正在加载音乐...', 'info');

        // 品质降级队列：按优先级尝试
        const qualitySelect = document.getElementById('qualitySelect') as HTMLSelectElement;
        const preferredQuality = qualitySelect.value;

        // 确保首选品质在队列首位
        const qualityQueue = [preferredQuality, ...QUALITY_FALLBACK.filter(q => q !== preferredQuality)];

        let urlData: { url: string; br: string; error?: string; usedSource?: string } | null = null;
        let successQuality = '';
        let lastError = '';
        let usedFallback = false;

        // 依次尝试各个品质
        for (const quality of qualityQueue) {
            try {
                // 先尝试原始音乐源
                let result = await api.getSongUrl(song, quality);

                // 如果原始源失败,尝试多音乐源切换
                if (!result || !result.url) {
                    console.log(`原始音乐源失败,尝试多音乐源获取...`);
                    result = await api.getSongUrlWithFallback(song, quality);
                    if (result && result.url && result.usedSource !== song.source) {
                        usedFallback = true;
                    }
                }

                if (result && result.url) {
                    urlData = result;
                    successQuality = quality;
                    api.resetApiFailureCount(); // 成功时重置API失败计数
                    break;
                } else if (result && result.error) {
                    lastError = result.error;
                }
            } catch (err) {
                console.warn(`获取品质 ${quality} 失败:`, err);
                lastError = err instanceof Error ? err.message : String(err);
                continue;
            }
        }

        if (urlData && urlData.url) {
            // 播放成功,重置连续失败计数
            consecutiveFailures = 0;

            // 提示音乐源切换信息
            if (usedFallback && urlData.usedSource) {
                ui.showNotification(
                    `已从备用音乐源 ${SOURCE_NAMES[urlData.usedSource] || urlData.usedSource} 获取`,
                    'success'
                );
            }

            // 提示品质降级信息
            if (successQuality !== preferredQuality) {
                ui.showNotification(
                    `原品质不可用，已自动切换到 ${QUALITY_NAMES[successQuality] || successQuality}`,
                    'warning'
                );
            }

            // Bilibili 音乐源使用代理服务
            if (song.source === 'bilibili') {
                // 优先使用代理服务，支持范围请求和流式播放
                const proxyUrl = `/api/bilibili-proxy?url=${encodeURIComponent(urlData.url)}`;
                audioPlayer.src = proxyUrl;
                console.log('🎵 使用 Bilibili 代理服务:', proxyUrl);
            } else {
                audioPlayer.src = urlData.url.replace(/^http:/, 'https:');
            }
            audioPlayer.load();

            // 添加到播放历史
            addToPlayHistory(song);

            const lyricsData = await api.getLyrics(song);
            const lyrics = lyricsData.lyric ? parseLyrics(lyricsData.lyric) : [];
            ui.updateLyrics(lyrics, 0);

            // 触发播放事件（用于 Wake Lock 和 Media Session）
            window.dispatchEvent(new CustomEvent('songPlaying', {
                detail: { song, coverUrl }
            }));

            try {
                await audioPlayer.play();
            } catch (error) {
                console.error('Playback failed:', error);
                ui.showNotification('播放失败，请点击页面以允许自动播放', 'warning');
                // We don't automatically skip to the next song here,
                // as it might be an autoplay issue that requires user interaction.
                isPlaying = false;
                ui.updatePlayButton(false);
            }
        } else {
            // 播放失败,增加连续失败计数
            consecutiveFailures++;
            console.error('所有品质尝试均失败:', song, `连续失败: ${consecutiveFailures}/${PLAYER_CONFIG.MAX_CONSECUTIVE_FAILURES}`);

            // 触发API失败处理(可能切换API)
            await api.handleApiFailure();

            // 构建详细错误信息
            let errorMsg = `无法获取音乐链接 (${song.name})`;
            if (lastError.includes('版权') || lastError.includes('copyright')) {
                errorMsg += ' - 版权保护';
            } else if (lastError.includes('空URL')) {
                errorMsg += ' - 音乐源无此资源';
            } else if (lastError.includes('timeout') || lastError.includes('超时')) {
                errorMsg += ' - 网络超时';
            }

            // 检查是否达到连续失败阈值
            if (consecutiveFailures >= PLAYER_CONFIG.MAX_CONSECUTIVE_FAILURES) {
                ui.showNotification(
                    `连续失败${consecutiveFailures}首，已暂停播放。建议检查网络或更换歌单`,
                    'error'
                );
                consecutiveFailures = 0; // 重置计数
                isPlaying = false;
                ui.updatePlayButton(false);
                return; // 停止自动播放
            }

            ui.showNotification(`${errorMsg}，将尝试下一首 (${consecutiveFailures}/${PLAYER_CONFIG.MAX_CONSECUTIVE_FAILURES})`, 'error');
            setTimeout(() => nextSong(), PLAYER_CONFIG.RETRY_DELAY);
        }
    } catch (error) {
        consecutiveFailures++;
        console.error('Error playing song:', error, `连续失败: ${consecutiveFailures}/${PLAYER_CONFIG.MAX_CONSECUTIVE_FAILURES}`);

        if (consecutiveFailures >= PLAYER_CONFIG.MAX_CONSECUTIVE_FAILURES) {
            ui.showNotification(
                `连续失败${consecutiveFailures}首，已暂停播放。建议检查网络或更换歌单`,
                'error'
            );
            consecutiveFailures = 0;
            isPlaying = false;
            ui.updatePlayButton(false);
            return;
        }

        ui.showNotification(`播放失败，将尝试下一首 (${consecutiveFailures}/${PLAYER_CONFIG.MAX_CONSECUTIVE_FAILURES})`, 'error');
        setTimeout(() => nextSong(), PLAYER_CONFIG.RETRY_DELAY);
    }
}

export function nextSong(): void {
    if (currentPlaylist.length === 0) return;

    let newIndex: number;
    if (playMode === 'random') {
        newIndex = Math.floor(Math.random() * currentPlaylist.length);
    } else {
        newIndex = (currentIndex + 1) % currentPlaylist.length;
    }

    // 检查是否应该尝试切换音乐源而不是直接播放下一首
    if (consecutiveFailures >= PLAYER_CONFIG.SOURCE_SWITCH_THRESHOLD) {
        console.log(`连续失败${consecutiveFailures}次，尝试切换音乐源...`);

        // 尝试找到同一首歌的其他源
        const currentSong = currentPlaylist[currentIndex];
        const alternativeSources = getAlternativeSources(currentSong);

        if (alternativeSources.length > 0) {
            // 优先尝试同一首歌的不同源
            const alternativeSong = alternativeSources[0];
            const tempPlaylist = [alternativeSong];
            playSong(0, tempPlaylist, lastActiveContainer);
            consecutiveFailures = 0; // 重置失败计数
            return;
        }
    }

    playSong(newIndex, currentPlaylist, lastActiveContainer);
}

export function previousSong(): void {
    if (playHistory.length > 1 && historyPosition > 0) {
        historyPosition--;
        playSong(playHistory[historyPosition], currentPlaylist, lastActiveContainer, true);
    } else {
        if (currentPlaylist.length === 0) return;
        const newIndex = (currentIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
        playSong(newIndex, currentPlaylist, lastActiveContainer);
    }
}

export function togglePlay(): void {
    if (!audioPlayer.src) return;
    if (isPlaying) {
        audioPlayer.pause();
        window.dispatchEvent(new Event('songPaused'));
    } else {
        audioPlayer.play();
        window.dispatchEvent(new Event('songPlaying'));
    }
}

export function setVolume(value: string): void {
    audioPlayer.volume = parseInt(value, 10) / 100;
}

export function seekTo(event: MouseEvent): void {
    if (!audioPlayer.duration) return;
    const progressBar = event.currentTarget as HTMLElement;
    const clickPosition = (event.clientX - progressBar.getBoundingClientRect().left) / progressBar.offsetWidth;
    audioPlayer.currentTime = clickPosition * audioPlayer.duration;
}

export function togglePlayMode(): void {
    const modes: ('loop' | 'random' | 'single')[] = ['loop', 'random', 'single'];
    const modeIcons = { 'loop': 'fas fa-repeat', 'random': 'fas fa-random', 'single': 'fas fa-redo' };
    const modeTitles = { 'loop': '列表循环', 'random': '随机播放', 'single': '单曲循环' };
    
    const currentModeIndex = modes.indexOf(playMode);
    playMode = modes[(currentModeIndex + 1) % modes.length];
    
    const btn = document.getElementById('playModeBtn')!;
    btn.querySelector('i')!.className = modeIcons[playMode];
    btn.title = modeTitles[playMode];
    ui.showNotification(`切换到${modeTitles[playMode]}`, 'info');
}

export function downloadSongByData(song: Song | null): void {
    if (!song) return;
    ui.showNotification(`开始下载: ${song.name}`, 'info');
    api.getSongUrl(song, '999').then(urlData => {
        if (urlData && urlData.url) {
            fetch(urlData.url)
                .then(res => res.blob())
                .then(blob => {
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = generateSongFileName(song);
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(a.href);
                    ui.showNotification(`下载完成: ${song.name}`, 'success');
                });
        }
    });
}

export function downloadLyricByData(song: Song | null): void {
    if (!song) return;
    ui.showNotification(`开始下载歌词: ${song.name}`, 'info');
    api.getLyrics(song).then(lyricData => {
        if (lyricData && lyricData.lyric) {
            const blob = new Blob([lyricData.lyric], { type: 'text/plain;charset=utf-8' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = generateSongFileName(song, '.lrc');
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(a.href);
            ui.showNotification(`歌词下载完成: ${song.name}`, 'success');
        }
    });
}

export function loadSavedPlaylists(): void {
    try {
        const saved = localStorage.getItem(STORAGE_CONFIG.KEY_PLAYLISTS);
        if (saved) {
            const data = JSON.parse(saved);
            playlistStorage = new Map(data.playlists || []);
            playlistCounter = data.counter || 0;
        }
        initializeFavoritesPlaylist();

        //加载播放历史
        const savedHistory = localStorage.getItem(STORAGE_CONFIG.KEY_HISTORY);
        if (savedHistory) {
            playHistorySongs = JSON.parse(savedHistory);
        }
    } catch (error) {
        console.error('加载我的歌单失败:', error);
    }
}

// 添加歌曲到播放历史
function addToPlayHistory(song: Song): void {
    // 移除重复的歌曲
    playHistorySongs = playHistorySongs.filter(
        s => !(s.id === song.id && s.source === song.source)
    );

    // 添加到历史开头
    playHistorySongs.unshift(song);

    // 限制历史记录数量
    if (playHistorySongs.length > PLAYER_CONFIG.MAX_HISTORY_SIZE) {
        playHistorySongs = playHistorySongs.slice(0, PLAYER_CONFIG.MAX_HISTORY_SIZE);
    }

    // 保存到localStorage
    try {
        localStorage.setItem(STORAGE_CONFIG.KEY_HISTORY, JSON.stringify(playHistorySongs));
    } catch (error) {
        console.error('保存播放历史失败:', error);
    }
}

// 获取播放历史
export function getPlayHistory(): Song[] {
    return playHistorySongs;
}

// 清空播放历史
export function clearPlayHistory(): void {
    playHistorySongs = [];
    localStorage.removeItem(STORAGE_CONFIG.KEY_HISTORY);
}

// 获取收藏歌曲列表
export function getFavoriteSongs(): Song[] {
    const key = getFavoritesPlaylistKey();
    if (!key) return [];
    const favorites = playlistStorage.get(key);
    return favorites?.songs || [];
}

// 清空收藏列表
export function clearFavorites(): void {
    const key = getFavoritesPlaylistKey();
    if (!key) return;
    const favorites = playlistStorage.get(key);
    if (favorites) {
        favorites.songs = [];
        savePlaylistsToStorage();
    }
}

function initializeFavoritesPlaylist(): void {
    if (!getFavoritesPlaylistKey()) {
        playlistCounter++;
        const newKey = `playlist_${playlistCounter}`;
        playlistStorage.set(newKey, {
            name: "我的喜欢",
            songs: [],
            id: "favorites",
            createTime: new Date().toISOString(),
            isFavorites: true
        });
        savePlaylistsToStorage();
    }
}

function getFavoritesPlaylistKey(): string | null {
    for (let [key, playlist] of playlistStorage.entries()) {
        if (playlist.isFavorites) return key;
    }
    return null;
}

export function isSongInFavorites(song: Song): boolean {
    const key = getFavoritesPlaylistKey();
    if (!key) return false;
    const favorites = playlistStorage.get(key);
    return favorites.songs.some((favSong: Song) => favSong.id === song.id && favSong.source === song.source);
}

export function toggleFavoriteButton(song: Song): void {
    const key = getFavoritesPlaylistKey();
    if (!key) return;

    const favorites = playlistStorage.get(key);
    const songIndex = favorites.songs.findIndex((favSong: Song) => favSong.id === song.id && favSong.source === song.source);

    if (songIndex > -1) {
        favorites.songs.splice(songIndex, 1);
        ui.showNotification(`已从"我的喜欢"中移除`, 'success');
    } else {
        favorites.songs.unshift(song);
        ui.showNotification(`已添加到"我的喜欢"`, 'success');
    }

    savePlaylistsToStorage();
    updatePlayerFavoriteButton();

    // 触发全局事件,通知main.ts更新显示
    window.dispatchEvent(new CustomEvent('favoritesUpdated'));
}

function updatePlayerFavoriteButton(): void {
    const song = getCurrentSong();
    const btn = document.getElementById('playerFavoriteBtn');
    if (!song || !btn) return;
    
    const icon = btn.querySelector('i')!;
    if (isSongInFavorites(song)) {
        icon.className = 'fas fa-heart';
        icon.style.color = '#ff6b6b';
    } else {
        icon.className = 'far fa-heart';
        icon.style.color = '';
    }
}

// 获取同一首歌的其他音乐源版本
function getAlternativeSources(originalSong: Song): Song[] {
    const alternativeSources: Song[] = [];

    // 排除当前源和已知的坏源（kuwo源暂不支持）
    const sourcesToTry = (AVAILABLE_SOURCES as readonly string[]).filter(source =>
        source !== originalSong.source
    ) as string[];

    for (const source of sourcesToTry) {
        // 在实际应用中，这里应该调用相应的API搜索相同的歌曲
        // 由于我们没有跨源搜索功能，这里只是示例框架
        // 可以考虑在用户同意时用相似的歌曲名和艺术家搜索

        // 创建一个替代歌曲对象（实际使用时需要通过API搜索获取）
        const alternativeSong: any = {
            ...originalSong,
            source: source,
            // 可以在这里添加标识，表示这是替代源
            _isAlternativeSource: true
        };

        alternativeSources.push(alternativeSong);
    }

    return alternativeSources;
}

// 保存歌单到本地存储
function savePlaylistsToStorage(): void {
    try {
        const playlistsData = {
            playlists: Array.from(playlistStorage.entries()),
            counter: playlistCounter
        };
        localStorage.setItem(STORAGE_CONFIG.KEY_PLAYLISTS, JSON.stringify(playlistsData));
    } catch (error) {
        console.error('保存歌单失败:', error);
    }
}

audioPlayer.addEventListener('play', () => {
    isPlaying = true;
    ui.updatePlayButton(true);
    document.getElementById('currentCover')?.classList.add('playing');
});

audioPlayer.addEventListener('pause', () => {
    isPlaying = false;
    ui.updatePlayButton(false);
    document.getElementById('currentCover')?.classList.remove('playing');
});

audioPlayer.addEventListener('ended', () => {
    if (playMode === 'single') {
        playSong(currentIndex, currentPlaylist, lastActiveContainer);
    } else {
        nextSong();
    }
});

audioPlayer.addEventListener('timeupdate', () => {
    if (audioPlayer.duration) {
        ui.updateProgress(audioPlayer.currentTime, audioPlayer.duration);
    }
});

audioPlayer.addEventListener('loadedmetadata', () => {
    if (audioPlayer.duration) {
        ui.updateProgress(audioPlayer.currentTime, audioPlayer.duration);
    }
});

interface LyricLine {
    time: number;
    text: string;
}

function parseLyrics(lrc: string): LyricLine[] {
    const lines = lrc.split('\n');
    const result: LyricLine[] = [];
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
    for (const line of lines) {
        const match = line.match(timeRegex);
        if (match) {
            const time = parseInt(match[1]) * 60 + parseInt(match[2]) + parseInt(match[3]) / 1000;
            const text = line.replace(timeRegex, '').trim();
            if (text) result.push({ time, text });
        }
    }
    return result;
}

// ========== 播放列表管理增强 ==========

// 获取当前播放列表
export function getCurrentPlaylist(): Song[] {
    return currentPlaylist;
}

// 获取当前播放索引
export function getCurrentIndex(): number {
    return currentIndex;
}

// 从播放列表播放指定索引的歌曲
export function playSongFromPlaylist(index: number): void {
    if (index >= 0 && index < currentPlaylist.length) {
        playSong(index, currentPlaylist, lastActiveContainer);
    }
}

// 从播放列表移除歌曲
export function removeFromPlaylist(index: number): void {
    if (index < 0 || index >= currentPlaylist.length) return;

    currentPlaylist.splice(index, 1);

    // 调整当前播放索引
    if (currentIndex > index) {
        currentIndex--;
    } else if (currentIndex === index) {
        // 如果删除的是当前播放的歌曲
        if (currentIndex >= currentPlaylist.length) {
            currentIndex = currentPlaylist.length - 1;
        }
        // 可以选择自动播放下一首或停止
        if (currentPlaylist.length > 0 && currentIndex >= 0) {
            playSong(currentIndex, currentPlaylist, lastActiveContainer);
        } else {
            // 播放列表为空，停止播放
            audioPlayer.pause();
        }
    }

    ui.showNotification('已从播放列表移除', 'info');
}

// 清空播放列表
export function clearPlaylist(): void {
    currentPlaylist = [];
    currentIndex = -1;
    audioPlayer.pause();
    audioPlayer.src = '';
    ui.showNotification('播放列表已清空', 'info');
}

// 添加歌曲到当前播放列表
export function addToCurrentPlaylist(songs: Song[]): void {
    currentPlaylist.push(...songs);
    ui.showNotification(`已添加 ${songs.length} 首歌曲到播放列表`, 'success');
}

// 保存当前播放列表为歌单
export function saveCurrentPlaylistAs(playlistName: string): void {
    if (currentPlaylist.length === 0) {
        ui.showNotification('播放列表为空', 'warning');
        return;
    }

    const savedPlaylists = JSON.parse(localStorage.getItem('savedPlaylists') || '[]');
    const newPlaylist = {
        name: playlistName,
        songs: currentPlaylist,
        createdAt: Date.now()
    };

    savedPlaylists.push(newPlaylist);
    localStorage.setItem('savedPlaylists', JSON.stringify(savedPlaylists));

    ui.showNotification(`歌单"${playlistName}"保存成功`, 'success');

    // 触发歌单更新事件
    window.dispatchEvent(new Event('playlistsUpdated'));
}

// ========== 批量操作功能 ==========

// 批量添加到收藏
export function addMultipleToFavorites(songs: Song[]): void {
    const favoriteSongs = getFavoriteSongs();
    let addedCount = 0;

    songs.forEach(song => {
        const exists = favoriteSongs.some(fav =>
            fav.id === song.id && fav.source === song.source
        );
        if (!exists) {
            favoriteSongs.push(song);
            addedCount++;
        }
    });

    if (addedCount > 0) {
        localStorage.setItem('favoriteSongs', JSON.stringify(favoriteSongs));
        ui.showNotification(`成功添加 ${addedCount} 首歌曲到收藏`, 'success');
        window.dispatchEvent(new Event('favoritesUpdated'));
    } else {
        ui.showNotification('所选歌曲已在收藏中', 'info');
    }
}

// 批量下载歌曲
export async function downloadMultipleSongs(songs: Song[]): Promise<void> {
    const qualitySelect = document.getElementById('qualitySelect') as HTMLSelectElement;
    const quality = qualitySelect ? qualitySelect.value : '320';

    ui.showNotification(`开始下载 ${songs.length} 首歌曲...`, 'info');

    for (let i = 0; i < songs.length; i += DOWNLOAD_CONFIG.BATCH_SIZE) {
        const batch = songs.slice(i, i + DOWNLOAD_CONFIG.BATCH_SIZE);

        await Promise.all(batch.map(async (song) => {
            try {
                const urlData = await api.getSongUrl(song, quality);
                if (urlData && urlData.url) {
                    const response = await fetch(urlData.url);
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = generateSongFileName(song);
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                }
            } catch (error) {
                console.error(`下载失败: ${song.name}`, error);
            }
        }));

        // 显示进度
        const downloaded = Math.min(i + DOWNLOAD_CONFIG.BATCH_SIZE, songs.length);
        ui.showNotification(`下载进度: ${downloaded}/${songs.length}`, 'info');

        // 批次间延迟，避免请求过快
        if (i + DOWNLOAD_CONFIG.BATCH_SIZE < songs.length) {
            await new Promise(resolve => setTimeout(resolve, DOWNLOAD_CONFIG.BATCH_DELAY));
        }
    }

    ui.showNotification('所有歌曲下载完成', 'success');
}

// 初始化时保存歌单到本地存储
loadSavedPlaylists();


