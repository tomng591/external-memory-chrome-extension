# Task 2.7: Wire Message Parsers to Content Script

## Description
Modify the content script to use the ChatGPT and Claude DOM parsers to extract messages from the current page. The content script will detect which platform it's running on, call the appropriate parser, and send the extracted messages to the service worker via chrome.runtime.sendMessage.

## Implementation Detail

### Steps:
1. Modify `src/content/index.ts` (created in Task 1.4):
   - Import both parsers: chatgptParser and claudeParser
   - Import Message interface from Task 2.1
2. Implement platform detection function:
   - Check current URL against known patterns
   - chatgpt.com → ChatGPT parser
   - claude.ai → Claude parser
   - Return detected platform or null
3. Implement message extraction function:
   - Call detectPlatform()
   - If ChatGPT: call parseMessages() from chatgptParser
   - If Claude: call parseMessages() from claudeParser
   - Return Message[]
4. Implement message sending function:
   - Use chrome.runtime.sendMessage() to send messages to service worker
   - Send messages in batches if many (e.g., 10 at a time)
   - Log success/failure
5. Wire everything on page load:
   - Extract messages when page is fully loaded
   - Send to service worker
   - Log count of messages sent

## Unit Test Detail

**Test File**: `src/content/__tests__/index.test.ts`

Test cases:
- Test platform detection with different URLs
- Test message extraction with mocked parsers
- Test chrome.runtime.sendMessage is called correctly
- Test batching of messages (if implemented)
- Test error handling when parser fails
- Test logging messages

```typescript
describe('Content Script', () => {
  it('should detect ChatGPT platform from URL', () => {
    // Mock window.location
    const platform = detectPlatform();
    expect(platform).toBe('chatgpt');
  });

  it('should extract and send messages', async () => {
    // Mock parsers and chrome API
    const messages = await extractMessages();
    expect(messages.length).toBeGreaterThan(0);
  });
});
```

## Integration Test Detail

**Test File**: `tests/content-script.integration.test.ts`

Integration test cases:
- Use Puppeteer to open ChatGPT in headless Chrome with extension loaded
- Wait for content script to load
- Create a test conversation
- Verify chrome.runtime.sendMessage is called with Message objects
- Check service worker receives messages
- Repeat for Claude.ai
- Verify message integrity in transmission

## Manual Test Detail

1. Complete implementation of `src/content/index.ts`
2. Build extension: `npm run build`
3. Load extension in Chrome (chrome://extensions)
4. Open ChatGPT or Claude.ai in new tab
5. Open DevTools for that page (right-click → Inspect)
6. Go to Console tab
7. Verify logs show:
   - "Content script loaded"
   - "Detected platform: chatgpt" or "Detected platform: claude"
   - "Messages captured: N" (with number)
8. Open Service Worker console (chrome://extensions → service worker)
9. Verify service worker logs show messages received

## Testing Requirements & Pass/Fail Criteria

### ✅ MUST-PASS (Blockers - Task cannot be completed without these)
1. **Platform detection works**: Correctly identifies ChatGPT or Claude based on URL
2. **Parsers are called**: Message extraction function calls appropriate parser
3. **Messages are sent**: chrome.runtime.sendMessage is called with Message objects
4. **No TypeScript errors**: Code compiles without errors
5. **No console errors**: Extension loads without runtime errors

**Pass Criteria**: All 5 criteria must be met on real ChatGPT and Claude.ai pages.

### ⚠️ HIGH-PRIORITY (Strongly Recommended - needed for next tasks)
1. **Message count logging**: Console shows number of messages captured
2. **Service worker receives messages**: Can verify in service worker console
3. **Works on both platforms**: Functions correctly on ChatGPT AND Claude.ai

**Pass Criteria**: All 3 should work. Critical for full integration.

### ⏭️ CAN SKIP/DEFER (Nice-to-have - can fix later)
1. **Error recovery**: Graceful handling of parse failures (can enhance later)
2. **Performance optimization**: Message batching efficiency (can optimize later)
3. **Advanced logging**: Detailed debug logs (can add later)

**Skip Criteria**: Core message capture and transmission is what matters.

### Recommended Testing Order:
1. **Manual first** (15 min): Load extension, test on ChatGPT and Claude
2. **Check console logs** (5 min): Verify platform detection and message counts
3. **Check service worker** (5 min): Verify messages arrive at service worker
4. **If both work**: Move to Task 2.8 ✅
5. **Debug issues**: Fix any parser or message transmission issues

## Note / Status

