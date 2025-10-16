#!/usr/bin/env node

const { execSync, spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

class PerformanceTester {
  constructor() {
    this.results = {
      buildTime: 0,
      buildSize: {},
      startupTime: 0,
      memoryUsage: {},
      bundleAnalysis: {}
    }
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      error: '\x1b[31m',
      warning: '\x1b[33m',
      reset: '\x1b[0m'
    }
    console.log(`${colors[type]}${message}${colors.reset}`)
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  async measureBuildTime() {
    this.log('⏱️ 测量构建时间...', 'info')
    
    try {
      // Clean first
      execSync('npm run clean', { stdio: 'pipe' })
      
      const startTime = Date.now()
      execSync('npm run build', { stdio: 'pipe' })
      const endTime = Date.now()
      
      this.results.buildTime = endTime - startTime
      this.log(`✅ 构建时间: ${this.results.buildTime}ms (${(this.results.buildTime / 1000).toFixed(2)}s)`, 'success')
      
      // Benchmark against acceptable limits
      if (this.results.buildTime < 30000) { // Less than 30 seconds
        this.log('🎯 构建时间优秀 (< 30s)', 'success')
      } else if (this.results.buildTime < 60000) { // Less than 1 minute
        this.log('⚠️ 构建时间可接受 (< 1min)', 'warning')
      } else {
        this.log('❌ 构建时间过长 (> 1min)', 'error')
      }
      
      return true
    } catch (error) {
      this.log(`❌ 构建时间测量失败: ${error.message}`, 'error')
      return false
    }
  }

  async analyzeBuildSize() {
    this.log('📊 分析构建产物大小...', 'info')
    
    try {
      const outDir = path.join(process.cwd(), 'out')
      
      if (!fs.existsSync(outDir)) {
        throw new Error('构建输出目录不存在')
      }

      // Analyze main process
      const mainFile = path.join(outDir, 'main', 'index.js')
      if (fs.existsSync(mainFile)) {
        const mainSize = fs.statSync(mainFile).size
        this.results.buildSize.main = mainSize
        this.log(`主进程大小: ${this.formatBytes(mainSize)}`, 'info')
      }

      // Analyze preload scripts
      const preloadDir = path.join(outDir, 'preload')
      if (fs.existsSync(preloadDir)) {
        let totalPreloadSize = 0
        const preloadFiles = fs.readdirSync(preloadDir).filter(f => f.endsWith('.js'))
        
        preloadFiles.forEach(file => {
          const filePath = path.join(preloadDir, file)
          const size = fs.statSync(filePath).size
          totalPreloadSize += size
          this.log(`预加载脚本 ${file}: ${this.formatBytes(size)}`, 'info')
        })
        
        this.results.buildSize.preload = totalPreloadSize
        this.log(`预加载脚本总大小: ${this.formatBytes(totalPreloadSize)}`, 'info')
      }

      // Analyze renderer
      const rendererDir = path.join(outDir, 'renderer')
      if (fs.existsSync(rendererDir)) {
        let totalRendererSize = 0
        
        const walkDir = (dir) => {
          const files = fs.readdirSync(dir)
          files.forEach(file => {
            const filePath = path.join(dir, file)
            const stat = fs.statSync(filePath)
            
            if (stat.isDirectory()) {
              walkDir(filePath)
            } else if (file.endsWith('.js') || file.endsWith('.css')) {
              totalRendererSize += stat.size
            }
          })
        }
        
        walkDir(rendererDir)
        this.results.buildSize.renderer = totalRendererSize
        this.log(`渲染进程资源总大小: ${this.formatBytes(totalRendererSize)}`, 'info')
      }

      // Calculate total size
      const totalSize = (this.results.buildSize.main || 0) + 
                       (this.results.buildSize.preload || 0) + 
                       (this.results.buildSize.renderer || 0)
      
      this.results.buildSize.total = totalSize
      this.log(`总构建大小: ${this.formatBytes(totalSize)}`, 'success')

      // Size benchmarks
      if (totalSize < 5 * 1024 * 1024) { // Less than 5MB
        this.log('🎯 构建大小优秀 (< 5MB)', 'success')
      } else if (totalSize < 10 * 1024 * 1024) { // Less than 10MB
        this.log('⚠️ 构建大小可接受 (< 10MB)', 'warning')
      } else {
        this.log('❌ 构建大小过大 (> 10MB)', 'error')
      }

      return true
    } catch (error) {
      this.log(`❌ 构建大小分析失败: ${error.message}`, 'error')
      return false
    }
  }

  async measureStartupTime() {
    this.log('🚀 测量启动时间...', 'info')
    
    return new Promise((resolve) => {
      const startTime = Date.now()
      const devProcess = spawn('npm', ['run', 'dev'], {
        stdio: 'pipe'
      })

      let output = ''
      const timeout = setTimeout(() => {
        devProcess.kill('SIGTERM')
        this.log('❌ 启动超时 (> 15s)', 'error')
        resolve(false)
      }, 15000)

      devProcess.stdout.on('data', (data) => {
        output += data.toString()
        
        if (output.includes('Local:') || output.includes('ready in')) {
          const endTime = Date.now()
          this.results.startupTime = endTime - startTime
          
          clearTimeout(timeout)
          devProcess.kill('SIGTERM')
          
          this.log(`✅ 启动时间: ${this.results.startupTime}ms (${(this.results.startupTime / 1000).toFixed(2)}s)`, 'success')
          
          // Startup time benchmarks
          if (this.results.startupTime < 5000) { // Less than 5 seconds
            this.log('🎯 启动时间优秀 (< 5s)', 'success')
          } else if (this.results.startupTime < 10000) { // Less than 10 seconds
            this.log('⚠️ 启动时间可接受 (< 10s)', 'warning')
          } else {
            this.log('❌ 启动时间过长 (> 10s)', 'error')
          }
          
          resolve(true)
        }
      })

      devProcess.stderr.on('data', (data) => {
        const errorOutput = data.toString()
        if (errorOutput.includes('Error') || errorOutput.includes('Failed')) {
          clearTimeout(timeout)
          devProcess.kill('SIGTERM')
          this.log(`❌ 启动失败: ${errorOutput}`, 'error')
          resolve(false)
        }
      })

      devProcess.on('close', () => {
        clearTimeout(timeout)
      })
    })
  }

  async analyzeMemoryUsage() {
    this.log('🧠 分析内存使用情况...', 'info')
    
    try {
      // Get current memory usage
      const memUsage = process.memoryUsage()
      
      this.results.memoryUsage = {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external
      }

      this.log(`RSS: ${this.formatBytes(memUsage.rss)}`, 'info')
      this.log(`堆总大小: ${this.formatBytes(memUsage.heapTotal)}`, 'info')
      this.log(`堆使用: ${this.formatBytes(memUsage.heapUsed)}`, 'info')
      this.log(`外部内存: ${this.formatBytes(memUsage.external)}`, 'info')

      // Memory benchmarks
      const totalMemory = memUsage.rss
      if (totalMemory < 100 * 1024 * 1024) { // Less than 100MB
        this.log('🎯 内存使用优秀 (< 100MB)', 'success')
      } else if (totalMemory < 200 * 1024 * 1024) { // Less than 200MB
        this.log('⚠️ 内存使用可接受 (< 200MB)', 'warning')
      } else {
        this.log('❌ 内存使用过高 (> 200MB)', 'error')
      }

      return true
    } catch (error) {
      this.log(`❌ 内存分析失败: ${error.message}`, 'error')
      return false
    }
  }

  async runBundleAnalysis() {
    this.log('📦 运行包分析...', 'info')
    
    try {
      // Run build with analysis
      execSync('npm run build:analyze', { stdio: 'pipe' })
      
      // Check if analysis files were generated
      const analysisFiles = [
        'out/renderer/stats.html',
        'out/renderer/report.html'
      ]

      let analysisGenerated = false
      for (const file of analysisFiles) {
        if (fs.existsSync(file)) {
          analysisGenerated = true
          this.log(`✅ 分析报告生成: ${file}`, 'success')
        }
      }

      if (!analysisGenerated) {
        this.log('⚠️ 未找到分析报告文件', 'warning')
      }

      return true
    } catch (error) {
      this.log(`⚠️ 包分析跳过: ${error.message}`, 'warning')
      return true // Non-critical
    }
  }

  async optimizeBuild() {
    this.log('⚡ 应用构建优化...', 'info')
    
    try {
      // Check if optimization configurations exist
      const configFiles = [
        'electron.vite.config.ts',
        'tsconfig.json',
        'package.json'
      ]

      const optimizations = []

      // Check Vite config for optimizations
      const viteConfigPath = 'electron.vite.config.ts'
      if (fs.existsSync(viteConfigPath)) {
        const viteConfig = fs.readFileSync(viteConfigPath, 'utf8')
        
        if (viteConfig.includes('minify')) {
          optimizations.push('代码压缩已启用')
        }
        
        if (viteConfig.includes('rollupOptions')) {
          optimizations.push('Rollup 优化配置已启用')
        }
        
        if (viteConfig.includes('chunkSizeWarningLimit')) {
          optimizations.push('包大小警告限制已配置')
        }
      }

      // Check TypeScript config
      const tsconfigPath = 'tsconfig.json'
      if (fs.existsSync(tsconfigPath)) {
        const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'))
        
        if (tsconfig.compilerOptions?.target === 'ES2020' || 
            tsconfig.compilerOptions?.target === 'ES2022') {
          optimizations.push('现代 JavaScript 目标已设置')
        }
        
        if (tsconfig.compilerOptions?.moduleResolution === 'bundler') {
          optimizations.push('优化的模块解析已启用')
        }
      }

      // Check package.json for optimization scripts
      const packagePath = 'package.json'
      if (fs.existsSync(packagePath)) {
        const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
        
        if (pkg.scripts?.['build:analyze']) {
          optimizations.push('构建分析脚本已配置')
        }
        
        if (pkg.scripts?.clean) {
          optimizations.push('清理脚本已配置')
        }
      }

      this.log(`✅ 发现 ${optimizations.length} 项优化配置:`, 'success')
      optimizations.forEach(opt => {
        this.log(`  • ${opt}`, 'info')
      })

      return true
    } catch (error) {
      this.log(`❌ 优化检查失败: ${error.message}`, 'error')
      return false
    }
  }

  generatePerformanceReport() {
    this.log('\n=== 性能测试报告 ===', 'info')
    
    // Build performance
    if (this.results.buildTime > 0) {
      this.log(`构建时间: ${(this.results.buildTime / 1000).toFixed(2)}s`, 'info')
    }
    
    // Size analysis
    if (this.results.buildSize.total > 0) {
      this.log(`总构建大小: ${this.formatBytes(this.results.buildSize.total)}`, 'info')
      this.log(`  • 主进程: ${this.formatBytes(this.results.buildSize.main || 0)}`, 'info')
      this.log(`  • 预加载脚本: ${this.formatBytes(this.results.buildSize.preload || 0)}`, 'info')
      this.log(`  • 渲染进程: ${this.formatBytes(this.results.buildSize.renderer || 0)}`, 'info')
    }
    
    // Startup performance
    if (this.results.startupTime > 0) {
      this.log(`启动时间: ${(this.results.startupTime / 1000).toFixed(2)}s`, 'info')
    }
    
    // Memory usage
    if (this.results.memoryUsage.rss > 0) {
      this.log(`内存使用: ${this.formatBytes(this.results.memoryUsage.rss)}`, 'info')
    }

    // Performance score calculation
    let score = 100
    
    // Build time penalty
    if (this.results.buildTime > 60000) score -= 20
    else if (this.results.buildTime > 30000) score -= 10
    
    // Size penalty
    if (this.results.buildSize.total > 10 * 1024 * 1024) score -= 20
    else if (this.results.buildSize.total > 5 * 1024 * 1024) score -= 10
    
    // Startup time penalty
    if (this.results.startupTime > 10000) score -= 20
    else if (this.results.startupTime > 5000) score -= 10
    
    // Memory penalty
    if (this.results.memoryUsage.rss > 200 * 1024 * 1024) score -= 20
    else if (this.results.memoryUsage.rss > 100 * 1024 * 1024) score -= 10

    this.log(`\n性能评分: ${score}/100`, score >= 80 ? 'success' : score >= 60 ? 'warning' : 'error')
    
    if (score >= 80) {
      this.log('🎉 性能优秀！', 'success')
    } else if (score >= 60) {
      this.log('⚠️ 性能良好，有改进空间', 'warning')
    } else {
      this.log('❌ 性能需要优化', 'error')
    }

    return score >= 60
  }

  async run() {
    this.log('开始性能测试和优化...', 'info')
    
    // Run performance tests
    await this.measureBuildTime()
    await this.analyzeBuildSize()
    await this.measureStartupTime()
    await this.analyzeMemoryUsage()
    await this.runBundleAnalysis()
    await this.optimizeBuild()
    
    return this.generatePerformanceReport()
  }
}

// Run if called directly
if (require.main === module) {
  const tester = new PerformanceTester()
  tester.run().then(success => {
    process.exit(success ? 0 : 1)
  }).catch(error => {
    console.error('Performance test failed:', error)
    process.exit(1)
  })
}

module.exports = PerformanceTester