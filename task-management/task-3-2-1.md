# Task 3.2.1: Refactor ObsidianAdapter to Use Browser File System APIs

## Description

Refactor the ObsidianAdapter implementation from Node.js `fs/promises` (which only works in Node.js environments) to use Chrome File System Access API for actual file system access within a Chrome extension sandbox. This enables users to save conversations directly to their local Obsidian vault. Implement a fallback chain: Chrome File System API → IndexedDB → InMemoryAdapter for maximum compatibility.

## Implementation Detail

### Steps:

#### Part 1: Research Chrome File System Access API

1. Review `window.showDirectoryPicker()` API:
   - How user directory selection works
   - What permissions are required
   - How FileSystemDirectoryHandle objects work
   - Error handling for permission denials

2. Review FileSystemHandle operations:
   - `directoryHandle.getFileHandle(name, options)` - get or create file
   - `fileHandle.createWritable()` - write to file
   - `fileHandle.getFile()` - read from file
   - How to navigate directories with handles

3. Review Chrome storage persistence:
   - `chrome.storage.local` API for storing FileSystemDirectoryHandle
   - How to persist handles across extension reloads
   - Serialization limitations for handles

4. Create `research/browser-file-system.md` with findings

#### Part 2: Refactor ObsidianAdapter for Browser APIs

1. Modify `src/adapters/ObsidianAdapter.ts`:
   - Remove all `fs/promises` imports
   - Add FileSystemDirectoryHandle as constructor parameter instead of path string
   - Implement browser-compatible file operations:
     - Replace `fs.mkdir()` with `directoryHandle.getDirectoryHandle(name, { create: true })`
     - Replace `fs.writeFile()` with `fileHandle.createWritable()` and `write()`
     - Replace `fs.readFile()` with `fileHandle.getFile()` and `text()`
     - Replace `fs.readdir()` with `directoryHandle.entries()`
   - Reuse all markdown generation logic from original implementation
   - Add error handling for permission errors and write failures

2. Add helper method `getOrCreateDirectory()`:
   - Navigate and create subdirectories (e.g., `/conversations/2025-11/`)
   - Handle permission errors gracefully

3. Update method signatures:
   - Constructor: `constructor(directoryHandle: FileSystemDirectoryHandle)`
   - All methods remain the same (implement StorageAdapter interface)

#### Part 3: Create VaultDirectoryPicker Component

1. Create `src/ui/VaultDirectoryPicker.tsx`:
   - React component for user to select vault directory
   - Button: "Choose Obsidian Vault Folder"
   - Uses `window.showDirectoryPicker()` API
   - Handle both Chromium and non-Chromium browsers gracefully
   - Display selected directory path to user
   - Validate selected directory has write permissions

2. Implementation details:
   - Request `showDirectoryPicker()` with options to pick directories only
   - Store FileSystemDirectoryHandle in `chrome.storage.local`
   - Show error message if user cancels or browser doesn't support API
   - Provide manual path input fallback if needed

#### Part 4: Create IndexedDB Fallback Adapter

1. Create `src/adapters/IndexedDBAdapter.ts`:
   - Implements StorageAdapter interface
   - Use IndexedDB for storing conversations as JSON
   - Schema:
     - Store name: `conversations`
     - Key path: `conversationId`
     - Additional index: `timestamp` for sorting
   - Implement all required methods:
     - `save(message)`: Store message in DB
     - `retrieve(id)`: Query and return message
     - `delete(id)`: Remove message from DB
     - `retrieveAll(conversationId?)`: Query all or filtered messages

2. Add helper method `serializeToMarkdown()`:
   - Convert stored JSON messages back to markdown format
   - Useful for exporting conversations from IndexedDB

#### Part 5: Create Service Worker Initialization with Fallback Chain

1. Modify `src/background.ts`:
   - Load stored FileSystemDirectoryHandle from `chrome.storage.local`
   - Implement adapter initialization chain:
     ```
     if (directoryHandle exists) {
       try { use ObsidianAdapter with handle }
       catch { fallback to IndexedDB }
     } else if (File System API available) {
       prompt user for directory selection
     } else if (IndexedDB available) {
       use IndexedDB
     } else {
       use InMemoryAdapter
     }
     ```
   - Add feature detection for each API
   - Log initialization status to console
   - Handle permission errors gracefully

2. Add migration/recovery logic:
   - If stored handle becomes invalid, prompt for re-selection
   - Fallback gracefully if directory access fails

#### Part 6: Create Type Definitions

1. Create `src/types/FileSystemHandle.d.ts` (if needed):
   - Add TypeScript definitions for FileSystemDirectoryHandle
   - Add type for stored handle in chrome.storage.local

#### Part 7: Update StorageAdapter Interface (if needed)

1. Review `src/adapters/StorageAdapter.ts`:
   - Ensure interface is compatible with both file-based and DB-based implementations
   - No changes likely needed (interface is already generic enough)

### Key Implementation Notes

- **Browser Compatibility**: Chrome File System Access API is Chrome 86+, not available in all browsers
- **Permission Model**: User must grant directory access; gracefully degrade if denied
- **Handle Persistence**: FileSystemDirectoryHandle objects can be serialized and stored
- **IndexedDB Fallback**: IndexedDB works in all browsers; good for offline scenarios
- **Error Handling**: Handle permission denials, invalid handles, write failures gracefully
- **Markdown Logic**: Reuse conversion logic from original ObsidianAdapter (messageToMarkdown, etc.)
- **Cross-Platform**: Path handling should work on macOS, Windows, Linux

---

## Unit Test Detail

**Test File**: `src/adapters/__tests__/ObsidianAdapter.browser.test.ts`

Test cases:
- Verify ObsidianAdapter can be instantiated with FileSystemDirectoryHandle
- Mock FileSystemDirectoryHandle for testing file operations
- Test `save()` creates files via handle API
- Test `retrieve()` reads files via handle API
- Test `delete()` removes files via handle API
- Test directory structure creation via nested `getDirectoryHandle()` calls
- Test error handling for permission denials
- Test markdown generation (reuse from original tests)
- Test message parsing from read files

**Test File**: `src/adapters/__tests__/IndexedDBAdapter.test.ts`

Test cases:
- Verify IndexedDBAdapter can be instantiated
- Test `save()` stores message in IndexedDB
- Test `retrieve()` queries message from DB
- Test `delete()` removes message from DB
- Test `retrieveAll()` with and without conversationId filter
- Test IndexedDB schema and indexes
- Test serialization to markdown format
- Test concurrent saves/reads

**Test File**: `src/ui/__tests__/VaultDirectoryPicker.test.tsx`

Test cases:
- Verify component renders with button
- Test button click opens directory picker
- Test successful directory selection stores handle
- Test error handling if user cancels
- Test display of selected path
- Test fallback UI if File System API unavailable

---

## Integration Test Detail

**Test File**: `tests/obsidian-adapter-browser.integration.test.ts`

Test cases:
- Build project and verify ObsidianAdapter compiles
- Test directory picker in actual Chrome extension
- Grant file system permissions in real extension
- Select a test vault directory
- Send test messages and verify files appear in vault
- Verify markdown format is correct
- Test fallback to IndexedDB if File System API fails
- Verify file handles persist across extension reload
- Test that files remain accessible after extension restart

---

## Manual Test Detail

1. Set up test environment:
   - Install Chrome (version 86+)
   - Load extension in `chrome://extensions` (developer mode)

2. Test directory picker UI:
   - Open extension popup
   - Click "Choose Obsidian Vault Folder" button
   - Chrome permission dialog appears
   - Click "Allow"
   - Select a test folder (or ~/Documents/External-Memory-Vault)
   - Verify path is displayed in UI

3. Test file creation:
   - Open ChatGPT or Claude.ai in Chrome tab
   - Send a message in the chat
   - Check service worker console: should log "Message saved to vault"
   - Check selected vault directory: `conversations/2025-11/` folder and markdown file should exist

4. Test file format:
   - Open created markdown file in editor
   - Verify YAML frontmatter is present with all fields
   - Verify messages formatted as `## User —` / `## Assistant —`
   - Verify content preserved correctly

5. Test multiple messages:
   - Send several messages in same conversation
   - Verify all messages append to same file
   - Verify file updates with new message_count in frontmatter

6. Test fallback to IndexedDB:
   - Disable File System API support (or use non-Chromium browser)
   - Send messages
   - Verify messages stored in IndexedDB instead
   - Check browser DevTools → Application → IndexedDB

7. Test error scenarios:
   - Deny file system permissions: extension should fallback to IndexedDB
   - Remove directory permissions: extension should handle gracefully
   - Delete vault directory: should fall back to IndexedDB

---

## Testing Requirements & Pass/Fail Criteria

### ✅ MUST-PASS (Blockers - Task cannot be completed without these)
1. **Chrome File System API integration works**: Files are actually written to user's selected directory
2. **Directory picker UI works**: User can select vault folder without errors
3. **Markdown files created correctly**: Files appear on disk with proper YAML frontmatter and markdown format
4. **TypeScript compilation passes**: `npx tsc --noEmit` returns exit code 0
5. **Service worker initializes correctly**: Detects available APIs and initializes appropriate adapter
6. **Manual end-to-end test passes**: Grant permissions → choose folder → send message → file appears in vault

**Pass Criteria**: All 6 must pass. If any fails, task is incomplete.

### ⚠️ HIGH-PRIORITY (Strongly Recommended - needed for next tasks)
1. **IndexedDB fallback works**: Messages stored successfully if File System API unavailable
2. **Permission denial handled gracefully**: No crashes or errors if user denies file access
3. **Cross-platform path handling**: File names and folder structure work on macOS/Windows/Linux
4. **Storage handle persistence**: Directory selection remembered across extension reloads
5. **Clear error messages**: User receives informative errors when file access fails

**Pass Criteria**: At least 4 of 5 should work. If multiple fail, review implementation.

### ⏭️ CAN SKIP/DEFER (Nice-to-have - can fix later)
1. **Performance optimization**: Batch writes for many concurrent messages
2. **Sync state UI**: Visual indicator in popup showing write success/failure
3. **Cross-browser testing**: Works in Edge, Firefox, Safari (test Chrome first)
4. **Directory validation UI**: Advanced checks for directory permissions and disk space

**Skip Criteria**: These don't block MVP. Can refine in iteration.

### Recommended Testing Order:
1. **Manual first** (15 min): Pick folder → send message → verify file created in vault
2. **Unit tests** (10 min): Run Jest tests for adapters and UI components
3. **Service worker integration** (10 min): Verify adapter chain initialization
4. **Fallback test** (5 min): Test IndexedDB when File System API unavailable
5. **If all MUST-PASS criteria met**: Move to Task 3.3 ✅
6. **If any fails**: Debug and fix before moving on

---

## Note / Status

- Status: ⏳ PENDING
- Assigned to: [To be assigned]
- Dependencies: Task 3.2 (ObsidianAdapter implementation) ✅ COMPLETED
- Blocks: Task 3.3 (Settings UI)
- Notes:
  - This task converts Task 3.2 from Node.js APIs to browser-compatible APIs
  - Chrome File System Access API requires Chrome 86+
  - FileSystemDirectoryHandle objects can be serialized via structured clone
  - IndexedDB provides fallback for browsers without File System API
  - Create research file at `research/browser-file-system.md` with API details
  - Manual testing requires granting file system permissions in Chrome
