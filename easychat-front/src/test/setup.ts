import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Electron APIs
const mockElectronAPI = {
  window: {
    minimize: vi.fn(),
    maximize: vi.fn(),
    close: vi.fn(),
    setTitle: vi.fn(),
    isMaximized: vi.fn().mockResolvedValue(false),
    getState: vi.fn().mockResolvedValue({
      isMaximized: false,
      isMinimized: false,
      isFullScreen: false
    })
  },
  tabs: {
    create: vi.fn(),
    remove: vi.fn(),
    switch: vi.fn(),
    getAll: vi.fn().mockResolvedValue([]),
    onUpdate: vi.fn(),
    onRemove: vi.fn()
  },
  config: {
    get: vi.fn(),
    set: vi.fn(),
    onChange: vi.fn()
  },
  push: {
    onMessage: vi.fn(),
    sendMessage: vi.fn()
  },
  ipc: {
    invoke: vi.fn(),
    on: vi.fn(),
    removeAllListeners: vi.fn()
  }
}

// Mock window.electronAPI
Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true
})

// Mock console methods in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
}

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}))

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}))

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
})

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks()
})