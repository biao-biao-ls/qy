/**
 * 通用工具函数
 */

import { v4 as uuidv4 } from 'uuid'
import { app } from 'electron'

/**
 * 生成唯一ID
 */
export function generateId(): string {
  return uuidv4()
}

/**
 * 延迟执行
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }

    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let lastTime = 0

  return (...args: Parameters<T>) => {
    const now = Date.now()

    if (now - lastTime >= wait) {
      lastTime = now
      func(...args)
    }
  }
}

/**
 * 深度克隆对象
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T
  }

  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as unknown as T
  }

  if (typeof obj === 'object') {
    const cloned = {} as T
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = deepClone(obj[key])
      }
    }
    return cloned
  }

  return obj
}

/**
 * 检查是否为开发环境
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development'
}

/**
 * 检查是否为生产环境
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

/**
 * 获取应用信息
 */
export function getAppInfo(): Record<string, string> {
  return {
    name: app.getName(),
    version: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
    electronVersion: process.versions.electron,
    nodeVersion: process.versions.node,
    chromeVersion: process.versions.chrome,
  }
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * 格式化时间
 */
export function formatTime(date: Date): string {
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

/**
 * 安全的 JSON 解析
 */
export function safeJsonParse<T>(json: string, defaultValue: T): T {
  try {
    return JSON.parse(json) as T
  } catch {
    return defaultValue
  }
}

/**
 * 安全的 JSON 字符串化
 */
export function safeJsonStringify(obj: unknown): string {
  try {
    return JSON.stringify(obj)
  } catch {
    return '{}'
  }
}

/**
 * 检查URL是否有效
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * 获取URL的域名
 */
export function getDomain(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return ''
  }
}

/**
 * 错误处理包装器
 */
export function withErrorHandling<T extends (...args: unknown[]) => unknown>(
  fn: T,
  errorHandler?: (error: Error) => void
): T {
  return ((...args: Parameters<T>) => {
    try {
      const result = fn(...args)

      // 如果返回 Promise，处理异步错误
      if (result instanceof Promise) {
        return result.catch((error: Error) => {
          if (errorHandler) {
            errorHandler(error)
          } else {
            // eslint-disable-next-line no-console
            console.error('Unhandled async error:', error)
          }
          throw error
        })
      }

      return result
    } catch (error) {
      if (errorHandler) {
        errorHandler(error as Error)
      } else {
        // eslint-disable-next-line no-console
        console.error('Unhandled sync error:', error)
      }
      throw error
    }
  }) as T
}
