import { WindowManager } from '@main/managers/WindowManager'
import { BrowserWindow } from 'electron'

// Mock BrowserWindow
jest.mock('electron')

describe('WindowManager', () => {
  let windowManager: WindowManager
  
  beforeEach(() => {
    windowManager = new WindowManager()
    jest.clearAllMocks()
  })

  describe('createMainWindow', () => {
    it('should create main window with correct configuration', () => {
      const window = windowManager.createMainWindow()
      
      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          width: expect.any(Number),
          height: expect.any(Number),
          show: false,
          frame: false,
          titleBarStyle: 'hidden',
          webPreferences: expect.objectContaining({
            nodeIntegration: false,
            contextIsolation: true,
            preload: expect.any(String)
          })
        })
      )
      
      expect(window).toBeDefined()
    })

    it('should register window in windows map', () => {
      const window = windowManager.createMainWindow()
      const retrievedWindow = windowManager.getWindow('main')
      
      expect(retrievedWindow).toBe(window)
    })
  })

  describe('createLoginWindow', () => {
    it('should create login window with correct configuration', () => {
      const window = windowManager.createLoginWindow()
      
      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          width: expect.any(Number),
          height: expect.any(Number),
          resizable: false,
          maximizable: false,
          webPreferences: expect.objectContaining({
            nodeIntegration: false,
            contextIsolation: true
          })
        })
      )
      
      expect(window).toBeDefined()
    })
  })

  describe('createSettingWindow', () => {
    it('should create setting window with correct configuration', () => {
      const window = windowManager.createSettingWindow()
      
      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          width: expect.any(Number),
          height: expect.any(Number),
          resizable: true,
          webPreferences: expect.objectContaining({
            nodeIntegration: false,
            contextIsolation: true
          })
        })
      )
      
      expect(window).toBeDefined()
    })
  })

  describe('getWindow', () => {
    it('should return existing window', () => {
      const window = windowManager.createMainWindow()
      const retrievedWindow = windowManager.getWindow('main')
      
      expect(retrievedWindow).toBe(window)
    })

    it('should return undefined for non-existing window', () => {
      const window = windowManager.getWindow('non-existing')
      
      expect(window).toBeUndefined()
    })
  })

  describe('closeWindow', () => {
    it('should close and remove window from map', () => {
      const window = windowManager.createMainWindow()
      const closeSpy = jest.spyOn(window, 'close')
      
      windowManager.closeWindow('main')
      
      expect(closeSpy).toHaveBeenCalled()
      expect(windowManager.getWindow('main')).toBeUndefined()
    })

    it('should handle closing non-existing window gracefully', () => {
      expect(() => {
        windowManager.closeWindow('non-existing')
      }).not.toThrow()
    })
  })

  describe('closeAllWindows', () => {
    it('should close all windows', () => {
      const mainWindow = windowManager.createMainWindow()
      const loginWindow = windowManager.createLoginWindow()
      
      const mainCloseSpy = jest.spyOn(mainWindow, 'close')
      const loginCloseSpy = jest.spyOn(loginWindow, 'close')
      
      windowManager.closeAllWindows()
      
      expect(mainCloseSpy).toHaveBeenCalled()
      expect(loginCloseSpy).toHaveBeenCalled()
      expect(windowManager.getWindow('main')).toBeUndefined()
      expect(windowManager.getWindow('login')).toBeUndefined()
    })
  })
})