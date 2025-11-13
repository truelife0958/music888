/**
 * 统一日志管理工具
 * 根据环境变量控制日志输出
 */

// 从环境变量或配置中读取是否为生产环境
// 检查多种方式判断生产环境
const isProduction =
  (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') ||
  (typeof location !== 'undefined' &&
    location.hostname !== 'localhost' &&
    location.hostname !== '127.0.0.1') ||
  false;

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

class Logger {
  private currentLevel: LogLevel;

  constructor() {
    // 生产环境默认只显示警告和错误
    this.currentLevel = isProduction ? LogLevel.WARN : LogLevel.DEBUG;
  }

  setLevel(level: LogLevel) {
    this.currentLevel = level;
  }

  debug(...args: any[]) {
    if (this.currentLevel <= LogLevel.DEBUG) {
      console.log('[DEBUG]', ...args);
    }
  }

  info(...args: any[]) {
    if (this.currentLevel <= LogLevel.INFO) {
      console.log('[INFO]', ...args);
    }
  }

  warn(...args: any[]) {
    if (this.currentLevel <= LogLevel.WARN) {
      console.warn('[WARN]', ...args);
    }
  }

  error(...args: any[]) {
    if (this.currentLevel <= LogLevel.ERROR) {
      console.error('[ERROR]', ...args);
    }
  }

  // 性能测量
  time(label: string) {
    if (this.currentLevel <= LogLevel.DEBUG) {
      console.time(label);
    }
  }

  timeEnd(label: string) {
    if (this.currentLevel <= LogLevel.DEBUG) {
      console.timeEnd(label);
    }
  }

  // 分组日志
  group(label: string) {
    if (this.currentLevel <= LogLevel.DEBUG) {
      console.group(label);
    }
  }

  groupEnd() {
    if (this.currentLevel <= LogLevel.DEBUG) {
      console.groupEnd();
    }
  }
}

// 导出单例
export const logger = new Logger();

// 默认导出
export default logger;
