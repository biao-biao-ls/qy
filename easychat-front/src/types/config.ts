/**
 * 配置管理相关类型定义
 */

export interface WindowBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface WindowConfig {
  bounds: WindowBounds
  isMaximized: boolean
  isFullScreen: boolean
  isVisible: boolean
}

export interface UserPreferences {
  language: string
  theme: 'light' | 'dark' | 'auto'
  autoUpdate: boolean
  notifications: boolean
  startMinimized: boolean
  closeToTray: boolean
  downloadPath?: string
}

export interface TabConfig {
  defaultUrls: string[]
  maxTabs: number
  restoreOnStartup: boolean
  enableTabDrag: boolean
}

export interface NetworkConfig {
  proxy?: {
    type: 'http' | 'https' | 'socks4' | 'socks5'
    host: string
    port: number
    username?: string
    password?: string
  }
  timeout: number
  retryCount: number
  userAgent?: string
}

export interface AppConfig {
  window: WindowConfig
  preferences: UserPreferences
  tabs: TabConfig
  network: NetworkConfig
  version: string
  firstRun: boolean
}

export type ConfigKey = keyof AppConfig
export type ConfigValue<K extends ConfigKey> = AppConfig[K]
