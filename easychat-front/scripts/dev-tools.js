#!/usr/bin/env node

/**
 * 开发工具辅助脚本
 * 提供开发环境的各种工具和调试功能
 */

const { spawn, exec } = require('child_process')
const path = require('path')
const fs = require('fs')

class DevTools {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..')
    this.processes = new Map()
  }

  /**
   * 启动开发服务器
   */
  async startDev() {
    console.log('🚀 启动开发服务器...')

    const devProcess = spawn('npm', ['run', 'dev'], {
      cwd: this.projectRoot,
      stdio: 'inherit',
      shell: true,
    })

    this.processes.set('dev', devProcess)

    devProcess.on('close', code => {
      console.log(`开发服务器退出，代码: ${code}`)
      this.processes.delete('dev')
    })

    // 监听进程退出信号
    process.on('SIGINT', () => {
      this.cleanup()
      process.exit(0)
    })

    process.on('SIGTERM', () => {
      this.cleanup()
      process.exit(0)
    })
  }

  /**
   * 运行类型检查
   */
  async typeCheck() {
    console.log('🔍 运行 TypeScript 类型检查...')

    return new Promise((resolve, reject) => {
      const typeCheckProcess = spawn('npm', ['run', 'typecheck'], {
        cwd: this.projectRoot,
        stdio: 'inherit',
        shell: true,
      })

      typeCheckProcess.on('close', code => {
        if (code === 0) {
          console.log('✅ 类型检查通过')
          resolve()
        } else {
          console.log('❌ 类型检查失败')
          reject(new Error(`类型检查失败，退出代码: ${code}`))
        }
      })
    })
  }

  /**
   * 运行代码检查
   */
  async lint() {
    console.log('🔍 运行 ESLint 代码检查...')

    return new Promise((resolve, reject) => {
      const lintProcess = spawn('npm', ['run', 'lint'], {
        cwd: this.projectRoot,
        stdio: 'inherit',
        shell: true,
      })

      lintProcess.on('close', code => {
        if (code === 0) {
          console.log('✅ 代码检查通过')
          resolve()
        } else {
          console.log('❌ 代码检查失败')
          reject(new Error(`代码检查失败，退出代码: ${code}`))
        }
      })
    })
  }

  /**
   * 格式化代码
   */
  async format() {
    console.log('🎨 格式化代码...')

    return new Promise((resolve, reject) => {
      const formatProcess = spawn('npm', ['run', 'format'], {
        cwd: this.projectRoot,
        stdio: 'inherit',
        shell: true,
      })

      formatProcess.on('close', code => {
        if (code === 0) {
          console.log('✅ 代码格式化完成')
          resolve()
        } else {
          console.log('❌ 代码格式化失败')
          reject(new Error(`代码格式化失败，退出代码: ${code}`))
        }
      })
    })
  }

  /**
   * 运行完整的代码质量检查
   */
  async checkQuality() {
    console.log('🔍 运行完整的代码质量检查...')

    try {
      await this.typeCheck()
      await this.lint()
      console.log('✅ 所有代码质量检查通过')
    } catch (error) {
      console.error('❌ 代码质量检查失败:', error.message)
      process.exit(1)
    }
  }

  /**
   * 清理进程
   */
  cleanup() {
    console.log('🧹 清理进程...')

    for (const [name, process] of this.processes) {
      console.log(`终止进程: ${name}`)
      process.kill('SIGTERM')
    }

    this.processes.clear()
  }

  /**
   * 显示帮助信息
   */
  showHelp() {
    console.log(`
开发工具脚本

用法: node scripts/dev-tools.js <command>

命令:
  dev         启动开发服务器
  typecheck   运行 TypeScript 类型检查
  lint        运行 ESLint 代码检查
  format      格式化代码
  quality     运行完整的代码质量检查
  help        显示此帮助信息

示例:
  node scripts/dev-tools.js dev
  node scripts/dev-tools.js quality
`)
  }
}

// 主函数
async function main() {
  const devTools = new DevTools()
  const command = process.argv[2]

  switch (command) {
    case 'dev':
      await devTools.startDev()
      break
    case 'typecheck':
      await devTools.typeCheck()
      break
    case 'lint':
      await devTools.lint()
      break
    case 'format':
      await devTools.format()
      break
    case 'quality':
      await devTools.checkQuality()
      break
    case 'help':
    case '--help':
    case '-h':
      devTools.showHelp()
      break
    default:
      console.log('❌ 未知命令:', command)
      devTools.showHelp()
      process.exit(1)
  }
}

// 运行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 脚本执行失败:', error)
    process.exit(1)
  })
}

module.exports = DevTools
