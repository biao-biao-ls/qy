/**
 * 视图预加载脚本
 * 用于 BrowserView 的预加载，整合原始项目的视图功能
 */

import { contextBridge, ipcRenderer, webFrame } from 'electron'

// 应用版本信息
const APP_VERSION = '1.0.0'

// 循环跳转检测
interface NavigationRecord {
  type: string
  timestamp: number
}

let navigationHistory: NavigationRecord[] = []
let navigationLocked = false
let lockTimeout: NodeJS.Timeout | null = null
let lastGotoTime = 0
let lastGotoType = ''

const MAX_HISTORY_SIZE = 10
const LOOP_DETECTION_WINDOW = 10000 // 10秒
const NAVIGATION_LOCK_DURATION = 5000 // 5秒

// 错误处理函数
const handleError = (error: Error, context: string): void => {
  console.error(`[View Preload] ${context}:`, error)
  ipcRenderer.send('view:log-error', {
    context,
    message: error.message,
    stack: error.stack,
    url: window.location.href,
    timestamp: Date.now(),
  })
}

// 循环检测函数
const detectLoopPattern = (): boolean => {
  const now = Date.now()

  // 清理过期记录
  navigationHistory = navigationHistory.filter(
    record => now - record.timestamp < LOOP_DETECTION_WINDOW
  )

  if (navigationHistory.length < 4) return false

  // 检查循环模式
  for (let i = 0; i < navigationHistory.length - 2; i++) {
    const current = navigationHistory[i]
    const next = navigationHistory[i + 1]
    const afterNext = navigationHistory[i + 2]

    if (current && next && afterNext) {
      if (
        (current.type === 'gotoLogin' &&
          next.type === 'gotoMain' &&
          afterNext.type === 'gotoLogin') ||
        (current.type === 'gotoMain' && next.type === 'gotoLogin' && afterNext.type === 'gotoMain')
      ) {
        return true
      }
    }
  }

  // 检查短时间内重复操作
  const recentSameType = navigationHistory.filter(
    record =>
      record.type === navigationHistory[navigationHistory.length - 1]?.type &&
      now - record.timestamp < 3000
  )

  return recentSameType.length >= 3
}

// 导航锁管理
const tryLockNavigation = (gotoType: string): boolean => {
  const now = Date.now()

  // 记录导航历史
  navigationHistory.push({ type: gotoType, timestamp: now })

  if (navigationHistory.length > MAX_HISTORY_SIZE) {
    navigationHistory = navigationHistory.slice(-MAX_HISTORY_SIZE)
  }

  const hasLoop = detectLoopPattern()

  if (navigationLocked) return false

  if (hasLoop) {
    try {
      localStorage.setItem('jlcone-loop-detected', now.toString())
    } catch (error) {
      console.warn('Failed to set loop detection flag:', error)
    }

    navigationLocked = true
    if (lockTimeout) clearTimeout(lockTimeout)

    lockTimeout = setTimeout(() => {
      navigationLocked = false
      lockTimeout = null
    }, NAVIGATION_LOCK_DURATION * 2)

    return false
  }

  if (lastGotoType === gotoType && now - lastGotoTime < 2000) {
    return false
  }

  navigationLocked = true
  lastGotoTime = now
  lastGotoType = gotoType

  if (lockTimeout) clearTimeout(lockTimeout)

  lockTimeout = setTimeout(() => {
    navigationLocked = false
    lockTimeout = null
  }, NAVIGATION_LOCK_DURATION)

  return true
}

const checkGotoLoop = (gotoType: string): boolean => {
  return !tryLockNavigation(gotoType)
}

// 设备信息 API
const deviceAPI = {
  getDeviceInfo: (securityCode = ''): any =>
    ipcRenderer.sendSync('view:get-device-info', securityCode),

  getDeviceInfoEx: (securityCode: string): any =>
    ipcRenderer.sendSync('view:get-device-info-ex', securityCode),

  getPcAssitDeviceInfo: (infoType: string, securityCode = '', signal: string): void =>
    ipcRenderer.send('view:get-pc-assit-device-info', infoType, securityCode, signal),

  deCryptoAndUnZipTest: (base64Url: string): any =>
    ipcRenderer.sendSync('view:decrypt-unzip-test', base64Url),
}

// 登录和导航 API
const authAPI = {
  gotoMain: (params = '{}'): void => {
    if (checkGotoLoop('gotoMain')) return

    try {
      const data = JSON.parse(params)
      const loginInfo = {
        ...data,
        userId: data.userId || data.id || data.user_id,
        username: data.username || data.name || data.user_name || data.nickname,
        email: data.email || data.user_email,
        token: data.token || data.accessToken || data.access_token,
        refreshToken: data.refreshToken || data.refresh_token,
        loginMethod: data.loginMethod || data.login_method || 'password',
        customerCode: data.customerCode || data.customer_code || data.customerId,
      }

      ipcRenderer.send('view:login-success', loginInfo)
    } catch (error) {
      handleError(error as Error, 'gotoMain')
    }
  },

  gotoLogin: (loginUrl: string): void => {
    if (checkGotoLoop('gotoLogin')) return

    let shouldClearState = true
    let reason = 'manual'

    try {
      const loopDetected = localStorage.getItem('jlcone-loop-detected')
      if (loopDetected) {
        const detectedTime = parseInt(loopDetected)
        const now = Date.now()

        if (now - detectedTime < 5 * 60 * 1000) {
          shouldClearState = true
          reason = 'loopDetected'
          localStorage.removeItem('jlcone-loop-detected')
        } else {
          localStorage.removeItem('jlcone-loop-detected')
        }
      }
    } catch (error) {
      console.warn('Failed to check loop detection flag:', error)
    }

    // 清除当前页面存储
    try {
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (
          key &&
          (key.includes('token') ||
            key.includes('auth') ||
            key.includes('login') ||
            key.includes('user'))
        ) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key))
      sessionStorage.clear()
    } catch (error) {
      console.warn('Failed to clear page storage:', error)
    }

    ipcRenderer.send('view:goto-login', loginUrl, {
      clearCookies: shouldClearState,
      forceLogout: shouldClearState,
      disableAutoJump: shouldClearState,
      reason,
    })
  },

  gotoLoginSoft: (loginUrl: string): void => {
    if (checkGotoLoop('gotoLoginSoft')) return

    ipcRenderer.send('view:goto-login', loginUrl, {
      clearCookies: false,
      forceLogout: false,
      disableAutoJump: false,
      reason: 'startup',
    })
  },

  forceLogout: (loginUrl: string): void => {
    if (checkGotoLoop('forceLogout')) return

    ipcRenderer.send('view:goto-login', loginUrl, {
      clearCookies: true,
      forceLogout: true,
      disableAutoJump: true,
      reason: 'forceLogout',
    })
  },

  clearLoginCookies: (): Promise<any> => ipcRenderer.invoke('view:clear-login-cookies'),

  clearAllLoginState: (): Promise<any> => ipcRenderer.invoke('view:clear-all-login-state'),
}

// 配置管理 API
const configAPI = {
  getUserConfig: (): Promise<any> => ipcRenderer.invoke('view:get-user-config'),

  setUserConfigWithObj: (dict: Record<string, any>): void => {
    // 语言配置保护
    if ('language' in dict && !dict.__source) {
      const filteredDict = { ...dict }
      delete filteredDict.language

      if (Object.keys(filteredDict).length === 0) return
      dict = filteredDict
    }

    ipcRenderer.send('view:set-user-config', dict)
  },
}

// 业务操作 API
const businessAPI = {
  openNewTab: (url: string, mode: 0 | 1 = 0): void => {
    ipcRenderer.send('view:open-new-tab', { url, mode })
  },

  openLoginedBackgroundTab: (): void => {
    ipcRenderer.invoke('view:open-logined-background-tab')
  },

  showGerberFileList: (args?: any): void => {
    ipcRenderer.send('view:show-gerber-list', args)
  },

  orderPcb: (args: string): void => {
    ipcRenderer.send('view:order-pcb', args)
  },

  insertUnionTab: (url: string, tabType: string): void => {
    ipcRenderer.send('view:insert-union-tab', url, tabType)
  },

  insertIndexKey: (key: string): void => {
    ipcRenderer.send('view:insert-index-key', key)
  },

  googleLogin: (url: string): void => {
    ipcRenderer.send('view:google-login', url)
  },

  sendIpcMessage: (message = '', data = {}): void => {
    ipcRenderer.send(message, data)
  },

  sendMsgToMain: (message: string, ...args: any[]): void => {
    ipcRenderer.send(message, ...args)
  },

  closeBvView: (): void => {
    ipcRenderer.send('view:close-view', window.location.href)
  },
}

// 登录状态管理 API
const loginStateAPI = {
  getCurrentState: (): Promise<any> => ipcRenderer.invoke('view:login-state-get'),

  isLoggedIn: (): Promise<boolean> => ipcRenderer.invoke('view:login-state-is-logged-in'),

  getUserInfo: (): Promise<any> => ipcRenderer.invoke('view:login-state-get-user-info'),

  logout: (): Promise<any> => ipcRenderer.invoke('view:login-state-logout'),

  getStats: (): Promise<any> => ipcRenderer.invoke('view:login-state-get-stats'),

  updateUserInfo: (userInfo: any): Promise<any> =>
    ipcRenderer.invoke('view:login-state-update-user-info', userInfo),

  onStateChange: (callback: (event: any) => void): void => {
    ipcRenderer.on('view:login-state-changed', (event, message) => {
      if (message.type === 'loginStateChange') {
        callback(message.data)
      }
    })
  },
}

// 事件处理 API
const eventHandleAPI = {
  handleContextMenu: (
    topUrl: string,
    frameUrl: string,
    anchorUrl: string,
    selectionStr: string
  ): void => {
    ipcRenderer.send('view:context-menu', { topUrl, frameUrl, anchorUrl, selectionStr })
  },

  handleKeydown: (keyStr: string): void => {
    if (['F5', 'F12'].includes(keyStr)) {
      ipcRenderer.send('view:keydown', keyStr)
    }
  },

  handleZoomIn: (zoomIn: boolean): void => {
    ipcRenderer.send('view:zoom', zoomIn)
  },

  handleCtrlDown: (keyDown: boolean): void => {
    ipcRenderer.send('view:ctrl-key', keyDown)
  },

  handlePageFailed: (): void => {
    ipcRenderer.send('view:page-failed')
  },

  handleLog: (href: string, message: any, logType: string, ...params: any[]): void => {
    try {
      ipcRenderer.send('view:log', {
        href,
        message,
        logType,
        params: JSON.stringify(params),
        timestamp: Date.now(),
      })
    } catch (error) {
      console.error('Failed to send log:', error)
    }
  },

  onMainMsg: (listener: (event: any, ...args: any[]) => void): void => {
    ipcRenderer.on('view:main-message', listener)
  },
}

// 视图控制 API
const viewControlAPI = {
  info: {
    getId: (): Promise<string> => ipcRenderer.invoke('view:get-id'),
    getUrl: (): Promise<string> => ipcRenderer.invoke('view:get-url'),
    getTitle: (): Promise<string> => ipcRenderer.invoke('view:get-title'),
  },

  control: {
    focus: (): void => ipcRenderer.send('view:focus'),
    blur: (): void => ipcRenderer.send('view:blur'),
    reload: (): void => ipcRenderer.send('view:reload'),
    stop: (): void => ipcRenderer.send('view:stop'),
  },

  navigation: {
    loadURL: (url: string): void => ipcRenderer.send('view:load-url', url),
    goBack: (): void => ipcRenderer.send('view:go-back'),
    goForward: (): void => ipcRenderer.send('view:go-forward'),
    canGoBack: (): Promise<boolean> => ipcRenderer.invoke('view:can-go-back'),
    canGoForward: (): Promise<boolean> => ipcRenderer.invoke('view:can-go-forward'),
  },
}

// 事件监听 API
const eventAPI = {
  onLoadStart: (callback: () => void): (() => void) => {
    const handler = (): void => callback()
    ipcRenderer.on('view:load-start', handler)
    return () => ipcRenderer.removeListener('view:load-start', handler)
  },

  onLoadStop: (callback: () => void): (() => void) => {
    const handler = (): void => callback()
    ipcRenderer.on('view:load-stop', handler)
    return () => ipcRenderer.removeListener('view:load-stop', handler)
  },

  onTitleUpdated: (callback: (title: string) => void): (() => void) => {
    const handler = (_: any, title: string): void => callback(title)
    ipcRenderer.on('view:title-updated', handler)
    return () => ipcRenderer.removeListener('view:title-updated', handler)
  },

  onUrlUpdated: (callback: (url: string) => void): (() => void) => {
    const handler = (_: any, url: string): void => callback(url)
    ipcRenderer.on('view:url-updated', handler)
    return () => ipcRenderer.removeListener('view:url-updated', handler)
  },
}

// 整合的客户端 API
const appClientAPI = {
  // 版本信息
  getClientVersion: (): string => APP_VERSION,
  getVersion: (): string => APP_VERSION,
  getComponentVersion: () => ({
    gerber: '1.4.2',
    smtEditor: '1.1.3',
  }),

  // 设备信息
  ...deviceAPI,

  // 登录导航
  ...authAPI,

  // 配置管理
  ...configAPI,

  // 业务操作
  ...businessAPI,

  // 登录状态
  loginState: loginStateAPI,

  // 网页到主进程通信
  sendToMain: (data: any): void => ipcRenderer.send('view:from-web', data),

  // 监听主进程更新
  onUpdate: (callback: (state: any) => void): void => {
    ipcRenderer.on('view:update-state', (event, state) => callback(state))
  },

  // 监听主进程消息
  fromMainMessage: (callback: (state: any) => void): void => {
    ipcRenderer.on('view:from-main-message', (event, state) => callback(state))
  },
}

// 整合的视图 API
const viewAPI = {
  ...viewControlAPI,
  events: eventAPI,
  client: appClientAPI,
  eventHandle: eventHandleAPI,
}

// 设置全局错误处理
window.addEventListener('error', event => {
  handleError(event.error || new Error(event.message), 'Global Error')
})

window.addEventListener('unhandledrejection', event => {
  handleError(new Error(event.reason), 'Unhandled Promise Rejection')
})

// 监听 IPC 消息执行 JavaScript
ipcRenderer.on('view:execute-js', (event, code: string) => {
  try {
    webFrame.executeJavaScript(code)
  } catch (error) {
    handleError(error as Error, 'Execute JavaScript')
  }
})

// 页面错误检测
const checkPageError = (): void => {
  if (window.location.href.startsWith('chrome-error')) {
    console.log('[View Preload] Page error detected:', window.location.href)
    eventHandleAPI.handlePageFailed()
  }
}

// 定期检查页面错误
setInterval(checkPageError, 30000)

// 重写 window.close 方法
const originalClose = window.close
window.close = () => {
  appClientAPI.closeBvView()
  originalClose.call(window)
}

// 暴露 API 到渲染进程
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('viewAPI', viewAPI)
    contextBridge.exposeInMainWorld('appClient', appClientAPI)
    contextBridge.exposeInMainWorld('__assitEventHandle__', eventHandleAPI)

    // 兼容原始项目的客户端信息
    contextBridge.exposeInMainWorld('JLC_PC_Assit_Client_Information', {
      Client_Version: APP_VERSION,
      Gerber_Version: '1.4.2',
      SmtEditor_Version: '1.1.3',
    })
  } catch (error) {
    console.error('Failed to expose view APIs:', error)
  }
} else {
  // @ts-ignore: 非隔离模式下的全局变量
  window.viewAPI = viewAPI
  // @ts-ignore
  window.appClient = appClientAPI
  // @ts-ignore
  window.__assitEventHandle__ = eventHandleAPI
  // @ts-ignore
  window.JLC_PC_Assit_Client_Information = {
    Client_Version: APP_VERSION,
    Gerber_Version: '1.4.2',
    SmtEditor_Version: '1.1.3',
  }
}
