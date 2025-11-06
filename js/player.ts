import * as api from './api.js';
import { Song } from './api.js';
import * as ui from './ui.js';
import { PLAYER_CONFIG, STORAGE_CONFIG, SOURCE_NAMES, QUALITY_NAMES, QUALITY_FALLBACK, DOWNLOAD_CONFIG, AVAILABLE_SOURCES } from './config.js';
import { generateSongFileName } from './utils.js';
import { LyricLine } from './types.js';
import { recordPlay } from './play-stats.js';
import { startDownloadWithProgress } from './download-progress.js';
import lyricsWorkerManager from './lyrics-worker-manager.js';

// --- Player State ---
let currentPlaylist: Song[] = [];
let currentIndex: number = -1;
let isPlaying: boolean = false;
// 老王修复：音频播放器引用，在init时初始化
let audioPlayer: HTMLAudioElement;
let playMode: 'loop' | 'random' | 'single' = 'loop';
let playHistory: number[] = [];
let historyPosition: number = -1;
let lastActiveContainer: string = 'searchResults';
let consecutiveFailures: number = 0; // 连续播放失败计数
let currentLyrics: LyricLine[] = []; // 存储当前歌曲的歌词
let playStartTime: number = 0; // 记录播放开始时间
let lastRecordedSong: Song | null = null; // 上一首记录统计的歌曲

// 事件监听器管理 - 防止内存泄漏
interface EventListenerRecord {
    element: HTMLElement | Window | Document;
    event: string;
    handler: EventListener;
}
let eventListeners: EventListenerRecord[] = [];

// 添加事件监听器并记录
function addManagedEventListener(
    element: HTMLElement | Window | Document,
    event: string,
    handler: EventListener
): void {
    element.addEventListener(event, handler);
    eventListeners.push({ element, event, handler });
}

// 清理所有事件监听器
export function cleanup(): void {
    console.log('🧹 清理播放器事件监听器...');
    
    // 移除所有记录的事件监听器
    eventListeners.forEach(({ element, event, handler }) => {
        element.removeEventListener(event, handler);
    });
    eventListeners = [];
    
    // 清理音频播放器
    if (audioPlayer) {
        audioPlayer.pause();
        audioPlayer.src = '';
    }
    
    console.log('✅ 播放器清理完成');
}

// 老王修复：初始化播放器，确保获取到HTML中的audio元素并绑定事件
function initAudioPlayer(): void {
    const audioElement = document.getElementById('audioPlayer') as HTMLAudioElement;
    if (!audioElement) {
        console.error('❌ 找不到audio元素，创建新的audio元素');
        audioPlayer = new Audio();
        audioPlayer.id = 'audioPlayer';
        document.body.appendChild(audioPlayer);
    } else {
        audioPlayer = audioElement;
        console.log('✅ 成功获取页面中的audio元素');
    }

    // 老王修复：在audioPlayer初始化后绑定事件监听器
    const playHandler = () => {
        console.log('🎵 播放事件触发');
        isPlaying = true;
        ui.updatePlayButton(true);
        document.getElementById('currentCover')?.classList.add('playing');
    };
    addManagedEventListener(audioPlayer as any, 'play', playHandler);

    const pauseHandler = () => {
        console.log('⏸️ 暂停事件触发');
        isPlaying = false;
        ui.updatePlayButton(false);
        document.getElementById('currentCover')?.classList.remove('playing');
    };
    addManagedEventListener(audioPlayer as any, 'pause', pauseHandler);
    
    // 修复: 添加 playing 事件监听，确保状态同步
    const playingHandler = () => {
        console.log('▶️ playing 事件触发（实际开始播放）');
        isPlaying = true;
        ui.updatePlayButton(true);
        document.getElementById('currentCover')?.classList.add('playing');
    };
    addManagedEventListener(audioPlayer as any, 'playing', playingHandler);
    
    // 修复: 添加 waiting 事件监听，显示缓冲状态
    const waitingHandler = () => {
        console.log('⏳ 缓冲中...');
    };
    addManagedEventListener(audioPlayer as any, 'waiting', waitingHandler);
    
    // 修复: 添加 canplay 事件监听
    const canplayHandler = () => {
        console.log('✅ 音频可以播放');
    };
    addManagedEventListener(audioPlayer as any, 'canplay', canplayHandler);

    const endedHandler = () => {
        // 记录播放统计
        recordPlayStats();
        
        if (playMode === 'single') {
            playSong(currentIndex, currentPlaylist, lastActiveContainer);
        } else {
            nextSong();
        }
    };
    addManagedEventListener(audioPlayer as any, 'ended', endedHandler);

    const timeupdateHandler = () => {
        if (!audioPlayer.duration) return;

        const currentTime = audioPlayer.currentTime;
        const duration = audioPlayer.duration;

        // 老王修复：ui模块只导出updateProgress函数，同时更新进度条和时间
        ui.updateProgress(currentTime, duration);

        // 老王修复：更新歌词高亮，使用ui模块的方法
        if (currentLyrics.length > 0) {
            ui.updateLyrics(currentLyrics, currentTime);
        }
    };
    addManagedEventListener(audioPlayer as any, 'timeupdate', timeupdateHandler);

    const errorHandler = (e: Event) => {
        console.error('播放器错误:', e);
        ui.showNotification('播放失败，尝试下一首...', 'error');

        consecutiveFailures++;
        if (consecutiveFailures < 3) {
            setTimeout(() => nextSong(), 1000);
        } else {
            ui.showNotification('连续播放失败，请检查网络连接', 'error');
            consecutiveFailures = 0;
        }
    };
    addManagedEventListener(audioPlayer as any, 'error', errorHandler as EventListener);
}

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

        // 老王修复BUG-PLAYER-001：品质选择器可能不存在
        const qualitySelect = document.getElementById('qualitySelect') as HTMLSelectElement;
        const preferredQuality = qualitySelect ? qualitySelect.value : '320';

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

                // 如果原始源失败,尝试下一个品质
                if (result && result.url) {
                    urlData = result;
                    successQuality = quality;
                    break;
                } else if (result && result.error) {
                    lastError = result.error;
                }
            } catch (err) {
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

            // 老王修复BUG-PLAYER-002：下载按钮可能不存在
            const downloadSongBtn = document.getElementById('downloadSongBtn') as HTMLButtonElement;
            const downloadLyricBtn = document.getElementById('downloadLyricBtn') as HTMLButtonElement;
            if (downloadSongBtn) {
                downloadSongBtn.disabled = false;
            } else {
                console.warn('⚠️ 下载歌曲按钮未找到');
            }
            if (downloadLyricBtn) {
                downloadLyricBtn.disabled = false;
            } else {
                console.warn('⚠️ 下载歌词按钮未找到');
            }

            // Bilibili 音乐源使用代理服务
            if (song.source === 'bilibili') {
                // 优先使用代理服务，支持范围请求和流式播放
                const proxyUrl = `/api/bilibili-proxy?url=${encodeURIComponent(urlData.url)}`;
                audioPlayer.src = proxyUrl;
                            } else {
                audioPlayer.src = urlData.url.replace(/^http:/, 'https:');
            }
            audioPlayer.load();

            // 添加到播放历史
            addToPlayHistory(song);

            const lyricsData = await api.getLyrics(song);
            console.log('🎵 [歌词] API返回数据:', { hasLyric: !!lyricsData?.lyric, length: lyricsData?.lyric?.length });

            // 优化: 使用 Web Worker 解析歌词，避免阻塞主线程
            const lyrics = lyricsData.lyric
                ? await lyricsWorkerManager.parseLyric(lyricsData.lyric)
                : [];
            console.log('📝 [歌词] 解析结果:', { count: lyrics.length, sample: lyrics[0] });

            currentLyrics = lyrics; // 保存当前歌词
            ui.updateLyrics(lyrics, 0);
            console.log('✅ [歌词] 已调用ui.updateLyrics');

            // 触发播放事件（用于 Wake Lock 和 Media Session）
            window.dispatchEvent(new CustomEvent('songPlaying', {
                detail: { song, coverUrl }
            }));

            try {
                const playPromise = audioPlayer.play();
                
                // 修复: 确保 play() Promise 被正确处理
                if (playPromise !== undefined) {
                    await playPromise;
                    // 记录播放开始时间
                    playStartTime = Date.now();
                    lastRecordedSong = song;
                    // 修复: 显式更新状态
                    isPlaying = true;
                    ui.updatePlayButton(true);
                }
            } catch (error) {
                console.error('播放失败:', error);
                ui.showNotification('播放失败，请点击页面以允许自动播放', 'warning');
                // 修复: 确保状态正确更新
                isPlaying = false;
                ui.updatePlayButton(false);
                document.getElementById('currentCover')?.classList.remove('playing');
            }
        } else {
            // 播放失败,增加连续失败计数
            consecutiveFailures++;

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
        // 尝试找到同一首歌的其他源
        const currentSong = currentPlaylist[currentIndex];
        const alternativeSources = getAlternativeSources(currentSong);

        if (alternativeSources.length > 0) {
            // 优先尝试同一首歌的不同源
            const alternativeSong = alternativeSources[0];
            const tempPlaylist = [alternativeSong];
            // 减少失败计数，但不完全重置，避免无限循环
            consecutiveFailures = Math.max(0, consecutiveFailures - 1);
            playSong(0, tempPlaylist, lastActiveContainer);
            return;
        } else {
            // 没有找到替代源，减少失败计数并继续下一首
            consecutiveFailures = Math.max(0, consecutiveFailures - 1);
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
    
    // 修复: 基于 audio 元素的实际状态而非变量
    if (!audioPlayer.paused) {
        // 暂停时记录播放统计
        recordPlayStats();
        audioPlayer.pause();
        isPlaying = false;
        ui.updatePlayButton(false);
        window.dispatchEvent(new Event('songPaused'));
    } else {
        const playPromise = audioPlayer.play();
        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    // 恢复播放时重置开始时间
                    playStartTime = Date.now();
                    isPlaying = true;
                    ui.updatePlayButton(true);
                    window.dispatchEvent(new Event('songPlaying'));
                })
                .catch((error) => {
                    console.error('播放失败:', error);
                    isPlaying = false;
                    ui.updatePlayButton(false);
                    ui.showNotification('播放失败，请检查音频文件', 'error');
                });
        }
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
    
    // 使用下载进度管理器
    startDownloadWithProgress(song, async () => {
        const urlData = await api.getSongUrl(song, '999');
        if (urlData && urlData.url) {
            const res = await fetch(urlData.url);
            const blob = await res.blob();
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = generateSongFileName(song);
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(a.href);
        } else {
            throw new Error('无法获取下载链接');
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
        } else {
            ui.showNotification(`该歌曲暂无歌词: ${song.name}`, 'warning');
        }
    }).catch(error => {
        console.error('❌ [下载歌词] 下载失败:', error);
        ui.showNotification(`歌词下载失败: ${song.name}`, 'error');
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
            }
}

// 添加歌曲到播放历史
function addToPlayHistory(song: Song): void {
    // 标准化艺术家信息为 string[]，防止存储对象导致显示 [object Object]
    const normalizedSong = {
        ...song,
        artist: Array.isArray(song.artist)
            ? song.artist.map((a: any) => typeof a === 'string' ? a : (a?.name || '未知歌手'))
            : (typeof song.artist === 'string' ? [song.artist] : ['未知歌手'])
    };
    
    // 移除重复的歌曲
    playHistorySongs = playHistorySongs.filter(
        s => !(s.id === normalizedSong.id && s.source === normalizedSong.source)
    );

    // 添加到历史开头
    playHistorySongs.unshift(normalizedSong);

    // 限制历史记录数量
    if (playHistorySongs.length > PLAYER_CONFIG.MAX_HISTORY_SIZE) {
        playHistorySongs = playHistorySongs.slice(0, PLAYER_CONFIG.MAX_HISTORY_SIZE);
    }

    // 优化: 改进localStorage保存，增加自动清理和降级策略
    try {
        const data = JSON.stringify(playHistorySongs);
        const dataSizeMB = data.length / (1024 * 1024);
        
        // 检查数据大小（localStorage通常限制5-10MB）
        if (data.length > 4 * 1024 * 1024) { // 4MB限制
            console.warn(`播放历史数据过大 (${dataSizeMB.toFixed(2)}MB)，清理旧记录`);
            playHistorySongs = playHistorySongs.slice(0, Math.floor(PLAYER_CONFIG.MAX_HISTORY_SIZE / 2));
            localStorage.setItem(STORAGE_CONFIG.KEY_HISTORY, JSON.stringify(playHistorySongs));
            ui.showNotification('播放历史已自动清理以节省空间', 'info');
        } else {
            localStorage.setItem(STORAGE_CONFIG.KEY_HISTORY, data);
        }
    } catch (error) {
        if (error instanceof Error && error.name === 'QuotaExceededError') {
            console.error('localStorage空间不足，执行分级清理策略');
            
            // 优化: 分级清理策略
            const cleanupStrategies = [
                { size: Math.floor(PLAYER_CONFIG.MAX_HISTORY_SIZE * 0.7), desc: '保留70%' },
                { size: Math.floor(PLAYER_CONFIG.MAX_HISTORY_SIZE * 0.5), desc: '保留50%' },
                { size: 50, desc: '保留最近50首' },
                { size: 20, desc: '保留最近20首' }
            ];
            
            let saved = false;
            for (const strategy of cleanupStrategies) {
                try {
                    playHistorySongs = playHistorySongs.slice(0, strategy.size);
                    localStorage.setItem(STORAGE_CONFIG.KEY_HISTORY, JSON.stringify(playHistorySongs));
                    console.log(`清理成功: ${strategy.desc}`);
                    ui.showNotification(`存储空间不足，已清理播放历史(${strategy.desc})`, 'warning');
                    saved = true;
                    break;
                } catch (retryError) {
                    continue;
                }
            }
            
            if (!saved) {
                console.error('所有清理策略均失败，放弃保存');
                ui.showNotification('存储空间严重不足，无法保存播放历史', 'error');
            }
        } else {
            console.error('保存播放历史失败:', error);
            ui.showNotification('保存播放历史失败', 'error');
        }
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

    // 标准化艺术家信息为 string[]，防止存储对象导致显示 [object Object]
    const normalizedSong = {
        ...song,
        artist: Array.isArray(song.artist)
            ? song.artist.map((a: any) => typeof a === 'string' ? a : (a?.name || '未知歌手'))
            : (typeof song.artist === 'string' ? [song.artist] : ['未知歌手'])
    };

    const favorites = playlistStorage.get(key);
    const songIndex = favorites.songs.findIndex((favSong: Song) => favSong.id === normalizedSong.id && favSong.source === normalizedSong.source);

    if (songIndex > -1) {
        favorites.songs.splice(songIndex, 1);
        ui.showNotification(`已从"我的喜欢"中移除`, 'success');
    } else {
        favorites.songs.unshift(normalizedSong);
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
        const alternativeSong: Song = {
            ...originalSong,
            source: source
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
        const data = JSON.stringify(playlistsData);
        
        // 检查数据大小
        if (data.length > 4 * 1024 * 1024) { // 4MB限制
            console.warn('歌单数据过大，建议用户导出备份');
        }
        
        localStorage.setItem(STORAGE_CONFIG.KEY_PLAYLISTS, data);
    } catch (error) {
        if (error instanceof Error && error.name === 'QuotaExceededError') {
            console.error('localStorage空间不足，无法保存歌单');
            // 通知用户
            if (typeof window !== 'undefined' && window.dispatchEvent) {
                window.dispatchEvent(new CustomEvent('storageQuotaExceeded', {
                    detail: { type: 'playlists' }
                }));
            }
        } else {
            console.error('保存歌单失败:', error);
        }
    }
}

// 老王修复：移除重复的事件监听器，已在initAudioPlayer()中绑定

// 导出 LyricLine 接口供其他模块使用
export type { LyricLine } from './types.js';

function parseLyrics(lrc: string): LyricLine[] {
    // 🔧 修复P2-8: 添加错误处理和默认歌词
    try {
        if (!lrc || !lrc.trim()) {
            console.warn('⚠️ [parseLyrics] 歌词文本为空');
            return [{ time: 0, text: '暂无歌词' }];
        }
        
        const lines = lrc.split('\n');
        const result: LyricLine[] = [];
        
        // 支持多种歌词时间格式:
        // [mm:ss.xx] [mm:ss.xxx] [hh:mm:ss.xx] [mm:ss]
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
                // 单行解析失败不影响其他行
                console.warn('⚠️ [parseLyrics] 解析单行失败:', line);
                continue;
            }
        }
        
        // 按时间排序
        result.sort((a, b) => a.time - b.time);
        
        // 如果解析后没有有效歌词，返回默认
        if (result.length === 0) {
            console.warn('⚠️ [parseLyrics] 没有解析到有效歌词');
            return [{ time: 0, text: '纯音乐，请欣赏' }];
        }
        
        return result;
    } catch (error) {
        console.error('❌ [parseLyrics] 歌词解析失败:', error);
        return [{ time: 0, text: '歌词加载失败' }];
    }
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
    const key = getFavoritesPlaylistKey();
    if (!key) {
        ui.showNotification('收藏列表初始化失败', 'error');
        return;
    }

    const favorites = playlistStorage.get(key);
    let addedCount = 0;

    songs.forEach(song => {
        // 标准化艺术家信息
        const normalizedSong = {
            ...song,
            artist: Array.isArray(song.artist)
                ? song.artist.map((a: any) => typeof a === 'string' ? a : (a?.name || '未知歌手'))
                : (typeof song.artist === 'string' ? [song.artist] : ['未知歌手'])
        };

        const exists = favorites.songs.some((fav: Song) =>
            fav.id === normalizedSong.id && fav.source === normalizedSong.source
        );
        if (!exists) {
            favorites.songs.push(normalizedSong);
            addedCount++;
        }
    });

    if (addedCount > 0) {
        savePlaylistsToStorage();
        ui.showNotification(`成功添加 ${addedCount} 首歌曲到收藏`, 'success');
        window.dispatchEvent(new Event('favoritesUpdated'));
    } else {
        ui.showNotification('所选歌曲已在收藏中', 'info');
    }
}

// 批量下载歌曲
export async function downloadMultipleSongs(songs: Song[]): Promise<void> {
    // 限制批量下载数量，防止浏览器崩溃
    const MAX_BATCH_DOWNLOAD = 50;
    if (songs.length > MAX_BATCH_DOWNLOAD) {
        const confirmed = confirm(`批量下载最多支持${MAX_BATCH_DOWNLOAD}首歌曲，当前选择了${songs.length}首。是否只下载前${MAX_BATCH_DOWNLOAD}首？`);
        if (!confirmed) {
            ui.showNotification('已取消批量下载', 'info');
            return;
        }
        songs = songs.slice(0, MAX_BATCH_DOWNLOAD);
    }
    
    // 二次确认，避免误操作
    if (songs.length > 10) {
        const confirmed = confirm(`确定要下载 ${songs.length} 首歌曲吗？这可能需要较长时间。`);
        if (!confirmed) {
            ui.showNotification('已取消批量下载', 'info');
            return;
        }
    }

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

// 记录播放统计
function recordPlayStats(): void {
    if (!lastRecordedSong || playStartTime === 0) return;
    
    const playDuration = (Date.now() - playStartTime) / 1000; // 转换为秒
    
    // 只记录播放超过3秒的歌曲
    if (playDuration >= 3) {
        recordPlay(lastRecordedSong, playDuration);
    }
    
    // 重置
    playStartTime = 0;
}

// 初始化时保存歌单到本地存储并初始化audio播放器
// 老王修复：导出init函数供main.ts调用
export function init(): void {
    initAudioPlayer();
    loadSavedPlaylists();
    // 初始化歌词 Worker
    lyricsWorkerManager.init();
}

// 老王修复：移除自动调用，避免重复初始化
// 现在由main.ts中的initializeApp()统一调用player.init()



