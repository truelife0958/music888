/**
 * Provider模块导出
 *
 * 老王集成：Listen 1多平台架构完整版
 * 包含增强版Provider和智能音源切换系统
 * 现已整合Listen1 Chrome Extension的成熟架构
 */

// 导出基类和接口
export { BaseProvider } from './base-provider.js';
export type { ProviderConfig, SearchResult, PlayUrlResult, LyricResult } from './base-provider.js';

// 导出原版Provider（保留兼容性）
export { NeteaseProvider } from './netease-provider.js';
export { QQProvider } from './qq-provider.js';
export { BilibiliProvider } from './bilibili-provider.js';
export { KugouProvider } from './kugou-provider.js';
export { KuwoProvider } from './kuwo-provider.js';

// 导出增强版Provider（推荐使用）
export { NeteaseProviderEnhanced } from './netease-provider-enhanced.js';
export { QQProviderEnhanced } from './qq-provider-enhanced.js';
export { MiguProvider } from './migu-provider.js';

// 🔥 新增：Listen1 架构模块
export {
  Listen1BaseProvider,
  Listen1NeteaseProvider,
  Listen1Track,
  Listen1SearchResult,
  Listen1Playlist
} from './listen1-base-provider.js';

export { Listen1QQProvider } from './listen1-qq-provider.js';
export { Listen1ProviderAdapter } from './listen1-provider-adapter.js';
export { listen1MediaService, loWeb } from './listen1-media-service.js';

// 🔥 新增：统一Provider管理器 - 整合三种架构
export { unifiedProviderManager } from './unified-provider-manager.js';
export type { UnifiedSearchResult, UnifiedPlayUrlResult, UnifiedLyricResult } from './unified-provider-manager.js';

// 导出Provider Manager
export { providerManager } from './provider-manager.js';
export { providerManagerEnhanced, SwitchStrategy } from './provider-manager-enhanced.js';
export type { ProviderStatus } from './provider-manager-enhanced.js';

// 导出加密工具
export { NeteaseCrypto, CryptoUtils } from '../utils/crypto-utils.js';

// 默认使用统一管理器
export { unifiedProviderManager as default } from './unified-provider-manager.js';
