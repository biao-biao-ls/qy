/**
 * 版本信息组件
 * 显示 Electron、Chromium、Node.js 等版本信息
 */
import React, { useState, useEffect } from 'react'
import { useElectronAPI } from '../hooks/useElectronAPI'

interface VersionInfo {
  electron: string
  chrome: string
  node: string
  v8?: string
  os?: string
  arch?: string
}

const Versions: React.FC = () => {
  const [versions, setVersions] = useState<VersionInfo | null>(null)
  const [appVersion, setAppVersion] = useState<string>('')
  const [isExpanded, setIsExpanded] = useState(false)
  const electronAPI = useElectronAPI()

  useEffect(() => {
    // 获取基础版本信息
    const electronVersions = (window as any).electron?.process?.versions
    if (electronVersions) {
      setVersions({
        electron: electronVersions.electron,
        chrome: electronVersions.chrome,
        node: electronVersions.node,
        v8: electronVersions.v8,
        os: (window as any).electron?.process?.platform || 'unknown',
        arch: (window as any).electron?.process?.arch || 'unknown'
      })
    }

    // 获取应用版本
    electronAPI.ipc.invoke('get-app-version')
      .then((version: string) => {
        setAppVersion(version)
      })
      .catch((error) => {
        console.warn('Failed to get app version:', error)
      })
  }, [electronAPI])

  if (!versions) {
    return (
      <div className="versions versions--loading">
        <p>加载版本信息...</p>
      </div>
    )
  }

  return (
    <div className="versions">
      <div className="versions__header" onClick={() => setIsExpanded(!isExpanded)}>
        <h4 className="versions__title">
          版本信息
          <span className="versions__toggle">
            {isExpanded ? '▼' : '▶'}
          </span>
        </h4>
      </div>
      
      {isExpanded && (
        <div className="versions__content">
          <ul className="versions__list">
            {appVersion && (
              <li className="versions__item versions__item--app">
                <span className="versions__label">JLCONE</span>
                <span className="versions__value">v{appVersion}</span>
              </li>
            )}
            
            <li className="versions__item versions__item--electron">
              <span className="versions__label">Electron</span>
              <span className="versions__value">v{versions.electron}</span>
            </li>
            
            <li className="versions__item versions__item--chrome">
              <span className="versions__label">Chromium</span>
              <span className="versions__value">v{versions.chrome}</span>
            </li>
            
            <li className="versions__item versions__item--node">
              <span className="versions__label">Node.js</span>
              <span className="versions__value">v{versions.node}</span>
            </li>
            
            {versions.v8 && (
              <li className="versions__item versions__item--v8">
                <span className="versions__label">V8</span>
                <span className="versions__value">v{versions.v8}</span>
              </li>
            )}
            
            {versions.os && (
              <li className="versions__item versions__item--os">
                <span className="versions__label">平台</span>
                <span className="versions__value">{versions.os} ({versions.arch})</span>
              </li>
            )}
          </ul>
          
          <div className="versions__actions">
            <button
              className="versions__button"
              onClick={() => {
                const versionText = [
                  `JLCONE: ${appVersion}`,
                  `Electron: ${versions.electron}`,
                  `Chromium: ${versions.chrome}`,
                  `Node.js: ${versions.node}`,
                  versions.v8 ? `V8: ${versions.v8}` : '',
                  `Platform: ${versions.os} (${versions.arch})`
                ].filter(Boolean).join('\n')
                
                navigator.clipboard.writeText(versionText)
                  .then(() => {
                    // 可以添加一个临时的成功提示
                    console.log('版本信息已复制到剪贴板')
                  })
                  .catch((error) => {
                    console.error('复制失败:', error)
                  })
              }}
            >
              复制版本信息
            </button>
          </div>
        </div>
      )}
      
      <style jsx="true">{`
        .versions {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 6px;
          overflow: hidden;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        .versions--loading {
          padding: 12px;
          text-align: center;
          color: #666;
          font-size: 12px;
        }
        
        .versions__header {
          padding: 8px 12px;
          cursor: pointer;
          user-select: none;
          transition: background 0.2s ease;
        }
        
        .versions__header:hover {
          background: rgba(0, 0, 0, 0.05);
        }
        
        .versions__title {
          margin: 0;
          font-size: 13px;
          font-weight: 500;
          color: #333;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        .versions__toggle {
          font-size: 10px;
          color: #666;
          transition: transform 0.2s ease;
        }
        
        .versions__content {
          border-top: 1px solid rgba(0, 0, 0, 0.1);
          padding: 12px;
        }
        
        .versions__list {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        
        .versions__item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px 0;
          font-size: 11px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }
        
        .versions__item:last-child {
          border-bottom: none;
        }
        
        .versions__label {
          font-weight: 500;
          color: #555;
        }
        
        .versions__value {
          font-family: 'Consolas', 'Monaco', monospace;
          color: #333;
          background: rgba(0, 0, 0, 0.05);
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 10px;
        }
        
        .versions__item--app .versions__value {
          background: #e3f2fd;
          color: #1976d2;
        }
        
        .versions__item--electron .versions__value {
          background: #f3e5f5;
          color: #7b1fa2;
        }
        
        .versions__item--chrome .versions__value {
          background: #fff3e0;
          color: #f57c00;
        }
        
        .versions__item--node .versions__value {
          background: #e8f5e8;
          color: #388e3c;
        }
        
        .versions__actions {
          margin-top: 12px;
          padding-top: 8px;
          border-top: 1px solid rgba(0, 0, 0, 0.1);
        }
        
        .versions__button {
          width: 100%;
          padding: 6px 12px;
          background: #f5f5f5;
          border: 1px solid #ddd;
          border-radius: 4px;
          cursor: pointer;
          font-size: 11px;
          color: #333;
          transition: all 0.2s ease;
        }
        
        .versions__button:hover {
          background: #e9e9e9;
          border-color: #ccc;
        }
        
        .versions__button:active {
          background: #ddd;
        }
        
        @media (prefers-color-scheme: dark) {
          .versions {
            background: rgba(255, 255, 255, 0.05);
          }
          
          .versions__header:hover {
            background: rgba(255, 255, 255, 0.05);
          }
          
          .versions__title {
            color: #fff;
          }
          
          .versions__toggle {
            color: #ccc;
          }
          
          .versions__content {
            border-top-color: rgba(255, 255, 255, 0.1);
          }
          
          .versions__item {
            border-bottom-color: rgba(255, 255, 255, 0.05);
          }
          
          .versions__label {
            color: #ccc;
          }
          
          .versions__value {
            background: rgba(255, 255, 255, 0.1);
            color: #fff;
          }
          
          .versions__actions {
            border-top-color: rgba(255, 255, 255, 0.1);
          }
          
          .versions__button {
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.2);
            color: #fff;
          }
          
          .versions__button:hover {
            background: rgba(255, 255, 255, 0.15);
            border-color: rgba(255, 255, 255, 0.3);
          }
        }
      `}</style>
    </div>
  )
}

export default Versions
