/**
 * 标签页管理 Hook
 * 提供标签页状态管理和操作功能
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useElectronAPI } from './useElectronAPI'

export interface TabItem {
  id: string
  title: string
  url: string
  favicon?: string
  isActive: boolean
  isLoading: boolean
  canGoBack: boolean
  canGoForward: boolean
  createdAt: Date
  updatedAt: Date
}

export interface TabCreateOptions {
  url: string
  title?: string
  isActive?: boolean
  position?: number
}

/**
 * 标签页管理 Hook
 */
export const useTabManager = () => {
  const [tabs, setTabs] = useState<TabItem[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<{ [tabId: string]: boolean }>({})
  const electronAPI = useElectronAPI()
  const isInitialized = useRef(false)

  // 初始化标签页数据
  useEffect(() => {
    if (isInitialized.current) return
    isInitialized.current = true

    const initializeTabs = async () => {
      try {
        const tabData = await electronAPI.tabs.getAll()
        setTabs(tabData || [])
      } catch (error) {
        console.error('Failed to initialize tabs:', error)
      }
    }

    initializeTabs()
  }, [electronAPI])

  // 监听标签页状态变化
  useEffect(() => {
    const cleanup1 = electronAPI.ipc.on('tab-state-changed', (_, data) => {
      if (data.tabs) {
        setTabs(data.tabs)
      }
      if (data.activeTabId !== undefined) {
        setActiveTabId(data.activeTabId)
      }
    })

    const cleanup2 = electronAPI.ipc.on(
      'tab-loading-changed',
      (_, tabId: string, loading: boolean) => {
        setIsLoading(prev => ({
          ...prev,
          [tabId]: loading,
        }))
      }
    )

    const cleanup3 = electronAPI.ipc.on('tab-title-changed', (_, tabId: string, title: string) => {
      setTabs(prevTabs =>
        prevTabs.map(tab => (tab.id === tabId ? { ...tab, title, updatedAt: new Date() } : tab))
      )
    })

    return () => {
      if (cleanup1) cleanup1()
      if (cleanup2) cleanup2()
      if (cleanup3) cleanup3()
    }
  }, [electronAPI])

  // 创建新标签页
  const createTab = useCallback(
    async (options: TabCreateOptions): Promise<TabItem | null> => {
      try {
        const newTab = await electronAPI.tabs.create(options)
        if (newTab) {
          setTabs(prevTabs => [...prevTabs, newTab])
          if (options.isActive !== false) {
            setActiveTabId(newTab.id)
          }
        }
        return newTab
      } catch (error) {
        console.error('Failed to create tab:', error)
        return null
      }
    },
    [electronAPI]
  )

  // 关闭标签页
  const closeTab = useCallback(
    async (tabId: string): Promise<boolean> => {
      try {
        await electronAPI.tabs.remove(tabId)
        setTabs(prevTabs => prevTabs.filter(tab => tab.id !== tabId))

        // 如果关闭的是当前活跃标签页，切换到其他标签页
        if (activeTabId === tabId) {
          const remainingTabs = tabs.filter(tab => tab.id !== tabId)
          if (remainingTabs.length > 0 && remainingTabs[0]) {
            setActiveTabId(remainingTabs[0].id)
            await electronAPI.tabs.switch(remainingTabs[0].id)
          } else {
            setActiveTabId(null)
          }
        }

        return true
      } catch (error) {
        console.error('Failed to close tab:', error)
        return false
      }
    },
    [electronAPI, activeTabId, tabs]
  )

  // 切换标签页
  const switchTab = useCallback(
    async (tabId: string): Promise<boolean> => {
      try {
        await electronAPI.tabs.switch(tabId)
        setActiveTabId(tabId)
        return true
      } catch (error) {
        console.error('Failed to switch tab:', error)
        return false
      }
    },
    [electronAPI]
  )

  // 重新排序标签页
  const reorderTabs = useCallback(
    (fromIndex: number, toIndex: number) => {
      setTabs(prevTabs => {
        const newTabs = [...prevTabs]
        const [movedTab] = newTabs.splice(fromIndex, 1)

        if (movedTab) {
          newTabs.splice(toIndex, 0, movedTab)

          // 通知主进程更新标签页顺序
          electronAPI.ipc.send('tab-reorder', {
            fromIndex,
            toIndex,
            tabOrder: newTabs.map(tab => tab.id),
          })
        }

        return newTabs
      })
    },
    [electronAPI]
  )

  // 获取活跃标签页
  const activeTab = tabs.find(tab => tab.id === activeTabId) || null

  // 获取标签页加载状态
  const getTabLoadingState = useCallback(
    (tabId: string) => {
      return isLoading[tabId] || false
    },
    [isLoading]
  )

  return {
    tabs,
    activeTab,
    activeTabId,
    createTab,
    closeTab,
    switchTab,
    reorderTabs,
    getTabLoadingState,
    isLoading,
  }
}
