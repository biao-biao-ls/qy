/**
 * 消息存储服务
 * 处理消息的持久化存储和离线消息管理
 */

import { app } from 'electron'
import * as path from 'path'
import * as fs from 'fs/promises'
import { PushMessage } from '../../types/push'
import { pushLogger as logger } from '../../utils/logger'

export interface StorageConfig {
  maxMessages?: number
  maxAge?: number // 消息最大保存时间（毫秒）
  storageDir?: string
}

interface StoredMessage extends PushMessage {
  storedAt: number
  delivered: boolean
}

/**
 * 消息存储服务类
 * 提供消息的持久化存储、检索和清理功能
 */
export class MessageStorageService {
  private config: Required<StorageConfig>
  private storageFile: string
  private messages: Map<string, StoredMessage> = new Map()
  private isInitialized = false

  constructor(config: StorageConfig = {}) {
    this.config = {
      maxMessages: config.maxMessages || 1000,
      maxAge: config.maxAge || 7 * 24 * 60 * 60 * 1000, // 7天
      storageDir: config.storageDir || path.join(app.getPath('userData'), 'messages')
    }
    
    this.storageFile = path.join(this.config.storageDir, 'messages.json')
    
    logger.info('MessageStorageService', 'constructor', '消息存储服务初始化', { config: this.config })
  }

  /**
   * 初始化存储服务
   */
  async initialize(): Promise<void> {
    try {
      logger.info('MessageStorageService', 'initialize', '初始化消息存储服务')
      
      // 确保存储目录存在
      await this.ensureStorageDirectory()
      
      // 加载现有消息
      await this.loadMessages()
      
      // 清理过期消息
      await this.cleanupExpiredMessages()
      
      this.isInitialized = true
      
      logger.info('MessageStorageService', 'initialize', '消息存储服务初始化完成', {
        messageCount: this.messages.size
      })
      
    } catch (error) {
      logger.error('MessageStorageService', 'initialize', '初始化失败', error)
      throw error
    }
  }

  /**
   * 存储消息
   */
  async storeMessage(message: PushMessage): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize()
      }

      const storedMessage: StoredMessage = {
        ...message,
        storedAt: Date.now(),
        delivered: false
      }

      this.messages.set(message.id, storedMessage)
      
      logger.debug('MessageStorageService', 'storeMessage', '消息已存储', {
        id: message.id,
        title: message.title
      })

      // 检查是否超过最大消息数量
      await this.enforceMessageLimit()
      
      // 保存到文件
      await this.saveMessages()
      
    } catch (error) {
      logger.error('MessageStorageService', 'storeMessage', '存储消息失败', error)
      throw error
    }
  }

  /**
   * 标记消息为已送达
   */
  async markAsDelivered(messageId: string): Promise<void> {
    try {
      const message = this.messages.get(messageId)
      if (message) {
        message.delivered = true
        await this.saveMessages()
        
        logger.debug('MessageStorageService', 'markAsDelivered', '消息已标记为送达', { messageId })
      }
    } catch (error) {
      logger.error('MessageStorageService', 'markAsDelivered', '标记消息失败', error)
    }
  }

  /**
   * 获取未送达的消息
   */
  async getUndeliveredMessages(): Promise<PushMessage[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize()
      }

      const undeliveredMessages: PushMessage[] = []
      
      for (const message of this.messages.values()) {
        if (!message.delivered) {
          // 移除存储相关的字段
          const { storedAt, delivered, ...pushMessage } = message
          undeliveredMessages.push(pushMessage)
        }
      }

      logger.info('MessageStorageService', 'getUndeliveredMessages', '获取未送达消息', {
        count: undeliveredMessages.length
      })

      return undeliveredMessages
      
    } catch (error) {
      logger.error('MessageStorageService', 'getUndeliveredMessages', '获取未送达消息失败', error)
      return []
    }
  }

  /**
   * 获取指定时间范围内的消息
   */
  async getMessagesByTimeRange(startTime: number, endTime: number): Promise<PushMessage[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize()
      }

      const messages: PushMessage[] = []
      
      for (const message of this.messages.values()) {
        const messageTime = message.timestamp.getTime()
        if (messageTime >= startTime && messageTime <= endTime) {
          const { storedAt, delivered, ...pushMessage } = message
          messages.push(pushMessage)
        }
      }

      logger.debug('MessageStorageService', 'getMessagesByTimeRange', '获取时间范围内消息', {
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        count: messages.length
      })

      return messages.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      
    } catch (error) {
      logger.error('MessageStorageService', 'getMessagesByTimeRange', '获取消息失败', error)
      return []
    }
  }

  /**
   * 获取最近的消息
   */
  async getRecentMessages(limit: number = 50): Promise<PushMessage[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize()
      }

      const allMessages = Array.from(this.messages.values())
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit)

      const messages: PushMessage[] = allMessages.map(message => {
        const { storedAt, delivered, ...pushMessage } = message
        return pushMessage
      })

      logger.debug('MessageStorageService', 'getRecentMessages', '获取最近消息', {
        limit,
        count: messages.length
      })

      return messages
      
    } catch (error) {
      logger.error('MessageStorageService', 'getRecentMessages', '获取最近消息失败', error)
      return []
    }
  }

  /**
   * 删除消息
   */
  async deleteMessage(messageId: string): Promise<void> {
    try {
      if (this.messages.delete(messageId)) {
        await this.saveMessages()
        logger.debug('MessageStorageService', 'deleteMessage', '消息已删除', { messageId })
      }
    } catch (error) {
      logger.error('MessageStorageService', 'deleteMessage', '删除消息失败', error)
    }
  }

  /**
   * 清空所有消息
   */
  async clearAllMessages(): Promise<void> {
    try {
      this.messages.clear()
      await this.saveMessages()
      
      logger.info('MessageStorageService', 'clearAllMessages', '所有消息已清空')
    } catch (error) {
      logger.error('MessageStorageService', 'clearAllMessages', '清空消息失败', error)
    }
  }

  /**
   * 获取存储统计信息
   */
  getStatistics() {
    const now = Date.now()
    let deliveredCount = 0
    let undeliveredCount = 0
    let expiredCount = 0

    for (const message of this.messages.values()) {
      if (message.delivered) {
        deliveredCount++
      } else {
        undeliveredCount++
      }
      
      if (now - message.storedAt > this.config.maxAge) {
        expiredCount++
      }
    }

    return {
      totalMessages: this.messages.size,
      deliveredMessages: deliveredCount,
      undeliveredMessages: undeliveredCount,
      expiredMessages: expiredCount,
      storageFile: this.storageFile,
      maxMessages: this.config.maxMessages,
      maxAge: this.config.maxAge,
      isInitialized: this.isInitialized
    }
  }

  /**
   * 确保存储目录存在
   */
  private async ensureStorageDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.config.storageDir, { recursive: true })
    } catch (error) {
      logger.error('MessageStorageService', 'ensureStorageDirectory', '创建存储目录失败', error)
      throw error
    }
  }

  /**
   * 加载消息
   */
  private async loadMessages(): Promise<void> {
    try {
      const data = await fs.readFile(this.storageFile, 'utf-8')
      const messagesArray: StoredMessage[] = JSON.parse(data)
      
      this.messages.clear()
      for (const message of messagesArray) {
        // 确保 timestamp 是 Date 对象
        if (typeof message.timestamp === 'string') {
          message.timestamp = new Date(message.timestamp)
        }
        this.messages.set(message.id, message)
      }
      
      logger.info('MessageStorageService', 'loadMessages', '消息加载完成', {
        count: this.messages.size
      })
      
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        // 文件不存在，创建空的消息存储
        logger.info('MessageStorageService', 'loadMessages', '消息文件不存在，创建新的存储')
        this.messages.clear()
        await this.saveMessages()
      } else {
        logger.error('MessageStorageService', 'loadMessages', '加载消息失败', error)
        throw error
      }
    }
  }

  /**
   * 保存消息到文件
   */
  private async saveMessages(): Promise<void> {
    try {
      const messagesArray = Array.from(this.messages.values())
      const data = JSON.stringify(messagesArray, null, 2)
      
      await fs.writeFile(this.storageFile, data, 'utf-8')
      
      logger.debug('MessageStorageService', 'saveMessages', '消息已保存到文件', {
        count: messagesArray.length,
        file: this.storageFile
      })
      
    } catch (error) {
      logger.error('MessageStorageService', 'saveMessages', '保存消息失败', error)
      throw error
    }
  }

  /**
   * 清理过期消息
   */
  private async cleanupExpiredMessages(): Promise<void> {
    try {
      const now = Date.now()
      let cleanedCount = 0
      
      for (const [id, message] of this.messages) {
        if (now - message.storedAt > this.config.maxAge) {
          this.messages.delete(id)
          cleanedCount++
        }
      }
      
      if (cleanedCount > 0) {
        await this.saveMessages()
        logger.info('MessageStorageService', 'cleanupExpiredMessages', '清理过期消息', {
          cleanedCount,
          remainingCount: this.messages.size
        })
      }
      
    } catch (error) {
      logger.error('MessageStorageService', 'cleanupExpiredMessages', '清理过期消息失败', error)
    }
  }

  /**
   * 强制执行消息数量限制
   */
  private async enforceMessageLimit(): Promise<void> {
    try {
      if (this.messages.size <= this.config.maxMessages) {
        return
      }
      
      // 按存储时间排序，删除最旧的消息
      const sortedMessages = Array.from(this.messages.entries())
        .sort(([, a], [, b]) => a.storedAt - b.storedAt)
      
      const toDelete = sortedMessages.slice(0, this.messages.size - this.config.maxMessages)
      
      for (const [id] of toDelete) {
        this.messages.delete(id)
      }
      
      logger.info('MessageStorageService', 'enforceMessageLimit', '强制执行消息限制', {
        deletedCount: toDelete.length,
        remainingCount: this.messages.size,
        maxMessages: this.config.maxMessages
      })
      
    } catch (error) {
      logger.error('MessageStorageService', 'enforceMessageLimit', '强制执行消息限制失败', error)
    }
  }

  /**
   * 销毁服务
   */
  async destroy(): Promise<void> {
    try {
      logger.info('MessageStorageService', 'destroy', '销毁消息存储服务')
      
      if (this.isInitialized) {
        await this.saveMessages()
      }
      
      this.messages.clear()
      this.isInitialized = false
      
      logger.info('MessageStorageService', 'destroy', '消息存储服务已销毁')
      
    } catch (error) {
      logger.error('MessageStorageService', 'destroy', '销毁服务失败', error)
    }
  }
}