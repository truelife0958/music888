/**
 * Vitest 测试环境设置
 */

// 模拟 localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};

    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
            store[key] = value.toString();
        },
        removeItem: (key: string) => {
            delete store[key];
        },
        clear: () => {
            store = {};
        },
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
});

// 模拟 Audio API
class AudioMock {
    src: string = '';
    volume: number = 1;
    currentTime: number = 0;
    duration: number = 0;
    paused: boolean = true;

    play() {
        this.paused = false;
        return Promise.resolve();
    }

    pause() {
        this.paused = true;
    }

    load() {
        // Mock load
    }

    addEventListener() {
        // Mock event listener
    }

    removeEventListener() {
        // Mock event listener removal
    }
}

(global as any).Audio = AudioMock;

// 模拟 fetch API
(global as any).fetch = async (url: string) => {
    return {
        ok: true,
        json: async () => ({}),
        text: async () => '',
    };
};

// 模拟 navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
    value: {
        writeText: async (text: string) => {
            return Promise.resolve();
        },
    },
    writable: true,
});
