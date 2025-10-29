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
    const settingsModalBody = document.querySelector('.settings-modal-body');
    if (!settingsModalBody) return;

    // 查找播放设置区块
    const playSection = Array.from(settingsModalBody.querySelectorAll('.settings-section'))
        .find(section => section.querySelector('.settings-section-title')?.textContent?.includes('播放设置'));

    if (!playSection) return;

    // 检查是否已添加
    if (playSection.querySelector('#autoThemeCheckbox')) return;

    // 创建自动主题设置项
    const autoThemeSettingHTML = `
        <div class="settings-item">
            <label>
                <input type="checkbox" id="autoThemeCheckbox" ${autoThemeEnabled ? 'checked' : ''}>
                <span>自动切换夜间模式</span>
            </label>
            <div style="font-size: 11px; color: rgba(255,255,255,0.5); margin-top: 4px; margin-left: 24px;">
                <i class="fas fa-moon"></i> 18:00-6:00 自动切换到深色主题
            </div>
        </div>
        <div class="settings-item">
            <label>
                <input type="checkbox" id="followSystemThemeCheckbox">
                <span>跟随系统主题</span>
            </label>
            <div style="font-size: 11px; color: rgba(255,255,255,0.5); margin-top: 4px; margin-left: 24px;">
                <i class="fas fa-desktop"></i> 自动匹配系统的浅色/深色模式
            </div>
        </div>
    `;

    playSection.insertAdjacentHTML('beforeend', autoThemeSettingHTML);

    // 绑定自动主题切换事件
    const autoThemeCheckbox = document.getElementById('autoThemeCheckbox') as HTMLInputElement;
    if (autoThemeCheckbox) {
        autoThemeCheckbox.addEventListener('change', () => {
            autoThemeEnabled = autoThemeCheckbox.checked;
            saveAutoThemeSetting(autoThemeEnabled);

            if (autoThemeEnabled) {
                applyAutoTheme();
                startAutoThemeCheck();
                ui.showNotification('已开启自动夜间模式 (18:00-6:00)', 'success');
            } else {
                stopAutoThemeCheck();
                ui.showNotification('已关闭自动夜间模式', 'info');
            }

            // 取消跟随系统主题
            const followSystemCheckbox = document.getElementById('followSystemThemeCheckbox') as HTMLInputElement;
            if (followSystemCheckbox && autoThemeEnabled) {
                followSystemCheckbox.checked = false;
            }
        });
    }

    // 绑定跟随系统主题事件
    const followSystemCheckbox = document.getElementById('followSystemThemeCheckbox') as HTMLInputElement;
    if (followSystemCheckbox) {
        // 检查是否支持系统主题检测
        const supportsColorScheme = window.matchMedia && window.matchMedia('(prefers-color-scheme)').media !== 'not all';
        if (!supportsColorScheme) {
            followSystemCheckbox.disabled = true;
            const label = followSystemCheckbox.parentElement;
            if (label) {
                label.title = '您的浏览器不支持系统主题检测';
                label.style.opacity = '0.5';
            }
        }

        followSystemCheckbox.addEventListener('change', () => {
            const followSystem = followSystemCheckbox.checked;

            if (followSystem) {
                // 取消自动时间切换
                if (autoThemeCheckbox) {
                    autoThemeCheckbox.checked = false;
                    autoThemeEnabled = false;
                    saveAutoThemeSetting(false);
                    stopAutoThemeCheck();
                }

                // 应用系统主题
                const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                applySystemTheme(isDark);
                ui.showNotification(`已切换到${isDark ? '深色' : '浅色'}主题 (跟随系统)`, 'success');
            } else {
                ui.showNotification('已取消跟随系统主题', 'info');
            }
        });
    }
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