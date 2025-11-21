/**
 * 网络状态监控器
 *
 * 老王实现：监控网络状态，提供友好的断网提示
 * 功能：
 * - 实时监控在线/离线状态
 * - 断网时显示提示
 * - 网络恢复时自动隐藏提示
 * - 网络速度检测
 */

export class NetworkMonitor {
  private isOnline: boolean = navigator.onLine;
  private notificationElement: HTMLElement | null = null;
  private listeners: Set<(online: boolean) => void> = new Set();

  constructor() {
    this.init();
  }

  /**
   * 初始化网络监控
   */
  private init(): void {
    // 监听在线/离线事件
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());

    // 创建通知元素
    this.createNotificationElement();

    // 初始状态检查
    if (!this.isOnline) {
      this.showOfflineNotification();
    }

    console.log('🌐 [网络监控] 已启动，当前状态:', this.isOnline ? '在线' : '离线');
  }

  /**
   * 创建通知元素
   */
  private createNotificationElement(): void {
    this.notificationElement = document.createElement('div');
    this.notificationElement.className = 'network-notification';
    this.notificationElement.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 24px;
      border-radius: 25px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      display: none;
      align-items: center;
      gap: 10px;
      font-size: 14px;
      font-weight: 500;
      animation: slideDown 0.3s ease-out;
    `;

    // 添加动画样式
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateX(-50%) translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      }
      @keyframes slideUp {
        from {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
        to {
          opacity: 0;
          transform: translateX(-50%) translateY(-20px);
        }
      }
      .network-notification.offline {
        background: linear-gradient(135deg, #f44336 0%, #e91e63 100%);
      }
      .network-notification.online {
        background: linear-gradient(135deg, #4caf50 0%, #8bc34a 100%);
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(this.notificationElement);
  }

  /**
   * 处理在线事件
   */
  private handleOnline(): void {
    console.log('🌐 [网络监控] 网络已连接');
    this.isOnline = true;
    this.showOnlineNotification();
    this.notifyListeners(true);
  }

  /**
   * 处理离线事件
   */
  private handleOffline(): void {
    console.log('🌐 [网络监控] 网络已断开');
    this.isOnline = false;
    this.showOfflineNotification();
    this.notifyListeners(false);
  }

  /**
   * 显示离线通知
   */
  private showOfflineNotification(): void {
    if (!this.notificationElement) return;

    this.notificationElement.className = 'network-notification offline';
    this.notificationElement.innerHTML = `
      <i class="fas fa-wifi" style="text-decoration: line-through;"></i>
      <span>网络已断开，请检查您的网络连接</span>
    `;
    this.notificationElement.style.display = 'flex';
  }

  /**
   * 显示在线通知
   */
  private showOnlineNotification(): void {
    if (!this.notificationElement) return;

    this.notificationElement.className = 'network-notification online';
    this.notificationElement.innerHTML = `
      <i class="fas fa-wifi"></i>
      <span>网络已恢复</span>
    `;
    this.notificationElement.style.display = 'flex';

    // 3秒后自动隐藏
    setTimeout(() => {
      this.hideNotification();
    }, 3000);
  }

  /**
   * 隐藏通知
   */
  private hideNotification(): void {
    if (!this.notificationElement) return;

    this.notificationElement.style.animation = 'slideUp 0.3s ease-out';
    setTimeout(() => {
      if (this.notificationElement) {
        this.notificationElement.style.display = 'none';
        this.notificationElement.style.animation = '';
      }
    }, 300);
  }

  /**
   * 添加状态变化监听器
   */
  public addListener(callback: (online: boolean) => void): void {
    this.listeners.add(callback);
  }

  /**
   * 移除状态变化监听器
   */
  public removeListener(callback: (online: boolean) => void): void {
    this.listeners.delete(callback);
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(online: boolean): void {
    this.listeners.forEach(callback => {
      try {
        callback(online);
      } catch (error) {
        console.error('🌐 [网络监控] 监听器执行失败:', error);
      }
    });
  }

  /**
   * 获取当前网络状态
   */
  public getStatus(): boolean {
    return this.isOnline;
  }

  /**
   * 检测网络速度（简单实现）
   */
  public async checkSpeed(): Promise<'fast' | 'slow' | 'offline'> {
    if (!this.isOnline) {
      return 'offline';
    }

    try {
      const startTime = Date.now();
      // 使用一个小文件测试速度
      await fetch('https://www.baidu.com/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache',
      });
      const duration = Date.now() - startTime;

      // 简单判断：< 500ms 为快速，> 1000ms 为慢速
      return duration < 500 ? 'fast' : 'slow';
    } catch (error) {
      return 'offline';
    }
  }

  /**
   * 销毁监控器
   */
  public destroy(): void {
    window.removeEventListener('online', () => this.handleOnline());
    window.removeEventListener('offline', () => this.handleOffline());

    if (this.notificationElement) {
      this.notificationElement.remove();
      this.notificationElement = null;
    }

    this.listeners.clear();
    console.log('🌐 [网络监控] 已销毁');
  }
}

// 导出单例
export const networkMonitor = new NetworkMonitor();
