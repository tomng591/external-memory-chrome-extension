# Task 2.2: Implement ChatGPT DOM Message Parser

## Description
Create a parser function that extracts messages from the ChatGPT UI by querying the DOM structure. The parser will identify message elements, extract their content, role, and timestamp, and return an array of Message objects that conform to the Message interface defined in Task 2.1.

## Implementation Detail

### Steps:
1. Create `src/content/parsers/chatgptParser.ts` file
2. Analyze ChatGPT DOM structure:
   - Identify message container selectors (typically divs with specific classes)
   - Identify role indicators (user vs assistant/bot messages)
   - Identify content text areas
   - Identify timestamps if available
3. Implement `parseMessages(): Message[]` function:
   - Query all message elements from DOM
   - Extract role (user/assistant) from message structure
   - Extract content text from message element
   - Generate or extract timestamp
   - Assign conversationId based on current URL or page state
   - Detect platform as 'chatgpt'
   - Return array of Message objects
4. Add error handling for missing elements
5. Add JSDoc comments explaining DOM structure assumptions

## Unit Test Detail

**Test File**: `src/content/parsers/__tests__/chatgptParser.test.ts`

Test cases:
- Mock ChatGPT DOM structure and test parser output
- Test parsing single user message
- Test parsing single assistant message
- Test parsing multiple messages in sequence
- Test handling missing timestamp (fallback)
- Test empty chat (no messages)
- Test parser with malformed DOM elements
- Verify returned messages conform to Message interface

```typescript
describe('ChatGPT Parser', () => {
  it('should parse user message from ChatGPT DOM', () => {
    // Mock DOM with user message
    const messages = parseMessages();
    expect(messages[0].role).toBe('user');
    expect(messages[0].platform).toBe('chatgpt');
  });
});
```

## Integration Test Detail

**Test File**: `tests/chatgpt-parser.integration.test.ts`

Test cases:
- Open real ChatGPT page with Puppeteer
- Create test conversation with at least 2 message pairs
- Run parser on live page
- Verify extracted messages match visible chat
- Verify message count matches visible messages
- Verify content accuracy

## Manual Test Detail

1. Create `src/content/parsers/chatgptParser.ts` with parser function
2. Open ChatGPT in browser
3. Open browser DevTools console
4. Manually run parser function: `parseMessages()`
5. Log results and verify:
   - All messages are extracted
   - Content matches visible chat
   - Roles are correct (user/assistant)
   - Timestamps are reasonable

## Testing Requirements & Pass/Fail Criteria

### ✅ MUST-PASS (Blockers - Task cannot be completed without these)
1. **Parser function works**: Returns array of Message objects without errors
2. **Content extraction**: Extracted message content matches visible chat text
3. **Role detection**: Correctly identifies user and assistant messages
4. **Returns Message interface**: All returned objects conform to Message interface

**Pass Criteria**: All 4 criteria must be met on real ChatGPT page.

### ⚠️ HIGH-PRIORITY (Strongly Recommended - needed for next tasks)
1. **Timestamp extraction**: Handles timestamps correctly (or generates reasonable ones)
2. **Multiple messages**: Correctly parses conversations with 5+ messages
3. **Error handling**: Gracefully handles missing/malformed DOM elements

**Pass Criteria**: At least 2 of 3 should work well. Parser should be robust.

### ⏭️ CAN SKIP/DEFER (Nice-to-have - can fix later)
1. **Exact DOM selectors**: May need refinement as ChatGPT DOM evolves
2. **Edge cases**: Complex message types (code blocks, images) can be refined later
3. **Unit tests pass**: Mock tests can be comprehensive later

**Skip Criteria**: Basic message extraction working is most important.

### Recommended Testing Order:
1. **Manual first** (10 min): Create parser, test on live ChatGPT with console
2. **If manual passes**: Verify 5+ message extraction
3. **If working well**: Move to Task 2.3 ✅
4. **Unit/Integration tests**: Add comprehensive tests for robustness

## Note / Status

### Status: ✅ COMPLETED

**Completion Date**: 2025-11-11

**What was delivered**:
1. ✅ `src/content/parsers/chatgptParser.ts` - Full parser implementation with:
   - `parseMessages()` - Extracts all messages from ChatGPT DOM
   - `getParserDebugInfo()` - Debug utility function
   - Helper functions for role detection, content extraction, timestamp handling
   - Comprehensive error handling and fallbacks
   - Full JSDoc documentation

2. ✅ `src/content/parsers/__tests__/chatgptParser.test.ts` - 20 comprehensive unit tests:
   - Single user/assistant message parsing
   - Multiple message sequences
   - Conversation ID extraction from URL
   - Message role detection with multiple DOM patterns
   - Unique ID generation
   - Timestamp handling
   - CapturedMessage interface conformance
   - Edge cases (nested structures, special characters, whitespace)
   - All 20 tests passing ✅

3. ✅ Console testing API:
   - `window.__externalMemory.parseMessages()` - Returns raw message array
   - `window.__externalMemory.testParser()` - Pretty-printed formatted results
   - `window.__externalMemory.getDebugInfo()` - Debug information string
   - Successfully tested on live ChatGPT conversations

4. ✅ Manifest V3 world isolation fix:
   - Updated manifest.json with `"world": "MAIN"` to allow window object access
   - Resolved Manifest V3 isolated world security limitation

**All MUST-PASS criteria met**:
- ✅ Parser function returns array of CapturedMessage objects without errors
- ✅ Content extraction matches visible chat text
- ✅ Role detection correctly identifies user and assistant messages
- ✅ All returned objects conform to CapturedMessage interface

**All HIGH-PRIORITY criteria met**:
- ✅ Timestamp extraction generates reasonable timestamps
- ✅ Correctly parses conversations with 5+ messages
- ✅ Gracefully handles malformed DOM elements with try-catch

**Ready for**: Task 2.3 - Implement Claude DOM Message Parser

