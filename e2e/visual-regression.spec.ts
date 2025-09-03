import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('Visual Regression Tests', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('AI Studio');
  });

  test('homepage layout - desktop', async ({ page }) => {
    await helpers.setDesktopViewport();
    
    // Wait for all content to load
    await page.locator('h1').waitFor();
    await page.locator('.main-grid').waitFor();
    
    // Take full page screenshot
    await expect(page).toHaveScreenshot('homepage-desktop.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('homepage layout - tablet', async ({ page }) => {
    await helpers.setTabletViewport();
    
    await page.locator('h1').waitFor();
    await page.locator('.main-grid').waitFor();
    
    await expect(page).toHaveScreenshot('homepage-tablet.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('homepage layout - mobile', async ({ page }) => {
    await helpers.setMobileViewport();
    
    await page.locator('h1').waitFor();
    await page.locator('.main-grid').waitFor();
    
    await expect(page).toHaveScreenshot('homepage-mobile.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('upload area states', async ({ page }) => {
    // Empty state
    await expect(page.locator('.upload-area')).toHaveScreenshot('upload-empty.png');
    
    // Drag over state (simulate hover)
    await page.locator('.upload-area').hover();
    await page.locator('.upload-area').evaluate(el => el.classList.add('dragging'));
    await expect(page.locator('.upload-area')).toHaveScreenshot('upload-dragging.png');
    
    // Reset state
    await page.locator('.upload-area').evaluate(el => el.classList.remove('dragging'));
    
    // With image state
    await helpers.uploadTestImage({ size: 'small' });
    await page.locator('.upload-area img').waitFor();
    await expect(page.locator('.upload-area')).toHaveScreenshot('upload-with-image.png');
  });

  test('style selector states', async ({ page }) => {
    const styleSelector = page.locator('.style-selector');
    
    // Default state
    await expect(styleSelector).toHaveScreenshot('styles-default.png');
    
    // Selected states for each style
    const styles = ['Editorial', 'Streetwear', 'Vintage', 'Minimalist', 'Cyberpunk'];
    
    for (const style of styles) {
      await page.locator(`button:has-text("${style}")`).click();
      await expect(styleSelector).toHaveScreenshot(`styles-${style.toLowerCase()}-selected.png`);
    }
  });

  test('generation process states', async ({ page }) => {
    // Setup for generation
    await helpers.uploadTestImage();
    await helpers.fillPromptAndStyle('A beautiful landscape', 'editorial');
    
    // Initial ready state
    const generateButton = page.locator('button:has-text("Generate")');
    await expect(generateButton).toHaveScreenshot('generate-button-ready.png');
    
    // Loading state (capture quickly)
    await generateButton.click();
    await page.locator('text=Generating...').waitFor();
    await expect(generateButton).toHaveScreenshot('generate-button-loading.png');
    
    // Cancel button state
    const cancelButton = page.locator('button:has-text("Cancel")');
    await expect(cancelButton).toHaveScreenshot('cancel-button.png');
  });

  test('history section states', async ({ page }) => {
    // Empty history state
    await expect(page.locator('.history-section')).toHaveScreenshot('history-empty.png');
    
    // History with items
    await helpers.setupMockHistory([
      { id: '1', prompt: 'Beautiful mountain landscape', style: 'editorial' },
      { id: '2', prompt: 'Urban street photography', style: 'streetwear' },
      { id: '3', prompt: 'Minimalist architecture', style: 'minimalist' },
    ]);
    
    await page.reload();
    await page.locator('text=📚 Generation History').waitFor();
    
    await expect(page.locator('.history-section')).toHaveScreenshot('history-with-items.png');
  });

  test('error states', async ({ page }) => {
    // Upload error state
    await helpers.uploadTestImage({ size: 'too-large' });
    await page.locator('.error-message').waitFor();
    await expect(page.locator('.error-message')).toHaveScreenshot('error-file-too-large.png');
    
    // Prompt validation error
    const promptInput = page.locator('textarea[placeholder*="Describe"]');
    await promptInput.fill('<script>alert("test")</script>');
    
    const generateButton = page.locator('button:has-text("Generate")');
    await generateButton.click();
    
    await page.locator('.error-message').waitFor();
    await expect(page.locator('.error-message')).toHaveScreenshot('error-harmful-content.png');
  });

  test('offline state', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true);
    
    // Wait for offline indicator
    await page.locator('[role="alert"]:has-text("No internet connection")').waitFor();
    
    // Capture offline state
    await expect(page.locator('.container')).toHaveScreenshot('offline-state.png', {
      fullPage: true,
    });
  });

  test('dark mode consistency', async ({ page }) => {
    // If dark mode is implemented, test it
    // For now, verify current theme consistency
    await expect(page).toHaveScreenshot('current-theme-full.png', {
      fullPage: true,
      animations: 'disabled',
    });
    
    // Test specific components for theme consistency
    await expect(page.locator('.card')).first().toHaveScreenshot('card-theme.png');
    await expect(page.locator('button').first()).toHaveScreenshot('button-theme.png');
    await expect(page.locator('textarea')).first().toHaveScreenshot('textarea-theme.png');
  });

  test('loading spinner consistency', async ({ page }) => {
    // Upload image to trigger processing state
    await helpers.uploadTestImage({ size: 'medium' });
    
    // Capture processing spinner
    const processingSpinner = page.locator('.upload-area .spinner');
    if (await processingSpinner.isVisible()) {
      await expect(processingSpinner).toHaveScreenshot('spinner-processing.png');
    }
    
    // Capture generation spinner
    await page.locator('textarea').fill('Test prompt');
    await page.locator('button:has-text("Streetwear")').click();
    await page.locator('button:has-text("Generate")').click();
    
    const generationSpinner = page.locator('button:has-text("Generating...") .spinner');
    await expect(generationSpinner).toHaveScreenshot('spinner-generating.png');
  });

  test('responsive breakpoints', async ({ page }) => {
    const breakpoints = [
      { name: 'mobile-small', width: 320, height: 568 },
      { name: 'mobile-medium', width: 375, height: 667 },
      { name: 'mobile-large', width: 414, height: 896 },
      { name: 'tablet-portrait', width: 768, height: 1024 },
      { name: 'tablet-landscape', width: 1024, height: 768 },
      { name: 'desktop-small', width: 1200, height: 800 },
      { name: 'desktop-large', width: 1920, height: 1080 },
    ];

    for (const breakpoint of breakpoints) {
      await page.setViewportSize({ width: breakpoint.width, height: breakpoint.height });
      await page.locator('h1').waitFor();
      
      await expect(page).toHaveScreenshot(`responsive-${breakpoint.name}.png`, {
        fullPage: true,
        animations: 'disabled',
      });
    }
  });

  test('component interaction states', async ({ page }) => {
    // Button hover states
    const generateButton = page.locator('button:has-text("Generate")');
    await generateButton.hover();
    await expect(generateButton).toHaveScreenshot('button-hover.png');
    
    // Input focus states
    const promptInput = page.locator('textarea');
    await promptInput.focus();
    await expect(promptInput).toHaveScreenshot('textarea-focus.png');
    
    // Upload area focus state
    const uploadArea = page.locator('.upload-area');
    await uploadArea.focus();
    await expect(uploadArea).toHaveScreenshot('upload-area-focus.png');
  });
});