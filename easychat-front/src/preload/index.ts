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
    removeAllListeners: (channel: string) => ipcRenderer.removeAllListeners(channel),
  },
  process: {
    versions: process.versions,
    platform: process.platform,
    arch: process.arch,
  },
}

// 创建简化的 API 接口
const api = {
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    setTitle: (title: string) => ipcRenderer.invoke('window:setTitle', title),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  },
  tabs: {
    create: (options: any) => ipcRenderer.invoke('tab:create', options),
    remove: (tabId: string) => ipcRenderer.invoke('tab:close', tabId),
    switch: (tabId: string) => ipcRenderer.invoke('tab:switch', tabId),
    getAll: () => ipcRenderer.invoke('tab:getAll'),
  },
  config: {
    get: (key: string) => ipcRenderer.invoke('app:getConfig', key),
    set: (key: string, value: any) => ipcRenderer.invoke('setting:updateConfig', key, value),
    onChange: (callback: (key: string, value: any) => void) => {
      ipcRenderer.on('config-changed', (_, key: string, value: any) => {
        callback(key, value)
      })
    },
  },
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    getInfo: () => ipcRenderer.invoke('app:getInfo'),
  },
  push: {
    start: () => ipcRenderer.invoke('push:start'),
    stop: () => ipcRenderer.invoke('push:stop'),
    getStatus: () => ipcRenderer.invoke('push:getStatus'),
    setUserId: (userId: string) => ipcRenderer.invoke('push:setUserId', userId),
    showNotification: (message: any) => ipcRenderer.invoke('push:showNotification', message),
    getRecentMessages: (limit?: number) => ipcRenderer.invoke('push:getRecentMessages', limit),
    clearNotifications: () => ipcRenderer.invoke('push:clearNotifications'),
    clearMessages: () => ipcRenderer.invoke('push:clearMessages'),
    onNotificationShown: (callback: (data: any) => void) => {
      ipcRenderer.on('push:notification-shown', (_, data) => callback(data))
      return () => ipcRenderer.removeAllListeners('push:notification-shown')
    },
    onNotificationClicked: (callback: (data: any) => void) => {
      ipcRenderer.on('push:notification-clicked', (_, data) => callback(data))
      return () => ipcRenderer.removeAllListeners('push:notification-clicked')
    },
    onConnectionStateChanged: (callback: (state: any) => void) => {
      ipcRenderer.on('push:connection-state-changed', (_, state) => callback(state))
      return () => ipcRenderer.removeAllListeners('push:connection-state-changed')
    },
  },
  dev: {
    toggleDevTools: () => ipcRenderer.invoke('dev:toggleDevTools'),
    openDevTools: () => ipcRenderer.invoke('dev:openDevTools'),
    closeDevTools: () => ipcRenderer.invoke('dev:closeDevTools'),
    isDevToolsOpened: () => ipcRenderer.invoke('dev:isDevToolsOpened'),
  },
  update: {
    check: () => ipcRenderer.invoke('update:check'),
    download: () => ipcRenderer.invoke('update:download'),
    install: () => ipcRenderer.invoke('update:install'),
    getVersion: () => ipcRenderer.invoke('update:get-version'),
    checkCustom: () => ipcRenderer.invoke('update:check-custom'),
    onChecking: (callback: () => void) => {
      ipcRenderer.on('update:checking', callback)
      return () => ipcRenderer.removeAllListeners('update:checking')
    },
    onAvailable: (callback: (info: any) => void) => {
      ipcRenderer.on('update:available', (_, info) => callback(info))
      return () => ipcRenderer.removeAllListeners('update:available')
    },
    onNotAvailable: (callback: () => void) => {
      ipcRenderer.on('update:not-available', callback)
      return () => ipcRenderer.removeAllListeners('update:not-available')
    },
    onError: (callback: (error: string) => void) => {
      ipcRenderer.on('update:error', (_, error) => callback(error))
      return () => ipcRenderer.removeAllListeners('update:error')
    },
    onDownloadProgress: (callback: (progress: any) => void) => {
      ipcRenderer.on('update:download-progress', (_, progress) => callback(progress))
      return () => ipcRenderer.removeAllListeners('update:download-progress')
    },
    onDownloaded: (callback: () => void) => {
      ipcRenderer.on('update:downloaded', callback)
      return () => ipcRenderer.removeAllListeners('update:downloaded')
    },
  },
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke('shell:open-external', url),
  },
  ipc: {
    send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
    invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
    on: (channel: string, callback: (...args: any[]) => void) => {
      ipcRenderer.on(channel, callback)
      return () => ipcRenderer.removeAllListeners(channel)
    },
    removeAllListeners: (channel: string) => ipcRenderer.removeAllListeners(channel),
  },
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
