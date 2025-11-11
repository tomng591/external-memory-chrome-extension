# Task 1.3: Create Popup React Component Scaffold

## Description
Create the popup UI that appears when the extension icon is clicked. Start with a simple React component scaffold that renders in the popup, with proper styling using TailwindCSS. This establishes the popup entry point for future settings and controls.

## Implementation Detail

### Steps:
1. Create `src/popup.tsx` - React component for popup:
   - Simple functional component that displays "External Memory" heading
   - Add placeholder text: "Configuration coming soon"
   - Use TailwindCSS classes for basic styling (heading, text color)
   - Export as default component

2. Create `src/popup-entry.tsx` - popup entry point:
   - Import React, ReactDOM, and popup component
   - Render popup component to DOM element with id "popup-root"

3. Create `public/popup.html`:
   - Minimal HTML with single div: `<div id="popup-root"></div>`
   - Link to popup entry script (will be built by Vite)
   - Add inline styles for popup dimensions (e.g., 300px width, 400px height)
   - Add TailwindCSS CSS import

4. Update `vite.config.ts`:
   - Add popup.html as additional entry point
   - Ensure popup bundle is built separately from other files

5. Update `manifest.json`:
   - Add `action.default_popup` pointing to `popup.html`
   - Add popup icon if desired

6. Create CSS for popup (`src/popup.css` or inline in popup.html):
   - Set body margin to 0
   - Set default font
   - Ensure TailwindCSS classes work in popup context

## Unit Test Detail

**Test File**: `src/__tests__/popup.test.tsx`

Test cases:
- Render popup component and verify it displays heading
- Verify heading text is "External Memory"
- Verify component renders without errors
- Verify TailwindCSS classes are applied (check for expected classes in DOM)

```typescript
import { render, screen } from '@testing-library/react';
import Popup from '../popup';

describe('Popup Component', () => {
  it('should render without errors', () => {
    render(<Popup />);
    expect(screen.getByText('External Memory')).toBeInTheDocument();
  });

  it('should display placeholder text', () => {
    render(<Popup />);
    expect(screen.getByText(/Configuration coming soon/i)).toBeInTheDocument();
  });

  it('should have correct heading styling', () => {
    const { container } = render(<Popup />);
    const heading = container.querySelector('h1');
    expect(heading).toHaveClass('text-2xl'); // or appropriate Tailwind class
  });
});
```

## Integration Test Detail

**Test File**: `tests/popup.integration.test.ts`

Test cases:
- Build extension and load in Chrome
- Click extension icon and verify popup appears
- Verify popup displays correct heading and text
- Verify popup closes when clicking outside
- Verify popup doesn't have console errors

```typescript
describe('Popup Integration', () => {
  let browser: puppeteer.Browser;
  let page: puppeteer.Page;
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
    page = await browser.newPage();
  });

  it('should open popup when extension icon clicked', async () => {
    await page.goto('chrome://extensions');
    // Note: Puppeteer has limitations accessing popup directly
    // This test verifies popup.html is properly bundled
    const response = await page.goto(`file://${extensionPath}/popup.html`);
    expect(response?.status()).toBe(200);
  });

  it('should display popup content', async () => {
    const popupPath = `file://${extensionPath}/popup.html`;
    await page.goto(popupPath);

    const heading = await page.$('h1');
    expect(heading).toBeTruthy();

    const text = await page.$eval('body', el => el.textContent);
    expect(text).toContain('External Memory');
  });

  afterAll(async () => {
    await browser.close();
  });
});
```

## Manual Test Detail

1. Build extension: `npm run build`
2. Load extension in Chrome (as in Task 1.2)
3. Click extension icon in toolbar:
   - Popup should appear below icon
   - Size should be approximately 300x400px
   - Should display "External Memory" heading
   - Should display placeholder text
4. Verify popup styling:
   - Text should be visible and readable
   - Heading should be larger than body text
   - No broken layout or text overflow
5. Verify popup behavior:
   - Clicking outside popup closes it
   - Clicking icon again reopens popup
6. Check DevTools:
   - Right-click popup → "Inspect"
   - Verify React component tree loads
   - Check console for no errors

## Testing Requirements & Pass/Fail Criteria

### ✅ MUST-PASS (Blockers - Task cannot be completed without these)
1. **Popup.html builds successfully**: `dist/popup.html` exists after `npm run build`
2. **Popup appears when extension icon clicked**: Clicking toolbar icon opens popup without errors
3. **Popup displays content**: "External Memory" heading visible in popup
4. **No console errors**: Browser console shows no JavaScript errors when popup opens

**Pass Criteria**: All 4 must pass. If popup doesn't open or shows errors, debug before moving on.

### ⚠️ HIGH-PRIORITY (Strongly Recommended - needed for next tasks)
1. **React component renders**: Popup shows React-rendered content (not just plain HTML)
2. **Popup.tsx compiles**: TypeScript compilation succeeds, no type errors in popup component
3. **Popup closes properly**: Can close by clicking outside or pressing ESC

**Pass Criteria**: At least 2 of 3 should work. React rendering is most important for future UI tasks.

### ⏭️ CAN SKIP/DEFER (Nice-to-have - can fix later)
1. **Unit tests pass**: Component rendering tests in `src/__tests__/popup.test.tsx` (can add after implementation)
2. **TailwindCSS styling perfect**: All fonts, spacing, colors exactly as designed (can refine UI later)
3. **Popup.test.tsx pass**: Integration tests with Puppeteer (Puppeteer limitations make this hard, defer)
4. **Popup size optimization**: Exact dimensions, responsive behavior (can improve UI later)

**Skip Criteria**: Styling can be rough - focus on functional rendering. Puppeteer popup testing is complex due to browser limitations.

### Recommended Testing Order:
1. **Manual test** (2 min): Click extension icon, verify popup appears with text
2. **Check for errors** (1 min): Open DevTools, no console errors
3. **If popup opens without errors**: Task passes ✅ Move to Task 1.4
4. **If popup doesn't open**: Debug popup.html and React entry point
5. **Unit/Integration tests**: Add after popup is stable (skip Puppeteer popup tests - Chromium limitation)

## Note / Status

- Status: Not Started
- Assigned to:
- Notes:
