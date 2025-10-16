import { AppConfig } from '@main/config/AppConfig'
import Store from 'electron-store'

// Mock electron-store
jest.mock('electron-store')

describe('AppConfig', () => {
  let appConfig: AppConfig
  let mockStore: jest.Mocked<Store>

  beforeEach(() => {
    mockStore = {
      get: jest.fn(),
      set: jest.fn(),
      has: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      size: 0,
      store: {}
    } as any

    ;(Store as jest.MockedClass<typeof Store>).mockImplementation(() => mockStore)
    
    appConfig = new AppConfig()
    jest.clearAllMocks()
  })

  describe('get', () => {
    it('should get value from store', () => {
      const mockValue = { theme: 'dark' }
      mockStore.get.mockReturnValue(mockValue)

      const result = appConfig.get('preferences')

      expect(mockStore.get).toHaveBeenCalledWith('preferences')
      expect(result).toBe(mockValue)
    })

    it('should return default value when key does not exist', () => {
      mockStore.get.mockReturnValue(undefined)

      const result = appConfig.get('preferences')

      expect(result).toBeUndefined()
    })
  })

  describe('set', () => {
    it('should set value in store', () => {
      const value = { theme: 'light', language: 'en' }

      appConfig.set('preferences', value)

      expect(mockStore.set).toHaveBeenCalledWith('preferences', value)
    })

    it('should emit change event', () => {
      const changeHandler = jest.fn()
      appConfig.on('config-changed', changeHandler)

      const value = { theme: 'dark' }
      appConfig.set('preferences', value)

      expect(changeHandler).toHaveBeenCalledWith('preferences', value)
    })
  })

  describe('has', () => {
    it('should check if key exists in store', () => {
      mockStore.has.mockReturnValue(true)

      const result = appConfig.has('preferences')

      expect(mockStore.has).toHaveBeenCalledWith('preferences')
      expect(result).toBe(true)
    })
  })

  describe('delete', () => {
    it('should delete key from store', () => {
      appConfig.delete('preferences')

      expect(mockStore.delete).toHaveBeenCalledWith('preferences')
    })

    it('should emit change event when deleting', () => {
      const changeHandler = jest.fn()
      appConfig.on('config-changed', changeHandler)

      appConfig.delete('preferences')

      expect(changeHandler).toHaveBeenCalledWith('preferences', undefined)
    })
  })

  describe('getDefaults', () => {
    it('should return default configuration', () => {
      const defaults = appConfig.getDefaults()

      expect(defaults).toMatchObject({
        window: expect.objectContaining({
          bounds: expect.objectContaining({
            width: expect.any(Number),
            height: expect.any(Number)
          }),
          isMaximized: false,
          isFullScreen: false
        }),
        preferences: expect.objectContaining({
          language: expect.any(String),
          theme: expect.any(String),
          autoUpdate: expect.any(Boolean),
          notifications: expect.any(Boolean)
        }),
        tabs: expect.objectContaining({
          defaultUrls: expect.any(Array),
          maxTabs: expect.any(Number),
          restoreOnStartup: expect.any(Boolean)
        })
      })
    })
  })

  describe('reset', () => {
    it('should reset to default configuration', () => {
      appConfig.reset()

      expect(mockStore.clear).toHaveBeenCalled()
    })

    it('should emit reset event', () => {
      const resetHandler = jest.fn()
      appConfig.on('config-reset', resetHandler)

      appConfig.reset()

      expect(resetHandler).toHaveBeenCalled()
    })
  })

  describe('backup and restore', () => {
    it('should create backup of current configuration', async () => {
      const mockConfig = { preferences: { theme: 'dark' } }
      mockStore.store = mockConfig

      const backup = await appConfig.backup()

      expect(backup).toEqual(mockConfig)
    })

    it('should restore configuration from backup', async () => {
      const backupData = {
        preferences: { theme: 'light' },
        window: { bounds: { width: 1200, height: 800 } }
      }

      await appConfig.restore(backupData)

      expect(mockStore.set).toHaveBeenCalledWith('preferences', backupData.preferences)
      expect(mockStore.set).toHaveBeenCalledWith('window', backupData.window)
    })
  })

  describe('validation', () => {
    it('should validate configuration data', () => {
      const validConfig = {
        preferences: {
          theme: 'dark',
          language: 'en',
          autoUpdate: true,
          notifications: true
        }
      }

      const isValid = appConfig.validate(validConfig)
      expect(isValid).toBe(true)
    })

    it('should reject invalid configuration data', () => {
      const invalidConfig = {
        preferences: {
          theme: 'invalid-theme', // Invalid theme value
          language: 123, // Invalid type
          autoUpdate: 'yes' // Invalid type
        }
      }

      const isValid = appConfig.validate(invalidConfig)
      expect(isValid).toBe(false)
    })
  })
})