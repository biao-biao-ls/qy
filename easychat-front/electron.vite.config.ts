import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

const isDev = process.env.NODE_ENV === 'development'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    define: {
      'process.env.ENV_NAME': JSON.stringify(process.env.ENV_NAME),
      'process.env.LOGIN_URL': JSON.stringify(process.env.LOGIN_URL),
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    },
    build: {
      // 生产环境构建优化
      minify: !isDev,
      sourcemap: isDev ? 'inline' : 'hidden',
      target: 'node18',
      rollupOptions: {
        external: ['fsevents', 'osx-temperature-sensor', 'utf-8-validate', 'bufferutil', 'ws'],
        output: {
          // 优化输出格式
          format: 'cjs',
          entryFileNames: '[name].js',
          chunkFileNames: 'chunks/[name]-[hash].js',
        },
      },
      // 构建性能优化
      reportCompressedSize: false,
      chunkSizeWarningLimit: 1000,
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      minify: !isDev,
      sourcemap: isDev ? 'inline' : 'hidden',
      target: 'node18',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts'),
          browser: resolve(__dirname, 'src/preload/browser.ts'),
          frame: resolve(__dirname, 'src/preload/frame.ts'),
          view: resolve(__dirname, 'src/preload/view.ts'),
        },
        external: ['fsevents', 'osx-temperature-sensor', 'utf-8-validate', 'bufferutil', 'ws'],
        output: {
          format: 'cjs',
          entryFileNames: '[name].js',
        },
      },
      reportCompressedSize: false,
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
    plugins: [
      react({
        // React 优化配置
        babel: {
          plugins: isDev ? [] : [
            // 生产环境移除 console.log
            ['transform-remove-console', { exclude: ['error', 'warn'] }],
          ],
        },
      }),
    ],
    build: {
      // 生产环境构建优化
      minify: !isDev ? 'terser' : false,
      sourcemap: isDev ? true : 'hidden',
      target: 'chrome120',
      
      // 代码分割和优化
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
        output: {
          // 资源文件命名优化
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/chunks/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name?.split('.') || []
            const ext = info[info.length - 1]
            
            // 根据文件类型分类存放
            if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name || '')) {
              return `assets/images/[name]-[hash].${ext}`
            }
            if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name || '')) {
              return `assets/fonts/[name]-[hash].${ext}`
            }
            if (/\.css$/i.test(assetInfo.name || '')) {
              return `assets/css/[name]-[hash].${ext}`
            }
            return `assets/[name]-[hash].${ext}`
          },
          
          // 代码分割优化
          manualChunks: (id) => {
            // 将 node_modules 中的依赖分离到 vendor chunk
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom')) {
                return 'react-vendor'
              }
              if (id.includes('electron')) {
                return 'electron-vendor'
              }
              return 'vendor'
            }
            
            // 将共享组件分离到单独的 chunk
            if (id.includes('src/renderer/src/components')) {
              return 'components'
            }
            
            // 将工具函数分离到单独的 chunk
            if (id.includes('src/renderer/src/utils') || id.includes('src/utils')) {
              return 'utils'
            }
            
            // 默认返回 undefined，让 Vite 自动处理
            return undefined
          },
        },
      },
      
      // 构建性能优化
      reportCompressedSize: false,
      chunkSizeWarningLimit: 1000,
      
      // Terser 压缩配置（生产环境）
      terserOptions: isDev ? undefined : {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log'],
        },
        mangle: {
          safari10: true,
        },
        format: {
          comments: false,
        },
      },
    },
    
    // CSS 配置优化
    css: {
      devSourcemap: isDev,
    },
    
    // 静态资源配置
    assetsInclude: [
      '**/*.ico',
      '**/*.png',
      '**/*.jpg',
      '**/*.jpeg',
      '**/*.svg',
      '**/*.eot',
      '**/*.woff',
      '**/*.woff2',
      '**/*.ttf',
      '**/*.otf',
    ],
    
    // 开发服务器配置
    server: {
      port: 5173,
      strictPort: true,
      hmr: {
        port: 5174,
      },
    },
    
    // 预构建优化
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react/jsx-runtime',
      ],
      exclude: [
        'electron',
      ],
    },
  },
})
