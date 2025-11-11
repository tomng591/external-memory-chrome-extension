# Technical Requirements

## Overview
Chrome extension to capture AI conversations (ChatGPT, Claude) and store to user-chosen backends (Obsidian, Google Docs, Postgres) with privacy-first architecture.

---

## Architecture

### Storage Abstraction Layer (Adapter Pattern)
- Implement unified interface: `StorageAdapter`
- Each backend (Obsidian, GoogleDocs, Postgres) implements the interface
- Benefits: Extensible for future backends, decoupled code, testable

```typescript
interface StorageAdapter {
  save(data: Message): Promise<void>;
  retrieve(id: string): Promise<Message>;
  delete(id: string): Promise<void>;
}
```

### Message Capture Strategy
**MVP Approach:** DOM Parsing with API Interception design pattern
- **Phase 1 (MVP):** DOM parsing for initial implementation (faster iteration)
  - Content script queries DOM to extract messages from ChatGPT/Claude UI
  - Extract user messages, AI responses, metadata visible in DOM

- **Phase 2 (Future):** API interception for reliability
  - Service Worker intercepts fetch/XMLHttpRequest to ChatGPT/Claude APIs
  - Extracts structured data (tokens, model, timing) unavailable in DOM
  - Replace DOM parsing without changing consumer code (design for this from start)

**Design Pattern:** Factory pattern for capture strategy selection based on platform

---

## Tech Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **UI Framework** | React 18 + TypeScript | Largest ecosystem, best extension library support |
| **State Management** | Zustand | Lightweight (~2KB), simple DX for extension scope |
| **Build Tool** | Vite | 10x faster builds, native ES modules, better DX than Webpack |
| **Styling** | TailwindCSS | Utility-first, minimal bundle size |
| **Chrome APIs** | Manifest V3 | Modern, required for future Chrome versions |
| **Package Manager** | npm | Standard for Node.js projects |

---

## MVP Scope

### In Scope
- Capture messages from ChatGPT and Claude.com via DOM parsing
- Parse user + AI messages with basic metadata (role, content, timestamp)
- Real-time sync to user's local storage
- **Obsidian** as first storage backend (file-based, simplest to implement)
- Configuration UI: select storage type and credentials
- Content script for message extraction
- Service worker for storage coordination

### Out of Scope
- UI for reviewing stored messages
- Google Docs / Postgres integrations (future milestones)
- API interception strategy (design for it, implement later)
- Message format conversion tools
- Cloud sync or network operations

---

## Data Flow

```
User chats in ChatGPT/Claude.com
         ↓
Content Script (DOM parsing)
         ↓
Parse to canonical Message format
         ↓
Real-time to Service Worker
         ↓
StorageAdapter interface
         ↓
ObsidianAdapter (MVP)
         ↓
Save to user's Obsidian vault
```

---

## Sync Strategy
**Real-time, local-only:**
- Messages saved immediately after completion (user/assistant pair)
- No network calls - all processing local to user's machine
- Direct writes to user's chosen storage (files, local DB)
- Privacy guaranteed: extension never sees centralized data

---

## Key Design Decisions

1. **Adapter Pattern:** Storage backends implement common interface for future extensibility
2. **DOM Parsing First:** Faster MVP, API interception added later without changing core code
3. **Real-time Sync:** Ensures no message loss and immediate backup
4. **Local-only Processing:** Zero privacy risk, no data transmission
5. **Manifest V3:** Future-proof for Chrome's deprecation of V2
6. **TypeScript:** Type safety for content script + service worker communication

---

## File Structure (Proposed)

```
src/
├── adapters/
│   ├── StorageAdapter.ts (interface)
│   └── ObsidianAdapter.ts (MVP)
├── content/
│   ├── chatgpt.ts (DOM parsing)
│   └── claude.ts (DOM parsing)
├── services/
│   ├── MessageCapture.ts
│   └── StorageService.ts
├── types/
│   └── Message.ts
├── ui/
│   └── popup.tsx (minimal config only)
├── background.ts (Service Worker)
└── manifest.json
```

---

## Dependencies
- `react`, `react-dom` - UI components
- `zustand` - State management
- `zod` (optional) - Schema validation for messages
- `typescript` - Type safety
- `tailwindcss` - Styling

---

## Implementation Phases

**Phase 1 (MVP):** Capture → Parse → Store to Obsidian
**Phase 2:** Add API interception, Google Docs integration
**Phase 3:** Add Postgres integration, format conversion tools
**Phase 4:** Add message review UI, search/export features
