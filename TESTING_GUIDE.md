# Testing Guide - Multiverse AI Playground

Complete guide for testing the Multiverse AI Playground.

## Quick Test Commands

```bash
# Run all tests
npm test

# Run tests with UI (interactive)
npm run test:ui

# Run tests in headed mode (see browser)
npx playwright test --headed

# Run specific test file
npx playwright test tests/smoke.spec.ts

# Run specific test by name
npx playwright test -g "should load the app"

# Debug a test
npx playwright test --debug

# Generate test report
npm run test:report
```

## Test Structure

```
tests/
└── smoke.spec.ts    # UI smoke tests (17 tests)
```

### Smoke Tests Coverage

✅ **App Loading**
- App loads successfully
- Main containers render
- Control buttons appear

✅ **Modals**
- Settings modal opens/closes
- Dashboard modal opens/closes
- Info modal opens/closes

✅ **UI Components**
- Language tabs switch correctly
- Code preview displays
- Chat input works
- Dashboard tabs switch

✅ **Settings**
- Model provider selection
- Endpoint URL configuration
- Parameter adjustments

✅ **Responsive Design**
- Mobile layout (375x667)
- Tablet layout (768x1024)
- Desktop layout (1920x1080)

## Running Tests Locally

### Prerequisites

```bash
# Install dependencies
npm install

# Install Playwright browsers (first time only)
npx playwright install

# Or install specific browser
npx playwright install chromium
```

### Basic Testing Workflow

1. **Start the app**:
   ```bash
   npm run dev
   ```

2. **In another terminal, run tests**:
   ```bash
   npm test
   ```

3. **View results**:
   - Console output shows pass/fail
   - HTML report: `npm run test:report`
   - Screenshots in `test-results/` (on failure)

### With Mock Server

```bash
# Terminal 1: Mock server
npm run mock-server

# Terminal 2: Dev server
npm run dev

# Terminal 3: Tests
npm test
```

## Test Development

### Writing New Tests

Create a new test file or add to existing:

```typescript
import { test, expect } from '@playwright/test';

test.describe('My Feature', () => {
  test('should do something', async ({ page }) => {
    // Navigate
    await page.goto('/');
    
    // Interact
    await page.locator('button', { hasText: 'Click Me' }).click();
    
    // Assert
    await expect(page.locator('.result')).toBeVisible();
    await expect(page.locator('.result')).toHaveText('Success');
  });
});
```

### Common Patterns

#### Click a button
```typescript
await page.locator('button', { hasText: 'Settings' }).click();
```

#### Fill input
```typescript
await page.locator('input[type="text"]').fill('Hello');
```

#### Check visibility
```typescript
await expect(page.locator('.modal')).toBeVisible();
await expect(page.locator('.modal')).not.toBeVisible();
```

#### Check text content
```typescript
await expect(page.locator('.title')).toHaveText('Expected Text');
await expect(page.locator('.content')).toContainText('partial text');
```

#### Wait for element
```typescript
await page.waitForSelector('.loading', { state: 'hidden' });
```

#### Take screenshot
```typescript
await page.screenshot({ path: 'screenshot.png' });
```

## Debugging Tests

### Method 1: Playwright Inspector

```bash
npx playwright test --debug
```

This opens:
- Browser in headed mode
- Playwright Inspector for step-through debugging
- Console for element inspection

### Method 2: Headed Mode

```bash
npx playwright test --headed
```

Watch the test run in a real browser.

### Method 3: Pause in Test

```typescript
test('my test', async ({ page }) => {
  await page.goto('/');
  await page.pause();  // Pauses here
  await page.locator('button').click();
});
```

### Method 4: Console Logs

```typescript
test('my test', async ({ page }) => {
  const element = await page.locator('.content').textContent();
  console.log('Content:', element);
});
```

## CI/CD Testing

Tests automatically run on:
- Push to main/master
- Pull requests

GitHub Actions workflow:
1. Installs dependencies
2. Lints code
3. Builds project
4. Starts mock server
5. Runs Playwright tests
6. Uploads test reports

View results:
- GitHub Actions tab
- Download artifacts for HTML report

## Mock Server Testing

The mock server simulates OpenAI API responses:

```bash
# Start mock server
npm run mock-server

# Test endpoint manually
curl http://localhost:1234/health

# Send chat request
curl -X POST http://localhost:1234/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": true
  }'
```

### Mock Server Features

- ✅ Streaming responses
- ✅ Non-streaming responses
- ✅ CORS enabled
- ✅ Health check endpoint
- ✅ /v1/models endpoint
- ✅ Random mock responses

## Performance Testing

### Basic Performance Check

```typescript
test('should load quickly', async ({ page }) => {
  const start = Date.now();
  await page.goto('/');
  await page.waitForSelector('.app-container');
  const loadTime = Date.now() - start;
  
  expect(loadTime).toBeLessThan(3000); // Under 3 seconds
});
```

### Network Throttling

```typescript
test('should work on slow connection', async ({ page, context }) => {
  await context.route('**/*', async route => {
    await new Promise(resolve => setTimeout(resolve, 100));
    await route.continue();
  });
  
  await page.goto('/');
  await expect(page.locator('.app-container')).toBeVisible();
});
```

## Test Best Practices

### ✅ Do
- Write descriptive test names
- Use `test.describe()` to group related tests
- Use page object pattern for complex pages
- Wait for elements before interacting
- Use `toBeVisible()` instead of `toBeTruthy()`
- Clean up after tests (if needed)

### ❌ Don't
- Use hardcoded waits (`page.waitForTimeout()`) unless necessary
- Test implementation details
- Make tests depend on each other
- Ignore flaky tests (fix them!)
- Skip accessibility checks

## Accessibility Testing

Add basic accessibility checks:

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('should not have accessibility violations', async ({ page }) => {
  await page.goto('/');
  
  const accessibilityScanResults = await new AxeBuilder({ page })
    .analyze();
  
  expect(accessibilityScanResults.violations).toEqual([]);
});
```

## Visual Regression Testing

Take baseline screenshots:

```bash
npx playwright test --update-snapshots
```

Compare in tests:

```typescript
test('should match screenshot', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('homepage.png');
});
```

## Troubleshooting

### Tests timeout

**Solution**: Increase timeout in `playwright.config.ts`:

```typescript
use: {
  timeout: 30000, // 30 seconds per action
}
```

### Element not found

**Solution**: Wait for element:

```typescript
await page.waitForSelector('.my-element', { timeout: 10000 });
```

### Browser doesn't start

**Solution**: Reinstall browsers:

```bash
npx playwright install --force
```

### Tests pass locally but fail in CI

**Possible causes**:
- Different screen size → Set viewport in config
- Timing issues → Add proper waits
- Environment variables → Check CI config
- Cache issues → Clear cache in CI

## Resources

- [Playwright Docs](https://playwright.dev/docs/intro)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [API Reference](https://playwright.dev/docs/api/class-playwright)
- [Examples](https://github.com/microsoft/playwright/tree/main/examples)

---

**Happy Testing!** 🧪

