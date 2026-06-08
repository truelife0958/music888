vi.mock('./api', () => ({
    searchMusicAPI: vi.fn(() => Promise.resolve([])),
    exploreRadarAPI: vi.fn(() => Promise.resolve([])),
    parsePlaylistAPI: vi.fn(),
    getUserPlaylists: vi.fn(() => Promise.resolve([])),
    getRadioDetail: vi.fn(),
    getRadioPrograms: vi.fn(),
    findWorkingAPI: vi.fn(() => Promise.resolve({ success: false })),
}));

vi.mock('./ui', async (importOriginal) => {
    const actual = await importOriginal<typeof import('./ui')>();
    return {
        ...actual,
        init: vi.fn(),
        showNotification: vi.fn(),
        showLoading: vi.fn(),
        showError: vi.fn(),
        showEmptyState: vi.fn(),
        displaySearchResults: vi.fn(),
        displayRadioPrograms: vi.fn(),
    };
});

vi.mock('./player', () => ({
    initPlayer: vi.fn(),
    togglePlay: vi.fn(),
    previousSong: vi.fn(),
    nextSong: vi.fn(),
    togglePlayMode: vi.fn(),
    setVolume: vi.fn(),
    seekTo: vi.fn(),
    getCurrentSong: vi.fn(() => null),
    downloadSongByData: vi.fn(),
    downloadLyricByData: vi.fn(),
    toggleFavoriteButton: vi.fn(),
    clearPlayHistory: vi.fn(),
    getFavorites: vi.fn(() => []),
    getPlayHistory: vi.fn(() => []),
    playSong: vi.fn(),
}));

vi.mock('./config', () => ({
    logger: {
        info: vi.fn(),
        debug: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

vi.mock('./perf', () => ({
    initPerformanceMonitoring: vi.fn(),
}));

function createAppShell(): void {
    document.body.innerHTML = `
        <input id="searchInput" value="周杰伦" />
        <button class="search-btn" id="searchBtn"></button>
        <button id="exploreRadarBtn"></button>
        <div id="searchResults"></div>
        <div id="rankingResults"></div>
        <div id="favoritesResults"></div>
        <div id="historyResults"></div>
        <button class="tab-btn active" data-tab="hot"></button>
        <button class="tab-btn" data-tab="ranking"></button>
        <button class="tab-btn" data-tab="artist"></button>
        <button class="tab-btn" data-tab="radio"></button>
        <div id="hotTab" class="tab-content active"></div>
        <div id="rankingTab" class="tab-content"></div>
        <div id="artistTab" class="tab-content"></div>
        <div id="radioTab" class="tab-content"></div>
        <select id="playlistActionSelect">
            <option value="user">用户歌单</option>
            <option value="radio">电台FM</option>
            <option value="playlist">歌单解析</option>
        </select>
        <input id="playlistActionInput" />
        <button id="playlistActionBtn"><i></i><span>加载</span></button>
        <div id="playlistActionFeedback"></div>
        <div id="artistGrid" style="display:none"></div>
        <div id="artistFilter" style="display:none"></div>
        <div id="artistDetailView"></div>
        <div id="albumSongsView"></div>
        <button id="backToArtists"></button>
        <button id="backToArtistDetail"></button>
        <div id="radioListView"></div>
        <div id="radioProgramsView"></div>
        <button id="backToRadios"></button>
    `;
}

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

async function initializeMainModule(): Promise<void> {
    const domReadyHandlers: EventListener[] = [];
    const originalAddEventListener = document.addEventListener.bind(document);
    type AddEventListenerArgs = Parameters<Document['addEventListener']>;

    vi.spyOn(document, 'addEventListener').mockImplementation(((type: AddEventListenerArgs[0], listener: AddEventListenerArgs[1], options?: AddEventListenerArgs[2]) => {
        if (type === 'DOMContentLoaded' && typeof listener === 'function') {
            domReadyHandlers.push(listener as EventListener);
            return;
        }
        return originalAddEventListener(type, listener as EventListener, options);
    }) as typeof document.addEventListener);

    await import('./main');

    const domReadyHandler = domReadyHandlers.at(-1);
    expect(domReadyHandler).toBeTypeOf('function');
    domReadyHandler?.(new Event('DOMContentLoaded'));
    await new Promise(resolve => setTimeout(resolve, 0));
}

describe('main event wiring', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
        vi.stubGlobal('localStorage', createStorageMock());
        vi.stubGlobal('sessionStorage', createStorageMock());
        localStorage.clear();
        sessionStorage.clear();
        createAppShell();
    });

    it('切换歌单动作时应同步更新输入占位和按钮文案', async () => {
        await initializeMainModule();

        const actionSelect = document.getElementById('playlistActionSelect') as HTMLSelectElement;
        actionSelect.value = 'radio';
        actionSelect.dispatchEvent(new Event('change'));

        expect((document.getElementById('playlistActionInput') as HTMLInputElement).placeholder).toBe('输入电台ID...');
        expect(document.querySelector('#playlistActionBtn span')?.textContent).toBe('添加');
        expect(document.querySelector('#playlistActionBtn i')?.className).toBe('fas fa-podcast');
    });

    it('搜索输入按下回车时应触发搜索处理', async () => {
        const apiModule = await import('./api');
        const searchMusicAPIMock = vi.mocked(apiModule.searchMusicAPI);
        searchMusicAPIMock.mockResolvedValue([]);

        await initializeMainModule();

        const searchInput = document.getElementById('searchInput') as HTMLInputElement;
        searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
        searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(searchMusicAPIMock).toHaveBeenCalledTimes(1);
        expect(searchMusicAPIMock).toHaveBeenCalledWith('周杰伦', 'netease');
    });

    it('点击返回歌手列表按钮时应恢复主区域显隐', async () => {
        await initializeMainModule();

        const backBtn = document.getElementById('backToArtists') as HTMLButtonElement;
        backBtn.click();

        expect((document.getElementById('artistGrid') as HTMLElement).style.display).toBe('');
        expect((document.getElementById('artistFilter') as HTMLElement).style.display).toBe('');
        expect((document.getElementById('artistDetailView') as HTMLElement).style.display).toBe('none');
        expect((document.getElementById('albumSongsView') as HTMLElement).style.display).toBe('none');
    });
});
