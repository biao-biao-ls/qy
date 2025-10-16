/**
 * 模态框组件
 * 提供统一的模态框样式和行为
 */
import React, { useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './Button'

export interface ModalProps {
  /** 是否显示模态框 */
  open: boolean
  /** 关闭模态框回调 */
  onClose: () => void
  /** 模态框标题 */
  title?: string
  /** 模态框尺寸 */
  size?: 'small' | 'medium' | 'large' | 'fullscreen'
  /** 是否可以通过点击遮罩关闭 */
  closeOnOverlayClick?: boolean
  /** 是否可以通过 ESC 键关闭 */
  closeOnEscape?: boolean
  /** 是否显示关闭按钮 */
  showCloseButton?: boolean
  /** 自定义类名 */
  className?: string
  /** 子组件 */
  children: React.ReactNode
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  size = 'medium',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  className = '',
  children,
}) => {
  const modalRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  // 处理 ESC 键关闭
  useEffect(() => {
    if (!open || !closeOnEscape) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, closeOnEscape, onClose])

  // 处理焦点管理
  useEffect(() => {
    if (open) {
      // 保存当前焦点元素
      previousActiveElement.current = document.activeElement as HTMLElement

      // 将焦点移到模态框
      setTimeout(() => {
        modalRef.current?.focus()
      }, 0)
    } else {
      // 恢复之前的焦点
      if (previousActiveElement.current) {
        previousActiveElement.current.focus()
      }
    }
  }, [open])

  // 处理遮罩点击
  const handleOverlayClick = useCallback(
    (event: React.MouseEvent) => {
      if (closeOnOverlayClick && event.target === event.currentTarget) {
        onClose()
      }
    },
    [closeOnOverlayClick, onClose]
  )

  // 阻止模态框内容区域的点击事件冒泡
  const handleContentClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation()
  }, [])

  if (!open) return null

  const modalContent = (
    <div className={`modal-overlay ${className}`} onClick={handleOverlayClick}>
      <div
        ref={modalRef}
        className={`modal modal--${size}`}
        onClick={handleContentClick}
        tabIndex={-1}
        role='dialog'
        aria-modal='true'
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {/* 模态框头部 */}
        {title || showCloseButton ? (
          <div className='modal__header'>
            {title ? (
              <h2 id='modal-title' className='modal__title'>
                {title}
              </h2>
            ) : null}

            {showCloseButton ? (
              <Button
                variant='light'
                size='small'
                className='modal__close-button'
                onClick={onClose}
                aria-label='关闭'
              >
                <svg width='16' height='16' viewBox='0 0 16 16'>
                  <path
                    d='M8 6.586L11.293 3.293a1 1 0 011.414 1.414L9.414 8l3.293 3.293a1 1 0 01-1.414 1.414L8 9.414l-3.293 3.293a1 1 0 01-1.414-1.414L6.586 8 3.293 4.707a1 1 0 011.414-1.414L8 6.586z'
                    fill='currentColor'
                  />
                </svg>
              </Button>
            ) : null}
          </div>
        ) : null}

        {/* 模态框内容 */}
        <div className='modal__content'>{children}</div>
      </div>

      <style jsx='true'>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          animation: modal-overlay-enter 0.2s ease-out;
        }

        @keyframes modal-overlay-enter {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .modal {
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
          max-height: 90vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          animation: modal-enter 0.2s ease-out;
          outline: none;
        }

        @keyframes modal-enter {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        /* 尺寸 */
        .modal--small {
          width: 100%;
          max-width: 400px;
        }

        .modal--medium {
          width: 100%;
          max-width: 600px;
        }

        .modal--large {
          width: 100%;
          max-width: 800px;
        }

        .modal--fullscreen {
          width: 100%;
          height: 100%;
          max-width: none;
          max-height: none;
          border-radius: 0;
        }

        .modal__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid #dee2e6;
          flex-shrink: 0;
        }

        .modal__title {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #212529;
        }

        .modal__close-button {
          margin-left: 16px;
        }

        .modal__content {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }

        /* 响应式 */
        @media (max-width: 768px) {
          .modal-overlay {
            padding: 10px;
          }

          .modal--small,
          .modal--medium,
          .modal--large {
            width: 100%;
            max-width: none;
          }

          .modal__header {
            padding: 12px 16px;
          }

          .modal__title {
            font-size: 16px;
          }

          .modal__content {
            padding: 16px;
          }
        }

        /* 暗色主题 */
        @media (prefers-color-scheme: dark) {
          .modal {
            background: #2d3748;
            color: #fff;
          }

          .modal__header {
            border-bottom-color: #4a5568;
          }

          .modal__title {
            color: #fff;
          }
        }
      `}</style>
    </div>
  )

  // 使用 Portal 渲染到 body
  return createPortal(modalContent, document.body)
}

/**
 * 确认对话框组件
 */
export interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  onClose,
  onConfirm,
  title = '确认操作',
  message,
  confirmText = '确认',
  cancelText = '取消',
  variant = 'danger',
}) => {
  const handleConfirm = useCallback(() => {
    onConfirm()
    onClose()
  }, [onConfirm, onClose])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size='small'
      closeOnOverlayClick={false}
      showCloseButton={false}
    >
      <div className='confirm-modal'>
        <div className='confirm-modal__icon'>
          {variant === 'danger' && (
            <svg width='48' height='48' viewBox='0 0 48 48' fill='#dc3545'>
              <path d='M24 4C12.96 4 4 12.96 4 24s8.96 20 20 20 20-8.96 20-20S35.04 4 24 4zm2 30h-4v-4h4v4zm0-8h-4V14h4v12z' />
            </svg>
          )}

          {variant === 'warning' && (
            <svg width='48' height='48' viewBox='0 0 48 48' fill='#ffc107'>
              <path d='M2 42h44L24 4 2 42zm22-6h-4v-4h4v4zm0-8h-4v-8h4v8z' />
            </svg>
          )}

          {variant === 'info' && (
            <svg width='48' height='48' viewBox='0 0 48 48' fill='#17a2b8'>
              <path d='M24 4C12.96 4 4 12.96 4 24s8.96 20 20 20 20-8.96 20-20S35.04 4 24 4zm2 30h-4V22h4v12zm0-16h-4v-4h4v4z' />
            </svg>
          )}
        </div>

        <p className='confirm-modal__message'>{message}</p>

        <div className='confirm-modal__actions'>
          <Button variant='light' onClick={onClose}>
            {cancelText}
          </Button>
          <Button variant={variant} onClick={handleConfirm}>
            {confirmText}
          </Button>
        </div>

        <style jsx='true'>{`
          .confirm-modal {
            text-align: center;
          }

          .confirm-modal__icon {
            margin-bottom: 16px;
          }

          .confirm-modal__message {
            margin: 0 0 24px 0;
            font-size: 16px;
            line-height: 1.5;
            color: #495057;
          }

          .confirm-modal__actions {
            display: flex;
            gap: 12px;
            justify-content: center;
          }

          @media (prefers-color-scheme: dark) {
            .confirm-modal__message {
              color: #e2e8f0;
            }
          }
        `}</style>
      </div>
    </Modal>
  )
}
