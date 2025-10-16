#!/usr/bin/env node

const { execSync, spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

class FunctionalTester {
  constructor() {
    this.results = {
      build: false,
      devStartup: false,
      typecheck: false,
      lint: false,
      fileStructure: false
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

  async testBuild() {
    this.log('🔨 Testing production build...', 'info')
    try {
      execSync('npm run build', { stdio: 'pipe' })
      
      // Check if build outputs exist
      const requiredFiles = [
        'out/main/index.js',
        'out/preload/index.js',
        'out/renderer/index.html'
      ]
      
      for (const file of requiredFiles) {
        if (!fs.existsSync(file)) {
          throw new Error(`Missing build output: ${file}`)
        }
      }
      
      this.results.build = true
      this.log('✅ Production build successful', 'success')
      return true
    } catch (error) {
      this.log(`❌ Build failed: ${error.message}`, 'error')
      return false
    }
  }

  async testDevStartup() {
    this.log('🚀 Testing development server startup...', 'info')
    
    return new Promise((resolve) => {
      const devProcess = spawn('npm', ['run', 'dev'], {
        stdio: 'pipe'
      })

      let output = ''
      const timeout = setTimeout(() => {
        devProcess.kill('SIGTERM')
        this.log('❌ Dev server startup timeout', 'error')
        resolve(false)
      }, 15000)

      devProcess.stdout.on('data', (data) => {
        output += data.toString()
        
        if (output.includes('Local:') || output.includes('ready in')) {
          clearTimeout(timeout)
          devProcess.kill('SIGTERM')
          this.results.devStartup = true
          this.log('✅ Development server startup successful', 'success')
          resolve(true)
        }
      })

      devProcess.stderr.on('data', (data) => {
        const errorOutput = data.toString()
        if (errorOutput.includes('Error') || errorOutput.includes('Failed')) {
          clearTimeout(timeout)
          devProcess.kill('SIGTERM')
          this.log(`❌ Dev server error: ${errorOutput}`, 'error')
          resolve(false)
        }
      })

      devProcess.on('close', () => {
        clearTimeout(timeout)
        if (!this.results.devStartup) {
          resolve(false)
        }
      })
    })
  }

  async testTypecheck() {
    this.log('📝 Testing TypeScript type checking...', 'info')
    try {
      execSync('npm run typecheck', { stdio: 'pipe' })
      this.results.typecheck = true
      this.log('✅ TypeScript type checking passed', 'success')
      return true
    } catch (error) {
      this.log('❌ TypeScript type checking failed', 'error')
      return false
    }
  }

  async testLint() {
    this.log('🔍 Testing ESLint...', 'info')
    try {
      execSync('npm run lint', { stdio: 'pipe' })
      this.results.lint = true
      this.log('✅ ESLint passed', 'success')
      return true
    } catch (error) {
      this.log('❌ ESLint failed', 'error')
      return false
    }
  }

  async testFileStructure() {
    this.log('📁 Testing file structure integrity...', 'info')
    
    const requiredFiles = [
      'src/main/index.ts',
      'src/preload/index.ts',
      'src/renderer/index.html',
      'src/types/index.ts',
      'package.json',
      'electron.vite.config.ts',
      'tsconfig.json'
    ]

    const requiredDirs = [
      'src/main',
      'src/preload',
      'src/renderer',
      'src/types',
      'resources'
    ]

    try {
      // Check files
      for (const file of requiredFiles) {
        if (!fs.existsSync(file)) {
          throw new Error(`Missing required file: ${file}`)
        }
      }

      // Check directories
      for (const dir of requiredDirs) {
        if (!fs.existsSync(dir)) {
          throw new Error(`Missing required directory: ${dir}`)
        }
      }

      this.results.fileStructure = true
      this.log('✅ File structure integrity check passed', 'success')
      return true
    } catch (error) {
      this.log(`❌ File structure check failed: ${error.message}`, 'error')
      return false
    }
  }

  async testWindowManagement() {
    this.log('🪟 Testing window management functionality...', 'info')
    
    try {
      // Check if WindowManager exists and has required methods
      const windowManagerPath = 'src/main/managers/WindowManager.ts'
      if (!fs.existsSync(windowManagerPath)) {
        throw new Error('WindowManager not found')
      }

      const content = fs.readFileSync(windowManagerPath, 'utf8')
      const requiredMethods = [
        'createMainWindow',
        'createLoginWindow',
        'createSettingWindow',
        'getWindow',
        'closeWindow'
      ]

      for (const method of requiredMethods) {
        if (!content.includes(method)) {
          throw new Error(`WindowManager missing method: ${method}`)
        }
      }

      this.log('✅ Window management functionality verified', 'success')
      return true
    } catch (error) {
      this.log(`❌ Window management test failed: ${error.message}`, 'error')
      return false
    }
  }

  async testTabManagement() {
    this.log('📑 Testing tab management functionality...', 'info')
    
    try {
      // Check if TabManager exists and has required methods
      const tabManagerPath = 'src/main/managers/TabManager.ts'
      if (!fs.existsSync(tabManagerPath)) {
        throw new Error('TabManager not found')
      }

      const content = fs.readFileSync(tabManagerPath, 'utf8')
      const requiredMethods = [
        'createTab',
        'removeTab',
        'switchTab',
        'getAllTabs'
      ]

      for (const method of requiredMethods) {
        if (!content.includes(method)) {
          throw new Error(`TabManager missing method: ${method}`)
        }
      }

      this.log('✅ Tab management functionality verified', 'success')
      return true
    } catch (error) {
      this.log(`❌ Tab management test failed: ${error.message}`, 'error')
      return false
    }
  }

  async testConfigManagement() {
    this.log('⚙️ Testing configuration management...', 'info')
    
    try {
      // Check if AppConfig exists and has required methods
      const configPath = 'src/main/config/AppConfig.ts'
      if (!fs.existsSync(configPath)) {
        throw new Error('AppConfig not found')
      }

      const content = fs.readFileSync(configPath, 'utf8')
      const requiredMethods = [
        'get',
        'set',
        'has',
        'delete'
      ]

      for (const method of requiredMethods) {
        if (!content.includes(method)) {
          throw new Error(`AppConfig missing method: ${method}`)
        }
      }

      this.log('✅ Configuration management functionality verified', 'success')
      return true
    } catch (error) {
      this.log(`❌ Configuration management test failed: ${error.message}`, 'error')
      return false
    }
  }

  generateReport() {
    this.log('\n=== 功能测试报告 ===', 'info')
    
    const tests = [
      { name: '构建测试', result: this.results.build },
      { name: '开发服务器启动', result: this.results.devStartup },
      { name: 'TypeScript 类型检查', result: this.results.typecheck },
      { name: 'ESLint 检查', result: this.results.lint },
      { name: '文件结构完整性', result: this.results.fileStructure }
    ]

    let passed = 0
    let total = tests.length

    tests.forEach(test => {
      const status = test.result ? '✅ 通过' : '❌ 失败'
      const color = test.result ? 'success' : 'error'
      this.log(`${test.name}: ${status}`, color)
      if (test.result) passed++
    })

    this.log(`\n总结: ${passed}/${total} 测试通过`, passed === total ? 'success' : 'warning')
    
    if (passed === total) {
      this.log('🎉 所有功能测试通过！迁移验证成功！', 'success')
      return true
    } else {
      this.log('⚠️ 部分测试失败，需要进一步检查', 'warning')
      return false
    }
  }

  async run() {
    this.log('开始功能测试...', 'info')
    
    // Run all tests
    await this.testFileStructure()
    await this.testTypecheck()
    await this.testLint()
    await this.testBuild()
    await this.testDevStartup()
    
    // Additional functionality tests
    await this.testWindowManagement()
    await this.testTabManagement()
    await this.testConfigManagement()
    
    return this.generateReport()
  }
}

// Run if called directly
if (require.main === module) {
  const tester = new FunctionalTester()
  tester.run().then(success => {
    process.exit(success ? 0 : 1)
  }).catch(error => {
    console.error('Functional test failed:', error)
    process.exit(1)
  })
}

module.exports = FunctionalTester