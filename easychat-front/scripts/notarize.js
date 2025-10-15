#!/usr/bin/env node

/**
 * Notarize Script for macOS
 * macOS 公证脚本，用于 App Store 分发
 */

const { notarize } = require('@electron/notarize')

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context
  
  // 只在 macOS 平台执行公证
  if (electronPlatformName !== 'darwin') {
    return
  }
  
  // 检查是否有公证所需的环境变量
  if (!process.env.APPLE_ID || !process.env.APPLE_ID_PASS) {
    console.log('⚠️  Skipping notarization: APPLE_ID or APPLE_ID_PASS not set')
    return
  }
  
  console.log('🍎 Starting macOS notarization...')
  
  const appName = context.packager.appInfo.productFilename
  const appPath = `${appOutDir}/${appName}.app`
  
  try {
    await notarize({
      appBundleId: 'com.jlcpcb.www',
      appPath: appPath,
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_ID_PASS,
      teamId: process.env.APPLE_TEAM_ID,
    })
    
    console.log('✅ Notarization completed successfully')
  } catch (error) {
    console.error('❌ Notarization failed:', error)
    throw error
  }
}