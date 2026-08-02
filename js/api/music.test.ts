import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Song } from '../types';

const fetchWithRetryMock = vi.fn();

vi.mock('./client', () => ({
    fetchWithRetry: fetchWithRetryMock,
}));

vi.mock('./sources', () => ({
    getGDStudioApiUrl: () => 'https://gdstudio.test/api.php',
    getNecApiUrl: () => 'https://netease.test',
    getMetingApiUrl: () => 'https://meting.test/api',
    isGDStudioApiAvailable: () => false,
    markGDStudioApiAvailable: vi.fn(),
    markGDStudioApiUnavailable: vi.fn(),
}));

const metingSong: Song = {
    id: '186016',
    name: '晴天',
    artist: ['周杰伦'],
    album: '',
    pic_id: '',
    lyric_id: '186016',
    source: 'meting',
    play_url: 'https://meting.test/api?type=url&id=186016&auth=signed',
    lyric_url: 'https://meting.test/api?type=lrc&id=186016&auth=signed',
};

describe('Meting 直连资源', () => {
    beforeEach(() => {
        fetchWithRetryMock.mockReset();
    });

    it('应保留搜索结果中的签名播放地址', async () => {
        const { getSongUrl } = await import('./music');

        await expect(getSongUrl(metingSong, '320')).resolves.toEqual({
            url: metingSong.play_url,
            br: '320',
            source: 'meting',
        });
        expect(fetchWithRetryMock).not.toHaveBeenCalled();
    });

    it('应从签名歌词地址读取纯文本歌词', async () => {
        fetchWithRetryMock.mockResolvedValue(new Response('[00:00.00]晴天'));
        const { getLyrics } = await import('./music');

        await expect(getLyrics(metingSong)).resolves.toEqual({ lyric: '[00:00.00]晴天' });
        expect(fetchWithRetryMock).toHaveBeenCalledWith(metingSong.lyric_url, {}, 0);
    });
});
