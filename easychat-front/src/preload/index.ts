import { contextBridge, ipcRenderer } from 'electron'

// 基础的 Electron API
const electronAPI = {
  ipcRenderer: {
    send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
    invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
    on: (channel: string, listener: (...args: any[]) => void) => {
      ipcRenderer.on(channel, listener)
      return () => ipcRenderer.removeListener(channel, listener)
    },
    removeAllListeners: (channel: string) => ipcRenderer.removeAllListeners(channel)
  },
  process: {
    versions: process.versions,
    platform: process.platform,
    arch: process.arch
  }
}

// 创建简化的 API 接口
const api = {
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    setTitle: (title: string) => ipcRenderer.invoke('window:setTitle', title),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized')
  },
  tabs: {
    create: (options: any) => ipcRenderer.invoke('tab:create', options),
    remove: (tabId: string) => ipcRenderer.invoke('tab:close', tabId),
    switch: (tabId: string) => ipcRenderer.invoke('tab:switch', tabId),
    getAll: () => ipcRenderer.invoke('tab:getAll')
  },
  config: {
    get: (key: string) => ipcRenderer.invoke('app:getConfig', key),
    set: (key: string, value: any) => ipcRenderer.invoke('setting:updateConfig', key, value),
    onChange: (callback: (key: string, value: any) => void) => {
      ipcRenderer.on('config-changed', (_, key: string, value: any) => {
        callback(key, value)
      })
    }
  },
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    getInfo: () => ipcRenderer.invoke('app:getInfo')
  },
  ipc: {
    send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
    invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
    on: (channel: string, callback: (...args: any[]) => void) => {
      ipcRenderer.on(channel, callback)
      return () => ipcRenderer.removeAllListeners(channel)
    },
    removeAllListeners: (channel: string) => ipcRenderer.removeAllListeners(channel)
  }
}

// 暴露 API 到渲染进程
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('electronAPI', api)
  } catch (error) {
    console.error('Failed to expose APIs:', error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.electronAPI = api
}
