#!/usr/bin/env node

/**
 * 开发环境监控脚本
 * 监控文件变化、内存使用、构建状态等
 */

const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

class DevMonitor {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..')
    this.watchers = new Map()
    this.stats = {
      fileChanges: 0,
      buildCount: 0,
      errorCount: 0,
      startTime: Date.now(),
    }
  }

  /**
   * 启动监控
   */
  start() {
    console.log('📊 启动开发环境监控...')

    this.watchFiles()
    this.monitorMemory()
    this.showStats()

    // 定期显示统计信息
    setInterval(() => {
      this.showStats()
    }, 30000) // 每30秒显示一次
  }

  /**
   * 监控文件变化
   */
  watchFiles() {
    const watchPaths = ['src/main', 'src/preload', 'src/renderer/src', 'src/types', 'src/utils']

    watchPaths.forEach(watchPath => {
      const fullPath = path.join(this.projectRoot, watchPath)

      if (fs.existsSync(fullPath)) {
        const watcher = fs.watch(fullPath, { recursive: true }, (eventType, filename) => {
          if (filename && (filename.endsWith('.ts') || filename.endsWith('.tsx'))) {
            this.stats.fileChanges++
            console.log(`📝 文件变化: ${path.join(watchPath, filename)} (${eventType})`)
          }
        })

        this.watchers.set(watchPath, watcher)
        console.log(`👀 监控目录: ${watchPath}`)
      }
    })
  }

  /**
   * 监控内存使用
   */
  monitorMemory() {
    setInterval(() => {
      const usage = process.memoryUsage()
      const formatBytes = bytes => {
        return (bytes / 1024 / 1024).toFixed(2) + ' MB'
      }

      // 只在内存使用超过阈值时显示警告
      if (usage.heapUsed > 100 * 1024 * 1024) {
        // 100MB
        console.log(`⚠️  内存使用较高: ${formatBytes(usage.heapUsed)}`)
      }
    }, 10000) // 每10秒检查一次
  }

  /**
   * 显示统计信息
   */
  showStats() {
    const uptime = Math.floor((Date.now() - this.stats.startTime) / 1000)
    const formatTime = seconds => {
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      const secs = seconds % 60
      return `${hours}h ${minutes}m ${secs}s`
    }

    console.log(`
📊 开发环境统计 (运行时间: ${formatTime(uptime)})
   文件变化: ${this.stats.fileChanges}
   构建次数: ${this.stats.buildCount}
   错误次数: ${this.stats.errorCount}
   内存使用: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB
`)
  }

  /**
   * 停止监控
   */
  stop() {
    console.log('🛑 停止开发环境监控...')

    for (const [path, watcher] of this.watchers) {
      watcher.close()
      console.log(`停止监控: ${path}`)
    }

    this.watchers.clear()
    this.showStats()
  }
}

// 主函数
function main() {
  const monitor = new DevMonitor()

  // 启动监控
  monitor.start()

  // 监听退出信号
  process.on('SIGINT', () => {
    monitor.stop()
    process.exit(0)
  })

  process.on('SIGTERM', () => {
    monitor.stop()
    process.exit(0)
  })

  console.log('按 Ctrl+C 停止监控')
}

// 运行主函数
if (require.main === module) {
  main()
}

module.exports = DevMonitor
