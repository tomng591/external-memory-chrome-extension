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

### Task 4.1: Research ChatGPT & Claude DOM Update Behavior
**What**: Understand how ChatGPT and Claude update their DOM when new messages arrive (both user messages and assistant responses)
**How**:
- Analyze ChatGPT DOM structure:
  - How messages are added to the DOM (are they appended? replaced? streamed?)
  - What CSS classes/selectors identify new messages
  - How conversation context/ID is tracked in the DOM
  - How user messages vs assistant responses are differentiated
- Analyze Claude DOM structure:
  - Same analysis as ChatGPT but for claude.ai
  - Note any differences in message streaming (Claude uses streaming responses)
- Document findings in `research/realtime-message-capture.md`:
  - Selectors for message containers on each platform
  - How to detect message completion vs partial stream
  - DOM update patterns (mutation types, triggers, timing)
  - Sample code showing how to observe message additions

**Verify**:
- Create `research/realtime-message-capture.md` with findings
- Document at least 2-3 different message update scenarios per platform
- Include visual diagram or examples of DOM structure

---

### Task 4.2: Implement DOM Mutation Observer for Message Detection
**What**: Create service to detect when new messages are added to ChatGPT/Claude DOM in real-time
**How**:
- Create `src/services/MessageObserver.ts`:
  - Class that wraps `MutationObserver` API
  - Monitors DOM for message container changes
  - Detects when new message elements are added
  - Emits events when message change detected (don't parse yet, just detect)
  - Handles platform-specific selectors (ChatGPT vs Claude)
- Create `src/content/observers/chatgptObserver.ts`:
  - Platform-specific observer for ChatGPT
  - Uses selectors from Task 4.1 research
  - Detects new messages and conversation changes
- Create `src/content/observers/claudeObserver.ts`:
  - Platform-specific observer for Claude
  - Uses selectors from Task 4.1 research
  - Handles streaming responses differently than ChatGPT

**Verify**:
- TypeScript compiles without errors
- Observer can be instantiated and started
- MutationObserver callback fires when test DOM elements change
- Manual: Open ChatGPT, send message, check console logs show "message detected"

---

### Task 4.3: Implement Conversation ID Tracking
**What**: Extract and track conversation ID from ChatGPT/Claude to group messages into conversations
**How**:
- Create `src/services/ConversationTracker.ts`:
  - Extracts conversation ID from current page URL or DOM
  - Maintains current conversation ID in memory
  - Detects when conversation changes (new chat)
  - Provides method to get current conversation ID and title
- Update Message interface in `src/types/Message.ts`:
  - Add `conversationId` field (already exists)
  - Ensure it's properly extracted by parsers
- Create `src/content/utils/conversationUtils.ts`:
  - Platform-specific functions to extract conversation ID:
    - ChatGPT: Extract from URL path (`/c/{conversationId}`)
    - Claude: Extract from URL or DOM attribute
  - Function to get conversation title from DOM
  - Function to detect conversation change events

**Verify**:
- TypeScript compiles
- Can extract conversation ID from ChatGPT URL
- Can extract conversation ID from Claude URL
- Conversation tracker emits change event when chat is cleared/new chat created
- Manual: Open ChatGPT → check console logs "Conversation ID: ..."

---

### Task 4.4: Create Message Debouncer & Aggregator
**What**: Batch and deduplicate real-time message captures to avoid saving incomplete/duplicate messages
**How**:
- Create `src/services/MessageDebouncer.ts`:
  - Receives message detection events from MessageObserver
  - Waits for DOM to stabilize (no new mutations for X milliseconds)
  - Aggregates consecutive mutations into single message capture event
  - Prevents capturing partial/incomplete messages (especially important for streaming responses)
  - Debounce delay: 500-1000ms (configurable, tunable based on testing)
- Create `src/services/MessageDeduplicator.ts`:
  - Tracks recently saved messages by content hash
  - Prevents duplicate saves if same message detected twice
  - Maintains sliding window of recent message IDs
  - Clears dedup cache periodically (every 5 minutes)

**Verify**:
- TypeScript compiles
- Debouncer waits and aggregates multiple rapid mutations
- After silence period, emits single aggregated message
- Deduplicator rejects messages with duplicate content hash
- Manual: Send rapid messages in ChatGPT, verify only captured once per message

---

### Task 4.5: Wire Message Auto-Capture to Content Script
**What**: Integrate MessageObserver into content script to continuously detect and parse new messages
**How**:
- Update `src/content/index.ts`:
  - Initialize MessageObserver on page load (for current platform)
  - Initialize ConversationTracker
  - Initialize MessageDebouncer
  - On debounced message event:
    - Call appropriate parser (chatgptParser or claudeParser)
    - Extract new/updated messages from DOM
    - Send to service worker via `chrome.runtime.sendMessage`
  - Listen for conversation changes and track them
- Add debug logging for each step (can be toggled via settings)
- Handle page navigation (new conversation, reload, etc.)

**Verify**:
- Content script loads observer without errors
- Console logs show message detection and parsing
- Manual: Open ChatGPT → send message → see "Message detected and sent to storage" in console
- Manual: Get response from AI → see response captured and sent

---

### Task 4.6: Implement Async Message Storage with Non-Blocking Queuing
**What**: Store captured messages asynchronously without blocking UI interactions
**How**:
- Create `src/services/MessageQueue.ts`:
  - In-memory queue for messages awaiting storage
  - Persists queue to IndexedDB if storage fails (for reliability)
  - Processes queue in background without blocking
  - Retries failed saves with exponential backoff
  - Limits concurrent storage operations (max 3 parallel)
- Update `src/background.ts` service worker:
  - Use MessageQueue to handle incoming messages
  - Store messages to vault asynchronously
  - Return success immediately (before storage completes)
  - Log save status (success/failure/retry) for debugging
- Add queue status tracking:
  - Number of pending messages
  - Last save timestamp
  - Error count (for monitoring)

**Verify**:
- TypeScript compiles
- Messages can be queued without blocking
- Queue processes in background
- Service worker accepts message and responds immediately
- Manual: Spam send many messages in ChatGPT, verify UI doesn't freeze

---

### Task 4.7: Create Message Deduplication & Update Detection
**What**: Detect and handle message updates (edited messages, streamed responses) without creating duplicates
**How**:
- Update `src/services/MessageDeduplicator.ts`:
  - Track message IDs in addition to content hashes
  - Detect if message ID was seen before (update vs new)
  - For updates: merge with existing saved message
  - For edits: update timestamp and mark as "edited"
- Create `src/services/MessageUpdateHandler.ts`:
  - Handles when same message is sent multiple times (e.g., streaming response)
  - First occurrence: save as new message
  - Subsequent occurrences with more content: merge into existing file
  - Track message version/update count
- Update ObsidianAdapter:
  - Support updating existing conversation files
  - Append new messages or update in-place based on ID
  - Maintain message order and edit history

**Verify**:
- TypeScript compiles
- Deduplicator detects when message ID is repeated
- Update handler merges streaming response pieces
- Manual: Send message that gets edited, verify file shows edited version once

---

### Task 4.8: Create Real-Time Capture Integration Tests
**What**: Test the complete message capture flow with mock ChatGPT/Claude DOM
**How**:
- Create `src/content/__tests__/MessageObserver.test.ts`:
  - Mock DOM with message elements
  - Simulate MutationObserver events
  - Test that observer detects messages
  - Test platform-specific observers
- Create `src/content/__tests__/realtime-capture.integration.test.ts`:
  - Mock ChatGPT page with conversation
  - Simulate user sending message
  - Simulate AI response streaming in
  - Verify messages are captured and sent to service worker
  - Test multiple messages in sequence
- Create `tests/realtime-capture.e2e.test.ts`:
  - Puppeteer test with real ChatGPT/Claude (optional, may need credentials)
  - Send actual message
  - Wait for response
  - Verify files appear in vault with correct content

**Verify**:
- `npm run test` passes all unit tests
- Mock DOM mutations trigger observer correctly
- Message parsing works on mock elements
- Manual: Open ChatGPT, conversation gets captured to vault in real-time

---

### Task 4.9: Add Message Capture Status Indicator in Popup
**What**: Show user current capture status and recent messages in extension popup
**How**:
- Update `src/popup.tsx`:
  - Add section showing capture status (enabled/disabled/last captured)
  - Show queue statistics (pending messages, last save time)
  - Show recent captures from today (preview list)
  - Add toggle to enable/disable real-time capture (for performance)
- Create `src/ui/CaptureStatus.tsx`:
  - Component showing real-time capture indicator (animated when capturing)
  - Queue size and status
  - Last message info (content preview, timestamp)
- Query storage for recent messages and display in popup

**Verify**:
- Popup UI renders without errors
- Capture status updates when messages are saved
- Queue count decreases as messages are processed
- Manual: Open popup while sending messages, see status update in real-time

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
