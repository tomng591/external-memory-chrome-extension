# Bug List

## Overview
This document tracks bugs encountered during development, their root causes, and resolutions.

---

## Bug #1: Content Script Window Object Not Accessible in Console (Initial Issue) & Chrome API Access in MAIN World (Secondary Issue)

### Status: ✅ FIXED

### Reported Date
2025-11-11

### Severity
HIGH (Blocker for Task 2.2 testing)

### Description
Two related issues with accessing `window.__externalMemory` from the console:

**Issue 1**: Initially, the object was `undefined` in the console (isolated world isolation)

**Issue 2**: After attempting to use `"world": "MAIN"` to fix Issue 1, the content script lost access to Chrome extension APIs (`chrome.runtime.sendMessage()` requires extension ID when called from page context)

### Root Cause
**Manifest V3 Security Model**

Chrome Manifest V3 enforces strict security boundaries:
1. **Isolated World** (default content script context):
   - Has full access to Chrome APIs (`chrome.runtime`, `chrome.storage`, etc.)
   - Cannot directly access or modify the page's `window` object
   - Variables assigned in isolated world are not visible to page console

2. **MAIN World** (page's native JavaScript context):
   - Can access and modify the page's `window` object
   - Loses access to all Chrome extension APIs (for security)
   - Cannot use `chrome.runtime.sendMessage()` without explicitly specifying extension ID

### Error Symptoms

**Issue 1 Error** (isolated world - content script in ISOLATED):
```javascript
> typeof window.__externalMemory
< "undefined"
```

**Issue 2 Error** (MAIN world - content script with `"world": "MAIN"`):
```javascript
> window.__externalMemory.sendMessages()
< Uncaught TypeError: Error in invocation of runtime.sendMessage(...):
  chrome.runtime.sendMessage() called from a webpage must specify an Extension ID
  (string) for its first argument.
```

### Solution Applied: DOM Bridge Pattern
Implemented a **two-script bridge pattern** that leverages both worlds:

1. **Content Script** (isolated world) - `src/content/index.ts`:
   - Runs in isolated world with full Chrome API access
   - Listens for custom DOM events from the injected script
   - Handles requests: detect platform, extract messages, send to service worker, etc.
   - Sends responses back via custom DOM events

2. **Injected Script** (MAIN world) - `src/content/injected.ts`:
   - Runs in the page's main JavaScript context
   - Exposes `window.__externalMemory` API to the console
   - Dispatches custom DOM events to the content script with request IDs
   - Waits for responses from the content script and resolves promises

3. **Communication Protocol** (Custom DOM Events):
   - **Request Event**: `__external_memory_request` with `{ id, action, payload }`
   - **Response Event**: `__external_memory_response` with `{ id, success, data/error }`
   - Supports async/await pattern with configurable 5-second timeout

**Files Modified**:
- `public/manifest.json` - Added `web_accessible_resources` for injected.js
- `src/content/index.ts` - Added event listener for custom requests, removed direct window assignment
- `src/content/injected.ts` - NEW: Created injected script for MAIN world
- `vite.config.ts` - Added injected.ts as separate build entry point

### How It Works

**Flow Diagram**:
```
Chrome Console User
    ↓
window.__externalMemory.parseMessages() [MAIN world]
    ↓ (dispatches custom event)
__external_memory_request event
    ↓ (received by)
Content Script in Isolated World
    ↓ (executes action)
extractMessages(), sendMessages(), etc.
    ↓ (can safely use chrome.runtime.sendMessage)
Service Worker
    ↓ (sends response back via custom event)
__external_memory_response event
    ↓ (received by)
Injected Script [MAIN world]
    ↓ (resolves promise)
Console shows result
```

### Tradeoffs
- **Pros**:
  - Maintains full security isolation (no extension APIs exposed to page)
  - Content script retains all Chrome API access for service worker communication
  - `window.__externalMemory` is accessible from console for testing
  - No need to specify extension ID in manifest

- **Cons**:
  - Added complexity with two-script bridge pattern
  - Slight latency from custom event round-trip (microseconds)
  - Requires additional injected.js file to be built and included

- **Security Analysis**: ✅ Secure
  - No extension APIs exposed to page
  - Only safe, public parser functions exposed to console
  - Custom events limited to extension's own scripts
  - Page cannot inject malicious code into isolated world

### Testing
After applying the fix (build with `npm run build`):
```javascript
> typeof window.__externalMemory
< "object"

> await window.__externalMemory.parseMessages()
< [Array of parsed messages]

> await window.__externalMemory.sendMessages()
< Sent successfully to service worker

> await window.__externalMemory.getStorageStats()
< { total: N, conversations: M, sampleMessages: [...] }
```

### Build Output
```
dist/content.js       10.97 kB (isolated world script)
dist/injected.js       3.31 kB (MAIN world script)
dist/manifest.json     0.90 kB (includes web_accessible_resources)
```

### References
- [Chrome Extensions: Content Scripts World Property](https://developer.chrome.com/docs/extensions/reference/manifest/content-scripts/)
- [Manifest V3: Web Accessible Resources](https://developer.chrome.com/docs/extensions/mv3/manifest/web_accessible_resources/)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/mv3-migration/)
- DOM Bridge Pattern (custom events for cross-world communication)

### Related Files
- `src/content/index.ts` - Content script (isolated world)
- `src/content/injected.ts` - Injected script (MAIN world)
- `src/content/parsers/chatgptParser.ts` - Parser implementation
- `vite.config.ts` - Build configuration

---

## Bug #2: Unused Import Warning in chatgptParser.test.ts

### Status: ✅ FIXED

### Reported Date
2025-11-11

### Severity
LOW (Warning only)

### Description
TypeScript compiler error: `'CapturedMessage' is declared but its value is never read`

### Root Cause
The test file was importing the `CapturedMessage` type but not using it explicitly. TypeScript's strict mode flags this as an unused import even though the type was used for type checking.

### Solution Applied
Removed the unused import and used TypeScript's `type` keyword to indicate imports used only for type checking:

**Before**:
```typescript
import { CapturedMessage } from '../../../types/Message';
```

**After**:
```typescript
// Removed - type checking in tests uses the actual runtime type
```

### Testing
```bash
npm test -- src/content/parsers/__tests__/chatgptParser.test.ts
# All 20 tests passing ✅
```

### Files Modified
- `src/content/parsers/__tests__/chatgptParser.test.ts` - Removed unused import

---

## Bug #3: Unused Import from 'crypto' Module

### Status: ✅ FIXED

### Reported Date
2025-11-11

### Severity
LOW (Build error)

### Description
Content script imported `uuid` from 'crypto' module which doesn't exist in browsers:
```typescript
import { v4 as uuidv4 } from 'crypto';
```

This caused:
1. TypeScript error: `Module 'crypto' has no exported member 'v4'`
2. Unused variable warning: `'uuidv4' is declared but its value is never read`

### Root Cause
Attempted to use Node.js crypto module in browser context. The UUID library was not installed and is not available in browsers natively.

### Solution Applied
Removed the import and implemented a simple, browser-compatible ID generation function:

```typescript
function generateMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
```

This provides:
- Sufficient uniqueness for message IDs
- No external dependencies required
- Works in browser environment
- Fast generation

### Testing
```bash
npm test -- src/content/parsers/__tests__/chatgptParser.test.ts
# All 20 tests passing ✅
# Verified unique IDs are generated for each message
```

### Files Modified
- `src/content/parsers/chatgptParser.ts` - Removed unused crypto import and implemented `generateMessageId()`

---

## Summary Statistics

| Category | Count | Status |
|----------|-------|--------|
| Total Bugs | 3 | ✅ All Fixed |
| High Severity | 1 | ✅ Fixed |
| Low Severity | 2 | ✅ Fixed |
| Blocker Issues | 1 | ✅ Resolved |

---

## Future Bug Prevention

### Recommendations
1. **Manifest V3 Content Script Usage**
   - Document when to use `"world": "MAIN"` vs isolated world
   - Add security review for any APIs exposed to window object

2. **Build Configuration**
   - Enable TypeScript strict mode to catch unused imports early
   - Add pre-commit hook to run tests and linting

3. **Extension Testing**
   - Create automated tests for console API availability
   - Add end-to-end test for real ChatGPT page parsing

---

**Last Updated**: 2025-11-11
**Document Owner**: Development Team
