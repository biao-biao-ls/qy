#!/usr/bin/env node

/**
 * Before Build Script
 * 在构建前执行的脚本，用于准备构建环境和资源
 */

const fs = require('fs')
const path = require('path')

console.log('🔧 Running before build script...')

// 检查构建输出目录
const outDir = path.join(__dirname, '..', 'out')
if (fs.existsSync(outDir)) {
  console.log('✅ Build output directory exists')
} else {
  console.error('❌ Build output directory not found. Please run build first.')
  process.exit(1)
}

// 检查必要的资源文件
const resourcesDir = path.join(__dirname, '..', 'resources')
const requiredResources = [
  'jlcAssistant256.ico',
  'jlcAssistant512.ico',
  'jlcAssistant512.png',
  'YourAppIcon.icns',
]

for (const resource of requiredResources) {
  const resourcePath = path.join(resourcesDir, resource)
  if (fs.existsSync(resourcePath)) {
    console.log(`✅ Resource found: ${resource}`)
  } else {
    console.warn(`⚠️  Resource missing: ${resource}`)
  }
}

// 创建版本信息文件
const packageJson = require('../package.json')
const versionInfo = {
  version: packageJson.version,
  buildTime: new Date().toISOString(),
  nodeVersion: process.version,
  platform: process.platform,
  arch: process.arch,
}

fs.writeFileSync(path.join(outDir, 'version.json'), JSON.stringify(versionInfo, null, 2))

console.log('✅ Before build script completed successfully')

// 导出函数供 electron-builder 使用
module.exports = async function beforeBuild(context) {
  // 这里可以添加更多的构建前处理逻辑
  return true
}
