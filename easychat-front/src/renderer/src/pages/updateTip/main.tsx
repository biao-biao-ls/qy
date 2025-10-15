import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import UpdateTipPage from './UpdateTipPage'

// 直接渲染到 body，因为 HTML 中没有 root 元素
const container = document.body
createRoot(container).render(
  <StrictMode>
    <UpdateTipPage />
  </StrictMode>
)
