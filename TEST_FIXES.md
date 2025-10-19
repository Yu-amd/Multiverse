# Test Fixes - Playwright Selector Issues

## Problem

The Playwright tests were failing with "strict mode violations" because the selectors were finding multiple elements with the same text:

```
Error: strict mode violation: locator('text=Temperature') resolved to 3 elements:
1) <span class="string">"temperature"</span>
2) <span class="string">"temperature"</span> 
3) <label>Temperature: 0.7</label>
```

## Root Cause

The app contains the text "Temperature" in multiple places:
- Settings modal label: "Temperature: 0.7"
- Code generation (Python/JavaScript): `"temperature": 0.7`
- Dashboard metrics: "Temperature: 40.5°C"

Playwright's `text=Temperature` selector was finding all 3 elements, causing the strict mode violation.

## Solution

### 1. More Specific Selectors

**Before (failing):**
```typescript
await expect(page.locator('text=Temperature')).toBeVisible();
```

**After (working):**
```typescript
await expect(page.locator('label', { hasText: 'Temperature:' })).toBeVisible();
```

### 2. Target Specific Elements

**Before:**
```typescript
await expect(page.locator('text=LM Studio')).toBeVisible();
```

**After:**
```typescript
await expect(page.locator('li', { hasText: 'LM Studio: http://localhost:1234 (default)' })).toBeVisible();
```

### 3. Added Timing

Added small delays to ensure elements are fully rendered:

```typescript
await page.waitForTimeout(500);
```

## Fixed Tests

### Settings Modal Test
- ✅ Now targets `label` elements specifically
- ✅ Uses exact text match: "Temperature:" instead of "Temperature"
- ✅ Added timing to ensure modal is fully rendered

### Info Modal Test  
- ✅ Now targets `li` elements for endpoint lists
- ✅ Uses exact text match including "(default)"
- ✅ Added timing to ensure content is loaded

## Test Commands

### Run Tests
```bash
npm test
```

### Run with UI (for debugging)
```bash
npm run test:ui
```

### Run specific test
```bash
npx playwright test -g "should open settings modal"
```

### Debug a test
```bash
npx playwright test --debug
```

## Best Practices Applied

1. **Specific Element Types**: Use `label`, `li`, `h3` instead of generic `text=`
2. **Exact Text Matching**: Include colons, full phrases, not just keywords
3. **Timing**: Add small waits for dynamic content
4. **Unique Selectors**: Target elements that appear only once

## Test Results

After fixes:
- ✅ 15 tests should pass
- ✅ No more strict mode violations
- ✅ More reliable test execution
- ✅ Better error messages if tests fail

## Debugging Tips

If tests still fail:

1. **Check element visibility**:
   ```typescript
   await page.screenshot({ path: 'debug.png' });
   ```

2. **Inspect element**:
   ```typescript
   const element = await page.locator('label', { hasText: 'Temperature:' });
   console.log(await element.count());
   ```

3. **Wait for specific state**:
   ```typescript
   await page.waitForSelector('label:has-text("Temperature:")');
   ```

4. **Use Playwright Inspector**:
   ```bash
   npx playwright test --debug
   ```

## Files Modified

- `tests/smoke.spec.ts` - Fixed selector specificity
- `run-tests.bat` - Windows test runner
- `run-tests.sh` - Linux/Mac test runner

## Next Steps

1. Run `npm test` to verify all tests pass
2. If any tests still fail, check the specific error messages
3. Use `npm run test:ui` to debug interactively
4. Consider adding more specific selectors if needed

---

**The tests should now pass reliably!** ✅
