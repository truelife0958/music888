/**
 * BUG-006修复: 统一的跨域代理处理模块
 * 集中管理所有需要代理的请求，确保跨域处理一致性
 */

import { PROXY_CONFIG, API_CONFIG } from './config.js';

/**
 * 判断URL是否需要使用代理
 */
export function needsProxy(url: string, source?: string): boolean {
    if (!url) return false;
    
    try {
        const urlObj = new URL(url);
        
        // 检查是否是需要代理的源
        if (source && API_CONFIG.PROXY_SOURCES.includes(source as any)) {
            return true;
        }
        
        // 检查是否是允许的域名但使用HTTP（需要升级到HTTPS或代理）
        if (urlObj.protocol === 'http:') {
            const hostname = urlObj.hostname;
            const needsProxyDomain = PROXY_CONFIG.ALLOWED_DOMAINS.some(domain => 
                hostname.includes(domain)
            );
            
            if (needsProxyDomain) {
                return true;
            }
        }
        
        return false;
    } catch (error) {
        console.error('解析URL失败:', url, error);
        return false;
    }
}

/**
 * 将URL转换为代理URL
 */
export function getProxiedUrl(url: string, source?: string): string {
    if (!url) return url;
    
    // 不需要代理，直接返回
    if (!needsProxy(url, source)) {
        // BUG-006修复: 自动将HTTP升级为HTTPS（如果配置允许）
        if (PROXY_CONFIG.AUTO_HTTPS && url.startsWith('http://')) {
            return url.replace(/^http:/, 'https:');
        }
        return url;
    }
    
    // 根据源选择合适的代理
    if (source === 'bilibili') {
        return `${PROXY_CONFIG.BILIBILI_PROXY}?url=${encodeURIComponent(url)}`;
    }
    
    // 通用音频代理
    return `${PROXY_CONFIG.AUDIO_PROXY}?url=${encodeURIComponent(url)}`;
}

/**
 * 处理fetch请求，自动应用代理
 */
export async function proxyFetch(
    url: string, 
    options?: RequestInit,
    source?: string
): Promise<Response> {
    const proxiedUrl = getProxiedUrl(url, source);
    
    console.log('🌐 代理请求:', {
        original: url,
        proxied: proxiedUrl,
        source,
        needsProxy: url !== proxiedUrl
    });
    
    return fetch(proxiedUrl, options);
}

/**
 * 批量处理URL列表
 */
export function batchProxyUrls(urls: string[], source?: string): string[] {
    return urls.map(url => getProxiedUrl(url, source));
}

/**
 * 验证URL是否安全（防止SSRF攻击）
 */
export function isUrlSafe(url: string): boolean {
    try {
        const urlObj = new URL(url);
        
        // 只允许HTTP和HTTPS协议
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
            console.warn('不安全的协议:', urlObj.protocol);
            return false;
        }
        
        // 检查是否是内网地址
        const hostname = urlObj.hostname;
        const privateRanges = [
            /^localhost$/i,
            /^127\.\d+\.\d+\.\d+$/,
            /^10\.\d+\.\d+\.\d+$/,
            /^172\.(1[6-9]|2[0-9]|3[01])\.\d+\.\d+$/,
            /^192\.168\.\d+\.\d+$/,
            /^::1$/,
            /^fe80:/i
        ];
        
        for (const pattern of privateRanges) {
            if (pattern.test(hostname)) {
                console.warn('检测到内网地址:', hostname);
                return false;
            }
        }
        
        return true;
    } catch (error) {
        console.error('URL验证失败:', url, error);
        return false;
    }
}

/**
 * 获取代理状态信息（用于调试）
 */
export function getProxyStatus(): {
    enabled: boolean;
    proxySources: readonly string[];
    allowedDomains: readonly string[];
    autoHttps: boolean;
} {
    return {
        enabled: API_CONFIG.USE_PROXY,
        proxySources: API_CONFIG.PROXY_SOURCES,
        allowedDomains: PROXY_CONFIG.ALLOWED_DOMAINS,
        autoHttps: PROXY_CONFIG.AUTO_HTTPS
    };
}