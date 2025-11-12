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

## Future Milestones (Not MVP)

### Task 4.1: Create GoogleDocsAdapter
**What**: Implement StorageAdapter for Google Docs
**How**: Authenticate with Google API, append messages to Doc

**Verify**: Messages appear in Google Doc

---

### Task 4.2: Create PostgresAdapter
**What**: Implement StorageAdapter for local Postgres database
**How**: Connect to Postgres, insert messages into table

**Verify**: `SELECT * FROM messages` shows captured messages

---

### Task 4.3: Implement Message Format Conversion Tools
**What**: Tools to convert messages between formats (markdown, JSON, CSV)
**How**: Create converters in `src/utils/format`

**Verify**: Converted files match expected format

---

### Task 4.4: Build Message Review UI
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
