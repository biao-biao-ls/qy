/**
 * 主进程入口文件
 * 重构自 desktop-app，简化初始化逻辑，采用现代化架构
 */

import {
  BrowserWindow,
  app,
  crashReporter,
  globalShortcut,
  ipcMain,
  nativeImage,
  shell,
} from 'electron'
import { join } from 'path'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { autoUpdater } from 'electron-updater'

// 导入自定义模块
import { WindowManager } from './managers/WindowManager'
import { PushManager } from './managers/PushManager'
import { UpdateManager } from './managers/UpdateManager'
import { AppConfig } from './config/AppConfig'
import { errorLogger, initLogger, mainLogger } from '../utils/logger'
import { APP_NAME, APP_VERSION } from '../utils/constants'
import { AppError, AppState } from '../types/app'
import { WindowType } from '../types/window'
import icon from '../../resources/icon.png?asset'

/**
 * 应用程序主类
 * 管理应用程序的生命周期和核心功能
 */
class Application {
  private windowManager: WindowManager
  private pushManager: PushManager
  private updateManager: UpdateManager
  private appConfig: AppConfig
  private appState: AppState = AppState.INITIALIZING
  private isInitialized = false

  constructor() {
    this.windowManager = WindowManager.getInstance()
    this.updateManager = UpdateManager.getInstance()
    this.appConfig = AppConfig.getInstance()

    // 初始化推送管理器
    this.pushManager = new PushManager({
      websocket: {
        url: 'wss://your-websocket-server.com/ws', // 这里需要配置实际的 WebSocket 服务器地址
        reconnectInterval: 5000,
        maxReconnectAttempts: 5,
        heartbeatInterval: 30000,
      },
      notification: {
        maxConcurrent: 3,
        defaultTimeout: 5000,
        soundEnabled: true,
      },
      storage: {
        maxMessages: 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
      },
      autoReconnect: true,
      offlineMessageDelivery: true,
    })
  }

  /**
   * 初始化应用程序
   */
  async initialize(): Promise<void> {
    try {
      mainLogger.info('开始初始化应用程序')

      // 设置应用程序基本信息
      this.setupAppInfo()

      // 初始化日志系统
      this.initializeLogging()

      // 设置崩溃报告
      this.setupCrashReporter()

      // 配置应用程序选项
      this.configureAppOptions()

      // 处理单例锁
      await this.handleSingleInstance()

      // 加载配置
      await this.loadConfiguration()

      // 设置平台特定配置
      this.setupPlatformSpecific()

      // 注册全局事件处理器
      this.registerGlobalHandlers()

      // 设置自动更新
      this.setupAutoUpdater()

      // 设置全局 IPC 处理器
      this.setupGlobalIpcHandlers()

      // 初始化推送管理器
      await this.initializePushManager()

      this.appState = AppState.READY
      this.isInitialized = true

      mainLogger.info('应用程序初始化完成')
    } catch (error) {
      this.handleInitializationError(error as Error)
      throw error // 重新抛出错误，确保调用者知道初始化失败
    }
  }

  /**
   * 设置应用程序基本信息
   */
  private setupAppInfo(): void {
    electronApp.setAppUserModelId(`com.jlc.${APP_NAME.toLowerCase()}`)

    // 设置用户数据路径
    const userDataPath = app.getPath('userData')
    app.setAppLogsPath(join(userDataPath, 'logs'))

    mainLogger.info(`应用程序: ${APP_NAME} v${APP_VERSION}`)
    mainLogger.info(`用户数据路径: ${userDataPath}`)
    mainLogger.info(`平台: ${process.platform} ${process.arch}`)
  }

  /**
   * 初始化日志系统
   */
  private initializeLogging(): void {
    initLogger()
    mainLogger.info('日志系统初始化完成')
  }

  /**
   * 设置崩溃报告
   */
  private setupCrashReporter(): void {
    crashReporter.start({
      uploadToServer: false,
      productName: APP_NAME,
      companyName: 'Jialichuang',
    })
    mainLogger.info('崩溃报告系统已启用')
  }

  /**
   * 配置应用程序选项
   */
  private configureAppOptions(): void {
    // 禁用密码管理功能
    app.commandLine.appendSwitch(
      'disable-features',
      'PasswordManagerEnable,AutofillServerCommunication'
    )

    // 开发环境配置
    if (is.dev) {
      app.setAppUserModelId(process.execPath)
      mainLogger.info('开发环境配置已应用')
    }
  }

  /**
   * 处理单例锁
   */
  private async handleSingleInstance(): Promise<void> {
    const gotTheLock = app.requestSingleInstanceLock()

    if (!gotTheLock) {
      mainLogger.warn('应用程序已在运行，退出当前实例')
      app.quit()
      return
    }

    app.on('second-instance', () => {
      mainLogger.info('检测到第二个实例，显示现有窗口')
      this.windowManager.showMainWindow()
    })
  }

  /**
   * 加载配置
   */
  private async loadConfiguration(): Promise<void> {
    try {
      await this.appConfig.load()
      mainLogger.info('配置加载完成')
    } catch (error) {
      mainLogger.error('配置加载失败，使用默认配置', error)
      await this.appConfig.reset()
    }
  }

  /**
   * 设置平台特定配置
   */
  private setupPlatformSpecific(): void {
    if (process.platform === 'darwin') {
      // macOS 特定配置
      const dockIcon = nativeImage.createFromPath(icon)
      app.dock?.setIcon(dockIcon)
      mainLogger.info('macOS 平台配置已应用')
    }
  }

  /**
   * 注册全局事件处理器
   */
  private registerGlobalHandlers(): void {
    // 全局异常处理
    process.on('uncaughtException', error => {
      this.handleUncaughtException(error)
    })

    process.on('unhandledRejection', reason => {
      this.handleUnhandledRejection(reason)
    })

    // 应用程序事件
    app.on('window-all-closed', () => {
      this.handleWindowAllClosed()
    })

    app.on('activate', () => {
      this.handleActivate()
    })

    app.on('will-quit', event => {
      event.preventDefault()
      this.handleWillQuit()
        .then(() => {
          app.exit()
        })
        .catch(error => {
          mainLogger.error('应用退出清理失败', error)
          app.exit(1)
        })
    })

    // 协议处理
    app.on('open-url', (event, url) => {
      this.handleDeepLink(url)
    })

    // 浏览器窗口创建事件
    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)

      // 设置开发者工具快捷键（在所有环境中都可用）
      // 注册 F12 快捷键打开开发者工具
      window.webContents.on('before-input-event', (event, input) => {
        if (input.key === 'F12') {
          event.preventDefault()
          if (window.webContents.isDevToolsOpened()) {
            window.webContents.closeDevTools()
          } else {
            window.webContents.openDevTools({ mode: 'detach' })
          }
        }
        // Ctrl+Shift+I (Windows/Linux) 或 Cmd+Option+I (macOS)
        if ((input.control || input.meta) && input.shift && input.key === 'I') {
          event.preventDefault()
          if (window.webContents.isDevToolsOpened()) {
            window.webContents.closeDevTools()
          } else {
            window.webContents.openDevTools({ mode: 'detach' })
          }
        }
      })

      mainLogger.info('开发者工具快捷键已注册 (F12, Ctrl+Shift+I)')
    })

    // Web 内容创建事件
    app.on('web-contents-created', (_, contents) => {
      this.setupWebContents(contents)
    })

    mainLogger.info('全局事件处理器注册完成')
  }

  /**
   * 设置自动更新
   */
  private setupAutoUpdater(): void {
    if (is.dev) {
      mainLogger.info('开发环境，跳过自动更新配置')
      return
    }

    autoUpdater.logger = mainLogger
    autoUpdater.checkForUpdatesAndNotify()
    mainLogger.info('自动更新系统已配置')
  }

  /**
   * 设置全局 IPC 处理器
   */
  private setupGlobalIpcHandlers(): void {
    mainLogger.info('开始设置全局 IPC 处理器')

    // 应用信息
    ipcMain.handle('app:getVersion', () => {
      mainLogger.debug('IPC: app:getVersion called')
      return app.getVersion()
    })

    ipcMain.handle('app:getInfo', () => {
      return {
        name: app.getName(),
        version: app.getVersion(),
        platform: process.platform,
        arch: process.arch,
      }
    })

    // 窗口状态
    ipcMain.handle('window:isMaximized', () => {
      mainLogger.debug('IPC: window:isMaximized called')
      const mainWindow = this.windowManager.getWindowByType(WindowType.MAIN)
      return mainWindow?.isMaximized() || false
    })

    ipcMain.handle('window:setTitle', (_, title: string) => {
      const mainWindow = this.windowManager.getWindowByType(WindowType.MAIN)
      if (mainWindow) {
        mainWindow.setTitle(title)
      }
    })

    // 用户信息
    ipcMain.handle('get-user-info', () => {
      return {
        username: 'User', // 这里可以从配置中获取实际的用户信息
        isLoggedIn: true,
      }
    })

    // 标签页管理（全局处理器，委托给主窗口）
    ipcMain.handle('tab:create', async (event, options) => {
      const mainWindow = this.windowManager.getWindowByType(WindowType.MAIN)
      if (mainWindow) {
        // 如果主窗口存在，委托给主窗口处理
        return await this.handleTabCreate(options)
      }
      throw new Error('Main window not available')
    })

    ipcMain.handle('tab:close', async (event, tabId) => {
      const mainWindow = this.windowManager.getWindowByType(WindowType.MAIN)
      if (mainWindow) {
        return await this.handleTabClose(tabId)
      }
      throw new Error('Main window not available')
    })

    ipcMain.handle('tab:switch', async (event, tabId) => {
      const mainWindow = this.windowManager.getWindowByType(WindowType.MAIN)
      if (mainWindow) {
        return await this.handleTabSwitch(tabId)
      }
      throw new Error('Main window not available')
    })

    ipcMain.handle('tab:getAll', () => {
      mainLogger.debug('IPC: tab:getAll called')
      const mainWindow = this.windowManager.getWindowByType(WindowType.MAIN)
      if (mainWindow) {
        return this.handleTabGetAll()
      }
      return []
    })

    // 应用版本（兼容旧的调用方式）
    ipcMain.handle('get-app-version', () => {
      return app.getVersion()
    })

    // 推送服务 IPC 处理器
    this.setupPushIpcHandlers()

    // 更新服务 IPC 处理器
    this.setupUpdateIpcHandlers()

    mainLogger.info('全局 IPC 处理器设置完成')
  }

  /**
   * 处理标签页创建（委托给主窗口）
   */
  private async handleTabCreate(options: any): Promise<any> {
    const windowId = this.getMainWindowId()
    if (windowId) {
      const windowInstance = this.windowManager.getWindowInstance(windowId)
      if (windowInstance && 'createNewTab' in windowInstance) {
        return await (windowInstance as any).createNewTab(options.url, options)
      }
    }
    throw new Error('Main window instance not available')
  }

  /**
   * 处理标签页关闭（委托给主窗口）
   */
  private async handleTabClose(tabId: string): Promise<void> {
    const windowId = this.getMainWindowId()
    if (windowId) {
      const windowInstance = this.windowManager.getWindowInstance(windowId)
      if (windowInstance && 'closeTab' in windowInstance) {
        await (windowInstance as any).closeTab(tabId)
      }
    }
  }

  /**
   * 处理标签页切换（委托给主窗口）
   */
  private async handleTabSwitch(tabId: string): Promise<void> {
    const windowId = this.getMainWindowId()
    if (windowId) {
      const windowInstance = this.windowManager.getWindowInstance(windowId)
      if (windowInstance && 'switchTab' in windowInstance) {
        await (windowInstance as any).switchTab(tabId)
      }
    }
  }

  /**
   * 处理获取所有标签页（委托给主窗口）
   */
  private handleTabGetAll(): any[] {
    const windowId = this.getMainWindowId()
    if (windowId) {
      const windowInstance = this.windowManager.getWindowInstance(windowId)
      if (windowInstance && 'getTabs' in windowInstance) {
        return (windowInstance as any).getTabs()
      }
    }
    return []
  }

  /**
   * 获取主窗口ID
   */
  private getMainWindowId(): string | undefined {
    const mainWindow = this.windowManager.getWindowByType(WindowType.MAIN)
    if (mainWindow) {
      // 通过 WindowManager 的私有方法获取窗口ID
      for (const [windowId, window] of (this.windowManager as any).windows) {
        if (window === mainWindow) {
          return windowId
        }
      }
    }
    return undefined
  }

  /**
   * 初始化推送管理器
   */
  private async initializePushManager(): Promise<void> {
    try {
      mainLogger.info('初始化推送管理器')

      await this.pushManager.initialize()

      // 设置推送事件监听器
      this.setupPushEventListeners()

      mainLogger.info('推送管理器初始化完成')
    } catch (error) {
      mainLogger.error('推送管理器初始化失败', error)
      // 推送服务初始化失败不应该阻止应用启动
    }
  }

  /**
   * 设置推送事件监听器
   */
  private setupPushEventListeners(): void {
    this.pushManager.on('connected', () => {
      mainLogger.info('推送服务已连接')
      this.broadcastToAllWindows('push:connected')
    })

    this.pushManager.on('disconnected', data => {
      mainLogger.info('推送服务已断开', data)
      this.broadcastToAllWindows('push:disconnected', data)
    })

    this.pushManager.on('connectionStateChanged', state => {
      mainLogger.debug('推送连接状态变更', state)
      this.broadcastToAllWindows('push:connection-state-changed', state)
    })

    this.pushManager.on('notificationShown', data => {
      mainLogger.debug('通知已显示', data)
      this.broadcastToAllWindows('push:notification-shown', data)
    })

    this.pushManager.on('notificationClicked', data => {
      mainLogger.info('通知被点击', data)
      this.broadcastToAllWindows('push:notification-clicked', data)
    })

    this.pushManager.on('error', error => {
      mainLogger.error('推送服务错误', error)
      this.broadcastToAllWindows('push:error', { message: error.message })
    })
  }

  /**
   * 向所有窗口广播消息
   */
  private broadcastToAllWindows(channel: string, data?: any): void {
    const windows = BrowserWindow.getAllWindows()
    windows.forEach(window => {
      if (!window.isDestroyed()) {
        window.webContents.send(channel, data)
      }
    })
  }

  /**
   * 设置推送服务 IPC 处理器
   */
  private setupPushIpcHandlers(): void {
    // 启动推送服务
    ipcMain.handle('push:start', async () => {
      try {
        await this.pushManager.start()
        return { success: true }
      } catch (error) {
        mainLogger.error('启动推送服务失败', error)
        return { success: false, error: (error as Error).message }
      }
    })

    // 停止推送服务
    ipcMain.handle('push:stop', async () => {
      try {
        await this.pushManager.stop()
        return { success: true }
      } catch (error) {
        mainLogger.error('停止推送服务失败', error)
        return { success: false, error: (error as Error).message }
      }
    })

    // 获取推送服务状态
    ipcMain.handle('push:getStatus', () => {
      return {
        connectionState: this.pushManager.getConnectionState(),
        statistics: this.pushManager.getStatistics(),
      }
    })

    // 设置用户ID
    ipcMain.handle('push:setUserId', (_, userId: string) => {
      this.pushManager.setUserId(userId)
      return { success: true }
    })

    // 手动显示通知
    ipcMain.handle('push:showNotification', async (_, message) => {
      try {
        await this.pushManager.showNotification(message)
        return { success: true }
      } catch (error) {
        mainLogger.error('显示通知失败', error)
        return { success: false, error: (error as Error).message }
      }
    })

    // 获取最近消息
    ipcMain.handle('push:getRecentMessages', async (_, limit?: number) => {
      try {
        const messages = await this.pushManager.getRecentMessages(limit)
        return { success: true, messages }
      } catch (error) {
        mainLogger.error('获取最近消息失败', error)
        return { success: false, error: (error as Error).message }
      }
    })

    // 清除所有通知
    ipcMain.handle('push:clearNotifications', () => {
      this.pushManager.clearAllNotifications()
      return { success: true }
    })

    // 清除所有消息
    ipcMain.handle('push:clearMessages', async () => {
      try {
        await this.pushManager.clearAllMessages()
        return { success: true }
      } catch (error) {
        mainLogger.error('清除消息失败', error)
        return { success: false, error: (error as Error).message }
      }
    })

    // 开发者工具控制
    ipcMain.handle('dev:toggleDevTools', event => {
      const webContents = event.sender
      if (webContents.isDevToolsOpened()) {
        webContents.closeDevTools()
        return { success: true, action: 'closed' }
      } else {
        webContents.openDevTools({ mode: 'detach' })
        return { success: true, action: 'opened' }
      }
    })

    ipcMain.handle('dev:openDevTools', event => {
      const webContents = event.sender
      webContents.openDevTools({ mode: 'detach' })
      return { success: true }
    })

    ipcMain.handle('dev:closeDevTools', event => {
      const webContents = event.sender
      webContents.closeDevTools()
      return { success: true }
    })

    ipcMain.handle('dev:isDevToolsOpened', event => {
      const webContents = event.sender
      return { isOpened: webContents.isDevToolsOpened() }
    })

    mainLogger.info('推送服务 IPC 处理器设置完成')
  }

  /**
   * 设置更新服务 IPC 处理器
   */
  private setupUpdateIpcHandlers(): void {
    // 检查更新
    ipcMain.handle('update:check', async () => {
      try {
        await this.updateManager.checkForUpdates(true)
        return { success: true }
      } catch (error) {
        mainLogger.error('检查更新失败', error)
        return { success: false, error: (error as Error).message }
      }
    })

    // 下载更新
    ipcMain.handle('update:download', async () => {
      try {
        await this.updateManager.startDownload()
        return { success: true }
      } catch (error) {
        mainLogger.error('下载更新失败', error)
        return { success: false, error: (error as Error).message }
      }
    })

    // 安装更新
    ipcMain.handle('update:install', () => {
      try {
        this.updateManager.installUpdate()
        return { success: true }
      } catch (error) {
        mainLogger.error('安装更新失败', error)
        return { success: false, error: (error as Error).message }
      }
    })

    // 获取当前版本
    ipcMain.handle('update:get-version', () => {
      return this.updateManager.getCurrentVersion()
    })

    // 检查自定义更新
    ipcMain.handle('update:check-custom', async () => {
      try {
        const updateService = (this.updateManager as any).updateService
        const updateInfo = await updateService.checkCustomUpdate()
        return { success: true, updateInfo }
      } catch (error) {
        mainLogger.error('检查自定义更新失败', error)
        return { success: false, error: (error as Error).message }
      }
    })

    // 更新窗口相关处理器
    ipcMain.handle('update-window:get-options', () => {
      // 这个会被 UpdateWindow 类重写
      return {}
    })

    ipcMain.handle('update-window:confirm', () => {
      // 这个会被 UpdateWindow 类重写
      return true
    })

    ipcMain.handle('update-window:cancel', () => {
      // 这个会被 UpdateWindow 类重写
      return false
    })

    ipcMain.handle('update-window:close', () => {
      // 这个会被 UpdateWindow 类重写
      return true
    })

    // Shell 操作
    ipcMain.handle('shell:open-external', async (_, url: string) => {
      try {
        await shell.openExternal(url)
        return { success: true }
      } catch (error) {
        mainLogger.error('打开外部链接失败', error)
        return { success: false, error: (error as Error).message }
      }
    })

    // 应用退出
    ipcMain.handle('app:quit', () => {
      app.quit()
      return { success: true }
    })

    // 获取更新日志
    ipcMain.handle('update:get-logs', async (_, limit?: number) => {
      try {
        const updateService = (this.updateManager as any).updateService
        const logs = await updateService.updateLogService.getLogs(limit)
        return { success: true, logs }
      } catch (error) {
        mainLogger.error('获取更新日志失败', error)
        return { success: false, error: (error as Error).message }
      }
    })

    // 获取更新统计
    ipcMain.handle('update:get-statistics', async () => {
      try {
        const updateService = (this.updateManager as any).updateService
        const statistics = updateService.updateLogService.getStatistics()
        return { success: true, statistics }
      } catch (error) {
        mainLogger.error('获取更新统计失败', error)
        return { success: false, error: (error as Error).message }
      }
    })

    // 获取可用备份
    ipcMain.handle('update:get-backups', async () => {
      try {
        const updateService = (this.updateManager as any).updateService
        const backups = updateService.rollbackService.getAvailableBackups()
        return { success: true, backups }
      } catch (error) {
        mainLogger.error('获取备份列表失败', error)
        return { success: false, error: (error as Error).message }
      }
    })

    // 执行回滚
    ipcMain.handle('update:rollback', async (_, options) => {
      try {
        const updateService = (this.updateManager as any).updateService
        const result = await updateService.rollbackService.rollback(options)
        return { success: true, result }
      } catch (error) {
        mainLogger.error('执行回滚失败', error)
        return { success: false, error: (error as Error).message }
      }
    })

    mainLogger.info('更新服务 IPC 处理器设置完成')
  }

  /**
   * 启动应用程序
   */
  async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('应用程序未初始化')
    }

    try {
      this.appState = AppState.RUNNING

      // 创建主窗口
      const mainWindow = await this.windowManager.createMainWindow()

      // 初始化更新管理器
      try {
        await this.updateManager.initialize()

        // 设置更新管理器的主窗口引用
        this.updateManager.setMainWindow(mainWindow)

        // 启动自动更新检查
        this.updateManager.startAutoCheck()

        mainLogger.info('更新管理器初始化完成')
      } catch (error) {
        mainLogger.error('更新管理器初始化失败，跳过更新功能', error)
        // 更新功能初始化失败不应该阻止应用启动
      }

      // 启动推送服务（可选，也可以由用户手动启动）
      try {
        await this.pushManager.start()
        mainLogger.info('推送服务已启动')
      } catch (error) {
        mainLogger.warn('推送服务启动失败，将在后续重试', error)
      }

      mainLogger.info('应用程序启动完成')
    } catch (error) {
      this.handleStartupError(error as Error)
      throw error // 重新抛出错误，确保调用者知道启动失败
    }
  }

  /**
   * 设置 Web 内容
   */
  private setupWebContents(contents: Electron.WebContents): void {
    // 设置窗口打开处理器
    contents.setWindowOpenHandler(details => {
      shell.openExternal(details.url)
      return { action: 'deny' }
    })

    // 页面标题更新处理
    contents.on('page-title-updated', (event, title) => {
      this.handlePageTitleUpdate(title, contents)
    })
  }

  /**
   * 处理页面标题更新
   */
  private handlePageTitleUpdate(title: string, contents: Electron.WebContents): void {
    // 处理登录回调
    if (title === 'jlcone-google-login' || title === 'jlcone-apple-login') {
      contents.close()
      // 发送登录成功消息
      mainLogger.info(`${title} 登录成功`)
    }

    if (title === 'jlcone-logout') {
      contents.close()
      // 处理登出
      mainLogger.info('用户登出')
    }
  }

  /**
   * 处理深度链接
   */
  private handleDeepLink(url: string): void {
    mainLogger.info(`收到深度链接: ${url}`)

    try {
      const parsedUrl = new URL(url)
      const action = parsedUrl.searchParams.get('action')

      switch (action) {
        case 'open-settings':
          this.windowManager.createSettingWindow()
          break
        default:
          mainLogger.warn(`未知的深度链接动作: ${action}`)
      }
    } catch (error) {
      mainLogger.error('解析深度链接失败', error)
    }
  }

  /**
   * 处理窗口全部关闭事件
   */
  private handleWindowAllClosed(): void {
    if (process.platform !== 'darwin') {
      this.appState = AppState.CLOSING
      app.quit()
    }
  }

  /**
   * 处理应用激活事件
   */
  private handleActivate(): void {
    if (BrowserWindow.getAllWindows().length === 0) {
      this.windowManager.createMainWindow()
    }
  }

  /**
   * 处理应用即将退出事件
   */
  private async handleWillQuit(): Promise<void> {
    globalShortcut.unregisterAll()

    // 清理推送管理器
    try {
      await this.pushManager.destroy()
      mainLogger.info('推送管理器已清理')
    } catch (error) {
      mainLogger.error('清理推送管理器失败', error)
    }

    // 清理更新管理器
    try {
      this.updateManager.cleanup()
      mainLogger.info('更新管理器已清理')
    } catch (error) {
      mainLogger.error('清理更新管理器失败', error)
    }

    this.appState = AppState.CLOSED
    mainLogger.info('应用程序即将退出')
  }

  /**
   * 处理未捕获异常
   */
  private handleUncaughtException(error: Error): void {
    const appError: AppError = {
      ...error,
      type: 'system',
      timestamp: new Date(),
    }

    errorLogger.error('未捕获异常', appError)

    // 在生产环境中，可能需要重启应用或显示错误对话框
    if (!is.dev) {
      app.relaunch()
      app.exit(1)
    }
  }

  /**
   * 处理未处理的 Promise 拒绝
   */
  private handleUnhandledRejection(reason: unknown): void {
    errorLogger.error('未处理的 Promise 拒绝', reason)
  }

  /**
   * 处理初始化错误
   */
  private handleInitializationError(error: Error): void {
    const appError: AppError = {
      ...error,
      type: 'system',
      timestamp: new Date(),
    }

    errorLogger.error('应用程序初始化失败', appError)
    app.exit(1)
  }

  /**
   * 处理启动错误
   */
  private handleStartupError(error: Error): void {
    const appError: AppError = {
      ...error,
      type: 'system',
      timestamp: new Date(),
    }

    errorLogger.error('应用程序启动失败', appError)
    app.exit(1)
  }
}

// 创建应用程序实例
const application = new Application()

// 应用程序就绪时初始化和启动
app.whenReady().then(async () => {
  try {
    await application.initialize()
    await application.start()
  } catch (error) {
    errorLogger.error('应用程序启动失败', error)
    app.exit(1)
  }
})
