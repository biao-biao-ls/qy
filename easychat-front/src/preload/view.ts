/**
 * 视图预加载脚本
 * 用于 BrowserView 的预加载
 */

import { contextBridge, ipcRenderer } from 'electron'

// 视图相关 API
const viewAPI = {
  // 视图信息
  info: {
    getId: (): Promise<string> => ipcRenderer.invoke('view:get-id'),
    getUrl: (): Promise<string> => ipcRenderer.invoke('view:get-url'),
    getTitle: (): Promise<string> => ipcRenderer.invoke('view:get-title'),
  },

  // 视图控制
  control: {
    focus: (): void => ipcRenderer.send('view:focus'),
    blur: (): void => ipcRenderer.send('view:blur'),
    reload: (): void => ipcRenderer.send('view:reload'),
    stop: (): void => ipcRenderer.send('view:stop'),
  },

  // 导航
  navigation: {
    loadURL: (url: string): void => ipcRenderer.send('view:load-url', url),
    goBack: (): void => ipcRenderer.send('view:go-back'),
    goForward: (): void => ipcRenderer.send('view:go-forward'),
    canGoBack: (): Promise<boolean> => ipcRenderer.invoke('view:can-go-back'),
    canGoForward: (): Promise<boolean> => ipcRenderer.invoke('view:can-go-forward'),
  },

  // 事件监听
  on: {
    loadStart: (callback: () => void): (() => void) => {
      const handler = (): void => callback()
      ipcRenderer.on('view:load-start', handler)
      return () => ipcRenderer.off('view:load-start', handler)
    },
    loadStop: (callback: () => void): (() => void) => {
      const handler = (): void => callback()
      ipcRenderer.on('view:load-stop', handler)
      return () => ipcRenderer.off('view:load-stop', handler)
    },
    titleUpdated: (callback: (title: string) => void): (() => void) => {
      const handler = (_: unknown, title: string): void => callback(title)
      ipcRenderer.on('view:title-updated', handler)
      return () => ipcRenderer.off('view:title-updated', handler)
    },
    urlUpdated: (callback: (url: string) => void): (() => void) => {
      const handler = (_: unknown, url: string): void => callback(url)
      ipcRenderer.on('view:url-updated', handler)
      return () => ipcRenderer.off('view:url-updated', handler)
    },
  },
}

// 暴露 API 到渲染进程
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('viewAPI', viewAPI)
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to expose view API:', error)
  }
} else {
  // @ts-ignore
  window.viewAPI = viewAPI
}