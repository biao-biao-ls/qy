import { renderHook, act } from '@testing-library/react'
import { vi } from 'vitest'
import { useTabManager } from '@renderer/hooks/useTabManager'

// Mock electron API
const mockElectronAPI = {
  tabs: {
    create: vi.fn(),
    remove: vi.fn(),
    switch: vi.fn(),
    getAll: vi.fn(),
    onUpdate: vi.fn(),
    onRemove: vi.fn()
  }
}

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true
})

describe('useTabManager Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockElectronAPI.tabs.getAll.mockResolvedValue([])
  })

  it('should initialize with empty tabs', async () => {
    const { result } = renderHook(() => useTabManager())
    
    expect(result.current.tabs).toEqual([])
    expect(result.current.activeTab).toBeNull()
    expect(result.current.loading).toBe(true)
  })

  it('should create new tab', async () => {
    const mockTab = {
      id: '1',
      title: 'New Tab',
      url: 'https://example.com',
      isActive: true,
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    mockElectronAPI.tabs.create.mockResolvedValue(mockTab)
    
    const { result } = renderHook(() => useTabManager())
    
    await act(async () => {
      await result.current.createTab({
        url: 'https://example.com',
        title: 'New Tab'
      })
    })
    
    expect(mockElectronAPI.tabs.create).toHaveBeenCalledWith({
      url: 'https://example.com',
      title: 'New Tab'
    })
  })

  it('should remove tab', async () => {
    const { result } = renderHook(() => useTabManager())
    
    await act(async () => {
      await result.current.removeTab('1')
    })
    
    expect(mockElectronAPI.tabs.remove).toHaveBeenCalledWith('1')
  })

  it('should switch tab', async () => {
    const { result } = renderHook(() => useTabManager())
    
    await act(async () => {
      await result.current.switchTab('1')
    })
    
    expect(mockElectronAPI.tabs.switch).toHaveBeenCalledWith('1')
  })

  it('should handle tab updates from main process', () => {
    const { result } = renderHook(() => useTabManager())
    
    // Simulate tab update event
    const updateCallback = mockElectronAPI.tabs.onUpdate.mock.calls[0][0]
    const updatedTab = {
      id: '1',
      title: 'Updated Title',
      url: 'https://example.com',
      isActive: true,
      isLoading: false,
      canGoBack: true,
      canGoForward: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    act(() => {
      updateCallback(updatedTab)
    })
    
    expect(result.current.tabs).toContainEqual(updatedTab)
  })
})