/**
 * Cloudflare Pages Functions - 音乐API代理
 * 解决CORS跨域问题，所有第三方API请求都通过这个代理转发
 */

interface Env {}

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

// 检查URL是否在白名单中
function isAllowedUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return ALLOWED_DOMAINS.some((domain) => urlObj.hostname.endsWith(domain));
  } catch {
    return false;
  }
}

// 构建CORS响应头
function corsHeaders(origin: string): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept, Range',
    'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

// 处理OPTIONS预检请求
function handleOptions(request: Request): Response {
  const origin = request.headers.get('Origin') || '*';
  return new Response(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}

// 处理代理请求
async function handleProxy(request: Request): Promise<Response> {
  const origin = request.headers.get('Origin') || '*';
  const url = new URL(request.url);

  // 从查询参数获取目标URL
  const targetUrl = url.searchParams.get('url');

  if (!targetUrl) {
    return new Response(
      JSON.stringify({ error: 'Missing url parameter' }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(origin),
        },
      }
    );
  }

  // 安全检查：只允许白名单域名
  if (!isAllowedUrl(targetUrl)) {
    return new Response(
      JSON.stringify({ error: 'Domain not allowed', url: targetUrl }),
      {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(origin),
        },
      }
    );
  }

  try {
    // 构建代理请求头
    const proxyHeaders = new Headers();

    // 复制必要的请求头
    const headersToForward = ['Accept', 'Accept-Language', 'Range', 'Content-Type'];
    headersToForward.forEach((header) => {
      const value = request.headers.get(header);
      if (value) proxyHeaders.set(header, value);
    });

    // 设置User-Agent（模拟正常浏览器）
    proxyHeaders.set(
      'User-Agent',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // 设置Referer（某些API需要）
    const targetUrlObj = new URL(targetUrl);
    proxyHeaders.set('Referer', targetUrlObj.origin);

    // 发送代理请求
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: proxyHeaders,
      redirect: 'follow',
    });

    // 构建响应头
    const responseHeaders = new Headers(corsHeaders(origin));

    // 复制重要的响应头
    const responseHeadersToForward = [
      'Content-Type',
      'Content-Length',
      'Content-Range',
      'Accept-Ranges',
      'Cache-Control',
    ];
    responseHeadersToForward.forEach((header) => {
      const value = response.headers.get(header);
      if (value) responseHeaders.set(header, value);
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return new Response(
      JSON.stringify({
        error: 'Proxy request failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(origin),
        },
      }
    );
  }
}

// Cloudflare Pages Functions 入口
export const onRequest: PagesFunction<Env> = async (context) => {
  const request = context.request;

  // 处理预检请求
  if (request.method === 'OPTIONS') {
    return handleOptions(request);
  }

  // 处理代理请求
  return handleProxy(request);
};
