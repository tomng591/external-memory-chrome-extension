# Task 4.2: Create Message Formatter & Integrate with Service Worker

## Description

Convert raw API data from the fetch interception (Task 4.1) into canonical Message objects and wire them through the service worker for persistent storage. This task bridges the gap between real-time message capture and storage, creating a unified message pipeline from ChatGPT/Claude API through to the storage adapters configured in Milestone 3.

The message formatter will transform raw API payloads into the standardized `Message` interface defined in Milestone 2, handling edge cases and data validation. The service worker will receive formatted messages and route them to the appropriate storage adapter (Obsidian, IndexedDB, or InMemory).

## Implementation Detail

### Part 1: Create Message Formatter Service

#### Step 1: Extend Message Type if Needed

1. Review existing `src/types/Message.ts` from Task 2.1
2. Add optional fields for streaming metadata (if needed):
   - `chunks?: Array<{timestamp: number, content: string}>` - for tracking response chunks
   - `originalApiData?: Record<string, any>` - preserve raw API data for debugging
3. Ensure timestamp field exists (should be `timestamp: number`)

#### Step 2: Create Message Formatter (`src/services/MessageFormatter.ts`)

1. Create utility service with two main formatting functions:

2. **Function: `formatUserMessage()`**
   - Input: Raw API user message from Task 4.1 (`CHATGPT_MESSAGE_SENT` event)
     ```typescript
     {
       conversationId: string,
       parentMessageId: string,
       model: string,
       messages: any[],  // Array of message objects
       timestamp: number
     }
     ```
   - Processing:
     - Extract content from `messages` array (last element is typically the user message)
     - Find the message with `role: 'user'`
     - Extract text from `message.content.parts[0]` or `message.content`
     - Generate unique `id` from `parentMessageId` (can be same or derived)
     - Set `platform: 'chatgpt'`
     - Keep timestamp from raw data
   - Output: `Message` object
     ```typescript
     {
       id: string,
       conversationId: string,
       role: 'user',
       content: string,
       timestamp: number,
       model: string,
       platform: 'chatgpt'
     }
     ```
   - Error handling:
     - If messages array is empty, throw or return null
     - If no user message found, log warning and use best effort
     - If content is missing, use empty string with warning

3. **Function: `formatAssistantResponse()`**
   - Input: Raw API assistant response from Task 4.1 (`CHATGPT_RESPONSE_COMPLETE` event)
     ```typescript
     {
       conversationId: string,
       messageId: string,
       model: string,
       content: string,  // Full accumulated content
       chunks: Array<{timestamp: number, content: string}>  // From streaming
     }
     ```
   - Processing:
     - Use `messageId` as message `id`
     - Use provided `conversationId`
     - Set `role: 'assistant'`
     - Use provided `content` (already accumulated from chunks)
     - Set `platform: 'chatgpt'`
     - Use first chunk's timestamp or current time
     - Optionally store chunks array in Message if schema supports it
   - Output: `Message` object
     ```typescript
     {
       id: string,
       conversationId: string,
       role: 'assistant',
       content: string,
       timestamp: number,
       model: string,
       platform: 'chatgpt',
       chunks?: Array<{timestamp: number, content: string}>  // Optional
     }
     ```
   - Error handling:
     - If content is empty, still save (partial responses are valid)
     - If timestamp missing, use current time
     - Log any data quality issues but don't fail

4. **Helper Function: `validateMessage()`**
   - Verify required Message fields are present
   - Check content is not malformed
   - Log validation warnings
   - Return boolean (valid/invalid)

### Part 2: Update Content Script to Use Formatter

#### Step 1: Modify `src/content/index.ts`

1. Import `MessageFormatter` at top
2. In the existing `window.addEventListener('message', ...)` handler:
   - Check message event type (already receives from injected script)
   - When receiving `CHATGPT_MESSAGE_SENT`:
     - Call `formatUserMessage()` with event data
     - If formatting succeeds, forward to service worker
   - When receiving `CHATGPT_RESPONSE_COMPLETE`:
     - Call `formatAssistantResponse()` with event data
     - If formatting succeeds, forward to service worker
3. Forward formatted message to service worker via `chrome.runtime.sendMessage`:
   ```typescript
   chrome.runtime.sendMessage({
     type: 'chatgpt_message_sent',  // for user messages
     data: formattedMessage
   });
   // OR
   chrome.runtime.sendMessage({
     type: 'chatgpt_response_complete',  // for assistant messages
     data: formattedMessage
   });
   ```
4. Verify no errors are thrown - fail silently if formatting fails
5. Add console logging for debugging: "Message formatted and sent to service worker"

### Part 3: Update Service Worker to Receive and Store

#### Step 1: Modify `src/background.ts`

1. Review existing service worker setup (from Tasks 1.5, 2.8)
2. Ensure `StorageService` is already instantiated with configured adapter
3. In `chrome.runtime.onMessage` listener:
   - Add handlers for new message types: `'chatgpt_message_sent'` and `'chatgpt_response_complete'`
   - For each message type:
     - Extract formatted Message from `message.data`
     - Call `storageService.saveMessage(message)`
     - Return acknowledgment: `sendResponse({ success: true })`
   - Keep async flow (use promise chain, don't await on client)
     ```typescript
     chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
       if (message.type === 'chatgpt_message_sent' || message.type === 'chatgpt_response_complete') {
         // Send acknowledgment immediately
         sendResponse({ success: true });

         // Save message async in background (don't await)
         storageService.saveMessage(message.data)
           .catch(err => console.debug('Failed to save message:', err));
       }
     });
     ```

4. Add error handling:
   - Log all storage errors to `console.debug()` (not visible to user)
   - Don't throw errors back to content script
   - Continue processing other messages even if one fails

5. Verification logging:
   - Add console.log: "Service Worker: Message saved to storage"
   - Add console.debug for error cases

### Key Implementation Notes

- **Message Flow**: Injected Script → Content Script → MessageFormatter → Service Worker → StorageService → Storage Adapter
- **Non-blocking**: Always respond to content script immediately, save asynchronously
- **Silent Errors**: Catch and log failures, don't propagate to UI
- **Timestamp**: Use existing timestamp from API data, fall back to `Date.now()` if missing
- **Platform Detection**: Already handled by formatter (hardcoded to 'chatgpt' for now, will generalize in Task 4.3)
- **Duplicate Prevention**: Task 4.5 will add deduplication, so formatter can save duplicates for now

---

## Unit Test Detail

**Test File**: `src/services/__tests__/MessageFormatter.test.ts`

### Test Cases

```typescript
describe('MessageFormatter', () => {
  describe('formatUserMessage()', () => {
    it('should format valid user message correctly', () => {
      const raw = {
        conversationId: 'conv-123',
        parentMessageId: 'msg-456',
        model: 'gpt-4',
        messages: [
          {
            id: 'msg-user-1',
            role: 'user',
            content: { content_type: 'text', parts: ['Hello ChatGPT'] }
          }
        ],
        timestamp: 1699000000000
      };

      const formatted = formatUserMessage(raw);

      expect(formatted).toEqual({
        id: expect.any(String),
        conversationId: 'conv-123',
        role: 'user',
        content: 'Hello ChatGPT',
        timestamp: 1699000000000,
        model: 'gpt-4',
        platform: 'chatgpt'
      });
    });

    it('should handle messages array with multiple items', () => {
      const raw = {
        conversationId: 'conv-123',
        parentMessageId: 'msg-456',
        model: 'gpt-4',
        messages: [
          { role: 'system', content: { parts: ['System prompt'] } },
          { role: 'assistant', content: { parts: ['Previous response'] } },
          { role: 'user', content: { content_type: 'text', parts: ['New question'] } }
        ],
        timestamp: 1699000000000
      };

      const formatted = formatUserMessage(raw);

      expect(formatted.content).toBe('New question');
      expect(formatted.role).toBe('user');
    });

    it('should handle empty messages array', () => {
      const raw = {
        conversationId: 'conv-123',
        parentMessageId: 'msg-456',
        model: 'gpt-4',
        messages: [],
        timestamp: 1699000000000
      };

      // Should either return null or throw
      expect(() => formatUserMessage(raw)).toThrow();
    });

    it('should extract content from different content formats', () => {
      const raw = {
        conversationId: 'conv-123',
        parentMessageId: 'msg-456',
        model: 'gpt-4',
        messages: [
          {
            role: 'user',
            content: { content_type: 'text', parts: ['Part 1', 'Part 2'] }
          }
        ],
        timestamp: 1699000000000
      };

      const formatted = formatUserMessage(raw);

      // Should handle multiple parts (usually concatenate or use first)
      expect(formatted.content).toBeTruthy();
    });
  });

  describe('formatAssistantResponse()', () => {
    it('should format valid assistant response correctly', () => {
      const raw = {
        conversationId: 'conv-123',
        messageId: 'msg-ai-1',
        model: 'gpt-4',
        content: 'This is the assistant response.',
        chunks: [
          { timestamp: 1699000001000, content: 'This is' },
          { timestamp: 1699000002000, content: ' the assistant response.' }
        ]
      };

      const formatted = formatAssistantResponse(raw);

      expect(formatted).toEqual({
        id: 'msg-ai-1',
        conversationId: 'conv-123',
        role: 'assistant',
        content: 'This is the assistant response.',
        timestamp: expect.any(Number),
        model: 'gpt-4',
        platform: 'chatgpt',
        chunks: expect.any(Array)
      });
    });

    it('should handle empty content', () => {
      const raw = {
        conversationId: 'conv-123',
        messageId: 'msg-ai-1',
        model: 'gpt-4',
        content: '',
        chunks: []
      };

      const formatted = formatAssistantResponse(raw);

      // Should still create valid Message (partial response)
      expect(formatted.content).toBe('');
      expect(formatted.id).toBe('msg-ai-1');
    });

    it('should use provided timestamp from chunks', () => {
      const timestamp = 1699000001000;
      const raw = {
        conversationId: 'conv-123',
        messageId: 'msg-ai-1',
        model: 'gpt-4',
        content: 'Response',
        chunks: [
          { timestamp, content: 'Response' }
        ]
      };

      const formatted = formatAssistantResponse(raw);

      expect(formatted.timestamp).toBe(timestamp);
    });

    it('should fallback to current time if no chunks', () => {
      const raw = {
        conversationId: 'conv-123',
        messageId: 'msg-ai-1',
        model: 'gpt-4',
        content: 'Response',
        chunks: []
      };

      const beforeTime = Date.now();
      const formatted = formatAssistantResponse(raw);
      const afterTime = Date.now();

      expect(formatted.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(formatted.timestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('validateMessage()', () => {
    it('should validate complete message', () => {
      const msg = {
        id: 'msg-1',
        conversationId: 'conv-1',
        role: 'user' as const,
        content: 'Hello',
        timestamp: 1699000000000,
        model: 'gpt-4',
        platform: 'chatgpt' as const
      };

      expect(validateMessage(msg)).toBe(true);
    });

    it('should reject missing required fields', () => {
      const msg = {
        id: 'msg-1',
        conversationId: 'conv-1',
        role: 'user' as const,
        // missing content
        timestamp: 1699000000000
      };

      expect(validateMessage(msg)).toBe(false);
    });
  });
});
```

---

## Integration Test Detail

**Test File**: `tests/message-formatter.integration.test.ts`

Test cases:
- Build project and verify no TypeScript errors
- Mock the complete flow:
  - Injected script simulates `CHATGPT_MESSAGE_SENT` event
  - Content script receives and formats message
  - Service worker receives formatted message and saves it
  - Verify message ends up in storage adapter
- Test with actual StorageService and InMemoryAdapter:
  - Send simulated ChatGPT API data
  - Verify formatted Message is saved
  - Retrieve from storage and validate
- Test message persistence:
  - Format and save 5 messages
  - Verify all 5 are retrievable from storage
  - Verify no duplicates
- Test error scenarios:
  - Malformed API data (missing fields)
  - Service worker unavailable
  - Storage adapter throws error
  - Content script can't format message

```typescript
describe('Message Formatter Integration', () => {
  let storageService: StorageService;
  let adapter: InMemoryAdapter;

  beforeEach(() => {
    adapter = new InMemoryAdapter();
    storageService = new StorageService(adapter);
  });

  it('should format and save user message through complete pipeline', async () => {
    const rawUserMessage = {
      conversationId: 'conv-123',
      parentMessageId: 'msg-456',
      model: 'gpt-4',
      messages: [
        {
          role: 'user',
          content: { content_type: 'text', parts: ['Hello'] }
        }
      ],
      timestamp: Date.now()
    };

    const formatted = formatUserMessage(rawUserMessage);
    await storageService.saveMessage(formatted);

    // Verify message was saved
    const saved = await adapter.retrieve(formatted.id);
    expect(saved).toEqual(formatted);
  });

  it('should format and save assistant response through pipeline', async () => {
    const rawResponse = {
      conversationId: 'conv-123',
      messageId: 'msg-ai-1',
      model: 'gpt-4',
      content: 'Full response accumulated from chunks',
      chunks: [
        { timestamp: Date.now(), content: 'Full response accumulated from chunks' }
      ]
    };

    const formatted = formatAssistantResponse(rawResponse);
    await storageService.saveMessage(formatted);

    const saved = await adapter.retrieve(formatted.id);
    expect(saved?.role).toBe('assistant');
    expect(saved?.content).toContain('Full response');
  });

  it('should handle complete conversation flow', async () => {
    // User sends message
    const userMsg = formatUserMessage({
      conversationId: 'conv-123',
      parentMessageId: 'msg-1',
      model: 'gpt-4',
      messages: [
        { role: 'user', content: { content_type: 'text', parts: ['What is 2+2?'] } }
      ],
      timestamp: Date.now()
    });

    // AI responds
    const assistantMsg = formatAssistantResponse({
      conversationId: 'conv-123',
      messageId: 'msg-ai-1',
      model: 'gpt-4',
      content: '2+2 equals 4',
      chunks: [
        { timestamp: Date.now(), content: '2+2 equals 4' }
      ]
    });

    // Save both
    await storageService.saveMessage(userMsg);
    await storageService.saveMessage(assistantMsg);

    // Verify both are saved
    const retrievedUser = await adapter.retrieve(userMsg.id);
    const retrievedAssistant = await adapter.retrieve(assistantMsg.id);

    expect(retrievedUser?.content).toBe('What is 2+2?');
    expect(retrievedAssistant?.content).toContain('4');
  });
});
```

---

## Manual Test Detail

### Prerequisites
- Task 4.1 completed (injected script and fetch interception working)
- Service worker from Milestone 1-2 set up
- InMemoryAdapter or ObsidianAdapter configured

### Test Steps

1. **Verify TypeScript compilation**:
   - Run: `npx tsc --noEmit`
   - Verify no errors related to MessageFormatter or updated content script/service worker

2. **Test message formatting in isolation** (Optional but helpful):
   - Create test file locally
   - Import `formatUserMessage()` and `formatAssistantResponse()`
   - Call with sample API data from Task 4.1
   - Verify output matches expected Message structure

3. **Build and load extension**:
   - Run: `npm run build`
   - Verify build succeeds
   - Load extension in Chrome: `chrome://extensions`

4. **Test on ChatGPT**:
   - Open https://chatgpt.com
   - Open DevTools (F12)
   - Go to Console tab
   - Make sure service worker is active: `chrome://extensions` → find extension → "Inspect views" (service worker)

5. **Send first message**:
   - Type message in ChatGPT (e.g., "Hello, what is 2+2?")
   - Send message
   - Watch both browser console AND service worker console:
     - Browser console should show: "Message formatted and sent to service worker"
     - Service worker console should show: "Service Worker: Message saved to storage"

6. **Verify message flow**:
   - In service worker console, check for logs:
     - "Message saved: {id, conversationId, role, content, ...}"
   - Verify conversationId matches ChatGPT conversation
   - Verify content matches your typed message
   - Verify role is 'user' and platform is 'chatgpt'

7. **Wait for response**:
   - ChatGPT processes and returns response
   - Watch for additional logs:
     - Browser console: "Message formatted and sent to service worker"
     - Service worker console: "Service Worker: Message saved to storage"

8. **Verify response formatting**:
   - In service worker console, verify assistant message logs:
     - Should show role='assistant'
     - Should show full accumulated content (not partial)
     - Should have same conversationId as user message
     - Should have unique messageId

9. **Test multiple exchanges**:
   - Send 3-5 messages back and forth
   - Verify all are logged in service worker console
   - Verify each has unique ID but same conversationId
   - Verify role alternates: user, assistant, user, assistant, ...

10. **Check storage** (if using ObsidianAdapter):
    - Open your Obsidian vault
    - Verify markdown files were created for each message
    - Verify content matches what was captured

11. **Test edge cases**:
    - Send message with code block → verify code is preserved
    - Send very long message → verify not truncated
    - Regenerate response in ChatGPT → verify captured
    - Stop response mid-generation → verify partial response handled

12. **Verify no UI impact**:
    - ChatGPT should continue working normally
    - No lag in typing or sending
    - No console errors (only debug logs)

---

## Testing Requirements & Pass/Fail Criteria

### ✅ MUST-PASS (Blockers - Task cannot be completed without these)

1. **TypeScript compilation passes**: `npx tsc --noEmit` returns exit code 0
2. **MessageFormatter creates valid Message objects**: Both `formatUserMessage()` and `formatAssistantResponse()` return properly typed Message objects
3. **Content script successfully formats messages**: Content script receives raw API data and calls formatter without errors
4. **Service worker receives formatted messages**: Service worker console shows "Message saved" logs for both user and assistant messages
5. **Messages stored via StorageService**: Formatted messages end up in configured storage adapter (InMemory, Obsidian, etc.)
6. **Message content preserved**: Stored message content matches original API data (no truncation or corruption)
7. **Unique IDs assigned**: Each message gets unique ID, same conversation shares conversationId

**Pass Criteria**: All 7 must pass. If any fails, task is incomplete.

### ⚠️ HIGH-PRIORITY (Strongly Recommended)

1. **User and assistant roles correct**: User messages have role='user', assistant messages have role='assistant'
2. **Timestamps preserved**: Message timestamps are from API data, not current time
3. **Model field populated**: Message.model field correctly shows ChatGPT model being used
4. **Platform detected correctly**: All messages have platform='chatgpt'
5. **Service worker doesn't block**: Async message handling doesn't delay Chrome extension responsiveness
6. **Error messages helpful**: Any validation failures log clear errors for debugging

**Pass Criteria**: At least 5 of 6 working. If multiple fail, review formatter logic.

### ⏭️ CAN SKIP/DEFER (Nice-to-have)

1. **Chunk metadata preserved**: Response chunks stored if schema supports
2. **JSON validation strict**: Strict JSON schema validation (can add later)
3. **Telemetry/metrics**: Message count, size metrics (can add later)

**Skip Criteria**: These enhance debugging but don't block Task 4.3 (Claude interception).

### Recommended Testing Order

1. **Compilation check** (1 min): Verify TypeScript passes
2. **Unit tests** (2 min): Run Jest tests for formatter functions
3. **Extension load** (2 min): Build and load in Chrome
4. **Single message** (3 min): Send one message, verify logs
5. **Multiple exchanges** (3 min): Send 3-5 messages, verify all captured
6. **Storage verification** (2 min): Check that messages are actually stored
7. **Error handling** (2 min): Verify malformed data is handled gracefully
8. **If all MUST-PASS criteria met**: Move to Task 4.3 ✅

---

## Implementation Summary

### Status: [PENDING]

### Files to Create/Modify

- ✅ Create: `src/services/MessageFormatter.ts` - Main formatter service
- ✅ Update: `src/types/Message.ts` - Extend with optional fields if needed
- ✅ Update: `src/content/index.ts` - Use formatter before sending to service worker
- ✅ Update: `src/background.ts` - Receive and store formatted messages
- ✅ Create: `src/services/__tests__/MessageFormatter.test.ts` - Unit tests
- ✅ Create: `tests/message-formatter.integration.test.ts` - Integration tests

### Key Implementation Decisions

- **Formatter Location**: Service file (`src/services/`) for reusability (can be used by other adapters later)
- **Error Handling**: Silent failures with console.debug logs (don't expose errors to user)
- **Timestamp Source**: Use API data timestamp (not Date.now()) to preserve exact capture time
- **Platform Hardcoding**: 'chatgpt' for now, will generalize in Task 4.3
- **Message ID**: Use `messageId` from API for assistant, generate/derive from `parentMessageId` for user
- **Async Storage**: Service worker saves async without blocking content script
- **Response Buffering**: Wait for `CHATGPT_RESPONSE_COMPLETE` before saving (don't save partial responses)

### Dependencies

- Requires: Task 4.1 (fetch interception) ✅
- Requires: Task 2.1 (Message type) ✅
- Requires: Task 2.8 (StorageService) ✅
- Requires: Task 3.2 or 3.2.1 (Storage adapter configured) ✅
- Blocks: Task 4.3 (Claude interception), Task 4.5 (Deduplication)

---

## Note / Status

- **Status**: [PENDING - Ready for implementation]
- **Assigned to**: [Awaiting assignment]
- **Dependencies**: Task 4.1 ✅ (complete)
- **Blocks**: Task 4.3 (Claude API interception), Task 4.5 (Deduplication)
- **Key Files**:
  - `src/services/MessageFormatter.ts` (NEW)
  - `src/content/index.ts` (UPDATE)
  - `src/background.ts` (UPDATE)
- **Testing**: Unit + Integration + Manual required
- **Notes**:
  - Message flow: Injected → Content (formatted) → Service Worker (stored)
  - No deduplication yet (Task 4.5)
  - Platform hardcoded to 'chatgpt' (Task 4.3+ will generalize)
  - Silent error handling - nothing breaks user experience
  - All timestamps preserved from API, not overwritten
