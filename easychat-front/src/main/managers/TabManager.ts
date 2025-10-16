/**
 * 标签页管理器
 * 简化的标签页管理系统，基于 BrowserView
 * 移除了复杂的事件系统和过度抽象，专注于核心功能
 */

import { BrowserView, BrowserWindow, Rectangle } from 'electron'
import { EventEmitter } from 'events'
import {
  TabBatchOperationResult,
  TabCreateOptions,
  TabDragState,
  TabItem,
  TabManagerState,
  TabNavigationHistory,
  TabOperationOptions,
  TabPerformanceStats,
  TabUpdateOptions,
} from '../../types/tab'
import { tabLogger } from '../../utils/logger'
import { generateId } from '../../utils/helpers'

export class TabManager extends EventEmitter {
  private window: BrowserWindow
  private tabs: Map<string, TabItem> = new Map()
  private browserViews: Map<string, BrowserView> = new Map()
  private activeTabId: string | null = null
  private isInitialized = false
  private maxTabs = 20 // 最大标签页数量限制

  // 拖拽状态管理
  private dragState: TabDragState = {
    isDragging: false,
    dragTabId: null,
    targetPosition: null,
  }

  // 导航历史管理
  private navigationHistories: Map<string, TabNavigationHistory> = new Map()

  // 性能统计
  private performanceStats: Map<string, TabPerformanceStats> = new Map()

  constructor(window: BrowserWindow) {
    super()
    this.window = window
    this.setupWindowEventHandlers()
  }

  /**
   * 初始化标签页管理器
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
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
      // 检查标签页数量限制
      if (this.tabs.size >= this.maxTabs) {
        throw new Error(`Maximum tab limit reached: ${this.maxTabs}`)
      }

      const tabId = generateId()
      const now = new Date()

      // 创建标签页数据
      const tab: TabItem = {
        id: tabId,
        title: options.title || 'New Tab',
        url: options.url,
        favicon: undefined,
        isActive: false, // 初始为非活动状态
        isLoading: true,
        canGoBack: false,
        canGoForward: false,
        createdAt: now,
        updatedAt: now,
        position: options.position ?? this.tabs.size,
      }

      // 创建 BrowserView
      const browserView = this.createBrowserView()

      // 设置 BrowserView 事件
      this.setupBrowserViewEvents(tabId, browserView)

      // 初始化性能统计和导航历史
      this.initPerformanceStats(tabId)
      this.updateNavigationHistory(tabId, options.url, tab.title)

      // 存储标签页和 BrowserView
      this.tabs.set(tabId, tab)
      this.browserViews.set(tabId, browserView)

      // 加载URL
      const loadStartTime = Date.now()
      try {
        await browserView.webContents.loadURL(options.url)
        const loadTime = Date.now() - loadStartTime
        this.updatePerformanceStats(tabId, { loadTime })
      } catch (loadError) {
        tabLogger.error(`Failed to load URL: ${options.url}`, loadError)
        // 继续创建标签页，但标记为加载失败
        tab.isLoading = false
        tab.title = 'Failed to load'
      }

      // 如果是活动标签页，则显示
      if (options.isActive) {
        await this.switchTab(tabId)
      }

      tabLogger.info(`Tab created: ${tabId} - ${options.url}`)
      this.emit('tab-created', { tabId, tab })

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
        if (remainingTabs.length > 0) {
          // 选择下一个标签页（优先选择右边的，没有则选择左边的）
          const currentIndex = Array.from(this.tabs.keys()).indexOf(tabId)
          const nextIndex = Math.min(currentIndex, remainingTabs.length - 1)
          const nextTabId = remainingTabs[nextIndex]
          if (nextTabId) {
            await this.switchTab(nextTabId)
          }
        } else {
          // 没有其他标签页了
          this.activeTabId = null
          this.window.removeBrowserView(browserView)
        }
      } else {
        // 如果不是活动标签页，直接从窗口移除
        this.window.removeBrowserView(browserView)
      }

      // 销毁 BrowserView
      this.destroyBrowserView(browserView)

      // 清理相关数据
      this.tabs.delete(tabId)
      this.browserViews.delete(tabId)
      this.navigationHistories.delete(tabId)
      this.performanceStats.delete(tabId)

      // 重新计算其他标签页的位置
      this.reorderTabPositions()

      tabLogger.info(`Tab removed: ${tabId}`)
      this.emit('tab-removed', { tabId, tab })
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

      // 如果已经是当前活动标签页，直接返回
      if (this.activeTabId === tabId) {
        return
      }

      // 隐藏当前活动的 BrowserView
      if (this.activeTabId) {
        const currentBrowserView = this.browserViews.get(this.activeTabId)
        if (currentBrowserView) {
          this.window.removeBrowserView(currentBrowserView)
        }
        // 更新之前活动标签页的状态
        const previousTab = this.tabs.get(this.activeTabId)
        if (previousTab) {
          previousTab.isActive = false
          previousTab.updatedAt = new Date()
        }
      }

      // 显示新的 BrowserView
      this.window.setBrowserView(browserView)
      this.updateBrowserViewBounds(browserView)

      // 更新活动标签页状态
      this.activeTabId = tabId
      tab.isActive = true
      tab.updatedAt = new Date()

      // 更新性能统计
      this.updatePerformanceStats(tabId, { lastActiveTime: new Date() })

      // 聚焦到新的 BrowserView
      browserView.webContents.focus()

      tabLogger.info(`Switched to tab: ${tabId}`)
      this.emit('tab-switched', { tabId, tab })
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

    this.emit('tab-updated', { tabId, tab, changes: state })
  }

  /**
   * 导航到指定 URL
   */
  public async navigateTab(tabId: string, url: string): Promise<void> {
    const browserView = this.browserViews.get(tabId)
    if (!browserView) {
      throw new Error(`Tab not found: ${tabId}`)
    }

    try {
      await browserView.webContents.loadURL(url)
      this.updateTabState(tabId, { url, isLoading: true })
      tabLogger.info(`Tab navigated: ${tabId} -> ${url}`)
    } catch (error) {
      tabLogger.error(`Failed to navigate tab ${tabId} to ${url}`, error)
      throw error
    }
  }

  /**
   * 重新加载标签页
   */
  public reloadTab(tabId: string): void {
    const browserView = this.browserViews.get(tabId)
    if (!browserView) {
      throw new Error(`Tab not found: ${tabId}`)
    }

    browserView.webContents.reload()
    this.updateTabState(tabId, { isLoading: true })
    tabLogger.info(`Tab reloaded: ${tabId}`)
  }

  /**
   * 停止加载标签页
   */
  public stopTab(tabId: string): void {
    const browserView = this.browserViews.get(tabId)
    if (!browserView) {
      throw new Error(`Tab not found: ${tabId}`)
    }

    browserView.webContents.stop()
    this.updateTabState(tabId, { isLoading: false })
    tabLogger.info(`Tab stopped: ${tabId}`)
  }

  /**
   * 标签页后退
   */
  public goBackTab(tabId: string): void {
    const browserView = this.browserViews.get(tabId)
    if (!browserView || !browserView.webContents.canGoBack()) {
      return
    }

    browserView.webContents.goBack()
    tabLogger.info(`Tab went back: ${tabId}`)
  }

  /**
   * 标签页前进
   */
  public goForwardTab(tabId: string): void {
    const browserView = this.browserViews.get(tabId)
    if (!browserView || !browserView.webContents.canGoForward()) {
      return
    }

    browserView.webContents.goForward()
    tabLogger.info(`Tab went forward: ${tabId}`)
  }

  /**
   * 移动标签页位置
   */
  public moveTab(tabId: string, newPosition: number): void {
    const tab = this.tabs.get(tabId)
    if (!tab) {
      throw new Error(`Tab not found: ${tabId}`)
    }

    const maxPosition = this.tabs.size - 1
    const targetPosition = Math.max(0, Math.min(newPosition, maxPosition))

    if (tab.position === targetPosition) {
      return
    }

    const oldPosition = tab.position
    tab.position = targetPosition
    tab.updatedAt = new Date()

    // 重新计算其他标签页的位置
    this.reorderTabPositions()

    this.emit('tab-moved', { tabId, oldPosition, newPosition: targetPosition })
    tabLogger.info(`Tab moved: ${tabId} from ${oldPosition} to ${targetPosition}`)
  }

  /**
   * 关闭所有标签页
   */
  public async closeAllTabs(): Promise<void> {
    const tabIds = Array.from(this.tabs.keys())

    for (const tabId of tabIds) {
      try {
        await this.removeTab(tabId)
      } catch (error) {
        tabLogger.error(`Failed to close tab ${tabId}`, error)
      }
    }

    tabLogger.info('All tabs closed')
  }

  /**
   * 获取标签页数量
   */
  public getTabCount(): number {
    return this.tabs.size
  }

  /**
   * 检查是否有标签页
   */
  public hasTabs(): boolean {
    return this.tabs.size > 0
  }

  /**
   * 获取标签页的 BrowserView
   */
  public getBrowserView(tabId: string): BrowserView | undefined {
    return this.browserViews.get(tabId)
  }

  // ==================== 拖拽功能 ====================

  /**
   * 开始拖拽标签页
   */
  public startDragTab(tabId: string): void {
    const tab = this.tabs.get(tabId)
    if (!tab) {
      throw new Error(`Tab not found: ${tabId}`)
    }

    this.dragState = {
      isDragging: true,
      dragTabId: tabId,
      targetPosition: tab.position,
    }

    this.emit('tab-drag-start', { tabId, position: tab.position })
    tabLogger.info(`Tab drag started: ${tabId}`)
  }

  /**
   * 拖拽标签页到指定位置
   */
  public dragTabToPosition(targetPosition: number): void {
    if (!this.dragState.isDragging || !this.dragState.dragTabId) {
      return
    }

    const maxPosition = this.tabs.size - 1
    const validPosition = Math.max(0, Math.min(targetPosition, maxPosition))

    this.dragState.targetPosition = validPosition
    this.emit('tab-drag-move', {
      tabId: this.dragState.dragTabId,
      targetPosition: validPosition,
    })
  }

  /**
   * 结束拖拽标签页
   */
  public endDragTab(): void {
    if (!this.dragState.isDragging || !this.dragState.dragTabId) {
      return
    }

    const { dragTabId, targetPosition } = this.dragState

    // 如果目标位置有效，执行移动
    if (targetPosition !== null) {
      this.moveTab(dragTabId, targetPosition)
    }

    // 重置拖拽状态
    this.dragState = {
      isDragging: false,
      dragTabId: null,
      targetPosition: null,
    }

    this.emit('tab-drag-end', { tabId: dragTabId })
    tabLogger.info(`Tab drag ended: ${dragTabId}`)
  }

  /**
   * 取消拖拽
   */
  public cancelDragTab(): void {
    if (!this.dragState.isDragging) {
      return
    }

    const dragTabId = this.dragState.dragTabId

    // 重置拖拽状态
    this.dragState = {
      isDragging: false,
      dragTabId: null,
      targetPosition: null,
    }

    this.emit('tab-drag-cancel', { tabId: dragTabId })
    tabLogger.info(`Tab drag cancelled: ${dragTabId}`)
  }

  /**
   * 获取拖拽状态
   */
  public getDragState(): TabDragState {
    return { ...this.dragState }
  }

  // ==================== 导航历史管理 ====================

  /**
   * 更新标签页导航历史
   */
  private updateNavigationHistory(tabId: string, url: string, title: string): void {
    let history = this.navigationHistories.get(tabId)

    if (!history) {
      history = {
        canGoBack: false,
        canGoForward: false,
        currentIndex: 0,
        entries: [],
      }
      this.navigationHistories.set(tabId, history)
    }

    // 添加新的历史条目
    const newEntry = {
      url,
      title,
      timestamp: new Date(),
    }

    // 如果当前不在历史末尾，删除后面的条目
    if (history.currentIndex < history.entries.length - 1) {
      history.entries = history.entries.slice(0, history.currentIndex + 1)
    }

    history.entries.push(newEntry)
    history.currentIndex = history.entries.length - 1

    // 更新导航状态
    const browserView = this.browserViews.get(tabId)
    if (browserView) {
      history.canGoBack = browserView.webContents.canGoBack()
      history.canGoForward = browserView.webContents.canGoForward()
    }
  }

  /**
   * 获取标签页导航历史
   */
  public getNavigationHistory(tabId: string): TabNavigationHistory | undefined {
    return this.navigationHistories.get(tabId)
  }

  /**
   * 清除标签页导航历史
   */
  public clearNavigationHistory(tabId: string): void {
    this.navigationHistories.delete(tabId)
  }

  // ==================== 性能统计 ====================

  /**
   * 初始化标签页性能统计
   */
  private initPerformanceStats(tabId: string): void {
    const stats: TabPerformanceStats = {
      tabId,
      memoryUsage: 0,
      loadTime: 0,
      lastActiveTime: new Date(),
      navigationCount: 0,
    }
    this.performanceStats.set(tabId, stats)
  }

  /**
   * 更新标签页性能统计
   */
  private updatePerformanceStats(tabId: string, updates: Partial<TabPerformanceStats>): void {
    const stats = this.performanceStats.get(tabId)
    if (stats) {
      Object.assign(stats, updates)
    }
  }

  /**
   * 获取标签页性能统计
   */
  public getPerformanceStats(tabId: string): TabPerformanceStats | undefined {
    return this.performanceStats.get(tabId)
  }

  /**
   * 获取所有标签页性能统计
   */
  public getAllPerformanceStats(): TabPerformanceStats[] {
    return Array.from(this.performanceStats.values())
  }

  // ==================== 批量操作 ====================

  /**
   * 批量关闭标签页
   */
  public async closeTabs(
    tabIds: string[],
    options: TabOperationOptions = {}
  ): Promise<TabBatchOperationResult> {
    const result: TabBatchOperationResult = {
      success: [],
      failed: [],
    }

    for (const tabId of tabIds) {
      try {
        await this.removeTab(tabId)
        result.success.push(tabId)
      } catch (error) {
        result.failed.push({
          tabId,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    if (!options.silent) {
      this.emit('tabs-batch-closed', result)
    }

    return result
  }

  /**
   * 批量重新加载标签页
   */
  public reloadTabs(tabIds: string[], options: TabOperationOptions = {}): TabBatchOperationResult {
    const result: TabBatchOperationResult = {
      success: [],
      failed: [],
    }

    for (const tabId of tabIds) {
      try {
        this.reloadTab(tabId)
        result.success.push(tabId)
      } catch (error) {
        result.failed.push({
          tabId,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    if (!options.silent) {
      this.emit('tabs-batch-reloaded', result)
    }

    return result
  }

  // ==================== 状态管理 ====================

  /**
   * 获取管理器状态
   */
  public getManagerState(): TabManagerState {
    return {
      activeTabId: this.activeTabId,
      tabCount: this.tabs.size,
      maxTabs: this.maxTabs,
    }
  }

  /**
   * 设置最大标签页数量
   */
  public setMaxTabs(maxTabs: number): void {
    this.maxTabs = Math.max(1, maxTabs)
    this.emit('max-tabs-changed', { maxTabs: this.maxTabs })
  }

  /**
   * 设置窗口事件处理器
   */
  private setupWindowEventHandlers(): void {
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
   * 创建 BrowserView 实例
   */
  private createBrowserView(): BrowserView {
    return new BrowserView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true,
        allowRunningInsecureContent: false,
        experimentalFeatures: false,
      },
    })
  }

  /**
   * 销毁 BrowserView
   */
  private destroyBrowserView(browserView: BrowserView): void {
    try {
      if (!browserView.webContents.isDestroyed()) {
        browserView.webContents.close()
      }
    } catch (error) {
      tabLogger.error('Failed to destroy BrowserView', error)
    }
  }

  /**
   * 重新计算标签页位置
   */
  private reorderTabPositions(): void {
    const tabs = Array.from(this.tabs.values()).sort((a, b) => a.position - b.position)
    tabs.forEach((tab, index) => {
      tab.position = index
      tab.updatedAt = new Date()
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
      this.emit('tab-loading-start', { tabId })
    })

    // 页面加载完成
    webContents.on('did-finish-load', () => {
      this.updateTabState(tabId, {
        isLoading: false,
        canGoBack: webContents.canGoBack(),
        canGoForward: webContents.canGoForward(),
      })
      this.emit('tab-loading-end', { tabId })
    })

    // 页面标题更新
    webContents.on('page-title-updated', (event, title) => {
      this.updateTabState(tabId, { title })
      this.emit('tab-title-updated', { tabId, title })
    })

    // 页面图标更新
    webContents.on('page-favicon-updated', (event, favicons) => {
      if (favicons.length > 0) {
        this.updateTabState(tabId, { favicon: favicons[0] })
        this.emit('tab-favicon-updated', { tabId, favicon: favicons[0] })
      }
    })

    // 导航完成
    webContents.on('did-navigate', (event, url) => {
      const tab = this.tabs.get(tabId)
      const title = tab?.title || 'Loading...'

      this.updateTabState(tabId, {
        url,
        canGoBack: webContents.canGoBack(),
        canGoForward: webContents.canGoForward(),
      })

      // 更新导航历史
      this.updateNavigationHistory(tabId, url, title)

      // 更新性能统计
      const stats = this.performanceStats.get(tabId)
      if (stats) {
        stats.navigationCount++
      }

      this.emit('tab-navigated', { tabId, url })
    })

    // 导航失败
    webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      this.updateTabState(tabId, {
        isLoading: false,
        title: `Failed to load: ${validatedURL}`,
      })
      tabLogger.error(`Tab ${tabId} failed to load: ${errorDescription}`)
      this.emit('tab-load-failed', { tabId, errorCode, errorDescription, url: validatedURL })
    })

    // 渲染进程崩溃
    webContents.on('render-process-gone', (event, details) => {
      tabLogger.error(`Tab ${tabId} render process gone`, details)
      this.updateTabState(tabId, {
        isLoading: false,
        title: 'Page crashed',
      })
      this.emit('tab-crashed', { tabId, details })
    })

    // 新窗口请求
    webContents.setWindowOpenHandler(({ url }) => {
      // 在新标签页中打开
      this.createTab({ url, isActive: true })
      return { action: 'deny' }
    })
  }

  /**
   * 更新 BrowserView 边界
   */
  private updateBrowserViewBounds(browserView: BrowserView): void {
    try {
      const windowBounds = this.window.getBounds()
      const contentBounds: Rectangle = {
        x: 0,
        y: 40, // 为标签栏留出空间
        width: windowBounds.width,
        height: Math.max(0, windowBounds.height - 40),
      }

      browserView.setBounds(contentBounds)
    } catch (error) {
      tabLogger.error('Failed to update BrowserView bounds', error)
    }
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
   * 清理资源
   */
  private cleanup(): void {
    // 销毁所有 BrowserView
    for (const browserView of this.browserViews.values()) {
      this.destroyBrowserView(browserView)
    }

    // 清空所有集合
    this.tabs.clear()
    this.browserViews.clear()
    this.navigationHistories.clear()
    this.performanceStats.clear()
    this.activeTabId = null

    // 重置拖拽状态
    this.dragState = {
      isDragging: false,
      dragTabId: null,
      targetPosition: null,
    }

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
