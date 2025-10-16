/**
 * 窗口状态管理 Hook
 * 管理窗口的最大化、最小化、边框等状态
 */
import { useCallback, useEffect, useState } from 'react'
import { useElectronAPI } from './useElectronAPI'

export interface WindowState {
  isMaximized: boolean
  isMinimized: boolean
  isFullScreen: boolean
  showBorder: boolean
  isDarwin: boolean
  isWin10: boolean
}

/**
 * 窗口状态管理 Hook
 */
export const useWindowState = () => {
  const [windowState, setWindowState] = useState<WindowState>({
    isMaximized: false,
    isMinimized: false,
    isFullScreen: false,
    showBorder: true,
    isDarwin: false,
    isWin10: false,
  })

  const electronAPI = useElectronAPI()

  // 初始化窗口状态
  useEffect(() => {
    const initializeWindowState = async () => {
      try {
        const isMaximized = await electronAPI.window.isMaximized()
        setWindowState(prev => ({ ...prev, isMaximized }))
      } catch (error) {
        console.error('Failed to get window state:', error)
      }
    }

    initializeWindowState()
  }, [electronAPI])

  // 监听窗口状态变化
  useEffect(() => {
    const cleanup1 = electronAPI.ipc.on('window-maximized', (_, isMaximized: boolean) => {
      setWindowState(prev => ({
        ...prev,
        isMaximized,
        showBorder: !prev.isWin10 && !isMaximized,
      }))
    })

    const cleanup2 = electronAPI.ipc.on('window-minimized', (_, isMinimized: boolean) => {
      setWindowState(prev => ({ ...prev, isMinimized }))
    })

    const cleanup3 = electronAPI.ipc.on('window-fullscreen', (_, isFullScreen: boolean) => {
      setWindowState(prev => ({ ...prev, isFullScreen }))
    })

    const cleanup4 = electronAPI.ipc.on('platform-info', (_, platformInfo: any) => {
      setWindowState(prev => ({
        ...prev,
        isDarwin: platformInfo.isDarwin,
        isWin10: platformInfo.isWin10,
        showBorder: !platformInfo.isWin10 && !prev.isMaximized,
      }))
    })

    return () => {
      if (cleanup1) cleanup1()
      if (cleanup2) cleanup2()
      if (cleanup3) cleanup3()
      if (cleanup4) cleanup4()
    }
  }, [electronAPI])

  // 窗口控制方法
  const minimize = useCallback(() => {
    electronAPI.window.minimize()
  }, [electronAPI])

  const maximize = useCallback(async () => {
    electronAPI.window.maximize()
    // 状态会通过事件监听器更新
  }, [electronAPI])

  const close = useCallback(() => {
    electronAPI.window.close()
  }, [electronAPI])

  const setTitle = useCallback(
    (title: string) => {
      electronAPI.window.setTitle(title)
    },
    [electronAPI]
  )

  return {
    windowState,
    minimize,
    maximize,
    close,
    setTitle,
  }
}

/**
 * 窗口拖拽区域 Hook
 * 用于创建可拖拽的标题栏区域
 */
export const useDragRegion = () => {
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    // 只有左键点击才触发拖拽
    if (event.button !== 0) return

    // 阻止在按钮等交互元素上触发拖拽
    const target = event.target as HTMLElement
    if (target.tagName === 'BUTTON' || target.closest('button')) {
      return
    }

    // 通知主进程开始拖拽窗口
    const electronAPI = (window as any).electron || (window as any).electronAPI
    if (electronAPI) {
      electronAPI.ipcRenderer.send('window-start-drag')
    }
  }, [])

  return {
    onMouseDown: handleMouseDown,
    style: {
      WebkitAppRegion: 'drag' as const,
      userSelect: 'none' as const,
    },
  }
}
