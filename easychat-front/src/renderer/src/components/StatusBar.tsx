/**
 * 状态栏组件
 * 显示连接状态、加载进度、缩放级别等信息
 */
import React, { useCallback, useEffect, useState } from 'react'
import { useTabManager } from '../hooks/useTabManager'
import { useElectronAPI } from '../hooks/useElectronAPI'

interface StatusBarProps {
  className?: string
  showProgress?: boolean
  showZoom?: boolean
  showConnectionStatus?: boolean
}

interface StatusInfo {
  isOnline: boolean
  loadingProgress: number
  zoomLevel: number
  connectionType: string
  securityState: 'secure' | 'insecure' | 'unknown'
}

export const StatusBar: React.FC<StatusBarProps> = ({
  className = '',
  showProgress = true,
  showZoom = true,
  showConnectionStatus = true,
}) => {
  const { activeTab } = useTabManager()
  const electronAPI = useElectronAPI()

  const [statusInfo, setStatusInfo] = useState<StatusInfo>({
    isOnline: navigator.onLine,
    loadingProgress: 0,
    zoomLevel: 100,
    connectionType: 'unknown',
    securityState: 'unknown',
  })

  const [showZoomControls, setShowZoomControls] = useState(false)

  // 监听网络状态
  useEffect(() => {
    const handleOnline = () => setStatusInfo(prev => ({ ...prev, isOnline: true }))
    const handleOffline = () => setStatusInfo(prev => ({ ...prev, isOnline: false }))

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // 监听标签页状态变化
  useEffect(() => {
    if (!activeTab) return

    const cleanup1 = electronAPI.ipc.on(
      'tab-loading-progress',
      (_, tabId: string, progress: number) => {
        if (tabId === activeTab.id) {
          setStatusInfo(prev => ({ ...prev, loadingProgress: progress }))
        }
      }
    )

    const cleanup2 = electronAPI.ipc.on(
      'tab-zoom-changed',
      (_, tabId: string, zoomLevel: number) => {
        if (tabId === activeTab.id) {
          setStatusInfo(prev => ({ ...prev, zoomLevel: Math.round(zoomLevel * 100) }))
        }
      }
    )

    const cleanup3 = electronAPI.ipc.on(
      'tab-security-changed',
      (_, tabId: string, securityState: string) => {
        if (tabId === activeTab.id) {
          setStatusInfo(prev => ({
            ...prev,
            securityState: securityState as StatusInfo['securityState'],
          }))
        }
      }
    )

    // 获取初始状态
    electronAPI.ipc
      .invoke('get-tab-zoom', activeTab.id)
      .then((zoomLevel: number) => {
        setStatusInfo(prev => ({ ...prev, zoomLevel: Math.round(zoomLevel * 100) }))
      })
      .catch(() => {})

    return () => {
      if (cleanup1) cleanup1()
      if (cleanup2) cleanup2()
      if (cleanup3) cleanup3()
    }
  }, [electronAPI, activeTab?.id])

  // 缩放控制
  const handleZoomIn = useCallback(() => {
    if (activeTab) {
      electronAPI.ipc.send('tab-zoom-in', activeTab.id)
    }
  }, [electronAPI, activeTab])

  const handleZoomOut = useCallback(() => {
    if (activeTab) {
      electronAPI.ipc.send('tab-zoom-out', activeTab.id)
    }
  }, [electronAPI, activeTab])

  const handleZoomReset = useCallback(() => {
    if (activeTab) {
      electronAPI.ipc.send('tab-zoom-reset', activeTab.id)
    }
  }, [electronAPI, activeTab])

  // 获取安全状态图标
  const getSecurityIcon = () => {
    switch (statusInfo.securityState) {
      case 'secure':
        return (
          <svg
            width='14'
            height='14'
            viewBox='0 0 14 14'
            className='status-bar__security-icon status-bar__security-icon--secure'
          >
            <path d='M7 1L3 3v4c0 2.5 2.5 5 4 6 1.5-1 4-3.5 4-6V3L7 1z' fill='currentColor' />
          </svg>
        )
      case 'insecure':
        return (
          <svg
            width='14'
            height='14'
            viewBox='0 0 14 14'
            className='status-bar__security-icon status-bar__security-icon--insecure'
          >
            <path
              d='M7 1L3 3v4c0 2.5 2.5 5 4 6 1.5-1 4-3.5 4-6V3L7 1z'
              fill='none'
              stroke='currentColor'
              strokeWidth='1'
            />
            <path
              d='M5 6L9 10M9 6L5 10'
              stroke='currentColor'
              strokeWidth='1.5'
              strokeLinecap='round'
            />
          </svg>
        )
      default:
        return (
          <svg
            width='14'
            height='14'
            viewBox='0 0 14 14'
            className='status-bar__security-icon status-bar__security-icon--unknown'
          >
            <circle cx='7' cy='7' r='6' fill='none' stroke='currentColor' strokeWidth='1' />
            <path d='M7 5v2M7 9h0' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
          </svg>
        )
    }
  }

  return (
    <div className={`status-bar ${className}`}>
      {/* 连接状态 */}
      {showConnectionStatus ? (
        <div className='status-bar__section status-bar__section--connection'>
          <div
            className={`status-bar__connection ${statusInfo.isOnline ? 'status-bar__connection--online' : 'status-bar__connection--offline'}`}
          >
            <div className='status-bar__connection-dot' />
            <span className='status-bar__connection-text'>
              {statusInfo.isOnline ? '已连接' : '离线'}
            </span>
          </div>

          {activeTab ? <div className='status-bar__security'>{getSecurityIcon()}</div> : null}
        </div>
      ) : null}

      {/* 加载进度 */}
      {showProgress && statusInfo.loadingProgress > 0 && statusInfo.loadingProgress < 100 ? (
        <div className='status-bar__section status-bar__section--progress'>
          <div className='status-bar__progress'>
            <div
              className='status-bar__progress-bar'
              style={{ width: `${statusInfo.loadingProgress}%` }}
            />
          </div>
          <span className='status-bar__progress-text'>{statusInfo.loadingProgress}%</span>
        </div>
      ) : null}

      {/* 页面信息 */}
      {activeTab ? (
        <div className='status-bar__section status-bar__section--page'>
          <span className='status-bar__page-title' title={activeTab.title}>
            {activeTab.title}
          </span>
        </div>
      ) : null}

      {/* 缩放控制 */}
      {showZoom ? (
        <div className='status-bar__section status-bar__section--zoom'>
          <div
            className='status-bar__zoom'
            onMouseEnter={() => setShowZoomControls(true)}
            onMouseLeave={() => setShowZoomControls(false)}
          >
            <span className='status-bar__zoom-level'>{statusInfo.zoomLevel}%</span>

            {showZoomControls ? (
              <div className='status-bar__zoom-controls'>
                <button className='status-bar__zoom-button' onClick={handleZoomOut} title='缩小'>
                  −
                </button>
                <button
                  className='status-bar__zoom-button'
                  onClick={handleZoomReset}
                  title='重置缩放'
                >
                  100%
                </button>
                <button className='status-bar__zoom-button' onClick={handleZoomIn} title='放大'>
                  +
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <style jsx='true'>{`
        .status-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 4px 12px;
          background: #f8f9fa;
          border-top: 1px solid #dee2e6;
          font-size: 12px;
          color: #6c757d;
          min-height: 24px;
        }

        .status-bar__section {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .status-bar__section--connection {
          flex-shrink: 0;
        }

        .status-bar__section--progress {
          flex-shrink: 0;
        }

        .status-bar__section--page {
          flex: 1;
          min-width: 0;
          justify-content: center;
        }

        .status-bar__section--zoom {
          flex-shrink: 0;
        }

        .status-bar__connection {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .status-bar__connection-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #dc3545;
          transition: background 0.2s ease;
        }

        .status-bar__connection--online .status-bar__connection-dot {
          background: #28a745;
        }

        .status-bar__connection-text {
          font-size: 11px;
        }

        .status-bar__security {
          display: flex;
          align-items: center;
        }

        .status-bar__security-icon--secure {
          color: #28a745;
        }

        .status-bar__security-icon--insecure {
          color: #dc3545;
        }

        .status-bar__security-icon--unknown {
          color: #6c757d;
        }

        .status-bar__progress {
          width: 60px;
          height: 3px;
          background: #e9ecef;
          border-radius: 2px;
          overflow: hidden;
        }

        .status-bar__progress-bar {
          height: 100%;
          background: #007bff;
          transition: width 0.2s ease;
        }

        .status-bar__progress-text {
          font-size: 10px;
          min-width: 30px;
          text-align: right;
        }

        .status-bar__page-title {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 300px;
          font-size: 11px;
        }

        .status-bar__zoom {
          position: relative;
          cursor: pointer;
          padding: 2px 6px;
          border-radius: 3px;
          transition: background 0.2s ease;
        }

        .status-bar__zoom:hover {
          background: rgba(0, 0, 0, 0.05);
        }

        .status-bar__zoom-level {
          font-size: 11px;
          user-select: none;
        }

        .status-bar__zoom-controls {
          position: absolute;
          bottom: 100%;
          right: 0;
          display: flex;
          gap: 2px;
          background: #fff;
          border: 1px solid #dee2e6;
          border-radius: 4px;
          padding: 4px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          z-index: 1000;
        }

        .status-bar__zoom-button {
          width: 24px;
          height: 20px;
          border: none;
          background: transparent;
          border-radius: 2px;
          cursor: pointer;
          font-size: 11px;
          color: #495057;
          transition: background 0.2s ease;
        }

        .status-bar__zoom-button:hover {
          background: #e9ecef;
        }

        @media (prefers-color-scheme: dark) {
          .status-bar {
            background: #2d3748;
            border-top-color: #4a5568;
            color: #a0aec0;
          }

          .status-bar__zoom:hover {
            background: rgba(255, 255, 255, 0.1);
          }

          .status-bar__progress {
            background: #4a5568;
          }

          .status-bar__zoom-controls {
            background: #4a5568;
            border-color: #718096;
          }

          .status-bar__zoom-button {
            color: #e2e8f0;
          }

          .status-bar__zoom-button:hover {
            background: #718096;
          }
        }
      `}</style>
    </div>
  )
}
