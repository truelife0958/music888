/**
 * 夜间模式自动切换模块
 * 功能:
 * 1. 根据系统时间自动切换主题
 * 2. 支持系统主题检测
 * 3. 可在设置中开启/关闭自动切换
 */

import * as ui from './ui.js';

// 主题配置
const THEME_CONFIG = {
    STORAGE_KEY: 'yt_auto_theme',
    CURRENT_THEME_KEY: 'yt_current_theme',
    NIGHT_START: 18, // 晚上6点开始
    NIGHT_END: 6,    // 早上6点结束
};

let autoThemeEnabled = false;
let themeCheckInterval: number | null = null;

// 初始化自动主题切换
export function initAutoTheme(): void {
    // 加载设置
    autoThemeEnabled = loadAutoThemeSetting();

    // 添加设置项到设置面板
    addAutoThemeSettingToPanel();

    // 如果启用自动主题,立即检查并应用
    if (autoThemeEnabled) {
        applyAutoTheme();
        startAutoThemeCheck();
    }

    // 监听系统主题变化
    if (window.matchMedia) {
        const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
        darkModeQuery.addEventListener('change', (e) => {
            if (autoThemeEnabled) {
                applySystemTheme(e.matches);
            }
        });
    }
}

// 应用自动主题
function applyAutoTheme(): void {
    const hour = new Date().getHours();
    const shouldBeDark = hour >= THEME_CONFIG.NIGHT_START || hour < THEME_CONFIG.NIGHT_END;

    if (shouldBeDark) {
        applyTheme('dark');
    } else {
        applyTheme('light');
    }
}

// 应用系统主题
function applySystemTheme(isDark: boolean): void {
    applyTheme(isDark ? 'dark' : 'light');
}

// 应用主题
function applyTheme(theme: 'dark' | 'light' | 'default'): void {
    const body = document.body;
    body.className = ''; // 清除所有主题类

    if (theme === 'dark') {
        body.classList.add('theme-dark');
    } else if (theme === 'light') {
        body.classList.add('theme-light');
    }
    // default 主题不需要添加类

    // 保存当前主题
    try {
        localStorage.setItem(THEME_CONFIG.CURRENT_THEME_KEY, theme);
    } catch (error) {
        console.error('保存主题失败:', error);
    }
}

// 启动自动主题检查
function startAutoThemeCheck(): void {
    // 每分钟检查一次
    if (themeCheckInterval) {
        clearInterval(themeCheckInterval);
    }

    themeCheckInterval = window.setInterval(() => {
        if (autoThemeEnabled) {
            applyAutoTheme();
        }
    }, 60000); // 60秒
}

// 停止自动主题检查
function stopAutoThemeCheck(): void {
    if (themeCheckInterval) {
        clearInterval(themeCheckInterval);
        themeCheckInterval = null;
    }
}

// 保存自动主题设置
function saveAutoThemeSetting(enabled: boolean): void {
    try {
        localStorage.setItem(THEME_CONFIG.STORAGE_KEY, JSON.stringify(enabled));
    } catch (error) {
        console.error('保存自动主题设置失败:', error);
    }
}

// 加载自动主题设置
function loadAutoThemeSetting(): boolean {
    try {
        const saved = localStorage.getItem(THEME_CONFIG.STORAGE_KEY);
        return saved ? JSON.parse(saved) : false;
    } catch (error) {
        console.error('加载自动主题设置失败:', error);
        return false;
    }
}

// 在设置面板中添加自动主题设置
function addAutoThemeSettingToPanel(): void {
    // 主题切换功能已禁用 - 项目不支持主题切换
    return;
}

// 获取当前主题
export function getCurrentTheme(): string {
    try {
        return localStorage.getItem(THEME_CONFIG.CURRENT_THEME_KEY) || 'default';
    } catch (error) {
        return 'default';
    }
}

// 导出函数供外部使用
export function toggleAutoTheme(enabled: boolean): void {
    autoThemeEnabled = enabled;
    saveAutoThemeSetting(enabled);

    if (enabled) {
        applyAutoTheme();
        startAutoThemeCheck();
    } else {
        stopAutoThemeCheck();
    }
}