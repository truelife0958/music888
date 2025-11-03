// js/logger.ts - 统一日志管理模块

/**
 * 日志级别
 */
export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    NONE = 4
}

/**
 * 日志配置
 */
interface LoggerConfig {
    level: LogLevel;
    enableConsole: boolean;
    enableTimestamp: boolean;
    prefix: string;
}

/**
 * 默认配置
 */
const defaultConfig: LoggerConfig = {
    level: LogLevel.DEBUG, // 默认DEBUG，后续根据环境动态设置
    enableConsole: true,
    enableTimestamp: true,
    prefix: '🎵'
};

let currentConfig: LoggerConfig = { ...defaultConfig };

/**
 * 设置日志级别
 */
export function setLogLevel(level: LogLevel): void {
    currentConfig.level = level;
    console.log(`${currentConfig.prefix} 日志级别已设置为: ${LogLevel[level]}`);
}

/**
 * 设置日志配置
 */
export function configure(config: Partial<LoggerConfig>): void {
    currentConfig = { ...currentConfig, ...config };
}

/**
 * 获取当前配置
 */
export function getConfig(): LoggerConfig {
    return { ...currentConfig };
}

/**
 * 格式化日志消息
 */
function formatMessage(level: string, module: string, ...args: any[]): string {
    const timestamp = currentConfig.enableTimestamp 
        ? `[${new Date().toISOString().substr(11, 12)}]`
        : '';
    
    const prefix = currentConfig.prefix ? `${currentConfig.prefix} ` : '';
    const moduleStr = module ? `[${module}]` : '';
    
    return `${prefix}${timestamp}${moduleStr} ${level}`;
}

/**
 * DEBUG级别日志
 */
export function debug(module: string, ...args: any[]): void {
    if (!currentConfig.enableConsole || currentConfig.level > LogLevel.DEBUG) {
        return;
    }
    
    const message = formatMessage('🔍', module);
    console.debug(message, ...args);
}

/**
 * INFO级别日志
 */
export function info(module: string, ...args: any[]): void {
    if (!currentConfig.enableConsole || currentConfig.level > LogLevel.INFO) {
        return;
    }
    
    const message = formatMessage('ℹ️', module);
    console.info(message, ...args);
}

/**
 * WARN级别日志
 */
export function warn(module: string, ...args: any[]): void {
    if (!currentConfig.enableConsole || currentConfig.level > LogLevel.WARN) {
        return;
    }
    
    const message = formatMessage('⚠️', module);
    console.warn(message, ...args);
}

/**
 * ERROR级别日志
 */
export function error(module: string, ...args: any[]): void {
    if (!currentConfig.enableConsole || currentConfig.level > LogLevel.ERROR) {
        return;
    }
    
    const message = formatMessage('❌', module);
    console.error(message, ...args);
}

/**
 * SUCCESS日志（特殊类型，总是显示）
 */
export function success(module: string, ...args: any[]): void {
    if (!currentConfig.enableConsole) {
        return;
    }
    
    const message = formatMessage('✅', module);
    console.log(message, ...args);
}

/**
 * 性能计时器
 */
const timers = new Map<string, number>();

/**
 * 开始计时
 */
export function time(label: string): void {
    timers.set(label, performance.now());
}

/**
 * 结束计时并输出
 */
export function timeEnd(label: string): void {
    const startTime = timers.get(label);
    if (startTime === undefined) {
        warn('Logger', `计时器 "${label}" 不存在`);
        return;
    }
    
    const duration = performance.now() - startTime;
    info('Performance', `${label}: ${duration.toFixed(2)}ms`);
    timers.delete(label);
}

/**
 * 分组日志开始
 */
export function group(label: string, collapsed: boolean = false): void {
    if (!currentConfig.enableConsole || currentConfig.level > LogLevel.DEBUG) {
        return;
    }
    
    if (collapsed) {
        console.groupCollapsed(label);
    } else {
        console.group(label);
    }
}

/**
 * 分组日志结束
 */
export function groupEnd(): void {
    if (!currentConfig.enableConsole || currentConfig.level > LogLevel.DEBUG) {
        return;
    }
    
    console.groupEnd();
}

/**
 * 表格日志
 */
export function table(data: any): void {
    if (!currentConfig.enableConsole || currentConfig.level > LogLevel.DEBUG) {
        return;
    }
    
    console.table(data);
}

/**
 * 创建模块专用logger
 */
export function createLogger(moduleName: string) {
    return {
        debug: (...args: any[]) => debug(moduleName, ...args),
        info: (...args: any[]) => info(moduleName, ...args),
        warn: (...args: any[]) => warn(moduleName, ...args),
        error: (...args: any[]) => error(moduleName, ...args),
        success: (...args: any[]) => success(moduleName, ...args),
        time: (label: string) => time(`${moduleName}:${label}`),
        timeEnd: (label: string) => timeEnd(`${moduleName}:${label}`),
        group: (label: string, collapsed?: boolean) => group(`${moduleName}: ${label}`, collapsed),
        groupEnd: () => groupEnd(),
        table: (data: any) => table(data)
    };
}

// 🔧 修复P2-11: 根据环境自动设置日志级别
if (typeof window !== 'undefined') {
    // 浏览器环境
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        // 开发环境：显示所有日志
        setLogLevel(LogLevel.DEBUG);
    } else {
        // 生产环境：只显示警告和错误
        setLogLevel(LogLevel.WARN);
    }
    
    // 暴露到全局，方便调试
    (window as any).__setLogLevel = setLogLevel;
    (window as any).__LogLevel = LogLevel;
    
    console.log(`${currentConfig.prefix} Logger initialized. Current level: ${LogLevel[currentConfig.level]}`);
    console.log('💡 Tip: Use __setLogLevel(__LogLevel.DEBUG) to enable all logs');
}

export default {
    LogLevel,
    setLogLevel,
    configure,
    getConfig,
    debug,
    info,
    warn,
    error,
    success,
    time,
    timeEnd,
    group,
    groupEnd,
    table,
    createLogger
};