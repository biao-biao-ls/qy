import { app } from 'electron'
import { join } from 'path'
import { promises as fs } from 'fs'
import { updateLogger } from '../../utils/logger'
import { UpdateLogService } from './UpdateLogService'

/**
 * 版本备份信息接口
 */
export interface VersionBackup {
  id: string
  version: string
  backupTime: Date
  backupPath: string
  size: number
  checksum?: string
  isValid: boolean
}

/**
 * 回滚选项接口
 */
export interface RollbackOptions {
  targetVersion?: string
  force?: boolean
  preserveUserData?: boolean
  createBackup?: boolean
}

/**
 * 回滚结果接口
 */
export interface RollbackResult {
  success: boolean
  fromVersion: string
  toVersion: string
  message: string
  error?: string
  duration: number
}

/**
 * 更新回滚服务
 * 负责处理更新失败时的回滚操作
 */
export class UpdateRollbackService {
  private static instance: UpdateRollbackService
  private backupDir: string
  private backupsFilePath: string
  private backups: VersionBackup[] = []
  private maxBackups = 5
  private updateLogService: UpdateLogService

  private constructor() {
    const userDataPath = app.getPath('userData')
    this.backupDir = join(userDataPath, 'version-backups')
    this.backupsFilePath = join(userDataPath, 'version-backups.json')
    this.updateLogService = UpdateLogService.getInstance()
  }

  public static getInstance(): UpdateRollbackService {
    if (!UpdateRollbackService.instance) {
      UpdateRollbackService.instance = new UpdateRollbackService()
    }
    return UpdateRollbackService.instance
  }

  /**
   * 初始化回滚服务
   */
  public async initialize(): Promise<void> {
    try {
      await this.ensureBackupDirectory()
      await this.loadBackups()
      await this.validateBackups()
      updateLogger.info('UpdateRollbackService: 初始化完成')
    } catch (error) {
      updateLogger.error('UpdateRollbackService: 初始化失败', error)
    }
  }

  /**
   * 创建版本备份
   */
  public async createBackup(version: string): Promise<VersionBackup | null> {
    const startTime = Date.now()

    try {
      updateLogger.info(`UpdateRollbackService: 开始创建版本 ${version} 的备份`)

      // 检查是否已存在该版本的备份
      const existingBackup = this.backups.find(backup => backup.version === version)
      if (existingBackup && existingBackup.isValid) {
        updateLogger.info(`UpdateRollbackService: 版本 ${version} 的备份已存在`)
        return existingBackup
      }

      const backupId = this.generateBackupId(version)
      const backupPath = join(this.backupDir, `${backupId}.backup`)

      // 创建备份（这里简化处理，实际应该备份应用文件）
      const backupData = {
        version,
        appPath: process.execPath,
        resourcesPath: process.resourcesPath,
        backupTime: new Date(),
        metadata: {
          platform: process.platform,
          arch: process.arch,
          nodeVersion: process.version,
        },
      }

      await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2), 'utf-8')

      // 获取备份文件大小
      const stats = await fs.stat(backupPath)

      const backup: VersionBackup = {
        id: backupId,
        version,
        backupTime: new Date(),
        backupPath,
        size: stats.size,
        isValid: true,
      }

      // 添加到备份列表
      this.backups.unshift(backup)

      // 限制备份数量
      if (this.backups.length > this.maxBackups) {
        const oldBackups = this.backups.splice(this.maxBackups)
        await this.cleanupOldBackups(oldBackups)
      }

      await this.saveBackups()

      const duration = Date.now() - startTime
      updateLogger.info(`UpdateRollbackService: 版本 ${version} 备份创建完成，耗时 ${duration}ms`)

      return backup
    } catch (error) {
      const duration = Date.now() - startTime
      updateLogger.error(`UpdateRollbackService: 创建版本 ${version} 备份失败`, error)

      await this.updateLogService.logError(
        `创建版本 ${version} 备份失败`,
        error instanceof Error ? error.message : String(error),
        version
      )

      return null
    }
  }

  /**
   * 执行回滚
   */
  public async rollback(options: RollbackOptions = {}): Promise<RollbackResult> {
    const startTime = Date.now()
    const currentVersion = app.getVersion()

    try {
      updateLogger.info('UpdateRollbackService: 开始执行回滚', options)

      // 确定目标版本
      let targetBackup: VersionBackup | undefined

      if (options.targetVersion) {
        targetBackup = this.backups.find(
          backup => backup.version === options.targetVersion && backup.isValid
        )
      } else {
        // 选择最新的有效备份
        targetBackup = this.backups.find(backup => backup.isValid)
      }

      if (!targetBackup) {
        throw new Error('没有找到有效的备份版本')
      }

      // 验证备份文件
      const isValid = await this.validateBackup(targetBackup)
      if (!isValid && !options.force) {
        throw new Error(`备份文件 ${targetBackup.version} 验证失败`)
      }

      // 创建当前版本的备份（如果需要）
      if (options.createBackup) {
        await this.createBackup(currentVersion)
      }

      // 执行回滚操作（这里简化处理）
      await this.performRollback(targetBackup, options)

      const duration = Date.now() - startTime
      const result: RollbackResult = {
        success: true,
        fromVersion: currentVersion,
        toVersion: targetBackup.version,
        message: `成功回滚到版本 ${targetBackup.version}`,
        duration,
      }

      updateLogger.info('UpdateRollbackService: 回滚完成', result)

      // 记录回滚日志
      await this.updateLogService.logRollback(
        currentVersion,
        targetBackup.version,
        result.message,
        true
      )

      return result
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)

      const result: RollbackResult = {
        success: false,
        fromVersion: currentVersion,
        toVersion: options.targetVersion || 'unknown',
        message: `回滚失败: ${errorMessage}`,
        error: errorMessage,
        duration,
      }

      updateLogger.error('UpdateRollbackService: 回滚失败', error)

      // 记录回滚失败日志
      await this.updateLogService.logRollback(
        currentVersion,
        options.targetVersion || 'unknown',
        result.message,
        false,
        errorMessage
      )

      return result
    }
  }

  /**
   * 获取可用的备份版本
   */
  public getAvailableBackups(): VersionBackup[] {
    return this.backups.filter(backup => backup.isValid)
  }

  /**
   * 获取备份信息
   */
  public getBackupInfo(version: string): VersionBackup | undefined {
    return this.backups.find(backup => backup.version === version)
  }

  /**
   * 删除备份
   */
  public async deleteBackup(version: string): Promise<boolean> {
    try {
      const backupIndex = this.backups.findIndex(backup => backup.version === version)
      if (backupIndex === -1) {
        return false
      }

      const backup = this.backups[backupIndex]
      if (!backup) {
        return false
      }

      // 删除备份文件
      try {
        await fs.unlink(backup.backupPath)
      } catch (error) {
        updateLogger.warn(`UpdateRollbackService: 删除备份文件失败 ${backup.backupPath}`, error)
      }

      // 从列表中移除
      this.backups.splice(backupIndex, 1)
      await this.saveBackups()

      updateLogger.info(`UpdateRollbackService: 删除版本 ${version} 的备份`)
      return true
    } catch (error) {
      updateLogger.error(`UpdateRollbackService: 删除备份失败 ${version}`, error)
      return false
    }
  }

  /**
   * 清理所有备份
   */
  public async cleanupAllBackups(): Promise<void> {
    try {
      await this.cleanupOldBackups(this.backups)
      this.backups = []
      await this.saveBackups()
      updateLogger.info('UpdateRollbackService: 清理所有备份完成')
    } catch (error) {
      updateLogger.error('UpdateRollbackService: 清理所有备份失败', error)
    }
  }

  /**
   * 确保备份目录存在
   */
  private async ensureBackupDirectory(): Promise<void> {
    try {
      await fs.access(this.backupDir)
    } catch {
      await fs.mkdir(this.backupDir, { recursive: true })
      updateLogger.info(`UpdateRollbackService: 创建备份目录 ${this.backupDir}`)
    }
  }

  /**
   * 加载备份信息
   */
  private async loadBackups(): Promise<void> {
    try {
      const data = await fs.readFile(this.backupsFilePath, 'utf-8')
      const parsedBackups = JSON.parse(data)

      this.backups = parsedBackups.map((backup: any) => ({
        ...backup,
        backupTime: new Date(backup.backupTime),
      }))

      updateLogger.info(`UpdateRollbackService: 加载了 ${this.backups.length} 个备份`)
    } catch (error) {
      if ((error as any).code !== 'ENOENT') {
        updateLogger.error('UpdateRollbackService: 加载备份信息失败', error)
      }
      this.backups = []
    }
  }

  /**
   * 保存备份信息
   */
  private async saveBackups(): Promise<void> {
    await fs.writeFile(this.backupsFilePath, JSON.stringify(this.backups, null, 2), 'utf-8')
  }

  /**
   * 验证所有备份
   */
  private async validateBackups(): Promise<void> {
    let invalidCount = 0

    for (const backup of this.backups) {
      const isValid = await this.validateBackup(backup)
      if (!isValid) {
        backup.isValid = false
        invalidCount++
      }
    }

    if (invalidCount > 0) {
      await this.saveBackups()
      updateLogger.warn(`UpdateRollbackService: 发现 ${invalidCount} 个无效备份`)
    }
  }

  /**
   * 验证单个备份
   */
  private async validateBackup(backup: VersionBackup): Promise<boolean> {
    try {
      await fs.access(backup.backupPath)
      const stats = await fs.stat(backup.backupPath)
      return stats.size > 0
    } catch {
      return false
    }
  }

  /**
   * 执行实际的回滚操作
   */
  private async performRollback(backup: VersionBackup, options: RollbackOptions): Promise<void> {
    // 这里是简化的回滚逻辑
    // 实际应用中需要：
    // 1. 停止当前应用
    // 2. 替换应用文件
    // 3. 更新配置
    // 4. 重启应用

    updateLogger.info(`UpdateRollbackService: 模拟回滚到版本 ${backup.version}`)

    // 模拟回滚过程
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 在实际实现中，这里应该触发应用重启
    updateLogger.info('UpdateRollbackService: 回滚操作完成，需要重启应用')
  }

  /**
   * 清理旧备份
   */
  private async cleanupOldBackups(backups: VersionBackup[]): Promise<void> {
    for (const backup of backups) {
      try {
        await fs.unlink(backup.backupPath)
        updateLogger.info(`UpdateRollbackService: 清理旧备份 ${backup.version}`)
      } catch (error) {
        updateLogger.warn(`UpdateRollbackService: 清理备份文件失败 ${backup.backupPath}`, error)
      }
    }
  }

  /**
   * 生成备份ID
   */
  private generateBackupId(version: string): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substr(2, 6)
    return `${version}-${timestamp}-${random}`
  }
}
