# Task 2.4: Create StorageAdapter Interface

## Description
Define an abstract interface for all storage backends. This interface will be implemented by different storage adapters (InMemory, Obsidian, Google Docs, etc.) to ensure a consistent API for saving, retrieving, and deleting messages regardless of the backend.

## Implementation Detail

### Steps:
1. Create `src/adapters/StorageAdapter.ts` file
2. Define StorageAdapter interface with the following methods:
   - `save(message: Message): Promise<void>` - Save a single message
   - `retrieve(id: string): Promise<Message | null>` - Get message by ID
   - `delete(id: string): Promise<void>` - Delete message by ID
   - `retrieveAll(conversationId?: string): Promise<Message[]>` - Optional: retrieve messages with optional filtering
3. Add JSDoc comments for each method explaining:
   - Parameters and types
   - Return values and error handling
   - Expected behavior
4. Export interface for implementation by concrete adapters

## Unit Test Detail

**Test File**: `src/adapters/__tests__/StorageAdapter.test.ts`

Test cases:
- Verify StorageAdapter interface can be imported
- Verify interface has correct method signatures
- Test that a mock adapter implementing the interface type-checks correctly
- Verify method parameters and return types are correct
- Test Promise-based async methods

```typescript
describe('StorageAdapter Interface', () => {
  it('should allow creating a class that implements StorageAdapter', () => {
    class MockAdapter implements StorageAdapter {
      async save(message: Message): Promise<void> {}
      async retrieve(id: string): Promise<Message | null> {
        return null;
      }
      async delete(id: string): Promise<void> {}
    }
    const adapter = new MockAdapter();
    expect(adapter).toBeDefined();
  });
});
```

## Integration Test Detail

**Test File**: `tests/storage-adapter.integration.test.ts`

Test cases:
- Verify StorageAdapter is importable from service layer
- Create mock implementations and verify they satisfy the interface
- Test that different adapters (when implemented) can be swapped
- Verify TypeScript compilation with adapter implementations

## Manual Test Detail

1. Create `src/adapters/StorageAdapter.ts` with interface definition
2. Run `npx tsc --noEmit` and verify no TypeScript errors
3. Import StorageAdapter in another file and verify it's accessible
4. Verify IDE shows correct method signatures and documentation

## Testing Requirements & Pass/Fail Criteria

### ✅ MUST-PASS (Blockers - Task cannot be completed without these)
1. **TypeScript compilation passes**: `npx tsc --noEmit` returns exit code 0
2. **Interface is exportable**: Can import StorageAdapter from `src/adapters/StorageAdapter`
3. **All required methods are defined**: save, retrieve, delete methods with correct signatures
4. **Methods return Promises**: All methods properly typed as async/Promise-returning

**Pass Criteria**: All 4 criteria must be met. If any fails, task is incomplete.

### ⚠️ HIGH-PRIORITY (Strongly Recommended - needed for next tasks)
1. **Message type is used**: Methods use Message interface from Task 2.1
2. **Optional methods**: retrieveAll method is included as optional
3. **Null handling**: retrieve method allows null return type

**Pass Criteria**: All 3 should be present. Interface design directly impacts adapter implementations.

### ⏭️ CAN SKIP/DEFER (Nice-to-have - can fix later)
1. **JSDoc comments**: Full documentation (can enhance later)
2. **Error handling types**: Custom error types (can add later)
3. **Unit tests pass**: Mock adapter tests (can refine later)

**Skip Criteria**: Interface structure is most important.

### Recommended Testing Order:
1. **Manual first** (2 min): Create interface, run tsc check
2. **TypeScript check** (1 min): Verify methods compile
3. **If manual passes**: Move to Task 2.5 ✅
4. **Unit tests**: Add comprehensive tests if needed

## Note / Status

