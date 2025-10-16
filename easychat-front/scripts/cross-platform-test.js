#!/usr/bin/env node

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')

class CrossPlatformTester {
  constructor() {
    this.platform = os.platform()
    this.arch = os.arch()
    this.results = {
      platform: this.platform,
      arch: this.arch,
      nodeVersion: process.version,
      tests: {}
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

  async testPlatformSpecificPaths() {
    this.log('📁 测试平台特定路径...', 'info')
    
    try {
      // Check if platform-specific code handles paths correctly
      const configPath = 'src/main/config/AppConfig.ts'
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf8')
        
        // Check for proper path handling
        if (content.includes('path.join') || content.includes('path.resolve')) {
          this.log('✅ 使用了跨平台路径处理', 'success')
        } else {
          this.log('⚠️ 可能存在硬编码路径', 'warning')
        }
      }

      // Test actual path operations
      const testDir = path.join(os.tmpdir(), 'jlcone-test')
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true })
      }
      
      const testFile = path.join(testDir, 'test.json')
      fs.writeFileSync(testFile, JSON.stringify({ test: true }))
      
      if (fs.existsSync(testFile)) {
        this.log('✅ 文件系统操作正常', 'success')
        fs.unlinkSync(testFile)
        fs.rmdirSync(testDir)
      }

      this.results.tests.pathHandling = true
      return true
    } catch (error) {
      this.log(`❌ 路径处理测试失败: ${error.message}`, 'error')
      this.results.tests.pathHandling = false
      return false
    }
  }

  async testElectronCompatibility() {
    this.log('⚡ 测试 Electron 兼容性...', 'info')
    
    try {
      // Check Electron version compatibility
      const packagePath = 'package.json'
      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
      
      const electronVersion = pkg.devDependencies?.electron || pkg.dependencies?.electron
      if (electronVersion) {
        this.log(`Electron 版本: ${electronVersion}`, 'info')
        
        // Check if it's a recent version (should be v20+)
        const versionMatch = electronVersion.match(/(\d+)\./)
        if (versionMatch && parseInt(versionMatch[1]) >= 20) {
          this.log('✅ Electron 版本兼容', 'success')
        } else {
          this.log('⚠️ Electron 版本可能过旧', 'warning')
        }
      }

      // Check for platform-specific Electron configurations
      const electronBuilderConfig = pkg.build
      if (electronBuilderConfig) {
        const platforms = ['win', 'mac', 'linux']
        const supportedPlatforms = platforms.filter(p => electronBuilderConfig[p])
        
        this.log(`支持的平台: ${supportedPlatforms.join(', ')}`, 'info')
        
        if (supportedPlatforms.length >= 2) {
          this.log('✅ 多平台构建配置完整', 'success')
        } else {
          this.log('⚠️ 平台支持有限', 'warning')
        }
      }

      this.results.tests.electronCompatibility = true
      return true
    } catch (error) {
      this.log(`❌ Electron 兼容性测试失败: ${error.message}`, 'error')
      this.results.tests.electronCompatibility = false
      return false
    }
  }

  async testNodeModulesCompatibility() {
    this.log('📦 测试 Node 模块兼容性...', 'info')
    
    try {
      // Check for native modules that might have platform issues
      const packagePath = 'package.json'
      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
      
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies
      }

      const nativeModules = [
        'better-sqlite3',
        'node-gyp',
        'native-modules',
        'electron-rebuild'
      ]

      const foundNativeModules = nativeModules.filter(mod => allDeps[mod])
      
      if (foundNativeModules.length > 0) {
        this.log(`发现原生模块: ${foundNativeModules.join(', ')}`, 'info')
        
        // Check if electron-builder is configured for native modules
        if (pkg.build?.nodeGypRebuild === false) {
          this.log('✅ 原生模块重建已禁用（推荐）', 'success')
        } else {
          this.log('⚠️ 原生模块可能需要重建配置', 'warning')
        }
      } else {
        this.log('✅ 未发现原生模块依赖', 'success')
      }

      // Test module loading
      try {
        require('crypto')
        require('fs')
        require('path')
        require('os')
        this.log('✅ 核心 Node 模块加载正常', 'success')
      } catch (error) {
        this.log('❌ 核心模块加载失败', 'error')
        throw error
      }

      this.results.tests.nodeModulesCompatibility = true
      return true
    } catch (error) {
      this.log(`❌ Node 模块兼容性测试失败: ${error.message}`, 'error')
      this.results.tests.nodeModulesCompatibility = false
      return false
    }
  }

  async testBuildTargets() {
    this.log('🎯 测试构建目标...', 'info')
    
    try {
      const packagePath = 'package.json'
      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
      
      // Check build scripts for different platforms
      const buildScripts = Object.keys(pkg.scripts || {}).filter(script => 
        script.startsWith('build:') || script.startsWith('package:')
      )

      this.log(`可用构建脚本: ${buildScripts.join(', ')}`, 'info')

      // Test current platform build
      const currentPlatformScript = this.getPlatformBuildScript()
      if (currentPlatformScript && pkg.scripts[currentPlatformScript]) {
        this.log(`当前平台构建脚本: ${currentPlatformScript}`, 'info')
        
        // We won't actually run the build as it takes time, but verify the script exists
        this.log('✅ 当前平台构建脚本可用', 'success')
      } else {
        this.log('⚠️ 当前平台构建脚本未找到', 'warning')
      }

      this.results.tests.buildTargets = true
      return true
    } catch (error) {
      this.log(`❌ 构建目标测试失败: ${error.message}`, 'error')
      this.results.tests.buildTargets = false
      return false
    }
  }

  getPlatformBuildScript() {
    switch (this.platform) {
      case 'win32':
        return 'build:win'
      case 'darwin':
        return 'build:mac'
      case 'linux':
        return 'build:linux'
      default:
        return null
    }
  }

  async testEnvironmentVariables() {
    this.log('🌍 测试环境变量处理...', 'info')
    
    try {
      // Test common environment variables
      const envVars = [
        'NODE_ENV',
        'ELECTRON_IS_DEV',
        'HOME',
        'USERPROFILE',
        'APPDATA',
        'LOCALAPPDATA'
      ]

      const availableVars = envVars.filter(varName => process.env[varName] !== undefined)
      this.log(`可用环境变量: ${availableVars.join(', ')}`, 'info')

      // Check platform-specific environment variables
      if (this.platform === 'win32') {
        if (process.env.USERPROFILE) {
          this.log('✅ Windows 用户目录变量可用', 'success')
        }
        if (process.env.APPDATA) {
          this.log('✅ Windows 应用数据目录可用', 'success')
        }
      } else {
        if (process.env.HOME) {
          this.log('✅ Unix 用户目录变量可用', 'success')
        }
      }

      // Test NODE_ENV handling
      const originalNodeEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'test'
      
      if (process.env.NODE_ENV === 'test') {
        this.log('✅ 环境变量设置正常', 'success')
      }
      
      // Restore original value
      if (originalNodeEnv !== undefined) {
        process.env.NODE_ENV = originalNodeEnv
      } else {
        delete process.env.NODE_ENV
      }

      this.results.tests.environmentVariables = true
      return true
    } catch (error) {
      this.log(`❌ 环境变量测试失败: ${error.message}`, 'error')
      this.results.tests.environmentVariables = false
      return false
    }
  }

  async testFileSystemPermissions() {
    this.log('🔐 测试文件系统权限...', 'info')
    
    try {
      const testDir = path.join(os.tmpdir(), 'jlcone-permissions-test')
      
      // Test directory creation
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true })
        this.log('✅ 目录创建权限正常', 'success')
      }

      // Test file creation
      const testFile = path.join(testDir, 'test.txt')
      fs.writeFileSync(testFile, 'test content')
      this.log('✅ 文件创建权限正常', 'success')

      // Test file reading
      const content = fs.readFileSync(testFile, 'utf8')
      if (content === 'test content') {
        this.log('✅ 文件读取权限正常', 'success')
      }

      // Test file modification
      fs.writeFileSync(testFile, 'modified content')
      const modifiedContent = fs.readFileSync(testFile, 'utf8')
      if (modifiedContent === 'modified content') {
        this.log('✅ 文件修改权限正常', 'success')
      }

      // Test file deletion
      fs.unlinkSync(testFile)
      this.log('✅ 文件删除权限正常', 'success')

      // Test directory deletion
      fs.rmdirSync(testDir)
      this.log('✅ 目录删除权限正常', 'success')

      this.results.tests.fileSystemPermissions = true
      return true
    } catch (error) {
      this.log(`❌ 文件系统权限测试失败: ${error.message}`, 'error')
      this.results.tests.fileSystemPermissions = false
      return false
    }
  }

  generateCompatibilityReport() {
    this.log('\n=== 跨平台兼容性报告 ===', 'info')
    
    this.log(`操作系统: ${this.platform}`, 'info')
    this.log(`架构: ${this.arch}`, 'info')
    this.log(`Node.js 版本: ${this.results.nodeVersion}`, 'info')
    
    const tests = [
      { name: '路径处理', key: 'pathHandling' },
      { name: 'Electron 兼容性', key: 'electronCompatibility' },
      { name: 'Node 模块兼容性', key: 'nodeModulesCompatibility' },
      { name: '构建目标', key: 'buildTargets' },
      { name: '环境变量', key: 'environmentVariables' },
      { name: '文件系统权限', key: 'fileSystemPermissions' }
    ]

    let passed = 0
    let total = tests.length

    tests.forEach(test => {
      const result = this.results.tests[test.key]
      const status = result ? '✅ 通过' : '❌ 失败'
      const color = result ? 'success' : 'error'
      this.log(`${test.name}: ${status}`, color)
      if (result) passed++
    })

    this.log(`\n兼容性评分: ${passed}/${total}`, passed === total ? 'success' : 'warning')
    
    if (passed === total) {
      this.log('🎉 跨平台兼容性优秀！', 'success')
      return true
    } else {
      this.log('⚠️ 部分兼容性测试失败，需要检查', 'warning')
      return false
    }
  }

  async run() {
    this.log(`开始跨平台兼容性测试 (${this.platform}-${this.arch})...`, 'info')
    
    // Run all compatibility tests
    await this.testPlatformSpecificPaths()
    await this.testElectronCompatibility()
    await this.testNodeModulesCompatibility()
    await this.testBuildTargets()
    await this.testEnvironmentVariables()
    await this.testFileSystemPermissions()
    
    return this.generateCompatibilityReport()
  }
}

// Run if called directly
if (require.main === module) {
  const tester = new CrossPlatformTester()
  tester.run().then(success => {
    process.exit(success ? 0 : 1)
  }).catch(error => {
    console.error('Cross-platform test failed:', error)
    process.exit(1)
  })
}

module.exports = CrossPlatformTester