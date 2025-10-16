import { TabManager } from '@main/managers/TabManager'
import { BrowserView, BrowserWindow } from 'electron'

// Mock Electron modules
jest.mock('electron')

describe('TabManager', () => {
  let tabManager: TabManager
  let mockMainWindow: jest.Mocked<BrowserWindow>

  beforeEach(() => {
    mockMainWindow = {
      setBrowserView: jest.fn(),
      removeBrowserView: jest.fn(),
      getBounds: jest.fn(() => ({ x: 0, y: 0, width: 1200, height: 800 })),
      webContents: {
        send: jest.fn()
      }
    } as any

    tabManager = new TabManager(mockMainWindow)
    jest.clearAllMocks()
  })

  describe('createTab', () => {
    it('should create a new tab with correct properties', () => {
      const options = {
        url: 'https://example.com',
        title: 'Example',
        isActive: true
      }

      const tab = tabManager.createTab(options)

      expect(tab).toMatchObject({
        id: expect.any(String),
        url: 'https://example.com',
        title: 'Example',
        isActive: true,
        isLoading: false,
        canGoBack: false,
        canGoForward: false
      })

      expect(BrowserView).toHaveBeenCalledWith({
        webPreferences: expect.objectContaining({
          nodeIntegration: false,
          contextIsolation: true
        })
      })
    })

    it('should set tab as active if it is the first tab', () => {
      const options = {
        url: 'https://example.com'
      }

      const tab = tabManager.createTab(options)

      expect(tab.isActive).toBe(true)
      expect(mockMainWindow.setBrowserView).toHaveBeenCalled()
    })

    it('should not set tab as active if other tabs exist', () => {
      // Create first tab
      tabManager.createTab({ url: 'https://first.com' })
      
      // Create second tab
      const secondTab = tabManager.createTab({ url: 'https://second.com' })

      expect(secondTab.isActive).toBe(false)
    })
  })

  describe('removeTab', () => {
    it('should remove tab and its browser view', () => {
      const tab = tabManager.createTab({ url: 'https://example.com' })
      const browserView = tabManager['browserViews'].get(tab.id)
      const destroySpy = jest.spyOn(browserView!, 'webContents' as any, 'destroy')

      tabManager.removeTab(tab.id)

      expect(destroySpy).toHaveBeenCalled()
      expect(tabManager.getTab(tab.id)).toBeUndefined()
      expect(tabManager['browserViews'].has(tab.id)).toBe(false)
    })

    it('should switch to another tab if removing active tab', () => {
      const firstTab = tabManager.createTab({ url: 'https://first.com' })
      const secondTab = tabManager.createTab({ url: 'https://second.com' })
      
      // Switch to first tab
      tabManager.switchTab(firstTab.id)
      expect(firstTab.isActive).toBe(true)

      // Remove first tab
      tabManager.removeTab(firstTab.id)

      // Second tab should become active
      expect(secondTab.isActive).toBe(true)
    })

    it('should handle removing non-existing tab gracefully', () => {
      expect(() => {
        tabManager.removeTab('non-existing-id')
      }).not.toThrow()
    })
  })

  describe('switchTab', () => {
    it('should switch active tab correctly', () => {
      const firstTab = tabManager.createTab({ url: 'https://first.com' })
      const secondTab = tabManager.createTab({ url: 'https://second.com' })

      expect(firstTab.isActive).toBe(true)
      expect(secondTab.isActive).toBe(false)

      tabManager.switchTab(secondTab.id)

      expect(firstTab.isActive).toBe(false)
      expect(secondTab.isActive).toBe(true)
      expect(mockMainWindow.setBrowserView).toHaveBeenCalled()
    })

    it('should handle switching to non-existing tab gracefully', () => {
      expect(() => {
        tabManager.switchTab('non-existing-id')
      }).not.toThrow()
    })
  })

  describe('updateTabState', () => {
    it('should update tab state correctly', () => {
      const tab = tabManager.createTab({ url: 'https://example.com' })
      
      tabManager.updateTabState(tab.id, {
        title: 'Updated Title',
        isLoading: true,
        canGoBack: true
      })

      const updatedTab = tabManager.getTab(tab.id)
      expect(updatedTab).toMatchObject({
        title: 'Updated Title',
        isLoading: true,
        canGoBack: true
      })
    })

    it('should emit tab update event', () => {
      const tab = tabManager.createTab({ url: 'https://example.com' })
      const updateSpy = jest.fn()
      
      tabManager.on('tab-updated', updateSpy)
      
      tabManager.updateTabState(tab.id, { title: 'New Title' })
      
      expect(updateSpy).toHaveBeenCalledWith(tab.id, expect.objectContaining({
        title: 'New Title'
      }))
    })
  })

  describe('getAllTabs', () => {
    it('should return all tabs', () => {
      const firstTab = tabManager.createTab({ url: 'https://first.com' })
      const secondTab = tabManager.createTab({ url: 'https://second.com' })

      const allTabs = tabManager.getAllTabs()

      expect(allTabs).toHaveLength(2)
      expect(allTabs).toContain(firstTab)
      expect(allTabs).toContain(secondTab)
    })

    it('should return empty array when no tabs exist', () => {
      const allTabs = tabManager.getAllTabs()
      expect(allTabs).toEqual([])
    })
  })

  describe('getActiveTab', () => {
    it('should return active tab', () => {
      const firstTab = tabManager.createTab({ url: 'https://first.com' })
      const secondTab = tabManager.createTab({ url: 'https://second.com' })
      
      tabManager.switchTab(secondTab.id)
      
      const activeTab = tabManager.getActiveTab()
      expect(activeTab).toBe(secondTab)
    })

    it('should return undefined when no active tab exists', () => {
      const activeTab = tabManager.getActiveTab()
      expect(activeTab).toBeUndefined()
    })
  })
})