/**
 * 新手引导模块
 * 为首次使用的用户提供交互式引导
 */

import { storage } from './utils';
import { logger } from './logger';

interface OnboardingStep {
  id: string;
  title: string;
  content: string;
  target?: string; // CSS选择器
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: () => void;
  highlight?: boolean;
}

interface OnboardingConfig {
  storageKey: string;
  steps: OnboardingStep[];
  showOnFirstVisit: boolean;
  skipButtonText: string;
  nextButtonText: string;
  prevButtonText: string;
  finishButtonText: string;
}

class OnboardingManager {
  private config: OnboardingConfig;
  private currentStepIndex: number = 0;
  private overlay: HTMLElement | null = null;
  private tooltip: HTMLElement | null = null;
  private isActive: boolean = false;

  constructor() {
    this.config = {
      storageKey: 'onboarding_completed',
      showOnFirstVisit: true,
      skipButtonText: '跳过',
      nextButtonText: '下一步',
      prevButtonText: '上一步',
      finishButtonText: '开始使用',
      steps: [
        {
          id: 'welcome',
          title: '欢迎使用音乐播放器 🎵',
          content: '让我们快速了解一下主要功能，只需30秒！',
          position: 'center',
          highlight: false,
        },
        {
          id: 'search',
          title: '搜索音乐 🔍',
          content: '在这里输入歌曲名称或歌手名，支持多个音乐平台搜索',
          target: '.search-input',
          position: 'bottom',
          highlight: true,
        },
        {
          id: 'source',
          title: '选择音乐源 🎼',
          content: '支持网易云、QQ音乐、酷狗等7个主流平台',
          target: '.source-select',
          position: 'bottom',
          highlight: true,
        },
        {
          id: 'results',
          title: '搜索结果 📋',
          content: '搜索结果会显示在这里，点击歌曲即可播放',
          target: '.search-results',
          position: 'right',
          highlight: true,
        },
        {
          id: 'player',
          title: '播放控制 ▶️',
          content: '播放、暂停、上一首、下一首，还支持播放模式切换',
          target: '.player-controls',
          position: 'top',
          highlight: true,
        },
        {
          id: 'quality',
          title: '音质选择 🎧',
          content: '支持多种音质：标准、高品质、无损、Hi-Res',
          target: '.quality-toggle-btn',
          position: 'top',
          highlight: true,
        },
        {
          id: 'mobile-tip',
          title: '移动端提示 📱',
          content: '在移动端可以左右滑动切换搜索、播放器和统计三个页面',
          position: 'center',
          highlight: false,
        },
        {
          id: 'finish',
          title: '开始探索吧！🎉',
          content: '所有准备就绪！现在可以搜索并播放你喜欢的音乐了',
          position: 'center',
          highlight: false,
        },
      ],
    };
  }

  /**
   * 初始化新手引导
   */
  public init(): void {
    try {
      if (this.shouldShowOnboarding()) {
        // 延迟1秒显示，让页面先加载完成
        setTimeout(() => {
          this.start();
        }, 1000);
      }

      // 监听手动触发引导的事件
      document.addEventListener('show-onboarding', () => {
        this.start();
      });

      logger.info('新手引导模块初始化成功');
    } catch (error) {
      logger.error('新手引导初始化失败', error);
    }
  }

  /**
   * 判断是否应该显示新手引导
   */
  private shouldShowOnboarding(): boolean {
    if (!this.config.showOnFirstVisit) {
      return false;
    }

    const completed = storage.get(this.config.storageKey, '') as string;
    return completed !== 'true';
  }

  /**
   * 开始引导
   */
  public start(): void {
    if (this.isActive) {
      return;
    }

    this.isActive = true;
    this.currentStepIndex = 0;
    this.createOverlay();
    this.showStep(0);
    logger.info('新手引导开始');
  }

  /**
   * 创建遮罩层
   */
  private createOverlay(): void {
    // 创建遮罩
    this.overlay = document.createElement('div');
    this.overlay.className = 'onboarding-overlay';
    this.overlay.innerHTML = `
      <div class="onboarding-backdrop"></div>
      <div class="onboarding-highlight"></div>
    `;
    document.body.appendChild(this.overlay);

    // 创建提示框
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'onboarding-tooltip';
    document.body.appendChild(this.tooltip);
  }

  /**
   * 显示指定步骤
   */
  private showStep(index: number): void {
    if (index < 0 || index >= this.config.steps.length) {
      return;
    }

    const step = this.config.steps[index];
    this.currentStepIndex = index;

    // 更新高亮区域
    if (step.highlight && step.target) {
      this.highlightElement(step.target);
    } else {
      this.clearHighlight();
    }

    // 更新提示框
    this.updateTooltip(step);

    // 执行步骤动作
    if (step.action) {
      step.action();
    }

    logger.info(`显示引导步骤: ${step.id} (${index + 1}/${this.config.steps.length})`);
  }

  /**
   * 高亮指定元素
   */
  private highlightElement(selector: string): void {
    const element = document.querySelector(selector) as HTMLElement;
    if (!element) {
      logger.warn(`引导目标元素未找到: ${selector}`);
      this.clearHighlight();
      return;
    }

    const rect = element.getBoundingClientRect();
    const highlight = this.overlay?.querySelector('.onboarding-highlight') as HTMLElement;

    if (highlight) {
      highlight.style.display = 'block';
      highlight.style.top = `${rect.top - 8}px`;
      highlight.style.left = `${rect.left - 8}px`;
      highlight.style.width = `${rect.width + 16}px`;
      highlight.style.height = `${rect.height + 16}px`;
    }
  }

  /**
   * 清除高亮
   */
  private clearHighlight(): void {
    const highlight = this.overlay?.querySelector('.onboarding-highlight') as HTMLElement;
    if (highlight) {
      highlight.style.display = 'none';
    }
  }

  /**
   * 更新提示框
   */
  private updateTooltip(step: OnboardingStep): void {
    if (!this.tooltip) return;

    const isFirst = this.currentStepIndex === 0;
    const isLast = this.currentStepIndex === this.config.steps.length - 1;

    this.tooltip.innerHTML = `
      <div class="onboarding-tooltip-header">
        <h3 class="onboarding-tooltip-title">${step.title}</h3>
        <button class="onboarding-close-btn" aria-label="关闭引导">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="onboarding-tooltip-body">
        <p>${step.content}</p>
      </div>
      <div class="onboarding-tooltip-footer">
        <div class="onboarding-progress">
          <span class="onboarding-step-indicator">
            ${this.currentStepIndex + 1} / ${this.config.steps.length}
          </span>
          <div class="onboarding-progress-bar">
            <div class="onboarding-progress-fill" style="width: ${((this.currentStepIndex + 1) / this.config.steps.length) * 100}%"></div>
          </div>
        </div>
        <div class="onboarding-buttons">
          ${!isFirst ? `<button class="onboarding-btn onboarding-btn-secondary onboarding-prev-btn">${this.config.prevButtonText}</button>` : ''}
          <button class="onboarding-btn onboarding-btn-secondary onboarding-skip-btn">${this.config.skipButtonText}</button>
          ${!isLast ? `<button class="onboarding-btn onboarding-btn-primary onboarding-next-btn">${this.config.nextButtonText}</button>` : ''}
          ${isLast ? `<button class="onboarding-btn onboarding-btn-primary onboarding-finish-btn">${this.config.finishButtonText}</button>` : ''}
        </div>
      </div>
    `;

    // 绑定事件
    this.tooltip.querySelector('.onboarding-close-btn')?.addEventListener('click', () => this.skip());
    this.tooltip.querySelector('.onboarding-skip-btn')?.addEventListener('click', () => this.skip());
    this.tooltip.querySelector('.onboarding-prev-btn')?.addEventListener('click', () => this.prev());
    this.tooltip.querySelector('.onboarding-next-btn')?.addEventListener('click', () => this.next());
    this.tooltip.querySelector('.onboarding-finish-btn')?.addEventListener('click', () => this.finish());

    // 定位提示框
    this.positionTooltip(step);
  }

  /**
   * 定位提示框
   */
  private positionTooltip(step: OnboardingStep): void {
    if (!this.tooltip) return;

    const position = step.position || 'center';

    if (position === 'center' || !step.target) {
      // 居中显示
      this.tooltip.style.top = '50%';
      this.tooltip.style.left = '50%';
      this.tooltip.style.transform = 'translate(-50%, -50%)';
      this.tooltip.style.bottom = 'auto';
      this.tooltip.style.right = 'auto';
      return;
    }

    const target = document.querySelector(step.target) as HTMLElement;
    if (!target) {
      // 目标不存在，居中显示
      this.tooltip.style.top = '50%';
      this.tooltip.style.left = '50%';
      this.tooltip.style.transform = 'translate(-50%, -50%)';
      return;
    }

    const rect = target.getBoundingClientRect();
    const tooltipRect = this.tooltip.getBoundingClientRect();
    const spacing = 20;

    this.tooltip.style.transform = 'none';

    switch (position) {
      case 'top':
        this.tooltip.style.top = `${rect.top - tooltipRect.height - spacing}px`;
        this.tooltip.style.left = `${rect.left + rect.width / 2 - tooltipRect.width / 2}px`;
        break;
      case 'bottom':
        this.tooltip.style.top = `${rect.bottom + spacing}px`;
        this.tooltip.style.left = `${rect.left + rect.width / 2 - tooltipRect.width / 2}px`;
        break;
      case 'left':
        this.tooltip.style.top = `${rect.top + rect.height / 2 - tooltipRect.height / 2}px`;
        this.tooltip.style.left = `${rect.left - tooltipRect.width - spacing}px`;
        break;
      case 'right':
        this.tooltip.style.top = `${rect.top + rect.height / 2 - tooltipRect.height / 2}px`;
        this.tooltip.style.left = `${rect.right + spacing}px`;
        break;
    }

    // 确保提示框在视口内
    this.ensureTooltipInViewport();
  }

  /**
   * 确保提示框在视口内
   */
  private ensureTooltipInViewport(): void {
    if (!this.tooltip) return;

    const rect = this.tooltip.getBoundingClientRect();
    const margin = 20;

    if (rect.left < margin) {
      this.tooltip.style.left = `${margin}px`;
    }
    if (rect.right > window.innerWidth - margin) {
      this.tooltip.style.left = `${window.innerWidth - rect.width - margin}px`;
    }
    if (rect.top < margin) {
      this.tooltip.style.top = `${margin}px`;
    }
    if (rect.bottom > window.innerHeight - margin) {
      this.tooltip.style.top = `${window.innerHeight - rect.height - margin}px`;
    }
  }

  /**
   * 下一步
   */
  private next(): void {
    if (this.currentStepIndex < this.config.steps.length - 1) {
      this.showStep(this.currentStepIndex + 1);
    }
  }

  /**
   * 上一步
   */
  private prev(): void {
    if (this.currentStepIndex > 0) {
      this.showStep(this.currentStepIndex - 1);
    }
  }

  /**
   * 跳过引导
   */
  private skip(): void {
    this.finish(false);
  }

  /**
   * 完成引导
   */
  private finish(completed: boolean = true): void {
    this.cleanup();
    
    if (completed) {
      storage.set(this.config.storageKey, 'true');
      logger.info('新手引导完成');
    } else {
      logger.info('新手引导已跳过');
    }

    this.isActive = false;
  }

  /**
   * 清理DOM元素
   */
  private cleanup(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    if (this.tooltip) {
      this.tooltip.remove();
      this.tooltip = null;
    }
  }

  /**
   * 重置引导状态（用于测试）
   */
  public reset(): void {
    storage.remove(this.config.storageKey);
    this.cleanup();
    this.isActive = false;
    this.currentStepIndex = 0;
    logger.info('新手引导状态已重置');
  }

  /**
   * 手动触发引导
   */
  public show(): void {
    this.start();
  }
}

// 导出单例
export const onboardingManager = new OnboardingManager();

// 自动初始化
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    onboardingManager.init();
  });
}