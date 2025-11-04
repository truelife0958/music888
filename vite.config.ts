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
        rewrite: (path) => path.replace(/^\/api\/gdstudio-proxy/, '')
      },
      // 音乐代理
      '/api/music-proxy': {
        target: 'https://api.gdstudio.xyz',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/music-proxy/, '')
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild',
    
    // 优化: 代码分割配置
    rollupOptions: {
      output: {
        // 手动分割代码块
        manualChunks: {
          // 核心播放器代码
          'player': ['./js/player.ts'],
          // API和工具函数
          'api-utils': ['./js/api.ts', './js/utils.ts'],
          // UI相关
          'ui': ['./js/ui.ts'],
          // 功能模块
          'features': [
            './js/rank.ts',
            './js/daily-recommend.ts',
            './js/search-history.ts',
            './js/play-stats.ts',
            './js/artist-radio.ts'
          ]
        },
        // 优化: 资源文件命名
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
      }
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
    emptyOutDir: true
  },
  
  // 优化: 依赖预构建
  optimizeDeps: {
    include: [],
    exclude: []
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
    pure: ['console.log', 'console.debug', 'console.info']
  }
});
