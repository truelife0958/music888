// 统一日志系统

import { LogLevel } from './types.js';

/**
 * 日志配置
 */
const LOG_CONFIG = {
    enabled: true,
    level: 'info' as LogLevel,
    timestamp: true,
    contextPrefix: true,
};

/**
 * 日志级别优先级
 */
const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

/**
 * 日志级别颜色
 */
const LOG_COLORS: Record<LogLevel, string> = {
    debug: '#888',
    info: '#2196F3',
    warn: '#ff9800',
    error: '#f44336',
};

/**
 * 格式化时间戳
 */
function formatTimestamp(): string {
    const now = new Date();
    return `[${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}]`;
}

/**
 * 检查是否应该记录该级别的日志
 */
function shouldLog(level: LogLevel): boolean {
    if (!LOG_CONFIG.enabled) return false;
    return LOG_LEVELS[level] >= LOG_LEVELS[LOG_CONFIG.level];
}

/**
 * 通用日志函数
 */
function log(level: LogLevel, context: string, ...args: any[]): void {
    if (!shouldLog(level)) return;

    const timestamp = LOG_CONFIG.timestamp ? formatTimestamp() : '';
    const prefix = LOG_CONFIG.contextPrefix ? `[${context}]` : '';
    const levelTag = `[${level.toUpperCase()}]`;

    const style = `color: ${LOG_COLORS[level]}; font-weight: bold;`;

    switch (level) {
        case 'debug':
            console.debug(`%c${timestamp} ${levelTag} ${prefix}`, style, ...args);
            break;
        case 'info':
            console.info(`%c${timestamp} ${levelTag} ${prefix}`, style, ...args);
            break;
        case 'warn':
            console.warn(`%c${timestamp} ${levelTag} ${prefix}`, style, ...args);
            break;
        case 'error':
            console.error(`%c${timestamp} ${levelTag} ${prefix}`, style, ...args);
            break;
    }
}

/**
 * 统一日志系统
 */
export const Logger = {
    /**
     * 调试日志
     */
    debug: (context: string, ...args: any[]) => {
        log('debug', context, ...args);
    },

    /**
     * 信息日志
     */
    info: (context: string, ...args: any[]) => {
        log('info', context, ...args);
    },

    /**
     * 警告日志
     */
    warn: (context: string, ...args: any[]) => {
        log('warn', context, ...args);
    },

    /**
     * 错误日志
     */
    error: (context: string, ...args: any[]) => {
        log('error', context, ...args);
    },

    /**
     * 设置日志级别
     */
    setLevel: (level: LogLevel) => {
        LOG_CONFIG.level = level;
    },

    /**
     * 启用/禁用日志
     */
    setEnabled: (enabled: boolean) => {
        LOG_CONFIG.enabled = enabled;
    },

    /**
     * 设置是否显示时间戳
     */
    setTimestamp: (enabled: boolean) => {
        LOG_CONFIG.timestamp = enabled;
    },

    /**
     * 设置是否显示上下文前缀
     */
    setContextPrefix: (enabled: boolean) => {
        LOG_CONFIG.contextPrefix = enabled;
    },
};

export default Logger;