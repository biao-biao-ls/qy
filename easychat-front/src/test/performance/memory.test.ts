describe('Memory Usage Tests', () => {
  test('should not exceed memory limits', () => {
    const memoryUsage = process.memoryUsage()
    
    console.log('Memory Usage:')
    console.log(`RSS: ${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`)
    console.log(`Heap Total: ${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`)
    console.log(`Heap Used: ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`)
    console.log(`External: ${(memoryUsage.external / 1024 / 1024).toFixed(2)} MB`)
    
    // RSS should not exceed 200MB for basic tests
    expect(memoryUsage.rss / 1024 / 1024).toBeLessThan(200)
    
    // Heap usage should not exceed 100MB for basic tests
    expect(memoryUsage.heapUsed / 1024 / 1024).toBeLessThan(100)
  })

  test('should handle memory cleanup', () => {
    const initialMemory = process.memoryUsage().heapUsed
    
    // Create some objects
    const largeArray = new Array(10000).fill('test data')
    const memoryAfterAllocation = process.memoryUsage().heapUsed
    
    // Clear references
    largeArray.length = 0
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc()
    }
    
    const memoryAfterCleanup = process.memoryUsage().heapUsed
    
    console.log(`Initial memory: ${(initialMemory / 1024 / 1024).toFixed(2)} MB`)
    console.log(`After allocation: ${(memoryAfterAllocation / 1024 / 1024).toFixed(2)} MB`)
    console.log(`After cleanup: ${(memoryAfterCleanup / 1024 / 1024).toFixed(2)} MB`)
    
    // Memory should be cleaned up (allowing for some variance)
    expect(memoryAfterCleanup).toBeLessThanOrEqual(memoryAfterAllocation)
  })

  test('should handle multiple tab creation without memory leaks', () => {
    const initialMemory = process.memoryUsage().heapUsed
    
    // Simulate creating multiple tabs
    const tabs = []
    for (let i = 0; i < 10; i++) {
      tabs.push({
        id: `tab-${i}`,
        title: `Tab ${i}`,
        url: `https://example${i}.com`,
        data: new Array(1000).fill(`data-${i}`)
      })
    }
    
    const memoryAfterCreation = process.memoryUsage().heapUsed
    
    // Clear tabs
    tabs.length = 0
    
    if (global.gc) {
      global.gc()
    }
    
    const memoryAfterCleanup = process.memoryUsage().heapUsed
    
    console.log(`Memory before tabs: ${(initialMemory / 1024 / 1024).toFixed(2)} MB`)
    console.log(`Memory after creating tabs: ${(memoryAfterCreation / 1024 / 1024).toFixed(2)} MB`)
    console.log(`Memory after cleanup: ${(memoryAfterCleanup / 1024 / 1024).toFixed(2)} MB`)
    
    // Memory should return close to initial levels
    const memoryIncrease = memoryAfterCleanup - initialMemory
    expect(memoryIncrease / 1024 / 1024).toBeLessThan(10) // Less than 10MB increase
  })
})