import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Critical User Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Go to the application
    await page.goto('/');
    
    // Wait for the application to load
    await expect(page.locator('h1')).toContainText('AI Studio');
  });

  test('complete image generation workflow', async ({ page }) => {
    // Test the complete user flow: upload image -> add prompt -> select style -> generate
    
    // 1. Upload an image
    const fileInput = page.locator('input[type="file"]');
    const testImagePath = path.join(__dirname, 'fixtures', 'test-image.jpg');
    
    // Create a test image buffer if fixture doesn't exist
    const testImageBuffer = Buffer.from(
      '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
      'base64'
    );
    
    // Mock file input by creating a temporary file
    await fileInput.setInputFiles({
      name: 'test-image.jpg',
      mimeType: 'image/jpeg',
      buffer: testImageBuffer,
    });
    
    // Wait for image processing
    await expect(page.locator('.upload-area img')).toBeVisible({ timeout: 10000 });
    
    // 2. Add a prompt
    const promptInput = page.locator('textarea[placeholder*="Describe"]');
    await promptInput.fill('A beautiful mountain landscape');
    
    // 3. Select a style
    await page.locator('button:has-text("Streetwear")').click();
    
    // 4. Verify the generate button is enabled
    const generateButton = page.locator('button:has-text("Generate")');
    await expect(generateButton).toBeEnabled();
    
    // 5. Click generate (this will use mock API)
    await generateButton.click();
    
    // 6. Verify loading state
    await expect(page.locator('text=Generating...')).toBeVisible();
    await expect(page.locator('.spinner')).toBeVisible();
    
    // 7. Verify generated result appears
    await expect(page.locator('text=🎨 Generated Result')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.comparison-grid')).toBeVisible();
    
    // 8. Verify history is updated
    await expect(page.locator('text=📚 Generation History')).toBeVisible();
    await expect(page.locator('text=A beautiful mountain landscape')).toBeVisible();
  });

  test('image upload validation', async ({ page }) => {
    // Test image upload validation scenarios
    
    const fileInput = page.locator('input[type="file"]');
    
    // Test file size validation
    const largeFileBuffer = Buffer.alloc(12 * 1024 * 1024, 'x'); // 12MB file
    await fileInput.setInputFiles({
      name: 'large-file.jpg',
      mimeType: 'image/jpeg',
      buffer: largeFileBuffer,
    });
    
    // Should show validation error
    await expect(page.locator('.error-message')).toContainText('File size must be less than 10MB');
    
    // Test invalid file type
    await fileInput.setInputFiles({
      name: 'document.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('test content'),
    });
    
    // Should show validation error
    await expect(page.locator('.error-message')).toContainText('Please select a valid image file');
  });

  test('prompt validation and security', async ({ page }) => {
    const promptInput = page.locator('textarea[placeholder*="Describe"]');
    
    // Test empty prompt validation
    await promptInput.fill('');
    const generateButton = page.locator('button:has-text("Generate")');
    await expect(generateButton).toBeDisabled();
    
    // Test very short prompt validation
    await promptInput.fill('hi');
    // Should be disabled or show validation error
    
    // Test very long prompt
    const longPrompt = 'a'.repeat(501);
    await promptInput.fill(longPrompt);
    await generateButton.click();
    await expect(page.locator('.error-message')).toContainText('Prompt must be less than 500 characters');
    
    // Test malicious content filtering
    await promptInput.fill('<script>alert("xss")</script>');
    await generateButton.click();
    await expect(page.locator('.error-message')).toContainText('potentially harmful content');
  });

  test('offline detection and recovery', async ({ page, context }) => {
    // Simulate going offline
    await context.setOffline(true);
    
    // Verify offline indicator appears
    await expect(page.locator('[role="alert"]:has-text("No internet connection")')).toBeVisible();
    
    // Try to generate (should fail gracefully)
    const promptInput = page.locator('textarea[placeholder*="Describe"]');
    await promptInput.fill('Test prompt');
    
    const generateButton = page.locator('button:has-text("Generate")');
    if (await generateButton.isEnabled()) {
      await generateButton.click();
      await expect(page.locator('.error-message')).toContainText('No internet connection');
    }
    
    // Simulate coming back online
    await context.setOffline(false);
    
    // Click retry button if available
    const retryButton = page.locator('button:has-text("Retry")');
    if (await retryButton.isVisible()) {
      await retryButton.click();
    }
    
    // Offline indicator should disappear
    await expect(page.locator('[role="alert"]:has-text("No internet connection")')).toBeHidden();
  });

  test('generation history functionality', async ({ page }) => {
    // First, generate an item to have history
    await page.goto('/');
    
    // Mock a history item in localStorage
    await page.evaluate(() => {
      const mockHistoryItem = {
        id: 'test-history-1',
        imageUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAIBAQIBAQICAgICAgICAwUDAwMDAwYEBAMFBwYHBw8MDwwMDw4PDAwOEhYSEhYRDhUUFhgXGRkZEB0gHh8dGRsb//2wBDAQICAgMDAwYDAwYbERURGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbG//wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
        prompt: 'Test generated image',
        style: 'editorial',
        createdAt: new Date().toISOString()
      };
      
      localStorage.setItem('ai-studio-history', JSON.stringify([mockHistoryItem]));
    });
    
    // Refresh to load history
    await page.reload();
    
    // Verify history section is visible
    await expect(page.locator('text=📚 Generation History')).toBeVisible();
    await expect(page.locator('text=Test generated image')).toBeVisible();
    
    // Test history item selection
    const historyButton = page.locator('button:has-text("Test generated image")');
    await historyButton.click();
    
    // Verify the form is populated with history data
    await expect(page.locator('textarea')).toHaveValue('Test generated image');
    await expect(page.locator('button[data-value="editorial"]')).toHaveClass(/selected/);
    
    // Test clear history
    const clearButton = page.locator('button:has-text("Clear All")');
    await clearButton.click();
    
    // Handle confirmation dialog
    page.on('dialog', dialog => dialog.accept());
    
    // Verify history is cleared
    await expect(page.locator('text=🎭 No generations yet')).toBeVisible();
  });

  test('responsive design and mobile compatibility', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    
    // Verify layout adapts to mobile
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('.main-grid')).toBeVisible();
    
    // Test touch interactions
    const styleButton = page.locator('button:has-text("Streetwear")');
    await styleButton.tap();
    await expect(styleButton).toHaveClass(/selected/);
    
    // Test scrolling behavior
    await page.mouse.wheel(0, 500);
    await expect(page.locator('text=📚 Generation History')).toBeVisible();
  });

  test('error boundary functionality', async ({ page }) => {
    // Simulate a JavaScript error by injecting faulty code
    await page.evaluate(() => {
      // Simulate an error in React component
      const event = new CustomEvent('error', {
        detail: new Error('Test error for error boundary')
      });
      window.dispatchEvent(event);
    });
    
    // For now, just verify the app doesn't crash completely
    await expect(page.locator('h1')).toBeVisible();
    
    // If error boundary is triggered, verify error UI
    const errorBoundary = page.locator('text=⚠️ Something went wrong');
    if (await errorBoundary.isVisible()) {
      await expect(page.locator('button:has-text("Refresh Page")')).toBeVisible();
    }
  });

  test('accessibility features', async ({ page }) => {
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Check if upload area is focusable
    const uploadArea = page.locator('[role="button"][aria-label*="upload"]');
    await uploadArea.focus();
    await expect(uploadArea).toBeFocused();
    
    // Test keyboard activation
    await page.keyboard.press('Enter');
    
    // Check ARIA labels and roles
    await expect(page.locator('[role="alert"]')).toBeHidden(); // No errors initially
    
    // Test screen reader announcements
    const generateButton = page.locator('button:has-text("Generate")');
    await expect(generateButton).toHaveAttribute('aria-label', /Generate AI image/);
  });

  test('performance and loading states', async ({ page }) => {
    // Measure page load performance
    const startTime = Date.now();
    await page.goto('/');
    await page.locator('h1').waitFor();
    const loadTime = Date.now() - startTime;
    
    // Should load within reasonable time (adjust threshold as needed)
    expect(loadTime).toBeLessThan(5000);
    
    // Test loading states during generation
    const promptInput = page.locator('textarea[placeholder*="Describe"]');
    await promptInput.fill('Test prompt for loading states');
    
    // Upload a small test image
    const fileInput = page.locator('input[type="file"]');
    const smallImageBuffer = Buffer.from(
      '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
      'base64'
    );
    
    await fileInput.setInputFiles({
      name: 'test-image.jpg',
      mimeType: 'image/jpeg',
      buffer: smallImageBuffer,
    });
    
    const generateButton = page.locator('button:has-text("Generate")');
    await generateButton.click();
    
    // Verify loading indicators
    await expect(page.locator('.spinner')).toBeVisible();
    await expect(page.locator('text=Generating...')).toBeVisible();
    
    // Verify generate button is disabled during loading
    await expect(generateButton).toBeDisabled();
    
    // Verify cancel button appears
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
  });
});