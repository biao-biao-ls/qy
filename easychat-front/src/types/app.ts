/**
 * 应用程序基础类型定义
 */

export interface AppInfo {
  name: string
  version: string
  description: string
  author: string
}

export interface AppEnvironment {
  isDevelopment: boolean
  isProduction: boolean
  platform: NodeJS.Platform
  arch: string
}

export interface AppPaths {
  userData: string
  logs: string
  temp: string
  resources: string
}

export enum AppState {
  INITIALIZING = 'initializing',
  READY = 'ready',
  RUNNING = 'running',
  CLOSING = 'closing',
  CLOSED = 'closed',
}

export interface AppError extends Error {
  code?: string
  type: 'window' | 'config' | 'network' | 'system' | 'unknown'
  timestamp: Date
}
