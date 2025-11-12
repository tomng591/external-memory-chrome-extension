# Task 1.5: Create Service Worker Scaffold

## Description
Create the background service worker that handles extension logic. In Manifest V3, service workers replace background pages. For now, create a simple scaffold that logs startup and listens for messages from content scripts; later it will coordinate message passing and storage.

## Implementation Detail

### Steps:
1. Create `src/background.ts` - service worker main file:
   - Add console.log on service worker startup: `"Service worker started"`
   - Add timestamp for debugging
   - Add basic error handling with try-catch
   - Set up listener for chrome.runtime.onMessage (empty for now)

2. Configure service worker in manifest.json:
   - Add `background.service_worker` field pointing to built service worker file
   - Remove any legacy `background.page` or `background.scripts` fields

3. Update `vite.config.ts`:
   - Add service worker as separate entry point
   - Ensure built output goes to `dist/background.js`

4. Ensure service worker initializes properly:
   - Keep initialization synchronous and non-blocking
   - Log any errors during startup

5. Add message listener structure:
   ```typescript
   chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
     console.log('Message received from', sender.url);
     // Handler to be implemented in Task 1.6
   });
   ```

## Unit Test Detail

**Test File**: `src/__tests__/background.test.ts`

Test cases:
- Verify service worker file exists and is valid TypeScript
- Verify no syntax errors
- Verify chrome.runtime.onMessage listener is registered
- Verify error handling exists
- Mock chrome API and verify startup logic

```typescript
describe('Service Worker', () => {
  beforeEach(() => {
    // Mock chrome API
    global.chrome = {
      runtime: {
        onMessage: {
          addListener: jest.fn()
        }
      }
    } as any;
  });

  it('should have valid TypeScript syntax', () => {
    expect(() => {
      require('../background.ts');
    }).not.toThrow();
  });

  it('should register message listener', () => {
    require('../background.ts');
    expect(chrome.runtime.onMessage.addListener).toHaveBeenCalled();
  });

  it('should have error handling', () => {
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, '../background.ts');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain('try');
    expect(content).toContain('catch');
  });
});
```

## Integration Test Detail

**Test File**: `tests/service-worker.integration.test.ts`

Test cases:
- Build extension
- Load extension in Chrome
- Verify service worker is active
- Verify startup logs appear in service worker console
- Verify service worker doesn't crash on page load

```typescript
describe('Service Worker Integration', () => {
  let browser: puppeteer.Browser;
  const extensionPath = path.resolve(__dirname, '../../dist');

  beforeAll(async () => {
    execSync('npm run build');
  });

  it('should start without errors', async () => {
    browser = await puppeteer.launch({
      headless: false,
      args: [
        `--load-extension=${extensionPath}`,
        '--disable-extensions-except=' + extensionPath
      ]
    });

    const page = await browser.newPage();
    await page.goto('chrome://extensions');

    // Verify extension loaded
    const extensionFound = await page.$('text=External Memory');
    expect(extensionFound).toBeTruthy();
  });

  it('should have active service worker', async () => {
    const page = await browser.newPage();
    await page.goto('chrome://extensions');

    // Look for "Service worker (inactive)" - if found, verify it can be activated
    // Note: Puppeteer limitations prevent full service worker log inspection
    // This test verifies the extension manifest is correct

    const manifestPath = `file://${extensionPath}/manifest.json`;
    const manifest = JSON.parse(
      require('fs').readFileSync(
        path.join(extensionPath, 'manifest.json'),
        'utf-8'
      )
    );

    expect(manifest.background.service_worker).toBeDefined();
  });

  afterAll(async () => {
    await browser.close();
  });
});
```

## Manual Test Detail

1. Build extension: `npm run build`
2. Load extension in Chrome
3. Open `chrome://extensions`
4. Find "External Memory" extension in list
5. Click "Details" button to expand:
   - Look for "Service Worker" section (usually at bottom)
   - Should show status like "Service worker (inactive)" or "Service worker (active)"
   - If inactive, click on the service worker to activate it
6. Open DevTools for service worker:
   - In extension details, click "Inspect views: service worker"
   - DevTools window opens showing service worker context
   - Check Console tab for: "Service worker started" log message
   - Should appear when service worker first activates
7. Verify no errors:
   - No red error messages in console
   - Service worker remains active for several seconds
8. Test persistence:
   - Reload extension from manifest (click reload icon)
   - Service worker should restart and log again
   - Verify startup log appears after reload

## Testing Requirements & Pass/Fail Criteria

### ✅ MUST-PASS (Blockers - Task cannot be completed without these)
1. **Service worker activates**: `chrome://extensions` shows service worker status (active or inactive)
2. **Service worker console accessible**: Can open DevTools for service worker via "Inspect views"
3. **Startup log appears**: Service worker console shows "Service worker started" message on activation
4. **No critical errors**: Service worker console has no red error messages

**Pass Criteria**: All 4 must pass. Service worker must activate and log successfully without crashing.

### ⚠️ HIGH-PRIORITY (Strongly Recommended - needed for next tasks)
1. **Message listener registered**: chrome.runtime.onMessage.addListener() is called (Task 1.6 needs this)
2. **Service worker persists**: Remains active when extension details page left open

**Pass Criteria**: At least 1 of 2 should work. Message listener is essential for Task 1.6.

### ⏭️ CAN SKIP/DEFER (Nice-to-have - can fix later)
1. **Unit tests pass**: Mock chrome API tests (can add after implementation)
2. **Integration tests pass**: Puppeteer service worker inspection (Chrome DevTools limitations make this hard)
3. **Error handling comprehensive**: Complex error scenarios (can add incrementally)

**Skip Criteria**: Unit tests are optional at this stage - manual verification is sufficient. Puppeteer service worker testing is very limited due to browser constraints.

### Recommended Testing Order:
1. **Manual test** (3 min): Open `chrome://extensions`, check service worker status
2. **Activate service worker** (1 min): Click "Inspect views: service worker"
3. **Check console log** (1 min): Verify "Service worker started" appears in console
4. **Verify no errors** (1 min): Check for red error messages
5. **If all manual tests pass**: Task passes ✅ Move to Task 1.6
6. **If service worker doesn't activate**: Check manifest background.service_worker configuration
7. **Unit tests**: Add mocking tests after service worker is stable

## Note / Status

- Status: ✅ Completed
- Completed on: 2025-11-11
- All MUST-PASS criteria: ✅ Met
  - Service worker activates: ✅
  - Service worker console accessible: ✅
  - Startup log appears: ✅
  - No critical errors: ✅
- Test Results: 7/7 unit tests passing, 7/7 integration tests ready
- Implementation Details:
  - Service worker startup with ISO timestamp logging
  - Message listener registered with chrome.runtime.onMessage.addListener()
  - Inner try-catch in message handler for error resilience
  - Outer try-catch wrapping entire initialization
  - Service worker responds to messages with timestamp and status
- Notes: Service worker successfully initializes with timestamps and listens for messages. Error handling prevents crashes. Ready for Task 1.6 message passing implementation.
