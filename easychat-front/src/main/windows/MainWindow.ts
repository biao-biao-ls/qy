/**
 * 主窗口类
 * 重构自原始 MainWindow，简化架构并移除过度抽象
 */

import { BrowserView, BrowserWindow, Rectangle, ipcMain, shell } from 'electron'
import { EventEmitter } from 'events'
import { WindowType } from '../../types/window'
import { TabManager } from '../../main/managers/TabManager'
import { windowLogger } from '../../utils/logger'
import { APP_NAME } from '../../utils/constants'

export class MainWindow extends EventEmitter {
  private window: BrowserWindow
  private tabManager: TabManager
  private isInitialized = false

  constructor(window: BrowserWindow) {
    super()
    this.window = window
    this.tabManager = new TabManager(window)
    this.setupEventHandlers()
    this.setupIpcHandlers()
  }

  /**
   * 初始化主窗口
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // 设置窗口标题
      this.window.setTitle(APP_NAME)

      // 初始化标签页管理器
      await this.tabManager.initialize()

      // 设置窗口事件处理
      this.setupWindowEvents()

      this.isInitialized = true
      windowLogger.info('MainWindow initialized')
    } catch (error) {
      windowLogger.error('Failed to initialize MainWindow', error)
      throw error
    }
  }

  /**
   * 登录成功后的初始化
   */
  public async initOnLoginSuccess(): Promise<void> {
    try {
      // 创建默认标签页
      await this.createDefaultTabs()

      windowLogger.info('MainWindow initialized after login success')
    } catch (error) {
      windowLogger.error('Failed to initialize MainWindow after login', error)
    }
  }

  /**
   * 创建新标签页
   */
  public async createNewTab(
    url: string,
    options?: { title?: string; isActive?: boolean }
  ): Promise<string> {
    try {
      const tabId = await this.tabManager.createTab({
        url,
        title: options?.title,
        isActive: options?.isActive ?? true,
      })

      windowLogger.info(`New tab created: ${tabId} - ${url}`)
      return tabId
    } catch (error) {
      windowLogger.error('Failed to create new tab', error)
      throw error
    }
  }

  /**
   * 关闭标签页
   */
  public async closeTab(tabId: string): Promise<void> {
    try {
      await this.tabManager.removeTab(tabId)
      windowLogger.info(`Tab closed: ${tabId}`)
    } catch (error) {
      windowLogger.error('Failed to close tab', error)
      throw error
    }
  }

  /**
   * 切换标签页
   */
  public async switchTab(tabId: string): Promise<void> {
    try {
      await this.tabManager.switchTab(tabId)
      windowLogger.info(`Switched to tab: ${tabId}`)
    } catch (error) {
      windowLogger.error('Failed to switch tab', error)
      throw error
    }
  }

  /**
   * 获取所有标签页
   */
  public getTabs(): any[] {
    return this.tabManager.getAllTabs()
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
   * 最大化切换
   */
  public maximizeToggle(): void {
    if (this.window.isMaximized()) {
      this.window.unmaximize()
    } else {
      this.window.maximize()
    }
  }

  /**
   * 获取是否最大化
   */
  public getIsMaximized(): boolean {
    return this.window.isMaximized()
  }

  /**
   * 最小化窗口
   */
  public minimize(): void {
    this.window.minimize()
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

    // 窗口最大化/恢复事件
    this.window.on('maximize', () => {
      this.emit('maximized')
    })

    this.window.on('unmaximize', () => {
      this.emit('unmaximized')
    })

    // 窗口最小化/恢复事件
    this.window.on('minimize', () => {
      this.emit('minimized')
    })

    this.window.on('restore', () => {
      this.emit('restored')
    })
  }

  /**
   * 设置窗口事件
   */
  private setupWindowEvents(): void {
    // 设置窗口打开处理器
    this.window.webContents.setWindowOpenHandler(details => {
      return this.handleWindowOpen(details)
    })

    // 页面标题更新
    this.window.webContents.on('page-title-updated', (event, title) => {
      this.handlePageTitleUpdate(title)
    })
  }

  /**
   * 设置 IPC 处理器
   */
  private setupIpcHandlers(): void {
    // 窗口控制
    ipcMain.handle('window:minimize', () => {
      this.minimize()
    })

    ipcMain.handle('window:maximize', () => {
      this.maximizeToggle()
    })

    ipcMain.handle('window:close', () => {
      this.window.close()
    })

    // 标签页管理已移至全局 IPC 处理器

    // 配置获取
    ipcMain.handle('app:getConfig', () => {
      return {
        env: process.env.NODE_ENV || 'production',
        version: process.env.npm_package_version || '1.0.13',
      }
    })
  }

  /**
   * 处理窗口打开请求
   */
  private handleWindowOpen(details: Electron.HandlerDetails): { action: 'allow' | 'deny' } {
    const { url } = details

    // 检查是否为推送消息URL
    if (url.includes('jlcone-push-notification=1')) {
      const cleanUrl = url.replace(/[?&]jlcone-push-notification=1/, '')
      this.createNewTab(cleanUrl)
      return { action: 'deny' }
    }

    // 检查是否为允许的域名
    const allowedDomains = [
      'jlcpcb.com',
      'jlcmc.com',
      'jlc3dp.com',
      'jlccnc.com',
      'jlcdfm.com',
      'lcsc.com',
    ]
    const isAllowedDomain = allowedDomains.some(domain => url.includes(domain))

    if (isAllowedDomain) {
      // 在新标签页中打开
      this.createNewTab(url)
      return { action: 'deny' }
    }

    // 其他URL使用外部浏览器打开
    shell.openExternal(url)
    return { action: 'deny' }
  }

  /**
   * 处理页面标题更新
   */
  private handlePageTitleUpdate(title: string): void {
    // 处理登录回调
    if (title === 'jlcone-google-login' || title === 'jlcone-apple-login') {
      windowLogger.info(`Login callback detected: ${title}`)
      // 发送登录成功消息
      this.emit('loginSuccess', { method: title.replace('jlcone-', '').replace('-login', '') })
    }

    if (title === 'jlcone-logout') {
      windowLogger.info('Logout detected')
      this.emit('logout')
    }
  }

  /**
   * 创建默认标签页
   */
  private async createDefaultTabs(): Promise<void> {
    try {
      // 创建默认的首页标签
      await this.createNewTab('https://jlcpcb.com', {
        title: 'JLCPCB',
        isActive: true,
      })
    } catch (error) {
      windowLogger.error('Failed to create default tabs', error)
    }
  }

  /**
   * 清理资源
   */
  private cleanup(): void {
    this.tabManager.destroy()
    this.removeAllListeners()
    windowLogger.info('MainWindow cleaned up')
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
