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
