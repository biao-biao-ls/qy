/**
 * 通用按钮组件
 * 提供统一的按钮样式和行为
 */
import React, { forwardRef } from 'react'
import { LoadingSpinner } from './LoadingSpinner'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** 按钮变体 */
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark' | 'link'
  /** 按钮尺寸 */
  size?: 'small' | 'medium' | 'large'
  /** 是否为轮廓按钮 */
  outline?: boolean
  /** 是否为圆角按钮 */
  rounded?: boolean
  /** 是否为块级按钮 */
  block?: boolean
  /** 加载状态 */
  loading?: boolean
  /** 图标 */
  icon?: React.ReactNode
  /** 图标位置 */
  iconPosition?: 'left' | 'right'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'medium',
  outline = false,
  rounded = false,
  block = false,
  loading = false,
  icon,
  iconPosition = 'left',
  children,
  className = '',
  disabled,
  ...props
}, ref) => {
  const baseClass = 'btn'
  const variantClass = outline ? `btn--outline-${variant}` : `btn--${variant}`
  const sizeClass = `btn--${size}`
  const classes = [
    baseClass,
    variantClass,
    sizeClass,
    rounded ? 'btn--rounded' : '',
    block ? 'btn--block' : '',
    loading ? 'btn--loading' : '',
    className
  ].filter(Boolean).join(' ')

  const isDisabled = disabled || loading

  return (
    <button
      ref={ref}
      className={classes}
      disabled={isDisabled}
      {...props}
    >
      {loading && (
        <LoadingSpinner 
          size={size === 'large' ? 'medium' : 'small'} 
          variant="spinner" 
          className="btn__spinner"
        />
      )}
      
      {icon && iconPosition === 'left' && !loading && (
        <span className="btn__icon btn__icon--left">{icon}</span>
      )}
      
      {children && (
        <span className={`btn__content ${loading ? 'btn__content--hidden' : ''}`}>
          {children}
        </span>
      )}
      
      {icon && iconPosition === 'right' && !loading && (
        <span className="btn__icon btn__icon--right">{icon}</span>
      )}

      <style jsx>{`
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 8px 16px;
          border: 1px solid transparent;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 500;
          line-height: 1.5;
          text-align: center;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
          white-space: nowrap;
          user-select: none;
        }
        
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .btn--loading {
          pointer-events: none;
        }
        
        /* 尺寸 */
        .btn--small {
          padding: 4px 8px;
          font-size: 12px;
          gap: 4px;
        }
        
        .btn--medium {
          padding: 8px 16px;
          font-size: 14px;
          gap: 6px;
        }
        
        .btn--large {
          padding: 12px 24px;
          font-size: 16px;
          gap: 8px;
        }
        
        /* 变体 - 实心 */
        .btn--primary {
          background: #007bff;
          color: white;
          border-color: #007bff;
        }
        
        .btn--primary:hover:not(:disabled) {
          background: #0056b3;
          border-color: #0056b3;
        }
        
        .btn--secondary {
          background: #6c757d;
          color: white;
          border-color: #6c757d;
        }
        
        .btn--secondary:hover:not(:disabled) {
          background: #545b62;
          border-color: #545b62;
        }
        
        .btn--success {
          background: #28a745;
          color: white;
          border-color: #28a745;
        }
        
        .btn--success:hover:not(:disabled) {
          background: #1e7e34;
          border-color: #1e7e34;
        }
        
        .btn--danger {
          background: #dc3545;
          color: white;
          border-color: #dc3545;
        }
        
        .btn--danger:hover:not(:disabled) {
          background: #c82333;
          border-color: #c82333;
        }
        
        .btn--warning {
          background: #ffc107;
          color: #212529;
          border-color: #ffc107;
        }
        
        .btn--warning:hover:not(:disabled) {
          background: #e0a800;
          border-color: #e0a800;
        }
        
        .btn--info {
          background: #17a2b8;
          color: white;
          border-color: #17a2b8;
        }
        
        .btn--info:hover:not(:disabled) {
          background: #117a8b;
          border-color: #117a8b;
        }
        
        .btn--light {
          background: #f8f9fa;
          color: #212529;
          border-color: #f8f9fa;
        }
        
        .btn--light:hover:not(:disabled) {
          background: #e2e6ea;
          border-color: #e2e6ea;
        }
        
        .btn--dark {
          background: #343a40;
          color: white;
          border-color: #343a40;
        }
        
        .btn--dark:hover:not(:disabled) {
          background: #23272b;
          border-color: #23272b;
        }
        
        .btn--link {
          background: transparent;
          color: #007bff;
          border-color: transparent;
          text-decoration: underline;
        }
        
        .btn--link:hover:not(:disabled) {
          color: #0056b3;
        }
        
        /* 变体 - 轮廓 */
        .btn--outline-primary {
          background: transparent;
          color: #007bff;
          border-color: #007bff;
        }
        
        .btn--outline-primary:hover:not(:disabled) {
          background: #007bff;
          color: white;
        }
        
        .btn--outline-secondary {
          background: transparent;
          color: #6c757d;
          border-color: #6c757d;
        }
        
        .btn--outline-secondary:hover:not(:disabled) {
          background: #6c757d;
          color: white;
        }
        
        .btn--outline-success {
          background: transparent;
          color: #28a745;
          border-color: #28a745;
        }
        
        .btn--outline-success:hover:not(:disabled) {
          background: #28a745;
          color: white;
        }
        
        .btn--outline-danger {
          background: transparent;
          color: #dc3545;
          border-color: #dc3545;
        }
        
        .btn--outline-danger:hover:not(:disabled) {
          background: #dc3545;
          color: white;
        }
        
        .btn--outline-warning {
          background: transparent;
          color: #ffc107;
          border-color: #ffc107;
        }
        
        .btn--outline-warning:hover:not(:disabled) {
          background: #ffc107;
          color: #212529;
        }
        
        .btn--outline-info {
          background: transparent;
          color: #17a2b8;
          border-color: #17a2b8;
        }
        
        .btn--outline-info:hover:not(:disabled) {
          background: #17a2b8;
          color: white;
        }
        
        .btn--outline-light {
          background: transparent;
          color: #f8f9fa;
          border-color: #f8f9fa;
        }
        
        .btn--outline-light:hover:not(:disabled) {
          background: #f8f9fa;
          color: #212529;
        }
        
        .btn--outline-dark {
          background: transparent;
          color: #343a40;
          border-color: #343a40;
        }
        
        .btn--outline-dark:hover:not(:disabled) {
          background: #343a40;
          color: white;
        }
        
        /* 修饰符 */
        .btn--rounded {
          border-radius: 50px;
        }
        
        .btn--block {
          display: flex;
          width: 100%;
        }
        
        /* 图标 */
        .btn__icon {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .btn__icon--left {
          margin-right: -2px;
        }
        
        .btn__icon--right {
          margin-left: -2px;
        }
        
        /* 加载状态 */
        .btn__spinner {
          position: absolute;
        }
        
        .btn__content--hidden {
          opacity: 0;
        }
        
        /* 暗色主题 */
        @media (prefers-color-scheme: dark) {
          .btn--light {
            background: #495057;
            color: #fff;
            border-color: #495057;
          }
          
          .btn--light:hover:not(:disabled) {
            background: #6c757d;
            border-color: #6c757d;
          }
          
          .btn--outline-light {
            color: #f8f9fa;
            border-color: #f8f9fa;
          }
        }
      `}</style>
    </button>
  )
})

Button.displayName = 'Button'