import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Vercel Serverless Functions - 音频流代理
 * 支持Range请求和流式传输
 */

// 允许的音频源域名
const ALLOWED_AUDIO_DOMAINS = [
  'music.163.com',
  'm7.music.126.net',
  'm8.music.126.net',
  'm701.music.126.net',
  'm801.music.126.net',
  'y.qq.com',
  'dl.stream.qqmusic.qq.com',
  'isure.stream.qqmusic.qq.com',
  'ws.stream.qqmusic.qq.com',
  'kuwo.cn',
  'sycdn.kuwo.cn',
  'other.web.nf01.sycdn.kuwo.cn',
  'kugou.com',
  'webfs.tx.kugou.com',
  'migu.cn',
  'freetyst.nf.migu.cn',
];

function isAllowedAudioUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return ALLOWED_AUDIO_DOMAINS.some((domain) => urlObj.hostname.endsWith(domain));
  } catch {
    return false;
  }
}

function setCorsHeaders(res: VercelResponse, origin: string): void {
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Range');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Type, Accept-Ranges');
  res.setHeader('Access-Control-Max-Age', '86400');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = (req.headers.origin as string) || '*';

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res, origin);
    return res.status(204).end();
  }

  const targetUrl = req.query.url as string;

  if (!targetUrl) {
    setCorsHeaders(res, origin);
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  if (!isAllowedAudioUrl(targetUrl)) {
    setCorsHeaders(res, origin);
    return res.status(403).json({ error: 'Audio domain not allowed' });
  }

  try {
    const proxyHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };

    // 处理Range请求
    const rangeHeader = req.headers.range;
    if (rangeHeader) {
      proxyHeaders['Range'] = rangeHeader;
    }

    const targetUrlObj = new URL(targetUrl);
    proxyHeaders['Referer'] = targetUrlObj.origin;

    const response = await fetch(targetUrl, {
      method: req.method || 'GET',
      headers: proxyHeaders,
      redirect: 'follow',
    });

    // 设置CORS头
    setCorsHeaders(res, origin);

    // 音频相关响应头
    const audioHeaders = [
      'content-type',
      'content-length',
      'content-range',
      'accept-ranges',
      'cache-control',
    ];

    audioHeaders.forEach((header) => {
      const value = response.headers.get(header);
      if (value) res.setHeader(header, value);
    });

    // 确保有正确的Content-Type
    if (!response.headers.get('content-type')) {
      res.setHeader('Content-Type', 'audio/mpeg');
    }

    // 确保支持Range请求
    if (!response.headers.get('accept-ranges')) {
      res.setHeader('Accept-Ranges', 'bytes');
    }

    res.status(response.status);

    const buffer = Buffer.from(await response.arrayBuffer());
    return res.send(buffer);
  } catch (error) {
    console.error('Audio proxy error:', error);
    setCorsHeaders(res, origin);
    return res.status(500).json({
      error: 'Audio proxy failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
