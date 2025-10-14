/**
 * 浏览器预加载脚本
 * 用于浏览器视图的预加载
 */

import { contextBridge, ipcRenderer } from 'electron'

// 浏览器相关 API
const browserAPI = {
  // 导航控制
  navigation: {
    goBack: (): void => ipcRenderer.send('browser:go-back'),
    goForward: (): void => ipcRenderer.send('browser:go-forward'),
    reload: (): void => ipcRenderer.send('browser:reload'),
    stop: (): void => ipcRenderer.send('browser:stop'),
  },

  // 页面信息
  page: {
    getTitle: (): Promise<string> => ipcRenderer.invoke('browser:get-title'),
    getUrl: (): Promise<string> => ipcRenderer.invoke('browser:get-url'),
    getFavicon: (): Promise<string> => ipcRenderer.invoke('browser:get-favicon'),
  },

  // 事件监听
  on: {
    titleChanged: (callback: (title: string) => void): (() => void) => {
      const handler = (_: unknown, title: string): void => callback(title)
      ipcRenderer.on('browser:title-changed', handler)
      return () => ipcRenderer.off('browser:title-changed', handler)
    },
    urlChanged: (callback: (url: string) => void): (() => void) => {
      const handler = (_: unknown, url: string): void => callback(url)
      ipcRenderer.on('browser:url-changed', handler)
      return () => ipcRenderer.off('browser:url-changed', handler)
    },
    loadingChanged: (callback: (isLoading: boolean) => void): (() => void) => {
      const handler = (_: unknown, isLoading: boolean): void => callback(isLoading)
      ipcRenderer.on('browser:loading-changed', handler)
      return () => ipcRenderer.off('browser:loading-changed', handler)
    },
  },
}

// 暴露 API 到渲染进程
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('browserAPI', browserAPI)
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to expose browser API:', error)
  }
} else {
  // @ts-ignore: browserAPI is defined in the preload context
  window.browserAPI = browserAPI
}
