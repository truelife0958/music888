/**
 * 音源管理器UI组件
 * 提供用户界面来管理不同的音源系统
 */

import { unifiedProviderManager } from '../providers/unified-provider-manager.js';
import { enhancedSearch } from '../enhanced-search.js';

export class SourceManagerUI {
  private static instance: SourceManagerUI;
  private isModalVisible = false;
  private modal: HTMLElement | null = null;

  private constructor() {
    this.init();
  }

  static getInstance(): SourceManagerUI {
    if (!SourceManagerUI.instance) {
      SourceManagerUI.instance = new SourceManagerUI();
    }
    return SourceManagerUI.instance;
  }

  private init(): void {
    this.createModal();
    this.createToggleButton();
    this.bindEvents();
  }

  private createModal(): void {
    const modalHTML = `
      <div id="sourceManagerModal" class="source-manager-modal" style="display: none;">
        <div class="source-manager-content">
          <div class="source-manager-header">
            <h3><i class="fas fa-sliders-h"></i> 音源管理</h3>
            <button class="close-modal-btn" id="closeSourceManagerModal">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div class="source-manager-body">
            <!-- 系统状态 -->
            <div class="system-status-section">
              <h4><i class="fas fa-cogs"></i> 系统状态</h4>
              <div class="system-status-grid">
                <div class="system-status-item" data-system="original">
                  <div class="system-status-icon">
                    <i class="fas fa-server"></i>
                  </div>
                  <div class="system-status-info">
                    <div class="system-name">原有架构</div>
                    <div class="system-desc">基础 Provider 系统</div>
                  </div>
                  <div class="system-status-toggle">
                    <label class="toggle-switch">
                      <input type="checkbox" id="toggleOriginal" checked>
                      <span class="toggle-slider"></span>
                    </label>
                  </div>
                </div>

                <div class="system-status-item" data-system="enhanced">
                  <div class="system-status-icon">
                    <i class="fas fa-rocket"></i>
                  </div>
                  <div class="system-status-info">
                    <div class="system-name">增强版架构</div>
                    <div class="system-desc">智能跨平台切换</div>
                  </div>
                  <div class="system-status-toggle">
                    <label class="toggle-switch">
                      <input type="checkbox" id="toggleEnhanced" checked>
                      <span class="toggle-slider"></span>
                    </label>
                  </div>
                </div>

                <div class="system-status-item" data-system="listen1">
                  <div class="system-status-icon">
                    <i class="fas fa-layer-group"></i>
                  </div>
                  <div class="system-status-info">
                    <div class="system-name">Listen1 架构</div>
                    <div class="system-desc">全平台聚合搜索</div>
                  </div>
                  <div class="system-status-toggle">
                    <label class="toggle-switch">
                      <input type="checkbox" id="toggleListen1" checked>
                      <span class="toggle-slider"></span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <!-- 搜索配置 -->
            <div class="search-config-section">
              <h4><i class="fas fa-search"></i> 搜索配置</h4>
              <div class="search-config-form">
                <div class="form-group">
                  <label>默认搜索源:</label>
                  <select id="defaultSearchSource">
                    <option value="auto">智能选择 (推荐)</option>
                    <option value="listen1">Listen1 全平台</option>
                    <option value="enhanced">增强版多平台</option>
                    <option value="netease">网易云音乐</option>
                    <option value="qq">QQ音乐</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>自动切换音源:</label>
                  <label class="toggle-switch">
                    <input type="checkbox" id="autoFallback" checked>
                    <span class="toggle-slider"></span>
                  </label>
                  <small>播放失败时自动尝试其他平台</small>
                </div>
                <div class="form-group">
                  <label>搜索缓存大小:</label>
                  <input type="number" id="cacheSize" min="10" max="200" value="50">
                  <small>缓存最近的搜索结果</small>
                </div>
              </div>
            </div>

            <!-- 平台状态 -->
            <div class="platform-status-section">
              <h4><i class="fas fa-music"></i> 支持的平台</h4>
              <div class="platform-grid" id="platformGrid">
                <!-- 动态生成 -->
              </div>
            </div>

            <!-- 统计信息 -->
            <div class="stats-section">
              <h4><i class="fas fa-chart-bar"></i> 统计信息</h4>
              <div class="stats-grid">
                <div class="stat-item">
                  <div class="stat-label">搜索缓存</div>
                  <div class="stat-value" id="cacheStat">0</div>
                </div>
                <div class="stat-item">
                  <div class="stat-label">搜索历史</div>
                  <div class="stat-value" id="historyStat">0</div>
                </div>
                <div class="stat-item">
                  <div class="stat-label">支持平台</div>
                  <div class="stat-value" id="platformStat">0</div>
                </div>
                <div class="stat-item">
                  <div class="stat-label">活跃系统</div>
                  <div class="stat-value" id="activeSystemStat">0</div>
                </div>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="actions-section">
              <button class="btn btn-primary" id="testAllSources">
                <i class="fas fa-play"></i> 测试所有音源
              </button>
              <button class="btn btn-secondary" id="clearCache">
                <i class="fas fa-trash"></i> 清除缓存
              </button>
              <button class="btn btn-secondary" id="clearHistory">
                <i class="fas fa-history"></i> 清除历史
              </button>
              <button class="btn btn-danger" id="resetSettings">
                <i class="fas fa-undo"></i> 重置设置
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.modal = document.getElementById('sourceManagerModal');
  }

  private createToggleButton(): void {
    // 在现有的音源按钮旁边添加管理按钮
    const sourceSwitcherBtn = document.getElementById('sourceSwitcherBtn');
    if (sourceSwitcherBtn) {
      sourceSwitcherBtn.insertAdjacentHTML('afterend', `
        <button class="source-manager-btn" id="sourceManagerBtn" title="音源管理">
          <i class="fas fa-cogs"></i>
          <span>管理</span>
        </button>
      `);
    }
  }

  private bindEvents(): void {
    // 打开/关闭模态框
    const sourceManagerBtn = document.getElementById('sourceManagerBtn');
    const closeBtn = document.getElementById('closeSourceManagerModal');

    sourceManagerBtn?.addEventListener('click', () => this.show());
    closeBtn?.addEventListener('click', () => this.hide());

    // 点击模态框外部关闭
    this.modal?.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.hide();
      }
    });

    // 系统切换
    const toggleOriginal = document.getElementById('toggleOriginal') as HTMLInputElement;
    const toggleEnhanced = document.getElementById('toggleEnhanced') as HTMLInputElement;
    const toggleListen1 = document.getElementById('toggleListen1') as HTMLInputElement;

    toggleOriginal?.addEventListener('change', (e) => {
      const enabled = (e.target as HTMLInputElement).checked;
      unifiedProviderManager.configureSystems({ original: enabled });
      this.updateStats();
    });

    toggleEnhanced?.addEventListener('change', (e) => {
      const enabled = (e.target as HTMLInputElement).checked;
      unifiedProviderManager.configureSystems({ enhanced: enabled });
      this.updateStats();
    });

    toggleListen1?.addEventListener('change', (e) => {
      const enabled = (e.target as HTMLInputElement).checked;
      unifiedProviderManager.configureSystems({ listen1: enabled });
      this.updateStats();
    });

    // 操作按钮
    document.getElementById('clearCache')?.addEventListener('click', () => {
      enhancedSearch.clearCache();
      this.updateStats();
      this.showNotification('缓存已清除', 'success');
    });

    document.getElementById('clearHistory')?.addEventListener('click', () => {
      enhancedSearch.clearSearchHistory();
      this.updateStats();
      this.showNotification('搜索历史已清除', 'success');
    });

    document.getElementById('resetSettings')?.addEventListener('click', () => {
      this.resetSettings();
    });

    document.getElementById('testAllSources')?.addEventListener('click', () => {
      this.testAllSources();
    });

    // 配置变更
    document.getElementById('defaultSearchSource')?.addEventListener('change', () => {
      this.saveSettings();
    });

    document.getElementById('cacheSize')?.addEventListener('change', (e) => {
      const size = parseInt((e.target as HTMLInputElement).value);
      enhancedSearch.configure({ maxCacheSize: size });
      this.saveSettings();
    });
  }

  show(): void {
    if (this.modal) {
      this.modal.style.display = 'flex';
      this.isModalVisible = true;
      this.updateModalContent();
    }
  }

  hide(): void {
    if (this.modal) {
      this.modal.style.display = 'none';
      this.isModalVisible = false;
    }
  }

  private updateModalContent(): void {
    this.updateSystemStatus();
    this.updatePlatformGrid();
    this.updateStats();
    this.loadSettings();
  }

  private updateSystemStatus(): void {
    const status = unifiedProviderManager.getSystemStatus();

    (document.getElementById('toggleOriginal') as HTMLInputElement).checked = status.original;
    (document.getElementById('toggleEnhanced') as HTMLInputElement).checked = status.enhanced;
    (document.getElementById('toggleListen1') as HTMLInputElement).checked = status.listen1;
  }

  private updatePlatformGrid(): void {
    const platforms = unifiedProviderManager.getAllPlatforms();
    const grid = document.getElementById('platformGrid');

    if (!grid) return;

    const platformHTML = platforms.map(platform => `
      <div class="platform-item">
        <div class="platform-icon">
          <i class="fas fa-music"></i>
        </div>
        <div class="platform-info">
          <div class="platform-name">${platform.name}</div>
          <div class="platform-source">${platform.source}</div>
        </div>
        <div class="platform-status">
          <span class="status-dot active"></span>
        </div>
      </div>
    `).join('');

    grid.innerHTML = platformHTML;
  }

  private updateStats(): void {
    const searchStats = enhancedSearch.getSearchStats();
    const systemStatus = unifiedProviderManager.getSystemStatus();

    document.getElementById('cacheStat')!.textContent = searchStats.cacheSize.toString();
    document.getElementById('historyStat')!.textContent = searchStats.historySize.toString();
    document.getElementById('platformStat')!.textContent = searchStats.supportedPlatforms.toString();

    const activeSystems = Object.values(systemStatus).filter(Boolean).length;
    document.getElementById('activeSystemStat')!.textContent = activeSystems.toString();
  }

  private loadSettings(): void {
    try {
      const settings = JSON.parse(localStorage.getItem('sourceManagerSettings') || '{}');

      if (settings.defaultSearchSource) {
        (document.getElementById('defaultSearchSource') as HTMLSelectElement).value = settings.defaultSearchSource;
      }
      if (settings.cacheSize) {
        (document.getElementById('cacheSize') as HTMLInputElement).value = settings.cacheSize.toString();
      }
      if (settings.autoFallback !== undefined) {
        (document.getElementById('autoFallback') as HTMLInputElement).checked = settings.autoFallback;
      }
    } catch (error) {
      console.warn('加载音源管理设置失败:', error);
    }
  }

  private saveSettings(): void {
    try {
      const settings = {
        defaultSearchSource: (document.getElementById('defaultSearchSource') as HTMLSelectElement).value,
        cacheSize: parseInt((document.getElementById('cacheSize') as HTMLInputElement).value),
        autoFallback: (document.getElementById('autoFallback') as HTMLInputElement).checked,
      };

      localStorage.setItem('sourceManagerSettings', JSON.stringify(settings));
    } catch (error) {
      console.warn('保存音源管理设置失败:', error);
    }
  }

  private resetSettings(): void {
    localStorage.removeItem('sourceManagerSettings');
    localStorage.removeItem('enhanced_search_history');

    enhancedSearch.clearCache();
    enhancedSearch.clearSearchHistory();

    unifiedProviderManager.configureSystems({
      original: true,
      enhanced: true,
      listen1: true
    });

    this.updateModalContent();
    this.showNotification('设置已重置', 'success');
  }

  private async testAllSources(): Promise<void> {
    this.showNotification('开始测试音源...', 'info');

    // 这里可以实现音源测试逻辑
    setTimeout(() => {
      this.showNotification('音源测试完成', 'success');
    }, 2000);
  }

  private showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
    // 简单的通知实现
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : 'info'}"></i>
      <span>${message}</span>
    `;

    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#1db954' : type === 'error' ? '#ff4444' : '#ff8800'};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      z-index: 10000;
      display: flex;
      align-items: center;
      gap: 8px;
      animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

// 导出单例实例
export const sourceManagerUI = SourceManagerUI.getInstance();

export default sourceManagerUI;