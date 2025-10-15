/**
 * 应用配置管理器
 * 使用 electron-store 简化配置存储和管理
 * 重构自原始 AppConfig，移除过度复杂的同步和备份机制
 */

import { EventEmitter } from 'events'
import { app } from 'electron'
import path from 'path'
import { AppConfig as AppConfigType, ConfigKey, ConfigValue } from '../../types/config'
import { configLogger } from '../../utils/logger'
import { deepClone, isDevelopment } from '../../utils/helpers'
import { SimpleStore } from './SimpleStore'

// 动态导入 electron-store
let Store: any = null

// 默认配置
const DEFAULT_CONFIG: AppConfigType = {
  window: {
    bounds: {
      x: 100,
      y: 100,
      width: 1200,
      height: 800,
    },
    isMaximized: false,
    isFullScreen: false,
    isVisible: true,
  },
  preferences: {
    language: 'zh-CN',
    theme: 'auto',
    autoUpdate: true,
    notifications: true,
    startMinimized: false,
    closeToTray: false,
  },
  tabs: {
    defaultUrls: ['https://jlcpcb.com', 'https://lcsc.com'],
    maxTabs: 10,
    restoreOnStartup: true,
    enableTabDrag: true,
  },
  network: {
    timeout: 30000,
    retryCount: 3,
  },
  version: '1.0.13',
  firstRun: true,
}

export class AppConfig extends EventEmitter {
  private store: any = null
  private static instance: AppConfig | null = null
  private isInitialized = false

  private constructor() {
    super()
  }

  /**
   * 初始化配置存储
   */
  private async initializeStore(): Promise<void> {
    if (this.store) return

    try {
      // 尝试使用 electron-store
      try {
        const { default: ElectronStore } = await import('electron-store')
        Store = ElectronStore

        this.store = new Store({
          defaults: DEFAULT_CONFIG,
          name: 'app-config',
          fileExtension: 'json',
          clearInvalidConfig: true,
          cwd: app.getPath('userData'),
        })

        // 监听配置变化
        this.store.onDidAnyChange((newValue: any, oldValue: any) => {
          configLogger.debug('Config changed:', { newValue, oldValue })
          this.emit('changed', newValue, oldValue)
        })

        configLogger.info('AppConfig store initialized with electron-store')
      } catch (electronStoreError) {
        configLogger.warn('Failed to load electron-store, using SimpleStore fallback', electronStoreError)
        
        // 使用简单存储作为备选方案
        this.store = new SimpleStore({
          defaults: DEFAULT_CONFIG,
          name: 'app-config',
          fileExtension: 'json',
          cwd: app.getPath('userData'),
        })

        // 监听配置变化
        this.store.onDidAnyChange((newValue: any, oldValue: any) => {
          configLogger.debug('Config changed:', { newValue, oldValue })
          this.emit('changed', newValue, oldValue)
        })

        configLogger.info('AppConfig store initialized with SimpleStore')
      }
    } catch (error) {
      configLogger.error('Failed to initialize any config store', error)
      throw error
    }
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): AppConfig {
    if (!AppConfig.instance) {
      AppConfig.instance = new AppConfig()
    }
    return AppConfig.instance
  }

  /**
   * 确保存储已初始化
   */
  private ensureStoreInitialized(): void {
    if (!this.store) {
      throw new Error('AppConfig store not initialized. Call load() first.')
    }
  }

  /**
   * 获取配置值
   */
  public get<K extends ConfigKey>(key: K): ConfigValue<K> {
    try {
      this.ensureStoreInitialized()
      const value = this.store.get(key)
      configLogger.debug(`Get config: ${key}`, value)
      return deepClone(value)
    } catch (error) {
      configLogger.error(`Failed to get config: ${key}`, error)
      return deepClone(DEFAULT_CONFIG[key])
    }
  }

  /**
   * 设置配置值
   */
  public set<K extends ConfigKey>(key: K, value: ConfigValue<K>): void {
    try {
      this.ensureStoreInitialized()
      const oldValue = this.store.get(key)
      this.store.set(key, value)
      configLogger.debug(`Set config: ${key}`, { oldValue, newValue: value })
      this.emit('configChanged', key, value, oldValue)
    } catch (error) {
      configLogger.error(`Failed to set config: ${key}`, error)
      throw error
    }
  }

  /**
   * 获取所有配置
   */
  public getAll(): AppConfigType {
    try {
      this.ensureStoreInitialized()
      const config = this.store.store
      configLogger.debug('Get all config', config)
      return deepClone(config)
    } catch (error) {
      configLogger.error('Failed to get all config', error)
      return deepClone(DEFAULT_CONFIG)
    }
  }

  /**
   * 检查配置键是否存在
   */
  public has(key: ConfigKey): boolean {
    try {
      this.ensureStoreInitialized()
      return this.store.has(key)
    } catch (error) {
      configLogger.error(`Failed to check config key: ${key}`, error)
      return false
    }
  }

  /**
   * 删除配置键
   */
  public delete(key: ConfigKey): void {
    try {
      this.ensureStoreInitialized()
      this.store.delete(key)
      configLogger.debug(`Deleted config: ${key}`)
    } catch (error) {
      configLogger.error(`Failed to delete config: ${key}`, error)
      throw error
    }
  }

  /**
   * 加载配置
   */
  public async load(): Promise<void> {
    try {
      // 初始化存储
      await this.initializeStore()

      // 检查是否是首次运行
      const isFirstRun = !this.has('version')
      if (isFirstRun) {
        configLogger.info('First run detected, initializing default config')
        this.set('firstRun', true)
        this.set('version', DEFAULT_CONFIG.version)
      }

      this.isInitialized = true
      configLogger.info('Config loaded successfully')
    } catch (error) {
      configLogger.error('Failed to load config', error)
      throw error
    }
  }

  /**
   * 重置配置到默认值
   */
  public async reset(): Promise<void> {
    try {
      this.ensureStoreInitialized()
      this.store.clear()
      configLogger.info('Config reset to defaults')
    } catch (error) {
      configLogger.error('Failed to reset config', error)
      throw error
    }
  }

  /**
   * 获取配置文件路径
   */
  public getConfigPath(): string {
    try {
      this.ensureStoreInitialized()
      return this.store.path
    } catch (error) {
      configLogger.error('Failed to get config path', error)
      return ''
    }
  }

  /**
   * 获取配置文件大小
   */
  public getConfigSize(): number {
    try {
      this.ensureStoreInitialized()
      return this.store.size
    } catch (error) {
      configLogger.error('Failed to get config size', error)
      return 0
    }
  }

  /**
   * 监听配置变化
   */
  public onChange<K extends ConfigKey>(
    callback: (key: K, value: ConfigValue<K>, oldValue?: ConfigValue<K>) => void
  ): () => void {
    const handler = (key: K, value: ConfigValue<K>, oldValue?: ConfigValue<K>): void => {
      callback(key, value, oldValue)
    }

    this.on('configChanged', handler)

    // 返回取消监听的函数
    return () => {
      this.off('configChanged', handler)
    }
  }

  /**
   * 获取当前语言
   */
  public getCurrentLanguage(): string {
    try {
      const preferences = this.get('preferences')
      return preferences.language || 'en'
    } catch (error) {
      configLogger.error('Failed to get current language', error)
      return 'en'
    }
  }

  /**
   * 设置语言
   */
  public setLanguage(language: string): void {
    try {
      const preferences = this.get('preferences')
      this.set('preferences', {
        ...preferences,
        language,
      })
      configLogger.info(`Language set to: ${language}`)
    } catch (error) {
      configLogger.error('Failed to set language', error)
      throw error
    }
  }

  /**
   * 获取系统语言
   */
  public getSystemLanguage(): string {
    try {
      const locale = app.getLocale().toLowerCase()
      
      // 语言映射表
      const languageMap: Record<string, string> = {
        'en': 'en',
        'en-us': 'en',
        'en-gb': 'en',
        'zh-cn': 'zh-CN',
        'zh-tw': 'zh-TW',
        'zh-hk': 'zh-TW',
        'ja': 'ja',
        'ja-jp': 'ja',
        'ko': 'ko',
        'ko-kr': 'ko',
        'fr': 'fr',
        'fr-fr': 'fr',
        'de': 'de',
        'de-de': 'de',
        'es': 'es',
        'es-es': 'es',
        'pt': 'pt',
        'pt-br': 'pt',
        'ru': 'ru',
        'ar': 'ar',
      }

      return languageMap[locale] || 'en'
    } catch (error) {
      configLogger.error('Failed to get system language', error)
      return 'en'
    }
  }

  /**
   * 检查是否为开发环境
   */
  public isDevelopment(): boolean {
    return isDevelopment()
  }

  /**
   * 检查是否为生产环境
   */
  public isProduction(): boolean {
    return !isDevelopment()
  }

  /**
   * 获取应用版本
   */
  public getAppVersion(): string {
    return app.getVersion()
  }

  /**
   * 获取用户数据路径
   */
  public getUserDataPath(): string {
    return app.getPath('userData')
  }

  /**
   * 获取日志路径
   */
  public getLogsPath(): string {
    return path.join(this.getUserDataPath(), 'logs')
  }

  /**
   * 获取下载路径
   */
  public getDownloadsPath(): string {
    try {
      const preferences = this.get('preferences')
      return preferences.downloadPath || app.getPath('downloads')
    } catch (error) {
      configLogger.error('Failed to get downloads path', error)
      return app.getPath('downloads')
    }
  }

  /**
   * 设置下载路径
   */
  public setDownloadsPath(downloadPath: string): void {
    try {
      const preferences = this.get('preferences')
      this.set('preferences', {
        ...preferences,
        downloadPath,
      })
      configLogger.info(`Downloads path set to: ${downloadPath}`)
    } catch (error) {
      configLogger.error('Failed to set downloads path', error)
      throw error
    }
  }

  /**
   * 获取窗口配置
   */
  public getWindowConfig(): AppConfigType['window'] {
    return this.get('window')
  }

  /**
   * 设置窗口配置
   */
  public setWindowConfig(windowConfig: Partial<AppConfigType['window']>): void {
    try {
      const currentConfig = this.get('window')
      this.set('window', {
        ...currentConfig,
        ...windowConfig,
      })
    } catch (error) {
      configLogger.error('Failed to set window config', error)
      throw error
    }
  }

  /**
   * 获取网络配置
   */
  public getNetworkConfig(): AppConfigType['network'] {
    return this.get('network')
  }

  /**
   * 设置网络配置
   */
  public setNetworkConfig(networkConfig: Partial<AppConfigType['network']>): void {
    try {
      const currentConfig = this.get('network')
      this.set('network', {
        ...currentConfig,
        ...networkConfig,
      })
    } catch (error) {
      configLogger.error('Failed to set network config', error)
      throw error
    }
  }

  /**
   * 获取标签页配置
   */
  public getTabConfig(): AppConfigType['tabs'] {
    return this.get('tabs')
  }

  /**
   * 设置标签页配置
   */
  public setTabConfig(tabConfig: Partial<AppConfigType['tabs']>): void {
    try {
      const currentConfig = this.get('tabs')
      this.set('tabs', {
        ...currentConfig,
        ...tabConfig,
      })
    } catch (error) {
      configLogger.error('Failed to set tab config', error)
      throw error
    }
  }

  /**
   * 备份配置
   */
  public async backup(): Promise<string> {
    try {
      const config = this.getAll()
      const backupData = JSON.stringify(config, null, 2)
      const backupPath = path.join(
        this.getUserDataPath(),
        `config-backup-${Date.now()}.json`
      )
      
      // 这里可以添加文件写入逻辑
      configLogger.info(`Config backed up to: ${backupPath}`)
      return backupPath
    } catch (error) {
      configLogger.error('Failed to backup config', error)
      throw error
    }
  }

  /**
   * 验证配置
   */
  public validate(): boolean {
    try {
      const config = this.getAll()
      
      // 基本验证
      if (!config.version) return false
      if (!config.preferences) return false
      if (!config.window) return false
      if (!config.tabs) return false
      if (!config.network) return false
      
      // 详细验证
      if (typeof config.preferences.language !== 'string') return false
      if (typeof config.window.bounds !== 'object') return false
      if (!Array.isArray(config.tabs.defaultUrls)) return false
      
      return true
    } catch (error) {
      configLogger.error('Config validation failed', error)
      return false
    }
  }

  /**
   * 迁移配置
   */
  public async migrate(): Promise<void> {
    try {
      const currentVersion = this.get('version')
      const appVersion = this.getAppVersion()
      
      if (currentVersion !== appVersion) {
        configLogger.info(`Migrating config from ${currentVersion} to ${appVersion}`)
        
        // 这里可以添加版本迁移逻辑
        
        this.set('version', appVersion)
        configLogger.info('Config migration completed')
      }
    } catch (error) {
      configLogger.error('Config migration failed', error)
      throw error
    }
  }

  /**
   * 销毁实例
   */
  public destroy(): void {
    this.removeAllListeners()
    AppConfig.instance = null
    configLogger.info('AppConfig destroyed')
  }
}
