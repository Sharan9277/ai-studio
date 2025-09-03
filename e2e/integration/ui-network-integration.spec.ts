import { test, expect, Page } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';

test.describe('UI + Network Integration Tests', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    
    // Set up network request interception for controlled testing
    await page.route('**/api/**', route => {
      // Default to pass through, but we can override in specific tests
      route.continue();
    });

    await page.goto('/');
    await expect(page.locator('h1')).toContainText('AI Studio');
  });

  test('successful generation flow with network interaction', async ({ page }) => {
    // Track network requests
    const requests: any[] = [];
    page.on('request', request => {
      if (request.url().includes('api') || request.method() !== 'GET') {
        requests.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers(),
        });
      }
    });

    // Set up mock API response for successful generation
    await page.route('**/generate', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-gen-123',
          imageUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/test-generated-image',
          prompt: 'A beautiful mountain landscape',
          style: 'editorial',
          createdAt: new Date().toISOString(),
        }),
      });
    });

    // Complete generation workflow
    await helpers.uploadTestImage();
    await helpers.fillPromptAndStyle('A beautiful mountain landscape', 'editorial');
    
    const generateButton = page.locator('button:has-text("Generate")');
    await generateButton.click();

    // Verify loading state during network request
    await expect(page.locator('text=Generating...')).toBeVisible();
    await expect(page.locator('.spinner')).toBeVisible();
    await expect(generateButton).toBeDisabled();

    // Wait for successful completion
    await helpers.waitForGeneration();

    // Verify UI updates with network response
    await expect(page.locator('text=🎨 Generated Result')).toBeVisible();
    await expect(page.locator('.comparison-grid')).toBeVisible();
    
    // Verify history updates
    await expect(page.locator('text=📚 Generation History')).toBeVisible();
    await expect(page.locator('text=A beautiful mountain landscape')).toBeVisible();

    // Verify localStorage integration
    const historyData = await page.evaluate(() => {
      const data = localStorage.getItem('ai-studio-history');
      return data ? JSON.parse(data) : [];
    });
    
    expect(historyData).toHaveLength(1);
    expect(historyData[0].prompt).toBe('A beautiful mountain landscape');
    expect(historyData[0].style).toBe('editorial');
  });

  test('network timeout handling', async ({ page }) => {
    // Simulate slow network response
    await page.route('**/generate', route => {
      // Delay response to trigger timeout
      setTimeout(() => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'delayed-response',
            imageUrl: 'data:image/jpeg;base64,test',
            prompt: 'Test prompt',
            style: 'editorial',
            createdAt: new Date().toISOString(),
          }),
        });
      }, 20000); // 20 second delay to trigger timeout
    });

    await helpers.uploadTestImage();
    await helpers.fillPromptAndStyle('Test timeout handling', 'editorial');
    
    const generateButton = page.locator('button:has-text("Generate")');
    await generateButton.click();

    // Should show loading state
    await expect(page.locator('text=Generating...')).toBeVisible();

    // Should eventually show timeout error
    await expect(page.locator('.error-message')).toContainText(/timeout|timed out/i, { timeout: 15000 });
    
    // UI should return to normal state
    await expect(page.locator('text=Generating...')).toBeHidden();
    await expect(generateButton).toBeEnabled();
  });

  test('network error recovery and retry logic', async ({ page }) => {
    let requestCount = 0;
    
    // Simulate failing requests that succeed on retry
    await page.route('**/generate', route => {
      requestCount++;
      
      if (requestCount <= 2) {
        // Fail first two requests
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Server error' }),
        });
      } else {
        // Succeed on third request
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'retry-success',
            imageUrl: 'data:image/jpeg;base64,success',
            prompt: 'Retry test',
            style: 'editorial',
            createdAt: new Date().toISOString(),
          }),
        });
      }
    });

    await helpers.uploadTestImage();
    await helpers.fillPromptAndStyle('Test retry logic', 'editorial');
    
    const generateButton = page.locator('button:has-text("Generate")');
    await generateButton.click();

    // Should show loading, then error, then eventually succeed
    await expect(page.locator('text=Generating...')).toBeVisible();
    
    // Wait for retry logic to succeed
    await helpers.waitForGeneration(30000); // Longer timeout for retries
    
    // Should eventually show success
    await expect(page.locator('text=🎨 Generated Result')).toBeVisible();
    
    // Verify multiple requests were made
    expect(requestCount).toBeGreaterThan(2);
  });

  test('concurrent request handling and race condition prevention', async ({ page }) => {
    const requestIds: string[] = [];
    
    await page.route('**/generate', route => {
      const requestBody = route.request().postData();
      const requestId = Math.random().toString(36);
      requestIds.push(requestId);
      
      // Simulate varying response times
      const delay = Math.random() * 2000 + 1000; // 1-3 second delay
      
      setTimeout(() => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: requestId,
            imageUrl: `data:image/jpeg;base64,${requestId}`,
            prompt: 'Concurrent test',
            style: 'editorial',
            createdAt: new Date().toISOString(),
          }),
        });
      }, delay);
    });

    // Set up the form
    await helpers.uploadTestImage();
    await helpers.fillPromptAndStyle('Test concurrent requests', 'editorial');
    
    const generateButton = page.locator('button:has-text("Generate")');
    
    // Rapidly click generate button multiple times
    await generateButton.click();
    await generateButton.click();
    await generateButton.click();

    // Should handle concurrent requests properly
    await helpers.waitForGeneration(10000);
    
    // Only one request should have succeeded (the last one should be shown)
    await expect(page.locator('text=🎨 Generated Result')).toBeVisible();
    
    // Verify only the latest request result is shown
    const historyData = await page.evaluate(() => {
      const data = localStorage.getItem('ai-studio-history');
      return data ? JSON.parse(data) : [];
    });
    
    // Should have only one successful result despite multiple requests
    expect(historyData).toHaveLength(1);
  });

  test('offline/online state transitions', async ({ page, context }) => {
    // Start online
    await expect(page.locator('[role="alert"]:has-text("No internet")')).toBeHidden();
    
    // Set up form
    await helpers.uploadTestImage();
    await helpers.fillPromptAndStyle('Test offline handling', 'editorial');
    
    // Go offline
    await context.setOffline(true);
    
    // Should show offline indicator
    await expect(page.locator('[role="alert"]:has-text("No internet connection")')).toBeVisible();
    
    // Try to generate (should fail gracefully)
    const generateButton = page.locator('button:has-text("Generate")');
    await generateButton.click();
    
    // Should show offline error
    await expect(page.locator('.error-message')).toContainText(/internet|connection/i);
    
    // Come back online
    await context.setOffline(false);
    
    // Retry button should work
    const retryButton = page.locator('button:has-text("Retry")');
    if (await retryButton.isVisible()) {
      // Mock successful response
      await page.route('**/generate', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'offline-recovery',
            imageUrl: 'data:image/jpeg;base64,recovery',
            prompt: 'Test offline handling',
            style: 'editorial',
            createdAt: new Date().toISOString(),
          }),
        });
      });
      
      await retryButton.click();
    }
    
    // Should hide offline indicator
    await expect(page.locator('[role="alert"]:has-text("No internet")')).toBeHidden();
  });

  test('request cancellation and cleanup', async ({ page }) => {
    let requestAborted = false;
    
    await page.route('**/generate', route => {
      // Simulate long-running request that can be cancelled
      const timeout = setTimeout(() => {
        if (!requestAborted) {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 'should-not-complete',
              imageUrl: 'data:image/jpeg;base64,test',
              prompt: 'Should be cancelled',
              style: 'editorial',
              createdAt: new Date().toISOString(),
            }),
          });
        }
      }, 5000);
      
      // Handle abort
      route.request().on('abort', () => {
        requestAborted = true;
        clearTimeout(timeout);
      });
    });

    await helpers.uploadTestImage();
    await helpers.fillPromptAndStyle('Test cancellation', 'editorial');
    
    const generateButton = page.locator('button:has-text("Generate")');
    await generateButton.click();
    
    // Wait for loading state
    await expect(page.locator('text=Generating...')).toBeVisible();
    
    // Cancel the request
    const cancelButton = page.locator('button:has-text("Cancel")');
    await cancelButton.click();
    
    // Should return to normal state
    await expect(page.locator('text=Generating...')).toBeHidden();
    await expect(generateButton).toBeEnabled();
    
    // Should not show result
    await expect(page.locator('text=🎨 Generated Result')).toBeHidden();
    
    // Verify request was actually cancelled
    expect(requestAborted).toBeTruthy();
  });

  test('localStorage integration and error handling', async ({ page }) => {
    // Test localStorage quota exceeded simulation
    await page.evaluate(() => {
      // Fill up localStorage to simulate quota exceeded
      const data = 'x'.repeat(1024 * 1024); // 1MB string
      try {
        for (let i = 0; i < 5; i++) {
          localStorage.setItem(`large-data-${i}`, data);
        }
      } catch (e) {
        // Expected to fail due to quota
      }
    });

    // Mock successful API response
    await page.route('**/generate', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'quota-test',
          imageUrl: 'data:image/jpeg;base64,test',
          prompt: 'Test quota handling',
          style: 'editorial',
          createdAt: new Date().toISOString(),
        }),
      });
    });

    await helpers.uploadTestImage();
    await helpers.fillPromptAndStyle('Test quota handling', 'editorial');
    
    const generateButton = page.locator('button:has-text("Generate")');
    await generateButton.click();

    await helpers.waitForGeneration();
    
    // Should still show result even if localStorage fails
    await expect(page.locator('text=🎨 Generated Result')).toBeVisible();
    
    // Clear localStorage for next tests
    await page.evaluate(() => localStorage.clear());
  });

  test('API response validation and error handling', async ({ page }) => {
    const testCases = [
      {
        name: 'malformed JSON',
        response: { status: 200, body: '{invalid-json}' },
        expectedError: /parsing|invalid/i,
      },
      {
        name: 'missing required fields',
        response: {
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'test' }), // Missing imageUrl, prompt, style
        },
        expectedError: /invalid|missing/i,
      },
      {
        name: 'invalid image data',
        response: {
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test',
            imageUrl: 'not-a-valid-data-url',
            prompt: 'Test',
            style: 'editorial',
            createdAt: new Date().toISOString(),
          }),
        },
        expectedError: /invalid|image/i,
      },
    ];

    for (const testCase of testCases) {
      // Clear any previous state
      await page.reload();
      await helpers.clearStorage();
      
      await page.route('**/generate', route => {
        route.fulfill(testCase.response);
      });

      await helpers.uploadTestImage();
      await helpers.fillPromptAndStyle(`Test ${testCase.name}`, 'editorial');
      
      const generateButton = page.locator('button:has-text("Generate")');
      await generateButton.click();

      // Should show appropriate error
      await expect(page.locator('.error-message')).toContainText(testCase.expectedError, { timeout: 10000 });
      
      // Should return to normal state
      await expect(generateButton).toBeEnabled();
    }
  });

  test('memory management during repeated operations', async ({ page }) => {
    // Mock API responses
    await page.route('**/generate', route => {
      const requestCount = Math.floor(Math.random() * 1000);
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: `memory-test-${requestCount}`,
          imageUrl: `data:image/jpeg;base64,${'x'.repeat(1000)}`, // Large-ish response
          prompt: 'Memory test',
          style: 'editorial',
          createdAt: new Date().toISOString(),
        }),
      });
    });

    // Track memory usage (simplified)
    let memoryGrowth = 0;
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    // Perform multiple operations
    for (let i = 0; i < 5; i++) {
      await helpers.clearStorage();
      await page.reload();
      await helpers.uploadTestImage();
      await helpers.fillPromptAndStyle(`Memory test ${i}`, 'editorial');
      
      const generateButton = page.locator('button:has-text("Generate")');
      await generateButton.click();
      await helpers.waitForGeneration();
      
      // Clear result
      await page.reload();
    }

    // Check memory growth
    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    if (initialMemory && finalMemory) {
      memoryGrowth = finalMemory - initialMemory;
      // Memory growth should be reasonable (less than 50MB)
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);
    }
  });

  test('cross-tab state synchronization', async ({ context }) => {
    // Create two tabs
    const page1 = await context.newPage();
    const page2 = await context.newPage();
    
    const helpers1 = new TestHelpers(page1);
    const helpers2 = new TestHelpers(page2);

    // Navigate both to the app
    await page1.goto('/');
    await page2.goto('/');

    // Set up mock response
    await page1.route('**/generate', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'cross-tab-test',
          imageUrl: 'data:image/jpeg;base64,crosstab',
          prompt: 'Cross-tab test',
          style: 'editorial',
          createdAt: new Date().toISOString(),
        }),
      });
    });

    await page2.route('**/generate', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'cross-tab-test',
          imageUrl: 'data:image/jpeg;base64,crosstab',
          prompt: 'Cross-tab test',
          style: 'editorial',
          createdAt: new Date().toISOString(),
        }),
      });
    });

    // Generate in first tab
    await helpers1.uploadTestImage();
    await helpers1.fillPromptAndStyle('Cross-tab test', 'editorial');
    
    const generateButton1 = page1.locator('button:has-text("Generate")');
    await generateButton1.click();
    await helpers1.waitForGeneration();

    // Check if history updates in second tab
    await page2.reload(); // Reload to check localStorage sync
    
    // Both tabs should show the same history
    await expect(page2.locator('text=Cross-tab test')).toBeVisible();
    
    await page1.close();
    await page2.close();
  });
});