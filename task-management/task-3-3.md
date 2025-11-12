# Task 3.3: Create Settings UI & Load Settings on Startup

## Description
Create a React component for the extension popup that allows users to configure storage settings (storage type selection and Obsidian vault path), and create a settings service that loads configurations from Chrome storage on extension startup. This task bridges user configuration with the underlying storage adapters.

## Implementation Detail

### Part 1: Settings Data Type & Service

1. Create `src/types/Settings.ts`:
   - Define `Settings` interface:
     ```typescript
     interface Settings {
       storageType: 'inmemory' | 'obsidian';
       obsidianVaultPath?: string; // Optional, only when storageType === 'obsidian'
       createdAt: number;           // Timestamp when settings created
       updatedAt: number;           // Timestamp when last updated
     }
     ```

2. Create `src/services/SettingsService.ts`:
   - Static `async loadSettings(): Promise<Settings>` method:
     - Read from `chrome.storage.sync` key `external-memory-settings`
     - Parse stored settings
     - Return parsed Settings object
     - Fallback: If no settings exist, return default settings (InMemory adapter)
   - Static `async saveSettings(settings: Settings): Promise<void>` method:
     - Validate settings (check storageType is valid, vault path exists if Obsidian)
     - Add/update timestamps
     - Store to `chrome.storage.sync`
     - Log success
   - Static `getDefaultSettings(): Settings` method:
     - Return default settings (InMemory storage, no vault path)
   - Static `validateSettings(settings: Partial<Settings>): boolean` method:
     - Verify storageType is valid
     - If Obsidian, check vault path is provided
     - Return validation result

### Part 2: Settings Panel React Component

1. Create `src/ui/SettingsPanel.tsx`:
   - Import React hooks: `useState`, `useEffect`
   - Import TailwindCSS for styling
   - Component should display:
     - **Title**: "Settings"
     - **Storage Type Selection**:
       - Dropdown/select with options: "In-Memory", "Obsidian"
       - Current selection highlighted
     - **Obsidian Path Input**:
       - Text input field (only visible when Obsidian is selected)
       - Placeholder: "e.g., ~/Documents/My-Vault"
       - Optional: File picker button (can use browser's file API or hardcode path for MVP)
     - **Save Button**:
       - Disabled until valid (InMemory always valid, Obsidian needs path)
       - Shows loading state while saving
       - Success message after save
     - **Current Status Display**:
       - Show currently active storage type
       - Show vault path if using Obsidian

2. Component functionality:
   - `useEffect`: Load current settings on mount
     - Call `SettingsService.loadSettings()`
     - Populate form with current values
   - On storage type change:
     - Update state
     - If switching to Obsidian, prompt for path
     - If switching to InMemory, clear path
   - On vault path change:
     - Validate path (basic: not empty if Obsidian selected)
     - Update state
   - On save button click:
     - Validate all inputs
     - Call `SettingsService.saveSettings()`
     - Show success toast/message
     - Log to console
   - Error handling:
     - Show error message if save fails
     - Display validation errors (e.g., "Vault path required for Obsidian")

3. Styling with TailwindCSS v4:
   - Use consistent styling with rest of extension
   - Responsive design (works on popup size)
   - Clear form labels
   - Visual feedback for selected options
   - Disabled state for buttons
   - Success/error message styling

---

### Part 3: Service Worker Integration

1. Modify `src/background.ts` service worker:
   - On service worker startup (`chrome.runtime.onInstalled` and on load):
     - Call `SettingsService.loadSettings()`
     - Based on `storageType` in settings:
       - If `'obsidian'`: Instantiate `ObsidianAdapter` with `obsidianVaultPath`
       - If `'inmemory'`: Instantiate `InMemoryAdapter`
     - Store adapter instance in global variable for message handling
     - Log loaded settings to console (for debugging)
   - When handling messages from content script:
     - Use the loaded adapter instance to save message
     - If adapter not initialized, log error and don't crash

2. Handle settings updates:
   - Listen to `chrome.storage.onChanged` event
   - When `external-memory-settings` changes:
     - Reload settings
     - Re-instantiate adapter with new configuration
     - Log settings change to console

### Key Implementation Notes

- **Chrome Storage Sync**: Uses `chrome.storage.sync` for cross-device sync (optional feature)
- **Settings Persistence**: Settings survive extension updates and browser restarts
- **Fallback Behavior**: InMemory as default if no settings (MVP doesn't require user interaction to work)
- **Vault Path Validation**: For MVP, just check path is provided for Obsidian (actual file system access happens in adapter)
- **Async Operations**: All storage operations are async (use `await`)
- **Error Boundaries**: Component should handle errors gracefully (show messages to user)
- **State Management**: Use React hooks for simple local state (no complex state management needed)

---

## Unit Test Detail

**Test File**: `src/ui/__tests__/SettingsPanel.test.tsx`

Test cases:
- Verify SettingsPanel component renders without errors
- Verify dropdown loads with storage type options
- Verify vault path input is hidden when InMemory selected
- Verify vault path input appears when Obsidian selected
- Test storage type selection change:
  - Selecting Obsidian shows path input
  - Selecting InMemory hides path input
- Test form submission:
  - Save button disabled until valid
  - Calling save with valid settings
  - Success message appears after save
- Test error handling:
  - Showing error when vault path missing for Obsidian
  - Showing error when save fails
- Test settings loading on mount:
  - Component loads current settings on render
  - Form populated with loaded values

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettingsPanel } from './SettingsPanel';
import * as SettingsService from '../../services/SettingsService';

jest.mock('../../services/SettingsService');

describe('SettingsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (SettingsService.loadSettings as jest.Mock).mockResolvedValue({
      storageType: 'inmemory',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  });

  it('should render settings form', () => {
    render(<SettingsPanel />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('should load current settings on mount', async () => {
    render(<SettingsPanel />);
    await waitFor(() => {
      expect(SettingsService.loadSettings).toHaveBeenCalled();
    });
  });

  it('should show vault path input when Obsidian selected', async () => {
    render(<SettingsPanel />);
    const dropdown = screen.getByDisplayValue('In-Memory');
    fireEvent.change(dropdown, { target: { value: 'obsidian' } });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Documents/)).toBeInTheDocument();
    });
  });

  it('should save settings on button click', async () => {
    (SettingsService.saveSettings as jest.Mock).mockResolvedValue(undefined);
    render(<SettingsPanel />);

    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(SettingsService.saveSettings).toHaveBeenCalled();
    });
  });

  it('should show error for missing vault path', async () => {
    render(<SettingsPanel />);
    const dropdown = screen.getByDisplayValue('In-Memory');
    fireEvent.change(dropdown, { target: { value: 'obsidian' } });

    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/Vault path required/i)).toBeInTheDocument();
    });
  });
});
```

---

**Test File**: `src/services/__tests__/SettingsService.test.ts`

Test cases:
- Verify `loadSettings()` returns default settings when none exist
- Verify `loadSettings()` returns stored settings when exist
- Verify `saveSettings()` stores settings to chrome.storage.sync
- Verify `getDefaultSettings()` returns InMemory as default
- Verify `validateSettings()` returns true for valid InMemory settings
- Verify `validateSettings()` returns true for valid Obsidian settings
- Verify `validateSettings()` returns false for invalid storage type
- Verify `validateSettings()` returns false for Obsidian without vault path
- Test error handling for storage operations

```typescript
import * as SettingsService from './SettingsService';

// Mock chrome.storage
const mockChrome = {
  storage: {
    sync: {
      get: jest.fn(),
      set: jest.fn()
    }
  }
};

(global as any).chrome = mockChrome;

describe('SettingsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return default settings when none exist', async () => {
    mockChrome.storage.sync.get.mockImplementation((key, callback) => {
      callback({});
    });

    const settings = await SettingsService.loadSettings();
    expect(settings.storageType).toBe('inmemory');
  });

  it('should return stored settings when they exist', async () => {
    const storedSettings = {
      storageType: 'obsidian',
      obsidianVaultPath: '~/Documents/Vault',
      createdAt: 1234567890,
      updatedAt: 1234567890
    };

    mockChrome.storage.sync.get.mockImplementation((key, callback) => {
      callback({ 'external-memory-settings': storedSettings });
    });

    const settings = await SettingsService.loadSettings();
    expect(settings.storageType).toBe('obsidian');
    expect(settings.obsidianVaultPath).toBe('~/Documents/Vault');
  });

  it('should validate InMemory settings as valid', () => {
    const valid = SettingsService.validateSettings({
      storageType: 'inmemory'
    });
    expect(valid).toBe(true);
  });

  it('should validate Obsidian with path as valid', () => {
    const valid = SettingsService.validateSettings({
      storageType: 'obsidian',
      obsidianVaultPath: '~/Documents/Vault'
    });
    expect(valid).toBe(true);
  });

  it('should validate Obsidian without path as invalid', () => {
    const valid = SettingsService.validateSettings({
      storageType: 'obsidian'
    });
    expect(valid).toBe(false);
  });

  it('should save settings to chrome.storage.sync', async () => {
    const settings = {
      storageType: 'obsidian' as const,
      obsidianVaultPath: '~/Documents/Vault',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await SettingsService.saveSettings(settings);
    expect(mockChrome.storage.sync.set).toHaveBeenCalled();
  });
});
```

---

## Integration Test Detail

**Test File**: `tests/settings.integration.test.ts`

Test cases:
- Build project and verify SettingsPanel component compiles
- Render SettingsPanel component and verify all UI elements present
- Test complete settings flow:
  - Load default settings
  - Change to Obsidian
  - Enter vault path
  - Save settings
  - Verify settings persisted to chrome.storage
- Test service worker loading settings on startup:
  - Initialize service worker
  - Verify settings loaded
  - Verify correct adapter instantiated
- Test settings change detection:
  - Change settings in one context
  - Verify service worker detects change
  - Verify adapter re-instantiated

```typescript
describe('Settings Integration', () => {
  it('should render settings panel in popup', async () => {
    const { container } = render(<SettingsPanel />);
    expect(container.querySelector('[data-testid="settings-panel"]')).toBeInTheDocument();
  });

  it('should complete settings flow', async () => {
    render(<SettingsPanel />);

    // Change to Obsidian
    const dropdown = screen.getByDisplayValue('In-Memory');
    fireEvent.change(dropdown, { target: { value: 'obsidian' } });

    // Enter vault path
    const pathInput = screen.getByPlaceholderText(/Documents/);
    fireEvent.change(pathInput, { target: { value: '~/Documents/My-Vault' } });

    // Save
    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    // Verify success
    await waitFor(() => {
      expect(screen.getByText(/Settings saved/i)).toBeInTheDocument();
    });
  });
});
```

---

## Manual Test Detail

1. Set up environment:
   - Build extension: `npm run build`
   - Load extension in Chrome from `dist/` folder

2. Test SettingsPanel component:
   - Open extension popup
   - Verify "Settings" section is displayed
   - Verify storage type dropdown is present with options
   - Verify "In-Memory" is selected by default

3. Test switching to Obsidian:
   - Click storage type dropdown
   - Select "Obsidian"
   - Verify vault path input appears
   - Verify path input is focused and ready for input

4. Test settings save:
   - Select "Obsidian" storage type
   - Enter vault path: `~/Documents/External-Memory-Vault`
   - Click "Save" button
   - Verify success message appears
   - Verify button returns to normal state

5. Test settings persistence:
   - Close and reopen extension popup
   - Verify settings are still "Obsidian" with correct path
   - Verify loaded settings match saved settings

6. Test service worker integration:
   - Check service worker console
   - Verify settings are logged: "Settings loaded: ..."
   - Verify adapter type: "ObsidianAdapter instantiated with path: ..."

7. Test settings change detection:
   - With extension running, change settings (switch storage type)
   - Open service worker console
   - Verify settings change is detected: "Settings changed, re-initializing adapter"
   - Verify new adapter is instantiated

8. Test error handling:
   - Try to save Obsidian settings without path
   - Verify error message: "Vault path required for Obsidian storage"
   - Verify save button disabled until valid

9. Test fallback:
   - Clear all settings from chrome.storage
   - Reload extension
   - Verify defaults to InMemory
   - Check service worker console for: "No settings found, using defaults"

---

## Testing Requirements & Pass/Fail Criteria

### ✅ MUST-PASS (Blockers - Task cannot be completed without these)
1. **TypeScript compilation passes**: `npx tsc --noEmit` returns exit code 0 (no TS errors)
2. **SettingsPanel component renders**: Can render without errors in popup
3. **Storage type dropdown works**: Can select between InMemory and Obsidian
4. **Settings saved to chrome.storage**: SettingsService.saveSettings() stores to chrome.storage.sync
5. **Settings loaded on startup**: Service worker loads settings on initialization
6. **Correct adapter instantiated**: Based on settings, InMemoryAdapter or ObsidianAdapter created
7. **Vault path input appears/hides**: Shows when Obsidian selected, hides when InMemory selected

**Pass Criteria**: All 7 must pass. If any fails, task is incomplete.

### ⚠️ HIGH-PRIORITY (Strongly Recommended - needed for next tasks)
1. **Settings persistence**: Settings survive reload and browser restart
2. **Fallback to InMemory**: If no settings exist, defaults to InMemory correctly
3. **Vault path validation**: Error shown if Obsidian selected without path
4. **Settings change detection**: Service worker detects and responds to settings changes
5. **UI feedback**: Success/error messages show to user after save
6. **Settings displayed in UI**: Current settings shown in form when loaded

**Pass Criteria**: At least 5 of 6 should work. If multiple fail, review service layer.

### ⏭️ CAN SKIP/DEFER (Nice-to-have - can fix later)
1. **File picker for vault path**: Browser file API picker (can use text input for MVP)
2. **Advanced validation**: Deep validation of vault path (can validate in adapter)
3. **Settings export/import**: User can backup settings (can add later)
4. **Multiple storage backends UI**: Full UI for all adapters (can expand later)
5. **Settings history**: Track previous settings (can add later)

**Skip Criteria**: These are enhancements. Core functionality works without them.

### Recommended Testing Order:
1. **Manual first** (10 min): Load popup, see settings, change storage type
2. **Component tests** (5 min): Run Jest tests for SettingsPanel
3. **Service tests** (5 min): Run Jest tests for SettingsService
4. **Service worker integration** (10 min): Check console logs, verify adapter instantiation
5. **End-to-end manual** (10 min): Complete settings save flow with service worker
6. **If all MUST-PASS criteria met**: Task complete ✅

---

## Note / Status

- Status: ⚠️ PARTIALLY COMPLETED
- Assigned to: [To be assigned]
- Dependencies: Task 3.2 (ObsidianAdapter Implementation) ✅ COMPLETED
- Blocks: Task 3.4+ (future tasks)
- Notes:

### ✅ COMPLETED Components:
1. **Vault Directory Picker UI** (`src/ui/VaultDirectoryPicker.tsx`)
   - React component for user to select vault directory
   - Uses `window.showDirectoryPicker()` API
   - Stores handle in IndexedDB via `src/utils/handleStorage.ts`

2. **Options Page** (`src/options.tsx`, `public/options.html`)
   - Full page interface for vault configuration
   - Shows selected vault folder with confirmation
   - Displays instructions and FAQ

3. **Handle Persistence** (`src/utils/handleStorage.ts`)
   - IndexedDB storage for FileSystemDirectoryHandle
   - Functions: storeDirectoryHandle, getDirectoryHandle, removeDirectoryHandle
   - Also stores metadata in chrome.storage.local

4. **Service Worker Initialization** (`src/background.ts`)
   - Loads stored handle on startup
   - Initializes storage adapter with fallback chain:
     * File System API (ObsidianAdapterBrowser) → InMemoryAdapter
   - Handles permission validation and re-requesting
   - Logs initialization status and adapter chain

5. **IndexedDB Fallback Adapter** (`src/adapters/IndexedDBAdapter.ts`)
   - Implements StorageAdapter interface
   - Available as fallback if File System API unavailable

### ⚠️ PARTIALLY COMPLETED - Still Need:
1. **Settings Service** (`src/services/SettingsService.ts`)
   - Formal service with loadSettings(), saveSettings(), validateSettings()
   - Uses chrome.storage.sync instead of current IndexedDB approach
   - Would allow other storage types (InMemory, IndexedDB, future adapters)

2. **Settings Type Definition** (`src/types/Settings.ts`)
   - Interface with storageType, obsidianVaultPath, timestamps
   - Currently using ad-hoc handle storage instead

3. **Settings Panel in Popup** (`src/ui/SettingsPanel.tsx`)
   - Settings UI in popup.tsx (not just options page)
   - Storage type dropdown
   - Currently have options page but not popup integration

4. **Settings Change Detection**
   - Service worker listening to chrome.storage.onChanged events
   - Would allow adapter re-initialization on settings change

### Current Implementation Strategy:
- Using IndexedDB for persistent FileSystemDirectoryHandle storage (more reliable than chrome.storage)
- Using chrome.storage.local for metadata (directory name, timestamp)
- Focus on browser File System API + InMemory fallback (MVP MVP)
- Service worker initializes adapter on startup with automatic fallback
- VaultDirectoryPicker in options page for initial setup

### Why This Approach Works for MVP:
- FileSystemDirectoryHandle persists reliably across browser sessions
- No need for complex Settings service if only supporting File System API
- Can be refactored to full Settings service pattern later (Task 3.4+)
- Meets the core requirement: user selects vault, conversations auto-save there

### To Complete Task 3.3 Fully:
1. Create `src/types/Settings.ts` with Settings interface
2. Create `src/services/SettingsService.ts` with CRUD operations
3. Create `src/ui/SettingsPanel.tsx` for popup settings
4. Update `src/background.ts` to listen for chrome.storage.onChanged
5. Refactor handle storage to use Settings service instead of direct IndexedDB access

### Recommendation:
Current implementation is **functionally complete for MVP** (vault selection + auto-save works).
Defer formal Settings service to Task 3.4 when adding support for multiple storage types (Google Docs, Postgres, etc.).
