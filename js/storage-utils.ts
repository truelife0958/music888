// js/storage-utils.ts - 统一的 localStorage 错误处理工具

import { showNotification } from './ui';

/**
 * 安全的 localStorage 保存函数
 * 自动处理配额超限、数据清理等问题
 */
export function safeSetItem(
  key: string,
  value: any,
  options?: {
    onQuotaExceeded?: () => void;
    maxRetries?: number;
  }
): boolean {
  const maxRetries = options?.maxRetries || 3;
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      const jsonString = JSON.stringify(value);
      localStorage.setItem(key, jsonString);
      return true;
    } catch (error: any) {
      attempts++;

      if (error.name === 'QuotaExceededError' || error.code === 22) {
        console.warn(`localStorage 配额超限 (尝试 ${attempts}/${maxRetries})`);

        if (attempts < maxRetries) {
          // 尝试清理策略
          if (!tryCleanupStorage(key)) {
            break; // 清理失败，停止重试
          }
        } else {
          // 最后一次尝试失败
          if (options?.onQuotaExceeded) {
            options.onQuotaExceeded();
          } else {
            showNotification('存储空间不足，部分数据未保存', 'warning');
          }
          return false;
        }
      } else {
        console.error('localStorage 保存失败:', error);
        return false;
      }
    }
  }

  return false;
}

/**
 * 安全的 localStorage 读取函数
 * 自动处理 JSON 解析错误
 */
export function safeGetItem<T = any>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (item === null) {
      return defaultValue;
    }
    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`读取 localStorage 键 "${key}" 失败:`, error);
    return defaultValue;
  }
}

/**
 * 安全的 localStorage 删除函数
 */
export function safeRemoveItem(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`删除 localStorage 键 "${key}" 失败:`, error);
    return false;
  }
}

/**
 * 修复BUG-002: 渐进式清理存储空间策略
 * 使用多级清理策略，避免一次性删除过多数据
 */
function tryCleanupStorage(currentKey: string): boolean {
  console.log('🧹 开始渐进式清理 localStorage...');

  // 第一阶段：清理明确的临时和缓存数据
  const cleanupPriority = [
    { pattern: /^temp_/, desc: '临时数据' },
    { pattern: /^cache_/, desc: '缓存数据' },
    { pattern: /^old_/, desc: '旧版本数据' },
    { pattern: /^expire_/, desc: '过期数据' },
  ];

  // 按优先级清理
  for (const { pattern, desc } of cleanupPriority) {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key !== currentKey && pattern.test(key)) {
        keysToRemove.push(key);
      }
    }

    if (keysToRemove.length > 0) {
      console.log(`清理 ${desc}: ${keysToRemove.length} 项`);
      keysToRemove.forEach((key) => localStorage.removeItem(key));
      return true;
    }
  }

  // 第二阶段：渐进式清理播放历史（保留重要数据）
  const progressiveResult = progressiveCleanupHistory(currentKey);
  if (progressiveResult) {
    return true;
  }

  // 第三阶段：尝试压缩最大的项
  return compressLargestItem(currentKey);
}

/**
 * 修复BUG-002: 渐进式清理播放历史
 * 优先保留收藏和最近的历史记录
 */
function progressiveCleanupHistory(excludeKey: string): boolean {
  const historyKey = 'playHistory';

  if (historyKey === excludeKey) {
    return false; // 不清理正在写入的键
  }

  try {
    const historyData = localStorage.getItem(historyKey);
    if (!historyData) return false;

    const history = JSON.parse(historyData);
    if (!Array.isArray(history) || history.length === 0) return false;

    // 渐进式清理策略：删除10% -> 30% -> 50% -> 70%
    const strategies = [
      { ratio: 0.9, desc: '删除10%最旧记录' },
      { ratio: 0.7, desc: '删除30%最旧记录' },
      { ratio: 0.5, desc: '删除50%最旧记录' },
      { ratio: 0.3, desc: '删除70%最旧记录' },
    ];

    for (const strategy of strategies) {
      const keepCount = Math.floor(history.length * strategy.ratio);
      const reducedHistory = history.slice(0, keepCount);

      try {
        localStorage.setItem(historyKey, JSON.stringify(reducedHistory));
        console.log(`✅ ${strategy.desc}，保留 ${keepCount}/${history.length} 条记录`);
        return true;
      } catch (error) {
        // 如果这个策略也失败，尝试更激进的策略
        continue;
      }
    }

    return false;
  } catch (error) {
    console.error('清理播放历史失败:', error);
    return false;
  }
}

/**
 * 压缩最大的存储项
 */
function compressLargestItem(excludeKey: string): boolean {
  let largestKey = '';
  let largestSize = 0;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key !== excludeKey) {
      const size = localStorage.getItem(key)?.length || 0;
      if (size > largestSize) {
        largestSize = size;
        largestKey = key;
      }
    }
  }

  if (largestKey) {
    console.log(`压缩最大项: ${largestKey} (${(largestSize / 1024).toFixed(2)} KB)`);
    try {
      const data = localStorage.getItem(largestKey);
      if (data) {
        const parsed = JSON.parse(data);
        // 如果是数组，只保留一半
        if (Array.isArray(parsed)) {
          const compressed = parsed.slice(0, Math.floor(parsed.length / 2));
          localStorage.setItem(largestKey, JSON.stringify(compressed));
          return true;
        }
      }
    } catch (error) {
      console.error('压缩失败:', error);
    }
  }

  return false;
}

/**
 * 获取 localStorage 使用情况
 */
export function getStorageInfo(): { used: number; available: number; percentage: number } {
  let used = 0;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const item = localStorage.getItem(key);
      used += (key.length + (item?.length || 0)) * 2; // 字符串在内存中占2字节
    }
  }

  // 大多数浏览器 localStorage 限制在 5-10MB
  const available = 5 * 1024 * 1024; // 假设 5MB
  const percentage = (used / available) * 100;

  return { used, available, percentage };
}

/**
 * 检查存储空间是否充足
 */
export function hasEnoughSpace(estimatedSize: number = 0): boolean {
  const info = getStorageInfo();
  return info.used + estimatedSize < info.available * 0.9; // 保留10%缓冲
}

/**
 * 清理所有过期数据
 */
export function cleanupExpiredData(): number {
  let cleanedCount = 0;
  const keysToRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('expire_')) {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          if (parsed.expireAt && Date.now() > parsed.expireAt) {
            keysToRemove.push(key);
          }
        }
      } catch (error) {
        // 解析失败也删除
        keysToRemove.push(key);
      }
    }
  }

  keysToRemove.forEach((key) => {
    localStorage.removeItem(key);
    cleanedCount++;
  });

  if (cleanedCount > 0) {
    console.log(`🧹 清理了 ${cleanedCount} 个过期项`);
  }

  return cleanedCount;
}

/**
 * 导出所有数据（用于备份）
 */
export function exportAllData(): string {
  const data: { [key: string]: any } = {};

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      try {
        const value = localStorage.getItem(key);
        data[key] = value ? JSON.parse(value) : null;
      } catch (error) {
        data[key] = localStorage.getItem(key); // 无法解析的保留原始字符串
      }
    }
  }

  return JSON.stringify(data, null, 2);
}

/**
 * 导入数据（用于恢复）
 */
export function importData(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);
    Object.entries(data).forEach(([key, value]) => {
      try {
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
      } catch (error) {
        console.error(`导入键 "${key}" 失败:`, error);
      }
    });
    return true;
  } catch (error) {
    console.error('导入数据失败:', error);
    return false;
  }
}
