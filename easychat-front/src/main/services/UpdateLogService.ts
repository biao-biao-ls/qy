import { app } from 'electron'
import { join } from 'path'
import { promises as fs } from 'fs'
import { updateLogger } from '../../utils/logger'

/**
 * 更新日志条目接口
 */
export interface UpdateLogEntry {
  id: string
  timestamp: Date
  type: 'check' | 'download' | 'install' | 'error' | 'rollback'
  version?: string
  fromVersion?: string
  toVersion?: string
  message: string
  error?: string
  success: boolean
  duration?: number
}

/**
 * 更新统计信息接口
 */
export interface UpdateStatistics {
  totalChecks: number
  totalDownloads: number
  totalInstalls: number
  totalErrors: number
  totalRollbacks: number
  lastCheckTime?: Date
  lastUpdateTime?: Date
  lastErrorTime?: Date
}

/**
 * 更新日志服务
 * 负责记录和管理更新相关的日志信息
 */
export class UpdateLogService {
  private static instance: UpdateLogService
  private logFilePath: string
  private statisticsFilePath: string
  private maxLogEntries = 1000
  private logs: UpdateLogEntry[] = []
  private statistics: UpdateStatistics = {
    totalChecks: 0,
    totalDownloads: 0,
    totalInstalls: 0,
    totalErrors: 0,
    totalRollbacks: 0
  }

  private constructor() {
    const userDataPath = app.getPath('userData')
    this.logFilePath = join(userDataPath, 'update-logs.json')
    this.statisticsFilePath = join(userDataPath, 'update-statistics.json')
  }

  public static getInstance(): UpdateLogService {
    if (!UpdateLogService.instance) {
      UpdateLogService.instance = new UpdateLogService()
    }
    return UpdateLogService.instance
  }

  /**
   * 初始化日志服务
   */
  public async initialize(): Promise<void> {
    try {
      await this.loadLogs()
      await this.loadStatistics()
      updateLogger.info('UpdateLogService: 初始化完成')
    } catch (error) {
      updateLogger.error('UpdateLogService: 初始化失败', error)
    }
  }

  /**
   * 记录更新日志
   */
  public async logUpdate(entry: Omit<UpdateLogEntry, 'id' | 'timestamp'>): Promise<void> {
    const logEntry: UpdateLogEntry = {
      ...entry,
      id: this.generateId(),
      timestamp: new Date()
    }

    this.logs.unshift(logEntry)

    // 限制日志条目数量
    if (this.logs.length > this.maxLogEntries) {
      this.logs = this.logs.slice(0, this.maxLogEntries)
    }

    // 更新统计信息
    this.updateStatistics(logEntry)

    try {
      await this.saveLogs()
      await this.saveStatistics()
      updateLogger.debug('UpdateLogService: 记录更新日志', logEntry)
    } catch (error) {
      updateLogger.error('UpdateLogService: 保存日志失败', error)
    }
  }

  /**
   * 记录更新检查
   */
  public async logCheck(success: boolean, message: string, error?: string): Promise<void> {
    await this.logUpdate({
      type: 'check',
      message,
      error,
      success
    })
  }

  /**
   * 记录更新下载
   */
  public async logDownload(
    version: string, 
    success: boolean, 
    message: string, 
    duration?: number,
    error?: string
  ): Promise<void> {
    await this.logUpdate({
      type: 'download',
      version,
      message,
      error,
      success,
      duration
    })
  }

  /**
   * 记录更新安装
   */
  public async logInstall(
    fromVersion: string,
    toVersion: string,
    success: boolean,
    message: string,
    duration?: number,
    error?: string
  ): Promise<void> {
    await this.logUpdate({
      type: 'install',
      fromVersion,
      toVersion,
      message,
      error,
      success,
      duration
    })
  }

  /**
   * 记录更新错误
   */
  public async logError(message: string, error: string, version?: string): Promise<void> {
    await this.logUpdate({
      type: 'error',
      version,
      message,
      error,
      success: false
    })
  }

  /**
   * 记录更新回滚
   */
  public async logRollback(
    fromVersion: string,
    toVersion: string,
    message: string,
    success: boolean,
    error?: string
  ): Promise<void> {
    await this.logUpdate({
      type: 'rollback',
      fromVersion,
      toVersion,
      message,
      error,
      success
    })
  }

  /**
   * 获取更新日志
   */
  public getLogs(limit?: number): UpdateLogEntry[] {
    if (limit) {
      return this.logs.slice(0, limit)
    }
    return [...this.logs]
  }

  /**
   * 获取特定类型的日志
   */
  public getLogsByType(type: UpdateLogEntry['type'], limit?: number): UpdateLogEntry[] {
    const filteredLogs = this.logs.filter(log => log.type === type)
    if (limit) {
      return filteredLogs.slice(0, limit)
    }
    return filteredLogs
  }

  /**
   * 获取更新统计信息
   */
  public getStatistics(): UpdateStatistics {
    return { ...this.statistics }
  }

  /**
   * 清理旧日志
   */
  public async cleanupOldLogs(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<void> {
    const cutoffTime = new Date(Date.now() - maxAge)
    const originalCount = this.logs.length

    this.logs = this.logs.filter(log => log.timestamp > cutoffTime)

    if (this.logs.length !== originalCount) {
      await this.saveLogs()
      updateLogger.info(`UpdateLogService: 清理了 ${originalCount - this.logs.length} 条旧日志`)
    }
  }

  /**
   * 导出日志
   */
  public async exportLogs(filePath?: string): Promise<string> {
    const exportPath = filePath || join(app.getPath('downloads'), `update-logs-${Date.now()}.json`)
    
    const exportData = {
      exportTime: new Date(),
      statistics: this.statistics,
      logs: this.logs
    }

    await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2), 'utf-8')
    updateLogger.info(`UpdateLogService: 导出日志到 ${exportPath}`)
    
    return exportPath
  }

  /**
   * 加载日志
   */
  private async loadLogs(): Promise<void> {
    try {
      const data = await fs.readFile(this.logFilePath, 'utf-8')
      const parsedLogs = JSON.parse(data)
      
      // 转换时间戳
      this.logs = parsedLogs.map((log: any) => ({
        ...log,
        timestamp: new Date(log.timestamp)
      }))
      
      updateLogger.info(`UpdateLogService: 加载了 ${this.logs.length} 条日志`)
    } catch (error) {
      if ((error as any).code !== 'ENOENT') {
        updateLogger.error('UpdateLogService: 加载日志失败', error)
      }
      this.logs = []
    }
  }

  /**
   * 保存日志
   */
  private async saveLogs(): Promise<void> {
    await fs.writeFile(this.logFilePath, JSON.stringify(this.logs, null, 2), 'utf-8')
  }

  /**
   * 加载统计信息
   */
  private async loadStatistics(): Promise<void> {
    try {
      const data = await fs.readFile(this.statisticsFilePath, 'utf-8')
      const parsedStats = JSON.parse(data)
      
      // 转换时间戳
      this.statistics = {
        ...parsedStats,
        lastCheckTime: parsedStats.lastCheckTime ? new Date(parsedStats.lastCheckTime) : undefined,
        lastUpdateTime: parsedStats.lastUpdateTime ? new Date(parsedStats.lastUpdateTime) : undefined,
        lastErrorTime: parsedStats.lastErrorTime ? new Date(parsedStats.lastErrorTime) : undefined
      }
      
      updateLogger.info('UpdateLogService: 加载统计信息完成')
    } catch (error) {
      if ((error as any).code !== 'ENOENT') {
        updateLogger.error('UpdateLogService: 加载统计信息失败', error)
      }
    }
  }

  /**
   * 保存统计信息
   */
  private async saveStatistics(): Promise<void> {
    await fs.writeFile(this.statisticsFilePath, JSON.stringify(this.statistics, null, 2), 'utf-8')
  }

  /**
   * 更新统计信息
   */
  private updateStatistics(entry: UpdateLogEntry): void {
    switch (entry.type) {
      case 'check':
        this.statistics.totalChecks++
        this.statistics.lastCheckTime = entry.timestamp
        break
      case 'download':
        this.statistics.totalDownloads++
        break
      case 'install':
        this.statistics.totalInstalls++
        if (entry.success) {
          this.statistics.lastUpdateTime = entry.timestamp
        }
        break
      case 'error':
        this.statistics.totalErrors++
        this.statistics.lastErrorTime = entry.timestamp
        break
      case 'rollback':
        this.statistics.totalRollbacks++
        break
    }
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}