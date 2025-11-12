# Task 4.1: Create Injected Script for ChatGPT API Interception

## Description

Implement a fetch interception script that captures messages from ChatGPT's API in real-time. This script runs in the page context and intercepts both outgoing user messages and incoming AI responses using the ReadableStream.tee() method for zero-latency streaming. The captured data will be sent to the content script via postMessage for further processing and storage.

The implementation is based on existing research documented in `research/real-time-message-capture.md`.

## Implementation Detail

### Steps:

#### Part 1: Create the Injected Script

1. Create `src/content/injected.ts`:
   - TypeScript file that will be bundled and injected into ChatGPT page context
   - Use strict mode for safety
   - Store original `window.fetch` before overriding

2. Implement fetch interception:
   - Override `window.fetch` to intercept all API calls
   - Identify ChatGPT endpoints using endpoint patterns:
     - `/backend-api/conversation`
     - `/api/conversation`
   - For matching endpoints, process both request and response

3. Implement outgoing message capture:
   - Extract `options.body` from POST requests
   - Parse JSON to get:
     - `conversation_id`: Conversation identifier
     - `parent_message_id`: Parent message reference
     - `model`: Model being used (e.g., 'gpt-4')
     - `messages`: Array of message objects (last element is user message)
   - Extract user message content from `messages` array
   - Send via `window.postMessage()` with type `CHATGPT_MESSAGE_SENT`

4. Implement streaming response capture:
   - Check response `content-type` header for `text/event-stream`
   - For streaming responses:
     - Use `response.body.tee()` to split stream into two identical branches
     - One branch returned to ChatGPT (unchanged)
     - One branch processed for backup capture
   - For non-streaming responses:
     - Clone response and read JSON body
     - Extract response data and send as `CHATGPT_RESPONSE_COMPLETE`

5. Implement SSE stream processing:
   - Create `processStreamForBackup()` function to handle streaming responses
   - Read stream chunks using `getReader()`
   - Decode chunks using `TextDecoder`
   - Parse SSE format (lines starting with `data: `)
   - Extract JSON from SSE data
   - From first chunk, capture metadata:
     - `conversation_id`
     - `message_id` from `json.message.id`
     - `model`
   - Accumulate message content from `json.message.content.parts[0]`
   - Send `CHATGPT_RESPONSE_CHUNK` events for each chunk (optional but useful)
   - Send `CHATGPT_RESPONSE_COMPLETE` when stream finishes
   - Handle `[DONE]` signal from ChatGPT API

6. Implement error handling:
   - Use try-catch in all async operations
   - Use `console.debug()` for errors (not console.error to avoid breaking user experience)
   - Don't propagate errors - fail silently
   - Continue processing even if one chunk fails

7. Data structures sent via postMessage:
   - **CHATGPT_MESSAGE_SENT**: User message captured
     ```typescript
     {
       type: 'CHATGPT_MESSAGE_SENT',
       data: {
         conversationId: string,
         parentMessageId: string,
         model: string,
         messages: any[], // Array of message objects
         timestamp: number
       }
     }
     ```
   - **CHATGPT_RESPONSE_CHUNK**: Streaming chunk received
     ```typescript
     {
       type: 'CHATGPT_RESPONSE_CHUNK',
       data: {
         conversationId: string,
         messageId: string,
         content: string,
         timestamp: number
       }
     }
     ```
   - **CHATGPT_RESPONSE_COMPLETE**: Full response finished
     ```typescript
     {
       type: 'CHATGPT_RESPONSE_COMPLETE',
       data: {
         conversationId: string,
         messageId: string,
         model: string,
         content: string,
         chunks: Array<{timestamp: number, content: string}>
       }
     }
     ```

8. Refer to `research/real-time-message-capture.md` for:
   - Complete code examples
   - API structure details
   - SSE format examples
   - Edge cases and error handling patterns

#### Part 2: Update Vite Build Configuration

1. Update `vite.config.ts`:
   - Configure injected.ts to be built as a separate entry point
   - Output to `dist/injected.js`
   - Ensure no module wrapper (IIFE output)
   - Make it accessible for manifest `web_accessible_resources`

2. Build configuration for content script:
   - Ensure content.ts remains a separate entry point
   - Both scripts should bundle independently

### Key Implementation Notes

- **Page Context Execution**: Script runs in page context (`window` scope), not in extension context
- **ReadableStream.tee()**: Zero-latency operation - creates stream copies without delay
- **Async Processing**: All stream processing is async and non-blocking
- **Silent Failure**: Errors should not break ChatGPT functionality
- **Message Format**: Follow exact format from research document for compatibility
- **Timestamp**: Use `Date.now()` for timestamps (Unix milliseconds)
- **ESM/Module**: Script must work without module system (IIFE pattern)

---

## Unit Test Detail

**Test File**: `src/content/__tests__/injected.test.ts`

Test cases:
- Verify injected script compiles to valid JavaScript
- Mock `window.fetch` and verify monkey patch works
- Test ChatGPT endpoint detection with various URL patterns
- Test outgoing message capture:
  - Parse request body correctly
  - Extract conversation_id, model, messages
  - Send postMessage with correct format
- Test streaming response handling:
  - Verify `tee()` is called on streaming responses
  - Verify stream is split into two branches
  - Verify backup stream is processed
- Test SSE parsing:
  - Parse SSE format correctly
  - Extract JSON from `data: ` lines
  - Handle `[DONE]` signal
  - Handle incomplete SSE messages
- Test non-streaming response handling:
  - Clone response before reading
  - Extract JSON data correctly
  - Return original response unchanged
- Test error handling:
  - Catch and log errors without throwing
  - Don't break ChatGPT when errors occur
- Test edge cases:
  - Malformed JSON in request/response
  - Missing fields in SSE data
  - Incomplete streaming responses
  - Non-ChatGPT endpoints (should be ignored)

```typescript
describe('Injected Script', () => {
  it('should intercept fetch calls', async () => {
    // Mock window.fetch
    const originalFetch = window.fetch;
    let interceptedCalls = 0;

    // Verify fetch override works
    // (actual implementation will be in injected.ts)
  });

  it('should detect ChatGPT endpoints', () => {
    const endpoint1 = 'https://chatgpt.com/backend-api/conversation';
    const endpoint2 = 'https://chatgpt.com/api/conversation';
    const endpoint3 = 'https://example.com/api/other';

    // Verify endpoint detection logic
  });

  it('should capture user messages', async () => {
    const requestBody = {
      conversation_id: 'conv-123',
      parent_message_id: 'msg-456',
      model: 'gpt-4',
      messages: [
        {
          id: 'msg-789',
          role: 'user',
          content: { content_type: 'text', parts: ['Hello'] }
        }
      ]
    };

    // Verify outgoing message is captured correctly
  });

  it('should parse SSE format correctly', () => {
    const sseData = 'data: {"conversation_id":"conv-123","message":{"id":"msg-456","content":{"parts":["Hello"]}}}\n\n';

    // Verify SSE parsing works
  });

  it('should handle streaming responses with tee()', async () => {
    // Verify ReadableStream.tee() is used
    // Verify both streams are created
  });

  it('should handle errors silently', async () => {
    // Verify errors don't throw
    // Verify errors are logged to console.debug
  });
});
```

---

## Integration Test Detail

**Test File**: `tests/injected-script.integration.test.ts`

Test cases:
- Build project and verify injected.js is created in dist/
- Verify injected.js compiles to valid JavaScript
- Manual verification with Puppeteer:
  - Load ChatGPT in browser
  - Verify injected script loads
  - Send a message and verify capture
  - Verify postMessage events are sent
- Verify no impact on ChatGPT functionality:
  - Messages are sent and received normally
  - UI remains responsive
  - No console errors from injected script

```typescript
describe('Injected Script Integration', () => {
  it('should build injected.js to dist folder', async () => {
    const fs = require('fs');
    const injectedPath = './dist/injected.js';
    expect(fs.existsSync(injectedPath)).toBe(true);
  });

  it('should contain valid JavaScript', async () => {
    const fs = require('fs');
    const code = fs.readFileSync('./dist/injected.js', 'utf-8');

    // Verify it's valid JS (can be parsed)
    expect(() => new Function(code)).not.toThrow();
  });

  it('should not have module dependencies', async () => {
    const fs = require('fs');
    const code = fs.readFileSync('./dist/injected.js', 'utf-8');

    // Verify no require() or import statements in output
    expect(code).not.toContain('require(');
    expect(code).not.toContain('import ');
  });

  // Manual test with Puppeteer would verify:
  // - Script loads on chatgpt.com
  // - fetch is intercepted
  // - postMessages are sent
  // - ChatGPT continues to work normally
});
```

---

## Manual Test Detail

1. Build the project:
   - Run: `npm run build`
   - Verify `dist/injected.js` is created

2. Load extension in Chrome:
   - Open `chrome://extensions`
   - Enable "Developer mode"
   - Load unpacked extension from `dist/`

3. Test on ChatGPT:
   - Open https://chatgpt.com in Chrome
   - Open DevTools (F12)
   - Check console for "ChatGPT conversation interceptor loaded" message
   - Send a message in ChatGPT
   - Check console for postMessage logs from injected script

4. Verify message capture:
   - Open ChatGPT and send a test message
   - Check browser console for logs showing:
     - User message captured with conversation_id and model
     - Response chunks being received
     - Final response completion event
   - Verify message content matches what's displayed in ChatGPT

5. Verify streaming capture:
   - Send a message that generates streaming response
   - Watch console for incremental chunk events
   - Verify content accumulates correctly
   - Verify completion event is sent when stream finishes

6. Test edge cases:
   - Stop generation mid-response (verify partial capture)
   - Send message with code block (verify formatting preserved)
   - Send very long message (verify no truncation)
   - Check network tab to verify no additional requests from injected script

7. Verify no performance impact:
   - Monitor ChatGPT response times
   - Check browser DevTools Performance tab
   - Verify no laggy interactions
   - Confirm tee() operation is instant

---

## Testing Requirements & Pass/Fail Criteria

### ✅ MUST-PASS (Blockers - Task cannot be completed without these)
1. **TypeScript compilation passes**: `npx tsc --noEmit` returns exit code 0 (no TS errors)
2. **Build produces injected.js**: `npm run build` creates `dist/injected.js` without errors
3. **Injected script loads on ChatGPT**: Browser console shows "ChatGPT conversation interceptor loaded"
4. **Fetch interception works**: User messages are captured from request body
5. **Streaming response capture works**: Response chunks are captured from SSE stream
6. **postMessage events sent correctly**: Injected script sends events with correct type and data format
7. **Silent error handling**: Errors don't break ChatGPT, only logged to console.debug

**Pass Criteria**: All 7 must pass. If any fails, task is incomplete.

### ⚠️ HIGH-PRIORITY (Strongly Recommended - needed for next tasks)
1. **SSE parsing handles real data**: Can parse actual ChatGPT SSE responses correctly
2. **Metadata extracted correctly**: conversation_id, message_id, model captured from first chunk
3. **Content accumulation works**: Full response content is accumulated from chunks
4. **Stream tee() creates two branches**: Both ChatGPT and backup streams work independently
5. **Handles [DONE] signal**: Correctly detects end of stream

**Pass Criteria**: At least 4 of 5 should work. If multiple fail, review stream processing logic.

### ⏭️ CAN SKIP/DEFER (Nice-to-have - can fix later)
1. **CHATGPT_RESPONSE_CHUNK events sent**: Real-time chunk updates (optional, can be added later)
2. **Non-streaming response handling**: Handles non-streaming API responses (less common, can defer)
3. **Performance metrics**: Zero-latency verification (can measure later)

**Skip Criteria**: These are enhancements that don't block Task 4.2 (content script integration).

### Recommended Testing Order:
1. **Build verification** (2 min): Verify injected.js is created and valid JavaScript
2. **Manual load test** (5 min): Load extension, verify script loads on ChatGPT
3. **Message capture test** (5 min): Send message, verify capture in console
4. **Streaming test** (5 min): Send message with response, verify chunks captured
5. **Unit tests** (5 min): Run Jest tests for fetch interception logic
6. **Edge cases** (5 min): Stop generation, verify error handling
7. **If all MUST-PASS criteria met**: Move to Task 4.2 ✅

---

## Implementation Summary

### ✅ Completed Implementation

#### Core Interception (`src/content/injected.ts`)
- **Fetch Monkey-patching**: Overrides `window.fetch` to intercept all ChatGPT API calls
- **Endpoint Detection**: Identifies ChatGPT endpoints:
  - `/backend-api/conversation` (standard)
  - `/backend-api/f/conversation` (with functions/tools)
  - `/api/conversation`
- **Request Handling**: Captures user messages from POST request body with:
  - `conversation_id` from request
  - `parent_message_id` for threading
  - `model` being used (e.g., gpt-5-1)
  - Full `messages` array for context

#### Streaming Response Processing
- **ReadableStream.tee()**: Creates two identical streams:
  - One returned to ChatGPT (unchanged)
  - One processed for capture (zero-latency)
- **SSE Parsing**: Handles Server-Sent Events format (`data: {json}\n\n`)
- **JSON Patch Support**: Processes RFC 6902 patch operations:
  - Detects content type (text, model_editable_context, etc.)
  - Applies `append`, `prepend`, `replace` operations to build response
  - Accumulates content across multiple chunks

#### Utility Functions (`src/content/utils/chatgptStreamUtils.ts`)
- **`extractModelIdentifier()`**: Robust model detection from multiple sources
- **`applyContentPatchOperations()`**: RFC 6902 patch operation processor
  - Parses `/message/content/parts/0` path operations
  - Handles content mutations with fallback deduplication

#### Message Format
All events sent via `window.postMessage()` with proper typing:
- `CHATGPT_MESSAGE_SENT`: User message capture
- `CHATGPT_RESPONSE_CHUNK`: Real-time chunk updates
- `CHATGPT_RESPONSE_COMPLETE`: Full response with all chunks

#### Error Handling
- Silent failure with `try-catch` blocks
- Errors logged only to `console.debug()` (not visible to users)
- Continues processing even if individual chunks fail
- No impact on ChatGPT functionality

### Key Technical Discoveries
1. **JSON Patch Format**: ChatGPT streams responses as RFC 6902 patch operations, not direct content
2. **Multiple Message Types**: Stream includes system messages (metadata), user echoes, and actual assistant responses
3. **Content Type Filtering**: Must check `content_type` field to distinguish actual text responses from metadata
4. **Incremental Updates**: Response content builds up across multiple chunks with patch operations

### Files Created/Modified
- ✅ `src/content/injected.ts` - Main interception script (425+ lines)
- ✅ `src/content/utils/chatgptStreamUtils.ts` - RFC 6902 patch processor
- ✅ `src/content/index.ts` - Script injection and postMessage handling
- ✅ `src/content/__tests__/injected.test.ts` - Comprehensive unit tests
- ✅ `public/manifest.json` - Already configured with `web_accessible_resources`

### Test Results
- ✅ **Unit Tests**: 273 tests passing
- ✅ **TypeScript**: No compilation errors
- ✅ **Build**: `dist/injected.js` successfully generated (9.34 kB)
- ✅ **Integration**: Manual testing on ChatGPT.com confirms:
  - Fetch interception working
  - User messages captured with conversation_id
  - AI responses captured with full content
  - Streaming content accumulates correctly
  - No performance degradation

## Note / Status

- Status: ✅ COMPLETE
- Assigned to: [Completed]
- Dependencies: None (completed independently)
- Blocks: Task 4.2 (Update Manifest & Content Script for Injected Script)
- Refer to: `research/real-time-message-capture.md` for implementation details
- Notes:
  - Implementation handles ChatGPT's RFC 6902 patch operation format
  - Script runs in page context without module dependencies
  - Uses ReadableStream.tee() for zero-latency streaming (confirmed working)
  - Fails silently without breaking ChatGPT
  - All stream processing is async and non-blocking
  - Timestamp format: Unix milliseconds (Date.now())
