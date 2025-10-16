#!/usr/bin/env node

/**
 * After Pack Script
 * 在打包后执行的脚本，用于后处理和优化
 */

const fs = require('fs')
const path = require('path')

exports.default = async function (context) {
  console.log('🔧 Running after pack script...')

  const { electronPlatformName, appOutDir } = context

  console.log(`📦 Platform: ${electronPlatformName}`)
  console.log(`📁 Output directory: ${appOutDir}`)

  // 平台特定的后处理
  switch (electronPlatformName) {
    case 'win32':
      await handleWindowsPostPack(appOutDir)
      break
    case 'darwin':
      await handleMacPostPack(appOutDir)
      break
    case 'linux':
      await handleLinuxPostPack(appOutDir)
      break
  }

  console.log('✅ After pack script completed successfully')
}

async function handleWindowsPostPack(appOutDir) {
  console.log('🪟 Processing Windows package...')

  // 可以在这里添加 Windows 特定的后处理逻辑
  // 例如：添加额外的 DLL 文件、修改注册表等
}

async function handleMacPostPack(appOutDir) {
  console.log('🍎 Processing macOS package...')

  // 可以在这里添加 macOS 特定的后处理逻辑
  // 例如：设置权限、添加额外的框架等
}

async function handleLinuxPostPack(appOutDir) {
  console.log('🐧 Processing Linux package...')

  // 可以在这里添加 Linux 特定的后处理逻辑
  // 例如：设置权限、创建符号链接等
}
