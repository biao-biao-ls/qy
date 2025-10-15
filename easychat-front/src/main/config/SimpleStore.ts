/**
 * 简单的配置存储实现
 * 作为 electron-store 的备选方案
 */

import { EventEmitter } from 'events'
import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import { configLogger } from '../../utils/logger'
import { deepClone } from '../../utils/helpers'

export class SimpleStore<T extends Record<string, any>> extends EventEmitter {
  private data: T
  private filePath: string
  private defaults: T

  constructor(options: {
    defaults: T
    name: string
    fileExtension?: string
    cwd?: string
  }) {
    super()

    this.defaults = deepClone(options.defaults)
    this.data = deepClone(options.defaults)

    const cwd = options.cwd || app.getPath('userData')
    const fileName = `${options.name}.${options.fileExtension || 'json'}`
    this.filePath = path.join(cwd, fileName)

    this.load()
  }

  /**
   * 加载配置文件
   */
  private load(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const fileContent = fs.readFileSync(this.filePath, 'utf-8')
        const parsedData = JSON.parse(fileContent)
        this.data = { ...this.defaults, ...parsedData }
        configLogger.debug(`Config loaded from: ${this.filePath}`)
      } else {
        configLogger.info('Config file not found, using defaults')
        this.save()
      }
    } catch (error) {
      configLogger.error('Failed to load config file, using defaults', error)
      this.data = deepClone(this.defaults)
      this.save()
    }
  }

  /**
   * 保存配置文件
   */
  private save(): void {
    try {
      // 确保目录存在
      const dir = path.dirname(this.filePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      const jsonData = JSON.stringify(this.data, null, 2)
      fs.writeFileSync(this.filePath, jsonData, 'utf-8')
      configLogger.debug(`Config saved to: ${this.filePath}`)
    } catch (error) {
      configLogger.error('Failed to save config file', error)
    }
  }

  /**
   * 获取配置值
   */
  public get<K extends keyof T>(key: K): T[K] {
    return deepClone(this.data[key])
  }

  /**
   * 设置配置值
   */
  public set<K extends keyof T>(key: K, value: T[K]): void {
    const oldValue = this.data[key]
    this.data[key] = value
    this.save()
    this.emit('change', key, value, oldValue)
  }

  /**
   * 检查键是否存在
   */
  public has<K extends keyof T>(key: K): boolean {
    return key in this.data
  }

  /**
   * 删除配置键
   */
  public delete<K extends keyof T>(key: K): void {
    if (key in this.data) {
      delete this.data[key]
      this.save()
      this.emit('delete', key)
    }
  }

  /**
   * 清空所有配置
   */
  public clear(): void {
    this.data = deepClone(this.defaults)
    this.save()
    this.emit('clear')
  }

  /**
   * 获取所有数据
   */
  public get store(): T {
    return deepClone(this.data)
  }

  /**
   * 获取配置文件路径
   */
  public get path(): string {
    return this.filePath
  }

  /**
   * 获取配置文件大小
   */
  public get size(): number {
    try {
      const stats = fs.statSync(this.filePath)
      return stats.size
    } catch {
      return 0
    }
  }

  /**
   * 监听任何配置变化
   */
  public onDidAnyChange(callback: (newValue: T, oldValue: T) => void): void {
    this.on('change', () => {
      callback(this.store, this.defaults)
    })
  }
}