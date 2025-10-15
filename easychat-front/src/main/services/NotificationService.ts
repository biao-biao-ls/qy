/**
 * 通知服务
 * 处理桌面通知的显示、管理和用户交互
 */

import { Notification, shell, BrowserWindow } from 'electron'
import { PushMessage, MessageType } from '../../types/push'
import { pushLogger as logger } from '../../utils/logger'
import { EventEmitter } from 'events'

export interface NotificationConfig {
  maxConcurrent?: number
  defaultTimeout?: number
  soundEnabled?: boolean
  iconPath?: string
}

interface NotificationItem {
  id: string
  notification: Notification
  message: PushMessage
  createdAt: number
  isShown: boolean
}

/**
 * 通知服务类
 * 管理桌面通知的显示、队列和用户交互
 */
export class NotificationService extends EventEmitter {
  private config: Required<NotificationConfig>
  private activeNotifications = new Map<string, NotificationItem>()
  private notificationQueue: PushMessage[] = []
  private isProcessingQueue = false
  
  // 统计信息
  private statistics = {
    totalNotifications: 0,
    shownNotifications: 0,
    clickedNotifications: 0,
    failedNotifications: 0
  }

  constructor(config: NotificationConfig = {}) {
    super()
    
    this.config = {
      maxConcurrent: config.maxConcurrent || 3,
      defaultTimeout: config.defaultTimeout || 5000,
      soundEnabled: config.soundEnabled !== false,
      iconPath: config.iconPath || ''
    }
    
    logger.info('NotificationService', 'constructor', '通知服务初始化完成', { config: this.config })
    
    this.checkNotificationSupport()
  }

  /**
   * 检查通知支持
   */
  private checkNotificationSupport(): void {
    if (!Notification.isSupported()) {
      logger.warn('NotificationService', 'checkNotificationSupport', '系统不支持桌面通知')
      throw new Error('系统不支持桌面通知')
    }
    
    logger.info('NotificationService', 'checkNotificationSupport', '桌面通知支持检查通过')
  }

  /**
   * 显示通知
   */
  async showNotification(message: PushMessage): Promise<void> {
    try {
      this.statistics.totalNotifications++
      
      logger.info('NotificationService', 'showNotification', '请求显示通知', {
        id: message.id,
        title: message.title,
        type: message.type
      })

      // 验证消息数据
      if (!this.validateMessage(message)) {
        throw new Error('通知消息数据无效')
      }

      // 检查是否可以立即显示
      if (this.canShowImmediately()) {
        await this.displayNotification(message)
      } else {
        // 添加到队列
        this.addToQueue(message)
      }
      
    } catch (error) {
      this.statistics.failedNotifications++
      logger.error('NotificationService', 'showNotification', '显示通知失败', error)
      this.emit('error', error)
      throw error
    }
  }

  /**
   * 验证消息数据
   */
  private validateMessage(message: PushMessage): boolean {
    if (!message.title || typeof message.title !== 'string') {
      logger.warn('NotificationService', 'validateMessage', '通知标题无效')
      return false
    }
    
    if (!message.content || typeof message.content !== 'string') {
      logger.warn('NotificationService', 'validateMessage', '通知内容无效')
      return false
    }
    
    // 截断过长的标题和内容
    if (message.title.length > 100) {
      message.title = message.title.substring(0, 97) + '...'
    }
    
    if (message.content.length > 300) {
      message.content = message.content.substring(0, 297) + '...'
    }
    
    return true
  }

  /**
   * 检查是否可以立即显示
   */
  private canShowImmediately(): boolean {
    return this.activeNotifications.size < this.config.maxConcurrent
  }

  /**
   * 实际显示通知
   */
  private async displayNotification(message: PushMessage): Promise<void> {
    try {
      // 创建 Electron 通知
      const notification = new Notification({
        title: message.title,
        body: message.content,
        icon: this.config.iconPath,
        silent: !this.config.soundEnabled,
        timeoutType: 'never', // 不自动关闭
        urgency: this.mapPriorityToUrgency(message.priority)
      })

      // 创建通知项
      const notificationItem: NotificationItem = {
        id: message.id,
        notification,
        message,
        createdAt: Date.now(),
        isShown: false
      }

      // 设置事件监听器
      this.setupNotificationEvents(notificationItem)

      // 显示通知
      notification.show()
      notificationItem.isShown = true
      this.statistics.shownNotifications++

      // 添加到活跃列表
      this.activeNotifications.set(message.id, notificationItem)

      logger.info('NotificationService', 'displayNotification', '通知已显示', {
        id: message.id,
        title: message.title,
        activeCount: this.activeNotifications.size
      })

      // 发射通知显示事件
      this.emit('notificationShown', {
        id: message.id,
        message,
        timestamp: notificationItem.createdAt
      })

      // 设置自动关闭（如果配置了超时时间）
      if (this.config.defaultTimeout > 0) {
        setTimeout(() => {
          this.closeNotification(message.id)
        }, this.config.defaultTimeout)
      }
      
    } catch (error) {
      logger.error('NotificationService', 'displayNotification', '显示通知失败', error)
      throw error
    }
  }

  /**
   * 设置通知事件监听器
   */
  private setupNotificationEvents(item: NotificationItem): void {
    const { notification, message } = item

    // 点击事件
    notification.on('click', () => {
      this.handleNotificationClick(item)
    })

    // 关闭事件
    notification.on('close', () => {
      this.handleNotificationClose(item)
    })

    // 显示事件
    notification.on('show', () => {
      logger.debug('NotificationService', 'onShow', '通知已显示', { id: item.id })
    })

    // 失败事件
    notification.on('failed', (error) => {
      logger.error('NotificationService', 'onFailed', '通知显示失败', error)
      this.handleNotificationClose(item)
    })
  }

  /**
   * 处理通知点击
   */
  private async handleNotificationClick(item: NotificationItem): Promise<void> {
    try {
      this.statistics.clickedNotifications++
      
      logger.info('NotificationService', 'handleNotificationClick', '通知被点击', {
        id: item.id,
        title: item.message.title
      })

      // 发射点击事件
      this.emit('notificationClicked', {
        id: item.id,
        message: item.message,
        timestamp: Date.now()
      })

      // 处理点击动作
      await this.handleNotificationAction(item.message)

      // 关闭通知
      this.closeNotification(item.id)
      
    } catch (error) {
      logger.error('NotificationService', 'handleNotificationClick', '处理通知点击失败', error)
    }
  }

  /**
   * 处理通知动作
   */
  private async handleNotificationAction(message: PushMessage): Promise<void> {
    try {
      // 如果消息包含 URL，打开链接
      if (message.data?.url) {
        await this.openUrl(message.data.url as string)
        return
      }

      // 如果有自定义动作，执行动作
      if (message.actions && message.actions.length > 0) {
        const primaryAction = message.actions[0]
        if (primaryAction && primaryAction.type === 'link' && primaryAction.action) {
          await this.openUrl(primaryAction.action)
          return
        }
      }

      // 默认动作：显示主窗口
      this.showMainWindow()
      
    } catch (error) {
      logger.error('NotificationService', 'handleNotificationAction', '处理通知动作失败', error)
    }
  }

  /**
   * 打开 URL
   */
  private async openUrl(url: string): Promise<void> {
    try {
      logger.info('NotificationService', 'openUrl', '打开 URL', { url })
      
      // 尝试在主窗口中打开
      const mainWindow = this.getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        // 显示并聚焦主窗口
        if (mainWindow.isMinimized()) {
          mainWindow.restore()
        }
        mainWindow.show()
        mainWindow.focus()
        
        // 在主窗口中打开 URL
        mainWindow.webContents.executeJavaScript(`
          window.open('${url}', '_blank');
        `).catch(() => {
          // 如果在主窗口中打开失败，使用外部浏览器
          return shell.openExternal(url)
        })
      } else {
        // 主窗口不可用，使用外部浏览器
        await shell.openExternal(url)
      }
      
    } catch (error) {
      logger.error('NotificationService', 'openUrl', '打开 URL 失败', error)
      // 最后的回退方案
      try {
        await shell.openExternal(url)
      } catch (err) {
        logger.error('NotificationService', 'openUrl', '外部浏览器打开失败', err)
      }
    }
  }

  /**
   * 显示主窗口
   */
  private showMainWindow(): void {
    try {
      const mainWindow = this.getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isMinimized()) {
          mainWindow.restore()
        }
        mainWindow.show()
        mainWindow.focus()
        
        logger.info('NotificationService', 'showMainWindow', '主窗口已显示')
      } else {
        logger.warn('NotificationService', 'showMainWindow', '主窗口不可用')
      }
    } catch (error) {
      logger.error('NotificationService', 'showMainWindow', '显示主窗口失败', error)
    }
  }

  /**
   * 获取主窗口
   */
  private getMainWindow(): BrowserWindow | null {
    const windows = BrowserWindow.getAllWindows()
    return windows.find(win => !win.isDestroyed() && win.webContents.getURL().includes('index.html')) || null
  }

  /**
   * 处理通知关闭
   */
  private handleNotificationClose(item: NotificationItem): void {
    try {
      logger.debug('NotificationService', 'handleNotificationClose', '通知已关闭', { id: item.id })

      // 从活跃列表中移除
      this.activeNotifications.delete(item.id)

      // 发射关闭事件
      this.emit('notificationClosed', {
        id: item.id,
        message: item.message,
        timestamp: Date.now()
      })

      // 处理队列中的下一个通知
      this.processQueue()
      
    } catch (error) {
      logger.error('NotificationService', 'handleNotificationClose', '处理通知关闭失败', error)
    }
  }

  /**
   * 映射优先级到紧急程度
   */
  private mapPriorityToUrgency(priority: string): 'normal' | 'critical' | 'low' {
    switch (priority) {
      case 'urgent':
      case 'high':
        return 'critical'
      case 'normal':
        return 'normal'
      case 'low':
      default:
        return 'low'
    }
  }

  /**
   * 添加到队列
   */
  private addToQueue(message: PushMessage): void {
    // 按优先级插入队列
    let insertIndex = this.notificationQueue.length
    
    for (let i = 0; i < this.notificationQueue.length; i++) {
      if (this.getPriorityValue(message.priority) > this.getPriorityValue(this.notificationQueue[i]?.priority || 'normal')) {
        insertIndex = i
        break
      }
    }
    
    this.notificationQueue.splice(insertIndex, 0, message)
    
    logger.info('NotificationService', 'addToQueue', '通知已添加到队列', {
      id: message.id,
      priority: message.priority,
      queueSize: this.notificationQueue.length
    })
  }

  /**
   * 获取优先级数值
   */
  private getPriorityValue(priority: string): number {
    switch (priority) {
      case 'urgent': return 4
      case 'high': return 3
      case 'normal': return 2
      case 'low': return 1
      default: return 2
    }
  }

  /**
   * 处理队列
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.notificationQueue.length === 0) {
      return
    }

    this.isProcessingQueue = true

    try {
      while (this.notificationQueue.length > 0 && this.canShowImmediately()) {
        const message = this.notificationQueue.shift()!
        await this.displayNotification(message)
      }
    } catch (error) {
      logger.error('NotificationService', 'processQueue', '处理队列失败', error)
    } finally {
      this.isProcessingQueue = false
    }
  }

  /**
   * 关闭指定通知
   */
  closeNotification(notificationId: string): void {
    try {
      const item = this.activeNotifications.get(notificationId)
      if (!item) {
        return
      }

      logger.info('NotificationService', 'closeNotification', '关闭通知', { id: notificationId })

      // 关闭 Electron 通知
      item.notification.close()

      // 从活跃列表中移除
      this.activeNotifications.delete(notificationId)
      
    } catch (error) {
      logger.error('NotificationService', 'closeNotification', '关闭通知失败', error)
    }
  }

  /**
   * 关闭所有通知
   */
  clearAllNotifications(): void {
    try {
      logger.info('NotificationService', 'clearAllNotifications', '关闭所有通知', {
        activeCount: this.activeNotifications.size,
        queueCount: this.notificationQueue.length
      })

      // 关闭所有活跃通知
      for (const [id, item] of this.activeNotifications) {
        try {
          item.notification.close()
        } catch (error) {
          logger.warn('NotificationService', 'clearAllNotifications', '关闭单个通知失败', error)
        }
      }

      // 清空列表和队列
      this.activeNotifications.clear()
      this.notificationQueue = []
      
    } catch (error) {
      logger.error('NotificationService', 'clearAllNotifications', '关闭所有通知失败', error)
    }
  }

  /**
   * 设置最大并发通知数
   */
  setMaxConcurrent(max: number): void {
    this.config.maxConcurrent = Math.max(max, 1)
    logger.info('NotificationService', 'setMaxConcurrent', '设置最大并发通知数', { max })
  }

  /**
   * 获取统计信息
   */
  getStatistics() {
    return {
      ...this.statistics,
      activeNotifications: this.activeNotifications.size,
      queuedNotifications: this.notificationQueue.length,
      clickRate: this.statistics.shownNotifications > 0 
        ? (this.statistics.clickedNotifications / this.statistics.shownNotifications * 100).toFixed(2) + '%' 
        : '0%',
      successRate: this.statistics.totalNotifications > 0 
        ? (this.statistics.shownNotifications / this.statistics.totalNotifications * 100).toFixed(2) + '%' 
        : '0%'
    }
  }

  /**
   * 重置统计信息
   */
  resetStatistics(): void {
    this.statistics = {
      totalNotifications: 0,
      shownNotifications: 0,
      clickedNotifications: 0,
      failedNotifications: 0
    }
    
    logger.info('NotificationService', 'resetStatistics', '统计信息已重置')
  }

  /**
   * 销毁服务
   */
  destroy(): void {
    try {
      logger.info('NotificationService', 'destroy', '销毁通知服务')

      // 关闭所有通知
      this.clearAllNotifications()

      // 移除所有监听器
      this.removeAllListeners()

      logger.info('NotificationService', 'destroy', '通知服务已销毁')
      
    } catch (error) {
      logger.error('NotificationService', 'destroy', '销毁通知服务失败', error)
    }
  }
}