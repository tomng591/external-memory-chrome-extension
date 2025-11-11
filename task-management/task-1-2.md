# Task 1.2: Create Manifest.json V3

## Description
Create the Chrome extension manifest file that defines extension metadata, permissions, entry points (popup, content scripts, service worker), and required capabilities. This is the "ID card" of the extension that Chrome uses to load and configure it.

## Implementation Detail

### Steps:
1. Create `public/manifest.json` with manifest version 3 schema

2. Define basic structure:
   ```json
   {
     "manifest_version": 3,
     "name": "External Memory",
     "version": "0.0.1",
     "description": "Store AI conversations to your chosen storage",
     "icons": {
       "16": "icons/icon-16.png",
       "48": "icons/icon-48.png",
       "128": "icons/icon-128.png"
     }
   }
   ```

3. Define permissions needed for MVP:
   - `storage` - for chrome.storage.sync (settings)
   - `scripting` - for content script injection
   - `tabs` - to access tab information

4. Define content scripts entry:
   - Target URLs: `https://chatgpt.com/*`, `https://claude.ai/*`
   - Points to content script file (will be built by Vite)

5. Define popup action:
   - Icon for popup
   - Default popup HTML (will be `popup.html`)

6. Define service worker:
   - Points to background service worker file

7. Create placeholder icon files in `public/icons/`:
   - `icon-16.png`, `icon-48.png`, `icon-128.png` (can be placeholder PNGs for now)

8. Update `vite.config.ts` to copy manifest.json to dist/ during build

## Unit Test Detail

**Test File**: `src/__tests__/manifest.test.ts`

Test cases:
- Read manifest.json and verify it's valid JSON
- Verify required fields exist: manifest_version, name, version, description
- Verify manifest_version equals 3
- Verify permissions array contains required permissions
- Verify content_scripts is properly defined with correct URLs
- Verify background.service_worker is defined

```typescript
describe('manifest.json', () => {
  let manifest: any;

  beforeAll(() => {
    const fs = require('fs');
    const path = require('path');
    const manifestPath = path.join(__dirname, '../../public/manifest.json');
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  });

  it('should have valid manifest v3 schema', () => {
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.name).toBeDefined();
    expect(manifest.version).toBeDefined();
  });

  it('should have required permissions', () => {
    expect(manifest.permissions).toContain('storage');
  });
});
```

## Integration Test Detail

**Test File**: `tests/manifest.integration.test.ts`

Test cases:
- Build project and verify manifest.json is copied to dist/
- Load extension in Chrome and verify no manifest validation errors
- Verify extension appears in `chrome://extensions` with correct name
- Verify permissions are requested appropriately (no warnings)

```typescript
describe('Manifest Integration', () => {
  let browser: puppeteer.Browser;
  let extensionPath: string;

  beforeAll(async () => {
    // Build project
    execSync('npm run build');
    extensionPath = path.resolve(__dirname, '../../dist');
  });

  it('should load extension without manifest errors', async () => {
    browser = await puppeteer.launch({
      headless: false,
      args: [
        `--load-extension=${extensionPath}`,
        '--disable-extensions-except=' + extensionPath
      ]
    });

    const page = await browser.newPage();
    await page.goto('chrome://extensions');

    const extensionName = await page.$eval(
      'text=External Memory',
      el => el.textContent
    );
    expect(extensionName).toContain('External Memory');
  });
});
```

## Manual Test Detail

1. Build project: `npm run build`
2. Open Chrome and go to `chrome://extensions`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked" and select the `dist/` folder
5. Verify:
   - Extension appears in list as "External Memory"
   - No red error indicators
   - Extension icon appears in Chrome toolbar
   - Clicking extension icon shows popup will load (once UI is created)
6. Check manifest in DevTools:
   - Right-click extension icon → "Manage extension"
   - Verify permissions listed match manifest

## Testing Requirements & Pass/Fail Criteria

### ✅ MUST-PASS (Blockers - Task cannot be completed without these)
1. **manifest.json is valid JSON**: Parses without errors, no syntax issues
2. **Extension loads in Chrome**: `chrome://extensions` shows "External Memory" without red errors
3. **Manifest passes Chrome validation**: No warnings/errors in extension details page
4. **Required fields present**: manifest_version, name, version, description all exist

**Pass Criteria**: All 4 must pass. If manifest fails to load or Chrome shows errors, fix manifest before moving on.

### ⚠️ HIGH-PRIORITY (Strongly Recommended - needed for next tasks)
1. **Permissions are correct**: `storage` permission listed, matches implementation needs
2. **Content scripts configured**: Manifest includes content_scripts with correct URLs (chatgpt.com, claude.ai)
3. **Service worker configured**: Manifest includes background.service_worker entry

**Pass Criteria**: All 3 should be present. These are needed for Tasks 1.4 and 1.5 to work.

### ⏭️ CAN SKIP/DEFER (Nice-to-have - can fix later)
1. **Unit tests pass**: JSON schema validation tests (can add later)
2. **Icon files exist**: Placeholder icons in `public/icons/` (can add real icons later)
3. **Advanced permissions**: Fine-tune permission scope (can optimize in security review)

**Skip Criteria**: Missing icon files won't break extension load. Unit tests can be written incrementally.

### Recommended Testing Order:
1. **Manual test** (3 min): Load in Chrome, verify no red errors
2. **Check manifest fields** (1 min): Verify content_scripts and service_worker are present
3. **If loads without errors**: Task passes ✅ Move to Task 1.3
4. **If Chrome shows errors**: Fix manifest and retry
5. **Unit tests**: Add JSON validation tests after manifest is stable

## Note / Status

- Status: ✅ COMPLETED
- Assigned to: Claude Code
- Completed: November 11, 2025
- Notes:
  - All MUST-PASS criteria met successfully
  - manifest.json created with Manifest V3 schema
  - All required fields present: manifest_version, name, version, description
  - Permissions configured: storage, scripting, tabs
  - Content scripts configured for ChatGPT and Claude.ai
  - Service worker background.js entry configured
  - Icon files created (3x PNG files, placeholder 1x1 transparent pixels)
  - Vite plugin created to copy manifest.json and icons to dist/
  - Unit tests: 28 tests pass (16 manifest-specific + 8 setup + 4 integration)
  - Integration tests: 10 tests pass (build output, manifest validation, icon files)
  - Build output verified: manifest.json (709 bytes) + icons copied to dist/icons/
  - All HIGH-PRIORITY criteria met: permissions, content_scripts, service_worker all present
  - Ready to proceed to Task 1.3 (Popup React Component)
