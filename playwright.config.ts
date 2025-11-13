import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E测试配置
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',

  /* 并行运行测试 */
  fullyParallel: true,

  /* CI环境下失败重试 */
  retries: process.env.CI ? 2 : 0,

  /* CI环境下禁用并行 */
  workers: process.env.CI ? 1 : undefined,

  /* 测试报告配置 */
  reporter: [['html', { open: 'never' }], ['list']],

  /* 全局配置 */
  use: {
    /* 基础URL */
    baseURL: 'http://localhost:5173',

    /* 失败时截图 */
    screenshot: 'only-on-failure',

    /* 失败时录制视频 */
    video: 'retain-on-failure',

    /* 追踪配置 */
    trace: 'on-first-retry',
  },

  /* 配置测试项目 */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* 移动端测试 */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  /* 在测试前启动开发服务器 */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
