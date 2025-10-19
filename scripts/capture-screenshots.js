#!/usr/bin/env node

/**
 * Screenshot Capture Script
 * 
 * Captures screenshots of the app in different layouts for documentation
 */

import { chromium } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const screenshotsDir = join(projectRoot, 'docs', 'screenshots');

// Ensure screenshots directory exists
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function captureScreenshots() {
  console.log('🎬 Starting screenshot capture...\n');

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const appUrl = process.env.APP_URL || 'http://localhost:5173';

  console.log(`📸 Navigating to ${appUrl}...`);

  try {
    // Navigate to app
    await page.goto(appUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('.app-container', { timeout: 10000 });

    // Wait a bit for everything to render
    await page.waitForTimeout(2000);

    // 1. Desktop Layout
    console.log('📸 Capturing desktop layout...');
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: join(screenshotsDir, 'desktop.png'),
      fullPage: false,
    });
    console.log('✅ Desktop screenshot saved');

    // 2. ROG Ally X Layout (1920x1080 but with forced layout)
    console.log('📸 Capturing ROG Ally X layout...');
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.evaluate(() => {
      localStorage.setItem('force-rog-ally', 'true');
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('.app-container', { timeout: 10000 });
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: join(screenshotsDir, 'rog-ally-x.png'),
      fullPage: false,
    });
    console.log('✅ ROG Ally X screenshot saved');

    // 3. Mobile Layout
    console.log('📸 Capturing mobile layout...');
    await page.setViewportSize({ width: 375, height: 667 });
    await page.evaluate(() => {
      localStorage.removeItem('force-rog-ally');
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('.app-container', { timeout: 10000 });
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: join(screenshotsDir, 'mobile.png'),
      fullPage: false,
    });
    console.log('✅ Mobile screenshot saved');

    // 4. Tablet Layout
    console.log('📸 Capturing tablet layout...');
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('.app-container', { timeout: 10000 });
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: join(screenshotsDir, 'tablet.png'),
      fullPage: false,
    });
    console.log('✅ Tablet screenshot saved');

    // 5. Settings Modal
    console.log('📸 Capturing settings modal...');
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('.app-container', { timeout: 10000 });
    await page.locator('button', { hasText: 'Settings' }).click();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: join(screenshotsDir, 'settings-modal.png'),
      fullPage: false,
    });
    console.log('✅ Settings modal screenshot saved');

    // 6. Dashboard Modal
    console.log('📸 Capturing dashboard modal...');
    await page.locator('button', { hasText: 'Close' }).first().click();
    await page.waitForTimeout(300);
    await page.locator('button', { hasText: 'Dashboard' }).click();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: join(screenshotsDir, 'dashboard-modal.png'),
      fullPage: false,
    });
    console.log('✅ Dashboard modal screenshot saved');

    console.log('\n✨ All screenshots captured successfully!');
    console.log(`📁 Saved to: ${screenshotsDir}`);

  } catch (error) {
    console.error('\n❌ Error capturing screenshots:', error.message);
    console.error('\n💡 Make sure the app is running at', appUrl);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Run the capture
captureScreenshots();

