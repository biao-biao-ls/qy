/**
 * Electron API Hook
 * 提供类型安全的 Electron API 访问
 */
import { useCallback, useEffect, useRef } from 'react'

export interface ElectronAPI {
  // 窗口操作
  window: {
    minimize(): void
    maximize(): void
    close(): void
    setTitle(title: string): void
    isMaximized(): Promise<boolean>
  }
  
  // 标签页操作
  tabs: {
    create(options: any): Promise<any>
    remove(tabId: string): Promise<void>
    switch(tabId: string): Promise<void>
    getAll(): Promise<any[]>
  }
  
  // 配置操作
  config: {
    get<T>(key: string): Promise<T>
    set<T>(key: string, value: T): Promise<void>
    onChange(callback: (key: string, value: any) => void): void
  }
  
  // IPC 通信
  ipc: {
    send(channel: string, ...args: any[]): void
    invoke(channel: string, ...args: any[]): Promise<any>
    on(channel: string, callback: (...args: any[]) => void): () => void
    removeAllListeners(channel: string): void
  }
}

/**
 * 使用 Electron API 的 Hook
 */
export const useElectronAPI = (): ElectronAPI => {
  const electronAPI = useRef<ElectronAPI | null>(null)

  if (!electronAPI.current) {
    // 获取 Electron API
    const api = (window as any).electron || (window as any).electronAPI
    
    if (!api) {
      throw new Error('Electron API not available')
    }

    electronAPI.current = {
      window: {
        minimize: () => api.ipcRenderer.send('window-minimize'),
        maximize: () => api.ipcRenderer.send('window-maximize'),
        close: () => api.ipcRenderer.send('window-close'),
        setTitle: (title: string) => api.ipcRenderer.send('window-set-title', title),
        isMaximized: () => api.ipcRenderer.invoke('window-is-maximized')
      },
      
      tabs: {
        create: (options: any) => api.ipcRenderer.invoke('tab-create', options),
        remove: (tabId: string) => api.ipcRenderer.invoke('tab-remove', tabId),
        switch: (tabId: string) => api.ipcRenderer.invoke('tab-switch', tabId),
        getAll: () => api.ipcRenderer.invoke('tab-get-all')
      },
      
      config: {
        get: <T>(key: string) => api.ipcRenderer.invoke('config-get', key) as Promise<T>,
        set: <T>(key: string, value: T) => api.ipcRenderer.invoke('config-set', key, value),
        onChange: (callback: (key: string, value: any) => void) => {
          api.ipcRenderer.on('config-changed', (_event: any, key: string, value: any) => {
            callback(key, value)
          })
        }
      },
      
      ipc: {
        send: (channel: string, ...args: any[]) => api.ipcRenderer.send(channel, ...args),
        invoke: (channel: string, ...args: any[]) => api.ipcRenderer.invoke(channel, ...args),
        on: (channel: string, callback: (...args: any[]) => void) => {
          api.ipcRenderer.on(channel, callback)
          return () => api.ipcRenderer.removeAllListeners(channel)
        },
        removeAllListeners: (channel: string) => {
          api.ipcRenderer.removeAllListeners(channel)
        }
      }
    }
  }

  return electronAPI.current
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
    electronAPI.ipc.send(channel, ...args)
  }, [electronAPI])

  const invoke = useCallback((channel: string, ...args: any[]) => {
    return electronAPI.ipc.invoke(channel, ...args)
  }, [electronAPI])

  const on = useCallback((channel: string, callback: (...args: any[]) => void) => {
    electronAPI.ipc.on(channel, callback)
    
    // 返回清理函数
    return () => {
      electronAPI.ipc.removeAllListeners(channel)
    }
  }, [electronAPI])

  return {
    send,
    invoke,
    on
  }
}