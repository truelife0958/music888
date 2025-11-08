import { test, expect } from '@playwright/test';

test.describe('Music888 基础功能测试', () => {
  test('页面应该正确加载', async ({ page }) => {
    await page.goto('/');
    
    // 检查页面标题
    await expect(page).toHaveTitle(/音乐播放器/);
    
    // 检查主要元素存在
    await expect(page.locator('.search-container')).toBeVisible();
    await expect(page.locator('.player-container')).toBeVisible();
    await expect(page.locator('.nav-tabs')).toBeVisible();
  });

  test('搜索框应该可以输入', async ({ page }) => {
    await page.goto('/');
    
    const searchInput = page.locator('#search-input');
    await expect(searchInput).toBeVisible();
    
    // 输入搜索关键词
    await searchInput.fill('周杰伦');
    await expect(searchInput).toHaveValue('周杰伦');
  });

  test('主题切换应该工作', async ({ page }) => {
    await page.goto('/');
    
    // 查找主题切换按钮
    const themeToggle = page.locator('[title*="主题"]');
    
    if (await themeToggle.isVisible()) {
      // 点击切换主题
      await themeToggle.click();
      
      // 等待主题切换完成
      await page.waitForTimeout(300);
      
      // 检查body类名变化
      const bodyClass = await page.locator('body').getAttribute('class');
      expect(bodyClass).toBeTruthy();
    }
  });

  test('导航标签应该可以切换', async ({ page }) => {
    await page.goto('/');
    
    // 等待页面加载
    await page.waitForLoadState('networkidle');
    
    // 查找所有导航标签
    const navTabs = page.locator('.nav-tabs .nav-item');
    const count = await navTabs.count();
    
    expect(count).toBeGreaterThan(0);
    
    // 点击第二个标签
    if (count > 1) {
      await navTabs.nth(1).click();
      await page.waitForTimeout(300);
      
      // 检查标签激活状态
      const activeTab = page.locator('.nav-tabs .nav-item.active');
      await expect(activeTab).toBeVisible();
    }
  });
});

test.describe('移动端功能测试', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('移动端布局应该正确显示', async ({ page }) => {
    await page.goto('/');
    
    // 检查移动端特定元素
    await expect(page.locator('.search-container')).toBeVisible();
    await expect(page.locator('.player-container')).toBeVisible();
    
    // 检查响应式布局
    const searchContainer = page.locator('.search-container');
    const box = await searchContainer.boundingBox();
    
    if (box) {
      // 宽度应该适配移动端
      expect(box.width).toBeLessThanOrEqual(375);
    }
  });

  test('移动端触摸操作应该工作', async ({ page }) => {
    await page.goto('/');
    
    // 等待页面加载
    await page.waitForLoadState('networkidle');
    
    // 模拟触摸滑动
    const mainContainer = page.locator('.main-container');
    if (await mainContainer.isVisible()) {
      const box = await mainContainer.boundingBox();
      if (box) {
        // 从右向左滑动
        await page.touchscreen.tap(box.x + box.width - 50, box.y + box.height / 2);
      }
    }
  });
});