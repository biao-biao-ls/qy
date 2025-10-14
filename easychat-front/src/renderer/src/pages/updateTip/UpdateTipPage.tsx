import React from 'react'

const UpdateTipPage: React.FC = () => {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>更新提示</h1>
      <p>发现新版本，是否立即更新？</p>
      <div style={{ marginTop: '20px' }}>
        <button style={{ marginRight: '10px', padding: '8px 16px' }}>立即更新</button>
        <button style={{ padding: '8px 16px' }}>稍后提醒</button>
      </div>
    </div>
  )
}

export default UpdateTipPage