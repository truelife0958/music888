import { defineConfig } from 'vite';

// 优化版 Vite 配置 - 代码分割 + Tree Shaking + 性能优化
export default defineConfig({
  server: {
    port: 5173,
    open: false,
    proxy: {
      // API代理到GDStudio
      '/api/gdstudio-proxy': {
        target: 'https://api.gdstudio.xyz',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/gdstudio-proxy/, ''),
      },
      // 音乐代理
      '/api/music-proxy': {
        target: 'https://api.gdstudio.xyz',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/music-proxy/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild',

    // 优化: 代码分割配置 - 增强版（从4个chunk增加到7个）
    rollupOptions: {
      output: {
        // 手动分割代码块 - 按功能模块细分
        manualChunks: {
          // 1. 核心播放器（最重要，单独分离）
          'player-core': ['./js/player.ts', './js/player-helpers.ts'],

          // 2. API层（独立分离，便于缓存）
          api: ['./js/api.ts', './js/extra-api-adapter.ts', './js/proxy-handler.ts'],

          // 3. UI和主题（视觉相关）
          'ui-theme': ['./js/ui.ts', './js/theme-manager.ts'],

          // 4. 工具函数（通用工具）
          utils: ['./js/utils.ts', './js/input-validator.ts', './js/config.ts'],

          // 5. 歌词和展示（媒体相关）
          'lyrics-display': [
            './js/lyrics-worker-manager.ts',
            './js/virtual-scroll.ts',
            './js/image-lazy-load.ts',
          ],

          // 6. 存储和统计（数据层）
          'storage-stats': [
            './js/storage-adapter.ts',
            './js/storage-utils.ts',
            './js/indexed-db.ts',
            './js/play-stats.ts',
            './js/search-history.ts',
          ],

          // 7. 发现功能（按需加载的模块）
          'discover-features': ['./js/artist.ts', './js/playlist.ts', './js/daily-recommend.ts'],
        },
        // 优化: 资源文件命名
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },

    // 优化: chunk大小警告阈值
    chunkSizeWarningLimit: 500,

    // 优化: 启用CSS代码分割
    cssCodeSplit: true,

    // 优化: 资源内联阈值 (小于4KB的资源会被内联为base64)
    assetsInlineLimit: 4096,

    // 优化: 启用压缩
    reportCompressedSize: true,

    // 优化: esbuild优化选项
    target: 'es2015',

    // 优化: 清理输出目录
    emptyOutDir: true,
  },

  // 优化: 依赖预构建
  optimizeDeps: {
    include: [],
    exclude: [],
  },

  // 优化: esbuild配置
  esbuild: {
    // 压缩标识符
    minifyIdentifiers: true,
    // 压缩语法
    minifySyntax: true,
    // 压缩空白
    minifyWhitespace: true,
    // 生产环境移除console (通过build命令设置mode来控制)
    pure: ['console.log', 'console.debug', 'console.info'],
  },
});
