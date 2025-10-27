import { defineConfig } from 'vite';

// Vite 配置 - 本地开发环境优化
export default defineConfig({
  // 开发服务器配置
  server: {
    port: 5173,
    open: false, // 不自动打开浏览器
    // 本地开发时的API代理配置
    proxy: {
      // 将 /api/music-proxy 代理到外部API
      '/api/music-proxy': {
        target: 'https://music-api.gdstudio.xyz',
        changeOrigin: true,
        rewrite: (path) => {
          // 将 /api/music-proxy 替换为 /api.php
          const newPath = path.replace(/^\/api\/music-proxy/, '/api.php');
          console.log(`🔄 代理重写: ${path} -> ${newPath}`);
          return newPath;
        },
        configure: (proxy, options) => {
          console.log('🔧 本地开发代理已配置: /api/music-proxy -> https://music-api.gdstudio.xyz/api.php');
        }
      },
      // Bilibili音���代理 - 用于绕过CORS限制
      '/api/bilibili-proxy': {
        target: 'https://upos-sz-mirror08h.bilivideo.com', // 必须设置默认target
        changeOrigin: true,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // 从查询参数中获取目标URL
            const url = new URL(req.url, 'http://localhost');
            const targetUrl = url.searchParams.get('url');

            if (targetUrl) {
              console.log(`🎵 Bilibili代理: ${targetUrl}`);

              // 设置目标
              const targetParsed = new URL(targetUrl);
              proxyReq.path = targetParsed.pathname + targetParsed.search;
              proxyReq.setHeader('Host', targetParsed.host);

              // 设置Bilibili需要的请求头
              proxyReq.setHeader('Referer', 'https://www.bilibili.com/');
              proxyReq.setHeader('Origin', 'https://www.bilibili.com');
              proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            }
          });

          console.log('🔧 Bilibili代理已配置: /api/bilibili-proxy');
        },
        // 使用router动态设置target
        router: (req) => {
          const url = new URL(req.url, 'http://localhost');
          const targetUrl = url.searchParams.get('url');
          if (targetUrl) {
            const targetParsed = new URL(targetUrl);
            return `${targetParsed.protocol}//${targetParsed.host}`;
          }
          return 'https://upos-sz-mirror08h.bilivideo.com'; // 默认Bilibili CDN
        }
      }
    }
  },

  // 构建配置
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild' // 使用esbuild压缩（默认）
  },

  // 优化依赖预构建
  optimizeDeps: {
    include: []
  }
});
