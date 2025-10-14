/**
 * 消息推送相关类型定义
 */

export enum MessageType {
  NOTIFICATION = 'notification',
  ALERT = 'alert',
  UPDATE = 'update',
  SYSTEM = 'system',
  CHAT = 'chat',
}

export enum MessagePriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export interface PushMessage {
  id: string
  type: MessageType
  title: string
  content: string
  data?: Record<string, unknown>
  timestamp: Date
  priority: MessagePriority
  read: boolean
  actions?: MessageAction[]
}

export interface MessageAction {
  id: string
  label: string
  type: 'button' | 'link'
  action: string
  data?: Record<string, unknown>
}

export interface PushConnectionConfig {
  url: string
  reconnectInterval: number
  maxReconnectAttempts: number
  heartbeatInterval: number
  timeout: number
}

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
}

export interface ConnectionStatus {
  state: ConnectionState
  lastConnected?: Date
  reconnectAttempts: number
  error?: string
}

export enum PushEvent {
  MESSAGE_RECEIVED = 'push:message-received',
  CONNECTION_STATE_CHANGED = 'push:connection-state-changed',
  ERROR = 'push:error',
}

export interface PushEventData {
  message?: PushMessage
  connectionStatus?: ConnectionStatus
  error?: Error
}

export class PushError extends Error {
  constructor(
    public code: string,
    message: string,
    public originalError?: Error
  ) {
    super(message)
    this.name = 'PushError'
  }
}
