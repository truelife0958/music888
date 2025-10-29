// player.ts 增强功能 - 新增代码片段
// 将这些函数添加到 player.ts 中

import { Song } from './api.js';
import * as ui from './ui.js';

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

    const savedPlaylists = getSavedPlaylists();
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
        saveFavoriteSongs(favoriteSongs);
        ui.showNotification(`成功添加 ${addedCount} 首歌曲到收藏`, 'success');
        window.dispatchEvent(new Event('favoritesUpdated'));
    } else {
        ui.showNotification('所选歌曲已在收藏中', 'info');
    }
}

// 批量下载歌曲
export async function downloadMultipleSongs(songs: Song[]): Promise<void> {
    const BATCH_SIZE = 3; // 每批下载3首
    const quality = (document.getElementById('qualitySelect') as HTMLSelectElement).value;

    ui.showNotification(`开始下载 ${songs.length} 首歌曲...`, 'info');

    for (let i = 0; i < songs.length; i += BATCH_SIZE) {
        const batch = songs.slice(i, i + BATCH_SIZE);

        await Promise.all(batch.map(async (song) => {
            try {
                const urlData = await api.getSongUrl(song, quality);
                if (urlData && urlData.url) {
                    const response = await fetch(urlData.url);
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${song.name} - ${Array.isArray(song.artist) ? song.artist.join(', ') : song.artist}.mp3`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                }
            } catch (error) {
                            }
        }));

        // 显示进度
        const downloaded = Math.min(i + BATCH_SIZE, songs.length);
        ui.showNotification(`下载进度: ${downloaded}/${songs.length}`, 'info');

        // 批次间延迟，避免请求过快
        if (i + BATCH_SIZE < songs.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    ui.showNotification('所有歌曲下载完成', 'success');
}

// ========== 辅助函数 ==========

function getFavoriteSongs(): Song[] {
    const data = localStorage.getItem('favoriteSongs');
    return data ? JSON.parse(data) : [];
}

function saveFavoriteSongs(songs: Song[]): void {
    localStorage.setItem('favoriteSongs', JSON.stringify(songs));
}

function getSavedPlaylists(): any[] {
    const data = localStorage.getItem('savedPlaylists');
    return data ? JSON.parse(data) : [];
}

// ========== 使用说明 ==========
// 将这些函数添加到 player.ts 文件的末尾
// 确保导出所有新增的函数
