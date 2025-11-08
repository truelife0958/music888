import { test, expect } from '@playwright/test';

test.describe('性能监控测试', () => {
  test('首屏加载性能应该符合标准', async ({ page }) => {
    // 开始性能追踪
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // 获取性能指标
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      
      return {
        // 页面加载时间
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        
        // 首次绘制
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
        
        // DNS和连接时间
        dnsTime: navigation.domainLookupEnd - navigation.domainLookupStart,
        tcpTime: navigation.connectEnd - navigation.connectStart,
        
        // 总加载时间
        totalTime: navigation.loadEventEnd - navigation.fetchStart,
      };
    });
    
    console.log('性能指标:', metrics);
    
    // 性能断言
    expect(metrics.firstContentfulPaint).toBeLessThan(2000); // FCP < 2s
    expect(metrics.totalTime).toBeLessThan(5000); // 总加载时间 < 5s
  });

  test('虚拟滚动性能测试', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 模拟搜索以显示大量结果
    const searchInput = page.locator('#search-input');
    if (await searchInput.isVisible()) {
      await searchInput.fill('周杰伦');
      await page.keyboard.press('Enter');
      
      // 等待结果加载
      await page.waitForTimeout(2000);
      
      // 测试滚动性能
      const startTime = Date.now();
      
      // 快速滚动
      for (let i = 0; i < 10; i++) {
        await page.mouse.wheel(0, 500);
        await page.waitForTimeout(50);
      }
      
      const endTime = Date.now();
      const scrollDuration = endTime - startTime;
      
      console.log('滚动耗时:', scrollDuration, 'ms');
      
      // 滚动应该流畅，总耗时合理
      expect(scrollDuration).toBeLessThan(2000);
    }
  });

  test('内存使用监控', async ({ page }) => {
    await page.goto('/');
    
    // 获取初始内存使用
    const initialMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        const mem = (performance as any).memory;
        return {
          usedJSHeapSize: mem.usedJSHeapSize,
          totalJSHeapSize: mem.totalJSHeapSize,
          jsHeapSizeLimit: mem.jsHeapSizeLimit,
        };
      }
      return null;
    });
    
    if (initialMemory) {
      console.log('初始内存:', initialMemory);
      
      // 执行一些操作
      await page.waitForTimeout(3000);
      
      // 获取操作后内存使用
      const finalMemory = await page.evaluate(() => {
        const mem = (performance as any).memory;
        return {
          usedJSHeapSize: mem.usedJSHeapSize,
          totalJSHeapSize: mem.totalJSHeapSize,
        };
      });
      
      console.log('最终内存:', finalMemory);
      
      // 内存增长不应过大
      const memoryGrowth = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
      const growthMB = memoryGrowth / (1024 * 1024);
      
      console.log('内存增长:', growthMB.toFixed(2), 'MB');
      
      // 内存增长应该在合理范围内（< 50MB）
      expect(growthMB).toBeLessThan(50);
    }
  });

  test('网络请求性能', async ({ page }) => {
    const requests: Array<{ url: string; size: number }> = [];
    
    // 监听网络请求
    page.on('response', async (response) => {
      const request = response.request();
      
      try {
        const body = await response.body();
        requests.push({
          url: request.url(),
          size: body.length,
        });
      } catch (error) {
        // 某些请求可能无法获取body
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 分析请求
    const totalSize = requests.reduce((sum, r) => sum + r.size, 0);
    const largeRequests = requests.filter(r => r.size > 500 * 1024); // > 500KB
    
    console.log('总请求数:', requests.length);
    console.log('大文件请求数:', largeRequests.length);
    console.log('总传输大小:', (totalSize / 1024).toFixed(2), 'KB');
    
    // 大文件请求不应过多
    expect(largeRequests.length).toBeLessThan(5);
    
    // 总传输大小应该合理（< 5MB）
    expect(totalSize).toBeLessThan(5 * 1024 * 1024);
  });
});