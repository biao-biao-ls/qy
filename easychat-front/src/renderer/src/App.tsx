/**
 * 主应用组件
 * 现代化的 JLCONE 桌面应用主界面
 */
import React, { useState, useEffect, useCallback, Suspense } from 'react'
import { ErrorBoundary } from './components/ErrorBoundary'
import { WindowControls } from './components/WindowControls'
import { TabRenderer } from './components/TabRenderer'
import { NavigationBar } from './components/NavigationBar'
import { StatusBar } from './components/StatusBar'
import { LoadingSpinner, FullScreenLoading } from './components/LoadingSpinner'
import { useWindowState, useDragRegion } from './hooks/useWindowState'
import { useTabManager } from './hooks/useTabManager'
import { useElectronAPI } from './hooks/useElectronAPI'
import { createLazyComponent } from './utils/lazyLoad'

// 懒加载组件
const LazyVersions = createLazyComponent(
  () => import('./components/Versions'),
  { loadingText: '加载版本信息...' }
)

interface AppState {
  isReady: boolean
  showDevInfo: boolean
  currentUser: string | null
}

function App(): React.JSX.Element {
  const [appState, setAppState] = useState<AppState>({
    isReady: false,
    showDevInfo: process.env.NODE_ENV === 'development',
    currentUser: null
  })

  const { windowState } = useWindowState()
  const { tabs, activeTab, createTab, closeTab, switchTab } = useTabManager()
  const electronAPI = useElectronAPI()
  const dragRegionProps = useDragRegion()

  // 初始化应用
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // 获取用户信息
        const userInfo = await electronAPI.ipc.invoke('get-user-info')
        
        setAppState(prev => ({
          ...prev,
          isReady: true,
          currentUser: userInfo?.username || null
        }))

        // 如果没有标签页，创建默认标签页
        if (tabs.length === 0) {
          await createTab({
            url: 'https://pro.jlc.com/user-center/',
            title: 'JLCONE 用户中心',
            isActive: true
          })
        }
      } catch (error) {
        console.error('Failed to initialize app:', error)
        setAppState(prev => ({ ...prev, isReady: true }))
      }
    }

    initializeApp()
  }, [electronAPI, tabs.length, createTab])

  // 处理标签页操作
  const handleTabCreate = useCallback(async (url: string) => {
    await createTab({
      url,
      title: '新标签页',
      isActive: true
    })
  }, [createTab])

  const handleTabClose = useCallback(async (tabId: string) => {
    await closeTab(tabId)
  }, [closeTab])

  const handleTabSwitch = useCallback(async (tabId: string) => {
    await switchTab(tabId)
  }, [switchTab])

  // 处理历史导航
  const handleHistoryBack = useCallback(() => {
    electronAPI.ipc.send('tab-history-back', activeTab?.id)
  }, [electronAPI, activeTab])

  const handleHistoryForward = useCallback(() => {
    electronAPI.ipc.send('tab-history-forward', activeTab?.id)
  }, [electronAPI, activeTab])

  // 处理设置窗口
  const handleOpenSettings = useCallback(() => {
    electronAPI.ipc.send('window-open-settings')
  }, [electronAPI])

  // 全局快捷键处理
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // F12 快捷键打开开发者工具
      if (event.key === 'F12') {
        event.preventDefault()
        electronAPI.dev?.toggleDevTools?.()
      }
      // Ctrl+Shift+I (Windows/Linux) 或 Cmd+Option+I (macOS)
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'I') {
        event.preventDefault()
        electronAPI.dev?.toggleDevTools?.()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [electronAPI])

  // 键盘快捷键处理
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + T: 新建标签页
      if ((event.ctrlKey || event.metaKey) && event.key === 't') {
        event.preventDefault()
        handleTabCreate('about:blank')
      }
      
      // Ctrl/Cmd + W: 关闭当前标签页
      if ((event.ctrlKey || event.metaKey) && event.key === 'w') {
        event.preventDefault()
        if (activeTab && tabs.length > 1) {
          handleTabClose(activeTab.id)
        }
      }
      
      // Ctrl/Cmd + R: 刷新当前标签页
      if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
        event.preventDefault()
        if (activeTab) {
          electronAPI.ipc.send('tab-reload', activeTab.id)
        }
      }
      
      // Alt + Left: 后退
      if (event.altKey && event.key === 'ArrowLeft') {
        event.preventDefault()
        handleHistoryBack()
      }
      
      // Alt + Right: 前进
      if (event.altKey && event.key === 'ArrowRight') {
        event.preventDefault()
        handleHistoryForward()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeTab, tabs.length, handleTabCreate, handleTabClose, handleHistoryBack, handleHistoryForward, electronAPI])

  // 如果应用还未准备好，显示加载界面
  if (!appState.isReady) {
    return <FullScreenLoading message="正在启动 JLCONE..." variant="spinner" />
  }

  return (
    <ErrorBoundary>
      <div className={`app ${windowState.showBorder ? 'app--with-border' : ''}`}>
        {/* 标题栏 */}
        <div className="app__titlebar" {...dragRegionProps}>
          <div className="app__titlebar-content">
            {/* 左侧：导航按钮和标签页 */}
            <div className="app__titlebar-left">
              {/* 历史导航按钮 */}
              <div className="app__navigation">
                <button
                  className="app__nav-button"
                  onClick={handleHistoryBack}
                  disabled={!activeTab?.canGoBack}
                  title="后退"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16">
                    <path
                      d="M8.5 2.5L3 8l5.5 5.5L10 12l-4-4 4-4-1.5-1.5z"
                      fill="currentColor"
                    />
                  </svg>
                </button>
                
                <button
                  className="app__nav-button"
                  onClick={handleHistoryForward}
                  disabled={!activeTab?.canGoForward}
                  title="前进"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16">
                    <path
                      d="M7.5 2.5L13 8l-5.5 5.5L6 12l4-4-4-4 1.5-1.5z"
                      fill="currentColor"
                    />
                  </svg>
                </button>
              </div>

              {/* 标签页渲染器 */}
              <div className="app__tabs">
                <TabRenderer
                  enableReordering={true}
                  enableAnimation={true}
                  animationDuration={200}
                  maxTabs={10}
                  onTabCreate={handleTabCreate}
                  onTabClose={handleTabClose}
                  onTabSwitch={handleTabSwitch}
                />
              </div>
            </div>

            {/* 右侧：设置按钮和窗口控制 */}
            <div className="app__titlebar-right">
              <button
                className="app__settings-button"
                onClick={handleOpenSettings}
                title="设置"
              >
                <svg width="16" height="16" viewBox="0 0 16 16">
                  <path
                    d="M8 10.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z M8 12a4 4 0 100-8 4 4 0 000 8z M8 0a8 8 0 100 16A8 8 0 008 0z"
                    fill="currentColor"
                  />
                </svg>
              </button>
              
              <WindowControls />
            </div>
          </div>
        </div>

        {/* 主内容区域 */}
        <div className="app__content">
          {tabs.length === 0 ? (
            <div className="app__welcome">
              <h1>欢迎使用 JLCONE</h1>
              <p>点击新建标签页开始使用</p>
              <button onClick={() => handleTabCreate('https://pro.jlc.com/user-center/')}>
                打开用户中心
              </button>
            </div>
          ) : (
            <>
              {/* 导航栏 */}
              <NavigationBar 
                showAddressBar={true}
                showRefreshButton={true}
              />
              
              {/* 浏览器视图 */}
              <div className="app__browser-view">
                {/* 浏览器视图将由主进程管理 */}
                <div id="browser-view-container" />
              </div>
              
              {/* 状态栏 */}
              <StatusBar 
                showProgress={true}
                showZoom={true}
                showConnectionStatus={true}
              />
            </>
          )}
        </div>

        {/* 开发信息 */}
        {appState.showDevInfo && (
          <div className="app__dev-info">
            <Suspense fallback={<LoadingSpinner size="small" />}>
              <LazyVersions />
            </Suspense>
            
            <div className="app__dev-stats">
              <p>标签页数量: {tabs.length}</p>
              <p>当前用户: {appState.currentUser || '未登录'}</p>
              <p>活跃标签: {activeTab?.title || '无'}</p>
            </div>
          </div>
        )}

        <style jsx="true">{`
          .app {
            display: flex;
            flex-direction: column;
            height: 100vh;
            background: #fff;
            overflow: hidden;
          }
          
          .app--with-border {
            border: 1px solid #ddd;
          }
          
          .app__titlebar {
            flex-shrink: 0;
            background: #f5f5f5;
            border-bottom: 1px solid #ddd;
            user-select: none;
          }
          
          .app__titlebar-content {
            display: flex;
            align-items: center;
            justify-content: space-between;
            height: 40px;
            padding: 0 8px;
          }
          
          .app__titlebar-left {
            display: flex;
            align-items: center;
            flex: 1;
            min-width: 0;
          }
          
          .app__titlebar-right {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-shrink: 0;
          }
          
          .app__navigation {
            display: flex;
            gap: 4px;
            margin-right: 8px;
          }
          
          .app__nav-button {
            width: 32px;
            height: 32px;
            border: none;
            background: transparent;
            border-radius: 4px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #666;
            transition: all 0.2s ease;
          }
          
          .app__nav-button:hover:not(:disabled) {
            background: rgba(0, 0, 0, 0.1);
            color: #333;
          }
          
          .app__nav-button:disabled {
            opacity: 0.3;
            cursor: not-allowed;
          }
          
          .app__tabs {
            flex: 1;
            min-width: 0;
          }
          
          .app__settings-button {
            width: 32px;
            height: 32px;
            border: none;
            background: transparent;
            border-radius: 4px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #666;
            transition: all 0.2s ease;
          }
          
          .app__settings-button:hover {
            background: rgba(0, 0, 0, 0.1);
            color: #333;
          }
          
          .app__content {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }
          
          .app__welcome {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            gap: 16px;
            color: #666;
          }
          
          .app__welcome h1 {
            margin: 0;
            font-size: 24px;
            color: #333;
          }
          
          .app__welcome button {
            padding: 12px 24px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            transition: background 0.2s ease;
          }
          
          .app__welcome button:hover {
            background: #0056b3;
          }
          
          .app__browser-view {
            flex: 1;
            position: relative;
          }
          
          #browser-view-container {
            width: 100%;
            height: 100%;
          }
          
          .app__dev-info {
            position: fixed;
            bottom: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 12px;
            border-radius: 6px;
            font-size: 12px;
            z-index: 1000;
            max-width: 300px;
          }
          
          .app__dev-stats {
            margin-top: 8px;
          }
          
          .app__dev-stats p {
            margin: 4px 0;
          }
          
          @media (prefers-color-scheme: dark) {
            .app {
              background: #1e1e1e;
              color: #fff;
            }
            
            .app--with-border {
              border-color: #444;
            }
            
            .app__titlebar {
              background: #2d2d2d;
              border-bottom-color: #444;
            }
            
            .app__nav-button,
            .app__settings-button {
              color: #ccc;
            }
            
            .app__nav-button:hover:not(:disabled),
            .app__settings-button:hover {
              background: rgba(255, 255, 255, 0.1);
              color: #fff;
            }
            
            .app__welcome {
              color: #ccc;
            }
            
            .app__welcome h1 {
              color: #fff;
            }
          }
        `}</style>
      </div>
    </ErrorBoundary>
  )
}

export default App
