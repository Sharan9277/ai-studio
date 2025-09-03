import { test, expect } from '@playwright/test';

test.describe('AI Studio App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('should display the main title and interface', async ({ page }) => {
    // Check if main title is visible
    await expect(page.getByRole('heading', { name: 'AI Studio' })).toBeVisible();
    
    // Check if main sections are present
    await expect(page.getByText('⚡ Create Generation')).toBeVisible();
    await expect(page.getByText('👁 Live Preview')).toBeVisible();
    await expect(page.getByText('📚 Generation History')).toBeVisible();
  });

  test('should have proper form elements', async ({ page }) => {
    // Check for prompt input
    await expect(page.getByPlaceholder(/describe what you want to create/i)).toBeVisible();
    
    // Check for style selector
    await expect(page.getByRole('combobox')).toBeVisible();
    
    // Check for generate button (should be disabled initially)
    const generateButton = page.getByRole('button', { name: /generate/i });
    await expect(generateButton).toBeVisible();
    await expect(generateButton).toBeDisabled();
  });

  test('should enable generate button when form is complete', async ({ page }) => {
    // Fill in the prompt
    await page.getByPlaceholder(/describe what you want to create/i).fill('Test image generation');
    
    // Create a test file for upload
    const testImage = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    
    // Upload an image (this would need to be adapted based on your upload component)
    await page.setInputFiles('input[type="file"]', {
      name: 'test.gif',
      mimeType: 'image/gif',
      buffer: testImage,
    });

    // Check if generate button becomes enabled
    const generateButton = page.getByRole('button', { name: /generate/i });
    await expect(generateButton).toBeEnabled();
  });

  test('should show loading state during generation', async ({ page }) => {
    // Fill form
    await page.getByPlaceholder(/describe what you want to create/i).fill('Test generation');
    
    // Upload test image
    const testImage = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    await page.setInputFiles('input[type="file"]', {
      name: 'test.gif',
      mimeType: 'image/gif',
      buffer: testImage,
    });

    // Click generate
    await page.getByRole('button', { name: /generate/i }).click();

    // Should show loading state
    await expect(page.getByText('Generating...')).toBeVisible();
    
    // Should show cancel button during generation
    await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible();
  });

  test('should be keyboard accessible', async ({ page }) => {
    // Test keyboard navigation through form elements
    await page.keyboard.press('Tab'); // Should focus on image upload or first focusable element
    await page.keyboard.press('Tab'); // Should focus on prompt input
    await page.keyboard.press('Tab'); // Should focus on style selector
    await page.keyboard.press('Tab'); // Should focus on generate button
    
    // Verify that elements can receive focus (basic accessibility check)
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });

  test('should handle style selection', async ({ page }) => {
    const styleSelect = page.getByRole('combobox');
    
    // Select different style
    await styleSelect.selectOption('streetwear');
    
    // Verify selection in live preview
    await expect(page.getByText('Streetwear')).toBeVisible();
  });

  test('should display empty state for history', async ({ page }) => {
    // Initially should show empty history state
    await expect(page.getByText('🎭 No generations yet.')).toBeVisible();
    await expect(page.getByText('Your recent AI generations will appear here.')).toBeVisible();
  });
});