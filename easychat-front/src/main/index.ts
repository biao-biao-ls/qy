/**
 * 主进程入口文件
 * 重构自 desktop-app，简化初始化逻辑，采用现代化架构
 */

import { app, shell, BrowserWindow, ipcMain, globalShortcut, crashReporter, nativeImage } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { autoUpdater } from 'electron-updater'

// 导入自定义模块
import { WindowManager } from './managers/WindowManager'
import { AppConfig } from './config/AppConfig'
import { initLogger, mainLogger, errorLogger } from '../utils/logger'
import { APP_NAME, APP_VERSION, DEFAULT_WINDOW_CONFIG } from '../utils/constants'
import { AppError, AppState } from '../types/app'
import icon from '../../resources/icon.png?asset'

/**
 * 应用程序主类
 * 管理应用程序的生命周期和核心功能
 */
class Application {
  private windowManager: WindowManager
  private appConfig: AppConfig
  private appState: AppState = AppState.INITIALIZING
  private isInitialized = false

  constructor() {
    this.windowManager = WindowManager.getInstance()
    this.appConfig = AppConfig.getInstance()
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
      
      this.appState = AppState.READY
      this.isInitialized = true
      
      mainLogger.info('应用程序初始化完成')
    } catch (error) {
      this.handleInitializationError(error as Error)
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
    app.commandLine.appendSwitch('disable-features', 'PasswordManagerEnable,AutofillServerCommunication')
    
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
    process.on('uncaughtException', (error) => {
      this.handleUncaughtException(error)
    })

    process.on('unhandledRejection', (reason) => {
      this.handleUnhandledRejection(reason)
    })

    // 应用程序事件
    app.on('window-all-closed', () => {
      this.handleWindowAllClosed()
    })

    app.on('activate', () => {
      this.handleActivate()
    })

    app.on('will-quit', () => {
      this.handleWillQuit()
    })

    // 协议处理
    app.on('open-url', (event, url) => {
      this.handleDeepLink(url)
    })

    // 浏览器窗口创建事件
    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
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
   * 启动应用程序
   */
  async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('应用程序未初始化')
    }

    try {
      this.appState = AppState.RUNNING
      
      // 创建主窗口
      await this.windowManager.createMainWindow()
      
      mainLogger.info('应用程序启动完成')
    } catch (error) {
      this.handleStartupError(error as Error)
    }
  }

  /**
   * 设置 Web 内容
   */
  private setupWebContents(contents: Electron.WebContents): void {
    // 设置窗口打开处理器
    contents.setWindowOpenHandler((details) => {
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
  private handleWillQuit(): void {
    globalShortcut.unregisterAll()
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
