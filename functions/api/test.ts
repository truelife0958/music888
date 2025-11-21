/**
 * Cloudflare Pages Functions - 测试端点
 * 用于验证 Functions 是否正确部署
 */

interface Env {}

export const onRequest: PagesFunction<Env> = async (context) => {
  const origin = context.request.headers.get('Origin') || '*';

  return new Response(
    JSON.stringify({
      success: true,
      message: '老王的代理函数运行正常！',
      timestamp: new Date().toISOString(),
      path: context.request.url,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
    }
  );
};
