import { afterEach } from 'vitest';

// 每个测试后清理
afterEach(() => {
  // 清理 localStorage
  localStorage.clear();
});