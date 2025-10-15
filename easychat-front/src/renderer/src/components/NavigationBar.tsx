/**
 * 导航栏组件
 * 提供历史导航、刷新、地址栏等功能
 */
import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useTabManager } from '../hooks/useTabManager'
import { useElectronAPI } from '../hooks/useElectronAPI'
import { LoadingSpinner } from './LoadingSpinner'

interface NavigationBarProps {
  className?: string
  showAddressBar?: boolean
  showRefreshButton?: boolean
}

export const NavigationBar: React.FC<NavigationBarProps> = ({
  className = '',
  showAddressBar = true,
  showRefreshButton = true
}) => {
  const { activeTab, getTabLoadingState } = useTabManager()
  const electronAPI = useElectronAPI()
  const [addressValue, setAddressValue] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const addressInputRef = useRef<HTMLInputElement>(null)

  // 同步地址栏值
  useEffect(() => {
    if (activeTab && !isEditing) {
      setAddressValue(activeTab.url)
    }
  }, [activeTab?.url, isEditing])

  // 处理历史导航
  const handleHistoryBack = useCallback(() => {
    if (activeTab?.canGoBack) {
      electronAPI.ipc.send('tab-history-back', activeTab.id)
    }
  }, [electronAPI, activeTab])

  const handleHistoryForward = useCallback(() => {
    if (activeTab?.canGoForward) {
      electronAPI.ipc.send('tab-history-forward', activeTab.id)
    }
  }, [electronAPI, activeTab])

  // 处理刷新
  const handleRefresh = useCallback(() => {
    if (activeTab) {
      electronAPI.ipc.send('tab-reload', activeTab.id)
    }
  }, [electronAPI, activeTab])

  // 处理地址栏
  const handleAddressSubmit = useCallback((event: React.FormEvent) => {
    event.preventDefault()
    
    if (!activeTab || !addressValue.trim()) return

    let url = addressValue.trim()
    
    // 简单的 URL 验证和补全
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('file://')) {
      if (url.includes('.') && !url.includes(' ')) {
        url = `https://${url}`
      } else {
        // 作为搜索查询处理
        url = `https://www.google.com/search?q=${encodeURIComponent(url)}`
      }
    }

    electronAPI.ipc.send('tab-navigate', activeTab.id, url)
    setIsEditing(false)
    addressInputRef.current?.blur()
  }, [electronAPI, activeTab, addressValue])

  const handleAddressFocus = useCallback(() => {
    setIsEditing(true)
    // 选中所有文本
    setTimeout(() => {
      addressInputRef.current?.select()
    }, 0)
  }, [])

  const handleAddressBlur = useCallback(() => {
    setIsEditing(false)
    // 恢复到当前标签页的 URL
    if (activeTab) {
      setAddressValue(activeTab.url)
    }
  }, [activeTab])

  const handleAddressKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsEditing(false)
      if (activeTab) {
        setAddressValue(activeTab.url)
      }
      addressInputRef.current?.blur()
    }
  }, [activeTab])

  const isLoading = activeTab ? getTabLoadingState(activeTab.id) : false

  return (
    <div className={`navigation-bar ${className}`}>
      {/* 历史导航按钮 */}
      <div className="navigation-bar__history">
        <button
          className="navigation-bar__button navigation-bar__button--back"
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
          className="navigation-bar__button navigation-bar__button--forward"
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

      {/* 刷新按钮 */}
      {showRefreshButton && (
        <div className="navigation-bar__refresh">
          <button
            className="navigation-bar__button navigation-bar__button--refresh"
            onClick={handleRefresh}
            disabled={!activeTab}
            title={isLoading ? "停止加载" : "刷新"}
          >
            {isLoading ? (
              <LoadingSpinner size="small" variant="spinner" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16">
                <path
                  d="M8 2a6 6 0 016 6h-2a4 4 0 00-4-4V2zM2 8a6 6 0 016-6v2a4 4 0 00-4 4H2z"
                  fill="currentColor"
                />
              </svg>
            )}
          </button>
        </div>
      )}

      {/* 地址栏 */}
      {showAddressBar && (
        <div className="navigation-bar__address">
          <form onSubmit={handleAddressSubmit}>
            <div className="navigation-bar__address-container">
              {/* 安全指示器 */}
              <div className="navigation-bar__security">
                {activeTab?.url.startsWith('https://') ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" className="navigation-bar__security-icon navigation-bar__security-icon--secure">
                    <path
                      d="M7 1L3 3v4c0 2.5 2.5 5 4 6 1.5-1 4-3.5 4-6V3L7 1z"
                      fill="currentColor"
                    />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 14 14" className="navigation-bar__security-icon navigation-bar__security-icon--info">
                    <circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" strokeWidth="1"/>
                    <path d="M7 5v4M7 3h0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                )}
              </div>

              {/* 地址输入框 */}
              <input
                ref={addressInputRef}
                type="text"
                className="navigation-bar__address-input"
                value={addressValue}
                onChange={(e) => setAddressValue(e.target.value)}
                onFocus={handleAddressFocus}
                onBlur={handleAddressBlur}
                onKeyDown={handleAddressKeyDown}
                placeholder="输入网址或搜索内容"
                spellCheck={false}
              />

              {/* 加载指示器 */}
              {isLoading && (
                <div className="navigation-bar__loading">
                  <LoadingSpinner size="small" variant="spinner" />
                </div>
              )}
            </div>
          </form>
        </div>
      )}

      <style jsx>{`
        .navigation-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: #f8f9fa;
          border-bottom: 1px solid #dee2e6;
          min-height: 48px;
        }
        
        .navigation-bar__history {
          display: flex;
          gap: 2px;
        }
        
        .navigation-bar__refresh {
          display: flex;
        }
        
        .navigation-bar__button {
          width: 32px;
          height: 32px;
          border: none;
          background: transparent;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #495057;
          transition: all 0.2s ease;
        }
        
        .navigation-bar__button:hover:not(:disabled) {
          background: rgba(0, 0, 0, 0.05);
          color: #212529;
        }
        
        .navigation-bar__button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        
        .navigation-bar__address {
          flex: 1;
          min-width: 0;
        }
        
        .navigation-bar__address form {
          width: 100%;
        }
        
        .navigation-bar__address-container {
          display: flex;
          align-items: center;
          background: #fff;
          border: 1px solid #ced4da;
          border-radius: 6px;
          padding: 0 12px;
          height: 32px;
          transition: all 0.2s ease;
        }
        
        .navigation-bar__address-container:focus-within {
          border-color: #007bff;
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
        }
        
        .navigation-bar__security {
          display: flex;
          align-items: center;
          margin-right: 8px;
        }
        
        .navigation-bar__security-icon {
          flex-shrink: 0;
        }
        
        .navigation-bar__security-icon--secure {
          color: #28a745;
        }
        
        .navigation-bar__security-icon--info {
          color: #6c757d;
        }
        
        .navigation-bar__address-input {
          flex: 1;
          border: none;
          outline: none;
          font-size: 14px;
          color: #212529;
          background: transparent;
          min-width: 0;
        }
        
        .navigation-bar__address-input::placeholder {
          color: #6c757d;
        }
        
        .navigation-bar__loading {
          display: flex;
          align-items: center;
          margin-left: 8px;
        }
        
        @media (prefers-color-scheme: dark) {
          .navigation-bar {
            background: #2d3748;
            border-bottom-color: #4a5568;
          }
          
          .navigation-bar__button {
            color: #e2e8f0;
          }
          
          .navigation-bar__button:hover:not(:disabled) {
            background: rgba(255, 255, 255, 0.1);
            color: #f7fafc;
          }
          
          .navigation-bar__address-container {
            background: #4a5568;
            border-color: #718096;
          }
          
          .navigation-bar__address-container:focus-within {
            border-color: #63b3ed;
            box-shadow: 0 0 0 2px rgba(99, 179, 237, 0.25);
          }
          
          .navigation-bar__address-input {
            color: #f7fafc;
          }
          
          .navigation-bar__address-input::placeholder {
            color: #a0aec0;
          }
          
          .navigation-bar__security-icon--info {
            color: #a0aec0;
          }
        }
      `}</style>
    </div>
  )
}