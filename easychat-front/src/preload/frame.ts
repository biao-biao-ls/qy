/**
 * 框架预加载脚本
 * 用于框架窗口的预加载
 */

import { contextBridge, ipcRenderer } from 'electron'

// 框架相关 API
const frameAPI = {
  // 窗口控制
  window: {
    minimize: (): void => ipcRenderer.send('frame:minimize'),
    maximize: (): void => ipcRenderer.send('frame:maximize'),
    restore: (): void => ipcRenderer.send('frame:restore'),
    close: (): void => ipcRenderer.send('frame:close'),
    setTitle: (title: string): void => ipcRenderer.send('frame:set-title', title),
  },

  // 标签页控制
  tabs: {
    create: (url: string): void => ipcRenderer.send('frame:tab-create', url),
    close: (tabId: string): void => ipcRenderer.send('frame:tab-close', tabId),
    activate: (tabId: string): void => ipcRenderer.send('frame:tab-activate', tabId),
    move: (tabId: string, newIndex: number): void =>
      ipcRenderer.send('frame:tab-move', tabId, newIndex),
  },

  // 事件监听
  on: {
    tabCreated: (callback: (tabId: string, url: string) => void): (() => void) => {
      const handler = (_: unknown, tabId: string, url: string): void => callback(tabId, url)
      ipcRenderer.on('frame:tab-created', handler)
      return () => ipcRenderer.off('frame:tab-created', handler)
    },
    tabClosed: (callback: (tabId: string) => void): (() => void) => {
      const handler = (_: unknown, tabId: string): void => callback(tabId)
      ipcRenderer.on('frame:tab-closed', handler)
      return () => ipcRenderer.off('frame:tab-closed', handler)
    },
    tabActivated: (callback: (tabId: string) => void): (() => void) => {
      const handler = (_: unknown, tabId: string): void => callback(tabId)
      ipcRenderer.on('frame:tab-activated', handler)
      return () => ipcRenderer.off('frame:tab-activated', handler)
    },
  },
}

// 暴露 API 到渲染进程
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('frameAPI', frameAPI)
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to expose frame API:', error)
  }
} else {
  // @ts-ignore
  window.frameAPI = frameAPI
}