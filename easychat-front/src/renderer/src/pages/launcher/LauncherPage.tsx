/**
 * 启动器页面组件
 * 现代化的 JLCONE 环境选择界面
 */
import React, { useCallback, useState } from 'react'
import { WindowControls } from '../../components/WindowControls'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { ErrorBoundary } from '../../components/ErrorBoundary'
import { useDragRegion, useWindowState } from '../../hooks/useWindowState'
import { useElectronAPI } from '../../hooks/useElectronAPI'

interface Environment {
  id: string
  name: string
  title: string
  description: string
  color: string
  disabled: boolean
  icon: React.ReactNode
}

const LauncherPage: React.FC = () => {
  const [selectedEnv, setSelectedEnv] = useState<string>('')
  const [isLaunching, setIsLaunching] = useState(false)

  const { windowState } = useWindowState()
  const electronAPI = useElectronAPI()
  const dragRegionProps = useDragRegion()

  // 环境配置
  const environments: Environment[] = [
    {
      id: 'DEV',
      name: 'DEV',
      title: '开发环境',
      description: '用于开发和测试的环境，包含最新的功能和调试工具',
      color: '#28a745',
      disabled: false,
      icon: (
        <svg width='24' height='24' viewBox='0 0 24 24' fill='currentColor'>
          <path d='M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0L19.2 12l-4.6-4.6L16 6l6 6-6 6-1.4-1.4z' />
        </svg>
      ),
    },
    {
      id: 'UAT',
      name: 'UAT',
      title: 'UAT环境',
      description: '用户验收测试环境，用于最终测试和验收',
      color: '#ffc107',
      disabled: false,
      icon: (
        <svg width='24' height='24' viewBox='0 0 24 24' fill='currentColor'>
          <path d='M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' />
        </svg>
      ),
    },
    {
      id: 'PRO',
      name: 'PRO',
      title: '生产环境',
      description: '正式的生产环境，提供稳定可靠的服务',
      color: '#007bff',
      disabled: false,
      icon: (
        <svg width='24' height='24' viewBox='0 0 24 24' fill='currentColor'>
          <path d='M12 1L3 5v6c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V5l-9-4z' />
        </svg>
      ),
    },
  ]

  // 处理环境选择
  const handleEnvironmentSelect = useCallback(
    async (envId: string) => {
      if (isLaunching) return

      const env = environments.find(e => e.id === envId)
      if (!env || env.disabled) return

      try {
        setIsLaunching(true)
        setSelectedEnv(envId)

        // 发送环境选择到主进程
        await electronAPI.ipc.invoke('select-environment', envId)

        // 启动成功后会自动关闭启动器窗口
      } catch (error) {
        console.error('Failed to select environment:', error)
        alert('启动失败，请重试')
        setIsLaunching(false)
        setSelectedEnv('')
      }
    },
    [electronAPI, environments, isLaunching]
  )

  return (
    <ErrorBoundary>
      <div
        className={`launcher-page ${windowState.showBorder ? 'launcher-page--with-border' : ''}`}
      >
        {/* 标题栏 */}
        <div className='launcher-page__titlebar' {...dragRegionProps}>
          <div className='launcher-page__titlebar-content'>
            <div className='launcher-page__title'>
              <div className='launcher-page__logo'>
                <svg width='24' height='24' viewBox='0 0 24 24' fill='currentColor'>
                  <path d='M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z' />
                </svg>
              </div>
              <span>JLCONE</span>
            </div>

            <WindowControls showMinimize={true} showMaximize={false} showClose={true} />
          </div>
        </div>

        {/* 主内容 */}
        <div className='launcher-page__content'>
          <div className='launcher-page__header'>
            <h1 className='launcher-page__heading'>选择运行环境</h1>
            <p className='launcher-page__description'>请选择 JLCONE 下单助手的运行环境</p>
          </div>

          <div className='launcher-page__environments'>
            {environments.map(env => (
              <button
                key={env.id}
                className={`launcher-page__env-card ${
                  env.disabled ? 'launcher-page__env-card--disabled' : ''
                } ${selectedEnv === env.id ? 'launcher-page__env-card--selected' : ''} ${
                  isLaunching && selectedEnv === env.id ? 'launcher-page__env-card--launching' : ''
                }`}
                onClick={() => handleEnvironmentSelect(env.id)}
                disabled={env.disabled || isLaunching}
                style={{ '--env-color': env.color } as React.CSSProperties}
              >
                <div className='launcher-page__env-icon'>
                  {isLaunching && selectedEnv === env.id ? (
                    <LoadingSpinner size='medium' variant='spinner' />
                  ) : (
                    env.icon
                  )}
                </div>

                <div className='launcher-page__env-info'>
                  <h3 className='launcher-page__env-title'>{env.title}</h3>
                  <p className='launcher-page__env-description'>{env.description}</p>

                  <div className='launcher-page__env-badge'>{env.name}</div>
                </div>

                {env.disabled ? (
                  <div className='launcher-page__env-overlay'>
                    <span>暂不可用</span>
                  </div>
                ) : null}
              </button>
            ))}
          </div>

          {isLaunching ? (
            <div className='launcher-page__launching'>
              <LoadingSpinner size='small' variant='dots' />
              <span>正在启动 {environments.find(e => e.id === selectedEnv)?.title}...</span>
            </div>
          ) : null}

          <div className='launcher-page__footer'>
            <p className='launcher-page__help'>如有疑问，请联系技术支持</p>
          </div>
        </div>

        <style jsx='true'>{`
          .launcher-page {
            display: flex;
            flex-direction: column;
            height: 100vh;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            color: #333;
            overflow: hidden;
          }

          .launcher-page--with-border {
            border: 1px solid #ddd;
          }

          .launcher-page__titlebar {
            flex-shrink: 0;
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(10px);
            border-bottom: 1px solid rgba(0, 0, 0, 0.1);
          }

          .launcher-page__titlebar-content {
            display: flex;
            align-items: center;
            justify-content: space-between;
            height: 48px;
            padding: 0 16px;
          }

          .launcher-page__title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 16px;
            font-weight: 600;
          }

          .launcher-page__logo {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
            color: #007bff;
          }

          .launcher-page__content {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px 20px;
            text-align: center;
          }

          .launcher-page__header {
            margin-bottom: 40px;
          }

          .launcher-page__heading {
            margin: 0 0 12px 0;
            font-size: 28px;
            font-weight: 700;
            color: #2c3e50;
          }

          .launcher-page__description {
            margin: 0;
            font-size: 16px;
            color: #6c757d;
            line-height: 1.5;
          }

          .launcher-page__environments {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
            max-width: 900px;
            width: 100%;
            margin-bottom: 32px;
          }

          .launcher-page__env-card {
            position: relative;
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 24px;
            background: rgba(255, 255, 255, 0.9);
            border: 2px solid transparent;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.3s ease;
            text-align: left;
            backdrop-filter: blur(10px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }

          .launcher-page__env-card:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
            border-color: var(--env-color);
          }

          .launcher-page__env-card--selected {
            border-color: var(--env-color);
            background: rgba(255, 255, 255, 1);
          }

          .launcher-page__env-card--launching {
            pointer-events: none;
          }

          .launcher-page__env-card--disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .launcher-page__env-icon {
            flex-shrink: 0;
            width: 48px;
            height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--env-color);
            color: white;
            border-radius: 8px;
          }

          .launcher-page__env-info {
            flex: 1;
            min-width: 0;
          }

          .launcher-page__env-title {
            margin: 0 0 8px 0;
            font-size: 18px;
            font-weight: 600;
            color: #2c3e50;
          }

          .launcher-page__env-description {
            margin: 0 0 12px 0;
            font-size: 14px;
            color: #6c757d;
            line-height: 1.4;
          }

          .launcher-page__env-badge {
            display: inline-block;
            padding: 4px 8px;
            background: var(--env-color);
            color: white;
            font-size: 12px;
            font-weight: 500;
            border-radius: 4px;
          }

          .launcher-page__env-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.8);
            border-radius: 12px;
            font-weight: 500;
            color: #6c757d;
          }

          .launcher-page__launching {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px 24px;
            background: rgba(255, 255, 255, 0.9);
            border-radius: 8px;
            font-size: 14px;
            color: #495057;
            margin-bottom: 24px;
          }

          .launcher-page__footer {
            margin-top: auto;
          }

          .launcher-page__help {
            margin: 0;
            font-size: 13px;
            color: #6c757d;
          }

          @media (max-width: 768px) {
            .launcher-page__content {
              padding: 20px 16px;
            }

            .launcher-page__heading {
              font-size: 24px;
            }

            .launcher-page__environments {
              grid-template-columns: 1fr;
              gap: 16px;
            }

            .launcher-page__env-card {
              padding: 20px;
            }
          }

          @media (prefers-color-scheme: dark) {
            .launcher-page {
              background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
              color: #fff;
            }

            .launcher-page__titlebar {
              background: rgba(0, 0, 0, 0.3);
              border-bottom-color: rgba(255, 255, 255, 0.1);
            }

            .launcher-page__heading {
              color: #fff;
            }

            .launcher-page__env-card {
              background: rgba(255, 255, 255, 0.1);
              color: #fff;
            }

            .launcher-page__env-card--selected {
              background: rgba(255, 255, 255, 0.2);
            }

            .launcher-page__env-title {
              color: #fff;
            }

            .launcher-page__env-description {
              color: #bdc3c7;
            }

            .launcher-page__launching {
              background: rgba(255, 255, 255, 0.1);
              color: #fff;
            }

            .launcher-page__env-overlay {
              background: rgba(0, 0, 0, 0.7);
              color: #bdc3c7;
            }
          }
        `}</style>
      </div>
    </ErrorBoundary>
  )
}

export default LauncherPage
