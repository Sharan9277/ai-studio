import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';

test.describe('Performance and UX Smoke Tests', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
  });

  test('page load performance', async ({ page }) => {
    const startTime = Date.now();
    
    // Navigate to the application
    await page.goto('/');
    
    // Wait for main content to be visible
    await page.locator('h1').waitFor();
    await page.locator('.main-grid').waitFor();
    
    const loadTime = Date.now() - startTime;
    
    // Page should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
    
    // Check Core Web Vitals using Performance API
    const webVitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals: any = {};
        
        // Largest Contentful Paint (LCP)
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          vitals.lcp = lastEntry.startTime;
        }).observe({ entryTypes: ['largest-contentful-paint'] });
        
        // First Input Delay would be measured on real interaction
        
        // Cumulative Layout Shift (CLS)
        new PerformanceObserver((list) => {
          let cls = 0;
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              cls += (entry as any).value;
            }
          }
          vitals.cls = cls;
        }).observe({ entryTypes: ['layout-shift'] });
        
        // Wait a moment for measurements
        setTimeout(() => resolve(vitals), 2000);
      });
    });
    
    console.log('Web Vitals:', webVitals);
    
    // LCP should be under 2.5s (good threshold)
    if ((webVitals as any).lcp) {
      expect((webVitals as any).lcp).toBeLessThan(2500);
    }
    
    // CLS should be under 0.1 (good threshold)
    if ((webVitals as any).cls) {
      expect((webVitals as any).cls).toBeLessThan(0.1);
    }
  });

  test('bundle size and resource optimization', async ({ page }) => {
    const resources: any[] = [];
    
    // Track all network requests
    page.on('response', response => {
      if (response.url().includes('static/')) {
        resources.push({
          url: response.url(),
          size: response.headers()['content-length'],
          type: response.request().resourceType(),
          status: response.status(),
        });
      }
    });
    
    await page.goto('/');
    await page.locator('h1').waitFor();
    
    // Wait for all resources to load
    await page.waitForLoadState('networkidle');
    
    // Check JavaScript bundle sizes
    const jsResources = resources.filter(r => r.url.includes('.js'));
    const totalJSSize = jsResources.reduce((sum, r) => sum + (parseInt(r.size) || 0), 0);
    
    // Main JS bundle should be under 500KB (compressed)
    expect(totalJSSize).toBeLessThan(500 * 1024);
    
    // Check CSS bundle sizes  
    const cssResources = resources.filter(r => r.url.includes('.css'));
    const totalCSSSize = cssResources.reduce((sum, r) => sum + (parseInt(r.size) || 0), 0);
    
    // CSS should be under 100KB
    expect(totalCSSSize).toBeLessThan(100 * 1024);
    
    // All static resources should return 200
    resources.forEach(resource => {
      expect(resource.status).toBe(200);
    });
  });

  test('interaction responsiveness', async ({ page }) => {
    await page.goto('/');
    await page.locator('h1').waitFor();
    
    // Test button click responsiveness
    const measurements: number[] = [];
    
    for (let i = 0; i < 5; i++) {
      const button = page.locator('button[data-value="streetwear"]');
      
      const startTime = Date.now();
      await button.click();
      
      // Wait for visual feedback (selected state)
      await expect(button).toHaveClass(/selected/);
      const responseTime = Date.now() - startTime;
      
      measurements.push(responseTime);
      
      // Deselect for next iteration
      await page.locator('button[data-value="editorial"]').click();
    }
    
    // Average response time should be under 100ms
    const avgResponseTime = measurements.reduce((sum, time) => sum + time, 0) / measurements.length;
    expect(avgResponseTime).toBeLessThan(100);
    
    // No single interaction should take more than 200ms
    measurements.forEach(time => {
      expect(time).toBeLessThan(200);
    });
  });

  test('image processing performance', async ({ page }) => {
    await page.goto('/');
    
    // Test image upload processing time
    const processingTimes: number[] = [];
    
    for (let i = 0; i < 3; i++) {
      const startTime = Date.now();
      
      // Upload a medium-sized test image
      await helpers.uploadTestImage({ size: 'medium' });
      
      // Wait for processing to complete
      await page.locator('.upload-area img').waitFor({ timeout: 10000 });
      
      const processingTime = Date.now() - startTime;
      processingTimes.push(processingTime);
      
      // Reload for next iteration
      if (i < 2) await page.reload();
    }
    
    // Image processing should complete within 5 seconds
    processingTimes.forEach(time => {
      expect(time).toBeLessThan(5000);
    });
    
    // Average processing time should be reasonable
    const avgProcessingTime = processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length;
    expect(avgProcessingTime).toBeLessThan(3000);
  });

  test('memory usage during heavy operations', async ({ page }) => {
    await page.goto('/');
    
    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });
    
    // Perform memory-intensive operations
    for (let i = 0; i < 10; i++) {
      await helpers.uploadTestImage({ size: 'large' });
      await page.locator('.upload-area img').waitFor();
      
      // Clear the image to simulate repeated usage
      await page.reload();
    }
    
    // Check final memory usage
    const finalMemory = await page.evaluate(() => {
      // Force garbage collection if available
      if ((window as any).gc) {
        (window as any).gc();
      }
      return (performance as any).memory?.usedJSHeapSize || 0;
    });
    
    if (initialMemory && finalMemory) {
      const memoryGrowth = finalMemory - initialMemory;
      
      // Memory growth should be reasonable (under 100MB)
      expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024);
    }
  });

  test('scroll performance and smooth interactions', async ({ page }) => {
    await page.goto('/');
    
    // Add mock history to enable scrolling
    await helpers.setupMockHistory(
      Array.from({ length: 20 }, (_, i) => ({
        id: `perf-test-${i}`,
        prompt: `Performance test item ${i}`,
        style: 'editorial',
      }))
    );
    
    await page.reload();
    await page.locator('text=📚 Generation History').waitFor();
    
    // Measure scroll performance
    const scrollMetrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        const metrics: number[] = [];
        let frameCount = 0;
        
        const measureFrame = () => {
          const start = performance.now();
          requestAnimationFrame(() => {
            const frameTime = performance.now() - start;
            metrics.push(frameTime);
            frameCount++;
            
            if (frameCount < 60) { // Measure 60 frames
              measureFrame();
            } else {
              resolve(metrics);
            }
          });
        };
        
        // Start scrolling
        window.scrollTo(0, 100);
        measureFrame();
        
        // Continue scrolling for measurement
        let scrollPos = 100;
        const scrollInterval = setInterval(() => {
          scrollPos += 10;
          window.scrollTo(0, scrollPos);
          
          if (frameCount >= 60) {
            clearInterval(scrollInterval);
          }
        }, 16); // ~60fps
      });
    });
    
    const avgFrameTime = (scrollMetrics as number[]).reduce((sum, time) => sum + time, 0) / (scrollMetrics as number[]).length;
    
    // Frame time should be under 16.67ms (60fps)
    expect(avgFrameTime).toBeLessThan(16.67);
    
    // No frame should take longer than 33ms (30fps minimum)
    (scrollMetrics as number[]).forEach(frameTime => {
      expect(frameTime).toBeLessThan(33);
    });
  });

  test('network performance under different conditions', async ({ page, context }) => {
    // Test under simulated slow 3G conditions
    await page.route('**/*', (route) => {
      // Simulate network delay
      setTimeout(() => {
        route.continue();
      }, Math.random() * 100 + 50); // 50-150ms delay
    });
    
    const startTime = Date.now();
    await page.goto('/');
    await page.locator('h1').waitFor();
    const loadTimeWithDelay = Date.now() - startTime;
    
    // Should still load within reasonable time even with network delays
    expect(loadTimeWithDelay).toBeLessThan(10000); // 10 seconds max
    
    // Test generation request performance
    await page.route('**/generate', route => {
      // Simulate API response time
      setTimeout(() => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'perf-test',
            imageUrl: 'data:image/jpeg;base64,perftest',
            prompt: 'Performance test',
            style: 'editorial',
            createdAt: new Date().toISOString(),
          }),
        });
      }, 2000); // 2 second API response time
    });
    
    await helpers.uploadTestImage();
    await helpers.fillPromptAndStyle('Performance test', 'editorial');
    
    const generateStart = Date.now();
    await page.locator('button:has-text("Generate")').click();
    await helpers.waitForGeneration();
    const generateTime = Date.now() - generateStart;
    
    // Total generation time should be reasonable
    expect(generateTime).toBeLessThan(15000); // 15 seconds max including retries
  });

  test('UI responsiveness during background tasks', async ({ page }) => {
    await page.goto('/');
    
    // Start a background task (image processing)
    await helpers.uploadTestImage({ size: 'large' });
    
    // While processing, test UI responsiveness
    const responseTimes: number[] = [];
    
    while (await page.locator('text=Processing').isVisible().catch(() => false)) {
      const startTime = Date.now();
      
      // Test style button clicks during processing
      await page.locator('button[data-value="streetwear"]').click();
      await expect(page.locator('button[data-value="streetwear"]')).toHaveClass(/selected/);
      
      const responseTime = Date.now() - startTime;
      responseTimes.push(responseTime);
      
      await page.waitForTimeout(100);
      await page.locator('button[data-value="editorial"]').click();
    }
    
    if (responseTimes.length > 0) {
      const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      
      // UI should remain responsive even during background processing
      expect(avgResponseTime).toBeLessThan(200);
    }
  });

  test('error handling performance', async ({ page }) => {
    await page.goto('/');
    
    // Test rapid error generation and recovery
    const errorTimes: number[] = [];
    
    for (let i = 0; i < 5; i++) {
      const startTime = Date.now();
      
      // Trigger an error (upload oversized file)
      await helpers.uploadTestImage({ size: 'too-large' });
      
      // Wait for error message
      await page.locator('.error-message').waitFor();
      
      const errorTime = Date.now() - startTime;
      errorTimes.push(errorTime);
      
      // Clear error and reset
      await page.reload();
    }
    
    // Error handling should be fast
    errorTimes.forEach(time => {
      expect(time).toBeLessThan(1000); // Under 1 second
    });
    
    const avgErrorTime = errorTimes.reduce((sum, time) => sum + time, 0) / errorTimes.length;
    expect(avgErrorTime).toBeLessThan(500); // Average under 500ms
  });

  test('animation and transition performance', async ({ page }) => {
    await page.goto('/');
    
    // Test button hover animations
    const animationMetrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        const button = document.querySelector('button[data-value="editorial"]') as HTMLElement;
        if (!button) return resolve([]);
        
        const metrics: number[] = [];
        let frameCount = 0;
        
        const measureAnimation = () => {
          const start = performance.now();
          requestAnimationFrame(() => {
            const frameTime = performance.now() - start;
            metrics.push(frameTime);
            frameCount++;
            
            if (frameCount < 30) { // Measure 30 frames
              measureAnimation();
            } else {
              resolve(metrics);
            }
          });
        };
        
        // Trigger hover animation
        button.dispatchEvent(new MouseEvent('mouseenter'));
        measureAnimation();
      });
    });
    
    if ((animationMetrics as number[]).length > 0) {
      const avgFrameTime = (animationMetrics as number[]).reduce((sum, time) => sum + time, 0) / (animationMetrics as number[]).length;
      
      // Animation frames should maintain 60fps
      expect(avgFrameTime).toBeLessThan(16.67);
    }
  });

  test('concurrent operation performance', async ({ page }) => {
    await page.goto('/');
    
    // Mock API with varying response times
    await page.route('**/generate', route => {
      const delay = Math.random() * 1000 + 500; // 0.5-1.5 second delay
      
      setTimeout(() => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: `concurrent-${Date.now()}`,
            imageUrl: 'data:image/jpeg;base64,concurrent',
            prompt: 'Concurrent test',
            style: 'editorial',
            createdAt: new Date().toISOString(),
          }),
        });
      }, delay);
    });
    
    // Test multiple operations in quick succession
    const operations = Array.from({ length: 3 }, async (_, i) => {
      await helpers.uploadTestImage();
      await helpers.fillPromptAndStyle(`Concurrent test ${i}`, 'editorial');
      
      const startTime = Date.now();
      await page.locator('button:has-text("Generate")').click();
      await helpers.waitForGeneration();
      return Date.now() - startTime;
    });
    
    const results = await Promise.all(operations);
    
    // All operations should complete within reasonable time
    results.forEach(time => {
      expect(time).toBeLessThan(10000); // 10 seconds max
    });
  });
});