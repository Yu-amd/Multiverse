import { test, expect } from '@playwright/test';

test.describe('Multiverse AI Playground - Smoke Tests', () => {
  test('should load the app successfully', async ({ page }) => {
    await page.goto('/');
    
    // Check that the page title or main elements are present
    await expect(page.locator('.app-container')).toBeVisible();
  });

  test('should display chat container and code panel', async ({ page }) => {
    await page.goto('/');
    
    // Verify main UI components are visible
    await expect(page.locator('.chat-container')).toBeVisible();
    await expect(page.locator('.code-panel')).toBeVisible();
  });

  test('should have control buttons', async ({ page }) => {
    await page.goto('/');
    
    // Check for Settings, Dashboard, and Clear buttons
    const settingsButton = page.locator('button', { hasText: 'Settings' });
    const dashboardButton = page.locator('button', { hasText: 'Dashboard' });
    const clearButton = page.locator('button', { hasText: 'Clear' });
    
    await expect(settingsButton).toBeVisible();
    await expect(dashboardButton).toBeVisible();
    await expect(clearButton).toBeVisible();
  });

  test('should open settings modal', async ({ page }) => {
    await page.goto('/');
    
    // Click settings button
    await page.locator('button', { hasText: 'Settings' }).click();
    
    // Wait for modal to be visible
    await expect(page.locator('h2', { hasText: 'Model Settings' })).toBeVisible();
    
    // Wait a bit for all elements to render
    await page.waitForTimeout(500);
    
    // Check for key settings elements with more specific selectors
    await expect(page.locator('label', { hasText: 'Model Provider' })).toBeVisible();
    await expect(page.locator('label', { hasText: 'Temperature:' })).toBeVisible();
    await expect(page.locator('label', { hasText: 'Max Tokens:' })).toBeVisible();
  });

  test('should open dashboard modal', async ({ page }) => {
    await page.goto('/');
    
    // Click dashboard button
    await page.locator('button', { hasText: 'Dashboard' }).click();
    
    // Check modal is visible
    await expect(page.locator('h2', { hasText: 'Performance Dashboard' })).toBeVisible();
    
    // Check for dashboard tabs
    await expect(page.locator('button', { hasText: 'Model Metrics' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'System Metrics' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Composite Insights' })).toBeVisible();
  });

  test('should have language tabs in code panel', async ({ page }) => {
    await page.goto('/');
    
    // Check for language tabs
    await expect(page.locator('.language-tab', { hasText: 'Python' })).toBeVisible();
    await expect(page.locator('.language-tab', { hasText: 'JavaScript' })).toBeVisible();
    await expect(page.locator('.language-tab', { hasText: 'cURL' })).toBeVisible();
    await expect(page.locator('.language-tab', { hasText: 'Rust' })).toBeVisible();
  });

  test('should switch language tabs', async ({ page }) => {
    await page.goto('/');
    
    // Click JavaScript tab
    await page.locator('.language-tab', { hasText: 'JavaScript' }).click();
    
    // Verify JavaScript tab is active
    await expect(page.locator('.language-tab.active', { hasText: 'JavaScript' })).toBeVisible();
    
    // Switch to Python
    await page.locator('.language-tab', { hasText: 'Python' }).click();
    await expect(page.locator('.language-tab.active', { hasText: 'Python' })).toBeVisible();
  });

  test('should display code preview', async ({ page }) => {
    await page.goto('/');
    
    // Check that code preview is visible and contains code
    const codePreview = page.locator('.code-preview');
    await expect(codePreview).toBeVisible();
    
    // Code should contain some Python code by default
    await expect(codePreview).toContainText('def');
  });

  test('should have chat input and send button', async ({ page }) => {
    await page.goto('/');
    
    // Check for chat input
    const chatInput = page.locator('.chat-input');
    await expect(chatInput).toBeVisible();
    
    // Check for send button
    const sendButton = page.locator('.send-button');
    await expect(sendButton).toBeVisible();
  });

  test('should type in chat input', async ({ page }) => {
    await page.goto('/');
    
    // Type in chat input
    const chatInput = page.locator('.chat-input');
    await chatInput.fill('Hello, this is a test message');
    
    // Verify text was entered
    await expect(chatInput).toHaveValue('Hello, this is a test message');
  });

  test('should change model endpoint in settings', async ({ page }) => {
    await page.goto('/');
    
    // Open settings
    await page.locator('button', { hasText: 'Settings' }).click();
    
    // Change model provider
    const modelSelect = page.locator('select').first();
    await modelSelect.selectOption('Ollama (Local)');
    
    // Verify endpoint changed
    const endpointInput = page.locator('input[type="text"]').first();
    await expect(endpointInput).toHaveValue('http://localhost:11434');
    
    // Change to LM Studio
    await modelSelect.selectOption('LM Studio (Local)');
    await expect(endpointInput).toHaveValue('http://localhost:1234');
  });

  test('should display info modal', async ({ page }) => {
    await page.goto('/');
    
    // Click info button
    await page.locator('button', { hasText: 'Info' }).click();
    
    // Wait for modal to be visible
    await expect(page.locator('h2', { hasText: 'API Integration Guide' })).toBeVisible();
    
    // Wait a bit for all elements to render
    await page.waitForTimeout(500);
    
    // Check for guide content with more specific selectors
    await expect(page.locator('h3', { hasText: '🚀 Supported Endpoints' })).toBeVisible();
    await expect(page.locator('li', { hasText: 'LM Studio: http://localhost:1234 (default)' })).toBeVisible();
    await expect(page.locator('li', { hasText: 'Ollama: http://localhost:11434 (default)' })).toBeVisible();
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Check that app is still visible
    await expect(page.locator('.app-container')).toBeVisible();
    
    // Mobile layout should be detected
    const contentWrapper = page.locator('.content-wrapper');
    await expect(contentWrapper).toHaveClass(/mobile-layout/);
  });

  test('should be responsive on tablet viewport', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    
    // Check that app is visible
    await expect(page.locator('.app-container')).toBeVisible();
  });

  test('should close modals with close button', async ({ page }) => {
    await page.goto('/');
    
    // Open settings
    await page.locator('button', { hasText: 'Settings' }).click();
    await expect(page.locator('h2', { hasText: 'Model Settings' })).toBeVisible();
    
    // Close settings
    await page.locator('button', { hasText: 'Close' }).first().click();
    await expect(page.locator('h2', { hasText: 'Model Settings' })).not.toBeVisible();
  });
});

