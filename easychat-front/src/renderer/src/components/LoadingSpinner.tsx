/**
 * 加载动画组件
 * 提供各种样式的加载指示器
 */
import React from 'react'

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large'
  variant?: 'spinner' | 'dots' | 'pulse' | 'bars'
  color?: string
  className?: string
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  variant = 'spinner',
  color = 'currentColor',
  className = ''
}) => {
  const sizeMap = {
    small: 16,
    medium: 24,
    large: 32
  }

  const spinnerSize = sizeMap[size]

  const renderSpinner = () => {
    switch (variant) {
      case 'dots':
        return (
          <div className={`loading-dots ${className}`}>
            <div className="loading-dots__dot" />
            <div className="loading-dots__dot" />
            <div className="loading-dots__dot" />
            <style jsx>{`
              .loading-dots {
                display: flex;
                gap: 4px;
                align-items: center;
              }
              
              .loading-dots__dot {
                width: ${spinnerSize / 3}px;
                height: ${spinnerSize / 3}px;
                background: ${color};
                border-radius: 50%;
                animation: loading-dots 1.4s ease-in-out infinite both;
              }
              
              .loading-dots__dot:nth-child(1) {
                animation-delay: -0.32s;
              }
              
              .loading-dots__dot:nth-child(2) {
                animation-delay: -0.16s;
              }
              
              @keyframes loading-dots {
                0%, 80%, 100% {
                  transform: scale(0);
                  opacity: 0.5;
                }
                40% {
                  transform: scale(1);
                  opacity: 1;
                }
              }
            `}</style>
          </div>
        )

      case 'pulse':
        return (
          <div className={`loading-pulse ${className}`}>
            <style jsx>{`
              .loading-pulse {
                width: ${spinnerSize}px;
                height: ${spinnerSize}px;
                background: ${color};
                border-radius: 50%;
                animation: loading-pulse 1.5s ease-in-out infinite;
              }
              
              @keyframes loading-pulse {
                0% {
                  transform: scale(0);
                  opacity: 1;
                }
                100% {
                  transform: scale(1);
                  opacity: 0;
                }
              }
            `}</style>
          </div>
        )

      case 'bars':
        return (
          <div className={`loading-bars ${className}`}>
            <div className="loading-bars__bar" />
            <div className="loading-bars__bar" />
            <div className="loading-bars__bar" />
            <div className="loading-bars__bar" />
            <style jsx>{`
              .loading-bars {
                display: flex;
                gap: 2px;
                align-items: center;
                height: ${spinnerSize}px;
              }
              
              .loading-bars__bar {
                width: ${spinnerSize / 6}px;
                background: ${color};
                animation: loading-bars 1.2s infinite ease-in-out;
              }
              
              .loading-bars__bar:nth-child(1) {
                animation-delay: -1.1s;
              }
              
              .loading-bars__bar:nth-child(2) {
                animation-delay: -1.0s;
              }
              
              .loading-bars__bar:nth-child(3) {
                animation-delay: -0.9s;
              }
              
              .loading-bars__bar:nth-child(4) {
                animation-delay: -0.8s;
              }
              
              @keyframes loading-bars {
                0%, 40%, 100% {
                  height: ${spinnerSize / 4}px;
                }
                20% {
                  height: ${spinnerSize}px;
                }
              }
            `}</style>
          </div>
        )

      default: // spinner
        return (
          <div className={`loading-spinner ${className}`}>
            <svg
              width={spinnerSize}
              height={spinnerSize}
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="31.416"
                strokeDashoffset="31.416"
              >
                <animate
                  attributeName="stroke-dasharray"
                  dur="2s"
                  values="0 31.416;15.708 15.708;0 31.416;0 31.416"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="stroke-dashoffset"
                  dur="2s"
                  values="0;-15.708;-31.416;-31.416"
                  repeatCount="indefinite"
                />
              </circle>
            </svg>
          </div>
        )
    }
  }

  return renderSpinner()
}

/**
 * 全屏加载组件
 */
interface FullScreenLoadingProps {
  message?: string
  variant?: LoadingSpinnerProps['variant']
}

export const FullScreenLoading: React.FC<FullScreenLoadingProps> = ({
  message = '加载中...',
  variant = 'spinner'
}) => {
  return (
    <div className="fullscreen-loading">
      <div className="fullscreen-loading__content">
        <LoadingSpinner size="large" variant={variant} />
        {message && (
          <p className="fullscreen-loading__message">{message}</p>
        )}
      </div>
      
      <style jsx>{`
        .fullscreen-loading {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255, 255, 255, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }
        
        .fullscreen-loading__content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }
        
        .fullscreen-loading__message {
          margin: 0;
          color: #666;
          font-size: 14px;
        }
        
        @media (prefers-color-scheme: dark) {
          .fullscreen-loading {
            background: rgba(0, 0, 0, 0.9);
          }
          
          .fullscreen-loading__message {
            color: #ccc;
          }
        }
      `}</style>
    </div>
  )
}

/**
 * 按钮加载状态组件
 */
interface ButtonLoadingProps {
  loading: boolean
  children: React.ReactNode
  disabled?: boolean
  className?: string
  onClick?: () => void
}

export const ButtonLoading: React.FC<ButtonLoadingProps> = ({
  loading,
  children,
  disabled,
  className = '',
  onClick
}) => {
  return (
    <button
      className={`button-loading ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading && (
        <LoadingSpinner size="small" variant="spinner" className="button-loading__spinner" />
      )}
      <span className={loading ? 'button-loading__text--hidden' : ''}>
        {children}
      </span>
      
      <style jsx>{`
        .button-loading {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        
        .button-loading__text--hidden {
          opacity: 0;
        }
        
        .button-loading :global(.button-loading__spinner) {
          position: absolute;
        }
      `}</style>
    </button>
  )
}