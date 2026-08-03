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

const neteaseSong: Song = {
    id: '186016',
    name: '晴天',
    artist: ['周杰伦'],
    album: '叶惠美',
    pic_id: '',
    lyric_id: '186016',
    source: 'netease',
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

describe('网易云播放地址兼容', () => {
    beforeEach(() => {
        fetchWithRetryMock.mockReset();
    });

    it('标准端点无地址时应接受 match 接口的字符串响应', async () => {
        fetchWithRetryMock
            .mockResolvedValueOnce(
                new Response(
                    JSON.stringify({
                        code: 200,
                        data: [{ id: 186016, url: null, br: 0, size: 0, type: null }],
                    })
                )
            )
            .mockResolvedValueOnce(
                new Response(
                    JSON.stringify({
                        code: 200,
                        data: 'http://media.test/song.flac',
                        proxyUrl: 'https://netease.test/?proxy=http%3A%2F%2Fmedia.test%2Fsong.flac',
                    })
                )
            );

        const { getSongUrl } = await import('./music');

        await expect(getSongUrl(neteaseSong, '320')).resolves.toEqual({
            url: 'http://media.test/song.flac',
            br: '320',
        });
        expect(fetchWithRetryMock).toHaveBeenCalledTimes(2);
        expect(fetchWithRetryMock.mock.calls[1][0]).toContain('/song/url/match?id=186016');
    });

    it('match 接口数据为空数组时应回退到代理地址', async () => {
        fetchWithRetryMock
            .mockResolvedValueOnce(new Response(JSON.stringify({ code: 200, data: [] })))
            .mockResolvedValueOnce(new Response(JSON.stringify({
                code: 200,
                data: [],
                proxyUrl: 'https://netease.test/proxy/song.flac',
            })));

        const { getSongUrl } = await import('./music');

        await expect(getSongUrl(neteaseSong, '320')).resolves.toEqual({
            url: 'https://netease.test/proxy/song.flac',
            br: '320',
        });
    });
});
