/**
 * TabManager 测试文件
 * 验证重构后的核心功能
 */

import { BrowserWindow } from 'electron'
import { TabManager } from '../TabManager'

// Mock Electron modules
jest.mock('electron', () => ({
  BrowserWindow: jest.fn(),
  BrowserView: jest.fn(() => ({
    webContents: {
      loadURL: jest.fn().mockResolvedValue(undefined),
      canGoBack: jest.fn().mockReturnValue(false),
      canGoForward: jest.fn().mockReturnValue(false),
      focus: jest.fn(),
      close: jest.fn(),
      isDestroyed: jest.fn().mockReturnValue(false),
      on: jest.fn(),
      setWindowOpenHandler: jest.fn(),
    },
    setBounds: jest.fn(),
  })),
}))

describe('TabManager', () => {
  let tabManager: TabManager
  let mockWindow: jest.Mocked<BrowserWindow>

  beforeEach(() => {
    mockWindow = {
      getBounds: jest.fn().mockReturnValue({ width: 1200, height: 800 }),
      setBrowserView: jest.fn(),
      removeBrowserView: jest.fn(),
      on: jest.fn(),
    } as any

    tabManager = new TabManager(mockWindow)
  })

  afterEach(() => {
    tabManager.destroy()
  })

  describe('Tab Creation', () => {
    it('should create a tab successfully', async () => {
      const tabId = await tabManager.createTab({
        url: 'https://example.com',
        title: 'Test Tab',
        isActive: true,
      })

      expect(tabId).toBeDefined()
      expect(typeof tabId).toBe('string')
      expect(tabManager.getTabCount()).toBe(1)
      expect(tabManager.getActiveTab()?.id).toBe(tabId)
    })

    it('should respect max tabs limit', async () => {
      tabManager.setMaxTabs(2)

      await tabManager.createTab({ url: 'https://example1.com' })
      await tabManager.createTab({ url: 'https://example2.com' })

      await expect(
        tabManager.createTab({ url: 'https://example3.com' })
      ).rejects.toThrow('Maximum tab limit reached')
    })
  })

  describe('Tab Management', () => {
    it('should switch between tabs', async () => {
      const tab1Id = await tabManager.createTab({ url: 'https://example1.com' })
      const tab2Id = await tabManager.createTab({ url: 'https://example2.com' })

      await tabManager.switchTab(tab1Id)
      expect(tabManager.getActiveTab()?.id).toBe(tab1Id)

      await tabManager.switchTab(tab2Id)
      expect(tabManager.getActiveTab()?.id).toBe(tab2Id)
    })

    it('should remove tabs correctly', async () => {
      const tab1Id = await tabManager.createTab({ url: 'https://example1.com' })
      const tab2Id = await tabManager.createTab({ url: 'https://example2.com' })

      expect(tabManager.getTabCount()).toBe(2)

      await tabManager.removeTab(tab1Id)
      expect(tabManager.getTabCount()).toBe(1)
      expect(tabManager.getTab(tab1Id)).toBeUndefined()
      expect(tabManager.getTab(tab2Id)).toBeDefined()
    })
  })

  describe('Drag and Drop', () => {
    it('should handle tab dragging', async () => {
      const tabId = await tabManager.createTab({ url: 'https://example.com' })

      tabManager.startDragTab(tabId)
      expect(tabManager.getDragState().isDragging).toBe(true)
      expect(tabManager.getDragState().dragTabId).toBe(tabId)

      tabManager.dragTabToPosition(1)
      expect(tabManager.getDragState().targetPosition).toBe(1)

      tabManager.endDragTab()
      expect(tabManager.getDragState().isDragging).toBe(false)
    })

    it('should cancel drag operation', async () => {
      const tabId = await tabManager.createTab({ url: 'https://example.com' })

      tabManager.startDragTab(tabId)
      expect(tabManager.getDragState().isDragging).toBe(true)

      tabManager.cancelDragTab()
      expect(tabManager.getDragState().isDragging).toBe(false)
      expect(tabManager.getDragState().dragTabId).toBe(null)
    })
  })

  describe('Navigation History', () => {
    it('should track navigation history', async () => {
      const tabId = await tabManager.createTab({ url: 'https://example.com' })
      
      // Navigation history should be initialized
      const history = tabManager.getNavigationHistory(tabId)
      expect(history).toBeDefined()
      expect(history?.entries.length).toBeGreaterThan(0)
    })

    it('should clear navigation history', async () => {
      const tabId = await tabManager.createTab({ url: 'https://example.com' })
      
      tabManager.clearNavigationHistory(tabId)
      const history = tabManager.getNavigationHistory(tabId)
      expect(history).toBeUndefined()
    })
  })

  describe('Performance Stats', () => {
    it('should track performance statistics', async () => {
      const tabId = await tabManager.createTab({ url: 'https://example.com' })
      
      const stats = tabManager.getPerformanceStats(tabId)
      expect(stats).toBeDefined()
      expect(stats?.tabId).toBe(tabId)
      expect(stats?.navigationCount).toBe(0)
    })

    it('should provide all performance stats', async () => {
      await tabManager.createTab({ url: 'https://example1.com' })
      await tabManager.createTab({ url: 'https://example2.com' })
      
      const allStats = tabManager.getAllPerformanceStats()
      expect(allStats.length).toBe(2)
    })
  })

  describe('Batch Operations', () => {
    it('should close multiple tabs', async () => {
      const tab1Id = await tabManager.createTab({ url: 'https://example1.com' })
      const tab2Id = await tabManager.createTab({ url: 'https://example2.com' })
      const tab3Id = await tabManager.createTab({ url: 'https://example3.com' })

      const result = await tabManager.closeTabs([tab1Id, tab2Id])
      
      expect(result.success).toContain(tab1Id)
      expect(result.success).toContain(tab2Id)
      expect(result.failed).toHaveLength(0)
      expect(tabManager.getTabCount()).toBe(1)
      expect(tabManager.getTab(tab3Id)).toBeDefined()
    })

    it('should reload multiple tabs', async () => {
      const tab1Id = await tabManager.createTab({ url: 'https://example1.com' })
      const tab2Id = await tabManager.createTab({ url: 'https://example2.com' })

      const result = tabManager.reloadTabs([tab1Id, tab2Id])
      
      expect(result.success).toContain(tab1Id)
      expect(result.success).toContain(tab2Id)
      expect(result.failed).toHaveLength(0)
    })
  })
})