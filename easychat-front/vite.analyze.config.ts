import { defineConfig } from 'vite'
import { resolve } from 'path'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  resolve: {
    alias: {
      '@renderer': resolve('src/renderer/src'),
      '@main': resolve('src/main'),
      '@preload': resolve('src/preload'),
      '@types': resolve('src/types'),
      '@utils': resolve('src/utils'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'src/renderer/index.html'),
        login: resolve(__dirname, 'src/renderer/login.html'),
        setting: resolve(__dirname, 'src/renderer/setting.html'),
        alert: resolve(__dirname, 'src/renderer/alert.html'),
        updateTip: resolve(__dirname, 'src/renderer/updateTip.html'),
        loading: resolve(__dirname, 'src/renderer/loading.html'),
        launcher: resolve(__dirname, 'src/renderer/launcher.html'),
      },
    },
  },
})