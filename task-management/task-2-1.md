# Task 2.1: Define Message TypeScript Interface

## Description
Create a canonical TypeScript interface that defines the structure of captured messages. This interface will be used across all components (content script, service worker, storage adapters) to ensure type-safe message handling.

## Implementation Detail

### Steps:
1. Create `src/types/Message.ts` file
2. Define Message interface with the following properties:
   - `id: string` - unique message identifier (UUID or hash)
   - `conversationId: string` - identifier for the conversation/chat thread
   - `role: 'user' | 'assistant'` - sender role
   - `content: string` - message text content
   - `timestamp: number` - Unix timestamp when message was sent
   - `model?: string` - optional LLM model name (e.g., 'gpt-4', 'claude-3')
   - `platform: 'chatgpt' | 'claude'` - source platform
3. Add JSDoc comments explaining each property
4. Export interface for use in other modules

## Unit Test Detail

**Test File**: `src/types/__tests__/Message.test.ts`

Test cases:
- Verify Message interface can be imported
- Verify Message object can be created with all required properties
- Verify TypeScript compilation with valid Message object
- Verify optional properties (model) are optional
- Test message creation with different role values ('user' and 'assistant')

```typescript
describe('Message Interface', () => {
  it('should allow creating a valid message object', () => {
    const message: Message = {
      id: 'msg-123',
      conversationId: 'conv-456',
      role: 'user',
      content: 'Hello',
      timestamp: Date.now(),
      platform: 'chatgpt'
    };
    expect(message.id).toBe('msg-123');
    expect(message.role).toBe('user');
  });
});
```

## Integration Test Detail

**Test File**: `tests/message-interface.integration.test.ts`

Test cases:
- Verify Message interface is importable from all expected modules
- Create sample messages for both platforms (ChatGPT and Claude)
- Verify interface works with storage adapters (typing)
- Verify interface exports are accessible in different modules

## Manual Test Detail

1. Create `src/types/Message.ts` with interface definition
2. Run `npx tsc --noEmit` and verify no TypeScript errors
3. Import Message in another file and verify it's accessible
4. Verify IDE autocomplete works for Message properties

## Testing Requirements & Pass/Fail Criteria

### ✅ MUST-PASS (Blockers - Task cannot be completed without these)
1. **TypeScript compilation passes**: `npx tsc --noEmit` returns exit code 0 with no TS errors
2. **Interface is exportable**: Can import Message from `src/types/Message` in other files
3. **All required properties are defined**: id, conversationId, role, content, timestamp, platform

**Pass Criteria**: All 3 criteria must be met. If any fails, task is incomplete.

### ⚠️ HIGH-PRIORITY (Strongly Recommended - needed for next tasks)
1. **Optional model property**: model field is correctly marked as optional
2. **Role union type**: role property only accepts 'user' | 'assistant'
3. **Platform union type**: platform property only accepts 'chatgpt' | 'claude'

**Pass Criteria**: All 3 should work. Type safety is critical for downstream tasks.

### ⏭️ CAN SKIP/DEFER (Nice-to-have - can fix later)
1. **JSDoc comments**: Full documentation for each property (can add later)
2. **Unit tests pass**: Tests in `src/types/__tests__/Message.test.ts` (can refine later)

**Skip Criteria**: Interface structure is what matters most right now.

### Recommended Testing Order:
1. **Manual first** (2 min): Create interface, run tsc check
2. **TypeScript check** (1 min): Verify types compile
3. **If manual passes**: Move to Task 2.2 ✅
4. **Unit tests**: Add comprehensive tests if needed

## Note / Status

