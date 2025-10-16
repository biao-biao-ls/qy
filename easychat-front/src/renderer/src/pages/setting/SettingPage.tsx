/**
 * 设置页面组件
 * 现代化的 JLCONE 设置界面
 */
import React, { useCallback, useEffect, useState } from 'react'
import { WindowControls } from '../../components/WindowControls'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { ErrorBoundary } from '../../components/ErrorBoundary'
import { DevTools } from '../../components/DevTools'
import { useDragRegion, useWindowState } from '../../hooks/useWindowState'
import { useConfig, useUserPreferences } from '../../hooks/useConfig'
import { useElectronAPI } from '../../hooks/useElectronAPI'

interface SettingFormData {
  country: string
  language: string
  currency: string
  hideToTray: boolean
  autoStart: boolean
  notifications: {
    orders: boolean
    marketing: boolean
    community: boolean
  }
  proxy: string
  username: string
}

interface SettingOptions {
  countries: Array<{ value: string; label: string }>
  languages: Array<{ value: string; label: string }>
  currencies: Array<{ value: string; label: string }>
}

const SettingPage: React.FC = () => {
  const [formData, setFormData] = useState<SettingFormData>({
    country: '',
    language: 'en',
    currency: 'USD',
    hideToTray: true,
    autoStart: false,
    notifications: {
      orders: true,
      marketing: true,
      community: true,
    },
    proxy: '',
    username: '',
  })

  const [options, setOptions] = useState<SettingOptions>({
    countries: [],
    languages: [],
    currencies: [],
  })

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'general' | 'advanced' | 'about'>('general')

  const { windowState } = useWindowState()
  const { preferences, updateLanguage, updateTheme, toggleAutoUpdate, toggleNotifications } =
    useUserPreferences()
  const electronAPI = useElectronAPI()
  const dragRegionProps = useDragRegion()

  // 加载设置数据
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true)

        // 获取设置数据和选项
        const [settingsData, optionsData] = await Promise.all([
          electronAPI.ipc.invoke('get-user-settings'),
          electronAPI.ipc.invoke('get-setting-options'),
        ])

        if (settingsData) {
          setFormData(prev => ({ ...prev, ...settingsData }))
        }

        if (optionsData) {
          setOptions(optionsData)
        }
      } catch (error) {
        console.error('Failed to load settings:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [electronAPI])

  // 处理表单字段变化
  const handleFieldChange = useCallback(
    <K extends keyof SettingFormData>(field: K, value: SettingFormData[K]) => {
      setFormData(prev => ({ ...prev, [field]: value }))
    },
    []
  )

  // 处理嵌套字段变化
  const handleNestedFieldChange = useCallback(
    <T extends keyof SettingFormData>(
      parentField: T,
      childField: keyof SettingFormData[T],
      value: any
    ) => {
      setFormData(prev => {
        const parentValue = prev[parentField]
        if (typeof parentValue === 'object' && parentValue !== null) {
          return {
            ...prev,
            [parentField]: {
              ...parentValue,
              [childField]: value,
            },
          }
        }
        return prev
      })
    },
    []
  )

  // 保存设置
  const handleSave = useCallback(async () => {
    try {
      setIsSaving(true)

      await electronAPI.ipc.invoke('save-user-settings', formData)

      // 更新用户偏好设置
      if (preferences) {
        if (formData.language !== preferences.language) {
          await updateLanguage(formData.language)
        }
      }

      // 关闭设置窗口
      electronAPI.ipc.send('window-close-settings')
    } catch (error) {
      console.error('Failed to save settings:', error)
      alert('保存设置失败，请重试')
    } finally {
      setIsSaving(false)
    }
  }, [electronAPI, formData, preferences, updateLanguage])

  // 取消设置
  const handleCancel = useCallback(() => {
    electronAPI.ipc.send('window-close-settings')
  }, [electronAPI])

  // 处理退出登录
  const handleSignOut = useCallback(() => {
    if (confirm('确定要退出登录吗？')) {
      electronAPI.ipc.send('user-sign-out')
    }
  }, [electronAPI])

  // 处理检查更新
  const handleCheckUpdate = useCallback(() => {
    electronAPI.ipc.send('check-for-updates')
  }, [electronAPI])

  if (isLoading) {
    return (
      <div className='setting-page setting-page--loading'>
        <LoadingSpinner size='large' />
        <p>加载设置中...</p>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className={`setting-page ${windowState.showBorder ? 'setting-page--with-border' : ''}`}>
        {/* 标题栏 */}
        <div className='setting-page__titlebar' {...dragRegionProps}>
          <div className='setting-page__titlebar-content'>
            <h1 className='setting-page__title'>设置</h1>
            <WindowControls showMinimize={false} showMaximize={false} showClose={true} />
          </div>
        </div>

        {/* 主内容 */}
        <div className='setting-page__content'>
          {/* 标签页导航 */}
          <div className='setting-page__tabs'>
            <button
              className={`setting-page__tab ${activeTab === 'general' ? 'setting-page__tab--active' : ''}`}
              onClick={() => setActiveTab('general')}
            >
              常规
            </button>
            <button
              className={`setting-page__tab ${activeTab === 'advanced' ? 'setting-page__tab--active' : ''}`}
              onClick={() => setActiveTab('advanced')}
            >
              高级
            </button>
            <button
              className={`setting-page__tab ${activeTab === 'about' ? 'setting-page__tab--active' : ''}`}
              onClick={() => setActiveTab('about')}
            >
              关于
            </button>
          </div>

          {/* 设置表单 */}
          <div className='setting-page__form'>
            {activeTab === 'general' && (
              <div className='setting-page__section'>
                <h2>基本设置</h2>

                {/* 国家/地区 */}
                <div className='setting-page__field'>
                  <label className='setting-page__label'>国家/地区</label>
                  <select
                    className='setting-page__select'
                    value={formData.country}
                    onChange={e => handleFieldChange('country', e.target.value)}
                  >
                    <option value=''>请选择</option>
                    {options.countries.map(country => (
                      <option key={country.value} value={country.value}>
                        {country.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 语言 */}
                <div className='setting-page__field'>
                  <label className='setting-page__label'>语言</label>
                  <select
                    className='setting-page__select'
                    value={formData.language}
                    onChange={e => handleFieldChange('language', e.target.value)}
                  >
                    {options.languages.map(language => (
                      <option key={language.value} value={language.value}>
                        {language.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 货币 */}
                <div className='setting-page__field'>
                  <label className='setting-page__label'>货币</label>
                  <select
                    className='setting-page__select'
                    value={formData.currency}
                    onChange={e => handleFieldChange('currency', e.target.value)}
                  >
                    {options.currencies.map(currency => (
                      <option key={currency.value} value={currency.value}>
                        {currency.label}
                      </option>
                    ))}
                  </select>
                </div>

                <h2>应用行为</h2>

                {/* 关闭到系统托盘 */}
                {!windowState.isDarwin && (
                  <div className='setting-page__field'>
                    <label className='setting-page__checkbox-label'>
                      <input
                        type='checkbox'
                        checked={formData.hideToTray}
                        onChange={e => handleFieldChange('hideToTray', e.target.checked)}
                      />
                      <span>关闭时最小化到系统托盘</span>
                    </label>
                  </div>
                )}

                {/* 开机自启动 */}
                <div className='setting-page__field'>
                  <label className='setting-page__checkbox-label'>
                    <input
                      type='checkbox'
                      checked={formData.autoStart}
                      onChange={e => handleFieldChange('autoStart', e.target.checked)}
                    />
                    <span>开机自动启动</span>
                  </label>
                </div>

                <h2>通知设置</h2>

                {/* 订单通知 */}
                <div className='setting-page__field'>
                  <label className='setting-page__checkbox-label'>
                    <input
                      type='checkbox'
                      checked={formData.notifications.orders}
                      onChange={e =>
                        handleNestedFieldChange('notifications', 'orders', e.target.checked)
                      }
                    />
                    <span>订单状态通知</span>
                  </label>
                </div>

                {/* 营销活动通知 */}
                <div className='setting-page__field'>
                  <label className='setting-page__checkbox-label'>
                    <input
                      type='checkbox'
                      checked={formData.notifications.marketing}
                      onChange={e =>
                        handleNestedFieldChange('notifications', 'marketing', e.target.checked)
                      }
                    />
                    <span>营销活动通知</span>
                  </label>
                </div>

                {/* 社区消息通知 */}
                <div className='setting-page__field'>
                  <label className='setting-page__checkbox-label'>
                    <input
                      type='checkbox'
                      checked={formData.notifications.community}
                      onChange={e =>
                        handleNestedFieldChange('notifications', 'community', e.target.checked)
                      }
                    />
                    <span>社区消息通知</span>
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'advanced' && (
              <div className='setting-page__section'>
                <h2>网络设置</h2>

                {/* 代理设置 */}
                <div className='setting-page__field'>
                  <label className='setting-page__label'>代理服务器</label>
                  <input
                    type='text'
                    className='setting-page__input'
                    value={formData.proxy}
                    onChange={e => handleFieldChange('proxy', e.target.value)}
                    placeholder='例如: http://proxy.example.com:8080'
                  />
                  <p className='setting-page__help'>
                    留空表示不使用代理。支持 HTTP、HTTPS、SOCKS4、SOCKS5 代理。
                  </p>
                </div>

                <h2>开发者选项</h2>

                <div className='setting-page__field'>
                  <DevTools />
                </div>

                <div className='setting-page__field'>
                  <button
                    className='setting-page__button setting-page__button--secondary'
                    onClick={() => electronAPI.ipc.send('clear-cache')}
                  >
                    清除缓存
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'about' && (
              <div className='setting-page__section'>
                <h2>版本信息</h2>

                <div className='setting-page__field'>
                  <label className='setting-page__label'>应用版本</label>
                  <p className='setting-page__version'>JLCONE v1.0.0</p>
                </div>

                <div className='setting-page__field'>
                  <button
                    className='setting-page__button setting-page__button--secondary'
                    onClick={handleCheckUpdate}
                  >
                    检查更新
                  </button>
                </div>

                <h2>账户信息</h2>

                <div className='setting-page__field'>
                  <label className='setting-page__label'>当前用户</label>
                  <p className='setting-page__username'>{formData.username || '未登录'}</p>
                </div>

                <div className='setting-page__field'>
                  <button
                    className='setting-page__button setting-page__button--danger'
                    onClick={handleSignOut}
                  >
                    退出登录
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className='setting-page__actions'>
            <button
              className='setting-page__button setting-page__button--secondary'
              onClick={handleCancel}
              disabled={isSaving}
            >
              取消
            </button>
            <button
              className='setting-page__button setting-page__button--primary'
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? <LoadingSpinner size='small' /> : '保存'}
            </button>
          </div>
        </div>

        <style jsx='true'>{`
          .setting-page {
            display: flex;
            flex-direction: column;
            height: 100vh;
            background: #fff;
            color: #333;
            overflow: hidden;
          }

          .setting-page--loading {
            align-items: center;
            justify-content: center;
            gap: 16px;
          }

          .setting-page--with-border {
            border: 1px solid #ddd;
          }

          .setting-page__titlebar {
            flex-shrink: 0;
            background: #f8f9fa;
            border-bottom: 1px solid #dee2e6;
          }

          .setting-page__titlebar-content {
            display: flex;
            align-items: center;
            justify-content: space-between;
            height: 48px;
            padding: 0 16px;
          }

          .setting-page__title {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
          }

          .setting-page__content {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }

          .setting-page__tabs {
            display: flex;
            background: #f8f9fa;
            border-bottom: 1px solid #dee2e6;
          }

          .setting-page__tab {
            padding: 12px 24px;
            border: none;
            background: transparent;
            cursor: pointer;
            font-size: 14px;
            color: #6c757d;
            border-bottom: 2px solid transparent;
            transition: all 0.2s ease;
          }

          .setting-page__tab:hover {
            color: #495057;
            background: rgba(0, 0, 0, 0.05);
          }

          .setting-page__tab--active {
            color: #007bff;
            border-bottom-color: #007bff;
          }

          .setting-page__form {
            flex: 1;
            overflow-y: auto;
            padding: 24px;
          }

          .setting-page__section h2 {
            margin: 0 0 16px 0;
            font-size: 18px;
            font-weight: 600;
            color: #212529;
            border-bottom: 1px solid #dee2e6;
            padding-bottom: 8px;
          }

          .setting-page__section h2:not(:first-child) {
            margin-top: 32px;
          }

          .setting-page__field {
            margin-bottom: 20px;
          }

          .setting-page__label {
            display: block;
            margin-bottom: 6px;
            font-size: 14px;
            font-weight: 500;
            color: #495057;
          }

          .setting-page__input,
          .setting-page__select {
            width: 100%;
            max-width: 300px;
            padding: 8px 12px;
            border: 1px solid #ced4da;
            border-radius: 4px;
            font-size: 14px;
            transition: border-color 0.2s ease;
          }

          .setting-page__input:focus,
          .setting-page__select:focus {
            outline: none;
            border-color: #007bff;
            box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
          }

          .setting-page__checkbox-label {
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            font-size: 14px;
          }

          .setting-page__checkbox-label input[type='checkbox'] {
            margin: 0;
          }

          .setting-page__help {
            margin: 4px 0 0 0;
            font-size: 12px;
            color: #6c757d;
            line-height: 1.4;
          }

          .setting-page__version,
          .setting-page__username {
            margin: 0;
            font-size: 14px;
            color: #495057;
            font-family: monospace;
          }

          .setting-page__actions {
            flex-shrink: 0;
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            padding: 16px 24px;
            border-top: 1px solid #dee2e6;
            background: #f8f9fa;
          }

          .setting-page__button {
            padding: 8px 16px;
            border: 1px solid transparent;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .setting-page__button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .setting-page__button--primary {
            background: #007bff;
            color: white;
          }

          .setting-page__button--primary:hover:not(:disabled) {
            background: #0056b3;
          }

          .setting-page__button--secondary {
            background: #6c757d;
            color: white;
          }

          .setting-page__button--secondary:hover:not(:disabled) {
            background: #545b62;
          }

          .setting-page__button--danger {
            background: #dc3545;
            color: white;
          }

          .setting-page__button--danger:hover:not(:disabled) {
            background: #c82333;
          }

          @media (prefers-color-scheme: dark) {
            .setting-page {
              background: #1e1e1e;
              color: #fff;
            }

            .setting-page__titlebar {
              background: #2d2d2d;
              border-bottom-color: #444;
            }

            .setting-page__tabs {
              background: #2d2d2d;
              border-bottom-color: #444;
            }

            .setting-page__tab {
              color: #ccc;
            }

            .setting-page__tab:hover {
              color: #fff;
              background: rgba(255, 255, 255, 0.1);
            }

            .setting-page__section h2 {
              color: #fff;
              border-bottom-color: #444;
            }

            .setting-page__label {
              color: #ccc;
            }

            .setting-page__input,
            .setting-page__select {
              background: #3d3d3d;
              border-color: #555;
              color: #fff;
            }

            .setting-page__input:focus,
            .setting-page__select:focus {
              border-color: #007bff;
            }

            .setting-page__help {
              color: #999;
            }

            .setting-page__version,
            .setting-page__username {
              color: #ccc;
            }

            .setting-page__actions {
              background: #2d2d2d;
              border-top-color: #444;
            }
          }
        `}</style>
      </div>
    </ErrorBoundary>
  )
}

export default SettingPage
