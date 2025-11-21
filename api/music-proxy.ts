import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Vercel Serverless Functions - 音乐API代理
 * 解决CORS跨域问题
 */

// 允许的目标域名白名单
const ALLOWED_DOMAINS = [
  'music.163.com',
  'music-api.gdstudio.xyz',
  'api-enhanced-three-indol.vercel.app',
  'api.injahow.cn',
  'y.qq.com',
  'c.y.qq.com',
  'u.y.qq.com',
  'api.bilibili.com',
  'kuwo.cn',
  'kugou.com',
  'migu.cn',
  'm.music.migu.cn',
];

function isAllowedUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return ALLOWED_DOMAINS.some((domain) => urlObj.hostname.endsWith(domain));
  } catch {
    return false;
  }
}

function setCorsHeaders(res: VercelResponse, origin: string): void {
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Range');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = (req.headers.origin as string) || '*';

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res, origin);
    return res.status(204).end();
  }

  // 获取目标URL
  const targetUrl = req.query.url as string;

  if (!targetUrl) {
    setCorsHeaders(res, origin);
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  // 安全检查
  if (!isAllowedUrl(targetUrl)) {
    setCorsHeaders(res, origin);
    return res.status(403).json({ error: 'Domain not allowed', url: targetUrl });
  }

  try {
    // 构建代理请求头
    const proxyHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };

    // 复制必要的请求头
    const headersToForward = ['accept', 'accept-language', 'range', 'content-type'];
    headersToForward.forEach((header) => {
      const value = req.headers[header];
      if (value) proxyHeaders[header] = value as string;
    });

    // 设置Referer
    const targetUrlObj = new URL(targetUrl);
    proxyHeaders['Referer'] = targetUrlObj.origin;

    // 发送代理请求
    const response = await fetch(targetUrl, {
      method: req.method || 'GET',
      headers: proxyHeaders,
      redirect: 'follow',
    });

    // 设置CORS头
    setCorsHeaders(res, origin);

    // 复制响应头
    const responseHeadersToForward = [
      'content-type',
      'content-length',
      'content-range',
      'accept-ranges',
      'cache-control',
    ];
    responseHeadersToForward.forEach((header) => {
      const value = response.headers.get(header);
      if (value) res.setHeader(header, value);
    });

    // 返回响应
    res.status(response.status);

    // 处理响应体
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      return res.json(data);
    } else {
      const buffer = Buffer.from(await response.arrayBuffer());
      return res.send(buffer);
    }
  } catch (error) {
    console.error('Proxy error:', error);
    setCorsHeaders(res, origin);
    return res.status(500).json({
      error: 'Proxy request failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
