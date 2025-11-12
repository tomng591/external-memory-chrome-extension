# Task List

Granular breakdown of milestones and tasks. Each task is small, cohesive, and testable independently.

---

## Milestone 1: Chrome Extension Setup & Infrastructure

### Task 1.1: Initialize Vite + React 19 + TypeScript + TailwindCSS Project
**What**: Set up the project structure with all dependencies and build configuration for Chrome extension
**How**:
- Use JohnBra boilerplate as base or manual Vite setup
- Configure `vite.config.ts` for Chrome extension (relative paths)
- Install deps: React, TypeScript, TailwindCSS v4, @tailwindcss/vite
- Set up `tailwind.config.js` and CSS imports

**Verify**:
- `npm install` succeeds
- `npm run build` produces `dist/` folder
- No TypeScript errors

---

### Task 1.2: Create Manifest.json V3
**What**: Define extension metadata, permissions, and entry points
**How**:
- Create `manifest.json` with v3 schema
- Define basic permissions (needed for message capture)
- Configure popup, content scripts, and service worker entry points
- Add icons and extension metadata

**Verify**:
- Extension loads in `chrome://extensions` without errors
- No manifest validation warnings

---

### Task 1.3: Create Popup React Component Scaffold
**What**: Basic popup UI that loads when extension icon is clicked
**How**:
- Create `src/popup.tsx` with simple React component
- Create `public/popup.html` that loads popup bundle
- Wire popup in `manifest.json`

**Verify**:
- Click extension icon → popup appears
- Popup renders React component with text

---

### Task 1.4: Create Content Script Scaffold
**What**: Script that injects into ChatGPT and Claude.com pages
**How**:
- Create `src/content/index.ts` that logs "content script loaded"
- Configure in `manifest.json` with `content_scripts` entry
- Target `https://chatgpt.com/*` and `https://claude.ai/*`

**Verify**:
- Open ChatGPT/Claude in Chrome → browser console shows "content script loaded"
- No errors in extension page

---

### Task 1.5: Create Service Worker Scaffold
**What**: Background service worker that handles extension logic
**How**:
- Create `src/background.ts` that logs "service worker started"
- Configure in `manifest.json` with `background.service_worker` entry

**Verify**:
- Extension page → Service Workers section shows background script active
- No errors in service worker console

---

### Task 1.6: Implement Message Passing: Content Script ↔ Service Worker
**What**: Bi-directional communication channel between content script and service worker
**How**:
- Content script: `chrome.runtime.sendMessage({type: 'test', data: 'hello'})`
- Service worker: `chrome.runtime.onMessage.addListener()` to receive
- Service worker: send response back to content script

**Verify**:
- Content script and service worker console logs show messages exchanged
- No errors in either context

---

## Milestone 2: Message Capture & Parsing

### Task 2.1: Define Message TypeScript Interface
**What**: Canonical data structure for captured messages
**How**:
- Create `src/types/Message.ts`
- Define interface with: id, conversationId, role (user|assistant), content, timestamp, model, platform (chatgpt|claude)

**Verify**:
- TypeScript compiles without errors
- Interface exported and importable

---

### Task 2.2: Implement ChatGPT DOM Message Parser
**What**: Extract messages from ChatGPT UI using DOM queries
**How**:
- Create `src/content/parsers/chatgptParser.ts`
- Query ChatGPT DOM structure for message elements
- Extract role, content, timestamp for each message
- Return array of Message objects

**Verify**:
- Manual: Open ChatGPT → run parser in console → log extracted messages
- Verify extracted content matches visible chat

---

### Task 2.3: Implement Claude DOM Message Parser
**What**: Extract messages from Claude.com UI using DOM queries
**How**:
- Create `src/content/parsers/claudeParser.ts`
- Query Claude.com DOM structure for message elements
- Extract role, content, timestamp for each message
- Return array of Message objects

**Verify**:
- Manual: Open Claude.com → run parser in console → log extracted messages
- Verify extracted content matches visible chat

---

### Task 2.4: Create StorageAdapter Interface
**What**: Abstract interface for all storage backends
**How**:
- Create `src/adapters/StorageAdapter.ts`
- Define interface with methods: `save(message: Message): Promise<void>`, `retrieve(id: string): Promise<Message>`, `delete(id: string): Promise<void>`
- Include comments explaining each method

**Verify**:
- TypeScript compiles
- Interface is exportable

---

### Task 2.5: Create InMemoryAdapter (Testing Storage)
**What**: Simple in-memory implementation for MVP testing
**How**:
- Create `src/adapters/InMemoryAdapter.ts`
- Implement StorageAdapter interface
- Use `Map<string, Message>` to store messages
- Keep implementation minimal

**Verify**:
- TypeScript compiles
- Can instantiate and call methods without errors

---

### Task 2.6: Write Unit Tests for InMemoryAdapter with Jest
**What**: Jest tests for in-memory storage functionality
**How**:
- Create `src/adapters/__tests__/InMemoryAdapter.test.ts`
- Test save, retrieve, delete operations
- Test error cases (retrieve non-existent)
- Mock Message objects in tests

**Verify**:
- `npm run test` passes all tests
- Coverage > 80% for adapter code

---

### Task 2.7: Wire Message Parsers to Content Script
**What**: Content script uses parsers to extract messages and send to service worker
**How**:
- Modify `src/content/index.ts`
- On page load, detect platform (ChatGPT or Claude)
- Call appropriate parser function
- Send parsed messages via `chrome.runtime.sendMessage`

**Verify**:
- Open ChatGPT/Claude → console shows "messages captured: N"
- Service worker console receives messages without errors

---

### Task 2.8: Create StorageService in Service Worker
**What**: Service worker service that routes messages to storage adapter
**How**:
- Create `src/services/StorageService.ts`
- Takes a StorageAdapter instance
- Implements `saveMessage(msg: Message): Promise<void>`
- Wire into service worker to save received messages

**Verify**:
- Service worker receives message → StorageService saves it
- InMemoryAdapter stores it (verify via logging)

---

## Milestone 3: External Storage Integration

### Task 3.1: Research Obsidian Vault File Structure
**What**: Understand how Obsidian stores files and metadata
**How**:
- Read Obsidian documentation on vault structure
- Identify file format (markdown), folder structure, metadata to store all user conversations in 1 vault, and store each conversation in a markdown file
- Write the sample format for the conversation markdown file. Store all of the research result and sample into research/obsidian-storage.md file for the implementation to refer to later

**Verify**:
- Understand path structure, vault and metadata of obsidian
- Create the obsidian-storage.md file to store the research result

---

### Task 3.2: Create and Wire ObsidianAdapter Implementation
**What**: Implement StorageAdapter to save messages to Obsidian vault and integrate with service worker
**How**:
- Create `src/adapters/ObsidianAdapter.ts`
  - Implement StorageAdapter interface
  - Convert Message to markdown format
  - Write file to Obsidian vault directory (using node fs or user-selected path)
  - Refer to research/obsidian-storage.md file for implementation details
  - Understand how to write/store text/data to local file in macOS (will extend to Windows and Linux later)
- Wire to Service Worker (`src/background.ts`)
  - On startup, default to obsidian storage as output for now and instantiate ObsidianAdapter when configured
  - When messages received from content script, save via adapter
  - Log success/failure to console

**Verify**:
- TypeScript compiles
- Adapter can be instantiated with vault path
- Adapter methods callable without errors
- Markdown files created in local file storage with correct format
- Send message from ChatGPT/Claude and verify file created in vault

---

### Task 3.2.1: Refactor ObsidianAdapter to Use Browser File System APIs
**What**: Convert ObsidianAdapter from Node.js `fs/promises` to Chrome File System Access API for actual file system access in browser extension
**Why**: Task 3.2 uses Node.js APIs which don't work in Chrome extension sandbox. Need browser-compatible solution.
**How**:
- Refactor `src/adapters/ObsidianAdapter.ts` to use Chrome File System Access API:
  - Replace `fs/promises` with `FileSystemDirectoryHandle` API
  - Use `window.showDirectoryPicker()` for user directory selection
  - Implement file read/write using `fileHandle.createWritable()`
  - Store directory handle in `chrome.storage.local` for persistence
- Create `src/adapters/IndexedDBAdapter.ts` as fallback:
  - Implements StorageAdapter interface
  - Stores conversations as JSON in IndexedDB
  - Useful if File System API unavailable
- Create `src/ui/VaultDirectoryPicker.tsx` component:
  - UI for user to select vault directory
  - Button: "Choose Obsidian Vault Folder"
  - Shows selected path and validates writeability
- Update `src/background.ts` with fallback chain:
  - Try Chrome File System API → fallback to IndexedDB → fallback to InMemory
  - Detect API availability and initialize appropriate adapter

**Verify**:
- TypeScript compiles without errors
- User can select vault directory via UI picker
- Files are actually written to user's selected directory
- IndexedDB fallback works if File System API unavailable
- Service worker gracefully handles permission denials
- Manual test: Grant permissions → choose folder → send message → file appears on disk

---

### Task 3.3: Create Settings UI & Load Settings on Startup
**What**: React component for configuring storage and initialize settings service
**How**:
- Create `src/ui/SettingsPanel.tsx` (Settings Component)
  - Add form inputs for:
    - Storage type selection (dropdown: InMemory, Obsidian)
    - Obsidian vault path (file picker or text input)
  - Add save button that stores settings to `chrome.storage.sync`
- Create `src/services/SettingsService.ts` (Settings Loading Service)
  - Add function `loadSettings()` that reads from `chrome.storage.sync`
  - Return parsed storage type and credentials
  - Add fallback to InMemoryAdapter if no settings exist
- Wire into service worker startup

**Verify**:
- Popup UI shows settings form without errors
- Can input vault path and select storage type
- Settings are saved to `chrome.storage.sync`
- Service worker loads settings on startup
- Logs loaded settings to console
- Falls back to InMemory if storage empty

---

## Milestone 4: Real-Time Message Capture & Auto-Save

### Architecture Overview
Uses **fetch interception (monkey patching) + ReadableStream.tee()** for:
- Zero latency message capture at API level
- Reliable streaming response handling
- Complete data capture without DOM fragility

**Flow**: Content Script → Injected Script → fetch() interception → postMessage to Content Script → Service Worker → Storage

---

### Task 4.1: Create Injected Script & Configure Content Script for ChatGPT API Interception
**What**: Implement fetch interception script that captures messages from ChatGPT's API, configure manifest for script injection, and wire content script to receive captured data
**Status**: ✅ COMPLETE

**Implementation Details**:
1. **Injected Script** (`src/content/injected.ts`):
   - Monkey patches `window.fetch` to intercept all ChatGPT API calls
   - Detects ChatGPT endpoints: `/backend-api/conversation`, `/backend-api/f/conversation`, `/api/conversation`
   - Captures outgoing user messages from POST request body:
     - Extracts: conversation_id, parent_message_id, model, messages array
   - Captures incoming responses using `ReadableStream.tee()`:
     - Creates two identical streams: one for ChatGPT (unchanged), one for processing
     - Zero-latency operation (tee is instant)
   - Handles RFC 6902 JSON Patch operations for streaming responses:
     - Parses SSE format (`data: {json}\n\n`)
     - Processes patch operations (append/prepend/replace) to accumulate response content
     - Filters by content_type to skip metadata, only captures actual text responses
     - Sends `CHATGPT_MESSAGE_SENT`, `CHATGPT_RESPONSE_CHUNK`, `CHATGPT_RESPONSE_COMPLETE` events
   - Silent error handling with `try-catch` (doesn't break ChatGPT)

2. **Utility Functions** (`src/content/utils/chatgptStreamUtils.ts`):
   - `extractModelIdentifier()`: Robust model detection from multiple sources
   - `applyContentPatchOperations()`: RFC 6902 patch operation processor
     - Handles `/message/content/parts/0` path operations
     - Applies append/prepend/replace mutations

3. **Manifest Configuration** (`public/manifest.json`):
   - Added `web_accessible_resources` for injected.js
   - Configured patterns for both chatgpt.com and claude.ai
   - Content script runs at `document_start` before ChatGPT code loads

4. **Content Script** (`src/content/index.ts`):
   - Injects injected.js via `chrome.runtime.getURL()`
   - Listens for `window.addEventListener('message', ...)` events
   - Receives all three message types: `CHATGPT_MESSAGE_SENT`, `CHATGPT_RESPONSE_CHUNK`, `CHATGPT_RESPONSE_COMPLETE`
   - Forwards data to service worker via `chrome.runtime.sendMessage`

**Test Results**:
- ✅ TypeScript compilation: No errors
- ✅ Build: dist/injected.js successfully generated (6.86 kB)
- ✅ Unit tests: 273/273 passing
- ✅ Manual testing: Verified on ChatGPT.com with real API responses
- ✅ Fetch interception: Working (user messages and AI responses captured)
- ✅ Streaming: RFC 6902 patch operations correctly applied
- ✅ No performance impact: Zero-latency tee() confirmed working

---

### Task 4.2: Create Message Formatter & Integrate with Service Worker
**What**: Convert raw API data from interception into canonical Message objects and wire captured messages through service worker for storage
**How**:
1. **Create Message Formatter** (`src/services/MessageFormatter.ts`):
   - Function to format user message from ChatGPT API:
     - Input: `{conversation_id, parent_message_id, model, messages[]}`
     - Output: `Message` object with role='user', content extracted from messages array, platform='chatgpt'
   - Function to format assistant response from ChatGPT API:
     - Input: `{conversation_id, message_id, model, content, chunks[]}`
     - Output: `Message` object with role='assistant', full accumulated content, platform='chatgpt'
   - Handle edge cases: malformed data, empty content, missing fields
   - Update `src/types/Message.ts` if needed to support chunks/streaming metadata

2. **Update Content Script** (`src/content/index.ts`):
   - Message handler already receives postMessage events from injected script
   - Format raw data using MessageFormatter before sending to service worker
   - Send to service worker via `chrome.runtime.sendMessage` with proper message type

3. **Update Service Worker** (`src/background.ts`):
   - Listen for messages from content script via `chrome.runtime.onMessage`
   - Handle message types: 'chatgpt_message_sent' (user) and 'chatgpt_response_complete' (assistant)
   - For user messages: save immediately via StorageService
   - For assistant messages: wait for `RESPONSE_COMPLETE` event before saving (ensures full content)
   - Use existing StorageService to save messages (reuses Milestone 2 storage pipeline)
   - Async non-blocking storage (promise chain, don't await on client)
   - Return success acknowledgment to content script

**Verify**:
- TypeScript compiles without errors
- Can format sample ChatGPT API data to canonical Message objects
- Service worker receives messages without errors
- Console logs show message flow: injected → content → service worker → storage
- Unit tests pass for MessageFormatter
- Manual: Open ChatGPT, send message, verify:
  - Content script receives postMessage events
  - Service worker logs show message saved
  - Files created in Obsidian vault (if configured)

---

### Task 4.3: Research Claude.ai API & Implement Interception
**What**: Understand Claude.ai's API structure and implement similar fetch interception
**How**:
- Research Claude.ai API:
  - Identify API endpoints for message capture
  - Understand request/response format
  - Check if streaming is used (likely yes)
  - Document in `research/claude-api-structure.md`
- Create `src/content/injected-claude.ts`:
  - Duplicate fetch interception logic from Task 4.1
  - Adapt for Claude API endpoints (likely `/api/conversations/*`)
  - Extract conversation_id, message fields
  - Handle streaming responses (Claude uses streaming too)
  - Send same postMessage events as ChatGPT version

**Verify**:
- Create research document with Claude API findings
- Injected script compiles and runs on claude.ai
- Manual: Open Claude.ai, send message, verify capture

---

### Task 4.4: Create Platform Detection & Load Appropriate Injected Script
**What**: Detect which platform user is on and load correct injected script
**How**:
- Update `src/content/index.ts`:
  - Detect platform from URL (chatgpt.com vs claude.ai)
  - Load appropriate injected script:
    - ChatGPT: `src/content/injected.ts`
    - Claude: `src/content/injected-claude.ts`
  - Handle both message types in unified way

**Verify**:
- Content script detects correct platform
- Correct injected script loads for each platform
- Manual: Navigate between ChatGPT and Claude tabs, verify each loads correctly

---

### Task 4.5: Implement Message Deduplication & Streaming Completion Detection
**What**: Handle message updates, streaming completions, and prevent duplicates
**How**:
- Create `src/services/MessageDeduplicator.ts`:
  - Track messages by (conversationId + messageId) key
  - For user messages: save once per unique ID
  - For assistant messages: collect chunks until `RESPONSE_COMPLETE`
  - Prevent saving partial responses
  - Detect edited/regenerated messages:
    - Same conversation + new messageId = regenerated response
    - Mark old response as "regenerated", save new one
- Update `src/background.ts`:
  - Use deduplicator before saving
  - Buffer assistant response until completion event
  - Save complete message to storage

**Verify**:
- TypeScript compiles
- Deduplicator prevents duplicate saves
- Streaming responses saved only after completion
- Regenerated responses tracked correctly
- Manual: Regenerate response in ChatGPT, verify handled correctly

---

### Task 4.6: Error Handling & Message Pipeline Robustness
**What**: Integrate Milestone 4 message capture into existing service worker message handling with robust error handling
**How**:
- Update `src/background.ts` service worker:
  - Existing pattern (already proven in Milestone 2):
    - Listen for incoming messages via `chrome.runtime.onMessage`
    - Respond immediately to content script via `sendResponse()`
    - Store message asynchronously in background (promise chain, don't await)
  - For Milestone 4 messages:
    - Handle 'chatgpt_message_sent' and 'chatgpt_response_complete' types
    - Use existing StorageService to save (same as current flow)
    - Leverage existing ObsidianAdapter/IndexedDBAdapter/InMemoryAdapter
  - Error handling:
    - Log to console for debugging
    - Continue processing other messages if one fails
    - Gracefully handle storage adapter failures
- No new queue/retry needed - apply existing pattern to new message types

**Verify**:
- TypeScript compiles
- Service worker receives and processes both old and new message types
- Verify via console logs: message received → formatted → stored → success/failure logged
- Manual: Send messages in ChatGPT, verify vault files are created without any UI blocking

---

## Future Milestones (Not MVP)

### Task 5.1: Create GoogleDocsAdapter
**What**: Implement StorageAdapter for Google Docs
**How**: Authenticate with Google API, append messages to Doc

**Verify**: Messages appear in Google Doc

---

### Task 5.2: Create PostgresAdapter
**What**: Implement StorageAdapter for local Postgres database
**How**: Connect to Postgres, insert messages into table

**Verify**: `SELECT * FROM messages` shows captured messages

---

### Task 5.3: Implement Message Format Conversion Tools
**What**: Tools to convert messages between formats (markdown, JSON, CSV)
**How**: Create converters in `src/utils/format`

**Verify**: Converted files match expected format

---

### Task 5.4: Build Message Review UI
**What**: UI in popup to view, search, export stored messages
**How**: Query StorageAdapter, render list of messages with search

**Verify**: Can search and export messages from popup

---

## Notes

- **Testing Strategy**:
  - Unit tests with Jest for adapters and utilities
  - Manual verification for DOM parsers (real websites)
  - Integration tests with Puppeteer for full flow
- **Code Review Considerations**:
  - Keep tasks small so code changes are easy to review
  - Each task should have clear, verifiable success criteria
  - Minimize cross-task dependencies
