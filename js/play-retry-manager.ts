/**
 * 播放重试管理器
 *
 * 老王实现：播放失败时自动重试，提高播放成功率
 * 功能：
 * - 最多重试3次
 * - 重试间隔递增（1s, 2s, 4s）
 * - 显示重试进度
 * - 记录失败原因
 */

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  showNotification?: boolean;
}

export class PlayRetryManager {
  private readonly DEFAULT_MAX_RETRIES = 3;
  private readonly DEFAULT_BASE_DELAY = 1000; // 1秒

  private retryCount: number = 0;
  private lastError: Error | null = null;
  private notificationElement: HTMLElement | null = null;

  constructor() {
    this.createNotificationElement();
  }

  /**
   * 创建重试通知元素
   */
  private createNotificationElement(): void {
    this.notificationElement = document.createElement('div');
    this.notificationElement.className = 'retry-notification';
    this.notificationElement.style.cssText = `
      position: fixed;
      bottom: 80px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 9999;
      display: none;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      backdrop-filter: blur(10px);
      animation: fadeIn 0.3s ease-out;
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      .retry-spinner {
        width: 14px;
        height: 14px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(this.notificationElement);
  }

  /**
   * 执行重试逻辑
   * @param fn - 要重试的异步函数
   * @param options - 重试选项
   * @returns 函数执行结果
   */
  public async retry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const maxRetries = options.maxRetries ?? this.DEFAULT_MAX_RETRIES;
    const baseDelay = options.baseDelay ?? this.DEFAULT_BASE_DELAY;
    const showNotification = options.showNotification ?? true;

    this.retryCount = 0;
    this.lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // 如果不是第一次尝试，显示重试通知
        if (attempt > 0 && showNotification) {
          this.showRetryNotification(attempt, maxRetries);
        }

        const result = await fn();

        // 成功后隐藏通知
        if (attempt > 0 && showNotification) {
          this.showSuccessNotification();
          setTimeout(() => this.hideNotification(), 2000);
        }

        return result;
      } catch (error) {
        this.lastError = error instanceof Error ? error : new Error(String(error));
        this.retryCount = attempt + 1;

        console.warn(
          `🔄 [播放重试] 第 ${attempt + 1}/${maxRetries + 1} 次尝试失败:`,
          this.lastError.message
        );

        // 如果还有重试机会，等待后继续
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt); // 指数退避
          console.log(`🔄 [播放重试] ${delay / 1000}秒后重试...`);
          await this.sleep(delay);
        } else {
          // 所有重试都失败
          if (showNotification) {
            this.showFailureNotification(maxRetries);
            setTimeout(() => this.hideNotification(), 3000);
          }
          throw this.lastError;
        }
      }
    }

    // 理论上不会到达这里
    throw new Error('重试失败');
  }

  /**
   * 显示重试通知
   */
  private showRetryNotification(current: number, max: number): void {
    if (!this.notificationElement) return;

    this.notificationElement.innerHTML = `
      <div class="retry-spinner"></div>
      <span>播放失败，正在重试 (${current}/${max})...</span>
    `;
    this.notificationElement.style.display = 'flex';
  }

  /**
   * 显示成功通知
   */
  private showSuccessNotification(): void {
    if (!this.notificationElement) return;

    this.notificationElement.innerHTML = `
      <i class="fas fa-check-circle" style="color: #4caf50;"></i>
      <span>重试成功！</span>
    `;
  }

  /**
   * 显示失败通知
   */
  private showFailureNotification(maxRetries: number): void {
    if (!this.notificationElement) return;

    this.notificationElement.innerHTML = `
      <i class="fas fa-exclamation-circle" style="color: #f44336;"></i>
      <span>播放失败，已重试 ${maxRetries} 次</span>
    `;
  }

  /**
   * 隐藏通知
   */
  private hideNotification(): void {
    if (!this.notificationElement) return;
    this.notificationElement.style.display = 'none';
  }

  /**
   * 休眠指定时间
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取重试次数
   */
  public getRetryCount(): number {
    return this.retryCount;
  }

  /**
   * 获取最后的错误
   */
  public getLastError(): Error | null {
    return this.lastError;
  }

  /**
   * 重置重试计数
   */
  public reset(): void {
    this.retryCount = 0;
    this.lastError = null;
    this.hideNotification();
  }

  /**
   * 销毁管理器
   */
  public destroy(): void {
    if (this.notificationElement) {
      this.notificationElement.remove();
      this.notificationElement = null;
    }
  }
}

// 导出单例
export const playRetryManager = new PlayRetryManager();
