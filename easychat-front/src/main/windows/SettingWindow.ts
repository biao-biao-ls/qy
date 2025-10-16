/**
 * 设置窗口类
 * 重构自原始 SettingWindow，简化架构
 */

import { BrowserWindow, dialog, ipcMain, session } from 'electron'
import { EventEmitter } from 'events'
import { AppConfig } from '../config/AppConfig'
import { windowLogger } from '../../utils/logger'

export class SettingWindow extends EventEmitter {
  private window: BrowserWindow
  private appConfig: AppConfig
  private isInitialized = false

  constructor(window: BrowserWindow) {
    super()
    this.window = window
    this.appConfig = AppConfig.getInstance()
    this.setupEventHandlers()
    this.setupIpcHandlers()
  }

  /**
   * 初始化设置窗口
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // 设置窗口标题
      this.window.setTitle('JLCONE - 设置')

      // 设置窗口为模态窗口
      this.window.setAlwaysOnTop(true)

      this.isInitialized = true
      windowLogger.info('SettingWindow initialized')
    } catch (error) {
      windowLogger.error('Failed to initialize SettingWindow', error)
      throw error
    }
  }

  /**
   * 显示/隐藏窗口
   */
  public showPanel(show: boolean): void {
    if (show) {
      this.window.show()
      this.window.focus()
    } else {
      this.window.hide()
    }
  }

  /**
   * 获取 BrowserWindow 实例
   */
  public getBrowserWindow(): BrowserWindow {
    return this.window
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    // 窗口关闭事件
    this.window.on('closed', () => {
      this.cleanup()
    })

    // 窗口显示事件
    this.window.on('show', () => {
      windowLogger.debug('SettingWindow shown')
    })

    // 窗口隐藏事件
    this.window.on('hide', () => {
      windowLogger.debug('SettingWindow hidden')
    })
  }

  /**
   * 设置 IPC 处理器
   */
  private setupIpcHandlers(): void {
    // 获取当前配置
    ipcMain.handle('setting:getConfig', async () => {
      try {
        const config = this.appConfig.getAll()
        windowLogger.debug('Config retrieved for settings')
        return config
      } catch (error) {
        windowLogger.error('Failed to get config for settings', error)
        throw error
      }
    })

    // 更新配置
    ipcMain.handle('setting:updateConfig', async (event, key: string, value: any) => {
      try {
        this.appConfig.set(key as any, value)
        windowLogger.info(`Config updated: ${key}`)
        this.emit('configUpdated', key, value)
        return true
      } catch (error) {
        windowLogger.error(`Failed to update config: ${key}`, error)
        throw error
      }
    })

    // 重置配置
    ipcMain.handle('setting:resetConfig', async () => {
      try {
        await this.showResetConfirmDialog()
      } catch (error) {
        windowLogger.error('Failed to reset config', error)
        throw error
      }
    })

    // 选择下载路径
    ipcMain.handle('setting:selectDownloadPath', async () => {
      try {
        return await this.selectDownloadPath()
      } catch (error) {
        windowLogger.error('Failed to select download path', error)
        throw error
      }
    })

    // 设置代理
    ipcMain.handle('setting:setProxy', async (event, proxyConfig) => {
      try {
        await this.setProxy(proxyConfig)
        windowLogger.info('Proxy configuration updated')
        return true
      } catch (error) {
        windowLogger.error('Failed to set proxy', error)
        throw error
      }
    })

    // 获取系统语言
    ipcMain.handle('setting:getSystemLanguage', async () => {
      try {
        // 简化的系统语言获取
        const locale = Intl.DateTimeFormat().resolvedOptions().locale
        return locale
      } catch (error) {
        windowLogger.error('Failed to get system language', error)
        return 'en-US'
      }
    })

    // 获取当前语言
    ipcMain.handle('setting:getCurrentLanguage', async () => {
      try {
        const config = this.appConfig.getAll()
        return config.preferences.language
      } catch (error) {
        windowLogger.error('Failed to get current language', error)
        return 'en'
      }
    })
  }

  /**
   * 显示重置确认对话框
   */
  private async showResetConfirmDialog(): Promise<void> {
    const result = await dialog.showMessageBox(this.window, {
      type: 'warning',
      title: '警告',
      message: '确定要重置所有设置吗？',
      detail: '此操作将清除所有自定义设置并恢复默认值，且无法撤销。',
      buttons: ['取消', '重置'],
      defaultId: 0,
      cancelId: 0,
    })

    if ((result as any).response === 1) {
      await this.appConfig.reset()
      windowLogger.info('Configuration reset by user')
      this.emit('configReset')
    }
  }

  /**
   * 选择下载路径
   */
  private async selectDownloadPath(): Promise<string> {
    // 临时取消置顶状态
    this.window.setAlwaysOnTop(false)

    try {
      const result = await dialog.showOpenDialog(this.window, {
        title: '选择默认下载位置',
        properties: ['openDirectory'],
        defaultPath: this.appConfig.getDownloadsPath(),
      })

      const dialogResult = result as any
      if (!dialogResult.canceled && dialogResult.filePaths && dialogResult.filePaths.length > 0) {
        const selectedPath = dialogResult.filePaths[0]

        if (selectedPath) {
          // 更新配置
          this.appConfig.setDownloadsPath(selectedPath)
          return selectedPath
        }
      }

      return ''
    } finally {
      // 恢复置顶状态
      this.window.setAlwaysOnTop(true)
    }
  }

  /**
   * 设置代理
   */
  private async setProxy(proxyConfig: any): Promise<void> {
    try {
      let proxyRules = ''

      if (proxyConfig && proxyConfig.host && proxyConfig.port) {
        const { type, host, port, username, password } = proxyConfig

        if (username && password) {
          proxyRules = `${type}://${username}:${password}@${host}:${port}`
        } else {
          proxyRules = `${type}://${host}:${port}`
        }
      }

      // 设置代理
      await session.defaultSession.setProxy({
        proxyRules,
        proxyBypassRules: 'localhost,127.0.0.1',
      })

      // 强制重新加载代理配置
      session.defaultSession.forceReloadProxyConfig()

      // 保存代理配置
      const networkConfig = this.appConfig.get('network')
      this.appConfig.set('network', {
        ...networkConfig,
        proxy: proxyConfig,
      })

      windowLogger.info(`Proxy set: ${proxyRules || 'disabled'}`)
    } catch (error) {
      windowLogger.error('Failed to set proxy', error)
      throw error
    }
  }

  /**
   * 清理资源
   */
  private cleanup(): void {
    this.removeAllListeners()
    windowLogger.info('SettingWindow cleaned up')
  }

  /**
   * 销毁窗口
   */
  public destroy(): void {
    if (!this.window.isDestroyed()) {
      this.window.close()
    }
    this.cleanup()
  }
}
