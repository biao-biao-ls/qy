import '../../assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import LauncherPage from './LauncherPage'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found')
}

createRoot(rootElement).render(
  <StrictMode>
    <LauncherPage />
  </StrictMode>,
)