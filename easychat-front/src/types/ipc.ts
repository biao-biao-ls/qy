/**
 * IPC 通信相关类型定义
 */

import { TabItem, TabCreateOptions, TabUpdateOptions } from './tab'
import { WindowType, WindowOptions } from './window'
import { PushMessage } from './push'
import { AppConfig, ConfigKey, ConfigValue } from './config'

// IPC 频道定义
export enum IPCChannel {
  // 窗口操作
  WINDOW_MINIMIZE = 'window:minimize',
  WINDOW_MAXIMIZE = 'window:maximize',
  WINDOW_RESTORE = 'window:restore',
  WINDOW_CLOSE = 'window:close',
  WINDOW_SET_TITLE = 'window:set-title',
  WINDOW_CREATE = 'window:create',

  // 标签页操作
  TAB_CREATE = 'tab:create',
  TAB_REMOVE = 'tab:remove',
  TAB_ACTIVATE = 'tab:activate',
  TAB_UPDATE = 'tab:update',
  TAB_GET_ALL = 'tab:get-all',
  TAB_NAVIGATE = 'tab:navigate',
  TAB_GO_BACK = 'tab:go-back',
  TAB_GO_FORWARD = 'tab:go-forward',
  TAB_RELOAD = 'tab:reload',

  // 配置管理
  CONFIG_GET = 'config:get',
  CONFIG_SET = 'config:set',
  CONFIG_GET_ALL = 'config:get-all',
  CONFIG_RESET = 'config:reset',
  CONFIG_CHANGED = 'config:changed',

  // 消息推送
  PUSH_MESSAGE = 'push:message',
  PUSH_SEND = 'push:send',
  PUSH_CONNECT = 'push:connect',
  PUSH_DISCONNECT = 'push:disconnect',
  PUSH_STATUS = 'push:status',

  // 应用控制
  APP_QUIT = 'app:quit',
  APP_RESTART = 'app:restart',
  APP_GET_INFO = 'app:get-info',
  APP_GET_VERSION = 'app:get-version',

  // 更新管理
  UPDATE_CHECK = 'update:check',
  UPDATE_DOWNLOAD = 'update:download',
  UPDATE_INSTALL = 'update:install',
  UPDATE_PROGRESS = 'update:progress',
  UPDATE_AVAILABLE = 'update:available',
  UPDATE_DOWNLOADED = 'update:downloaded',
}

// IPC 请求和响应类型
export interface IPCRequest<T = unknown> {
  id: string
  channel: IPCChannel
  data?: T
}

export interface IPCResponse<T = unknown> {
  id: string
  success: boolean
  data?: T
  error?: string
}

// 窗口操作相关
export interface WindowCreateRequest {
  type: WindowType
  options?: WindowOptions
}

export interface WindowOperationRequest {
  windowId?: string
  title?: string
}

// 标签页操作相关
export interface TabCreateRequest {
  options: TabCreateOptions
}

export interface TabUpdateRequest {
  tabId: string
  options: TabUpdateOptions
}

export interface TabNavigateRequest {
  tabId: string
  url: string
}

export interface TabOperationRequest {
  tabId: string
}

// 配置操作相关
export interface ConfigGetRequest<K extends ConfigKey = ConfigKey> {
  key: K
}

export interface ConfigSetRequest<K extends ConfigKey = ConfigKey> {
  key: K
  value: ConfigValue<K>
}

export interface ConfigChangedEvent<K extends ConfigKey = ConfigKey> {
  key: K
  value: ConfigValue<K>
  oldValue?: ConfigValue<K>
}

// 消息推送相关
export interface PushSendRequest {
  message: Omit<PushMessage, 'id' | 'timestamp' | 'read'>
}

// 更新相关
export interface UpdateInfo {
  version: string
  releaseDate: string
  releaseNotes: string
  downloadUrl: string
  size: number
}

export interface UpdateProgress {
  percent: number
  bytesPerSecond: number
  total: number
  transferred: number
}

// 预加载脚本 API 接口
export interface ElectronAPI {
  // 窗口操作
  window: {
    minimize(): Promise<void>
    maximize(): Promise<void>
    restore(): Promise<void>
    close(): Promise<void>
    setTitle(title: string): Promise<void>
    isMaximized(): Promise<boolean>
    create(type: WindowType, options?: WindowOptions): Promise<string>
  }

  // 标签页操作
  tabs: {
    create(options: TabCreateOptions): Promise<TabItem>
    remove(tabId: string): Promise<void>
    activate(tabId: string): Promise<void>
    switch(tabId: string): Promise<void>  // 兼容性别名
    update(tabId: string, options: TabUpdateOptions): Promise<TabItem>
    getAll(): Promise<TabItem[]>
    navigate(tabId: string, url: string): Promise<void>
    goBack(tabId: string): Promise<void>
    goForward(tabId: string): Promise<void>
    reload(tabId: string): Promise<void>
  }

  // 配置管理
  config: {
    get<K extends ConfigKey>(key: K): Promise<ConfigValue<K>>
    set<K extends ConfigKey>(key: K, value: ConfigValue<K>): Promise<void>
    getAll(): Promise<AppConfig>
    reset(): Promise<void>
    onChange<K extends ConfigKey>(
      callback: (key: K, value: ConfigValue<K>, oldValue?: ConfigValue<K>) => void
    ): () => void
  }

  // 消息推送
  push: {
    onMessage(callback: (message: PushMessage) => void): () => void
    send(message: Omit<PushMessage, 'id' | 'timestamp' | 'read'>): Promise<void>
    connect(): Promise<void>
    disconnect(): Promise<void>
    getStatus(): Promise<{ connected: boolean; lastConnected?: Date }>
  }

  // 应用控制
  app: {
    quit(): Promise<void>
    restart(): Promise<void>
    getInfo(): Promise<{ name: string; version: string; platform: string }>
    getVersion(): Promise<string>
  }

  // 更新管理
  update: {
    check(): Promise<UpdateInfo | null>
    download(): Promise<void>
    install(): Promise<void>
    onProgress(callback: (progress: UpdateProgress) => void): () => void
    onAvailable(callback: (info: UpdateInfo) => void): () => void
    onDownloaded(callback: () => void): () => void
  }

  // 开发者工具
  dev?: {
    toggleDevTools(): Promise<{ success: boolean; action: 'opened' | 'closed' }>
    openDevTools(): Promise<{ success: boolean }>
    closeDevTools(): Promise<{ success: boolean }>
    isDevToolsOpened(): Promise<{ isOpened: boolean }>
  }

  // IPC 通信（兼容性）
  ipc?: {
    send(channel: string, ...args: any[]): void
    invoke(channel: string, ...args: any[]): Promise<any>
    on(channel: string, callback: (...args: any[]) => void): () => void
    removeAllListeners(channel: string): void
  }
}
