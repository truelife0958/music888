/**
 * 倍速播放模块
 * 支持调整播放速度，适合听书、学习场景
 */

import * as ui from './ui.js';

// 可用的播放速度
const PLAYBACK_RATES = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
const DEFAULT_RATE = 1.0;
const STORAGE_KEY = 'playbackRate';

let currentRate: number = DEFAULT_RATE;

/**
 * 初始化倍速播放功能
 */
export function initPlaybackRate(): void {
    loadSavedRate();
    createRateButton();
    applyRate(currentRate);
}

/**
 * 加载保存的播放速度
 */
function loadSavedRate(): void {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const rate = parseFloat(saved);
            if (PLAYBACK_RATES.includes(rate)) {
                currentRate = rate;
            }
        }
    } catch (error) {
        currentRate = DEFAULT_RATE;
    }
}

/**
 * 保存播放速度
 */
function saveRate(rate: number): void {
    try {
        localStorage.setItem(STORAGE_KEY, rate.toString());
    } catch (error) {
        console.error('保存播放速度失败');
    }
}

/**
 * 创建倍速按钮
 */
function createRateButton(): void {
    // 检查按钮是否已存在，避免重复创建
    if (document.getElementById('playbackRateBtn')) {
        return;
    }

    const playerControls = document.querySelector('.player-controls');
    if (!playerControls) return;

    const rateBtn = document.createElement('button');
    rateBtn.id = 'playbackRateBtn';
    rateBtn.className = 'control-btn small';
    rateBtn.title = '倍速播放';
    updateButtonText(rateBtn, currentRate);
    
    rateBtn.addEventListener('click', showRateMenu);
    
    // 插入到播放模式按钮后面
    const playModeBtn = document.getElementById('playModeBtn');
    if (playModeBtn && playModeBtn.parentNode) {
        playModeBtn.parentNode.insertBefore(rateBtn, playModeBtn.nextSibling);
    } else {
        playerControls.appendChild(rateBtn);
    }

    // 添加样式
    addRateStyles();
}

/**
 * 更新按钮文本
 */
function updateButtonText(btn: HTMLElement, rate: number): void {
    btn.innerHTML = `<span style="font-size: 12px; font-weight: bold;">${rate}x</span>`;
    btn.title = `倍速播放: ${rate}x`;
    
    // 如果不是1.0x，高亮显示
    if (rate !== 1.0) {
        btn.style.color = 'var(--primary-color, #6366f1)';
    } else {
        btn.style.color = '';
    }
}

/**
 * 显示速度菜单
 */
function showRateMenu(): void {
    const menuHTML = `
        <div class="rate-menu">
            <div class="rate-header">
                <i class="fas fa-tachometer-alt"></i>
                播放速度
            </div>
            <div class="rate-list">
                ${PLAYBACK_RATES.map(rate => `
                    <button class="rate-item ${rate === currentRate ? 'active' : ''}" data-rate="${rate}">
                        <span class="rate-value">${rate}x</span>
                        ${rate === 1.0 ? '<span class="rate-label">正常</span>' : ''}
                        ${rate === currentRate ? '<i class="fas fa-check"></i>' : ''}
                    </button>
                `).join('')}
            </div>
            <div class="rate-tip">
                <i class="fas fa-info-circle"></i>
                倍速播放不会改变音调
            </div>
        </div>
    `;

    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.className = 'rate-menu-overlay';
    overlay.innerHTML = menuHTML;

    document.body.appendChild(overlay);

    // 绑定事件
    bindMenuEvents(overlay);
}

/**
 * 绑定菜单事件
 */
function bindMenuEvents(overlay: HTMLElement): void {
    // 点击速度选项
    overlay.querySelectorAll('.rate-item').forEach(item => {
        item.addEventListener('click', () => {
            const rate = parseFloat((item as HTMLElement).dataset.rate || '1.0');
            setPlaybackRate(rate);
            overlay.remove();
        });
    });

    // 点击遮罩层关闭
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
        }
    });

    // ESC 键关闭
    const escHandler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            overlay.remove();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

/**
 * 设置播放速度
 */
export function setPlaybackRate(rate: number): void {
    if (!PLAYBACK_RATES.includes(rate)) return;
    
    currentRate = rate;
    applyRate(rate);
    saveRate(rate);
    
    // 更新按钮显示
    const btn = document.getElementById('playbackRateBtn');
    if (btn) {
        updateButtonText(btn, rate);
    }
    
    // 显示通知
    const rateText = rate === 1.0 ? '正常速度' : `${rate}倍速`;
    ui.showNotification(`播放速度: ${rateText}`, 'success');
}

/**
 * 应用播放速度到音频元素
 */
function applyRate(rate: number): void {
    const audio = document.querySelector('audio');
    if (audio) {
        audio.playbackRate = rate;
    }
    
    // 监听新的音频加载
    document.addEventListener('loadedmetadata', () => {
        const audio = document.querySelector('audio');
        if (audio) {
            audio.playbackRate = currentRate;
        }
    }, true);
}

/**
 * 获取当前播放速度
 */
export function getCurrentRate(): number {
    return currentRate;
}

/**
 * 添加样式
 */
function addRateStyles(): void {
    if (document.getElementById('playback-rate-styles')) return;

    const style = document.createElement('style');
    style.id = 'playback-rate-styles';
    style.textContent = `
        #playbackRateBtn {
            min-width: 45px;
        }

        .rate-menu-overlay {
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

        .rate-menu {
            background: var(--bg-secondary, #1e1e2e);
            border-radius: 12px;
            padding: 20px;
            min-width: 250px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            animation: slideIn 0.3s ease;
        }

        .rate-header {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 16px;
            font-weight: 600;
            color: var(--primary-color, #6366f1);
            margin-bottom: 16px;
        }

        .rate-list {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
            margin-bottom: 16px;
        }

        .rate-item {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 12px;
            background: rgba(255, 255, 255, 0.05);
            border: 2px solid transparent;
            border-radius: 8px;
            color: rgba(255, 255, 255, 0.9);
            cursor: pointer;
            transition: all 0.2s;
            font-size: 15px;
            font-weight: 500;
        }

        .rate-item:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: var(--primary-color, #6366f1);
            transform: translateY(-2px);
        }

        .rate-item.active {
            background: rgba(99, 102, 241, 0.2);
            border-color: var(--primary-color, #6366f1);
            color: var(--primary-color, #6366f1);
        }

        .rate-value {
            font-weight: 700;
        }

        .rate-label {
            font-size: 11px;
            opacity: 0.7;
        }

        .rate-item i.fa-check {
            color: var(--primary-color, #6366f1);
            font-size: 12px;
        }

        .rate-tip {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px;
            background: rgba(99, 102, 241, 0.1);
            border-radius: 6px;
            font-size: 12px;
            color: rgba(255, 255, 255, 0.6);
        }

        .rate-tip i {
            color: var(--primary-color, #6366f1);
        }

        /* 浅色主题适配 */
        body.theme-light .rate-menu {
            background: #ffffff;
        }

        body.theme-light .rate-item {
            background: rgba(0, 0, 0, 0.03);
            color: #333;
        }

        body.theme-light .rate-item:hover {
            background: rgba(0, 0, 0, 0.06);
        }

        body.theme-light .rate-tip {
            color: #666;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes slideIn {
            from {
                opacity: 0;
                transform: scale(0.9);
            }
            to {
                opacity: 1;
                transform: scale(1);
            }
        }
    `;
    document.head.appendChild(style);
}