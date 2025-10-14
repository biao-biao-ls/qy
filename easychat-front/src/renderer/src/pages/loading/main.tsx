import '../../assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import LoadingPage from './LoadingPage'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found')
}

createRoot(rootElement).render(
  <StrictMode>
    <LoadingPage />
  </StrictMode>,
)