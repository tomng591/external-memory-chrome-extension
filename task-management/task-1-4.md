# Task 1.4: Create Content Script Scaffold

## Description
Create the content script that injects into ChatGPT and Claude.com pages. This script runs in the context of the web page and can access the DOM. For now, it will simply log that it's loaded; later it will be extended to parse messages from the page.

## Implementation Detail

### Steps:
1. Create `src/content/index.ts` - main content script:
   - Add simple console.log: `"Content script loaded on ${window.location.href}"`
   - Add timestamp for clarity
   - No complex logic for now - just verify injection works

2. Configure content script entry in manifest.json:
   - Add `content_scripts` array with:
     - `matches`: `["https://chatgpt.com/*", "https://claude.ai/*"]`
     - `js`: `["content.js"]` (will be built by Vite)
     - `run_at`: `"document_start"` (load early)

3. Update `vite.config.ts`:
   - Add content script as separate entry point
   - Ensure built output goes to `dist/content.js`

4. Ensure content script doesn't block page load:
   - Keep initialization minimal and synchronous
   - Don't perform expensive DOM operations on load

5. Add error handling:
   - Wrap in try-catch to prevent breaking the page
   - Log any errors to console

## Unit Test Detail

**Test File**: `src/__tests__/content.test.ts`

Test cases:
- Verify content script file exists and is valid TypeScript
- Verify no syntax errors in content script
- Verify content script can be imported without errors
- Test that console.log is called on load (via mock)

```typescript
describe('Content Script', () => {
  it('should have valid TypeScript syntax', () => {
    // This test just verifies the file compiles
    expect(() => {
      require('../content/index.ts');
    }).not.toThrow();
  });

  it('should not throw errors on import', () => {
    const contentScript = require('../content/index.ts');
    expect(contentScript).toBeDefined();
  });

  it('should have proper error handling', () => {
    const fs = require('fs');
    const path = require('path');
    const scriptPath = path.join(__dirname, '../content/index.ts');
    const content = fs.readFileSync(scriptPath, 'utf-8');

    expect(content).toContain('try');
    expect(content).toContain('catch');
  });
});
```

## Integration Test Detail

**Test File**: `tests/content-script.integration.test.ts`

Test cases:
- Build extension
- Open ChatGPT and Claude.com pages
- Verify content script loads (check console logs)
- Verify no errors break page functionality
- Verify script runs on correct domains only

```typescript
describe('Content Script Integration', () => {
  let browser: puppeteer.Browser;
  const extensionPath = path.resolve(__dirname, '../../dist');

  beforeAll(async () => {
    execSync('npm run build');
    browser = await puppeteer.launch({
      headless: false,
      args: [
        `--load-extension=${extensionPath}`,
        '--disable-extensions-except=' + extensionPath
      ]
    });
  });

  it('should inject into ChatGPT page', async () => {
    const page = await browser.newPage();

    // Capture console messages
    const consoleLogs: string[] = [];
    page.on('console', msg => consoleLogs.push(msg.text()));

    await page.goto('https://chatgpt.com', { waitUntil: 'networkidle2' });

    // Wait for content script to log
    await page.waitForTimeout(1000);

    expect(consoleLogs.some(log =>
      log.includes('Content script loaded')
    )).toBe(true);
  });

  it('should not break page functionality', async () => {
    const page = await browser.newPage();

    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('https://chatgpt.com', { waitUntil: 'networkidle2' });
    await page.waitForTimeout(2000);

    // Should have no critical errors
    expect(errors.length).toBe(0);
  });

  afterAll(async () => {
    await browser.close();
  });
});
```

## Manual Test Detail

1. Build extension: `npm run build`
2. Load extension in Chrome
3. Open ChatGPT (https://chatgpt.com):
   - Open DevTools (F12)
   - Go to Console tab
   - Look for log message: "Content script loaded on https://chatgpt.com/..."
   - Should appear within 1-2 seconds of page load
4. Open Claude.com (https://claude.ai):
   - Repeat step 3
   - Should see similar log message
5. Test content script isolation:
   - Open a different website (e.g., google.com)
   - DevTools console should NOT show content script log
   - This verifies the match pattern works correctly
6. Verify page still works:
   - ChatGPT and Claude.com pages should function normally
   - No visual glitches
   - No JavaScript errors in console

## Testing Requirements & Pass/Fail Criteria

### ✅ MUST-PASS (Blockers - Task cannot be completed without these)
1. **Content script injects on ChatGPT**: Open ChatGPT → console shows "Content script loaded" log
2. **Content script injects on Claude.ai**: Open Claude.ai → console shows "Content script loaded" log
3. **Content script doesn't break pages**: ChatGPT/Claude.ai pages load and function normally after injection
4. **No critical errors**: Browser console shows no red error messages related to content script

**Pass Criteria**: All 4 must pass. Script must inject successfully on both sites without breaking functionality.

### ⚠️ HIGH-PRIORITY (Strongly Recommended - needed for next tasks)
1. **Script isolation works**: Content script doesn't load on google.com or other unrelated sites (match pattern is working)
2. **Error handling in place**: try-catch blocks prevent script from crashing page

**Pass Criteria**: At least 1 of 2 should work. Match pattern isolation is most important for security.

### ⏭️ CAN SKIP/DEFER (Nice-to-have - can fix later)
1. **Unit tests pass**: TypeScript syntax validation (can add later)
2. **Integration tests pass**: Puppeteer tests fully automated (manual verification is sufficient for now)
3. **Performance optimized**: Script doesn't slow down page load (can optimize later)

**Skip Criteria**: Manual verification is sufficient - don't need full test suite yet. Keep tests simple.

### Recommended Testing Order:
1. **Manual test - ChatGPT** (2 min): Open ChatGPT, check console log appears
2. **Manual test - Claude.ai** (2 min): Open Claude.ai, check console log appears
3. **Manual test - Isolation** (1 min): Open google.com, verify no log (confirms match pattern works)
4. **If all manual tests pass**: Task passes ✅ Move to Task 1.5
5. **If logs don't appear**: Debug manifest content_scripts configuration
6. **Unit tests**: Add syntax validation tests after stable

## Note / Status

- Status: Not Started
- Assigned to:
- Notes:
