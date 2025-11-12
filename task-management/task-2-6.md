# Task 2.6: Write Unit Tests for InMemoryAdapter with Jest

## Description
Create comprehensive Jest unit tests for the InMemoryAdapter to verify all functionality works correctly. This task focuses on writing robust test coverage that validates save, retrieve, delete, and retrieveAll operations with various scenarios and edge cases.

## Implementation Detail

### Steps:
1. Create `src/adapters/__tests__/InMemoryAdapter.test.ts` file
2. Write Jest test suite with beforeEach setup:
   - Create fresh InMemoryAdapter instance for each test
   - Create reusable test Message objects
3. Implement test cases:
   - **Save operations**: Single message, multiple messages, update existing
   - **Retrieve operations**: Existing message, non-existent message
   - **Delete operations**: Existing message, non-existent message
   - **RetrieveAll**: All messages, filtered by conversationId, empty adapter
   - **Edge cases**: Empty string IDs, null values, large message content
   - **Async behavior**: Verify Promises resolve correctly
4. Add descriptive test names and comments
5. Calculate and report test coverage

## Unit Test Detail

**Test File**: `src/adapters/__tests__/InMemoryAdapter.test.ts`

Comprehensive test cases:

```typescript
describe('InMemoryAdapter', () => {
  let adapter: InMemoryAdapter;
  let testMessage: Message;

  beforeEach(() => {
    adapter = new InMemoryAdapter();
    testMessage = {
      id: 'msg-1',
      conversationId: 'conv-1',
      role: 'user' as const,
      content: 'Hello world',
      timestamp: Date.now(),
      platform: 'chatgpt' as const
    };
  });

  describe('save', () => {
    it('should save a message', async () => {
      await adapter.save(testMessage);
      const retrieved = await adapter.retrieve('msg-1');
      expect(retrieved).toEqual(testMessage);
    });

    it('should update existing message', async () => {
      await adapter.save(testMessage);
      const updated = { ...testMessage, content: 'Updated' };
      await adapter.save(updated);
      const retrieved = await adapter.retrieve('msg-1');
      expect(retrieved?.content).toBe('Updated');
    });
  });

  describe('retrieve', () => {
    it('should return null for non-existent message', async () => {
      const retrieved = await adapter.retrieve('non-existent');
      expect(retrieved).toBeNull();
    });

    it('should retrieve saved message', async () => {
      await adapter.save(testMessage);
      const retrieved = await adapter.retrieve('msg-1');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe('msg-1');
    });
  });

  describe('delete', () => {
    it('should delete a message', async () => {
      await adapter.save(testMessage);
      await adapter.delete('msg-1');
      const retrieved = await adapter.retrieve('msg-1');
      expect(retrieved).toBeNull();
    });

    it('should not throw error when deleting non-existent message', async () => {
      await expect(adapter.delete('non-existent')).resolves.toBeUndefined();
    });
  });

  describe('retrieveAll', () => {
    it('should return all messages', async () => {
      await adapter.save(testMessage);
      const msg2 = { ...testMessage, id: 'msg-2' };
      await adapter.save(msg2);
      const all = await adapter.retrieveAll();
      expect(all).toHaveLength(2);
    });

    it('should filter by conversationId', async () => {
      await adapter.save(testMessage);
      const msg2 = { ...testMessage, id: 'msg-2', conversationId: 'conv-2' };
      await adapter.save(msg2);
      const filtered = await adapter.retrieveAll('conv-1');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('msg-1');
    });

    it('should return empty array when no messages exist', async () => {
      const all = await adapter.retrieveAll();
      expect(all).toEqual([]);
    });
  });
});
```

## Integration Test Detail

**Test File**: `tests/in-memory-adapter-integration.test.ts`

Integration test cases:
- Verify adapter passes all unit tests in test suite
- Run full test suite with coverage report
- Verify coverage meets or exceeds 80% threshold
- Test adapter in context of service layer (partial)

## Manual Test Detail

1. Ensure `src/adapters/__tests__/InMemoryAdapter.test.ts` is created
2. Run `npm run test -- InMemoryAdapter` to execute only adapter tests
3. Verify all tests pass
4. Check coverage report: `npm run test -- --coverage`
5. Verify coverage is at least 80% for InMemoryAdapter file

## Testing Requirements & Pass/Fail Criteria

### ✅ MUST-PASS (Blockers - Task cannot be completed without these)
1. **All tests pass**: `npm run test` shows all InMemoryAdapter tests passing
2. **No TypeScript errors**: Test file compiles without errors
3. **Coverage >= 80%**: Lines and branches in adapter meet 80% coverage threshold
4. **Async tests correct**: All Promise-based tests resolve/reject correctly

**Pass Criteria**: All 4 criteria must be met.

### ⚠️ HIGH-PRIORITY (Strongly Recommended - needed for next tasks)
1. **Tests are descriptive**: Test names clearly describe what they test
2. **Edge cases covered**: Tests include null, empty, and boundary conditions
3. **beforeEach setup**: Tests properly initialize fresh adapter instances

**Pass Criteria**: All 3 should be present. Good test practices ensure maintainability.

### ⏭️ CAN SKIP/DEFER (Nice-to-have - can fix later)
1. **Performance tests**: Timing benchmarks (can add later)
2. **Snapshot tests**: Component-style snapshots (not needed for adapter)
3. **Advanced mocking**: Complex setup (can enhance later)

**Skip Criteria**: Core functionality tests are most important.

### Recommended Testing Order:
1. **Write tests** (10 min): Create comprehensive test file
2. **Run tests** (2 min): Execute `npm run test`
3. **Check coverage** (1 min): Verify 80%+ coverage
4. **If all pass**: Move to Task 2.7 ✅
5. **Debug failures**: Fix any test failures before proceeding

## Note / Status

