/**
 * Provider模块导出
 *
 * 老王集成：统一导出所有Provider相关类和实例
 */

export { BaseProvider, ProviderError } from './base-provider';
export type { MusicProvider, ProviderConfig } from './base-provider';

// 原有Provider
export { NeteaseProvider } from './netease-provider';
export { QQMusicProvider } from './qq-provider';
export { KugouProvider } from './kugou-provider';

// 老王扩展：新增Provider
export { MiguProvider } from './migu-provider';
export { KuwoProvider } from './kuwo-provider';
export { BilibiliProvider } from './bilibili-provider';
export { QianqianProvider } from './qianqian-provider';

export { ProviderManager, providerManager } from './provider-manager';
export type { ProviderManagerConfig } from './provider-manager';
