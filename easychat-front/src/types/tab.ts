/**
 * 标签页管理相关类型定义
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

export interface TabState {
  tabs: TabItem[]
  activeTabId: string | null
  maxTabs: number
}

export enum TabEvent {
  CREATED = 'tab:created',
  REMOVED = 'tab:removed',
  ACTIVATED = 'tab:activated',
  UPDATED = 'tab:updated',
  MOVED = 'tab:moved',
  LOADING_START = 'tab:loading-start',
  LOADING_STOP = 'tab:loading-stop',
  NAVIGATION = 'tab:navigation',
}

export interface TabEventData {
  tabId: string
  tab?: TabItem
  oldIndex?: number
  newIndex?: number
  url?: string
}

export enum TabErrorType {
  CREATE_FAILED = 'create_failed',
  REMOVE_FAILED = 'remove_failed',
  LOAD_FAILED = 'load_failed',
  NAVIGATION_FAILED = 'navigation_failed',
  MAX_TABS_EXCEEDED = 'max_tabs_exceeded',
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
