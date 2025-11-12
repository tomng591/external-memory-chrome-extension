# Task 2.5: Create InMemoryAdapter (Testing Storage)

## Description
Implement a simple in-memory storage adapter that conforms to the StorageAdapter interface. This adapter will use a Map to store messages and serve as both a testing storage backend for the MVP and a reference implementation for other adapters.

## Implementation Detail

### Steps:
1. Create `src/adapters/InMemoryAdapter.ts` file
2. Implement StorageAdapter interface:
   - Use `Map<string, Message>` to store messages in memory
   - Implement `save(message: Message): Promise<void>`:
     - Add/update message in Map using message.id as key
     - Return resolved Promise
   - Implement `retrieve(id: string): Promise<Message | null>`:
     - Return message if found, null otherwise
     - Return Promise-wrapped result
   - Implement `delete(id: string): Promise<void>`:
     - Remove message from Map by ID
     - Return resolved Promise
   - Implement `retrieveAll(conversationId?: string): Promise<Message[]>`:
     - Return all messages or filter by conversationId if provided
     - Return Promise-wrapped array
3. Keep implementation minimal and focused
4. Add comments explaining the Map structure

## Unit Test Detail

**Test File**: `src/adapters/__tests__/InMemoryAdapter.test.ts`

Test cases:
- Test saving a single message
- Test retrieving a saved message
- Test retrieving non-existent message (returns null)
- Test deleting a message
- Test deleting non-existent message (no error)
- Test retrieving all messages
- Test filtering by conversationId
- Test saving multiple messages
- Test updating existing message
- Verify async/Promise behavior

```typescript
describe('InMemoryAdapter', () => {
  it('should save and retrieve a message', async () => {
    const adapter = new InMemoryAdapter();
    const message: Message = {
      id: 'msg-1',
      conversationId: 'conv-1',
      role: 'user',
      content: 'Test',
      timestamp: Date.now(),
      platform: 'chatgpt'
    };

    await adapter.save(message);
    const retrieved = await adapter.retrieve('msg-1');
    expect(retrieved).toEqual(message);
  });

  it('should return null for non-existent message', async () => {
    const adapter = new InMemoryAdapter();
    const retrieved = await adapter.retrieve('non-existent');
    expect(retrieved).toBeNull();
  });
});
```

## Integration Test Detail

**Test File**: `tests/in-memory-adapter.integration.test.ts`

Test cases:
- Create adapter and verify it's ready to use
- Perform CRUD operations in sequence
- Test concurrent save operations (Promise.all)
- Verify adapter can be instantiated and used in service layer
- Test that adapter persists data during session lifetime

## Manual Test Detail

1. Create `src/adapters/InMemoryAdapter.ts` with implementation
2. Run `npx tsc --noEmit` and verify no TypeScript errors
3. Create test script to:
   - Instantiate InMemoryAdapter
   - Create test Message object
   - Call save(), retrieve(), delete() methods
   - Log results and verify behavior
4. Verify all operations complete without errors

## Testing Requirements & Pass/Fail Criteria

### ✅ MUST-PASS (Blockers - Task cannot be completed without these)
1. **Implements StorageAdapter**: Class implements all required interface methods
2. **TypeScript compilation passes**: `npx tsc --noEmit` returns exit code 0
3. **Save and retrieve work**: Can save a message and retrieve it by ID
4. **Delete works**: Can delete a message (no error thrown)

**Pass Criteria**: All 4 criteria must be met.

### ⚠️ HIGH-PRIORITY (Strongly Recommended - needed for next tasks)
1. **Null handling**: retrieve() returns null for non-existent messages
2. **retrieveAll filtering**: Can filter by conversationId
3. **Async/Promise behavior**: All methods return Promises and resolve correctly

**Pass Criteria**: All 3 should work. Critical for service layer integration.

### ⏭️ CAN SKIP/DEFER (Nice-to-have - can fix later)
1. **Advanced features**: Bulk operations, pagination (can add later)
2. **Unit tests comprehensive**: All edge cases covered (can refine later)
3. **Performance optimization**: Any internal optimization (can optimize later)

**Skip Criteria**: Basic CRUD functionality is what matters most.

### Recommended Testing Order:
1. **Manual first** (5 min): Create adapter, test basic save/retrieve
2. **Run unit tests** (2 min): `npm run test` for InMemoryAdapter tests
3. **If tests pass**: Move to Task 2.6 ✅
4. **Integration tests**: Add service layer integration tests

## Note / Status

