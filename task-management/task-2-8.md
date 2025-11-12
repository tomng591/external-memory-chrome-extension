# Task 2.8: Create StorageService in Service Worker

## Description
Create a StorageService that acts as the service layer in the service worker. It will take a StorageAdapter instance and provide methods to save received messages to the configured storage backend. This service will be instantiated with the appropriate adapter (InMemory for MVP) and wire into the service worker message listener.

## Implementation Detail

### Steps:
1. Create `src/services/StorageService.ts` file
2. Implement StorageService class:
   - Constructor takes `adapter: StorageAdapter` parameter
   - Implement `saveMessage(message: Message): Promise<void>` method:
     - Call adapter.save(message)
     - Log success to console
     - Handle and log errors
   - Implement `saveMessages(messages: Message[]): Promise<void>` method:
     - Save multiple messages (can use Promise.all or sequential)
     - Log number of messages saved
3. Create `src/background.ts` updates (modify from Task 1.5):
   - Import StorageService
   - Import InMemoryAdapter (for MVP)
   - Create StorageAdapter instance (hardcoded to InMemoryAdapter)
   - Create StorageService instance with adapter
   - Set up chrome.runtime.onMessage listener to receive messages from content script
   - Call storageService.saveMessage() for each received message
   - Send response back to content script
4. Add comprehensive error handling and logging

## Unit Test Detail

**Test File**: `src/services/__tests__/StorageService.test.ts`

Test cases:
- Test saveMessage saves message via adapter
- Test saveMessages saves multiple messages
- Test error handling when adapter fails
- Test logging of successful saves
- Test that adapter methods are called correctly
- Test Promise resolution

```typescript
describe('StorageService', () => {
  let storageService: StorageService;
  let mockAdapter: jest.Mocked<StorageAdapter>;

  beforeEach(() => {
    mockAdapter = {
      save: jest.fn().mockResolvedValue(undefined),
      retrieve: jest.fn(),
      delete: jest.fn(),
      retrieveAll: jest.fn()
    };
    storageService = new StorageService(mockAdapter);
  });

  it('should save message via adapter', async () => {
    const message: Message = {
      id: 'msg-1',
      conversationId: 'conv-1',
      role: 'user',
      content: 'Test',
      timestamp: Date.now(),
      platform: 'chatgpt'
    };

    await storageService.saveMessage(message);
    expect(mockAdapter.save).toHaveBeenCalledWith(message);
  });

  it('should save multiple messages', async () => {
    const messages: Message[] = [
      { id: 'msg-1', conversationId: 'conv-1', role: 'user', content: 'Test 1', timestamp: Date.now(), platform: 'chatgpt' },
      { id: 'msg-2', conversationId: 'conv-1', role: 'assistant', content: 'Test 2', timestamp: Date.now(), platform: 'chatgpt' }
    ];

    await storageService.saveMessages(messages);
    expect(mockAdapter.save).toHaveBeenCalledTimes(2);
  });

  it('should handle errors from adapter', async () => {
    mockAdapter.save.mockRejectedValueOnce(new Error('Storage failed'));
    const message: Message = {
      id: 'msg-1',
      conversationId: 'conv-1',
      role: 'user',
      content: 'Test',
      timestamp: Date.now(),
      platform: 'chatgpt'
    };

    await expect(storageService.saveMessage(message)).rejects.toThrow('Storage failed');
  });
});
```

## Integration Test Detail

**Test File**: `tests/storage-service.integration.test.ts`

Integration test cases:
- Create StorageService with InMemoryAdapter
- Simulate content script sending messages via chrome.runtime.sendMessage
- Verify service worker receives messages
- Verify StorageService saves them
- Verify InMemoryAdapter stores messages
- Check console logs show saved message count

## Manual Test Detail

1. Create `src/services/StorageService.ts` with implementation
2. Update `src/background.ts` to instantiate and use StorageService
3. Build extension: `npm run build`
4. Load extension in Chrome (chrome://extensions)
5. Open ChatGPT or Claude.ai
6. Open service worker console (chrome://extensions → click "service worker" link)
7. Create a chat message in the browser
8. Verify service worker console shows:
   - "Message saved: msg-id" logs
   - No errors
9. Verify extension populates storage

## Testing Requirements & Pass/Fail Criteria

### ✅ MUST-PASS (Blockers - Task cannot be completed without these)
1. **StorageService can be instantiated**: Class takes StorageAdapter and initializes correctly
2. **saveMessage works**: Calls adapter.save() and resolves Promise
3. **saveMessages works**: Can save multiple messages
4. **Service worker listens**: chrome.runtime.onMessage correctly configured
5. **No TypeScript errors**: Code compiles without errors

**Pass Criteria**: All 5 criteria must be met.

### ⚠️ HIGH-PRIORITY (Strongly Recommended - needed for next tasks)
1. **Error handling**: Errors are caught and logged without crashing service worker
2. **Console logging**: Service worker logs show saved messages
3. **Integration with content script**: Messages flow from content script to storage

**Pass Criteria**: All 3 should work. Critical for MVP functionality.

### ⏭️ CAN SKIP/DEFER (Nice-to-have - can fix later)
1. **Advanced logging**: Detailed debugging logs (can add later)
2. **Message validation**: Validate Message schema before saving (can add later)
3. **Adapter switching**: Dynamic adapter selection (needed for Milestone 3)

**Skip Criteria**: Basic message saving is what matters.

### Recommended Testing Order:
1. **Manual first** (10 min): Load extension, verify service worker logs
2. **Check message flow** (5 min): Send message from ChatGPT/Claude, see it logged
3. **Run unit tests** (2 min): `npm run test -- StorageService`
4. **If all work**: Milestone 2 complete! ✅
5. **Debug issues**: Fix any message flow or storage issues

## Note / Status

