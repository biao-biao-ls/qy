/**
 * 标签页管理器
 * 简化的标签页管理系统，基于 BrowserView
 */

import { BrowserWindow, BrowserView, Rectangle } from 'electron'
import { EventEmitter } from 'events'
import { TabItem, TabCreateOptions, TabUpdateOptions } from '../../types/tab'
import { tabLogger } from '../../utils/logger'
import { generateId } from '../../utils/helpers'

export class TabManager extends EventEmitter {
  private window: BrowserWindow
  private tabs: Map<string, TabItem> = new Map()
  private browserViews: Map<string, BrowserView> = new Map()
  private activeTabId: string | null = null
  private isInitialized = false

  constructor(window: BrowserWindow) {
    super()
    this.window = window
  }

  /**
   * 初始化标签页管理器
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      this.setupEventHandlers()
      this.isInitialized = true
      tabLogger.info('TabManager initialized')
    } catch (error) {
      tabLogger.error('Failed to initialize TabManager', error)
      throw error
    }
  }

  /**
   * 创建标签页
   */
  public async createTab(options: TabCreateOptions): Promise<string> {
    try {
      const tabId = generateId()
      const now = new Date()

      // 创建标签页数据
      const tab: TabItem = {
        id: tabId,
        title: options.title || 'New Tab',
        url: options.url,
        favicon: undefined,
        isActive: options.isActive ?? false,
        isLoading: true,
        canGoBack: false,
        canGoForward: false,
        createdAt: now,
        updatedAt: now,
        position: options.position ?? this.tabs.size,
      }

      // 创建 BrowserView
      const browserView = new BrowserView({
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          webSecurity: true,
        },
      })

      // 设置 BrowserView 事件
      this.setupBrowserViewEvents(tabId, browserView)

      // 存储标签页和 BrowserView
      this.tabs.set(tabId, tab)
      this.browserViews.set(tabId, browserView)

      // 加载URL
      await browserView.webContents.loadURL(options.url)

      // 如果是活动标签页，则显示
      if (options.isActive) {
        await this.switchTab(tabId)
      }

      tabLogger.info(`Tab created: ${tabId} - ${options.url}`)
      this.emit('tabCreated', tab)

      return tabId
    } catch (error) {
      tabLogger.error('Failed to create tab', error)
      throw error
    }
  }

  /**
   * 移除标签页
   */
  public async removeTab(tabId: string): Promise<void> {
    try {
      const tab = this.tabs.get(tabId)
      const browserView = this.browserViews.get(tabId)

      if (!tab || !browserView) {
        throw new Error(`Tab not found: ${tabId}`)
      }

      // 如果是当前活动标签页，需要切换到其他标签页
      if (this.activeTabId === tabId) {
        const remainingTabs = Array.from(this.tabs.keys()).filter(id => id !== tabId)
        if (remainingTabs.length > 0 && remainingTabs[0]) {
          await this.switchTab(remainingTabs[0])
        } else {
          this.activeTabId = null
          this.window.removeBrowserView(browserView)
        }
      }

      // 销毁 BrowserView
      if (!browserView.webContents.isDestroyed()) {
        browserView.webContents.close()
      }

      // 移除引用
      this.tabs.delete(tabId)
      this.browserViews.delete(tabId)

      tabLogger.info(`Tab removed: ${tabId}`)
      this.emit('tabRemoved', tab)
    } catch (error) {
      tabLogger.error('Failed to remove tab', error)
      throw error
    }
  }

  /**
   * 切换标签页
   */
  public async switchTab(tabId: string): Promise<void> {
    try {
      const tab = this.tabs.get(tabId)
      const browserView = this.browserViews.get(tabId)

      if (!tab || !browserView) {
        throw new Error(`Tab not found: ${tabId}`)
      }

      // 隐藏当前活动的 BrowserView
      if (this.activeTabId && this.activeTabId !== tabId) {
        const currentBrowserView = this.browserViews.get(this.activeTabId)
        if (currentBrowserView) {
          this.window.removeBrowserView(currentBrowserView)
        }
      }

      // 显示新的 BrowserView
      this.window.setBrowserView(browserView)
      this.updateBrowserViewBounds(browserView)

      // 更新活动标签页
      this.activeTabId = tabId

      // 更新标签页状态
      this.updateTabActiveState(tabId)

      tabLogger.info(`Switched to tab: ${tabId}`)
      this.emit('tabSwitched', tab)
    } catch (error) {
      tabLogger.error('Failed to switch tab', error)
      throw error
    }
  }

  /**
   * 获取标签页
   */
  public getTab(tabId: string): TabItem | undefined {
    return this.tabs.get(tabId)
  }

  /**
   * 获取所有标签页
   */
  public getAllTabs(): TabItem[] {
    return Array.from(this.tabs.values())
  }

  /**
   * 获取活动标签页
   */
  public getActiveTab(): TabItem | undefined {
    if (!this.activeTabId) return undefined
    return this.tabs.get(this.activeTabId)
  }

  /**
   * 更新标签页状态
   */
  public updateTabState(tabId: string, state: Partial<TabUpdateOptions>): void {
    const tab = this.tabs.get(tabId)
    if (!tab) return

    // 更新标签页数据
    Object.assign(tab, state, { updatedAt: new Date() })

    this.emit('tabUpdated', tab)
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    // 窗口大小改变时更新 BrowserView 边界
    this.window.on('resize', () => {
      this.updateAllBrowserViewBounds()
    })

    // 窗口关闭时清理资源
    this.window.on('closed', () => {
      this.cleanup()
    })
  }

  /**
   * 设置 BrowserView 事件
   */
  private setupBrowserViewEvents(tabId: string, browserView: BrowserView): void {
    const webContents = browserView.webContents

    // 页面开始加载
    webContents.on('did-start-loading', () => {
      this.updateTabState(tabId, { isLoading: true })
    })

    // 页面加载完成
    webContents.on('did-finish-load', () => {
      this.updateTabState(tabId, {
        isLoading: false,
        canGoBack: webContents.canGoBack(),
        canGoForward: webContents.canGoForward(),
      })
    })

    // 页面标题更新
    webContents.on('page-title-updated', (event, title) => {
      this.updateTabState(tabId, { title })
    })

    // 页面图标更新
    webContents.on('page-favicon-updated', (event, favicons) => {
      if (favicons.length > 0) {
        this.updateTabState(tabId, { favicon: favicons[0] })
      }
    })

    // 导航完成
    webContents.on('did-navigate', (event, url) => {
      this.updateTabState(tabId, {
        url,
        canGoBack: webContents.canGoBack(),
        canGoForward: webContents.canGoForward(),
      })
    })

    // 导航失败
    webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      this.updateTabState(tabId, {
        isLoading: false,
        title: `Failed to load: ${validatedURL}`,
      })
      tabLogger.error(`Tab ${tabId} failed to load: ${errorDescription}`)
    })
  }

  /**
   * 更新 BrowserView 边界
   */
  private updateBrowserViewBounds(browserView: BrowserView): void {
    const bounds = this.window.getBounds()
    const contentBounds: Rectangle = {
      x: 0,
      y: 40, // 为标签栏留出空间
      width: bounds.width,
      height: bounds.height - 40,
    }

    browserView.setBounds(contentBounds)
  }

  /**
   * 更新所有 BrowserView 边界
   */
  private updateAllBrowserViewBounds(): void {
    if (this.activeTabId) {
      const browserView = this.browserViews.get(this.activeTabId)
      if (browserView) {
        this.updateBrowserViewBounds(browserView)
      }
    }
  }

  /**
   * 更新标签页活动状态
   */
  private updateTabActiveState(activeTabId: string): void {
    for (const [tabId, tab] of this.tabs) {
      tab.isActive = tabId === activeTabId
      tab.updatedAt = new Date()
    }
  }

  /**
   * 清理资源
   */
  private cleanup(): void {
    // 销毁所有 BrowserView
    for (const browserView of this.browserViews.values()) {
      if (!browserView.webContents.isDestroyed()) {
        browserView.webContents.close()
      }
    }

    // 清空集合
    this.tabs.clear()
    this.browserViews.clear()
    this.activeTabId = null

    // 移除所有监听器
    this.removeAllListeners()

    tabLogger.info('TabManager cleaned up')
  }

  /**
   * 销毁管理器
   */
  public destroy(): void {
    this.cleanup()
  }
}