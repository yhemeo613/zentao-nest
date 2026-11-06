import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // vendor 分包（docs/05 §11 性能预算：重库独立 chunk，业务代码改动不失效大缓存）
        manualChunks: {
          vendor: ['vue', 'vue-router', 'pinia', 'axios', '@tanstack/vue-query'],
          element: ['element-plus', '@element-plus/icons-vue'],
          echarts: ['echarts'],
          editor: ['md-editor-v3'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // 开发代理：/api → 后端 server；/ws → Socket.IO（docs/05 §11）
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/ws': { target: 'http://localhost:3000', ws: true },
    },
  },
});
