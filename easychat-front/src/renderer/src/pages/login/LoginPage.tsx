/**
 * 登录页面组件
 * 现代化的 JLCONE 登录界面
 */
import React, { useState, useEffect, useCallback } from 'react'
import { WindowControls } from '../../components/WindowControls'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { ErrorBoundary } from '../../components/ErrorBoundary'
import { useWindowState, useDragRegion } from '../../hooks/useWindowState'
import { useElectronAPI } from '../../hooks/useElectronAPI'

interface LoginState {
  isLoading: boolean
  loadingMessage: string
  operationList: string[]
  error: string | null
}

const LoginPage: React.FC = () => {
  const [loginState, setLoginState] = useState<LoginState>({
    isLoading: true,
    loadingMessage: '正在初始化...',
    operationList: [],
    error: null
  })

  const { windowState } = useWindowState()
  const electronAPI = useElectronAPI()
  const dragRegionProps = useDragRegion()

  // 监听主进程消息
  useEffect(() => {
    const cleanup = electronAPI.ipc.on('login-status-update', (_, data) => {
      setLoginState(prev => ({
        ...prev,
        loadingMessage: data.reason || prev.loadingMessage,
        operationList: data.operate || prev.operationList,
        isLoading: data.isLoading !== undefined ? data.isLoading : prev.isLoading,
        error: data.error || null
      }))
    })

    // 请求初始状态
    electronAPI.ipc.send('get-login-status')

    return cleanup
  }, [electronAPI])

  // 处理强制刷新
  const handleForceRefresh = useCallback(() => {
    setLoginState(prev => ({ ...prev, error: null, isLoading: true }))
    electronAPI.ipc.send('login-force-refresh')
  }, [electronAPI])

  // 处理重试登录
  const handleRetryLogin = useCallback(() => {
    setLoginState(prev => ({ ...prev, error: null, isLoading: true }))
    electronAPI.ipc.send('login-retry')
  }, [electronAPI])

  // 处理打开设置
  const handleOpenSettings = useCallback(() => {
    electronAPI.ipc.send('window-open-settings')
  }, [electronAPI])

  return (
    <ErrorBoundary>
      <div className={`login-page ${windowState.showBorder ? 'login-page--with-border' : ''}`}>
        {/* 标题栏 */}
        <div className="login-page__titlebar" {...dragRegionProps}>
          <div className="login-page__titlebar-content">
            <div className="login-page__title">
              <div className="login-page__logo">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z"/>
                </svg>
              </div>
              <span>JLCONE</span>
            </div>
            
            <WindowControls 
              showMinimize={!windowState.isDarwin || !windowState.isMaximized}
              showMaximize={false}
              showClose={true}
            />
          </div>
        </div>

        {/* 主内容 */}
        <div className="login-page__content">
          {/* 加载状态 */}
          <div className="login-page__loading">
            <div className="login-page__loading-icon">
              <LoadingSpinner size="large" variant="spinner" />
            </div>
            
            <div className="login-page__loading-info">
              <h2 className="login-page__loading-title">
                {loginState.error ? '登录失败' : '正在登录'}
              </h2>
              
              <p className="login-page__loading-message">
                {loginState.error || loginState.loadingMessage}
              </p>
              
              {loginState.operationList.length > 0 && (
                <div className="login-page__operations">
                  {loginState.operationList.map((operation, index) => (
                    <div key={index} className="login-page__operation">
                      <div className="login-page__operation-dot" />
                      <span>{operation}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="login-page__actions">
            {loginState.error ? (
              <>
                <button
                  className="login-page__button login-page__button--primary"
                  onClick={handleRetryLogin}
                >
                  重试登录
                </button>
                <button
                  className="login-page__button login-page__button--secondary"
                  onClick={handleForceRefresh}
                >
                  强制刷新
                </button>
              </>
            ) : (
              <button
                className="login-page__button login-page__button--secondary"
                onClick={handleForceRefresh}
                disabled={loginState.isLoading}
              >
                刷新页面
              </button>
            )}
            
            <button
              className="login-page__button login-page__button--text"
              onClick={handleOpenSettings}
            >
              设置
            </button>
          </div>

          {/* 帮助信息 */}
          <div className="login-page__help">
            <p>如果遇到登录问题，请尝试：</p>
            <ul>
              <li>检查网络连接</li>
              <li>清除浏览器缓存</li>
              <li>联系技术支持</li>
            </ul>
          </div>
        </div>

        <style jsx>{`
          .login-page {
            display: flex;
            flex-direction: column;
            height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            overflow: hidden;
          }
          
          .login-page--with-border {
            border: 1px solid rgba(255, 255, 255, 0.2);
          }
          
          .login-page__titlebar {
            flex-shrink: 0;
            background: rgba(0, 0, 0, 0.1);
            backdrop-filter: blur(10px);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          }
          
          .login-page__titlebar-content {
            display: flex;
            align-items: center;
            justify-content: space-between;
            height: 40px;
            padding: 0 16px;
          }
          
          .login-page__title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            font-weight: 500;
          }
          
          .login-page__logo {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
            color: rgba(255, 255, 255, 0.9);
          }
          
          .login-page__content {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px 20px;
            text-align: center;
          }
          
          .login-page__loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 24px;
            margin-bottom: 32px;
          }
          
          .login-page__loading-icon {
            padding: 20px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 50%;
            backdrop-filter: blur(10px);
          }
          
          .login-page__loading-info {
            max-width: 400px;
          }
          
          .login-page__loading-title {
            margin: 0 0 12px 0;
            font-size: 24px;
            font-weight: 600;
          }
          
          .login-page__loading-message {
            margin: 0 0 16px 0;
            font-size: 16px;
            opacity: 0.9;
            line-height: 1.5;
          }
          
          .login-page__operations {
            display: flex;
            flex-direction: column;
            gap: 8px;
            text-align: left;
          }
          
          .login-page__operation {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            opacity: 0.8;
          }
          
          .login-page__operation-dot {
            width: 6px;
            height: 6px;
            background: currentColor;
            border-radius: 50%;
            flex-shrink: 0;
          }
          
          .login-page__actions {
            display: flex;
            gap: 12px;
            margin-bottom: 32px;
            flex-wrap: wrap;
            justify-content: center;
          }
          
          .login-page__button {
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s ease;
            min-width: 100px;
          }
          
          .login-page__button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          
          .login-page__button--primary {
            background: rgba(255, 255, 255, 0.2);
            color: white;
            backdrop-filter: blur(10px);
          }
          
          .login-page__button--primary:hover:not(:disabled) {
            background: rgba(255, 255, 255, 0.3);
            transform: translateY(-1px);
          }
          
          .login-page__button--secondary {
            background: rgba(255, 255, 255, 0.1);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.2);
          }
          
          .login-page__button--secondary:hover:not(:disabled) {
            background: rgba(255, 255, 255, 0.2);
          }
          
          .login-page__button--text {
            background: transparent;
            color: rgba(255, 255, 255, 0.8);
            text-decoration: underline;
          }
          
          .login-page__button--text:hover {
            color: white;
          }
          
          .login-page__help {
            max-width: 300px;
            font-size: 13px;
            opacity: 0.7;
            line-height: 1.5;
          }
          
          .login-page__help p {
            margin: 0 0 8px 0;
          }
          
          .login-page__help ul {
            margin: 0;
            padding-left: 20px;
            text-align: left;
          }
          
          .login-page__help li {
            margin-bottom: 4px;
          }
          
          @media (max-width: 480px) {
            .login-page__content {
              padding: 20px 16px;
            }
            
            .login-page__loading-title {
              font-size: 20px;
            }
            
            .login-page__loading-message {
              font-size: 14px;
            }
            
            .login-page__actions {
              flex-direction: column;
              align-items: center;
            }
            
            .login-page__button {
              width: 100%;
              max-width: 200px;
            }
          }
        `}</style>
      </div>
    </ErrorBoundary>
  )
}

export default LoginPage
