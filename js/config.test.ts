/**
 * 沄听播放器 - 配置模块单元测试
 */
import { logger, API_TIMEOUTS, PROXY_DOMAINS, needsProxy, APP_CONFIG, IS_PRODUCTION } from './config';

function createStorageMock(): Storage {
    let store: Record<string, string> = {};

    return {
        get length() {
            return Object.keys(store).length;
        },
        clear: vi.fn(() => {
            store = {};
        }),
        getItem: vi.fn((key: string) => store[key] ?? null),
        key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
        removeItem: vi.fn((key: string) => {
            delete store[key];
        }),
        setItem: vi.fn((key: string, value: string) => {
            store[key] = String(value);
        }),
    };
}

describe('Logger', () => {
    beforeEach(() => {
        vi.stubGlobal('localStorage', createStorageMock());
        localStorage.clear();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('默认应静默控制台调试日志', () => {
        const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        logger.debug('test message');
        expect(consoleLogSpy).not.toHaveBeenCalled();
        consoleLogSpy.mockRestore();
    });

    it('开启调试开关后应输出调试和信息日志', () => {
        const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        localStorage.setItem('music888_debug_logs', '1');
        logger.debug('debug message');
        logger.info('test message');
        expect(consoleLogSpy).toHaveBeenCalledWith('[DEBUG]', 'debug message');
        expect(consoleLogSpy).toHaveBeenCalledWith('[INFO]', 'test message');
        consoleLogSpy.mockRestore();
    });

    it('默认应静默控制台警告日志', () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        logger.warn('test message');
        expect(consoleWarnSpy).not.toHaveBeenCalled();
        consoleWarnSpy.mockRestore();
    });

    it('默认应静默控制台错误日志', () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        logger.error('test message');
        expect(consoleErrorSpy).not.toHaveBeenCalled();
        consoleErrorSpy.mockRestore();
    });

    it('开启调试开关后应输出警告和错误日志', () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        localStorage.setItem('music888_debug_logs', '1');
        logger.warn('warn message');
        logger.error('error message');
        expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN]', 'warn message');
        expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR]', 'error message');
        consoleWarnSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });
});

describe('API_TIMEOUTS', () => {
    it('应包含所有超时配置', () => {
        expect(API_TIMEOUTS.API_DETECTION).toBe(8000);
        expect(API_TIMEOUTS.SOURCE_HEALTH).toBe(4500);
        expect(API_TIMEOUTS.SEARCH).toBe(20000);
        expect(API_TIMEOUTS.SONG_URL).toBe(15000);
        expect(API_TIMEOUTS.LYRICS).toBe(10000);
        expect(API_TIMEOUTS.PLAYLIST).toBe(30000);
    });
});

describe('PROXY_DOMAINS', () => {
    it('应包含网易云音乐域名', () => {
        expect(PROXY_DOMAINS).toContain('music.126.net');
        expect(PROXY_DOMAINS).toContain('m7.music.126.net');
        expect(PROXY_DOMAINS).toContain('m8.music.126.net');
    });

    it('应包含QQ音乐域名', () => {
        expect(PROXY_DOMAINS).toContain('stream.qqmusic.qq.com');
        expect(PROXY_DOMAINS).toContain('dl.stream.qqmusic.qq.com');
    });

    it('应包含酷狗音乐域名', () => {
        expect(PROXY_DOMAINS).toContain('kugou.com');
        expect(PROXY_DOMAINS).toContain('trackercdn.kugou.com');
    });

    it('应包含咪咕音乐域名', () => {
        expect(PROXY_DOMAINS).toContain('migu.cn');
        expect(PROXY_DOMAINS).toContain('freetyst.nf.migu.cn');
    });

    it('应包含酷我音乐域名', () => {
        expect(PROXY_DOMAINS).toContain('kuwo.cn');
        expect(PROXY_DOMAINS).toContain('sycdn.kuwo.cn');
    });

    it('应包含 Bilibili CDN 域名（跨源回退音源）', () => {
        expect(PROXY_DOMAINS).toContain('bilivideo.com');
        expect(PROXY_DOMAINS).toContain('bilivideo.cn');
    });
});

describe('needsProxy', () => {
    it('应检测网易云音乐URL需要代理', () => {
        expect(needsProxy('https://m7.music.126.net/song.mp3')).toBe(true);
        expect(needsProxy('https://music.126.net/song.mp3')).toBe(true);
    });

    it('应检测QQ音乐URL需要代理', () => {
        expect(needsProxy('https://stream.qqmusic.qq.com/song.mp3')).toBe(true);
        expect(needsProxy('https://dl.stream.qqmusic.qq.com/song.mp3')).toBe(true);
    });

    it('应检测酷狗音乐URL需要代理', () => {
        expect(needsProxy('https://trackercdn.kugou.com/song.mp3')).toBe(true);
        expect(needsProxy('https://webfs.tx.kugou.com/song.mp3')).toBe(true);
    });

    it('应检测咪咕音乐URL需要代理', () => {
        expect(needsProxy('https://freetyst.nf.migu.cn/song.mp3')).toBe(true);
    });

    it('应检测酷我音乐URL需要代理', () => {
        expect(needsProxy('https://sycdn.kuwo.cn/song.mp3')).toBe(true);
    });

    it('应检测 Bilibili CDN URL 需要代理', () => {
        expect(needsProxy('https://upos-sz-mirrorcosov.bilivideo.com/audio.m4s')).toBe(true);
        expect(needsProxy('https://xy122x68x166x12xy.bilivideo.cn/audio.m4s')).toBe(true);
    });

    it('应检测其他URL不需要代理', () => {
        expect(needsProxy('https://example.com/song.mp3')).toBe(false);
        expect(needsProxy('https://cdn.example.com/song.mp3')).toBe(false);
        expect(needsProxy('https://api.example.com/song.mp3')).toBe(false);
    });
});

describe('APP_CONFIG', () => {
    it('应包含应用配置', () => {
        expect(APP_CONFIG.MAX_HISTORY_SIZE).toBe(50);
        expect(APP_CONFIG.INFINITE_SCROLL_BATCH_SIZE).toBe(30);
        expect(APP_CONFIG.DEFAULT_QUALITY).toBe('320');
    });
});

describe('IS_PRODUCTION', () => {
    it('应正确判断生产环境', () => {
        // 在测试环境中，IS_PRODUCTION 应该是 false
        expect(typeof IS_PRODUCTION).toBe('boolean');
    });
});
