import { BrowserWindow, app } from 'electron'
import { UpdateService, AppUpdateInfo, UpdateProgress } from '../services/UpdateService'
import { UpdateWindow, UpdateWindowType } from '../windows/UpdateWindow'
import { updateLogger } from '../../utils/logger'
import { AppConfig } from '../config/AppConfig'

/**
 * 更新管理器
 * 协调更新检查、下载和安装流程
 */
export class UpdateManager {
  private static instance: UpdateManager
  private updateService: UpdateService
  private updateWindow: UpdateWindow | null = null
  private mainWindow: BrowserWindow | null = null
  private isAutoCheckEnabled = true
  private checkInterval: NodeJS.Timeout | null = null

  private constructor() {
    this.updateService = UpdateService.getInstance()
    this.setupUpdateListeners()
  }

  public static getInstance(): UpdateManager {
    if (!UpdateManager.instance) {
      UpdateManager.instance = new UpdateManager()
    }
    return UpdateManager.instance
  }

  /**
   * 初始化更新管理器
   */
  public async initialize(): Promise<void> {
    await this.updateService.initialize()
    updateLogger.info('UpdateManager: 初始化完成')
  }

  /**
   * 设置主窗口引用
   */
  public setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window
    this.updateService.setMainWindow(window)
  }

  /**
   * 启动自动更新检查
   */
  public startAutoCheck(): void {
    // 检查配置是否启用自动更新
    const autoUpdate = AppConfig.getInstance().get('preferences').autoUpdate
    if (!autoUpdate) {
      updateLogger.info('UpdateManager: 自动更新已禁用')
      return
    }

    this.isAutoCheckEnabled = true
    
    // 应用启动后延迟检查更新
    setTimeout(() => {
      this.checkForUpdates(false) // 静默检查
    }, 5000)

    // 设置定期检查（每4小时检查一次）
    this.checkInterval = setInterval(() => {
      this.checkForUpdates(false)
    }, 4 * 60 * 60 * 1000)

    updateLogger.info('UpdateManager: 启动自动更新检查')
  }

  /**
   * 停止自动更新检查
   */
  public stopAutoCheck(): void {
    this.isAutoCheckEnabled = false
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }

    updateLogger.info('UpdateManager: 停止自动更新检查')
  }

  /**
   * 手动检查更新
   */
  public async checkForUpdates(showNoUpdateDialog = true): Promise<void> {
    try {
      updateLogger.info('UpdateManager: 开始检查更新')

      // 先检查自定义更新服务器
      const customUpdateInfo = await this.updateService.checkCustomUpdate()
      
      if (customUpdateInfo.hasUpdate) {
        this.handleCustomUpdate(customUpdateInfo)
        return
      }

      // 检查 electron-updater
      const hasUpdate = await this.updateService.checkForUpdates()
      
      if (!hasUpdate && showNoUpdateDialog) {
        this.showNoUpdateDialog()
      }
    } catch (error) {
      updateLogger.error('UpdateManager: 检查更新失败', error)
      
      if (showNoUpdateDialog) {
        this.showUpdateError(error instanceof Error ? error.message : '检查更新失败')
      }
    }
  }

  /**
   * 处理自定义更新
   */
  private handleCustomUpdate(updateInfo: AppUpdateInfo): void {
    if (updateInfo.forceUpdate) {
      // 强制更新
      this.showForceUpdateDialog(updateInfo)
    } else {
      // 普通更新提示
      this.showUpdateDialog(updateInfo)
    }
  }

  /**
   * 显示更新对话框
   */
  private showUpdateDialog(updateInfo: AppUpdateInfo): void {
    if (this.updateWindow && !this.updateWindow.isDestroyed()) {
      this.updateWindow.close()
    }

    const message = `发现新版本 ${updateInfo.version}\n\n${updateInfo.updateContent}\n\n是否立即更新？`
    this.updateWindow = UpdateWindow.createUpdateTip(updateInfo.version, message)
  }

  /**
   * 显示强制更新对话框
   */
  private showForceUpdateDialog(updateInfo: AppUpdateInfo): void {
    if (this.updateWindow && !this.updateWindow.isDestroyed()) {
      this.updateWindow.close()
    }

    const message = `您的版本过低，需要立即更新到 ${updateInfo.version}\n\n${updateInfo.updateContent}\n\n请点击确定前往下载页面。`
    this.updateWindow = UpdateWindow.createForceUpdate(updateInfo.version, message)
  }

  /**
   * 显示无更新对话框
   */
  private showNoUpdateDialog(): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('update:no-update-available')
    }
  }

  /**
   * 显示更新错误
   */
  private showUpdateError(message: string): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('update:error', message)
    }
  }

  /**
   * 开始下载更新
   */
  public async startDownload(): Promise<void> {
    try {
      // 显示下载进度窗口
      if (this.updateWindow && !this.updateWindow.isDestroyed()) {
        this.updateWindow.close()
      }
      
      this.updateWindow = UpdateWindow.createDownloadProgress()
      
      // 开始下载
      await this.updateService.downloadUpdate()
    } catch (error) {
      updateLogger.error('UpdateManager: 下载更新失败', error)
      this.showUpdateError('下载更新失败: ' + (error instanceof Error ? error.message : '未知错误'))
    }
  }

  /**
   * 安装更新
   */
  public installUpdate(): void {
    updateLogger.info('UpdateManager: 准备安装更新')
    
    // 关闭更新窗口
    if (this.updateWindow && !this.updateWindow.isDestroyed()) {
      this.updateWindow.close()
    }

    // 安装更新并重启
    this.updateService.installUpdate()
  }

  /**
   * 设置更新监听器
   */
  private setupUpdateListeners(): void {
    // 监听更新服务的事件
    if (this.mainWindow) {
      this.mainWindow.webContents.on('ipc-message', (event, channel, ...args) => {
        switch (channel) {
          case 'update:checking':
            updateLogger.info('UpdateManager: 正在检查更新...')
            break
            
          case 'update:available':
            const updateInfo = args[0]
            updateLogger.info('UpdateManager: 发现新版本', updateInfo.version)
            this.handleElectronUpdate(updateInfo)
            break
            
          case 'update:not-available':
            updateLogger.info('UpdateManager: 当前已是最新版本')
            break
            
          case 'update:error':
            const error = args[0]
            updateLogger.error('UpdateManager: 更新错误', error)
            break
            
          case 'update:download-progress':
            const progress = args[0] as UpdateProgress
            this.handleDownloadProgress(progress)
            break
            
          case 'update:downloaded':
            updateLogger.info('UpdateManager: 更新下载完成')
            this.handleUpdateDownloaded()
            break
        }
      })
    }
  }

  /**
   * 处理 electron-updater 的更新
   */
  private handleElectronUpdate(updateInfo: any): void {
    const message = `发现新版本 ${updateInfo.version}\n\n${updateInfo.releaseNotes || '新版本已发布'}\n\n是否立即下载？`
    
    if (this.updateWindow && !this.updateWindow.isDestroyed()) {
      this.updateWindow.close()
    }
    
    this.updateWindow = UpdateWindow.createUpdateTip(updateInfo.version, message)
  }

  /**
   * 处理下载进度
   */
  private handleDownloadProgress(progress: UpdateProgress): void {
    if (this.updateWindow && !this.updateWindow.isDestroyed()) {
      this.updateWindow.updateOptions({
        progress: progress.percent,
        message: `正在下载更新... ${progress.percent}%`
      })
    }
  }

  /**
   * 处理更新下载完成
   */
  private handleUpdateDownloaded(): void {
    if (this.updateWindow && !this.updateWindow.isDestroyed()) {
      this.updateWindow.updateOptions({
        type: 'update-tip',
        title: '更新下载完成',
        message: '更新已下载完成，是否立即重启应用以完成更新？',
        progress: 100
      })
    }
  }

  /**
   * 获取当前版本
   */
  public getCurrentVersion(): string {
    return this.updateService.getCurrentVersion()
  }

  /**
   * 清理资源
   */
  public cleanup(): void {
    this.stopAutoCheck()
    
    if (this.updateWindow && !this.updateWindow.isDestroyed()) {
      this.updateWindow.close()
    }
  }
}