/**
 * Electron API Hook
 * 提供类型安全的 Electron API 访问
 */
import { useCallback } from 'react'

// 简化的 ElectronAPI 接口，兼容现有代码
interface SimpleElectronAPI {
  window: {
    minimize(): void
    maximize(): void
    close(): void
    setTitle(title: string): void
    isMaximized(): Promise<boolean>
  }
  
  tabs: {
    create(options: any): Promise<any>
    remove(tabId: string): Promise<void>
    switch(tabId: string): Promise<void>
    getAll(): Promise<any[]>
  }
  
  config: {
    get<T>(key: string): Promise<T>
    set<T>(key: string, value: T): Promise<void>
    onChange(callback: (key: string, value: any) => void): void
  }
  
  ipc: {
    send(channel: string, ...args: any[]): void
    invoke(channel: string, ...args: any[]): Promise<any>
    on(channel: string, callback: (...args: any[]) => void): () => void
    removeAllListeners(channel: string): void
  }

  dev?: {
    toggleDevTools(): Promise<{ success: boolean; action: 'opened' | 'closed' }>
    openDevTools(): Promise<{ success: boolean }>
    closeDevTools(): Promise<{ success: boolean }>
    isDevToolsOpened(): Promise<{ isOpened: boolean }>
  }
}

/**
 * 使用 Electron API 的 Hook
 */
export const useElectronAPI = (): SimpleElectronAPI => {
  // 直接返回 window.electronAPI，它已经在预加载脚本中正确设置了
  const api = (window as any).electronAPI as SimpleElectronAPI
  
  if (!api) {
    throw new Error('Electron API not available')
  }

  return api
}

/**
 * 窗口控制 Hook
 */
export const useWindowControls = () => {
  const electronAPI = useElectronAPI()

  const minimize = useCallback(() => {
    electronAPI.window.minimize()
  }, [electronAPI])

  const maximize = useCallback(() => {
    electronAPI.window.maximize()
  }, [electronAPI])

  const close = useCallback(() => {
    electronAPI.window.close()
  }, [electronAPI])

  const setTitle = useCallback((title: string) => {
    electronAPI.window.setTitle(title)
  }, [electronAPI])

  return {
    minimize,
    maximize,
    close,
    setTitle
  }
}

/**
 * IPC 通信 Hook
 */
export const useIPC = () => {
  const electronAPI = useElectronAPI()

  const send = useCallback((channel: string, ...args: any[]) => {
    electronAPI.ipc?.send(channel, ...args)
  }, [electronAPI])

  const invoke = useCallback((channel: string, ...args: any[]) => {
    return electronAPI.ipc?.invoke(channel, ...args)
  }, [electronAPI])

  const on = useCallback((channel: string, callback: (...args: any[]) => void) => {
    return electronAPI.ipc?.on(channel, callback) || (() => {})
  }, [electronAPI])

  return {
    send,
    invoke,
    on
  }
}