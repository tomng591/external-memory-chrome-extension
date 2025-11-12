# Task 3.2: Create and Wire ObsidianAdapter Implementation

## Description
Implement the ObsidianAdapter class that converts captured messages into markdown format and saves them to an Obsidian vault directory. Wire the adapter to the service worker to automatically save messages when received from content scripts. This task bridges the gap between the message capture system and local file storage.

## Implementation Detail

### Steps:

#### Part 1: Create ObsidianAdapter Class

1. Create `src/adapters/ObsidianAdapter.ts`:
   - Import required dependencies: `fs/promises` for async file operations, `path` for file path handling
   - Import `Message` interface from `src/types/Message`
   - Import `StorageAdapter` interface from `src/adapters/StorageAdapter`
   - **Review the Message interface** in `src/types/Message.ts` to understand the shape of captured message data:
     - Know what fields are available: `id`, `conversationId`, `role`, `content`, `timestamp`, `platform`, `model`
     - Understand field types: `role` is 'user' | 'assistant', `platform` is 'chatgpt' | 'claude'
     - Understand timestamp format: Unix milliseconds (number type)
     - This is critical context before implementing `messageToMarkdown()` helper method

2. Implement the `ObsidianAdapter` class:
   - Constructor: Accept `vaultPath: string` parameter
     - Validate vault path exists and is a directory
     - Create `conversations/` subdirectory if it doesn't exist
     - Create YYYY-MM subdirectory based on current date
   - Implement `save(message: Message): Promise<void>` method
     - Group messages by `conversationId`
     - Check if conversation file already exists
     - If exists, append message to file
     - If new, create conversation file with YAML frontmatter
     - Use file naming: `YYYY-MM-DD-HH-mm-ss-{conversationId}.md`
   - Implement `retrieve(id: string): Promise<Message>` method
     - Parse markdown file and extract message with given id
     - Return Message object
   - Implement `delete(id: string): Promise<void>` method
     - Find and remove message from conversation file
     - Update file if needed

3. Helper methods for ObsidianAdapter:
   - `ensureDirectoryStructure()`: Create vault folder structure
   - `messageToMarkdown(message: Message): string`: Convert single message to markdown format
     - **Input**: Message object (refer to `src/types/Message.ts` for field definitions)
     - **Output**: Markdown string with format `## {Role} — {Timestamp}\n\n{Content}`
     - Use message fields: `role` (capitalize to 'User'/'Assistant'), `content`, `timestamp` (convert Unix ms to ISO 8601)
     - Preserve message content formatting (code blocks, lists, etc.)
   - `conversationToFile(conversationId: string, messages: Message[]): string`: Convert full conversation to markdown file with frontmatter
   - `parseMarkdownFile(filePath: string): Message[]`: Parse markdown file back to Message array
   - `generateFileName(conversationId: string, timestamp: number): string`: Create standardized filename
   - `getCurrentMonthFolder(): string`: Get YYYY-MM folder name
   - `updateConversationIndex()`: Update master conversation index file

4. Refer to `research/obsidian-storage.md` for:
   - File naming convention: `YYYY-MM-DD-HH-mm-ss-{conversationId}.md`
   - YAML frontmatter format with all required fields
   - Markdown message format: `## User —` / `## Assistant —` with timestamp
   - Folder structure: `conversations/YYYY-MM/`

5. Handle macOS file system operations:
   - Use absolute paths (no relative paths)
   - Handle file permissions gracefully
   - Support default vault path (e.g., `~/Documents/External-Memory-Vault`)

#### Part 2: Wire to Service Worker

1. Modify `src/background.ts` service worker:
   - Import `ObsidianAdapter` from `src/adapters/ObsidianAdapter`
   - On service worker startup:
     - Get user's vault path (for now, use default path: `~/Documents/External-Memory-Vault`)
     - Instantiate `ObsidianAdapter` with vault path
     - Store adapter instance globally in service worker context
   - When `chrome.runtime.onMessage` receives a message from content script:
     - Extract Message object
     - Call `adapter.save(message)` to save to vault
     - Log success: "Message saved to Obsidian vault"
     - Log failure with error details if save fails

2. Error handling in service worker:
   - Catch and log file system errors
   - Fallback: If ObsidianAdapter fails, log error but don't crash
   - Provide informative console logs for debugging

### Key Implementation Notes

- **File System Access**: Use Node.js `fs/promises` module (available in service worker context)
- **Path Handling**: Use `path.resolve()` to create absolute paths
- **Timestamp Format**: Store as Unix milliseconds in frontmatter, display as ISO 8601 in markdown
- **Conversation Grouping**: Group messages by `conversationId`, not by individual messages
- **Idempotency**: Same message shouldn't be saved twice (use message id for deduplication)
- **Directory Structure**: Auto-create `/conversations/YYYY-MM/` structure on first save

---

## Unit Test Detail

**Test File**: `src/adapters/__tests__/ObsidianAdapter.test.ts`

Test cases:
- Verify ObsidianAdapter can be instantiated with valid vault path
- Verify `ensureDirectoryStructure()` creates required folders
- Test `messageToMarkdown()` converts Message to proper markdown format
- Test `conversationToFile()` generates valid YAML frontmatter with all fields
- Test `save()` method:
  - Creates new conversation file with proper naming
  - Appends to existing conversation when conversationId matches
  - Creates directory structure (YYYY-MM)
- Test `retrieve()` method:
  - Finds and parses message from file
  - Returns correct Message object
- Test file naming:
  - Generates timestamp-based filenames
  - Includes conversationId in filename
- Test error handling:
  - Throws error when vault path doesn't exist
  - Handles file permission errors gracefully

```typescript
describe('ObsidianAdapter', () => {
  let adapter: ObsidianAdapter;
  let testVaultPath: string;

  beforeAll(() => {
    testVaultPath = path.join(__dirname, '../../__fixtures__/test-vault');
    adapter = new ObsidianAdapter(testVaultPath);
  });

  afterAll(async () => {
    // Cleanup test files
    await fs.promises.rm(testVaultPath, { recursive: true });
  });

  it('should instantiate with valid vault path', async () => {
    expect(adapter).toBeDefined();
    expect(adapter.vaultPath).toBe(testVaultPath);
  });

  it('should create directory structure on instantiation', async () => {
    const conversationsPath = path.join(testVaultPath, 'conversations');
    expect(await fs.promises.stat(conversationsPath)).toBeDefined();
  });

  it('should convert message to markdown format', () => {
    const message: Message = {
      id: 'msg-1',
      conversationId: 'conv-1',
      role: 'user',
      content: 'Hello, how are you?',
      timestamp: 1731415845000,
      platform: 'chatgpt',
      model: 'gpt-4'
    };

    const markdown = adapter['messageToMarkdown'](message);
    expect(markdown).toContain('## User —');
    expect(markdown).toContain('Hello, how are you?');
  });

  it('should save message to vault', async () => {
    const message: Message = {
      id: 'msg-1',
      conversationId: 'conv-abc123',
      role: 'user',
      content: 'Test message',
      timestamp: 1731415845000,
      platform: 'chatgpt',
      model: 'gpt-4'
    };

    await adapter.save(message);

    // Verify file exists
    const files = await fs.promises.readdir(
      path.join(testVaultPath, 'conversations')
    );
    expect(files.length).toBeGreaterThan(0);
  });
});
```

---

## Integration Test Detail

**Test File**: `tests/obsidian-adapter.integration.test.ts`

Test cases:
- Build project and verify ObsidianAdapter compiles
- Create test vault and save sample messages
- Verify markdown files are created in correct directory structure
- Verify YAML frontmatter is valid YAML
- Verify message content is preserved in markdown
- Test service worker integration:
  - Service worker receives message from content script
  - Message is saved to vault via ObsidianAdapter
  - File appears in expected location

```typescript
describe('ObsidianAdapter Integration', () => {
  let testVaultPath: string;
  let adapter: ObsidianAdapter;

  beforeAll(() => {
    testVaultPath = path.resolve(__dirname, '../__fixtures__/test-vault-integration');
    adapter = new ObsidianAdapter(testVaultPath);
  });

  afterAll(async () => {
    await fs.promises.rm(testVaultPath, { recursive: true });
  });

  it('should create vault structure and save messages', async () => {
    const messages: Message[] = [
      {
        id: 'msg-1',
        conversationId: 'conv-1',
        role: 'user',
        content: 'First message',
        timestamp: Date.now(),
        platform: 'chatgpt',
        model: 'gpt-4'
      },
      {
        id: 'msg-2',
        conversationId: 'conv-1',
        role: 'assistant',
        content: 'Response message',
        timestamp: Date.now() + 1000,
        platform: 'chatgpt',
        model: 'gpt-4'
      }
    ];

    for (const msg of messages) {
      await adapter.save(msg);
    }

    // Verify directory structure
    const conversationsPath = path.join(testVaultPath, 'conversations');
    const monthFolders = await fs.promises.readdir(conversationsPath);
    expect(monthFolders.some(f => f.match(/^\d{4}-\d{2}$/))).toBe(true);
  });

  it('should create valid markdown files', async () => {
    const message: Message = {
      id: 'msg-3',
      conversationId: 'conv-2',
      role: 'user',
      content: 'Test with code:\n```typescript\nconst x = 1;\n```',
      timestamp: Date.now(),
      platform: 'claude',
      model: 'claude-3-opus'
    };

    await adapter.save(message);

    // Find and read the created file
    const monthPath = path.join(testVaultPath, 'conversations', getCurrentYYYYMM());
    const files = await fs.promises.readdir(monthPath);
    const filePath = path.join(monthPath, files[0]);
    const content = await fs.promises.readFile(filePath, 'utf-8');

    // Verify YAML frontmatter
    expect(content).toMatch(/^---\n/);
    expect(content).toContain('id: "msg-3"');
    expect(content).toContain('platform: "claude"');

    // Verify message content
    expect(content).toContain('## User —');
    expect(content).toContain('Test with code:');
  });
});
```

---

## Manual Test Detail

1. Set up test environment:
   - Create a test vault directory: `~/test-vault`
   - Verify directory structure manually

2. Test adapter instantiation:
   - Run: `ts-node -e "import { ObsidianAdapter } from './src/adapters/ObsidianAdapter'; const a = new ObsidianAdapter(process.env.HOME + '/test-vault'); console.log('OK');"`
   - Should print "OK" without errors

3. Test file creation:
   - Manually call `adapter.save()` with test messages
   - Verify files are created in `~/test-vault/conversations/YYYY-MM/`
   - Verify filenames follow pattern: `YYYY-MM-DD-HH-mm-ss-{id}.md`

4. Test markdown format:
   - Open created file in text editor
   - Verify YAML frontmatter at top with all fields
   - Verify messages are formatted as `## User —` and `## Assistant —`
   - Verify timestamps are readable

5. Test service worker integration:
   - Open ChatGPT or Claude.ai in Chrome
   - Send a message in the chat
   - Check service worker console for success logs
   - Verify vault directory has new markdown file with message
   - Verify file contains correct conversation content

6. Test edge cases:
   - Multiple messages in same conversation (should append to same file)
   - Messages with code blocks (should preserve formatting)
   - Messages with special characters (should escape properly)
   - Very long messages (should not truncate)

---

## Testing Requirements & Pass/Fail Criteria

### ✅ MUST-PASS (Blockers - Task cannot be completed without these)
1. **TypeScript compilation passes**: `npx tsc --noEmit` returns exit code 0 (no TS errors)
2. **ObsidianAdapter instantiation works**: Can create instance with valid vault path without errors
3. **save() method implementation**: Messages can be saved and files appear in vault
4. **Markdown file format is correct**: Created files contain valid YAML frontmatter and markdown format
5. **Service worker wiring complete**: Messages received by service worker are saved via adapter
6. **File system operations work on macOS**: Files are created in correct locations with proper permissions

**Pass Criteria**: All 6 must pass. If any fails, task is incomplete.

### ⚠️ HIGH-PRIORITY (Strongly Recommended - needed for next tasks)
1. **retrieve() method implemented**: Can parse and retrieve messages from vault files
2. **Directory structure creation**: Conversations auto-organized in YYYY-MM folders
3. **Idempotency**: Same message isn't saved twice (deduplication by id)
4. **Error handling**: File system errors caught and logged without crashing service worker
5. **Timestamp handling**: Unix milliseconds stored in frontmatter, ISO 8601 displayed in markdown

**Pass Criteria**: At least 4 of 5 should work. If multiple fail, review implementation.

### ⏭️ CAN SKIP/DEFER (Nice-to-have - can fix later)
1. **delete() method fully implemented**: Can remove messages from vault (can implement later)
2. **Conversation index file**: Master index of all conversations (can add later)
3. **File permissions optimization**: Optimal file permissions for vault (can tune later)
4. **Performance optimization**: Large conversation handling optimized (can optimize later)

**Skip Criteria**: These don't block MVP. Can refine in iteration.

### Recommended Testing Order:
1. **Manual first** (10 min): Create adapter, save test message, verify file in vault
2. **Unit tests** (5 min): Run Jest tests for adapter methods
3. **Service worker integration** (10 min): Send message from ChatGPT/Claude, verify vault
4. **If all MUST-PASS criteria met**: Move to Task 3.3 ✅
5. **If any fails**: Debug and fix before moving on

---

## Note / Status

- Status: ⏳ PENDING
- Assigned to: [To be assigned]
- Dependencies: Task 3.1 (Research Obsidian Structure) ✅ COMPLETED
- Blocks: Task 3.3 (Settings UI)
- Notes:
  - Refer to `research/obsidian-storage.md` for file format specifications
  - Use Node.js `fs/promises` for async file operations
  - Default vault path: `~/Documents/External-Memory-Vault`
  - macOS-specific for now; Windows/Linux support deferred
  - All file operations should be async to avoid blocking service worker
  - Service worker context supports Node.js APIs in extension environment
