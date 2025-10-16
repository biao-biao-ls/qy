/**
 * 登录窗口类
 * 重构自原始 LoginWindow，简化架构
 */

import { BrowserWindow, ipcMain } from 'electron'
import { EventEmitter } from 'events'
import { windowLogger } from '../../utils/logger'

export interface LoginInfo {
  userId: string
  username: string
  email: string
  token: string
  refreshToken?: string
  loginMethod: string
  userInfo: any
}

export class LoginWindow extends EventEmitter {
  private window: BrowserWindow
  private isInitialized = false
  private reloadTimer?: NodeJS.Timeout

  constructor(window: BrowserWindow) {
    super()
    this.window = window
    this.setupEventHandlers()
    this.setupIpcHandlers()
  }

  /**
   * 初始化登录窗口
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // 设置窗口标题
      this.window.setTitle('JLCONE - 登录')

      // 设置自动重载定时器（10分钟）
      this.setupAutoReload()

      this.isInitialized = true
      windowLogger.info('LoginWindow initialized')
    } catch (error) {
      windowLogger.error('Failed to initialize LoginWindow', error)
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
   * 重新加载登录页面
   */
  public reloadLogin(): void {
    try {
      this.window.webContents.reload()
      windowLogger.info('Login page reloaded')
    } catch (error) {
      windowLogger.error('Failed to reload login page', error)
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

    // 页面标题更新事件
    this.window.webContents.on('page-title-updated', (event, title) => {
      this.handlePageTitleUpdate(title)
    })

    // 页面加载完成事件
    this.window.webContents.on('did-finish-load', () => {
      windowLogger.debug('Login page loaded')
    })

    // 页面加载失败事件
    this.window.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      windowLogger.error(`Login page failed to load: ${errorDescription}`)
    })
  }

  /**
   * 设置 IPC 处理器
   */
  private setupIpcHandlers(): void {
    // 登录成功处理
    ipcMain.on('login:success', (event, loginInfo: LoginInfo) => {
      this.handleLoginSuccess(loginInfo)
    })

    // 登录失败处理
    ipcMain.on('login:error', (event, error) => {
      this.handleLoginError(error)
    })

    // 重新加载登录页面
    ipcMain.on('login:reload', () => {
      this.reloadLogin()
    })
  }

  /**
   * 处理页面标题更新
   */
  private handlePageTitleUpdate(title: string): void {
    // 检查登录回调标识
    if (title === 'jlcone-google-login') {
      windowLogger.info('Google login callback detected')
      this.emit('loginSuccess', { loginMethod: 'google' })
    } else if (title === 'jlcone-apple-login') {
      windowLogger.info('Apple login callback detected')
      this.emit('loginSuccess', { loginMethod: 'apple' })
    } else if (title === 'jlcone-logout') {
      windowLogger.info('Logout callback detected')
      this.emit('logout')
    }
  }

  /**
   * 处理登录成功
   */
  private handleLoginSuccess(loginInfo: LoginInfo): void {
    try {
      windowLogger.info('Login successful')

      // 验证登录信息
      if (!loginInfo || !loginInfo.userId) {
        throw new Error('Invalid login info')
      }

      // 发送登录成功事件
      this.emit('loginSuccess', loginInfo)

      // 隐藏登录窗口
      this.showPanel(false)
    } catch (error) {
      windowLogger.error('Failed to handle login success', error)
      this.handleLoginError(error)
    }
  }

  /**
   * 处理登录错误
   */
  private handleLoginError(error: any): void {
    windowLogger.error('Login error', error)
    this.emit('loginError', error)

    // 可以在这里显示错误提示
    // 或者重新加载登录页面
  }

  /**
   * 设置自动重载
   */
  private setupAutoReload(): void {
    // 10分钟自动重载
    this.reloadTimer = setInterval(
      () => {
        if (this.window.isVisible() && !this.window.isDestroyed()) {
          this.reloadLogin()
          windowLogger.debug('Auto reload login page')
        }
      },
      10 * 60 * 1000
    )
  }

  /**
   * 清理资源
   */
  private cleanup(): void {
    if (this.reloadTimer) {
      clearInterval(this.reloadTimer)
      this.reloadTimer = undefined
    }

    this.removeAllListeners()
    windowLogger.info('LoginWindow cleaned up')
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
