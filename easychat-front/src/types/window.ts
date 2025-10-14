/**
 * 窗口管理相关类型定义
 */

export enum WindowType {
  MAIN = 'main',
  LOGIN = 'login',
  SETTING = 'setting',
  ALERT = 'alert',
  UPDATE_TIP = 'updateTip',
  LOADING = 'loading',
  LAUNCHER = 'launcher',
  MESSAGE_ALERT = 'messageAlert',
  MESSAGE_MGR = 'messageMgr',
}

export interface WindowOptions {
  width?: number
  height?: number
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
  x?: number
  y?: number
  center?: boolean
  resizable?: boolean
  minimizable?: boolean
  maximizable?: boolean
  closable?: boolean
  alwaysOnTop?: boolean
  skipTaskbar?: boolean
  modal?: boolean
  parent?: string
  title?: string
  icon?: string
  show?: boolean
  frame?: boolean
  transparent?: boolean
  webPreferences?: {
    nodeIntegration?: boolean
    contextIsolation?: boolean
    enableRemoteModule?: boolean
    preload?: string
  }
}

export interface WindowState {
  id: string
  type: WindowType
  isVisible: boolean
  isMinimized: boolean
  isMaximized: boolean
  isFullScreen: boolean
  bounds: {
    x: number
    y: number
    width: number
    height: number
  }
}

export enum WindowEvent {
  CREATED = 'window:created',
  CLOSED = 'window:closed',
  MINIMIZED = 'window:minimized',
  MAXIMIZED = 'window:maximized',
  RESTORED = 'window:restored',
  MOVED = 'window:moved',
  RESIZED = 'window:resized',
  FOCUS = 'window:focus',
  BLUR = 'window:blur',
}

export interface WindowEventData {
  windowId: string
  type: WindowType
  bounds?: {
    x: number
    y: number
    width: number
    height: number
  }
}

export class WindowError extends Error {
  constructor(
    public windowId: string,
    public operation: string,
    message: string
  ) {
    super(`Window ${windowId} ${operation}: ${message}`)
    this.name = 'WindowError'
  }
}
