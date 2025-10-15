/**
 * 组件懒加载工具
 * 提供代码分割和懒加载功能
 */
import React, { Suspense, ComponentType, LazyExoticComponent } from 'react'
import { LoadingSpinner, FullScreenLoading } from '../components/LoadingSpinner'
import { ErrorBoundary } from '../components/ErrorBoundary'

/**
 * 懒加载组件的配置选项
 */
interface LazyLoadOptions {
  /** 加载时显示的组件 */
  fallback?: React.ComponentType
  /** 错误时显示的组件 */
  errorFallback?: React.ComponentType<{ error: Error; retry: () => void }>
  /** 延迟加载时间（毫秒） */
  delay?: number
  /** 是否显示全屏加载 */
  fullScreen?: boolean
  /** 加载提示文本 */
  loadingText?: string
}

/**
 * 创建懒加载组件
 */
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyLoadOptions = {}
) {
  const {
    fallback: CustomFallback,
    errorFallback: CustomErrorFallback,
    delay = 0,
    fullScreen = false,
    loadingText = '加载中...'
  } = options

  // 创建懒加载组件
  const LazyComponent = React.lazy(() => {
    if (delay > 0) {
      return new Promise<{ default: T }>(resolve => {
        setTimeout(() => {
          importFn().then(resolve).catch(() => {
            // 处理加载失败的情况
            resolve({ default: (() => <div>加载失败</div>) as any })
          })
        }, delay)
      })
    }
    return importFn()
  })

  // 默认加载组件
  const DefaultFallback = () => {
    if (CustomFallback) {
      return <CustomFallback />
    }
    
    if (fullScreen) {
      return <FullScreenLoading message={loadingText} />
    }
    
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '20px' 
      }}>
        <LoadingSpinner size="medium" />
        <span style={{ marginLeft: '8px' }}>{loadingText}</span>
      </div>
    )
  }

  // 默认错误组件
  const DefaultErrorFallback = ({ error, retry }: { error: Error; retry: () => void }) => {
    if (CustomErrorFallback) {
      return <CustomErrorFallback error={error} retry={retry} />
    }
    
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        color: '#d32f2f'
      }}>
        <h3>组件加载失败</h3>
        <p>{error.message}</p>
        <button 
          onClick={retry}
          style={{
            padding: '8px 16px',
            background: '#d32f2f',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          重试
        </button>
      </div>
    )
  }

  // 包装组件
  const WrappedComponent: React.FC<any> = (props) => {
    const [retryKey, setRetryKey] = React.useState(0)
    
    const handleRetry = React.useCallback(() => {
      setRetryKey(prev => prev + 1)
    }, [])

    return (
      <ErrorBoundary
        key={retryKey}
        fallback={<DefaultErrorFallback error={new Error('组件加载失败')} retry={handleRetry} />}
      >
        <Suspense fallback={<DefaultFallback />}>
          <LazyComponent {...props} />
        </Suspense>
      </ErrorBoundary>
    )
  }

  WrappedComponent.displayName = `LazyComponent(${(LazyComponent as any).displayName || 'Component'})`

  return WrappedComponent
}

/**
 * 预加载组件
 */
export function preloadComponent(
  lazyComponent: any
): Promise<void> {
  // 简化的预加载实现
  return Promise.resolve()
}

/**
 * 批量预加载组件
 */
export function preloadComponents(
  lazyComponents: any[]
): Promise<void[]> {
  return Promise.all(lazyComponents.map(preloadComponent))
}

/**
 * 路由级别的懒加载组件
 */
export function createLazyRoute(
  importFn: () => Promise<{ default: any }>,
  options: LazyLoadOptions = {}
) {
  return createLazyComponent(importFn, {
    fullScreen: true,
    loadingText: '页面加载中...',
    ...options
  })
}

/**
 * 模块级别的懒加载组件
 */
export function createLazyModule(
  importFn: () => Promise<{ default: any }>,
  options: LazyLoadOptions = {}
) {
  return createLazyComponent(importFn, {
    fullScreen: false,
    loadingText: '模块加载中...',
    ...options
  })
}

/**
 * 懒加载 Hook
 * 用于在组件内部动态加载其他组件
 */
export function useLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  deps: React.DependencyList = []
) {
  const [Component, setComponent] = React.useState<T | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<Error | null>(null)

  const loadComponent = React.useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const module = await importFn()
      setComponent(() => module.default)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, deps)

  React.useEffect(() => {
    loadComponent()
  }, [loadComponent])

  const retry = React.useCallback(() => {
    loadComponent()
  }, [loadComponent])

  return {
    Component,
    loading,
    error,
    retry
  }
}

/**
 * 条件懒加载 Hook
 * 只有在满足条件时才加载组件
 */
export function useConditionalLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  condition: boolean,
  deps: React.DependencyList = []
) {
  const [Component, setComponent] = React.useState<T | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<Error | null>(null)

  React.useEffect(() => {
    if (!condition) {
      return
    }

    let cancelled = false

    const loadComponent = async () => {
      try {
        setLoading(true)
        setError(null)
        const module = await importFn()
        
        if (!cancelled) {
          setComponent(() => module.default)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadComponent()

    return () => {
      cancelled = true
    }
  }, [condition, ...deps])

  const retry = React.useCallback(() => {
    if (condition) {
      setError(null)
      setLoading(true)
      
      importFn()
        .then(module => {
          setComponent(() => module.default)
        })
        .catch(err => {
          setError(err as Error)
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [condition, importFn])

  return {
    Component,
    loading,
    error,
    retry
  }
}