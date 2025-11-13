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

  return function (this: any, ...args: Parameters<T>) {
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

  return function (this: any, ...args: Parameters<T>) {
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
export function renderEmptyState(icon: string, message: string, hint?: string): string {
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
      // 处理配额超出错误
      if (
        error instanceof DOMException &&
        (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
      ) {
        console.warn(`localStorage配额已满，正在清理旧数据...`);

        // 清理策略: 删除最旧的缓存数据
        try {
          const keys = Object.keys(localStorage);
          const cacheKeys = keys.filter(
            (k) => k.startsWith('cache_') || k.startsWith('cover_') || k.startsWith('lyric_')
          );

          if (cacheKeys.length > 0) {
            // 删除最早的缓存项
            localStorage.removeItem(cacheKeys[0]);
            console.log(`已清理缓存: ${cacheKeys[0]}`);

            // 重试一次
            try {
              localStorage.setItem(key, JSON.stringify(value));
              console.log('清理后保存成功');
              return true;
            } catch (retryError) {
              console.error('清理后仍无法保存数据:', retryError);
              return false;
            }
          } else {
            console.warn('没有可清理的缓存数据');
            return false;
          }
        } catch (cleanError) {
          console.error('清理缓存失败:', cleanError);
          return false;
        }
      }

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
      return false;
    }
  },
};

/**
 * 错误类型枚举
 */
export enum ErrorType {
  COPYRIGHT = 'COPYRIGHT',
  EMPTY_RESOURCE = 'EMPTY_RESOURCE',
  TIMEOUT = 'TIMEOUT',
  NETWORK = 'NETWORK',
  PARSE = 'PARSE',
  UNKNOWN = 'UNKNOWN',
}

/**
 * 错误消息格式化
 * @param error 错误对象
 * @param context 错误上下文
 * @returns 格式化后的错误消息
 * @example
 * ```typescript
 * formatErrorMessage(new Error('timeout'), '搜索音乐')
 * // => '搜索音乐: timeout - 网络超时'
 * ```
 */
export function formatErrorMessage(error: unknown, context: string = ''): string {
  try {
    let message = context ? `${context}: ` : '';
    let errorType = ErrorType.UNKNOWN;

    if (error instanceof Error) {
      message += error.message;
      errorType = detectErrorType(error.message);
    } else if (typeof error === 'string') {
      message += error;
      errorType = detectErrorType(error);
    } else if (error && typeof error === 'object') {
      // 处理包含 message 属性的对象
      message += (error as any).message || JSON.stringify(error);
    } else {
      message += '未知错误';
    }

    // 添加错误类型提示
    const typeHint = getErrorTypeHint(errorType);
    if (typeHint) {
      message += ` - ${typeHint}`;
    }

    return message;
  } catch (err) {
    console.warn('格式化错误消息失败:', err);
    return context ? `${context}: 发生错误` : '发生错误';
  }
}

/**
 * 检测错误类型
 */
function detectErrorType(message: string): ErrorType {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('版权') || lowerMessage.includes('copyright')) {
    return ErrorType.COPYRIGHT;
  }
  if (lowerMessage.includes('空url') || lowerMessage.includes('empty')) {
    return ErrorType.EMPTY_RESOURCE;
  }
  if (lowerMessage.includes('timeout') || lowerMessage.includes('超时')) {
    return ErrorType.TIMEOUT;
  }
  if (lowerMessage.includes('network') || lowerMessage.includes('网络')) {
    return ErrorType.NETWORK;
  }
  if (lowerMessage.includes('parse') || lowerMessage.includes('解析')) {
    return ErrorType.PARSE;
  }

  return ErrorType.UNKNOWN;
}

/**
 * 获取错误类型提示
 */
function getErrorTypeHint(errorType: ErrorType): string {
  const hints: Record<ErrorType, string> = {
    [ErrorType.COPYRIGHT]: '版权保护',
    [ErrorType.EMPTY_RESOURCE]: '音乐源无此资源',
    [ErrorType.TIMEOUT]: '网络超时',
    [ErrorType.NETWORK]: '网络连接失败',
    [ErrorType.PARSE]: '数据解析失败',
    [ErrorType.UNKNOWN]: '',
  };

  return hints[errorType] || '';
}

/**
 * 延迟执行
 * @param ms 延迟时间（毫秒）
 * @returns Promise
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
 * 艺术家对象接口
 */
interface Artist {
  name: string;
  id?: string;
}

/**
 * 艺术家类型定义
 */
type ArtistInput = string | string[] | Artist | Artist[] | null | undefined;

/**
 * 格式化艺术家信息 - 统一处理各种格式
 * @param artist 艺术家信息（可能是字符串、数组、对象或对象数组）
 * @returns 格式化后的艺术家字符串
 * @example
 * ```typescript
 * formatArtist('周杰伦') // => '周杰伦'
 * formatArtist(['周杰伦', '方文山']) // => '周杰伦 / 方文山'
 * formatArtist({ name: '周杰伦', id: '123' }) // => '周杰伦'
 * ```
 */
export function formatArtist(artist: ArtistInput): string {
  // 优化: 类型保护和边界检查，增强未知艺术家显示
  if (!artist) return '未知艺术家';

  try {
    // 如果是数组
    if (Array.isArray(artist)) {
      if (artist.length === 0) return '未知艺术家';

      const formattedArtists = artist
        .map((item) => {
          if (typeof item === 'string') {
            const trimmed = item.trim();
            // 过滤空字符串和无效值
            return trimmed && trimmed !== 'null' && trimmed !== 'undefined' ? trimmed : '';
          }
          if (typeof item === 'object' && item !== null && 'name' in item) {
            const name = String(item.name || '').trim();
            return name && name !== 'null' && name !== 'undefined' ? name : '';
          }
          return '';
        })
        .filter((name) => name !== '');

      return formattedArtists.length > 0 ? formattedArtists.join(' / ') : '未知艺术家';
    }

    // 如果是对象
    if (typeof artist === 'object' && artist !== null && 'name' in artist) {
      const name = String(artist.name || '').trim();
      return name && name !== 'null' && name !== 'undefined' ? name : '未知艺术家';
    }

    // 如果是字符串
    if (typeof artist === 'string') {
      const trimmed = artist.trim();
      // 过滤常见的无效值
      if (
        !trimmed ||
        trimmed === 'null' ||
        trimmed === 'undefined' ||
        trimmed === '[object Object]'
      ) {
        return '未知艺术家';
      }
      return trimmed;
    }

    // 其他情况尝试转换为字符串
    const stringValue = String(artist).trim();
    return stringValue && stringValue !== 'null' && stringValue !== 'undefined'
      ? stringValue
      : '未知艺术家';
  } catch (error) {
    console.warn('格式化艺术家信息失败:', error);
    return '未知艺术家';
  }
}

/**
 * 生成歌曲文件名
 * @param song 歌曲对象
 * @param extension 文件扩展名（默认为.mp3）
 * @returns 安全的文件名字符串
 * @example
 * ```typescript
 * generateSongFileName({ name: '晴天', artist: '周杰伦' }) // => '晴天 - 周杰伦.mp3'
 * generateSongFileName({ name: '歌名', artist: '歌手' }, '.lrc') // => '歌名 - 歌手.lrc'
 * ```
 */
export function generateSongFileName(
  song: { name: string; artist: ArtistInput },
  extension: string = '.mp3'
): string {
  try {
    const artistStr = formatArtist(song.artist);
    const songName = sanitizeFileName(song.name || '未知歌曲');
    const artist = sanitizeFileName(artistStr);

    return `${songName} - ${artist}${extension}`;
  } catch (error) {
    console.warn('生成文件名失败:', error);
    return `未知歌曲${extension}`;
  }
}

/**
 * 清理文件名中的非法字符
 * @param fileName 原始文件名
 * @returns 清理后的文件名
 */
function sanitizeFileName(fileName: string): string {
  // 移除或替换 Windows 和 Unix 文件系统中的非法字符
  return fileName
    .replace(/[<>:"/\\|?*]/g, '') // 移除非法字符
    .replace(/\s+/g, ' ') // 合并多个空格
    .trim()
    .substring(0, 200); // 限制长度
}

/**
 * 复制文本到剪贴板
 * @param text 要复制的文本
 * @returns 是否成功
 * @example
 * ```typescript
 * const success = await copyToClipboard('Hello World');
 * if (success) {
 *     console.log('复制成功');
 * }
 * ```
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // 优化: 参数验证
  if (!text || typeof text !== 'string') {
    console.warn('copyToClipboard: 无效的文本参数');
    return false;
  }

  try {
    // 现代浏览器使用 Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    // 降级方案：使用 execCommand
    return fallbackCopyToClipboard(text);
  } catch (error) {
    console.warn('复制到剪贴板失败:', error);

    // 如果现代 API 失败，尝试降级方案
    try {
      return fallbackCopyToClipboard(text);
    } catch (fallbackError) {
      console.error('降级复制方案也失败:', fallbackError);
      return false;
    }
  }
}

/**
 * 降级复制方案
 */
function fallbackCopyToClipboard(text: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = text;

  // 优化: 更好的隐藏方式
  textarea.style.cssText = `
        position: fixed;
        top: -9999px;
        left: -9999px;
        opacity: 0;
        pointer-events: none;
    `;

  document.body.appendChild(textarea);

  try {
    textarea.focus();
    textarea.select();

    // 尝试选择所有文本（iOS 兼容性）
    textarea.setSelectionRange(0, textarea.value.length);

    const success = document.execCommand('copy');
    return success;
  } finally {
    // 确保清理 DOM
    document.body.removeChild(textarea);
  }
}
