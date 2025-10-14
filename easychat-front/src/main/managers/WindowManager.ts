/**
 * 窗口管理器
 * 简化的窗口创建和管理系统
 */

import { BrowserWindow, BrowserWindowConstructorOptions } from 'electron'
import { EventEmitter } from 'events'
import path from 'path'
import { WindowType, WindowOptions, WindowState, WindowError } from '../../types/window'
import { windowLogger } from '../../utils/logger'
import { generateId, isDevelopment } from '../../utils/helpers'
import { DEFAULT_WINDOW_CONFIG } from '../../utils/constants'

export class WindowManager extends EventEmitter {
  private windows: Map<string, BrowserWindow> = new Map()
  private windowTypes: Map<string, WindowType> = new Map()
  private static instance: WindowManager | null = null

  private constructor() {
    super()
    windowLogger.info('WindowManager initialized')
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): WindowManager {
    if (!WindowManager.instance) {
      WindowManager.instance = new WindowManager()
    }
    return WindowManager.instance
  }

  /**
   * 创建窗口
   */
  public createWindow(type: WindowType, options?: WindowOptions): BrowserWindow {
    try {
      const windowId = generateId()
      const config = this.getWindowConfig(type, options)

      const window = new BrowserWindow(config)

      // 设置窗口ID
      window.setTitle(options?.title || this.getDefaultTitle(type))

      // 存储窗口引用
      this.windows.set(windowId, window)
      this.windowTypes.set(windowId, type)

      // 设置事件监听
      this.setupWindowEvents(windowId, window, type)

      // 加载页面
      this.loadWindowContent(window, type)

      windowLogger.info(`Window created: ${type} (${windowId})`)
      this.emit('windowCreated', { windowId, type, window })

      return window
    } catch (error) {
      const errorMsg = `Failed to create window: ${type}`
      windowLogger.error(errorMsg, error)
      throw new WindowError('unknown', 'create', errorMsg)
    }
  }

  /**
   * 获取窗口
   */
  public getWindow(windowId: string): BrowserWindow | undefined {
    return this.windows.get(windowId)
  }

  /**
   * 根据类型获取窗口
   */
  public getWindowByType(type: WindowType): BrowserWindow | undefined {
    for (const [windowId, windowType] of this.windowTypes.entries()) {
      if (windowType === type) {
        return this.windows.get(windowId)
      }
    }
    return undefined
  }

  /**
   * 获取所有窗口
   */
  public getAllWindows(): BrowserWindow[] {
    return Array.from(this.windows.values())
  }

  /**
   * 关闭窗口
   */
  public closeWindow(windowId: string): void {
    const window = this.windows.get(windowId)
    if (window && !window.isDestroyed()) {
      window.close()
    }
  }

  /**
   * 关闭所有窗口
   */
  public closeAllWindows(): void {
    for (const [windowId] of this.windows) {
      this.closeWindow(windowId)
    }
  }

  /**
   * 获取窗口状态
   */
  public getWindowState(windowId: string): WindowState | null {
    const window = this.windows.get(windowId)
    const type = this.windowTypes.get(windowId)

    if (!window || !type || window.isDestroyed()) {
      return null
    }

    const bounds = window.getBounds()

    return {
      id: windowId,
      type,
      isVisible: window.isVisible(),
      isMinimized: window.isMinimized(),
      isMaximized: window.isMaximized(),
      isFullScreen: window.isFullScreen(),
      bounds,
    }
  }

  /**
   * 获取窗口配置
   */
  private getWindowConfig(
    type: WindowType,
    options?: WindowOptions
  ): BrowserWindowConstructorOptions {
    const baseConfig: BrowserWindowConstructorOptions = {
      ...DEFAULT_WINDOW_CONFIG,
      show: false, // 先隐藏，准备好后再显示
      webPreferences: {
        ...DEFAULT_WINDOW_CONFIG.webPreferences,
        preload: this.getPreloadPath(type),
      },
    }

    // 根据窗口类型设置特定配置
    const typeConfig = this.getTypeSpecificConfig(type)

    // 合并用户选项
    const userConfig = options ? this.convertOptionsToConfig(options) : {}

    return {
      ...baseConfig,
      ...typeConfig,
      ...userConfig,
    }
  }

  /**
   * 获取窗口类型特定配置
   */
  private getTypeSpecificConfig(type: WindowType): Partial<BrowserWindowConstructorOptions> {
    switch (type) {
      case WindowType.MAIN:
        return {
          width: 1200,
          height: 800,
          minWidth: 800,
          minHeight: 600,
        }

      case WindowType.LOGIN:
        return {
          width: 400,
          height: 500,
          resizable: false,
          maximizable: false,
          minimizable: false,
          alwaysOnTop: true,
          modal: true,
        }

      case WindowType.SETTING:
        return {
          width: 600,
          height: 700,
          resizable: false,
          maximizable: false,
          modal: true,
        }

      case WindowType.ALERT:
        return {
          width: 400,
          height: 300,
          resizable: false,
          maximizable: false,
          minimizable: false,
          alwaysOnTop: true,
          modal: true,
          frame: false,
        }

      case WindowType.LOADING:
        return {
          width: 300,
          height: 200,
          resizable: false,
          maximizable: false,
          minimizable: false,
          alwaysOnTop: true,
          frame: false,
          transparent: true,
        }

      default:
        return {}
    }
  }

  /**
   * 转换选项为配置
   */
  private convertOptionsToConfig(options: WindowOptions): Partial<BrowserWindowConstructorOptions> {
    const config: Partial<BrowserWindowConstructorOptions> = {}

    // 复制基本属性
    const basicProps = [
      'width',
      'height',
      'minWidth',
      'minHeight',
      'maxWidth',
      'maxHeight',
      'x',
      'y',
      'center',
      'resizable',
      'minimizable',
      'maximizable',
      'closable',
      'alwaysOnTop',
      'skipTaskbar',
      'modal',
      'title',
      'icon',
      'show',
      'frame',
      'transparent',
    ] as const

    for (const prop of basicProps) {
      if (options[prop] !== undefined) {
        ;(config as Record<string, unknown>)[prop] = options[prop]
      }
    }

    // 处理 webPreferences
    if (options.webPreferences) {
      config.webPreferences = {
        ...config.webPreferences,
        ...options.webPreferences,
      }
    }

    return config
  }

  /**
   * 获取预加载脚本路径
   */
  private getPreloadPath(type: WindowType): string {
    const preloadMap: Record<WindowType, string> = {
      [WindowType.MAIN]: 'index.js',
      [WindowType.LOGIN]: 'index.js',
      [WindowType.SETTING]: 'index.js',
      [WindowType.ALERT]: 'index.js',
      [WindowType.UPDATE_TIP]: 'index.js',
      [WindowType.LOADING]: 'index.js',
      [WindowType.LAUNCHER]: 'index.js',
      [WindowType.MESSAGE_ALERT]: 'index.js',
      [WindowType.MESSAGE_MGR]: 'index.js',
    }

    const preloadFile = preloadMap[type] || 'index.js'

    if (isDevelopment()) {
      return path.join(__dirname, '../preload', preloadFile)
    } else {
      return path.join(__dirname, '../preload', preloadFile)
    }
  }

  /**
   * 获取默认标题
   */
  private getDefaultTitle(type: WindowType): string {
    const titleMap: Record<WindowType, string> = {
      [WindowType.MAIN]: 'JLCONE',
      [WindowType.LOGIN]: 'JLCONE - 登录',
      [WindowType.SETTING]: 'JLCONE - 设置',
      [WindowType.ALERT]: 'JLCONE - 提示',
      [WindowType.UPDATE_TIP]: 'JLCONE - 更新',
      [WindowType.LOADING]: 'JLCONE - 加载中',
      [WindowType.LAUNCHER]: 'JLCONE - 启动器',
      [WindowType.MESSAGE_ALERT]: 'JLCONE - 消息',
      [WindowType.MESSAGE_MGR]: 'JLCONE - 消息管理',
    }

    return titleMap[type] || 'JLCONE'
  }

  /**
   * 加载窗口内容
   */
  private loadWindowContent(window: BrowserWindow, type: WindowType): void {
    const htmlMap: Record<WindowType, string> = {
      [WindowType.MAIN]: 'index.html',
      [WindowType.LOGIN]: 'login.html',
      [WindowType.SETTING]: 'setting.html',
      [WindowType.ALERT]: 'alert.html',
      [WindowType.UPDATE_TIP]: 'updateTip.html',
      [WindowType.LOADING]: 'loading.html',
      [WindowType.LAUNCHER]: 'launcher.html',
      [WindowType.MESSAGE_ALERT]: 'messageAlert.html',
      [WindowType.MESSAGE_MGR]: 'messageMgr.html',
    }

    const htmlFile = htmlMap[type] || 'index.html'

    if (isDevelopment()) {
      const url = `http://localhost:5173/${htmlFile}`
      window.loadURL(url)
      window.webContents.openDevTools()
    } else {
      const filePath = path.join(__dirname, '../renderer', htmlFile)
      window.loadFile(filePath)
    }
  }

  /**
   * 设置窗口事件监听
   */
  private setupWindowEvents(windowId: string, window: BrowserWindow, type: WindowType): void {
    // 窗口准备显示
    window.once('ready-to-show', () => {
      window.show()
      windowLogger.debug(`Window ready to show: ${type} (${windowId})`)
    })

    // 窗口关闭
    window.on('closed', () => {
      this.windows.delete(windowId)
      this.windowTypes.delete(windowId)
      windowLogger.info(`Window closed: ${type} (${windowId})`)
      this.emit('windowClosed', { windowId, type })
    })

    // 窗口最小化
    window.on('minimize', () => {
      windowLogger.debug(`Window minimized: ${type} (${windowId})`)
      this.emit('windowMinimized', { windowId, type })
    })

    // 窗口最大化
    window.on('maximize', () => {
      windowLogger.debug(`Window maximized: ${type} (${windowId})`)
      this.emit('windowMaximized', { windowId, type })
    })

    // 窗口恢复
    window.on('restore', () => {
      windowLogger.debug(`Window restored: ${type} (${windowId})`)
      this.emit('windowRestored', { windowId, type })
    })

    // 窗口移动
    window.on('moved', () => {
      const bounds = window.getBounds()
      windowLogger.debug(`Window moved: ${type} (${windowId})`, bounds)
      this.emit('windowMoved', { windowId, type, bounds })
    })

    // 窗口大小改变
    window.on('resized', () => {
      const bounds = window.getBounds()
      windowLogger.debug(`Window resized: ${type} (${windowId})`, bounds)
      this.emit('windowResized', { windowId, type, bounds })
    })

    // 窗口获得焦点
    window.on('focus', () => {
      windowLogger.debug(`Window focused: ${type} (${windowId})`)
      this.emit('windowFocused', { windowId, type })
    })

    // 窗口失去焦点
    window.on('blur', () => {
      windowLogger.debug(`Window blurred: ${type} (${windowId})`)
      this.emit('windowBlurred', { windowId, type })
    })
  }

  /**
   * 销毁管理器
   */
  public destroy(): void {
    this.closeAllWindows()
    this.removeAllListeners()
    WindowManager.instance = null
    windowLogger.info('WindowManager destroyed')
  }
}
