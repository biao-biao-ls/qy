import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { TabRenderer } from '@renderer/components/TabRenderer'
import type { TabItem } from '@types/tab'

const mockTabs: TabItem[] = [
  {
    id: '1',
    title: 'Tab 1',
    url: 'https://example1.com',
    isActive: true,
    isLoading: false,
    canGoBack: false,
    canGoForward: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    title: 'Tab 2',
    url: 'https://example2.com',
    isActive: false,
    isLoading: false,
    canGoBack: true,
    canGoForward: false,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

describe('TabRenderer Component', () => {
  const mockProps = {
    tabs: mockTabs,
    activeTab: '1',
    onTabCreate: vi.fn(),
    onTabRemove: vi.fn(),
    onTabSwitch: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render all tabs', () => {
    render(<TabRenderer {...mockProps} />)
    
    expect(screen.getByText('Tab 1')).toBeInTheDocument()
    expect(screen.getByText('Tab 2')).toBeInTheDocument()
  })

  it('should highlight active tab', () => {
    render(<TabRenderer {...mockProps} />)
    
    const activeTab = screen.getByTestId('tab-1')
    expect(activeTab).toHaveClass('active')
  })

  it('should call onTabSwitch when clicking inactive tab', () => {
    render(<TabRenderer {...mockProps} />)
    
    const inactiveTab = screen.getByTestId('tab-2')
    fireEvent.click(inactiveTab)
    
    expect(mockProps.onTabSwitch).toHaveBeenCalledWith('2')
  })

  it('should call onTabRemove when clicking close button', () => {
    render(<TabRenderer {...mockProps} />)
    
    const closeButton = screen.getByTestId('close-tab-1')
    fireEvent.click(closeButton)
    
    expect(mockProps.onTabRemove).toHaveBeenCalledWith('1')
  })

  it('should show loading indicator for loading tabs', () => {
    const loadingTabs = [
      { ...mockTabs[0], isLoading: true }
    ]
    
    render(<TabRenderer {...mockProps} tabs={loadingTabs} />)
    
    expect(screen.getByTestId('tab-loading-1')).toBeInTheDocument()
  })
})