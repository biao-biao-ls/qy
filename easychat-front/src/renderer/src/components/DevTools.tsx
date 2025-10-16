/**
 * 开发者工具组件
 * 提供开发者工具的控制界面
 */
import React, { useEffect, useState } from 'react'

interface DevToolsProps {
  className?: string
}

export const DevTools: React.FC<DevToolsProps> = ({ className = '' }) => {
  const [isDevToolsOpened, setIsDevToolsOpened] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // 检查开发者工具状态
  const checkDevToolsStatus = async () => {
    try {
      const result = await window.electronAPI?.dev?.isDevToolsOpened()
      setIsDevToolsOpened(result?.isOpened || false)
    } catch (error) {
      console.error('检查开发者工具状态失败:', error)
    }
  }

  // 切换开发者工具
  const toggleDevTools = async () => {
    if (isLoading) return

    setIsLoading(true)
    try {
      const result = await window.electronAPI?.dev?.toggleDevTools()
      if (result?.success) {
        setIsDevToolsOpened(result.action === 'opened')
      }
    } catch (error) {
      console.error('切换开发者工具失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 打开开发者工具
  const openDevTools = async () => {
    if (isLoading) return

    setIsLoading(true)
    try {
      await window.electronAPI?.dev?.openDevTools()
      setIsDevToolsOpened(true)
    } catch (error) {
      console.error('打开开发者工具失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 关闭开发者工具
  const closeDevTools = async () => {
    if (isLoading) return

    setIsLoading(true)
    try {
      await window.electronAPI?.dev?.closeDevTools()
      setIsDevToolsOpened(false)
    } catch (error) {
      console.error('关闭开发者工具失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 键盘快捷键处理
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // F12 快捷键
      if (event.key === 'F12') {
        event.preventDefault()
        toggleDevTools()
      }
      // Ctrl+Shift+I (Windows/Linux) 或 Cmd+Option+I (macOS)
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'I') {
        event.preventDefault()
        toggleDevTools()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // 组件挂载时检查状态
  useEffect(() => {
    checkDevToolsStatus()
  }, [])

  // 如果不是开发环境或没有 API，不显示组件
  if (!window.electronAPI?.dev) {
    return null
  }

  return (
    <div className={`dev-tools ${className}`}>
      <div className='dev-tools__controls'>
        <button
          className={`dev-tools__button ${isDevToolsOpened ? 'dev-tools__button--active' : ''}`}
          onClick={toggleDevTools}
          disabled={isLoading}
          title='切换开发者工具 (F12)'
        >
          {isLoading ? '...' : isDevToolsOpened ? '关闭调试' : '打开调试'}
        </button>

        <button
          className='dev-tools__button dev-tools__button--secondary'
          onClick={openDevTools}
          disabled={isLoading || isDevToolsOpened}
          title='打开开发者工具'
        >
          打开
        </button>

        <button
          className='dev-tools__button dev-tools__button--secondary'
          onClick={closeDevTools}
          disabled={isLoading || !isDevToolsOpened}
          title='关闭开发者工具'
        >
          关闭
        </button>
      </div>

      <div className='dev-tools__status'>状态: {isDevToolsOpened ? '已打开' : '已关闭'}</div>

      <div className='dev-tools__shortcuts'>快捷键: F12 或 Ctrl+Shift+I</div>

      <style jsx='true'>{`
        .dev-tools {
          padding: 12px;
          background: rgba(0, 0, 0, 0.05);
          border-radius: 6px;
          border: 1px solid rgba(0, 0, 0, 0.1);
          font-size: 12px;
        }

        .dev-tools__controls {
          display: flex;
          gap: 8px;
          margin-bottom: 8px;
        }

        .dev-tools__button {
          padding: 6px 12px;
          border: 1px solid #ccc;
          border-radius: 4px;
          background: white;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s;
        }

        .dev-tools__button:hover:not(:disabled) {
          background: #f5f5f5;
          border-color: #999;
        }

        .dev-tools__button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .dev-tools__button--active {
          background: #007acc;
          color: white;
          border-color: #007acc;
        }

        .dev-tools__button--secondary {
          background: #f8f9fa;
          border-color: #dee2e6;
        }

        .dev-tools__status {
          color: #666;
          margin-bottom: 4px;
        }

        .dev-tools__shortcuts {
          color: #888;
          font-size: 11px;
        }

        @media (prefers-color-scheme: dark) {
          .dev-tools {
            background: rgba(255, 255, 255, 0.05);
            border-color: rgba(255, 255, 255, 0.1);
          }

          .dev-tools__button {
            background: #333;
            color: white;
            border-color: #555;
          }

          .dev-tools__button:hover:not(:disabled) {
            background: #444;
            border-color: #666;
          }

          .dev-tools__button--secondary {
            background: #2a2a2a;
            border-color: #444;
          }

          .dev-tools__status {
            color: #ccc;
          }

          .dev-tools__shortcuts {
            color: #999;
          }
        }
      `}</style>
    </div>
  )
}

export default DevTools
