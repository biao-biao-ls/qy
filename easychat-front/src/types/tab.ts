/**
 * 标签页管理相关类型定义
 * 简化的数据结构，移除冗余字段，专注于核心功能
 */

export interface TabItem {
  id: string
  title: string
  url: string
  favicon?: string
  isActive: boolean
  isLoading: boolean
  canGoBack: boolean
  canGoForward: boolean
  createdAt: Date
  updatedAt: Date
  position: number
}

export interface TabCreateOptions {
  url: string
  title?: string
  isActive?: boolean
  position?: number
}

export interface TabUpdateOptions {
  title?: string
  url?: string
  favicon?: string
  isLoading?: boolean
  canGoBack?: boolean
  canGoForward?: boolean
}

/**
 * 简化的标签页状态管理
 */
export interface TabManagerState {
  activeTabId: string | null
  tabCount: number
  maxTabs: number
}

/**
 * 标签页导航历史
 */
export interface TabNavigationHistory {
  canGoBack: boolean
  canGoForward: boolean
  currentIndex: number
  entries: TabHistoryEntry[]
}

export interface TabHistoryEntry {
  url: string
  title: string
  timestamp: Date
}

/**
 * 标签页拖拽状态（简化版）
 */
export interface TabDragState {
  isDragging: boolean
  dragTabId: string | null
  targetPosition: number | null
}

/**
 * 标签页事件类型（简化）
 */
export enum TabEvent {
  CREATED = 'tab-created',
  REMOVED = 'tab-removed',
  SWITCHED = 'tab-switched',
  UPDATED = 'tab-updated',
  MOVED = 'tab-moved',
  LOADING_START = 'tab-loading-start',
  LOADING_END = 'tab-loading-end',
  TITLE_UPDATED = 'tab-title-updated',
  FAVICON_UPDATED = 'tab-favicon-updated',
  NAVIGATED = 'tab-navigated',
  LOAD_FAILED = 'tab-load-failed',
  CRASHED = 'tab-crashed',
}

/**
 * 标签页事件数据（简化）
 */
export interface TabEventData {
  tabId: string
  tab?: TabItem
  [key: string]: any
}

/**
 * 标签页错误类型
 */
export enum TabErrorType {
  CREATE_FAILED = 'create_failed',
  REMOVE_FAILED = 'remove_failed',
  LOAD_FAILED = 'load_failed',
  NAVIGATION_FAILED = 'navigation_failed',
  MAX_TABS_EXCEEDED = 'max_tabs_exceeded',
  TAB_NOT_FOUND = 'tab_not_found',
}

export class TabError extends Error {
  constructor(
    public type: TabErrorType,
    public tabId?: string,
    message?: string
  ) {
    super(message || `Tab error: ${type}`)
    this.name = 'TabError'
  }
}

/**
 * 标签页操作选项
 */
export interface TabOperationOptions {
  force?: boolean // 强制执行操作
  silent?: boolean // 静默模式，不触发事件
}

/**
 * 标签页批量操作结果
 */
export interface TabBatchOperationResult {
  success: string[] // 成功的标签页ID
  failed: Array<{ tabId: string; error: string }> // 失败的标签页ID和错误信息
}

/**
 * 标签页性能统计
 */
export interface TabPerformanceStats {
  tabId: string
  memoryUsage: number // 内存使用量（MB）
  loadTime: number // 加载时间（ms）
  lastActiveTime: Date // 最后活跃时间
  navigationCount: number // 导航次数
}
