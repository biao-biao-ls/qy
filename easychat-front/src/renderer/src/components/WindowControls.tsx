/**
 * 窗口控制按钮组件
 * 提供最小化、最大化、关闭等窗口操作按钮
 */
import React from 'react'
import { useWindowState } from '../hooks/useWindowState'

interface WindowControlsProps {
  className?: string
  showMinimize?: boolean
  showMaximize?: boolean
  showClose?: boolean
  onMinimize?: () => void
  onMaximize?: () => void
  onClose?: () => void
}

export const WindowControls: React.FC<WindowControlsProps> = ({
  className = '',
  showMinimize = true,
  showMaximize = true,
  showClose = true,
  onMinimize,
  onMaximize,
  onClose
}) => {
  const { windowState, minimize, maximize, close } = useWindowState()

  const handleMinimize = () => {
    if (onMinimize) {
      onMinimize()
    } else {
      minimize()
    }
  }

  const handleMaximize = () => {
    if (onMaximize) {
      onMaximize()
    } else {
      maximize()
    }
  }

  const handleClose = () => {
    if (onClose) {
      onClose()
    } else {
      close()
    }
  }

  // macOS 样式的窗口控制按钮
  if (windowState.isDarwin) {
    return (
      <div className={`window-controls window-controls--darwin ${className}`}>
        {showClose && (
          <button
            className="window-controls__button window-controls__button--close"
            onClick={handleClose}
            title="关闭"
          >
            <svg width="12" height="12" viewBox="0 0 12 12">
              <path
                d="M6 4.586L10.293.293a1 1 0 011.414 1.414L7.414 6l4.293 4.293a1 1 0 01-1.414 1.414L6 7.414l-4.293 4.293a1 1 0 01-1.414-1.414L4.586 6 .293 1.707A1 1 0 011.707.293L6 4.586z"
                fill="currentColor"
              />
            </svg>
          </button>
        )}
        
        {showMinimize && (
          <button
            className="window-controls__button window-controls__button--minimize"
            onClick={handleMinimize}
            title="最小化"
          >
            <svg width="12" height="12" viewBox="0 0 12 12">
              <path
                d="M2 6h8a1 1 0 010 2H2a1 1 0 010-2z"
                fill="currentColor"
              />
            </svg>
          </button>
        )}
        
        {showMaximize && (
          <button
            className="window-controls__button window-controls__button--maximize"
            onClick={handleMaximize}
            title={windowState.isMaximized ? "还原" : "最大化"}
          >
            {windowState.isMaximized ? (
              <svg width="12" height="12" viewBox="0 0 12 12">
                <path
                  d="M3 3h6v6H3V3zm1 1v4h4V4H4z"
                  fill="currentColor"
                />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 12 12">
                <path
                  d="M2 2h8v8H2V2zm1 1v6h6V3H3z"
                  fill="currentColor"
                />
              </svg>
            )}
          </button>
        )}
        
        <style jsx>{`
          .window-controls--darwin {
            display: flex;
            gap: 8px;
            padding: 8px 12px;
          }
          
          .window-controls--darwin .window-controls__button {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0;
            transition: opacity 0.2s ease;
          }
          
          .window-controls--darwin .window-controls__button svg {
            opacity: 0;
            transition: opacity 0.2s ease;
          }
          
          .window-controls--darwin:hover .window-controls__button svg {
            opacity: 1;
          }
          
          .window-controls__button--close {
            background: #ff5f57;
          }
          
          .window-controls__button--minimize {
            background: #ffbd2e;
          }
          
          .window-controls__button--maximize {
            background: #28ca42;
          }
        `}</style>
      </div>
    )
  }

  // Windows/Linux 样式的窗口控制按钮
  return (
    <div className={`window-controls window-controls--windows ${className}`}>
      {showMinimize && (
        <button
          className="window-controls__button window-controls__button--minimize"
          onClick={handleMinimize}
          title="最小化"
        >
          <svg width="16" height="16" viewBox="0 0 16 16">
            <path
              d="M4 8h8v1H4V8z"
              fill="currentColor"
            />
          </svg>
        </button>
      )}
      
      {showMaximize && (
        <button
          className="window-controls__button window-controls__button--maximize"
          onClick={handleMaximize}
          title={windowState.isMaximized ? "还原" : "最大化"}
        >
          {windowState.isMaximized ? (
            <svg width="16" height="16" viewBox="0 0 16 16">
              <path
                d="M3 5v8h8V5H3zm1 1h6v6H4V6z M5 3h8v8h-1V4H5V3z"
                fill="currentColor"
              />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16">
              <path
                d="M3 3v10h10V3H3zm1 1h8v8H4V4z"
                fill="currentColor"
              />
            </svg>
          )}
        </button>
      )}
      
      {showClose && (
        <button
          className="window-controls__button window-controls__button--close"
          onClick={handleClose}
          title="关闭"
        >
          <svg width="16" height="16" viewBox="0 0 16 16">
            <path
              d="M8 6.586L11.293 3.293a1 1 0 011.414 1.414L9.414 8l3.293 3.293a1 1 0 01-1.414 1.414L8 9.414l-3.293 3.293a1 1 0 01-1.414-1.414L6.586 8 3.293 4.707a1 1 0 011.414-1.414L8 6.586z"
              fill="currentColor"
            />
          </svg>
        </button>
      )}
      
      <style jsx>{`
        .window-controls--windows {
          display: flex;
          height: 32px;
        }
        
        .window-controls--windows .window-controls__button {
          width: 46px;
          height: 32px;
          border: none;
          background: transparent;
          color: #000;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s ease;
        }
        
        .window-controls--windows .window-controls__button:hover {
          background: rgba(0, 0, 0, 0.1);
        }
        
        .window-controls--windows .window-controls__button--close:hover {
          background: #e81123;
          color: white;
        }
        
        @media (prefers-color-scheme: dark) {
          .window-controls--windows .window-controls__button {
            color: #fff;
          }
          
          .window-controls--windows .window-controls__button:hover {
            background: rgba(255, 255, 255, 0.1);
          }
        }
      `}</style>
    </div>
  )
}