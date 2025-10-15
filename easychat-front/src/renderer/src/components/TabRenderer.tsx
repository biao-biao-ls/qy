/**
 * 现代化标签页渲染组件
 * 使用 React Hooks 和现代化的拖拽功能
 */
import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useTabManager, TabItem } from '../hooks/useTabManager'
import { LoadingSpinner } from './LoadingSpinner'
import { ErrorBoundary } from './ErrorBoundary'

interface TabRendererProps {
  className?: string
  enableReordering?: boolean
  enableAnimation?: boolean
  animationDuration?: number
  maxTabs?: number
  onTabCreate?: (url: string) => void
  onTabClose?: (tabId: string) => void
  onTabSwitch?: (tabId: string) => void
}

export const TabRenderer: React.FC<TabRendererProps> = ({
  className = '',
  enableReordering = true,
  enableAnimation = true,
  animationDuration = 300,
  maxTabs = 10,
  onTabCreate,
  onTabClose,
  onTabSwitch
}) => {
  const {
    tabs,
    activeTab,
    activeTabId,
    createTab,
    closeTab,
    switchTab,
    reorderTabs,
    getTabLoadingState
  } = useTabManager()

  const [dragState, setDragState] = useState<{
    isDragging: boolean
    dragIndex: number
    dropIndex: number
  }>({
    isDragging: false,
    dragIndex: -1,
    dropIndex: -1
  })

  const tabListRef = useRef<HTMLDivElement>(null)
  const dragDataRef = useRef<{
    startX: number
    startY: number
    dragElement: HTMLElement | null
  }>({
    startX: 0,
    startY: 0,
    dragElement: null
  })

  // 处理标签页点击
  const handleTabClick = useCallback(async (tabId: string) => {
    if (onTabSwitch) {
      onTabSwitch(tabId)
    } else {
      await switchTab(tabId)
    }
  }, [switchTab, onTabSwitch])

  // 处理标签页关闭
  const handleTabClose = useCallback(async (tabId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    
    if (onTabClose) {
      onTabClose(tabId)
    } else {
      await closeTab(tabId)
    }
  }, [closeTab, onTabClose])

  // 处理拖拽开始
  const handleDragStart = useCallback((event: React.DragEvent, tabId: string, index: number) => {
    if (!enableReordering) return

    const target = event.currentTarget as HTMLElement
    dragDataRef.current.dragElement = target
    
    setDragState({
      isDragging: true,
      dragIndex: index,
      dropIndex: -1
    })

    // 设置拖拽数据
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', tabId)
    
    // 添加拖拽样式
    target.classList.add('tab-item--dragging')
  }, [enableReordering])

  // 处理拖拽结束
  const handleDragEnd = useCallback((event: React.DragEvent) => {
    const target = event.currentTarget as HTMLElement
    target.classList.remove('tab-item--dragging')
    
    setDragState({
      isDragging: false,
      dragIndex: -1,
      dropIndex: -1
    })
    
    dragDataRef.current.dragElement = null
  }, [])

  // 处理拖拽悬停
  const handleDragOver = useCallback((event: React.DragEvent, index: number) => {
    if (!enableReordering || !dragState.isDragging) return
    
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    
    if (index !== dragState.dragIndex) {
      setDragState(prev => ({
        ...prev,
        dropIndex: index
      }))
    }
  }, [enableReordering, dragState.isDragging, dragState.dragIndex])

  // 处理拖拽放置
  const handleDrop = useCallback((event: React.DragEvent, dropIndex: number) => {
    if (!enableReordering || !dragState.isDragging) return
    
    event.preventDefault()
    
    const { dragIndex } = dragState
    if (dragIndex !== -1 && dragIndex !== dropIndex) {
      reorderTabs(dragIndex, dropIndex)
    }
    
    setDragState({
      isDragging: false,
      dragIndex: -1,
      dropIndex: -1
    })
  }, [enableReordering, dragState, reorderTabs])

  // 渲染单个标签页
  const renderTab = useCallback((tab: TabItem, index: number) => {
    const isActive = tab.id === activeTabId
    const isLoading = getTabLoadingState(tab.id)
    const isDragTarget = dragState.dropIndex === index
    const isUserCenter = tab.url.includes('/user-center')

    const tabClassName = [
      'tab-item',
      isActive ? 'tab-item--active' : '',
      isLoading ? 'tab-item--loading' : '',
      isUserCenter ? 'tab-item--user-center' : '',
      isDragTarget ? 'tab-item--drop-target' : '',
      enableAnimation ? 'tab-item--animated' : ''
    ].filter(Boolean).join(' ')

    return (
      <div
        key={tab.id}
        className={tabClassName}
        draggable={enableReordering && !isUserCenter}
        onClick={() => handleTabClick(tab.id)}
        onDragStart={(e) => handleDragStart(e, tab.id, index)}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => handleDragOver(e, index)}
        onDrop={(e) => handleDrop(e, index)}
        style={{
          '--animation-duration': enableAnimation ? `${animationDuration}ms` : '0ms',
          width: `${100 / Math.min(tabs.length, maxTabs)}%`
        } as React.CSSProperties}
        title={tab.title}
        data-tab-id={tab.id}
        data-tab-index={index}
      >
        {/* 标签页图标 */}
        <div className="tab-item__icon">
          {isLoading ? (
            <LoadingSpinner size="small" variant="spinner" />
          ) : (
            <div className="tab-item__favicon">
              {tab.favicon ? (
                <img src={tab.favicon} alt="" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"/>
                </svg>
              )}
            </div>
          )}
        </div>

        {/* 标签页标题 */}
        <div className="tab-item__title">
          {tab.title || '新标签页'}
        </div>

        {/* 关闭按钮 */}
        {!isUserCenter && tabs.length > 1 && (
          <button
            className="tab-item__close-button"
            onClick={(e) => handleTabClose(tab.id, e)}
            title="关闭标签页"
          >
            <svg width="12" height="12" viewBox="0 0 12 12">
              <path
                d="M6 4.586L10.293.293a1 1 0 011.414 1.414L7.414 6l4.293 4.293a1 1 0 01-1.414 1.414L6 7.414l-4.293 4.293a1 1 0 01-1.414-1.414L4.586 6 .293 1.707A1 1 0 011.707.293L6 4.586z"
                fill="currentColor"
              />
            </svg>
          </button>
        )}

        {/* 用户中心固定图标 */}
        {isUserCenter && (
          <div className="tab-item__pin-icon" title="固定标签页">
            <svg width="12" height="12" viewBox="0 0 12 12">
              <path
                d="M8 2V1a1 1 0 00-1-1H5a1 1 0 00-1 1v1H2a1 1 0 000 2h1v5a1 1 0 001 1h4a1 1 0 001-1V4h1a1 1 0 000-2H8z"
                fill="currentColor"
              />
            </svg>
          </div>
        )}
      </div>
    )
  }, [
    activeTabId,
    getTabLoadingState,
    dragState,
    enableAnimation,
    animationDuration,
    tabs.length,
    maxTabs,
    enableReordering,
    handleTabClick,
    handleTabClose,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDrop
  ])

  // 处理新建标签页
  const handleCreateTab = useCallback(() => {
    if (tabs.length >= maxTabs) {
      console.warn(`已达到最大标签页数量限制: ${maxTabs}`)
      return
    }

    if (onTabCreate) {
      onTabCreate('about:blank')
    } else {
      createTab({
        url: 'about:blank',
        title: '新标签页',
        isActive: true
      })
    }
  }, [tabs.length, maxTabs, onTabCreate, createTab])

  return (
    <ErrorBoundary
      fallback={
        <div className="tab-renderer-error">
          <p>标签页加载失败</p>
          <button onClick={() => window.location.reload()}>重新加载</button>
        </div>
      }
    >
      <div className={`tab-renderer ${className}`}>
        <div 
          ref={tabListRef}
          className={`tab-list ${dragState.isDragging ? 'tab-list--dragging' : ''}`}
        >
          {tabs.length === 0 ? (
            <div className="tab-list__empty">
              <p>暂无标签页</p>
              <button onClick={handleCreateTab}>创建新标签页</button>
            </div>
          ) : (
            tabs.map((tab, index) => renderTab(tab, index))
          )}
          
          {/* 新建标签页按钮 */}
          {tabs.length > 0 && tabs.length < maxTabs && (
            <button
              className="tab-list__add-button"
              onClick={handleCreateTab}
              title="新建标签页"
            >
              <svg width="16" height="16" viewBox="0 0 16 16">
                <path
                  d="M8 3a1 1 0 011 1v3h3a1 1 0 110 2H9v3a1 1 0 11-2 0V9H4a1 1 0 110-2h3V4a1 1 0 011-1z"
                  fill="currentColor"
                />
              </svg>
            </button>
          )}
        </div>

        <style jsx="true">{`
          .tab-renderer {
            display: flex;
            flex-direction: column;
            height: 100%;
          }
          
          .tab-list {
            display: flex;
            align-items: center;
            background: #f5f5f5;
            border-bottom: 1px solid #ddd;
            min-height: 40px;
            overflow-x: auto;
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          
          .tab-list::-webkit-scrollbar {
            display: none;
          }
          
          .tab-list--dragging {
            user-select: none;
          }
          
          .tab-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            min-width: 120px;
            max-width: 200px;
            background: #e9e9e9;
            border: 1px solid #ddd;
            border-bottom: none;
            cursor: pointer;
            position: relative;
            transition: all 0.2s ease;
          }
          
          .tab-item--animated {
            transition: all var(--animation-duration) ease;
          }
          
          .tab-item:hover {
            background: #f0f0f0;
          }
          
          .tab-item--active {
            background: #fff;
            border-bottom: 2px solid #007bff;
          }
          
          .tab-item--loading {
            opacity: 0.7;
          }
          
          .tab-item--user-center {
            background: #e3f2fd;
            border-color: #2196f3;
          }
          
          .tab-item--dragging {
            opacity: 0.5;
            transform: rotate(5deg);
          }
          
          .tab-item--drop-target {
            border-left: 3px solid #007bff;
          }
          
          .tab-item__icon {
            flex-shrink: 0;
            width: 16px;
            height: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .tab-item__favicon img {
            width: 16px;
            height: 16px;
            border-radius: 2px;
          }
          
          .tab-item__title {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-size: 13px;
            color: #333;
          }
          
          .tab-item--active .tab-item__title {
            color: #000;
            font-weight: 500;
          }
          
          .tab-item__close-button {
            flex-shrink: 0;
            width: 20px;
            height: 20px;
            border: none;
            background: transparent;
            border-radius: 3px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: all 0.2s ease;
          }
          
          .tab-item:hover .tab-item__close-button {
            opacity: 1;
          }
          
          .tab-item__close-button:hover {
            background: rgba(0, 0, 0, 0.1);
          }
          
          .tab-item__pin-icon {
            flex-shrink: 0;
            width: 16px;
            height: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #2196f3;
          }
          
          .tab-list__empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 12px;
            padding: 20px;
            color: #666;
            font-size: 14px;
          }
          
          .tab-list__empty button {
            padding: 8px 16px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
          }
          
          .tab-list__add-button {
            flex-shrink: 0;
            width: 32px;
            height: 32px;
            margin: 4px 8px;
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
          
          .tab-list__add-button:hover {
            background: rgba(0, 0, 0, 0.1);
            color: #333;
          }
          
          .tab-renderer-error {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 12px;
            padding: 20px;
            color: #d32f2f;
            font-size: 14px;
          }
          
          .tab-renderer-error button {
            padding: 8px 16px;
            background: #d32f2f;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
          }
          
          @media (prefers-color-scheme: dark) {
            .tab-list {
              background: #2d2d2d;
              border-bottom-color: #444;
            }
            
            .tab-item {
              background: #3d3d3d;
              border-color: #444;
              color: #fff;
            }
            
            .tab-item:hover {
              background: #4d4d4d;
            }
            
            .tab-item--active {
              background: #1e1e1e;
            }
            
            .tab-item__title {
              color: #ccc;
            }
            
            .tab-item--active .tab-item__title {
              color: #fff;
            }
            
            .tab-list__empty {
              color: #ccc;
            }
            
            .tab-list__add-button {
              color: #ccc;
            }
            
            .tab-list__add-button:hover {
              background: rgba(255, 255, 255, 0.1);
              color: #fff;
            }
          }
        `}</style>
      </div>
    </ErrorBoundary>
  )
}