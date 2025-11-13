/**
 * 全局错误监控模块
 * 捕获并处理未捕获的错误和Promise rejection
 */

import { logger } from './logger';

interface ErrorInfo {
  message: string;
  source?: string;
  lineno?: number;
  colno?: number;
  error?: Error;
  timestamp: number;
  url: string;
  userAgent: string;
}

interface PromiseRejectionInfo {
  reason: any;
  promise: Promise<any>;
  timestamp: number;
  url: string;
}

class ErrorMonitor {
  private errorQueue: ErrorInfo[] = [];
  private rejectionQueue: PromiseRejectionInfo[] = [];
  private maxQueueSize = 50;
  private isInitialized = false;

  /**
   * 初始化错误监控
   */
  init() {
    if (this.isInitialized) {
      logger.warn('ErrorMonitor already initialized');
      return;
    }

    // 全局错误捕获
    window.addEventListener('error', this.handleGlobalError.bind(this));

    // Promise rejection捕获
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));

    // 页面卸载前清理
    window.addEventListener('beforeunload', this.cleanup.bind(this));

    this.isInitialized = true;
    logger.info('ErrorMonitor initialized');
  }

  /**
   * 处理全局错误
   */
  private handleGlobalError(event: ErrorEvent) {
    const errorInfo: ErrorInfo = {
      message: event.message,
      source: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    this.errorQueue.push(errorInfo);
    this.trimQueue(this.errorQueue);

    // 记录错误日志
    logger.error('Global Error:', {
      message: errorInfo.message,
      source: errorInfo.source,
      line: errorInfo.lineno,
      column: errorInfo.colno,
      stack: errorInfo.error?.stack,
    });

    // 这里可以添加错误上报逻辑
    // this.reportError(errorInfo);
  }

  /**
   * 处理未捕获的Promise rejection
   */
  private handleUnhandledRejection(event: PromiseRejectionEvent) {
    const rejectionInfo: PromiseRejectionInfo = {
      reason: event.reason,
      promise: event.promise,
      timestamp: Date.now(),
      url: window.location.href,
    };

    this.rejectionQueue.push(rejectionInfo);
    this.trimQueue(this.rejectionQueue);

    // 记录rejection日志
    logger.error('Unhandled Promise Rejection:', {
      reason: rejectionInfo.reason,
      message: rejectionInfo.reason?.message || String(rejectionInfo.reason),
      stack: rejectionInfo.reason?.stack,
    });

    // 这里可以添加错误上报逻辑
    // this.reportRejection(rejectionInfo);

    // 阻止默认的控制台错误输出（已经用logger记录了）
    event.preventDefault();
  }

  /**
   * 限制队列大小
   */
  private trimQueue(queue: any[]) {
    if (queue.length > this.maxQueueSize) {
      queue.shift();
    }
  }

  /**
   * 获取错误历史
   */
  getErrors(): ErrorInfo[] {
    return [...this.errorQueue];
  }

  /**
   * 获取rejection历史
   */
  getRejections(): PromiseRejectionInfo[] {
    return [...this.rejectionQueue];
  }

  /**
   * 清空错误队列
   */
  clearErrors() {
    this.errorQueue = [];
    this.rejectionQueue = [];
  }

  /**
   * 上报错误（预留接口）
   */
  private reportError(_errorInfo: ErrorInfo) {
    // 可以在这里实现错误上报逻辑
    // 例如发送到错误追踪服务（Sentry、Rollbar等）
    // fetch('/api/log-error', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(errorInfo)
    // }).catch(() => {});
  }

  /**
   * 上报rejection（预留接口）
   */
  private reportRejection(_rejectionInfo: PromiseRejectionInfo) {
    // 可以在这里实现rejection上报逻辑
  }

  /**
   * 清理资源
   */
  cleanup() {
    if (!this.isInitialized) return;

    window.removeEventListener('error', this.handleGlobalError.bind(this));
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
    window.removeEventListener('beforeunload', this.cleanup.bind(this));

    this.isInitialized = false;
    logger.info('ErrorMonitor cleaned up');
  }

  /**
   * 手动记录错误
   */
  logError(error: Error, context?: Record<string, any>) {
    logger.error('Manual Error Log:', {
      message: error.message,
      stack: error.stack,
      context,
    });

    const errorInfo: ErrorInfo = {
      message: error.message,
      error,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    this.errorQueue.push(errorInfo);
    this.trimQueue(this.errorQueue);
  }
}

// 导出单例
export const errorMonitor = new ErrorMonitor();

// 默认导出
export default errorMonitor;
