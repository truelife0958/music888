/**
 * 键盘快捷键管理模块
 * 提供全局快捷键支持，提升操作效率
 */

import * as player from './player.js';
import * as ui from './ui.js';

// 快捷键配置
interface ShortcutConfig {
    key: string;
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    description: string;
    handler: () => void;
}

// 快捷键列表
const shortcuts: ShortcutConfig[] = [
    {
        key: ' ',
        description: '播放/暂停',
        handler: () => {
            player.togglePlay();
        }
    },
    {
        key: 'ArrowRight',
        description: '快进 5 秒',
        handler: () => {
            const audio = (player as any).audioPlayer || document.querySelector('audio');
            if (audio && audio.duration) {
                audio.currentTime = Math.min(audio.currentTime + 5, audio.duration);
                ui.showNotification('快进 5 秒', 'info');
            }
        }
    },
    {
        key: 'ArrowLeft',
        description: '快退 5 秒',
        handler: () => {
            const audio = (player as any).audioPlayer || document.querySelector('audio');
            if (audio && audio.duration) {
                audio.currentTime = Math.max(audio.currentTime - 5, 0);
                ui.showNotification('快退 5 秒', 'info');
            }
        }
    },
    {
        key: 'ArrowUp',
        description: '音量 +10%',
        handler: () => {
            const volumeSlider = document.getElementById('volumeSlider') as HTMLInputElement;
            if (volumeSlider) {
                const newVolume = Math.min(parseInt(volumeSlider.value) + 10, 100);
                volumeSlider.value = newVolume.toString();
                player.setVolume(newVolume.toString());
                ui.showNotification(`音量: ${newVolume}%`, 'info');
            }
        }
    },
    {
        key: 'ArrowDown',
        description: '音量 -10%',
        handler: () => {
            const volumeSlider = document.getElementById('volumeSlider') as HTMLInputElement;
            if (volumeSlider) {
                const newVolume = Math.max(parseInt(volumeSlider.value) - 10, 0);
                volumeSlider.value = newVolume.toString();
                player.setVolume(newVolume.toString());
                ui.showNotification(`音量: ${newVolume}%`, 'info');
            }
        }
    },
    {
        key: 'n',
        description: '下一曲',
        handler: () => {
            player.nextSong();
        }
    },
    {
        key: 'p',
        description: '上一曲',
        handler: () => {
            player.previousSong();
        }
    },
    {
        key: 'l',
        description: '喜欢/取消喜欢',
        handler: () => {
            const currentSong = player.getCurrentSong();
            if (currentSong) {
                player.toggleFavoriteButton(currentSong);
            } else {
                ui.showNotification('当前没有播放的歌曲', 'warning');
            }
        }
    },
    {
        key: 'm',
        description: '静音/取消静音',
        handler: () => {
            const volumeSlider = document.getElementById('volumeSlider') as HTMLInputElement;
            const audio = (player as any).audioPlayer || document.querySelector('audio');
            if (audio && volumeSlider) {
                if (audio.volume > 0) {
                    // 保存当前音量并静音
                    audio.dataset.previousVolume = volumeSlider.value;
                    volumeSlider.value = '0';
                    player.setVolume('0');
                    ui.showNotification('已静音', 'info');
                } else {
                    // 恢复之前的音量
                    const prevVolume = audio.dataset.previousVolume || '50';
                    volumeSlider.value = prevVolume;
                    player.setVolume(prevVolume);
                    ui.showNotification(`音量: ${prevVolume}%`, 'info');
                }
            }
        }
    },
    {
        key: 'r',
        description: '切换播放模式',
        handler: () => {
            player.togglePlayMode();
        }
    },
    {
        key: 'd',
        description: '下载当前歌曲',
        handler: () => {
            const currentSong = player.getCurrentSong();
            if (currentSong) {
                player.downloadSongByData(currentSong);
            } else {
                ui.showNotification('当前没有播放的歌曲', 'warning');
            }
        }
    },
    {
        key: '?',
        shift: true,
        description: '显示快捷键帮助',
        handler: () => {
            showShortcutsHelp();
        }
    }
];

// 是否启用快捷键
let shortcutsEnabled = true;

/**
 * 初始化键盘快捷键
 */
export function initKeyboardShortcuts(): void {
    // 加载用户设置
    const savedState = localStorage.getItem('keyboardShortcutsEnabled');
    if (savedState !== null) {
        shortcutsEnabled = savedState === 'true';
    }

    // 监听键盘事件
    document.addEventListener('keydown', handleKeyDown);

    // 显示提示
    if (shortcutsEnabled) {
        setTimeout(() => {
            ui.showNotification('快捷键已启用，按 Shift+? 查看帮助', 'info');
        }, 2000);
    }
}

/**
 * 处理键盘按下事件
 */
function handleKeyDown(e: KeyboardEvent): void {
    // 如果快捷键被禁用，则返回
    if (!shortcutsEnabled) return;

    // 如果焦点在输入框中，则不触发快捷键（除了 Esc）
    const target = e.target as HTMLElement;
    if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
    ) {
        if (e.key !== 'Escape') return;
    }

    // 查找匹配的快捷键
    const matchedShortcut = shortcuts.find(shortcut => {
        const keyMatch = shortcut.key === e.key;
        const ctrlMatch = shortcut.ctrl ? e.ctrlKey || e.metaKey : !e.ctrlKey && !e.metaKey;
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const altMatch = shortcut.alt ? e.altKey : !e.altKey;
        
        return keyMatch && ctrlMatch && shiftMatch && altMatch;
    });

    if (matchedShortcut) {
        e.preventDefault();
        matchedShortcut.handler();
    }
}

/**
 * 显示快捷键帮助对话框
 */
function showShortcutsHelp(): void {
    const helpContent = `
        <div class="shortcuts-help">
            <h3 style="margin-top: 0; color: var(--primary-color); display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-keyboard"></i>
                键盘快捷键
            </h3>
            <div class="shortcuts-list">
                ${shortcuts.map(shortcut => {
                    let keyDisplay = shortcut.key === ' ' ? 'Space' : shortcut.key;
                    if (shortcut.key.startsWith('Arrow')) {
                        keyDisplay = {
                            'ArrowUp': '↑',
                            'ArrowDown': '↓',
                            'ArrowLeft': '←',
                            'ArrowRight': '→'
                        }[shortcut.key] || keyDisplay;
                    }
                    const modifiers = [
                        shortcut.ctrl ? 'Ctrl' : '',
                        shortcut.shift ? 'Shift' : '',
                        shortcut.alt ? 'Alt' : ''
                    ].filter(Boolean);
                    const fullKey = modifiers.length > 0 
                        ? `${modifiers.join('+')}+${keyDisplay}` 
                        : keyDisplay;
                    
                    return `
                        <div class="shortcut-item">
                            <kbd class="shortcut-key">${fullKey}</kbd>
                            <span class="shortcut-desc">${shortcut.description}</span>
                        </div>
                    `;
                }).join('')}
            </div>
            <div class="shortcuts-footer">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <input type="checkbox" id="toggleShortcuts" ${shortcutsEnabled ? 'checked' : ''}>
                    <span>启用键盘快捷键</span>
                </label>
            </div>
        </div>
    `;

    // 创建对话框
    const overlay = document.createElement('div');
    overlay.className = 'shortcuts-overlay';
    overlay.innerHTML = `
        <div class="shortcuts-dialog">
            ${helpContent}
            <button class="shortcuts-close-btn">
                <i class="fas fa-times"></i> 关闭
            </button>
        </div>
    `;

    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
        .shortcuts-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.2s ease;
        }

        .shortcuts-dialog {
            background: var(--bg-secondary, #1e1e2e);
            border-radius: 12px;
            padding: 24px;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            animation: slideIn 0.3s ease;
        }

        .shortcuts-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin: 20px 0;
        }

        .shortcut-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 6px;
            transition: background 0.2s;
        }

        .shortcut-item:hover {
            background: rgba(255, 255, 255, 0.08);
        }

        .shortcut-key {
            background: linear-gradient(to bottom, #4a4a5e, #2a2a3e);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 4px;
            padding: 4px 10px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            font-weight: bold;
            color: #fff;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            min-width: 60px;
            text-align: center;
        }

        .shortcut-desc {
            flex: 1;
            margin-left: 16px;
            color: rgba(255, 255, 255, 0.8);
        }

        .shortcuts-footer {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .shortcuts-close-btn {
            width: 100%;
            margin-top: 16px;
            padding: 12px;
            background: var(--primary-color, #6366f1);
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s;
        }

        .shortcuts-close-btn:hover {
            background: var(--primary-hover, #4f46e5);
            transform: translateY(-1px);
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(-20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        /* 浅色主题适配 */
        body.theme-light .shortcuts-dialog {
            background: #ffffff;
        }

        body.theme-light .shortcut-key {
            background: linear-gradient(to bottom, #e0e0e0, #f5f5f5);
            border-color: #ccc;
            color: #333;
        }

        body.theme-light .shortcut-desc {
            color: #555;
        }

        body.theme-light .shortcut-item {
            background: rgba(0, 0, 0, 0.03);
        }

        body.theme-light .shortcut-item:hover {
            background: rgba(0, 0, 0, 0.06);
        }

        body.theme-light .shortcuts-footer {
            border-top-color: rgba(0, 0, 0, 0.1);
        }
    `;
    document.head.appendChild(style);

    document.body.appendChild(overlay);

    // 关闭对话框
    const closeBtn = overlay.querySelector('.shortcuts-close-btn');
    closeBtn?.addEventListener('click', () => {
        overlay.remove();
        style.remove();
    });

    // 点击遮罩层关闭
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
            style.remove();
        }
    });

    // ESC 键关闭
    const escHandler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            overlay.remove();
            style.remove();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);

    // 切换快捷键开关
    const toggleCheckbox = overlay.querySelector('#toggleShortcuts') as HTMLInputElement;
    toggleCheckbox?.addEventListener('change', (e) => {
        const enabled = (e.target as HTMLInputElement).checked;
        toggleShortcuts(enabled);
    });
}

/**
 * 启用/禁用快捷键
 */
export function toggleShortcuts(enabled: boolean): void {
    shortcutsEnabled = enabled;
    localStorage.setItem('keyboardShortcutsEnabled', enabled.toString());
    ui.showNotification(
        enabled ? '键盘快捷键已启用' : '键盘快捷键已禁用',
        'success'
    );
}

/**
 * 获取快捷键启用状态
 */
export function isShortcutsEnabled(): boolean {
    return shortcutsEnabled;
}

/**
 * 获取所有快捷键配置
 */
export function getShortcuts(): ShortcutConfig[] {
    return shortcuts;
}