/**
 * 浏览器预加载脚本
 * 用于浏览器视图的预加载，整合原始项目的浏览器功能
 */

import { contextBridge, ipcRenderer, webFrame } from 'electron'

// 应用版本信息
const APP_VERSION = '1.0.0' // 从配置中获取

// 错误处理函数
const handleError = (error: Error, context: string): void => {
  console.error(`[Browser Preload] ${context}:`, error)
  // 发送错误到主进程进行日志记录
  ipcRenderer.send('browser:log-error', {
    context,
    message: error.message,
    stack: error.stack,
    url: window.location.href,
    timestamp: Date.now()
  })
}

// 设备信息获取
const getDeviceInfo = (securityCode = ''): Promise<any> => {
  return ipcRenderer.invoke('browser:get-device-info', securityCode)
}

// 客户端信息 API
const clientAPI = {
  // 版本信息
  getVersion: (): string => APP_VERSION,
  getClientVersion: (): string => APP_VERSION,
  
  // 设备信息
  getDeviceInfo,
  getDeviceInfoEx: (securityCode: string): Promise<any> => 
    ipcRenderer.invoke('browser:get-device-info-ex', securityCode),
  
  // 组件版本
  getComponentVersion: () => ({
    gerber: '1.4.2',
    smtEditor: '1.1.3',
  }),
  
  // 页面操作
  openNewTab: (url: string, mode: 0 | 1 = 0): void => {
    ipcRenderer.send('browser:open-new-tab', { url, mode })
  },
  
  // 文件操作
  showGerberFileList: (args?: any): void => {
    ipcRenderer.send('browser:show-gerber-list', args)
  },
  
  orderPcb: (args: string): void => {
    ipcRenderer.send('browser:order-pcb', args)
  },
  
  // 通用消息发送
  sendMsgToMain: (message: string, ...args: any[]): void => {
    ipcRenderer.send(message, ...args)
  },
  
  // 关闭当前视图
  closeBvView: (): void => {
    ipcRenderer.send('browser:close-view', window.location.href)
  }
}

// 事件处理 API
const eventHandleAPI = {
  // 右键菜单处理
  handleContextMenu: (topUrl: string, frameUrl: string, anchorUrl: string, selectionStr: string): void => {
    ipcRenderer.send('browser:context-menu', { topUrl, frameUrl, anchorUrl, selectionStr })
  },
  
  // 键盘事件处理
  handleKeydown: (keyStr: string): void => {
    if (['F5', 'F12'].includes(keyStr)) {
      ipcRenderer.send('browser:keydown', keyStr)
    }
  },
  
  // 缩放处理
  handleZoomIn: (zoomIn: boolean): void => {
    ipcRenderer.send('browser:zoom', zoomIn)
  },
  
  // Ctrl 键处理
  handleCtrlDown: (keyDown: boolean): void => {
    ipcRenderer.send('browser:ctrl-key', keyDown)
  },
  
  // 页面加载失败处理
  handlePageFailed: (): void => {
    ipcRenderer.send('browser:page-failed')
  },
  
  // 日志处理
  handleLog: (href: string, message: any, logType: string, ...params: any[]): void => {
    try {
      ipcRenderer.send('browser:log', {
        href,
        message,
        logType,
        params: JSON.stringify(params),
        timestamp: Date.now()
      })
    } catch (error) {
      console.error('Failed to send log:', error)
    }
  },
  
  // 弹窗处理
  electronAlert: (message: string): void => {
    ipcRenderer.send('browser:alert', message)
  }
}

// 浏览器导航 API
const navigationAPI = {
  goBack: (): void => ipcRenderer.send('browser:go-back'),
  goForward: (): void => ipcRenderer.send('browser:go-forward'),
  reload: (): void => ipcRenderer.send('browser:reload'),
  stop: (): void => ipcRenderer.send('browser:stop'),
  
  // 页面信息
  getTitle: (): Promise<string> => ipcRenderer.invoke('browser:get-title'),
  getUrl: (): Promise<string> => ipcRenderer.invoke('browser:get-url'),
  getFavicon: (): Promise<string> => ipcRenderer.invoke('browser:get-favicon'),
}

// 事件监听 API
const eventAPI = {
  onTitleChanged: (callback: (title: string) => void): (() => void) => {
    const handler = (_: any, title: string): void => callback(title)
    ipcRenderer.on('browser:title-changed', handler)
    return () => ipcRenderer.removeListener('browser:title-changed', handler)
  },
  
  onUrlChanged: (callback: (url: string) => void): (() => void) => {
    const handler = (_: any, url: string): void => callback(url)
    ipcRenderer.on('browser:url-changed', handler)
    return () => ipcRenderer.removeListener('browser:url-changed', handler)
  },
  
  onLoadingChanged: (callback: (isLoading: boolean) => void): (() => void) => {
    const handler = (_: any, isLoading: boolean): void => callback(isLoading)
    ipcRenderer.on('browser:loading-changed', handler)
    return () => ipcRenderer.removeListener('browser:loading-changed', handler)
  }
}

// 整合的浏览器 API
const browserAPI = {
  client: clientAPI,
  navigation: navigationAPI,
  events: eventAPI,
  eventHandle: eventHandleAPI
}

// 设置全局错误处理
window.addEventListener('error', (event) => {
  handleError(event.error || new Error(event.message), 'Global Error')
})

window.addEventListener('unhandledrejection', (event) => {
  handleError(new Error(event.reason), 'Unhandled Promise Rejection')
})

// 监听 IPC 消息执行 JavaScript
ipcRenderer.on('browser:execute-js', (event, code: string) => {
  try {
    webFrame.executeJavaScript(code)
  } catch (error) {
    handleError(error as Error, 'Execute JavaScript')
  }
})

// 页面错误检测
const checkPageError = (): void => {
  if (window.location.href.startsWith('chrome-error')) {
    console.log('[Browser Preload] Page error detected:', window.location.href)
    eventHandleAPI.handlePageFailed()
  }
}

// 定期检查页面错误
setInterval(checkPageError, 30000)

// 重写 window.close 方法
const originalClose = window.close
window.close = () => {
  clientAPI.closeBvView()
  originalClose.call(window)
}

// 暴露 API 到渲染进程
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('browserAPI', browserAPI)
    contextBridge.exposeInMainWorld('appClient', clientAPI)
    contextBridge.exposeInMainWorld('__assitEventHandle__', eventHandleAPI)
    
    // 兼容原始项目的客户端信息
    contextBridge.exposeInMainWorld('JLC_PC_Assit_Client_Information', {
      Client_Version: APP_VERSION,
      Gerber_Version: '1.4.2',
      SmtEditor_Version: '1.1.3',
    })
  } catch (error) {
    console.error('Failed to expose browser APIs:', error)
  }
} else {
  // @ts-ignore: 非隔离模式下的全局变量
  window.browserAPI = browserAPI
  // @ts-ignore
  window.appClient = clientAPI
  // @ts-ignore
  window.__assitEventHandle__ = eventHandleAPI
  // @ts-ignore
  window.JLC_PC_Assit_Client_Information = {
    Client_Version: APP_VERSION,
    Gerber_Version: '1.4.2',
    SmtEditor_Version: '1.1.3',
  }
}
