/**
 * 推送管理器
 * 统一管理 WebSocket 连接、消息处理、通知显示和消息存储
 */

import { EventEmitter } from 'events'
import { PushService, PushServiceConfig } from '../services/PushService'
import { NotificationService, NotificationConfig } from '../services/NotificationService'
import { MessageStorageService, StorageConfig } from '../services/MessageStorageService'
import { ConnectionState, PushMessage, MessageType } from '../../types/push'
import { pushLogger as logger } from '../../utils/logger'

export interface PushManagerConfig {
  websocket?: PushServiceConfig
  notification?: NotificationConfig
  storage?: StorageConfig
  autoReconnect?: boolean
  offlineMessageDelivery?: boolean
}

/**
 * 推送管理器类
 * 作为推送功能的统一入口和协调中心
 */
export class PushManager extends EventEmitter {
  private pushService: PushService
  private notificationService: NotificationService
  private storageService: MessageStorageService
  private config: Required<PushManagerConfig>
  
  private isEnabled = false
  private isInitialized = false
  private userId = ''
  
  // 统计信息
  private statistics = {
    startTime: 0,
    totalMessages: 0,
    processedMessages: 0,
    failedMessages: 0,
    notificationsShown: 0,
    messagesStored: 0
  }

  constructor(config: PushManagerConfig = {}) {
    super()
    
    this.config = {
      websocket: config.websocket || { url: '' },
      notification: config.notification || {},
      storage: config.storage || {},
      autoReconnect: config.autoReconnect !== false,
      offlineMessageDelivery: config.offlineMessageDelivery !== false
    }
    
    // 初始化服务
    this.pushService = new PushService(this.config.websocket)
    this.notificationService = new NotificationService(this.config.notification)
    this.storageService = new MessageStorageService(this.config.storage)
    
    logger.info('PushManager', 'constructor', '推送管理器创建完成')
    
    this.setupEventListeners()
  }

  /**
   * 初始化推送管理器
   */
  async initialize(): Promise<void> {
    try {
      logger.info('PushManager', 'initialize', '初始化推送管理器')
      
      // 初始化存储服务
      await this.storageService.initialize()
      
      this.isInitialized = true
      this.statistics.startTime = Date.now()
      
      logger.info('PushManager', 'initialize', '推送管理器初始化完成')
      
    } catch (error) {
      logger.error('PushManager', 'initialize', '初始化失败', error)
      throw error
    }
  }

  /**
   * 启动推送服务
   */
  async start(): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize()
      }
      
      if (this.isEnabled) {
        logger.warn('PushManager', 'start', '推送服务已在运行')
        return
      }
      
      logger.info('PushManager', 'start', '启动推送服务')
      
      // 连接 WebSocket
      await this.pushService.connect()
      
      // 如果启用离线消息投递，处理未送达的消息
      if (this.config.offlineMessageDelivery) {
        await this.deliverOfflineMessages()
      }
      
      this.isEnabled = true
      
      logger.info('PushManager', 'start', '推送服务启动成功')
      this.emit('started')
      
    } catch (error) {
      logger.error('PushManager', 'start', '启动推送服务失败', error)
      this.emit('error', error)
      throw error
    }
  }

  /**
   * 停止推送服务
   */
  async stop(): Promise<void> {
    try {
      if (!this.isEnabled) {
        logger.warn('PushManager', 'stop', '推送服务未运行')
        return
      }
      
      logger.info('PushManager', 'stop', '停止推送服务')
      
      this.isEnabled = false
      
      // 断开 WebSocket 连接
      await this.pushService.disconnect()
      
      // 清除所有通知
      this.notificationService.clearAllNotifications()
      
      logger.info('PushManager', 'stop', '推送服务已停止')
      this.emit('stopped')
      
    } catch (error) {
      logger.error('PushManager', 'stop', '停止推送服务失败', error)
      throw error
    }
  }

  /**
   * 重启推送服务
   */
  async restart(): Promise<void> {
    try {
      logger.info('PushManager', 'restart', '重启推送服务')
      
      await this.stop()
      await new Promise(resolve => setTimeout(resolve, 1000)) // 等待1秒
      await this.start()
      
      logger.info('PushManager', 'restart', '推送服务重启完成')
      
    } catch (error) {
      logger.error('PushManager', 'restart', '重启推送服务失败', error)
      throw error
    }
  }

  /**
   * 设置用户ID
   */
  setUserId(userId: string): void {
    this.userId = userId
    this.pushService.setUserId(userId)
    
    logger.info('PushManager', 'setUserId', '设置用户ID', { userId })
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<PushManagerConfig>): void {
    try {
      logger.info('PushManager', 'updateConfig', '更新配置', config)
      
      // 合并配置
      this.config = { ...this.config, ...config }
      
      // 更新通知服务配置
      if (config.notification?.maxConcurrent) {
        this.notificationService.setMaxConcurrent(config.notification.maxConcurrent)
      }
      
      logger.info('PushManager', 'updateConfig', '配置更新完成')
      
    } catch (error) {
      logger.error('PushManager', 'updateConfig', '更新配置失败', error)
    }
  }

  /**
   * 手动显示通知
   */
  async showNotification(message: PushMessage): Promise<void> {
    try {
      await this.handleMessage(message)
    } catch (error) {
      logger.error('PushManager', 'showNotification', '显示通知失败', error)
      throw error
    }
  }

  /**
   * 获取连接状态
   */
  getConnectionState(): ConnectionState {
    return this.pushService.getConnectionState()
  }

  /**
   * 获取统计信息
   */
  getStatistics() {
    const pushStats = this.pushService.getStatistics()
    const notificationStats = this.notificationService.getStatistics()
    const storageStats = this.storageService.getStatistics()
    
    return {
      // 总体统计
      ...this.statistics,
      uptime: this.statistics.startTime > 0 ? Date.now() - this.statistics.startTime : 0,
      isEnabled: this.isEnabled,
      isInitialized: this.isInitialized,
      userId: this.userId,
      
      // 连接统计
      connection: {
        state: this.getConnectionState(),
        ...pushStats
      },
      
      // 通知统计
      notification: notificationStats,
      
      // 存储统计
      storage: storageStats
    }
  }

  /**
   * 重置统计信息
   */
  resetStatistics(): void {
    this.statistics = {
      startTime: Date.now(),
      totalMessages: 0,
      processedMessages: 0,
      failedMessages: 0,
      notificationsShown: 0,
      messagesStored: 0
    }
    
    this.pushService.resetStatistics()
    this.notificationService.resetStatistics()
    
    logger.info('PushManager', 'resetStatistics', '统计信息已重置')
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // WebSocket 连接事件
    this.pushService.on('connected', () => {
      logger.info('PushManager', 'onConnected', 'WebSocket 连接已建立')
      this.emit('connected')
    })

    this.pushService.on('disconnected', (data) => {
      logger.info('PushManager', 'onDisconnected', 'WebSocket 连接已断开', data)
      this.emit('disconnected', data)
    })

    this.pushService.on('connectionStateChanged', (status) => {
      logger.info('PushManager', 'onConnectionStateChanged', '连接状态变更', status)
      this.emit('connectionStateChanged', status)
    })

    this.pushService.on('error', (error) => {
      logger.error('PushManager', 'onPushServiceError', 'WebSocket 服务错误', error)
      this.emit('error', error)
    })

    // 消息事件
    this.pushService.on('message', (message) => {
      this.handleRawMessage(message)
    })

    this.pushService.on('notification', (message) => {
      this.handleMessage(message)
    })

    // 通知事件
    this.notificationService.on('notificationShown', (data) => {
      this.statistics.notificationsShown++
      logger.debug('PushManager', 'onNotificationShown', '通知已显示', data)
      this.emit('notificationShown', data)
    })

    this.notificationService.on('notificationClicked', (data) => {
      logger.info('PushManager', 'onNotificationClicked', '通知被点击', data)
      this.emit('notificationClicked', data)
      
      // 标记消息为已送达
      if (data.message.id) {
        this.storageService.markAsDelivered(data.message.id)
      }
    })

    this.notificationService.on('error', (error) => {
      logger.error('PushManager', 'onNotificationError', '通知服务错误', error)
      this.emit('error', error)
    })
  }

  /**
   * 处理原始消息
   */
  private async handleRawMessage(message: any): Promise<void> {
    try {
      this.statistics.totalMessages++
      
      logger.debug('PushManager', 'handleRawMessage', '处理原始消息', {
        messageType: message.messageType,
        messageId: message.messageId || message.id
      })
      
      // 发射原始消息事件
      this.emit('rawMessage', message)
      
    } catch (error) {
      this.statistics.failedMessages++
      logger.error('PushManager', 'handleRawMessage', '处理原始消息失败', error)
    }
  }

  /**
   * 处理推送消息
   */
  private async handleMessage(message: PushMessage): Promise<void> {
    try {
      this.statistics.processedMessages++
      
      logger.info('PushManager', 'handleMessage', '处理推送消息', {
        id: message.id,
        type: message.type,
        title: message.title
      })

      // 存储消息
      if (this.config.offlineMessageDelivery) {
        await this.storageService.storeMessage(message)
        this.statistics.messagesStored++
      }

      // 显示通知
      if (message.type === MessageType.NOTIFICATION) {
        await this.notificationService.showNotification(message)
      }

      // 发射消息处理事件
      this.emit('messageProcessed', message)
      
    } catch (error) {
      this.statistics.failedMessages++
      logger.error('PushManager', 'handleMessage', '处理推送消息失败', error)
      this.emit('error', error)
    }
  }

  /**
   * 投递离线消息
   */
  private async deliverOfflineMessages(): Promise<void> {
    try {
      const undeliveredMessages = await this.storageService.getUndeliveredMessages()
      
      if (undeliveredMessages.length === 0) {
        logger.info('PushManager', 'deliverOfflineMessages', '没有未送达的离线消息')
        return
      }
      
      logger.info('PushManager', 'deliverOfflineMessages', '开始投递离线消息', {
        count: undeliveredMessages.length
      })
      
      // 按时间顺序投递消息
      const sortedMessages = undeliveredMessages.sort((a, b) => 
        a.timestamp.getTime() - b.timestamp.getTime()
      )
      
      for (const message of sortedMessages) {
        try {
          // 显示通知
          await this.notificationService.showNotification(message)
          
          // 标记为已送达
          await this.storageService.markAsDelivered(message.id)
          
          // 添加延迟避免通知过于密集
          await new Promise(resolve => setTimeout(resolve, 500))
          
        } catch (error) {
          logger.error('PushManager', 'deliverOfflineMessages', '投递单个离线消息失败', {
            messageId: message.id,
            error
          })
        }
      }
      
      logger.info('PushManager', 'deliverOfflineMessages', '离线消息投递完成')
      
    } catch (error) {
      logger.error('PushManager', 'deliverOfflineMessages', '投递离线消息失败', error)
    }
  }

  /**
   * 获取最近的消息
   */
  async getRecentMessages(limit?: number): Promise<PushMessage[]> {
    try {
      return await this.storageService.getRecentMessages(limit)
    } catch (error) {
      logger.error('PushManager', 'getRecentMessages', '获取最近消息失败', error)
      return []
    }
  }

  /**
   * 清除所有通知
   */
  clearAllNotifications(): void {
    this.notificationService.clearAllNotifications()
  }

  /**
   * 清除所有存储的消息
   */
  async clearAllMessages(): Promise<void> {
    try {
      await this.storageService.clearAllMessages()
      logger.info('PushManager', 'clearAllMessages', '所有存储消息已清除')
    } catch (error) {
      logger.error('PushManager', 'clearAllMessages', '清除存储消息失败', error)
      throw error
    }
  }

  /**
   * 销毁推送管理器
   */
  async destroy(): Promise<void> {
    try {
      logger.info('PushManager', 'destroy', '销毁推送管理器')
      
      // 停止服务
      if (this.isEnabled) {
        await this.stop()
      }
      
      // 销毁各个服务
      await this.pushService.destroy()
      this.notificationService.destroy()
      await this.storageService.destroy()
      
      // 移除所有监听器
      this.removeAllListeners()
      
      // 重置状态
      this.isEnabled = false
      this.isInitialized = false
      
      logger.info('PushManager', 'destroy', '推送管理器已销毁')
      
    } catch (error) {
      logger.error('PushManager', 'destroy', '销毁推送管理器失败', error)
    }
  }
}