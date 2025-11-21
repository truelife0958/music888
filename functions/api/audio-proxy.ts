/**
 * Cloudflare Pages Functions - 音频流代理
 * 专门处理音频文件的代理，支持Range请求和流式传输
 */

interface Env {}

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

function corsHeaders(origin: string): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept, Range',
    'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Content-Type, Accept-Ranges',
    'Access-Control-Max-Age': '86400',
  };
}

function handleOptions(request: Request): Response {
  const origin = request.headers.get('Origin') || '*';
  return new Response(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}

async function handleAudioProxy(request: Request): Promise<Response> {
  const origin = request.headers.get('Origin') || '*';
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('url');

  if (!targetUrl) {
    return new Response(
      JSON.stringify({ error: 'Missing url parameter' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      }
    );
  }

  if (!isAllowedAudioUrl(targetUrl)) {
    return new Response(
      JSON.stringify({ error: 'Audio domain not allowed' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      }
    );
  }

  try {
    const proxyHeaders = new Headers();

    // 处理Range请求（音频seek功能必需）
    const rangeHeader = request.headers.get('Range');
    if (rangeHeader) {
      proxyHeaders.set('Range', rangeHeader);
    }

    proxyHeaders.set(
      'User-Agent',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    const targetUrlObj = new URL(targetUrl);
    proxyHeaders.set('Referer', targetUrlObj.origin);

    const response = await fetch(targetUrl, {
      method: request.method,
      headers: proxyHeaders,
      redirect: 'follow',
    });

    const responseHeaders = new Headers(corsHeaders(origin));

    // 音频相关响应头
    const audioHeaders = [
      'Content-Type',
      'Content-Length',
      'Content-Range',
      'Accept-Ranges',
      'Cache-Control',
      'Content-Disposition',
    ];

    audioHeaders.forEach((header) => {
      const value = response.headers.get(header);
      if (value) responseHeaders.set(header, value);
    });

    // 确保有正确的Content-Type
    if (!responseHeaders.has('Content-Type')) {
      responseHeaders.set('Content-Type', 'audio/mpeg');
    }

    // 确保支持Range请求
    if (!responseHeaders.has('Accept-Ranges')) {
      responseHeaders.set('Accept-Ranges', 'bytes');
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Audio proxy error:', error);
    return new Response(
      JSON.stringify({
        error: 'Audio proxy failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      }
    );
  }
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const request = context.request;

  if (request.method === 'OPTIONS') {
    return handleOptions(request);
  }

  return handleAudioProxy(request);
};
