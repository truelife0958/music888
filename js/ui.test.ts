/**
 * 沄听播放器 - UI 模块单元测试
 */
import { Song } from './types';

// Mock player 模块
const playerMock = {
    isSongInFavorites: vi.fn(() => false),
    toggleFavoriteButton: vi.fn(),
    playSong: vi.fn(),
    updatePlayerFavoriteButton: vi.fn(),
    getCurrentSong: vi.fn(() => null),
    getFavorites: vi.fn(() => []),
};

vi.mock('./player', () => playerMock);

// Mock api 模块
vi.mock('./api', () => ({
    getSongUrl: vi.fn(() => Promise.resolve({ url: 'https://example.com/song.mp3', br: '320' })),
}));

describe('UI Helper Functions', () => {
    beforeEach(async () => {
        // 清理 DOM
        document.body.innerHTML = '';
        // NOTE: 预填充 player 模块缓存，避免 playerSync() 报错
        const { setPlayerModule } = await import('./ui');
        setPlayerModule(playerMock as unknown as typeof import('./player'));
    });

    describe('showNotification', () => {
        it('应创建通知元素', async () => {
            // 动态导入以确保 mock 生效
            const { showNotification } = await import('./ui');

            showNotification('测试消息', 'info');

            const notification = document.querySelector('.notification');
            expect(notification).not.toBeNull();
            expect(notification?.textContent).toBe('测试消息');
            expect(notification?.classList.contains('notification-info')).toBe(true);
        });

        it('应支持不同类型的通知', async () => {
            const { showNotification } = await import('./ui');

            showNotification('成功消息', 'success');
            const successNotification = document.querySelector('.notification-success');
            expect(successNotification).not.toBeNull();

            showNotification('警告消息', 'warning');
            const warningNotification = document.querySelector('.notification-warning');
            expect(warningNotification).not.toBeNull();

            showNotification('错误消息', 'error');
            const errorNotification = document.querySelector('.notification-error');
            expect(errorNotification).not.toBeNull();
        });
    });

    describe('displaySearchResults', () => {
        it('应显示空状态当没有歌曲时', async () => {
            const { displaySearchResults } = await import('./ui');

            // 创建容器
            const container = document.createElement('div');
            container.id = 'testResults';
            document.body.appendChild(container);

            displaySearchResults([], 'testResults', []);

            expect(container.querySelector('.empty-state')).not.toBeNull();
        });

        it('空状态应复用统一反馈结构', async () => {
            const { displaySearchResults } = await import('./ui');

            const container = document.createElement('div');
            container.id = 'testResults';
            document.body.appendChild(container);

            displaySearchResults([], 'testResults', []);

            const feedbackState = container.querySelector('[data-feedback-state="empty"]');
            expect(feedbackState).not.toBeNull();
            expect(container.textContent).toContain('未找到相关歌曲');
        });

        it('应渲染歌曲列表', async () => {
            const { displaySearchResults } = await import('./ui');

            // 创建容器
            const container = document.createElement('div');
            container.id = 'testResults';
            document.body.appendChild(container);

            const songs: Song[] = [
                {
                    id: '1',
                    name: '测试歌曲1',
                    artist: ['歌手1'],
                    album: '专辑1',
                    pic_id: 'pic1',
                    lyric_id: 'lyric1',
                    source: 'netease',
                },
                {
                    id: '2',
                    name: '测试歌曲2',
                    artist: ['歌手2', '歌手3'],
                    album: '专辑2',
                    pic_id: 'pic2',
                    lyric_id: 'lyric2',
                    source: 'netease',
                },
            ];

            displaySearchResults(songs, 'testResults', songs);

            const songItems = container.querySelectorAll('.song-item');
            expect(songItems.length).toBe(2);
        });

        it('点击收藏按钮后应派发右栏同步事件', async () => {
            const { displaySearchResults } = await import('./ui');

            const container = document.createElement('div');
            container.id = 'testResults';
            document.body.appendChild(container);

            const songs: Song[] = [
                {
                    id: '1',
                    name: '测试歌曲1',
                    artist: ['歌手1'],
                    album: '专辑1',
                    pic_id: 'pic1',
                    lyric_id: 'lyric1',
                    source: 'netease',
                },
            ];

            const syncListener = vi.fn();
            document.addEventListener('music888:favorites-updated', syncListener as EventListener);

            displaySearchResults(songs, 'testResults', songs);

            const favoriteButton = container.querySelector('.favorite-btn') as HTMLButtonElement | null;
            expect(favoriteButton).not.toBeNull();

            favoriteButton?.click();

            expect(syncListener).toHaveBeenCalledTimes(1);

            document.removeEventListener('music888:favorites-updated', syncListener as EventListener);
        });
    });

    describe('updateProgress', () => {
        it('应更新进度条', async () => {
            const { init, updateProgress } = await import('./ui');

            // 创建必要的 DOM 元素
            document.body.innerHTML = `
                <div id="progressFill"></div>
                <span id="currentTime"></span>
                <span id="totalTime"></span>
            `;

            init();
            updateProgress(60, 180);

            const progressFill = document.getElementById('progressFill');
            const currentTime = document.getElementById('currentTime');
            const totalTime = document.getElementById('totalTime');

            expect(progressFill?.style.width).toBe('33.33333333333333%');
            expect(currentTime?.textContent).toBe('1:00');
            expect(totalTime?.textContent).toBe('3:00');
        });
    });

    describe('updatePlayButton', () => {
        it('应更新播放按钮图标', async () => {
            const { init, updatePlayButton } = await import('./ui');

            document.body.innerHTML = `
                <button id="playBtn"><i class="fas fa-play"></i></button>
            `;

            init();

            updatePlayButton(true);
            let icon = document.querySelector('#playBtn i');
            expect(icon?.className).toBe('fas fa-pause');

            updatePlayButton(false);
            icon = document.querySelector('#playBtn i');
            expect(icon?.className).toBe('fas fa-play');
        });
    });

    describe('showLoading', () => {
        it('应显示加载状态', async () => {
            const { showLoading } = await import('./ui');

            const container = document.createElement('div');
            container.id = 'testContainer';
            document.body.appendChild(container);

            showLoading('testContainer');

            expect(container.querySelector('.loading')).not.toBeNull();
            expect(container.querySelector('.fa-spinner')).not.toBeNull();
        });

        it('应使用统一反馈结构渲染加载状态', async () => {
            const uiModule = await import('./ui');
            const { showLoading } = uiModule;

            const container = document.createElement('div');
            container.id = 'testContainer';
            document.body.appendChild(container);

            showLoading('testContainer');

            const feedbackState = container.querySelector('[data-feedback-state="loading"]');
            expect(feedbackState).not.toBeNull();
            expect(container.textContent).toContain('正在加载...');
        });
    });

    describe('showError', () => {
        it('应显示错误信息', async () => {
            const { showError } = await import('./ui');

            const container = document.createElement('div');
            container.id = 'testContainer';
            document.body.appendChild(container);

            showError('测试错误', 'testContainer');

            expect(container.querySelector('.error')).not.toBeNull();
            expect(container.textContent).toContain('测试错误');
        });

        it('应转义 HTML 特殊字符', async () => {
            const { showError } = await import('./ui');

            const container = document.createElement('div');
            container.id = 'testContainer';
            document.body.appendChild(container);

            showError('<script>alert("xss")</script>', 'testContainer');

            // 确保脚本标签被转义而不是执行
            expect(container.innerHTML).toContain('&lt;script&gt;');
            expect(container.querySelector('script')).toBeNull();
        });

        it('应使用统一反馈结构渲染错误状态', async () => {
            const uiModule = await import('./ui');
            const { showError } = uiModule;

            const container = document.createElement('div');
            container.id = 'testContainer';
            document.body.appendChild(container);

            showError('测试错误', 'testContainer');

            const feedbackState = container.querySelector('[data-feedback-state="error"]');
            expect(feedbackState).not.toBeNull();
        });
    });

    describe('showEmptyState', () => {
        it('应导出统一空状态渲染入口', async () => {
            const uiModule = await import('./ui');
            expect(typeof (uiModule as { showEmptyState?: unknown }).showEmptyState).toBe('function');
        });

        it('应渲染统一空状态', async () => {
            const uiModule = await import('./ui');
            const showEmptyState = (
                uiModule as { showEmptyState?: (containerId: string, message: string, iconClass?: string) => void }
            ).showEmptyState;

            expect(showEmptyState).toBeTypeOf('function');

            const container = document.createElement('div');
            container.id = 'testContainer';
            document.body.appendChild(container);

            showEmptyState?.('testContainer', '暂无数据', 'fas fa-box-open');

            const feedbackState = container.querySelector('[data-feedback-state="empty"]');
            expect(feedbackState).not.toBeNull();
            expect(container.querySelector('.fa-box-open')).not.toBeNull();
            expect(container.textContent).toContain('暂无数据');
        });
    });

    describe('syncPlaylistActionFormState', () => {
        it('应根据模式切换占位文案、按钮文案和反馈信息', async () => {
            const uiModule = await import('./ui');
            const syncPlaylistActionFormState = (
                uiModule as {
                    syncPlaylistActionFormState?: (options: {
                        placeholder: string;
                        buttonLabel: string;
                        iconClass: string;
                        feedbackMessage?: string;
                        feedbackType?: string;
                    }) => void;
                }
            ).syncPlaylistActionFormState;

            expect(syncPlaylistActionFormState).toBeTypeOf('function');

            document.body.innerHTML = `
                <input id="playlistActionInput" />
                <button id="playlistActionBtn"><i></i><span></span></button>
                <div id="playlistActionFeedback"></div>
            `;

            syncPlaylistActionFormState?.({
                placeholder: '输入歌单ID或链接...',
                buttonLabel: '解析',
                iconClass: 'fas fa-cloud-download-alt',
                feedbackMessage: '准备解析歌单',
                feedbackType: 'info',
            });

            expect(document.getElementById('playlistActionInput')?.getAttribute('placeholder')).toBe(
                '输入歌单ID或链接...'
            );
            expect(document.querySelector('#playlistActionBtn span')?.textContent).toBe('解析');
            expect(document.querySelector('#playlistActionBtn i')?.className).toBe('fas fa-cloud-download-alt');
            expect(document.getElementById('playlistActionFeedback')?.getAttribute('data-playlist-feedback-type')).toBe(
                'info'
            );
            expect(document.getElementById('playlistActionFeedback')?.textContent).toContain('准备解析歌单');
        });

        it('提交中时应禁用输入与按钮并暴露忙碌状态', async () => {
            const uiModule = await import('./ui');
            const syncPlaylistActionFormState = (
                uiModule as {
                    syncPlaylistActionFormState?: (options: {
                        placeholder: string;
                        buttonLabel: string;
                        iconClass: string;
                        isSubmitting?: boolean;
                    }) => void;
                }
            ).syncPlaylistActionFormState;

            expect(syncPlaylistActionFormState).toBeTypeOf('function');

            document.body.innerHTML = `
                <input id="playlistActionInput" />
                <button id="playlistActionBtn"><i></i><span></span></button>
                <div id="playlistActionFeedback"></div>
            `;

            syncPlaylistActionFormState?.({
                placeholder: '输入电台ID...',
                buttonLabel: '添加',
                iconClass: 'fas fa-podcast',
                isSubmitting: true,
            });

            const input = document.getElementById('playlistActionInput') as HTMLInputElement | null;
            const button = document.getElementById('playlistActionBtn') as HTMLButtonElement | null;

            expect(input?.disabled).toBe(true);
            expect(button?.disabled).toBe(true);
            expect(button?.getAttribute('aria-busy')).toBe('true');
            expect(button?.dataset.submitting).toBe('true');
        });
    });
});

describe('Lyrics Display', () => {
    beforeEach(() => {
        // Mock scrollIntoView，因为 jsdom 不支持
        Element.prototype.scrollIntoView = vi.fn();
        // Mock requestAnimationFrame，使其立即执行回调
        vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
            return setTimeout(() => cb(performance.now()), 0) as unknown as number;
        });
        vi.stubGlobal('cancelAnimationFrame', (id: number) => {
            clearTimeout(id);
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('应显示暂无歌词当歌词为空时', async () => {
        const { init, updateLyrics } = await import('./ui');

        document.body.innerHTML = `
            <div id="lyricsContainer"></div>
        `;

        init();
        updateLyrics([], 0);

        // 等待 requestAnimationFrame 执行
        await new Promise(resolve => setTimeout(resolve, 10));

        const container = document.getElementById('lyricsContainer');
        expect(container?.textContent).toContain('暂无歌词');
    });

    it('应渲染歌词行', async () => {
        const { init, updateLyrics } = await import('./ui');

        document.body.innerHTML = `
            <div id="lyricsContainer"></div>
        `;

        init();

        const lyrics = [
            { time: 0, text: '第一行歌词' },
            { time: 5, text: '第二行歌词' },
            { time: 10, text: '第三行歌词' },
        ];

        updateLyrics(lyrics, 0);

        // 等待 requestAnimationFrame 执行
        await new Promise(resolve => setTimeout(resolve, 10));

        const container = document.getElementById('lyricsContainer');
        const lines = container?.querySelectorAll('.lyric-line');
        expect(lines?.length).toBe(3);
    });

    it('应高亮当前歌词行', async () => {
        // 重新导入模块以重置状态
        vi.resetModules();
        const { init, updateLyrics } = await import('./ui');

        document.body.innerHTML = `
            <div id="lyricsContainer"></div>
        `;

        init();

        const lyrics = [
            { time: 0, text: '第一行歌词' },
            { time: 5, text: '第二行歌词' },
            { time: 10, text: '第三行歌词' },
        ];

        // 当前时间为 6 秒，应该高亮第二行
        updateLyrics(lyrics, 6);

        // 等待 requestAnimationFrame 执行
        await new Promise(resolve => setTimeout(resolve, 10));

        const container = document.getElementById('lyricsContainer');
        const activeLine = container?.querySelector('.lyric-line.active');
        // 时间戳渲染于独立的 .lyric-time span，歌词文本在 .lyric-text 子元素中
        expect(activeLine?.querySelector('.lyric-text')?.textContent).toBe('第二行歌词');
    });
});
