/**
 * 应用配置管理器
 * 使用 electron-store 简化配置存储和管理
 */

import Store from 'electron-store'
import { EventEmitter } from 'events'
import { AppConfig, ConfigKey, ConfigValue } from '../../types/config'
import { configLogger } from '../../utils/logger'
import { deepClone } from '../../utils/helpers'

// 默认配置
const DEFAULT_CONFIG: AppConfig = {
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

export class AppConfigManager extends EventEmitter {
  private store: Store<AppConfig>
  private static instance: AppConfigManager | null = null

  private constructor() {
    super()

    this.store = new Store<AppConfig>({
      defaults: DEFAULT_CONFIG,
      name: 'app-config',
      fileExtension: 'json',
      clearInvalidConfig: true,
    })

    // 监听配置变化
    this.store.onDidAnyChange((newValue, oldValue) => {
      configLogger.debug('Config changed:', { newValue, oldValue })
      this.emit('changed', newValue, oldValue)
    })

    configLogger.info('AppConfigManager initialized')
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): AppConfigManager {
    if (!AppConfigManager.instance) {
      AppConfigManager.instance = new AppConfigManager()
    }
    return AppConfigManager.instance
  }

  /**
   * 获取配置值
   */
  public get<K extends ConfigKey>(key: K): ConfigValue<K> {
    try {
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
  public getAll(): AppConfig {
    try {
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
    return this.store.has(key)
  }

  /**
   * 删除配置键
   */
  public delete(key: ConfigKey): void {
    try {
      this.store.delete(key)
      configLogger.debug(`Deleted config: ${key}`)
    } catch (error) {
      configLogger.error(`Failed to delete config: ${key}`, error)
      throw error
    }
  }

  /**
   * 重置配置到默认值
   */
  public reset(): void {
    try {
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
    return this.store.path
  }

  /**
   * 获取配置文件大小
   */
  public getConfigSize(): number {
    return this.store.size
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
   * 销毁实例
   */
  public destroy(): void {
    this.removeAllListeners()
    AppConfigManager.instance = null
    configLogger.info('AppConfigManager destroyed')
  }
}
