import * as api from './api.js';
import { Song } from './api.js';
import * as ui from './ui.js';

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
const MAX_CONSECUTIVE_FAILURES = 5; // 最大连续失败次数

// --- Playlist & Favorites State ---
let playlistStorage = new Map<string, any>();
let playlistCounter: number = 0;

// --- Play History State ---
let playHistorySongs: Song[] = []; // 播放历史歌曲列表
const MAX_HISTORY_SIZE = 50; // 最多保存50首历史记录

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
        ui.showNotification('酷我音乐源暂不支持，跳到下一首', 'warning');
        setTimeout(() => nextSong(), 500);
        return;
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
        const qualityFallback = ['999', '740', '320', '192', '128'];

        // 确保首选品质在队列首位
        const qualityQueue = [preferredQuality, ...qualityFallback.filter(q => q !== preferredQuality)];

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
                const sourceNames: { [key: string]: string } = {
                    'netease': '网易云音乐',
                    'tencent': 'QQ音乐',
                    'kugou': '酷狗音乐',
                    'kuwo': '酷我音乐',
                    'xiami': '虾米音乐',
                    'baidu': '百度音乐'
                };
                ui.showNotification(
                    `已从备用音乐源 ${sourceNames[urlData.usedSource] || urlData.usedSource} 获取`,
                    'success'
                );
            }

            // 提示品质降级信息
            if (successQuality !== preferredQuality) {
                const qualityNames: { [key: string]: string } = {
                    '128': '标准 128K',
                    '192': '较高 192K',
                    '320': '高品质 320K',
                    '740': '无损 FLAC',
                    '999': 'Hi-Res'
                };
                ui.showNotification(
                    `原品质不可用，已自动切换到 ${qualityNames[successQuality] || successQuality}`,
                    'warning'
                );
            }

            audioPlayer.src = urlData.url.replace(/^http:/, 'https:');
            audioPlayer.load();

            // 添加到播放历史
            addToPlayHistory(song);

            const lyricsData = await api.getLyrics(song);
            const lyrics = lyricsData.lyric ? parseLyrics(lyricsData.lyric) : [];
            ui.updateLyrics(lyrics, 0);

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
            console.error('所有品质尝试均失败:', song, `连续失败: ${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}`);

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
            if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
                ui.showNotification(
                    `连续失败${consecutiveFailures}首，已暂停播放。建议检查网络或更换歌单`,
                    'error'
                );
                consecutiveFailures = 0; // 重置计数
                isPlaying = false;
                ui.updatePlayButton(false);
                return; // 停止自动播放
            }

            ui.showNotification(`${errorMsg}，将尝试下一首 (${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES})`, 'error');
            setTimeout(() => nextSong(), 1500);
        }
    } catch (error) {
        consecutiveFailures++;
        console.error('Error playing song:', error, `连续失败: ${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}`);

        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            ui.showNotification(
                `连续失败${consecutiveFailures}首，已暂停播放。建议检查网络或更换歌单`,
                'error'
            );
            consecutiveFailures = 0;
            isPlaying = false;
            ui.updatePlayButton(false);
            return;
        }

        ui.showNotification(`播放失败，将尝试下一首 (${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES})`, 'error');
        setTimeout(() => nextSong(), 1500);
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
    } else {
        audioPlayer.play();
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
                    a.download = `${song.name} - ${Array.isArray(song.artist) ? song.artist.join(',') : song.artist}.mp3`;
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
            a.download = `${song.name} - ${Array.isArray(song.artist) ? song.artist.join(',') : song.artist}.lrc`;
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
        const saved = localStorage.getItem('musicPlayerPlaylists');
        if (saved) {
            const data = JSON.parse(saved);
            playlistStorage = new Map(data.playlists || []);
            playlistCounter = data.counter || 0;
        }
        initializeFavoritesPlaylist();

        //加载播放历史
        const savedHistory = localStorage.getItem('musicPlayerHistory');
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
    if (playHistorySongs.length > MAX_HISTORY_SIZE) {
        playHistorySongs = playHistorySongs.slice(0, MAX_HISTORY_SIZE);
    }

    // 保存到localStorage
    try {
        localStorage.setItem('musicPlayerHistory', JSON.stringify(playHistorySongs));
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
    localStorage.removeItem('musicPlayerHistory');
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

function savePlaylistsToStorage(): void {
    try {
        const data = {
            playlists: Array.from(playlistStorage.entries()),
            counter: playlistCounter
        };
        localStorage.setItem('musicPlayerPlaylists', JSON.stringify(data));
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
