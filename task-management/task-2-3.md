# Task 2.3: Implement Claude DOM Message Parser

## Description
Create a parser function that extracts messages from the Claude.com UI by querying the DOM structure. Similar to the ChatGPT parser, this will identify message elements, extract content, role, and timestamp, and return an array of Message objects conforming to the Message interface.

## Implementation Detail

### Steps:
1. Create `src/content/parsers/claudeParser.ts` file
2. Analyze Claude.com DOM structure:
   - Identify message container selectors (different from ChatGPT)
   - Identify role indicators (user vs assistant/Claude messages)
   - Identify content text areas
   - Identify timestamps if available
3. Implement `parseMessages(): Message[]` function:
   - Query all message elements from DOM
   - Extract role (user/assistant) from message structure
   - Extract content text from message element
   - Generate or extract timestamp
   - Assign conversationId based on current URL or page state
   - Detect platform as 'claude'
   - Return array of Message objects
4. Add error handling for missing elements
5. Add JSDoc comments explaining DOM structure assumptions

## Unit Test Detail

**Test File**: `src/content/parsers/__tests__/claudeParser.test.ts`

Test cases:
- Mock Claude DOM structure and test parser output
- Test parsing single user message
- Test parsing single assistant message
- Test parsing multiple messages in sequence
- Test handling missing timestamp (fallback)
- Test empty chat (no messages)
- Test parser with malformed DOM elements
- Verify returned messages conform to Message interface
- Verify platform is set to 'claude'

```typescript
describe('Claude Parser', () => {
  it('should parse assistant message from Claude DOM', () => {
    // Mock DOM with assistant message
    const messages = parseMessages();
    expect(messages[0].role).toBe('assistant');
    expect(messages[0].platform).toBe('claude');
  });
});
```

## Integration Test Detail

**Test File**: `tests/claude-parser.integration.test.ts`

Test cases:
- Open real Claude.com page with Puppeteer
- Create test conversation with at least 2 message pairs
- Run parser on live page
- Verify extracted messages match visible chat
- Verify message count matches visible messages
- Verify content accuracy

## Manual Test Detail

1. Create `src/content/parsers/claudeParser.ts` with parser function
2. Open Claude.com in browser
3. Open browser DevTools console
4. Manually run parser function: `parseMessages()`
5. Log results and verify:
   - All messages are extracted
   - Content matches visible chat
   - Roles are correct (user/assistant)
   - Platform is correctly set to 'claude'
   - Timestamps are reasonable

## Testing Requirements & Pass/Fail Criteria

### ✅ MUST-PASS (Blockers - Task cannot be completed without these)
1. **Parser function works**: Returns array of Message objects without errors
2. **Content extraction**: Extracted message content matches visible chat text
3. **Role detection**: Correctly identifies user and assistant messages
4. **Returns Message interface**: All returned objects conform to Message interface
5. **Platform detection**: Platform property correctly set to 'claude'

**Pass Criteria**: All 5 criteria must be met on real Claude.com page.

### ⚠️ HIGH-PRIORITY (Strongly Recommended - needed for next tasks)
1. **Timestamp extraction**: Handles timestamps correctly (or generates reasonable ones)
2. **Multiple messages**: Correctly parses conversations with 5+ messages
3. **Error handling**: Gracefully handles missing/malformed DOM elements

**Pass Criteria**: At least 2 of 3 should work well. Parser should be robust.

### ⏭️ CAN SKIP/DEFER (Nice-to-have - can fix later)
1. **Exact DOM selectors**: May need refinement as Claude DOM evolves
2. **Edge cases**: Complex message types (code blocks, images) can be refined later
3. **Unit tests pass**: Mock tests can be comprehensive later

**Skip Criteria**: Basic message extraction working is most important.

### Recommended Testing Order:
1. **Manual first** (10 min): Create parser, test on live Claude.com with console
2. **If manual passes**: Verify 5+ message extraction
3. **If working well**: Move to Task 2.4 ✅
4. **Unit/Integration tests**: Add comprehensive tests for robustness

## Note / Status

