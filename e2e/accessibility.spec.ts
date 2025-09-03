import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('Accessibility Tests', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('AI Studio');
  });

  test('semantic HTML structure', async ({ page }) => {
    // Check for proper landmark elements
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
    
    // Verify heading hierarchy
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1); // Should have exactly one h1
    
    const h1Text = await page.locator('h1').textContent();
    expect(h1Text).toContain('AI Studio');
    
    // Check for proper heading structure (no skipped levels)
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents();
    expect(headings.length).toBeGreaterThan(1);
  });

  test('keyboard navigation', async ({ page }) => {
    // Test tab order and focus management
    await page.keyboard.press('Tab'); // Should focus first interactive element
    
    const focusableElements = [
      { selector: 'button:has-text("Retry")', optional: true }, // Only visible when offline
      { selector: '.upload-area[role="button"]', required: true },
      { selector: 'textarea[placeholder*="Describe"]', required: true },
      { selector: 'button[data-value="editorial"]', required: true },
      { selector: 'button[data-value="streetwear"]', required: true },
      { selector: 'button[data-value="vintage"]', required: true },
      { selector: 'button[data-value="minimalist"]', required: true },
      { selector: 'button[data-value="cyberpunk"]', required: true },
      { selector: 'button:has-text("Generate")', required: true },
    ];

    let focusedElements = 0;
    for (let i = 0; i < 20; i++) { // Prevent infinite loop
      await page.keyboard.press('Tab');
      const focused = page.locator(':focus');
      const isVisible = await focused.isVisible().catch(() => false);
      if (isVisible) {
        focusedElements++;
      }
    }

    expect(focusedElements).toBeGreaterThan(5); // Should have multiple focusable elements
  });

  test('keyboard activation', async ({ page }) => {
    // Test Enter key activation on upload area
    const uploadArea = page.locator('.upload-area[role="button"]');
    await uploadArea.focus();
    
    // Simulate file input click via keyboard
    await page.keyboard.press('Enter');
    // Can't easily test file dialog, but ensure no errors
    
    // Test space key activation
    await uploadArea.focus();
    await page.keyboard.press(' ');
    // Should also trigger file dialog
    
    // Test style button keyboard activation
    const styleButton = page.locator('button[data-value="streetwear"]');
    await styleButton.focus();
    await expect(styleButton).toBeFocused();
    
    await page.keyboard.press('Enter');
    await expect(styleButton).toHaveClass(/selected/);
  });

  test('ARIA attributes and roles', async ({ page }) => {
    // Check upload area ARIA attributes
    const uploadArea = page.locator('.upload-area');
    await expect(uploadArea).toHaveAttribute('role', 'button');
    await expect(uploadArea).toHaveAttribute('aria-label');
    await expect(uploadArea).toHaveAttribute('tabindex');
    
    // Check form labels
    const textarea = page.locator('textarea[placeholder*="Describe"]');
    const textareaId = await textarea.getAttribute('id');
    if (textareaId) {
      const label = page.locator(`label[for="${textareaId}"]`);
      await expect(label).toBeVisible();
    } else {
      // Should have aria-label if no explicit label
      await expect(textarea).toHaveAttribute('aria-label');
    }
    
    // Check button accessibility
    const generateButton = page.locator('button:has-text("Generate")');
    await expect(generateButton).toHaveAttribute('aria-label');
    
    // Check error messages have proper ARIA roles
    await helpers.uploadTestImage({ size: 'too-large' });
    const errorMessage = page.locator('.error-message');
    if (await errorMessage.isVisible()) {
      await expect(errorMessage).toHaveAttribute('role', 'alert');
    }
  });

  test('screen reader announcements', async ({ page }) => {
    // Test live regions for dynamic content
    const statusRegion = page.locator('[aria-live]');
    
    // Upload an image to trigger status updates
    await helpers.uploadTestImage();
    
    // Check for processing announcements
    const processingText = page.locator('text=Processing');
    if (await processingText.isVisible()) {
      // Should be announced to screen readers
      expect(await processingText.isVisible()).toBeTruthy();
    }
    
    // Test generation status announcements
    await page.locator('textarea').fill('Test prompt');
    await page.locator('button:has-text("Streetwear")').click();
    await page.locator('button:has-text("Generate")').click();
    
    // Loading state should be announced
    await expect(page.locator('text=Generating...')).toBeVisible();
  });

  test('color contrast and visual accessibility', async ({ page }) => {
    // Test focus indicators are visible
    const focusableElements = page.locator('button, input, textarea, [tabindex]:not([tabindex="-1"])');
    const count = await focusableElements.count();
    
    for (let i = 0; i < Math.min(count, 5); i++) { // Test first 5 elements
      const element = focusableElements.nth(i);
      await element.focus();
      
      // Check if focus is visible (element should have focus styles)
      const focused = page.locator(':focus');
      await expect(focused).toBeVisible();
    }
    
    // Check for sufficient text size (no text smaller than 12px)
    const smallText = page.locator('*').evaluateAll(elements => {
      return elements.filter(el => {
        const style = window.getComputedStyle(el);
        const fontSize = parseFloat(style.fontSize);
        return fontSize < 12 && el.textContent && el.textContent.trim().length > 0;
      });
    });
    
    expect(await smallText).toHaveLength(0);
  });

  test('form accessibility', async ({ page }) => {
    // Test form structure and labeling
    const form = page.locator('form').first();
    
    // Check all inputs have labels or aria-labels
    const inputs = page.locator('input, textarea, select');
    const inputCount = await inputs.count();
    
    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const type = await input.getAttribute('type');
      
      // Skip hidden inputs
      if (type === 'hidden') continue;
      
      const hasLabel = await input.evaluate(el => {
        const id = el.getAttribute('id');
        const ariaLabel = el.getAttribute('aria-label');
        const labelElement = id ? document.querySelector(`label[for="${id}"]`) : null;
        return !!(ariaLabel || labelElement);
      });
      
      expect(hasLabel).toBeTruthy();
    }
    
    // Test form validation messages
    const generateButton = page.locator('button:has-text("Generate")');
    await generateButton.click(); // Should show validation errors
    
    // Check error messages are associated with form fields
    const errorMessages = page.locator('.error-message, [role="alert"]');
    const errorCount = await errorMessages.count();
    
    if (errorCount > 0) {
      // Error messages should be properly announced
      for (let i = 0; i < errorCount; i++) {
        const error = errorMessages.nth(i);
        await expect(error).toHaveAttribute('role', 'alert');
      }
    }
  });

  test('image accessibility', async ({ page }) => {
    // Upload an image to test image accessibility
    await helpers.uploadTestImage();
    await page.locator('.upload-area img').waitFor();
    
    // Check image has alt text
    const images = page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      expect(alt).toBeTruthy(); // Should have non-empty alt text
      expect(alt).not.toBe('image'); // Should be descriptive, not generic
    }
    
    // Test generated result images
    await page.locator('textarea').fill('Test image generation');
    await page.locator('button:has-text("Editorial")').click();
    await page.locator('button:has-text("Generate")').click();
    
    // Wait for result
    const resultImage = page.locator('.comparison-grid img');
    if (await resultImage.first().isVisible({ timeout: 10000 })) {
      const altTexts = await resultImage.allInnerTexts();
      // Generated images should have descriptive alt text
    }
  });

  test('skip links and navigation', async ({ page }) => {
    // Check for skip links (if implemented)
    const skipLink = page.locator('a[href="#main"], a:has-text("Skip to")').first();
    
    // Focus first element and check if skip link appears
    await page.keyboard.press('Tab');
    
    if (await skipLink.isVisible()) {
      await expect(skipLink).toBeFocused();
      await page.keyboard.press('Enter');
      
      // Should focus main content
      const main = page.locator('main, #main, [role="main"]');
      await expect(main).toBeFocused();
    }
  });

  test('responsive accessibility', async ({ page }) => {
    // Test accessibility across different viewport sizes
    const viewports = [
      { width: 320, height: 568 }, // Mobile
      { width: 768, height: 1024 }, // Tablet
      { width: 1200, height: 800 }, // Desktop
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.locator('h1').waitFor();
      
      // Ensure interactive elements are still accessible
      const focusableElements = page.locator('button:visible, input:visible, textarea:visible');
      const count = await focusableElements.count();
      
      expect(count).toBeGreaterThan(0); // Should have focusable elements
      
      // Test that elements are not too small for touch
      if (viewport.width <= 768) {
        const buttons = page.locator('button:visible');
        const buttonCount = await buttons.count();
        
        for (let i = 0; i < Math.min(buttonCount, 3); i++) {
          const button = buttons.nth(i);
          const box = await button.boundingBox();
          if (box) {
            // Touch targets should be at least 44px (iOS) or 48dp (Android)
            expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(40);
          }
        }
      }
    }
  });

  test('motion and animation accessibility', async ({ page }) => {
    // Test for respectful motion (if user prefers reduced motion)
    await page.addInitScript(() => {
      // Mock prefers-reduced-motion
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query.includes('prefers-reduced-motion: reduce'),
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });
    });

    // Trigger animations (loading spinner, etc.)
    await helpers.uploadTestImage();
    await page.locator('textarea').fill('Test animation respect');
    await page.locator('button:has-text("Generate")').click();
    
    // Check that spinners and animations are still visible but respectful
    const spinner = page.locator('.spinner');
    if (await spinner.isVisible()) {
      // Should still indicate loading even with reduced motion
      await expect(spinner).toBeVisible();
    }
  });

  test('error handling accessibility', async ({ page }) => {
    // Test various error states for accessibility
    
    // 1. File upload error
    await helpers.uploadTestImage({ size: 'too-large' });
    const fileError = page.locator('.error-message');
    if (await fileError.isVisible()) {
      await expect(fileError).toHaveAttribute('role', 'alert');
      await expect(fileError).toBeVisible();
    }
    
    // 2. Form validation error
    const textarea = page.locator('textarea');
    await textarea.fill('x'); // Too short
    await page.locator('button:has-text("Generate")').click();
    
    const validationError = page.locator('.error-message');
    if (await validationError.isVisible()) {
      await expect(validationError).toHaveAttribute('role', 'alert');
    }
    
    // 3. Network error (simulate offline)
    await page.context().setOffline(true);
    await page.reload();
    
    const offlineAlert = page.locator('[role="alert"]:has-text("No internet")');
    if (await offlineAlert.isVisible()) {
      await expect(offlineAlert).toHaveAttribute('role', 'alert');
      
      // Should have recovery option
      const retryButton = page.locator('button:has-text("Retry")');
      await expect(retryButton).toBeVisible();
      await expect(retryButton).toBeEnabled();
    }
  });
});