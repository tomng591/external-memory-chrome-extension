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

### Task 4.1: Create Injected Script for ChatGPT API Interception
**What**: Implement fetch interception script that captures messages from ChatGPT's API
**How**:
- Create `src/content/injected.ts` (to be injected into page context):
  - Monkey patch `window.fetch` to intercept ChatGPT API calls
  - Detect ChatGPT endpoints (`/backend-api/conversation`, `/api/conversation`)
  - Capture outgoing user messages from request body:
    - Extract: conversationId, parentMessageId, model, messages array
  - Capture incoming responses using `ReadableStream.tee()`:
    - Split response stream into two identical branches
    - One for ChatGPT (unchanged), one for backup processing
  - For streaming responses (text/event-stream):
    - Parse SSE format (data: {json}\n\n)
    - Extract conversation_id, message_id, model from first chunk
    - Accumulate content and track chunks
    - Send `CHATGPT_RESPONSE_CHUNK` and `CHATGPT_RESPONSE_COMPLETE` events
  - For non-streaming responses:
    - Clone response and read JSON body
    - Extract same fields, send `CHATGPT_RESPONSE_COMPLETE`
  - Use `window.postMessage` to send captured data to content script
  - Silent error handling (don't break ChatGPT if capture fails)

**Verify**:
- TypeScript compiles without errors
- Can instantiate and start interception
- Manual: Open ChatGPT, send message, check browser console for injected script logs
- No performance impact on ChatGPT responses

---

### Task 4.2: Update Manifest & Content Script for Injected Script
**What**: Configure manifest to allow injected script and wire content script to receive postMessages
**How**:
- Update `public/manifest.json`:
  - Add `web_accessible_resources` entry for injected script
  - Include patterns for both chatgpt.com and claude.ai
  - Verify content script runs at `document_start` (before ChatGPT code)
- Update `src/content/index.ts`:
  - Import injected script via `chrome.runtime.getURL()`
  - Create and inject script tag into document
  - Listen for `window.addEventListener('message', ...)` events
  - Filter for `CHATGPT_MESSAGE_SENT`, `CHATGPT_RESPONSE_CHUNK`, `CHATGPT_RESPONSE_COMPLETE`
  - Log received data for verification

**Verify**:
- Manifest validates without errors
- Content script injects script tag successfully
- Browser console shows "injected script loaded"
- Manual: Open ChatGPT, verify injected script is running

---

### Task 4.3: Create Message Formatter for API Data → Message Objects
**What**: Convert raw API data from interception into canonical Message objects
**How**:
- Create `src/services/MessageFormatter.ts`:
  - Function to format user message from ChatGPT API:
    - Input: `{conversation_id, parent_message_id, model, messages[]}`
    - Output: `Message` object with role='user', content from messages array, platform='chatgpt'
  - Function to format assistant response from ChatGPT API:
    - Input: `{conversation_id, message_id, model, content, chunks[]}`
    - Output: `Message` object with role='assistant', full content, platform='chatgpt'
  - Function to extract metadata:
    - conversation title/ID from URL or response
  - Handle edge cases:
    - Malformed data
    - Empty content
    - Missing fields
- Update `src/types/Message.ts` if needed to support chunks/streaming data

**Verify**:
- TypeScript compiles
- Can format sample ChatGPT API data to Message objects
- Output matches expected Message interface
- Unit tests pass

---

### Task 4.4: Implement Content Script Message Handler & Service Worker Integration
**What**: Wire captured messages from injected script through content script to service worker
**How**:
- Update `src/content/index.ts` message handler:
  - Receive postMessage events from injected script
  - Format raw data using MessageFormatter
  - Send to service worker via `chrome.runtime.sendMessage`
  - Include message type: 'user_message' or 'assistant_message'
- Update `src/background.ts` service worker:
  - Listen for messages from content script
  - Handle both user messages and assistant responses
  - For assistant messages: wait for `RESPONSE_COMPLETE` before saving
  - For user messages: save immediately
  - Queue messages for storage (async, non-blocking)
  - Return success to content script

**Verify**:
- Service worker receives messages without errors
- Console logs show message flow: injected → content → service worker
- Manual: Open ChatGPT, send message, check service worker console

---

### Task 4.5: Research Claude.ai API & Implement Interception
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

### Task 4.6: Create Platform Detection & Load Appropriate Injected Script
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

### Task 4.7: Implement Message Deduplication & Streaming Completion Detection
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

### Task 4.8: Create Message Queue with Async Storage
**What**: Queue messages and store asynchronously without blocking
**How**:
- Create `src/services/MessageQueue.ts`:
  - In-memory queue for pending messages
  - Persist failed saves to IndexedDB
  - Process queue in background (max 3 concurrent)
  - Implement retry with exponential backoff
  - Track queue status: pending count, last save time
- Update `src/background.ts`:
  - Use MessageQueue for all saves
  - Respond immediately to content script (before storage completes)
  - Log success/failure/retry for debugging

**Verify**:
- TypeScript compiles
- Messages queue without blocking
- Multiple rapid messages processed correctly
- Queue status accessible via chrome DevTools

---

### Task 4.9: Create Unit & Integration Tests
**What**: Test message capture flow without needing real ChatGPT
**How**:
- Create `src/content/__tests__/injected.test.ts`:
  - Mock fetch function
  - Simulate ChatGPT API requests/responses
  - Test outgoing message capture
  - Test streaming response capture with tee()
  - Test SSE parsing
  - Test error handling
- Create `src/content/__tests__/messageFormatter.test.ts`:
  - Test formatting ChatGPT API data to Message objects
  - Test edge cases (empty content, missing fields)
- Create `src/services/__tests__/MessageDeduplicator.test.ts`:
  - Test duplicate detection
  - Test streaming completion
  - Test regeneration detection

**Verify**:
- `npm run test` passes all tests
- Unit tests cover happy paths and edge cases
- Manual: Open real ChatGPT/Claude and verify capture works end-to-end

---

### Task 4.10: Add Capture Status & Debug Logging
**What**: Show users capture status and enable debugging
**How**:
- Update `src/popup.tsx`:
  - Add capture status indicator (enabled/disabled)
  - Show last captured message (with timestamp)
  - Show queue statistics (pending messages)
- Update `src/content/index.ts`:
  - Add debug logging (can be toggled via console command)
  - Log message flow: "Message received", "Sent to service worker", etc.
  - Show data shapes for troubleshooting
- Update `src/background.ts`:
  - Log message processing: queue size, storage status

**Verify**:
- Popup UI renders without errors
- Status updates in real-time as messages are saved
- Debug logs appear in console when enabled
- Manual: Open popup while chatting, see status update

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
