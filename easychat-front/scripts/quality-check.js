#!/usr/bin/env node

/**
 * 代码质量检查脚本
 * 运行完整的代码质量检查流程
 */

const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

class QualityChecker {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..')
    this.results = {
      typecheck: false,
      lint: false,
      format: false,
      build: false,
    }
  }

  /**
   * 运行命令并返回 Promise
   */
  runCommand(command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args, {
        cwd: this.projectRoot,
        stdio: 'inherit',
        shell: true,
        ...options,
      })

      process.on('close', code => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`命令失败: ${command} ${args.join(' ')}, 退出代码: ${code}`))
        }
      })

      process.on('error', error => {
        reject(error)
      })
    })
  }

  /**
   * TypeScript 类型检查
   */
  async typeCheck() {
    console.log('🔍 运行 TypeScript 类型检查...')
    try {
      await this.runCommand('npm', ['run', 'typecheck'])
      this.results.typecheck = true
      console.log('✅ TypeScript 类型检查通过')
    } catch (error) {
      console.error('❌ TypeScript 类型检查失败:', error.message)
      throw error
    }
  }

  /**
   * ESLint 代码检查
   */
  async lintCheck() {
    console.log('🔍 运行 ESLint 代码检查...')
    try {
      await this.runCommand('npm', ['run', 'lint'])
      this.results.lint = true
      console.log('✅ ESLint 代码检查通过')
    } catch (error) {
      console.error('❌ ESLint 代码检查失败:', error.message)
      throw error
    }
  }

  /**
   * Prettier 格式检查
   */
  async formatCheck() {
    console.log('🎨 检查代码格式...')
    try {
      await this.runCommand('npx', ['prettier', '--check', '.'])
      this.results.format = true
      console.log('✅ 代码格式检查通过')
    } catch (error) {
      console.error('❌ 代码格式检查失败，运行 npm run format 修复')
      throw error
    }
  }

  /**
   * 构建测试
   */
  async buildCheck() {
    console.log('🏗️  测试构建...')
    try {
      await this.runCommand('npm', ['run', 'build:dev'])
      this.results.build = true
      console.log('✅ 构建测试通过')
    } catch (error) {
      console.error('❌ 构建测试失败:', error.message)
      throw error
    }
  }

  /**
   * 运行所有检查
   */
  async runAll() {
    console.log('🚀 开始代码质量检查...\n')

    const checks = [
      { name: 'TypeScript 类型检查', fn: () => this.typeCheck() },
      { name: 'ESLint 代码检查', fn: () => this.lintCheck() },
      { name: '代码格式检查', fn: () => this.formatCheck() },
      { name: '构建测试', fn: () => this.buildCheck() },
    ]

    let passedCount = 0
    const startTime = Date.now()

    for (const check of checks) {
      try {
        await check.fn()
        passedCount++
      } catch (error) {
        console.error(`\n❌ ${check.name} 失败\n`)
        break
      }
      console.log() // 空行分隔
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    console.log('📊 质量检查结果:')
    console.log(`   通过: ${passedCount}/${checks.length}`)
    console.log(`   耗时: ${duration}s`)

    if (passedCount === checks.length) {
      console.log('\n🎉 所有代码质量检查通过！')
      return true
    } else {
      console.log('\n💥 代码质量检查失败，请修复问题后重试')
      return false
    }
  }

  /**
   * 快速检查（跳过构建）
   */
  async runQuick() {
    console.log('⚡ 开始快速代码质量检查...\n')

    const checks = [
      { name: 'TypeScript 类型检查', fn: () => this.typeCheck() },
      { name: 'ESLint 代码检查', fn: () => this.lintCheck() },
      { name: '代码格式检查', fn: () => this.formatCheck() },
    ]

    let passedCount = 0
    const startTime = Date.now()

    for (const check of checks) {
      try {
        await check.fn()
        passedCount++
      } catch (error) {
        console.error(`\n❌ ${check.name} 失败\n`)
        break
      }
      console.log() // 空行分隔
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    console.log('📊 快速检查结果:')
    console.log(`   通过: ${passedCount}/${checks.length}`)
    console.log(`   耗时: ${duration}s`)

    if (passedCount === checks.length) {
      console.log('\n🎉 快速代码质量检查通过！')
      return true
    } else {
      console.log('\n💥 快速代码质量检查失败，请修复问题后重试')
      return false
    }
  }

  /**
   * 自动修复
   */
  async autoFix() {
    console.log('🔧 自动修复代码问题...\n')

    try {
      console.log('🎨 格式化代码...')
      await this.runCommand('npm', ['run', 'format'])
      console.log('✅ 代码格式化完成')

      console.log('\n🔧 修复 ESLint 问题...')
      await this.runCommand('npx', ['eslint', '--fix', '.'])
      console.log('✅ ESLint 自动修复完成')

      console.log('\n🎉 自动修复完成，请重新运行质量检查')
    } catch (error) {
      console.error('❌ 自动修复失败:', error.message)
      throw error
    }
  }

  /**
   * 显示帮助信息
   */
  showHelp() {
    console.log(`
代码质量检查脚本

用法: node scripts/quality-check.js <command>

命令:
  all      运行完整的代码质量检查（包括构建测试）
  quick    运行快速检查（跳过构建测试）
  fix      自动修复代码问题
  help     显示此帮助信息

示例:
  node scripts/quality-check.js all
  node scripts/quality-check.js quick
  node scripts/quality-check.js fix
`)
  }
}

// 主函数
async function main() {
  const checker = new QualityChecker()
  const command = process.argv[2] || 'quick'

  try {
    switch (command) {
      case 'all':
        const allPassed = await checker.runAll()
        process.exit(allPassed ? 0 : 1)
        break
      case 'quick':
        const quickPassed = await checker.runQuick()
        process.exit(quickPassed ? 0 : 1)
        break
      case 'fix':
        await checker.autoFix()
        break
      case 'help':
      case '--help':
      case '-h':
        checker.showHelp()
        break
      default:
        console.log('❌ 未知命令:', command)
        checker.showHelp()
        process.exit(1)
    }
  } catch (error) {
    console.error('❌ 脚本执行失败:', error.message)
    process.exit(1)
  }
}

// 运行主函数
if (require.main === module) {
  main()
}

module.exports = QualityChecker
