
/**
 * 定时关闭模块
 * 提供睡前听歌的定时关闭功能
 */

import * as ui from './ui.js';
import * as player from './player.js';

// 定时器状态
let timerInterval: number | null = null;
let remainingSeconds: number = 0;
let isTimerActive: boolean = false;
let timerMode: 'countdown' | 'finish-current' = 'countdown';

// 预设时间选项（秒）
const PRESET_TIMES = {
    '15min': 15 * 60,
    '30min': 30 * 60,
    '45min': 45 * 60,
    '60min': 60 * 60,
    '90min': 90 * 60,
    '120min': 120 * 60
};

/**
 * 初始化定时关闭功能
 */
export function initSleepTimer(): void {
    // 创建定时器按钮（添加到播放器控制区域）
    createTimerButton();
    
    // 恢复之前的定时器状态（如果有）
    restoreTimerState();
    
    // 添加样式
    addTimerStyles();
}

/**
 * 创建定时器按钮
 */
function createTimerButton(): void {
    const playerControls = document.querySelector('.player-right');
    if (!playerControls) return;

    const timerBtn = document.createElement('button');
    timerBtn.id = 'sleepTimerBtn';
    timerBtn.className = 'control-btn';
    timerBtn.title = '定时关闭';
    timerBtn.innerHTML = '<i class="fas fa-moon"></i>';
    
    timerBtn.addEventListener('click', showTimerDialog);
    
    // 插入到下载按钮之前
    const downloadBtn = document.getElementById('downloadSongBtn');
    if (downloadBtn) {
        playerControls.insertBefore(timerBtn, downloadBtn);
    } else {
        playerControls.appendChild(timerBtn);
    }
}

/**
 * 显示定时器设置对话框
 */
function showTimerDialog(): void {
    let dialogContent = '';
    
    if (isTimerActive) {
        dialogContent = `
            <div class="timer-status active">
                <div class="timer-display">
                    <i class="fas fa-hourglass-half"></i>
                    <span id="timerDisplay">${formatTime(remainingSeconds)}</span>
                </div>
                <p class="timer-mode-text">
                    ${timerMode === 'countdown' ? '倒计时结束后停止播放' : '播完当前歌曲后停止'}
                </p>
                <button class="timer-cancel-btn" id="cancelTimerBtn">
                    <i class="fas fa-times"></i> 取消定时
                </button>
            </div>
        `;
    } else {
        dialogContent = `
            <div class="timer-presets">
                <p style="color: rgba(255,255,255,0.7); margin-bottom: 16px;">选择定时时长：</p>
                <div class="preset-buttons">
                    <button class="preset-btn" data-time="${PRESET_TIMES['15min']}">
                        <i class="fas fa-clock"></i>
                        <span>15分钟</span>
                    </button>
                    <button class="preset-btn" data-time="${PRESET_TIMES['30min']}">
                        <i class="fas fa-clock"></i>
                        <span>30分钟</span>
                    </button>
                    <button class="preset-btn" data-time="${PRESET_TIMES['45min']}">
                        <i class="fas fa-clock"></i>
                        <span>45分钟</span>
                    </button>
                    <button class="preset-btn" data-time="${PRESET_TIMES['60min']}">
                        <i class="fas fa-clock"></i>
                        <span>60分钟</span>
                    </button>
                    <button class="preset-btn" data-time="${PRESET_TIMES['90min']}">
                        <i class="fas fa-clock"></i>
                        <span>90分钟</span>
                    </button>
                    <button class="preset-btn" data-time="${PRESET_TIMES['120min']}">
                        <i class="fas fa-clock"></i>
                        <span>2小时</span>
                    </button>
                </div>
                
                <div class="custom-time">
                    <p style="color: rgba(255,255,255,0.7); margin: 20px 0 10px;">或自定义时长：</p>
                    <div class="custom-time-inputs">
                        <input type="number" id="customMinutes" placeholder="分钟" min="1" max="999" value="30">
                        <span style="margin: 0 8px;">分钟</span>
                        <button class="timer-set-btn" id="setCustomTimerBtn">
                            <i class="fas fa-check"></i> 设置
                        </button>
                    </div>
                </div>
                
                <div class="finish-current-option">
                    <button class="preset-btn finish-current-btn">
                        <i class="fas fa-music"></i>
                        <span>播完当前歌曲后关闭</span>
                    </button>
                </div>
            </div>
        `;
    }

    const dialogHTML = `
        <div class="sleep-timer-dialog">
            <h3 style="margin-top: 0; color: var(--primary-color); display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-moon"></i>
                定时关闭
            </h3>
            ${dialogContent}
            <button class="timer-close-btn">
                <i class="fas fa-times"></i> 关闭
            </button>
        </div>
    `;

    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.className = 'sleep-timer-overlay';
    overlay.innerHTML = dialogHTML;

    document.body.appendChild(overlay);

    // 绑定事件
    bindDialogEvents(overlay);

    // 如果定时器激活，开始更新显示
    if (isTimerActive) {
        updateTimerDisplay();
    }
}

/**
 * 绑定对话框事件
 */
function bindDialogEvents(overlay: HTMLElement): void {
    // 关闭按钮
    const closeBtn = overlay.querySelector('.timer-close-btn');
    closeBtn?.addEventListener('click', () => {
        overlay.remove();
    });

    // 点击遮罩层关闭
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
        }
    });

    // 预设时间按钮
    overlay.querySelectorAll('.preset-btn:not(.finish-current-btn)').forEach(btn => {
        btn.addEventListener('click', () => {
            const seconds = parseInt((btn as HTMLElement).dataset.time || '0');
            startTimer(seconds, 'countdown');
            overlay.remove();
        });
    });

    // 播完当前歌曲按钮
    const finishCurrentBtn = overlay.querySelector('.finish-current-btn');
    finishCurrentBtn?.addEventListener('click', () => {
        startTimer(0, 'finish-current');
        overlay.remove();
    });

    // 自定义时间设置
    const setCustomBtn = overlay.querySelector('#setCustomTimerBtn');
    setCustomBtn?.addEventListener('click', () => {
        const minutesInput = overlay.querySelector('#customMinutes') as HTMLInputElement;
        const minutes = parseInt(minutesInput.value) || 30;
        const seconds = minutes * 60;
        startTimer(seconds, 'countdown');
        overlay.remove();
    });

    // 取消定时器
    const cancelBtn = overlay.querySelector('#cancelTimerBtn');
    cancelBtn?.addEventListener('click', () => {
        cancelTimer();
        overlay.remove();
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
 * 启动定时器
 */
function startTimer(seconds: number, mode: 'countdown' | 'finish-current'): void {
    timerMode = mode;
    
    if (mode === 'finish-current') {
        // 播完当前歌曲模式
        ui.showNotification('将在当前歌曲播放完毕后停止', 'success');
        isTimerActive = true;
        updateTimerButton();
        
        // 监听歌曲结束事件
        const audio = document.querySelector('audio');
        if (audio) {
            const endHandler = () => {
                executeTimerAction();
                audio.removeEventListener('ended', endHandler);
            };
            audio.addEventListener('ended', endHandler);
        }
        
        saveTimerState();
    } else {
        // 倒计时模式
        remainingSeconds = seconds;
        isTimerActive = true;
        
        const minutes = Math.floor(seconds / 60);
        ui.showNotification(`定时关闭已设置: ${minutes}分钟`, 'success');
        
        updateTimerButton();
        startCountdown();
        saveTimerState();
    }
}

/**
 * 开始倒计时
 */
function startCountdown(): void {
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    timerInterval = window.setInterval(() => {
        remainingSeconds--;
        
        // 更新显示
        updateTimerButton();
        
        // 剩余时间提醒
        if (remainingSeconds === 60) {
            ui.showNotification('还有1分钟将停止播放', 'warning');
        } else if (remainingSeconds === 300) {
            ui.showNotification('还有5分钟将停止播放', 'info');
        }
        
        // 倒计时结束
        if (remainingSeconds <= 0) {
            executeTimerAction();
        }
        
        saveTimerState();
    }, 1000);
}

/**
 * 执行定时器动作
 */
function executeTimerAction(): void {
    // 停止播放
    const audio = document.querySelector('audio');
    if (audio && !audio.paused) {
        player.togglePlay();
    }
    
    // 清除定时器
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    isTimerActive = false;
    remainingSeconds = 0;
    
    updateTimerButton();
    clearTimerState();
    
    ui.showNotification('定时关闭：播放已停止', 'success');
}

/**
 * 取消定时器
 */
function cancelTimer(): void {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    isTimerActive = false;
    remainingSeconds = 0;
    timerMode = 'countdown';
    
    updateTimerButton();
    clearTimerState();
    
    ui.showNotification('定时关闭已取消', 'info');
}

/**
 * 更新定时器按钮显示
 */
function updateTimerButton(): void {
    const btn = document.getElementById('sleepTimerBtn');
    if (!btn) return;
    
    const icon = btn.querySelector('i');
    if (!icon) return;
    
    if (isTimerActive) {
        btn.classList.add('timer-active');
        icon.className = 'fas fa-hourglass-half';
        
        if (timerMode === 'countdown' && remainingSeconds > 0) {
            btn.title = `定时关闭: ${formatTime(remainingSeconds)}`;
        } else {
            btn.title = '定时关闭: 播完当前歌曲';
        }
    } else {
        btn.classList.remove('timer-active');
        icon.className = 'fas fa-moon';
        btn.title = '定时关闭';
    }
}

/**
 * 更新对话框中的定时器显示
 */
function updateTimerDisplay(): void {
    const display = document.getElementById('timerDisplay');
    if (display && isTimerActive && timerMode === 'countdown') {
        display.textContent = formatTime(remainingSeconds);
        setTimeout(updateTimerDisplay, 1000);
    }
}

/**
 * 格式化时间显示
 */
function formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
}

/**
 * 保存定时器状态
 */
function saveTimerState(): void {
    const state = {
        isActive: isTimerActive,
        remainingSeconds,
        mode: timerMode,
        timestamp: Date.now()
    };
    localStorage.setItem('sleepTimerState', JSON.stringify(state));
}

/**
 * 恢复定时器状态
 */
function restoreTimerState(): void {
    const saved = localStorage.getItem('sleepTimerState');
    if (!saved) return;
    
    try {
        const state = JSON.parse(saved);
        const elapsedSeconds = Math.floor((Date.now() - state.timestamp) / 1000);
        
        if (state.isActive && state.mode === 'countdown') {
            const newRemaining = state.remainingSeconds - elapsedSeconds;
            if (newRemaining > 0) {
                startTimer(newRemaining, 'countdown');
                ui.showNotification('定时关闭已恢复', 'info');
            } else {
                clearTimerState();
            }
        }
    } catch (error) {
        clearTimerState();
    }
}

/**
 * 清除定时器状态
 */
function clearTimerState(): void {
    localStorage.removeItem('sleepTimerState');
}

/**
 * 添加定时器样式
 */
function addTimerStyles(): void {
    if (document.getElementById('sleep-timer-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'sleep-timer-styles';
    style.textContent = `
        #sleepTimerBtn.timer-active {
            color: var(--primary-color, #6366f1);
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
        }

        .sleep-timer-overlay {
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

        .sleep-timer-dialog {
            background: var(--bg-secondary, #1e1e2e);
            border-radius: 12px;
            padding: 24px;
            max-width: 450px;
            width: 90%;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            animation: slideIn 0.3s ease;
        }

        .preset-buttons {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            margin-bottom: 16px;
        }

        .preset-btn {
            padding: 16px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            color: white;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
        }

        .preset-btn:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: var(--primary-color, #6366f1);
            transform: translateY(-2px);
        }

        .preset-btn i {
            font-size: 20px;
            color: var(--primary-color, #6366f1);
        }

        .finish-current-btn {
            width: 100%;
            margin-top: 12px;
            background: rgba(99, 102, 241, 0.1);
            border-color: var(--primary-color, #6366f1);
        }

        .custom-time-inputs {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .custom-time-inputs input {
            flex: 1;
            padding: 10px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 6px;
            color: white;
            font-size: 14px;
        }

        .timer-set-btn {
            padding: 10px 20px;
            background: var(--primary-color, #6366f1);
            border: none;
            border-radius: 6px;
            color: white;
            cursor: pointer;
            transition: all 0.2s;
        }

        .timer-set-btn:hover {
            background: var(--primary-hover, #4f46e5);
        }

        .timer-status {
            text-align: center;
            padding: 20px;
        }

        .timer-display {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            font-size: 48px;
            font-weight: bold;
            color: var(--primary-color, #6366f1);
            margin-bottom: 16px;
        }

        .timer-display i {
            font-size: 36px;
            animation: pulse 2s infinite;
        }

        .timer-mode-text {
            color: rgba(255, 255, 255, 0.7);
            margin-bottom: 20px;
        }

        .timer-cancel-btn {
            padding: 12px 24px;
            background: #ef4444;
            border: none;
            border-radius: 6px;
            color: white;
            cursor: pointer;
            transition: all 0.2s;
        }

        .timer-cancel-btn:hover {
            background: #dc2626;
        }

        .timer-close-btn {
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
.timer-close-btn:hover {
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
body.theme-light .sleep-timer-dialog {
    background: #ffffff;
}

body.theme-light .preset-btn {
    background: rgba(0, 0, 0, 0.03);
    border-color: rgba(0, 0, 0, 0.1);
    color: #333;
}

body.theme-light .preset-btn:hover {
    background: rgba(0, 0, 0, 0.06);
}

body.theme-light .custom-time-inputs input {
    background: rgba(0, 0, 0, 0.03);
    border-color: rgba(0, 0, 0, 0.1);
    color: #333;
}

body.theme-light .timer-mode-text {
    color: #666;
}
`;
document.head.appendChild(style);
}
        