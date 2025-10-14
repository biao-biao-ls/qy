/**
 * 应用程序常量定义
 */

export const APP_NAME = 'JLCONE'
export const APP_VERSION = '1.0.13'
export const APP_DESCRIPTION = 'JLCONE Desktop Application'
export const APP_AUTHOR = 'Jialichuang(Hong Kong) co., Limited'

// 窗口默认配置
export const DEFAULT_WINDOW_CONFIG = {
  width: 1200,
  height: 800,
  minWidth: 800,
  minHeight: 600,
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    enableRemoteModule: false,
  },
}

// 标签页配置
export const TAB_CONFIG = {
  MAX_TABS: 10,
  DEFAULT_URLS: ['https://jlcpcb.com', 'https://lcsc.com'],
}

// 网络配置
export const NETWORK_CONFIG = {
  TIMEOUT: 30000,
  RETRY_COUNT: 3,
  USER_AGENT: `${APP_NAME}/${APP_VERSION}`,
}

// 推送配置
export const PUSH_CONFIG = {
  RECONNECT_INTERVAL: 5000,
  MAX_RECONNECT_ATTEMPTS: 10,
  HEARTBEAT_INTERVAL: 30000,
  TIMEOUT: 10000,
}

// 文件路径
export const PATHS = {
  LOGS: 'logs',
  CONFIG: 'config',
  CACHE: 'cache',
  TEMP: 'temp',
}

// 事件名称
export const EVENTS = {
  APP_READY: 'app:ready',
  APP_QUIT: 'app:quit',
  WINDOW_CREATED: 'window:created',
  WINDOW_CLOSED: 'window:closed',
  TAB_CREATED: 'tab:created',
  TAB_REMOVED: 'tab:removed',
  CONFIG_CHANGED: 'config:changed',
  PUSH_MESSAGE: 'push:message',
} as const

// 错误代码
export const ERROR_CODES = {
  WINDOW_CREATE_FAILED: 'WINDOW_CREATE_FAILED',
  TAB_CREATE_FAILED: 'TAB_CREATE_FAILED',
  CONFIG_LOAD_FAILED: 'CONFIG_LOAD_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  PUSH_CONNECTION_FAILED: 'PUSH_CONNECTION_FAILED',
} as const
