import { BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { updateLogger } from '../../utils/logger'

/**
 * 更新提示窗口类型
 */
export type UpdateWindowType = 'update-tip' | 'force-update' | 'download-progress'

/**
 * 更新窗口选项
 */
export interface UpdateWindowOptions {
  type: UpdateWindowType
  title?: string
  message?: string
  version?: string
  progress?: number
  forceUpdate?: boolean
}

/**
 * 更新窗口管理器
 */
export class UpdateWindow {
  private window: BrowserWindow | null = null
  private options: UpdateWindowOptions

  constructor(options: UpdateWindowOptions) {
    this.options = options
    this.createWindow()
    this.setupEventHandlers()
  }

  /**
   * 创建更新窗口
   */
  private createWindow(): void {
    this.window = new BrowserWindow({
      width: 400,
      height: 300,
      show: false,
      autoHideMenuBar: true,
      resizable: false,
      minimizable: false,
      maximizable: false,
      alwaysOnTop: true,
      frame: false,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false,
      },
    })

    // 加载更新提示页面
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      this.window.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/updateTip.html`)
    } else {
      this.window.loadFile(join(__dirname, '../renderer/updateTip.html'))
    }

    // 窗口准备显示时显示窗口
    this.window.once('ready-to-show', () => {
      this.window?.show()
      this.window?.center()
    })

    // 窗口关闭时清理引用
    this.window.on('closed', () => {
      this.window = null
    })

    updateLogger.info('UpdateWindow: 创建更新窗口', this.options.type)
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    if (!this.window) return

    // 处理更新窗口的 IPC 消息
    ipcMain.handle('update-window:get-options', () => {
      return this.options
    })

    ipcMain.handle('update-window:confirm', () => {
      updateLogger.info('UpdateWindow: 用户确认更新')
      this.close()
      return true
    })

    ipcMain.handle('update-window:cancel', () => {
      updateLogger.info('UpdateWindow: 用户取消更新')
      this.close()
      return false
    })

    ipcMain.handle('update-window:close', () => {
      this.close()
    })
  }

  /**
   * 更新窗口选项
   */
  public updateOptions(options: Partial<UpdateWindowOptions>): void {
    this.options = { ...this.options, ...options }

    // 通知渲染进程更新选项
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send('update-window:options-changed', this.options)
    }
  }

  /**
   * 显示窗口
   */
  public show(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.show()
      this.window.focus()
    }
  }

  /**
   * 隐藏窗口
   */
  public hide(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.hide()
    }
  }

  /**
   * 关闭窗口
   */
  public close(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.close()
    }
  }

  /**
   * 获取窗口实例
   */
  public getWindow(): BrowserWindow | null {
    return this.window
  }

  /**
   * 窗口是否已销毁
   */
  public isDestroyed(): boolean {
    return !this.window || this.window.isDestroyed()
  }

  /**
   * 创建更新提示窗口
   */
  public static createUpdateTip(version: string, message: string): UpdateWindow {
    return new UpdateWindow({
      type: 'update-tip',
      title: '发现新版本',
      message,
      version,
      forceUpdate: false,
    })
  }

  /**
   * 创建强制更新窗口
   */
  public static createForceUpdate(version: string, message: string): UpdateWindow {
    return new UpdateWindow({
      type: 'force-update',
      title: '强制更新',
      message,
      version,
      forceUpdate: true,
    })
  }

  /**
   * 创建下载进度窗口
   */
  public static createDownloadProgress(): UpdateWindow {
    return new UpdateWindow({
      type: 'download-progress',
      title: '正在下载更新',
      message: '正在下载更新文件，请稍候...',
      progress: 0,
    })
  }
}
