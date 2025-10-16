/**
 * 日志管理工具
 */

import { Logger, configure, getLogger } from 'log4js'
import { app } from 'electron'
import path from 'path'

let isConfigured = false

export function initLogger(): void {
  if (isConfigured) return

  const logDir = app.getPath('logs')

  configure({
    appenders: {
      console: {
        type: 'console',
        layout: {
          type: 'pattern',
          pattern: '%d{yyyy-MM-dd hh:mm:ss} [%p] %c - %m',
        },
      },
      file: {
        type: 'file',
        filename: path.join(logDir, 'app.log'),
        maxLogSize: 10485760, // 10MB
        backups: 5,
        layout: {
          type: 'pattern',
          pattern: '%d{yyyy-MM-dd hh:mm:ss} [%p] %c - %m',
        },
      },
      error: {
        type: 'file',
        filename: path.join(logDir, 'error.log'),
        maxLogSize: 10485760, // 10MB
        backups: 5,
        layout: {
          type: 'pattern',
          pattern: '%d{yyyy-MM-dd hh:mm:ss} [%p] %c - %m%n%s',
        },
      },
    },
    categories: {
      default: {
        appenders: ['console', 'file'],
        level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
      },
      error: {
        appenders: ['console', 'error'],
        level: 'error',
      },
    },
  })

  isConfigured = true
}

export function createLogger(category: string): Logger {
  if (!isConfigured) {
    initLogger()
  }
  return getLogger(category)
}

// 预定义的日志器
export const mainLogger = createLogger('main')
export const rendererLogger = createLogger('renderer')
export const preloadLogger = createLogger('preload')
export const windowLogger = createLogger('window')
export const tabLogger = createLogger('tab')
export const configLogger = createLogger('config')
export const pushLogger = createLogger('push')
export const updateLogger = createLogger('update')
export const errorLogger = createLogger('error')
