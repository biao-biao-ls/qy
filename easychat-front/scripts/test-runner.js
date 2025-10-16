#!/usr/bin/env node

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

class TestRunner {
  constructor() {
    this.results = {
      unit: { passed: 0, failed: 0, total: 0 },
      integration: { passed: 0, failed: 0, total: 0 },
      e2e: { passed: 0, failed: 0, total: 0 },
      performance: { passed: 0, failed: 0, total: 0 }
    }
    this.startTime = Date.now()
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString()
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      error: '\x1b[31m',
      warning: '\x1b[33m',
      reset: '\x1b[0m'
    }
    
    console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`)
  }

  async runCommand(command, description) {
    this.log(`Running: ${description}`)
    try {
      const output = execSync(command, { 
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 300000 // 5 minutes timeout
      })
      this.log(`✓ ${description} completed successfully`, 'success')
      return { success: true, output }
    } catch (error) {
      this.log(`✗ ${description} failed: ${error.message}`, 'error')
      return { success: false, error: error.message, output: error.stdout }
    }
  }

  async runUnitTests() {
    this.log('Starting unit tests...', 'info')
    
    // Run Vitest for renderer tests
    const vitestResult = await this.runCommand(
      'npm run test -- --reporter=json --outputFile=test-results/vitest-results.json',
      'Vitest unit tests'
    )
    
    // Run Jest for main process tests
    const jestResult = await this.runCommand(
      'npm run test:electron -- --json --outputFile=test-results/jest-results.json',
      'Jest Electron tests'
    )
    
    return vitestResult.success && jestResult.success
  }

  async runIntegrationTests() {
    this.log('Starting integration tests...', 'info')
    
    const result = await this.runCommand(
      'npm run test:electron -- --testPathPattern=integration --json --outputFile=test-results/integration-results.json',
      'Integration tests'
    )
    
    return result.success
  }

  async runE2ETests() {
    this.log('Starting E2E tests...', 'info')
    
    // Build the application first
    const buildResult = await this.runCommand(
      'npm run build',
      'Building application for E2E tests'
    )
    
    if (!buildResult.success) {
      this.log('Build failed, skipping E2E tests', 'warning')
      return false
    }
    
    const e2eResult = await this.runCommand(
      'npm run test:e2e -- --reporter=json --output-file=test-results/playwright-results.json',
      'Playwright E2E tests'
    )
    
    return e2eResult.success
  }

  async runPerformanceTests() {
    this.log('Starting performance tests...', 'info')
    
    const result = await this.runCommand(
      'npm run test:electron -- --testPathPattern=performance --json --outputFile=test-results/performance-results.json',
      'Performance tests'
    )
    
    return result.success
  }

  async checkBuildIntegrity() {
    this.log('Checking build integrity...', 'info')
    
    const buildResult = await this.runCommand(
      'npm run build',
      'Production build'
    )
    
    if (!buildResult.success) {
      return false
    }
    
    // Check if output files exist
    const outputDir = path.join(process.cwd(), 'out')
    const requiredFiles = [
      'main/index.js',
      'preload/index.js',
      'renderer/index.html'
    ]
    
    for (const file of requiredFiles) {
      const filePath = path.join(outputDir, file)
      if (!fs.existsSync(filePath)) {
        this.log(`Missing required build file: ${file}`, 'error')
        return false
      }
    }
    
    this.log('Build integrity check passed', 'success')
    return true
  }

  async checkCrossPlatformCompatibility() {
    this.log('Checking cross-platform compatibility...', 'info')
    
    // Check TypeScript compilation
    const typecheckResult = await this.runCommand(
      'npm run typecheck',
      'TypeScript type checking'
    )
    
    // Check linting
    const lintResult = await this.runCommand(
      'npm run lint',
      'ESLint checking'
    )
    
    return typecheckResult.success && lintResult.success
  }

  generateReport() {
    const endTime = Date.now()
    const duration = (endTime - this.startTime) / 1000
    
    this.log('\n=== Test Results Summary ===', 'info')
    this.log(`Total execution time: ${duration.toFixed(2)}s`, 'info')
    
    let totalPassed = 0
    let totalFailed = 0
    let totalTests = 0
    
    Object.entries(this.results).forEach(([category, results]) => {
      this.log(`${category.toUpperCase()}: ${results.passed}/${results.total} passed`, 
        results.failed > 0 ? 'warning' : 'success')
      totalPassed += results.passed
      totalFailed += results.failed
      totalTests += results.total
    })
    
    this.log(`\nOVERALL: ${totalPassed}/${totalTests} tests passed`, 
      totalFailed > 0 ? 'error' : 'success')
    
    if (totalFailed > 0) {
      this.log(`${totalFailed} tests failed`, 'error')
      process.exit(1)
    } else {
      this.log('All tests passed!', 'success')
      process.exit(0)
    }
  }

  async run() {
    this.log('Starting comprehensive test suite...', 'info')
    
    // Create test results directory
    const resultsDir = path.join(process.cwd(), 'test-results')
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true })
    }
    
    // Run all test categories
    const testCategories = [
      { name: 'unit', runner: () => this.runUnitTests() },
      { name: 'integration', runner: () => this.runIntegrationTests() },
      { name: 'e2e', runner: () => this.runE2ETests() },
      { name: 'performance', runner: () => this.runPerformanceTests() }
    ]
    
    for (const category of testCategories) {
      try {
        const success = await category.runner()
        this.results[category.name].passed = success ? 1 : 0
        this.results[category.name].failed = success ? 0 : 1
        this.results[category.name].total = 1
      } catch (error) {
        this.log(`Error running ${category.name} tests: ${error.message}`, 'error')
        this.results[category.name].failed = 1
        this.results[category.name].total = 1
      }
    }
    
    // Additional checks
    await this.checkBuildIntegrity()
    await this.checkCrossPlatformCompatibility()
    
    this.generateReport()
  }
}

// Run if called directly
if (require.main === module) {
  const runner = new TestRunner()
  runner.run().catch(error => {
    console.error('Test runner failed:', error)
    process.exit(1)
  })
}

module.exports = TestRunner