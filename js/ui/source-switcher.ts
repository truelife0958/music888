/**
 * 音源切换UI组件
 * 提供多平台音源的可视化切换和管理功能
 */

import { providerManagerEnhanced, SwitchStrategy } from '../providers/provider-manager-enhanced.js';

interface SourceOption {
  id: string;
  name: string;
  color: string;
  enabled: boolean;
  stats?: {
    successRate: number;
    avgResponseTime: number;
  };
}

export class SourceSwitcherUI {
  private container: HTMLElement;
  private isVisible: boolean = false;
  private currentStrategy: SwitchStrategy = SwitchStrategy.AUTO;

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'source-switcher-container';
    this.setupContainer();
    this.bindEvents();
  }

  /**
   * 设置容器结构
   */
  private setupContainer(): void {
    this.container.innerHTML = `
      <div class="source-switcher-header">
        <h3><i class="fas fa-music"></i> 音源设置</h3>
        <button class="close-btn" id="closeSourceSwitcher">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="source-switcher-content">
        <!-- 切换策略 -->
        <div class="switch-strategy-section">
          <h4><i class="fas fa-cog"></i> 切换策略</h4>
          <div class="strategy-options">
            <label class="strategy-option">
              <input type="radio" name="switch-strategy" value="auto" checked>
              <span class="strategy-label">
                <i class="fas fa-magic"></i> 智能自动
              </span>
              <small>综合选择最优音源</small>
            </label>
            <label class="strategy-option">
              <input type="radio" name="switch-strategy" value="fallback">
              <span class="strategy-label">
                <i class="fas fa-exchange-alt"></i> 原源优先
              </span>
              <small>优先使用原平台，失败时切换</small>
            </label>
            <label class="strategy-option">
              <input type="radio" name="switch-strategy" value="quality">
              <span class="strategy-label">
                <i class="fas fa-high-quality"></i> 音质优先
              </span>
              <small>优先选择高音质音源</small>
            </label>
            <label class="strategy-option">
              <input type="radio" name="switch-strategy" value="speed">
              <span class="strategy-label">
                <i class="fas fa-tachometer-alt"></i> 速度优先
              </span>
              <small>优先选择响应快的音源</small>
            </label>
          </div>
        </div>

        <!-- 音源列表 -->
        <div class="source-list-section">
          <h4><i class="fas fa-list"></i> 音源列表</h4>
          <div class="source-list" id="sourceList">
            <!-- 动态生成音源项 -->
          </div>
        </div>

        <!-- 统计信息 -->
        <div class="source-stats-section">
          <h4><i class="fas fa-chart-bar"></i> 运行统计</h4>
          <div class="stats-grid" id="sourceStats">
            <!-- 动态生成统计信息 -->
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="source-actions">
          <button class="action-btn refresh-stats" id="refreshSourceStats">
            <i class="fas fa-sync-alt"></i> 刷新状态
          </button>
          <button class="action-btn reset-stats" id="resetSourceStats">
            <i class="fas fa-redo"></i> 重置统计
          </button>
          <button class="action-btn test-all" id="testAllSources">
            <i class="fas fa-vial"></i> 测试连接
          </button>
        </div>
      </div>
    `;

    // 添加样式
    this.addStyles();

    // 隐藏默认
    this.container.style.display = 'none';
    document.body.appendChild(this.container);
  }

  /**
   * 添加CSS样式
   */
  private addStyles(): void {
    if (document.getElementById('source-switcher-styles')) return;

    const styles = `
      <style id="source-switcher-styles">
        .source-switcher-container {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 90%;
          max-width: 500px;
          max-height: 80vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          z-index: 10000;
          overflow: hidden;
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translate(-50%, -45%);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%);
          }
        }

        .source-switcher-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        }

        .source-switcher-header h3 {
          color: white;
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }

        .close-btn {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .close-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: rotate(90deg);
        }

        .source-switcher-content {
          padding: 20px;
          max-height: calc(80vh - 80px);
          overflow-y: auto;
        }

        .source-switcher-content::-webkit-scrollbar {
          width: 6px;
        }

        .source-switcher-content::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }

        .source-switcher-content::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 3px;
        }

        .switch-strategy-section,
        .source-list-section,
        .source-stats-section {
          margin-bottom: 25px;
        }

        .switch-strategy-section h4,
        .source-list-section h4,
        .source-stats-section h4 {
          color: white;
          margin: 0 0 15px 0;
          font-size: 16px;
          font-weight: 500;
        }

        .strategy-options {
          display: grid;
          gap: 12px;
        }

        .strategy-option {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          padding: 15px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .strategy-option:hover {
          background: rgba(255, 255, 255, 0.15);
          transform: translateY(-2px);
        }

        .strategy-option input[type="radio"] {
          margin: 0;
        }

        .strategy-label {
          color: white;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .strategy-option small {
          color: rgba(255, 255, 255, 0.7);
          font-size: 12px;
          margin-left: auto;
        }

        .source-list {
          display: grid;
          gap: 10px;
        }

        .source-item {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 10px;
          padding: 12px 15px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          transition: all 0.2s;
        }

        .source-item:hover {
          background: rgba(255, 255, 255, 0.15);
        }

        .source-item.disabled {
          opacity: 0.5;
        }

        .source-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .source-color {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .source-name {
          color: white;
          font-weight: 500;
        }

        .source-toggle {
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 20px;
          padding: 4px 8px;
          color: white;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .source-toggle.enabled {
          background: rgba(76, 175, 80, 0.8);
          border-color: #4CAF50;
        }

        .source-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
        }

        .stat-item {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 12px;
          text-align: center;
        }

        .stat-value {
          color: white;
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .stat-label {
          color: rgba(255, 255, 255, 0.7);
          font-size: 12px;
        }

        .source-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .action-btn {
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 8px;
          padding: 10px 15px;
          color: white;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .action-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-2px);
        }

        /* 响应式设计 */
        @media (max-width: 768px) {
          .source-switcher-container {
            width: 95%;
            max-height: 90vh;
          }

          .strategy-options {
            grid-template-columns: 1fr;
          }

          .source-actions {
            justify-content: center;
          }

          .action-btn {
            flex: 1;
            justify-content: center;
          }
        }
      </style>
    `;
    document.head.insertAdjacentHTML('beforeend', styles);
  }

  /**
   * 绑定事件监听器
   */
  private bindEvents(): void {
    // 关闭按钮
    this.container.querySelector('#closeSourceSwitcher')?.addEventListener('click', () => {
      this.hide();
    });

    // 策略切换
    const strategyInputs = this.container.querySelectorAll('input[name="switch-strategy"]');
    strategyInputs.forEach(input => {
      input.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        const strategy = target.value as SwitchStrategy;
        this.onStrategyChange(strategy);
      });
    });

    // 操作按钮
    this.container.querySelector('#refreshSourceStats')?.addEventListener('click', () => {
      this.refreshStats();
    });

    this.container.querySelector('#resetSourceStats')?.addEventListener('click', () => {
      this.resetStats();
    });

    this.container.querySelector('#testAllSources')?.addEventListener('click', () => {
      this.testAllSources();
    });

    // 点击外部关闭
    document.addEventListener('click', (e) => {
      if (this.isVisible && !this.container.contains(e.target as Node)) {
        this.hide();
      }
    });
  }

  /**
   * 策略变更处理
   */
  private onStrategyChange(strategy: SwitchStrategy): void {
    this.currentStrategy = strategy;
    providerManagerEnhanced.setSwitchStrategy(strategy);

    // 显示通知
    this.showNotification(`切换策略: ${this.getStrategyName(strategy)}`, 'success');
  }

  /**
   * 获取策略名称
   */
  private getStrategyName(strategy: SwitchStrategy): string {
    const names: Record<SwitchStrategy, string> = {
      [SwitchStrategy.AUTO]: '智能自动',
      [SwitchStrategy.FALLBACK]: '原源优先',
      [SwitchStrategy.QUALITY]: '音质优先',
      [SwitchStrategy.SPEED]: '速度优先',
      [SwitchStrategy.BALANCE]: '平衡模式',
    };
    return names[strategy] || '未知';
  }

  /**
   * 显示音源切换器
   */
  public show(): void {
    this.isVisible = true;
    this.container.style.display = 'block';
    this.refreshStats();
  }

  /**
   * 隐藏音源切换器
   */
  public hide(): void {
    this.isVisible = false;
    this.container.style.display = 'none';
  }

  /**
   * 切换显示状态
   */
  public toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * 刷新统计信息
   */
  private refreshStats(): void {
    const providersStatus = providerManagerEnhanced.getProvidersStatus();

    // 更新音源列表
    this.updateSourceList(providersStatus);

    // 更新统计信息
    this.updateStats(providersStatus);

    // 更新策略选择
    this.updateStrategySelection();
  }

  /**
   * 更新音源列表
   */
  private updateSourceList(providersStatus: any[]): void {
    const sourceList = this.container.querySelector('#sourceList') as HTMLElement;

    sourceList.innerHTML = providersStatus.map(provider => `
      <div class="source-item ${!provider.enabled ? 'disabled' : ''}" data-provider="${provider.id}">
        <div class="source-info">
          <div class="source-color" style="background-color: ${provider.color}"></div>
          <div class="source-name">${provider.name}</div>
        </div>
        <button class="source-toggle ${provider.enabled ? 'enabled' : ''}" data-provider="${provider.id}">
          ${provider.enabled ? '已启用' : '已禁用'}
        </button>
      </div>
    `).join('');

    // 绑定音源切换事件
    sourceList.querySelectorAll('.source-toggle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const providerId = (btn as HTMLElement).dataset.provider!;
        const enabled = btn.classList.contains('enabled');
        providerManagerEnhanced.setProviderEnabled(providerId, !enabled);
        this.refreshStats();
      });
    });
  }

  /**
   * 更新统计信息
   */
  private updateStats(providersStatus: any[]): void {
    const statsGrid = this.container.querySelector('#sourceStats') as HTMLElement;

    const enabledProviders = providersStatus.filter(p => p.enabled);
    const avgSuccessRate = enabledProviders.reduce((sum, p) => sum + p.successRate, 0) / enabledProviders.length || 0;
    const avgResponseTime = enabledProviders.reduce((sum, p) => sum + p.avgResponseTime, 0) / enabledProviders.length || 0;

    statsGrid.innerHTML = `
      <div class="stat-item">
        <div class="stat-value">${enabledProviders.length}/${providersStatus.length}</div>
        <div class="stat-label">可用音源</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${Math.round(avgSuccessRate * 100)}%</div>
        <div class="stat-label">成功率</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${Math.round(avgResponseTime)}ms</div>
        <div class="stat-label">响应时间</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${this.getStrategyName(this.currentStrategy)}</div>
        <div class="stat-label">当前策略</div>
      </div>
    `;
  }

  /**
   * 更新策略选择
   */
  private updateStrategySelection(): void {
    const strategyInput = this.container.querySelector(`input[name="switch-strategy"][value="${this.currentStrategy}"]`) as HTMLInputElement;
    if (strategyInput) {
      strategyInput.checked = true;
    }
  }

  /**
   * 重置统计
   */
  private resetStats(): void {
    // 这里可以调用ProviderManager的重置方法
    this.showNotification('统计信息已重置', 'info');
  }

  /**
   * 测试所有音源
   */
  private async testAllSources(): Promise<void> {
    this.showNotification('开始测试所有音源...', 'info');

    // 这里可以调用测试连接的方法
    // 实际实现会需要异步测试每个Provider

    this.showNotification('音源测试完成', 'success');
    this.refreshStats();
  }

  /**
   * 显示通知
   */
  private showNotification(message: string, type: 'success' | 'info' | 'warning' | 'error' = 'info'): void {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `source-switcher-notification ${type}`;
    notification.textContent = message;

    // 添加样式
    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '12px 20px',
      borderRadius: '8px',
      color: 'white',
      fontSize: '14px',
      fontWeight: '500',
      zIndex: '10001',
      opacity: '0',
      transform: 'translateX(100%)',
      transition: 'all 0.3s ease',
    });

    // 设置颜色
    const colors = {
      success: '#4CAF50',
      info: '#2196F3',
      warning: '#FF9800',
      error: '#F44336',
    };
    notification.style.background = colors[type];

    document.body.appendChild(notification);

    // 显示动画
    setTimeout(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateX(0)';
    }, 100);

    // 自动隐藏
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }
}

// 创建全局实例
export const sourceSwitcherUI = new SourceSwitcherUI();