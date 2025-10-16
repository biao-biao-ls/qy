/**
 * TabManager 使用示例
 * 展示重构后的简化 API 使用方法
 */

import { BrowserWindow } from 'electron'
import { TabManager } from './TabManager'

export class TabManagerExample {
  private tabManager: TabManager

  constructor(window: BrowserWindow) {
    this.tabManager = new TabManager(window)
    this.setupEventListeners()
  }

  /**
   * 初始化示例
   */
  public async initialize(): Promise<void> {
    await this.tabManager.initialize()

    // 创建初始标签页
    await this.createInitialTabs()
  }

  /**
   * 创建初始标签页
   */
  private async createInitialTabs(): Promise<void> {
    try {
      // 创建主页标签页
      const homeTabId = await this.tabManager.createTab({
        url: 'https://lceda.cn',
        title: 'EDA 专业版',
        isActive: true,
      })

      // 创建用户中心标签页
      const userCenterTabId = await this.tabManager.createTab({
        url: 'https://lceda.cn/user-center',
        title: '用户中心',
        isActive: false,
      })

      console.log('Initial tabs created:', { homeTabId, userCenterTabId })
    } catch (error) {
      console.error('Failed to create initial tabs:', error)
    }
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听标签页创建
    this.tabManager.on('tab-created', ({ tabId, tab }) => {
      console.log(`Tab created: ${tab.title} (${tabId})`)
    })

    // 监听标签页切换
    this.tabManager.on('tab-switched', ({ tabId, tab }) => {
      console.log(`Switched to tab: ${tab.title} (${tabId})`)
    })

    // 监听标签页关闭
    this.tabManager.on('tab-removed', ({ tabId, tab }) => {
      console.log(`Tab removed: ${tab.title} (${tabId})`)
    })

    // 监听标签页加载状态
    this.tabManager.on('tab-loading-start', ({ tabId }) => {
      console.log(`Tab loading started: ${tabId}`)
    })

    this.tabManager.on('tab-loading-end', ({ tabId }) => {
      console.log(`Tab loading finished: ${tabId}`)
    })

    // 监听标签页拖拽
    this.tabManager.on('tab-drag-start', ({ tabId }) => {
      console.log(`Tab drag started: ${tabId}`)
    })

    this.tabManager.on('tab-drag-end', ({ tabId }) => {
      console.log(`Tab drag ended: ${tabId}`)
    })

    // 监听标签页移动
    this.tabManager.on('tab-moved', ({ tabId, oldPosition, newPosition }) => {
      console.log(`Tab moved: ${tabId} from ${oldPosition} to ${newPosition}`)
    })
  }

  /**
   * 演示基本操作
   */
  public async demonstrateBasicOperations(): Promise<void> {
    console.log('=== TabManager Basic Operations Demo ===')

    // 1. 创建新标签页
    console.log('1. Creating new tab...')
    const newTabId = await this.tabManager.createTab({
      url: 'https://jlcpcb.com',
      title: 'JLCPCB',
      isActive: false,
    })

    // 2. 获取所有标签页
    console.log('2. Getting all tabs...')
    const allTabs = this.tabManager.getAllTabs()
    console.log(`Total tabs: ${allTabs.length}`)
    allTabs.forEach(tab => {
      console.log(`  - ${tab.title} (${tab.id}) - Active: ${tab.isActive}`)
    })

    // 3. 切换标签页
    console.log('3. Switching to new tab...')
    await this.tabManager.switchTab(newTabId)

    // 4. 导航到新 URL
    console.log('4. Navigating to new URL...')
    await this.tabManager.navigateTab(newTabId, 'https://jlcpcb.com/quote')

    // 5. 重新加载标签页
    console.log('5. Reloading tab...')
    this.tabManager.reloadTab(newTabId)

    // 6. 获取性能统计
    console.log('6. Getting performance stats...')
    const stats = this.tabManager.getPerformanceStats(newTabId)
    if (stats) {
      console.log(`  Load time: ${stats.loadTime}ms`)
      console.log(`  Navigation count: ${stats.navigationCount}`)
      console.log(`  Last active: ${stats.lastActiveTime}`)
    }
  }

  /**
   * 演示拖拽功能
   */
  public async demonstrateDragAndDrop(): Promise<void> {
    console.log('=== TabManager Drag & Drop Demo ===')

    // 创建多个标签页用于演示
    const tab1Id = await this.tabManager.createTab({
      url: 'https://example1.com',
      title: 'Tab 1',
    })

    const tab2Id = await this.tabManager.createTab({
      url: 'https://example2.com',
      title: 'Tab 2',
    })

    const tab3Id = await this.tabManager.createTab({
      url: 'https://example3.com',
      title: 'Tab 3',
    })

    console.log('Created 3 tabs for drag demo')

    // 演示拖拽操作
    console.log('Starting drag operation...')
    this.tabManager.startDragTab(tab2Id)

    console.log('Moving to position 0...')
    this.tabManager.dragTabToPosition(0)

    console.log('Ending drag operation...')
    this.tabManager.endDragTab()

    // 显示最终顺序
    const finalTabs = this.tabManager.getAllTabs()
    console.log('Final tab order:')
    finalTabs.forEach((tab, index) => {
      console.log(`  ${index}: ${tab.title} (position: ${tab.position})`)
    })
  }

  /**
   * 演示批量操作
   */
  public async demonstrateBatchOperations(): Promise<void> {
    console.log('=== TabManager Batch Operations Demo ===')

    // 创建多个标签页
    const tabIds: string[] = []
    for (let i = 1; i <= 5; i++) {
      const tabId = await this.tabManager.createTab({
        url: `https://example${i}.com`,
        title: `Batch Tab ${i}`,
      })
      tabIds.push(tabId)
    }

    console.log(`Created ${tabIds.length} tabs for batch demo`)

    // 批量重新加载前3个标签页
    console.log('Batch reloading first 3 tabs...')
    const reloadResult = this.tabManager.reloadTabs(tabIds.slice(0, 3))
    console.log(
      `Reload result: ${reloadResult.success.length} success, ${reloadResult.failed.length} failed`
    )

    // 批量关闭后2个标签页
    console.log('Batch closing last 2 tabs...')
    const closeResult = await this.tabManager.closeTabs(tabIds.slice(3))
    console.log(
      `Close result: ${closeResult.success.length} success, ${closeResult.failed.length} failed`
    )

    console.log(`Remaining tabs: ${this.tabManager.getTabCount()}`)
  }

  /**
   * 演示导航历史
   */
  public async demonstrateNavigationHistory(): Promise<void> {
    console.log('=== TabManager Navigation History Demo ===')

    // 创建标签页并导航到多个页面
    const tabId = await this.tabManager.createTab({
      url: 'https://example.com',
      title: 'Navigation Demo',
      isActive: true,
    })

    // 模拟导航到不同页面
    await this.tabManager.navigateTab(tabId, 'https://example.com/page1')
    await this.tabManager.navigateTab(tabId, 'https://example.com/page2')
    await this.tabManager.navigateTab(tabId, 'https://example.com/page3')

    // 获取导航历史
    const history = this.tabManager.getNavigationHistory(tabId)
    if (history) {
      console.log(`Navigation history for tab ${tabId}:`)
      console.log(`  Current index: ${history.currentIndex}`)
      console.log(`  Can go back: ${history.canGoBack}`)
      console.log(`  Can go forward: ${history.canGoForward}`)
      console.log(`  History entries: ${history.entries.length}`)

      history.entries.forEach((entry, index) => {
        console.log(`    ${index}: ${entry.url} - ${entry.title}`)
      })
    }
  }

  /**
   * 获取管理器状态
   */
  public getManagerStatus(): void {
    console.log('=== TabManager Status ===')

    const state = this.tabManager.getManagerState()
    console.log(`Active tab: ${state.activeTabId}`)
    console.log(`Tab count: ${state.tabCount}`)
    console.log(`Max tabs: ${state.maxTabs}`)

    const dragState = this.tabManager.getDragState()
    console.log(`Drag state: ${dragState.isDragging ? 'dragging' : 'idle'}`)
    if (dragState.isDragging) {
      console.log(`  Dragging tab: ${dragState.dragTabId}`)
      console.log(`  Target position: ${dragState.targetPosition}`)
    }

    const allStats = this.tabManager.getAllPerformanceStats()
    console.log(`Performance stats available for ${allStats.length} tabs`)
  }

  /**
   * 清理资源
   */
  public destroy(): void {
    this.tabManager.destroy()
    console.log('TabManager destroyed')
  }
}

// 使用示例
export async function runTabManagerDemo(window: BrowserWindow): Promise<void> {
  const example = new TabManagerExample(window)

  try {
    await example.initialize()
    await example.demonstrateBasicOperations()
    await example.demonstrateDragAndDrop()
    await example.demonstrateBatchOperations()
    await example.demonstrateNavigationHistory()
    example.getManagerStatus()
  } catch (error) {
    console.error('Demo failed:', error)
  } finally {
    // 注意：在实际应用中，不要立即销毁，这里只是为了演示
    // example.destroy()
  }
}
