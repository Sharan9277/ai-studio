import { Page, expect } from '@playwright/test';

export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * Upload a test image with specified properties
   */
  async uploadTestImage(options: {
    filename?: string;
    mimeType?: string;
    size?: 'small' | 'medium' | 'large' | 'too-large';
  } = {}) {
    const { filename = 'test-image.jpg', mimeType = 'image/jpeg', size = 'small' } = options;
    
    let buffer: Buffer;
    
    switch (size) {
      case 'small':
        buffer = Buffer.from(
          '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
          'base64'
        );
        break;
      case 'medium':
        buffer = Buffer.alloc(1024 * 1024, 'x'); // 1MB
        break;
      case 'large':
        buffer = Buffer.alloc(5 * 1024 * 1024, 'x'); // 5MB
        break;
      case 'too-large':
        buffer = Buffer.alloc(12 * 1024 * 1024, 'x'); // 12MB (over limit)
        break;
    }

    const fileInput = this.page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: filename,
      mimeType,
      buffer,
    });
  }

  /**
   * Fill prompt and select style
   */
  async fillPromptAndStyle(prompt: string, style: 'editorial' | 'streetwear' | 'vintage' | 'minimalist' | 'cyberpunk') {
    const promptInput = this.page.locator('textarea[placeholder*="Describe"]');
    await promptInput.fill(prompt);
    
    await this.page.locator(`button:has-text("${this.capitalizeFirst(style)}")`).click();
  }

  /**
   * Wait for generation to complete
   */
  async waitForGeneration(timeout = 15000) {
    // Wait for loading state to appear
    await expect(this.page.locator('text=Generating...')).toBeVisible();
    
    // Wait for result to appear
    await expect(this.page.locator('text=🎨 Generated Result')).toBeVisible({ timeout });
  }

  /**
   * Simulate network conditions
   */
  async simulateNetworkCondition(condition: 'offline' | 'slow' | 'fast') {
    const context = this.page.context();
    
    switch (condition) {
      case 'offline':
        await context.setOffline(true);
        break;
      case 'slow':
        await context.setOffline(false);
        // Simulate slow 3G
        await context.addInitScript(() => {
          Object.defineProperty(navigator, 'connection', {
            value: { effectiveType: '3g', downlink: 0.5 },
            writable: true,
          });
        });
        break;
      case 'fast':
        await context.setOffline(false);
        break;
    }
  }

  /**
   * Check accessibility violations
   */
  async checkAccessibility() {
    // Basic accessibility checks
    const missingAlts = await this.page.locator('img:not([alt])').count();
    expect(missingAlts).toBe(0);

    const missingLabels = await this.page.locator('input:not([aria-label]):not([id])').count();
    expect(missingLabels).toBe(0);

    // Check for proper heading hierarchy
    const h1Count = await this.page.locator('h1').count();
    expect(h1Count).toBeGreaterThanOrEqual(1);
  }

  /**
   * Setup mock history data
   */
  async setupMockHistory(items: Array<{
    id: string;
    prompt: string;
    style: string;
    imageUrl?: string;
  }>) {
    const historyItems = items.map(item => ({
      id: item.id,
      imageUrl: item.imageUrl || 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAIBAQIBAQICAgICAgICAwUDAwMDAwYEBAMFBwYHBw8MDwwMDw4PDAwOEhYSEhYRDhUUFhgXGRkZEB0gHh8dGRsb//2wBDAQICAgMDAwYDAwYbERURGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbG//wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
      prompt: item.prompt,
      style: item.style,
      createdAt: new Date().toISOString()
    }));

    await this.page.evaluate((history) => {
      localStorage.setItem('ai-studio-history', JSON.stringify(history));
    }, historyItems);
  }

  /**
   * Clear all localStorage data
   */
  async clearStorage() {
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  }

  /**
   * Wait for loading spinner to disappear
   */
  async waitForLoadingToComplete() {
    await expect(this.page.locator('.spinner')).toBeHidden({ timeout: 15000 });
  }

  /**
   * Check for console errors
   */
  async checkConsoleErrors() {
    const logs: string[] = [];
    
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        logs.push(msg.text());
      }
    });

    return {
      getErrors: () => logs,
      hasErrors: () => logs.length > 0,
    };
  }

  /**
   * Simulate mobile viewport
   */
  async setMobileViewport() {
    await this.page.setViewportSize({ width: 375, height: 667 });
  }

  /**
   * Simulate tablet viewport
   */
  async setTabletViewport() {
    await this.page.setViewportSize({ width: 768, height: 1024 });
  }

  /**
   * Simulate desktop viewport
   */
  async setDesktopViewport() {
    await this.page.setViewportSize({ width: 1920, height: 1080 });
  }

  /**
   * Take screenshot for visual regression testing
   */
  async takeFullPageScreenshot(name: string) {
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}.png`, 
      fullPage: true 
    });
  }

  /**
   * Test keyboard navigation
   */
  async testKeyboardNavigation() {
    // Tab through focusable elements
    const focusableElements = this.page.locator('button, input, textarea, [tabindex]:not([tabindex="-1"])');
    const count = await focusableElements.count();
    
    for (let i = 0; i < count; i++) {
      await this.page.keyboard.press('Tab');
      const focused = await this.page.evaluate(() => document.activeElement?.tagName);
      expect(focused).toBeTruthy();
    }
  }

  /**
   * Utility to capitalize first letter
   */
  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

/**
 * Custom matchers for common assertions
 */
export const CustomMatchers = {
  /**
   * Check if element is properly labeled for accessibility
   */
  async toBeAccessible(page: Page, selector: string) {
    const element = page.locator(selector);
    const hasAriaLabel = await element.getAttribute('aria-label');
    const hasLabel = await element.evaluate((el) => {
      const id = el.getAttribute('id');
      return id ? document.querySelector(`label[for="${id}"]`) : null;
    });
    
    return hasAriaLabel || hasLabel;
  },

  /**
   * Check if page loads within performance threshold
   */
  async toLoadWithinTime(page: Page, maxTime: number) {
    const startTime = Date.now();
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    return loadTime <= maxTime;
  },
};