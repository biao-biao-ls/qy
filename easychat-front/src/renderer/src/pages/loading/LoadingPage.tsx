import React from 'react'

const LoadingPage: React.FC = () => {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>加载中...</h1>
      <div style={{ fontSize: '48px', animation: 'spin 1s linear infinite' }}>⟳</div>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default LoadingPage
