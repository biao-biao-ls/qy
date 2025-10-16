import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import App from '@renderer/App'

// Mock hooks
vi.mock('@renderer/hooks/useElectronAPI', () => ({
  useElectronAPI: () => ({
    window: {
      minimize: vi.fn(),
      maximize: vi.fn(),
      close: vi.fn(),
      isMaximized: vi.fn().mockResolvedValue(false)
    },
    tabs: {
      create: vi.fn(),
      remove: vi.fn(),
      switch: vi.fn(),
      getAll: vi.fn().mockResolvedValue([])
    }
  })
}))

vi.mock('@renderer/hooks/useTabManager', () => ({
  useTabManager: () => ({
    tabs: [],
    activeTab: null,
    createTab: vi.fn(),
    removeTab: vi.fn(),
    switchTab: vi.fn(),
    loading: false
  })
}))

vi.mock('@renderer/hooks/useWindowState', () => ({
  useWindowState: () => ({
    isMaximized: false,
    isMinimized: false,
    isFullScreen: false
  }),
  useDragRegion: () => ({
    onMouseDown: vi.fn(),
    style: { WebkitAppRegion: 'drag' }
  })
}))

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render without crashing', () => {
    render(<App />)
    expect(screen.getByTestId('app-container')).toBeInTheDocument()
  })

  it('should render window controls', () => {
    render(<App />)
    expect(screen.getByTestId('window-controls')).toBeInTheDocument()
  })
})