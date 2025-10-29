// 设置管理模块
import * as ui from './ui.js';

// 设置键名常量
const SETTINGS_KEYS = {
    THEME: 'yt_theme',
    API_SOURCE: 'yt_default_api_source',
    AUTO_RETRY: 'yt_auto_retry',
    AUTO_PLAY: 'yt_auto_play',
    SHOW_LYRICS: 'yt_show_lyrics',
};

// 初始化设置面板
export function initSettings(): void {
    // 首先应用保存的主题
    const savedTheme = loadSetting(SETTINGS_KEYS.THEME, 'default');
    applyTheme(savedTheme);
    
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsModal = document.getElementById('closeSettingsModal');

    if (!settingsBtn || !settingsModal || !closeSettingsModal) {
                return;
    }

    // 打开设置面板
    settingsBtn.addEventListener('click', () => {
        settingsModal.classList.add('show');
        loadSettings();
        calculateCacheSize();
    });

    // 关闭设置面板
    closeSettingsModal.addEventListener('click', () => {
        settingsModal.classList.remove('show');
    });

    // 点击背景关闭
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.classList.remove('show');
        }
    });

    // 绑定设置项事件
    bindSettingEvents();
}

// 绑定设置项的事件
function bindSettingEvents(): void {
    // 主题切换
    const themeSelect = document.getElementById('themeSelect') as HTMLSelectElement;
    if (themeSelect) {
        themeSelect.addEventListener('change', (e) => {
            const theme = (e.target as HTMLSelectElement).value;
            saveSettings(SETTINGS_KEYS.THEME, theme);
            applyTheme(theme);
            ui.showNotification(`已切换到${getThemeName(theme)}`, 'success');
        });
    }

    // 默认API源
    const apiSourceSelect = document.getElementById('apiSourceSelect') as HTMLSelectElement;
    if (apiSourceSelect) {
        apiSourceSelect.addEventListener('change', (e) => {
            const source = (e.target as HTMLSelectElement).value;
            saveSettings(SETTINGS_KEYS.API_SOURCE, source);
            ui.showNotification('默认音乐源已更新', 'success');
        });
    }

    // 自动重试
    const autoRetryCheckbox = document.getElementById('autoRetryCheckbox') as HTMLInputElement;
    if (autoRetryCheckbox) {
        autoRetryCheckbox.addEventListener('change', (e) => {
            const enabled = (e.target as HTMLInputElement).checked;
            saveSettings(SETTINGS_KEYS.AUTO_RETRY, enabled);
            ui.showNotification(`API自动重试已${enabled ? '开启' : '关闭'}`, 'info');
        });
    }

    // 自动播放
    const autoPlayCheckbox = document.getElementById('autoPlayCheckbox') as HTMLInputElement;
    if (autoPlayCheckbox) {
        autoPlayCheckbox.addEventListener('change', (e) => {
            const enabled = (e.target as HTMLInputElement).checked;
            saveSettings(SETTINGS_KEYS.AUTO_PLAY, enabled);
            ui.showNotification(`自动播放下一首已${enabled ? '开启' : '关闭'}`, 'info');
        });
    }

    // 显示歌词
    const showLyricsCheckbox = document.getElementById('showLyricsCheckbox') as HTMLInputElement;
    if (showLyricsCheckbox) {
        showLyricsCheckbox.addEventListener('change', (e) => {
            const enabled = (e.target as HTMLInputElement).checked;
            saveSettings(SETTINGS_KEYS.SHOW_LYRICS, enabled);
            toggleLyricsDisplay(enabled);
            ui.showNotification(`歌词显示已${enabled ? '开启' : '关闭'}`, 'info');
        });
    }

    // 清理缓存按钮
    const clearCacheBtn = document.getElementById('clearCacheBtn');
    if (clearCacheBtn) {
        clearCacheBtn.addEventListener('click', async () => {
            if (confirm('确定要清理缓存吗?这将删除临时数据但保留你的收藏和播放历史。')) {
                await clearCache();
                ui.showNotification('缓存已清理', 'success');
                calculateCacheSize();
            }
        });
    }

    // 清空所有数据按钮
    const clearAllDataBtn = document.getElementById('clearAllDataBtn');
    if (clearAllDataBtn) {
        clearAllDataBtn.addEventListener('click', () => {
            if (confirm('⚠️ 警告!这将删除所有数据,包括收藏、播放历史、歌单等,确定要继续吗?')) {
                if (confirm('再次确认:真的要删除所有数据吗?此操作不可恢复!')) {
                    clearAllData();
                    ui.showNotification('所有数据已清空', 'warning');
                    setTimeout(() => {
                        location.reload();
                    }, 1500);
                }
            }
        });
    }
}

// 加载设置 - 从localStorage读取
function loadSettings(): void {
    // 加载主题
    const theme = loadSetting(SETTINGS_KEYS.THEME, 'default');
    const themeSelect = document.getElementById('themeSelect') as HTMLSelectElement;
    if (themeSelect) {
        themeSelect.value = theme;
    }

    // 加载API源
    const apiSource = loadSetting(SETTINGS_KEYS.API_SOURCE, 'netease');
    const apiSourceSelect = document.getElementById('apiSourceSelect') as HTMLSelectElement;
    if (apiSourceSelect) {
        apiSourceSelect.value = apiSource;
    }

    // 加载自动重试
    const autoRetry = loadSetting(SETTINGS_KEYS.AUTO_RETRY, true);
    const autoRetryCheckbox = document.getElementById('autoRetryCheckbox') as HTMLInputElement;
    if (autoRetryCheckbox) {
        autoRetryCheckbox.checked = autoRetry;
    }

    // 加载自动播放
    const autoPlay = loadSetting(SETTINGS_KEYS.AUTO_PLAY, false);
    const autoPlayCheckbox = document.getElementById('autoPlayCheckbox') as HTMLInputElement;
    if (autoPlayCheckbox) {
        autoPlayCheckbox.checked = autoPlay;
    }

    // 加载显示歌词
    const showLyrics = loadSetting(SETTINGS_KEYS.SHOW_LYRICS, true);
    const showLyricsCheckbox = document.getElementById('showLyricsCheckbox') as HTMLInputElement;
    if (showLyricsCheckbox) {
        showLyricsCheckbox.checked = showLyrics;
    }
}

// 保存设置
function saveSettings(key: string, value: any): void {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
                ui.showNotification('保存设置失败', 'error');
    }
}

// 读取设置
function loadSetting(key: string, defaultValue: any): any {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : defaultValue;
    } catch (error) {
                return defaultValue;
    }
}

// 应用主题
function applyTheme(theme: string): void {
    const body = document.body;
    body.className = ''; // 清除所有主题类

    if (theme === 'dark') {
        body.classList.add('theme-dark');
    } else if (theme === 'light') {
        body.classList.add('theme-light');
    }
    // default 主题不需要添加类
}

// 获取主题名称
function getThemeName(theme: string): string {
    const themeNames: { [key: string]: string } = {
        'default': '默认主题',
        'dark': '深色主题',
        'light': '浅色主题',
    };
    return themeNames[theme] || '默认主题';
}

// 切换歌词显示
function toggleLyricsDisplay(show: boolean): void {
    const lyricsContainer = document.getElementById('lyricsContainerInline');
    if (lyricsContainer) {
        lyricsContainer.style.display = show ? 'block' : 'none';
    }
}

// 计算缓存大小（粗略估算LocalStorage使用量）
async function calculateCacheSize(): Promise<void> {
    const cacheSizeElement = document.getElementById('cacheSize');
    if (!cacheSizeElement) return;

    try {
        let totalSize = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                totalSize += localStorage[key].length + key.length;
            }
        }

        // 转换为KB
        const sizeInKB = (totalSize / 1024).toFixed(2);
        cacheSizeElement.textContent = `${sizeInKB} KB`;
    } catch (error) {
                cacheSizeElement.textContent = '计算失败';
    }
}

// 清理缓存（只删除临时数据，保留用户数据）
async function clearCache(): Promise<void> {
    try {
        // 保留这些重要的用户数据
        const keysToKeep = [
            'favorites',
            'playHistory',
            'savedPlaylists',
            SETTINGS_KEYS.THEME,
            SETTINGS_KEYS.API_SOURCE,
            SETTINGS_KEYS.AUTO_RETRY,
            SETTINGS_KEYS.AUTO_PLAY,
            SETTINGS_KEYS.SHOW_LYRICS,
        ];

        const dataToKeep: { [key: string]: string | null } = {};
        keysToKeep.forEach(key => {
            dataToKeep[key] = localStorage.getItem(key);
        });

        // 清空localStorage
        localStorage.clear();

        // 恢复用户数据
        for (const key in dataToKeep) {
            if (dataToKeep[key]) {
                localStorage.setItem(key, dataToKeep[key]!);
            }
        }

            } catch (error) {
                throw error;
    }
}

// 清空所有数据（慎用！）
function clearAllData(): void {
    try {
        localStorage.clear();
        sessionStorage.clear();
            } catch (error) {
            }
}

// 获取设置值的公共方法
export function getSetting(key: string, defaultValue: any = null): any {
    return loadSetting(key, defaultValue);
}

// 保存设置值的公共方法
export function setSetting(key: string, value: any): void {
    saveSettings(key, value);
}

// 导出设置键常量
export { SETTINGS_KEYS };
