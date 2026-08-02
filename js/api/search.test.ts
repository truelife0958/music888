import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchWithRetryMock = vi.fn();

vi.mock('./client', () => ({
    fetchWithRetry: fetchWithRetryMock,
}));

vi.mock('./sources', () => ({
    getGDStudioApiUrl: () => 'https://gdstudio.test/api.php',
    getNecApiUrl: () => 'https://netease.test',
    getMetingApiUrl: () => 'https://meting.test/api',
    getPreferredSearchSources: () => ['netease'],
    isGDStudioApiAvailable: () => false,
    markGDStudioApiAvailable: vi.fn(),
    markGDStudioApiUnavailable: vi.fn(),
}));

describe('searchMusicAPI 多源回退', () => {
    beforeEach(() => {
        fetchWithRetryMock.mockReset();
    });

    it('NEC 无结果时应使用带签名播放地址的 Meting 搜索结果', async () => {
        fetchWithRetryMock.mockImplementation(async (url: string) => {
            if (url.startsWith('https://netease.test/search')) {
                return new Response(JSON.stringify({ code: 500 }), {
                    headers: { 'content-type': 'application/json' },
                });
            }

            if (url.startsWith('https://meting.test/api')) {
                return new Response(JSON.stringify([
                    {
                        title: '晴天',
                        author: '周杰伦 / 温岚',
                        url: 'https://meting.test/api?type=url&id=186016&auth=signed',
                        pic: 'https://meting.test/api?type=pic&id=123&auth=signed',
                        lrc: 'https://meting.test/api?type=lrc&id=186016&auth=signed',
                    },
                ]), {
                    headers: { 'content-type': 'application/json' },
                });
            }

            throw new Error(`unexpected URL: ${url}`);
        });

        const { searchMusicAPI } = await import('./search');
        const songs = await searchMusicAPI('晴天');

        expect(songs).toEqual([
            expect.objectContaining({
                id: '186016',
                name: '晴天',
                artist: ['周杰伦', '温岚'],
                source: 'meting',
                play_url: 'https://meting.test/api?type=url&id=186016&auth=signed',
                lyric_url: 'https://meting.test/api?type=lrc&id=186016&auth=signed',
            }),
        ]);
    });

    it('应过滤缺少播放地址的 Meting 伪结果', async () => {
        fetchWithRetryMock.mockImplementation(async (url: string) => {
            const body = url.startsWith('https://netease.test/search')
                ? { code: 500 }
                : [{ title: '无地址歌曲', author: '未知歌手' }];
            return new Response(JSON.stringify(body), {
                headers: { 'content-type': 'application/json' },
            });
        });

        const { searchMusicAPI } = await import('./search');
        await expect(searchMusicAPI('无地址')).resolves.toEqual([]);
    });
});
