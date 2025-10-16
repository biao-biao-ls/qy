/**
 * 框架预加载脚本
 * 用于框架窗口的预加载，整合原始项目的框架功能
 */

import { contextBridge, ipcRenderer } from 'electron'

// 键盘事件解析
const parseKey = (evt: KeyboardEvent): string => {
  let keyStr = ''
  if (evt.ctrlKey) keyStr += 'ctrl+'
  if (evt.shiftKey) keyStr += 'shift+'
  if (evt.altKey) keyStr += 'alt+'

  if (['Control', 'Alt', 'Shift'].includes(evt.key)) {
    return keyStr.substring(0, keyStr.length - 1)
  }
  return keyStr + evt.key
}

// 错误处理函数
const handleError = (error: Error, context: string): void => {
  console.error(`[Frame Preload] ${context}:`, error)
  ipcRenderer.send('frame:log-error', {
    context,
    message: error.message,
    stack: error.stack,
    url: window.location.href,
    timestamp: Date.now(),
  })
}

// 日志处理函数
const handleLog = (href: string, message: any, logType: string, ...params: any[]): void => {
  try {
    if (window.parent && (window.parent as any).__assitEventHandle__) {
      ;(window.parent as any).__assitEventHandle__.handleLog(href, message, logType, params)
    }
  } catch (error) {
    console.error('Failed to send log to parent:', error)
  }
}

// 框架窗口控制 API
const windowAPI = {
  minimize: (): void => ipcRenderer.send('frame:minimize'),
  maximize: (): void => ipcRenderer.send('frame:maximize'),
  restore: (): void => ipcRenderer.send('frame:restore'),
  close: (): void => ipcRenderer.send('frame:close'),
  setTitle: (title: string): void => ipcRenderer.send('frame:set-title', title),
}

// 标签页控制 API
const tabsAPI = {
  create: (url: string): void => ipcRenderer.send('frame:tab-create', url),
  close: (tabId: string): void => ipcRenderer.send('frame:tab-close', tabId),
  activate: (tabId: string): void => ipcRenderer.send('frame:tab-activate', tabId),
  move: (tabId: string, newIndex: number): void =>
    ipcRenderer.send('frame:tab-move', tabId, newIndex),
}

// 事件处理 API
const eventHandleAPI = {
  handleContextMenu: (
    topUrl: string,
    frameUrl: string,
    anchorUrl: string,
    selectionStr: string
  ): void => {
    if (window.parent && (window.parent as any).__assitEventHandle__) {
      ;(window.parent as any).__assitEventHandle__.handleContextMenu(
        topUrl,
        frameUrl,
        anchorUrl,
        selectionStr
      )
    }
  },

  handleKeydown: (keyStr: string): void => {
    if (window.parent && (window.parent as any).__assitEventHandle__) {
      ;(window.parent as any).__assitEventHandle__.handleKeydown(keyStr)
    }
  },

  handleZoomIn: (zoomIn: boolean): void => {
    if (window.parent && (window.parent as any).__assitEventHandle__) {
      ;(window.parent as any).__assitEventHandle__.handleZoomIn(zoomIn)
    }
  },

  handleCtrlDown: (keyDown: boolean): void => {
    if (window.parent && (window.parent as any).__assitEventHandle__) {
      ;(window.parent as any).__assitEventHandle__.handleCtrlDown(keyDown)
    }
  },

  handlePageFailed: (): void => {
    if (window.parent && (window.parent as any).__assitEventHandle__) {
      ;(window.parent as any).__assitEventHandle__.handlePageFailed()
    }
  },

  handleLog,

  onMainMsg: (listener: (event: any, ...args: any[]) => void): void => {
    if (window.parent && (window.parent as any).__assitEventHandle__) {
      ;(window.parent as any).__assitEventHandle__.onMainMsg(listener)
    }
  },
}

// 事件监听 API
const eventAPI = {
  onTabCreated: (callback: (tabId: string, url: string) => void): (() => void) => {
    const handler = (_: any, tabId: string, url: string): void => callback(tabId, url)
    ipcRenderer.on('frame:tab-created', handler)
    return () => ipcRenderer.removeListener('frame:tab-created', handler)
  },

  onTabClosed: (callback: (tabId: string) => void): (() => void) => {
    const handler = (_: any, tabId: string): void => callback(tabId)
    ipcRenderer.on('frame:tab-closed', handler)
    return () => ipcRenderer.removeListener('frame:tab-closed', handler)
  },

  onTabActivated: (callback: (tabId: string) => void): (() => void) => {
    const handler = (_: any, tabId: string): void => callback(tabId)
    ipcRenderer.on('frame:tab-activated', handler)
    return () => ipcRenderer.removeListener('frame:tab-activated', handler)
  },
}

// 整合的框架 API
const frameAPI = {
  window: windowAPI,
  tabs: tabsAPI,
  events: eventAPI,
  eventHandle: eventHandleAPI,
}

// 尝试从父窗口继承 API
const inheritFromParent = (): void => {
  try {
    if (!(window as any).appClient && window.parent && (window.parent as any).appClient) {
      ;(window as any).appClient = (window.parent as any).appClient
    }

    if (
      !(window as any).JLC_PC_Assit_Client_Information &&
      window.parent &&
      (window.parent as any).JLC_PC_Assit_Client_Information
    ) {
      ;(window as any).JLC_PC_Assit_Client_Information = (
        window.parent as any
      ).JLC_PC_Assit_Client_Information
    }

    if (
      !(window as any).__assitEventHandle__ &&
      window.parent &&
      (window.parent as any).__assitEventHandle__
    ) {
      ;(window as any).__assitEventHandle__ = (window.parent as any).__assitEventHandle__
    }
  } catch (error) {
    console.warn('Failed to inherit APIs from parent:', error)
  }
}

// 设置事件监听器
const setupEventListeners = (): void => {
  // 右键菜单事件
  window.addEventListener('contextmenu', e => {
    try {
      const isCanvas = (e.composedPath() || []).some((item: any) => {
        return item.nodeName === 'CANVAS'
      })

      if (isCanvas) return

      const topUrl = window.parent?.location?.href || ''
      let anchorUrl = ''

      // 查找链接元素
      for (const element of e.composedPath() as Element[]) {
        if (element.nodeName === 'A') {
          anchorUrl = (element as HTMLAnchorElement).href
          break
        }
      }

      const selectionStr = window.getSelection()?.toString() || ''

      eventHandleAPI.handleContextMenu(topUrl, window.location.href, anchorUrl, selectionStr)
    } catch (error) {
      handleError(error as Error, 'Context Menu')
    }
  })

  // 键盘事件
  window.addEventListener('keydown', evt => {
    try {
      if (evt.ctrlKey) {
        eventHandleAPI.handleCtrlDown(true)
      }

      const keyStr = parseKey(evt)
      eventHandleAPI.handleKeydown(keyStr)
    } catch (error) {
      handleError(error as Error, 'Keydown')
    }
  })

  window.addEventListener('keyup', evt => {
    try {
      if (!evt.ctrlKey) {
        eventHandleAPI.handleCtrlDown(false)
      }
    } catch (error) {
      handleError(error as Error, 'Keyup')
    }
  })

  // 鼠标滚轮事件
  window.addEventListener('wheel', event => {
    try {
      if (event.deltaY > 0) {
        eventHandleAPI.handleZoomIn(false) // 缩小
      } else {
        eventHandleAPI.handleZoomIn(true) // 放大
      }
    } catch (error) {
      handleError(error as Error, 'Wheel')
    }
  })
}

// 页面错误检测
const checkPageError = (): void => {
  if (window.location.href.startsWith('chrome-error')) {
    console.log('[Frame Preload] Page error detected:', window.location.href)
    eventHandleAPI.handlePageFailed()
  }
}

// 初始化
const initialize = (): void => {
  inheritFromParent()
  setupEventListeners()

  // 定期检查页面错误
  setInterval(checkPageError, 30000)

  // 监听主进程消息
  if (window.parent && (window.parent as any).__assitEventHandle__) {
    eventHandleAPI.onMainMsg((event, msg) => {
      try {
        // 处理粘贴消息
        if (msg.msgId === 'paste') {
          const active = document.activeElement
          if (active instanceof HTMLInputElement) {
            const lastValue = active.value
            active.value = msg.data

            const inputEvent = new Event('input', { bubbles: true })
            // React 兼容性处理
            ;(inputEvent as any).simulated = true

            const tracker = (active as any)._valueTracker
            if (tracker) {
              tracker.setValue(lastValue)
            }

            active.dispatchEvent(inputEvent)
          }
        }
      } catch (error) {
        handleError(error as Error, 'Main Message')
      }
    })
  }
}

// 暴露 API 到渲染进程
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('frameAPI', frameAPI)
    contextBridge.exposeInMainWorld('__assitEventHandle__', eventHandleAPI)
  } catch (error) {
    console.error('Failed to expose frame APIs:', error)
  }
} else {
  // @ts-ignore: 非隔离模式下的全局变量
  window.frameAPI = frameAPI
  // @ts-ignore
  window.__assitEventHandle__ = eventHandleAPI
}

// 初始化框架预加载脚本
try {
  initialize()
} catch (error) {
  handleError(error as Error, 'Initialization')
}
