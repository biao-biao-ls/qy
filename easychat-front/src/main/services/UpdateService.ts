import { UpdateInfo, autoUpdater } from 'electron-updater'
import { BrowserWindow, app, ipcMain } from 'electron'
import { updateLogger } from '../../utils/logger'
import { AppConfig } from '../config/AppConfig'
import { UpdateLogService } from './UpdateLogService'
import { UpdateRollbackService } from './UpdateRollbackService'

/**
 * 更新检查响应接口
 */
export interface UpdateCheckResponse {
  success: boolean
  code: number
  message: string | null
  data: {
    bizKey: string
    platform: string
    versionCode: string
    forceUpdate: boolean
    updateContent: string
    updateUrl: string
    versionStatus: number
  }
}

/**
 * 应用更新信息接口
 */
export interface AppUpdateInfo {
  hasUpdate: boolean
  forceUpdate: boolean
  version: string
  updateContent: string
  updateUrl: string
  platform: string
}

/**
 * 更新进度信息接口
 */
export interface UpdateProgress {
  bytesPerSecond: number
  percent: number
  transferred: number
  total: number
}

/**
 * 更新服务类
 * 负责检查版本更新和处理更新逻辑
 */
export class UpdateService {
  private static instance: UpdateService
  private mainWindow: BrowserWindow | null = null
  private isChecking = false
  private isDownloading = false
  private updateLogService: UpdateLogService
  private rollbackService: UpdateRollbackService
  private downloadStartTime: number = 0

  private constructor() {
    this.updateLogService = UpdateLogService.getInstance()
    this.rollbackService = UpdateRollbackService.getInstance()
    this.setupAutoUpdater()
  }

  public static getInstance(): UpdateService {
    if (!UpdateService.instance) {
      UpdateService.instance = new UpdateService()
    }
    return UpdateService.instance
  }

  /**
   * 初始化更新服务
   */
  public async initialize(): Promise<void> {
    await this.updateLogService.initialize()
    await this.rollbackService.initialize()
    updateLogger.info('UpdateService: 初始化完成')
  }

  /**
   * 设置主窗口引用
   */
  public setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window
  }

  /**
   * 设置 electron-updater 配置
   */
  private setupAutoUpdater(): void {
    // 配置更新服务器
    autoUpdater.setFeedURL({
      provider: 'generic',
      url: this.getFeedURL(),
    })

    // 配置更新选项
    autoUpdater.autoDownload = false // 不自动下载，让用户选择
    autoUpdater.autoInstallOnAppQuit = true // 退出时自动安装

    // 监听更新事件
    autoUpdater.on('checking-for-update', () => {
      updateLogger.info('UpdateService: 正在检查更新...')
      this.sendToRenderer('update-checking')
    })

    autoUpdater.on('update-available', async (info: UpdateInfo) => {
      updateLogger.info('UpdateService: 发现新版本', info.version)

      // 记录发现新版本
      await this.updateLogService.logCheck(true, `发现新版本 ${info.version}`)

      this.sendToRenderer('update-available', {
        version: info.version,
        releaseNotes: info.releaseNotes,
        releaseDate: info.releaseDate,
      })
    })

    autoUpdater.on('update-not-available', async () => {
      updateLogger.info('UpdateService: 当前已是最新版本')

      // 记录无更新可用
      await this.updateLogService.logCheck(true, '当前已是最新版本')

      this.sendToRenderer('update-not-available')
    })

    autoUpdater.on('error', error => {
      updateLogger.error('UpdateService: 更新检查失败', error)
      this.sendToRenderer('update-error', error.message)
      this.isChecking = false
      this.isDownloading = false
    })

    autoUpdater.on('download-progress', progress => {
      const progressInfo: UpdateProgress = {
        bytesPerSecond: progress.bytesPerSecond,
        percent: Math.round(progress.percent),
        transferred: progress.transferred,
        total: progress.total,
      }
      updateLogger.info('UpdateService: 下载进度', `${progressInfo.percent}%`)
      this.sendToRenderer('update-download-progress', progressInfo)
    })

    autoUpdater.on('update-downloaded', async (info: UpdateInfo) => {
      updateLogger.info('UpdateService: 更新下载完成')
      this.isDownloading = false

      // 记录下载完成
      const duration = Date.now() - this.downloadStartTime
      await this.updateLogService.logDownload(
        info.version,
        true,
        `版本 ${info.version} 下载完成`,
        duration
      )

      this.sendToRenderer('update-downloaded')
    })
  }

  /**
   * 检查更新
   */
  public async checkForUpdates(): Promise<boolean> {
    if (this.isChecking) {
      updateLogger.warn('UpdateService: 正在检查更新中，请勿重复操作')
      return false
    }

    try {
      this.isChecking = true
      updateLogger.info('UpdateService: 开始检查更新')

      // 记录检查开始
      await this.updateLogService.logCheck(true, '开始检查更新')

      // 使用 electron-updater 检查更新
      await autoUpdater.checkForUpdates()
      return true
    } catch (error) {
      updateLogger.error('UpdateService: 检查更新失败', error)
      this.isChecking = false

      // 记录检查失败
      await this.updateLogService.logCheck(
        false,
        '检查更新失败',
        error instanceof Error ? error.message : String(error)
      )

      return false
    }
  }

  /**
   * 检查自定义更新服务器
   */
  public async checkCustomUpdate(): Promise<AppUpdateInfo> {
    const currentVersion = this.getCurrentVersion()
    const platform = this.getCurrentPlatform()

    // 这里可以配置自定义的更新检查 API
    const checkUrl = 'https://lceda.cn/api/jlcOrderClientVersion/'

    try {
      updateLogger.info('UpdateService: 检查自定义更新服务器', checkUrl)

      const response = await fetch(checkUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'JLCONE-Desktop',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(`API Error: ${result.message || 'Unknown error'}`)
      }

      // 解析版本信息
      const versionInfo: Record<string, string> = {}
      result.result.forEach((item: any) => {
        versionInfo[item.keyword] = item.value
      })

      const minVersion = versionInfo.jlcOrderClientMinVersion || '0.0.0'
      const forceUpdate = this.compareVersions(currentVersion, minVersion) < 0

      let newVersion = currentVersion
      switch (process.platform) {
        case 'win32':
          newVersion = versionInfo.jlcOrderClientWindows64 || currentVersion
          break
        case 'darwin':
          newVersion = versionInfo.jlcOrderClientMac64 || currentVersion
          break
        case 'linux':
          newVersion = versionInfo.jlcOrderClientLinux64 || currentVersion
          break
      }

      const hasUpdate = this.compareVersions(currentVersion, newVersion) < 0

      return {
        hasUpdate: hasUpdate || forceUpdate,
        forceUpdate,
        version: newVersion,
        updateContent: forceUpdate ? '您的版本过低，需要强制更新' : '发现新版本，建议更新',
        updateUrl: 'https://www.jlc.com',
        platform,
      }
    } catch (error) {
      updateLogger.error('UpdateService: 自定义更新检查失败', error)
      return {
        hasUpdate: false,
        forceUpdate: false,
        version: '',
        updateContent: '',
        updateUrl: '',
        platform,
      }
    }
  }

  /**
   * 下载更新
   */
  public async downloadUpdate(): Promise<boolean> {
    if (this.isDownloading) {
      updateLogger.warn('UpdateService: 正在下载更新中，请勿重复操作')
      return false
    }

    try {
      this.isDownloading = true
      this.downloadStartTime = Date.now()
      updateLogger.info('UpdateService: 开始下载更新')

      await autoUpdater.downloadUpdate()
      return true
    } catch (error) {
      updateLogger.error('UpdateService: 下载更新失败', error)
      this.isDownloading = false

      // 记录下载失败
      const duration = Date.now() - this.downloadStartTime
      await this.updateLogService.logDownload(
        'unknown',
        false,
        '下载更新失败',
        duration,
        error instanceof Error ? error.message : String(error)
      )

      return false
    }
  }

  /**
   * 安装更新并重启应用
   */
  public async installUpdate(): Promise<void> {
    const currentVersion = this.getCurrentVersion()

    try {
      updateLogger.info('UpdateService: 安装更新并重启应用')

      // 创建当前版本的备份
      await this.rollbackService.createBackup(currentVersion)

      // 记录安装开始
      await this.updateLogService.logInstall(currentVersion, 'updating', true, '开始安装更新')

      // 安装更新并重启
      autoUpdater.quitAndInstall()
    } catch (error) {
      updateLogger.error('UpdateService: 安装更新失败', error)

      // 记录安装失败
      await this.updateLogService.logInstall(
        currentVersion,
        'failed',
        false,
        '安装更新失败',
        0,
        error instanceof Error ? error.message : String(error)
      )

      throw error
    }
  }

  /**
   * 获取当前版本
   */
  public getCurrentVersion(): string {
    try {
      // 优先从配置获取版本号
      const configVersion = AppConfig.getInstance().get('version')
      if (configVersion) {
        return configVersion
      }

      // 从 package.json 获取版本
      const packageJson = require('../../../package.json')
      return packageJson.version || '1.0.0'
    } catch (error) {
      updateLogger.error('UpdateService: 获取当前版本失败', error)
      return '1.0.0'
    }
  }

  /**
   * 获取当前平台
   */
  private getCurrentPlatform(): string {
    switch (process.platform) {
      case 'win32':
        return 'windows'
      case 'darwin':
        return process.arch === 'arm64' ? 'macos(m)' : 'macos(intel)'
      case 'linux':
        return 'linux'
      default:
        return 'windows'
    }
  }

  /**
   * 比较版本号
   */
  private compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split('.').map(Number)
    const v2Parts = version2.split('.').map(Number)

    const maxLength = Math.max(v1Parts.length, v2Parts.length)

    for (let i = 0; i < maxLength; i++) {
      const v1Part = v1Parts[i] || 0
      const v2Part = v2Parts[i] || 0

      if (v1Part > v2Part) return 1
      if (v1Part < v2Part) return -1
    }

    return 0
  }

  /**
   * 获取更新服务器 URL
   */
  private getFeedURL(): string {
    // 开发环境可以配置本地调试服务器
    if (process.env.NODE_ENV === 'development') {
      const debugUrl = process.env.DEBUG_UPDATE_URL
      if (debugUrl) {
        updateLogger.info('UpdateService: 使用调试更新服务器', debugUrl)
        return debugUrl
      }
    }

    // 根据平台返回对应的更新服务器 URL
    const baseUrl = 'https://test-static.jlcpcb.com/app_version/package'

    if (process.platform === 'darwin') {
      const isARM = process.arch === 'arm64'
      return isARM ? `${baseUrl}/mac/arm` : `${baseUrl}/mac/intel`
    } else {
      return `${baseUrl}/windows`
    }
  }

  /**
   * 发送消息到渲染进程
   */
  private sendToRenderer(channel: string, data?: any): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(`update:${channel}`, data)
    }
  }
}
