/**
 * Provider模块导出
 *
 * 老王集成：统一导出所有Provider相关类和实例
 */

// 导出基类和接口
export { BaseProvider } from './base-provider.js';
export type { ProviderConfig, SearchResult, PlayUrlResult, LyricResult } from './base-provider.js';

// 导出Provider实现
export { NeteaseProvider } from './netease-provider.js';
export { QQProvider } from './qq-provider.js';
export { BilibiliProvider } from './bilibili-provider.js';
export { KugouProvider } from './kugou-provider.js';
export { KuwoProvider } from './kuwo-provider.js';

// 导出Provider Manager（单例）
export { providerManager } from './provider-manager.js';
