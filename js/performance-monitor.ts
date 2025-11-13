/**
 * 性能监控模块
 * 用于监控和分析应用性能指标
 */

interface PerformanceMetrics {
  // 页面加载指标
  loadMetrics: {
    domContentLoaded: number;
    loadComplete: number;
    firstPaint: number;
    firstContentfulPaint: number;
    totalTime: number;
  };

  // 资源加载指标
  resourceMetrics: {
    totalRequests: number;
    totalSize: number;
    slowRequests: number;
  };

  // 内存指标
  memoryMetrics?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };

  // 自定义指标
  customMetrics: Map<string, number>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private observers: PerformanceObserver[] = [];

  constructor() {
    this.metrics = {
      loadMetrics: {
        domContentLoaded: 0,
        loadComplete: 0,
        firstPaint: 0,
        firstContentfulPaint: 0,
        totalTime: 0,
      },
      resourceMetrics: {
        totalRequests: 0,
        totalSize: 0,
        slowRequests: 0,
      },
      customMetrics: new Map(),
    };
  }

  /**
   * 初始化性能监控
   */
  init(): void {
    if (typeof window === 'undefined') return;

    // 监听页面加载完成
    if (document.readyState === 'complete') {
      this.collectLoadMetrics();
    } else {
      window.addEventListener('load', () => this.collectLoadMetrics());
    }

    // 监听资源加载
    this.observeResources();

    // 收集内存信息（仅Chrome）
    this.collectMemoryMetrics();

    console.log('📊 性能监控已启动');
  }

  /**
   * 收集页面加载指标
   */
  private collectLoadMetrics(): void {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');

    if (navigation) {
      this.metrics.loadMetrics = {
        domContentLoaded:
          navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: paint.find((p) => p.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint:
          paint.find((p) => p.name === 'first-contentful-paint')?.startTime || 0,
        totalTime: navigation.loadEventEnd - navigation.fetchStart,
      };

      console.log('📊 页面加载指标:', this.metrics.loadMetrics);
    }
  }

  /**
   * 监听资源加载
   */
  private observeResources(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            const resource = entry as PerformanceResourceTiming;
            this.metrics.resourceMetrics.totalRequests++;
            this.metrics.resourceMetrics.totalSize += resource.transferSize || 0;

            // 统计慢请求（>1秒）
            if (resource.duration > 1000) {
              this.metrics.resourceMetrics.slowRequests++;
            }
          }
        }
      });

      observer.observe({ entryTypes: ['resource'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('⚠️ PerformanceObserver 不支持:', error);
    }
  }

  /**
   * 收集内存指标（仅Chrome）
   */
  private collectMemoryMetrics(): void {
    if ('memory' in performance) {
      const mem = (performance as any).memory;
      this.metrics.memoryMetrics = {
        usedJSHeapSize: mem.usedJSHeapSize,
        totalJSHeapSize: mem.totalJSHeapSize,
        jsHeapSizeLimit: mem.jsHeapSizeLimit,
      };
    }
  }

  /**
   * 记录自定义性能指标
   */
  mark(name: string): void {
    performance.mark(name);
  }

  /**
   * 测量两个标记之间的时间
   */
  measure(name: string, startMark: string, endMark: string): number {
    try {
      performance.measure(name, startMark, endMark);
      const measure = performance.getEntriesByName(name, 'measure')[0];
      const duration = measure?.duration || 0;
      this.metrics.customMetrics.set(name, duration);
      return duration;
    } catch (error) {
      console.warn(`⚠️ 性能测量失败 (${name}):`, error);
      return 0;
    }
  }

  /**
   * 获取所有指标
   */
  getMetrics(): PerformanceMetrics {
    // 更新内存指标
    this.collectMemoryMetrics();
    return this.metrics;
  }

  /**
   * 获取性能报告
   */
  getReport(): string {
    const metrics = this.getMetrics();

    let report = '\n========== 性能报告 ==========\n\n';

    // 页面加载指标
    report += '📄 页面加载:\n';
    report += `  - 首次绘制 (FP): ${metrics.loadMetrics.firstPaint.toFixed(2)}ms\n`;
    report += `  - 首次内容绘制 (FCP): ${metrics.loadMetrics.firstContentfulPaint.toFixed(2)}ms\n`;
    report += `  - DOM加载完成: ${metrics.loadMetrics.domContentLoaded.toFixed(2)}ms\n`;
    report += `  - 页面完全加载: ${metrics.loadMetrics.totalTime.toFixed(2)}ms\n\n`;

    // 资源加载指标
    report += '📦 资源加载:\n';
    report += `  - 总请求数: ${metrics.resourceMetrics.totalRequests}\n`;
    report += `  - 总传输大小: ${(metrics.resourceMetrics.totalSize / 1024).toFixed(2)}KB\n`;
    report += `  - 慢请求数 (>1s): ${metrics.resourceMetrics.slowRequests}\n\n`;

    // 内存指标
    if (metrics.memoryMetrics) {
      const usedMB = (metrics.memoryMetrics.usedJSHeapSize / (1024 * 1024)).toFixed(2);
      const totalMB = (metrics.memoryMetrics.totalJSHeapSize / (1024 * 1024)).toFixed(2);
      const limitMB = (metrics.memoryMetrics.jsHeapSizeLimit / (1024 * 1024)).toFixed(2);

      report += '💾 内存使用:\n';
      report += `  - 已使用: ${usedMB}MB\n`;
      report += `  - 已分配: ${totalMB}MB\n`;
      report += `  - 限制: ${limitMB}MB\n\n`;
    }

    // 自定义指标
    if (metrics.customMetrics.size > 0) {
      report += '⏱️ 自定义指标:\n';
      metrics.customMetrics.forEach((duration, name) => {
        report += `  - ${name}: ${duration.toFixed(2)}ms\n`;
      });
      report += '\n';
    }

    report += '===============================\n';

    return report;
  }

  /**
   * 打印性能报告到控制台
   */
  printReport(): void {
    console.log(this.getReport());
  }

  /**
   * 清理监控器
   */
  cleanup(): void {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];
    console.log('📊 性能监控已停止');
  }
}

// 创建单例实例
const performanceMonitor = new PerformanceMonitor();

export default performanceMonitor;
