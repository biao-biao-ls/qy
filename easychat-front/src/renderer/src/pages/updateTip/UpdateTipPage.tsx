import React, { useEffect, useState } from 'react'
import { useElectronAPI, useIPC } from '../../hooks/useElectronAPI'

interface UpdateWindowOptions {
  type: 'update-tip' | 'force-update' | 'download-progress'
  title?: string
  message?: string
  version?: string
  progress?: number
  forceUpdate?: boolean
}

const UpdateTipPage: React.FC = () => {
  const electronAPI = useElectronAPI()
  const { invoke, on } = useIPC()
  const [options, setOptions] = useState<UpdateWindowOptions>({
    type: 'update-tip',
    title: '更新提示',
    message: '正在检查更新...',
    version: '',
    progress: 0,
    forceUpdate: false,
  })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // 获取初始选项
    const loadOptions = async () => {
      try {
        const initialOptions = await invoke('update-window:get-options')
        if (initialOptions) {
          setOptions(initialOptions)
        }
      } catch (error) {
        console.error('获取更新窗口选项失败:', error)
      }
    }

    loadOptions()

    // 监听选项变更
    const handleOptionsChanged = (newOptions: UpdateWindowOptions) => {
      setOptions(newOptions)
    }

    const unsubscribe = on('update-window:options-changed', handleOptionsChanged)

    return unsubscribe
  }, [invoke, on])

  // 处理确认按钮点击
  const handleConfirm = async () => {
    setIsLoading(true)

    try {
      if (options.type === 'download-progress' && options.progress === 100) {
        // 下载完成，安装更新
        await invoke('update:install')
      } else if (options.type === 'force-update') {
        // 强制更新，打开下载页面
        await invoke('shell:open-external', 'https://www.jlc.com')
        await invoke('update-window:close')
      } else {
        // 普通更新，开始下载
        await invoke('update:download')
      }
    } catch (error) {
      console.error('处理更新确认失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 处理取消按钮点击
  const handleCancel = async () => {
    try {
      if (options.forceUpdate) {
        // 强制更新时退出应用
        await invoke('app:quit')
      } else {
        // 普通更新时关闭窗口
        await invoke('update-window:cancel')
      }
    } catch (error) {
      console.error('处理更新取消失败:', error)
    }
  }

  // 处理关闭按钮点击
  const handleClose = async () => {
    if (options.forceUpdate) {
      // 强制更新时不允许关闭
      return
    }

    try {
      await invoke('update-window:close')
    } catch (error) {
      console.error('关闭更新窗口失败:', error)
    }
  }

  // 获取图标
  const getIcon = () => {
    switch (options.type) {
      case 'force-update':
        return (
          <svg viewBox='0 0 24 24' fill='currentColor' style={{ color: '#f56565' }}>
            <path d='M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z' />
          </svg>
        )
      case 'download-progress':
        return (
          <svg viewBox='0 0 24 24' fill='currentColor' style={{ color: '#4299e1' }}>
            <path d='M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z' />
          </svg>
        )
      default:
        return (
          <svg viewBox='0 0 24 24' fill='currentColor' style={{ color: '#48bb78' }}>
            <path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z' />
          </svg>
        )
    }
  }

  // 获取确认按钮文本
  const getConfirmText = () => {
    if (isLoading) {
      return (
        <>
          <span className='loading' />
          处理中...
        </>
      )
    }

    switch (options.type) {
      case 'force-update':
        return '前往下载'
      case 'download-progress':
        return options.progress === 100 ? '立即重启' : '下载中...'
      default:
        return '立即更新'
    }
  }

  // 获取取消按钮文本
  const getCancelText = () => {
    if (options.forceUpdate) {
      return '退出应用'
    }
    return '稍后提醒'
  }

  return (
    <div className={`update-container ${options.forceUpdate ? 'force-update' : ''}`}>
      <div className='update-header'>
        <h3 className='update-title'>{options.title}</h3>
        {!options.forceUpdate && (
          <button className='close-btn' onClick={handleClose} title='关闭'>
            ×
          </button>
        )}
      </div>

      <div className='update-content'>
        <div className='update-icon'>{getIcon()}</div>

        <div className='update-message'>{options.message}</div>

        {options.version ? <div className='update-version'>版本: {options.version}</div> : null}

        {options.type === 'download-progress' && (
          <div className='progress-container' style={{ display: 'block' }}>
            <div className='progress-bar'>
              <div className='progress-fill' style={{ width: `${options.progress || 0}%` }} />
            </div>
            <div className='progress-text'>{options.progress || 0}%</div>
          </div>
        )}
      </div>

      <div className='update-actions'>
        {!options.forceUpdate && options.type !== 'download-progress' && (
          <button className='btn btn-secondary' onClick={handleCancel} disabled={isLoading}>
            {getCancelText()}
          </button>
        )}

        <button
          className='btn btn-primary'
          onClick={handleConfirm}
          disabled={isLoading || (options.type === 'download-progress' && options.progress !== 100)}
        >
          {getConfirmText()}
        </button>
      </div>
    </div>
  )
}

export default UpdateTipPage
