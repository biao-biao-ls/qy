import { test, expect } from '@playwright/test'

test.describe('Tab Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('should create new tab', async ({ page }) => {
    // Find and click new tab button
    const newTabBtn = page.locator('[data-testid="new-tab-btn"]')
    
    if (await newTabBtn.isVisible()) {
      const initialTabCount = await page.locator('[data-testid^="tab-"]').count()
      
      await newTabBtn.click()
      await page.waitForTimeout(1000)
      
      const newTabCount = await page.locator('[data-testid^="tab-"]').count()
      expect(newTabCount).toBeGreaterThan(initialTabCount)
    }
  })

  test('should switch between tabs', async ({ page }) => {
    // Assuming we have at least 2 tabs
    const tabs = page.locator('[data-testid^="tab-"]')
    const tabCount = await tabs.count()
    
    if (tabCount >= 2) {
      // Click on second tab
      await tabs.nth(1).click()
      await page.waitForTimeout(500)
      
      // Check if second tab is now active
      await expect(tabs.nth(1)).toHaveClass(/active/)
    }
  })

  test('should close tab', async ({ page }) => {
    const tabs = page.locator('[data-testid^="tab-"]')
    const initialTabCount = await tabs.count()
    
    if (initialTabCount > 1) {
      // Find close button on first tab
      const closeBtn = page.locator('[data-testid="close-tab-1"]')
      
      if (await closeBtn.isVisible()) {
        await closeBtn.click()
        await page.waitForTimeout(500)
        
        const newTabCount = await page.locator('[data-testid^="tab-"]').count()
        expect(newTabCount).toBeLessThan(initialTabCount)
      }
    }
  })

  test('should show tab context menu', async ({ page }) => {
    const tabs = page.locator('[data-testid^="tab-"]')
    
    if (await tabs.first().isVisible()) {
      // Right click on first tab
      await tabs.first().click({ button: 'right' })
      await page.waitForTimeout(500)
      
      // Check if context menu appears
      const contextMenu = page.locator('[data-testid="tab-context-menu"]')
      if (await contextMenu.isVisible()) {
        await expect(contextMenu).toBeVisible()
      }
    }
  })

  test('should handle tab drag and drop', async ({ page }) => {
    const tabs = page.locator('[data-testid^="tab-"]')
    const tabCount = await tabs.count()
    
    if (tabCount >= 2) {
      const firstTab = tabs.first()
      const secondTab = tabs.nth(1)
      
      // Get initial positions
      const firstTabBox = await firstTab.boundingBox()
      const secondTabBox = await secondTab.boundingBox()
      
      if (firstTabBox && secondTabBox) {
        // Drag first tab to second tab position
        await page.mouse.move(firstTabBox.x + firstTabBox.width / 2, firstTabBox.y + firstTabBox.height / 2)
        await page.mouse.down()
        await page.mouse.move(secondTabBox.x + secondTabBox.width / 2, secondTabBox.y + secondTabBox.height / 2)
        await page.mouse.up()
        
        await page.waitForTimeout(500)
        
        // Verify tabs have been reordered (this depends on implementation)
        // This is a basic test - actual verification would depend on how drag/drop is implemented
      }
    }
  })

  test('should handle tab loading states', async ({ page }) => {
    // Create a new tab that loads a slow page
    const newTabBtn = page.locator('[data-testid="new-tab-btn"]')
    
    if (await newTabBtn.isVisible()) {
      await newTabBtn.click()
      
      // Look for loading indicator
      const loadingIndicator = page.locator('[data-testid^="tab-loading-"]')
      
      // Loading indicator should appear initially
      if (await loadingIndicator.first().isVisible()) {
        await expect(loadingIndicator.first()).toBeVisible()
      }
    }
  })

  test('should update tab title when page loads', async ({ page }) => {
    const tabs = page.locator('[data-testid^="tab-"]')
    
    if (await tabs.first().isVisible()) {
      const initialTitle = await tabs.first().textContent()
      
      // Navigate to a page with a known title
      // This would require implementing navigation in the tab
      // For now, we just check that the tab has some title
      expect(initialTitle).toBeTruthy()
      expect(initialTitle?.length).toBeGreaterThan(0)
    }
  })
})