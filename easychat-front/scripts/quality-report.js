#!/usr/bin/env node

/**
 * 代码质量报告生成脚本
 * 生成详细的代码质量分析报告
 */

const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

class QualityReporter {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..')
    this.reportDir = path.join(this.projectRoot, 'reports')
    this.report = {
      timestamp: new Date().toISOString(),
      summary: {},
      details: {},
    }
  }

  /**
   * 确保报告目录存在
   */
  ensureReportDir() {
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true })
    }
  }

  /**
   * 运行命令并捕获输出
   */
  runCommand(command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
      let stdout = ''
      let stderr = ''

      const process = spawn(command, args, {
        cwd: this.projectRoot,
        shell: true,
        ...options,
      })

      process.stdout?.on('data', data => {
        stdout += data.toString()
      })

      process.stderr?.on('data', data => {
        stderr += data.toString()
      })

      process.on('close', code => {
        resolve({
          code,
          stdout,
          stderr,
          success: code === 0,
        })
      })

      process.on('error', error => {
        reject(error)
      })
    })
  }

  /**
   * 分析项目结构
   */
  async analyzeProjectStructure() {
    console.log('📁 分析项目结构...')

    const getFileCount = (dir, extensions) => {
      let count = 0
      const files = fs.readdirSync(dir, { withFileTypes: true })

      for (const file of files) {
        if (file.isDirectory() && !file.name.startsWith('.') && file.name !== 'node_modules') {
          count += getFileCount(path.join(dir, file.name), extensions)
        } else if (file.isFile() && extensions.some(ext => file.name.endsWith(ext))) {
          count++
        }
      }

      return count
    }

    const srcDir = path.join(this.projectRoot, 'src')

    this.report.details.projectStructure = {
      totalTypeScriptFiles: getFileCount(srcDir, ['.ts', '.tsx']),
      mainProcessFiles: getFileCount(path.join(srcDir, 'main'), ['.ts']),
      preloadFiles: getFileCount(path.join(srcDir, 'preload'), ['.ts']),
      rendererFiles: getFileCount(path.join(srcDir, 'renderer'), ['.ts', '.tsx']),
      typeFiles: getFileCount(path.join(srcDir, 'types'), ['.ts']),
      utilFiles: getFileCount(path.join(srcDir, 'utils'), ['.ts']),
    }
  }

  /**
   * 运行 TypeScript 编译检查
   */
  async checkTypeScript() {
    console.log('🔍 检查 TypeScript...')

    const result = await this.runCommand('npx', [
      'tsc',
      '--noEmit',
      '--project',
      'tsconfig.node.json',
    ])
    const webResult = await this.runCommand('npx', [
      'tsc',
      '--noEmit',
      '--project',
      'tsconfig.web.json',
    ])

    this.report.details.typescript = {
      nodeCheck: {
        success: result.success,
        errors: result.stderr || '',
        output: result.stdout || '',
      },
      webCheck: {
        success: webResult.success,
        errors: webResult.stderr || '',
        output: webResult.stdout || '',
      },
    }

    this.report.summary.typescriptPassed = result.success && webResult.success
  }

  /**
   * 运行 ESLint 检查
   */
  async checkESLint() {
    console.log('🔍 检查 ESLint...')

    const result = await this.runCommand('npx', ['eslint', '.', '--format', 'json'])

    let eslintResults = []
    try {
      eslintResults = JSON.parse(result.stdout || '[]')
    } catch (error) {
      console.warn('无法解析 ESLint JSON 输出')
    }

    const totalErrors = eslintResults.reduce((sum, file) => sum + file.errorCount, 0)
    const totalWarnings = eslintResults.reduce((sum, file) => sum + file.warningCount, 0)

    this.report.details.eslint = {
      success: result.success,
      totalFiles: eslintResults.length,
      totalErrors,
      totalWarnings,
      results: eslintResults.filter(file => file.errorCount > 0 || file.warningCount > 0),
    }

    this.report.summary.eslintPassed = result.success
    this.report.summary.eslintErrors = totalErrors
    this.report.summary.eslintWarnings = totalWarnings
  }

  /**
   * 检查代码格式
   */
  async checkPrettier() {
    console.log('🎨 检查代码格式...')

    const result = await this.runCommand('npx', ['prettier', '--check', '.'])

    this.report.details.prettier = {
      success: result.success,
      output: result.stdout || '',
      errors: result.stderr || '',
    }

    this.report.summary.prettierPassed = result.success
  }

  /**
   * 分析依赖
   */
  async analyzeDependencies() {
    console.log('📦 分析依赖...')

    const packageJson = JSON.parse(
      fs.readFileSync(path.join(this.projectRoot, 'package.json'), 'utf8')
    )

    this.report.details.dependencies = {
      production: Object.keys(packageJson.dependencies || {}).length,
      development: Object.keys(packageJson.devDependencies || {}).length,
      total:
        Object.keys(packageJson.dependencies || {}).length +
        Object.keys(packageJson.devDependencies || {}).length,
    }
  }

  /**
   * 生成报告
   */
  async generateReport() {
    console.log('📊 生成代码质量报告...')

    this.ensureReportDir()

    await this.analyzeProjectStructure()
    await this.checkTypeScript()
    await this.checkESLint()
    await this.checkPrettier()
    await this.analyzeDependencies()

    // 计算总体评分
    const checks = [
      this.report.summary.typescriptPassed,
      this.report.summary.eslintPassed,
      this.report.summary.prettierPassed,
    ]

    const passedChecks = checks.filter(Boolean).length
    this.report.summary.overallScore = Math.round((passedChecks / checks.length) * 100)
    this.report.summary.totalChecks = checks.length
    this.report.summary.passedChecks = passedChecks

    // 保存 JSON 报告
    const jsonReportPath = path.join(this.reportDir, 'quality-report.json')
    fs.writeFileSync(jsonReportPath, JSON.stringify(this.report, null, 2))

    // 生成 HTML 报告
    await this.generateHTMLReport()

    // 生成控制台报告
    this.printConsoleReport()

    console.log(`\n📄 报告已生成:`)
    console.log(`   JSON: ${jsonReportPath}`)
    console.log(`   HTML: ${path.join(this.reportDir, 'quality-report.html')}`)
  }

  /**
   * 生成 HTML 报告
   */
  async generateHTMLReport() {
    const htmlTemplate = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>代码质量报告</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .content { padding: 30px; }
        .score { font-size: 48px; font-weight: bold; text-align: center; margin: 20px 0; }
        .score.good { color: #4CAF50; }
        .score.warning { color: #FF9800; }
        .score.error { color: #F44336; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 20px 0; }
        .card { background: #f8f9fa; border-radius: 8px; padding: 20px; border-left: 4px solid #667eea; }
        .card h3 { margin-top: 0; color: #333; }
        .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
        .status.success { background: #d4edda; color: #155724; }
        .status.error { background: #f8d7da; color: #721c24; }
        .details { margin-top: 20px; }
        .details pre { background: #f1f3f4; padding: 15px; border-radius: 4px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>代码质量报告</h1>
            <p>生成时间: ${new Date(this.report.timestamp).toLocaleString('zh-CN')}</p>
        </div>
        <div class="content">
            <div class="score ${this.report.summary.overallScore >= 80 ? 'good' : this.report.summary.overallScore >= 60 ? 'warning' : 'error'}">
                ${this.report.summary.overallScore}%
            </div>
            <p style="text-align: center; color: #666;">
                通过 ${this.report.summary.passedChecks}/${this.report.summary.totalChecks} 项检查
            </p>
            
            <div class="grid">
                <div class="card">
                    <h3>TypeScript 检查</h3>
                    <span class="status ${this.report.summary.typescriptPassed ? 'success' : 'error'}">
                        ${this.report.summary.typescriptPassed ? '通过' : '失败'}
                    </span>
                </div>
                
                <div class="card">
                    <h3>ESLint 检查</h3>
                    <span class="status ${this.report.summary.eslintPassed ? 'success' : 'error'}">
                        ${this.report.summary.eslintPassed ? '通过' : '失败'}
                    </span>
                    <p>错误: ${this.report.summary.eslintErrors || 0}, 警告: ${this.report.summary.eslintWarnings || 0}</p>
                </div>
                
                <div class="card">
                    <h3>代码格式检查</h3>
                    <span class="status ${this.report.summary.prettierPassed ? 'success' : 'error'}">
                        ${this.report.summary.prettierPassed ? '通过' : '失败'}
                    </span>
                </div>
            </div>
            
            <div class="details">
                <h2>项目结构</h2>
                <div class="grid">
                    <div class="card">
                        <h3>文件统计</h3>
                        <p>TypeScript 文件: ${this.report.details.projectStructure?.totalTypeScriptFiles || 0}</p>
                        <p>主进程文件: ${this.report.details.projectStructure?.mainProcessFiles || 0}</p>
                        <p>预加载文件: ${this.report.details.projectStructure?.preloadFiles || 0}</p>
                        <p>渲染进程文件: ${this.report.details.projectStructure?.rendererFiles || 0}</p>
                    </div>
                    
                    <div class="card">
                        <h3>依赖统计</h3>
                        <p>生产依赖: ${this.report.details.dependencies?.production || 0}</p>
                        <p>开发依赖: ${this.report.details.dependencies?.development || 0}</p>
                        <p>总计: ${this.report.details.dependencies?.total || 0}</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`

    const htmlReportPath = path.join(this.reportDir, 'quality-report.html')
    fs.writeFileSync(htmlReportPath, htmlTemplate)
  }

  /**
   * 打印控制台报告
   */
  printConsoleReport() {
    console.log('\n📊 代码质量报告摘要:')
    console.log('='.repeat(50))
    console.log(`总体评分: ${this.report.summary.overallScore}%`)
    console.log(`通过检查: ${this.report.summary.passedChecks}/${this.report.summary.totalChecks}`)
    console.log()

    console.log('检查结果:')
    console.log(`  TypeScript: ${this.report.summary.typescriptPassed ? '✅ 通过' : '❌ 失败'}`)
    console.log(
      `  ESLint: ${this.report.summary.eslintPassed ? '✅ 通过' : '❌ 失败'} (错误: ${this.report.summary.eslintErrors || 0}, 警告: ${this.report.summary.eslintWarnings || 0})`
    )
    console.log(`  Prettier: ${this.report.summary.prettierPassed ? '✅ 通过' : '❌ 失败'}`)
    console.log()

    console.log('项目统计:')
    console.log(
      `  TypeScript 文件: ${this.report.details.projectStructure?.totalTypeScriptFiles || 0}`
    )
    console.log(`  依赖总数: ${this.report.details.dependencies?.total || 0}`)
  }
}

// 主函数
async function main() {
  const reporter = new QualityReporter()

  try {
    await reporter.generateReport()
  } catch (error) {
    console.error('❌ 生成报告失败:', error.message)
    process.exit(1)
  }
}

// 运行主函数
if (require.main === module) {
  main()
}

module.exports = QualityReporter
