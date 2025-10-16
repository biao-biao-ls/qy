#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const FunctionalTester = require('./functional-test')
const PerformanceTester = require('./performance-test')
const CrossPlatformTester = require('./cross-platform-test')

class TestReportGenerator {
  constructor() {
    this.reportData = {
      timestamp: new Date().toISOString(),
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      testResults: {
        functional: null,
        performance: null,
        crossPlatform: null
      },
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        overallScore: 0
      }
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

  async runAllTests() {
    this.log('🧪 运行完整测试套件...', 'info')
    
    try {
      // Run functional tests
      this.log('\n1️⃣ 运行功能测试...', 'info')
      const functionalTester = new FunctionalTester()
      const functionalResult = await functionalTester.run()
      this.reportData.testResults.functional = {
        passed: functionalResult,
        details: functionalTester.results
      }

      // Run performance tests
      this.log('\n2️⃣ 运行性能测试...', 'info')
      const performanceTester = new PerformanceTester()
      const performanceResult = await performanceTester.run()
      this.reportData.testResults.performance = {
        passed: performanceResult,
        details: performanceTester.results
      }

      // Run cross-platform tests
      this.log('\n3️⃣ 运行跨平台兼容性测试...', 'info')
      const crossPlatformTester = new CrossPlatformTester()
      const crossPlatformResult = await crossPlatformTester.run()
      this.reportData.testResults.crossPlatform = {
        passed: crossPlatformResult,
        details: crossPlatformTester.results
      }

      // Calculate summary
      this.calculateSummary()
      
      return true
    } catch (error) {
      this.log(`❌ 测试运行失败: ${error.message}`, 'error')
      return false
    }
  }

  calculateSummary() {
    const results = this.reportData.testResults
    let totalTests = 0
    let passedTests = 0

    // Count functional tests
    if (results.functional) {
      totalTests += 5 // 5 main functional tests
      if (results.functional.passed) passedTests += 5
    }

    // Count performance tests
    if (results.performance) {
      totalTests += 5 // 5 main performance metrics
      if (results.performance.passed) passedTests += 5
    }

    // Count cross-platform tests
    if (results.crossPlatform) {
      const cpTests = Object.keys(results.crossPlatform.details.tests || {})
      totalTests += cpTests.length
      passedTests += cpTests.filter(test => results.crossPlatform.details.tests[test]).length
    }

    this.reportData.summary = {
      totalTests,
      passedTests,
      failedTests: totalTests - passedTests,
      overallScore: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0
    }
  }

  generateHTMLReport() {
    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JLCONE 迁移测试报告</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5em;
        }
        .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 30px;
            background: #f8f9fa;
        }
        .summary-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .summary-card h3 {
            margin: 0 0 10px 0;
            color: #333;
        }
        .summary-card .number {
            font-size: 2em;
            font-weight: bold;
            margin: 10px 0;
        }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .warning { color: #ffc107; }
        .section {
            padding: 30px;
            border-bottom: 1px solid #eee;
        }
        .section:last-child {
            border-bottom: none;
        }
        .section h2 {
            color: #333;
            border-bottom: 2px solid #667eea;
            padding-bottom: 10px;
        }
        .test-result {
            display: flex;
            align-items: center;
            padding: 10px;
            margin: 10px 0;
            border-radius: 4px;
            background: #f8f9fa;
        }
        .test-result.passed {
            background: #d4edda;
            border-left: 4px solid #28a745;
        }
        .test-result.failed {
            background: #f8d7da;
            border-left: 4px solid #dc3545;
        }
        .test-result .icon {
            margin-right: 10px;
            font-size: 1.2em;
        }
        .performance-metrics {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .metric-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #667eea;
        }
        .metric-card h4 {
            margin: 0 0 10px 0;
            color: #333;
        }
        .metric-value {
            font-size: 1.5em;
            font-weight: bold;
            color: #667eea;
        }
        .footer {
            background: #333;
            color: white;
            padding: 20px;
            text-align: center;
        }
        .score-circle {
            width: 100px;
            height: 100px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto;
            font-size: 1.5em;
            font-weight: bold;
            color: white;
        }
        .score-excellent { background: #28a745; }
        .score-good { background: #ffc107; }
        .score-poor { background: #dc3545; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 JLCONE 迁移测试报告</h1>
            <p>Desktop App → EasyChat Front 迁移验证</p>
            <p>生成时间: ${new Date(this.reportData.timestamp).toLocaleString('zh-CN')}</p>
        </div>

        <div class="summary">
            <div class="summary-card">
                <h3>总体评分</h3>
                <div class="score-circle ${this.getScoreClass(this.reportData.summary.overallScore)}">
                    ${this.reportData.summary.overallScore}%
                </div>
            </div>
            <div class="summary-card">
                <h3>测试总数</h3>
                <div class="number">${this.reportData.summary.totalTests}</div>
            </div>
            <div class="summary-card">
                <h3>通过测试</h3>
                <div class="number passed">${this.reportData.summary.passedTests}</div>
            </div>
            <div class="summary-card">
                <h3>失败测试</h3>
                <div class="number failed">${this.reportData.summary.failedTests}</div>
            </div>
        </div>

        <div class="section">
            <h2>🔧 功能测试结果</h2>
            ${this.generateFunctionalTestHTML()}
        </div>

        <div class="section">
            <h2>⚡ 性能测试结果</h2>
            ${this.generatePerformanceTestHTML()}
        </div>

        <div class="section">
            <h2>🌍 跨平台兼容性测试</h2>
            ${this.generateCrossPlatformTestHTML()}
        </div>

        <div class="section">
            <h2>📊 系统信息</h2>
            <div class="performance-metrics">
                <div class="metric-card">
                    <h4>操作系统</h4>
                    <div class="metric-value">${this.reportData.platform}</div>
                </div>
                <div class="metric-card">
                    <h4>架构</h4>
                    <div class="metric-value">${this.reportData.arch}</div>
                </div>
                <div class="metric-card">
                    <h4>Node.js 版本</h4>
                    <div class="metric-value">${this.reportData.nodeVersion}</div>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>© 2024 JLCONE - 桌面应用迁移项目</p>
            <p>此报告由自动化测试系统生成</p>
        </div>
    </div>
</body>
</html>`

    return html
  }

  getScoreClass(score) {
    if (score >= 80) return 'score-excellent'
    if (score >= 60) return 'score-good'
    return 'score-poor'
  }

  generateFunctionalTestHTML() {
    const functional = this.reportData.testResults.functional
    if (!functional) return '<p>功能测试未运行</p>'

    const tests = [
      { name: '文件结构完整性', key: 'fileStructure' },
      { name: 'TypeScript 类型检查', key: 'typecheck' },
      { name: 'ESLint 代码检查', key: 'lint' },
      { name: '生产构建', key: 'build' },
      { name: '开发服务器启动', key: 'devStartup' }
    ]

    return tests.map(test => {
      const passed = functional.details[test.key]
      return `
        <div class="test-result ${passed ? 'passed' : 'failed'}">
            <span class="icon">${passed ? '✅' : '❌'}</span>
            <span>${test.name}: ${passed ? '通过' : '失败'}</span>
        </div>
      `
    }).join('')
  }

  generatePerformanceTestHTML() {
    const performance = this.reportData.testResults.performance
    if (!performance) return '<p>性能测试未运行</p>'

    const details = performance.details
    return `
      <div class="performance-metrics">
        <div class="metric-card">
            <h4>构建时间</h4>
            <div class="metric-value">${(details.buildTime / 1000).toFixed(2)}s</div>
        </div>
        <div class="metric-card">
            <h4>启动时间</h4>
            <div class="metric-value">${(details.startupTime / 1000).toFixed(2)}s</div>
        </div>
        <div class="metric-card">
            <h4>构建大小</h4>
            <div class="metric-value">${this.formatBytes(details.buildSize.total)}</div>
        </div>
        <div class="metric-card">
            <h4>内存使用</h4>
            <div class="metric-value">${this.formatBytes(details.memoryUsage.rss)}</div>
        </div>
      </div>
    `
  }

  generateCrossPlatformTestHTML() {
    const crossPlatform = this.reportData.testResults.crossPlatform
    if (!crossPlatform) return '<p>跨平台测试未运行</p>'

    const tests = [
      { name: '路径处理', key: 'pathHandling' },
      { name: 'Electron 兼容性', key: 'electronCompatibility' },
      { name: 'Node 模块兼容性', key: 'nodeModulesCompatibility' },
      { name: '构建目标', key: 'buildTargets' },
      { name: '环境变量', key: 'environmentVariables' },
      { name: '文件系统权限', key: 'fileSystemPermissions' }
    ]

    return tests.map(test => {
      const passed = crossPlatform.details.tests[test.key]
      return `
        <div class="test-result ${passed ? 'passed' : 'failed'}">
            <span class="icon">${passed ? '✅' : '❌'}</span>
            <span>${test.name}: ${passed ? '通过' : '失败'}</span>
        </div>
      `
    }).join('')
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  async saveReports() {
    const reportsDir = path.join(process.cwd(), 'test-reports')
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true })
    }

    // Save JSON report
    const jsonReport = JSON.stringify(this.reportData, null, 2)
    const jsonPath = path.join(reportsDir, 'test-report.json')
    fs.writeFileSync(jsonPath, jsonReport)
    this.log(`✅ JSON 报告已保存: ${jsonPath}`, 'success')

    // Save HTML report
    const htmlReport = this.generateHTMLReport()
    const htmlPath = path.join(reportsDir, 'test-report.html')
    fs.writeFileSync(htmlPath, htmlReport)
    this.log(`✅ HTML 报告已保存: ${htmlPath}`, 'success')

    return { jsonPath, htmlPath }
  }

  generateSummary() {
    this.log('\n=== 📋 迁移测试总结报告 ===', 'info')
    
    const summary = this.reportData.summary
    this.log(`测试时间: ${new Date(this.reportData.timestamp).toLocaleString('zh-CN')}`, 'info')
    this.log(`测试平台: ${this.reportData.platform}-${this.reportData.arch}`, 'info')
    this.log(`Node.js: ${this.reportData.nodeVersion}`, 'info')
    
    this.log(`\n📊 测试统计:`, 'info')
    this.log(`  总测试数: ${summary.totalTests}`, 'info')
    this.log(`  通过测试: ${summary.passedTests}`, 'success')
    this.log(`  失败测试: ${summary.failedTests}`, summary.failedTests > 0 ? 'error' : 'info')
    this.log(`  总体评分: ${summary.overallScore}%`, this.getScoreColor(summary.overallScore))

    // Test category results
    const results = this.reportData.testResults
    this.log(`\n🔍 分类结果:`, 'info')
    this.log(`  功能测试: ${results.functional?.passed ? '✅ 通过' : '❌ 失败'}`, results.functional?.passed ? 'success' : 'error')
    this.log(`  性能测试: ${results.performance?.passed ? '✅ 通过' : '❌ 失败'}`, results.performance?.passed ? 'success' : 'error')
    this.log(`  兼容性测试: ${results.crossPlatform?.passed ? '✅ 通过' : '❌ 失败'}`, results.crossPlatform?.passed ? 'success' : 'error')

    // Overall assessment
    this.log(`\n🎯 迁移评估:`, 'info')
    if (summary.overallScore >= 90) {
      this.log('🎉 迁移质量优秀！所有核心功能正常，性能表现出色。', 'success')
    } else if (summary.overallScore >= 80) {
      this.log('✅ 迁移质量良好！大部分功能正常，少量问题需要关注。', 'success')
    } else if (summary.overallScore >= 70) {
      this.log('⚠️ 迁移基本成功！存在一些问题需要修复。', 'warning')
    } else {
      this.log('❌ 迁移存在重大问题！需要进一步修复和优化。', 'error')
    }

    return summary.overallScore >= 70
  }

  getScoreColor(score) {
    if (score >= 80) return 'success'
    if (score >= 60) return 'warning'
    return 'error'
  }

  async run() {
    this.log('🚀 开始生成完整测试报告...', 'info')
    
    try {
      // Run all tests
      const success = await this.runAllTests()
      
      if (!success) {
        this.log('❌ 测试运行失败', 'error')
        return false
      }

      // Save reports
      await this.saveReports()
      
      // Generate summary
      const overallSuccess = this.generateSummary()
      
      return overallSuccess
    } catch (error) {
      this.log(`❌ 报告生成失败: ${error.message}`, 'error')
      return false
    }
  }
}

// Run if called directly
if (require.main === module) {
  const generator = new TestReportGenerator()
  generator.run().then(success => {
    process.exit(success ? 0 : 1)
  }).catch(error => {
    console.error('Test report generation failed:', error)
    process.exit(1)
  })
}

module.exports = TestReportGenerator