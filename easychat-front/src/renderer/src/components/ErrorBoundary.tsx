/**
 * 错误边界组件
 * 用于捕获和处理 React 组件中的错误
 */
import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    // 更新 state 使下一次渲染能够显示降级后的 UI
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 记录错误信息
    console.error('ErrorBoundary 捕获到错误:', error, errorInfo)
    this.setState({ error, errorInfo })
    
    // 调用外部错误处理函数
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      // 自定义降级 UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="error-boundary">
          <div className="error-boundary__content">
            <h3 className="error-boundary__title">出现了一个错误</h3>
            <p className="error-boundary__message">
              抱歉，应用遇到了一个意外错误。您可以尝试重新加载或联系技术支持。
            </p>
            
            <details className="error-boundary__details">
              <summary>错误详情</summary>
              <pre className="error-boundary__stack">
                {this.state.error && this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
            
            <div className="error-boundary__actions">
              <button 
                className="error-boundary__button error-boundary__button--primary"
                onClick={this.handleRetry}
              >
                重试
              </button>
              <button 
                className="error-boundary__button error-boundary__button--secondary"
                onClick={() => window.location.reload()}
              >
                重新加载页面
              </button>
            </div>
          </div>
          
          <style jsx="true">{`
            .error-boundary {
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 200px;
              padding: 20px;
              background: #fff3cd;
              border: 1px solid #ffeaa7;
              border-radius: 8px;
              margin: 10px;
              color: #856404;
            }
            
            .error-boundary__content {
              max-width: 500px;
              text-align: center;
            }
            
            .error-boundary__title {
              margin: 0 0 16px 0;
              font-size: 18px;
              font-weight: 600;
              color: #721c24;
            }
            
            .error-boundary__message {
              margin: 0 0 20px 0;
              line-height: 1.5;
            }
            
            .error-boundary__details {
              margin: 20px 0;
              text-align: left;
            }
            
            .error-boundary__details summary {
              cursor: pointer;
              font-weight: 500;
              margin-bottom: 8px;
            }
            
            .error-boundary__stack {
              background: #f8f9fa;
              border: 1px solid #dee2e6;
              border-radius: 4px;
              padding: 12px;
              font-size: 12px;
              white-space: pre-wrap;
              overflow-x: auto;
              max-height: 200px;
            }
            
            .error-boundary__actions {
              display: flex;
              gap: 12px;
              justify-content: center;
            }
            
            .error-boundary__button {
              padding: 8px 16px;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 500;
              transition: all 0.2s ease;
            }
            
            .error-boundary__button--primary {
              background: #007bff;
              color: white;
            }
            
            .error-boundary__button--primary:hover {
              background: #0056b3;
            }
            
            .error-boundary__button--secondary {
              background: #6c757d;
              color: white;
            }
            
            .error-boundary__button--secondary:hover {
              background: #545b62;
            }
          `}</style>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * 错误边界 Hook 版本
 * 使用函数组件和 Hook 的错误处理
 */
export const useErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null)

  const resetError = React.useCallback(() => {
    setError(null)
  }, [])

  const handleError = React.useCallback((error: Error) => {
    console.error('Error caught by useErrorHandler:', error)
    setError(error)
  }, [])

  // 在开发环境下，将错误处理函数添加到 window 对象
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      (window as any).__handleError = handleError
    }
  }, [handleError])

  return {
    error,
    resetError,
    handleError
  }
}