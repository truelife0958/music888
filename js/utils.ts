/**
 * 工具函数模块
 * 提供防抖、节流、错误处理等通用功能
 */

/**
 * 防抖函数 - 延迟执行，多次调用只执行最后一次
 * @param func 要防抖的函数
 * @param wait 延迟时间（毫秒）
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    return function(this: any, ...args: Parameters<T>) {
        const context = this;

        if (timeout) {
            clearTimeout(timeout);
        }

        timeout = setTimeout(() => {
            func.apply(context, args);
        }, wait);
    };
}

/**
 * 节流函数 - 限制执行频率，固定时间内只执行一次
 * @param func 要节流的函数
 * @param limit 时间限制（毫秒）
 * @returns 节流后的函数
 */
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle: boolean = false;

    return function(this: any, ...args: Parameters<T>) {
        const context = this;

        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;

            setTimeout(() => {
                inThrottle = false;
            }, limit);
        }
    };
}

/**
 * 渲染播放列表项的 HTML
 * @param title 标题
 * @param count 歌曲数量
 * @param icon Font Awesome 图标类名
 * @param iconColor 图标颜色
 * @returns HTML 字符串
 */
export function renderPlaylistItem(
    title: string,
    count: number,
    icon: string,
    iconColor: string = '#1db954'
): string {
    return `
        <div class="mini-playlist-item" style="padding: 10px; cursor: pointer; border-radius: 8px; transition: background 0.2s;"
             onmouseover="this.style.background='rgba(255,255,255,0.05)'"
             onmouseout="this.style.background='transparent'">
            <div style="display: flex; align-items: center; gap: 8px;">
                <i class="${icon}" style="color: ${iconColor};"></i>
                <span style="font-weight: 500;">${title} (${count}首)</span>
            </div>
        </div>
    `;
}

/**
 * 渲染空状态的 HTML
 * @param icon Font Awesome 图标类名
 * @param message 主要消息
 * @param hint 提示信息（可选）
 * @returns HTML 字符串
 */
export function renderEmptyState(
    icon: string,
    message: string,
    hint?: string
): string {
    return `
        <div class="empty-saved-state">
            <i class="${icon}"></i>
            <div>${message}</div>
            ${hint ? `<div style="margin-top: 8px; font-size: 12px; opacity: 0.7;">${hint}</div>` : ''}
        </div>
    `;
}

/**
 * 格式化时间（秒转为 mm:ss 格式）
 * @param seconds 秒数
 * @returns 格式化后的时间字符串
 */
export function formatTime(seconds: number): string {
    if (!isFinite(seconds) || seconds < 0) {
        return '0:00';
    }

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 安全的 JSON 解析
 * @param jsonString JSON 字符串
 * @param defaultValue 解析失败时的默认值
 * @returns 解析后的对象或默认值
 */
export function safeJSONParse<T>(jsonString: string, defaultValue: T): T {
    try {
        return JSON.parse(jsonString) as T;
    } catch (error) {
        console.warn('JSON 解析失败:', error);
        return defaultValue;
    }
}

/**
 * 安全的 localStorage 操作
 */
export const storage = {
    /**
     * 获取 localStorage 中的数据
     * @param key 键名
     * @param defaultValue 默认值
     * @returns 存储的值或默认值
     */
    get<T>(key: string, defaultValue: T): T {
        try {
            const item = localStorage.getItem(key);
            return item ? safeJSONParse(item, defaultValue) : defaultValue;
        } catch (error) {
            console.warn(`读取 localStorage 失败 (${key}):`, error);
            return defaultValue;
        }
    },

    /**
     * 设置 localStorage 中的数据
     * @param key 键名
     * @param value 值
     * @returns 是否成功
     */
    set<T>(key: string, value: T): boolean {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.warn(`写入 localStorage 失败 (${key}):`, error);
            return false;
        }
    },

    /**
     * 删除 localStorage 中的数据
     * @param key 键名
     * @returns 是否成功
     */
    remove(key: string): boolean {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.warn(`删除 localStorage 失败 (${key}):`, error);
            return false;
        }
    },

    /**
     * 清空 localStorage
     * @returns 是否成功
     */
    clear(): boolean {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.warn('清空 localStorage 失败:', error);
            return false;
        }
    }
};

/**
 * 错误消息格式化
 * @param error 错误对象
 * @param context 错误上下文
 * @returns 格式化后的错误消息
 */
export function formatErrorMessage(error: unknown, context: string = ''): string {
    let message = context ? `${context}: ` : '';

    if (error instanceof Error) {
        message += error.message;

        // 识别常见错误类型
        if (error.message.includes('版权') || error.message.includes('copyright')) {
            message += ' - 版权保护';
        } else if (error.message.includes('空URL') || error.message.includes('empty')) {
            message += ' - 音乐源无此资源';
        } else if (error.message.includes('timeout') || error.message.includes('超时')) {
            message += ' - 网络超时';
        } else if (error.message.includes('network') || error.message.includes('网络')) {
            message += ' - 网络连接失败';
        }
    } else if (typeof error === 'string') {
        message += error;
    } else {
        message += '未知错误';
    }

    return message;
}

/**
 * 延迟执行
 * @param ms 延迟时间（毫秒）
 * @returns Promise
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 随机打乱数组
 * @param array 原数组
 * @returns 打乱后的新数组
 */
export function shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

/**
 * 限制数字在指定范围内
 * @param value 值
 * @param min 最小值
 * @param max 最大值
 * @returns 限制后的值
 */
export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

/**
 * 检查是否为移动设备
 * @returns 是否为移动设备
 */
export function isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * 生成歌曲文件名
 * @param song 歌曲对象
 * @param extension 文件扩展名（默认为.mp3）
 * @returns 文件名字符串
 */
export function generateSongFileName(song: { name: string; artist: string | string[] }, extension: string = '.mp3'): string {
    const artistStr = Array.isArray(song.artist) ? song.artist.join(',') : song.artist;
    return `${song.name} - ${artistStr}${extension}`;
}

/**
 * 复制文本到剪贴板
 * @param text 要复制的文本
 * @returns 是否成功
 */
export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        } else {
            // 降级方案
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            const success = document.execCommand('copy');
            document.body.removeChild(textarea);
            return success;
        }
    } catch (error) {
        console.warn('复制到剪贴板失败:', error);
        return false;
    }
}
