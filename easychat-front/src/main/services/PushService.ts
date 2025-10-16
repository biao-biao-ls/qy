/**
 * 消息推送服务
 * 简化的 WebSocket 连接管理和消息处理
 */

import { EventEmitter } from 'events'
import WebSocket from 'ws'
import { ConnectionState, MessageType, PushConnectionConfig, PushMessage } from '../../types/push'
import { pushLogger as logger } from '../../utils/logger'

export interface PushServiceConfig {
  url: string
  token?: string
  reconnectInterval?: number
  maxReconnectAttempts?: number
  heartbeatInterval?: number
  timeout?: number
}

export interface ConnectionStatistics {
  connectTime?: number
  lastMessageTime?: number
  reconnectAttempts: number
  messageCount: number
  errorCount: number
}

/**
 * 推送服务类
 * 提供 WebSocket 连接管理、消息处理和通知功能
 */
export class PushService extends EventEmitter {
  private ws: WebSocket | null = null
  private config: Required<PushServiceConfig>
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED
  private reconnectTimer: NodeJS.Timeout | null = null
  private heartbeatTimer: NodeJS.Timeout | null = null
  private heartbeatTimeoutTimer: NodeJS.Timeout | null = null

  // 连接统计
  private statistics: ConnectionStatistics = {
    reconnectAttempts: 0,
    messageCount: 0,
    errorCount: 0,
  }

  // 消息队列
  private messageQueue: string[] = []
  private isConnected = false
  private lastHeartbeatTime = 0
  private userId = ''

  constructor(config: PushServiceConfig) {
    super()

    // 设置默认配置
    this.config = {
      url: config.url,
      token: config.token || '',
      reconnectInterval: config.reconnectInterval || 5000,
      maxReconnectAttempts: config.maxReconnectAttempts || 5,
      heartbeatInterval: config.heartbeatInterval || 30000,
      timeout: config.timeout || 10000,
    }

    logger.info('PushService', 'constructor', '推送服务初始化完成', { config: this.config })
  }

  /**
   * 连接到 WebSocket 服务器
   */
  async connect(): Promise<void> {
    if (this.connectionState === ConnectionState.CONNECTING || this.isConnected) {
      logger.warn('PushService', 'connect', '连接已存在或正在连接中')
      return
    }

    try {
      this.updateConnectionState(ConnectionState.CONNECTING)
      logger.info('PushService', 'connect', '开始连接 WebSocket 服务器', { url: this.config.url })

      // 构建连接 URL
      const wsUrl = this.buildWebSocketUrl()

      // 创建 WebSocket 连接
      this.ws = new WebSocket(wsUrl, {
        headers: {
          Authorization: `Bearer ${this.config.token}`,
          'User-Agent': 'EasyChat/1.0.0',
        },
        handshakeTimeout: this.config.timeout,
      })

      // 设置事件监听器
      this.setupWebSocketEventListeners()

      // 等待连接建立
      await this.waitForConnection()
    } catch (error) {
      this.statistics.errorCount++
      logger.error('PushService', 'connect', '连接失败', error)
      this.updateConnectionState(ConnectionState.ERROR)
      this.emit('error', error)
      throw error
    }
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    logger.info('PushService', 'disconnect', '开始断开连接')

    // 停止重连和心跳
    this.stopReconnect()
    this.stopHeartbeat()

    // 关闭 WebSocket 连接
    if (this.ws) {
      this.ws.close(1000, '正常关闭')
      this.ws = null
    }

    this.isConnected = false
    this.updateConnectionState(ConnectionState.DISCONNECTED)

    logger.info('PushService', 'disconnect', '连接已断开')
  }

  /**
   * 发送消息
   */
  send(message: any): void {
    const messageStr = typeof message === 'string' ? message : JSON.stringify(message)

    if (!this.isConnected || !this.ws) {
      logger.warn('PushService', 'send', '连接未建立，消息加入队列', { message: messageStr })
      this.messageQueue.push(messageStr)
      return
    }

    try {
      this.ws.send(messageStr)
      logger.debug('PushService', 'send', '消息已发送', { messageLength: messageStr.length })
    } catch (error) {
      logger.error('PushService', 'send', '发送消息失败', error)
      this.messageQueue.push(messageStr) // 发送失败时加入队列
      throw error
    }
  }

  /**
   * 发送心跳消息
   */
  private sendHeartbeat(): void {
    try {
      const now = Date.now()
      const heartbeatMessage = {
        messageType: 'HEARTBEAT',
        messageId: `heartbeat_${now}`,
        userId: this.userId || 'unknown_user',
        timestamp: now,
        clientInfo: {
          clientType: 'desktop',
          clientVersion: '1.0.0',
        },
      }

      this.send(heartbeatMessage)
      this.lastHeartbeatTime = now

      // 设置心跳超时检测
      this.setHeartbeatTimeout()

      logger.debug('PushService', 'sendHeartbeat', '心跳消息已发送')
    } catch (error) {
      logger.error('PushService', 'sendHeartbeat', '发送心跳失败', error)
    }
  }

  /**
   * 构建 WebSocket URL
   */
  private buildWebSocketUrl(): string {
    try {
      const url = new URL(this.config.url)

      // 确保使用正确的协议
      if (url.protocol === 'http:') {
        url.protocol = 'ws:'
      } else if (url.protocol === 'https:') {
        url.protocol = 'wss:'
      }

      // 添加认证参数
      if (this.config.token) {
        url.searchParams.set('token', this.config.token)
      }
      url.searchParams.set('timestamp', Date.now().toString())

      return url.toString()
    } catch (error) {
      logger.error('PushService', 'buildWebSocketUrl', '构建 URL 失败', error)
      throw new Error('无效的 WebSocket URL')
    }
  }

  /**
   * 设置 WebSocket 事件监听器
   */
  private setupWebSocketEventListeners(): void {
    if (!this.ws) return

    this.ws.on('open', () => {
      this.statistics.connectTime = Date.now()
      this.statistics.reconnectAttempts = 0
      this.isConnected = true

      logger.info('PushService', 'onOpen', 'WebSocket 连接已建立')
      this.updateConnectionState(ConnectionState.CONNECTED)

      // 发送队列中的消息
      this.flushMessageQueue()

      // 启动心跳
      this.startHeartbeat()

      this.emit('connected')
    })

    this.ws.on('message', (data: Buffer) => {
      try {
        const message = data.toString()
        this.statistics.lastMessageTime = Date.now()
        this.statistics.messageCount++

        logger.debug('PushService', 'onMessage', '收到消息', { messageLength: message.length })

        // 解析消息
        const parsedMessage = this.parseMessage(message)
        if (parsedMessage) {
          this.handleMessage(parsedMessage)
        }
      } catch (error) {
        logger.error('PushService', 'onMessage', '处理消息失败', error)
        this.statistics.errorCount++
      }
    })

    this.ws.on('close', (code: number, reason: string) => {
      this.isConnected = false
      this.stopHeartbeat()

      logger.info('PushService', 'onClose', 'WebSocket 连接已关闭', { code, reason })

      this.updateConnectionState(ConnectionState.DISCONNECTED)
      this.emit('disconnected', { code, reason })

      // 判断是否需要重连
      if (this.shouldReconnect(code)) {
        this.scheduleReconnect()
      }
    })

    this.ws.on('error', (error: Error) => {
      this.statistics.errorCount++
      logger.error('PushService', 'onError', 'WebSocket 连接错误', error)

      this.updateConnectionState(ConnectionState.ERROR)
      this.emit('error', error)
    })
  }

  /**
   * 等待连接建立
   */
  private waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.ws) {
        reject(new Error('WebSocket 实例不存在'))
        return
      }

      const timeout = setTimeout(() => {
        reject(new Error('连接超时'))
      }, this.config.timeout)

      this.ws.once('open', () => {
        clearTimeout(timeout)
        resolve()
      })

      this.ws.once('error', error => {
        clearTimeout(timeout)
        reject(error)
      })
    })
  }

  /**
   * 解析消息
   */
  private parseMessage(rawMessage: string): any | null {
    try {
      return JSON.parse(rawMessage)
    } catch (error) {
      logger.error('PushService', 'parseMessage', '消息解析失败', { rawMessage })
      return null
    }
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(message: any): void {
    try {
      // 处理心跳响应
      if (message.messageType === 'HEARTBEAT_RESPONSE' || message.messageType === 'HEARTBEAT') {
        this.handleHeartbeatResponse(message)
        return
      }

      // 处理通知消息
      if (message.messageType === 'NOTIFICATION') {
        this.handleNotificationMessage(message)
        return
      }

      // 发射通用消息事件
      this.emit('message', message)
    } catch (error) {
      logger.error('PushService', 'handleMessage', '处理消息失败', error)
    }
  }

  /**
   * 处理心跳响应
   */
  private handleHeartbeatResponse(message: any): void {
    this.clearHeartbeatTimeout()
    logger.debug('PushService', 'handleHeartbeatResponse', '收到心跳响应')
  }

  /**
   * 处理通知消息
   */
  private handleNotificationMessage(message: any): void {
    try {
      const notification: PushMessage = {
        id: message.messageId || message.id,
        type: MessageType.NOTIFICATION,
        title: message.title || message.data?.title || '新消息',
        content: message.content || message.data?.content || message.body || '',
        data: message.data,
        timestamp: new Date(message.timestamp || Date.now()),
        priority: message.priority || 'normal',
        read: false,
      }

      logger.info('PushService', 'handleNotificationMessage', '收到通知消息', {
        id: notification.id,
        title: notification.title,
      })

      this.emit('notification', notification)

      // 发送消息确认
      this.sendMessageAck(notification.id)
    } catch (error) {
      logger.error('PushService', 'handleNotificationMessage', '处理通知消息失败', error)
    }
  }

  /**
   * 发送消息确认
   */
  private sendMessageAck(messageId: string): void {
    try {
      const ackMessage = {
        messageType: 'ACK',
        messageId,
        status: 'delivered',
        timestamp: Date.now(),
      }

      this.send(ackMessage)
      logger.debug('PushService', 'sendMessageAck', '消息确认已发送', { messageId })
    } catch (error) {
      logger.error('PushService', 'sendMessageAck', '发送消息确认失败', error)
    }
  }

  /**
   * 启动心跳
   */
  private startHeartbeat(): void {
    this.stopHeartbeat()

    logger.debug('PushService', 'startHeartbeat', '启动心跳', {
      interval: this.config.heartbeatInterval,
    })

    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        this.sendHeartbeat()
      }
    }, this.config.heartbeatInterval)

    // 立即发送一次心跳
    if (this.isConnected) {
      this.sendHeartbeat()
    }
  }

  /**
   * 停止心跳
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
    this.clearHeartbeatTimeout()
  }

  /**
   * 设置心跳超时检测
   */
  private setHeartbeatTimeout(): void {
    this.clearHeartbeatTimeout()

    this.heartbeatTimeoutTimer = setTimeout(() => {
      logger.warn('PushService', 'heartbeatTimeout', '心跳超时，可能连接异常')

      // 心跳超时，关闭连接触发重连
      if (this.ws) {
        this.ws.close(1006, '心跳超时')
      }
    }, this.config.heartbeatInterval * 2) // 心跳超时时间为心跳间隔的2倍
  }

  /**
   * 清除心跳超时检测
   */
  private clearHeartbeatTimeout(): void {
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer)
      this.heartbeatTimeoutTimer = null
    }
  }

  /**
   * 发送队列中的消息
   */
  private flushMessageQueue(): void {
    if (this.messageQueue.length === 0) return

    logger.info('PushService', 'flushMessageQueue', '发送队列消息', {
      count: this.messageQueue.length,
    })

    const messages = [...this.messageQueue]
    this.messageQueue = []

    for (const message of messages) {
      try {
        this.send(message)
      } catch (error) {
        logger.error('PushService', 'flushMessageQueue', '发送队列消息失败', error)
        this.messageQueue.push(message) // 重新加入队列
      }
    }
  }

  /**
   * 判断是否应该重连
   */
  private shouldReconnect(closeCode: number): boolean {
    // 正常关闭不重连
    if (closeCode === 1000) {
      return false
    }

    // 达到最大重连次数
    if (this.statistics.reconnectAttempts >= this.config.maxReconnectAttempts) {
      logger.warn('PushService', 'shouldReconnect', '达到最大重连次数，停止重连')
      return false
    }

    return true
  }

  /**
   * 安排重连
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return
    }

    this.statistics.reconnectAttempts++
    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.statistics.reconnectAttempts - 1),
      30000 // 最大延迟30秒
    )

    logger.info('PushService', 'scheduleReconnect', '安排重连', {
      attempt: this.statistics.reconnectAttempts,
      delay,
    })

    this.updateConnectionState(ConnectionState.RECONNECTING)

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null
      try {
        await this.connect()
      } catch (error) {
        logger.error('PushService', 'scheduleReconnect', '重连失败', error)

        // 继续尝试重连
        if (this.statistics.reconnectAttempts < this.config.maxReconnectAttempts) {
          this.scheduleReconnect()
        } else {
          this.updateConnectionState(ConnectionState.ERROR)
        }
      }
    }, delay)
  }

  /**
   * 停止重连
   */
  private stopReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  /**
   * 更新连接状态
   */
  private updateConnectionState(newState: ConnectionState): void {
    const oldState = this.connectionState
    this.connectionState = newState

    if (oldState !== newState) {
      logger.info('PushService', 'updateConnectionState', '连接状态变更', {
        from: oldState,
        to: newState,
      })

      this.emit('connectionStateChanged', {
        state: newState,
        lastConnected: this.statistics.connectTime
          ? new Date(this.statistics.connectTime)
          : undefined,
        reconnectAttempts: this.statistics.reconnectAttempts,
      })
    }
  }

  /**
   * 设置用户ID
   */
  setUserId(userId: string): void {
    this.userId = userId
    logger.info('PushService', 'setUserId', '设置用户ID', { userId })
  }

  /**
   * 获取连接状态
   */
  getConnectionState(): ConnectionState {
    return this.connectionState
  }

  /**
   * 获取连接统计信息
   */
  getStatistics(): ConnectionStatistics {
    return { ...this.statistics }
  }

  /**
   * 重置统计信息
   */
  resetStatistics(): void {
    this.statistics = {
      reconnectAttempts: 0,
      messageCount: 0,
      errorCount: 0,
    }
    logger.info('PushService', 'resetStatistics', '统计信息已重置')
  }

  /**
   * 销毁服务
   */
  async destroy(): Promise<void> {
    logger.info('PushService', 'destroy', '销毁推送服务')

    await this.disconnect()
    this.removeAllListeners()

    logger.info('PushService', 'destroy', '推送服务已销毁')
  }
}
