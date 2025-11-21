/**
 * 老王修复CORS问题: 统一的跨域代理处理模块
 * 所有第三方API请求都通过Cloudflare Pages Functions代理
 */

import { PROXY_CONFIG, API_CONFIG } from './config.js';

/**
 * 判断URL是否需要使用代理
 */
export function needsProxy(url: string, source?: string): boolean {
  if (!url) return false;
  if (!API_CONFIG.USE_PROXY) return false;

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    // 检查是否是需要代理的域名
    const needsProxyDomain = (API_CONFIG.PROXY_SOURCES as readonly string[]).some((domain) =>
      hostname.includes(domain)
    ) || PROXY_CONFIG.ALLOWED_DOMAINS.some((domain) =>
      hostname.includes(domain)
    );

    return needsProxyDomain;
  } catch (error) {
    console.error('解析URL失败:', url, error);
    return false;
  }
}

/**
 * 判断URL是否是音频URL（用于选择正确的代理）
 */
function isAudioUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();

    // 常见音频文件扩展名
    const audioExtensions = ['.mp3', '.m4a', '.flac', '.wav', '.ogg', '.aac', '.wma'];
    if (audioExtensions.some(ext => pathname.includes(ext))) {
      return true;
    }

    // 网易云音乐外链URL
    if (urlObj.hostname.includes('music.163.com') && pathname.includes('/song/media/outer/url')) {
      return true;
    }

    // 音频CDN域名
    const audioCdnDomains = [
      'm7.music.126.net',
      'm8.music.126.net',
      'm701.music.126.net',
      'm801.music.126.net',
      'dl.stream.qqmusic.qq.com',
      'isure.stream.qqmusic.qq.com',
      'ws.stream.qqmusic.qq.com',
      'sycdn.kuwo.cn',
      'webfs.tx.kugou.com',
      'freetyst.nf.migu.cn',
    ];

    if (audioCdnDomains.some(domain => urlObj.hostname.includes(domain))) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * 将URL转换为代理URL
 */
export function getProxiedUrl(url: string, source?: string): string {
  if (!url) return url;

  // 不需要代理，直接返回（可能升级HTTPS）
  if (!needsProxy(url, source)) {
    if (PROXY_CONFIG.AUTO_HTTPS && url.startsWith('http://')) {
      return url.replace(/^http:/, 'https:');
    }
    return url;
  }

  // 根据URL类型选择正确的代理
  if (source === 'bilibili') {
    return `${PROXY_CONFIG.BILIBILI_PROXY}?url=${encodeURIComponent(url)}`;
  }

  // 音频URL使用专用音频代理
  if (isAudioUrl(url)) {
    return `${PROXY_CONFIG.AUDIO_PROXY}?url=${encodeURIComponent(url)}`;
  }

  // API请求使用音乐API代理
  return `${PROXY_CONFIG.MUSIC_API_PROXY}?url=${encodeURIComponent(url)}`;
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
  const isProxied = url !== proxiedUrl;

  if (isProxied) {
    console.log('🌐 [代理请求]', {
      original: url,
      proxied: proxiedUrl,
      source,
    });
  }

  return fetch(proxiedUrl, options);
}

/**
 * 批量处理URL列表
 */
export function batchProxyUrls(urls: string[], source?: string): string[] {
  return urls.map((url) => getProxiedUrl(url, source));
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
      /^fe80:/i,
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
  proxyPaths: {
    music: string;
    audio: string;
    bilibili: string;
  };
} {
  return {
    enabled: API_CONFIG.USE_PROXY,
    proxySources: API_CONFIG.PROXY_SOURCES,
    allowedDomains: PROXY_CONFIG.ALLOWED_DOMAINS,
    autoHttps: PROXY_CONFIG.AUTO_HTTPS,
    proxyPaths: {
      music: PROXY_CONFIG.MUSIC_API_PROXY,
      audio: PROXY_CONFIG.AUDIO_PROXY,
      bilibili: PROXY_CONFIG.BILIBILI_PROXY,
    },
  };
}
