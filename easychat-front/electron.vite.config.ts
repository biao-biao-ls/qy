import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    define: {
      'process.env.ENV_NAME': JSON.stringify(process.env.ENV_NAME),
      'process.env.LOGIN_URL': JSON.stringify(process.env.LOGIN_URL),
    },
    build: {
      rollupOptions: {
        external: ['fsevents', 'osx-temperature-sensor', 'utf-8-validate', 'bufferutil', 'ws'],
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts'),
          browser: resolve(__dirname, 'src/preload/browser.ts'),
          frame: resolve(__dirname, 'src/preload/frame.ts'),
          view: resolve(__dirname, 'src/preload/view.ts'),
        },
        external: ['fsevents', 'osx-temperature-sensor', 'utf-8-validate', 'bufferutil', 'ws'],
      },
    },
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@main': resolve('src/main'),
        '@preload': resolve('src/preload'),
        '@types': resolve('src/types'),
        '@utils': resolve('src/utils'),
      },
    },
    plugins: [react()],
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
    css: {
      devSourcemap: true,
    },
    assetsInclude: [
      '**/*.ico',
      '**/*.png',
      '**/*.jpg',
      '**/*.jpeg',
      '**/*.svg',
      '**/*.eot',
      '**/*.woff',
      '**/*.woff2',
    ],
  },
})
