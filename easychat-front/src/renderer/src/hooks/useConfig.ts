/**
 * 配置管理 Hook
 * 提供应用配置的读取、写入和监听功能
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { useElectronAPI } from './useElectronAPI'

export interface AppConfig {
  // 窗口配置
  window: {
    bounds: {
      x: number
      y: number
      width: number
      height: number
    }
    isMaximized: boolean
    isFullScreen: boolean
  }
  
  // 用户偏好
  preferences: {
    language: string
    theme: 'light' | 'dark' | 'auto'
    autoUpdate: boolean
    notifications: boolean
  }
  
  // 标签页配置
  tabs: {
    defaultUrls: string[]
    maxTabs: number
    restoreOnStartup: boolean
  }
  
  // 网络配置
  network: {
    proxy?: {
      type: 'http' | 'https' | 'socks4' | 'socks5'
      host: string
      port: number
      username?: string
      password?: string
    }
    timeout: number
    retryCount: number
  }
}

/**
 * 配置管理 Hook
 */
export const useConfig = <T = any>(key?: string, defaultValue?: T) => {
  const [config, setConfig] = useState<T | null>(defaultValue || null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const electronAPI = useElectronAPI()
  const isInitialized = useRef(false)

  // 初始化配置
  useEffect(() => {
    if (isInitialized.current) return
    isInitialized.current = true

    const initializeConfig = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        if (key) {
          const value = await electronAPI.config.get<T>(key)
          setConfig(value !== undefined ? value : defaultValue || null)
        }
      } catch (err) {
        console.error('Failed to initialize config:', err)
        setError(err as Error)
        setConfig(defaultValue || null)
      } finally {
        setIsLoading(false)
      }
    }

    initializeConfig()
  }, [electronAPI, key, defaultValue])

  // 监听配置变化
  useEffect(() => {
    if (!key) return

    const cleanup = electronAPI.ipc.on('config-changed', (_, changedKey: string, value: any) => {
      if (changedKey === key) {
        setConfig(value)
      }
    })

    return cleanup
  }, [electronAPI, key])

  // 更新配置
  const updateConfig = useCallback(async (value: T): Promise<boolean> => {
    if (!key) {
      console.warn('Cannot update config without key')
      return false
    }

    try {
      await electronAPI.config.set(key, value)
      setConfig(value)
      return true
    } catch (err) {
      console.error('Failed to update config:', err)
      setError(err as Error)
      return false
    }
  }, [electronAPI, key])

  // 获取配置值
  const getConfig = useCallback(async <K = T>(configKey?: string): Promise<K | null> => {
    try {
      const targetKey = configKey || key
      if (!targetKey) {
        throw new Error('Config key is required')
      }
      
      const value = await electronAPI.config.get<K>(targetKey)
      return value !== undefined ? value : null
    } catch (err) {
      console.error('Failed to get config:', err)
      return null
    }
  }, [electronAPI, key])

  // 设置配置值
  const setConfigValue = useCallback(async <K = T>(configKey: string, value: K): Promise<boolean> => {
    try {
      await electronAPI.config.set(configKey, value)
      
      // 如果更新的是当前监听的 key，更新本地状态
      if (configKey === key) {
        setConfig(value as unknown as T)
      }
      
      return true
    } catch (err) {
      console.error('Failed to set config:', err)
      return false
    }
  }, [electronAPI, key])

  return {
    config,
    isLoading,
    error,
    updateConfig,
    getConfig,
    setConfig: setConfigValue
  }
}

/**
 * 应用配置 Hook
 * 专门用于管理应用级别的配置
 */
export const useAppConfig = () => {
  return useConfig<AppConfig>('app', {
    window: {
      bounds: { x: 0, y: 0, width: 1200, height: 800 },
      isMaximized: false,
      isFullScreen: false
    },
    preferences: {
      language: 'en',
      theme: 'light',
      autoUpdate: true,
      notifications: true
    },
    tabs: {
      defaultUrls: [],
      maxTabs: 10,
      restoreOnStartup: true
    },
    network: {
      timeout: 30000,
      retryCount: 3
    }
  })
}

/**
 * 用户偏好设置 Hook
 */
export const useUserPreferences = () => {
  const { config, updateConfig, isLoading } = useConfig<AppConfig['preferences']>('preferences')

  const updateLanguage = useCallback(async (language: string) => {
    if (!config) return false
    return updateConfig({ ...config, language })
  }, [config, updateConfig])

  const updateTheme = useCallback(async (theme: 'light' | 'dark' | 'auto') => {
    if (!config) return false
    return updateConfig({ ...config, theme })
  }, [config, updateConfig])

  const toggleAutoUpdate = useCallback(async () => {
    if (!config) return false
    return updateConfig({ ...config, autoUpdate: !config.autoUpdate })
  }, [config, updateConfig])

  const toggleNotifications = useCallback(async () => {
    if (!config) return false
    return updateConfig({ ...config, notifications: !config.notifications })
  }, [config, updateConfig])

  return {
    preferences: config,
    isLoading,
    updateLanguage,
    updateTheme,
    toggleAutoUpdate,
    toggleNotifications
  }
}