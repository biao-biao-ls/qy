import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { 
  ElectronAPI, 
  IPCChannel, 
  ConfigKey, 
  ConfigValue,
  TabCreateOptions,
  TabUpdateOptions,
  WindowType,
  WindowOptions,
  PushMessage,
  UpdateInfo,
  UpdateProgress
} from '../types'

// 创建类型安全的 IPC 通信接口
const createElectronAPI = (): ElectronAPI => {
  // 窗口操作 API
  const windowAPI = {
    minimize: () => ipcRenderer.invoke(IPCChannel.WINDOW_MINIMIZE),
    maximize: () => ipcRenderer.invoke(IPCChannel.WINDOW_MAXIMIZE),
    restore: () => ipcRenderer.invoke(IPCChannel.WINDOW_RESTORE),
    close: () => ipcRenderer.invoke(IPCChannel.WINDOW_CLOSE),
    setTitle: (title: string) => ipcRenderer.invoke(IPCChannel.WINDOW_SET_TITLE, title),
    create: (type: WindowType, options?: WindowOptions) => 
      ipcRenderer.invoke(IPCChannel.WINDOW_CREATE, { type, options })
  }

  // 标签页操作 API
  const tabsAPI = {
    create: (options: TabCreateOptions) => 
      ipcRenderer.invoke(IPCChannel.TAB_CREATE, options),
    remove: (tabId: string) => 
      ipcRenderer.invoke(IPCChannel.TAB_REMOVE, tabId),
    activate: (tabId: string) => 
      ipcRenderer.invoke(IPCChannel.TAB_ACTIVATE, tabId),
    update: (tabId: string, options: TabUpdateOptions) => 
      ipcRenderer.invoke(IPCChannel.TAB_UPDATE, { tabId, options }),
    getAll: () => 
      ipcRenderer.invoke(IPCChannel.TAB_GET_ALL),
    navigate: (tabId: string, url: string) => 
      ipcRenderer.invoke(IPCChannel.TAB_NAVIGATE, { tabId, url }),
    goBack: (tabId: string) => 
      ipcRenderer.invoke(IPCChannel.TAB_GO_BACK, tabId),
    goForward: (tabId: string) => 
      ipcRenderer.invoke(IPCChannel.TAB_GO_FORWARD, tabId),
    reload: (tabId: string) => 
      ipcRenderer.invoke(IPCChannel.TAB_RELOAD, tabId)
  }

  // 配置管理 API
  const configAPI = {
    get: <K extends ConfigKey>(key: K): Promise<ConfigValue<K>> => 
      ipcRenderer.invoke(IPCChannel.CONFIG_GET, key),
    set: <K extends ConfigKey>(key: K, value: ConfigValue<K>) => 
      ipcRenderer.invoke(IPCChannel.CONFIG_SET, { key, value }),
    getAll: () => 
      ipcRenderer.invoke(IPCChannel.CONFIG_GET_ALL),
    reset: () => 
      ipcRenderer.invoke(IPCChannel.CONFIG_RESET),
    onChange: <K extends ConfigKey>(
      callback: (key: K, value: ConfigValue<K>, oldValue?: ConfigValue<K>) => void
    ) => {
      const listener = (event: any, data: any) => {
        callback(data.key, data.value, data.oldValue)
      }
      ipcRenderer.on(IPCChannel.CONFIG_CHANGED, listener)
      
      // 返回取消监听的函数
      return () => {
        ipcRenderer.removeListener(IPCChannel.CONFIG_CHANGED, listener)
      }
    }
  }

  // 消息推送 API
  const pushAPI = {
    onMessage: (callback: (message: PushMessage) => void) => {
      const listener = (event: any, message: PushMessage) => {
        callback(message)
      }
      ipcRenderer.on(IPCChannel.PUSH_MESSAGE, listener)
      
      // 返回取消监听的函数
      return () => {
        ipcRenderer.removeListener(IPCChannel.PUSH_MESSAGE, listener)
      }
    },
    send: (message: Omit<PushMessage, 'id' | 'timestamp' | 'read'>) => 
      ipcRenderer.invoke(IPCChannel.PUSH_SEND, message),
    connect: () => 
      ipcRenderer.invoke(IPCChannel.PUSH_CONNECT),
    disconnect: () => 
      ipcRenderer.invoke(IPCChannel.PUSH_DISCONNECT),
    getStatus: () => 
      ipcRenderer.invoke(IPCChannel.PUSH_STATUS)
  }

  // 应用控制 API
  const appAPI = {
    quit: () => 
      ipcRenderer.invoke(IPCChannel.APP_QUIT),
    restart: () => 
      ipcRenderer.invoke(IPCChannel.APP_RESTART),
    getInfo: () => 
      ipcRenderer.invoke(IPCChannel.APP_GET_INFO),
    getVersion: () => 
      ipcRenderer.invoke(IPCChannel.APP_GET_VERSION)
  }

  // 更新管理 API
  const updateAPI = {
    check: () => 
      ipcRenderer.invoke(IPCChannel.UPDATE_CHECK),
    download: () => 
      ipcRenderer.invoke(IPCChannel.UPDATE_DOWNLOAD),
    install: () => 
      ipcRenderer.invoke(IPCChannel.UPDATE_INSTALL),
    onProgress: (callback: (progress: UpdateProgress) => void) => {
      const listener = (event: any, progress: UpdateProgress) => {
        callback(progress)
      }
      ipcRenderer.on(IPCChannel.UPDATE_PROGRESS, listener)
      
      return () => {
        ipcRenderer.removeListener(IPCChannel.UPDATE_PROGRESS, listener)
      }
    },
    onAvailable: (callback: (info: UpdateInfo) => void) => {
      const listener = (event: any, info: UpdateInfo) => {
        callback(info)
      }
      ipcRenderer.on(IPCChannel.UPDATE_AVAILABLE, listener)
      
      return () => {
        ipcRenderer.removeListener(IPCChannel.UPDATE_AVAILABLE, listener)
      }
    },
    onDownloaded: (callback: () => void) => {
      const listener = () => {
        callback()
      }
      ipcRenderer.on(IPCChannel.UPDATE_DOWNLOADED, listener)
      
      return () => {
        ipcRenderer.removeListener(IPCChannel.UPDATE_DOWNLOADED, listener)
      }
    }
  }

  return {
    window: windowAPI,
    tabs: tabsAPI,
    config: configAPI,
    push: pushAPI,
    app: appAPI,
    update: updateAPI
  }
}

// 创建 API 实例
const api = createElectronAPI()

// 错误处理包装器
const withErrorHandling = <T extends (...args: any[]) => any>(fn: T): T => {
  return ((...args: any[]) => {
    try {
      const result = fn(...args)
      if (result instanceof Promise) {
        return result.catch((error: Error) => {
          console.error('IPC Error:', error)
          throw error
        })
      }
      return result
    } catch (error) {
      console.error('IPC Error:', error)
      throw error
    }
  }) as T
}

// 包装所有 API 方法以添加错误处理
const wrappedAPI: ElectronAPI = {
  window: {
    minimize: withErrorHandling(api.window.minimize),
    maximize: withErrorHandling(api.window.maximize),
    restore: withErrorHandling(api.window.restore),
    close: withErrorHandling(api.window.close),
    setTitle: withErrorHandling(api.window.setTitle),
    create: withErrorHandling(api.window.create)
  },
  tabs: {
    create: withErrorHandling(api.tabs.create),
    remove: withErrorHandling(api.tabs.remove),
    activate: withErrorHandling(api.tabs.activate),
    update: withErrorHandling(api.tabs.update),
    getAll: withErrorHandling(api.tabs.getAll),
    navigate: withErrorHandling(api.tabs.navigate),
    goBack: withErrorHandling(api.tabs.goBack),
    goForward: withErrorHandling(api.tabs.goForward),
    reload: withErrorHandling(api.tabs.reload)
  },
  config: {
    get: withErrorHandling(api.config.get),
    set: withErrorHandling(api.config.set),
    getAll: withErrorHandling(api.config.getAll),
    reset: withErrorHandling(api.config.reset),
    onChange: api.config.onChange // 事件监听器不需要包装
  },
  push: {
    onMessage: api.push.onMessage, // 事件监听器不需要包装
    send: withErrorHandling(api.push.send),
    connect: withErrorHandling(api.push.connect),
    disconnect: withErrorHandling(api.push.disconnect),
    getStatus: withErrorHandling(api.push.getStatus)
  },
  app: {
    quit: withErrorHandling(api.app.quit),
    restart: withErrorHandling(api.app.restart),
    getInfo: withErrorHandling(api.app.getInfo),
    getVersion: withErrorHandling(api.app.getVersion)
  },
  update: {
    check: withErrorHandling(api.update.check),
    download: withErrorHandling(api.update.download),
    install: withErrorHandling(api.update.install),
    onProgress: api.update.onProgress, // 事件监听器不需要包装
    onAvailable: api.update.onAvailable, // 事件监听器不需要包装
    onDownloaded: api.update.onDownloaded // 事件监听器不需要包装
  }
}

// 暴露 API 到渲染进程
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('electronAPI', wrappedAPI)
  } catch (error) {
    console.error('Failed to expose APIs:', error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.electronAPI = wrappedAPI
}
